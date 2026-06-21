import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  colorScheme: 'light' | 'dark' | 'system';
  arabicFontSize: number;
  selectedTranslation: string;
  selectedTranslationName: string;
  selectedReciter: string;
}

interface AppState {
  settings: AppSettings;
  dhikrCount: number;

  // Actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  incrementDhikr: () => void;
  resetDhikr: () => void;
  loadPersistedData: () => Promise<void>;
}

// ─── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  colorScheme: 'system',
  arabicFontSize: 26,
  selectedTranslation: 'ur.jalandhry',
  selectedTranslationName: 'Urdu — Jalandhri',
  selectedReciter: 'ar.alafasy',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  dhikrCount: 0,

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    set({ settings });
    AsyncStorage.setItem(CACHE_KEYS.settings, JSON.stringify(settings)).catch(() => {});
  },

  incrementDhikr: () => set((s) => ({ dhikrCount: s.dhikrCount + 1 })),
  resetDhikr: () => set({ dhikrCount: 0 }),

  loadPersistedData: async () => {
    try {
      const settingsRaw = await AsyncStorage.getItem(CACHE_KEYS.settings);
      const persisted = settingsRaw ? JSON.parse(settingsRaw) : {};
      const merged = { ...DEFAULT_SETTINGS, ...persisted };
      // Coerce each field against a corrupt / schema-drifted blob so downstream
      // code never sees a NaN font size or an unknown colour scheme.
      const str = (v: unknown, fallback: string) =>
        typeof v === 'string' && v ? v : fallback;
      const settings: AppSettings = {
        colorScheme: (['light', 'dark', 'system'] as const).includes(merged.colorScheme)
          ? merged.colorScheme
          : DEFAULT_SETTINGS.colorScheme,
        arabicFontSize:
          Number.isFinite(merged.arabicFontSize) &&
          merged.arabicFontSize >= 14 &&
          merged.arabicFontSize <= 60
            ? merged.arabicFontSize
            : DEFAULT_SETTINGS.arabicFontSize,
        selectedTranslation: str(merged.selectedTranslation, DEFAULT_SETTINGS.selectedTranslation),
        selectedTranslationName: str(merged.selectedTranslationName, DEFAULT_SETTINGS.selectedTranslationName),
        selectedReciter: str(merged.selectedReciter, DEFAULT_SETTINGS.selectedReciter),
      };
      set({ settings });
    } catch {}
  },
}));
