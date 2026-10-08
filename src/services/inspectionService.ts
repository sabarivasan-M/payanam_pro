import { db, getOrThrow } from '@/api/db';
import type { BikeInspection, InspectionAngle, InspectionResult } from '@/types/models';
import { AppError } from '@/utils/errors';
import { bookingService, type Actor } from './bookingService';
import { mockBikeInspectionService, type BikeInspectionProvider } from './mock/mockBikeInspectionService';
import { trackingService } from './trackingService';

/**
 * bikeInspectionService — pre-rental (handover) and return inspections.
 * Analysis is delegated to a provider; in demo mode that is the MOCK provider.
 */
const provider: BikeInspectionProvider = mockBikeInspectionService;

export const REQUIRED_INSPECTION_ANGLES: { angle: InspectionAngle; label: string; hint: string }[] = [
  { angle: 'front', label: 'Front view', hint: 'Headlight, mudguard and number plate' },
  { angle: 'rear', label: 'Rear view', hint: 'Tail lamp and rear number plate' },
  { angle: 'left', label: 'Left side', hint: 'Full left profile of the bike' },
  { angle: 'right', label: 'Right side', hint: 'Full right profile of the bike' },
  { angle: 'speedometer', label: 'Speedometer', hint: 'Odometer reading clearly visible' },
];

export type InspectionPhotos = Partial<Record<InspectionAngle, string>> & { damage?: string };

function toList(photos: InspectionPhotos, extraDamage: string[] = []) {
  const list: { angle: InspectionAngle; url: string }[] = [];
  (Object.keys(photos) as InspectionAngle[]).forEach((angle) => {
    const url = photos[angle];
    if (url) list.push({ angle, url });
  });
  extraDamage.forEach((url) => list.push({ angle: 'damage', url }));
  return list;
}

function assertComplete(photos: InspectionPhotos) {
  const missing = REQUIRED_INSPECTION_ANGLES.filter((a) => !photos[a.angle]);
  if (missing.length) throw new AppError(`Add the ${missing.map((m) => m.label.toLowerCase()).join(', ')} photo.`);
}

async function saveInspection(
  bookingId: string,
  bikeId: string,
  kind: BikeInspection['kind'],
  actor: Actor,
  images: { angle: InspectionAngle; url: string }[],
  result: InspectionResult,
) {
  const inspection = await db.insert('bike_inspections', {
    bookingId,
    bikeId,
    kind,
    performedBy: actor.id,
    result,
    status: result.verdict === 'passed' ? 'passed' : 'review_required',
  });
  await Promise.all(images.map((img) => db.insert('inspection_images', { inspectionId: inspection.id, angle: img.angle, url: img.url })));
  return inspection;
}

export const inspectionService = {
  provider: provider.name,
  isMock: provider.isMock,

  /** Partner handover inspection. Passing moves the booking to CUSTOMER_VERIFICATION. */
  async submitPreRental(bookingId: string, actor: Actor, photos: InspectionPhotos, damagePhotos: string[]) {
    assertComplete(photos);
    const booking = await getOrThrow('bookings', bookingId);
    if (booking.status !== 'BIKE_INSPECTION') throw new AppError('Start the handover inspection first.');
    const images = toList(photos, damagePhotos);
    const result = await provider.analyzePreRental(images);
    const inspection = await saveInspection(bookingId, booking.bikeId, 'pre_rental', actor, images, result);
    if (result.verdict !== 'passed') {
      await db.update('bookings', bookingId, { preInspectionId: inspection.id });
      return { inspection, result };
    }
    await bookingService.transition(bookingId, 'CUSTOMER_VERIFICATION', actor, {
      patch: { preInspectionId: inspection.id, inspectionPassed: true },
    });
    return { inspection, result };
  },

  /** Customer return photos → mock comparison → RETURN_INSPECTION (owner reviews). */
  async submitReturn(bookingId: string, actor: Actor, photos: InspectionPhotos, simulateDamage: boolean) {
    assertComplete(photos);
    const booking = await getOrThrow('bookings', bookingId);
    if (booking.status !== 'RETURN_REQUESTED') throw new AppError('End the rental before returning the bike.');
    const before = booking.preInspectionId
      ? await db.list('inspection_images', { where: { inspectionId: booking.preInspectionId } })
      : [];
    const after = toList(photos);
    const result = await provider.compareReturn({
      before: before.map((b) => ({ angle: b.angle, url: b.url })),
      after,
      simulateDamage,
    });
    const inspection = await saveInspection(bookingId, booking.bikeId, 'return', actor, after, result);
    if (booking.rentalSessionId) await trackingService.finalize(booking.rentalSessionId);
    await bookingService.transition(bookingId, 'RETURN_INSPECTION', actor, { patch: { returnInspectionId: inspection.id } });
    return { inspection, result };
  },
};
