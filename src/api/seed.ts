import type {
  AppNotification,
  Bike,
  BikeImage,
  Booking,
  BookingEvent,
  CustomerProfile,
  Payment,
  Profile,
  RentalPartner,
  RentalSession,
  Address,
  Review,
  TableMap,
  TableName,
} from '@/types/models';
import { buildFinalBill, buildRentalPlan, partnerShare } from '@/utils/pricing';

/**
 * DEMO dataset (Chennai). All people, numbers and documents are fictional.
 * No identity documents are seeded — the demo customer uploads test images.
 */

export const DEMO_IDS = {
  customer: '11111111-1111-4111-8111-111111111111',
  partner: '22222222-2222-4222-8222-222222222222',
  partner2: '22222222-2222-4222-8222-333333333333',
  partner3: '22222222-2222-4222-8222-444444444444',
  customer2: '11111111-1111-4111-8111-222222222222',
  customer3: '11111111-1111-4111-8111-333333333333',
} as const;

export const DEMO_ACCOUNTS = {
  customer: { email: 'customer@payanam.app', phone: '9876543210', userId: DEMO_IDS.customer },
  partner: { email: 'partner@payanam.app', phone: '9876500001', userId: DEMO_IDS.partner },
} as const;

type Seed = { [K in TableName]: TableMap[K][] };

let counter = 0;
const sid = (prefix: string) => {
  counter += 1;
  const n = counter.toString(16).padStart(12, '0');
  return `${prefix}-0000-4000-8000-${n}`;
};

const daysAgo = (d: number, hour = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

const base = (createdAt = daysAgo(60)) => ({ createdAt, updatedAt: createdAt });

function profile(id: string, role: Profile['role'], fullName: string, email: string, phone: string, age: number | null): Profile {
  return { id, role, fullName, email, phone, age, avatarUrl: null, phoneVerified: true, status: 'active', ...base() };
}

type BikeSeed = Omit<Bike, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'rating' | 'ratingCount' | 'city'> &
  Partial<Pick<Bike, 'status' | 'rating' | 'ratingCount'>>;

export async function buildSeed(): Promise<Seed> {
  counter = 0;
  const profiles: Profile[] = [
    profile(DEMO_IDS.customer, 'customer', 'Arjun Kumar', 'customer@payanam.app', '9876543210', 24),
    profile(DEMO_IDS.customer2, 'customer', 'Priya Raman', 'priya@example.com', '9000000002', 27),
    profile(DEMO_IDS.customer3, 'customer', 'Karthik Selvam', 'karthik@example.com', '9000000003', 31),
    profile(DEMO_IDS.partner, 'partner', 'Senthil Murugan', 'partner@payanam.app', '9876500001', 38),
    profile(DEMO_IDS.partner2, 'partner', 'Lakshmi Narayanan', 'lakshmi@example.com', '9000000012', 42),
    profile(DEMO_IDS.partner3, 'partner', 'Farhan Ali', 'farhan@example.com', '9000000013', 35),
  ];

  const customerProfiles: CustomerProfile[] = [
    { id: DEMO_IDS.customer, verificationStatus: 'unverified', rating: 4.8, totalRentals: 2, ...base() },
    { id: DEMO_IDS.customer2, verificationStatus: 'verified', rating: 4.9, totalRentals: 9, ...base() },
    { id: DEMO_IDS.customer3, verificationStatus: 'verified', rating: 4.6, totalRentals: 5, ...base() },
  ];

  const partner = (id: string, businessName: string, address: string, rating: number, ratingCount: number): RentalPartner => ({
    id,
    businessName,
    address,
    city: 'Chennai',
    idDocumentUrl: null,
    idVerificationStatus: 'verified',
    rating,
    ratingCount,
    payoutAccountName: null,
    payoutAccountMasked: null,
    payoutIfsc: null,
    payoutUpi: null,
    ...base(),
  });

  const rentalPartners: RentalPartner[] = [
    { ...partner(DEMO_IDS.partner, 'Murugan Bike Rentals', '42, Usman Road, T. Nagar', 4.7, 312), payoutAccountName: 'Murugan Bike Rentals', payoutAccountMasked: '•••• •••• 4821', payoutIfsc: 'HDFC0001234', payoutUpi: 'murugan.rentals@okhdfc' },
    partner(DEMO_IDS.partner2, 'Marina Wheels', '8, LB Road, Adyar', 4.5, 128),
    partner(DEMO_IDS.partner3, 'Velachery Ride Hub', '19, 100 Feet Road, Velachery', 4.4, 76),
  ];

  const addresses: Address[] = [
    { id: sid('aaaaaaaa'), ownerId: DEMO_IDS.partner, kind: 'pickup', label: 'T. Nagar shop', line1: '42, Usman Road, T. Nagar', city: 'Chennai', lat: 13.0418, lng: 80.2341, isDefault: true, ...base() },
    { id: sid('aaaaaaaa'), ownerId: DEMO_IDS.partner, kind: 'pickup', label: 'Mylapore branch', line1: '3, Kutchery Road, Mylapore', city: 'Chennai', lat: 13.0339, lng: 80.2619, isDefault: false, ...base() },
    { id: sid('aaaaaaaa'), ownerId: DEMO_IDS.customer, kind: 'saved', label: 'Home', line1: 'Nungambakkam High Road', city: 'Chennai', lat: 13.0569, lng: 80.2425, isDefault: true, ...base() },
    { id: sid('aaaaaaaa'), ownerId: DEMO_IDS.customer, kind: 'saved', label: 'Office', line1: 'Tidel Park, Taramani', city: 'Chennai', lat: 12.9894, lng: 80.2486, isDefault: false, ...base() },
  ];

  const bikeSeeds: BikeSeed[] = [
    { partnerId: DEMO_IDS.partner, brand: 'Honda', model: 'Activa 6G', year: 2023, registrationNumber: 'TN 09 CK 4521', bikeType: 'scooter', fuelType: 'petrol', transmission: 'automatic', engineCc: 110, mileageKmpl: 50, color: '#C0392B', seatingCapacity: 2, condition: 'excellent', dailyPrice: 499, hourlyPrice: 99, includedKmPerDay: 100, extraKmRate: 5, extraMinuteRate: 2, securityDeposit: 1000, forSale: true, purchasePrice: 65000, pickupLabel: 'T. Nagar shop', pickupLat: 13.0418, pickupLng: 80.2341, rating: 4.8, ratingCount: 142 },
    { partnerId: DEMO_IDS.partner, brand: 'Royal Enfield', model: 'Classic 350', year: 2022, registrationNumber: 'TN 09 DA 7710', bikeType: 'cruiser', fuelType: 'petrol', transmission: 'manual', engineCc: 349, mileageKmpl: 35, color: '#1F2A33', seatingCapacity: 2, condition: 'good', dailyPrice: 1199, hourlyPrice: 199, includedKmPerDay: 150, extraKmRate: 8, extraMinuteRate: 3, securityDeposit: 3000, forSale: true, purchasePrice: 168000, pickupLabel: 'T. Nagar shop', pickupLat: 13.0418, pickupLng: 80.2341, rating: 4.9, ratingCount: 98 },
    { partnerId: DEMO_IDS.partner, brand: 'TVS', model: 'Jupiter 125', year: 2023, registrationNumber: 'TN 07 BX 2210', bikeType: 'scooter', fuelType: 'petrol', transmission: 'automatic', engineCc: 125, mileageKmpl: 48, color: '#2E6DB4', seatingCapacity: 2, condition: 'excellent', dailyPrice: 449, hourlyPrice: 89, includedKmPerDay: 100, extraKmRate: 5, extraMinuteRate: 2, securityDeposit: 1000, forSale: false, purchasePrice: null, pickupLabel: 'Mylapore branch', pickupLat: 13.0339, pickupLng: 80.2619, rating: 4.6, ratingCount: 64 },
    { partnerId: DEMO_IDS.partner, brand: 'Bajaj', model: 'Pulsar NS200', year: 2021, registrationNumber: 'TN 10 AZ 9032', bikeType: 'sports', fuelType: 'petrol', transmission: 'manual', engineCc: 199, mileageKmpl: 36, color: '#E67E22', seatingCapacity: 2, condition: 'good', dailyPrice: 899, hourlyPrice: 149, includedKmPerDay: 120, extraKmRate: 6, extraMinuteRate: 2, securityDeposit: 2000, forSale: true, purchasePrice: 92000, pickupLabel: 'T. Nagar shop', pickupLat: 13.0418, pickupLng: 80.2341, rating: 4.5, ratingCount: 51 },
    { partnerId: DEMO_IDS.partner, brand: 'Hero', model: 'Splendor Plus', year: 2022, registrationNumber: 'TN 09 BQ 1187', bikeType: 'commuter', fuelType: 'petrol', transmission: 'manual', engineCc: 97, mileageKmpl: 65, color: '#34495E', seatingCapacity: 2, condition: 'good', dailyPrice: 349, hourlyPrice: 69, includedKmPerDay: 100, extraKmRate: 4, extraMinuteRate: 1, securityDeposit: 800, forSale: false, purchasePrice: null, pickupLabel: 'Mylapore branch', pickupLat: 13.0339, pickupLng: 80.2619, status: 'MAINTENANCE', rating: 4.4, ratingCount: 210 },
    { partnerId: DEMO_IDS.partner2, brand: 'Ather', model: '450X', year: 2024, registrationNumber: 'TN 07 EV 0450', bikeType: 'electric', fuelType: 'electric', transmission: 'automatic', engineCc: 0, mileageKmpl: 110, color: '#7F8C8D', seatingCapacity: 2, condition: 'excellent', dailyPrice: 699, hourlyPrice: 129, includedKmPerDay: 90, extraKmRate: 4, extraMinuteRate: 2, securityDeposit: 2000, forSale: true, purchasePrice: 145000, pickupLabel: 'Adyar, LB Road', pickupLat: 13.0012, pickupLng: 80.2565, rating: 4.7, ratingCount: 37 },
    { partnerId: DEMO_IDS.partner2, brand: 'Yamaha', model: 'FZ-S V3', year: 2022, registrationNumber: 'TN 07 CF 3341', bikeType: 'sports', fuelType: 'petrol', transmission: 'manual', engineCc: 149, mileageKmpl: 45, color: '#1A4E8A', seatingCapacity: 2, condition: 'good', dailyPrice: 749, hourlyPrice: 129, includedKmPerDay: 120, extraKmRate: 6, extraMinuteRate: 2, securityDeposit: 1500, forSale: false, purchasePrice: null, pickupLabel: 'Adyar, LB Road', pickupLat: 13.0012, pickupLng: 80.2565, rating: 4.5, ratingCount: 44 },
    { partnerId: DEMO_IDS.partner2, brand: 'Suzuki', model: 'Access 125', year: 2023, registrationNumber: 'TN 07 DK 5528', bikeType: 'scooter', fuelType: 'petrol', transmission: 'automatic', engineCc: 124, mileageKmpl: 45, color: '#ECF0F1', seatingCapacity: 2, condition: 'excellent', dailyPrice: 479, hourlyPrice: 95, includedKmPerDay: 100, extraKmRate: 5, extraMinuteRate: 2, securityDeposit: 1000, forSale: true, purchasePrice: 72000, pickupLabel: 'Besant Nagar', pickupLat: 12.9980, pickupLng: 80.2668, rating: 4.6, ratingCount: 58 },
    { partnerId: DEMO_IDS.partner3, brand: 'TVS', model: 'Apache RTR 160', year: 2021, registrationNumber: 'TN 22 BB 8890', bikeType: 'sports', fuelType: 'petrol', transmission: 'manual', engineCc: 160, mileageKmpl: 45, color: '#B03A2E', seatingCapacity: 2, condition: 'fair', dailyPrice: 649, hourlyPrice: 119, includedKmPerDay: 120, extraKmRate: 6, extraMinuteRate: 2, securityDeposit: 1500, forSale: true, purchasePrice: 78000, pickupLabel: 'Velachery', pickupLat: 12.9815, pickupLng: 80.2180, rating: 4.3, ratingCount: 29 },
    { partnerId: DEMO_IDS.partner3, brand: 'Ola', model: 'S1 Air', year: 2024, registrationNumber: 'TN 22 EV 1011', bikeType: 'electric', fuelType: 'electric', transmission: 'automatic', engineCc: 0, mileageKmpl: 120, color: '#F4D03F', seatingCapacity: 2, condition: 'excellent', dailyPrice: 599, hourlyPrice: 109, includedKmPerDay: 90, extraKmRate: 4, extraMinuteRate: 2, securityDeposit: 1500, forSale: false, purchasePrice: null, pickupLabel: 'Guindy', pickupLat: 13.0067, pickupLng: 80.2206, rating: 4.5, ratingCount: 18 },
  ];

  const bikes: Bike[] = bikeSeeds.map((b) => ({
    status: 'AVAILABLE',
    rating: 4.5,
    ratingCount: 0,
    ...b,
    city: 'Chennai',
    id: sid('bbbbbbbb'),
    ...base(),
  }));

  // Seed bikes ship without photos: the UI renders PAYANAM's illustrated placeholders.
  const bikeImages: BikeImage[] = [];

  const bookings: Booking[] = [];
  const bookingEvents: BookingEvent[] = [];
  const rentalSessions: RentalSession[] = [];
  const payments: Payment[] = [];
  const reviews: Review[] = [];

  function completed(customerId: string, bike: Bike, day: number, planType: 'full_day' | 'half_day' | 'hourly', units: number, extraKm: number, extraMin: number) {
    const plan = buildRentalPlan(bike, planType, units);
    const start = daysAgo(day, 9 + (day % 5));
    const startMs = new Date(start).getTime();
    const actualMinutes = plan.includedDurationMinutes + extraMin - (extraMin === 0 ? 45 : 0);
    const actualKm = plan.includedDistanceKm * 0.7 + extraKm + (extraKm > 0 ? plan.includedDistanceKm * 0.3 : 0);
    const end = new Date(startMs + actualMinutes * 60000).toISOString();
    const bill = buildFinalBill(plan, actualKm, actualMinutes, 0, true);
    const id = sid('cccccccc');
    const sessionId = sid('dddddddd');
    bookings.push({
      id,
      customerId,
      partnerId: bike.partnerId,
      bikeId: bike.id,
      status: 'COMPLETED',
      plan,
      startTime: start,
      endTime: new Date(startMs + plan.includedDurationMinutes * 60000).toISOString(),
      estimatedTotal: plan.baseAmount + plan.securityDeposit,
      preInspectionId: null,
      returnInspectionId: null,
      inspectionPassed: true,
      faceVerified: true,
      rentalSessionId: sessionId,
      damageReportId: null,
      finalBill: bill,
      cancelReason: null,
      createdAt: daysAgo(day + 1, 18),
      updatedAt: end,
    });
    rentalSessions.push({
      id: sessionId,
      bookingId: id,
      startedAt: start,
      endedAt: end,
      simulatedKm: 0,
      simulatedMinutes: 0,
      finalDistanceKm: bill.actualDistanceKm,
      finalDurationMinutes: bill.actualDurationMinutes,
      createdAt: start,
      updatedAt: end,
    });
    const statuses: Booking['status'][] = ['PENDING_OWNER_CONFIRMATION', 'CONFIRMED', 'READY_FOR_PICKUP', 'BIKE_INSPECTION', 'CUSTOMER_VERIFICATION', 'ACTIVE', 'RETURN_REQUESTED', 'RETURN_INSPECTION', 'COMPLETED'];
    statuses.forEach((to, i) => {
      const at = i < 5 ? new Date(startMs - (5 - i) * 600000).toISOString() : i === 5 ? start : end;
      bookingEvents.push({
        id: sid('eeeeeeee'),
        bookingId: id,
        fromStatus: i === 0 ? 'DRAFT' : statuses[i - 1],
        toStatus: to,
        actorId: ['CONFIRMED', 'BIKE_INSPECTION', 'CUSTOMER_VERIFICATION', 'COMPLETED'].includes(to) ? bike.partnerId : customerId,
        actorRole: ['CONFIRMED', 'BIKE_INSPECTION', 'CUSTOMER_VERIFICATION', 'COMPLETED'].includes(to) ? 'partner' : 'customer',
        note: null,
        createdAt: at,
        updatedAt: at,
      });
    });
    payments.push({
      id: sid('ffffffff'),
      bookingId: id,
      payerId: customerId,
      partnerId: bike.partnerId,
      kind: 'rental_charge',
      amount: bill.total,
      partnerAmount: partnerShare(bill.total),
      status: 'paid',
      provider: 'mock',
      isMock: true,
      reference: `DEMO-${id.slice(-6).toUpperCase()}`,
      settlementStatus: day <= 2 ? 'pending' : 'settled',
      createdAt: end,
      updatedAt: end,
    });
    reviews.push({ id: sid('99999999'), bookingId: id, bikeId: bike.id, authorId: customerId, rating: 4 + (day % 2), comment: 'Smooth ride, clean bike.', createdAt: end, updatedAt: end });
  }

  const [activa, classic, jupiter, pulsar, splendor, ather, fz] = bikes;
  // Partner 1 earnings history across the last month
  const history: [string, Bike, number, 'full_day' | 'half_day' | 'hourly', number, number, number][] = [
    [DEMO_IDS.customer2, activa, 1, 'full_day', 1, 12, 0],
    [DEMO_IDS.customer3, classic, 2, 'full_day', 1, 0, 25],
    [DEMO_IDS.customer2, jupiter, 3, 'half_day', 1, 0, 0],
    [DEMO_IDS.customer3, pulsar, 4, 'full_day', 1, 20, 0],
    [DEMO_IDS.customer2, classic, 6, 'full_day', 1, 0, 0],
    [DEMO_IDS.customer, activa, 8, 'full_day', 1, 10, 10],
    [DEMO_IDS.customer3, splendor, 10, 'hourly', 4, 0, 0],
    [DEMO_IDS.customer2, pulsar, 13, 'full_day', 1, 0, 0],
    [DEMO_IDS.customer3, activa, 16, 'half_day', 1, 5, 0],
    [DEMO_IDS.customer2, classic, 19, 'full_day', 1, 30, 0],
    [DEMO_IDS.customer3, jupiter, 23, 'full_day', 1, 0, 15],
    [DEMO_IDS.customer2, activa, 27, 'full_day', 1, 0, 0],
    [DEMO_IDS.customer, ather, 20, 'full_day', 1, 0, 0],
    [DEMO_IDS.customer2, fz, 12, 'half_day', 1, 0, 0],
  ];
  history.forEach((h) => completed(...h));

  // A cancelled booking in the demo customer's history
  const cancelledId = sid('cccccccc');
  const cPlan = buildRentalPlan(jupiter, 'full_day');
  bookings.push({
    id: cancelledId,
    customerId: DEMO_IDS.customer,
    partnerId: jupiter.partnerId,
    bikeId: jupiter.id,
    status: 'CANCELLED',
    plan: cPlan,
    startTime: daysAgo(5, 10),
    endTime: daysAgo(4, 10),
    estimatedTotal: cPlan.baseAmount + cPlan.securityDeposit,
    preInspectionId: null,
    returnInspectionId: null,
    inspectionPassed: false,
    faceVerified: false,
    rentalSessionId: null,
    damageReportId: null,
    finalBill: null,
    cancelReason: 'Change of plans',
    ...base(daysAgo(6, 20)),
  });
  bookingEvents.push(
    { id: sid('eeeeeeee'), bookingId: cancelledId, fromStatus: 'DRAFT', toStatus: 'PENDING_OWNER_CONFIRMATION', actorId: DEMO_IDS.customer, actorRole: 'customer', note: null, ...base(daysAgo(6, 20)) },
    { id: sid('eeeeeeee'), bookingId: cancelledId, fromStatus: 'PENDING_OWNER_CONFIRMATION', toStatus: 'CANCELLED', actorId: DEMO_IDS.customer, actorRole: 'customer', note: 'Change of plans', ...base(daysAgo(6, 21)) },
  );

  const note = (userId: string, category: AppNotification['category'], type: string, title: string, body: string, ago: number, read: boolean): AppNotification => ({
    id: sid('77777777'),
    userId,
    category,
    type,
    title,
    body,
    bookingId: null,
    read,
    ...base(new Date(Date.now() - ago * 3600000).toISOString()),
  });

  const notifications: AppNotification[] = [
    note(DEMO_IDS.customer, 'system', 'promotion', 'Weekend ride offer', 'Get 15% off on Royal Enfield rentals this weekend. Offer applied automatically.', 3, false),
    note(DEMO_IDS.customer, 'verification', 'verification_required', 'Verify your identity', 'Upload your Aadhaar and Driving Licence once to book any bike on PAYANAM.', 5, false),
    note(DEMO_IDS.customer, 'system', 'update', 'Welcome to PAYANAM', 'Your journey starts here. Find verified bikes near you in minutes.', 30, true),
    note(DEMO_IDS.partner, 'payment', 'payment_received', 'Payment received', 'Settlement for your last 3 rentals has been processed to your bank account (demo payout).', 4, false),
    note(DEMO_IDS.partner, 'system', 'update', 'Tip: add speedometer photos', 'Clear speedometer photos speed up return inspections and reduce disputes.', 26, true),
  ];

  return {
    profiles,
    customer_profiles: customerProfiles,
    rental_partners: rentalPartners,
    addresses,
    bikes,
    bike_images: bikeImages,
    bike_availability: [],
    documents: [],
    document_verifications: [],
    bookings,
    booking_events: bookingEvents,
    bike_inspections: [],
    inspection_images: [],
    face_verifications: [],
    rental_sessions: rentalSessions,
    rental_usage: [],
    damage_reports: [],
    notifications,
    reviews,
    payments,
    support_tickets: [],
  };
}
