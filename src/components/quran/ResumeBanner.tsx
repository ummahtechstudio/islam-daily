import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { palette } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, radius } from '../../constants/spacing';
import type { QuranLastPosition } from '../../hooks/useQuranLastPosition';
import { pageToJuz } from '../../utils/quranNav';
import { SURAH_META } from '../../constants/surahMeta';

function describePosition(pos: QuranLastPosition, t: (key: string, vars?: Record<string, unknown>) => string): string {
  if (pos.mode === 'mushaf' && pos.page) {
    return t('quran.resume.fromPage', { page: pos.page, juz: pageToJuz(pos.page) });
  }
  if (pos.mode === 'translation' && pos.surah && pos.ayah) {
    const meta = SURAH_META.find((s) => s.number === pos.surah);
    const name = meta?.name_english ?? `Surah ${pos.surah}`;
    return t('quran.resume.fromAyah', { name, ayah: pos.ayah });
  }
  return t('quran.resume.continueReading');
}

type Props = {
  position: QuranLastPosition;
  onResume: () => void;
  onDismiss: () => void;
};

export function ResumeBanner({ position, onResume, onDismiss }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.outer}>
      <TouchableOpacity
        onPress={onResume}
        activeOpacity={0.85}
        style={styles.row}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="book-outline" size={18} color={palette.green} />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          {describePosition(position, t)}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={palette.gold} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={10}
        style={styles.dismiss}
        accessibilityLabel={t('quran.resume.dismiss')}
      >
        <Ionicons name="close" size={16} color={palette.textOnCreamSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.cream,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.goldBorderSubtle,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(42,111,79,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.bodySmall,
    flex: 1,
    color: palette.textOnCream,
    fontWeight: '600',
  },
  dismiss: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
});
