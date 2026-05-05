import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { DownloadProgress } from '../../services/quranCache';

export type QuranDownloadBannerProps = {
  progress: DownloadProgress | null;
  error: Error | null;
  isOnline: boolean;
  onRetry: () => void;
};

export default function QuranDownloadBanner({
  progress,
  error,
  isOnline,
  onRetry,
}: QuranDownloadBannerProps) {
  const fetched = progress?.fetched ?? 0;
  const total = progress?.total ?? 6236;
  const ratio = total > 0 ? Math.min(1, fetched / total) : 0;
  const percent = Math.round(ratio * 100);

  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: ratio,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [ratio, widthAnim]);

  const widthInterp = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (error) {
    return (
      <TouchableOpacity
        style={[styles.root, styles.errorRoot]}
        onPress={onRetry}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh" size={14} color={palette.green} />
        <Text style={styles.errorText} numberOfLines={1}>
          Quran download interrupted · Tap to retry
        </Text>
      </TouchableOpacity>
    );
  }

  if (!isOnline) {
    return (
      <View style={[styles.root, styles.offlineRoot]}>
        <Ionicons name="cloud-offline-outline" size={14} color={palette.green} />
        <Text style={styles.offlineText} numberOfLines={1}>
          No connection — connect to download Quran for offline reading
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Ionicons name="download-outline" size={14} color={palette.green} />
        <Text style={styles.label} numberOfLines={1}>
          Downloading Quran for offline reading
        </Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterp }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.cream,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.goldBorderSubtle,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: palette.textOnCream,
    fontWeight: '600',
    flex: 1,
  },
  percent: {
    ...typography.caption,
    color: palette.green,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(15,110,86,0.12)',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: palette.gold,
  },
  errorRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: palette.green,
    fontWeight: '700',
    flex: 1,
  },
  offlineRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offlineText: {
    ...typography.caption,
    color: palette.green,
    fontWeight: '600',
    flex: 1,
  },
});
