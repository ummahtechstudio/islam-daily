import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { palette } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { urduStyle } from '../../constants/fonts';
import { ManuscriptCard } from '../ManuscriptCard';
import { useTranslationLanguage } from '../../hooks/useTranslationLanguage';
import type { NamazChecklist } from '../../types/namaz';

/** Display-only checklist (conditions, nullifiers, etiquettes). */
export function ChecklistCard({ checklist }: { checklist: NamazChecklist }) {
  const { t } = useTranslation();
  const language = useTranslationLanguage();
  const urdu = language === 'urdu';

  return (
    <ManuscriptCard variant="standard">
      <Text style={styles.titleEn}>{checklist.title_en}</Text>
      <Text style={styles.titleUr}>{checklist.title_ur}</Text>

      <View style={styles.items}>
        {checklist.items.map((item) => {
          const text = urdu && item.text_ur ? item.text_ur : item.text_en;
          const detail =
            urdu && item.detail_ur ? item.detail_ur : item.detail_en;
          const isUrdu = urdu && !!item.text_ur;
          return (
            <View key={item.id} style={styles.itemRow}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={palette.green}
                style={styles.itemIcon}
              />
              <View style={styles.itemTextBlock}>
                <Text style={isUrdu ? styles.itemTextUr : styles.itemText}>
                  {text}
                </Text>
                {detail ? (
                  <Text
                    style={
                      urdu && item.detail_ur
                        ? styles.itemDetailUr
                        : styles.itemDetail
                    }
                  >
                    {detail}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {checklist.source ? (
        <View style={styles.referenceContainer}>
          <Text style={styles.referenceLabel}>{t('namaz.reference')}</Text>
          <Text style={styles.referenceText}>{checklist.source}</Text>
        </View>
      ) : null}
    </ManuscriptCard>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.sm,
  },

  items: { gap: spacing.sm + 2 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemIcon: { marginTop: 2 },
  itemTextBlock: { flex: 1 },
  itemText: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.textOnCream,
  },
  itemTextUr: {
    ...urduStyle(15),
    color: palette.textOnCream,
  },
  itemDetail: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    color: palette.textOnCreamMuted,
  },
  itemDetailUr: {
    ...urduStyle(13),
    marginTop: 2,
    color: palette.textOnCreamMuted,
  },

  referenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.md,
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
