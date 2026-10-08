import { delay } from '@/lib/id';

/**
 * MOCK face verification.
 * This is NOT biometric matching. No face detection or comparison is performed.
 * It returns a fixed "match" when both a selfie and an ID image exist, purely to
 * demonstrate the UX. A real provider must run server-side with liveness detection.
 */
export interface FaceVerificationProvider {
  name: string;
  isMock: boolean;
  compare(input: { selfieUrl: string; referenceImageUrl: string | null }): Promise<{ matched: boolean; score: number; reason?: string }>;
}

export const mockFaceVerificationService: FaceVerificationProvider = {
  name: 'mock-face',
  isMock: true,
  async compare({ selfieUrl, referenceImageUrl }) {
    await delay(2200);
    if (!selfieUrl) return { matched: false, score: 0, reason: 'No selfie captured.' };
    if (!referenceImageUrl) {
      return { matched: false, score: 0, reason: 'No verified Aadhaar on file to compare with.' };
    }
    return { matched: true, score: 0.94 };
  },
};
