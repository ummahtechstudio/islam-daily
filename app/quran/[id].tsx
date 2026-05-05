import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, palette } from '../../src/constants/colors';
import { trackScreen } from '../../src/services/analytics';
import { useSurah } from '../../src/hooks/useQuran';
import { useQuranDownload } from '../../src/hooks/useQuranDownload';
import QuranDownloadBanner from '../../src/components/quran/QuranDownloadBanner';
import { useStore } from '../../src/store';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorView } from '../../src/components/ErrorView';
import { Ayah } from '../../src/services/api';
import { findTranslation } from '../../src/constants/translations';
import { FONTS, urduStyle } from '../../src/constants/fonts';
import { RECITERS } from '../../src/constants';
import {
  addBookmark,
  getBookmarks,
  removeBookmark,
} from '../../src/utils/bookmarks';
import { shareContent } from '../../src/utils/share';

// ─── expo-av optional import ─────────────────────────────────────────────────
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch {}

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const QURAN_CDN = 'https://cdn.islamic.network/quran/audio/128';
const GOLD = '#EF9F27';

// ─── Recitation mode ─────────────────────────────────────────────────────────

type QuranMode = 'recite' | 'study';
const QURAN_MODE_KEY = 'settings_quran_mode';
const QURAN_ARABIC_FONT_SIZE_KEY = 'settings_quran_arabic_font_size';
const RECITE_FONT_SIZES = [24, 30, 36] as const;
const DEFAULT_RECITE_FONT_SIZE = 30;

const toArabicNumerals = (n: number): string =>
  String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

// ─── Tajweed parsing ─────────────────────────────────────────────────────────

const QALQALA = new Set(['ق', 'ط', 'ب', 'ج', 'د']);
const IKHFA_LETTERS = new Set([
  'ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك',
]);
const SHADDAH = '\u0651';
const SUKOON = '\u0652';
const TANWIN_FATH = '\u064B';
const TANWIN_KASR = '\u064D';
const TANWIN_DAMM = '\u064C';
const ALIF = 'ا';
const WAW = 'و';
const YA = 'ي';

function isDiacritic(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x0610 && code <= 0x061a) ||
    (code >= 0x064b && code <= 0x065f) ||
    code === 0x0670
  );
}

function isArabicLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06ff) || (code >= 0xfe70 && code <= 0xfeff);
}

type TajweedToken = { text: string; color: string };

function parseTajweed(text: string): TajweedToken[] {
  const tokens: TajweedToken[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    let token = char;
    let j = i + 1;

    // Absorb following diacritics into this token
    while (j < text.length && isDiacritic(text[j])) {
      token += text[j];
      j++;
    }

    const nextLetter = j < text.length ? text[j] : '';
    let color = 'inherit';

    if (!isArabicLetter(char)) {
      // Space or non-Arabic character — no colour
      color = 'inherit';
    } else if (QALQALA.has(char)) {
      color = '#4B9BFF'; // blue — qalqala
    } else if ((char === 'ن' || char === 'م') && token.includes(SHADDAH)) {
      color = '#4CAF50'; // green — ghunna with shaddah
    } else if (char === 'ن') {
      const hasTanwinOrSukoon =
        token.includes(SUKOON) ||
        token.includes(TANWIN_FATH) ||
        token.includes(TANWIN_KASR) ||
        token.includes(TANWIN_DAMM);
      if (hasTanwinOrSukoon && IKHFA_LETTERS.has(nextLetter)) {
        color = '#FF9800'; // orange — ikhfa
      } else if (hasTanwinOrSukoon && (nextLetter === 'م' || nextLetter === 'ن')) {
        color = '#4CAF50'; // green — ghunna (idgham with ghunna)
      }
    } else if (char === ALIF) {
      color = '#F5C518'; // yellow — madd alif
    } else if ((char === WAW || char === YA) && token.includes(SUKOON)) {
      color = '#F5C518'; // yellow — madd waw/ya with sukoon
    }

    tokens.push({ text: token, color });
    i = j;
  }

  return tokens;
}

// ─── Word-by-word popup ───────────────────────────────────────────────────────

interface WordMeaning {
  word: string;
  transliteration: string;
  ayahRef: string;
}

async function fetchWordMeaning(globalAyahNumber: number): Promise<{ arabic: string; transliteration: string } | null> {
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${globalAyahNumber}/editions/quran-uthmani,en.transliteration`
    );
    const json = await res.json();
    if (json.code !== 200) return null;
    return {
      arabic: json.data?.[0]?.text ?? '',
      transliteration: json.data?.[1]?.text ?? '',
    };
  } catch {
    return null;
  }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SurahReaderScreen() {
  useEffect(() => { trackScreen('SurahReader'); }, []);
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahNum = parseInt(id ?? '1', 10);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [bookmarkedAyahs, setBookmarkedAyahs] = useState<Set<string>>(new Set());

  const refreshBookmarks = useCallback(async () => {
    const all = await getBookmarks();
    setBookmarkedAyahs(
      new Set(all.filter((b) => b.type === 'quran').map((b) => b.id)),
    );
  }, []);

  useEffect(() => { refreshBookmarks(); }, [refreshBookmarks]);

  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const selectedEdition = settings.selectedTranslation ?? 'ur.jalandhry';
  const translationMeta = findTranslation(selectedEdition);

  const { arabic, translation, loading, error, fromCache } = useSurah(surahNum, selectedEdition);
  const quranDownload = useQuranDownload();

  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize] = useState(settings.arabicFontSize);
  const [tajweedOn, setTajweedOn] = useState(false);
  const [quranMode, setQuranMode] = useState<QuranMode>('recite');
  const [reciteFontSize, setReciteFontSize] = useState<number>(DEFAULT_RECITE_FONT_SIZE);

  useEffect(() => {
    (async () => {
      try {
        const [m, f] = await Promise.all([
          AsyncStorage.getItem(QURAN_MODE_KEY),
          AsyncStorage.getItem(QURAN_ARABIC_FONT_SIZE_KEY),
        ]);
        if (m === 'recite' || m === 'study') setQuranMode(m);
        const fNum = f ? parseInt(f, 10) : NaN;
        if ((RECITE_FONT_SIZES as readonly number[]).includes(fNum)) {
          setReciteFontSize(fNum);
        }
      } catch {}
    })();
  }, []);

  const updateQuranMode = (m: QuranMode) => {
    setQuranMode(m);
    AsyncStorage.setItem(QURAN_MODE_KEY, m).catch(() => {});
  };

  const updateReciteFontSize = (n: number) => {
    setReciteFontSize(n);
    AsyncStorage.setItem(QURAN_ARABIC_FONT_SIZE_KEY, String(n)).catch(() => {});
  };
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [showReciteSettings, setShowReciteSettings] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(settings.selectedReciter ?? 'ar.alafasy');
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [loadingAyah, setLoadingAyah] = useState<number | null>(null);
  const soundRef = useRef<any>(null);

  const surahBookmarkId = `quran_surah_${surahNum}`;
  const surahBookmarked = bookmarkedAyahs.has(surahBookmarkId);

  const toggleSurahBookmark = async () => {
    if (!arabic) return;
    if (surahBookmarked) {
      await removeBookmark('quran', surahBookmarkId);
    } else {
      await addBookmark({
        type: 'quran',
        id: surahBookmarkId,
        title: `${arabic.englishName} (Full Surah)`,
        arabic: BISMILLAH,
        translation: `Surah ${arabic.englishName} — ${arabic.numberOfAyahs} verses`,
        reference: `Surah ${arabic.englishName} (#${surahNum})`,
        category: 'surah',
      });
    }
    refreshBookmarks();
  };

  // Word meaning popup
  const [wordPopup, setWordPopup] = useState<WordMeaning | null>(null);
  const [wordLoading, setWordLoading] = useState(false);

  const handleWordTap = async (word: string, ayah: Ayah) => {
    setWordLoading(true);
    setWordPopup({ word, transliteration: '...', ayahRef: `${surahNum}:${ayah.numberInSurah}` });
    const data = await fetchWordMeaning(ayah.number);
    if (data) {
      // Try to match the tapped word index in the ayah
      const arabicWords = data.arabic.split(' ');
      const translitWords = data.transliteration.split(' ');
      const wordIndex = arabicWords.findIndex(
        (w) => w.replace(/[\u064B-\u065F\u0670]/g, '') === word.replace(/[\u064B-\u065F\u0670]/g, '')
      );
      const translit = wordIndex >= 0 && wordIndex < translitWords.length
        ? translitWords[wordIndex]
        : data.transliteration;
      setWordPopup({ word, transliteration: translit, ayahRef: `${surahNum}:${ayah.numberInSurah}` });
    }
    setWordLoading(false);
  };

  const playAyah = async (ayah: Ayah) => {
    if (!Audio) {
      alert('Audio requires expo-av. Run: npx expo install expo-av');
      return;
    }
    if (playingAyah === ayah.number) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setPlayingAyah(null);
      return;
    }
    try {
      setLoadingAyah(ayah.number);
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      const url = `${QURAN_CDN}/${selectedReciter}/${ayah.number}.mp3`;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingAyah(ayah.number);
      setLoadingAyah(null);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setPlayingAyah(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      setLoadingAyah(null);
      alert('Failed to load audio.');
    }
  };

  const selectReciter = (id: string) => {
    setSelectedReciter(id);
    updateSettings({ selectedReciter: id });
    setShowReciterPicker(false);
  };

  const downloadBanner = !quranDownload.cached ? (
    <QuranDownloadBanner
      progress={quranDownload.progress}
      error={quranDownload.error}
      isOnline={quranDownload.isOnline}
      onRetry={quranDownload.retry}
    />
  ) : null;

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.background }}
        edges={['top']}
      >
        {downloadBanner}
        <LoadingSpinner message="Loading surah..." dark={isDark} />
      </SafeAreaView>
    );
  }

  if (error || !arabic || !translation) {
    if (!quranDownload.cached) {
      return (
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.background }}
          edges={['top']}
        >
          {downloadBanner}
          <View style={styles.surahPendingWrap}>
            <Ionicons name="hourglass-outline" size={36} color={palette.gold} />
            <Text style={[styles.surahPendingTitle, { color: theme.text }]}>
              This surah will be ready shortly
            </Text>
            <Text style={[styles.surahPendingBody, { color: theme.textMuted }]}>
              The Quran is downloading once and works offline after that.
            </Text>
          </View>
        </SafeAreaView>
      );
    }
    return <ErrorView message={error ?? 'Failed to load surah'} dark={isDark} />;
  }

  // ─── Verse renderer ───────────────────────────────────────────────────────

  const renderVerse = ({ item, index }: { item: Ayah; index: number }) => {
    const trAyah = translation.ayahs[index];
    const bookmarkId = `quran_${surahNum}_${item.numberInSurah}`;
    const bookmarked = bookmarkedAyahs.has(bookmarkId);
    const isPlaying = playingAyah === item.number;
    const isLoadingAudio = loadingAyah === item.number;
    const reference = `${arabic.englishName} ${surahNum}:${item.numberInSurah}`;

    const handleBookmark = async () => {
      if (bookmarked) {
        await removeBookmark('quran', bookmarkId);
      } else {
        await addBookmark({
          type: 'quran',
          id: bookmarkId,
          title: `${arabic.englishName} ${surahNum}:${item.numberInSurah}`,
          arabic: item.text,
          translation: trAyah?.text ?? '',
          reference,
        });
      }
      refreshBookmarks();
    };

    const handleShare = async () => {
      await shareContent({
        arabic: item.text,
        translation: trAyah?.text ?? '',
        reference,
        type: 'quran',
      });
    };

    // ─── Recite mode: Arabic-only, large font, decorative ayah marker ──────
    if (quranMode === 'recite') {
      return (
        <View style={[styles.reciteVerse, { borderBottomColor: GOLD + '30' }]}>
          <Text
            style={[
              styles.reciteArabic,
              {
                color: theme.text,
                fontSize: reciteFontSize,
                lineHeight: reciteFontSize + 22,
              },
            ]}
            textBreakStrategy="simple"
          >
            {item.text}
          </Text>
          <Text style={[styles.ayahMarker, { color: GOLD }]}>
            {`\u{FD3F} ${toArabicNumerals(item.numberInSurah)} \u{FD3E}`}
          </Text>
          <View style={styles.reciteActions}>
            <TouchableOpacity onPress={() => playAyah(item)} hitSlop={8}>
              {isLoadingAudio ? (
                <ActivityIndicator size={16} color={Colors.primary} />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
                  size={20}
                  color={isPlaying ? Colors.primary : theme.textMuted}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBookmark} hitSlop={8}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={bookmarked ? Colors.accent : theme.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-outline" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Render Arabic text: either plain or as tappable words with optional tajweed
    const arabicInk = '#1A3D2F'; // textOnCream
    const renderArabicText = () => {
      if (tajweedOn) {
        // Render word-by-word with tajweed colors and tap-to-look-up
        const words = item.text.split(' ');
        return (
          <Text
            style={[styles.arabicText, { fontSize, lineHeight: fontSize * 1.9 }]}
            textBreakStrategy="simple"
          >
            {words.map((word, wIdx) => {
              const tokens = parseTajweed(word);
              return (
                <Text key={wIdx} onPress={() => handleWordTap(word, item)}>
                  {tokens.map((tok, tIdx) => (
                    <Text
                      key={tIdx}
                      style={tok.color !== 'inherit' ? { color: tok.color } : { color: arabicInk }}
                    >
                      {tok.text}
                    </Text>
                  ))}
                  {wIdx < words.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </Text>
        );
      }

      // Normal mode: tappable words for word-by-word meaning
      const words = item.text.split(' ');
      return (
        <Text
          style={[styles.arabicText, { color: arabicInk, fontSize, lineHeight: fontSize * 1.9 }]}
          textBreakStrategy="simple"
        >
          {words.map((word, wIdx) => (
            <Text
              key={wIdx}
              onPress={() => handleWordTap(word, item)}
              style={{ color: arabicInk }}
            >
              {word}{wIdx < words.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </Text>
      );
    };

    return (
      <View style={[styles.verseContainer, { borderBottomColor: theme.border }]}>
        {/* Verse actions row */}
        <View style={styles.verseHeader}>
          <View style={styles.verseActions}>
            <TouchableOpacity onPress={() => playAyah(item)} hitSlop={8}>
              {isLoadingAudio ? (
                <ActivityIndicator size={18} color={Colors.primary} />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
                  size={22}
                  color={isPlaying ? Colors.primary : theme.textMuted}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBookmark} hitSlop={8}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={bookmarked ? Colors.accent : theme.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-outline" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arabic on cream — manuscript treatment */}
        <View style={styles.arabicCream}>
          <View style={styles.arabicBadge}>
            <Text style={styles.arabicBadgeText}>{item.numberInSurah}</Text>
          </View>
          {renderArabicText()}
        </View>

        {/* Translation */}
        {showTranslation && trAyah && (
          <View style={[styles.translationBlock, { borderLeftColor: Colors.primary + '40' }]}>
            <Text style={[styles.translationLabel, { color: Colors.primary }]}>
              {translationMeta.translationLabel}
            </Text>
            <Text
              style={[
                styles.translationText,
                { color: theme.textSecondary },
                translationMeta.rtl && styles.translationRtl,
                translationMeta.isUrdu && urduStyle(16),
              ]}
              textBreakStrategy="simple"
            >
              {trAyah.text}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Reciter name display ─────────────────────────────────────────────────
  const reciterName = RECITERS.find((r) => r.id === selectedReciter)?.name ?? selectedReciter;

  const isRecite = quranMode === 'recite';

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: arabic.englishName,
          headerRight: () =>
            isRecite ? (
              <TouchableOpacity
                onPress={() => setShowReciteSettings(true)}
                hitSlop={8}
                style={{ marginRight: 4 }}
              >
                <Ionicons name="settings-outline" size={22} color="#fff" />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {downloadBanner}

      {/* Surah header (study mode only) */}
      {!isRecite && (
        <View style={[styles.surahHeader, { backgroundColor: Colors.primary }]}>
          <Text style={styles.surahName}>{arabic.englishName}</Text>
          <Text style={styles.surahArabicName}>{arabic.name}</Text>
          <Text style={styles.surahMeta}>
            {arabic.revelationType} · {arabic.numberOfAyahs} Verses
          </Text>
          {surahNum !== 9 && (
            <Text style={styles.bismillah}>{BISMILLAH}</Text>
          )}
        </View>
      )}

      {/* Mode toggle pills (study mode only — recite mode toggles via gear) */}
      {!isRecite && (
        <View style={[styles.modeBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.modePill, { borderColor: theme.border }]}
            onPress={() => updateQuranMode('recite')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modePillText, { color: theme.textMuted }]}>
              🔊 Recite
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modePill,
              { borderColor: theme.border },
              { backgroundColor: GOLD, borderColor: GOLD },
            ]}
            onPress={() => updateQuranMode('study')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modePillText, { color: '#fff' }]}>
              📖 Study
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toolbar (Study mode only) */}
      {quranMode === 'study' && (
      <View style={[styles.toolbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {/* Offline cache indicator */}
        {fromCache && (
          <View style={styles.cacheIndicator}>
            <Ionicons name="cloud-offline-outline" size={14} color={theme.textMuted} />
          </View>
        )}

        {/* Translation toggle */}
        <TouchableOpacity
          style={[styles.toolbarBtn, showTranslation && styles.toolbarBtnActive]}
          onPress={() => setShowTranslation(!showTranslation)}
        >
          <Ionicons
            name="language"
            size={16}
            color={showTranslation ? Colors.primary : theme.textMuted}
          />
          <Text style={[styles.toolbarText, { color: showTranslation ? Colors.primary : theme.textMuted }]}>
            {translationMeta.name.split(' — ')[0]}
          </Text>
        </TouchableOpacity>

        <View style={styles.toolbarRight}>
          {/* Tajweed toggle */}
          <TouchableOpacity
            style={[styles.toolbarIconBtn, tajweedOn && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }, { borderColor: theme.border }]}
            onPress={() => setTajweedOn((v) => !v)}
            hitSlop={6}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: tajweedOn ? Colors.primary : theme.textMuted }}>
              تج
            </Text>
          </TouchableOpacity>

          {/* Reciter selector */}
          <TouchableOpacity
            style={[styles.toolbarIconBtn, { borderColor: theme.border }]}
            onPress={() => setShowReciterPicker(true)}
            hitSlop={6}
          >
            <Ionicons name="musical-notes" size={15} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Font size */}
          <View style={styles.fontControls}>
            <TouchableOpacity onPress={() => setFontSize((f) => Math.max(16, f - 2))} hitSlop={8} style={styles.fontBtn}>
              <Text style={[styles.fontBtnText, { color: theme.text }]}>A-</Text>
            </TouchableOpacity>
            <Text style={[styles.fontSizeLabel, { color: theme.textMuted }]}>{fontSize}</Text>
            <TouchableOpacity onPress={() => setFontSize((f) => Math.min(40, f + 2))} hitSlop={8} style={styles.fontBtn}>
              <Text style={[styles.fontBtnText, { color: theme.text }]}>A+</Text>
            </TouchableOpacity>
          </View>

          {/* Language picker */}
          <TouchableOpacity
            style={[styles.langBtn, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary + '40' }]}
            onPress={() => router.push('/language' as any)}
          >
            <Ionicons name="globe-outline" size={14} color={Colors.primary} />
            <Text style={[styles.langBtnText, { color: Colors.primary }]}>
              {translationMeta.edition.split('.')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Tajweed legend */}
      {quranMode === 'study' && tajweedOn && (
        <View style={[styles.legend, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.legendItem, { color: '#4B9BFF' }]}>■ Qalqala</Text>
          <Text style={[styles.legendItem, { color: '#4CAF50' }]}>■ Ghunna</Text>
          <Text style={[styles.legendItem, { color: '#F5C518' }]}>■ Madd</Text>
          <Text style={[styles.legendItem, { color: '#FF9800' }]}>■ Ikhfa</Text>
          <Text style={[styles.legendTip, { color: theme.textMuted }]}>Tap word for meaning</Text>
        </View>
      )}

      <FlatList
        data={arabic.ayahs}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderVerse}
        contentContainerStyle={{ backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListHeaderComponent={
          isRecite && surahNum !== 9 ? (
            <View style={styles.reciteBismillahWrap}>
              <Text style={[styles.reciteBismillah, { color: GOLD }]}>{BISMILLAH}</Text>
            </View>
          ) : null
        }
      />

      {/* ── Reciter Picker Modal ── */}
      <Modal visible={showReciterPicker} transparent animationType="slide" onRequestClose={() => setShowReciterPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowReciterPicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Reciter</Text>
            {RECITERS.map((r, idx) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.reciterRow,
                  idx < RECITERS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  r.id === selectedReciter && { backgroundColor: Colors.primary + '10' },
                ]}
                onPress={() => selectReciter(r.id)}
              >
                <Ionicons name="musical-note" size={18} color={Colors.primary} />
                <Text style={[styles.reciterName, { color: r.id === selectedReciter ? Colors.primary : theme.text }]}>
                  {r.name}
                </Text>
                {r.id === selectedReciter && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Recite Settings Modal ── */}
      <Modal
        visible={showReciteSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReciteSettings(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReciteSettings(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recite Settings</Text>

            {/* Switch to Study mode */}
            <TouchableOpacity
              style={[styles.reciteSettingRow, { borderBottomColor: theme.border }]}
              onPress={() => {
                updateQuranMode('study');
                setShowReciteSettings(false);
              }}
            >
              <Ionicons name="book-outline" size={20} color={Colors.primary} />
              <Text style={[styles.reciteSettingLabel, { color: theme.text }]}>Switch to Study Mode</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Bookmark surah */}
            <TouchableOpacity
              style={[styles.reciteSettingRow, { borderBottomColor: theme.border }]}
              onPress={toggleSurahBookmark}
            >
              <Ionicons
                name={surahBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={surahBookmarked ? Colors.accent : Colors.primary}
              />
              <Text style={[styles.reciteSettingLabel, { color: theme.text }]}>
                {surahBookmarked ? 'Bookmarked' : 'Bookmark this Surah'}
              </Text>
              {surahBookmarked && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
              )}
            </TouchableOpacity>

            {/* Font size */}
            <View style={styles.reciteSettingFontRow}>
              <Text style={[styles.reciteSettingLabel, { color: theme.text, flex: 0 }]}>Font Size</Text>
              <View style={styles.reciteSettingFontPills}>
                {RECITE_FONT_SIZES.map((size, idx) => {
                  const labels = ['A-', 'A', 'A+'];
                  const active = reciteFontSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.reciteFontPill,
                        { borderColor: theme.border },
                        active && { backgroundColor: GOLD + '22', borderColor: GOLD },
                      ]}
                      onPress={() => updateReciteFontSize(size)}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.reciteFontPillText,
                          { color: active ? GOLD : theme.textMuted, fontSize: 11 + idx * 2 },
                        ]}
                      >
                        {labels[idx]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Word Meaning Popup ── */}
      <Modal visible={!!wordPopup} transparent animationType="fade" onRequestClose={() => setWordPopup(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setWordPopup(null)}>
          <Pressable style={[styles.wordPopup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {wordPopup && (
              <>
                <Text style={[styles.wordArabic, { color: theme.text }]}>{wordPopup.word}</Text>
                <View style={[styles.wordDivider, { backgroundColor: theme.border }]} />
                {wordLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 8 }} />
                ) : (
                  <>
                    <Text style={[styles.wordLabel, { color: theme.textMuted }]}>Transliteration</Text>
                    <Text style={[styles.wordTranslit, { color: theme.text }]}>{wordPopup.transliteration}</Text>
                    <Text style={[styles.wordRef, { color: Colors.primary }]}>{wordPopup.ayahRef}</Text>
                  </>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  surahPendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  surahPendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  surahPendingBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  surahHeader: {
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  surahName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  surahArabicName: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Amiri_400Regular', fontSize: 24 },
  surahMeta: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 8 },
  bismillah: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    marginTop: 8,
  },

  modeBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  modePill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 110,
    alignItems: 'center',
  },
  modePillText: { fontSize: 13, fontWeight: '700' },

  reciteControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  reciteControlsLabel: { fontSize: 12, fontWeight: '600', marginRight: 4 },
  reciteFontPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 36,
    alignItems: 'center',
  },
  reciteFontPillText: { fontWeight: '700' },

  reciteVerse: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  reciteArabic: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reciteBismillahWrap: {
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: 'center',
  },
  reciteBismillah: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 30,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  reciteSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reciteSettingLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  reciteSettingFontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  reciteSettingFontPills: { flexDirection: 'row', gap: 8 },
  ayahMarker: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 1,
  },
  reciteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolbarBtnActive: { backgroundColor: Colors.primary + '15' },
  toolbarText: { fontSize: 13, fontWeight: '600' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fontBtn: { padding: 4 },
  fontBtnText: { fontSize: 14, fontWeight: '700' },
  fontSizeLabel: { fontSize: 13, minWidth: 22, textAlign: 'center' },
  cacheIndicator: { marginRight: 4 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  langBtnText: { fontSize: 12, fontWeight: '700' },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
  },
  legendItem: { fontSize: 11, fontWeight: '600' },
  legendTip: { fontSize: 10, fontStyle: 'italic', marginLeft: 'auto' },

  verseContainer: { padding: 16, borderBottomWidth: 1 },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  arabicCream: {
    backgroundColor: '#FBF6E4',
    borderWidth: 1,
    borderColor: 'rgba(200,148,31,0.4)',
    borderRadius: 12,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    position: 'relative',
  },
  arabicBadge: {
    position: 'absolute',
    top: -10,
    left: 14,
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    backgroundColor: '#FBF6E4',
    borderWidth: 1,
    borderColor: '#C8941F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arabicBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C8941F',
    letterSpacing: 0.3,
  },

  arabicText: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4,
  },

  translationBlock: { borderLeftWidth: 3, paddingLeft: 12, marginTop: 4 },
  translationLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'Amiri_400Regular',
  },
  translationText: { fontSize: 14, lineHeight: 24 },
  translationRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'Amiri_400Regular',
    fontSize: 16,
    lineHeight: 30,
    // Urdu editions override this via urduStyle(16) applied inline
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderRadius: 12,
  },
  reciterName: { flex: 1, fontSize: 16, fontWeight: '600' },

  wordPopup: {
    width: 280,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 100,
  },
  wordArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 36,
    textAlign: 'center',
  },
  wordDivider: { width: '70%', height: 1, marginVertical: 4 },
  wordLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  wordTranslit: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  wordRef: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});
