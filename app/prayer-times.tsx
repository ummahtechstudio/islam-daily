import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { CALCULATION_METHODS } from '../src/constants';
import { trackScreen } from '../src/services/analytics';
import { useLocation } from '../src/hooks/useLocation';
import { usePrayerTimes } from '../src/hooks/usePrayerTimes';
import { useStore } from '../src/store';
import { PrayerCard } from '../src/components/PrayerCard';
import { CountdownTimer } from '../src/components/CountdownTimer';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { ErrorView } from '../src/components/ErrorView';

const DISPLAYED_PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function PrayerTimesScreen() {
  useEffect(() => { trackScreen('PrayerTimes'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const { location, loading: locLoading, error: locError } = useLocation();
  const {
    data,
    nextPrayer,
    loading,
    error,
    refresh,
  } = usePrayerTimes(location, settings.calculationMethod);

  if (locLoading || loading) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <LoadingSpinner message="Calculating prayer times..." dark={isDark} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <ErrorView
          message={error ?? 'Failed to load prayer times'}
          onRetry={refresh}
          dark={isDark}
        />
      </View>
    );
  }

  const { timings, date, meta } = data;
  const hijri = date.hijri;
  const gregorian = date.gregorian;

  const currentMethod = CALCULATION_METHODS.find(
    (m) => m.id === settings.calculationMethod
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Date Banner ── */}
        <View style={styles.dateBanner}>
          <View style={[styles.dateCard, { backgroundColor: Colors.primary }]}>
            <Text style={styles.hijriDateText}>
              {hijri.day} {hijri.month.en} {hijri.year} AH
            </Text>
            <Text style={styles.hijriMonthAr}>{hijri.month.ar}</Text>
            <Text style={styles.gregorianDate}>
              {gregorian.weekday.en}, {gregorian.day} {gregorian.month.en} {gregorian.year}
            </Text>
          </View>
        </View>

        {/* ── Location & Method ── */}
        <View style={[styles.infoRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {location?.city ?? `${meta.latitude.toFixed(2)}, ${meta.longitude.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="time" size={16} color={Colors.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>{meta.timezone}</Text>
          </View>
        </View>

        {/* ── Countdown to Next Prayer ── */}
        {nextPrayer && (
          <View style={[styles.countdownCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.countdownLabel, { color: theme.textSecondary }]}>
              Time until {nextPrayer.name}
            </Text>
            <CountdownTimer secondsLeft={nextPrayer.secondsLeft} dark={isDark} />
            <Text style={[styles.nextPrayerAt, { color: theme.textMuted }]}>
              at {nextPrayer.time}
            </Text>
          </View>
        )}

        {/* ── Prayer Times List ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Prayers</Text>
        {DISPLAYED_PRAYERS.map((name) => (
          <PrayerCard
            key={name}
            name={name}
            time={timings[name]}
            isNext={nextPrayer?.name === name}
            dark={isDark}
          />
        ))}

        {/* ── Extras ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Additional Times</Text>
        {['Imsak', 'Midnight'].map((name) => (
          <View
            key={name}
            style={[styles.extraRow, { borderColor: theme.border }]}
          >
            <Text style={[styles.extraName, { color: theme.textSecondary }]}>{name}</Text>
            <Text style={[styles.extraTime, { color: theme.text }]}>
              {timings[name]}
            </Text>
          </View>
        ))}

        {/* ── Calculation Method ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Calculation Method</Text>
        <TouchableOpacity
          style={[styles.methodBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setMethodModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodName, { color: theme.text }]}>
              {currentMethod?.name ?? 'Unknown'}
            </Text>
            <Text style={[styles.methodSub, { color: theme.textMuted }]}>
              Method #{settings.calculationMethod}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Method Picker Modal ── */}
      <Modal
        visible={methodModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMethodModalVisible(false)}
      >
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Calculation Method</Text>
            <TouchableOpacity onPress={() => setMethodModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={CALCULATION_METHODS}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.methodItem,
                  { borderBottomColor: theme.border },
                  item.id === settings.calculationMethod && styles.methodItemActive,
                ]}
                onPress={() => {
                  updateSettings({ calculationMethod: item.id });
                  setMethodModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.methodItemText,
                    { color: item.id === settings.calculationMethod ? Colors.primary : theme.text },
                  ]}
                >
                  {item.name}
                </Text>
                {item.id === settings.calculationMethod && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },

  dateBanner: { marginBottom: 14 },
  dateCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  hijriDateText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  hijriMonthAr: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
  },
  gregorianDate: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, flex: 1 },
  infoDivider: { width: 1, height: 20, backgroundColor: Colors.light.border, marginHorizontal: 8 },

  countdownCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  countdownLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  nextPrayerAt: { fontSize: 13 },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, marginTop: 4 },

  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  extraName: { fontSize: 15 },
  extraTime: { fontSize: 15, fontWeight: '600' },

  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  methodName: { fontSize: 15, fontWeight: '600' },
  methodSub: { fontSize: 12, marginTop: 2 },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  methodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  methodItemActive: { backgroundColor: 'rgba(15,110,86,0.06)' },
  methodItemText: { fontSize: 15, flex: 1 },
});
