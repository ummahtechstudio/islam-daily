import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import {
  getPersistedSettings,
  persistSettings,
  autoDetectMethodAndMadhab,
  KARACHI_DEFAULT,
} from '../services/prayerTimesService';
import type { PrayerTimesSettings } from '../types/prayerTimes';

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

  const top = reverse[0];
  if (!looksUseful(top)) {
    return { settings: KARACHI_DEFAULT, source: 'fallback' };
  }

  const countryCode = top.isoCountryCode ?? 'PK';
  const { method, madhab } = autoDetectMethodAndMadhab(countryCode);

  const resolved: PrayerTimesSettings = {
    location: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      city: top.city ?? top.region ?? '',
      country: top.country ?? '',
      countryCode,
    },
    method,
    madhab,
    iqamahOffsets: null,
    highLatitudeRule: 'middleOfTheNight',
  };

  return { settings: resolved, source: 'gps' };
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
      const result = await resolveFromGps();
      if (cancelled) return;
      persistSettings(result.settings);
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
    persistSettings(result.settings);
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
