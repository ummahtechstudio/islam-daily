import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { palette } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { urduStyle } from '../../constants/fonts';
import { ManuscriptCard } from '../ManuscriptCard';
import { getNamazEntry } from '../../services/namazContent';
import { useTranslationLanguage } from '../../hooks/useTranslationLanguage';
import { RecitationCard } from './RecitationCard';
import type { NamazStep } from '../../types/namaz';

export interface StepCardProps {
  step: NamazStep;
  /** 1-based position shown in the order badge. */
  order: number;
  /** Render without the outer card (used inside the walkthrough screen). */
  bare?: boolean;
}

/** One numbered instruction of a sequence, with its nested recitations. */
export function StepCard({ step, order, bare }: StepCardProps) {
  const { t } = useTranslation();
  const language = useTranslationLanguage();

  const body = language === 'urdu' && step.body_ur ? step.body_ur : step.body_en;
  const bodyIsUrdu = language === 'urdu' && !!step.body_ur;
  const hanafiNote =
    language === 'urdu' && step.hanafiNote_ur
      ? step.hanafiNote_ur
      : step.hanafiNote_en;
  const noteIsUrdu = language === 'urdu' && !!step.hanafiNote_ur;

  const inner = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{order}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.titleEn}>{step.title_en}</Text>
          <Text style={styles.titleUr}>{step.title_ur}</Text>
        </View>
        {step.fard ? (
          <View style={styles.fardBadge}>
            <Text style={styles.fardText}>{t('namaz.fardBadge')}</Text>
          </View>
        ) : null}
      </View>

      <Text style={bodyIsUrdu ? styles.bodyUr : styles.body}>{body}</Text>

      {hanafiNote ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>{t('namaz.hanafiNote')}</Text>
          <Text style={noteIsUrdu ? styles.noteTextUr : styles.noteText}>
            {hanafiNote}
          </Text>
        </View>
      ) : null}

      {step.recitationIds?.map((id) => {
        const entry = getNamazEntry(id);
        if (!entry) return null;
        return (
          <View key={id} style={styles.recitationWrap}>
            <RecitationCard entry={entry} compact />
          </View>
        );
      })}
    </>
  );

  if (bare) return <View>{inner}</View>;
  return <ManuscriptCard variant="standard">{inner}</ManuscriptCard>;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15,110,86,0.15)',
  },
  orderText: { fontSize: 13, fontWeight: '700', color: palette.green },
  titleBlock: { flex: 1 },
  titleEn: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.green,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  titleUr: {
    ...urduStyle(14),
    textAlign: 'left',
    color: palette.textOnCreamSecondary,
  },

  fardBadge: {
    backgroundColor: 'rgba(194,77,77,0.14)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  fardText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: palette.error,
  },

  body: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.textOnCreamSecondary,
  },
  bodyUr: {
    ...urduStyle(15),
    color: palette.textOnCream,
  },

  noteBox: {
    backgroundColor: 'rgba(239,159,39,0.10)',
    borderLeftWidth: 3,
    borderLeftColor: palette.goldSoft,
    borderRadius: 8,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
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

  recitationWrap: { marginTop: spacing.sm + 2 },
});
