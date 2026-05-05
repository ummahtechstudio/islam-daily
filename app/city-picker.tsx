import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { useResolvedLocation } from '../src/hooks/useResolvedLocation';
import { autoDetectMethodAndMadhab } from '../src/services/prayerTimesService';
import type { PrayerTimesSettings } from '../src/types/prayerTimes';
import { trackScreen } from '../src/services/analytics';
import citiesData from '../assets/data/cities.json';

type CityEntry = {
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  alternateNames: string[];
};

const CITIES = citiesData as CityEntry[];

const GOLD = '#EF9F27';
const CREAM = '#FBF6E4';
const GREEN = '#0F6E56';

const COUNTRY_ORDER = [
  'Pakistan',
  'United Arab Emirates',
  'Saudi Arabia',
  'India',
  'Bangladesh',
  'Turkey',
  'Egypt',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Jordan',
  'Lebanon',
  'Malaysia',
  'Singapore',
  'United Kingdom',
  'United States',
];

function lightHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function CityPickerScreen() {
  useEffect(() => { trackScreen('CityPicker'); }, []);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark =
    settingsScheme === 'dark' || (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const { setManualSettings, refreshFromGps } = useResolvedLocation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.country.toLowerCase().includes(q)) return true;
      return c.alternateNames.some((n) => n.toLowerCase().includes(q));
    });
  }, [query]);

  const sections = useMemo(() => {
    const grouped = new Map<string, CityEntry[]>();
    for (const c of filtered) {
      const list = grouped.get(c.country) ?? [];
      list.push(c);
      grouped.set(c.country, list);
    }
    const ordered: { title: string; data: CityEntry[] }[] = [];
    for (const country of COUNTRY_ORDER) {
      const list = grouped.get(country);
      if (list?.length) ordered.push({ title: country, data: list });
    }
    // Append any extra countries not in the explicit order
    for (const [country, list] of grouped.entries()) {
      if (!COUNTRY_ORDER.includes(country)) {
        ordered.push({ title: country, data: list });
      }
    }
    return ordered;
  }, [filtered]);

  const handleSelect = useCallback(
    (city: CityEntry) => {
      lightHaptic();
      const { method, madhab } = autoDetectMethodAndMadhab(city.countryCode);
      const next: PrayerTimesSettings = {
        location: {
          latitude: city.latitude,
          longitude: city.longitude,
          city: city.name,
          country: city.country,
          countryCode: city.countryCode,
        },
        method,
        madhab,
        iqamahOffsets: null,
        highLatitudeRule: 'middleOfTheNight',
      };
      setManualSettings(next);
      router.back();
    },
    [router, setManualSettings],
  );

  const handleUseGps = useCallback(async () => {
    lightHaptic();
    await refreshFromGps();
    router.back();
  }, [router, refreshFromGps]);

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: GREEN }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select City</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search input */}
      <View style={[styles.searchWrap, { backgroundColor: theme.surface }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search city, country or لاہور"
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* GPS button */}
      <TouchableOpacity
        style={styles.gpsBtn}
        onPress={handleUseGps}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={16} color={GREEN} />
        <Text style={styles.gpsText}>Use my current location</Text>
      </TouchableOpacity>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.countryCode}-${item.name}-${item.latitude}`}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: CREAM }]}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionUnderline} />
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;
          return (
            <TouchableOpacity
              style={[
                styles.cityRow,
                {
                  backgroundColor: theme.card,
                  borderBottomColor: theme.border,
                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.72}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cityName, { color: theme.text }]}>{item.name}</Text>
                <Text style={styles.cityCountry}>{item.country}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={GOLD} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No cities match your search.{'\n'}Try another spelling, or use "Use my current
              location".
            </Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerBack: { padding: 4 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSpacer: { width: 34 },

  searchWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },

  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,110,86,0.35)',
    backgroundColor: 'rgba(15,110,86,0.06)',
  },
  gpsText: { color: GREEN, fontSize: 14, fontWeight: '700' },

  listContent: { paddingBottom: 24 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    marginTop: 6,
  },
  sectionTitle: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionUnderline: {
    height: 2,
    width: 26,
    backgroundColor: GOLD,
    borderRadius: 1,
    marginTop: 4,
  },

  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  cityName: { fontSize: 15, fontWeight: '700' },
  cityCountry: { fontSize: 12, color: GOLD, marginTop: 2, fontWeight: '600' },

  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
