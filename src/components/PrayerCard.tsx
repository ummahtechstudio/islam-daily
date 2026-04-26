import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

const ICONS: Record<string, string> = {
  Fajr: '🌙',
  Sunrise: '🌅',
  Dhuhr: '☀️',
  Asr: '🌤️',
  Maghrib: '🌇',
  Isha: '⭐',
};

interface Props {
  name: string;
  time: string;
  isNext?: boolean;
  dark?: boolean;
}

export function PrayerCard({ name, time, isNext, dark }: Props) {
  const theme = dark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isNext ? Colors.primary : theme.card, borderColor: theme.border },
        isNext && styles.cardActive,
      ]}
    >
      <Text style={styles.icon}>{ICONS[name] ?? '🕌'}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, { color: isNext ? '#fff' : theme.text }]}>{name}</Text>
        {isNext && <Text style={styles.nextLabel}>NEXT</Text>}
      </View>
      <Text style={[styles.time, { color: isNext ? '#fff' : Colors.primary }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  cardActive: {
    borderColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  nextLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  time: { fontSize: 16, fontWeight: '700' },
});
