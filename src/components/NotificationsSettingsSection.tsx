import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  Linking,
  Platform,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { palette } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  fireTestNotification,
  getNotificationPermission,
  getNotificationSettings,
  requestNotificationPermission,
  scheduleNotificationsForNext7Days,
  setNotificationSettings,
  type NotificationPermissionStatus,
  type PrayerName,
  type PrayerNotificationSettings,
  type PrayerSoundChoice,
} from '../services/notificationsService';
import { computePrayerTimes, getPersistedSettings, KARACHI_DEFAULT } from '../services/prayerTimesService';
import { formatPrayerTime } from '../utils/formatPrayerTime';

const GREEN = '#0F6E56';
const GOLD = '#EF9F27';
const CREAM = '#FBF6E4';

const PRAYERS: { key: PrayerName; english: string; arabic: string }[] = [
  { key: 'fajr',    english: 'Fajr',    arabic: 'الفجر'   },
  { key: 'dhuhr',   english: 'Dhuhr',   arabic: 'الظهر'   },
  { key: 'asr',     english: 'Asr',     arabic: 'العصر'   },
  { key: 'maghrib', english: 'Maghrib', arabic: 'المغرب'  },
  { key: 'isha',    english: 'Isha',    arabic: 'العشاء'  },
];

const SOUND_OPTIONS: { key: PrayerSoundChoice; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'adhan',  label: 'Adhan',  icon: 'volume-high' },
  { key: 'system', label: 'System', icon: 'notifications' },
  { key: 'silent', label: 'Silent', icon: 'volume-mute' },
];

function lightHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

type Props = {
  textColor: string;
  textMutedColor: string;
  cardColor: string;
  borderColor: string;
};

export function NotificationsSettingsSection({
  textColor,
  textMutedColor,
  cardColor,
  borderColor,
}: Props) {
  const [settings, setSettings] = useState<PrayerNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermissionStatus>('undetermined');
  const [showExplainer, setShowExplainer] = useState(false);
  const [showTestPicker, setShowTestPicker] = useState(false);
  const [todayTimes, setTodayTimes] = useState<Partial<Record<PrayerName, Date>>>({});

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [perm, stored] = await Promise.all([
        getNotificationPermission(),
        getNotificationSettings(),
      ]);
      if (cancelled) return;
      setPermission(perm);
      setSettings(stored);
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-check permission when app returns to foreground (user may have changed
  // it in OS settings).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        getNotificationPermission().then(setPermission).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // Compute today's times for the small per-prayer time chips.
  useEffect(() => {
    try {
      const ps = getPersistedSettings() ?? KARACHI_DEFAULT;
      const computed = computePrayerTimes(ps, new Date());
      const map: Partial<Record<PrayerName, Date>> = {};
      for (const p of computed.prayers) {
        if (p.name === 'sunrise') continue;
        map[p.name as PrayerName] = p.time;
      }
      setTodayTimes(map);
    } catch {
      setTodayTimes({});
    }
  }, []);

  const persistAndReschedule = useCallback(async (next: PrayerNotificationSettings) => {
    setSettings(next);
    await setNotificationSettings(next);
    scheduleNotificationsForNext7Days().catch((err) =>
      console.warn('[NotificationsSettings] re-schedule failed', err),
    );
  }, []);

  // ─── Master toggle handlers ────────────────────────────────────────────────

  const enableMaster = useCallback(async () => {
    lightHaptic();
    const current = await getNotificationPermission();

    if (current === 'granted') {
      await persistAndReschedule({ ...settings, enabled: true });
      return;
    }

    if (current === 'undetermined') {
      // Show pre-explainer first, then OS prompt.
      setShowExplainer(true);
      return;
    }

    // denied previously — direct user to OS settings
    Alert.alert(
      'Notifications disabled',
      'Permissions were denied previously. You can enable them in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
      ],
    );
  }, [persistAndReschedule, settings]);

  const disableMaster = useCallback(async () => {
    lightHaptic();
    await persistAndReschedule({ ...settings, enabled: false });
  }, [persistAndReschedule, settings]);

  const handleMasterToggle = useCallback((value: boolean) => {
    if (value) enableMaster();
    else disableMaster();
  }, [enableMaster, disableMaster]);

  const handleExplainerAllow = useCallback(async () => {
    setShowExplainer(false);
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      await persistAndReschedule({ ...settings, enabled: true });
    } else if (result === 'denied') {
      // User denied in OS dialog — keep master OFF and surface inline state.
      await persistAndReschedule({ ...settings, enabled: false });
    }
  }, [persistAndReschedule, settings]);

  const handleExplainerCancel = useCallback(() => {
    setShowExplainer(false);
  }, []);

  // ─── Per-prayer handlers ───────────────────────────────────────────────────

  const togglePrayer = useCallback((prayer: PrayerName) => {
    lightHaptic();
    const next: PrayerNotificationSettings = {
      ...settings,
      perPrayer: {
        ...settings.perPrayer,
        [prayer]: {
          ...settings.perPrayer[prayer],
          enabled: !settings.perPrayer[prayer].enabled,
        },
      },
    };
    persistAndReschedule(next);
  }, [persistAndReschedule, settings]);

  const setPrayerSound = useCallback((prayer: PrayerName, sound: PrayerSoundChoice) => {
    lightHaptic();
    const next: PrayerNotificationSettings = {
      ...settings,
      perPrayer: {
        ...settings.perPrayer,
        [prayer]: { ...settings.perPrayer[prayer], sound },
      },
    };
    persistAndReschedule(next);
  }, [persistAndReschedule, settings]);

  // ─── Test ──────────────────────────────────────────────────────────────────

  const handleTestPress = useCallback(async (prayer: PrayerName) => {
    setShowTestPicker(false);
    lightHaptic();
    if (Platform.OS === 'web') {
      Alert.alert('Test on device', 'Test notifications fire only on a real device or development build, not in the web preview.');
      return;
    }
    if (permission !== 'granted') {
      Alert.alert('Permission required', 'Allow notifications first to send a test.');
      return;
    }
    await fireTestNotification(prayer);
    Alert.alert('Test sent', `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} test notification will arrive in a moment.`);
  }, [permission]);

  // ─── Permission status row ─────────────────────────────────────────────────

  const PermissionStatus = () => {
    if (permission === 'granted') {
      return (
        <View style={styles.permRow}>
          <Ionicons name="checkmark-circle" size={14} color={GREEN} />
          <Text style={[styles.permText, { color: GREEN }]}>Permissions granted</Text>
        </View>
      );
    }
    if (permission === 'denied') {
      return (
        <TouchableOpacity
          style={styles.permRow}
          onPress={() => Linking.openSettings().catch(() => {})}
          activeOpacity={0.7}
        >
          <Ionicons name="warning" size={14} color={palette.error} />
          <Text style={[styles.permText, { color: palette.error }]}>
            Permissions denied. Tap to open settings.
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.permRow}>
        <Ionicons name="information-circle-outline" size={14} color={textMutedColor} />
        <Text style={[styles.permText, { color: textMutedColor }]}>
          Tap "Enable prayer notifications" to grant permission.
        </Text>
      </View>
    );
  };

  const masterEnabled = settings.enabled && permission === 'granted';
  const rowsDisabled = !masterEnabled;

  return (
    <>
      <SectionHeader title="Notifications" subtitle="Adhan reminders for the five daily prayers" />

      {/* Master toggle card */}
      <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
        <View style={styles.masterRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.masterLabel, { color: textColor }]}>Enable prayer notifications</Text>
            <Text style={[styles.masterSub, { color: textMutedColor }]}>
              Master switch — turn off to silence all five prayers
            </Text>
          </View>
          <Switch
            value={settings.enabled && permission !== 'denied'}
            onValueChange={handleMasterToggle}
            trackColor={{ false: '#D1D5DB', true: GREEN }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.permWrap}>
          <PermissionStatus />
        </View>
      </View>

      {/* Per-prayer rows */}
      <View style={[styles.card, { backgroundColor: cardColor, borderColor, marginTop: spacing.sm }]}>
        {PRAYERS.map((p, idx) => {
          const cfg = settings.perPrayer[p.key];
          const last = idx === PRAYERS.length - 1;
          const today = todayTimes[p.key];
          const dimmed = rowsDisabled || !cfg.enabled;
          return (
            <View
              key={p.key}
              style={[
                styles.prayerRow,
                !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
                rowsDisabled && { opacity: 0.5 },
              ]}
            >
              <View style={styles.prayerHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prayerName, { color: textColor }]}>
                    {p.english} <Text style={[styles.prayerArabic, { color: textMutedColor }]}>· {p.arabic}</Text>
                  </Text>
                  {today && (
                    <Text style={[styles.prayerTime, { color: textMutedColor }]}>
                      Today · {formatPrayerTime(today)}
                    </Text>
                  )}
                </View>
                <Switch
                  value={cfg.enabled}
                  onValueChange={() => togglePrayer(p.key)}
                  disabled={rowsDisabled}
                  trackColor={{ false: '#D1D5DB', true: GREEN }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.pillRow, dimmed && { opacity: 0.6 }]}>
                {SOUND_OPTIONS.map((opt) => {
                  const selected = cfg.sound === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.pill,
                        selected && styles.pillSelected,
                      ]}
                      onPress={() => setPrayerSound(p.key, opt.key)}
                      disabled={rowsDisabled || !cfg.enabled}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={13}
                        color={selected ? '#FFFFFF' : GREEN}
                      />
                      <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Test button */}
      <TouchableOpacity
        style={[
          styles.testBtn,
          { borderColor: GREEN },
          rowsDisabled && { opacity: 0.5 },
        ]}
        onPress={() => {
          lightHaptic();
          setShowTestPicker(true);
        }}
        disabled={rowsDisabled}
        activeOpacity={0.85}
      >
        <Ionicons name="paper-plane" size={14} color={GREEN} />
        <Text style={styles.testBtnText}>Test notification</Text>
      </TouchableOpacity>

      <View style={[styles.aboutCard, { backgroundColor: CREAM }]}>
        <Ionicons name="information-circle" size={16} color={GREEN} />
        <Text style={styles.aboutText}>
          Notifications fire at exact prayer time, computed locally from your selected method and
          city.
        </Text>
      </View>

      {/* ── Pre-explainer modal ───────────────────────────────────────────── */}
      <Modal visible={showExplainer} transparent animationType="fade" onRequestClose={handleExplainerCancel}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="notifications" size={32} color={GREEN} />
            </View>
            <Text style={styles.modalTitle}>Allow Islam Daily to send prayer notifications?</Text>
            <Text style={styles.modalBody}>
              We&apos;ll notify you at each prayer time with your chosen sound — adhan, silent, or
              system tone. You can customize each prayer individually.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={handleExplainerCancel}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleExplainerAllow}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnPrimaryText}>Allow notifications</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Test prayer picker ────────────────────────────────────────────── */}
      <Modal visible={showTestPicker} transparent animationType="fade" onRequestClose={() => setShowTestPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send test for which prayer?</Text>
            <Text style={styles.modalBody}>The test fires immediately using that prayer&apos;s sound.</Text>
            <View style={styles.testList}>
              {PRAYERS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={styles.testRow}
                  onPress={() => handleTestPress(p.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.testRowLabel}>{p.english}</Text>
                  <Ionicons name="chevron-forward" size={16} color={GREEN} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnGhost, { alignSelf: 'stretch' }]}
              onPress={() => setShowTestPicker(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  sectionHeader: {
    backgroundColor: CREAM,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { color: GREEN, fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  sectionSubtitle: { color: '#3F3F3F', fontSize: 12, marginTop: 2 },
  sectionUnderline: { height: 2, width: 28, backgroundColor: GOLD, marginTop: 6, borderRadius: 1 },

  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },

  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: spacing.md,
  },
  masterLabel: { fontSize: 15, fontWeight: '700' },
  masterSub: { fontSize: 12, marginTop: 2 },
  permWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  permText: { fontSize: 12, fontWeight: '600' },

  prayerRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  prayerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  prayerName: { fontSize: 15, fontWeight: '700' },
  prayerArabic: { fontSize: 14, fontWeight: '500' },
  prayerTime: { fontSize: 11, marginTop: 2 },

  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(15,110,86,0.3)',
    backgroundColor: 'rgba(15,110,86,0.05)',
  },
  pillSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  pillLabel: { fontSize: 12, fontWeight: '700', color: GREEN },
  pillLabelSelected: { color: '#FFFFFF' },

  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(15,110,86,0.05)',
  },
  testBtnText: { color: GREEN, fontSize: 14, fontWeight: '700' },

  aboutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: radius.md,
    padding: 12,
    marginTop: spacing.md,
  },
  aboutText: { flex: 1, fontSize: 12, color: '#3F3F3F', lineHeight: 18 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: CREAM,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalIconWrap: {
    alignSelf: 'center',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(15,110,86,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1A3D2F', textAlign: 'center' },
  modalBody: { fontSize: 13, color: '#3F3F3F', textAlign: 'center', lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalBtnPrimary: { backgroundColor: GREEN },
  modalBtnGhost: { borderWidth: 1, borderColor: 'rgba(15,110,86,0.4)' },
  modalBtnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalBtnGhostText: { color: GREEN, fontSize: 14, fontWeight: '700' },

  testList: { gap: 4, marginVertical: spacing.sm },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15,110,86,0.06)',
    borderRadius: radius.md,
  },
  testRowLabel: { fontSize: 14, fontWeight: '700', color: '#1A3D2F' },
});
