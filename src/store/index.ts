import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  type: 'quran' | 'hadith' | 'dua';
  surahNumber?: number;
  verseNumber?: number;
  arabic: string;
  english: string;
  reference: string;
  savedAt: number;
}

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
  bookmarks: Bookmark[];
  settings: AppSettings;
  dhikrCount: number;

  // Actions
  addBookmark: (b: Bookmark) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
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
  bookmarks: [],
  settings: DEFAULT_SETTINGS,
  dhikrCount: 0,

  addBookmark: (b) => {
    const bookmarks = [...get().bookmarks, b];
    set({ bookmarks });
    AsyncStorage.setItem(CACHE_KEYS.bookmarks, JSON.stringify(bookmarks)).catch(() => {});
  },

  removeBookmark: (id) => {
    const bookmarks = get().bookmarks.filter((b) => b.id !== id);
    set({ bookmarks });
    AsyncStorage.setItem(CACHE_KEYS.bookmarks, JSON.stringify(bookmarks)).catch(() => {});
  },

  isBookmarked: (id) => get().bookmarks.some((b) => b.id === id),

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    set({ settings });
    AsyncStorage.setItem(CACHE_KEYS.settings, JSON.stringify(settings)).catch(() => {});
  },

  incrementDhikr: () => set((s) => ({ dhikrCount: s.dhikrCount + 1 })),
  resetDhikr: () => set({ dhikrCount: 0 }),

  loadPersistedData: async () => {
    try {
      const [bookmarksRaw, settingsRaw] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.bookmarks),
        AsyncStorage.getItem(CACHE_KEYS.settings),
      ]);
      const bookmarks = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
      const persisted = settingsRaw ? JSON.parse(settingsRaw) : {};
      // Always use the bundled key if the persisted value is empty
      if (!persisted.hadithApiKey) {
        persisted.hadithApiKey = DEFAULT_SETTINGS.hadithApiKey;
      }
      const settings = { ...DEFAULT_SETTINGS, ...persisted };
      set({ bookmarks, settings });
    } catch {}
  },
}));
