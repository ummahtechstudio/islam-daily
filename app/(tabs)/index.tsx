import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '../../src/constants/colors';
import { FONTS, urduStyle } from '../../src/constants/fonts';
import { useLocation } from '../../src/hooks/useLocation';
import { usePrayerTimes } from '../../src/hooks/usePrayerTimes';
import { fetchRandomVerse } from '../../src/services/api';
import { useStore } from '../../src/store';
import { CACHE_KEYS, PRAYER_LIST } from '../../src/constants';
import { getContentLanguage, ContentLanguage, isRtlLanguage } from '../../src/services/localization';
import { trackScreen } from '../../src/services/analytics';
import { getSetting } from '../../src/utils/settings';
import { HOME_TILES, HOME_TILES_STORAGE_KEY, DEFAULT_ENABLED_TILE_IDS } from '../../src/constants/homeTiles';

import KNOWLEDGE_DATA from '../../assets/daily_knowledge.json';

const { width: W } = Dimensions.get('window');
const GOLD = '#EF9F27';
const GOLD_LIGHT = 'rgba(239,159,39,0.12)';

type KnowledgeTip = typeof KNOWLEDGE_DATA[0];

// ─── Islamic Geometric Header Pattern ────────────────────────────────────────
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
          stroke="rgba(239,159,39,0.12)"
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

// ─── Next Prayer Hero Card ────────────────────────────────────────────────────
function NextPrayerCard({
  name, time, secondsLeft, city, isDark, onPress,
}: {
  name: string; time: string; secondsLeft: number; city?: string; isDark: boolean; onPress: () => void;
}) {
  const [secs, setSecs] = useState(secondsLeft);

  useEffect(() => {
    setSecs(secondsLeft);
  }, [secondsLeft, name]);

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const countdownStr = h > 0
    ? `${h}h ${m}m`
    : m > 0
    ? `${m}m ${s}s`
    : `${s}s`;

  return (
    <TouchableOpacity
      style={heroStyles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <GeometricPattern width={W - 32} height={140} />
      <View style={heroStyles.left}>
        <Text style={heroStyles.nextLabel}>Next Prayer</Text>
        <Text style={heroStyles.prayerName}>{name}</Text>
        <Text style={heroStyles.prayerTime}>{time}</Text>
        {city ? (
          <View style={heroStyles.locationRow}>
            <Ionicons name="location" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={heroStyles.cityText}>{city}</Text>
          </View>
        ) : null}
      </View>
      <View style={heroStyles.right}>
        <Text style={heroStyles.countdownLabel}>Time Left</Text>
        <Text style={heroStyles.countdown}>{countdownStr}</Text>
        <View style={heroStyles.tapHint}>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  left: { gap: 4 },
  nextLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  prayerName: { color: '#fff', fontSize: 28, fontWeight: '800' },
  prayerTime: { color: GOLD, fontSize: 17, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  cityText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  right: { alignItems: 'center', gap: 4 },
  countdownLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  countdown: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  tapHint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
});

// ─── Quick Access 2×2 Grid ────────────────────────────────────────────────────
const QUICK_CARDS: { id: string; icon: string; label: string; defaultSub: string; route: string; color: string; bg: string }[] = [
  { id: 'quran',         icon: '📖', label: 'Quran',        defaultSub: 'Read & Listen',    route: '/quran',        color: '#0F6E56', bg: '#0F6E5618' },
  { id: 'prayer-times',  icon: '🕌', label: 'Prayer Times', defaultSub: 'All 5 prayers',    route: '/prayer-times', color: '#2563EB', bg: '#2563EB18' },
  { id: 'dua',           icon: '🤲', label: 'Duas',         defaultSub: 'Hisnul Muslim',    route: '/dua',          color: '#7C3AED', bg: '#7C3AED18' },
  { id: 'qibla',         icon: '🧭', label: 'Qibla',        defaultSub: 'Find direction',   route: '/qibla',        color: '#F59E0B', bg: '#F59E0B18' },
];

function QuickGrid({ isDark, prayerData, nextPrayer, onPress, cards }: {
  isDark: boolean;
  prayerData: any;
  nextPrayer: any;
  onPress: (route: string) => void;
  cards: typeof QUICK_CARDS;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const half = Math.floor((W - 32 - 10) / 2);

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
            style={[quickStyles.card, { width: half, backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onPress(card.route)}
            activeOpacity={0.75}
          >
            <View style={[quickStyles.iconBg, { backgroundColor: card.bg }]}>
              <Text style={quickStyles.icon}>{card.icon}</Text>
            </View>
            <Text style={[quickStyles.label, { color: theme.text }]}>{card.label}</Text>
            <Text style={[quickStyles.sub, { color: theme.textMuted }]} numberOfLines={1}>{sub}</Text>
            <View style={[quickStyles.accent, { backgroundColor: card.color }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const quickStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  iconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  icon: { fontSize: 24 },
  label: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 11 },
  accent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
});

// ─── Verse of the Day card ────────────────────────────────────────────────────
function VerseCard({
  arabic, english, reference, isDark, onPress,
}: {
  arabic: string; english: string; reference: string; isDark: boolean; onPress: () => void;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <TouchableOpacity
      style={[verseStyles.card, { backgroundColor: theme.card, borderColor: GOLD + '55' }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={verseStyles.goldBar} />
      <Text style={verseStyles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
      <View style={verseStyles.refRow}>
        <View style={[verseStyles.refBadge, { backgroundColor: GOLD_LIGHT }]}>
          <Text style={[verseStyles.refBadgeText, { color: GOLD }]}>Verse of the Day</Text>
        </View>
        <Text style={[verseStyles.reference, { color: Colors.primary }]}>{reference}</Text>
      </View>
      <Text style={[verseStyles.arabic, { color: theme.text }]} textBreakStrategy="simple">
        {arabic}
      </Text>
      <View style={[verseStyles.divider, { backgroundColor: GOLD + '30' }]} />
      <Text style={[verseStyles.english, { color: theme.textSecondary }]}>{english}</Text>
      <View style={verseStyles.readRow}>
        <Text style={[verseStyles.readBtn, { color: Colors.primary }]}>Continue Reading →</Text>
      </View>
    </TouchableOpacity>
  );
}

const verseStyles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  bismillah: { fontFamily: 'Amiri_400Regular', fontSize: 18, textAlign: 'center', color: GOLD, marginBottom: 10, marginTop: 6 },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  refBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  refBadgeText: { fontSize: 11, fontWeight: '700' },
  reference: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  arabic: { fontFamily: 'Amiri_400Regular', fontSize: 24, textAlign: 'right', lineHeight: 50, writingDirection: 'rtl' },
  divider: { height: 1, marginVertical: 12 },
  english: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  readRow: { marginTop: 10, alignItems: 'flex-end' },
  readBtn: { fontSize: 13, fontWeight: '700' },
});

// ─── Knowledge Tip Card ───────────────────────────────────────────────────────
function KnowledgeCard({ tip, lang, isDark }: { tip: KnowledgeTip; lang: ContentLanguage; isDark: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  const content = (tip as any)[lang] as { title: string; text: string } | undefined;
  if (!content) return null;
  const rtl = isRtlLanguage(lang);

  return (
    <View style={[knowledgeStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={knowledgeStyles.icon}>{tip.icon}</Text>
      <Text style={[knowledgeStyles.title, { color: theme.text, textAlign: rtl ? 'right' : 'left' }]} numberOfLines={2}>
        {content.title}
      </Text>
      <Text style={[knowledgeStyles.text, { color: theme.textSecondary, textAlign: rtl ? 'right' : 'left' }]} numberOfLines={4}>
        {content.text}
      </Text>
    </View>
  );
}

const knowledgeStyles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  icon: { fontSize: 24 },
  title: { fontSize: 13, fontWeight: '700' },
  text: { fontSize: 12, lineHeight: 18 },
});

// ─── More Features Section ────────────────────────────────────────────────────
type MoreItem = { id: string; icon: string; label: string; sub: string; route: string };
type MoreSection = { title: string; icon: string; color: string; items: MoreItem[] };

const MORE_SECTIONS: MoreSection[] = [
  {
    title: 'Islamic Knowledge',
    icon: '📚',
    color: '#2563EB',
    items: [
      { id: 'hadith',        icon: '📜', label: 'Hadith',           sub: '6 collections',    route: '/hadith' },
      { id: 'names',         icon: '☪️',  label: '99 Names of Allah', sub: 'Asmaul Husna',     route: '/names' },
      { id: 'islamic-books', icon: '📕', label: 'Islamic Books',     sub: 'Free PDFs',        route: '/islamic-books' },
      { id: 'fatwa',         icon: '⚡', label: 'Fatwa Q&A',         sub: 'Ask scholars',     route: '/fatwa' },
    ],
  },
  {
    title: 'Calculators',
    icon: '🧮',
    color: '#0D9488',
    items: [
      { id: 'zakat-calculator', icon: '💰', label: 'Zakat Calculator',  sub: 'Calculate zakat',  route: '/zakat-calculator' },
      { id: 'ramadan',          icon: '🌙', label: 'Ramadan Mode',       sub: 'Sehri & Iftar',    route: '/ramadan' },
    ],
  },
  {
    title: 'Tools',
    icon: '🛠️',
    color: '#7C3AED',
    items: [
      { id: 'calendar',       icon: '📅', label: 'Islamic Calendar',   sub: 'Hijri dates',       route: '/calendar' },
      { id: 'mosque-finder',  icon: '🕌', label: 'Mosque Finder',       sub: 'Near you',          route: '/mosque-finder' },
      { id: 'halal-finder',   icon: '🥩', label: 'Halal Finder',        sub: 'Halal restaurants', route: '/halal-finder' },
    ],
  },
  {
    title: 'Personal',
    icon: '👤',
    color: '#F59E0B',
    items: [
      { id: 'hifz-tracker',  icon: '📿', label: 'Hifz Tracker',       sub: 'Track memorization', route: '/hifz-tracker' },
      { id: 'prayer-streak', icon: '🔥', label: 'Prayer Streak',       sub: 'Daily prayers',     route: '/prayer-streak' },
      { id: 'feedback',      icon: '💬', label: 'Feedback',            sub: 'Share thoughts',    route: '/feedback' },
    ],
  },
];

function MoreSection({ section, isDark, onPress }: {
  section: typeof MORE_SECTIONS[0]; isDark: boolean; onPress: (route: string) => void;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={moreStyles.sectionHeader}>
        <View style={[moreStyles.sectionIconBox, { backgroundColor: section.color + '20' }]}>
          <Text style={{ fontSize: 14 }}>{section.icon}</Text>
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
              <Text style={{ fontSize: 16 }}>{item.icon}</Text>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  itemIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 11, marginTop: 1 },
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
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: GOLD + '30' },
  star: { color: GOLD, fontSize: 12 },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ title, isDark }: { title: string; isDark: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={stStyles.row}>
      <View style={[stStyles.dot, { backgroundColor: Colors.primary }]} />
      <Text style={[stStyles.text, { color: theme.text }]}>{title}</Text>
    </View>
  );
}
const stStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  dot: { width: 4, height: 16, borderRadius: 2 },
  text: { fontSize: 16, fontWeight: '800' },
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
  const [contentLang, setContentLang] = useState<ContentLanguage>('en');

  // Home tile customization preferences
  const [enabledIds, setEnabledIds] = useState<string[]>(DEFAULT_ENABLED_TILE_IDS);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const stored = await getSetting<string[]>(
          HOME_TILES_STORAGE_KEY,
          DEFAULT_ENABLED_TILE_IDS,
        );
        if (!cancelled) {
          setEnabledIds(stored);
          setTilesLoaded(true);
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

  // Pick today's 6 tips (seeded by day)
  const dailyTips = React.useMemo(() => {
    const seed = new Date().getDate();
    return [...KNOWLEDGE_DATA]
      .sort((a, b) => ((a.id * seed) % 13) - ((b.id * seed) % 13))
      .slice(0, 6);
  }, []);

  const loadContent = useCallback(async () => {
    setVerseLoading(true);
    try {
      const [v, lang] = await Promise.all([fetchRandomVerse(), getContentLanguage()]);
      setVerse(v);
      setContentLang(lang);
    } catch {}
    setVerseLoading(false);
  }, []);

  useEffect(() => { trackScreen('Home'); }, []);
  useEffect(() => { loadContent(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  }, [loadContent]);

  const navigate = (route: string) => router.push(route as any);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: Colors.primary }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <GeometricPattern width={W} height={110} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.salamAr}>السلام عليكم</Text>
            <Text style={styles.salamEn}>Assalamu Alaikum</Text>
            {prayerData && (
              <Text style={styles.hijriDate}>
                {prayerData.date.hijri.day} {prayerData.date.hijri.month.en} {prayerData.date.hijri.year}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigate('/settings')}
              hitSlop={8}
            >
              <Ionicons name="person-circle-outline" size={28} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
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
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Ramadan Banner ── */}
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

        {/* ── Next Prayer Hero ── */}
        {nextPrayer && (
          <NextPrayerCard
            name={nextPrayer.name}
            time={nextPrayer.time}
            secondsLeft={nextPrayer.secondsLeft}
            city={location?.city}
            isDark={isDark}
            onPress={() => navigate('/prayer-times')}
          />
        )}

        {/* ── Quick Access 2×2 ── */}
        {tilesLoaded && visibleQuickCards.length > 0 && (
          <>
            <SectionTitle title="Quick Access" isDark={isDark} />
            <QuickGrid
              isDark={isDark}
              prayerData={prayerData}
              nextPrayer={nextPrayer}
              onPress={navigate}
              cards={visibleQuickCards}
            />
          </>
        )}

        <GoldDivider />

        {/* ── Verse of the Day ── */}
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
            isDark={isDark}
            onPress={() => navigate('/quran')}
          />
        ) : null}

        <GoldDivider />

        {/* ── Daily Knowledge ── */}
        <SectionTitle title="Daily Knowledge" isDark={isDark} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.knowledgeRow}
        >
          {dailyTips.map((tip) => (
            <KnowledgeCard key={tip.id} tip={tip} lang={contentLang} isDark={isDark} />
          ))}
        </ScrollView>

        <GoldDivider />

        {/* ── More Features ── */}
        {tilesLoaded && visibleMoreSections.length > 0 && (
          <>
            <SectionTitle title="More Features" isDark={isDark} />
            {visibleMoreSections.map((section) => (
              <MoreSection key={section.title} section={section} isDark={isDark} onPress={navigate} />
            ))}
          </>
        )}

        {/* ── Footer ── */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerVersion, { color: theme.textMuted }]}>Islam Daily v1.0.0</Text>
          <Text style={[styles.footerTagline, { color: theme.textMuted }]}>Built with love for the Ummah</Text>
          <Text style={[styles.footerBismillah, { color: Colors.primary }]}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    backgroundColor: Colors.primary,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  salamAr: { fontFamily: 'Amiri_400Regular', color: GOLD, fontSize: 22, letterSpacing: 0.5 },
  salamEn: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  hijriDate: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 2 },

  scroll: { padding: 16, paddingBottom: 32 },

  ramadanBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#1A1035',
    marginBottom: 14,
  },
  ramadanTitle: { color: GOLD, fontSize: 15, fontWeight: '800' },
  ramadanTimes: { gap: 2, alignItems: 'flex-end' },
  ramadanTime: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  loadingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: { fontSize: 14 },

  knowledgeRow: { gap: 10, paddingBottom: 4 },

  footer: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 4,
    borderTopWidth: 1,
    marginTop: 8,
  },
  footerVersion: { fontSize: 12 },
  footerTagline: { fontSize: 12 },
  footerBismillah: { fontFamily: 'Amiri_400Regular', fontSize: 20, marginTop: 8 },
});
