import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';

import i18n from '../i18n';
import { prefs, PREFS_KEYS } from '../lib/storage';
import {
  computePrayerTimes,
  getPersistedSettings,
  KARACHI_DEFAULT,
} from './prayerTimesService';
import { formatPrayerTime } from '../utils/formatPrayerTime';
import { getSetting } from '../utils/settings';
import type { PrayerTimesSettings } from '../types/prayerTimes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerSoundChoice = 'adhan' | 'silent' | 'system';

export type SunnahNotificationSettings = {
  tahajjud: {
    enabled: boolean;
  };
};

export type PrayerNotificationSettings = {
  enabled: boolean;
  perPrayer: Record<PrayerName, {
    enabled: boolean;
    sound: PrayerSoundChoice;
  }>;
  sunnah: SunnahNotificationSettings;
};

export const DEFAULT_NOTIFICATION_SETTINGS: PrayerNotificationSettings = {
  enabled: true,
  perPrayer: {
    fajr:    { enabled: true, sound: 'adhan' },
    dhuhr:   { enabled: true, sound: 'adhan' },
    asr:     { enabled: true, sound: 'adhan' },
    maghrib: { enabled: true, sound: 'adhan' },
    isha:    { enabled: true, sound: 'adhan' },
  },
  sunnah: {
    // Optional Sunnah reminders default to OFF — users opt in explicitly.
    tahajjud: { enabled: false },
  },
};

const SCHEDULE_AHEAD_DAYS = 7;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const SCHEDULED_TAG = 'prayer-notification';
const TAHAJJUD_TAG = 'tahajjud-notification';
const DAILY_HADITH_TAG = 'daily-hadith-notification';
const FRIDAY_TAG = 'friday-reminder-notification';

// Friday reminder fires at a fixed default time (no per-user time picker yet).
// expo-notifications weekday is 1=Sunday … 6=Friday … 7=Saturday.
const FRIDAY_WEEKDAY = 6;
const FRIDAY_REMINDER_HOUR = 9;
const FRIDAY_REMINDER_MINUTE = 0;

// Android notification channels — one per sound choice. On API 26+, the
// channel determines the sound, not the per-notification field.
const CHANNEL_ADHAN = 'prayer-adhan';
const CHANNEL_SYSTEM = 'prayer-system';
const CHANNEL_SILENT = 'prayer-silent';
const CHANNEL_TAHAJJUD = 'sunnah-tahajjud';
const CHANNEL_GENERAL = 'general-reminders';

// Notification text is resolved at schedule time via i18n so future locale
// support only requires updating the locale JSON files.
function getTahajjudTitle(): string {
  return i18n.t('notifications.tahajjudNotif.title');
}
function getTahajjudBody(): string {
  return i18n.t('notifications.tahajjudNotif.body');
}

const PRAYER_ARABIC: Record<PrayerName, string> = {
  fajr:    'الفجر',
  dhuhr:   'الظهر',
  asr:     'العصر',
  maghrib: 'المغرب',
  isha:    'العشاء',
};

const PRAYER_ENGLISH: Record<PrayerName, string> = {
  fajr:    'Fajr',
  dhuhr:   'Dhuhr',
  asr:     'Asr',
  maghrib: 'Maghrib',
  isha:    'Isha',
};

const ALL_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// ─── Permissions ──────────────────────────────────────────────────────────────

function mapPermission(
  resp: Notifications.NotificationPermissionsStatus,
): NotificationPermissionStatus {
  if (resp.granted) return 'granted';
  if (resp.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'denied';
  try {
    const resp = await Notifications.getPermissionsAsync();
    return mapPermission(resp);
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'denied';
  try {
    const resp = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
    return mapPermission(resp);
  } catch {
    return 'denied';
  }
}

// ─── Settings persistence ─────────────────────────────────────────────────────

export async function getNotificationSettings(): Promise<PrayerNotificationSettings> {
  const stored = prefs.getJSON<PrayerNotificationSettings>(
    PREFS_KEYS.PRAYER_NOTIFICATION_SETTINGS,
  );
  if (!stored) return DEFAULT_NOTIFICATION_SETTINGS;
  return mergeWithDefaults(stored);
}

export async function setNotificationSettings(
  s: PrayerNotificationSettings,
): Promise<void> {
  prefs.setJSON(PREFS_KEYS.PRAYER_NOTIFICATION_SETTINGS, s);
}

// Forward-compatibility: if a prayer entry is missing on a stored object
// (e.g. older app version), fill it from defaults rather than throwing.
const VALID_SOUND_CHOICES: PrayerSoundChoice[] = ['adhan', 'silent', 'system'];

function isValidSound(v: unknown): v is PrayerSoundChoice {
  return typeof v === 'string' && (VALID_SOUND_CHOICES as string[]).includes(v);
}

function mergeWithDefaults(
  s: PrayerNotificationSettings,
): PrayerNotificationSettings {
  const merged: PrayerNotificationSettings = {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_NOTIFICATION_SETTINGS.enabled,
    perPrayer: { ...DEFAULT_NOTIFICATION_SETTINGS.perPrayer },
    sunnah: { ...DEFAULT_NOTIFICATION_SETTINGS.sunnah },
  };
  for (const p of ALL_PRAYERS) {
    const stored = s.perPrayer?.[p];
    if (stored) {
      // Validate sound is one of the known choices — a future schema version
      // adding e.g. 'custom-mp3' would otherwise leak `undefined` into
      // channelForChoice and silently no-op the notification.
      merged.perPrayer[p] = {
        enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULT_NOTIFICATION_SETTINGS.perPrayer[p].enabled,
        sound: isValidSound(stored.sound) ? stored.sound : DEFAULT_NOTIFICATION_SETTINGS.perPrayer[p].sound,
      };
    }
  }
  if (s.sunnah?.tahajjud && typeof s.sunnah.tahajjud.enabled === 'boolean') {
    merged.sunnah.tahajjud = { enabled: s.sunnah.tahajjud.enabled };
  }
  return merged;
}

// ─── Android channels ─────────────────────────────────────────────────────────

let channelsConfigured = false;

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (channelsConfigured) return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ADHAN, {
      name: 'Prayer adhan',
      importance: AndroidImportance.HIGH,
      sound: 'adhan.mp3',
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_SYSTEM, {
      name: 'Prayer (system tone)',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_SILENT, {
      name: 'Prayer (silent)',
      importance: AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    // Sunnah / Tahajjud reminders are optional and personal — medium importance,
    // system tone, so they don't blast adhan audio in the middle of the night.
    await Notifications.setNotificationChannelAsync(CHANNEL_TAHAJJUD, {
      name: 'Tahajjud reminder',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    // General reminders (Daily Hadith, Friday) — gentle, system tone, not adhan.
    await Notifications.setNotificationChannelAsync(CHANNEL_GENERAL, {
      name: 'Reminders',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    channelsConfigured = true;
  } catch (err) {
    console.warn('[notifications] failed to configure channels', err);
  }
}

function channelForChoice(choice: PrayerSoundChoice): string {
  switch (choice) {
    case 'adhan':  return CHANNEL_ADHAN;
    case 'system': return CHANNEL_SYSTEM;
    case 'silent': return CHANNEL_SILENT;
  }
}

function soundForContent(choice: PrayerSoundChoice): string | boolean {
  switch (choice) {
    case 'adhan':  return 'adhan.mp3';
    case 'system': return true;
    case 'silent': return false;
  }
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

async function cancelByTag(tag: string): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => {
          const data = n.content?.data as { tag?: string } | undefined;
          return data?.tag === tag;
        })
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch (err) {
    console.warn(`[notifications] cancel tag=${tag} failed`, err);
  }
}

async function cancelExistingPrayerNotifications(): Promise<void> {
  await cancelByTag(SCHEDULED_TAG);
}

async function cancelExistingTahajjudNotifications(): Promise<void> {
  await cancelByTag(TAHAJJUD_TAG);
}

export async function cancelAllPrayerNotifications(): Promise<void> {
  await cancelExistingPrayerNotifications();
  await cancelExistingTahajjudNotifications();
  await cancelByTag(DAILY_HADITH_TAG);
  await cancelByTag(FRIDAY_TAG);
  prefs.delete(PREFS_KEYS.NOTIFICATIONS_LAST_SCHEDULED_AT);
}

// Minimum night length for a Tahajjud reminder to make sense. Arctic
// summer can squeeze the gap between Maghrib and Fajr down to ~30 min —
// firing "last third of the night" inside that window is spammy and
// useless. 4 hours is a conservative floor; below this, skip the day.
const MIN_TAHAJJUD_NIGHT_MS = 4 * 60 * 60 * 1000;

/**
 * Tahajjud time = the start of the last third of the night.
 *
 *   night     = next-day Fajr  −  today's Maghrib
 *   tahajjud  = next-day Fajr  −  (night / 3)
 *
 * Maghrib and Fajr come from the existing prayer-times service — no hardcoded
 * times. Returns null if either prayer can't be resolved (defensive only),
 * or if the night is too short to be meaningful (high-latitude summer).
 */
function computeTahajjudStart(
  prayerSettings: PrayerTimesSettings,
  date: Date,
): Date | null {
  const today = computePrayerTimes(prayerSettings, date);
  const tomorrowDate = new Date(date);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = computePrayerTimes(prayerSettings, tomorrowDate);

  const maghrib = today.prayers.find((p) => p.name === 'maghrib')?.time;
  const fajrNext = tomorrow.prayers.find((p) => p.name === 'fajr')?.time;
  if (!maghrib || !fajrNext) return null;

  const nightMs = fajrNext.getTime() - maghrib.getTime();
  if (!Number.isFinite(nightMs) || nightMs <= 0) return null;
  if (nightMs < MIN_TAHAJJUD_NIGHT_MS) return null;

  return new Date(fajrNext.getTime() - nightMs / 3);
}

async function schedulePrayerNotifications(
  settings: PrayerNotificationSettings,
  prayerSettings: PrayerTimesSettings,
): Promise<void> {
  await cancelExistingPrayerNotifications();
  if (!settings.enabled) return;

  const city = prayerSettings.location.city;
  const now = Date.now();

  for (let dayOffset = 0; dayOffset < SCHEDULE_AHEAD_DAYS; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const computed = computePrayerTimes(prayerSettings, date);

    for (const prayer of ALL_PRAYERS) {
      const cfg = settings.perPrayer[prayer];
      if (!cfg.enabled) continue;

      const entry = computed.prayers.find((p) => p.name === prayer);
      if (!entry) continue;

      const fireTime = entry.time.getTime();
      if (fireTime <= now + 1000) continue;

      const arabic = PRAYER_ARABIC[prayer];
      const english = PRAYER_ENGLISH[prayer];
      const formatted = formatPrayerTime(entry.time);
      const cityPart = city ? ` · ${city}` : '';

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: english,
            body: i18n.t('notifications.prayerNotif.body', { arabic, time: formatted, cityPart }),
            sound: soundForContent(cfg.sound),
            data: { tag: SCHEDULED_TAG, prayer, dayOffset },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: entry.time,
            ...(Platform.OS === 'android'
              ? { channelId: channelForChoice(cfg.sound) }
              : {}),
          },
        });
      } catch (err) {
        console.warn(`[notifications] schedule ${prayer} day ${dayOffset} failed`, err);
      }
    }
  }
}

async function scheduleTahajjudNotifications(
  settings: PrayerNotificationSettings,
  prayerSettings: PrayerTimesSettings,
): Promise<void> {
  await cancelExistingTahajjudNotifications();
  if (!settings.sunnah.tahajjud.enabled) return;

  const now = Date.now();

  for (let dayOffset = 0; dayOffset < SCHEDULE_AHEAD_DAYS; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);

    const fireAt = computeTahajjudStart(prayerSettings, date);
    if (!fireAt) continue;
    if (fireAt.getTime() <= now + 1000) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: getTahajjudTitle(),
          body: getTahajjudBody(),
          sound: 'default',
          data: { tag: TAHAJJUD_TAG, dayOffset },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_TAHAJJUD } : {}),
        },
      });
    } catch (err) {
      console.warn(`[notifications] schedule tahajjud day ${dayOffset} failed`, err);
    }
  }
}

// ─── Daily Hadith & Friday reminders ───────────────────────────────────────────
// These two reminders are stored in AsyncStorage (the `settings_*` keys written
// by the Settings screen), independent of the MMKV prayer-notification settings.
// Like Tahajjud, they are their own opt-in streams and are deliberately NOT
// gated by the prayer master toggle.

function parseHourMinute(
  value: string,
  fallbackHour: number,
  fallbackMinute: number,
): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number);
  if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }
  return { hour: h, minute: m };
}

async function scheduleDailyHadithNotification(): Promise<void> {
  await cancelByTag(DAILY_HADITH_TAG);

  const enabled = await getSetting<boolean>('daily_hadith', true);
  if (!enabled) return;

  const timeStr = await getSetting<string>('daily_hadith_time', '08:00');
  const { hour, minute } = parseHourMinute(timeStr, 8, 0);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.dailyHadithNotif.title'),
        body: i18n.t('notifications.dailyHadithNotif.body'),
        sound: 'default',
        data: { tag: DAILY_HADITH_TAG, route: '/hadith' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_GENERAL } : {}),
      },
    });
  } catch (err) {
    console.warn('[notifications] schedule daily hadith failed', err);
  }
}

async function scheduleFridayReminderNotification(): Promise<void> {
  await cancelByTag(FRIDAY_TAG);

  const enabled = await getSetting<boolean>('friday_reminder', true);
  if (!enabled) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.fridayNotif.title'),
        body: i18n.t('notifications.fridayNotif.body'),
        sound: 'default',
        // Al-Kahf is Surah 18 — deep-link straight to it on tap.
        data: { tag: FRIDAY_TAG, route: '/quran/18' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: FRIDAY_WEEKDAY,
        hour: FRIDAY_REMINDER_HOUR,
        minute: FRIDAY_REMINDER_MINUTE,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_GENERAL } : {}),
      },
    });
  } catch (err) {
    console.warn('[notifications] schedule friday reminder failed', err);
  }
}

// Serializes concurrent scheduler invocations. Without this, rapid toggles
// in settings can cancel notifications that a previous in-flight call is
// still creating, leading to a flaky "where did my notifications go" UX.
let inFlightSchedule: Promise<void> | null = null;

export async function scheduleNotificationsForNext7Days(): Promise<void> {
  if (Platform.OS === 'web') return;

  // If another schedule is mid-flight, wait for it to finish and then run
  // ours. Callers always get the freshest view of settings/prayer times.
  if (inFlightSchedule) {
    await inFlightSchedule.catch(() => {});
  }

  inFlightSchedule = (async () => {
    const perm = await getNotificationPermission();
    if (perm !== 'granted') {
      // Without permission, scheduling silently no-ops. UI is responsible
      // for surfacing the permission state to the user.
      return;
    }

    await ensureAndroidChannels();

    const settings = await getNotificationSettings();
    const prayerSettings = getPersistedSettings() ?? KARACHI_DEFAULT;

    // The two reminder streams are independent — the master prayer toggle
    // does not gate Tahajjud, and turning Tahajjud off does not touch the 5
    // daily prayers. Both refresh on the same 7-day window via the shared
    // timestamp.
    await schedulePrayerNotifications(settings, prayerSettings);
    await scheduleTahajjudNotifications(settings, prayerSettings);
    await scheduleDailyHadithNotification();
    await scheduleFridayReminderNotification();

    prefs.set(PREFS_KEYS.NOTIFICATIONS_LAST_SCHEDULED_AT, String(Date.now()));
    prefs.set(PREFS_KEYS.NOTIFICATIONS_LAST_TIMEZONE_OFFSET, String(new Date().getTimezoneOffset()));
  })();

  try {
    await inFlightSchedule;
  } finally {
    inFlightSchedule = null;
  }
}

/**
 * Called from app startup. No-op if last refresh is < 24h ago AND the device
 * timezone hasn't changed since the last schedule (timezone change usually
 * means a flight or DST shift, which invalidates the pre-scheduled absolute
 * Date objects in the OS queue).
 */
export async function refreshNotificationsIfStale(): Promise<void> {
  if (Platform.OS === 'web') return;
  const last = prefs.get(PREFS_KEYS.NOTIFICATIONS_LAST_SCHEDULED_AT);
  const lastTzRaw = prefs.get(PREFS_KEYS.NOTIFICATIONS_LAST_TIMEZONE_OFFSET);
  const lastMs = last ? Number(last) : 0;
  const lastTz = lastTzRaw != null ? Number(lastTzRaw) : NaN;
  const currentTz = new Date().getTimezoneOffset();

  const freshEnough = Number.isFinite(lastMs) && Date.now() - lastMs < REFRESH_INTERVAL_MS;
  const sameTimezone = Number.isFinite(lastTz) && lastTz === currentTz;

  if (freshEnough && sameTimezone) return;
  await scheduleNotificationsForNext7Days();
}

/**
 * Re-run the scheduler if conditions warrant it — used by an AppState→active
 * listener so notifications stay correct even when the app is left in
 * background across timezone changes, DST shifts, or just for >24h.
 */
export async function refreshNotificationsOnForeground(): Promise<void> {
  await refreshNotificationsIfStale();
}

// ─── Test ─────────────────────────────────────────────────────────────────────

export async function fireTestNotification(prayerName: PrayerName): Promise<void> {
  if (Platform.OS === 'web') return;

  const perm = await getNotificationPermission();
  if (perm !== 'granted') return;

  await ensureAndroidChannels();

  const settings = await getNotificationSettings();
  const cfg = settings.perPrayer[prayerName];
  const arabic = PRAYER_ARABIC[prayerName];
  const english = PRAYER_ENGLISH[prayerName];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.testNotif.title', { prayer: english }),
      body: i18n.t('notifications.testNotif.body', { arabic }),
      sound: soundForContent(cfg.sound),
      data: { tag: SCHEDULED_TAG, prayer: prayerName, test: true },
    },
    trigger: Platform.OS === 'android'
      ? { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelForChoice(cfg.sound) }
      : { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
}
