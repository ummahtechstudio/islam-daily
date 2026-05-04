import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MUSHAF_COLORS } from './mushafTokens';
import type { DownloadProgress } from '../../services/quranCache';

const GOLD = '#EF9F27';
const GREEN = '#0F6E56';

export type QuranDownloadOverlayProps = {
  progress: DownloadProgress | null;
  error: Error | null;
  isOnline: boolean;
  onRetry: () => void;
};

export default function QuranDownloadOverlay({
  progress,
  error,
  isOnline,
  onRetry,
}: QuranDownloadOverlayProps) {
  const insets = useSafeAreaInsets();
  const fetched = progress?.fetched ?? 0;
  const total = progress?.total ?? 6236;
  const ratio = Math.min(1, total > 0 ? fetched / total : 0);
  const percent = Math.round(ratio * 100);

  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: ratio,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [ratio, widthAnim]);

  const widthInterp = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        <View style={styles.iconRing}>
          <Feather name="book-open" size={36} color={GOLD} />
        </View>
        <Text style={styles.heading}>Preparing the Quran</Text>
        <Text style={styles.subtext}>
          Downloading the Holy Quran for offline reading. This happens once —
          the app will work without internet after this.
        </Text>

        {error ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorTitle}>
              {isOnline ? 'Download interrupted' : 'Connection lost'}
            </Text>
            <Text style={styles.errorBody}>
              {isOnline
                ? "We hit a snag finishing the download. Please try again."
                : "We'll try again when you're online."}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, !isOnline && styles.retryBtnDisabled]}
              onPress={onRetry}
              disabled={!isOnline}
              activeOpacity={0.85}
            >
              <Feather name="refresh-ccw" size={14} color="#fff" />
              <Text style={styles.retryText}>Retry now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: widthInterp }]} />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressPercent}>{percent}%</Text>
              <Text style={styles.progressCount}>
                Ayah {fetched.toLocaleString()} of {total.toLocaleString()}
              </Text>
            </View>
          </>
        )}

        <Text style={styles.dua}>جَزَاكَ ٱللَّهُ خَيْرًا</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MUSHAF_COLORS.parchment,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD + '55',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GOLD + '18',
    borderWidth: 1.5,
    borderColor: GOLD + '55',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: GREEN,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5C5C5C',
    textAlign: 'center',
    marginBottom: 22,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: GREEN + '14',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 4,
  },
  progressMeta: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  progressCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  errorBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: GREEN,
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5C5C5C',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GREEN,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  retryBtnDisabled: { opacity: 0.4 },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  dua: {
    marginTop: 22,
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    color: GOLD,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
