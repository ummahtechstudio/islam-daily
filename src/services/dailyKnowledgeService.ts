/**
 * Daily Knowledge content layer (Phase D.1).
 *
 * Read order on the Home tab:
 *   1. MMKV cache (instant render)        — getCachedDailyKnowledge()
 *   2. Supabase fetch                     — fetchTodaysDailyKnowledge()
 *   3. Bundled `assets/daily_knowledge.json` (final fallback for new installs)
 *
 * The Supabase entry is the single most-recent row whose display_date <= today.
 * On success the entry is written to MMKV with a fetched-at timestamp so the
 * Home tab can show a muted "Updated X ago" footer when a stale cache is shown.
 */
import { supabase } from '../lib/supabase';
import { CACHE_KEYS, cache } from '../lib/storage';
import type { DailyKnowledge } from '../types/content';

export interface DailyKnowledgeCache {
  entry: DailyKnowledge;
  fetchedAt: number;
}

export function getCachedDailyKnowledge(): DailyKnowledgeCache | null {
  return cache.getJSON<DailyKnowledgeCache>(CACHE_KEYS.DAILY_KNOWLEDGE_LAST);
}

export async function fetchTodaysDailyKnowledge(): Promise<DailyKnowledge | null> {
  try {
    // Local calendar day, not UTC: toISOString() would roll to "tomorrow" in
    // the evening for negative-UTC users and surface a future-dated entry.
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('daily_knowledge')
      .select('*')
      .lte('display_date', today)
      .eq('is_active', true)
      .order('display_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const entry = data as DailyKnowledge;
    cache.setJSON<DailyKnowledgeCache>(CACHE_KEYS.DAILY_KNOWLEDGE_LAST, {
      entry,
      fetchedAt: Date.now(),
    });
    return entry;
  } catch {
    return null;
  }
}
