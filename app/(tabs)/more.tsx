import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../src/constants/colors';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { getBookmarks } from '../../src/utils/bookmarks';
import { isRouteHidden } from '../../src/constants/featureFlags';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;
const GOLD = '#EF9F27';

// Coming-soon overlay no longer needed in v1 — the audio library entry is
// filtered out entirely by isRouteHidden(). Kept as an empty record so the
// rendering code below stays unchanged; future "Coming Soon" features can
// be added here in v1.1+.
const COMING_SOON_ROUTES: Record<string, { title: string; message: string }> = {};

// ─── Islamic Quotes (rotating by day) ────────────────────────────────────────

const ISLAMIC_QUOTES = [
  {
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    english: 'Actions are judged by intentions.',
    source: 'Sahih Bukhari 1',
  },
  {
    arabic: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ',
    english: 'Fear Allah wherever you are.',
    source: 'Tirmidhi 1987',
  },
  {
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    english: 'The best of you are those who learn the Quran and teach it.',
    source: 'Sahih Bukhari 5027',
  },
  {
    arabic: 'الدُّنْيَا سِجْنُ الْمُؤْمِنِ وَجَنَّةُ الْكَافِرِ',
    english: 'This world is a prison for the believer and a paradise for the disbeliever.',
    source: 'Sahih Muslim 2956',
  },
  {
    arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
    english: 'Seeking knowledge is an obligation upon every Muslim.',
    source: 'Ibn Majah 224',
  },
  {
    arabic: 'الْمُسْلِمُ مَنْ سَلِمَ النَّاسُ مِنْ لِسَانِهِ وَيَدِهِ',
    english: 'A Muslim is one from whose tongue and hand the people are safe.',
    source: 'Sahih Bukhari 10',
  },
  {
    arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ',
    english: 'Whoever believes in Allah and the Last Day, let him speak good or remain silent.',
    source: 'Sahih Bukhari 6018',
  },
  {
    arabic: 'الصَّبْرُ نِصْفُ الإِيمَانِ',
    english: 'Patience is half of faith.',
    source: 'Shuab al-Iman',
  },
];

// ─── Section data ────────────────────────────────────────────────────────────
// Labels and subtitles are translated at render time via stable item keys.

const SECTIONS = [
  {
    titleKey: 'more.sections.prayerLocation' as const,
    icon: 'location' as const,
    color: Colors.primary,
    items: [
      { icon: '🕌', itemKey: 'prayerTimes',     route: '/prayer',        bg: '#0F6E5622' },
      { icon: '🧭', itemKey: 'qibla',           route: '/qibla',         bg: '#C9A84C22' },
      { icon: '🕍', itemKey: 'mosqueFinder',    route: '/mosque-finder', bg: '#3B82F622' },
    ],
  },
  {
    titleKey: 'more.sections.islamicKnowledge' as const,
    icon: 'book' as const,
    color: '#3B82F6',
    items: [
      { icon: '🔖', itemKey: 'myBookmarks',     route: '/bookmarks',     bg: '#EF9F2722' },
      { icon: '🤲', itemKey: 'namazGuide',      route: '/namaz',         bg: '#0F6E5622' },
      { icon: '📚', itemKey: 'hadithBrowser',   route: '/hadith',        bg: '#3B82F622' },
      { icon: '☪️',  itemKey: 'names99',         route: '/names',         bg: '#8B5CF622' },
      { icon: '📖', itemKey: 'islamicBooks',    route: '/islamic-books', bg: '#22C55E22' },
      { icon: '🎧', itemKey: 'audioBooks',      route: '/audio-library', bg: '#0F6E5622' },
    ],
  },
  {
    titleKey: 'more.sections.toolsCalculators' as const,
    icon: 'calculator' as const,
    color: '#8B5CF6',
    items: [
      { icon: '💰', itemKey: 'zakatCalculator', route: '/zakat-calculator', bg: '#F59E0B22' },
      { icon: '📅', itemKey: 'islamicCalendar', route: '/calendar',         bg: '#EC489922' },
      { icon: '🌙', itemKey: 'ramadanMode',     route: '/ramadan',          bg: '#1A103522' },
      { icon: '🥩', itemKey: 'halalFinder',     route: '/halal-finder',     bg: '#EF444422' },
    ],
  },
  {
    titleKey: 'more.sections.settingsMore' as const,
    icon: 'settings' as const,
    color: '#6B7280',
    items: [
      { icon: '🌐', itemKey: 'translation',     route: '/language',     bg: '#3B82F622' },
      { icon: '🔔', itemKey: 'customAdhan',     route: '/custom-adhan', bg: '#F9731622' },
      { icon: '⬇️', itemKey: 'downloads',       route: '/downloads',    bg: '#22C55E22' },
      { icon: '⚙️', itemKey: 'settings',        route: '/settings',     bg: '#6B728022' },
      { icon: '💬', itemKey: 'feedback',        route: '/feedback',     bg: '#0F6E5622' },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function MoreScreen() {
  useEffect(() => { trackScreen('More'); }, []);
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getBookmarks()
        .then((all) => setBookmarkCount(all.length))
        .catch((err) => console.warn('[More] getBookmarks failed', err));
    }, []),
  );

  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const todayQuote = ISLAMIC_QUOTES[new Date().getDate() % ISLAMIC_QUOTES.length];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: Colors.primary }]}>
          <View>
            <Text style={styles.headerTitle}>{t('more.header.title')}</Text>
            <Text style={styles.headerSub}>{t('more.header.sub')}</Text>
          </View>
          <TouchableOpacity
            style={styles.bookmarkBadge}
            onPress={() => router.push('/bookmarks' as any)}
          >
            <Ionicons name="bookmark" size={14} color={GOLD} />
            <Text style={styles.bookmarkCount}>{t('more.bookmark.saved', { count: bookmarkCount })}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <TouchableOpacity
            style={[styles.searchCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/search' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.searchIconBox, { backgroundColor: Colors.primary + '14' }]}>
              <Ionicons name="search" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.searchLabel, { color: theme.text }]}>{t('more.search.label')}</Text>
              <Text style={[styles.searchSub, { color: theme.textMuted }]}>
                {t('more.search.sub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Featured: Tasbeeh Counter ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <TouchableOpacity
            style={[styles.tasbeehCard, { backgroundColor: theme.card, borderColor: GOLD + '40' }]}
            onPress={() => router.push('/tasbeeh' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.tasbeehIconBox, { backgroundColor: Colors.primary }]}>
              <Text style={styles.tasbeehIcon}>📿</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tasbeehLabel, { color: theme.text }]}>{t('more.tasbeeh.label')}</Text>
              <Text style={[styles.tasbeehUrdu, { color: theme.textSecondary }]}>تسبیح کاؤنٹر</Text>
              <Text style={[styles.tasbeehSub, { color: theme.textMuted }]}>
                {t('more.tasbeeh.sub')}
              </Text>
            </View>
            <View style={[styles.tasbeehChevron, { backgroundColor: Colors.primary + '14' }]}>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Sections ── */}
        {SECTIONS.map((section) => {
          // Hide v1-flagged routes (Islamic Books, Audio Library). If a
          // section ends up empty after filtering, skip its header too so
          // there's no awkward "Islamic Knowledge" with nothing under it.
          const visibleItems = section.items.filter((i) => !isRouteHidden(i.route));
          if (visibleItems.length === 0) return null;
          return (
          <View key={section.titleKey} style={styles.section}>
            {/* Section header with colored background */}
            <View style={[styles.sectionHeader, { backgroundColor: section.color + '14' }]}>
              <View style={[styles.sectionIconBox, { backgroundColor: section.color }]}>
                <Ionicons name={section.icon} size={14} color="#fff" />
              </View>
              <Text style={[styles.sectionTitle, { color: section.color }]}>
                {t(section.titleKey).toUpperCase()}
              </Text>
            </View>

            {/* 2-column grid */}
            <View style={styles.grid}>
              {visibleItems.map((item) => {
                const comingSoon = COMING_SOON_ROUTES[item.route];
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[
                      styles.card,
                      { backgroundColor: theme.card, borderColor: theme.border, width: CARD_W },
                    ]}
                    onPress={() => {
                      if (comingSoon) {
                        Alert.alert(comingSoon.title, comingSoon.message, [{ text: t('common.ok') }]);
                        return;
                      }
                      router.push(item.route as any);
                    }}
                    activeOpacity={0.72}
                  >
                    <View style={[styles.cardIconBg, { backgroundColor: item.bg }]}>
                      <Text style={styles.cardIcon}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.cardLabel, { color: theme.text }]} numberOfLines={1}>
                      {t(`more.items.${item.itemKey}.label`)}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.textMuted }]} numberOfLines={2}>
                      {t(`more.items.${item.itemKey}.sub`)}
                    </Text>
                    {comingSoon ? (
                      <View style={styles.soonBadge}>
                        <Text style={styles.soonBadgeText}>{t('more.soon')}</Text>
                      </View>
                    ) : (
                      <View style={styles.cardArrow}>
                        <Ionicons name="chevron-forward" size={12} color={theme.textMuted} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          );
        })}

        {/* ── Hifz Tracker — full-width featured card ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <View style={[styles.sectionHeader, { backgroundColor: Colors.primary + '14' }]}>
            <View style={[styles.sectionIconBox, { backgroundColor: Colors.primary }]}>
              <Ionicons name="star" size={14} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: Colors.primary }]}>{t('more.sections.quranMemorization').toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/hifz-tracker' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.featuredLeft}>
              <Text style={styles.featuredIcon}>📿</Text>
              <View>
                <Text style={styles.featuredLabel}>{t('more.items.hifzTracker.label')}</Text>
                <Text style={styles.featuredSub}>{t('more.items.hifzTracker.sub')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* ── Gold divider ── */}
        <View style={styles.goldDivider}>
          <View style={styles.goldLine} />
          <Text style={styles.goldStar}>✦</Text>
          <View style={styles.goldLine} />
        </View>

        {/* ── Islamic Quote of the Day ── */}
        <View style={styles.quoteSection}>
          <View style={[styles.quoteBadge, { backgroundColor: GOLD + '22' }]}>
            <Text style={[styles.quoteBadgeText, { color: GOLD }]}>{t('more.quote.badge')}</Text>
          </View>
          <View style={[styles.quoteCard, { backgroundColor: theme.card, borderColor: GOLD + '40' }]}>
            <View style={styles.quoteGoldBar} />
            <Text style={styles.quoteArabic} textBreakStrategy="simple">
              {todayQuote.arabic}
            </Text>
            <View style={[styles.quoteDivider, { backgroundColor: GOLD + '30' }]} />
            <Text style={[styles.quoteEnglish, { color: theme.textSecondary }]}>
              {todayQuote.english}
            </Text>
            <Text style={[styles.quoteSource, { color: GOLD }]}>
              — {todayQuote.source}
            </Text>
          </View>
        </View>

        {/* ── About ── */}
        <View style={[styles.about, { borderTopColor: theme.border }]}>
          <Text style={[styles.aboutText, { color: theme.textMuted }]}>{t('more.about.version')}</Text>
          <Text style={[styles.aboutText, { color: theme.textMuted }]}>
            {t('more.about.tagline')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  bookmarkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bookmarkCount: { color: GOLD, fontSize: 13, fontWeight: '700' },

  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  sectionIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    position: 'relative',
    minHeight: 116,
  },
  cardIconBg: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardIcon: { fontSize: 22 },
  cardLabel: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  cardSub: { fontSize: 11, lineHeight: 15 },
  cardArrow: {
    position: 'absolute',
    top: 14,
    right: 12,
  },
  soonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: GOLD,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  searchIconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLabel: { fontSize: 16, fontWeight: '800' },
  searchSub: { fontSize: 12, marginTop: 2 },

  tasbeehCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  tasbeehIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasbeehIcon: { fontSize: 26 },
  tasbeehLabel: { fontSize: 16, fontWeight: '800' },
  tasbeehUrdu: {
    fontFamily: 'NotoNastaliqUrdu_400Regular',
    fontSize: 13,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  tasbeehSub: { fontSize: 12, marginTop: 2 },
  tasbeehChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 18,
    gap: 12,
  },
  featuredLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  featuredIcon: { fontSize: 32 },
  featuredLabel: { color: '#fff', fontSize: 16, fontWeight: '800' },
  featuredSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  // Gold divider
  goldDivider: { flexDirection: 'row', alignItems: 'center', margin: 20, gap: 10 },
  goldLine: { flex: 1, height: 1, backgroundColor: GOLD + '30' },
  goldStar: { color: GOLD, fontSize: 12 },

  // Islamic Quote section
  quoteSection: { paddingHorizontal: 16, gap: 10 },
  quoteBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  quoteBadgeText: { fontSize: 12, fontWeight: '800' },
  quoteCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    gap: 4,
  },
  quoteGoldBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: GOLD,
  },
  quoteArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 44,
    color: Colors.primary,
    writingDirection: 'rtl',
    marginTop: 8,
  },
  quoteDivider: { height: 1, marginVertical: 10 },
  quoteEnglish: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  quoteSource: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  about: {
    alignItems: 'center',
    padding: 24,
    gap: 4,
    borderTopWidth: 1,
    marginTop: 24,
  },
  aboutText: { fontSize: 13 },
});
