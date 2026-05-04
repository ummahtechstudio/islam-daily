import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TasbeehCounter, TasbeehSettings, TasbeehTemplate } from '../types/tasbeeh';
import { DEFAULT_TASBEEHS } from '../constants/defaultTasbeehs';

const COUNTERS_KEY = 'tasbeeh_counters';
const SELECTED_KEY = 'tasbeeh_selected_id';
const SETTINGS_KEY = 'tasbeeh_settings';

const DEFAULT_SETTINGS: TasbeehSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  autoCounterDelay: 1000,
  vibrationOnTarget: true,
  selectedCounterId: 'default-1',
};

import { getCachedOrBundledDhikr } from '../services/content';

export const getCounters = async (): Promise<TasbeehCounter[]> => {
  try {
    const raw = await AsyncStorage.getItem(COUNTERS_KEY);
    if (!raw) {
      const seeded = DEFAULT_TASBEEHS.map((c) => ({ ...c, createdAt: Date.now() }));
      await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TASBEEHS;
    return parsed as TasbeehCounter[];
  } catch {
    return DEFAULT_TASBEEHS;
  }
};

export const saveCounter = async (counter: TasbeehCounter): Promise<void> => {
  const all = await getCounters();
  const idx = all.findIndex((c) => c.id === counter.id);
  if (idx >= 0) {
    all[idx] = counter;
  } else {
    all.push(counter);
  }
  await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(all));
};

export const deleteCounter = async (id: string): Promise<void> => {
  const all = await getCounters();
  const filtered = all.filter((c) => c.id !== id || c.isDefault);
  await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(filtered));
};

export const updateCounter = async (
  id: string,
  updates: Partial<TasbeehCounter>,
): Promise<void> => {
  const all = await getCounters();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...updates, id: all[idx].id };
  await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(all));
};

export const getSelectedCounterId = async (): Promise<string> => {
  try {
    const raw = await AsyncStorage.getItem(SELECTED_KEY);
    return raw || 'default-1';
  } catch {
    return 'default-1';
  }
};

export const setSelectedCounterId = async (id: string): Promise<void> => {
  await AsyncStorage.setItem(SELECTED_KEY, id);
};

export const getSettings = async (): Promise<TasbeehSettings> => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: TasbeehSettings): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const resetCounter = async (id: string): Promise<void> => {
  await updateCounter(id, { currentCount: 0, rounds: 0 });
};

export const loadDhikrTemplates = (): TasbeehTemplate[] => {
  // Read at call time — module-level storage reads break Expo Web SSR.
  const dhikrData = getCachedOrBundledDhikr();
  const templates: TasbeehTemplate[] = [];
  for (const cat of dhikrData) {
    for (let i = 0; i < cat.items.length; i++) {
      const item = cat.items[i];
      templates.push({
        id: `tpl-${cat.id}-${i}`,
        name: item.transliteration,
        arabic: item.arabic,
        target: item.count > 0 ? item.count : 33,
        source: item.reference,
        category: cat.title,
      });
    }
  }
  return templates;
};

export const createCounterFromTemplate = async (
  tpl: TasbeehTemplate,
): Promise<TasbeehCounter> => {
  const counter: TasbeehCounter = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: tpl.name,
    arabic: tpl.arabic,
    target: tpl.target,
    currentCount: 0,
    rounds: 0,
    totalCount: 0,
    totalTime: 0,
    createdAt: Date.now(),
    isDefault: false,
    source: tpl.source,
  };
  await saveCounter(counter);
  return counter;
};
