import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';

import { prefs, PREFS_KEYS } from '../lib/storage';
import {
  computePrayerTimes,
  getPersistedSettings,
  KARACHI_DEFAULT,
} from './prayerTimesService';
import { formatPrayerTime } from '../utils/formatPrayerTime';
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

// Android notification channels — one per sound choice. On API 26+, the
// channel determines the sound, not the per-notification field.
const CHANNEL_ADHAN = 'prayer-adhan';
const CHANNEL_SYSTEM = 'prayer-system';
const CHANNEL_SILENT = 'prayer-silent';
const CHANNEL_TAHAJJUD = 'sunnah-tahajjud';

const TAHAJJUD_TITLE = 'Tahajjud — The Last Third of the Night';
const TAHAJJUD_BODY =
  '"And rise at night and pray, as an extra offering — that your Lord may raise you to a praiseworthy station." (Quran 17:79)';

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
function mergeWithDefaults(
  s: PrayerNotificationSettings,
): PrayerNotificationSettings {
  const merged: PrayerNotificationSettings = {
    enabled: s.enabled,
    perPrayer: { ...DEFAULT_NOTIFICATION_SETTINGS.perPrayer },
    sunnah: { ...DEFAULT_NOTIFICATION_SETTINGS.sunnah },
  };
  for (const p of ALL_PRAYERS) {
    if (s.perPrayer && s.perPrayer[p]) {
      merged.perPrayer[p] = s.perPrayer[p];
    }
  }
  if (s.sunnah?.tahajjud) {
    merged.sunnah.tahajjud = s.sunnah.tahajjud;
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
  prefs.delete(PREFS_KEYS.NOTIFICATIONS_LAST_SCHEDULED_AT);
}

/**
 * Tahajjud time = the start of the last third of the night.
 *
 *   night     = next-day Fajr  −  today's Maghrib
 *   tahajjud  = next-day Fajr  −  (night / 3)
 *
 * Maghrib and Fajr come from the existing prayer-times service — no hardcoded
 * times. Returns null if either prayer can't be resolved (defensive only).
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

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: english,
            body: `${arabic} · ${formatted}${city ? ` · ${city}` : ''}`,
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
          title: TAHAJJUD_TITLE,
          body: TAHAJJUD_BODY,
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

export async function scheduleNotificationsForNext7Days(): Promise<void> {
  if (Platform.OS === 'web') return;

  const perm = await getNotificationPermission();
  if (perm !== 'granted') {
    // Without permission, scheduling silently no-ops. UI is responsible
    // for surfacing the permission state to the user.
    return;
  }

  await ensureAndroidChannels();

  const settings = await getNotificationSettings();
  const prayerSettings = getPersistedSettings() ?? KARACHI_DEFAULT;

  // The two reminder streams are independent — the master prayer toggle does
  // not gate Tahajjud, and turning Tahajjud off does not touch the 5 daily
  // prayers. Both refresh on the same 7-day window via the shared timestamp.
  await schedulePrayerNotifications(settings, prayerSettings);
  await scheduleTahajjudNotifications(settings, prayerSettings);

  prefs.set(PREFS_KEYS.NOTIFICATIONS_LAST_SCHEDULED_AT, String(Date.now()));
}

/**
 * Called from app startup. No-op if last refresh is < 24h ago.
 */
export async function refreshNotificationsIfStale(): Promise<void> {
  if (Platform.OS === 'web') return;
  const last = prefs.get(PREFS_KEYS.NOTIFICATIONS_LAST_SCHEDULED_AT);
  const lastMs = last ? Number(last) : 0;
  if (Number.isFinite(lastMs) && Date.now() - lastMs < REFRESH_INTERVAL_MS) {
    return;
  }
  await scheduleNotificationsForNext7Days();
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
      title: `${english} · Test`,
      body: `${arabic} · test notification`,
      sound: soundForContent(cfg.sound),
      data: { tag: SCHEDULED_TAG, prayer: prayerName, test: true },
    },
    trigger: Platform.OS === 'android'
      ? { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelForChoice(cfg.sound) }
      : { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
}
