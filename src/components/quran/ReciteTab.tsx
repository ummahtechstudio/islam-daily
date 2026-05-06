import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MushafPageItem from './MushafPageItem';
import { Colors } from '../../constants/colors';
import { SURAH_META } from '../../constants/surahMeta';
import { pageToJuz, TOTAL_PAGES } from '../../utils/quranNav';
import { useDebouncedPositionWriter } from '../../hooks/useQuranLastPosition';

const ALL_PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
const FONT_SCALE_KEY = 'quran_font_scale';
const LAST_PAGE_KEY = 'quran_last_page';
const FONT_SCALE_MIN = 0.7;
const FONT_SCALE_MAX = 2.0;
const FONT_SCALE_STEP = 0.1;
const GOLD = '#EF9F27';

const SURAH_PAGE_STARTS = [
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

export type ReciteTabProps = {
  // Parent can request a jump (e.g. after tapping the resume banner) by
  // setting `jumpRequest` to a new object. The child watches the nonce so
  // repeated taps with the same page still re-trigger the scroll.
  jumpRequest?: { page: number; nonce: number };
};

export default function ReciteTab({ jumpRequest }: ReciteTabProps = {}) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<number>>(null);
  const positionWriter = useDebouncedPositionWriter(500);

  const [fontScale, setFontScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpModalOpen, setJumpModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(FONT_SCALE_KEY),
      AsyncStorage.getItem(LAST_PAGE_KEY),
    ])
      .then(([scaleRaw, pageRaw]) => {
        if (!active) return;
        if (scaleRaw) {
          const v = parseFloat(scaleRaw);
          if (!isNaN(v) && v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX) {
            setFontScale(v);
          }
        }
        if (pageRaw) {
          const p = parseInt(pageRaw, 10);
          if (!isNaN(p) && p >= 1 && p <= TOTAL_PAGES) {
            setCurrentPage(p);
          }
        }
        setHydrated(true);
      })
      .catch((err) => {
        console.warn('[ReciteTab] hydrate failed', err);
        setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // After hydration, scroll to last page if not page 1. Uses the same
  // scrollToOffset-then-snap path as jumpToPage so far jumps land instantly.
  useEffect(() => {
    if (!hydrated || currentPage <= 1) return;
    const list = flatListRef.current;
    if (!list) return;
    const screenHeight = Dimensions.get('window').height;
    list.scrollToOffset({
      offset: (currentPage - 1) * screenHeight,
      animated: false,
    });
    const t = setTimeout(() => {
      list.scrollToIndex({ index: currentPage - 1, animated: false });
    }, 250);
    return () => clearTimeout(t);
    // Only fire once after first hydration; intentionally no deps on currentPage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Persist fontScale (debounced)
  const fontScaleSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (fontScaleSaveRef.current) clearTimeout(fontScaleSaveRef.current);
    fontScaleSaveRef.current = setTimeout(() => {
      AsyncStorage.setItem(FONT_SCALE_KEY, String(fontScale)).catch(() => {});
    }, 300);
    return () => {
      if (fontScaleSaveRef.current) clearTimeout(fontScaleSaveRef.current);
    };
  }, [fontScale, hydrated]);

  // Persist currentPage (debounced 1s) + unified Quran position
  const pageSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (pageSaveRef.current) clearTimeout(pageSaveRef.current);
    pageSaveRef.current = setTimeout(() => {
      AsyncStorage.setItem(LAST_PAGE_KEY, String(currentPage)).catch(() => {});
    }, 1000);
    positionWriter.schedule({ mode: 'mushaf', page: currentPage });
    return () => {
      if (pageSaveRef.current) clearTimeout(pageSaveRef.current);
    };
  }, [currentPage, hydrated, positionWriter]);

  const adjustScale = useCallback((delta: number) => {
    setFontScale((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, next));
    });
  }, []);

  const renderPage = useCallback(
    ({ item }: { item: number }) => (
      <MushafPageItem pageNumber={item} fontScale={fontScale} />
    ),
    [fontScale],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const p = viewableItems[0].item as number;
      setCurrentPage(p);
    }
  });

  const onScrollToIndexFailed = useCallback((info: any) => {
    flatListRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: false,
    });
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: false,
      });
    }, 80);
  }, []);

  // Each Mushaf page renders to roughly screen-height. Using this estimate to
  // jump via scrollToOffset first avoids onScrollToIndexFailed's intermediate
  // render that previously made far jumps look like a smooth scroll.
  const jumpToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, page));
    const list = flatListRef.current;
    if (!list) return;
    setCurrentPage(clamped);
    const screenHeight = Dimensions.get('window').height;
    list.scrollToOffset({
      offset: (clamped - 1) * screenHeight,
      animated: false,
    });
    // Snap to exact item once it has been measured.
    setTimeout(() => {
      list.scrollToIndex({ index: clamped - 1, animated: false });
    }, 50);
  }, []);

  useEffect(() => {
    if (!jumpRequest || !hydrated) return;
    jumpToPage(jumpRequest.page);
    // Watch nonce so the same page can be re-requested.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpRequest?.nonce, hydrated]);

  const juz = pageToJuz(currentPage);

  return (
    <View style={styles.flex}>
      {/* Font-scale toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarLabel}>Text size</Text>
        <View style={styles.toolbarBtns}>
          <TouchableOpacity
            style={[
              styles.scaleBtn,
              fontScale <= FONT_SCALE_MIN && styles.scaleBtnDisabled,
            ]}
            onPress={() => adjustScale(-FONT_SCALE_STEP)}
            disabled={fontScale <= FONT_SCALE_MIN}
            accessibilityLabel="Decrease text size"
          >
            <Text style={styles.scaleBtnText}>A−</Text>
          </TouchableOpacity>
          <Text style={styles.scaleValue}>
            {Math.round(fontScale * 100)}%
          </Text>
          <TouchableOpacity
            style={[
              styles.scaleBtn,
              fontScale >= FONT_SCALE_MAX && styles.scaleBtnDisabled,
            ]}
            onPress={() => adjustScale(FONT_SCALE_STEP)}
            disabled={fontScale >= FONT_SCALE_MAX}
            accessibilityLabel="Increase text size"
          >
            <Text style={styles.scaleBtnText}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Continuous scroll list */}
      <FlatList
        ref={flatListRef}
        data={ALL_PAGES}
        keyExtractor={(item) => String(item)}
        renderItem={renderPage}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />

      {/* Floating page indicator */}
      <TouchableOpacity
        style={[
          styles.floatingIndicator,
          { bottom: insets.bottom + 24 },
        ]}
        onPress={() => setJumpModalOpen(true)}
        activeOpacity={0.85}
        accessibilityLabel="Jump to page or surah"
      >
        <Ionicons name="book" size={14} color={GOLD} />
        <Text style={styles.floatingText}>
          Page {currentPage} / {TOTAL_PAGES} · Juz {juz}
        </Text>
        <Ionicons name="chevron-up" size={14} color={GOLD} />
      </TouchableOpacity>

      <JumpToModal
        visible={jumpModalOpen}
        onClose={() => setJumpModalOpen(false)}
        onJump={(p) => {
          jumpToPage(p);
          setJumpModalOpen(false);
        }}
      />
    </View>
  );
}

// ─── Jump-to modal ───────────────────────────────────────────────────────────

function JumpToModal({
  visible,
  onClose,
  onJump,
}: {
  visible: boolean;
  onClose: () => void;
  onJump: (page: number) => void;
}) {
  const [pageInput, setPageInput] = useState('');
  const [surahQuery, setSurahQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setPageInput('');
      setSurahQuery('');
    }
  }, [visible]);

  const filteredSurahs = useMemo(() => {
    if (!surahQuery.trim()) return SURAH_META;
    const q = surahQuery.toLowerCase().trim();
    return SURAH_META.filter(
      (s) =>
        s.name_english.toLowerCase().includes(q) ||
        s.name_arabic.includes(q) ||
        String(s.number).includes(q),
    );
  }, [surahQuery]);

  const handlePageJump = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= TOTAL_PAGES) {
      onJump(n);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Jump to</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Page jump */}
          <View style={modalStyles.section}>
            <Text style={modalStyles.sectionLabel}>Page (1–{TOTAL_PAGES})</Text>
            <View style={modalStyles.pageRow}>
              <TextInput
                style={modalStyles.pageInput}
                value={pageInput}
                onChangeText={setPageInput}
                placeholder="e.g. 50"
                placeholderTextColor="#888"
                keyboardType="number-pad"
                maxLength={3}
                onSubmitEditing={handlePageJump}
                returnKeyType="go"
              />
              <TouchableOpacity
                onPress={handlePageJump}
                style={modalStyles.pageGoBtn}
              >
                <Text style={modalStyles.pageGoText}>Go</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Surah search */}
          <View style={[modalStyles.section, { flex: 1 }]}>
            <Text style={modalStyles.sectionLabel}>Surah</Text>
            <View style={modalStyles.searchRow}>
              <Ionicons name="search" size={16} color="#888" />
              <TextInput
                style={modalStyles.surahSearch}
                value={surahQuery}
                onChangeText={setSurahQuery}
                placeholder="Search surah by name or number"
                placeholderTextColor="#888"
              />
            </View>
            <FlatList
              data={filteredSurahs}
              keyExtractor={(item) => String(item.number)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.surahRow}
                  onPress={() => onJump(SURAH_PAGE_STARTS[item.number])}
                >
                  <View style={modalStyles.surahNumPill}>
                    <Text style={modalStyles.surahNumText}>{item.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.surahEnglish}>
                      {item.name_english}
                    </Text>
                    <Text style={modalStyles.surahMeta}>
                      {item.ayah_count} ayahs · Page{' '}
                      {SURAH_PAGE_STARTS[item.number]}
                    </Text>
                  </View>
                  <Text style={modalStyles.surahArabic}>{item.name_arabic}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FBF6E4' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE9',
  },
  toolbarLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  toolbarBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scaleBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  scaleBtnDisabled: { opacity: 0.4 },
  scaleBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  scaleValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 44,
    textAlign: 'center',
  },
  floatingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  floatingText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  section: { padding: 16, gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pageRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A1A',
  },
  pageGoBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pageGoText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  surahSearch: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  surahNumPill: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  surahEnglish: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  surahMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  surahArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    color: '#1A1A1A',
  },
});
