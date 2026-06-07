import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

/**
 * Shared green header block for the Namaz module: section title +
 * "Islam Daily · Ummah Tech Studio" brand sub-line (per the content spec).
 */
export function NamazBrandingHeader({ title }: { title?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title ?? t('namaz.header.title')}</Text>
      <Text style={styles.brand}>{t('namaz.header.brand')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg + 4,
    alignItems: 'center',
    gap: 4,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  brand: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
