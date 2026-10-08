import { db } from '@/api/db';
import type { DocumentType, IdentityDocument, VerificationStatus } from '@/types/models';
import { AppError } from '@/utils/errors';
import { mockDocumentVerificationService, type DocumentVerificationProvider } from './mock/mockDocumentVerificationService';
import { notificationService } from './notificationService';

/** Swap for a real provider (server-side) without touching the screens. */
const provider: DocumentVerificationProvider = mockDocumentVerificationService;

export const REQUIRED_DOCUMENTS: { type: DocumentType; title: string; hint: string }[] = [
  { type: 'aadhaar', title: 'Aadhaar card', hint: 'Front side, all four corners visible' },
  { type: 'driving_licence', title: 'Driving licence', hint: 'Valid two-wheeler licence (MCWG / MCWOG)' },
];

export interface DocumentState {
  type: DocumentType;
  document: IdentityDocument | null;
  status: IdentityDocument['status'];
}

export const verificationService = {
  provider: provider.name,
  isMock: provider.isMock,

  async getDocuments(customerId: string): Promise<DocumentState[]> {
    const docs = await db.list('documents', { where: { customerId }, orderBy: { field: 'createdAt', ascending: false } });
    return REQUIRED_DOCUMENTS.map(({ type }) => {
      const latest = docs.find((d) => d.type === type) ?? null;
      return { type, document: latest, status: latest?.status ?? 'not_uploaded' };
    });
  },

  async isCustomerVerified(customerId: string): Promise<boolean> {
    const docs = await this.getDocuments(customerId);
    return docs.every((d) => d.status === 'verified');
  },

  /** Stores the uploaded image reference (already saved via storageService). */
  async uploadDocument(customerId: string, type: DocumentType, imageUrl: string): Promise<IdentityDocument> {
    const existing = await db.list('documents', { where: { customerId, type } });
    if (existing.some((d) => d.status === 'under_verification')) {
      throw new AppError('This document is already being verified.');
    }
    return db.insert('documents', { customerId, type, imageUrl, status: 'uploaded', rejectionReason: null });
  },

  /** Runs verification for one document (MOCK provider in demo mode). */
  async verifyDocument(doc: IdentityDocument): Promise<IdentityDocument> {
    await db.update('documents', doc.id, { status: 'under_verification' });
    await syncCustomerStatus(doc.customerId);
    let outcome: Awaited<ReturnType<DocumentVerificationProvider['verify']>>;
    try {
      outcome = await provider.verify({ type: doc.type, imageUrl: doc.imageUrl });
    } catch (e) {
      await db.update('documents', doc.id, { status: 'uploaded' });
      throw e;
    }
    await db.insert('document_verifications', {
      documentId: doc.id,
      provider: provider.name,
      isMock: provider.isMock,
      result: outcome.result,
      confidence: outcome.confidence,
      notes: outcome.notes,
    });
    const status = outcome.result === 'verified' ? 'verified' : 'rejected';
    const updated = await db.update('documents', doc.id, {
      status,
      rejectionReason: status === 'rejected' ? outcome.notes : null,
    });
    const label = doc.type === 'aadhaar' ? 'Aadhaar' : 'Driving licence';
    await notificationService.notify({
      userId: doc.customerId,
      category: 'verification',
      type: status === 'verified' ? 'document_approved' : 'document_rejected',
      title: status === 'verified' ? `${label} verified` : `${label} rejected`,
      body: status === 'verified' ? `Your ${label} has been verified.` : `We couldn't verify your ${label}. ${outcome.notes}`,
    });
    await syncCustomerStatus(doc.customerId);
    return updated;
  },
};

async function syncCustomerStatus(customerId: string) {
  const docs = await verificationService.getDocuments(customerId);
  let status: VerificationStatus = 'unverified';
  if (docs.every((d) => d.status === 'verified')) status = 'verified';
  else if (docs.some((d) => d.status === 'rejected')) status = 'rejected';
  else if (docs.some((d) => d.status === 'under_verification' || d.status === 'uploaded' || d.status === 'verified')) status = 'pending';
  const cp = await db.get('customer_profiles', customerId);
  if (cp) await db.update('customer_profiles', customerId, { verificationStatus: status });
}
