import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, palette } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { ManuscriptCard } from '../ManuscriptCard';
import { MinaretIcon } from '../icons';
import {
  getBundledDuas,
  getCachedOrBundledDuas,
} from '../../services/content';
import {
  getTranslationLanguage,
  type TranslationLanguage,
} from '../../utils/settings';
import CardActionsRow from '../../../components/CardActionsRow';
import type { Dua, DuaCategory } from '../../types/content';

const GOLD = '#EF9F27';

type CategoryIconSpec =
  | { kind: 'ionicon'; name: keyof typeof Ionicons.glyphMap }
  | { kind: 'minaret' };

const CATEGORY_ICONS: Record<string, CategoryIconSpec> = {
  waking:      { kind: 'ionicon', name: 'sunny-outline' },
  morning:     { kind: 'ionicon', name: 'partly-sunny-outline' },
  evening:     { kind: 'ionicon', name: 'moon-outline' },
  sleep:       { kind: 'ionicon', name: 'moon' },
  prayer:      { kind: 'minaret' },
  eating:      { kind: 'ionicon', name: 'restaurant-outline' },
  travel:      { kind: 'ionicon', name: 'airplane-outline' },
  distress:    { kind: 'ionicon', name: 'heart-outline' },
  forgiveness: { kind: 'ionicon', name: 'leaf-outline' },
  protection:  { kind: 'ionicon', name: 'shield-outline' },
  sickness:    { kind: 'ionicon', name: 'medkit-outline' },
  marriage:    { kind: 'ionicon', name: 'heart-circle-outline' },
  rizq:        { kind: 'ionicon', name: 'cash-outline' },
  friday:      { kind: 'ionicon', name: 'calendar-outline' },
  dua_parents: { kind: 'ionicon', name: 'people-outline' },
  mosque:      { kind: 'minaret' },
  knowledge:   { kind: 'ionicon', name: 'book-outline' },
  rain:        { kind: 'ionicon', name: 'water-outline' },
};

function CategoryIcon({
  icon,
  color,
  size = 22,
}: {
  icon: CategoryIconSpec;
  color: string;
  size?: number;
}) {
  if (icon.kind === 'minaret') {
    return <MinaretIcon size={size} color={color} strokeWidth={1.6} />;
  }
  return <Ionicons name={icon.name} size={size} color={color} />;
}

function getDuaOfMoment(
  duas: DuaCategory[],
): { category: DuaCategory; dua: Dua; reason: string } | null {
  if (!duas.length) return null;
  const hour = new Date().getHours();
  let catId: string;
  let reason: string;

  if (hour >= 4 && hour < 7) {
    catId = 'waking'; reason = 'Morning awakening';
  } else if (hour >= 7 && hour < 12) {
    catId = 'morning'; reason = 'Morning adhkar time';
  } else if (hour >= 12 && hour < 13) {
    catId = 'prayer'; reason = 'Dhuhr prayer time';
  } else if (hour >= 13 && hour < 15) {
    catId = 'knowledge'; reason = 'Midday — seek knowledge';
  } else if (hour >= 15 && hour < 18) {
    catId = 'evening'; reason = 'Evening adhkar time';
  } else if (hour >= 18 && hour < 20) {
    catId = 'evening'; reason = 'Sunset adhkar';
  } else if (hour >= 20 && hour < 23) {
    catId = 'sleep'; reason = 'Preparing for sleep';
  } else {
    catId = 'sleep'; reason = 'Late night';
  }

  const category = duas.find((c) => c.id === catId) ?? duas[0];
  const dua = category.duas[new Date().getDate() % category.duas.length];
  return dua ? { category, dua, reason } : null;
}

export interface MomentSubtabProps {
  theme: typeof Colors.dark;
}

export function MomentSubtab({ theme }: MomentSubtabProps) {
  const { t } = useTranslation();
  const [hisnulMuslim, setHisnulMuslim] = useState<DuaCategory[]>(() => getBundledDuas());
  const [language, setLanguage] = useState<TranslationLanguage>('urdu');

  useEffect(() => {
    setHisnulMuslim(getCachedOrBundledDuas());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const lang = await getTranslationLanguage();
        if (active) setLanguage(lang);
      })();
      return () => { active = false; };
    }, []),
  );

  // Re-render on a minute tick so the moment dua updates when the screen is
  // left open across an hour boundary (without needing a tab revisit).
  const [, setMomentTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMomentTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const moment = getDuaOfMoment(hisnulMuslim);
  const translationFor = (item: { english: string; urdu?: string }) =>
    language === 'urdu' && item.urdu ? item.urdu : item.english;

  if (!moment) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          {t('dua.moment.loading')}
        </Text>
      </View>
    );
  }

  const icon = CATEGORY_ICONS[moment.category.id];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerWrap}>
        <View style={styles.badge}>
          {icon ? (
            <CategoryIcon icon={icon} color={palette.goldSoft} size={14} />
          ) : null}
          <Text style={styles.badgeText}>{t('dua.moment.badge')}</Text>
        </View>
        <Text style={[styles.reason, { color: theme.textMuted }]}>{moment.reason}</Text>
        <Text style={[styles.categoryTitle, { color: theme.textSecondary }]}>
          {moment.category.title}
        </Text>
      </View>

      <ManuscriptCard variant="bordered">
        <Text style={styles.arabic} textBreakStrategy="simple">
          {moment.dua.arabic}
        </Text>

        {moment.dua.transliteration ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.transliteration}>{moment.dua.transliteration}</Text>
          </>
        ) : null}

        <View style={styles.divider} />

        <Text
          style={
            language === 'urdu' && moment.dua.urdu
              ? [styles.translation, styles.urduText]
              : styles.translation
          }
        >
          {translationFor(moment.dua)}
        </Text>

        <View style={styles.referenceContainer}>
          <Text style={styles.referenceLabel}>{t('dua.moment.reference')}</Text>
          <Text style={styles.referenceText}>
            {moment.dua.reference || 'Hisn al-Muslim'}
          </Text>
        </View>

        <CardActionsRow
          bookmark={{
            type: 'dua',
            id: `dua-moment-${moment.category.id}`,
            title: `${moment.category.title} — Dua of the Moment`,
            arabic: moment.dua.arabic,
            translation: translationFor(moment.dua),
            reference: moment.dua.reference || 'Hisn al-Muslim',
            category: moment.category.title,
          }}
          shareable={{
            arabic: moment.dua.arabic,
            translation: translationFor(moment.dua),
            reference: moment.dua.reference || 'Hisn al-Muslim',
            type: 'dua',
          }}
          iconColor={palette.textOnCreamMuted}
        />
      </ManuscriptCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  headerWrap: {
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(239,159,39,0.18)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: palette.goldSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  reason: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 26,
    textAlign: 'right',
    lineHeight: 50,
    color: palette.textOnCream,
    writingDirection: 'rtl',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm + 2,
    backgroundColor: palette.dividerOnCream,
  },
  transliteration: {
    fontSize: 14,
    fontStyle: 'italic',
    color: palette.green,
    lineHeight: 22,
  },
  translation: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.textOnCreamSecondary,
  },
  urduText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 16,
    lineHeight: 28,
    fontStyle: 'normal',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
    color: palette.textOnCream,
  },
  referenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.dividerOnCream,
  },
  referenceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.textOnCreamMuted,
  },
  referenceText: {
    fontSize: 11,
    flexShrink: 1,
    lineHeight: 16,
    color: palette.textOnCreamMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 13,
  },
});
