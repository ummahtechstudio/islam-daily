import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, palette } from '../src/constants/colors';
import { typography } from '../src/constants/typography';
import { spacing, radius } from '../src/constants/spacing';
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
import { ManuscriptCard } from '../src/components/ManuscriptCard';
import { IslamicPattern } from '../src/components/IslamicPattern';

const PRAYER_AR: Record<PrayerName, string> = {
  fajr:    'الفجر',
  sunrise: 'الشروق',
  dhuhr:   'الظهر',
  asr:     'العصر',
  maghrib: 'المغرب',
  isha:    'العشاء',
};

const JUMUAH_AR = 'الجمعة';

type PrayerTimesScreenProps = {
  asTab?: boolean;
};

export default function PrayerTimesScreen({ asTab = false }: PrayerTimesScreenProps) {
  const { t } = useTranslation();

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

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 60_000);
    // Force a recompute when the user returns to the app so the countdown
    // isn't stale by up to a minute (interval doesn't tick while paused).
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick(Date.now());
    });
    return () => {
      clearInterval(i);
      sub.remove();
    };
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
        <ActivityIndicator size="large" color={palette.green} style={{ marginTop: 48 }} />
      </View>
    );
  }

  const nextEntry = computed.prayers.find((p) => p.name === computed.nextPrayer);
  const nextLabel = nextEntry
    ? nextEntry.isFriday && nextEntry.name === 'dhuhr'
      ? t('prayers.names.jumuah')
      : t(`prayers.names.${nextEntry.name}`)
    : null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={asTab ? ['top', 'bottom'] : ['bottom']}
    >
      <View style={styles.toolbar}>
        {asTab ? (
          <View style={styles.toolbarSpacer} />
        ) : (
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.toolbarBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.green} />
          </TouchableOpacity>
        )}
        <Text style={[styles.toolbarTitle, { color: theme.text }]}>{t('prayer.header.title')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/prayer-times-settings' as any)}
          hitSlop={12}
          style={styles.toolbarBtn}
        >
          <Ionicons name="settings-outline" size={22} color={palette.green} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card — manuscript */}
        <View style={{ marginBottom: spacing.md }}>
          <ManuscriptCard variant="bordered">
            <View style={headerStyles.patternWrap} pointerEvents="none">
              <IslamicPattern size={80} color={palette.green} opacity={0.06} />
            </View>
            <View style={headerStyles.cityRow}>
              <Ionicons name="location" size={16} color={palette.green} />
              <Text style={headerStyles.cityText}>
                {settings.location.city}
                {settings.location.country && settings.location.country !== 'Unknown'
                  ? `, ${settings.location.country}`
                  : ''}
              </Text>
            </View>
            <View style={headerStyles.badgeRow}>
              <View style={[headerStyles.badge, { backgroundColor: palette.green }]}>
                <Text style={headerStyles.badgeText}>
                  {t(`prayer.methods.${settings.method}`) ?? settings.method}
                </Text>
              </View>
              <View style={[headerStyles.badge, { backgroundColor: palette.gold }]}>
                <Text style={headerStyles.badgeText}>
                  {settings.madhab === 'hanafi' ? t('prayer.madhab.hanafi') : t('prayer.madhab.shafi')}
                </Text>
              </View>
            </View>
            <Text style={headerStyles.gregorianText}>{gregorian}</Text>
            {hijri ? <Text style={headerStyles.hijriText}>{hijri}</Text> : null}
          </ManuscriptCard>
        </View>

        {source === 'fallback' && (
          <TouchableOpacity
            style={styles.fallbackNotice}
            onPress={() => router.push('/city-picker' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle" size={16} color={palette.green} />
            <Text style={styles.fallbackText}>
              {t('prayer.fallback.notice')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={palette.green} />
          </TouchableOpacity>
        )}

        {/* Next prayer — manuscript treatment */}
        {nextEntry && computed.nextPrayerTime && nextLabel && (
          <TouchableOpacity activeOpacity={1} style={{ marginBottom: spacing.lg }}>
            <ManuscriptCard variant="bordered">
              <View style={nextStyles.patternWrap} pointerEvents="none">
                <IslamicPattern size={100} color={palette.gold} opacity={0.07} />
              </View>
              <Text style={nextStyles.label}>{t('prayer.next.label')}</Text>
              <View style={nextStyles.row}>
                <Text style={nextStyles.name}>{nextLabel}</Text>
                <Text style={nextStyles.time}>{formatPrayerTime(computed.nextPrayerTime)}</Text>
              </View>
              <Text style={nextStyles.countdown}>
                {formatCountdown(computed.nextPrayerTime, new Date(tick))}
              </Text>
            </ManuscriptCard>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('prayer.todaysPrayers')}</Text>
        <View style={[styles.prayerList, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {computed.prayers.map((p, idx) => {
            const isCurrent = p.name === computed.currentPrayer;
            const isPast =
              !isCurrent &&
              computed.currentPrayer !== null &&
              indexOfPrayer(p.name) < indexOfPrayer(computed.currentPrayer);
            const prayerNameEn =
              p.isFriday && p.name === 'dhuhr'
                ? t('prayers.names.jumuah')
                : t(`prayers.names.${p.name}`);
            const prayerNameAr =
              p.isFriday && p.name === 'dhuhr'
                ? JUMUAH_AR
                : PRAYER_AR[p.name];

            return (
              <View
                key={p.name}
                style={[
                  styles.prayerRow,
                  idx < computed.prayers.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  isCurrent && styles.prayerRowCurrent,
                ]}
              >
                <View style={styles.prayerNameCol}>
                  <Text
                    style={[
                      styles.prayerNameEn,
                      {
                        color: isCurrent
                          ? palette.green
                          : isPast
                            ? theme.textMuted
                            : theme.text,
                      },
                    ]}
                  >
                    {prayerNameEn}
                  </Text>
                  <Text
                    style={[
                      styles.prayerNameAr,
                      { color: isCurrent ? palette.green : theme.textSecondary },
                    ]}
                  >
                    {prayerNameAr}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.prayerTime,
                    {
                      color: isCurrent || (!isPast && p.name === computed.nextPrayer)
                        ? palette.gold
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

        <TouchableOpacity
          style={[styles.sunnahHeader, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={() => setSunnahOpen((o) => !o)}
          activeOpacity={0.7}
        >
          <View style={styles.sunnahHeaderLeft}>
            <Ionicons name="moon" size={16} color={palette.gold} />
            <Text style={[styles.sunnahHeaderText, { color: theme.text }]}>{t('prayer.sunnah.header')}</Text>
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
                {t('prayer.sunnah.lastThird')}
              </Text>
              <Text style={[styles.sunnahTime, { color: theme.text }]}>
                {formatPrayerTime(computed.sunnah.lastThirdOfTheNight)}
              </Text>
            </View>
            <View style={[styles.sunnahRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <Text style={[styles.sunnahLabel, { color: theme.textSecondary }]}>
                {t('prayer.sunnah.middleOfNight')}
              </Text>
              <Text style={[styles.sunnahTime, { color: theme.text }]}>
                {formatPrayerTime(computed.sunnah.middleOfTheNight)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const PRAYER_ORDER: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
function indexOfPrayer(name: PrayerName): number {
  return PRAYER_ORDER.indexOf(name);
}

const headerStyles = StyleSheet.create({
  patternWrap: {
    position: 'absolute',
    right: -8,
    top: -8,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  cityText: {
    ...typography.heading3,
    color: palette.textOnCream,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: palette.cream,
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  gregorianText: {
    ...typography.bodySmall,
    color: palette.textOnCreamSecondary,
    marginTop: spacing.sm,
  },
  hijriText: {
    ...typography.bodySmall,
    color: palette.green,
    fontWeight: '600',
    marginTop: 2,
  },
});

const nextStyles = StyleSheet.create({
  patternWrap: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  label: {
    ...typography.caption,
    color: palette.textOnCreamSecondary,
    fontWeight: '800',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  name: {
    ...typography.display,
    color: palette.textOnCream,
  },
  time: {
    ...typography.display,
    color: palette.gold,
  },
  countdown: {
    ...typography.bodySmall,
    color: palette.textOnCreamSecondary,
    marginTop: spacing.xs,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingTop: spacing.sm },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  toolbarBtn: { padding: spacing.xs + 2 },
  toolbarSpacer: { width: 36 },
  toolbarTitle: {
    flex: 1,
    ...typography.heading3,
    fontWeight: '800',
    textAlign: 'center',
  },

  fallbackNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    padding: spacing.sm + 2,
    borderRadius: radius.sm + 2,
    backgroundColor: 'rgba(15,110,86,0.08)',
    marginBottom: spacing.md,
  },
  fallbackText: {
    flex: 1,
    ...typography.bodySmall,
    color: palette.green,
    fontSize: 12,
  },

  sectionTitle: {
    ...typography.heading3,
    fontWeight: '800',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  prayerList: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  prayerRowCurrent: {
    borderLeftWidth: 4,
    borderLeftColor: palette.gold,
    backgroundColor: 'rgba(239,159,39,0.06)',
  },
  prayerNameCol: { flexDirection: 'column', gap: 2 },
  prayerNameEn: {
    ...typography.heading3,
    fontWeight: '600',
  },
  prayerNameAr: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  prayerTime: {
    ...typography.heading2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  sunnahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sunnahHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sunnahHeaderText: {
    ...typography.body,
    fontWeight: '700',
  },
  sunnahBody: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs + 2,
    overflow: 'hidden',
  },
  sunnahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md + 2,
  },
  sunnahLabel: { ...typography.bodySmall },
  sunnahTime: {
    ...typography.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
