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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { fetchWithTimeout, withTimeout, OfflineError, OFFLINE_MESSAGE } from '../src/utils/network';
import { useIsOnline } from '../src/hooks/useIsOnline';
import MosqueFinderEmptyState from '../src/components/MosqueFinderEmptyState';

const RADIUS_OPTIONS = [1, 5, 10, 25, 50] as const;
type Radius = (typeof RADIUS_OPTIONS)[number];
const DEFAULT_RADIUS_KM: Radius = 10;
const ACCENT = '#E94B3C';

interface Restaurant {
  id: number;
  lat: number;
  lon: number;
  name: string;
  cuisine?: string;
  halalCert?: string;
  distance: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
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

async function fetchHalalRestaurants(
  lat: number,
  lon: number,
  radiusMeters: number,
): Promise<OverpassElement[]> {
  // Match restaurants tagged halal explicitly OR by cuisine that strongly
  // implies halal (arabic, turkish, pakistani, indian, middle_eastern, lebanese,
  // afghan, persian, moroccan, egyptian, iranian, kebab) OR with "halal" in name.
  const cuisineRegex = 'halal|arabic|turkish|pakistani|indian|middle_eastern|lebanese|afghan|persian|moroccan|egyptian|iranian|kebab';
  const nameRegex = '[Hh][Aa][Ll][Aa][Ll]';
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|fast_food|cafe"]["halal"="yes"](around:${radiusMeters},${lat},${lon});
      node["amenity"~"restaurant|fast_food|cafe"]["diet:halal"="yes"](around:${radiusMeters},${lat},${lon});
      node["amenity"~"restaurant|fast_food|cafe"]["cuisine"~"${cuisineRegex}",i](around:${radiusMeters},${lat},${lon});
      node["amenity"~"restaurant|fast_food|cafe"]["name"~"${nameRegex}"](around:${radiusMeters},${lat},${lon});
    );
    out body;
  `;
  const res = await fetchWithTimeout(
    'https://overpass-api.de/api/interpreter',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    },
    20000,
  );
  if (!res.ok) throw new Error(`Overpass API ${res.status}`);
  const json = await res.json();
  return (json.elements as OverpassElement[]) || [];
}

function elementsToRestaurants(
  elements: OverpassElement[],
  userLat: number,
  userLon: number,
): Restaurant[] {
  // Dedupe by `${type}-${id}` — Overpass uses the same numeric id space for
  // nodes/ways/relations, so a plain `el.id` set can drop legitimate entries
  // when a node and a way share the same id.
  const seen = new Set<string>();
  const out: Restaurant[] = [];
  for (const el of elements) {
    const key = `${el.type}-${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const tags = el.tags ?? {};
    const name: string = tags.name || tags['name:en'] || 'Unnamed Restaurant';
    const cuisine: string | undefined = tags.cuisine;
    const halalTag: string | undefined = tags.halal || tags['diet:halal'];
    let halalCert: string | undefined;
    if (halalTag === 'yes') halalCert = 'certified';
    else if (cuisine?.toLowerCase().includes('halal')) halalCert = 'cuisine';
    else if (/halal/i.test(name)) halalCert = 'byName';
    out.push({
      id: el.id,
      lat,
      lon,
      name,
      cuisine: cuisine?.split(';').map((c) => c.trim()).join(', '),
      halalCert,
      distance: haversine(userLat, userLon, lat, lon),
    });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out;
}

export default function HalalFinderScreen() {
  useEffect(() => { trackScreen('HalalFinder'); }, []);
  const { t } = useTranslation();

  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isOnline = useIsOnline();
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [places, setPlaces] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [radius, setRadius] = useState<Radius>(DEFAULT_RADIUS_KM);
  const [effectiveRadiusKm, setEffectiveRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [autoExpanded, setAutoExpanded] = useState(false);

  const search = useCallback(async (lat: number, lon: number, requestedKm: Radius) => {
    setLoading(true);
    setError(null);
    setAutoExpanded(false);
    try {
      const elements = await fetchHalalRestaurants(lat, lon, requestedKm * 1000);
      let result = elementsToRestaurants(elements, lat, lon);
      let usedKm: number = requestedKm;
      if (result.length === 0 && requestedKm < 25) {
        const expanded = await fetchHalalRestaurants(lat, lon, 25 * 1000);
        const expandedResult = elementsToRestaurants(expanded, lat, lon);
        if (expandedResult.length > 0) {
          result = expandedResult;
          usedKm = 25;
          setAutoExpanded(true);
        }
      }
      setPlaces(result);
      setEffectiveRadiusKm(usedKm);
    } catch (e) {
      if (e instanceof OfflineError) {
        setError(OFFLINE_MESSAGE);
      } else {
        setError(t('halalFinder.errors.fetchFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchAtCurrentLocation = useCallback(
    async (km: Radius) => {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(t('halalFinder.errors.locationDenied'));
          setPermissionDenied(true);
          setLoading(false);
          return;
        }
        // Bound the GPS fix: getCurrentPositionAsync has no timeout and can hang
        // indefinitely on a cold/indoor fix, leaving the spinner stuck with no
        // way to retry (the refresh control is disabled while loading).
        const loc = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          12000,
          'Location timed out',
        );
        const { latitude, longitude } = loc.coords;
        setUserLat(latitude);
        setUserLon(longitude);
        await search(latitude, longitude, km);
      } catch (e) {
        setError(t('halalFinder.errors.locationFailed'));
        setLoading(false);
      }
    },
    [search, t],
  );

  useEffect(() => { fetchAtCurrentLocation(DEFAULT_RADIUS_KM); }, [fetchAtCurrentLocation]);

  const handleRadiusChange = (r: Radius) => {
    setRadius(r);
    if (userLat != null && userLon != null) {
      search(userLat, userLon, r);
    } else {
      fetchAtCurrentLocation(r);
    }
  };

  const handleRefresh = () => fetchAtCurrentLocation(radius);

  // This feature fundamentally needs the Overpass API; show the same offline
  // empty state that mosque-finder uses instead of letting the request go
  // out, time out, and surface a generic "Failed to find restaurants" toast.
  if (!isOnline) {
    return <MosqueFinderEmptyState onRetry={handleRefresh} />;
  }

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
      <View style={[styles.header, { backgroundColor: ACCENT }]}>
        <Text style={styles.headerEmoji}>🥩</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('halalFinder.header.title')}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {loading
              ? t('halalFinder.header.loading')
              : userLat != null && places.length > 0
              ? t('halalFinder.header.found', {
                  count: places.length,
                  restaurantWord: places.length === 1 ? 'restaurant' : 'restaurants',
                  radius: effectiveRadiusKm,
                })
              : userLat != null
              ? t('halalFinder.header.none', { radius: effectiveRadiusKm })
              : t('halalFinder.header.locating')}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} hitSlop={8} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Radius selector chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.radiusRow}
      >
        {RADIUS_OPTIONS.map((km) => {
          const active = radius === km;
          return (
            <TouchableOpacity
              key={km}
              style={[
                styles.radiusChip,
                { borderColor: theme.border, backgroundColor: theme.card },
                active && { backgroundColor: ACCENT, borderColor: ACCENT },
              ]}
              onPress={() => handleRadiusChange(km)}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={[styles.radiusChipText, { color: active ? '#fff' : theme.text }]}>
                {km} km
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {autoExpanded ? (
        <Text style={[styles.autoExpandText, { color: theme.textMuted }]}>
          {t('halalFinder.autoExpand', { requested: radius, effective: effectiveRadiusKm })}
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('halalFinder.loading')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="warning-outline" size={40} color={Colors.warning} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          {permissionDenied ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: ACCENT }]}
              onPress={() => Linking.openSettings().catch(() => {})}
            >
              <Text style={styles.actionBtnText}>{t('halalFinder.openSettings')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: ACCENT }]}
              onPress={handleRefresh}
            >
              <Text style={styles.actionBtnText}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t('halalFinder.empty', { radius: effectiveRadiusKm })}
          </Text>
        </View>
      ) : (
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
                    <Text style={styles.certText}>{t(`halalFinder.halalCert.${item.halalCert}`)}</Text>
                  </View>
                )}
                {item.cuisine && (
                  <Text style={[styles.cuisineText, { color: theme.textMuted }]} numberOfLines={1}>
                    {item.cuisine}
                  </Text>
                )}
                <Text style={styles.distance}>
                  📍 {item.distance < 1
                    ? t('halalFinder.distance.meters', { m: Math.round(item.distance * 1000) })
                    : t('halalFinder.distance.km', { km: item.distance.toFixed(1) })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dirBtn}
                onPress={() => openDirections(item.lat, item.lon, item.name)}
              >
                <Ionicons name="navigate" size={14} color="#fff" />
                <Text style={styles.dirBtnText}>{t('halalFinder.directions')}</Text>
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
  headerEmoji: { fontSize: 26 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 4, minWidth: 36, alignItems: 'center' },

  radiusRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  radiusChipText: { fontSize: 13, fontWeight: '600' },
  autoExpandText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginHorizontal: 16,
    marginBottom: 4,
  },

  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
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
    backgroundColor: ACCENT + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  placeName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  certText: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  cuisineText: { fontSize: 11, lineHeight: 16, marginBottom: 2 },
  distance: { fontSize: 12, fontWeight: '600', color: ACCENT, marginTop: 2 },
  dirBtn: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  dirBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
