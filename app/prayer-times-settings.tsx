import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { useResolvedLocation } from '../src/hooks/useResolvedLocation';
import {
  computePrayerTimes,
  autoDetectMethodAndMadhab,
} from '../src/services/prayerTimesService';
import {
  formatPrayerTime,
  getTimeFormatPref,
  setTimeFormatPref,
  type TimeFormatPref,
} from '../src/utils/formatPrayerTime';
import { prefs, PREFS_KEYS } from '../src/lib/storage';
import { trackScreen } from '../src/services/analytics';
import { scheduleNotificationsForNext7Days } from '../src/services/notificationsService';
import { NotificationsSettingsSection } from '../src/components/NotificationsSettingsSection';
import type {
  CalculationMethod,
  HighLatitudeRule,
  Madhab,
  PrayerTimesSettings,
} from '../src/types/prayerTimes';

const GREEN = '#0F6E56';
const GOLD = '#EF9F27';
const CREAM = '#FBF6E4';

const METHOD_OPTION_VALUES: CalculationMethod[] = [
  'Karachi',
  'Dubai',
  'UmmAlQura',
  'Egyptian',
  'Turkey',
  'Singapore',
  'MuslimWorldLeague',
  'NorthAmerica',
  'MoonsightingCommittee',
  'Tehran',
];

const HIGH_LAT_OPTION_VALUES: HighLatitudeRule[] = [
  'middleOfTheNight',
  'seventhOfTheNight',
  'twilightAngle',
];

function loadHighLatRule(): HighLatitudeRule {
  const raw = prefs.get(PREFS_KEYS.PRAYER_TIMES_HIGH_LATITUDE_RULE);
  if (raw === 'middleOfTheNight' || raw === 'seventhOfTheNight' || raw === 'twilightAngle') {
    return raw;
  }
  return 'middleOfTheNight';
}

function saveHighLatRule(rule: HighLatitudeRule) {
  prefs.set(PREFS_KEYS.PRAYER_TIMES_HIGH_LATITUDE_RULE, rule);
}

function lightHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

export default function PrayerTimesSettingsScreen() {
  const { t } = useTranslation();
  useEffect(() => { trackScreen('PrayerTimesSettings'); }, []);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark =
    settingsScheme === 'dark' || (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const { settings, source, setManualSettings, refreshFromGps, reload } = useResolvedLocation();

  const [format, setFormat] = useState<TimeFormatPref>(() => getTimeFormatPref());
  const [highLat, setHighLat] = useState<HighLatitudeRule>(() => loadHighLatRule());

  // Re-arm prayer notifications when location, method, madhab, or high-latitude
  // rule changes — those affect computed prayer times. Skip the very first run
  // so opening the screen doesn't trigger a redundant re-schedule (the startup
  // refresh in _layout already handled that).
  const initialScheduleSkipped = useRef(false);
  useEffect(() => {
    if (!initialScheduleSkipped.current) {
      initialScheduleSkipped.current = true;
      return;
    }
    scheduleNotificationsForNext7Days().catch((err) =>
      console.warn('[PrayerTimesSettings] re-schedule failed', err),
    );
  }, [
    settings.location.latitude,
    settings.location.longitude,
    settings.method,
    settings.madhab,
    settings.highLatitudeRule,
  ]);

  // Pick up settings changes if user navigates to city-picker and returns.
  useFocusEffect(
    useCallback(() => {
      reload();
      setFormat(getTimeFormatPref());
      setHighLat(loadHighLatRule());
    }, [reload]),
  );

  const updateSettings = useCallback(
    (patch: Partial<PrayerTimesSettings>) => {
      const next: PrayerTimesSettings = { ...settings, ...patch };
      setManualSettings(next);
    },
    [settings, setManualSettings],
  );

  const handleMethodChange = useCallback(
    (method: CalculationMethod) => {
      lightHaptic();
      updateSettings({ method });
    },
    [updateSettings],
  );

  const handleMadhabChange = useCallback(
    (madhab: Madhab) => {
      lightHaptic();
      updateSettings({ madhab });
    },
    [updateSettings],
  );

  const handleResetToAuto = useCallback(() => {
    lightHaptic();
    const { method, madhab } = autoDetectMethodAndMadhab(settings.location.countryCode);
    updateSettings({ method, madhab });
  }, [settings.location.countryCode, updateSettings]);

  const handleFormatChange = useCallback((next: TimeFormatPref) => {
    lightHaptic();
    setTimeFormatPref(next);
    setFormat(next);
  }, []);

  const handleHighLatChange = useCallback(
    (rule: HighLatitudeRule) => {
      lightHaptic();
      saveHighLatRule(rule);
      setHighLat(rule);
      updateSettings({ highLatitudeRule: rule });
    },
    [updateSettings],
  );

  // Live preview: today's prayer times using current settings (with overrides preview).
  const previewSettings: PrayerTimesSettings = useMemo(
    () => ({ ...settings, highLatitudeRule: highLat }),
    [settings, highLat],
  );
  const computed = useMemo(
    () => computePrayerTimes(previewSettings, new Date()),
    [previewSettings],
  );

  const previewHour12 = useMemo(() => {
    if (format === '12h') return true;
    if (format === '24h') return false;
    return undefined; // auto: let formatPrayerTime resolve
  }, [format]);

  const fmt = useCallback(
    (d: Date) => formatPrayerTime(d, previewHour12 === undefined ? undefined : { hour12: previewHour12 }),
    [previewHour12],
  );

  const todayAsr = computed.prayers.find((p) => p.name === 'asr')?.time;
  const todayFajr = computed.prayers.find((p) => p.name === 'fajr')?.time;

  const autoDetected = useMemo(
    () => autoDetectMethodAndMadhab(settings.location.countryCode),
    [settings.location.countryCode],
  );
  const isAutoMethod = settings.method === autoDetected.method;

  const showHighLat = Math.abs(settings.location.latitude) > 48;

  const sourceLabel =
    source === 'gps'
      ? t('prayerSettings.location.sources.gps')
      : source === 'manual'
        ? t('prayerSettings.location.sources.manual')
        : source === 'cached'
          ? t('prayerSettings.location.sources.cached')
          : t('prayerSettings.location.sources.default');

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.toolbarBtn}>
          <Ionicons name="chevron-back" size={24} color={GREEN} />
        </TouchableOpacity>
        <Text style={[styles.toolbarTitle, { color: theme.text }]}>{t('prayerSettings.header.title')}</Text>
        <View style={styles.toolbarBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Location */}
        <SectionHeader title={t('prayerSettings.location.sectionTitle')} subtitle={t('prayerSettings.location.sectionSubtitle')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.locRow}>
            <Ionicons name="location" size={18} color={GREEN} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.locCity, { color: theme.text }]}>
                {settings.location.city}
              </Text>
              <Text style={styles.locCountry}>
                {settings.location.country} · {sourceLabel}
              </Text>
            </View>
          </View>
          <View style={styles.locButtons}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => router.push('/city-picker' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="search" size={14} color="#fff" />
              <Text style={styles.btnPrimaryText}>{t('prayerSettings.location.changeCity')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={async () => { lightHaptic(); await refreshFromGps(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="locate" size={14} color={GREEN} />
              <Text style={styles.btnGhostText}>{t('prayerSettings.location.useGps')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calculation method */}
        <SectionHeader title={t('prayerSettings.method.sectionTitle')} subtitle={t('prayerSettings.method.sectionSubtitle')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {METHOD_OPTION_VALUES.map((value, idx) => {
            const selected = settings.method === value;
            const isLast = idx === METHOD_OPTION_VALUES.length - 1;
            const region = t(`prayerSettings.method.options.${value}.region`);
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.optRow,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
                onPress={() => handleMethodChange(value)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optLabel, { color: theme.text }]}>{t(`prayerSettings.method.options.${value}.label`)}</Text>
                  {region ? (
                    <Text style={styles.optRegion}>{region}</Text>
                  ) : null}
                </View>
                {selected ? (
                  <Ionicons name="checkmark" size={20} color={GOLD} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.helperRow}>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {t('prayerSettings.method.autoDetected')}
            <Text style={{ color: GREEN, fontWeight: '700' }}>{autoDetected.method}</Text>
          </Text>
          {!isAutoMethod && (
            <TouchableOpacity onPress={handleResetToAuto} hitSlop={6}>
              <Text style={styles.resetLink}>{t('prayerSettings.method.resetToAuto')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Madhab */}
        <SectionHeader title={t('prayerSettings.madhab.sectionTitle')} subtitle={t('prayerSettings.madhab.sectionSubtitle')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 6 }]}>
          {(['hanafi', 'shafi'] as Madhab[]).map((m) => {
            const selected = settings.madhab === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.madhabRow, selected && { backgroundColor: 'rgba(15,110,86,0.08)', borderRadius: 12 }]}
                onPress={() => handleMadhabChange(m)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.madhabLabel, { color: theme.text }]}>
                    {m === 'hanafi' ? t('prayerSettings.madhab.hanafi.label') : t('prayerSettings.madhab.shafi.label')}
                  </Text>
                  <Text style={[styles.madhabSub, { color: theme.textMuted }]}>
                    {m === 'hanafi'
                      ? t('prayerSettings.madhab.hanafi.sub')
                      : t('prayerSettings.madhab.shafi.sub')}
                  </Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={GOLD} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
        {todayAsr ? (
          <Text style={[styles.previewText, { color: theme.textSecondary }]}>
            {t('prayerSettings.madhab.preview.today')}
            <Text style={{ color: GREEN, fontWeight: '700' }}>{t('prayerSettings.madhab.preview.asrAt', { time: fmt(todayAsr) })}</Text>{' '}
            ({settings.madhab === 'hanafi' ? t('prayerSettings.madhab.preview.hanafi') : t('prayerSettings.madhab.preview.standard')})
          </Text>
        ) : null}

        {/* Time format */}
        <SectionHeader title={t('prayerSettings.timeFormat.sectionTitle')} subtitle={t('prayerSettings.timeFormat.sectionSubtitle')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 6 }]}>
          {(['auto', '12h', '24h'] as TimeFormatPref[]).map((f) => {
            const selected = format === f;
            const label = t(`prayerSettings.timeFormat.${f}.label`);
            const sub = t(`prayerSettings.timeFormat.${f}.sub`);
            return (
              <TouchableOpacity
                key={f}
                style={[styles.madhabRow, selected && { backgroundColor: 'rgba(15,110,86,0.08)', borderRadius: 12 }]}
                onPress={() => handleFormatChange(f)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.madhabLabel, { color: theme.text }]}>{label}</Text>
                  <Text style={[styles.madhabSub, { color: theme.textMuted }]}>{sub}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={GOLD} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
        {todayFajr ? (
          <Text style={[styles.previewText, { color: theme.textSecondary }]}>
            {t('prayerSettings.timeFormat.preview', { time: fmt(todayFajr) })}
          </Text>
        ) : null}

        {/* High latitude rule */}
        {showHighLat && (
          <>
            <SectionHeader
              title={t('prayerSettings.highLat.sectionTitle')}
              subtitle={t('prayerSettings.highLat.sectionSubtitle')}
            />
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 6 }]}>
              {HIGH_LAT_OPTION_VALUES.map((value) => {
                const selected = highLat === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.madhabRow, selected && { backgroundColor: 'rgba(15,110,86,0.08)', borderRadius: 12 }]}
                    onPress={() => handleHighLatChange(value)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.madhabLabel, { color: theme.text }]}>{t(`prayerSettings.highLat.options.${value}.label`)}</Text>
                      <Text style={[styles.madhabSub, { color: theme.textMuted }]}>{t(`prayerSettings.highLat.options.${value}.sub`)}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={GOLD} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Notifications */}
        <NotificationsSettingsSection
          textColor={theme.text}
          textMutedColor={theme.textMuted}
          cardColor={theme.card}
          borderColor={theme.border}
        />

        {/* About */}
        <View style={[styles.aboutCard, { backgroundColor: CREAM }]}>
          <Ionicons name="information-circle" size={16} color={GREEN} />
          <Text style={styles.aboutText}>
            {t('prayerSettings.about.text', { method: settings.method })}
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionUnderline} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingTop: 4, gap: 6 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  toolbarBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  toolbarTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },

  sectionHeader: {
    backgroundColor: CREAM,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { color: GREEN, fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  sectionSubtitle: { color: '#3F3F3F', fontSize: 12, marginTop: 2 },
  sectionUnderline: { height: 2, width: 28, backgroundColor: GOLD, marginTop: 6, borderRadius: 1 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  locCity: { fontSize: 16, fontWeight: '700' },
  locCountry: { fontSize: 12, color: GOLD, marginTop: 2, fontWeight: '600' },
  locButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimary: { backgroundColor: GREEN },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(15,110,86,0.4)', backgroundColor: 'rgba(15,110,86,0.05)' },
  btnGhostText: { color: GREEN, fontSize: 13, fontWeight: '700' },

  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  optLabel: { fontSize: 14, fontWeight: '600' },
  optRegion: { fontSize: 11, color: GOLD, marginTop: 2, fontWeight: '600' },

  madhabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  madhabLabel: { fontSize: 14, fontWeight: '700' },
  madhabSub: { fontSize: 11, marginTop: 2 },

  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: 6,
    gap: 8,
  },
  helperText: { fontSize: 11, flex: 1 },
  resetLink: { color: GOLD, fontSize: 12, fontWeight: '700' },

  previewText: {
    fontSize: 12,
    paddingHorizontal: 6,
    marginTop: 8,
  },

  aboutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
  },
  aboutText: { flex: 1, fontSize: 12, color: '#3F3F3F', lineHeight: 18 },
});
