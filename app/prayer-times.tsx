import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { useResolvedLocation } from '../src/hooks/useResolvedLocation';
import { computePrayerTimes } from '../src/services/prayerTimesService';
import {
  formatPrayerTime,
  formatCountdown,
  formatHijriDate,
} from '../src/utils/formatPrayerTime';
import { trackScreen } from '../src/services/analytics';
import type { PrayerName } from '../src/types/prayerTimes';

const GOLD = '#EF9F27';
const CREAM = '#FBF6E4';
const GREEN = '#0F6E56';

const PRAYER_LABELS: Record<PrayerName, { en: string; ar: string }> = {
  fajr:    { en: 'Fajr',    ar: 'الفجر' },
  sunrise: { en: 'Sunrise', ar: 'الشروق' },
  dhuhr:   { en: 'Dhuhr',   ar: 'الظهر' },
  asr:     { en: 'Asr',     ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha:    { en: 'Isha',    ar: 'العشاء' },
};

const JUMUAH_LABEL = { en: "Jumu'ah", ar: 'الجمعة' };

const METHOD_LABELS: Record<string, string> = {
  Karachi: 'Karachi',
  Dubai: 'Dubai',
  UmmAlQura: 'Umm al-Qura',
  Egyptian: 'Egyptian',
  Turkey: 'Turkey',
  Singapore: 'Singapore',
  MuslimWorldLeague: 'Muslim World League',
  NorthAmerica: 'North America',
  MoonsightingCommittee: 'Moonsighting',
  Tehran: 'Tehran',
};

type PrayerTimesScreenProps = {
  /** When true, hide the back chevron — used when this is rendered as a tab. */
  asTab?: boolean;
};

export default function PrayerTimesScreen({ asTab = false }: PrayerTimesScreenProps) {
  useEffect(() => {
    trackScreen('PrayerTimes');
  }, []);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark =
    settingsScheme === 'dark' || (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const { settings, source, loading, reload } = useResolvedLocation();

  // Refresh settings on focus — picks up changes made in city-picker / settings.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  const computed = useMemo(
    () => computePrayerTimes(settings, new Date(tick)),
    [settings, tick]
  );

  const hijri = useMemo(() => formatHijriDate(new Date(tick)), [tick]);
  const gregorian = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(tick)),
    [tick]
  );

  const [sunnahOpen, setSunnahOpen] = useState(false);

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={GREEN} style={{ marginTop: 48 }} />
      </View>
    );
  }

  const nextEntry = computed.prayers.find((p) => p.name === computed.nextPrayer);
  const nextLabel = nextEntry
    ? nextEntry.isFriday && nextEntry.name === 'dhuhr'
      ? JUMUAH_LABEL.en
      : PRAYER_LABELS[nextEntry.name].en
    : null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={asTab ? ['top', 'bottom'] : ['bottom']}
    >
      {/* Top toolbar: back chevron (when stacked) + title + gear */}
      <View style={styles.toolbar}>
        {asTab ? (
          <View style={styles.toolbarSpacer} />
        ) : (
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.toolbarBtn}>
            <Ionicons name="chevron-back" size={24} color={GREEN} />
          </TouchableOpacity>
        )}
        <Text style={[styles.toolbarTitle, { color: theme.text }]}>Prayer Times</Text>
        <TouchableOpacity
          onPress={() => router.push('/prayer-times-settings' as any)}
          hitSlop={12}
          style={styles.toolbarBtn}
        >
          <Ionicons name="settings-outline" size={22} color={GREEN} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={[styles.headerCard, { borderColor: GREEN }]}>
          <View style={styles.headerTop}>
            <Ionicons name="location" size={16} color={GREEN} />
            <Text style={styles.cityText}>
              {settings.location.city}
              {settings.location.country && settings.location.country !== 'Unknown'
                ? `, ${settings.location.country}`
                : ''}
            </Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: GREEN }]}>
              <Text style={styles.badgeText}>
                {METHOD_LABELS[settings.method] ?? settings.method}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: GOLD }]}>
              <Text style={styles.badgeText}>
                {settings.madhab === 'hanafi' ? 'Hanafi' : 'Shafi'}
              </Text>
            </View>
          </View>
          <Text style={styles.gregorianText}>{gregorian}</Text>
          {hijri ? <Text style={styles.hijriText}>{hijri}</Text> : null}
        </View>

        {/* Fallback notice */}
        {source === 'fallback' && (
          <TouchableOpacity
            style={styles.fallbackNotice}
            onPress={() => router.push('/city-picker' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle" size={16} color={GREEN} />
            <Text style={styles.fallbackText}>
              Showing prayer times for Karachi. Tap to change.
            </Text>
            <Ionicons name="chevron-forward" size={16} color={GREEN} />
          </TouchableOpacity>
        )}

        {/* Next prayer card */}
        {nextEntry && computed.nextPrayerTime && nextLabel && (
          <View style={[styles.nextCard, { borderColor: GREEN, backgroundColor: GREEN }]}>
            <Text style={styles.nextLabel}>NEXT PRAYER</Text>
            <Text style={styles.nextName}>{nextLabel}</Text>
            <Text style={styles.nextTime}>{formatPrayerTime(computed.nextPrayerTime)}</Text>
            <Text style={styles.nextCountdown}>
              {formatCountdown(computed.nextPrayerTime, new Date(tick))}
            </Text>
          </View>
        )}

        {/* Prayer list */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Prayers</Text>
        <View style={styles.prayerList}>
          {computed.prayers.map((p) => {
            const isCurrent = p.name === computed.currentPrayer;
            const isPast =
              !isCurrent &&
              computed.currentPrayer !== null &&
              indexOfPrayer(p.name) < indexOfPrayer(computed.currentPrayer);
            const labels =
              p.isFriday && p.name === 'dhuhr' ? JUMUAH_LABEL : PRAYER_LABELS[p.name];

            return (
              <View
                key={p.name}
                style={[
                  styles.prayerRow,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  isCurrent && styles.prayerRowCurrent,
                ]}
              >
                <View style={styles.prayerNameCol}>
                  <Text
                    style={[
                      styles.prayerNameEn,
                      {
                        color: isCurrent
                          ? GREEN
                          : isPast
                            ? theme.textMuted
                            : theme.text,
                      },
                    ]}
                  >
                    {labels.en}
                  </Text>
                  <Text
                    style={[
                      styles.prayerNameAr,
                      { color: isCurrent ? GREEN : theme.textSecondary },
                    ]}
                  >
                    {labels.ar}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.prayerTime,
                    {
                      color: isCurrent
                        ? GREEN
                        : isPast
                          ? theme.textMuted
                          : theme.text,
                    },
                  ]}
                >
                  {formatPrayerTime(p.time)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Sunnah Times collapsible */}
        <TouchableOpacity
          style={[styles.sunnahHeader, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={() => setSunnahOpen((o) => !o)}
          activeOpacity={0.7}
        >
          <View style={styles.sunnahHeaderLeft}>
            <Ionicons name="moon" size={16} color={GOLD} />
            <Text style={[styles.sunnahHeaderText, { color: theme.text }]}>Sunnah Times</Text>
          </View>
          <Ionicons
            name={sunnahOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.textMuted}
          />
        </TouchableOpacity>
        {sunnahOpen && (
          <View style={[styles.sunnahBody, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.sunnahRow}>
              <Text style={[styles.sunnahLabel, { color: theme.textSecondary }]}>
                Last Third of Night
              </Text>
              <Text style={[styles.sunnahTime, { color: theme.text }]}>
                {formatPrayerTime(computed.sunnah.lastThirdOfTheNight)}
              </Text>
            </View>
            <View style={[styles.sunnahRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <Text style={[styles.sunnahLabel, { color: theme.textSecondary }]}>
                Middle of Night
              </Text>
              <Text style={[styles.sunnahTime, { color: theme.text }]}>
                {formatPrayerTime(computed.sunnah.middleOfTheNight)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const PRAYER_ORDER: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
function indexOfPrayer(name: PrayerName): number {
  return PRAYER_ORDER.indexOf(name);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingTop: 8 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  toolbarBtn: { padding: 6 },
  toolbarSpacer: { width: 36 },
  toolbarTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },


  headerCard: {
    backgroundColor: CREAM,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cityText: { fontSize: 16, fontWeight: '700', color: GREEN },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  gregorianText: { fontSize: 13, color: '#3F3F3F', marginTop: 2 },
  hijriText: { fontSize: 13, color: GREEN, fontWeight: '600' },

  fallbackNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15,110,86,0.08)',
    marginBottom: 12,
  },
  fallbackText: { flex: 1, fontSize: 12, color: GREEN },

  nextCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.7)',
  },
  nextName: { fontSize: 26, fontWeight: '800', color: '#fff' },
  nextTime: { fontSize: 22, fontWeight: '700', color: GOLD, marginTop: 2 },
  nextCountdown: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  prayerList: { gap: 6, marginBottom: 16 },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  prayerRowCurrent: {
    borderLeftWidth: 4,
    borderLeftColor: GREEN,
    backgroundColor: 'rgba(15,110,86,0.08)',
  },
  prayerNameCol: { flexDirection: 'column' },
  prayerNameEn: { fontSize: 15, fontWeight: '700' },
  prayerNameAr: { fontSize: 13, fontFamily: 'Amiri_400Regular', marginTop: 1 },
  prayerTime: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  sunnahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sunnahHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sunnahHeaderText: { fontSize: 14, fontWeight: '700' },
  sunnahBody: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  sunnahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  sunnahLabel: { fontSize: 13 },
  sunnahTime: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
