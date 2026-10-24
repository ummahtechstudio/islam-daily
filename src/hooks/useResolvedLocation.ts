import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import {
  getPersistedSettings,
  persistSettings,
  autoDetectMethodAndMadhab,
  KARACHI_DEFAULT,
} from '../services/prayerTimesService';
import type { PrayerTimesSettings } from '../types/prayerTimes';
import { nearestBundledCity } from '../utils/nearestCity';

export type LocationSource = 'cached' | 'gps' | 'fallback' | 'manual';

export type LocationResolution = {
  settings: PrayerTimesSettings;
  source: LocationSource;
  loading: boolean;
  refreshFromGps: () => Promise<void>;
  setManualSettings: (next: PrayerTimesSettings) => void;
  /** Re-read the persisted settings from storage. Use on focus return. */
  reload: () => void;
};

// Defense in depth: never persist a settings object with missing/"Unknown" city
// or country. If reverse geocoding returned nothing useful (empty array, missing
// fields, or whitespace-only strings), the caller must fall back to KARACHI_DEFAULT.
function looksUseful(top: Location.LocationGeocodedAddress | undefined): boolean {
  if (!top) return false;
  const city = top.city ?? top.region ?? '';
  const country = top.country ?? '';
  return city.trim().length > 0 && country.trim().length > 0;
}

async function resolveFromGps(): Promise<{
  settings: PrayerTimesSettings;
  source: 'gps' | 'fallback';
}> {
  let permStatus: Location.PermissionStatus;
  try {
    const res = await Location.requestForegroundPermissionsAsync();
    permStatus = res.status;
  } catch {
    return { settings: KARACHI_DEFAULT, source: 'fallback' };
  }

  if (permStatus !== 'granted') {
    return { settings: KARACHI_DEFAULT, source: 'fallback' };
  }

  let pos: Location.LocationObject;
  try {
    pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return { settings: KARACHI_DEFAULT, source: 'fallback' };
  }

  let reverse: Location.LocationGeocodedAddress[] = [];
  try {
    reverse = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
  } catch {
    reverse = [];
  }

  const { latitude, longitude } = pos.coords;
  const top = reverse[0];
  let city: string;
  let country: string;
  let countryCode: string;
  if (looksUseful(top)) {
    city = top.city ?? top.region ?? '';
    country = top.country ?? '';
    countryCode = top.isoCountryCode ?? '';
  } else {
    // Reverse geocoding is unavailable offline, on devices without a geocoder,
    // and on web. The GPS fix itself is still exact — keep it (prayer times
    // depend only on the coordinates) and label it from the bundled city list.
    // Previously this case threw the fix away and used Karachi.
    const near = nearestBundledCity(latitude, longitude);
    const closeBy = near && near.km <= 50;
    const sameRegion = near && near.km <= 300;
    city = closeBy
      ? near.city.name
      : `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
    country = sameRegion ? near.city.country : 'GPS';
    countryCode = sameRegion ? near.city.countryCode : '';
  }

  const { method, madhab } = autoDetectMethodAndMadhab(countryCode);

  const resolved: PrayerTimesSettings = {
    location: {
      latitude,
      longitude,
      city,
      country,
      countryCode,
    },
    method,
    madhab,
    iqamahOffsets: null,
    // Preserve the user's chosen high-latitude rule instead of resetting it on
    // every GPS refresh (it's persisted in settings.highLatitudeRule).
    highLatitudeRule: getPersistedSettings()?.highLatitudeRule ?? 'middleOfTheNight',
  };

  return { settings: resolved, source: 'gps' };
}

// One GPS resolution per app session, shared by every screen that mounts this
// hook before a location is saved (avoids parallel permission prompts). A hard
// fallback (permission denied / no fix) is remembered for the session only —
// it is NOT persisted, so the next launch tries GPS again instead of keeping
// Karachi forever.
let sessionResolution: Promise<{ settings: PrayerTimesSettings; source: 'gps' | 'fallback' }> | null = null;

function persistIfReal(result: { settings: PrayerTimesSettings; source: 'gps' | 'fallback' }) {
  if (result.source === 'gps') persistSettings(result.settings);
}

export function useResolvedLocation(): LocationResolution {
  const cached = getPersistedSettings();
  const [settings, setSettings] = useState<PrayerTimesSettings>(cached ?? KARACHI_DEFAULT);
  const [source, setSource] = useState<LocationSource>(cached ? 'cached' : 'fallback');
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;

    let cancelled = false;
    (async () => {
      if (!sessionResolution) sessionResolution = resolveFromGps();
      const result = await sessionResolution;
      if (cancelled) return;
      persistIfReal(result);
      setSettings(result.settings);
      setSource(result.source);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshFromGps = useCallback(async () => {
    setLoading(true);
    const result = await resolveFromGps();
    sessionResolution = Promise.resolve(result);
    // A failed refresh must not overwrite a location the user already has.
    if (result.source === 'gps') {
      persistSettings(result.settings);
    } else {
      const saved = getPersistedSettings();
      if (saved) {
        setSettings(saved);
        setSource('cached');
        setLoading(false);
        return;
      }
    }
    setSettings(result.settings);
    setSource(result.source);
    setLoading(false);
  }, []);

  const setManualSettings = useCallback((next: PrayerTimesSettings) => {
    persistSettings(next);
    setSettings(next);
    setSource('manual');
    setLoading(false);
  }, []);

  const reload = useCallback(() => {
    const fresh = getPersistedSettings();
    if (fresh) {
      setSettings(fresh);
      setSource((s) => (s === 'fallback' || s === 'cached' ? 'cached' : s));
      setLoading(false);
    }
  }, []);

  return { settings, source, loading, refreshFromGps, setManualSettings, reload };
}
