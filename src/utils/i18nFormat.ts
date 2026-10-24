/**
 * Date / countdown strings that follow the UI language. The raw helpers in
 * formatPrayerTime.ts stay English-only (notifications, logs, tests); screens
 * use these so the Urdu UI never shows "in 2h 33m" or "Jumada I 13, 1448 AH".
 */
import type { TFunction } from 'i18next';

import { countdownParts, getHijriParts } from './formatPrayerTime';

export function formatCountdownT(t: TFunction, target: Date, now: Date = new Date()): string {
  const c = countdownParts(target, now);
  switch (c.kind) {
    case 'now': return t('common.countdown.now');
    case 'lt1': return t('common.countdown.lessThanMinute');
    case 'm': return t('common.countdown.minutes', { m: c.m });
    // Urdu needs the singular گھنٹہ for exactly one hour.
    case 'h': return c.h === 1 ? t('common.countdown.hoursOne') : t('common.countdown.hours', { h: c.h });
    default:
      return c.h === 1
        ? t('common.countdown.hoursOneMinutes', { m: c.m })
        : t('common.countdown.hoursMinutes', { h: c.h, m: c.m });
  }
}

/** "13 Jumada al-Awwal 1448 AH" / "13 جمادی الاول 1448 ہجری" (Umm al-Qura). */
export function formatHijriDateT(t: TFunction, date: Date = new Date()): string {
  const h = getHijriParts(date);
  if (h.month < 1 || h.month > 12 || !h.day || !h.year) return '';
  return t('common.hijriDate', {
    day: h.day,
    monthName: t(`calendar.hijriMonths.${h.month}`),
    year: h.year,
  });
}

/** Locale for Intl date formatting that matches the UI language. */
export function dateLocale(lang: string | undefined): string {
  return lang === 'ur' ? 'ur-PK' : 'en-GB';
}
