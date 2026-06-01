import AsyncStorage from '@react-native-async-storage/async-storage';

export type BookmarkType = 'hadith' | 'dua' | 'dhikr' | 'quran';

export type Bookmark = {
  type: BookmarkType;
  id: string;
  title: string;
  arabic: string;
  translation: string;
  reference: string;
  category?: string;
  savedAt: number;
};

const STORAGE_KEY = 'user_bookmarks';

export const getBookmarks = async (): Promise<Bookmark[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isBookmarked = async (type: BookmarkType, id: string): Promise<boolean> => {
  const all = await getBookmarks();
  return all.some((b) => b.type === type && b.id === id);
};

export const addBookmark = async (bookmark: Omit<Bookmark, 'savedAt'>): Promise<void> => {
  try {
    const all = await getBookmarks();
    const exists = all.some((b) => b.type === bookmark.type && b.id === bookmark.id);
    if (exists) return;
    const newBookmark: Bookmark = { ...bookmark, savedAt: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([newBookmark, ...all]));
  } catch (e) {
    console.error('Failed to add bookmark:', e);
  }
};

export const removeBookmark = async (type: BookmarkType, id: string): Promise<void> => {
  try {
    const all = await getBookmarks();
    const filtered = all.filter((b) => !(b.type === type && b.id === id));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove bookmark:', e);
  }
};

export const toggleBookmark = async (
  bookmark: Omit<Bookmark, 'savedAt'>,
): Promise<boolean> => {
  const wasBookmarked = await isBookmarked(bookmark.type, bookmark.id);
  if (wasBookmarked) {
    await removeBookmark(bookmark.type, bookmark.id);
    return false;
  }
  await addBookmark(bookmark);
  return true;
};

export const clearAllBookmarks = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export const removeBookmarksByType = async (type: BookmarkType): Promise<void> => {
  try {
    const all = await getBookmarks();
    const filtered = all.filter((b) => b.type !== type);
    if (filtered.length !== all.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to remove bookmarks by type:', type, e);
  }
};

// One-time reset of hadith bookmarks for the v2 source switch. Old hadith
// bookmark ids keyed on the previous (idInBook) numbering, which no longer
// matches the new hadithnumber scheme, so they would point at the wrong
// hadith. Pre-launch, so a clean wipe is fine. Quran/dua/dhikr bookmarks are
// untouched. Runs once, guarded by a flag.
const HADITH_BOOKMARK_RESET_KEY = 'migration_hadith_bookmark_reset_v2';

export const resetHadithBookmarksForV2Once = async (): Promise<void> => {
  try {
    const done = await AsyncStorage.getItem(HADITH_BOOKMARK_RESET_KEY);
    if (done === '1') return;
    await removeBookmarksByType('hadith');
    await AsyncStorage.setItem(HADITH_BOOKMARK_RESET_KEY, '1');
  } catch (e) {
    console.error('Failed to reset hadith bookmarks for v2:', e);
  }
};
