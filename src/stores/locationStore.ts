import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LOCATION } from '@/services/mapService';
import type { GeoPoint } from '@/types/models';

interface LocationState {
  point: GeoPoint;
  label: string;
  source: 'default' | 'device' | 'saved' | 'area';
  setLocation: (point: GeoPoint, label: string, source: LocationState['source']) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      point: { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng },
      label: DEFAULT_LOCATION.label,
      source: 'default',
      setLocation: (point, label, source) => set({ point, label, source }),
    }),
    { name: 'payanam.location.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
