import { useQuery } from '@tanstack/react-query';
import { profileService } from '@/services/profileService';
import type { Address } from '@/types/models';
import { qk } from '../queryKeys';

export const usePartner = (id: string) =>
  useQuery({ queryKey: qk.partner(id), queryFn: () => profileService.getPartner(id) });

export const useCustomerProfile = (id: string) =>
  useQuery({ queryKey: qk.customerProfile(id), queryFn: () => profileService.getCustomerProfile(id) });

export const useAddresses = (ownerId: string, kind: Address['kind']) =>
  useQuery({ queryKey: qk.addresses(ownerId, kind), queryFn: () => profileService.listAddresses(ownerId, kind) });
