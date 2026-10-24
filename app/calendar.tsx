import React, { useState, useEffect, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { getHijriParts } from '../src/utils/formatPrayerTime';
import { GlyphIcon } from '../src/components/GlyphIcon';

// ─── Islamic events ───────────────────────────────────────────────────────────

// `icon` is a key for GlyphIcon (rendered as a line icon — never as emoji).
// Event names + the Hijri month names in the eventDate display are Islamic
// calendar content, but they should follow the UI language — each entry carries
// an i18n key (calendar.islamicEvents.*) translated at render time.
const ISLAMIC_EVENTS: { hijriMonth: number; hijriDay: number; key: string; icon: string }[] = [
  { hijriMonth: 1, hijriDay: 1, key: 'islamicNewYear', icon: '📅' },
  { hijriMonth: 1, hijriDay: 10, key: 'ashura', icon: '🌙' },
  { hijriMonth: 3, hijriDay: 12, key: 'mawlid', icon: '🌟' },
  { hijriMonth: 7, hijriDay: 27, key: 'israMiraj', icon: '🕌' },
  { hijriMonth: 8, hijriDay: 15, key: 'baraat', icon: '🙏' },
  { hijriMonth: 9, hijriDay: 1, key: 'ramadanBegins', icon: '🌙' },
  { hijriMonth: 9, hijriDay: 27, key: 'laylatAlQadr', icon: '💫' },
  { hijriMonth: 10, hijriDay: 1, key: 'eidAlFitr', icon: '🎉' },
  { hijriMonth: 12, hijriDay: 8, key: 'hajjBegins', icon: '🕋' },
  { hijriMonth: 12, hijriDay: 9, key: 'arafah', icon: '⛰️' },
  { hijriMonth: 12, hijriDay: 10, key: 'eidAlAdha', icon: '🎊' },
];

type IslamicEvent = (typeof ISLAMIC_EVENTS)[number];

/**
 * Next occurrence (today or later) of every event on the Umm al-Qura calendar,
 * soonest first. One Hijri year is ~354 days, so scanning 385 days always
 * reaches each event once. A day-30 event that a 29-day month skips would be
 * left out rather than shown with a wrong date (none of ours fall on day 30).
 */
function upcomingEvents(from: Date): { event: IslamicEvent; date: Date; days: number }[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const found = new Map<string, { event: IslamicEvent; date: Date; days: number }>();
  for (let i = 0; i < 385 && found.size < ISLAMIC_EVENTS.length; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const h = getHijriParts(d);
    for (const event of ISLAMIC_EVENTS) {
      if (!found.has(event.key) && event.hijriMonth === h.month && event.hijriDay === h.day) {
        found.set(event.key, { event, date: d, days: i });
      }
    }
  }
  return Array.from(found.values()).sort((a, b) => a.days - b.days);
}

// Stable keys for the weekday and Gregorian month labels (UI strings).
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

export default function CalendarScreen() {
  useEffect(() => { trackScreen('Calendar'); }, []);
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
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

  const todayHijri = getHijriParts(today);
  const todayKey = today.toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute once per calendar day, not per render
  const upcoming = useMemo(() => upcomingEvents(new Date()), [todayKey]);
  const eventDateColor = isDark ? Colors.accentLight : Colors.primary;
  const formatGregorian = (d: Date) =>
    d.toLocaleDateString(isUrdu ? 'ur-PK' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const countdownLabel = (days: number) =>
    days === 0
      ? t('calendar.events.today')
      : days === 1
        ? t('calendar.events.tomorrow')
        : t('calendar.events.inDays', { count: days });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Translate weekday labels at render time using stable keys
  const dayLabels = DAY_KEYS.map((key) => t(`calendar.weekdays.${key}`));
  // Translate Gregorian month label at render time using stable key
  const monthLabel = t(`calendar.months.${MONTH_KEYS[month]}`);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: Colors.primary }]}>
          <Text style={styles.headerTitle}>{t('calendar.header.title')}</Text>
          <Text style={styles.hijriToday}>
            {t('calendar.header.todayHijri', {
              day: todayHijri.day,
              monthName:
                todayHijri.month >= 1 && todayHijri.month <= 12
                  ? t(`calendar.hijriMonths.${todayHijri.month}`)
                  : '—',
              year: todayHijri.year,
            })}
          </Text>
        </View>

        {/* Month nav */}
        <View style={[styles.monthNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={prevMonth} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {monthLabel} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={10}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAY_KEYS.map((key, idx) => (
            <Text
              key={key}
              style={[
                styles.dayHeader,
                { color: key === 'fri' ? Colors.primary : theme.textSecondary },
              ]}
            >
              {dayLabels[idx]}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;
            const cellDate = new Date(year, month, day);
            const hijri = getHijriParts(cellDate);
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('calendar.events.sectionTitle')}
        </Text>
        <View style={styles.eventsList}>
          {upcoming.map(({ event, date, days }) => (
            <View
              key={event.key}
              style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.eventIcon, { backgroundColor: isDark ? Colors.dark.surface : Colors.primary + '12' }]}>
                <GlyphIcon glyph={event.icon} size={20} color={eventDateColor} />
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventName, { color: theme.text }]}>
                  {t(`calendar.islamicEvents.${event.key}`)}
                </Text>
                <Text style={[styles.eventDate, { color: eventDateColor }]}>
                  {event.hijriDay} {t(`calendar.hijriMonths.${event.hijriMonth}`)} · {formatGregorian(date)}
                </Text>
              </View>
              <View
                style={[
                  styles.countdownPill,
                  { backgroundColor: days <= 1 ? Colors.primary : isDark ? Colors.dark.surface : Colors.light.surface },
                ]}
              >
                <Text
                  style={[
                    styles.countdownText,
                    { color: days <= 1 ? '#fff' : theme.textSecondary },
                  ]}
                >
                  {countdownLabel(days)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={[styles.eventsNote, { color: theme.textMuted }]}>
          {t('calendar.events.note')}
        </Text>

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
  eventIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 15, fontWeight: '600' },
  eventDate: { fontSize: 13, marginTop: 2 },
  countdownPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countdownText: { fontSize: 12, fontWeight: '600' },
  eventsNote: { fontSize: 12, lineHeight: 18, paddingHorizontal: 16, paddingTop: 10 },
});
