import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Share,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../src/constants/colors';
import { trackScreen } from '../../src/services/analytics';
import { useSurah } from '../../src/hooks/useQuran';
import { useStore } from '../../src/store';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorView } from '../../src/components/ErrorView';
import { Ayah } from '../../src/services/api';
import { findTranslation } from '../../src/constants/translations';
import { FONTS, urduStyle } from '../../src/constants/fonts';
import { RECITERS } from '../../src/constants';

// ─── expo-av optional import ─────────────────────────────────────────────────
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch {}

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const QURAN_CDN = 'https://cdn.islamic.network/quran/audio/128';

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
  const { addBookmark, removeBookmark, isBookmarked } = useStore();

  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const selectedEdition = settings.selectedTranslation ?? 'ur.jalandhry';
  const translationMeta = findTranslation(selectedEdition);

  const { arabic, translation, loading, error, fromCache } = useSurah(surahNum, selectedEdition);

  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize] = useState(settings.arabicFontSize);
  const [tajweedOn, setTajweedOn] = useState(false);
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(settings.selectedReciter ?? 'ar.alafasy');
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [loadingAyah, setLoadingAyah] = useState<number | null>(null);
  const soundRef = useRef<any>(null);

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

  if (loading) return <LoadingSpinner message="Loading surah..." dark={isDark} />;
  if (error || !arabic || !translation)
    return <ErrorView message={error ?? 'Failed to load surah'} dark={isDark} />;

  // ─── Verse renderer ───────────────────────────────────────────────────────

  const renderVerse = ({ item, index }: { item: Ayah; index: number }) => {
    const trAyah = translation.ayahs[index];
    const bookmarkId = `quran_${surahNum}_${item.numberInSurah}`;
    const bookmarked = isBookmarked(bookmarkId);
    const isPlaying = playingAyah === item.number;
    const isLoadingAudio = loadingAyah === item.number;

    const handleBookmark = () => {
      if (bookmarked) {
        removeBookmark(bookmarkId);
      } else {
        addBookmark({
          id: bookmarkId,
          type: 'quran',
          surahNumber: surahNum,
          verseNumber: item.numberInSurah,
          arabic: item.text,
          english: trAyah?.text ?? '',
          reference: `${arabic.englishName} ${surahNum}:${item.numberInSurah}`,
          savedAt: Date.now(),
        });
      }
    };

    const handleShare = async () => {
      await Share.share({
        message: `${item.text}\n\n${trAyah?.text ?? ''}\n\n— ${arabic.englishName} ${surahNum}:${item.numberInSurah}`,
      });
    };

    // Render Arabic text: either plain or as tappable words with optional tajweed
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
                      style={tok.color !== 'inherit' ? { color: tok.color } : { color: theme.text }}
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
          style={[styles.arabicText, { color: theme.text, fontSize, lineHeight: fontSize * 1.9 }]}
          textBreakStrategy="simple"
        >
          {words.map((word, wIdx) => (
            <Text
              key={wIdx}
              onPress={() => handleWordTap(word, item)}
              style={{ color: theme.text }}
            >
              {word}{wIdx < words.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </Text>
      );
    };

    return (
      <View style={[styles.verseContainer, { borderBottomColor: theme.border }]}>
        {/* Verse number + actions */}
        <View style={styles.verseHeader}>
          <View style={[styles.verseNumBadge, { backgroundColor: Colors.primary + '18' }]}>
            <Text style={[styles.verseNum, { color: Colors.primary }]}>{item.numberInSurah}</Text>
          </View>
          <View style={styles.verseActions}>
            {/* Audio play button */}
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

        {/* Arabic text */}
        {renderArabicText()}

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

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>

      {/* Surah header */}
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

      {/* Toolbar */}
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

      {/* Tajweed legend */}
      {tajweedOn && (
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verseNum: { fontSize: 13, fontWeight: '700' },
  verseActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  arabicText: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
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
