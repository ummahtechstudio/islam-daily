import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { useResolvedLocation } from '../src/hooks/useResolvedLocation';
import { computePrayerTimes } from '../src/services/prayerTimesService';
import { formatPrayerTime, getHijriParts } from '../src/utils/formatPrayerTime';
import type { PrayerTimesSettings } from '../src/types/prayerTimes';

interface DayEntry {
  day: number;
  date: string;
  sehri: string;
  iftar: string;
  hijriDay: string;
}

// Build the full Sehri/Iftar timetable for a single Ramadan, computed entirely
// locally via the adhan engine (offline, respecting the user's method/madhab/
// location). Shows the CURRENT Ramadan while it is ongoing, otherwise the
// UPCOMING one. All Hijri conversion uses the shared Umm al-Qura getHijriParts.
function buildRamadanTimetable(settings: PrayerTimesSettings): {
  year: number;
  isCurrent: boolean;
  days: DayEntry[];
} {
  const now = new Date();
  now.setHours(12, 0, 0, 0); // midday avoids DST/midnight edge cases
  const todayH = getHijriParts(now);

  let targetYear: number;
  let isCurrent = false;
  if (todayH.month === 9) {
    targetYear = todayH.year;
    isCurrent = true;
  } else if (todayH.month < 9) {
    targetYear = todayH.year; // Ramadan still ahead this Hijri year
  } else {
    targetYear = todayH.year + 1; // Ramadan already passed → next year
  }

  // Locate any day inside the target Ramadan. Scan starts 35 days back so an
  // ongoing Ramadan (whose day 1 is in the past) is also caught. getHijriParts
  // is a cheap Intl conversion — no prayer maths in this loop.
  const scanStart = new Date(now);
  scanStart.setDate(scanStart.getDate() - 35);
  let firstDay: Date | null = null;
  for (let i = 0; i < 420; i++) {
    const d = new Date(scanStart);
    d.setDate(scanStart.getDate() + i);
    const h = getHijriParts(d);
    if (h.year === targetYear && h.month === 9) {
      firstDay = d;
      break;
    }
  }
  if (!firstDay) return { year: targetYear, isCurrent, days: [] };

  // Walk back to 1 Ramadan in case the scan landed mid-month.
  let cursor = firstDay;
  for (;;) {
    const prev = new Date(cursor);
    prev.setDate(cursor.getDate() - 1);
    const ph = getHijriParts(prev);
    if (ph.year === targetYear && ph.month === 9) cursor = prev;
    else break;
  }

  // Collect each day of Ramadan, computing Fajr (Sehri) + Maghrib (Iftar) with
  // the SAME engine + settings as the Prayer Times screen.
  const days: DayEntry[] = [];
  const dcur = new Date(cursor);
  for (let i = 0; i < 31; i++) {
    const h = getHijriParts(dcur);
    if (h.year !== targetYear || h.month !== 9) break;
    const computed = computePrayerTimes(settings, dcur);
    const fajr = computed.prayers.find((p) => p.name === 'fajr')?.time ?? null;
    const maghrib = computed.prayers.find((p) => p.name === 'maghrib')?.time ?? null;
    const dd = String(dcur.getDate()).padStart(2, '0');
    const mm = String(dcur.getMonth() + 1).padStart(2, '0');
    days.push({
      day: h.day,
      date: `${dd}-${mm}-${dcur.getFullYear()}`,
      sehri: fajr ? formatPrayerTime(fajr) : '',
      iftar: maghrib ? formatPrayerTime(maghrib) : '',
      hijriDay: String(h.day),
    });
    dcur.setDate(dcur.getDate() + 1);
  }
  return { year: targetYear, isCurrent, days };
}

export default function RamadanScreen() {
  useEffect(() => { trackScreen('Ramadan'); }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark =
    settingsScheme === 'dark' ||
    (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const { settings: prayerSettings } = useResolvedLocation();

  const todayHijri = useMemo(() => getHijriParts(new Date()), []);
  const isRamadan = todayHijri.month === 9;
  const monthName =
    todayHijri.month >= 1 && todayHijri.month <= 12
      ? t(`calendar.hijriMonths.${todayHijri.month}`)
      : '';

  // Whole Ramadan timetable, computed locally (offline) from the user's real
  // method/madhab/location — identical engine to the Prayer Times screen.
  const { year, isCurrent, days } = useMemo(
    () => buildRamadanTimetable(prayerSettings),
    [prayerSettings],
  );

  // Today's Sehri/Iftar are simply today's row from that same timetable.
  const todayEntry = isCurrent ? days.find((d) => d.day === todayHijri.day) : undefined;
  const todaySehri = todayEntry?.sehri ?? null;
  const todayIftar = todayEntry?.iftar ?? null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={[styles.header]}>
          {/* Arabic "رَمَضَان" is content — not translated */}
          <Text style={styles.headerArabic}>رَمَضَان</Text>
          <Text style={styles.headerTitle}>{t('ramadan.header.title')}</Text>
          <Text style={styles.headerSub}>
            {t('ramadan.header.hijriDay', { day: todayHijri.day, month: monthName })}
          </Text>
        </View>

        {!isRamadan && (
          <View style={[styles.noticeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="moon-outline" size={28} color={Colors.accent} />
            <Text style={[styles.noticeText, { color: theme.text }]}>
              {t('ramadan.notice.notStarted')}
            </Text>
          </View>
        )}

        {isRamadan && todaySehri && todayIftar && (
          <View style={[styles.timingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.timingBox}>
              <Text style={styles.timingIcon}>🌙</Text>
              <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>
                {t('ramadan.timings.sehriLabel')}
              </Text>
              <Text style={[styles.timingTime, { color: theme.text }]}>{todaySehri}</Text>
            </View>
            <View style={[styles.timingDivider, { backgroundColor: theme.border }]} />
            <View style={styles.timingBox}>
              <Text style={styles.timingIcon}>🌅</Text>
              <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>
                {t('ramadan.timings.iftarLabel')}
              </Text>
              <Text style={[styles.timingTime, { color: theme.text }]}>{todayIftar}</Text>
            </View>
          </View>
        )}

        {/* Full Month Timetable */}
        {days.length > 0 && (
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              {t('ramadan.timetable.sectionLabel')}{year ? `  ·  ${year} AH` : ''}
            </Text>
            <View style={[styles.tableHeader, { backgroundColor: Colors.primary }]}>
              <Text style={[styles.colDay, styles.tableHeaderText]}>{t('ramadan.timetable.colDay')}</Text>
              <Text style={[styles.colDate, styles.tableHeaderText]}>{t('ramadan.timetable.colDate')}</Text>
              <Text style={[styles.colTime, styles.tableHeaderText]}>{t('ramadan.timetable.colSehri')}</Text>
              <Text style={[styles.colTime, styles.tableHeaderText]}>{t('ramadan.timetable.colIftar')}</Text>
            </View>
            {days.map((entry, idx) => {
              const isToday = isCurrent && entry.day === todayHijri.day;
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
                  <Text style={[styles.colTime, { color: theme.text }]}>{entry.sehri}</Text>
                  <Text style={[styles.colTime, { color: Colors.primary }]}>{entry.iftar}</Text>
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
