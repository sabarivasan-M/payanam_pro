import { useQuery } from '@tanstack/react-query';
import { bikeService, type BikeFilters } from '@/services/bikeService';
import { useLocationStore } from '@/stores/locationStore';
import { qk } from '../queryKeys';

export function useBikes(filters: BikeFilters) {
  const origin = useLocationStore((s) => s.point);
  return useQuery({ queryKey: qk.bikes(filters, origin), queryFn: () => bikeService.listBikes(filters, origin) });
}

export function useBike(id: string | undefined) {
  const origin = useLocationStore((s) => s.point);
  return useQuery({
    queryKey: [...qk.bike(id ?? ''), origin],
    queryFn: () => bikeService.getBike(id!, origin),
    enabled: !!id,
  });
}

export const useBrands = () => useQuery({ queryKey: qk.brands, queryFn: bikeService.listBrands });

export const usePartnerBikes = (partnerId: string) =>
  useQuery({ queryKey: qk.partnerBikes(partnerId), queryFn: () => bikeService.listPartnerBikes(partnerId) });

export const useBikeHolds = (bikeId: string | undefined) =>
  useQuery({ queryKey: qk.bikeHolds(bikeId ?? ''), queryFn: () => bikeService.getHolds(bikeId!), enabled: !!bikeId });
