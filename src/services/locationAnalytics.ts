import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

const KEY_CONSENT = '@privacy_consent';
const KEY_SHOWN   = '@privacy_consent_shown';

export async function hasConsentBeenShown(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_SHOWN)) !== null;
}

export async function isConsentGranted(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_CONSENT)) === 'granted';
}

export async function saveConsent(granted: boolean): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEY_CONSENT, granted ? 'granted' : 'denied'),
    AsyncStorage.setItem(KEY_SHOWN, '1'),
  ]);
}

// Call once per app launch after consent is confirmed. Never throws.
export async function logSession(): Promise<void> {
  try {
    const granted = await isConsentGranted();
    if (!granted) return;

    let latitude: number | null = null;
    let longitude: number | null = null;
    let city: string | null = null;
    let country: string | null = null;
    let country_code: string | null = null;

    // Use existing permission only — never request here
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      latitude  = loc.coords.latitude;
      longitude = loc.coords.longitude;

      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        city         = geo.city ?? geo.subregion ?? null;
        country      = geo.country ?? null;
        country_code = geo.isoCountryCode ?? null;
      }
    }

    await supabase.from('user_sessions').insert({
      latitude,
      longitude,
      city,
      country,
      country_code,
      platform:     Platform.OS,
      app_version:  Constants.expoConfig?.version ?? '1.0.0',
      device_model: Device.modelName ?? 'unknown',
      os_version:   String(Platform.Version),
    });
  } catch {
    // Fire-and-forget: silently discard all errors
  }
}
