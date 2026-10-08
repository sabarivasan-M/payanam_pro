import { usePreferences, type Language } from '@/stores/preferencesStore';

/**
 * Lightweight translations for navigation and key headings.
 * Assumption: full Tamil localisation of every string is a later content task;
 * the plumbing (preference + lookup) is in place.
 */
const strings = {
  home: { en: 'Home', ta: 'முகப்பு' },
  rentBuy: { en: 'Rent & Buy', ta: 'வாடகை & வாங்க' },
  history: { en: 'History', ta: 'வரலாறு' },
  settings: { en: 'Settings', ta: 'அமைப்புகள்' },
  dashboard: { en: 'Dashboard', ta: 'டாஷ்போர்டு' },
  bookings: { en: 'Bookings', ta: 'முன்பதிவுகள்' },
  bikes: { en: 'Bikes', ta: 'பைக்குகள்' },
  earnings: { en: 'Earnings', ta: 'வருமானம்' },
  findBike: { en: 'Find a bike near you', ta: 'அருகில் ஒரு பைக்கைக் கண்டறியுங்கள்' },
  nearbyBikes: { en: 'Nearby Bikes', ta: 'அருகிலுள்ள பைக்குகள்' },
  yourLocation: { en: 'Your location', ta: 'உங்கள் இருப்பிடம்' },
} satisfies Record<string, Record<Language, string>>;

export type StringKey = keyof typeof strings;

export function useT() {
  const lang = usePreferences((s) => s.language);
  return (key: StringKey) => strings[key][lang];
}
