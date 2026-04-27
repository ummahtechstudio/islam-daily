import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  calculationMethod: number;
  colorScheme: 'light' | 'dark' | 'system';
  arabicFontSize: number;
  hadithApiKey: string;
  notificationsEnabled: boolean;
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
  calculationMethod: 4,
  colorScheme: 'system',
  arabicFontSize: 26,
  hadithApiKey: '$2y$10$OVeHKOYpQOnG3P3gE8r657qTqbRhRIJSNStLz5GdzOAioMbhMG',
  notificationsEnabled: false,
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
      // Always use the bundled key if the persisted value is empty
      if (!persisted.hadithApiKey) {
        persisted.hadithApiKey = DEFAULT_SETTINGS.hadithApiKey;
      }
      const settings = { ...DEFAULT_SETTINGS, ...persisted };
      set({ settings });
    } catch {}
  },
}));
