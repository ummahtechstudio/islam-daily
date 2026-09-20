/**
 * Local Expo module — Android "Alarms & reminders" (SCHEDULE_EXACT_ALARM).
 *
 * Android only. On iOS/web the native module does not exist and every call
 * degrades to "exact alarms are fine" so callers never need a platform check.
 * `requireOptionalNativeModule` also keeps Expo Go / builds made before this
 * module existed from throwing at import time.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type ExactAlarmNativeModule = {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
};

const native: ExactAlarmNativeModule | null =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<ExactAlarmNativeModule>('ExactAlarm')
    : null;

/**
 * True when the OS has the "Alarms & reminders" concept (Android 12+) — the
 * only platform where the permission can be off. Everything else always
 * schedules exactly.
 */
export const EXACT_ALARM_GATE_APPLIES: boolean =
  Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 31;

/** Whether the app may currently schedule exact alarms. Never throws. */
export function canScheduleExactAlarms(): boolean {
  if (!EXACT_ALARM_GATE_APPLIES || !native) return true;
  try {
    return native.canScheduleExactAlarms();
  } catch {
    return true;
  }
}

/**
 * Opens the system "Alarms & reminders" page for this app. Resolves false if
 * the page could not be opened (non-Android, missing module, OEM quirk).
 */
export function openExactAlarmSettings(): boolean {
  if (!EXACT_ALARM_GATE_APPLIES || !native) return false;
  try {
    return native.openExactAlarmSettings();
  } catch {
    return false;
  }
}
