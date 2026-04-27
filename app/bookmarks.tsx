import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import {
  Bookmark,
  BookmarkType,
  clearAllBookmarks,
  getBookmarks,
  removeBookmark,
} from '../src/utils/bookmarks';
import { shareContent } from '../src/utils/share';

const GOLD = '#EF9F27';

type FilterKey = 'all' | BookmarkType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'quran', label: 'Quran' },
  { key: 'hadith', label: 'Hadith' },
  { key: 'dua', label: 'Duas' },
  { key: 'dhikr', label: 'Dhikr' },
];

const TYPE_META: Record<BookmarkType, { label: string; color: string }> = {
  quran: { label: 'QURAN', color: '#2563EB' },
  hadith: { label: 'HADITH', color: '#16A34A' },
  dua: { label: 'DUA', color: Colors.primary },
  dhikr: { label: 'DHIKR', color: '#8B5CF6' },
};

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
};

const formatDate = (ts: number): string => {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

export default function BookmarksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');

  const reload = useCallback(async () => {
    const all = await getBookmarks();
    all.sort((a, b) => b.savedAt - a.savedAt);
    setBookmarks(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      trackScreen('Bookmarks');
      reload();
    }, [reload]),
  );

  const filtered = filter === 'all' ? bookmarks : bookmarks.filter((b) => b.type === filter);

  const onRemove = async (item: Bookmark) => {
    await removeBookmark(item.type, item.id);
    showToast('Removed from bookmarks');
    reload();
  };

  const onShare = async (item: Bookmark) => {
    await shareContent({
      arabic: item.arabic,
      translation: item.translation,
      reference: item.reference,
      type: item.type,
    });
  };

  const onClearAll = () => {
    if (bookmarks.length === 0) return;
    Alert.alert(
      'Clear All Bookmarks',
      'Are you sure you want to remove all bookmarks? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllBookmarks();
            showToast('All bookmarks cleared');
            reload();
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Bookmark }) => {
    const meta = TYPE_META[item.type];
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: meta.color + '22' }]}>
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.savedDate, { color: theme.textMuted }]} numberOfLines={1}>
            Saved on {formatDate(item.savedAt)}
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        {item.arabic ? (
          <Text
            style={[styles.arabic, { color: theme.text }]}
            numberOfLines={2}
            textBreakStrategy="simple"
          >
            {item.arabic}
          </Text>
        ) : null}

        {item.translation ? (
          <Text style={[styles.translation, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.translation}
          </Text>
        ) : null}

        <Text style={[styles.reference, { color: theme.textMuted }]} numberOfLines={1}>
          📖 {item.reference}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onShare(item)} hitSlop={8} style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(item)} hitSlop={8} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Bookmarks</Text>
          <Text style={styles.headerSub}>
            {bookmarks.length} {bookmarks.length === 1 ? 'item' : 'items'} saved
          </Text>
        </View>
        {bookmarks.length > 0 ? (
          <TouchableOpacity onPress={onClearAll} hitSlop={8}>
            <Text style={styles.clearAll}>Clear All</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count =
            f.key === 'all' ? bookmarks.length : bookmarks.filter((b) => b.type === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterPill,
                { borderColor: theme.border, backgroundColor: theme.card },
                active && { backgroundColor: Colors.primary, borderColor: Colors.primary },
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? '#fff' : theme.text },
                ]}
              >
                {f.label}
              </Text>
              <View
                style={[
                  styles.filterCount,
                  {
                    backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    { color: active ? '#fff' : theme.textMuted },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={56} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {bookmarks.length === 0 ? 'No bookmarks yet' : 'Nothing here yet'}
          </Text>
          <Text style={[styles.emptySub, { color: theme.textMuted }]}>
            {bookmarks.length === 0
              ? 'Tap the bookmark icon on any hadith or dua to save it here.'
              : `You haven't saved any ${filter} items yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    paddingTop: 14,
  },
  backBtn: { padding: 2 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  clearAll: { color: '#FCA5A5', fontSize: 13, fontWeight: '700' },

  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '700' },
  filterCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterCountText: { fontSize: 11, fontWeight: '700' },

  list: { padding: 12, paddingBottom: 24, gap: 12 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  savedDate: { fontSize: 11, flexShrink: 1, textAlign: 'right' },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    textAlign: 'right',
    lineHeight: 32,
    writingDirection: 'rtl',
  },
  translation: { fontSize: 13, lineHeight: 19 },
  reference: { fontSize: 11, fontStyle: 'italic' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 18,
    marginTop: 4,
  },
  actionBtn: { padding: 2 },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
