import { delay } from '@/lib/id';
import type { DocumentType } from '@/types/models';

/**
 * MOCK document verification.
 * Does NOT read, OCR or validate any real Aadhaar / Driving Licence data.
 * It simply approves any uploaded image after a short delay so the UI flow can be demonstrated.
 * Replace with a server-side KYC provider (e.g. DigiLocker / licensed KYC API) — never call
 * those APIs from the app with secret keys.
 */
export interface DocumentVerificationProvider {
  name: string;
  isMock: boolean;
  verify(input: { type: DocumentType; imageUrl: string }): Promise<{
    result: 'verified' | 'rejected' | 'needs_more_info';
    confidence: number;
    notes: string;
  }>;
}

export const mockDocumentVerificationService: DocumentVerificationProvider = {
  name: 'mock-kyc',
  isMock: true,
  async verify({ imageUrl }) {
    await delay(1800);
    if (!imageUrl) {
      return { result: 'rejected', confidence: 0, notes: 'No image was provided.' };
    }
    return { result: 'verified', confidence: 0.97, notes: 'MOCK: auto-approved in demo mode.' };
  },
};
