import { db, getOrThrow } from '@/api/db';
import type {
  Bike,
  BikeImage,
  Booking,
  BookingDetails,
  BookingStatus,
  DamageSeverity,
  Profile,
  RentalPlan,
  Role,
} from '@/types/models';
import { assertTransition, BIKE_HOLD_STATUSES, TERMINAL_STATUSES } from '@/utils/bookingStateMachine';
import { AppError } from '@/utils/errors';
import { formatDateTime, formatINR } from '@/utils/format';
import { buildFinalBill, estimateTotal } from '@/utils/pricing';
import { bikeService } from './bikeService';
import { notificationService, type NotifyInput } from './notificationService';
import { paymentService } from './paymentService';
import { trackingService } from './trackingService';
import { verificationService } from './verificationService';

export interface Actor {
  id: string;
  role: Role;
}

export interface BookingListItem extends Booking {
  bike: Bike | null;
  bikeImages: BikeImage[];
  customer: Pick<Profile, 'id' | 'fullName' | 'avatarUrl' | 'phone'> | null;
  customerVerified: boolean;
}

function ensureParticipant(booking: Booking, actor: Actor) {
  const ok =
    (actor.role === 'customer' && booking.customerId === actor.id) ||
    (actor.role === 'partner' && booking.partnerId === actor.id);
  if (!ok) throw new AppError('You do not have access to this booking.', 'FORBIDDEN');
}

const bikeName = async (bikeId: string) => {
  const b = await db.get('bikes', bikeId);
  return b ? `${b.brand} ${b.model}` : 'your bike';
};

/** Who gets told what, for each status change */
async function notifyForTransition(b: Booking, to: BookingStatus, actor: Actor | null, note?: string | null) {
  const name = await bikeName(b.bikeId);
  const toCustomer = (n: Omit<NotifyInput, 'userId' | 'bookingId'>) =>
    notificationService.notify({ ...n, userId: b.customerId, bookingId: b.id });
  const toPartner = (n: Omit<NotifyInput, 'userId' | 'bookingId'>) =>
    notificationService.notify({ ...n, userId: b.partnerId, bookingId: b.id });

  switch (to) {
    case 'PENDING_OWNER_CONFIRMATION':
      return toPartner({ category: 'booking', type: 'new_booking', title: 'New rental request', body: `${name} · ${b.plan.label} from ${formatDateTime(b.startTime)}` });
    case 'CONFIRMED':
      return toCustomer({ category: 'booking', type: 'booking_accepted', title: 'Booking confirmed', body: `Your ${name} is reserved. Head to the pickup point when you're ready.` });
    case 'REJECTED':
      return toCustomer({ category: 'booking', type: 'booking_rejected', title: 'Request declined', body: note ? `The partner declined: ${note}` : `The partner couldn't accept your request for ${name}.` });
    case 'CANCELLED':
      return actor?.role === 'partner'
        ? toCustomer({ category: 'booking', type: 'booking_cancelled', title: 'Booking cancelled', body: `Your booking for ${name} was cancelled by the partner.` })
        : toPartner({ category: 'booking', type: 'booking_cancelled', title: 'Booking cancelled', body: `The customer cancelled the booking for ${name}.` });
    case 'CUSTOMER_ARRIVING':
      return toPartner({ category: 'booking', type: 'customer_on_way', title: 'Customer is on the way', body: `Get ${name} ready for handover.` });
    case 'READY_FOR_PICKUP':
      return toPartner({ category: 'rental', type: 'customer_arrived', title: 'Customer arrived', body: `Start the handover inspection for ${name}.` });
    case 'BIKE_INSPECTION':
      return toCustomer({ category: 'rental', type: 'inspection_started', title: 'Handover started', body: 'The partner is photographing the bike before handover.' });
    case 'CUSTOMER_VERIFICATION':
      return toCustomer({ category: 'verification', type: 'selfie_required', title: "Verify it's really you", body: 'Bike inspection passed. Take a quick selfie to finish handover.' });
    case 'ACTIVE':
      await toPartner({ category: 'rental', type: 'rental_started', title: 'Rental started', body: `${name} is now on an active rental.` });
      return toCustomer({ category: 'rental', type: 'rental_started', title: 'Your ride has started', body: `Included: ${b.plan.includedDistanceKm} km · ${b.plan.label}. Ride safe!` });
    case 'RETURN_REQUESTED':
      return toPartner({ category: 'return', type: 'return_started', title: 'Customer is returning the bike', body: `${name} is being returned. Return photos are on the way.` });
    case 'RETURN_INSPECTION':
      return toPartner({ category: 'return', type: 'bike_returned', title: 'Bike returned — review needed', body: `Review the return inspection for ${name}.` });
    case 'DAMAGE_REVIEW':
      return toCustomer({ category: 'return', type: 'damage_review', title: 'Damage review', body: 'The partner reported possible damage. Review the evidence and respond.' });
    case 'COMPLETED':
      await toPartner({ category: 'payment', type: 'payment_received', title: 'Payment received', body: `${formatINR(b.finalBill?.total ?? 0)} for ${name} (demo payment).` });
      return toCustomer({ category: 'return', type: 'return_completed', title: 'Rental completed', body: `Your final bill is ${formatINR(b.finalBill?.total ?? 0)}. Deposit refunded.` });
    default:
      return undefined;
  }
}

async function releaseBike(b: Booking) {
  const holds = await db.list('bike_availability', { where: { bookingId: b.id } });
  await Promise.all(holds.map((h) => db.remove('bike_availability', h.id)));
  const bike = await db.get('bikes', b.bikeId);
  if (bike && (bike.status === 'BOOKED' || bike.status === 'ACTIVE')) {
    await db.update('bikes', bike.id, { status: 'AVAILABLE' });
  }
}

async function transition(
  bookingId: string,
  to: BookingStatus,
  actor: Actor | null,
  opts: { note?: string | null; patch?: Partial<Booking> } = {},
): Promise<Booking> {
  const booking = await getOrThrow('bookings', bookingId);
  if (actor) ensureParticipant(booking, actor);
  const candidate = { ...booking, ...opts.patch };
  assertTransition(candidate, to, actor?.role ?? 'system');

  const updated = await db.update('bookings', bookingId, { ...opts.patch, status: to });
  await db.insert('booking_events', {
    bookingId,
    fromStatus: booking.status,
    toStatus: to,
    actorId: actor?.id ?? 'system',
    actorRole: actor?.role ?? 'system',
    note: opts.note ?? null,
  });

  if (to === 'CONFIRMED') await db.update('bikes', booking.bikeId, { status: 'BOOKED' });
  if (to === 'ACTIVE') await db.update('bikes', booking.bikeId, { status: 'ACTIVE' });
  if (TERMINAL_STATUSES.includes(to)) await releaseBike(updated);
  if (to === 'CANCELLED' || to === 'REJECTED') await paymentService.releaseAuthorization(bookingId);

  await notifyForTransition(updated, to, actor, opts.note);
  return updated;
}

async function completeBooking(bookingId: string, actor: Actor, damageCharge: number): Promise<Booking> {
  const booking = await getOrThrow('bookings', bookingId);
  ensureParticipant(booking, actor);
  if (!booking.rentalSessionId) throw new AppError('Rental session missing.');
  const session = await trackingService.finalize(booking.rentalSessionId);
  const bill = buildFinalBill(booking.plan, session.finalDistanceKm ?? 0, session.finalDurationMinutes ?? 0, damageCharge, true);
  await paymentService.settleFinalBill(booking, bill);
  const cp = await db.get('customer_profiles', booking.customerId);
  if (cp) await db.update('customer_profiles', cp.id, { totalRentals: cp.totalRentals + 1 });
  return transition(bookingId, 'COMPLETED', actor, { patch: { finalBill: bill } });
}

async function withInspection(id: string | null) {
  if (!id) return null;
  const insp = await db.get('bike_inspections', id);
  if (!insp) return null;
  const images = await db.list('inspection_images', { where: { inspectionId: id } });
  return { ...insp, images };
}

export const bookingService = {
  transition,

  async createBooking(customerId: string, bike: Bike, plan: RentalPlan, startTime: Date): Promise<Booking> {
    const verified = await verificationService.isCustomerVerified(customerId);
    const docs = await verificationService.getDocuments(customerId);
    const pendingDocs = docs.some((d) => d.status === 'under_verification');
    if (!verified && !pendingDocs) {
      throw new AppError('Verify your Aadhaar and Driving Licence before booking.', 'NOT_VERIFIED');
    }
    const endTime = new Date(startTime.getTime() + plan.includedDurationMinutes * 60000);
    const availability = await bikeService.isAvailable(bike, startTime, endTime);
    if (!availability.ok) throw new AppError(availability.reason ?? 'Bike unavailable.', 'UNAVAILABLE');

    const booking = await db.insert('bookings', {
      customerId,
      partnerId: bike.partnerId,
      bikeId: bike.id,
      status: 'DRAFT',
      plan,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      estimatedTotal: estimateTotal(plan),
      preInspectionId: null,
      returnInspectionId: null,
      inspectionPassed: false,
      faceVerified: false,
      rentalSessionId: null,
      damageReportId: null,
      finalBill: null,
      cancelReason: null,
    });
    await db.insert('booking_events', { bookingId: booking.id, fromStatus: null, toStatus: 'DRAFT', actorId: customerId, actorRole: 'customer', note: null });
    await db.insert('bike_availability', {
      bikeId: bike.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      reason: 'booking',
      bookingId: booking.id,
    });
    await paymentService.authorizeBooking(booking);
    const actor: Actor = { id: customerId, role: 'customer' };
    if (!verified) return transition(booking.id, 'PENDING_VERIFICATION', actor);
    return transition(booking.id, 'PENDING_OWNER_CONFIRMATION', actor);
  },

  /** Moves a PENDING_VERIFICATION booking forward once documents are verified */
  async resumeAfterVerification(bookingId: string, actor: Actor) {
    const booking = await getOrThrow('bookings', bookingId);
    if (booking.status !== 'PENDING_VERIFICATION') return booking;
    if (!(await verificationService.isCustomerVerified(booking.customerId))) {
      throw new AppError('Documents are still being verified.');
    }
    return transition(bookingId, 'PENDING_OWNER_CONFIRMATION', actor);
  },

  accept: (id: string, actor: Actor) => transition(id, 'CONFIRMED', actor),

  reject: (id: string, actor: Actor, reason: string) =>
    transition(id, 'REJECTED', actor, { note: reason, patch: { cancelReason: reason } }),

  cancel: (id: string, actor: Actor, reason: string) =>
    transition(id, 'CANCELLED', actor, { note: reason, patch: { cancelReason: reason } }),

  markOnTheWay: (id: string, actor: Actor) => transition(id, 'CUSTOMER_ARRIVING', actor),

  markArrived: (id: string, actor: Actor) => transition(id, 'READY_FOR_PICKUP', actor),

  async startHandoverInspection(id: string, actor: Actor) {
    const b = await getOrThrow('bookings', id);
    if (b.status === 'BIKE_INSPECTION') return b;
    return transition(id, 'BIKE_INSPECTION', actor);
  },

  async startRental(id: string, actor: Actor) {
    const b = await getOrThrow('bookings', id);
    ensureParticipant(b, actor);
    assertTransition(b, 'ACTIVE', actor.role);
    const session = await trackingService.startSession(id);
    return transition(id, 'ACTIVE', actor, { patch: { rentalSessionId: session.id } });
  },

  requestReturn: (id: string, actor: Actor) => transition(id, 'RETURN_REQUESTED', actor),

  /** Partner decision after the return inspection */
  async ownerReview(
    id: string,
    actor: Actor,
    decision: { severity: DamageSeverity; description: string; amount: number; photoUrls: string[] },
  ) {
    const b = await getOrThrow('bookings', id);
    ensureParticipant(b, actor);
    if (b.status !== 'RETURN_INSPECTION') throw new AppError('This return is not awaiting review.');
    if (decision.severity === 'none') return completeBooking(id, actor, 0);
    if (!b.returnInspectionId) throw new AppError('Return inspection missing.');
    const report = await db.insert('damage_reports', {
      bookingId: id,
      inspectionId: b.returnInspectionId,
      reportedBy: actor.id,
      severity: decision.severity,
      description: decision.description.trim(),
      proposedAmount: decision.severity === 'manual_review' ? 0 : Math.max(0, Math.round(decision.amount)),
      photoUrls: decision.photoUrls,
      status: decision.severity === 'manual_review' ? 'manual_review' : 'proposed',
      customerResponse: null,
    });
    return transition(id, 'DAMAGE_REVIEW', actor, { patch: { damageReportId: report.id }, note: decision.description });
  },

  /** Customer response to a damage claim */
  async respondToDamage(id: string, actor: Actor, response: { accept: boolean; comment: string }) {
    const b = await getOrThrow('bookings', id);
    ensureParticipant(b, actor);
    if (!b.damageReportId) throw new AppError('No damage report found.');
    const report = await getOrThrow('damage_reports', b.damageReportId);
    if (response.accept) {
      await db.update('damage_reports', report.id, { status: 'accepted', customerResponse: response.comment || 'Accepted' });
      return completeBooking(id, actor, report.proposedAmount);
    }
    await db.update('damage_reports', report.id, { status: 'manual_review', customerResponse: response.comment || 'Disputed' });
    await db.insert('support_tickets', {
      userId: actor.id,
      category: 'booking',
      subject: 'Damage claim disputed',
      message: `Booking ${id.slice(0, 8)}: ${response.comment || 'Customer disputes the damage claim.'}`,
      status: 'open',
    });
    await notificationService.notify({
      userId: b.partnerId,
      category: 'return',
      type: 'damage_disputed',
      title: 'Damage claim disputed',
      body: 'The customer requested a manual review. You can keep or withdraw the claim.',
      bookingId: id,
    });
    return getOrThrow('bookings', id);
  },

  /** Partner closes a damage review (after dispute/manual review) */
  async resolveDamage(id: string, actor: Actor, keepClaim: boolean) {
    const b = await getOrThrow('bookings', id);
    ensureParticipant(b, actor);
    if (!b.damageReportId) throw new AppError('No damage report found.');
    const report = await getOrThrow('damage_reports', b.damageReportId);
    await db.update('damage_reports', report.id, { status: 'resolved' });
    return completeBooking(id, actor, keepClaim ? report.proposedAmount : 0);
  },

  async getDetails(id: string, actor: Actor): Promise<BookingDetails> {
    const booking = await getOrThrow('bookings', id);
    ensureParticipant(booking, actor);
    const [bike, bikeImages, customer, customerProfile, partnerProfile, partner, events, session, pre, ret, damage, faces] =
      await Promise.all([
        getOrThrow('bikes', booking.bikeId),
        db.list('bike_images', { where: { bikeId: booking.bikeId } }),
        getOrThrow('profiles', booking.customerId),
        db.get('customer_profiles', booking.customerId),
        getOrThrow('profiles', booking.partnerId),
        getOrThrow('rental_partners', booking.partnerId),
        db.list('booking_events', { where: { bookingId: id }, orderBy: { field: 'createdAt' } }),
        booking.rentalSessionId ? db.get('rental_sessions', booking.rentalSessionId) : Promise.resolve(null),
        withInspection(booking.preInspectionId),
        withInspection(booking.returnInspectionId),
        booking.damageReportId ? db.get('damage_reports', booking.damageReportId) : Promise.resolve(null),
        db.list('face_verifications', { where: { bookingId: id }, orderBy: { field: 'createdAt', ascending: false } }),
      ]);
    return {
      ...booking,
      bike,
      bikeImages,
      customer,
      customerProfile,
      partnerProfile,
      partner,
      events,
      session,
      preInspection: pre,
      returnInspection: ret,
      damageReport: damage,
      faceVerification: faces[0] ?? null,
    };
  },

  async listForCustomer(customerId: string) {
    const bookings = await db.list('bookings', { where: { customerId }, orderBy: { field: 'createdAt', ascending: false } });
    return decorate(bookings.filter((b) => b.status !== 'DRAFT'));
  },

  async listForPartner(partnerId: string) {
    const bookings = await db.list('bookings', { where: { partnerId }, orderBy: { field: 'createdAt', ascending: false } });
    return decorate(bookings.filter((b) => b.status !== 'DRAFT' && b.status !== 'PENDING_VERIFICATION'));
  },

  /** The customer's current non-terminal booking, if any (drives the home banner) */
  async currentForCustomer(customerId: string) {
    const list = await db.list('bookings', { where: { customerId }, orderBy: { field: 'createdAt', ascending: false } });
    return list.find((b) => BIKE_HOLD_STATUSES.includes(b.status) || b.status === 'PENDING_VERIFICATION') ?? null;
  },
};

async function decorate(bookings: Booking[]): Promise<BookingListItem[]> {
  if (bookings.length === 0) return [];
  const bikeIds = [...new Set(bookings.map((b) => b.bikeId))];
  const customerIds = [...new Set(bookings.map((b) => b.customerId))];
  const [bikes, images, customers, cps] = await Promise.all([
    db.list('bikes', { in: { field: 'id', values: bikeIds } }),
    db.list('bike_images', { in: { field: 'bikeId', values: bikeIds } }),
    db.list('profiles', { in: { field: 'id', values: customerIds } }),
    db.list('customer_profiles', { in: { field: 'id', values: customerIds } }),
  ]);
  return bookings.map((b) => {
    const c = customers.find((x) => x.id === b.customerId);
    return {
      ...b,
      bike: bikes.find((x) => x.id === b.bikeId) ?? null,
      bikeImages: images.filter((i) => i.bikeId === b.bikeId),
      customer: c ? { id: c.id, fullName: c.fullName, avatarUrl: c.avatarUrl, phone: c.phone } : null,
      customerVerified: cps.find((x) => x.id === b.customerId)?.verificationStatus === 'verified',
    };
  });
}
