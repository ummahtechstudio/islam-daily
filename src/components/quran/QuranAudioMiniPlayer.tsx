import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useQuranAudio } from '../../context/QuranAudioContext';
import { palette } from '../../constants/colors';
import { getSurahMeta } from '../../constants/surahMeta';

/**
 * Persistent player bar mounted at the app shell so audio controls stay on
 * screen across tab and stack changes. Hidden when no ayah has been started.
 *
 * Sits above the tab bar — kept slim so it doesn't crowd the layout. The
 * bottom inset of the tab bar isn't included here; the player floats above
 * it via absolute positioning.
 */
export default function QuranAudioMiniPlayer() {
  const { t } = useTranslation();
  const {
    current,
    isPlaying,
    isLoading,
    error,
    reciter,
    togglePlay,
    next,
    prev,
    stop,
    retry,
  } = useQuranAudio();

  if (!current) return null;

  const meta = getSurahMeta(current.surah);
  const surahLabel = meta?.name_english ?? t('quran.miniPlayer.surahFallback', { n: current.surah });
  const reference = `${surahLabel} · ${current.surah}:${current.ayah}`;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={styles.info}>
          <Text style={styles.reference} numberOfLines={1}>
            {reference}
          </Text>
          <Text style={styles.reciter} numberOfLines={1}>
            {error ? error : reciter.shortName}
          </Text>
        </View>

        {error ? (
          <TouchableOpacity onPress={retry} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={prev} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="play-skip-back" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.playBtn} hitSlop={8}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color="#fff"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={next} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="play-skip-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={stop} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Float above the tab bar. Bottom offset tuned to leave the tab bar
  // tappable on Android (49 px nominal tab bar + a few px breathing room).
  wrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: Platform.OS === 'ios' ? 78 : 64,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.green,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  info: { flex: 1, minWidth: 0 },
  reference: { color: '#fff', fontSize: 13, fontWeight: '700' },
  reciter: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    marginTop: 1,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  playBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
