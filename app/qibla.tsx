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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useLocation } from '../src/hooks/useLocation';
import { fetchQiblaDirection } from '../src/services/api';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { LoadingSpinner } from '../src/components/LoadingSpinner';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_W * 0.62, 260);
const R = COMPASS_SIZE / 2;
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;
const ALIGN_THRESHOLD_DEG = 5;
const AR_LINE_LENGTH = Math.min(SCREEN_H * 0.32, 280);

function greatCircleBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export default function QiblaScreen() {
  const { t } = useTranslation();
  useEffect(() => { trackScreen('Qibla'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');

  const { location, loading: locLoading, error: locError, isFallback } = useLocation();
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [hasCompass, setHasCompass] = useState(true);
  const [isAligned, setIsAligned] = useState(false);
  const [orientationReady, setOrientationReady] = useState(Platform.OS !== 'web');

  const compassRotateAnim = useRef(new Animated.Value(0)).current;
  const arRotateAnim = useRef(new Animated.Value(0)).current;
  const lastCompassAngle = useRef(0);
  const lastArAngle = useRef(0);
  const wasAligned = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraGranted = cameraPermission?.granted === true;
  const cameraDeniedPermanently =
    cameraPermission?.status === 'denied' && cameraPermission?.canAskAgain === false;

  // Don't fire the OS prompt the instant the screen opens — let the visible
  // "Enable camera for AR view" button trigger it so the user has context.
  // (The compass still works fully without camera; AR is opt-in.)
  const handleEnableCamera = useCallback(async () => {
    if (cameraDeniedPermanently) {
      await Linking.openSettings().catch(() => {});
      return;
    }
    await requestCameraPermission();
  }, [cameraDeniedPermanently, requestCameraPermission]);

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

  // Compute Qibla bearing locally first (instant), then refine via API
  useEffect(() => {
    if (!location) return;
    const localBearing = greatCircleBearing(
      location.latitude, location.longitude, KAABA_LAT, KAABA_LNG,
    );
    setQiblaAngle(localBearing);
    fetchQiblaDirection(location.latitude, location.longitude)
      .then((data) => setQiblaAngle(data.direction))
      .catch(() => { /* keep local bearing */ });
  }, [location]);

  // Subscribe to compass heading. Prefer expo-location.watchHeadingAsync (uses
  // system sensor fusion - more accurate). Fall back to raw magnetometer.
  useEffect(() => {
    if (!orientationReady) return;
    let mounted = true;
    let headingSub: Location.LocationSubscription | undefined;

    const start = async () => {
      // Use expo-location's heading (system sensor fusion → a declination-
      // corrected trueHeading referenced to TRUE north, matching the Qibla
      // bearing). The old raw-magnetometer fallback was removed: it reports a
      // MAGNETIC-north heading with no declination correction, so subtracting it
      // from the true-north bearing produced a needle wrong by the local
      // declination (10–20°+ across the Americas / high latitudes). When heading
      // isn't available we show the static bearing card (hasCompass = false)
      // rather than a confidently-wrong needle.
      if (Platform.OS === 'web') {
        setHasCompass(false);
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasCompass(false);
          return;
        }
        headingSub = await Location.watchHeadingAsync((data) => {
          if (!mounted) return;
          const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
          if (typeof h === 'number' && h >= 0) {
            setCompassHeading(h);
            setHasCompass(true);
          }
        });
      } catch (e) {
        console.warn('[Qibla] watchHeadingAsync failed; showing static bearing', e);
        setHasCompass(false);
      }
    };

    start();
    return () => {
      mounted = false;
      headingSub?.remove();
    };
  }, [orientationReady]);

  // Update needle + AR rotation whenever heading or qibla changes
  useEffect(() => {
    if (qiblaAngle === null) return;

    // For compass (top of dial = North): needle points to Qibla relative to North,
    // then we rotate the whole needle by -heading to compensate for device orientation.
    const compassAngle = qiblaAngle - compassHeading;

    // Smooth animation: pick shortest rotation path
    const animateTo = (
      anim: Animated.Value,
      lastRef: React.MutableRefObject<number>,
      target: number,
    ) => {
      let diff = target - lastRef.current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      const next = lastRef.current + diff;
      lastRef.current = next;
      Animated.spring(anim, {
        toValue: next,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    };

    animateTo(compassRotateAnim, lastCompassAngle, compassAngle);
    animateTo(arRotateAnim, lastArAngle, compassAngle);

    const raw = ((compassAngle % 360) + 360) % 360;
    const aligned = raw <= ALIGN_THRESHOLD_DEG || raw >= 360 - ALIGN_THRESHOLD_DEG;
    setIsAligned(aligned);
    if (aligned && !wasAligned.current) {
      wasAligned.current = true;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    } else if (!aligned) {
      wasAligned.current = false;
    }
  }, [compassHeading, qiblaAngle]);

  if (locError && !location) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={styles.permIcon}>📍</Text>
        <Text style={[styles.permTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {t('qibla.locationRequired.title')}
        </Text>
        <Text style={[styles.permMsg, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          {t('qibla.locationRequired.message')}
        </Text>
      </View>
    );
  }

  if (locLoading || qiblaAngle === null) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <LoadingSpinner message={t('qibla.loading')} dark={isDark} />
      </View>
    );
  }

  if (Platform.OS === 'web' && !orientationReady) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={styles.permIcon}>🧭</Text>
        <Text style={[styles.permTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {t('qibla.compassNeeded.title')}
        </Text>
        <TouchableOpacity style={styles.startBtn} onPress={requestOrientationPermission}>
          <Text style={styles.startBtnText}>{t('qibla.compassNeeded.startButton')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No-compass fallback: show static info card
  if (!hasCompass) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={styles.permIcon}>🧭</Text>
        <Text style={[styles.permTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {t('qibla.noCompass.title')}
        </Text>
        <Text style={[styles.permMsg, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          {t('qibla.noCompass.bearingMessage')}
        </Text>
        <Text style={[styles.bearingValue, { color: Colors.primary }]}>
          {t('qibla.noCompass.bearingValue', { degrees: qiblaAngle.toFixed(1) })}
        </Text>
        {isFallback && (
          <Text style={[styles.permMsg, { color: GOLD, marginTop: 8, fontWeight: '600' }]}>
            {t('qibla.approximate')}
          </Text>
        )}
        <Text style={[styles.permMsg, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, marginTop: 8 }]}>
          {t('qibla.noCompass.physicalCompass')}
        </Text>
      </View>
    );
  }

  const compassSpin = compassRotateAnim.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });
  const arSpin = arRotateAnim.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  const accentColor = isAligned ? Colors.success : GOLD;

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

      {/* AR center line + Kaaba marker */}
      <View pointerEvents="none" style={styles.arCenter}>
        <Animated.View
          style={[
            styles.arLineWrap,
            {
              width: AR_LINE_LENGTH,
              height: AR_LINE_LENGTH,
              transform: [{ rotate: arSpin }],
            },
          ]}
        >
          <View
            style={[
              styles.arLine,
              { backgroundColor: accentColor, height: AR_LINE_LENGTH * 0.5 },
            ]}
          />
          <View style={[styles.arKaaba, { borderColor: accentColor }]}>
            <Text style={styles.arKaabaEmoji}>🕋</Text>
          </View>
        </Animated.View>
      </View>

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('qibla.title')}</Text>
          <Text style={styles.sub}>
            {cameraGranted
              ? t('qibla.sub.withCamera')
              : t('qibla.sub.withoutCamera')}
          </Text>
          {isFallback && (
            <Text style={styles.approxHint}>{t('qibla.approximate')}</Text>
          )}
          {!cameraGranted && (
            <TouchableOpacity
              onPress={handleEnableCamera}
              style={styles.cameraCta}
              activeOpacity={0.85}
            >
              <Text style={styles.cameraCtaText}>
                {cameraDeniedPermanently ? t('qibla.camera.openSettings') : t('qibla.camera.enable')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Aligned banner */}
        {isAligned && (
          <View style={[styles.alignBanner, { backgroundColor: Colors.success }]}>
            <Text style={styles.alignText}>{t('qibla.aligned')}</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Compact compass dial at the bottom */}
        <View style={[styles.compassWrapper, { width: COMPASS_SIZE, height: COMPASS_SIZE }]}>
          <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={R}
              cy={R}
              r={R - 2}
              fill="rgba(0,0,0,0.45)"
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
              const tx = R + (R - 22) * Math.cos(rad);
              const ty = R + (R - 22) * Math.sin(rad);
              return (
                <SvgText
                  key={label}
                  x={tx}
                  y={ty + 5}
                  textAnchor="middle"
                  fontSize={14}
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
              const r2 = R - (isMajor ? 16 : 11);
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
            <Circle cx={R} cy={R} r={5} fill={accentColor} />
          </Svg>

          <Animated.View
            style={[
              styles.needleWrapper,
              { width: COMPASS_SIZE, height: COMPASS_SIZE, transform: [{ rotate: compassSpin }] },
            ]}
          >
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              <Polygon
                points={`${R},36 ${R - 7},${R - 4} ${R + 7},${R - 4}`}
                fill={accentColor}
                opacity={0.95}
              />
              <Polygon
                points={`${R},${COMPASS_SIZE - 36} ${R - 7},${R + 4} ${R + 7},${R + 4}`}
                fill="rgba(255,255,255,0.4)"
              />
              <SvgText x={R} y={28} textAnchor="middle" fontSize={20}>
                🕋
              </SvgText>
            </Svg>
          </Animated.View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('qibla.info.qiblaLabel')}</Text>
            <Text style={[styles.infoValue, { color: accentColor }]}>
              {qiblaAngle.toFixed(1)}°
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('qibla.info.headingLabel')}</Text>
            <Text style={styles.infoValue}>{compassHeading.toFixed(0)}°</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const GOLD = '#EF9F27';

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  overlay: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 20, marginBottom: 8 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },
  approxHint: { fontSize: 12, color: GOLD, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  cameraCta: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cameraCtaText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // AR center line
  arCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arLineWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  arLine: {
    width: 6,
    borderRadius: 3,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  arKaaba: {
    position: 'absolute',
    top: -6,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arKaabaEmoji: { fontSize: 30 },

  compassWrapper: { alignSelf: 'center', position: 'relative', marginBottom: 12 },
  needleWrapper: { position: 'absolute', top: 0, left: 0 },
  alignBanner: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  alignText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 20, paddingBottom: 8 },
  infoCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    color: 'rgba(255,255,255,0.7)',
  },
  infoValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  bearingValue: { fontSize: 36, fontWeight: '800', marginTop: 8 },
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
