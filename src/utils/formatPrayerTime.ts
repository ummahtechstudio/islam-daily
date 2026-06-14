import { prefs, PREFS_KEYS } from '../lib/storage';
import type { PrayerTimesSettings } from '../types/prayerTimes';

export type TimeFormatPref = 'auto' | '12h' | '24h';

/** Countries where 12-hour clocks are culturally expected even on 24h-locale devices. */
const TWELVE_HOUR_REGIONS = new Set(['PK', 'IN', 'BD', 'AE', 'SA', 'OM', 'QA', 'KW', 'BH']);

function getDeviceHour12(): boolean {
  try {
    return (
      new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? true
    );
  } catch {
    return true;
  }
}

export function getTimeFormatPref(): TimeFormatPref {
  const raw = prefs.get(PREFS_KEYS.PRAYER_TIMES_FORMAT);
  if (raw === '12h' || raw === '24h' || raw === 'auto') return raw;
  return 'auto';
}

export function setTimeFormatPref(value: TimeFormatPref): void {
  prefs.set(PREFS_KEYS.PRAYER_TIMES_FORMAT, value);
}

function resolveHour12(): boolean {
  const pref = getTimeFormatPref();
  if (pref === '12h') return true;
  if (pref === '24h') return false;

  // auto: prefer regional norm if we know the user's country
  const settings = prefs.getJSON<PrayerTimesSettings>(PREFS_KEYS.PRAYER_TIMES_SETTINGS);
  const code = settings?.location.countryCode?.toUpperCase();
  if (code && TWELVE_HOUR_REGIONS.has(code)) return true;

  return getDeviceHour12();
}

export function formatPrayerTime(date: Date, opts?: { hour12?: boolean }): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: opts?.hour12 ?? resolveHour12(),
  }).format(date);
}

export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'now';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `in ${hours}h`;
  return `in ${hours}h ${remMins}m`;
}

/**
 * Returns Hijri date as a single string ending in "AH". Some browsers' Intl
 * output already includes the era suffix; we normalise so callers never need
 * to append "AH" themselves (and never get the doubled "AH AH").
 */
export function formatHijriDate(date: Date = new Date()): string {
  let raw = '';
  try {
    raw = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
  if (!raw) return '';
  // Strip any trailing era marker (AH / A.H.) the locale may have appended,
  // then re-add a single canonical " AH".
  const cleaned = raw.replace(/\s*A\.?H\.?\s*$/i, '').trim();
  return `${cleaned} AH`;
}

// Single shared Umm al-Qura formatter. Building an Intl.DateTimeFormat is
// relatively expensive, and the calendar grid converts ~42 dates per render,
// so we cache one instance and reuse it.
let hijriPartsFormatter: Intl.DateTimeFormat | null = null;
function getHijriPartsFormatter(): Intl.DateTimeFormat {
  if (!hijriPartsFormatter) {
    hijriPartsFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  }
  return hijriPartsFormatter;
}

/**
 * Hijri date as numeric parts via the Umm al-Qura calendar (Intl
 * 'islamic-umalqura') — the SINGLE source of truth for Hijri dates across the
 * app (Home greeting, calendar grid + event matching, Ramadan detection).
 * `month` is 1–12. Returns zeros if the engine can't resolve the calendar
 * (defensive only — the same calendar already powers formatHijriDate).
 */
export function getHijriParts(date: Date = new Date()): { day: number; month: number; year: number } {
  try {
    const parts = getHijriPartsFormatter().formatToParts(date);
    let day = 0;
    let month = 0;
    let year = 0;
    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      else if (p.type === 'month') month = parseInt(p.value, 10);
      else if (p.type === 'year') year = parseInt(p.value, 10);
    }
    return { day, month, year };
  } catch {
    return { day: 0, month: 0, year: 0 };
  }
}
