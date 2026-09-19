import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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

import { Colors } from '../src/constants/colors';
import { Fonts, urduStyle } from '../src/constants/fonts';
import { spacing, radius } from '../src/constants/spacing';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { getAfterSalahSequence, type AfterSalahStep } from '../src/services/afterSalah';
import { createCounterFromTemplate, setSelectedCounterId } from '../src/utils/tasbeeh';
import { getTranslationLanguage, type TranslationLanguage } from '../src/utils/settings';
import type { TasbeehTemplate } from '../src/types/tasbeeh';

const GOLD = '#EF9F27';

export default function AfterSalahScreen() {
  useEffect(() => { trackScreen('AfterSalah'); }, []);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;
  const isUrduUi = i18n.language?.startsWith('ur');

  const steps = useMemo(() => getAfterSalahSequence(), []);
  const [language, setLanguage] = useState<TranslationLanguage>('urdu');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const lang = await getTranslationLanguage();
        if (active) setLanguage(lang);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  // Same handoff the Dhikr sub-tab uses, but from a stack screen: create the
  // counter, make it the selected one, and open the Tasbeeh screen on it.
  const countWithTasbeeh = useCallback(
    async (step: Extract<AfterSalahStep, { kind: 'dhikr' }>) => {
      const tpl: TasbeehTemplate = {
        id: `tpl-after-salah-${step.id}`,
        name: step.item.transliteration,
        arabic: step.item.arabic,
        target: step.count,
        source: step.item.reference,
        category: t('afterSalah.title'),
      };
      const created = await createCounterFromTemplate(tpl);
      await setSelectedCounterId(created.id);
      router.push('/tasbeeh' as any);
    },
    [router, t],
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, isUrduUi && urduStyle(15), { color: theme.textSecondary }]}>
          {t('afterSalah.subtitle')}
        </Text>

        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            n={i + 1}
            step={step}
            theme={theme}
            language={language}
            isUrduUi={!!isUrduUi}
            onCount={step.kind === 'dhikr' && step.count > 1 ? () => countWithTasbeeh(step) : undefined}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function StepCard({
  n,
  step,
  theme,
  language,
  isUrduUi,
  onCount,
}: {
  n: number;
  step: AfterSalahStep;
  theme: typeof Colors.dark;
  language: TranslationLanguage;
  isUrduUi: boolean;
  onCount?: () => void;
}) {
  const { t } = useTranslation();
  const showUrdu = language === 'urdu';

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.goldAccent} />

      <View style={styles.cardHeader}>
        <View style={[styles.stepBadge, { backgroundColor: Colors.primary + '18' }]}>
          <Text style={[styles.stepBadgeText, { color: Colors.primary }]}>
            {t('afterSalah.step', { n })}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: GOLD + '22' }]}>
          <Text style={[styles.countBadgeText, { color: GOLD }]}>
            {step.count > 1 ? t('afterSalah.times', { n: step.count }) : t('afterSalah.reciteOnce')}
          </Text>
        </View>
      </View>

      {step.kind === 'missing' ? (
        // Deliberately loud: this only renders if a component is absent from the
        // verified bundled data. It must never be replaced by typed-in text.
        <View style={[styles.placeholder, { borderColor: Colors.error }]}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={[styles.placeholderText, { color: Colors.error }]}>
            [PLACEHOLDER] {step.label} — {t('afterSalah.placeholder')}
          </Text>
        </View>
      ) : null}

      {step.kind === 'dhikr' ? (
        <>
          <Text style={[styles.arabic, { color: theme.text }]} textBreakStrategy="simple">
            {step.item.arabic}
          </Text>
          <Text style={[styles.translit, { color: Colors.primary }]}>{step.item.transliteration}</Text>
          <Text style={[styles.english, { color: theme.textSecondary }]}>{step.item.english}</Text>
          {showUrdu && step.item.urdu ? (
            <Text style={[styles.urdu, { color: theme.textSecondary }]}>{step.item.urdu}</Text>
          ) : null}
          {step.item.benefit ? (
            <View style={[styles.benefitRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.benefitText, { color: theme.textSecondary }]}>✨ {step.item.benefit}</Text>
            </View>
          ) : null}
          <View style={[styles.referenceRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.referenceLabel, { color: theme.textMuted }]}>📖 </Text>
            <Text style={[styles.referenceText, { color: GOLD }]}>{step.item.reference}</Text>
          </View>
        </>
      ) : null}

      {step.kind === 'surah' ? (
        <>
          <Text style={[styles.surahName, { color: Colors.primary }]}>
            {t('afterSalah.surah', {
              name: isUrduUi ? step.surah.name_urdu : step.surah.name_english,
            })}{' '}
            <Text style={[styles.surahNameArabic, { color: theme.text }]}>{step.surah.name_arabic}</Text>
          </Text>
          {step.bismillah ? (
            <Text style={[styles.bismillah, { color: theme.textSecondary }]} textBreakStrategy="simple">
              {step.bismillah}
            </Text>
          ) : null}
          {step.ayahs.map((a) => (
            <View key={a.ayah} style={styles.ayahBlock}>
              <Text style={[styles.arabic, { color: theme.text }]} textBreakStrategy="simple">
                {a.arabic} ﴿{a.ayah}﴾
              </Text>
              {a.english ? (
                <Text style={[styles.english, { color: theme.textSecondary }]}>{a.english}</Text>
              ) : null}
              {showUrdu && a.urdu ? (
                <Text style={[styles.urdu, { color: theme.textSecondary }]}>{a.urdu}</Text>
              ) : null}
            </View>
          ))}
          <View style={[styles.referenceRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.referenceLabel, { color: theme.textMuted }]}>📖 </Text>
            <Text style={[styles.referenceText, { color: GOLD }]}>
              {t('afterSalah.quranReference', { surah: step.surah.number, count: step.ayahs.length })}
            </Text>
          </View>
        </>
      ) : null}

      {onCount ? (
        <TouchableOpacity
          style={[styles.countBtn, { borderColor: Colors.primary }]}
          onPress={onCount}
          activeOpacity={0.8}
        >
          <Ionicons name="repeat" size={14} color={Colors.primary} />
          <Text style={[styles.countBtnText, { color: Colors.primary }]}>
            {t('dhikr.countWithTasbeeh')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  intro: { fontSize: 14, lineHeight: 21, paddingHorizontal: spacing.xs, marginBottom: spacing.xs },

  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    paddingLeft: spacing.xl - spacing.xs,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    gap: spacing.sm,
  },
  goldAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: GOLD },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  stepBadgeText: { fontSize: 11, fontWeight: '700' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  countBadgeText: { fontSize: 11, fontWeight: '800' },

  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  placeholderText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },

  arabic: {
    fontFamily: Fonts.arabic,
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 42,
    writingDirection: 'rtl',
  },
  bismillah: {
    fontFamily: Fonts.arabic,
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 38,
    writingDirection: 'rtl',
  },
  ayahBlock: { gap: spacing.xs },
  surahName: { fontSize: 14, fontWeight: '700' },
  surahNameArabic: { fontFamily: Fonts.arabic, fontSize: 16 },
  translit: { fontSize: 14, fontStyle: 'italic', fontWeight: '600' },
  english: { fontSize: 14, lineHeight: 22 },
  urdu: { ...urduStyle(16) },

  benefitRow: { paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  benefitText: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  referenceLabel: { fontSize: 11 },
  referenceText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },

  countBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: spacing.xs,
  },
  countBtnText: { fontSize: 13, fontWeight: '700' },
});
