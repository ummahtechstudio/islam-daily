import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, palette } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export default function ListenTab({ isDark }: { isDark: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Ionicons name="headset-outline" size={64} color={palette.gold} />
      <Text style={[styles.heading, { color: theme.text }]}>
        Audio Recitations
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Beautiful Quran recitations from world-renowned Qaris are coming in
        the next update, insha&apos;Allah.
      </Text>
      <Text style={[styles.footer, { color: theme.textMuted }]}>
        We&apos;re working to bring you the most authentic and high-quality
        recordings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  heading: {
    ...typography.heading2,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    ...typography.bodySmall,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});
