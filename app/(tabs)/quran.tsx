import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../../src/constants/colors';
import { trackScreen } from '../../src/services/analytics';
import { useSurahList } from '../../src/hooks/useQuran';
import { useStore } from '../../src/store';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorView } from '../../src/components/ErrorView';
import { SurahMeta } from '../../src/services/api';

const { width: W } = Dimensions.get('window');
const GOLD = '#EF9F27';
const LAST_READ_KEY = 'last_read_surah';
const LAST_PAGE_KEY = 'last_quran_page';
const BOOKMARKED_PAGES_KEY = 'bookmarked_pages';
const TOTAL_PAGES = 604;
const ALL_PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

// ─── Juz Data ────────────────────────────────────────────────────────────────

const JUZ_DATA = [
  { juz: 1,  name: 'Alif Lam Meem',        surah: 1,   ayah: 1,   page: 1 },
  { juz: 2,  name: 'Sayaqool',              surah: 2,   ayah: 142, page: 22 },
  { juz: 3,  name: 'Tilkar Rusul',          surah: 2,   ayah: 253, page: 42 },
  { juz: 4,  name: 'Lantanalo',             surah: 3,   ayah: 92,  page: 62 },
  { juz: 5,  name: 'Wal Mohsanat',          surah: 4,   ayah: 24,  page: 82 },
  { juz: 6,  name: 'La Yuhibbullah',        surah: 4,   ayah: 148, page: 102 },
  { juz: 7,  name: 'Wa Iza Samiu',          surah: 5,   ayah: 82,  page: 121 },
  { juz: 8,  name: 'Wa Lau Annana',         surah: 6,   ayah: 111, page: 142 },
  { juz: 9,  name: 'Qalal Mala',            surah: 7,   ayah: 88,  page: 162 },
  { juz: 10, name: 'Wa Alamu',              surah: 8,   ayah: 41,  page: 182 },
  { juz: 11, name: 'Yatazeroon',            surah: 9,   ayah: 93,  page: 202 },
  { juz: 12, name: 'Wa Mamin Dabbah',       surah: 11,  ayah: 6,   page: 222 },
  { juz: 13, name: 'Wa Ma Ubarri',          surah: 12,  ayah: 53,  page: 241 },
  { juz: 14, name: 'Rubama',                surah: 15,  ayah: 1,   page: 262 },
  { juz: 15, name: 'Subhanallazi',          surah: 17,  ayah: 1,   page: 282 },
  { juz: 16, name: 'Qal Alam',              surah: 18,  ayah: 75,  page: 302 },
  { juz: 17, name: 'Aqtarabo',              surah: 21,  ayah: 1,   page: 322 },
  { juz: 18, name: 'Qad Aflaha',            surah: 23,  ayah: 1,   page: 342 },
  { juz: 19, name: 'Wa Qalallazina',        surah: 25,  ayah: 21,  page: 362 },
  { juz: 20, name: 'Amman Khalaqa',         surah: 27,  ayah: 56,  page: 382 },
  { juz: 21, name: 'Utlu Ma Oohiya',        surah: 29,  ayah: 46,  page: 402 },
  { juz: 22, name: 'Wa Manyaqnut',          surah: 33,  ayah: 31,  page: 422 },
  { juz: 23, name: 'Wa Mali',               surah: 36,  ayah: 28,  page: 442 },
  { juz: 24, name: 'Faman Azlam',           surah: 39,  ayah: 32,  page: 462 },
  { juz: 25, name: 'Elahe Yuruddo',         surah: 41,  ayah: 47,  page: 482 },
  { juz: 26, name: 'Ha Meem',               surah: 46,  ayah: 1,   page: 502 },
  { juz: 27, name: 'Qala Fama Khatbukum',   surah: 51,  ayah: 31,  page: 522 },
  { juz: 28, name: 'Qad Sami Allah',        surah: 58,  ayah: 1,   page: 542 },
  { juz: 29, name: 'Tabarakalazi',          surah: 67,  ayah: 1,   page: 562 },
  { juz: 30, name: 'Amma Yatasa-aloon',     surah: 78,  ayah: 1,   page: 582 },
];

function getJuzFromPage(page: number): number {
  for (let i = JUZ_DATA.length - 1; i >= 0; i--) {
    if (page >= JUZ_DATA[i].page) return JUZ_DATA[i].juz;
  }
  return 1;
}

// ─── Surah → Page lookup (Hafs ʿan ʿĀṣim, Medina Mushaf) ───────────────────
// Index 0 unused; SURAH_PAGES[surahNum] = first page of that surah

const SURAH_PAGES = [
  0,
  1,   2,   50,  77,  106, 128, 151, 177, 187, 208,
  221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404,
  411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518,
  520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
  551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
  570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594,
  595, 595, 596, 596, 597, 597, 598, 598, 599, 599,
  600, 601, 601, 601, 602, 602, 602, 603, 603, 603,
  603, 604, 604, 604,
];

// ─── 16-Line Page Item (Mushaf Style) ────────────────────────────────────────

interface Ayah16 {
  text: string;
  numberInSurah: number;
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
}

const BISMILLAH_TEXT = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ';
const SURAH_STARTS_WITHOUT_BISMILLAH = new Set([1, 9]);

function SixteenLinePageItem({ page }: { page: number }) {
  const [ayahs, setAyahs] = useState<Ayah16[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAyahs([]);
    setFetchError(false);
    fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`)
      .then((r) => r.json())
      .then((json) => {
        if (active && json.data?.ayahs) {
          setAyahs(json.data.ayahs.map((a: any) => ({
            text: a.text,
            numberInSurah: a.numberInSurah,
            surahNumber: a.surah?.number ?? 0,
            surahName: a.surah?.name ?? '',
            surahEnglishName: a.surah?.englishName ?? '',
          })));
        }
      })
      .catch(() => { if (active) setFetchError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  if (loading) return (
    <View style={styles.pageLoading}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.pageLoadingText}>Loading page {page}…</Text>
    </View>
  );

  if (fetchError || ayahs.length === 0) return (
    <View style={styles.pageLoading}>
      <Ionicons name="wifi-outline" size={40} color={Colors.primary} />
      <Text style={styles.pageLoadingText}>Could not load page {page}</Text>
    </View>
  );

  const seenSurahs = new Set<number>();
  const elements: React.ReactElement[] = [];

  elements.push(
    <Text key="pagenum" style={styles.mushafPageNum}>— {page} —</Text>
  );

  ayahs.forEach((ayah) => {
    const isNewSurah = !seenSurahs.has(ayah.surahNumber);
    if (isNewSurah) {
      seenSurahs.add(ayah.surahNumber);
      elements.push(
        <View key={`surah-${ayah.surahNumber}`} style={styles.mushafSurahBanner}>
          <View style={styles.mushafSurahBannerInner}>
            <Text style={styles.mushafSurahArabic}>{ayah.surahName}</Text>
            <Text style={styles.mushafSurahEnglish}>{ayah.surahEnglishName}</Text>
          </View>
        </View>
      );
      if (!SURAH_STARTS_WITHOUT_BISMILLAH.has(ayah.surahNumber)) {
        elements.push(
          <Text key={`bism-${ayah.surahNumber}`} style={styles.mushafBismillah}>
            {BISMILLAH_TEXT}
          </Text>
        );
      }
    }

    elements.push(
      <Text key={`ayah-${ayah.surahNumber}-${ayah.numberInSurah}`} style={styles.mushafAyah} textBreakStrategy="simple">
        {ayah.text}{'  '}<Text style={styles.mushafAyahNum}>﴿{ayah.numberInSurah}﴾</Text>{'  '}
      </Text>
    );
  });

  return (
    <View style={styles.mushafPage}>
      <View style={styles.mushafFrame}>
        {elements}
      </View>
    </View>
  );
}

// ─── Page View Component ──────────────────────────────────────────────────────

function PageView({
  isDark,
  initPage,
  onPageChange,
}: {
  isDark: boolean;
  initPage: number;
  onPageChange: (p: number) => void;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [currentPage, setCurrentPage] = useState(initPage);
  const [jumpInput, setJumpInput] = useState('');
  const [surahInput, setSurahInput] = useState('');
  const [bookmarkedPages, setBookmarkedPages] = useState<number[]>([]);

  const flatListRef = useRef<FlatList<number>>(null);
  const juz = getJuzFromPage(currentPage);
  const isBookmarked = bookmarkedPages.includes(currentPage);

  useEffect(() => {
    AsyncStorage.getItem(BOOKMARKED_PAGES_KEY)
      .then((raw) => {
        if (raw) setBookmarkedPages(JSON.parse(raw));
      })
      .catch((err) => console.warn('[Quran] load bookmarked pages failed', err));
  }, []);

  // Restore last-read position after list is laid out
  useEffect(() => {
    if (initPage > 1) {
      const t = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initPage - 1, animated: false });
      }, 200);
      return () => clearTimeout(t);
    }
  }, []);

  const scrollToPage = useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, p));
    flatListRef.current?.scrollToIndex({ index: clamped - 1, animated: true });
  }, []);

  const handleJumpPage = () => {
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n)) { scrollToPage(n); setJumpInput(''); }
  };

  const handleJumpSurah = () => {
    const n = parseInt(surahInput, 10);
    if (n >= 1 && n <= 114) { scrollToPage(SURAH_PAGES[n]); setSurahInput(''); }
  };

  const toggleBookmark = async () => {
    const next = bookmarkedPages.includes(currentPage)
      ? bookmarkedPages.filter((p) => p !== currentPage)
      : [...bookmarkedPages, currentPage];
    setBookmarkedPages(next);
    await AsyncStorage.setItem(BOOKMARKED_PAGES_KEY, JSON.stringify(next));
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const p = viewableItems[0].item as number;
      setCurrentPage(p);
      onPageChange(p);
      AsyncStorage.setItem(LAST_PAGE_KEY, String(p)).catch((err) =>
        console.warn('[Quran] persist last page failed', err),
      );
    }
  });

  const onScrollToIndexFailed = useCallback((info: any) => {
    flatListRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: true,
    });
  }, []);

  const renderPage = useCallback(
    ({ item: page }: { item: number }) => <SixteenLinePageItem page={page} />,
    []
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Jump controls */}
      <View style={[styles.jumpBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.jumpRow, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
          <Ionicons name="document-outline" size={13} color={theme.textMuted} />
          <TextInput
            style={[styles.jumpInput, { color: theme.text }]}
            value={jumpInput}
            onChangeText={setJumpInput}
            placeholder="Page 1–604"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            onSubmitEditing={handleJumpPage}
            selectTextOnFocus
            maxLength={3}
            returnKeyType="go"
          />
          <TouchableOpacity onPress={handleJumpPage} hitSlop={8}>
            <Ionicons name="arrow-forward-circle" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.jumpRow, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
          <Ionicons name="list-outline" size={13} color={theme.textMuted} />
          <TextInput
            style={[styles.jumpInput, { color: theme.text }]}
            value={surahInput}
            onChangeText={setSurahInput}
            placeholder="Surah 1–114"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            onSubmitEditing={handleJumpSurah}
            selectTextOnFocus
            maxLength={3}
            returnKeyType="go"
          />
          <TouchableOpacity onPress={handleJumpSurah} hitSlop={8}>
            <Ionicons name="arrow-forward-circle" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Continuous virtualized scroll */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={ALL_PAGES}
          keyExtractor={(item) => String(item)}
          renderItem={renderPage}
          windowSize={11}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          onScrollToIndexFailed={onScrollToIndexFailed}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />

        {/* Floating page + juz indicator — bottom-left */}
        <View
          style={[styles.floatingIndicator, { backgroundColor: theme.card + 'EE' }]}
          pointerEvents="none"
        >
          <Text style={[styles.floatingPageNum, { color: theme.text }]}>{currentPage}</Text>
          <Text style={[styles.floatingPageTotal, { color: theme.textMuted }]}>/604</Text>
          <View style={[styles.floatingJuzChip, { backgroundColor: GOLD + '22' }]}>
            <Text style={[styles.floatingJuzText, { color: GOLD }]}>Juz {juz}</Text>
          </View>
        </View>

        {/* Floating bookmark — bottom-right */}
        <TouchableOpacity
          style={[styles.floatingBookmark, { backgroundColor: theme.card + 'EE' }]}
          onPress={toggleBookmark}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isBookmarked ? GOLD : theme.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Surah List Tab ───────────────────────────────────────────────────────────

type SurahTab = 'surahs' | 'juz';

function SurahListView({
  isDark,
  surahs,
  lastReadSurah,
}: {
  isDark: boolean;
  surahs: SurahMeta[];
  lastReadSurah: number | null;
}) {
  const router = useRouter();
  const theme = isDark ? Colors.dark : Colors.light;
  const [query, setQuery] = useState('');
  const [surahTab, setSurahTab] = useState<SurahTab>('surahs');

  const filtered = query
    ? surahs.filter(
        (s) =>
          s.englishName.toLowerCase().includes(query.toLowerCase()) ||
          s.name.includes(query) ||
          String(s.number).includes(query)
      )
    : surahs;

  const renderSurah = ({ item }: { item: SurahMeta }) => {
    const isLastRead = item.number === lastReadSurah;
    const isMakki = item.revelationType === 'Meccan';

    return (
      <TouchableOpacity
        style={[styles.surahRow, { borderBottomColor: theme.border }]}
        onPress={() => router.push(`/quran/${item.number}` as any)}
        activeOpacity={0.7}
      >
        <View style={[styles.surahNumber, { backgroundColor: Colors.primary + '18' }]}>
          <Text style={[styles.surahNumberText, { color: Colors.primary }]}>{item.number}</Text>
        </View>
        <View style={styles.surahInfo}>
          <View style={styles.surahNameRow}>
            <Text style={[styles.surahEnglish, { color: theme.text }]}>{item.englishName}</Text>
            {isLastRead && (
              <View style={[styles.lastReadBadge, { backgroundColor: GOLD + '22' }]}>
                <Text style={[styles.lastReadText, { color: GOLD }]}>Continue</Text>
              </View>
            )}
          </View>
          <View style={styles.surahMetaRow}>
            <View style={[
              styles.revelationBadge,
              { backgroundColor: isMakki ? Colors.primary + '18' : '#3B82F618' }
            ]}>
              <Text style={[
                styles.revelationText,
                { color: isMakki ? Colors.primary : '#3B82F6' }
              ]}>
                {item.revelationType}
              </Text>
            </View>
            <Text style={[styles.surahMeta, { color: theme.textMuted }]}>
              · {item.numberOfAyahs} verses
            </Text>
          </View>
        </View>
        <View style={styles.surahRight}>
          <Text style={[styles.surahArabic, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.surahTranslation, { color: theme.textMuted }]}>
            {item.englishNameTranslation}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderJuz = ({ item }: { item: typeof JUZ_DATA[0] }) => (
    <TouchableOpacity
      style={[styles.juzRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.juzNum, { backgroundColor: Colors.primary }]}>
        <Text style={styles.juzNumText}>{item.juz}</Text>
      </View>
      <View style={styles.juzInfo}>
        <Text style={[styles.juzName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.juzSurah, { color: theme.textSecondary }]}>
          Starts: Surah {item.surah}, Ayah {item.ayah}
        </Text>
      </View>
      <View style={[styles.juzPageBadge, { backgroundColor: theme.surface }]}>
        <Text style={[styles.juzPageLabel, { color: theme.textMuted }]}>Page</Text>
        <Text style={[styles.juzPageNum, { color: Colors.primary }]}>{item.page}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search surah by name or number..."
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Surah / Juz tabs */}
      <View style={[styles.surahTabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.surahTab, surahTab === 'surahs' && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setSurahTab('surahs')}
        >
          <Text style={[styles.surahTabText, { color: surahTab === 'surahs' ? Colors.primary : theme.textMuted }]}>
            Surah (114)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.surahTab, surahTab === 'juz' && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setSurahTab('juz')}
        >
          <Text style={[styles.surahTabText, { color: surahTab === 'juz' ? Colors.primary : theme.textMuted }]}>
            Juz / Para (30)
          </Text>
        </TouchableOpacity>
      </View>

      {surahTab === 'surahs' ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          renderItem={renderSurah}
          contentContainerStyle={{ backgroundColor: theme.background }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
        />
      ) : (
        <FlatList
          data={JUZ_DATA}
          keyExtractor={(item) => String(item.juz)}
          renderItem={renderJuz}
          contentContainerStyle={styles.juzList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ViewMode = 'verse' | 'page';

export default function QuranScreen() {
  useEffect(() => { trackScreen('Quran'); }, []);
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark =
    settingsScheme === 'dark' ||
    (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const { surahs, loading, error } = useSurahList();
  const [viewMode, setViewMode] = useState<ViewMode>('verse');
  const [lastReadSurah, setLastReadSurah] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    AsyncStorage.getItem(LAST_READ_KEY)
      .then((v) => { if (v) setLastReadSurah(parseInt(v, 10)); })
      .catch((err) => console.warn('[Quran] read LAST_READ_KEY failed', err));
    AsyncStorage.getItem(LAST_PAGE_KEY)
      .then((v) => { if (v) setLastPage(parseInt(v, 10)); })
      .catch((err) => console.warn('[Quran] read LAST_PAGE_KEY failed', err));
  }, []);

  if (loading) return <LoadingSpinner message="Loading Quran..." dark={isDark} />;
  if (error) return <ErrorView message={error} dark={isDark} />;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>The Holy Quran</Text>
            <Text style={styles.headerSub}>القرآن الكريم</Text>
          </View>
          {/* View mode toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'verse' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('verse')}
            >
              <Ionicons name="list" size={14} color={viewMode === 'verse' ? Colors.primary : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.viewToggleText, { color: viewMode === 'verse' ? Colors.primary : 'rgba(255,255,255,0.7)' }]}>
                Verse
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'page' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('page')}
            >
              <Ionicons name="book" size={14} color={viewMode === 'page' ? Colors.primary : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.viewToggleText, { color: viewMode === 'page' ? Colors.primary : 'rgba(255,255,255,0.7)' }]}>
                Page
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {viewMode === 'verse' ? (
        <SurahListView isDark={isDark} surahs={surahs} lastReadSurah={lastReadSurah} />
      ) : (
        <PageView isDark={isDark} initPage={lastPage} onPageChange={setLastPage} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: { paddingBottom: 12 },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    marginTop: 2,
  },

  // View mode toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  viewToggleBtnActive: { backgroundColor: '#fff' },
  viewToggleText: { fontSize: 12, fontWeight: '600' },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // Surah/Juz tabs
  surahTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  surahTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  surahTabText: { fontSize: 13, fontWeight: '600' },

  // Surah list
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  surahNumber: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surahNumberText: { fontSize: 14, fontWeight: '700' },
  surahInfo: { flex: 1 },
  surahNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  surahEnglish: { fontSize: 15, fontWeight: '600' },
  lastReadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lastReadText: { fontSize: 10, fontWeight: '700' },
  surahMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  revelationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  revelationText: { fontSize: 10, fontWeight: '600' },
  surahMeta: { fontSize: 12 },
  surahRight: { alignItems: 'flex-end' },
  surahArabic: { fontFamily: 'Amiri_400Regular', fontSize: 20 },
  surahTranslation: { fontSize: 11, marginTop: 2 },

  // Juz list
  juzList: { padding: 12, gap: 10 },
  juzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  juzNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  juzNumText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  juzInfo: { flex: 1 },
  juzName: { fontSize: 14, fontWeight: '700' },
  juzSurah: { fontSize: 12, marginTop: 2 },
  juzPageBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  juzPageLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  juzPageNum: { fontSize: 16, fontWeight: '800' },

  // Jump bar (replaces nav + page-info bars)
  jumpBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderBottomWidth: 1,
  },
  jumpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  jumpInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // Floating overlays
  floatingIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  floatingPageNum: { fontSize: 14, fontWeight: '800' },
  floatingPageTotal: { fontSize: 12 },
  floatingJuzChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  floatingJuzText: { fontSize: 11, fontWeight: '700' },
  floatingBookmark: {
    position: 'absolute',
    bottom: 16,
    right: 12,
    padding: 8,
    borderRadius: 20,
  },

  // Mushaf page styles (unchanged)
  pageLoading: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  pageLoadingText: { color: Colors.primary, fontSize: 14 },
  mushafPage: {
    padding: 12,
    paddingBottom: 32,
    backgroundColor: '#FFFEF5',
  },
  mushafFrame: {
    borderWidth: 2,
    borderColor: '#1A5C3A',
    borderRadius: 4,
    padding: 16,
    backgroundColor: '#FFFEF5',
  },
  mushafPageNum: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    textAlign: 'center',
    color: '#1A5C3A',
    marginBottom: 12,
    letterSpacing: 2,
  },
  mushafSurahBanner: {
    alignItems: 'center',
    marginVertical: 10,
  },
  mushafSurahBannerInner: {
    borderWidth: 1.5,
    borderColor: '#1A5C3A',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#F0F8F0',
    alignItems: 'center',
    gap: 2,
  },
  mushafSurahArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 20,
    color: '#1A5C3A',
    textAlign: 'center',
  },
  mushafSurahEnglish: {
    fontSize: 11,
    color: '#2D7A4F',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  mushafBismillah: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 20,
    textAlign: 'center',
    color: '#1A1A1A',
    marginVertical: 8,
    lineHeight: 40,
  },
  mushafAyah: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 20,
    textAlign: 'justify',
    writingDirection: 'rtl',
    lineHeight: 44,
    color: '#1A1A1A',
  },
  mushafAyahNum: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 16,
    color: '#1A5C3A',
  },
});
