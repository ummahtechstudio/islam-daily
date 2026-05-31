import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, palette } from '../src/constants/colors';
import { typography } from '../src/constants/typography';
import { spacing, radius } from '../src/constants/spacing';
import { urduStyle } from '../src/constants/fonts';
import { ManuscriptCard } from '../src/components/ManuscriptCard';
import { trackScreen } from '../src/services/analytics';
import { useStore } from '../src/store';
import {
  getBundledNamesOfAllah,
  getCachedOrBundledNamesOfAllah,
} from '../src/services/content';
import type { NameOfAllah } from '../src/types/content';

// Map content-layer NameOfAllah to the screen's display shape.
interface AllaName {
  id: number;
  name: string;
  transliteration: string;
  pronunciation: string;
  meaning: string;
  description?: string | null;
}

function toDisplay(rows: NameOfAllah[]): AllaName[] {
  return rows.map((n) => ({
    id: n.id,
    name: n.arabic,
    transliteration: n.transliteration,
    pronunciation: '',
    meaning: n.english_meaning,
    description: n.urdu_meaning ?? n.meaning_detail ?? null,
  }));
}

// Reverses each row chunk so the grid reads right-to-left without altering
// each card's internal layout. With 99 names and 3 columns, Name 1 lands at
// top-right and Name 99 at bottom-left.
function chunkRTL<T>(arr: T[], chunkSize: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    out.push(...arr.slice(i, i + chunkSize).reverse());
  }
  return out;
}

export default function NamesScreen() {
  useEffect(() => { trackScreen('NamesOfAllah'); }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  // Initial render — bundled JSON only, never touches storage. SSR-safe.
  const [names, setNames] = useState<AllaName[]>(() => toDisplay(getBundledNamesOfAllah()));
  const [selected, setSelected] = useState<AllaName | null>(null);

  // After mount on the client, upgrade to the cached snapshot if MMKV has fresher content.
  useEffect(() => {
    setNames(toDisplay(getCachedOrBundledNamesOfAllah()));
  }, []);

  // Bundled data is 100 entries: id=0 is "The Greatest Name" (✦), ids 1–99 are
  // the 99 Names. Render ✦ as a hero card so the 99-name grid is a clean 33×3.
  const greatestName = names.find((n) => n.id === 0) ?? null;
  const ninetyNineRTL = chunkRTL(names.filter((n) => n.id !== 0), 3);

  const renderName = ({ item }: { item: AllaName }) => (
    <TouchableOpacity
      style={[styles.nameCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => setSelected(item)}
      activeOpacity={0.75}
    >
      <Text style={[styles.nameNum, { color: Colors.primary }]}>{item.id === 0 ? '✦' : item.id}</Text>
      {/* item.name is Arabic content — not translated */}
      <Text style={[styles.nameArabic, { color: theme.text }]}>{item.name}</Text>
      {/* item.transliteration is content — not translated */}
      <Text style={[styles.nameTranslit, { color: theme.textSecondary }]} numberOfLines={1}>
        {item.transliteration}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>{t('names.header.title')}</Text>
        {/* Arabic header text is content, not translated */}
        <Text style={styles.headerAr}>أسماء الله الحسنى</Text>
      </View>

      <FlatList
        data={ninetyNineRTL}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderName}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          greatestName ? (
            <TouchableOpacity
              style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setSelected(greatestName)}
              activeOpacity={0.75}
            >
              <Text style={[styles.heroSymbol, { color: Colors.primary }]}>✦</Text>
              {/* greatestName.name is Arabic content — not translated */}
              <Text style={[styles.nameArabic, { color: theme.text }]}>{greatestName.name}</Text>
              {/* greatestName.transliteration is content — not translated */}
              <Text style={[styles.nameTranslit, { color: theme.textSecondary }]} numberOfLines={1}>
                {greatestName.transliteration}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Detail Modal — manuscript treatment */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
            <View style={[styles.detailHeader, { backgroundColor: Colors.primary }]}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Text style={{ color: '#fff', fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailNum}>
                {selected.id === 0
                  ? t('names.detail.greatestName')
                  : t('names.detail.counter', { id: selected.id })}
              </Text>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <ManuscriptCard variant="bordered" withCornerOrnaments style={{ width: '100%' }}>
                <View style={{ alignItems: 'center', gap: spacing.sm }}>
                  {/* selected.name is Arabic content — not translated */}
                  <Text style={styles.detailArabic}>{selected.name}</Text>
                  {/* selected.transliteration is content — not translated */}
                  <Text style={styles.detailTranslit}>{selected.transliteration}</Text>
                  {selected.pronunciation && (
                    <Text style={styles.detailPronounce}>
                      /{selected.pronunciation}/
                    </Text>
                  )}
                  <View style={styles.meaningInner}>
                    <Text style={styles.meaningLabel}>{t('names.detail.meaningLabel')}</Text>
                    {/* selected.meaning is English meaning content — not translated */}
                    <Text style={styles.meaningText}>{selected.meaning}</Text>
                  </View>
                  {selected.description && (
                    <Text style={[styles.description, urduStyle(18)]}>
                      {selected.description}
                    </Text>
                  )}
                </View>
              </ManuscriptCard>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: 16, paddingTop: 14, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerAr: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Amiri_400Regular', fontSize: 18, marginTop: 2 },

  grid: { padding: 10 },
  row: { gap: 8, marginBottom: 8 },
  nameCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    minHeight: 100,
    justifyContent: 'center',
  },
  nameNum: { fontSize: 11, fontWeight: '700' },
  nameArabic: { fontFamily: 'Amiri_400Regular', fontSize: 20, textAlign: 'center' },
  nameTranslit: { fontSize: 11, textAlign: 'center' },

  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  heroSymbol: { fontSize: 22, fontWeight: '700', marginBottom: 2 },

  detailHeader: { padding: 16, alignItems: 'center', position: 'relative' },
  closeBtn: { position: 'absolute', right: 16, top: 16 },
  detailNum: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  detailContent: { padding: spacing.xl, alignItems: 'center' },
  detailArabic: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 56,
    textAlign: 'center',
    color: palette.gold,
    lineHeight: 84,
  },
  detailTranslit: {
    ...typography.heading1,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: palette.textOnCream,
  },
  detailPronounce: {
    ...typography.body,
    fontStyle: 'italic',
    color: palette.textOnCreamSecondary,
  },
  meaningInner: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: palette.dividerOnCream,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  meaningLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: palette.green,
    fontWeight: '700',
  },
  meaningText: {
    ...typography.heading2,
    fontWeight: '600',
    textAlign: 'center',
    color: palette.textOnCream,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: spacing.sm,
    color: palette.textOnCreamSecondary,
  },
});
