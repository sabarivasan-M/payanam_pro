import { db, getOrThrow } from '@/api/db';
import { AppError } from '@/utils/errors';
import type { Actor } from './bookingService';
import { mockFaceVerificationService, type FaceVerificationProvider } from './mock/mockFaceVerificationService';

/**
 * Selfie verification at handover. In demo mode the MOCK provider is used — it does not
 * perform any biometric comparison (see mockFaceVerificationService).
 */
const provider: FaceVerificationProvider = mockFaceVerificationService;

export const faceVerificationService = {
  provider: provider.name,
  isMock: provider.isMock,

  async verifySelfie(bookingId: string, actor: Actor, selfieUrl: string) {
    const booking = await getOrThrow('bookings', bookingId);
    if (booking.customerId !== actor.id) throw new AppError('Only the customer can complete this step.', 'FORBIDDEN');
    if (booking.status !== 'CUSTOMER_VERIFICATION') throw new AppError('Selfie verification is not open for this booking.');

    const aadhaar = (await db.list('documents', { where: { customerId: actor.id, type: 'aadhaar', status: 'verified' } }))[0];
    const outcome = await provider.compare({ selfieUrl, referenceImageUrl: aadhaar?.imageUrl ?? null });
    const record = await db.insert('face_verifications', {
      bookingId,
      customerId: actor.id,
      selfieUrl,
      provider: provider.name,
      isMock: provider.isMock,
      matchScore: outcome.score,
      status: outcome.matched ? 'verified' : 'failed',
    });
    if (outcome.matched) await db.update('bookings', bookingId, { faceVerified: true });
    return { record, matched: outcome.matched, reason: outcome.reason };
  },
};
