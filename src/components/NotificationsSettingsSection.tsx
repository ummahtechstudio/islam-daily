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
import { useTranslation } from 'react-i18next';

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
import { getSetting, setSetting } from '../utils/settings';

const GREEN = '#0F6E56';
const GOLD = '#EF9F27';
const CREAM = '#FBF6E4';

const PRAYERS: { key: PrayerName; arabic: string }[] = [
  { key: 'fajr',    arabic: 'الفجر'   },
  { key: 'dhuhr',   arabic: 'الظهر'   },
  { key: 'asr',     arabic: 'العصر'   },
  { key: 'maghrib', arabic: 'المغرب'  },
  { key: 'isha',    arabic: 'العشاء'  },
];

const SOUND_OPTION_KEYS: PrayerSoundChoice[] = ['adhan', 'system', 'silent'];

const SOUND_ICONS: Record<PrayerSoundChoice, keyof typeof Ionicons.glyphMap> = {
  adhan:  'volume-high',
  system: 'notifications',
  silent: 'volume-mute',
};

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
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PrayerNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermissionStatus>('undetermined');
  const [showExplainer, setShowExplainer] = useState(false);
  const [showTahajjudExplainer, setShowTahajjudExplainer] = useState(false);
  const [showTestPicker, setShowTestPicker] = useState(false);
  const [todayTimes, setTodayTimes] = useState<Partial<Record<PrayerName, Date>>>({});
  // Duha is stored via the AsyncStorage `settings_*` key pattern (like Daily
  // Hadith / Friday), separate from the MMKV prayer-notification settings.
  const [duhaEnabled, setDuhaEnabled] = useState(false);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [perm, stored, duha] = await Promise.all([
        getNotificationPermission(),
        getNotificationSettings(),
        getSetting<boolean>('duha_reminder', false),
      ]);
      if (cancelled) return;
      setPermission(perm);
      setSettings(stored);
      setDuhaEnabled(duha);
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
      t('notifications.alerts.disabledTitle'),
      t('notifications.alerts.disabledMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('notifications.alerts.openSettings'), onPress: () => Linking.openSettings().catch(() => {}) },
      ],
    );
  }, [persistAndReschedule, settings, t]);

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

  // ─── Sunnah / Tahajjud handlers ────────────────────────────────────────────

  const setTahajjudEnabled = useCallback(
    (enabled: boolean) => {
      const next: PrayerNotificationSettings = {
        ...settings,
        sunnah: {
          ...settings.sunnah,
          tahajjud: { ...settings.sunnah.tahajjud, enabled },
        },
      };
      persistAndReschedule(next);
    },
    [persistAndReschedule, settings],
  );

  const enableTahajjud = useCallback(async () => {
    lightHaptic();
    const current = await getNotificationPermission();

    if (current === 'granted') {
      setTahajjudEnabled(true);
      return;
    }

    if (current === 'undetermined') {
      setShowTahajjudExplainer(true);
      return;
    }

    Alert.alert(
      t('notifications.alerts.disabledTitle'),
      t('notifications.alerts.disabledMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('notifications.alerts.openSettings'), onPress: () => Linking.openSettings().catch(() => {}) },
      ],
    );
  }, [setTahajjudEnabled, t]);

  const disableTahajjud = useCallback(() => {
    lightHaptic();
    setTahajjudEnabled(false);
  }, [setTahajjudEnabled]);

  const handleTahajjudToggle = useCallback(
    (value: boolean) => {
      if (value) enableTahajjud();
      else disableTahajjud();
    },
    [enableTahajjud, disableTahajjud],
  );

  const handleTahajjudExplainerAllow = useCallback(async () => {
    setShowTahajjudExplainer(false);
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setTahajjudEnabled(true);
    } else {
      setTahajjudEnabled(false);
    }
  }, [setTahajjudEnabled]);

  const handleTahajjudExplainerCancel = useCallback(() => {
    setShowTahajjudExplainer(false);
  }, []);

  // ─── Sunnah / Duha handlers ────────────────────────────────────────────────
  // Mirrors the Tahajjud permission gating but persists via the AsyncStorage
  // key + reschedules through the shared scheduler (Daily Hadith / Friday path).

  const applyDuhaEnabled = useCallback(async (enabled: boolean) => {
    setDuhaEnabled(enabled);
    await setSetting('duha_reminder', enabled);
    scheduleNotificationsForNext7Days().catch((err) =>
      console.warn('[NotificationsSettings] duha re-schedule failed', err),
    );
  }, []);

  const handleDuhaToggle = useCallback(
    async (value: boolean) => {
      lightHaptic();
      if (!value) {
        applyDuhaEnabled(false);
        return;
      }
      const current = await getNotificationPermission();
      if (current === 'granted') {
        applyDuhaEnabled(true);
        return;
      }
      if (current === 'undetermined') {
        const result = await requestNotificationPermission();
        setPermission(result);
        applyDuhaEnabled(result === 'granted');
        return;
      }
      // denied previously — direct user to OS settings
      Alert.alert(
        t('notifications.alerts.disabledTitle'),
        t('notifications.alerts.disabledMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('notifications.alerts.openSettings'), onPress: () => Linking.openSettings().catch(() => {}) },
        ],
      );
    },
    [applyDuhaEnabled, t],
  );

  // ─── Test ──────────────────────────────────────────────────────────────────

  const handleTestPress = useCallback(async (prayer: PrayerName) => {
    setShowTestPicker(false);
    lightHaptic();
    if (Platform.OS === 'web') {
      Alert.alert(
        t('notifications.alerts.webOnlyTitle'),
        t('notifications.alerts.webOnlyMessage'),
      );
      return;
    }
    if (permission !== 'granted') {
      Alert.alert(
        t('notifications.alerts.permRequiredTitle'),
        t('notifications.alerts.permRequiredMessage'),
      );
      return;
    }
    await fireTestNotification(prayer);
    const prayerLabel = prayer.charAt(0).toUpperCase() + prayer.slice(1);
    Alert.alert(
      t('notifications.alerts.testSentTitle'),
      t('notifications.alerts.testSentMessage', { prayer: prayerLabel }),
    );
  }, [permission, t]);

  // ─── Permission status row ─────────────────────────────────────────────────

  const PermissionStatus = () => {
    if (permission === 'granted') {
      return (
        <View style={styles.permRow}>
          <Ionicons name="checkmark-circle" size={14} color={GREEN} />
          <Text style={[styles.permText, { color: GREEN }]}>{t('notifications.permission.granted')}</Text>
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
            {t('notifications.permission.denied')}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.permRow}>
        <Ionicons name="information-circle-outline" size={14} color={textMutedColor} />
        <Text style={[styles.permText, { color: textMutedColor }]}>
          {t('notifications.permission.undetermined')}
        </Text>
      </View>
    );
  };

  const masterEnabled = settings.enabled && permission === 'granted';
  const rowsDisabled = !masterEnabled;

  return (
    <>
      <SectionHeader
        title={t('notifications.sections.prayers.title')}
        subtitle={t('notifications.sections.prayers.subtitle')}
      />

      {/* Master toggle card */}
      <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
        <View style={styles.masterRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.masterLabel, { color: textColor }]}>{t('notifications.master.label')}</Text>
            <Text style={[styles.masterSub, { color: textMutedColor }]}>
              {t('notifications.master.sub')}
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
          // Capitalise the prayer key for the English name label
          const englishName = p.key.charAt(0).toUpperCase() + p.key.slice(1);
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
                    {englishName} <Text style={[styles.prayerArabic, { color: textMutedColor }]}>· {p.arabic}</Text>
                  </Text>
                  {today && (
                    <Text style={[styles.prayerTime, { color: textMutedColor }]}>
                      {t('notifications.prayerRow.today', { time: formatPrayerTime(today) })}
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
                {SOUND_OPTION_KEYS.map((key) => {
                  const selected = cfg.sound === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.pill,
                        selected && styles.pillSelected,
                      ]}
                      onPress={() => setPrayerSound(p.key, key)}
                      disabled={rowsDisabled || !cfg.enabled}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={SOUND_ICONS[key]}
                        size={13}
                        color={selected ? '#FFFFFF' : GREEN}
                      />
                      <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
                        {t(`notifications.sound.options.${key}`)}
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
        <Text style={styles.testBtnText}>{t('notifications.testBtn')}</Text>
      </TouchableOpacity>

      <View style={[styles.aboutCard, { backgroundColor: CREAM }]}>
        <Ionicons name="information-circle" size={16} color={GREEN} />
        <Text style={styles.aboutText}>
          {t('notifications.aboutCard')}
        </Text>
      </View>

      {/* ── Sunnah Reminders (optional / extra) ──────────────────────────── */}
      <SectionHeader
        title={t('notifications.sections.sunnah.title')}
        subtitle={t('notifications.sections.sunnah.subtitle')}
      />

      <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
        <View style={styles.tahajjudRow}>
          <View style={styles.tahajjudIconWrap}>
            <Ionicons name="moon" size={18} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tahajjudName, { color: textColor }]}>
              {t('notifications.tahajjud.name')}
            </Text>
            <Text style={[styles.tahajjudSub, { color: textMutedColor }]}>
              {t('notifications.tahajjud.sub')}
            </Text>
          </View>
          <Switch
            value={settings.sunnah.tahajjud.enabled && permission !== 'denied'}
            onValueChange={handleTahajjudToggle}
            trackColor={{ false: '#D1D5DB', true: GREEN }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.sunnahDivider, { backgroundColor: borderColor }]} />

        <View style={styles.tahajjudRow}>
          <View style={styles.tahajjudIconWrap}>
            <Ionicons name="sunny" size={18} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tahajjudName, { color: textColor }]}>
              {t('notifications.duha.name')}
            </Text>
            <Text style={[styles.tahajjudSub, { color: textMutedColor }]}>
              {t('notifications.duha.sub')}
            </Text>
          </View>
          <Switch
            value={duhaEnabled && permission !== 'denied'}
            onValueChange={handleDuhaToggle}
            trackColor={{ false: '#D1D5DB', true: GREEN }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={[styles.aboutCard, { backgroundColor: CREAM }]}>
        <Ionicons name="information-circle" size={16} color={GREEN} />
        <Text style={styles.aboutText}>
          {t('notifications.tahajjud.aboutCard')}
        </Text>
      </View>

      {/* ── Pre-explainer modal ───────────────────────────────────────────── */}
      <Modal visible={showExplainer} transparent animationType="fade" onRequestClose={handleExplainerCancel}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="notifications" size={32} color={GREEN} />
            </View>
            <Text style={styles.modalTitle}>{t('notifications.explainerModal.title')}</Text>
            <Text style={styles.modalBody}>
              {t('notifications.explainerModal.body')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={handleExplainerCancel}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnGhostText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleExplainerAllow}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnPrimaryText}>{t('notifications.explainerModal.allowBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Tahajjud pre-explainer modal ──────────────────────────────────── */}
      <Modal
        visible={showTahajjudExplainer}
        transparent
        animationType="fade"
        onRequestClose={handleTahajjudExplainerCancel}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="moon" size={32} color={GREEN} />
            </View>
            <Text style={styles.modalTitle}>{t('notifications.tahajjudModal.title')}</Text>
            <Text style={styles.modalBody}>
              {t('notifications.tahajjudModal.body')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={handleTahajjudExplainerCancel}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnGhostText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleTahajjudExplainerAllow}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnPrimaryText}>{t('notifications.tahajjudModal.allowBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Test prayer picker ────────────────────────────────────────────── */}
      <Modal visible={showTestPicker} transparent animationType="fade" onRequestClose={() => setShowTestPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('notifications.testPickerModal.title')}</Text>
            <Text style={styles.modalBody}>{t('notifications.testPickerModal.body')}</Text>
            <View style={styles.testList}>
              {PRAYERS.map((p) => {
                const englishName = p.key.charAt(0).toUpperCase() + p.key.slice(1);
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={styles.testRow}
                    onPress={() => handleTestPress(p.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.testRowLabel}>{englishName}</Text>
                    <Ionicons name="chevron-forward" size={16} color={GREEN} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnGhost, { alignSelf: 'stretch' }]}
              onPress={() => setShowTestPicker(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnGhostText}>{t('common.cancel')}</Text>
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

  tahajjudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: spacing.md,
  },
  tahajjudIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(15,110,86,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tahajjudName: { fontSize: 15, fontWeight: '700' },
  tahajjudSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  sunnahDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },

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
