import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  secondsLeft: number;
  label?: string;
  dark?: boolean;
}

export function CountdownTimer({ secondsLeft, label, dark }: Props) {
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>}
      <Text style={[styles.timer, dark && styles.timerDark]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  label: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  labelDark: { color: Colors.dark.textSecondary },
  timer: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  timerDark: { color: Colors.accentLight },
});
