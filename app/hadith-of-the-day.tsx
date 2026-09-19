import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, palette } from '../src/constants/colors';
import { typography } from '../src/constants/typography';
import { spacing, radius } from '../src/constants/spacing';
import { ManuscriptCard } from '../src/components/ManuscriptCard';
import CardActionsRow from '../components/CardActionsRow';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { getHadithOfTheDay, type HadithOfTheDay } from '../src/services/hadithOfTheDay';
import { COLLECTION_NAMES, type HadithCollectionKey } from '../src/services/hadiths';
import { getTranslationLanguage, type TranslationLanguage } from '../src/utils/settings';

/**
 * Full view of today's hadith. This is also the Daily Hadith notification's
 * deep-link target: the pick is computed when the screen opens, so a tap on a
 * notification scheduled days ago still lands on TODAY's hadith.
 *
 * If no eligible collection is downloaded, it shows the generic nudge and a
 * button to the /hadith collection list — no hadith text is invented.
 */
export default function HadithOfTheDayScreen() {
  useEffect(() => { trackScreen('HadithOfTheDay'); }, []);
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [today, setToday] = useState<HadithOfTheDay | null>(null);
  const [language, setLanguage] = useState<TranslationLanguage>('urdu');

  // Recomputed on every focus: the day may have rolled over, or a collection
  // may have been downloaded since the screen was last shown.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setToday(getHadithOfTheDay());
      getTranslationLanguage().then((lang) => {
        if (active) setLanguage(lang);
      });
      return () => { active = false; };
    }, []),
  );

  if (!today) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📜</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('hadithOfDay.unavailable.title')}</Text>
          <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>{t('hadithOfDay.unavailable.body')}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/hadith' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="library-outline" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('hadithOfDay.unavailable.browse')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { hadith } = today;
  const collName = COLLECTION_NAMES[hadith.collection_key as HadithCollectionKey] ?? hadith.collection_name;
  const showUrdu = language === 'urdu' && !!hadith.urdu;
  const displayedTranslation = showUrdu ? hadith.urdu! : hadith.english ?? '';

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ManuscriptCard variant="bordered">
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('hadithOfDay.badge')}</Text>
            </View>
            <Text style={styles.date}>{today.dateKey}</Text>
          </View>

          {/* collName is the proper-noun collection name — content, not translated */}
          <Text style={styles.bookName}>
            {collName} #{hadith.hadith_number}
          </Text>
          {hadith.chapter_name ? (
            <Text style={styles.chapter} numberOfLines={2}>{hadith.chapter_name}</Text>
          ) : null}

          {hadith.arabic ? (
            <Text style={styles.arabic} textBreakStrategy="simple">{hadith.arabic}</Text>
          ) : null}

          <View style={styles.divider} />

          {showUrdu ? (
            <Text style={styles.urdu} textBreakStrategy="simple">{hadith.urdu}</Text>
          ) : (
            <Text style={styles.english}>{hadith.english}</Text>
          )}

          {hadith.grades.length > 0 ? (
            <View style={styles.gradesWrap}>
              <Text style={styles.gradesLabel}>{t('hadith.gradings')}</Text>
              {hadith.grades.map((g, i) => (
                <Text key={`${g.name}-${i}`} style={styles.gradeLine}>
                  {g.name}: <Text style={styles.gradeValue}>{g.grade}</Text>
                </Text>
              ))}
            </View>
          ) : null}

          <CardActionsRow
            bookmark={{
              type: 'hadith',
              id: `${hadith.collection_key}-${hadith.hadith_number}`,
              title: `${collName} #${hadith.hadith_number}`,
              arabic: hadith.arabic ?? '',
              translation: displayedTranslation,
              reference: `${collName} ${hadith.hadith_number}`,
            }}
            shareable={{
              arabic: hadith.arabic ?? '',
              translation: displayedTranslation,
              reference: `${collName} ${hadith.hadith_number}`,
              type: 'hadith',
            }}
            iconColor={palette.textOnCreamMuted}
          />
        </ManuscriptCard>

        <TouchableOpacity
          style={[styles.openBtn, { borderColor: Colors.primary }]}
          onPress={() =>
            router.push({
              pathname: '/hadith',
              params: { collection: hadith.collection_key, number: hadith.hadith_number },
            } as any)
          }
          activeOpacity={0.85}
        >
          <Ionicons name="book-outline" size={16} color={Colors.primary} />
          <Text style={[styles.openBtnText, { color: Colors.primary }]}>
            {t('hadithOfDay.openInCollection', { collection: collName })}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.note, { color: theme.textMuted }]}>{t('hadithOfDay.poolNote')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.sm },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: spacing.md },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(239,159,39,0.18)',
  },
  badgeText: { ...typography.caption, color: palette.goldSoft, fontWeight: '700' },
  date: { ...typography.caption, color: palette.textOnCreamMuted },
  bookName: {
    ...typography.caption,
    color: palette.green,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  chapter: { ...typography.caption, color: palette.textOnCreamSecondary, marginBottom: spacing.sm },
  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 42,
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
    color: palette.textOnCream,
  },
  divider: { height: 1, marginBottom: spacing.md, backgroundColor: palette.dividerOnCream },
  english: { ...typography.body, fontSize: 14, color: palette.textOnCreamSecondary },
  urdu: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 17,
    lineHeight: 32,
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : 'NotoNastaliqUrdu_400Regular',
    color: palette.textOnCream,
  },
  gradesWrap: { marginTop: spacing.md, gap: 2 },
  gradesLabel: { ...typography.caption, color: palette.textOnCreamMuted, fontWeight: '700', marginBottom: 2 },
  gradeLine: { ...typography.caption, color: palette.textOnCreamSecondary },
  gradeValue: { fontWeight: '700', color: palette.green },

  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  openBtnText: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: spacing.md },
});
