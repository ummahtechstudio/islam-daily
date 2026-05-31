import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Linking,
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
import { fetchWithTimeout, OfflineError, OFFLINE_MESSAGE } from '../src/utils/network';
import { useIsOnline } from '../src/hooks/useIsOnline';
import MosqueFinderEmptyState from '../src/components/MosqueFinderEmptyState';

interface Mosque {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  address: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const RADIUS_OPTIONS = [1, 5, 10, 25, 50];
const DEFAULT_RADIUS_KM = 10;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyMosques(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<OverpassElement[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${lat},${lng});
      way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `;
  const response = await fetchWithTimeout(
    'https://overpass-api.de/api/interpreter',
    { method: 'POST', body: query },
    20000,
  );
  if (!response.ok) {
    throw new Error(`Overpass API ${response.status}`);
  }
  const data = await response.json();
  return (data.elements as OverpassElement[]) || [];
}

function buildAddress(tags?: Record<string, string>): string {
  if (!tags) return '';
  if (tags['addr:full']) return tags['addr:full'];
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return tags['addr:street'] ?? '';
}

function elementsToMosques(
  elements: OverpassElement[],
  userLat: number,
  userLng: number,
): Mosque[] {
  return elements
    .map((el) => {
      const mLat = el.lat ?? el.center?.lat;
      const mLng = el.lon ?? el.center?.lon;
      if (mLat == null || mLng == null) return null;
      return {
        id: `${el.type}-${el.id}`,
        name: el.tags?.name ?? 'Mosque',
        lat: mLat,
        lng: mLng,
        distance: haversineDistance(userLat, userLng, mLat, mLng),
        address: buildAddress(el.tags),
      } as Mosque;
    })
    .filter((m): m is Mosque => m !== null)
    .sort((a, b) => a.distance - b.distance);
}

export default function MosqueFinder() {
  useEffect(() => {
    trackScreen('MosqueFinder');
  }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;
  const isOnline = useIsOnline();

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [effectiveRadiusKm, setEffectiveRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [autoExpanded, setAutoExpanded] = useState<boolean>(false);

  const search = useCallback(async (lat: number, lng: number, requestedKm: number) => {
    setLoading(true);
    setError(null);
    setAutoExpanded(false);
    try {
      const elements = await fetchNearbyMosques(lat, lng, requestedKm * 1000);
      let result = elementsToMosques(elements, lat, lng);
      let usedKm = requestedKm;

      if (result.length === 0 && requestedKm < 25) {
        const expandedKm = 25;
        const expandedElements = await fetchNearbyMosques(lat, lng, expandedKm * 1000);
        result = elementsToMosques(expandedElements, lat, lng);
        usedKm = expandedKm;
        if (result.length > 0) setAutoExpanded(true);
      }

      setMosques(result);
      setEffectiveRadiusKm(usedKm);
    } catch (e) {
      if (e instanceof OfflineError) {
        setError(OFFLINE_MESSAGE);
      } else {
        setError(t('mosqueFinder.errors.fetchFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchAtCurrentLocation = useCallback(
    async (km: number) => {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(t('mosqueFinder.errors.locationDenied'));
          setPermissionDenied(true);
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        await search(latitude, longitude, km);
      } catch (e) {
        setError(t('mosqueFinder.errors.locationFailed'));
        setLoading(false);
      }
    },
    [search, t],
  );

  useEffect(() => {
    fetchAtCurrentLocation(DEFAULT_RADIUS_KM);
  }, [fetchAtCurrentLocation]);

  const handleRadiusChange = (km: number) => {
    setRadiusKm(km);
    if (userLat != null && userLng != null) {
      search(userLat, userLng, km);
    } else {
      fetchAtCurrentLocation(km);
    }
  };

  const handleRefresh = () => {
    fetchAtCurrentLocation(radiusKm);
  };

  const openDirections = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  if (!isOnline) {
    return <MosqueFinderEmptyState onRetry={handleRefresh} />;
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Ionicons name="location" size={24} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('mosqueFinder.header.title')}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {loading
              ? t('mosqueFinder.header.loading')
              : userLat != null && mosques.length > 0
              ? t('mosqueFinder.header.found', {
                  count: mosques.length,
                  mosqueWord: mosques.length === 1 ? 'mosque' : 'mosques',
                  radius: effectiveRadiusKm,
                })
              : userLat != null
              ? t('mosqueFinder.header.none', { radius: effectiveRadiusKm })
              : t('mosqueFinder.header.locating')}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} hitSlop={8}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Radius selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.radiusRow}
      >
        {RADIUS_OPTIONS.map((km) => {
          const active = radiusKm === km;
          return (
            <TouchableOpacity
              key={km}
              style={[
                styles.radiusChip,
                { borderColor: theme.border, backgroundColor: theme.card },
                active && { backgroundColor: Colors.primary, borderColor: Colors.primary },
              ]}
              onPress={() => handleRadiusChange(km)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.radiusChipText,
                  { color: active ? '#fff' : theme.text },
                ]}
              >
                {km} km
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {autoExpanded ? (
        <Text style={[styles.autoExpandText, { color: theme.textMuted }]}>
          {t('mosqueFinder.autoExpand', { requested: radiusKm, effective: effectiveRadiusKm })}
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('mosqueFinder.loading')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="warning-outline" size={40} color={Colors.warning} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          {permissionDenied ? (
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: Colors.primary }]}
              onPress={() => Linking.openSettings().catch(() => {})}
            >
              <Text style={styles.retryText}>{t('mosqueFinder.openSettings')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: Colors.primary }]}
              onPress={handleRefresh}
            >
              <Text style={styles.retryText}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : mosques.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="search-outline" size={40} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t('mosqueFinder.emptySearch', { radius: effectiveRadiusKm })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={mosques}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.iconBg, { backgroundColor: Colors.primary + '15' }]}>
                <Text style={{ fontSize: 22 }}>🕌</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.mosqueName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.address ? (
                  <Text style={[styles.mosqueAddr, { color: theme.textMuted }]} numberOfLines={2}>
                    {item.address}
                  </Text>
                ) : null}
                <Text style={[styles.distance, { color: Colors.primary }]}>
                  📍 {t('mosqueFinder.distance', { km: item.distance.toFixed(1) })}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.dirBtn, { backgroundColor: Colors.primary }]}
                onPress={() => openDirections(item.lat, item.lng)}
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
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 4 },

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
