import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { CACHE_KEYS } from '../src/constants';
import { trackScreen } from '../src/services/analytics';
import { fetchSurahList, SurahMeta } from '../src/services/api';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { ErrorView } from '../src/components/ErrorView';
import { safeJsonParse } from '../src/utils/safeJsonParse';

type HifzProgress = Record<number, boolean>;

export default function HifzTrackerScreen() {
  useEffect(() => { trackScreen('HifzTracker'); }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [progress, setProgress] = useState<HifzProgress>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, raw] = await Promise.all([
        fetchSurahList(),
        AsyncStorage.getItem(CACHE_KEYS.hifzProgress),
      ]);
      setSurahs(list);
      setProgress(safeJsonParse<HifzProgress>(raw, {}));
    } catch (err) {
      // Whether the surah list fetch failed (offline) or AsyncStorage threw,
      // we surface a retriable error instead of an infinite spinner.
      console.warn('[HifzTracker] load failed', err);
      setError(t('hifz.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Mirror progress so rapid taps each merge onto the latest value instead of a
  // stale closure (last-write-wins would lose a tick).
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  const toggleSurah = useCallback(async (num: number) => {
    const next = { ...progressRef.current, [num]: !progressRef.current[num] };
    progressRef.current = next;
    setProgress(next);
    try {
      await AsyncStorage.setItem(CACHE_KEYS.hifzProgress, JSON.stringify(next));
    } catch (err) {
      console.warn('[hifz] save progress failed', err);
    }
  }, []);

  const memorized = Object.values(progress).filter(Boolean).length;
  const pct = surahs.length ? Math.round((memorized / surahs.length) * 100) : 0;

  if (loading) return <LoadingSpinner message={t('hifz.loading')} dark={isDark} />;
  if (error) return <ErrorView message={error} onRetry={load} dark={isDark} />;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Progress header */}
      <View style={[styles.progressCard, { backgroundColor: Colors.primary }]}>
        <Text style={styles.progressTitle}>{t('hifz.progress.title')}</Text>
        <Text style={styles.progressStats}>{t('hifz.progress.stats', { memorized, total: surahs.length })}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressPct}>{pct}%</Text>
      </View>

      <FlatList
        data={surahs}
        keyExtractor={(item) => String(item.number)}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const done = !!progress[item.number];
          return (
            <TouchableOpacity
              style={[
                styles.surahRow,
                { backgroundColor: theme.card, borderBottomColor: theme.border },
                done && { backgroundColor: Colors.primary + '12' },
              ]}
              onPress={() => toggleSurah(item.number)}
              activeOpacity={0.7}
            >
              <View style={[styles.numBadge, { backgroundColor: done ? Colors.primary : theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.numText, { color: done ? '#fff' : theme.textMuted }]}>
                  {item.number}
                </Text>
              </View>
              <View style={styles.surahInfo}>
                <Text style={[styles.surahName, { color: theme.text }]}>{item.englishName}</Text>
                <Text style={[styles.surahSub, { color: theme.textMuted }]}>
                  {item.revelationType} · {t('hifz.surah.verses', { count: item.numberOfAyahs })}
                </Text>
              </View>
              <Text style={[styles.surahArabic, { color: done ? Colors.primary : theme.textSecondary }]}>
                {item.name}
              </Text>
              <View style={[styles.checkbox, { borderColor: done ? Colors.primary : theme.border, backgroundColor: done ? Colors.primary : 'transparent' }]}>
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progressCard: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  progressTitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  progressStats: { color: '#fff', fontSize: 20, fontWeight: '800' },
  barBg: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, marginTop: 4 },
  barFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  progressPct: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  numBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numText: { fontSize: 13, fontWeight: '700' },
  surahInfo: { flex: 1 },
  surahName: { fontSize: 15, fontWeight: '600' },
  surahSub: { fontSize: 12, marginTop: 1 },
  surahArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    marginRight: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
