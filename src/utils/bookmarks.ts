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
