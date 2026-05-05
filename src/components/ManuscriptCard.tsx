import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import { palette } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';

type ManuscriptCardProps = {
  children: React.ReactNode;
  variant?: 'standard' | 'minimal' | 'bordered';
  withCornerOrnaments?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

// ─── Eight-pointed star (Khatim) corner ornament ─────────────────────────────
function CornerOrnament({ rotation = 0 }: { rotation?: number }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      style={{ transform: [{ rotate: `${rotation}deg` }] }}
    >
      {/* Eight-pointed star — overlapping squares */}
      <Path
        d="M10 2 L13 7 L18 10 L13 13 L10 18 L7 13 L2 10 L7 7 Z"
        fill="none"
        stroke={palette.goldBorder}
        strokeWidth="1"
        strokeLinejoin="miter"
      />
      <Path
        d="M5 5 L15 5 L15 15 L5 15 Z"
        fill="none"
        stroke={palette.goldBorder}
        strokeWidth="0.8"
        opacity="0.7"
        transform="rotate(45 10 10)"
      />
      <Circle cx="10" cy="10" r="1" fill={palette.goldBorder} />
    </Svg>
  );
}

export function ManuscriptCard({
  children,
  variant = 'standard',
  withCornerOrnaments = false,
  style,
  contentStyle,
}: ManuscriptCardProps) {
  const isBordered = variant === 'bordered';
  const isMinimal = variant === 'minimal';

  return (
    <View
      style={[
        styles.outer,
        isMinimal && styles.minimal,
        !isMinimal && styles.standard,
        style,
      ]}
    >
      {isBordered && (
        <View pointerEvents="none" style={styles.innerBorder} />
      )}
      {withCornerOrnaments && (
        <>
          <View style={[styles.cornerWrap, styles.cornerTL]}>
            <CornerOrnament rotation={0} />
          </View>
          <View style={[styles.cornerWrap, styles.cornerTR]}>
            <CornerOrnament rotation={90} />
          </View>
          <View style={[styles.cornerWrap, styles.cornerBR]}>
            <CornerOrnament rotation={180} />
          </View>
          <View style={[styles.cornerWrap, styles.cornerBL]}>
            <CornerOrnament rotation={270} />
          </View>
        </>
      )}
      <View style={[styles.content, isBordered && styles.contentBordered, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.md,
    backgroundColor: palette.cream,
    overflow: 'hidden',
    position: 'relative',
  },
  standard: {
    borderWidth: 1,
    borderColor: palette.creamBorder,
  },
  minimal: {
    // No border — pure cream surface
  },
  innerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.goldBorderSubtle,
  },
  content: {
    padding: spacing.lg,
  },
  contentBordered: {
    padding: spacing.lg + 4,
  },
  cornerWrap: {
    position: 'absolute',
    width: 20,
    height: 20,
    zIndex: 1,
  },
  cornerTL: { top: 8, left: 8 },
  cornerTR: { top: 8, right: 8 },
  cornerBR: { bottom: 8, right: 8 },
  cornerBL: { bottom: 8, left: 8 },
});
