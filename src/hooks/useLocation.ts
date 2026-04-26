import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS } from '../constants';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getLocation() {
      // Try cached first
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.location);
        if (cached && mounted) {
          setLocation(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}

      // Request live location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            setError('Location permission denied. Using default location (Makkah).');
            const defaultLoc = { latitude: 21.4225, longitude: 39.8262, city: 'Makkah' };
            setLocation(defaultLoc);
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

        setLocation(locationData);
        setLoading(false);
        setError(null);

        await AsyncStorage.setItem(CACHE_KEYS.location, JSON.stringify(locationData));
      } catch (err) {
        if (mounted) {
          setError('Could not get location.');
          if (!location) {
            setLocation({ latitude: 21.4225, longitude: 39.8262, city: 'Makkah' });
          }
          setLoading(false);
        }
      }
    }

    getLocation();
    return () => { mounted = false; };
  }, []);

  return { location, loading, error };
}
