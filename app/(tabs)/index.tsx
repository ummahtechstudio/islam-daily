import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Dimensions,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

import { Colors, palette } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { spacing, radius } from '../../src/constants/spacing';
import { useLocation } from '../../src/hooks/useLocation';
import { usePrayerTimes } from '../../src/hooks/usePrayerTimes';
import { useResolvedLocation } from '../../src/hooks/useResolvedLocation';
import { computePrayerTimes } from '../../src/services/prayerTimesService';
import { formatPrayerTime, formatCountdown } from '../../src/utils/formatPrayerTime';
import type { PrayerName } from '../../src/types/prayerTimes';
import { fetchRandomVerse } from '../../src/services/api';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { getSetting } from '../../src/utils/settings';
import { HOME_TILES, HOME_TILES_STORAGE_KEY, DEFAULT_ENABLED_TILE_IDS } from '../../src/constants/homeTiles';

import { ManuscriptCard } from '../../src/components/ManuscriptCard';
import { IslamicPattern } from '../../src/components/IslamicPattern';
import { MinaretIcon, PrayerBeadsIcon } from '../../src/components/icons';

const { width: W } = Dimensions.get('window');

// ─── Subtle diamond watermark for header ─────────────────────────────────────
function GeometricPattern({ width, height }: { width: number; height: number }) {
  const size = 32;
  const cols = Math.ceil(width / size) + 1;
  const rows = Math.ceil(height / size) + 1;
  const diamonds: React.ReactElement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * size + (r % 2 === 0 ? 0 : size / 2);
      const y = r * size * 0.6;
      const s = size * 0.45;
      diamonds.push(
        <Path
          key={`${r}-${c}`}
          d={`M${x},${y - s} L${x + s},${y} L${x},${y + s} L${x - s},${y} Z`}
          fill="none"
          stroke="rgba(239,159,39,0.03)"
          strokeWidth="0.8"
        />
      );
    }
  }
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
      {diamonds}
    </Svg>
  );
}

// ─── Greeting Card — manuscript treatment in body ────────────────────────────
function GreetingCard({ hijriDate }: { hijriDate: string | null }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <ManuscriptCard variant="bordered">
        <View style={greetingStyles.patternWrap} pointerEvents="none">
          <IslamicPattern size={70} color={palette.green} opacity={0.05} />
        </View>
        <Text style={greetingStyles.salamEn}>Assalamu Alaikum</Text>
        {hijriDate ? (
          <Text style={greetingStyles.hijri}>{hijriDate}</Text>
        ) : null}
      </ManuscriptCard>
    </View>
  );
}
const greetingStyles = StyleSheet.create({
  patternWrap: {
    position: 'absolute',
    right: -6,
    top: -6,
  },
  salamEn: {
    ...typography.heading1,
    color: palette.textOnCream,
  },
  hijri: {
    ...typography.body,
    color: palette.textOnCreamSecondary,
    marginTop: spacing.xs,
  },
});

// ─── Compact Prayer Next Card (P.1a) — manuscript treatment ──────────────────
const PRAYER_LABEL_MAP: Record<PrayerName, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};
const METHOD_LABEL_MAP: Record<string, string> = {
  Karachi: 'Karachi',
  Dubai: 'Dubai',
  UmmAlQura: 'Umm al-Qura',
  Egyptian: 'Egyptian',
  Turkey: 'Turkey',
  Singapore: 'Singapore',
  MuslimWorldLeague: 'MWL',
  NorthAmerica: 'North America',
  MoonsightingCommittee: 'Moonsighting',
  Tehran: 'Tehran',
};

function PrayerNextSkeleton() {
  return (
    <ManuscriptCard variant="bordered" style={{ marginBottom: spacing.md }}>
      <View style={[skelStyles.bar, { width: '40%' }]} />
      <View style={[skelStyles.bar, { width: '60%', height: 22, marginTop: spacing.sm }]} />
      <View style={[skelStyles.bar, { width: '50%', marginTop: spacing.sm }]} />
    </ManuscriptCard>
  );
}
const skelStyles = StyleSheet.create({
  bar: { height: 12, borderRadius: 6, backgroundColor: palette.creamSoft },
});

function PrayerNextCard({ onPress }: { onPress: () => void }) {
  const { settings, loading } = useResolvedLocation();
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 60_000);
    // Recompute immediately on foreground so the countdown isn't stale by
    // up to 60 s when the user comes back to the app.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick(Date.now());
    });
    return () => {
      clearInterval(i);
      sub.remove();
    };
  }, []);

  const computed = useMemo(
    () => (loading ? null : computePrayerTimes(settings, new Date(tick))),
    [settings, tick, loading]
  );

  if (loading || !computed) {
    return <PrayerNextSkeleton />;
  }

  const nextEntry = computed.prayers.find((p) => p.name === computed.nextPrayer);
  const nextName = nextEntry
    ? nextEntry.isFriday && nextEntry.name === 'dhuhr'
      ? "Jumu'ah"
      : PRAYER_LABEL_MAP[nextEntry.name]
    : null;

  if (!nextName || !computed.nextPrayerTime) {
    return null;
  }

  const time = formatPrayerTime(computed.nextPrayerTime);
  const countdown = formatCountdown(computed.nextPrayerTime, new Date(tick));
  const methodLabel = METHOD_LABEL_MAP[settings.method] ?? settings.method;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginBottom: spacing.md }}>
      <ManuscriptCard variant="bordered">
        <View style={pncStyles.patternWrap} pointerEvents="none">
          <IslamicPattern size={90} color={palette.green} opacity={0.06} />
        </View>
        <Text style={pncStyles.label}>NEXT PRAYER</Text>
        <View style={pncStyles.row}>
          <Text style={pncStyles.name}>{nextName}</Text>
          <Text style={pncStyles.time}>{time}</Text>
        </View>
        <Text style={pncStyles.countdown}>{countdown}</Text>
        <View style={pncStyles.locRow}>
          <Ionicons name="location-outline" size={14} color={palette.green} />
          <Text style={pncStyles.location}>
            {settings.location.city} · {methodLabel}
          </Text>
        </View>
      </ManuscriptCard>
    </TouchableOpacity>
  );
}
const pncStyles = StyleSheet.create({
  patternWrap: {
    position: 'absolute',
    right: -6,
    top: -6,
    opacity: 1,
  },
  label: {
    ...typography.caption,
    color: palette.textOnCreamSecondary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  name: {
    ...typography.display,
    color: palette.textOnCream,
  },
  time: {
    ...typography.display,
    color: palette.gold,
  },
  countdown: {
    ...typography.bodySmall,
    color: palette.textOnCreamSecondary,
    marginTop: 2,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  location: {
    ...typography.caption,
    color: palette.textOnCreamSecondary,
  },
});

// ─── Quick Access 2×2 Grid — refined icons, no emojis ────────────────────────
type QuickIcon = 'quran' | 'prayer-times' | 'dua' | 'qibla';
type QuickCard = { id: QuickIcon; label: string; defaultSub: string; route: string };

const QUICK_CARDS: QuickCard[] = [
  { id: 'quran',         label: 'Quran',        defaultSub: 'Read & Listen',    route: '/quran' },
  { id: 'prayer-times',  label: 'Prayer Times', defaultSub: 'All 5 prayers',    route: '/prayer' },
  { id: 'dua',           label: 'Duas',         defaultSub: 'Hisnul Muslim',    route: '/dua' },
  { id: 'qibla',         label: 'Qibla',        defaultSub: 'Find direction',   route: '/qibla' },
];

function QuickIconRender({ id }: { id: QuickIcon }) {
  switch (id) {
    case 'quran':
      return <Ionicons name="book-outline" size={28} color={palette.gold} />;
    case 'prayer-times':
      return <MinaretIcon size={30} color={palette.gold} strokeWidth={1.6} />;
    case 'dua':
      return <PrayerBeadsIcon size={28} color={palette.gold} />;
    case 'qibla':
      return <Ionicons name="compass-outline" size={30} color={palette.gold} />;
  }
}

function QuickGrid({ nextPrayer, onPress, cards }: {
  nextPrayer: any;
  onPress: (route: string) => void;
  cards: QuickCard[];
}) {
  const half = Math.floor((W - 32 - 12) / 2);

  return (
    <View style={quickStyles.grid}>
      {cards.map((card) => {
        let sub = card.defaultSub;
        if (card.label === 'Prayer Times' && nextPrayer) {
          sub = `Next: ${nextPrayer.name} ${nextPrayer.time}`;
        }
        return (
          <TouchableOpacity
            key={card.route}
            style={[quickStyles.card, { width: half }]}
            onPress={() => onPress(card.route)}
            activeOpacity={0.8}
          >
            <View style={quickStyles.iconBg}>
              <QuickIconRender id={card.id} />
            </View>
            <Text style={quickStyles.label}>{card.label}</Text>
            <Text style={quickStyles.sub} numberOfLines={1}>{sub}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const quickStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xs },
  card: {
    backgroundColor: palette.greenLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs + 2,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239,159,39,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.heading3,
    color: palette.textPrimary,
  },
  sub: {
    ...typography.bodySmall,
    color: palette.textSecondary,
  },
});

// ─── Verse of the Day card — manuscript treatment ────────────────────────────
function VerseCard({
  arabic, english, reference, onPress,
}: {
  arabic: string; english: string; reference: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ marginBottom: spacing.md }}
    >
      <ManuscriptCard variant="bordered">
        <Text style={verseStyles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
        <View style={verseStyles.refRow}>
          <View style={verseStyles.refBadge}>
            <Text style={verseStyles.refBadgeText}>Verse of the Day</Text>
          </View>
          <Text style={verseStyles.reference}>{reference}</Text>
        </View>
        <Text style={verseStyles.arabic} textBreakStrategy="simple">
          {arabic}
        </Text>
        <View style={verseStyles.divider} />
        <Text style={verseStyles.english}>{english}</Text>
        <View style={verseStyles.readRow}>
          <Text style={verseStyles.readBtn}>Continue Reading →</Text>
        </View>
      </ManuscriptCard>
    </TouchableOpacity>
  );
}

const verseStyles = StyleSheet.create({
  bismillah: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    textAlign: 'center',
    color: palette.gold,
    marginBottom: spacing.sm,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  refBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(239,159,39,0.18)',
  },
  refBadgeText: {
    ...typography.caption,
    color: palette.goldSoft,
    fontWeight: '700',
  },
  reference: {
    ...typography.bodySmall,
    color: palette.green,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 24,
    textAlign: 'right',
    lineHeight: 50,
    writingDirection: 'rtl',
    color: palette.textOnCream,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: palette.goldBorderSubtle,
  },
  english: {
    ...typography.bodySmall,
    color: palette.textOnCreamSecondary,
    fontStyle: 'italic',
  },
  readRow: { marginTop: spacing.sm, alignItems: 'flex-end' },
  readBtn: {
    ...typography.bodySmall,
    color: palette.green,
    fontWeight: '700',
  },
});

// ─── More Features Section ────────────────────────────────────────────────────
type MoreItem = { id: string; icon: keyof typeof Ionicons.glyphMap | string; label: string; sub: string; route: string; useCustomIcon?: 'minaret' };
type MoreSection = { title: string; ionicon: keyof typeof Ionicons.glyphMap; color: string; items: MoreItem[] };

const MORE_SECTIONS: MoreSection[] = [
  {
    title: 'Islamic Knowledge',
    ionicon: 'library-outline',
    color: '#2563EB',
    items: [
      { id: 'hadith',        icon: 'document-text-outline', label: 'Hadith',           sub: '6 collections',    route: '/hadith' },
      { id: 'names',         icon: 'star-outline',  label: '99 Names of Allah', sub: 'Asmaul Husna',     route: '/names' },
      { id: 'islamic-books', icon: 'book-outline', label: 'Islamic Books',     sub: 'Free PDFs',        route: '/islamic-books' },
    ],
  },
  {
    title: 'Calculators',
    ionicon: 'calculator-outline',
    color: '#0D9488',
    items: [
      { id: 'zakat-calculator', icon: 'wallet-outline', label: 'Zakat Calculator',  sub: 'Calculate zakat',  route: '/zakat-calculator' },
      { id: 'ramadan',          icon: 'moon-outline', label: 'Ramadan Mode',       sub: 'Sehri & Iftar',    route: '/ramadan' },
    ],
  },
  {
    title: 'Tools',
    ionicon: 'construct-outline',
    color: '#7C3AED',
    items: [
      { id: 'calendar',       icon: 'calendar-outline', label: 'Islamic Calendar',   sub: 'Hijri dates',       route: '/calendar' },
      { id: 'mosque-finder',  icon: 'minaret', useCustomIcon: 'minaret', label: 'Mosque Finder',       sub: 'Near you',          route: '/mosque-finder' },
      { id: 'halal-finder',   icon: 'restaurant-outline', label: 'Halal Finder',        sub: 'Halal restaurants', route: '/halal-finder' },
    ],
  },
  {
    title: 'Personal',
    ionicon: 'person-outline',
    color: '#F59E0B',
    items: [
      { id: 'hifz-tracker',  icon: 'bookmark-outline', label: 'Hifz Tracker',       sub: 'Track memorization', route: '/hifz-tracker' },
      { id: 'feedback',      icon: 'chatbubble-outline', label: 'Feedback',            sub: 'Share thoughts',    route: '/feedback' },
    ],
  },
];

function MoreItemIcon({ item }: { item: MoreItem }) {
  if (item.useCustomIcon === 'minaret') {
    return <MinaretIcon size={20} color={palette.gold} strokeWidth={1.6} />;
  }
  return <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={palette.gold} />;
}

function MoreSectionView({ section, isDark, onPress }: {
  section: MoreSection; isDark: boolean; onPress: (route: string) => void;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={moreStyles.sectionHeader}>
        <View style={[moreStyles.sectionIconBox, { backgroundColor: section.color + '20' }]}>
          <Ionicons name={section.ionicon} size={14} color={section.color} />
        </View>
        <Text style={[moreStyles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
      </View>
      <View style={[moreStyles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {section.items.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            style={[
              moreStyles.row,
              idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
            onPress={() => onPress(item.route)}
            activeOpacity={0.7}
          >
            <View style={[moreStyles.itemIconBox, { backgroundColor: theme.surface }]}>
              <MoreItemIcon item={item} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[moreStyles.itemLabel, { color: theme.text }]}>{item.label}</Text>
              <Text style={[moreStyles.itemSub, { color: theme.textMuted }]}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const moreStyles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { ...typography.caption, fontWeight: '800', textTransform: 'uppercase', fontSize: 12 },
  sectionCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md, gap: spacing.md },
  itemIconBox: { width: 36, height: 36, borderRadius: radius.sm + 2, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { ...typography.body, fontWeight: '600' },
  itemSub: { ...typography.bodySmall, fontSize: 11, marginTop: 1 },
});

// ─── Gold Divider ─────────────────────────────────────────────────────────────
function GoldDivider() {
  return (
    <View style={dividerStyles.row}>
      <View style={dividerStyles.line} />
      <Text style={dividerStyles.star}>✦</Text>
      <View style={dividerStyles.line} />
    </View>
  );
}
const dividerStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg, gap: spacing.sm + 2 },
  line: { flex: 1, height: 1, backgroundColor: palette.goldBorderSubtle },
  star: { color: palette.gold, fontSize: 12 },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ title, isDark }: { title: string; isDark: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={stStyles.row}>
      <View style={stStyles.dot} />
      <Text style={[stStyles.text, { color: theme.text }]}>{title}</Text>
    </View>
  );
}
const stStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm + 2, marginTop: spacing.xs },
  dot: { width: 4, height: 16, borderRadius: 2, backgroundColor: palette.gold },
  text: { ...typography.heading3, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark = settingsScheme === 'dark' || (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const { location } = useLocation();
  const { data: prayerData, nextPrayer } = usePrayerTimes(location);

  const [verse, setVerse] = useState<{
    arabic: string; english: string; surahName: string; surahNumber: number; verseNumber: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [verseLoading, setVerseLoading] = useState(true);
  const [verseError, setVerseError] = useState(false);

  const [enabledIds, setEnabledIds] = useState<string[]>(DEFAULT_ENABLED_TILE_IDS);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const stored = await getSetting<string[]>(
            HOME_TILES_STORAGE_KEY,
            DEFAULT_ENABLED_TILE_IDS,
          );
          if (!cancelled) setEnabledIds(stored);
        } catch (err) {
          console.warn('[Home] failed to load tile config', err);
          if (!cancelled) setEnabledIds(DEFAULT_ENABLED_TILE_IDS);
        } finally {
          // Always flip the loaded flag so Quick Access + More Features
          // render — otherwise a one-off AsyncStorage error hides them
          // forever.
          if (!cancelled) setTilesLoaded(true);
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const isTileVisible = useCallback(
    (id: string) => {
      const tile = HOME_TILES.find((t) => t.id === id);
      if (tile?.required) return true;
      return enabledIds.includes(id);
    },
    [enabledIds],
  );

  const visibleQuickCards = QUICK_CARDS.filter((c) => isTileVisible(c.id));
  const visibleMoreSections = MORE_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => isTileVisible(i.id)) }))
    .filter((s) => s.items.length > 0);

  const hijriMonth = prayerData?.date?.hijri?.month?.number ?? 0;
  const isRamadan = hijriMonth === 9;

  const loadContent = useCallback(async () => {
    setVerseLoading(true);
    setVerseError(false);
    try {
      const v = await fetchRandomVerse();
      setVerse(v);
    } catch {
      // Verse-of-the-Day depends on alquran.cloud — on first launch offline
      // we have nothing cached yet. Surface a small inline retry instead of
      // hiding the section so users know what's missing.
      setVerseError(true);
    }
    setVerseLoading(false);
  }, []);

  useEffect(() => { trackScreen('Home'); }, []);
  useEffect(() => { loadContent(); }, [loadContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  }, [loadContent]);

  const navigate = (route: string) => router.push(route as any);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.green }]} edges={['top']}>

      {/* ── Header — thin brand strip ── */}
      <View style={styles.header}>
        <GeometricPattern width={W} height={64} />
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }} />
          <Text style={styles.headerSalamAr}>السلام عليكم</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigate('/settings')}
            hitSlop={8}
          >
            <Ionicons name="person-circle-outline" size={26} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.green}
            colors={[palette.green]}
          />
        }
      >
        <GreetingCard
          hijriDate={
            prayerData
              ? `${prayerData.date.hijri.day} ${prayerData.date.hijri.month.en} ${prayerData.date.hijri.year}`
              : null
          }
        />

        {isRamadan && (
          <TouchableOpacity
            style={styles.ramadanBanner}
            onPress={() => navigate('/ramadan')}
            activeOpacity={0.85}
          >
            <Text style={styles.ramadanTitle}>🌙 Ramadan Mubarak</Text>
            <View style={styles.ramadanTimes}>
              {prayerData?.timings?.Fajr && (
                <Text style={styles.ramadanTime}>Sehri: {prayerData.timings.Fajr.split(' ')[0]}</Text>
              )}
              {prayerData?.timings?.Maghrib && (
                <Text style={styles.ramadanTime}>Iftar: {prayerData.timings.Maghrib.split(' ')[0]}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        <PrayerNextCard onPress={() => navigate('/prayer')} />

        {tilesLoaded && visibleQuickCards.length > 0 && (
          <>
            <SectionTitle title="Quick Access" isDark={isDark} />
            <QuickGrid
              nextPrayer={nextPrayer}
              onPress={navigate}
              cards={visibleQuickCards}
            />
          </>
        )}

        <GoldDivider />

        <SectionTitle title="Verse of the Day" isDark={isDark} />
        {verseLoading ? (
          <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading verse...</Text>
          </View>
        ) : verse ? (
          <VerseCard
            arabic={verse.arabic}
            english={verse.english}
            reference={`${verse.surahName} ${verse.surahNumber}:${verse.verseNumber}`}
            onPress={() => navigate('/quran')}
          />
        ) : verseError ? (
          <TouchableOpacity
            style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={loadContent}
            activeOpacity={0.8}
          >
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Couldn't load today's verse. Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : null}

        <GoldDivider />

        {tilesLoaded && visibleMoreSections.length > 0 && (
          <>
            <SectionTitle title="More Features" isDark={isDark} />
            {visibleMoreSections.map((section) => (
              <MoreSectionView key={section.title} section={section} isDark={isDark} onPress={navigate} />
            ))}
          </>
        )}

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerVersion, { color: theme.textMuted }]}>Islam Daily v1.0.0</Text>
          <Text style={[styles.footerTagline, { color: theme.textMuted }]}>Built with love for the Ummah</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    backgroundColor: palette.green,
    overflow: 'hidden',
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  headerSalamAr: {
    fontFamily: 'Amiri_400Regular',
    color: palette.gold,
    fontSize: 18,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  headerBtn: { padding: 2 },

  scroll: { padding: spacing.lg, paddingBottom: spacing['2xl'] },

  ramadanBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#1A1035',
    marginBottom: spacing.md,
  },
  ramadanTitle: {
    ...typography.heading3,
    color: palette.gold,
    fontWeight: '800',
  },
  ramadanTimes: { gap: 2, alignItems: 'flex-end' },
  ramadanTime: {
    ...typography.bodySmall,
    color: palette.textPrimary,
    fontWeight: '600',
  },

  loadingCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: { ...typography.bodySmall },

  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.xs,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  footerVersion: { ...typography.caption },
  footerTagline: { ...typography.caption },
});
