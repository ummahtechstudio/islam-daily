import AsyncStorage from '@react-native-async-storage/async-storage';

type EventEntry = { event: string; data: Record<string, unknown>; ts: number };

async function append(key: string, entry: EventEntry) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const list: EventEntry[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    // Keep last 200 entries per key to avoid unbounded growth
    if (list.length > 200) list.splice(0, list.length - 200);
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

/** Track which screen the user is currently viewing */
export async function trackScreen(screenName: string) {
  await append('analytics_screens', { event: 'screen_view', data: { screen_name: screenName }, ts: Date.now() });
}

/** Track feature usage — e.g. 'quran', 'hadith', 'dua', 'qibla' */
export async function trackFeatureUsed(feature: string) {
  await append('analytics_features', { event: 'feature_used', data: { feature }, ts: Date.now() });
}

/** Track when a user's prayer streak is updated */
export async function trackPrayerStreakUpdated(streakCount: number) {
  await append('analytics_features', { event: 'prayer_streak_updated', data: { streak_count: streakCount }, ts: Date.now() });
}

/** Track when the user starts a download (audio, offline pack, etc.) */
export async function trackDownloadStarted(feature: string) {
  await append('analytics_features', { event: 'download_started', data: { feature }, ts: Date.now() });
}

/** Track when the user changes their Quran translation language */
export async function trackLanguageChanged(language: string) {
  await append('analytics_features', { event: 'language_changed', data: { language }, ts: Date.now() });
}
