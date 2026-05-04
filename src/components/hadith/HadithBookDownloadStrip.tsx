import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import type { HadithDownloadProgress } from '../../services/hadithCache';

const GREEN = '#0F6E56';
const GOLD = '#EF9F27';

export type HadithBookDownloadStripProps = {
  bookName: string;
  progress: HadithDownloadProgress | null;
  isOnline: boolean;
  hasError: boolean;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HadithBookDownloadStrip({
  bookName,
  progress,
  isOnline,
  hasError,
}: HadithBookDownloadStripProps) {
  const ratio =
    progress && progress.totalBytes
      ? Math.min(1, progress.receivedBytes / progress.totalBytes)
      : 0;
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

  const inErrorState = hasError || !isOnline;
  const bg = inErrorState ? GOLD : GREEN;

  let message: string;
  if (inErrorState) {
    message = isOnline
      ? `Download paused — we'll retry`
      : `Connection lost — we'll resume when online`;
  } else if (progress?.phase === 'parsing') {
    message = `Preparing ${bookName}…`;
  } else {
    message = `Downloading ${bookName} for offline reading…`;
  }

  const showPercent = !inErrorState && progress != null && progress.phase !== 'done';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={styles.row}>
        {inErrorState ? (
          <Text style={styles.errIcon}>⚠</Text>
        ) : (
          <ActivityIndicator color="#fff" size="small" />
        )}
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
        {showPercent ? (
          <Text style={styles.percent}>
            {progress?.totalBytes
              ? `${percent}%`
              : formatBytes(progress?.receivedBytes ?? 0)}
          </Text>
        ) : null}
      </View>
      {!inErrorState ? (
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: widthInterp }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  percent: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  track: {
    height: 3,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#fff',
  },
});
