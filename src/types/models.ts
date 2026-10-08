/**
 * PAYANAM domain models.
 * Fields are camelCase in the app; the Supabase gateway maps them to snake_case columns.
 * Every row has uuid `id`, `createdAt`, `updatedAt` (ISO strings).
 */

export type UUID = string;
export type ISODate = string;

export interface BaseRow {
  id: UUID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type Role = 'customer' | 'partner';

export interface Profile extends BaseRow {
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  age: number | null;
  avatarUrl: string | null;
  phoneVerified: boolean;
  status: 'active' | 'deletion_requested';
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface CustomerProfile extends BaseRow {
  /** Same as profiles.id */
  verificationStatus: VerificationStatus;
  rating: number;
  totalRentals: number;
}

export interface RentalPartner extends BaseRow {
  /** Same as profiles.id */
  businessName: string;
  address: string;
  city: string;
  idDocumentUrl: string | null;
  idVerificationStatus: VerificationStatus;
  rating: number;
  ratingCount: number;
  payoutAccountName: string | null;
  payoutAccountMasked: string | null;
  payoutIfsc: string | null;
  payoutUpi: string | null;
}

export interface Address extends BaseRow {
  ownerId: UUID;
  kind: 'saved' | 'pickup';
  label: string;
  line1: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export type BikeType = 'scooter' | 'commuter' | 'sports' | 'cruiser' | 'electric';
export type FuelType = 'petrol' | 'electric';
export type Transmission = 'automatic' | 'manual';
export type BikeStatus = 'AVAILABLE' | 'BOOKED' | 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
export type BikeCondition = 'excellent' | 'good' | 'fair';
export type PhotoAngle = 'front' | 'rear' | 'left' | 'right' | 'speedometer';

export interface Bike extends BaseRow {
  partnerId: UUID;
  brand: string;
  model: string;
  year: number;
  registrationNumber: string;
  bikeType: BikeType;
  fuelType: FuelType;
  transmission: Transmission;
  engineCc: number;
  mileageKmpl: number;
  color: string;
  seatingCapacity: number;
  condition: BikeCondition;
  dailyPrice: number;
  hourlyPrice: number;
  includedKmPerDay: number;
  extraKmRate: number;
  extraMinuteRate: number;
  securityDeposit: number;
  forSale: boolean;
  purchasePrice: number | null;
  pickupLabel: string;
  pickupLat: number;
  pickupLng: number;
  city: string;
  status: BikeStatus;
  rating: number;
  ratingCount: number;
}

export interface BikeImage extends BaseRow {
  bikeId: UUID;
  angle: PhotoAngle;
  url: string;
}

export interface BikeAvailability extends BaseRow {
  bikeId: UUID;
  startTime: ISODate;
  endTime: ISODate;
  reason: 'booking' | 'blocked';
  bookingId: UUID | null;
}

export type DocumentType = 'aadhaar' | 'driving_licence';
export type DocumentStatus = 'not_uploaded' | 'uploaded' | 'under_verification' | 'verified' | 'rejected';

export interface IdentityDocument extends BaseRow {
  customerId: UUID;
  type: DocumentType;
  imageUrl: string;
  status: DocumentStatus;
  rejectionReason: string | null;
}

export interface DocumentVerification extends BaseRow {
  documentId: UUID;
  provider: string;
  isMock: boolean;
  result: 'verified' | 'rejected' | 'needs_more_info';
  confidence: number;
  notes: string;
}

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'PENDING_OWNER_CONFIRMATION'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'CUSTOMER_ARRIVING'
  | 'READY_FOR_PICKUP'
  | 'BIKE_INSPECTION'
  | 'CUSTOMER_VERIFICATION'
  | 'ACTIVE'
  | 'RETURN_REQUESTED'
  | 'RETURN_INSPECTION'
  | 'DAMAGE_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

export type PlanType = 'hourly' | 'half_day' | 'full_day' | 'custom';

/** Every rental plan carries its own limits — see utils/pricing.ts */
export interface RentalPlan {
  planType: PlanType;
  label: string;
  /** hours for hourly, days for custom, 1 otherwise */
  units: number;
  baseAmount: number;
  includedDistanceKm: number;
  includedDurationMinutes: number;
  extraKmRate: number;
  extraMinuteRate: number;
  securityDeposit: number;
}

export interface FinalBill {
  baseAmount: number;
  actualDistanceKm: number;
  actualDurationMinutes: number;
  extraKm: number;
  extraKmCharge: number;
  extraMinutes: number;
  extraTimeCharge: number;
  damageCharge: number;
  total: number;
  securityDeposit: number;
  depositStatus: 'REFUNDABLE' | 'REFUNDED';
  generatedAt: ISODate;
}

export interface Booking extends BaseRow {
  customerId: UUID;
  partnerId: UUID;
  bikeId: UUID;
  status: BookingStatus;
  plan: RentalPlan;
  startTime: ISODate;
  endTime: ISODate;
  estimatedTotal: number;
  preInspectionId: UUID | null;
  returnInspectionId: UUID | null;
  inspectionPassed: boolean;
  faceVerified: boolean;
  rentalSessionId: UUID | null;
  damageReportId: UUID | null;
  finalBill: FinalBill | null;
  cancelReason: string | null;
}

export interface BookingEvent extends BaseRow {
  bookingId: UUID;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorId: UUID;
  actorRole: Role | 'system';
  note: string | null;
}

export type InspectionKind = 'pre_rental' | 'return';
export type DamageLevel = 'none' | 'minor' | 'major';

export interface InspectionResult {
  provider: string;
  isMock: boolean;
  vehicleDetected: boolean;
  visibleDamage: DamageLevel;
  speedometer: 'readable' | 'unreadable';
  newDamage: 'none_detected' | 'detected' | null;
  condition: 'good' | 'fair' | 'poor';
  differences: string[];
  verdict: 'passed' | 'review_required';
}

export interface BikeInspection extends BaseRow {
  bookingId: UUID;
  bikeId: UUID;
  kind: InspectionKind;
  performedBy: UUID;
  result: InspectionResult | null;
  status: 'pending' | 'passed' | 'review_required';
}

export type InspectionAngle = PhotoAngle | 'damage';

export interface InspectionImage extends BaseRow {
  inspectionId: UUID;
  angle: InspectionAngle;
  url: string;
}

export interface FaceVerification extends BaseRow {
  bookingId: UUID;
  customerId: UUID;
  selfieUrl: string;
  provider: string;
  isMock: boolean;
  matchScore: number;
  status: 'verified' | 'failed';
}

export interface RentalSession extends BaseRow {
  bookingId: UUID;
  startedAt: ISODate;
  endedAt: ISODate | null;
  /** Demo-only offsets used by the mock tracker */
  simulatedKm: number;
  simulatedMinutes: number;
  finalDistanceKm: number | null;
  finalDurationMinutes: number | null;
}

export interface RentalUsage extends BaseRow {
  sessionId: UUID;
  distanceKm: number;
  durationMinutes: number;
  lat: number;
  lng: number;
  recordedAt: ISODate;
}

export type DamageSeverity = 'none' | 'minor' | 'major' | 'manual_review';

export interface DamageReport extends BaseRow {
  bookingId: UUID;
  inspectionId: UUID;
  reportedBy: UUID;
  severity: DamageSeverity;
  description: string;
  proposedAmount: number;
  photoUrls: string[];
  status: 'proposed' | 'accepted' | 'manual_review' | 'resolved';
  customerResponse: string | null;
}

export type NotificationCategory = 'booking' | 'verification' | 'rental' | 'return' | 'payment' | 'system';

export interface AppNotification extends BaseRow {
  userId: UUID;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  bookingId: UUID | null;
  read: boolean;
}

export interface Review extends BaseRow {
  bookingId: UUID;
  bikeId: UUID;
  authorId: UUID;
  rating: number;
  comment: string;
}

export interface Payment extends BaseRow {
  bookingId: UUID;
  payerId: UUID;
  partnerId: UUID;
  kind: 'authorization' | 'rental_charge' | 'deposit_refund';
  amount: number;
  /** Partner share after platform fee (rental_charge only) */
  partnerAmount: number;
  status: 'authorized' | 'paid' | 'refunded' | 'failed' | 'void';
  provider: string;
  isMock: boolean;
  reference: string;
  settlementStatus: 'pending' | 'settled' | 'not_applicable';
}

export interface SupportTicket extends BaseRow {
  userId: UUID;
  category: 'booking' | 'payment' | 'verification' | 'app' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'resolved';
}

/** Table name → row type. Names match the Supabase tables. */
export interface TableMap {
  profiles: Profile;
  customer_profiles: CustomerProfile;
  rental_partners: RentalPartner;
  addresses: Address;
  bikes: Bike;
  bike_images: BikeImage;
  bike_availability: BikeAvailability;
  documents: IdentityDocument;
  document_verifications: DocumentVerification;
  bookings: Booking;
  booking_events: BookingEvent;
  bike_inspections: BikeInspection;
  inspection_images: InspectionImage;
  face_verifications: FaceVerification;
  rental_sessions: RentalSession;
  rental_usage: RentalUsage;
  damage_reports: DamageReport;
  notifications: AppNotification;
  reviews: Review;
  payments: Payment;
  support_tickets: SupportTicket;
}

export type TableName = keyof TableMap;
export type Row<K extends TableName> = TableMap[K];
export type InsertRow<K extends TableName> = Omit<Row<K>, 'id' | 'createdAt' | 'updatedAt'> & { id?: UUID };
export type UpdateRow<K extends TableName> = Partial<Omit<Row<K>, 'id' | 'createdAt'>>;

/** Composite read models used by screens */
export interface BikeWithMeta extends Bike {
  images: BikeImage[];
  partner: Pick<RentalPartner, 'id' | 'businessName' | 'rating' | 'ratingCount' | 'city'> | null;
  distanceKm: number | null;
}

export interface BookingDetails extends Booking {
  bike: Bike;
  bikeImages: BikeImage[];
  customer: Profile;
  customerProfile: CustomerProfile | null;
  partnerProfile: Profile;
  partner: RentalPartner;
  events: BookingEvent[];
  session: RentalSession | null;
  preInspection: (BikeInspection & { images: InspectionImage[] }) | null;
  returnInspection: (BikeInspection & { images: InspectionImage[] }) | null;
  damageReport: DamageReport | null;
  faceVerification: FaceVerification | null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}
