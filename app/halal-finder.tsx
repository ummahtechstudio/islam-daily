import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';

const RADIUS_OPTIONS = [1, 5, 10, 25] as const;
type Radius = (typeof RADIUS_OPTIONS)[number];

interface Restaurant {
  id: number;
  lat: number;
  lon: number;
  name: string;
  cuisine?: string;
  halalCert?: string;
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

export default function HalalFinderScreen() {
  useEffect(() => { trackScreen('HalalFinder'); }, []);

  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [places, setPlaces] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [radius, setRadius] = useState<Radius>(5);

  const fetchPlaces = useCallback(async (searchRadius: Radius = radius) => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable location access in Settings.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setUserLat(latitude);

      const r = searchRadius * 1000;
      // Overpass API: finds restaurants tagged as halal by cuisine or explicit halal=yes tag
      const query = [
        '[out:json][timeout:25];',
        '(',
        `  node["amenity"="restaurant"]["cuisine"~"halal",i](around:${r},${latitude},${longitude});`,
        `  node["amenity"="fast_food"]["cuisine"~"halal",i](around:${r},${latitude},${longitude});`,
        `  node["amenity"="restaurant"]["halal"="yes"](around:${r},${latitude},${longitude});`,
        `  node["amenity"="fast_food"]["halal"="yes"](around:${r},${latitude},${longitude});`,
        `  node["amenity"="restaurant"]["diet:halal"="yes"](around:${r},${latitude},${longitude});`,
        ');',
        'out body;',
      ].join('\n');

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) throw new Error(`status ${res.status}`);

      const json = await res.json();
      const elements: any[] = json.elements ?? [];

      const seen = new Set<number>();
      const restaurants: Restaurant[] = [];
      for (const el of elements) {
        if (seen.has(el.id)) continue;
        seen.add(el.id);
        const name: string = el.tags?.name || el.tags?.['name:en'] || 'Unnamed Restaurant';
        const cuisine: string | undefined = el.tags?.cuisine;
        const halalTag: string | undefined = el.tags?.halal || el.tags?.['diet:halal'];
        let halalCert: string | undefined;
        if (halalTag === 'yes') halalCert = 'Halal certified';
        else if (cuisine?.toLowerCase().includes('halal')) halalCert = 'Halal cuisine';
        restaurants.push({
          id: el.id,
          lat: el.lat,
          lon: el.lon,
          name,
          cuisine: cuisine?.split(';').map((c: string) => c.trim()).join(', '),
          halalCert,
          distance: haversine(latitude, longitude, el.lat, el.lon),
        });
      }
      restaurants.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      setPlaces(restaurants);
    } catch {
      setError('Failed to find restaurants. Please check your internet connection and try again.');
    }
    setLoading(false);
  }, [radius]);

  useEffect(() => { fetchPlaces(); }, []);

  const handleRadiusChange = (r: Radius) => {
    setRadius(r);
    fetchPlaces(r);
  };

  const openDirections = (lat: number, lon: number, name: string) => {
    const url = Platform.select({
      ios: `maps:?q=${encodeURIComponent(name)}&ll=${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(name)})`,
      default: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#E94B3C' }]}>
        <Text style={styles.headerEmoji}>🥩</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Halal Restaurants</Text>
          <Text style={styles.headerSub}>Nearby halal food options</Text>
        </View>
        <TouchableOpacity onPress={() => fetchPlaces()} style={styles.refreshBtn} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Radius selector */}
      <View style={[styles.radiusRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
            onPress={() => handleRadiusChange(r)}
            disabled={loading}
          >
            <Text style={[styles.radiusBtnText, { color: radius === r ? '#fff' : theme.textSecondary }]}>
              {r} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#E94B3C" />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Finding halal restaurants nearby...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="warning-outline" size={40} color={Colors.warning} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#E94B3C' }]}
            onPress={() => fetchPlaces()}
          >
            <Text style={styles.actionBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No halal restaurants found nearby. Try expanding the search radius.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#E94B3C' }]}
            onPress={() => fetchPlaces()}
          >
            <Text style={styles.actionBtnText}>Search Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {userLat !== null && (
            <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
              📍 You are here · {places.length} restaurant{places.length !== 1 ? 's' : ''} within {radius} km
            </Text>
          )}
          <FlatList
            data={places}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingVertical: 4 }}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.iconBg}>
                  <Text style={{ fontSize: 22 }}>🥙</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.placeName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.halalCert && (
                    <View style={styles.certRow}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                      <Text style={styles.certText}>{item.halalCert}</Text>
                    </View>
                  )}
                  {item.cuisine && (
                    <Text style={[styles.cuisineText, { color: theme.textMuted }]} numberOfLines={1}>
                      {item.cuisine}
                    </Text>
                  )}
                  {item.distance !== undefined && (
                    <Text style={styles.distance}>
                      {item.distance < 1
                        ? `${Math.round(item.distance * 1000)} m away`
                        : `${item.distance.toFixed(1)} km away`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.dirBtn}
                  onPress={() => openDirections(item.lat, item.lon, item.name)}
                >
                  <Ionicons name="navigate" size={14} color="#fff" />
                  <Text style={styles.dirBtnText}>Go</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
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
  headerEmoji: { fontSize: 26 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  refreshBtn: { padding: 8, minWidth: 36, alignItems: 'center' },

  radiusRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E94B3C',
  },
  radiusBtnActive: { backgroundColor: '#E94B3C', borderColor: '#E94B3C' },
  radiusBtnText: { fontSize: 12, fontWeight: '600' },

  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  actionBtnText: { color: '#fff', fontWeight: '700' },

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
    backgroundColor: '#E94B3C20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  placeName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  certText: { fontSize: 11, color: '#27AE60', fontWeight: '600' },
  cuisineText: { fontSize: 11, lineHeight: 16, marginBottom: 2 },
  distance: { fontSize: 12, fontWeight: '600', color: '#E94B3C', marginTop: 2 },
  dirBtn: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E94B3C',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  dirBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
