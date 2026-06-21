import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors, palette } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { urduStyle } from '../../constants/fonts';
import { ManuscriptCard } from '../ManuscriptCard';
import CardActionsRow from '../../../components/CardActionsRow';
import { useQuranAudio } from '../../context/QuranAudioContext';
import { resolveQuranRef } from '../../services/namazContent';
import { useTranslationLanguage } from '../../hooks/useTranslationLanguage';
import type { NamazEntry } from '../../types/namaz';

export interface RecitationCardProps {
  entry: NamazEntry;
  /** Nested inside a StepCard — minimal chrome, no share/bookmark row. */
  compact?: boolean;
}

/**
 * The core content card of the Namaz module. Renders an authored recitation
 * or a Quran-ref entry (resolved at runtime from the bundled Tanzil data —
 * never hand-typed). Quran entries get a bounded play button that stops at
 * the end of the cited range.
 */
export function RecitationCard({ entry, compact }: RecitationCardProps) {
  const { t } = useTranslation();
  const language = useTranslationLanguage();
  const audio = useQuranAudio();

  const resolved = useMemo(
    () => (entry.kind === 'quran' ? resolveQuranRef(entry) : null),
    [entry],
  );

  const arabic = entry.kind === 'quran' ? resolved?.arabic ?? '' : entry.arabic;
  const translationEn =
    entry.kind === 'quran' ? resolved?.translation_en ?? '' : entry.translation_en;
  const translationUr =
    entry.kind === 'quran' ? resolved?.translation_ur ?? '' : entry.translation_ur;
  const showUrdu = language === 'urdu' && !!translationUr;
  const note = language === 'urdu' && entry.note_ur ? entry.note_ur : entry.note_en;
  const noteIsUrdu = language === 'urdu' && !!entry.note_ur;

  // Audio state for Quran entries: active when the playing ayah falls inside
  // this entry's range.
  const isActive =
    entry.kind === 'quran' &&
    !!audio.current &&
    audio.current.surah === entry.surah &&
    audio.current.ayah >= entry.ayahStart &&
    audio.current.ayah <= entry.ayahEnd;

  // On a failed load the context keeps `current` set (so isActive stays true)
  // but flips `error` — without this the button would sit as a steady "stop"
  // while nothing plays. Surface a retry affordance instead.
  const hasError = isActive && !!audio.error;

  const onToggleAudio = () => {
    if (entry.kind !== 'quran') return;
    if (isActive && !hasError) {
      void audio.stop();
    } else {
      // Start, or retry after a failed load.
      void audio.playRange(entry.surah, entry.ayahStart, entry.ayahEnd);
    }
  };

  return (
    <ManuscriptCard
      variant={compact ? 'minimal' : 'standard'}
      contentStyle={compact ? styles.compactContent : undefined}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleEn}>{entry.title_en}</Text>
          <Text style={styles.titleUr}>{entry.title_ur}</Text>
        </View>
        <View style={styles.headerActions}>
          {entry.repeat ? (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatText}>
                {t('namaz.repeatBadge', { count: entry.repeat })}
              </Text>
            </View>
          ) : null}
          {entry.kind === 'quran' ? (
            <TouchableOpacity
              onPress={onToggleAudio}
              hitSlop={8}
              accessibilityLabel={
                isActive && !hasError ? t('namaz.stopAudio') : t('namaz.playAudio')
              }
            >
              {isActive && audio.isLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name={hasError ? 'alert-circle' : isActive ? 'stop-circle' : 'play-circle'}
                  size={28}
                  color={hasError ? Colors.warning : Colors.primary}
                />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={[styles.arabic, compact && styles.arabicCompact]} textBreakStrategy="simple">
        {arabic || '—'}
      </Text>

      <View style={styles.divider} />

      {entry.kind === 'recitation' && entry.transliteration ? (
        <Text style={styles.translit}>{entry.transliteration}</Text>
      ) : null}

      {showUrdu ? (
        <Text style={styles.translationUr}>{translationUr}</Text>
      ) : translationEn ? (
        <Text style={styles.translationEn}>{translationEn}</Text>
      ) : null}

      {note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>{t('namaz.hanafiNote')}</Text>
          <Text style={noteIsUrdu ? styles.noteTextUr : styles.noteText}>
            {note}
          </Text>
        </View>
      ) : null}

      <View style={styles.referenceContainer}>
        <Text style={styles.referenceLabel}>{t('namaz.reference')}</Text>
        <Text style={styles.referenceText}>{entry.source}</Text>
      </View>

      {!compact ? (
        <CardActionsRow
          bookmark={{
            type: 'dua',
            id: `namaz-${entry.id}`,
            title: entry.title_en,
            arabic,
            translation: showUrdu ? translationUr : translationEn,
            reference: entry.source,
            category: 'Namaz & Masnoon Duas',
          }}
          shareable={{
            arabic,
            translation: showUrdu ? translationUr : translationEn,
            reference: entry.source,
            type: 'dua',
          }}
          iconColor={palette.textOnCreamMuted}
        />
      ) : null}
    </ManuscriptCard>
  );
}

const styles = StyleSheet.create({
  compactContent: { padding: spacing.md },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  titleBlock: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleEn: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.green,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  titleUr: {
    ...urduStyle(15),
    textAlign: 'left',
    color: palette.textOnCreamSecondary,
  },

  repeatBadge: {
    backgroundColor: 'rgba(239,159,39,0.18)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  repeatText: { fontSize: 12, fontWeight: '700', color: palette.goldSoft },

  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 42,
    writingDirection: 'rtl',
    color: palette.textOnCream,
  },
  arabicCompact: { fontSize: 20, lineHeight: 38 },

  divider: {
    height: 1,
    marginVertical: spacing.sm + 2,
    backgroundColor: palette.dividerOnCream,
  },

  translit: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: spacing.xs + 2,
    color: palette.green,
  },
  translationEn: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xs + 2,
    color: palette.textOnCreamSecondary,
  },
  translationUr: {
    ...urduStyle(16),
    marginBottom: spacing.xs + 2,
    color: palette.textOnCream,
  },

  noteBox: {
    backgroundColor: 'rgba(239,159,39,0.10)',
    borderLeftWidth: 3,
    borderLeftColor: palette.goldSoft,
    borderRadius: 8,
    padding: spacing.sm + 2,
    marginTop: spacing.xs + 2,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.goldSoft,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: palette.textOnCreamSecondary,
  },
  noteTextUr: {
    ...urduStyle(14),
    color: palette.textOnCreamSecondary,
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
});
