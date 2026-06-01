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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';

import { Colors, palette } from '../src/constants/colors';
import { typography } from '../src/constants/typography';
import { spacing, radius } from '../src/constants/spacing';
import { HADITH_COLLECTIONS } from '../src/constants';
import { ManuscriptCard } from '../src/components/ManuscriptCard';
import { trackScreen } from '../src/services/analytics';
import { HadithGrade, SupabaseHadith } from '../src/lib/supabase';
import { getTranslationLanguage, type TranslationLanguage } from '../src/utils/settings';
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
  malik:    { color: '#0F6E56', bg: '#0F6E5615', icon: '📔' },
  nawawi:   { color: '#9333EA', bg: '#9333EA15', icon: '✨' },
  qudsi:    { color: '#B45309', bg: '#B4530915', icon: '🕌' },
  dehlawi:  { color: '#0369A1', bg: '#0369A115', icon: '📜' },
};

// ─── Gradings ───────────────────────────────────────────────────────────────
// The v2 data carries multiple scholarly gradings per hadith (grader + grade).
// Bukhari/Muslim and the 40-collections carry none — render nothing for those.

function gradeColor(grade: string, theme: typeof Colors.light): string {
  const g = grade.toLowerCase();
  // check da'if before sahih: "isnaad da'if" etc. should read as weak
  if (g.includes('da') && !g.includes('sahih')) return Colors.error;
  if (g.includes('sahih')) return Colors.success;
  if (g.includes('hasan')) return GOLD;
  if (g.includes('da')) return Colors.error;
  return theme.textMuted;
}

function Gradings({ grades, label, theme }: { grades: HadithGrade[]; label: string; theme: typeof Colors.light }) {
  if (!grades || grades.length === 0) return null;
  return (
    <View style={gradeStyles.wrap}>
      <Text style={[gradeStyles.label, { color: palette.textOnCreamMuted }]}>{label}</Text>
      <View style={gradeStyles.chips}>
        {grades.map((g, i) => {
          const color = gradeColor(g.grade, theme);
          return (
            <View key={`${g.name}-${i}`} style={[gradeStyles.badge, { backgroundColor: color + '1A' }]}>
              <Text style={[gradeStyles.grader, { color: palette.textOnCreamSecondary }]}>{g.name}: </Text>
              <Text style={[gradeStyles.text, { color }]}>{g.grade}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const gradeStyles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, gap: spacing.xs },
  label: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  grader: { fontSize: 11, fontWeight: '600' },
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
  const { t } = useTranslation();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={gridStyles.container}>
      <Text style={[gridStyles.heading, { color: theme.textSecondary }]}>
        {t('hadith.collections.selectLabel')}
      </Text>
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
              {/* col.name is the proper-noun collection name (e.g. "Sahih Bukhari") — content, not translated */}
              <Text style={[gridStyles.name, { color: theme.text }]} numberOfLines={2}>{col.name}</Text>
              <View style={[gridStyles.countBadge, { backgroundColor: meta.color + '20' }]}>
                <Text style={[gridStyles.count, { color: meta.color }]}>
                  {t('hadith.collections.hadithsCount', { count: (count ?? DEFAULT_COLLECTION_COUNTS[col.key] ?? 0).toLocaleString() })}
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

  const { t } = useTranslation();
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
  // Which translation to show (English/Urdu). Shared with dua/dhikr via the
  // same setting — Arabic and gradings are always shown regardless.
  const [language, setLanguage] = useState<TranslationLanguage>('urdu');

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

  // Re-read the translation language each time the screen gains focus so a
  // change made in settings (or the dua tabs) is reflected here too.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTranslationLanguage().then((lang) => {
        if (active) setLanguage(lang);
      });
      return () => { active = false; };
    }, []),
  );

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
    // Allow fractional hadith numbers too (e.g. 631.5 for sub-narrations).
    const isNumericQuery = /^\d+(\.\d+)?$/.test(trimmed);
    if (isNumericQuery) {
      return allHadiths.filter((h) => h.hadith_number === trimmed);
    }
    const q = trimmed.toLowerCase();
    return allHadiths.filter(
      (h) =>
        (h.english ?? '').toLowerCase().includes(q) ||
        (h.urdu ?? '').includes(trimmed) ||
        (h.arabic ?? '').includes(trimmed),
    );
  }, [allHadiths, searchQuery]);

  const visibleHadiths = filteredHadiths.slice(0, page * PAGE_SIZE);
  const hasMore = visibleHadiths.length < filteredHadiths.length;

  const loadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  const renderHadith = ({ item }: { item: SupabaseHadith }) => {
    // Translation shown is driven by the shared language toggle. Arabic is
    // always shown. When Urdu is selected but absent, show a subtle note and
    // fall back to English so the block is never blank.
    const showUrdu = language === 'urdu' && !!item.urdu;
    const urduMissing = language === 'urdu' && !item.urdu;
    // Text saved when bookmarking/sharing — match what the user is reading.
    const displayedTranslation = showUrdu ? item.urdu! : item.english ?? '';

    return (
      <ManuscriptCard variant="standard">
        <View style={cardStyles.header}>
          <View style={cardStyles.numBadge}>
            <Text style={cardStyles.numText}>#{item.hadith_number}</Text>
          </View>
          {item.chapter_name ? (
            <Text style={cardStyles.chapter} numberOfLines={1}>
              {item.chapter_name}
            </Text>
          ) : null}
        </View>

        {/* collName is the proper-noun collection name (e.g. "Sahih Bukhari") — content, not translated */}
        <Text style={cardStyles.bookName}>{collName}</Text>

        {item.arabic ? (
          <Text style={cardStyles.arabic} textBreakStrategy="simple">
            {item.arabic}
          </Text>
        ) : null}

        <View style={cardStyles.divider} />

        {showUrdu ? (
          <Text style={cardStyles.urdu} textBreakStrategy="simple">
            {item.urdu}
          </Text>
        ) : (
          <>
            {urduMissing ? (
              <Text style={cardStyles.unavailable}>
                {t('hadith.translation.unavailable')}
              </Text>
            ) : null}
            {item.english ? (
              <Text style={cardStyles.english}>{item.english}</Text>
            ) : null}
          </>
        )}

        <Gradings grades={item.grades} label={t('hadith.gradings')} theme={theme} />

        <CardActionsRow
          bookmark={{
            type: 'hadith',
            id: `${item.collection_key}-${item.hadith_number}`,
            title: `${collName} #${item.hadith_number}`,
            arabic: item.arabic ?? '',
            translation: displayedTranslation,
            reference: `${collName} ${item.hadith_number}`,
          }}
          shareable={{
            arabic: item.arabic ?? '',
            translation: displayedTranslation,
            reference: `${collName} ${item.hadith_number}`,
            type: 'hadith',
          }}
          iconColor={palette.textOnCreamMuted}
        />
      </ManuscriptCard>
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
              {/* collName is a proper-noun collection name when in hadiths view — content, not translated */}
              {viewMode === 'collections' ? t('hadith.header.title') : collName}
            </Text>
            <Text style={styles.headerSub}>
              {viewMode === 'collections'
                ? t('hadith.header.subtitle')
                : searchQuery
                ? t('hadith.search.resultsCount', { count: totalCount.toLocaleString() })
                : t('hadith.search.hadithsCount', { count: totalCount.toLocaleString() })}
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
            {t('hadith.empty.notDownloaded', { name: collName })}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            {t('hadith.empty.notDownloadedBody', { name: collName })}
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
            <Text style={styles.retryText}>{t('hadith.actions.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : isDownloading && allHadiths.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t('hadith.empty.preparing', { name: collName })}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            {t('hadith.empty.preparingBody')}
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t('hadith.search.placeholder')}
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={(txt) => { setSearchQuery(txt); setPage(1); }}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={[styles.searchHint, { color: theme.textMuted }]}>
            {t('hadith.search.hint')}
          </Text>

          <FlatList
            data={visibleHadiths}
            keyExtractor={(item) => `${item.collection_key}-${item.id}`}
            renderItem={renderHadith}
            extraData={language}
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
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  {t('hadith.empty.noResults')}
                </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  numBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(239,159,39,0.18)',
  },
  numText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: palette.goldSoft,
  },
  chapter: {
    flex: 1,
    ...typography.caption,
    color: palette.textOnCreamSecondary,
    minWidth: 0,
  },
  bookName: {
    ...typography.caption,
    color: palette.green,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 42,
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
    color: palette.textOnCream,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
    backgroundColor: palette.dividerOnCream,
  },
  english: {
    ...typography.body,
    fontSize: 14,
    color: palette.textOnCreamSecondary,
  },
  urdu: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 17,
    lineHeight: 32,
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : 'NotoNastaliqUrdu_400Regular',
    color: palette.textOnCream,
  },
  unavailable: {
    ...typography.bodySmall,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    color: palette.textOnCreamMuted,
  },
});
