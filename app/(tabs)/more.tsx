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

import { Colors } from '../../src/constants/colors';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { getBookmarks } from '../../src/utils/bookmarks';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;
const GOLD = '#EF9F27';

const COMING_SOON_ROUTES: Record<string, { title: string; message: string }> = {
  '/audio-library': {
    title: 'Audio Library — Coming Soon',
    message:
      "We're curating a beautiful collection of Quran recitations and Islamic lectures.\n\nAvailable in v1.1, InshaAllah!",
  },
};

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

const SECTIONS = [
  {
    title: 'Prayer & Location',
    icon: 'location' as const,
    color: Colors.primary,
    items: [
      { icon: '🕌', label: 'Prayer Times',   sub: 'All 5 daily prayers',    route: '/prayer',        bg: '#0F6E5622' },
      { icon: '🧭', label: 'Qibla Finder',   sub: 'Live compass to Makkah', route: '/qibla',         bg: '#C9A84C22' },
      { icon: '🕍', label: 'Mosque Finder',  sub: 'Find mosques near you',  route: '/mosque-finder', bg: '#3B82F622' },
    ],
  },
  {
    title: 'Islamic Knowledge',
    icon: 'book' as const,
    color: '#3B82F6',
    items: [
      { icon: '🔖', label: 'My Bookmarks',   sub: 'Saved hadith, duas & dhikr', route: '/bookmarks',    bg: '#EF9F2722' },
      { icon: '📚', label: 'Hadith Browser', sub: '6 major collections',    route: '/hadith',         bg: '#3B82F622' },
      { icon: '☪️',  label: '99 Names',      sub: 'Asma ul-Husna',          route: '/names',          bg: '#8B5CF622' },
      { icon: '📖', label: 'Islamic Books',  sub: 'Free classic texts',     route: '/islamic-books',  bg: '#22C55E22' },
      { icon: '🎧', label: 'Audio Books',   sub: 'Lectures, Quran & Naats', route: '/audio-library',  bg: '#0F6E5622' },
    ],
  },
  {
    title: 'Tools & Calculators',
    icon: 'calculator' as const,
    color: '#8B5CF6',
    items: [
      { icon: '💰', label: 'Zakat Calculator', sub: 'Calculate your Zakat',      route: '/zakat-calculator', bg: '#F59E0B22' },
      { icon: '📅', label: 'Islamic Calendar', sub: 'Hijri & Gregorian dates',   route: '/calendar',         bg: '#EC489922' },
      { icon: '🌙', label: 'Ramadan Mode',     sub: 'Sehri, Iftar & timetable',  route: '/ramadan',          bg: '#1A103522' },
      { icon: '🥩', label: 'Halal Finder',     sub: 'Halal restaurants near you', route: '/halal-finder',    bg: '#EF444422' },
    ],
  },
  {
    title: 'Settings & More',
    icon: 'settings' as const,
    color: '#6B7280',
    items: [
      { icon: '🌐', label: 'Translation',   sub: 'Quran translation language',  route: '/language',     bg: '#3B82F622' },
      { icon: '🔔', label: 'Custom Adhan',  sub: 'Choose Adhan per prayer',     route: '/custom-adhan', bg: '#F9731622' },
      { icon: '⬇️', label: 'Downloads',    sub: 'Save content offline',        route: '/downloads',    bg: '#22C55E22' },
      { icon: '⚙️', label: 'Settings',     sub: 'Theme, font, preferences',    route: '/settings',     bg: '#6B728022' },
      { icon: '💬', label: 'Feedback',     sub: 'Help us improve the app',     route: '/feedback',     bg: '#0F6E5622' },
    ],
  },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function MoreScreen() {
  useEffect(() => { trackScreen('More'); }, []);
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
            <Text style={styles.headerTitle}>More</Text>
            <Text style={styles.headerSub}>Features & Settings</Text>
          </View>
          <TouchableOpacity
            style={styles.bookmarkBadge}
            onPress={() => router.push('/bookmarks' as any)}
          >
            <Ionicons name="bookmark" size={14} color={GOLD} />
            <Text style={styles.bookmarkCount}>{bookmarkCount} saved</Text>
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
              <Text style={[styles.searchLabel, { color: theme.text }]}>Search</Text>
              <Text style={[styles.searchSub, { color: theme.textMuted }]}>
                Search the Quran by keyword
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
              <Text style={[styles.tasbeehLabel, { color: theme.text }]}>Tasbeeh Counter</Text>
              <Text style={[styles.tasbeehUrdu, { color: theme.textSecondary }]}>تسبیح کاؤنٹر</Text>
              <Text style={[styles.tasbeehSub, { color: theme.textMuted }]}>
                Count your dhikr with timer
              </Text>
            </View>
            <View style={[styles.tasbeehChevron, { backgroundColor: Colors.primary + '14' }]}>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Sections ── */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            {/* Section header with colored background */}
            <View style={[styles.sectionHeader, { backgroundColor: section.color + '14' }]}>
              <View style={[styles.sectionIconBox, { backgroundColor: section.color }]}>
                <Ionicons name={section.icon} size={14} color="#fff" />
              </View>
              <Text style={[styles.sectionTitle, { color: section.color }]}>
                {section.title.toUpperCase()}
              </Text>
            </View>

            {/* 2-column grid */}
            <View style={styles.grid}>
              {section.items.map((item) => {
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
                        Alert.alert(comingSoon.title, comingSoon.message, [{ text: 'OK' }]);
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
                      {item.label}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.textMuted }]} numberOfLines={2}>
                      {item.sub}
                    </Text>
                    {comingSoon ? (
                      <View style={styles.soonBadge}>
                        <Text style={styles.soonBadgeText}>SOON</Text>
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
        ))}

        {/* ── Hifz Tracker — full-width featured card ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <View style={[styles.sectionHeader, { backgroundColor: Colors.primary + '14' }]}>
            <View style={[styles.sectionIconBox, { backgroundColor: Colors.primary }]}>
              <Ionicons name="star" size={14} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: Colors.primary }]}>QURAN MEMORIZATION</Text>
          </View>
          <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/hifz-tracker' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.featuredLeft}>
              <Text style={styles.featuredIcon}>📿</Text>
              <View>
                <Text style={styles.featuredLabel}>Hifz Tracker</Text>
                <Text style={styles.featuredSub}>Track your Quran memorization progress</Text>
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
            <Text style={[styles.quoteBadgeText, { color: GOLD }]}>✨ Hadith of Wisdom</Text>
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
          <Text style={[styles.aboutText, { color: theme.textMuted }]}>Islam Daily v1.0.0</Text>
          <Text style={[styles.aboutText, { color: theme.textMuted }]}>
            Built with care for the Muslim community
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
