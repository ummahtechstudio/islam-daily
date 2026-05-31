import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { trackScreen } from '../src/services/analytics';
import { searchQuran, QuranSearchResult } from '../src/services/api';
import { useStore } from '../src/store';

export default function SearchScreen() {
  useEffect(() => { trackScreen('Search'); }, []);
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuranSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);

  // Accepts an explicit query override so the suggestion-chip path
  // (which calls handleSearch right after setQuery) doesn't race the
  // useState update and end up searching the previous value.
  const handleSearch = useCallback(async (override?: string) => {
    const q = (override ?? query).trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setSearchError(false);
    try {
      const data = await searchQuran(q);
      setResults(data);
    } catch {
      setResults([]);
      setSearchError(true);
    }
    setLoading(false);
  }, [query]);

  const renderResult = ({ item }: { item: QuranSearchResult }) => (
    <TouchableOpacity
      style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => router.push(`/quran/${item.surah.number}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.resultHeader}>
        <View style={[styles.refBadge, { backgroundColor: Colors.primary + '18' }]}>
          <Text style={[styles.refText, { color: Colors.primary }]}>
            {item.surah.englishName} {item.surah.number}:{item.numberInSurah}
          </Text>
        </View>
      </View>
      <Text style={[styles.resultEnglish, { color: theme.text }]}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('search.header.title')}</Text>
          <Text style={styles.headerSub}>{t('search.header.sub')}</Text>
        </View>
      </View>

      {/* Search input */}
      <View style={[styles.searchRow, { backgroundColor: theme.surface }]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => { setQuery(''); setResults([]); setSearched(false); }}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => handleSearch()}
          disabled={!query.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.searchBtnText}>{t('search.button')}</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions */}
      {!searched && (
        <View style={styles.suggestions}>
          <Text style={[styles.suggestLabel, { color: theme.textSecondary }]}>{t('search.suggestions.label')}</Text>
          <View style={styles.chips}>
            {(['mercy', 'patience', 'paradise', 'prayer', 'forgiveness', 'knowledge'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => { setQuery(s); handleSearch(s); }}
              >
                <Text style={[styles.chipText, { color: theme.text }]}>{t(`search.chips.${s}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.number)}
          renderItem={renderResult}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              searchError ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>📡</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {t('search.error.connection')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
                    onPress={() => handleSearch()}
                  >
                    <Text style={[styles.chipText, { color: Colors.primary }]}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {t('search.empty.noResults', { query })}
                  </Text>
                </View>
              )
            ) : null
          }
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 4,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },

  searchRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  searchBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  suggestions: { padding: 16 },
  suggestLabel: { fontSize: 13, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },

  list: { padding: 12, gap: 10 },
  resultCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  resultHeader: { marginBottom: 8 },
  refBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  refText: { fontSize: 12, fontWeight: '700' },
  resultEnglish: { fontSize: 14, lineHeight: 22 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
