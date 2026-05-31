import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { useSurahList } from '../../hooks/useQuran';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorView } from '../ErrorView';
import { SurahMeta } from '../../services/api';

const GOLD = '#EF9F27';
const LAST_READ_KEY = 'last_read_surah';

const JUZ_DATA = [
  { juz: 1,  name: 'Alif Lam Meem',        surah: 1,   ayah: 1,   page: 1 },
  { juz: 2,  name: 'Sayaqool',              surah: 2,   ayah: 142, page: 22 },
  { juz: 3,  name: 'Tilkar Rusul',          surah: 2,   ayah: 253, page: 42 },
  { juz: 4,  name: 'Lantanalo',             surah: 3,   ayah: 92,  page: 62 },
  { juz: 5,  name: 'Wal Mohsanat',          surah: 4,   ayah: 24,  page: 82 },
  { juz: 6,  name: 'La Yuhibbullah',        surah: 4,   ayah: 148, page: 102 },
  { juz: 7,  name: 'Wa Iza Samiu',          surah: 5,   ayah: 82,  page: 121 },
  { juz: 8,  name: 'Wa Lau Annana',         surah: 6,   ayah: 111, page: 142 },
  { juz: 9,  name: 'Qalal Mala',            surah: 7,   ayah: 88,  page: 162 },
  { juz: 10, name: 'Wa Alamu',              surah: 8,   ayah: 41,  page: 182 },
  { juz: 11, name: 'Yatazeroon',            surah: 9,   ayah: 93,  page: 202 },
  { juz: 12, name: 'Wa Mamin Dabbah',       surah: 11,  ayah: 6,   page: 222 },
  { juz: 13, name: 'Wa Ma Ubarri',          surah: 12,  ayah: 53,  page: 241 },
  { juz: 14, name: 'Rubama',                surah: 15,  ayah: 1,   page: 262 },
  { juz: 15, name: 'Subhanallazi',          surah: 17,  ayah: 1,   page: 282 },
  { juz: 16, name: 'Qal Alam',              surah: 18,  ayah: 75,  page: 302 },
  { juz: 17, name: 'Aqtarabo',              surah: 21,  ayah: 1,   page: 322 },
  { juz: 18, name: 'Qad Aflaha',            surah: 23,  ayah: 1,   page: 342 },
  { juz: 19, name: 'Wa Qalallazina',        surah: 25,  ayah: 21,  page: 362 },
  { juz: 20, name: 'Amman Khalaqa',         surah: 27,  ayah: 56,  page: 382 },
  { juz: 21, name: 'Utlu Ma Oohiya',        surah: 29,  ayah: 46,  page: 402 },
  { juz: 22, name: 'Wa Manyaqnut',          surah: 33,  ayah: 31,  page: 422 },
  { juz: 23, name: 'Wa Mali',               surah: 36,  ayah: 28,  page: 442 },
  { juz: 24, name: 'Faman Azlam',           surah: 39,  ayah: 32,  page: 462 },
  { juz: 25, name: 'Elahe Yuruddo',         surah: 41,  ayah: 47,  page: 482 },
  { juz: 26, name: 'Ha Meem',               surah: 46,  ayah: 1,   page: 502 },
  { juz: 27, name: 'Qala Fama Khatbukum',   surah: 51,  ayah: 31,  page: 522 },
  { juz: 28, name: 'Qad Sami Allah',        surah: 58,  ayah: 1,   page: 542 },
  { juz: 29, name: 'Tabarakalazi',          surah: 67,  ayah: 1,   page: 562 },
  { juz: 30, name: 'Amma Yatasa-aloon',     surah: 78,  ayah: 1,   page: 582 },
];

type SurahTab = 'surahs' | 'juz';

export default function TranslationTab({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = isDark ? Colors.dark : Colors.light;
  const { surahs, loading, error } = useSurahList();
  const [query, setQuery] = useState('');
  const [surahTab, setSurahTab] = useState<SurahTab>('surahs');
  const [lastReadSurah, setLastReadSurah] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_READ_KEY)
      .then((v) => {
        if (!v) return;
        const n = parseInt(v, 10);
        // Reject NaN and out-of-range values silently; "Continue" badge stays
        // hidden rather than comparing surah.number to NaN forever.
        if (Number.isFinite(n) && n >= 1 && n <= 114) setLastReadSurah(n);
      })
      .catch((err) => console.warn('[Quran] read LAST_READ_KEY failed', err));
  }, []);

  if (loading) return <LoadingSpinner message={t('quran.surahList.loading')} dark={isDark} />;
  if (error) return <ErrorView message={error} dark={isDark} />;

  const filtered = query
    ? surahs.filter(
        (s) =>
          s.englishName.toLowerCase().includes(query.toLowerCase()) ||
          s.name.includes(query) ||
          String(s.number).includes(query),
      )
    : surahs;

  const renderSurah = ({ item }: { item: SurahMeta }) => {
    const isLastRead = item.number === lastReadSurah;
    const isMakki = item.revelationType === 'Meccan';

    return (
      <TouchableOpacity
        style={[styles.surahRow, { borderBottomColor: theme.border }]}
        onPress={() => router.push(`/quran/${item.number}` as any)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.surahNumber,
            { backgroundColor: Colors.primary + '18' },
          ]}
        >
          <Text style={[styles.surahNumberText, { color: Colors.primary }]}>
            {item.number}
          </Text>
        </View>
        <View style={styles.surahInfo}>
          <View style={styles.surahNameRow}>
            <Text style={[styles.surahEnglish, { color: theme.text }]}>
              {item.englishName}
            </Text>
            {isLastRead && (
              <View
                style={[styles.lastReadBadge, { backgroundColor: GOLD + '22' }]}
              >
                <Text style={[styles.lastReadText, { color: GOLD }]}>
                  {t('quran.surahList.continueBadge')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.surahMetaRow}>
            <View
              style={[
                styles.revelationBadge,
                {
                  backgroundColor: isMakki
                    ? Colors.primary + '18'
                    : '#3B82F618',
                },
              ]}
            >
              <Text
                style={[
                  styles.revelationText,
                  { color: isMakki ? Colors.primary : '#3B82F6' },
                ]}
              >
                {item.revelationType}
              </Text>
            </View>
            <Text style={[styles.surahMeta, { color: theme.textMuted }]}>
              {t('quran.surahList.versesCount', { count: item.numberOfAyahs })}
            </Text>
          </View>
        </View>
        <View style={styles.surahRight}>
          <Text style={[styles.surahArabic, { color: theme.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.surahTranslation, { color: theme.textMuted }]}>
            {item.englishNameTranslation}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderJuz = ({ item }: { item: typeof JUZ_DATA[0] }) => (
    <TouchableOpacity
      style={[
        styles.juzRow,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      activeOpacity={0.75}
    >
      <View style={[styles.juzNum, { backgroundColor: Colors.primary }]}>
        <Text style={styles.juzNumText}>{item.juz}</Text>
      </View>
      <View style={styles.juzInfo}>
        <Text style={[styles.juzName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.juzSurah, { color: theme.textSecondary }]}>
          {t('quran.juz.starts', { surah: item.surah, ayah: item.ayah })}
        </Text>
      </View>
      <View style={[styles.juzPageBadge, { backgroundColor: theme.surface }]}>
        <Text style={[styles.juzPageLabel, { color: theme.textMuted }]}>
          {t('quran.juz.pageLabel')}
        </Text>
        <Text style={[styles.juzPageNum, { color: Colors.primary }]}>
          {item.page}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('quran.surahList.searchPlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View
        style={[
          styles.surahTabBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.surahTab,
            surahTab === 'surahs' && {
              borderBottomColor: Colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setSurahTab('surahs')}
        >
          <Text
            style={[
              styles.surahTabText,
              {
                color:
                  surahTab === 'surahs' ? Colors.primary : theme.textMuted,
              },
            ]}
          >
            {t('quran.surahList.tabSurahs')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.surahTab,
            surahTab === 'juz' && {
              borderBottomColor: Colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setSurahTab('juz')}
        >
          <Text
            style={[
              styles.surahTabText,
              {
                color: surahTab === 'juz' ? Colors.primary : theme.textMuted,
              },
            ]}
          >
            {t('quran.surahList.tabJuz')}
          </Text>
        </TouchableOpacity>
      </View>

      {surahTab === 'surahs' ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          renderItem={renderSurah}
          contentContainerStyle={{ backgroundColor: theme.background }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
        />
      ) : (
        <FlatList
          data={JUZ_DATA}
          keyExtractor={(item) => String(item.juz)}
          renderItem={renderJuz}
          contentContainerStyle={styles.juzList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  surahTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  surahTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  surahTabText: { fontSize: 13, fontWeight: '600' },

  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  surahNumber: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surahNumberText: { fontSize: 14, fontWeight: '700' },
  surahInfo: { flex: 1 },
  surahNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  surahEnglish: { fontSize: 15, fontWeight: '600' },
  lastReadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lastReadText: { fontSize: 10, fontWeight: '700' },
  surahMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  revelationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  revelationText: { fontSize: 10, fontWeight: '600' },
  surahMeta: { fontSize: 12 },
  surahRight: { alignItems: 'flex-end' },
  surahArabic: { fontFamily: 'Amiri_400Regular', fontSize: 20 },
  surahTranslation: { fontSize: 11, marginTop: 2 },

  juzList: { padding: 12, gap: 10 },
  juzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  juzNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  juzNumText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  juzInfo: { flex: 1 },
  juzName: { fontSize: 14, fontWeight: '700' },
  juzSurah: { fontSize: 12, marginTop: 2 },
  juzPageBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  juzPageLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  juzPageNum: { fontSize: 16, fontWeight: '800' },
});
