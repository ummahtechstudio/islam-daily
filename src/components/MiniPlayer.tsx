import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { Colors } from '../constants/colors';

const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

interface Props {
  isDark: boolean;
}

export function MiniPlayer({ isDark }: Props) {
  const {
    currentTrack,
    isPlaying,
    positionSec,
    durationSec,
    togglePlay,
    stop,
    openFullPlayer,
    isMiniPlayerVisible,
  } = useAudioPlayer();

  if (!isMiniPlayerVisible || !currentTrack) return null;

  const theme = isDark ? Colors.dark : Colors.light;
  const pct = durationSec > 0 ? (positionSec / durationSec) * 100 : 0;

  return (
    <Pressable
      onPress={openFullPlayer}
      style={[
        styles.wrap,
        { backgroundColor: theme.card, borderTopColor: Colors.primary + '50' },
      ]}
    >
      {/* Progress line */}
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` as any, backgroundColor: Colors.primary },
          ]}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
          <Text style={styles.iconEmoji}>🎧</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {currentTrack.title_english}
          </Text>
          <Text style={[styles.sub, { color: theme.textMuted }]} numberOfLines={1}>
            {currentTrack.author}
            {durationSec > 0
              ? `  ·  ${fmtTime(positionSec)} / ${fmtTime(durationSec)}`
              : ''}
          </Text>
        </View>

        <TouchableOpacity
          onPress={e => {
            e.stopPropagation();
            togglePlay();
          }}
          style={[styles.playBtn, { backgroundColor: Colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={e => {
            e.stopPropagation();
            stop();
          }}
          hitSlop={10}
        >
          <Ionicons name="close-circle" size={22} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  track: { height: 2 },
  fill: { height: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: { fontSize: 20 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '700' },
  sub: { fontSize: 11 },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
