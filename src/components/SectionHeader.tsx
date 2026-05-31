import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';

interface Props {
  title: string;
  onSeeAll?: () => void;
  dark?: boolean;
}

export function SectionHeader({ title, onSeeAll, dark }: Props) {
  const { t } = useTranslation();
  const theme = dark ? Colors.dark : Colors.light;
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>{t('section.seeAll')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  title: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
