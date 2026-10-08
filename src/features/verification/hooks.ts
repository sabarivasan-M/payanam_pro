import { useQuery } from '@tanstack/react-query';
import { verificationService } from '@/services/verificationService';
import { qk } from '../queryKeys';

export const useDocuments = (customerId: string) =>
  useQuery({ queryKey: qk.documents(customerId), queryFn: () => verificationService.getDocuments(customerId) });
