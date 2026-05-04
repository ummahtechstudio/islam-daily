import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { HADITH_COLLECTIONS } from '../src/constants';
import { trackScreen } from '../src/services/analytics';
import { SupabaseHadith } from '../src/lib/supabase';
import { useStore } from '../src/store';
import CardActionsRow from '../components/CardActionsRow';
import { useIsOnline } from '../src/hooks/useIsOnline';
import {
  DEFAULT_COLLECTION_COUNTS,
  HadithCollectionKey,
} from '../src/services/hadiths';
import {
  clearHadithCache,
  downloadHadithBook,
  getCachedHadithCounts,
  getHadithsForBook,
  isHadithBookCached,
  type HadithDownloadProgress,
} from '../src/services/hadithCache';
import HadithBookDownloadStrip from '../src/components/hadith/HadithBookDownloadStrip';

const GOLD = '#EF9F27';
const PAGE_SIZE = 25;

const COLLECTION_META: Record<string, { color: string; bg: string; icon: string }> = {
  bukhari:  { color: '#16A34A', bg: '#16A34A15', icon: '📗' },
  muslim:   { color: '#2563EB', bg: '#2563EB15', icon: '📘' },
  tirmidhi: { color: '#7C3AED', bg: '#7C3AED15', icon: '📙' },
  abudawud: { color: '#D97706', bg: '#D9770615', icon: '📒' },
  ibnmajah: { color: '#0D9488', bg: '#0D948815', icon: '📓' },
  nasai:    { color: '#DC4E4E', bg: '#DC4E4E15', icon: '📕' },
};

// ─── Grade badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade, theme }: { grade: string; theme: typeof Colors.light }) {
  if (!grade) return null;
  const g = grade.toLowerCase();
  const color = g.includes('sahih') ? Colors.success : g.includes('hasan') ? GOLD : g.includes('da') ? Colors.error : theme.textMuted;
  return (
    <View style={[gradeStyles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[gradeStyles.text, { color }]}>{grade}</Text>
    </View>
  );
}

const gradeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── Collections Grid ─────────────────────────────────────────────────────────

function CollectionsGrid({
  onSelect,
  isDark,
  counts,
}: {
  onSelect: (key: HadithCollectionKey) => void;
  isDark: boolean;
  counts: Record<string, number>;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={gridStyles.container}>
      <Text style={[gridStyles.heading, { color: theme.textSecondary }]}>SELECT A COLLECTION</Text>
      <View style={gridStyles.grid}>
        {HADITH_COLLECTIONS.map((col) => {
          const meta = COLLECTION_META[col.key];
          const count = counts[col.key];
          return (
            <TouchableOpacity
              key={col.key}
              style={[gridStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => onSelect(col.key as HadithCollectionKey)}
              activeOpacity={0.75}
            >
              <View style={[gridStyles.iconBg, { backgroundColor: meta.bg }]}>
                <Text style={gridStyles.icon}>{meta.icon}</Text>
              </View>
              <Text style={[gridStyles.name, { color: theme.text }]} numberOfLines={2}>{col.name}</Text>
              <View style={[gridStyles.countBadge, { backgroundColor: meta.color + '20' }]}>
                <Text style={[gridStyles.count, { color: meta.color }]}>
                  {(count ?? DEFAULT_COLLECTION_COUNTS[col.key] ?? 0).toLocaleString()} hadiths
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', borderRadius: 16, borderWidth: 1, padding: 14, gap: 8, alignItems: 'flex-start' },
  iconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 26 },
  name: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  count: { fontSize: 12, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HadithScreen() {
  useEffect(() => { trackScreen('Hadith'); }, []);

  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark = settings.colorScheme === 'dark' || (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;
  const isOnline = useIsOnline();

  const [viewMode, setViewMode] = useState<'collections' | 'hadiths'>('collections');
  const [selectedCollection, setSelectedCollection] = useState<HadithCollectionKey | ''>('');
  const [allHadiths, setAllHadiths] = useState<SupabaseHadith[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<HadithDownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});

  const cancelRef = useRef<{ slug: HadithCollectionKey | null; cancelled: boolean }>({
    slug: null,
    cancelled: false,
  });

  const collMeta = COLLECTION_META[selectedCollection] ?? { color: '#0F6E56', bg: '#0F6E5615', icon: '📗' };
  const collName = HADITH_COLLECTIONS.find((c) => c.key === selectedCollection)?.name ?? '';

  // Pull cached counts once on mount.
  useEffect(() => {
    setCollectionCounts(getCachedHadithCounts());
  }, []);

  const startDownload = useCallback(async (key: HadithCollectionKey) => {
    cancelRef.current = { slug: key, cancelled: false };
    setDownloadError(null);
    setProgress({ bookSlug: key, receivedBytes: 0, totalBytes: null, phase: 'downloading' });
    try {
      const entry = await downloadHadithBook(key, (p) => {
        if (cancelRef.current.cancelled || cancelRef.current.slug !== key) return;
        setProgress(p);
      });
      if (cancelRef.current.cancelled || cancelRef.current.slug !== key) return;
      setAllHadiths(entry.hadiths);
      setCollectionCounts((prev) => ({ ...prev, [key]: entry.totalCount }));
      setProgress(null);
    } catch (err: any) {
      if (cancelRef.current.cancelled || cancelRef.current.slug !== key) return;
      console.warn('[Hadith] downloadHadithBook failed', key, err);
      setDownloadError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const handleSelectCollection = useCallback((key: HadithCollectionKey) => {
    setSelectedCollection(key);
    setPage(1);
    setSearchQuery('');
    setViewMode('hadiths');
    setDownloadError(null);

    const cached = getHadithsForBook(key);
    if (cached.length > 0) {
      setAllHadiths(cached);
      setProgress(null);
      return;
    }
    setAllHadiths([]);
    if (isOnline) {
      startDownload(key);
    } else {
      setProgress(null);
    }
  }, [isOnline, startDownload]);

  // If we entered the screen offline-without-cache, then connectivity comes back,
  // start the download automatically.
  useEffect(() => {
    if (viewMode !== 'hadiths') return;
    if (!selectedCollection) return;
    if (allHadiths.length > 0) return;
    if (!isOnline) return;
    if (progress) return;
    if (downloadError) return;
    if (isHadithBookCached(selectedCollection)) {
      setAllHadiths(getHadithsForBook(selectedCollection));
      return;
    }
    startDownload(selectedCollection);
  }, [viewMode, selectedCollection, allHadiths.length, isOnline, progress, downloadError, startDownload]);

  // Cancel any in-flight UI updates when leaving the screen / switching books.
  useEffect(() => {
    return () => {
      cancelRef.current.cancelled = true;
    };
  }, []);

  const onRefresh = async () => {
    if (!selectedCollection) return;
    if (!isOnline) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    setPage(1);
    clearHadithCache(selectedCollection);
    setAllHadiths([]);
    await startDownload(selectedCollection);
    setRefreshing(false);
  };

  const filteredHadiths = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return allHadiths;
    const isNumericQuery = /^\d+$/.test(trimmed);
    if (isNumericQuery) {
      return allHadiths.filter((h) => h.hadith_number === trimmed);
    }
    const q = trimmed.toLowerCase();
    return allHadiths.filter(
      (h) =>
        (h.english ?? '').toLowerCase().includes(q) ||
        (h.narrator ?? '').toLowerCase().includes(q) ||
        (h.arabic ?? '').includes(trimmed),
    );
  }, [allHadiths, searchQuery]);

  const visibleHadiths = filteredHadiths.slice(0, page * PAGE_SIZE);
  const hasMore = visibleHadiths.length < filteredHadiths.length;

  const loadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  const renderHadith = ({ item }: { item: SupabaseHadith }) => {
    return (
      <View style={[cardStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[cardStyles.accent, { backgroundColor: collMeta.color }]} />
        <View style={cardStyles.header}>
          <View style={[cardStyles.numBadge, { backgroundColor: collMeta.bg }]}>
            <Text style={[cardStyles.numText, { color: collMeta.color }]}>#{item.hadith_number}</Text>
          </View>
          {item.chapter_name ? (
            <Text style={[cardStyles.chapter, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.chapter_name}
            </Text>
          ) : null}
          <GradeBadge grade={item.grade ?? 'Sahih'} theme={theme} />
        </View>

        <Text style={[cardStyles.bookName, { color: collMeta.color }]}>{collName}</Text>

        {item.arabic ? (
          <Text style={[cardStyles.arabic, { color: theme.text }]} textBreakStrategy="simple">
            {item.arabic}
          </Text>
        ) : null}

        <View style={[cardStyles.divider, { backgroundColor: theme.border }]} />

        {item.english ? (
          <Text style={[cardStyles.english, { color: theme.textSecondary }]}>{item.english}</Text>
        ) : null}

        {item.narrator ? (
          <Text style={[cardStyles.narrator, { color: collMeta.color }]}>— {item.narrator}</Text>
        ) : null}

        <CardActionsRow
          bookmark={{
            type: 'hadith',
            id: `${item.collection_key}-${item.hadith_number}`,
            title: `${collName} #${item.hadith_number}`,
            arabic: item.arabic ?? '',
            translation: item.english ?? '',
            reference: `${collName} ${item.hadith_number}`,
          }}
          shareable={{
            arabic: item.arabic ?? '',
            translation: item.english ?? '',
            reference: `${collName} ${item.hadith_number}`,
            type: 'hadith',
          }}
          iconColor={theme.textMuted}
        />
      </View>
    );
  };

  const totalCount = filteredHadiths.length;
  const isDownloading = !!progress && progress.phase !== 'done';
  const showStrip = viewMode === 'hadiths' && !!selectedCollection && (isDownloading || !!downloadError) && allHadiths.length === 0;
  const showOfflineEmpty =
    viewMode === 'hadiths' &&
    !!selectedCollection &&
    allHadiths.length === 0 &&
    !isOnline &&
    !isDownloading &&
    !downloadError;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <View style={styles.headerRow}>
          {viewMode !== 'collections' ? (
            <TouchableOpacity
              onPress={() => {
                cancelRef.current.cancelled = true;
                setViewMode('collections');
                setSelectedCollection('');
                setAllHadiths([]);
                setProgress(null);
                setDownloadError(null);
              }}
              hitSlop={8}
              style={{ marginRight: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {viewMode === 'collections' ? 'Hadith Collections' : collName}
            </Text>
            <Text style={styles.headerSub}>
              {viewMode === 'collections'
                ? 'Authentic narrations of the Prophet ﷺ'
                : searchQuery
                ? `${totalCount.toLocaleString()} results`
                : `${totalCount.toLocaleString()} hadiths`}
            </Text>
          </View>
        </View>
      </View>

      {showStrip ? (
        <HadithBookDownloadStrip
          bookName={collName}
          progress={progress}
          isOnline={isOnline}
          hasError={!!downloadError}
        />
      ) : null}

      {viewMode === 'collections' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <CollectionsGrid onSelect={handleSelectCollection} isDark={isDark} counts={collectionCounts} />
        </ScrollView>
      ) : showOfflineEmpty ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={56} color={GOLD} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {collName} not yet downloaded
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Connect to the internet once and {collName} will be available offline forever.
          </Text>
          <TouchableOpacity
            style={[
              styles.retryBtn,
              { backgroundColor: Colors.primary },
              !isOnline && styles.retryBtnDisabled,
            ]}
            onPress={() => selectedCollection && startDownload(selectedCollection)}
            disabled={!isOnline}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : isDownloading && allHadiths.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Preparing {collName}…
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            First load only — cached forever after this.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by number or keyword..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={(t) => { setSearchQuery(t); setPage(1); }}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={[styles.searchHint, { color: theme.textMuted }]}>
            Type a hadith number (e.g. 35) for exact match, or text to search content
          </Text>

          <FlatList
            data={visibleHadiths}
            keyExtractor={(item) => `${item.collection_key}-${item.id}`}
            renderItem={renderHadith}
            contentContainerStyle={{ padding: 12, paddingBottom: 20, gap: 12 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            initialNumToRender={30}
            maxToRenderPerBatch={20}
            windowSize={5}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>No hadiths found.</Text>
              </View>
            }
            ListFooterComponent={
              hasMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} /> : null
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: 16, paddingTop: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchHint: {
    fontSize: 11,
    marginHorizontal: 16,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },
  retryBtnDisabled: { opacity: 0.4 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 8, flexWrap: 'wrap' },
  numBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  numText: { fontSize: 13, fontWeight: '700' },
  chapter: { flex: 1, fontSize: 12, minWidth: 0 },
  bookName: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 8, textTransform: 'uppercase' },
  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 42,
    writingDirection: 'rtl',
    marginBottom: 8,
    paddingLeft: 8,
  },
  divider: { height: 1, marginBottom: 12 },
  english: { fontSize: 14, lineHeight: 22 },
  narrator: { fontSize: 12, fontWeight: '600', marginTop: 8 },
});
