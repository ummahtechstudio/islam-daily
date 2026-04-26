import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { trackScreen } from '../src/services/analytics';

interface Mosque {
  place_id: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  distance?: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getShortName(displayName: string): string {
  const parts = displayName.split(',');
  return parts.slice(0, 2).join(',').trim();
}

export default function MosqueFinder() {
  useEffect(() => { trackScreen('MosqueFinder'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  const fetchMosques = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable location access.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setUserLat(latitude);
      setUserLon(longitude);

      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=mosque&lat=${latitude}&lon=${longitude}&format=json&limit=20&countrycodes=&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'IslamDailyApp/1.0' },
      });
      const data: Mosque[] = await res.json();
      const withDist = data.map((m) => ({
        ...m,
        distance: haversine(latitude, longitude, parseFloat(m.lat), parseFloat(m.lon)),
      }));
      withDist.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      setMosques(withDist);
    } catch (e) {
      setError('Failed to find mosques. Please check your internet connection.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchMosques(); }, []);

  const openDirections = (lat: string, lon: string, name: string) => {
    const url = Platform.select({
      ios: `maps:?q=${encodeURIComponent(name)}&ll=${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(name)})`,
      default: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
    });
    if (url) Linking.openURL(url);
  };

  if (loading) return <LoadingSpinner message="Finding nearby mosques..." dark={isDark} />;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Ionicons name="location" size={24} color="#fff" />
        <View>
          <Text style={styles.headerTitle}>Mosque Finder</Text>
          <Text style={styles.headerSub}>
            {userLat ? `Near ${userLat.toFixed(4)}, ${userLon?.toFixed(4)}` : 'Finding your location...'}
          </Text>
        </View>
        <TouchableOpacity onPress={fetchMosques} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.centerBox}>
          <Ionicons name="warning-outline" size={40} color={Colors.warning} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: Colors.primary }]} onPress={fetchMosques}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : mosques.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No mosques found nearby.</Text>
        </View>
      ) : (
        <FlatList
          data={mosques}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.iconBg, { backgroundColor: Colors.primary + '15' }]}>
                <Text style={{ fontSize: 22 }}>🕌</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.mosqueName, { color: theme.text }]} numberOfLines={1}>
                  {getShortName(item.display_name)}
                </Text>
                <Text style={[styles.mosqueAddr, { color: theme.textMuted }]} numberOfLines={2}>
                  {item.display_name}
                </Text>
                {item.distance !== undefined && (
                  <Text style={[styles.distance, { color: Colors.primary }]}>
                    📍 {item.distance < 1 ? `${Math.round(item.distance * 1000)}m` : `${item.distance.toFixed(1)} km`} away
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.dirBtn, { backgroundColor: Colors.primary }]}
                onPress={() => openDirections(item.lat, item.lon, item.display_name)}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  refreshBtn: { marginLeft: 'auto', padding: 4 },

  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyText: { fontSize: 15 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  mosqueName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  mosqueAddr: { fontSize: 11, lineHeight: 16 },
  distance: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  dirBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
