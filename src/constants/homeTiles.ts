export type HomeTile = {
  id: string;
  label: string;
  emoji: string;
  route: string;
  required: boolean;
  defaultEnabled: boolean;
};

export const HOME_TILES: HomeTile[] = [
  // Quick Access (2×2 grid)
  { id: 'quran',          label: 'Quran',           emoji: '📖', route: '/quran',          required: true,  defaultEnabled: true },
  { id: 'prayer-times',   label: 'Prayer Times',    emoji: '🕌', route: '/prayer-times',   required: true,  defaultEnabled: true },
  { id: 'dua',            label: 'Duas',            emoji: '🤲', route: '/dua',            required: true,  defaultEnabled: true },
  { id: 'qibla',          label: 'Qibla',           emoji: '🧭', route: '/qibla',          required: true,  defaultEnabled: true },

  // Islamic Knowledge
  { id: 'hadith',         label: 'Hadith',            emoji: '📜', route: '/hadith',         required: true,  defaultEnabled: true },
  { id: 'names',          label: '99 Names of Allah', emoji: '☪️', route: '/names',          required: false, defaultEnabled: true },
  { id: 'islamic-books',  label: 'Islamic Books',     emoji: '📕', route: '/islamic-books',  required: false, defaultEnabled: true },

  // Calculators
  { id: 'zakat-calculator', label: 'Zakat Calculator', emoji: '💰', route: '/zakat-calculator', required: false, defaultEnabled: true },
  { id: 'ramadan',          label: 'Ramadan Mode',     emoji: '🌙', route: '/ramadan',          required: false, defaultEnabled: true },

  // Tools
  { id: 'calendar',       label: 'Islamic Calendar',  emoji: '📅', route: '/calendar',       required: false, defaultEnabled: true },
  { id: 'mosque-finder',  label: 'Mosque Finder',     emoji: '🕌', route: '/mosque-finder',  required: false, defaultEnabled: true },
  { id: 'halal-finder',   label: 'Halal Finder',      emoji: '🥩', route: '/halal-finder',   required: false, defaultEnabled: true },

  // Personal
  { id: 'hifz-tracker',   label: 'Hifz Tracker',      emoji: '📿', route: '/hifz-tracker',   required: false, defaultEnabled: true },
  { id: 'prayer-streak',  label: 'Prayer Streak',     emoji: '🔥', route: '/prayer-streak',  required: false, defaultEnabled: true },
  { id: 'feedback',       label: 'Feedback',          emoji: '💬', route: '/feedback',       required: false, defaultEnabled: false },
];

export const HOME_TILES_STORAGE_KEY = 'home_tiles_enabled';

export const DEFAULT_ENABLED_TILE_IDS: string[] = HOME_TILES
  .filter((t) => t.defaultEnabled)
  .map((t) => t.id);
