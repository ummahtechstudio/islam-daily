import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { urduStyle } from '../../constants/fonts';
import { ManuscriptCard } from '../ManuscriptCard';
import { useTranslationLanguage } from '../../hooks/useTranslationLanguage';
import type { NamazTable } from '../../types/namaz';

/** Rak'ah-count reference table. Plain themed views — no table library. */
export function ReferenceTable({ table }: { table: NamazTable }) {
  const language = useTranslationLanguage();
  const urdu = language === 'urdu';

  return (
    <ManuscriptCard variant="standard">
      <Text style={styles.titleEn}>{table.title_en}</Text>
      <Text style={styles.titleUr}>{table.title_ur}</Text>

      {/* Header row */}
      <View style={[styles.row, styles.headerRow]}>
        <View style={[styles.cell, styles.labelCell]} />
        {table.columns.map((col) => (
          <View key={col.key} style={styles.cell}>
            <Text style={urdu ? styles.headerTextUr : styles.headerText}>
              {urdu ? col.label_ur : col.label_en}
            </Text>
          </View>
        ))}
      </View>

      {table.rows.map((row, idx) => (
        <View
          key={row.id}
          style={[styles.row, idx % 2 === 0 && styles.rowZebra]}
        >
          <View style={[styles.cell, styles.labelCell]}>
            <Text style={urdu ? styles.rowLabelUr : styles.rowLabel}>
              {urdu ? row.label_ur : row.label_en}
            </Text>
          </View>
          {row.cells.map((cell, cellIdx) => (
            <View key={cellIdx} style={styles.cell}>
              <Text style={styles.cellText}>{cell}</Text>
            </View>
          ))}
        </View>
      ))}

      {table.footnote_en ? (
        <Text style={urdu && table.footnote_ur ? styles.footnoteUr : styles.footnote}>
          {urdu && table.footnote_ur ? table.footnote_ur : table.footnote_en}
        </Text>
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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: palette.dividerOnCream,
    paddingBottom: 4,
    marginBottom: 2,
  },
  rowZebra: { backgroundColor: 'rgba(26,61,47,0.05)' },

  cell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  labelCell: { flex: 1.1, alignItems: 'flex-start', paddingLeft: 6 },

  headerText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    color: palette.textOnCreamMuted,
  },
  headerTextUr: {
    ...urduStyle(11),
    textAlign: 'center',
    color: palette.textOnCreamMuted,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textOnCream,
  },
  rowLabelUr: {
    ...urduStyle(13),
    textAlign: 'left',
    color: palette.textOnCream,
  },
  cellText: {
    fontSize: 13,
    color: palette.textOnCreamSecondary,
  },

  footnote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: spacing.sm,
    color: palette.textOnCreamMuted,
  },
  footnoteUr: {
    ...urduStyle(12),
    marginTop: spacing.sm,
    color: palette.textOnCreamMuted,
  },
});
