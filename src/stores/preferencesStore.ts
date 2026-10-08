import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Language = 'en' | 'ta';

export interface NotificationPreferences {
  booking: boolean;
  rental: boolean;
  verification: boolean;
  promotions: boolean;
}

interface PreferencesState {
  theme: ThemePreference;
  language: Language;
  notifications: NotificationPreferences;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language) => void;
  setNotificationPref: (key: keyof NotificationPreferences, value: boolean) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'en',
      notifications: { booking: true, rental: true, verification: true, promotions: false },
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotificationPref: (key, value) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
    }),
    { name: 'payanam.preferences.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
