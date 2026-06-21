import {
  CalculationMethod as AdhanMethod,
  Coordinates,
  Madhab as AdhanMadhab,
  PrayerTimes as AdhanPrayerTimes,
  SunnahTimes as AdhanSunnahTimes,
  HighLatitudeRule,
} from 'adhan';
import type {
  CalculationMethod,
  HighLatitudeRule as HighLatitudeRulePref,
  Madhab,
  PrayerTimesSettings,
  ComputedPrayerTimes,
  PrayerName,
} from '../types/prayerTimes';
import { prefs, PREFS_KEYS } from '../lib/storage';

function getCalculationParams(
  method: CalculationMethod,
  madhab: Madhab,
  rule: HighLatitudeRulePref,
) {
  let params;
  switch (method) {
    case 'Karachi':               params = AdhanMethod.Karachi(); break;
    case 'Dubai':                 params = AdhanMethod.Dubai(); break;
    case 'UmmAlQura':             params = AdhanMethod.UmmAlQura(); break;
    case 'Egyptian':              params = AdhanMethod.Egyptian(); break;
    case 'Turkey':                params = AdhanMethod.Turkey(); break;
    case 'Singapore':             params = AdhanMethod.Singapore(); break;
    case 'MuslimWorldLeague':     params = AdhanMethod.MuslimWorldLeague(); break;
    case 'NorthAmerica':          params = AdhanMethod.NorthAmerica(); break;
    case 'MoonsightingCommittee': params = AdhanMethod.MoonsightingCommittee(); break;
    case 'Tehran':                params = AdhanMethod.Tehran(); break;
    default:                      params = AdhanMethod.MuslimWorldLeague();
  }
  params.madhab = madhab === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  params.highLatitudeRule =
    rule === 'seventhOfTheNight'
      ? HighLatitudeRule.SeventhOfTheNight
      : rule === 'twilightAngle'
        ? HighLatitudeRule.TwilightAngle
        : HighLatitudeRule.MiddleOfTheNight;
  return params;
}

const PRAYER_TO_NAME: Record<string, PrayerName | null> = {
  fajr: 'fajr',
  sunrise: 'sunrise',
  dhuhr: 'dhuhr',
  asr: 'asr',
  maghrib: 'maghrib',
  isha: 'isha',
  none: null,
};

export function computePrayerTimes(
  settings: PrayerTimesSettings,
  date: Date = new Date()
): ComputedPrayerTimes {
  const coords = new Coordinates(settings.location.latitude, settings.location.longitude);
  const params = getCalculationParams(
    settings.method,
    settings.madhab,
    settings.highLatitudeRule,
  );

  const today = new AdhanPrayerTimes(coords, date, params);

  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowPrayers = new AdhanPrayerTimes(coords, tomorrow, params);
  const sunnah = new AdhanSunnahTimes(today);

  const isFriday = date.getDay() === 5;

  const prayers = [
    { name: 'fajr' as PrayerName,    time: today.fajr },
    { name: 'sunrise' as PrayerName, time: today.sunrise },
    { name: 'dhuhr' as PrayerName,   time: today.dhuhr, isFriday },
    { name: 'asr' as PrayerName,     time: today.asr },
    { name: 'maghrib' as PrayerName, time: today.maghrib },
    { name: 'isha' as PrayerName,    time: today.isha },
  ];

  const currentRaw = today.currentPrayer();
  const nextRaw = today.nextPrayer();
  const currentPrayer = PRAYER_TO_NAME[currentRaw] ?? null;
  // After Isha, adhan returns 'none' for the next prayer until local midnight,
  // even though the next prayer really is tomorrow's Fajr (nextPrayerTime is set
  // to it just below). Surface 'fajr' so the next-prayer card shows Fajr with
  // tomorrow's time instead of vanishing for the rest of the night.
  const nextPrayer: PrayerName | null =
    nextRaw === 'none' ? 'fajr' : (PRAYER_TO_NAME[nextRaw] ?? null);

  let nextPrayerTime: Date | null = null;
  if (nextRaw !== 'none') {
    nextPrayerTime = today.timeForPrayer(nextRaw);
  }
  if (!nextPrayerTime) {
    nextPrayerTime = tomorrowPrayers.fajr;
  }

  return {
    date,
    prayers,
    sunnah: {
      middleOfTheNight: sunnah.middleOfTheNight,
      lastThirdOfTheNight: sunnah.lastThirdOfTheNight,
    },
    currentPrayer,
    nextPrayer,
    nextPrayerTime,
  };
}

export function autoDetectMethodAndMadhab(
  countryCode: string
): { method: CalculationMethod; madhab: Madhab } {
  const code = countryCode.toUpperCase();
  if (['PK', 'IN', 'BD'].includes(code)) return { method: 'Karachi', madhab: 'hanafi' };
  if (code === 'AE') return { method: 'Dubai', madhab: 'shafi' };
  if (code === 'SA') return { method: 'UmmAlQura', madhab: 'shafi' };
  if (code === 'EG') return { method: 'Egyptian', madhab: 'shafi' };
  if (code === 'TR') return { method: 'Turkey', madhab: 'hanafi' };
  if (['SG', 'MY'].includes(code)) return { method: 'Singapore', madhab: 'shafi' };
  if (['US', 'CA'].includes(code)) return { method: 'NorthAmerica', madhab: 'shafi' };
  return { method: 'MuslimWorldLeague', madhab: 'shafi' };
}

export function getPersistedSettings(): PrayerTimesSettings | null {
  return prefs.getJSON<PrayerTimesSettings>(PREFS_KEYS.PRAYER_TIMES_SETTINGS);
}

export function persistSettings(settings: PrayerTimesSettings): void {
  prefs.setJSON(PREFS_KEYS.PRAYER_TIMES_SETTINGS, settings);
}

export const KARACHI_DEFAULT: PrayerTimesSettings = {
  location: {
    latitude: 24.8607,
    longitude: 67.0011,
    city: 'Karachi',
    country: 'Pakistan',
    countryCode: 'PK',
  },
  method: 'Karachi',
  madhab: 'hanafi',
  iqamahOffsets: null,
  highLatitudeRule: 'middleOfTheNight',
};

// One-time cleanup for devices that persisted "Unknown" city/country before
// the P.1b/R.2 guards landed. Safe to call on every startup — no-op when the
// persisted settings are valid or absent.
export function migrateInvalidPersistedSettings(): void {
  const persisted = getPersistedSettings();
  if (!persisted) return;

  const isInvalid =
    persisted.location.city === 'Unknown' ||
    persisted.location.country === 'Unknown' ||
    !persisted.location.city ||
    !persisted.location.country;

  if (isInvalid) {
    persistSettings(KARACHI_DEFAULT);
  }
}
