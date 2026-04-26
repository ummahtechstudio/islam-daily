import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { Colors } from '../constants/colors';
import { urduStyle } from '../constants/fonts';
import { AUDIO_CATEGORIES } from '../constants/audioLibraryData';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = '#C9A84C';
const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SLEEP_OPTS = [15, 30, 45, 60] as const;

const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  isDark: boolean;
}

export function FullPlayerModal({ isDark }: Props) {
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    isPlaying,
    positionSec,
    durationSec,
    speed,
    sleepMinutes,
    isFullPlayerOpen,
    playlist,
    playlistIndex,
    togglePlay,
    seekTo,
    skipNext,
    skipPrev,
    cycleSpeed,
    setSleepTimer,
    closeFullPlayer,
    stop,
  } = useAudioPlayer();

  const [barWidth, setBarWidth] = useState(300);
  const theme = isDark ? Colors.dark : Colors.light;

  if (!isFullPlayerOpen || !currentTrack) return null;

  const pct = durationSec > 0 ? positionSec / durationSec : 0;
  const hasPrev = playlistIndex > 0;
  const hasNext = playlistIndex < playlist.length - 1;
  const cat = AUDIO_CATEGORIES.find(c => c.id === currentTrack.category);

  return (
    <Modal
      visible={isFullPlayerOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeFullPlayer}
    >
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        {/* Top bar */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={closeFullPlayer} hitSlop={12}>
            <Ionicons name="chevron-down" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topLabel, { color: theme.textMuted }]}>
            {currentTrack.sub_category}
          </Text>
          <TouchableOpacity onPress={stop} hitSlop={12}>
            <Ionicons name="close-circle-outline" size={26} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Album art */}
        <View style={[styles.artWrap, { backgroundColor: (cat?.color ?? Colors.primary) + '18' }]}>
          <Text style={styles.artEmoji}>{cat?.icon ?? '🎧'}</Text>
          <View style={[styles.langBadge, { backgroundColor: Colors.primary }]}>
            <Text style={styles.langBadgeTxt}>
              {currentTrack.language === 'urdu'
                ? 'اردو'
                : currentTrack.language === 'arabic'
                ? 'عربی'
                : 'English'}
            </Text>
          </View>
        </View>

        {/* Track info */}
        <View style={styles.infoBlock}>
          {(currentTrack.language === 'urdu' || currentTrack.language === 'arabic') && (
            <Text style={[urduStyle(20), styles.titleUrdu, { color: theme.text }]}>
              {currentTrack.title_urdu}
            </Text>
          )}
          <Text style={[styles.titleEng, { color: theme.text }]} numberOfLines={2}>
            {currentTrack.title_english}
          </Text>
          <Text style={[styles.author, { color: cat?.color ?? Colors.primary }]}>
            {currentTrack.author}
          </Text>
          {currentTrack.total_episodes != null && (
            <Text style={[styles.epCount, { color: theme.textMuted }]}>
              {playlistIndex + 1} / {currentTrack.total_episodes} episodes
            </Text>
          )}
        </View>

        {/* Seek bar */}
        <View style={styles.seekSection}>
          <Pressable
            onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
            onPress={e =>
              seekTo(Math.round((e.nativeEvent.locationX / barWidth) * durationSec))
            }
            style={[styles.seekTrack, { backgroundColor: theme.border }]}
          >
            <View
              style={[
                styles.seekFill,
                { width: `${pct * 100}%` as any, backgroundColor: cat?.color ?? Colors.primary },
              ]}
            />
            <View
              style={[
                styles.seekThumb,
                {
                  left: `${pct * 100}%` as any,
                  backgroundColor: cat?.color ?? Colors.primary,
                },
              ]}
            />
          </Pressable>
          <View style={styles.timesRow}>
            <Text style={[styles.timeText, { color: theme.textMuted }]}>
              {fmtTime(positionSec)}
            </Text>
            <Text style={[styles.timeText, { color: theme.textMuted }]}>
              {durationSec > 0 ? fmtTime(durationSec) : '--:--'}
            </Text>
          </View>
        </View>

        {/* Playback controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={skipPrev}
            disabled={!hasPrev}
            style={[styles.skipBtn, !hasPrev && styles.disabled]}
          >
            <Ionicons name="play-skip-back" size={28} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlay}
            style={[
              styles.playBtn,
              { backgroundColor: cat?.color ?? Colors.primary },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={skipNext}
            disabled={!hasNext}
            style={[styles.skipBtn, !hasNext && styles.disabled]}
          >
            <Ionicons name="play-skip-forward" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Speed + Sleep timer row */}
        <View style={styles.extrasRow}>
          {/* Speed cycle button */}
          <TouchableOpacity
            onPress={cycleSpeed}
            style={[
              styles.extraBtn,
              { backgroundColor: Colors.primary + '18', borderColor: Colors.primary + '40' },
            ]}
          >
            <Ionicons name="speedometer-outline" size={15} color={Colors.primary} />
            <Text style={[styles.extraTxt, { color: Colors.primary }]}>{speed}×</Text>
          </TouchableOpacity>

          {/* Sleep timer — active state or chip row */}
          {sleepMinutes ? (
            <TouchableOpacity
              onPress={() => setSleepTimer(null)}
              style={[
                styles.extraBtn,
                { backgroundColor: GOLD + '20', borderColor: GOLD + '50' },
              ]}
            >
              <Ionicons name="moon" size={15} color={GOLD} />
              <Text style={[styles.extraTxt, { color: GOLD }]}>{sleepMinutes}m</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {SLEEP_OPTS.map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSleepTimer(m)}
                  style={[
                    styles.sleepChip,
                    { backgroundColor: theme.surface ?? theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="moon-outline" size={12} color={theme.textMuted} />
                  <Text style={[styles.sleepTxt, { color: theme.textMuted }]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topLabel: { fontSize: 13, fontWeight: '600' },

  artWrap: {
    width: 220,
    height: 220,
    borderRadius: 28,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  artEmoji: { fontSize: 88 },
  langBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  infoBlock: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  titleUrdu: { textAlign: 'center' },
  titleEng: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  author: { fontSize: 13, fontWeight: '600' },
  epCount: { fontSize: 12 },

  seekSection: { marginBottom: 24 },
  seekTrack: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 8,
  },
  seekFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  seekThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    top: -5,
    marginLeft: -7,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: { fontSize: 12 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 28,
  },
  skipBtn: { padding: 8 },
  disabled: { opacity: 0.3 },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  extraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  extraTxt: { fontSize: 13, fontWeight: '700' },
  sleepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  sleepTxt: { fontSize: 12 },
});
