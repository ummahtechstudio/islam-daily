import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useColorScheme,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { Colors } from '../src/constants/colors';
import { useLocation } from '../src/hooks/useLocation';
import { fetchQiblaDirection } from '../src/services/api';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { LoadingSpinner } from '../src/components/LoadingSpinner';

const COMPASS_SIZE = Math.min(Dimensions.get('window').width * 0.82, 320);
const R = COMPASS_SIZE / 2;
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function compassDegFromMag(x: number, y: number) {
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  return angle < 0 ? angle + 360 : angle;
}

function greatCircleBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export default function QiblaScreen() {
  useEffect(() => { trackScreen('Qibla'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');

  const { location, loading: locLoading, error: locError } = useLocation();
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [magnetAvailable, setMagnetAvailable] = useState(true);
  const [isAligned, setIsAligned] = useState(false);
  // Web/iOS Safari requires a user tap before DeviceOrientationEvent works
  const [orientationReady, setOrientationReady] = useState(Platform.OS !== 'web');

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const lastAngle = useRef(0);
  const wasAligned = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraGranted = cameraPermission?.granted === true;

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestOrientationPermission = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    const DOE = (typeof DeviceOrientationEvent !== 'undefined'
      ? DeviceOrientationEvent
      : null) as any;
    if (typeof DOE?.requestPermission === 'function') {
      try {
        const result = await DOE.requestPermission();
        setOrientationReady(result === 'granted');
      } catch {
        setOrientationReady(false);
      }
    } else {
      setOrientationReady(true);
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    fetchQiblaDirection(location.latitude, location.longitude)
      .then((data) => setQiblaAngle(data.direction))
      .catch(() => {
        setQiblaAngle(
          greatCircleBearing(location.latitude, location.longitude, KAABA_LAT, KAABA_LNG)
        );
      });
  }, [location]);

  useEffect(() => {
    if (!orientationReady) return;
    let sub: ReturnType<typeof Magnetometer.addListener> | undefined;
    Magnetometer.isAvailableAsync().then((available) => {
      setMagnetAvailable(available);
      if (!available) return;
      Magnetometer.setUpdateInterval(100);
      sub = Magnetometer.addListener(({ x, y }) => {
        setCompassHeading(compassDegFromMag(x, y));
      });
    });
    return () => sub?.remove();
  }, [orientationReady]);

  useEffect(() => {
    if (qiblaAngle === null) return;
    const needleAngle = qiblaAngle - compassHeading;
    let diff = needleAngle - lastAngle.current;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const target = lastAngle.current + diff;
    lastAngle.current = target;
    Animated.spring(rotateAnim, {
      toValue: target,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();

    const raw = ((needleAngle % 360) + 360) % 360;
    const aligned = raw <= 3 || raw >= 357;
    setIsAligned(aligned);
    if (aligned && !wasAligned.current) {
      wasAligned.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (!aligned) {
      wasAligned.current = false;
    }
  }, [compassHeading, qiblaAngle]);

  if (locError && !location) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={styles.permIcon}>📍</Text>
        <Text style={[styles.permTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Location Required
        </Text>
        <Text style={[styles.permMsg, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Location required for Qibla direction.
        </Text>
      </View>
    );
  }

  if (locLoading || qiblaAngle === null) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <LoadingSpinner message="Finding Qibla direction..." dark={isDark} />
      </View>
    );
  }

  if (Platform.OS === 'web' && !orientationReady) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={styles.permIcon}>🧭</Text>
        <Text style={[styles.permTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Compass Access Needed
        </Text>
        <TouchableOpacity style={styles.startBtn} onPress={requestOrientationPermission}>
          <Text style={styles.startBtnText}>Start AR Qibla</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spin = rotateAnim.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  const accentColor = isAligned ? Colors.accent : Colors.primary;

  return (
    <View style={styles.fullScreen}>
      {cameraGranted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? Colors.dark.background : '#0d1b2a' },
          ]}
        />
      )}

      <View style={[StyleSheet.absoluteFill, styles.scrim]} />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Qibla Direction</Text>
          <Text style={styles.sub}>
            {cameraGranted
              ? 'Point your phone toward Makkah'
              : 'Enable camera for AR Qibla view.'}
          </Text>
        </View>

        <View style={[styles.compassWrapper, { width: COMPASS_SIZE, height: COMPASS_SIZE }]}>
          <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={R}
              cy={R}
              r={R - 2}
              fill="rgba(0,0,0,0.3)"
              stroke={accentColor}
              strokeWidth={2.5}
            />
            {[
              { label: 'N', angle: 0 },
              { label: 'E', angle: 90 },
              { label: 'S', angle: 180 },
              { label: 'W', angle: 270 },
            ].map(({ label, angle }) => {
              const rad = ((angle - 90) * Math.PI) / 180;
              const tx = R + (R - 24) * Math.cos(rad);
              const ty = R + (R - 24) * Math.sin(rad);
              return (
                <SvgText
                  key={label}
                  x={tx}
                  y={ty + 5}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight="bold"
                  fill={label === 'N' ? Colors.error : '#FFFFFF'}
                >
                  {label}
                </SvgText>
              );
            })}
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i * 10 * Math.PI) / 180 - Math.PI / 2;
              const isMajor = i % 9 === 0;
              const r1 = R - 8;
              const r2 = R - (isMajor ? 18 : 12);
              return (
                <Line
                  key={i}
                  x1={R + r1 * Math.cos(a)}
                  y1={R + r1 * Math.sin(a)}
                  x2={R + r2 * Math.cos(a)}
                  y2={R + r2 * Math.sin(a)}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={isMajor ? 2 : 1}
                />
              );
            })}
            <Circle cx={R} cy={R} r={6} fill={accentColor} />
          </Svg>

          <Animated.View
            style={[
              styles.needleWrapper,
              { width: COMPASS_SIZE, height: COMPASS_SIZE, transform: [{ rotate: spin }] },
            ]}
          >
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              <Polygon
                points={`${R},${R - R + 40} ${R - 8},${R + 20} ${R + 8},${R + 20}`}
                fill={accentColor}
                opacity={0.95}
              />
              <Polygon
                points={`${R},${R + R - 40} ${R - 8},${R - 20} ${R + 8},${R - 20}`}
                fill="rgba(255,255,255,0.4)"
              />
              <SvgText x={R} y={52} textAnchor="middle" fontSize={26}>
                🕋
              </SvgText>
            </Svg>
          </Animated.View>
        </View>

        {isAligned && (
          <View style={[styles.alignBanner, { backgroundColor: accentColor }]}>
            <Text style={styles.alignText}>✓ Aligned with Qibla</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Qibla</Text>
            <Text style={[styles.infoValue, { color: accentColor }]}>
              {qiblaAngle.toFixed(1)}°
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Heading</Text>
            <Text style={styles.infoValue}>{compassHeading.toFixed(0)}°</Text>
          </View>
        </View>

        {!magnetAvailable && (
          <View style={styles.noMagnet}>
            <Text style={styles.noMagnetText}>
              Magnetometer not available. Direction is approximate.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.38)' },
  overlay: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 20, marginBottom: 32 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  compassWrapper: { alignSelf: 'center', position: 'relative' },
  needleWrapper: { position: 'absolute', top: 0, left: 0 },
  alignBanner: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  alignText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', gap: 14, marginTop: 24, paddingHorizontal: 20 },
  infoCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    color: 'rgba(255,255,255,0.7)',
  },
  infoValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  noMagnet: {
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(245,158,11,0.25)',
  },
  noMagnetText: { color: Colors.warning, fontSize: 13, textAlign: 'center' },
  permIcon: { fontSize: 48, marginBottom: 16 },
  permTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  permMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  startBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
