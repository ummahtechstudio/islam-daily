import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS } from '../constants';
import { KARACHI_DEFAULT } from '../services/prayerTimesService';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

// Non-Kaaba fallback, shared with useResolvedLocation's default. Using the
// Kaaba's own coordinates here (the old behaviour) made the Qibla bearing
// compute to a confident, aligned "0.0°" — greatCircleBearing(Kaaba, Kaaba) is
// 0 — as if the user were standing inside the Haram. Falling back to Karachi and
// flagging it `isFallback` lets the screen show an honest "approximate" hint
// instead of a precise-looking wrong direction.
const FALLBACK_LOCATION: LocationData = {
  latitude: KARACHI_DEFAULT.location.latitude,
  longitude: KARACHI_DEFAULT.location.longitude,
  city: KARACHI_DEFAULT.location.city,
};

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  // Mirror of the latest resolved location. The effect runs once (empty deps),
  // so a closure that reads `location` directly always sees the mount-time null
  // — reading the ref instead means a failed LIVE fetch can't clobber a good
  // cached location with the fallback.
  const locationRef = useRef<LocationData | null>(null);

  useEffect(() => {
    let mounted = true;

    const apply = (data: LocationData, fallback: boolean) => {
      locationRef.current = data;
      setLocation(data);
      setIsFallback(fallback);
    };

    async function getLocation() {
      // Try cached first
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.location);
        if (cached && mounted) {
          apply(JSON.parse(cached), false);
          setLoading(false);
        }
      } catch {}

      // Request live location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            setError('Location permission denied. Using approximate location.');
            // Don't overwrite a good cached location with the fallback.
            if (!locationRef.current) apply(FALLBACK_LOCATION, true);
            setLoading(false);
          }
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) return;

        // Reverse geocode for city name
        let city: string | undefined;
        try {
          const [address] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          city = address?.city ?? address?.region ?? undefined;
        } catch {}

        const locationData: LocationData = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          city,
        };

        apply(locationData, false);
        setLoading(false);
        setError(null);

        await AsyncStorage.setItem(CACHE_KEYS.location, JSON.stringify(locationData));
      } catch (err) {
        if (mounted) {
          setError('Could not get location.');
          // Read the latest location via ref (the captured `location` is the
          // mount-time null), so a failed refresh never clobbers a cached fix.
          if (!locationRef.current) apply(FALLBACK_LOCATION, true);
          setLoading(false);
        }
      }
    }

    getLocation();
    return () => { mounted = false; };
  }, []);

  return { location, loading, error, isFallback };
}
