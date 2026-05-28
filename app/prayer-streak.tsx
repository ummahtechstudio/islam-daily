import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { CACHE_KEYS, PRAYER_LIST } from '../src/constants';
import { trackScreen } from '../src/services/analytics';
import { safeJsonParse } from '../src/utils/safeJsonParse';

type DayRecord = {
  date: string; // YYYY-MM-DD
  prayers: Record<string, boolean>;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

function dayLabel(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(dateStr);
  return days[d.getDay()];
}

export default function PrayerStreakScreen() {
  useEffect(() => { trackScreen('PrayerStreak'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [records, setRecords] = useState<Record<string, DayRecord>>({});
  const today = todayStr();
  const last7 = getLast7Days();

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEYS.prayerStreak)
      .then((raw) => {
        setRecords(safeJsonParse<Record<string, DayRecord>>(raw, {}));
      })
      .catch((err) => console.warn('[PrayerStreak] load records failed', err));
  }, []);

  const togglePrayer = useCallback(async (date: string, prayer: string) => {
    const dayRec: DayRecord = records[date] ?? { date, prayers: {} };
    const next: DayRecord = {
      ...dayRec,
      prayers: { ...dayRec.prayers, [prayer]: !dayRec.prayers[prayer] },
    };
    const nextRecords = { ...records, [date]: next };
    setRecords(nextRecords);
    await AsyncStorage.setItem(CACHE_KEYS.prayerStreak, JSON.stringify(nextRecords));
  }, [records]);

  // Calculate streak: consecutive days where all 5 prayers completed
  const streak = (() => {
    let s = 0;
    const sortedDays = [...last7].reverse();
    for (const d of sortedDays) {
      if (d === today) continue; // skip today for streak (partial day)
      const rec = records[d];
      const allDone = PRAYER_LIST.every((p) => rec?.prayers[p]);
      if (allDone) s++;
      else break;
    }
    return s;
  })();

  const todayRec = records[today] ?? { date: today, prayers: {} };
  const todayDone = PRAYER_LIST.filter((p) => todayRec.prayers[p]).length;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Streak Banner */}
        <View style={[styles.streakBanner, { backgroundColor: Colors.primary }]}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
          <Text style={styles.streakSub}>Keep up the consistency!</Text>
        </View>

        {/* Today Progress */}
        <View style={[styles.todayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.todayHeader}>
            <Text style={[styles.todayTitle, { color: theme.text }]}>Today's Prayers</Text>
            <Text style={[styles.todayCount, { color: Colors.primary }]}>{todayDone}/5</Text>
          </View>
          <View style={styles.todayPrayers}>
            {PRAYER_LIST.map((prayer) => {
              const done = !!todayRec.prayers[prayer];
              return (
                <TouchableOpacity
                  key={prayer}
                  style={[
                    styles.prayerPill,
                    {
                      backgroundColor: done ? Colors.primary : theme.surface,
                      borderColor: done ? Colors.primary : theme.border,
                    },
                  ]}
                  onPress={() => togglePrayer(today, prayer)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.prayerPillText, { color: done ? '#fff' : theme.textSecondary }]}>
                    {prayer}
                  </Text>
                  {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 7-Day Grid */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Last 7 Days</Text>
        <View style={[styles.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Day headers */}
          <View style={styles.gridRow}>
            <View style={styles.gridLabel} />
            {last7.map((d) => (
              <View key={d} style={styles.gridCell}>
                <Text style={[styles.dayLabel, { color: d === today ? Colors.primary : theme.textSecondary }]}>
                  {dayLabel(d)}
                </Text>
                <Text style={[styles.dayNum, { color: d === today ? Colors.primary : theme.textMuted }]}>
                  {new Date(d).getDate()}
                </Text>
              </View>
            ))}
          </View>

          {/* Prayer rows */}
          {PRAYER_LIST.map((prayer) => (
            <View key={prayer} style={[styles.gridRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={styles.gridLabel}>
                <Text style={[styles.prayerLabel, { color: theme.textSecondary }]}>{prayer.slice(0, 3)}</Text>
              </View>
              {last7.map((d) => {
                const done = !!records[d]?.prayers[prayer];
                const isToday = d === today;
                return (
                  <TouchableOpacity
                    key={d}
                    style={styles.gridCell}
                    onPress={() => togglePrayer(d, prayer)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: done ? Colors.primary : 'transparent',
                          borderColor: done ? Colors.primary : theme.border,
                          borderWidth: isToday ? 2 : 1,
                        },
                      ]}
                    >
                      {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[styles.tip, { color: theme.textMuted }]}>
          Tip: Tap any cell to mark a prayer as complete or missed. Stay consistent for a longer streak!
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  streakBanner: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  streakNumber: { color: '#fff', fontSize: 56, fontWeight: '900', lineHeight: 60 },
  streakLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  streakSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  todayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  todayTitle: { fontSize: 16, fontWeight: '700' },
  todayCount: { fontSize: 16, fontWeight: '800' },
  todayPrayers: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  prayerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  prayerPillText: { fontSize: 13, fontWeight: '600' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  gridCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridLabel: { width: 40, paddingVertical: 10, paddingLeft: 12 },
  gridCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  dayLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayNum: { fontSize: 11, fontWeight: '600' },
  prayerLabel: { fontSize: 10, fontWeight: '700' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tip: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
});
