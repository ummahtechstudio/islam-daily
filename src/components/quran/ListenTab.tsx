import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, palette } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { SURAH_META } from '../../constants/surahMeta';
import { getAyahsForSurah, type AyahLite } from '../../services/quranCache';
import { useQuranAudio } from '../../context/QuranAudioContext';
import { prefs } from '../../lib/storage';

const LAST_LISTEN_SURAH_KEY = 'quran_audio_last_surah_v1';

export default function ListenTab({ isDark }: { isDark: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  const audio = useQuranAudio();

  // Persist the last surah the user was listening to so the picker doesn't
  // reset to Al-Fatihah every time.
  const [surahNumber, setSurahNumber] = useState<number>(() => {
    const stored = prefs.get(LAST_LISTEN_SURAH_KEY);
    const n = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(n) && n >= 1 && n <= 114 ? n : 1;
  });

  useEffect(() => {
    prefs.set(LAST_LISTEN_SURAH_KEY, String(surahNumber));
  }, [surahNumber]);

  const [surahPickerOpen, setSurahPickerOpen] = useState(false);

  const surahMeta = useMemo(
    () => SURAH_META.find((m) => m.number === surahNumber),
    [surahNumber],
  );

  const ayahs = useMemo<AyahLite[]>(() => getAyahsForSurah(surahNumber), [surahNumber]);

  const renderAyah = useCallback(
    ({ item }: { item: AyahLite }) => {
      const active = audio.isAyahActive(item.surah, item.ayah);
      const loadingThis = active && audio.isLoading;
      return (
        <TouchableOpacity
          onPress={() => audio.playAyah(item.surah, item.ayah)}
          activeOpacity={0.7}
          style={[
            styles.ayahRow,
            { borderColor: theme.border, backgroundColor: theme.card },
            active && styles.ayahRowActive,
          ]}
        >
          <View
            style={[
              styles.ayahNumber,
              { borderColor: theme.border },
              active && styles.ayahNumberActive,
            ]}
          >
            {loadingThis ? (
              <ActivityIndicator size="small" color={active ? '#fff' : palette.green} />
            ) : active && audio.isPlaying ? (
              <Ionicons name="pause" size={14} color="#fff" />
            ) : active ? (
              <Ionicons name="play" size={14} color="#fff" />
            ) : (
              <Text style={[styles.ayahNumberText, { color: theme.textMuted }]}>
                {item.ayah}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.ayahArabic,
              { color: active ? palette.green : theme.text },
            ]}
            numberOfLines={3}
          >
            {item.text_indopak || item.text_arabic || ''}
          </Text>
        </TouchableOpacity>
      );
    },
    [audio, theme.border, theme.card, theme.text, theme.textMuted],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* ── Reciter picker ── */}
      <View style={[styles.reciterStrip, { borderBottomColor: theme.border }]}>
        <Text style={[styles.reciterLabel, { color: theme.textMuted }]}>
          Reciter
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reciterRow}
        >
          {audio.reciters.map((r) => {
            const active = r.id === audio.reciterId;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => audio.setReciter(r.id)}
                activeOpacity={0.8}
                style={[
                  styles.reciterChip,
                  {
                    backgroundColor: active ? palette.green : theme.card,
                    borderColor: active ? palette.green : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reciterChipText,
                    { color: active ? '#fff' : theme.text },
                  ]}
                >
                  {r.shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Surah selector ── */}
      <TouchableOpacity
        onPress={() => setSurahPickerOpen((v) => !v)}
        activeOpacity={0.8}
        style={[styles.surahHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.surahHeaderLabel, { color: theme.textMuted }]}>
            Surah
          </Text>
          <Text style={[styles.surahHeaderName, { color: theme.text }]}>
            {surahMeta ? `${surahMeta.number}. ${surahMeta.name_english}` : '—'}
          </Text>
        </View>
        <Text style={[styles.surahHeaderArabic, { color: palette.green }]}>
          {surahMeta?.name_arabic ?? ''}
        </Text>
        <Ionicons
          name={surahPickerOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textMuted}
        />
      </TouchableOpacity>

      {surahPickerOpen ? (
        <FlatList
          data={SURAH_META}
          keyExtractor={(m) => String(m.number)}
          contentContainerStyle={styles.surahList}
          renderItem={({ item }) => {
            const isCur = item.number === surahNumber;
            return (
              <TouchableOpacity
                onPress={() => {
                  setSurahNumber(item.number);
                  setSurahPickerOpen(false);
                }}
                activeOpacity={0.7}
                style={[
                  styles.surahListRow,
                  { borderBottomColor: theme.border },
                  isCur && { backgroundColor: palette.green + '14' },
                ]}
              >
                <Text style={[styles.surahListNum, { color: theme.textMuted }]}>
                  {item.number}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.surahListName, { color: theme.text }]}>
                    {item.name_english}
                  </Text>
                </View>
                <Text style={[styles.surahListArabic, { color: palette.green }]}>
                  {item.name_arabic}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={ayahs}
          keyExtractor={(a) => `${a.surah}-${a.ayah}`}
          renderItem={renderAyah}
          contentContainerStyle={styles.ayahList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No ayahs available for this surah.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  reciterStrip: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  reciterLabel: {
    paddingHorizontal: spacing.md,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  reciterRow: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  reciterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  reciterChipText: { fontSize: 13, fontWeight: '700' },

  surahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  surahHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  surahHeaderName: {
    ...typography.heading3,
    marginTop: 2,
  },
  surahHeaderArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
  },

  surahList: { paddingBottom: 120 },
  surahListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  surahListNum: { fontSize: 13, fontWeight: '700', width: 28, textAlign: 'right' },
  surahListName: { fontSize: 15, fontWeight: '600' },
  surahListArabic: { fontFamily: 'Amiri_400Regular', fontSize: 18 },

  ayahList: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
    gap: 8,
  },
  ayahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  ayahRowActive: {
    borderColor: palette.green,
    backgroundColor: palette.green + '0d',
  },
  ayahNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahNumberActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  ayahNumberText: { fontSize: 12, fontWeight: '700' },
  ayahArabic: {
    flex: 1,
    fontFamily: 'IndoPakNastaleeq',
    fontSize: 20,
    lineHeight: 36,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  empty: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
