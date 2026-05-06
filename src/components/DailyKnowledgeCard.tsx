// DEFERRED to v1.1+ — see memory: 'Islam Daily Daily Knowledge'
// Component is intentionally unimported as of Phase D.2. Kept in source so we
// can reactivate it once the curated content (themed weeks, ayahs with context,
// hadith explanations, reflection questions) is ready.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

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

import KNOWLEDGE_DATA from '../../assets/daily_knowledge.json';

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type BundledTip = {
  id: number;
  icon: string;
  category?: string;
  en: { title: string; text: string };
  ur?: { title: string; text: string };
};

function bundledFallback(): DailyKnowledge {
  const tips = KNOWLEDGE_DATA as BundledTip[];
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

function pillFor(type: DailyKnowledge['type']): PillSpec {
  switch (type) {
    case 'ayah':
      return { ur: 'آیت', en: 'Quran Verse', bg: 'rgba(15,110,86,0.12)', fg: palette.green };
    case 'hadith':
      return { ur: 'حدیث', en: 'Hadith', bg: 'rgba(239,159,39,0.18)', fg: palette.goldSoft };
    case 'name_of_allah':
      return { ur: 'اسماء الحسنیٰ', en: 'Name of Allah', bg: 'rgba(239,159,39,0.18)', fg: palette.goldSoft };
    case 'reflection':
    default:
      return { ur: 'غور و فکر', en: 'Reflection', bg: 'rgba(26,61,47,0.10)', fg: palette.textOnCreamSecondary };
  }
}

interface Props {
  isDark: boolean;
}

export function DailyKnowledgeCard({ isDark: _isDark }: Props) {
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
  const pill = pillFor(display.type);
  const showStale =
    fetchedAt !== null && Date.now() - fetchedAt > STALE_AFTER_MS;

  return (
    <ManuscriptCard variant="bordered">
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
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
              Updated {formatRelativeTime(fetchedAt)}
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
