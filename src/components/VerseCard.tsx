import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { FontSizes } from '../constants/fonts';

interface Props {
  arabic: string;
  english: string;
  reference: string;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  dark?: boolean;
  arabicFontSize?: number;
}

export function VerseCard({
  arabic, english, reference, onBookmark, isBookmarked, dark, arabicFontSize = 26,
}: Props) {
  const theme = dark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.reference, { color: Colors.primary }]}>{reference}</Text>
        {onBookmark && (
          <TouchableOpacity onPress={onBookmark} hitSlop={8}>
            <Text style={styles.bookmarkIcon}>{isBookmarked ? '🔖' : '📌'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={[styles.arabic, { fontSize: arabicFontSize, color: theme.text }]}
        textBreakStrategy="simple"
      >
        {arabic}
      </Text>
      <View style={styles.divider} />
      <Text style={[styles.english, { color: theme.textSecondary }]}>{english}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reference: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  bookmarkIcon: { fontSize: 20 },
  arabic: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'right',
    lineHeight: 52,
    writingDirection: 'rtl',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  english: {
    fontSize: FontSizes.base,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
