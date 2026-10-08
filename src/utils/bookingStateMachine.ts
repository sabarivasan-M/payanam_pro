import type { Booking, BookingStatus, Role } from '@/types/models';

/**
 * Booking lifecycle.
 *
 *  DRAFT ─▶ PENDING_VERIFICATION ─▶ PENDING_OWNER_CONFIRMATION ─▶ CONFIRMED ─▶ CUSTOMER_ARRIVING
 *     │                                   │                                          │
 *     └──────────────▶────────────────────┘── REJECTED                               ▼
 *                                                                       READY_FOR_PICKUP ("You're here")
 *                                                                                    ▼
 *                                                                BIKE_INSPECTION (partner photos + mock AI)
 *                                                                                    ▼
 *                                                             CUSTOMER_VERIFICATION (selfie + mock face match)
 *                                                                                    ▼
 *                                                                                 ACTIVE
 *                                                                                    ▼
 *                                                          RETURN_REQUESTED (customer return photos)
 *                                                                                    ▼
 *                                                     RETURN_INSPECTION (mock compare + owner review)
 *                                                                │                   │
 *                                                                ▼                   ▼
 *                                                          DAMAGE_REVIEW ───────▶ COMPLETED
 *
 *  Any pre-rental state may move to CANCELLED.
 */

interface TransitionRule {
  to: BookingStatus;
  /** Who may trigger this transition */
  by: (Role | 'system')[];
}

const PRE_RENTAL_CANCEL: TransitionRule = { to: 'CANCELLED', by: ['customer', 'partner', 'system'] };

export const BOOKING_TRANSITIONS: Record<BookingStatus, TransitionRule[]> = {
  DRAFT: [
    { to: 'PENDING_VERIFICATION', by: ['customer', 'system'] },
    { to: 'PENDING_OWNER_CONFIRMATION', by: ['customer', 'system'] },
    PRE_RENTAL_CANCEL,
  ],
  PENDING_VERIFICATION: [{ to: 'PENDING_OWNER_CONFIRMATION', by: ['system', 'customer'] }, PRE_RENTAL_CANCEL],
  PENDING_OWNER_CONFIRMATION: [
    { to: 'CONFIRMED', by: ['partner'] },
    { to: 'REJECTED', by: ['partner', 'system'] },
    PRE_RENTAL_CANCEL,
  ],
  REJECTED: [],
  CONFIRMED: [{ to: 'CUSTOMER_ARRIVING', by: ['customer'] }, { to: 'READY_FOR_PICKUP', by: ['customer', 'partner'] }, PRE_RENTAL_CANCEL],
  CUSTOMER_ARRIVING: [{ to: 'READY_FOR_PICKUP', by: ['customer', 'partner'] }, PRE_RENTAL_CANCEL],
  READY_FOR_PICKUP: [{ to: 'BIKE_INSPECTION', by: ['partner'] }, PRE_RENTAL_CANCEL],
  BIKE_INSPECTION: [{ to: 'CUSTOMER_VERIFICATION', by: ['partner', 'system'] }, PRE_RENTAL_CANCEL],
  CUSTOMER_VERIFICATION: [{ to: 'ACTIVE', by: ['customer', 'partner'] }, PRE_RENTAL_CANCEL],
  ACTIVE: [{ to: 'RETURN_REQUESTED', by: ['customer', 'partner'] }],
  RETURN_REQUESTED: [{ to: 'RETURN_INSPECTION', by: ['customer', 'system'] }],
  RETURN_INSPECTION: [
    { to: 'COMPLETED', by: ['partner'] },
    { to: 'DAMAGE_REVIEW', by: ['partner'] },
  ],
  DAMAGE_REVIEW: [{ to: 'COMPLETED', by: ['customer', 'partner', 'system'] }],
  COMPLETED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: BookingStatus, to: BookingStatus, reason?: string) {
    super(reason ?? `Booking cannot move from ${from} to ${to}.`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: BookingStatus, to: BookingStatus, actor: Role | 'system'): boolean {
  return BOOKING_TRANSITIONS[from].some((r) => r.to === to && r.by.includes(actor));
}

/**
 * Extra business guards on top of the graph. Returns an error message when the
 * transition is structurally allowed but the booking isn't ready for it.
 */
export function transitionGuard(booking: Booking, to: BookingStatus): string | null {
  if (to === 'CUSTOMER_VERIFICATION' && !booking.inspectionPassed) {
    return 'The bike inspection must pass before customer verification.';
  }
  if (to === 'ACTIVE') {
    if (!booking.inspectionPassed) return 'Bike inspection is not complete.';
    if (!booking.faceVerified) return 'Customer selfie verification is not complete.';
  }
  return null;
}

export function assertTransition(booking: Booking, to: BookingStatus, actor: Role | 'system'): void {
  if (!canTransition(booking.status, to, actor)) {
    throw new InvalidTransitionError(booking.status, to);
  }
  const guard = transitionGuard(booking, to);
  if (guard) throw new InvalidTransitionError(booking.status, to, guard);
}

export const CANCELLABLE_STATUSES: BookingStatus[] = (Object.keys(BOOKING_TRANSITIONS) as BookingStatus[]).filter(
  (s) => BOOKING_TRANSITIONS[s].some((r) => r.to === 'CANCELLED'),
);

export const UPCOMING_STATUSES: BookingStatus[] = [
  'DRAFT',
  'PENDING_VERIFICATION',
  'PENDING_OWNER_CONFIRMATION',
  'CONFIRMED',
  'CUSTOMER_ARRIVING',
  'READY_FOR_PICKUP',
  'BIKE_INSPECTION',
  'CUSTOMER_VERIFICATION',
];

export const IN_PROGRESS_STATUSES: BookingStatus[] = [
  'ACTIVE',
  'RETURN_REQUESTED',
  'RETURN_INSPECTION',
  'DAMAGE_REVIEW',
];

export const TERMINAL_STATUSES: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'REJECTED'];

/** Statuses during which the bike is held for this booking */
export const BIKE_HOLD_STATUSES: BookingStatus[] = [
  'PENDING_OWNER_CONFIRMATION',
  'CONFIRMED',
  'CUSTOMER_ARRIVING',
  'READY_FOR_PICKUP',
  'BIKE_INSPECTION',
  'CUSTOMER_VERIFICATION',
  'ACTIVE',
  'RETURN_REQUESTED',
  'RETURN_INSPECTION',
  'DAMAGE_REVIEW',
];

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING_VERIFICATION: { label: 'Verifying documents', tone: 'warning' },
  PENDING_OWNER_CONFIRMATION: { label: 'Awaiting partner', tone: 'warning' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  CUSTOMER_ARRIVING: { label: 'On the way', tone: 'info' },
  READY_FOR_PICKUP: { label: 'Arrived', tone: 'info' },
  BIKE_INSPECTION: { label: 'Bike inspection', tone: 'info' },
  CUSTOMER_VERIFICATION: { label: 'Identity check', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'primary' },
  RETURN_REQUESTED: { label: 'Returning', tone: 'warning' },
  RETURN_INSPECTION: { label: 'Return inspection', tone: 'warning' },
  DAMAGE_REVIEW: { label: 'Damage review', tone: 'danger' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

/** Ordered milestones shown in the handover/timeline UI */
export const LIFECYCLE_MILESTONES: { status: BookingStatus; label: string }[] = [
  { status: 'PENDING_OWNER_CONFIRMATION', label: 'Booking requested' },
  { status: 'CONFIRMED', label: 'Partner accepted' },
  { status: 'READY_FOR_PICKUP', label: 'Customer arrived' },
  { status: 'BIKE_INSPECTION', label: 'Bike inspection' },
  { status: 'CUSTOMER_VERIFICATION', label: 'Identity verification' },
  { status: 'ACTIVE', label: 'Rental started' },
  { status: 'RETURN_INSPECTION', label: 'Bike returned' },
  { status: 'COMPLETED', label: 'Completed' },
];

const ORDER: BookingStatus[] = [
  'DRAFT',
  'PENDING_VERIFICATION',
  'PENDING_OWNER_CONFIRMATION',
  'CONFIRMED',
  'CUSTOMER_ARRIVING',
  'READY_FOR_PICKUP',
  'BIKE_INSPECTION',
  'CUSTOMER_VERIFICATION',
  'ACTIVE',
  'RETURN_REQUESTED',
  'RETURN_INSPECTION',
  'DAMAGE_REVIEW',
  'COMPLETED',
];

export const statusRank = (s: BookingStatus) => ORDER.indexOf(s);
