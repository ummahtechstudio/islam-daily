// DEFERRED to v1.1+ — see memory: 'Islam Daily Daily Knowledge'
// Component is intentionally unimported as of Phase D.2. Kept in source so we
// can reactivate it once the curated content (themed weeks, ayahs with context,
// hadith explanations, reflection questions) is ready.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { palette } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing, radius } from '../constants/spacing';
import { ManuscriptCard } from './ManuscriptCard';
import {
  fetchTodaysDailyKnowledge,
  getCachedDailyKnowledge,
} from '../services/dailyKnowledgeService';
import type { DailyKnowledge } from '../types/content';
import { formatRelativeTime } from '../utils/time';

// Lazy-required so the 83 KB of curated content doesn't ship in the APK
// while this component is deferred to v1.1+. The require only runs if
// `bundledFallback()` is actually called, which can't happen until the
// component is mounted somewhere — currently nowhere.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type BundledTip = {
  id: number;
  icon: string;
  category?: string;
  en: { title: string; text: string };
  ur?: { title: string; text: string };
};

function bundledFallback(): DailyKnowledge {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tips = require('../../assets/daily_knowledge.json') as BundledTip[];
  const seed = new Date().getDate();
  const sorted = [...tips].sort(
    (a, b) => ((a.id * seed) % 13) - ((b.id * seed) % 13),
  );
  const tip = sorted[0] ?? tips[0];
  const today = new Date().toISOString().split('T')[0] ?? '';
  return {
    id: `bundled-${tip.id}`,
    display_date: today,
    type: 'reflection',
    arabic_text: null,
    source_reference: tip.category ?? null,
    translation_ur: tip.ur?.text ?? null,
    translation_en: tip.en.text,
    context_ur: null,
    context_en: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

interface PillSpec {
  ur: string;
  en: string;
  bg: string;
  fg: string;
}

// pill.ur values are Urdu content strings — not extracted to i18n keys.
// pill.en label keys map to dailyKnowledge.pills.* in en.json.
const PILL_SPEC_BASE: Record<DailyKnowledge['type'], Omit<PillSpec, 'en'>> = {
  ayah:         { ur: 'آیت',          bg: 'rgba(15,110,86,0.12)',  fg: palette.green },
  hadith:       { ur: 'حدیث',         bg: 'rgba(239,159,39,0.18)', fg: palette.goldSoft },
  name_of_allah:{ ur: 'اسماء الحسنیٰ', bg: 'rgba(239,159,39,0.18)', fg: palette.goldSoft },
  reflection:   { ur: 'غور و فکر',    bg: 'rgba(26,61,47,0.10)',  fg: palette.textOnCreamSecondary },
};

interface Props {
  isDark: boolean;
}

export function DailyKnowledgeCard({ isDark: _isDark }: Props) {
  const { t } = useTranslation();
  const initial = getCachedDailyKnowledge();
  const [entry, setEntry] = useState<DailyKnowledge | null>(
    initial?.entry ?? null,
  );
  const [fetchedAt, setFetchedAt] = useState<number | null>(
    initial?.fetchedAt ?? null,
  );

  useEffect(() => {
    let active = true;
    fetchTodaysDailyKnowledge()
      .then((fresh) => {
        if (!active || !fresh) return;
        setEntry(fresh);
        setFetchedAt(Date.now());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const display = entry ?? bundledFallback();
  const base = PILL_SPEC_BASE[display.type] ?? PILL_SPEC_BASE.reflection;

  // Resolve the English pill label at render time via i18n
  const pillEnKey: Record<DailyKnowledge['type'], string> = {
    ayah:          'dailyKnowledge.pills.quranVerse',
    hadith:        'dailyKnowledge.pills.hadith',
    name_of_allah: 'dailyKnowledge.pills.nameOfAllah',
    reflection:    'dailyKnowledge.pills.reflection',
  };
  const pill: PillSpec = { ...base, en: t(pillEnKey[display.type] ?? 'dailyKnowledge.pills.reflection') };

  const showStale =
    fetchedAt !== null && Date.now() - fetchedAt > STALE_AFTER_MS;

  return (
    <ManuscriptCard variant="bordered">
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          {/* pill.ur is Urdu content — not translated via i18n */}
          <Text style={[styles.pillUr, { color: pill.fg }]}>{pill.ur}</Text>
          <Text style={[styles.pillEn, { color: pill.fg }]}>{pill.en}</Text>
        </View>
      </View>

      {display.arabic_text ? (
        <View style={styles.arabicBlock}>
          <Text style={styles.arabicText} textBreakStrategy="simple">
            {display.arabic_text}
          </Text>
        </View>
      ) : null}

      {display.translation_ur ? (
        <Text style={styles.translationUr}>
          {display.translation_ur}
        </Text>
      ) : null}

      {display.translation_en ? (
        <Text style={styles.translationEn}>
          {display.translation_en}
        </Text>
      ) : null}

      {display.context_ur ? (
        <Text style={styles.contextUr}>
          {display.context_ur}
        </Text>
      ) : null}

      {(display.source_reference || showStale) ? (
        <View style={styles.footer}>
          <Text style={styles.source} numberOfLines={1}>
            {display.source_reference ?? ''}
          </Text>
          {showStale && fetchedAt !== null ? (
            <Text style={styles.stale}>
              {t('dailyKnowledge.stale', { time: formatRelativeTime(fetchedAt) })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ManuscriptCard>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  pillUr: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },
  pillEn: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  arabicBlock: {
    backgroundColor: palette.creamSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  arabicText: {
    ...typography.arabicBody,
    textAlign: 'center',
    color: palette.textOnCream,
  },
  translationUr: {
    fontFamily: 'NotoNastaliqUrdu_400Regular',
    fontSize: 16,
    lineHeight: 32,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: palette.textOnCream,
    marginTop: spacing.xs,
  },
  translationEn: {
    ...typography.bodySmall,
    fontStyle: 'italic',
    color: palette.textOnCreamSecondary,
    marginTop: spacing.xs,
  },
  contextUr: {
    fontSize: 12,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
    color: palette.textOnCreamMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.dividerOnCream,
  },
  source: {
    ...typography.caption,
    fontWeight: '600',
    color: palette.textOnCreamSecondary,
    flexShrink: 1,
  },
  stale: {
    fontSize: 10,
    fontStyle: 'italic',
    color: palette.textOnCreamMuted,
  },
});
