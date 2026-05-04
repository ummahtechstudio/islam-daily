import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { Colors } from '../constants/colors';
import {
  fetchTodaysDailyKnowledge,
  getCachedDailyKnowledge,
} from '../services/dailyKnowledgeService';
import type { DailyKnowledge } from '../types/content';
import { formatRelativeTime } from '../utils/time';

import KNOWLEDGE_DATA from '../../assets/daily_knowledge.json';

const GOLD = '#EF9F27';
const CREAM = '#FBF6E9';
const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

type BundledTip = {
  id: number;
  icon: string;
  category?: string;
  en: { title: string; text: string };
  ur?: { title: string; text: string };
};

/**
 * Synthesize a `DailyKnowledge` from the bundled JSON so a brand-new install
 * with no network still renders content. Picks one tip seeded by the date.
 */
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
      return { ur: 'آیت', en: 'Quran Verse', bg: 'rgba(15,110,86,0.12)', fg: Colors.primary };
    case 'hadith':
      return { ur: 'حدیث', en: 'Hadith', bg: 'rgba(239,159,39,0.15)', fg: GOLD };
    case 'name_of_allah':
      return { ur: 'اسماء الحسنیٰ', en: 'Name of Allah', bg: 'rgba(239,159,39,0.15)', fg: GOLD };
    case 'reflection':
    default:
      return { ur: 'غور و فکر', en: 'Reflection', bg: 'rgba(120,120,120,0.12)', fg: '#5F5E5A' };
  }
}

interface Props {
  isDark: boolean;
}

export function DailyKnowledgeCard({ isDark }: Props) {
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
      .catch(() => {
        // silent — cache or fallback already on screen
      });
    return () => {
      active = false;
    };
  }, []);

  const theme = isDark ? Colors.dark : Colors.light;

  // Empty state — no cache, no Supabase row. Use bundled fallback only if
  // the JSON has any entries; otherwise fall through to the muted message.
  const display = entry ?? bundledFallback();

  if (!display) {
    return (
      <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={styles.emptyIcon}>🌙</Text>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Daily reflection will appear here once online.
        </Text>
      </View>
    );
  }

  const pill = pillFor(display.type);
  const showStale =
    fetchedAt !== null && Date.now() - fetchedAt > STALE_AFTER_MS;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {/* Type pill */}
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillUr, { color: pill.fg }]}>{pill.ur}</Text>
          <Text style={[styles.pillEn, { color: pill.fg }]}>{pill.en}</Text>
        </View>
      </View>

      {/* Arabic block */}
      {display.arabic_text ? (
        <View style={styles.arabicBlock}>
          <Text style={styles.arabicText} textBreakStrategy="simple">
            {display.arabic_text}
          </Text>
        </View>
      ) : null}

      {/* Translation Urdu (primary) */}
      {display.translation_ur ? (
        <Text style={[styles.translationUr, { color: theme.text }]}>
          {display.translation_ur}
        </Text>
      ) : null}

      {/* Translation English (secondary) */}
      {display.translation_en ? (
        <Text style={[styles.translationEn, { color: theme.textSecondary }]}>
          {display.translation_en}
        </Text>
      ) : null}

      {/* Optional context line */}
      {display.context_ur ? (
        <Text style={[styles.contextUr, { color: theme.textMuted }]}>
          {display.context_ur}
        </Text>
      ) : null}

      {/* Footer row */}
      {(display.source_reference || showStale) ? (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text
            style={[styles.source, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {display.source_reference ?? ''}
          </Text>
          {showStale && fetchedAt !== null ? (
            <Text style={[styles.stale, { color: theme.textMuted }]}>
              Updated {formatRelativeTime(fetchedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillUr: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },
  pillEn: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arabicBlock: {
    backgroundColor: CREAM,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  arabicText: {
    fontFamily: 'IndoPakNastaleeq',
    fontSize: 22,
    lineHeight: 44,
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#1a1a1a',
  },
  translationUr: {
    fontSize: 16,
    lineHeight: 32,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },
  translationEn: {
    fontSize: 13,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  contextUr: {
    fontSize: 12,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  source: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  stale: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: { fontSize: 24 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
