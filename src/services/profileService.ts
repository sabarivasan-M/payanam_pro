import { db, getOrThrow } from '@/api/db';
import { config } from '@/constants/config';
import type { Address, Profile, RentalPartner, SupportTicket } from '@/types/models';

export const profileService = {
  getProfile: (id: string) => getOrThrow('profiles', id),

  updateProfile: (id: string, patch: Partial<Pick<Profile, 'fullName' | 'email' | 'phone' | 'avatarUrl' | 'age'>>) =>
    db.update('profiles', id, patch),

  getCustomerProfile: (id: string) => db.get('customer_profiles', id),

  getPartner: (id: string) => getOrThrow('rental_partners', id),

  updatePartner: (
    id: string,
    patch: Partial<Omit<RentalPartner, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'ratingCount' | 'idVerificationStatus' | 'idDocumentUrl'>>,
  ) => db.update('rental_partners', id, patch),

  /**
   * Partner ID proof. DEMO: MOCK auto-approval. SUPABASE: stays 'pending' until an admin /
   * server-side KYC job reviews it.
   */
  submitPartnerId: (id: string, idDocumentUrl: string) =>
    db.update('rental_partners', id, { idDocumentUrl, idVerificationStatus: config.DEMO_MODE ? 'verified' : 'pending' }),

  /** Bank details: only the masked account number is ever stored. */
  savePayout(id: string, input: { accountName: string; accountNumber: string; ifsc: string; upi: string }) {
    const digits = input.accountNumber.replace(/\D/g, '');
    return db.update('rental_partners', id, {
      payoutAccountName: input.accountName.trim(),
      payoutAccountMasked: digits ? `•••• •••• ${digits.slice(-4)}` : null,
      payoutIfsc: input.ifsc.trim().toUpperCase() || null,
      payoutUpi: input.upi.trim() || null,
    });
  },

  listAddresses: (ownerId: string, kind: Address['kind']) =>
    db.list('addresses', { where: { ownerId, kind }, orderBy: { field: 'createdAt' } }),

  async addAddress(input: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>) {
    if (input.isDefault) await clearDefault(input.ownerId, input.kind);
    return db.insert('addresses', input);
  },

  async setDefaultAddress(address: Address) {
    await clearDefault(address.ownerId, address.kind);
    return db.update('addresses', address.id, { isDefault: true });
  },

  removeAddress: (id: string) => db.remove('addresses', id),

  createSupportTicket: (input: Pick<SupportTicket, 'userId' | 'category' | 'subject' | 'message'>) =>
    db.insert('support_tickets', { ...input, status: 'open' }),
};

async function clearDefault(ownerId: string, kind: Address['kind']) {
  const existing = await db.list('addresses', { where: { ownerId, kind, isDefault: true } });
  await Promise.all(existing.map((a) => db.update('addresses', a.id, { isDefault: false })));
}
