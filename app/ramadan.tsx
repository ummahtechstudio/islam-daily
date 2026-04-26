import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { trackScreen } from '../src/services/analytics';

interface DayEntry {
  day: number;
  date: string;
  sehri: string;
  iftar: string;
  hijriDay: string;
}

const ALADHAN = 'https://api.aladhan.com/v1';

export default function RamadanScreen() {
  useEffect(() => { trackScreen('Ramadan'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [timetable, setTimetable] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRamadan, setIsRamadan] = useState(false);
  const [todaySehri, setTodaySehri] = useState<string | null>(null);
  const [todayIftar, setTodayIftar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentHijriDay, setCurrentHijriDay] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = 21.3891;
        let lon = 39.8579;
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }

        const today = new Date();
        const todayStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

        // Get today's timing to check Hijri month
        const todayRes = await fetch(
          `${ALADHAN}/timings/${todayStr}?latitude=${lat}&longitude=${lon}&method=${settings.calculationMethod}`
        );
        const todayJson = await todayRes.json();
        const hijriMonth: number = todayJson.data?.date?.hijri?.month?.number ?? 0;
        const hijriDay: string = todayJson.data?.date?.hijri?.day ?? '';
        setCurrentHijriDay(hijriDay);
        const ramadan = hijriMonth === 9;
        setIsRamadan(ramadan);

        if (ramadan) {
          setTodaySehri(todayJson.data?.timings?.Fajr ?? null);
          setTodayIftar(todayJson.data?.timings?.Maghrib ?? null);
        }

        // Fetch full Hijri month 9 calendar
        const year = todayJson.data?.date?.hijri?.year ?? '1446';
        const calRes = await fetch(
          `${ALADHAN}/hijriCalendar/9/${year}?latitude=${lat}&longitude=${lon}&method=${settings.calculationMethod}`
        );
        const calJson = await calRes.json();
        if (calJson.code === 200) {
          const entries: DayEntry[] = (calJson.data ?? []).map((d: any) => ({
            day: parseInt(d.date?.hijri?.day ?? '0', 10),
            date: d.date?.gregorian?.date ?? '',
            sehri: d.timings?.Fajr ?? '',
            iftar: d.timings?.Maghrib ?? '',
            hijriDay: d.date?.hijri?.day ?? '',
          }));
          setTimetable(entries);
        }
      } catch {
        setError('Failed to load Ramadan data. Please check your connection.');
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Loading Ramadan timetable..." dark={isDark} />;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={[styles.header]}>
          <Text style={styles.headerArabic}>رَمَضَان</Text>
          <Text style={styles.headerTitle}>Ramadan Mubarak</Text>
          {currentHijriDay && (
            <Text style={styles.headerSub}>Hijri Day {currentHijriDay} · Month {isRamadan ? '9 (Ramadan)' : '—'}</Text>
          )}
        </View>

        {!isRamadan && (
          <View style={[styles.noticeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="moon-outline" size={28} color={Colors.accent} />
            <Text style={[styles.noticeText, { color: theme.text }]}>
              Ramadan has not started yet. This screen will show live countdowns and the timetable during Ramadan.
            </Text>
          </View>
        )}

        {isRamadan && todaySehri && todayIftar && (
          <View style={[styles.timingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.timingBox}>
              <Text style={styles.timingIcon}>🌙</Text>
              <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Sehri (Fajr)</Text>
              <Text style={[styles.timingTime, { color: theme.text }]}>{todaySehri.replace(' (PST)', '').trim()}</Text>
            </View>
            <View style={[styles.timingDivider, { backgroundColor: theme.border }]} />
            <View style={styles.timingBox}>
              <Text style={styles.timingIcon}>🌅</Text>
              <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Iftar (Maghrib)</Text>
              <Text style={[styles.timingTime, { color: theme.text }]}>{todayIftar.replace(' (PST)', '').trim()}</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={[styles.noticeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="warning-outline" size={24} color={Colors.warning} />
            <Text style={[styles.noticeText, { color: theme.text }]}>{error}</Text>
          </View>
        )}

        {/* Full Month Timetable */}
        {timetable.length > 0 && (
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Full Ramadan Timetable — 1446 AH
            </Text>
            <View style={[styles.tableHeader, { backgroundColor: Colors.primary }]}>
              <Text style={[styles.colDay, styles.tableHeaderText]}>Day</Text>
              <Text style={[styles.colDate, styles.tableHeaderText]}>Date</Text>
              <Text style={[styles.colTime, styles.tableHeaderText]}>Sehri</Text>
              <Text style={[styles.colTime, styles.tableHeaderText]}>Iftar</Text>
            </View>
            {timetable.map((entry, idx) => {
              const isToday = entry.hijriDay === currentHijriDay && isRamadan;
              return (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    { backgroundColor: isToday ? Colors.primary + '18' : idx % 2 === 0 ? theme.card : theme.surface, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.colDay, { color: isToday ? Colors.primary : theme.text, fontWeight: isToday ? '800' : '600' }]}>
                    {entry.hijriDay}
                  </Text>
                  <Text style={[styles.colDate, { color: theme.textSecondary }]}>{entry.date}</Text>
                  <Text style={[styles.colTime, { color: theme.text }]}>{entry.sehri.replace(/ \([^)]+\)/, '').trim()}</Text>
                  <Text style={[styles.colTime, { color: Colors.primary }]}>{entry.iftar.replace(/ \([^)]+\)/, '').trim()}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    padding: 24,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A1035',
  },
  headerArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 48,
    color: Colors.accent,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },

  noticeCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 22 },

  timingsCard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  timingBox: { flex: 1, padding: 20, alignItems: 'center', gap: 4 },
  timingIcon: { fontSize: 28 },
  timingLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  timingTime: { fontSize: 22, fontWeight: '800' },
  timingDivider: { width: 1 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  tableHeaderText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 2,
    borderWidth: 1,
  },
  colDay: { width: 40, fontSize: 13 },
  colDate: { flex: 1, fontSize: 12 },
  colTime: { width: 72, fontSize: 13, textAlign: 'right' },
});
