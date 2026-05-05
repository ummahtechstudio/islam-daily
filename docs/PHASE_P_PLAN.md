# Phase P.1a — Prayer Times Foundation (calc + display only)

## Scope (intentionally narrow)

**This phase builds:**
- The prayer times calculation service (using `adhan` package, pure JS)
- A display-only Prayer Times screen accessible from a Home tab card
- Location permission flow with **graceful fallback to a hardcoded default city** if denied (Karachi, Pakistan) — no manual city picker UI yet
- Auto-detect calculation method + madhab from country
- Sunnah times (Tahajjud window) — collapsible
- Persist user's resolved location/method/madhab to MMKV

**This phase does NOT build (deferred to P.1b tomorrow):**
- Manual city picker UI (with bundled 50-city list)
- Settings screen (method/madhab/format overrides)
- Bottom-nav swap (Search → Prayer)
- Notification scheduling
- Adhan audio

The deferred items are for tomorrow's P.1b session. Stay strictly inside this scope today.

---

## Decisions (locked, do not deviate)

1. **Library:** pure JS `adhan` package only. No `react-native-adhan`, no native config.
2. **Hijri date:** use built-in `Intl.DateTimeFormat` with `islamic-umalqura` calendar. **Do NOT install `moment-hijri`** — pushback accepted from earlier review.
3. **Default time format:** locale-aware via `new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12`. Don't hardcode 12h.
4. **Auto-detect rules:**
   - Country = Pakistan/India/Bangladesh → method `Karachi`, madhab `hanafi`
   - Country = UAE → method `Dubai`, madhab `shafi`
   - Country = Saudi Arabia → method `UmmAlQura`, madhab `shafi`
   - Country = Egypt → method `Egyptian`, madhab `shafi`
   - Country = Turkey → method `Turkey`, madhab `hanafi`
   - Country = Singapore/Malaysia → method `Singapore`, madhab `shafi`
   - **Otherwise (including unknown country) → method `MuslimWorldLeague`, madhab `shafi`** — explicit fallback for any country not in the list
5. **No pulse animation** on next-prayer card (battery/perf). Static layout, countdown updates once per minute via `setInterval`.
6. **Friday handling:** auto-replace "Dhuhr" label with "Jumu'ah" on Fridays (`new Date().getDay() === 5`).
7. **Iqamah stub fields:** include `iqamah_offsets` JSON column or in-memory shape now even though unused, so v1.1 doesn't need a migration. Specifically, define the type:
   ```ts
   type IqamahOffsets = {
     fajr?: number;    // minutes after adhan
     dhuhr?: number;
     asr?: number;
     maghrib?: number;
     isha?: number;
   };
   ```
   Stored on the prayer-times settings object but always `null` for now. This is forward-compatibility, no UI exposure.
8. **High latitude rule:** default `MiddleOfTheNight`, no UI exposure (settings deferred to P.1b).
9. **Permission denied / location off:** fall back to `Karachi, Pakistan` (24.8607, 67.0011) as default coordinates with a small inline notice on the screen: "Showing prayer times for Karachi. Tap to change." The "tap to change" is a no-op for this phase (P.1b adds the picker) — but DO render the notice.
10. **SunnahTimes 2-day window:** when calculating SunnahTimes, pass *tomorrow's* PrayerTimes object too, because Sunnah times need tomorrow's Fajr to compute the last-third-of-night correctly. Don't miss this — it's a common bug.

---

## Implementation

### 1. Install dependencies

```
npm install adhan expo-location
```

`expo-location` should already be installed if Mosque Finder uses it — verify first.

### 2. Types

Create `src/types/prayerTimes.ts`:

```ts
export type CalculationMethod =
  | 'Karachi'
  | 'Dubai'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Turkey'
  | 'Singapore'
  | 'MuslimWorldLeague'
  | 'NorthAmerica'
  | 'MoonsightingCommittee'
  | 'Tehran';

export type Madhab = 'hanafi' | 'shafi';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerTimesEntry = {
  name: PrayerName;
  time: Date;          // local time as JS Date
  isFriday?: boolean;  // for Dhuhr → Jumu'ah display
};

export type SunnahTimesEntry = {
  middleOfTheNight: Date;
  lastThirdOfTheNight: Date;
};

export type IqamahOffsets = {
  fajr?: number;
  dhuhr?: number;
  asr?: number;
  maghrib?: number;
  isha?: number;
};

export type PrayerTimesLocation = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  countryCode: string;  // ISO 3166-1 alpha-2 (PK, AE, SA, etc.)
};

export type PrayerTimesSettings = {
  location: PrayerTimesLocation;
  method: CalculationMethod;
  madhab: Madhab;
  iqamahOffsets: IqamahOffsets | null;  // forward-compat, always null in P.1a
  highLatitudeRule: 'middleOfTheNight';  // hardcoded, settings UI in P.1b
};

export type ComputedPrayerTimes = {
  date: Date;
  prayers: PrayerTimesEntry[];
  sunnah: SunnahTimesEntry;
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName | null;
  nextPrayerTime: Date | null;
};
```

### 3. Calculation service

Create `src/services/prayerTimesService.ts`:

```ts
import {
  CalculationMethod as AdhanMethod,
  Coordinates,
  Madhab as AdhanMadhab,
  PrayerTimes as AdhanPrayerTimes,
  SunnahTimes as AdhanSunnahTimes,
  HighLatitudeRule,
  Prayer,
} from 'adhan';
import type {
  CalculationMethod,
  Madhab,
  PrayerTimesSettings,
  ComputedPrayerTimes,
  PrayerName,
} from '../types/prayerTimes';
import { prefs, PREFS_KEYS } from '../lib/storage';

// Map our method strings to adhan's CalculationMethod factory functions
function getCalculationParams(method: CalculationMethod, madhab: Madhab) {
  let params;
  switch (method) {
    case 'Karachi':           params = AdhanMethod.Karachi(); break;
    case 'Dubai':             params = AdhanMethod.Dubai(); break;
    case 'UmmAlQura':         params = AdhanMethod.UmmAlQura(); break;
    case 'Egyptian':          params = AdhanMethod.Egyptian(); break;
    case 'Turkey':            params = AdhanMethod.Turkey(); break;
    case 'Singapore':         params = AdhanMethod.Singapore(); break;
    case 'MuslimWorldLeague': params = AdhanMethod.MuslimWorldLeague(); break;
    case 'NorthAmerica':      params = AdhanMethod.NorthAmerica(); break;
    case 'MoonsightingCommittee': params = AdhanMethod.MoonsightingCommittee(); break;
    case 'Tehran':            params = AdhanMethod.Tehran(); break;
    default:                  params = AdhanMethod.MuslimWorldLeague();
  }
  params.madhab = madhab === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;
  return params;
}

export function computePrayerTimes(
  settings: PrayerTimesSettings,
  date: Date = new Date()
): ComputedPrayerTimes {
  const coords = new Coordinates(settings.location.latitude, settings.location.longitude);
  const params = getCalculationParams(settings.method, settings.madhab);

  const today = new AdhanPrayerTimes(coords, date, params);

  // SunnahTimes needs tomorrow's PrayerTimes too — IMPORTANT
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowPrayers = new AdhanPrayerTimes(coords, tomorrow, params);
  const sunnah = new AdhanSunnahTimes(today);  // adhan handles 2-day internally if you pass today's

  const isFriday = date.getDay() === 5;

  const prayers = [
    { name: 'fajr' as PrayerName,    time: today.fajr },
    { name: 'sunrise' as PrayerName, time: today.sunrise },
    { name: 'dhuhr' as PrayerName,   time: today.dhuhr, isFriday },
    { name: 'asr' as PrayerName,     time: today.asr },
    { name: 'maghrib' as PrayerName, time: today.maghrib },
    { name: 'isha' as PrayerName,    time: today.isha },
  ];

  // Determine current and next prayer
  const currentEnum = today.currentPrayer();
  const nextEnum = today.nextPrayer();
  const enumToName = (p: Prayer): PrayerName | null => {
    if (p === Prayer.Fajr) return 'fajr';
    if (p === Prayer.Sunrise) return 'sunrise';
    if (p === Prayer.Dhuhr) return 'dhuhr';
    if (p === Prayer.Asr) return 'asr';
    if (p === Prayer.Maghrib) return 'maghrib';
    if (p === Prayer.Isha) return 'isha';
    return null;
  };

  const currentPrayer = enumToName(currentEnum);
  const nextPrayer = enumToName(nextEnum);
  const nextPrayerTime = nextPrayer
    ? today.timeForPrayer(nextEnum) ?? tomorrowPrayers.fajr  // wrap to tomorrow's Fajr after Isha
    : tomorrowPrayers.fajr;

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

// Auto-detect method + madhab from country code
export function autoDetectMethodAndMadhab(countryCode: string): { method: CalculationMethod; madhab: Madhab } {
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

// Persistence helpers
const KEY = 'prayer_times_settings';

export function getPersistedSettings(): PrayerTimesSettings | null {
  return prefs.getJSON<PrayerTimesSettings>(KEY);
}

export function persistSettings(settings: PrayerTimesSettings): void {
  prefs.setJSON(KEY, settings);
}

// Default fallback location: Karachi
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
```

Add a corresponding key to `src/lib/storage.ts` `PREFS_KEYS` registry: `PRAYER_TIMES_SETTINGS: 'prayer_times_settings'`.

### 4. Location detection hook

Create `src/hooks/useResolvedLocation.ts`:

```ts
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  getPersistedSettings,
  persistSettings,
  autoDetectMethodAndMadhab,
  KARACHI_DEFAULT,
} from '../services/prayerTimesService';
import type { PrayerTimesSettings } from '../types/prayerTimes';

export type LocationResolution = {
  settings: PrayerTimesSettings;
  source: 'cached' | 'gps' | 'fallback';
  loading: boolean;
};

export function useResolvedLocation(): LocationResolution {
  const cached = getPersistedSettings();
  const [settings, setSettings] = useState<PrayerTimesSettings>(cached ?? KARACHI_DEFAULT);
  const [source, setSource] = useState<'cached' | 'gps' | 'fallback'>(cached ? 'cached' : 'fallback');
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return; // Already resolved

    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            persistSettings(KARACHI_DEFAULT);
            setSettings(KARACHI_DEFAULT);
            setSource('fallback');
            setLoading(false);
          }
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const reverse = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

        const top = reverse[0];
        const countryCode = top?.isoCountryCode ?? 'PK';
        const { method, madhab } = autoDetectMethodAndMadhab(countryCode);

        const resolved: PrayerTimesSettings = {
          location: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city: top?.city ?? top?.region ?? 'Unknown',
            country: top?.country ?? 'Unknown',
            countryCode,
          },
          method,
          madhab,
          iqamahOffsets: null,
          highLatitudeRule: 'middleOfTheNight',
        };

        if (!cancelled) {
          persistSettings(resolved);
          setSettings(resolved);
          setSource('gps');
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          persistSettings(KARACHI_DEFAULT);
          setSettings(KARACHI_DEFAULT);
          setSource('fallback');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { settings, source, loading };
}
```

### 5. Prayer Times screen

Create `app/prayer-times.tsx`:

A full-screen route. The Home tab card (next step) will navigate here.

Layout:
- Header: city name, method badge, madhab badge, today's Gregorian + Hijri date
- Hijri date via:
  ```ts
  new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date())
  ```
  Wrap in try/catch in case browser doesn't support — fallback to empty string.
- Next prayer card: name, countdown ("in 2h 17m" — implement `formatCountdown` util), time, no pulse animation
- Prayer list:
  - Each row: prayer name (Arabic + English), time (locale-aware format)
  - Current prayer: green left border + soft green background tint
  - Past prayers: muted text
  - Friday: Dhuhr labeled "Jumu'ah" (الجمعة)
- Sunnah Times collapsible (default collapsed): chevron toggle; reveals "Last Third of Night" + "Middle of Night" with times
- Inline notice if `source === 'fallback'`: "Showing prayer times for Karachi. Tap to change." (button does nothing for now — log a console.info "Manual city picker coming soon")
- Theme: green `#0F6E56` borders, gold `#EF9F27` accents, cream `#FBF6E4` for header card background to match Mushaf

Use `useResolvedLocation()` to get settings, then `computePrayerTimes(settings)` memoized via `useMemo([settings, currentMinute])`.

For the "current minute" countdown updater:
```ts
const [tick, setTick] = useState(Date.now());
useEffect(() => {
  const i = setInterval(() => setTick(Date.now()), 60_000);
  return () => clearInterval(i);
}, []);
```

This re-renders once per minute, refreshing the countdown without burning battery on per-second updates.

### 6. Home tab card

In the existing Home tab component, add a new card at the top (above Daily Knowledge):

- Compact card showing:
  - "Next: **Asr**" (or whatever's next)
  - Big time: "5:42 PM"
  - Small countdown below: "in 2h 17m"
  - Small location subtitle: "📍 Karachi · Karachi method"
- Tap anywhere on card → `router.push('/prayer-times')`
- Same green/gold theme

If `useResolvedLocation` is still loading, show a skeleton placeholder (3 gray bars).

### 7. Locale-aware time formatting

Create `src/utils/formatPrayerTime.ts`:

```ts
const hour12 = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
  .resolvedOptions().hour12 ?? true;

export function formatPrayerTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
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
```

---

## Constraints

- **DO NOT** build manual city picker (deferred to P.1b)
- **DO NOT** build settings screen (deferred to P.1b)
- **DO NOT** swap bottom nav (deferred to P.1b)
- **DO NOT** install `moment-hijri` — use built-in `Intl`
- **DO NOT** add pulse animations
- **DO NOT** schedule notifications
- DO follow existing code style (theme tokens from constants, MMKV via `prefs`/`cache`, SSR-safe storage from O.1.1)
- DO keep TypeScript strict — `npx tsc --noEmit` must be clean

## Verification (print at end)

1. `npm install adhan` succeeded — print version
2. Files created (paths)
3. Files modified (paths)
4. `npx tsc --noEmit` output (clean)
5. Steps for Luqman to test on web:
   - `npx expo start`, press `w`
   - Open Home tab — see new "Next prayer" card at top with countdown
   - Web won't have GPS, so it should fall back to Karachi default with the inline notice
   - Tap card → navigates to `/prayer-times`
   - Prayer Times screen shows all 5 prayers + Sunrise, today's Hijri date, current prayer highlighted, Sunnah Times collapsible
   - Today is Tuesday (not Friday), so Dhuhr should show as "Dhuhr" not "Jumu'ah"
   - Wait one minute — countdown ticks down by ~1 minute
6. Note any edge case the implementation defers (e.g., "Hijri date may be 1 day off in some locales — acceptable for v1")
