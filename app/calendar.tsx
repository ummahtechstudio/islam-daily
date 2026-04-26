import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';

// ─── Hijri conversion (Umm al-Qura approximation) ────────────────────────────

function toHijri(date: Date): { day: number; month: number; monthName: string; year: number } {
  const HIJRI_MONTHS = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
  ];

  // Julian Day Number
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const JD =
    Math.floor((14 - M) / 12) * (-1) +
    Math.floor((153 * (M + 12 * Math.floor((14 - M) / 12) - 3) + 2) / 5) +
    D +
    365 * (Y + 4800 - Math.floor((14 - M) / 12)) +
    Math.floor((Y + 4800 - Math.floor((14 - M) / 12)) / 4) -
    Math.floor((Y + 4800 - Math.floor((14 - M) / 12)) / 100) +
    Math.floor((Y + 4800 - Math.floor((14 - M) / 12)) / 400) -
    32045;

  const l = JD - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { day, month, monthName: HIJRI_MONTHS[month - 1] ?? '', year };
}

// ─── Islamic events ───────────────────────────────────────────────────────────

const ISLAMIC_EVENTS: { hijriMonth: number; hijriDay: number; name: string; icon: string }[] = [
  { hijriMonth: 1, hijriDay: 1, name: 'Islamic New Year', icon: '🎊' },
  { hijriMonth: 1, hijriDay: 10, name: 'Day of Ashura', icon: '🌙' },
  { hijriMonth: 3, hijriDay: 12, name: "Mawlid an-Nabi (Prophet's Birthday)", icon: '🌟' },
  { hijriMonth: 7, hijriDay: 27, name: "Isra and Mi'raj", icon: '✨' },
  { hijriMonth: 8, hijriDay: 15, name: "Laylat al-Bara'at (Night of Forgiveness)", icon: '🙏' },
  { hijriMonth: 9, hijriDay: 1, name: 'Ramadan Begins', icon: '🌙' },
  { hijriMonth: 9, hijriDay: 27, name: "Laylat al-Qadr (Night of Power)", icon: '💫' },
  { hijriMonth: 10, hijriDay: 1, name: 'Eid al-Fitr', icon: '🎉' },
  { hijriMonth: 12, hijriDay: 8, name: 'Hajj Begins', icon: '🕋' },
  { hijriMonth: 12, hijriDay: 9, name: 'Day of Arafah', icon: '⛰️' },
  { hijriMonth: 12, hijriDay: 10, name: 'Eid al-Adha', icon: '🎊' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  useEffect(() => { trackScreen('Calendar'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayHijri = toHijri(today);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: Colors.primary }]}>
          <Text style={styles.headerTitle}>Islamic Calendar</Text>
          <Text style={styles.hijriToday}>
            Today: {todayHijri.day} {todayHijri.monthName} {todayHijri.year} AH
          </Text>
        </View>

        {/* Month nav */}
        <View style={[styles.monthNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={prevMonth} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={10}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((d) => (
            <Text
              key={d}
              style={[
                styles.dayHeader,
                { color: d === 'Fri' ? Colors.primary : theme.textSecondary },
              ]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;
            const cellDate = new Date(year, month, day);
            const hijri = toHijri(cellDate);
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            const isFriday = cellDate.getDay() === 5;
            const hasEvent = ISLAMIC_EVENTS.some(
              (e) => e.hijriMonth === hijri.month && e.hijriDay === hijri.day
            );

            return (
              <View
                key={day}
                style={[
                  styles.cell,
                  isToday && { backgroundColor: Colors.primary, borderRadius: 10 },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: isToday ? '#fff' : isFriday ? Colors.primary : theme.text },
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.hijriNum,
                    { color: isToday ? 'rgba(255,255,255,0.75)' : theme.textMuted },
                  ]}
                >
                  {hijri.day}
                </Text>
                {hasEvent && (
                  <View style={[styles.eventDot, { backgroundColor: isToday ? '#fff' : Colors.accent }]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Upcoming events */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Islamic Events</Text>
        <View style={styles.eventsList}>
          {ISLAMIC_EVENTS.map((event, idx) => (
            <View
              key={idx}
              style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={styles.eventIcon}>{event.icon}</Text>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventName, { color: theme.text }]}>{event.name}</Text>
                <Text style={[styles.eventDate, { color: Colors.primary }]}>
                  {event.hijriDay} {
                    ['Muharram','Safar',"Rabi' I","Rabi' II","Jumada I","Jumada II",'Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhu al-Qi'dah",'Dhu al-Hijjah'][event.hijriMonth - 1]
                  }
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: 16, paddingTop: 14, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  hijriToday: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },

  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  monthLabel: { fontSize: 18, fontWeight: '700' },

  dayHeaders: { flexDirection: 'row', paddingHorizontal: 4, marginTop: 8 },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 8,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  cell: {
    width: '14.28%',
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 1,
  },
  dayNum: { fontSize: 14, fontWeight: '600' },
  hijriNum: { fontSize: 10 },
  eventDot: { width: 5, height: 5, borderRadius: 2.5 },

  sectionTitle: { fontSize: 18, fontWeight: '700', padding: 16, paddingBottom: 8 },
  eventsList: { paddingHorizontal: 16, gap: 8 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  eventIcon: { fontSize: 28 },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 15, fontWeight: '600' },
  eventDate: { fontSize: 13, marginTop: 2 },
});
