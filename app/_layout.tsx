import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
// Initialise i18n before any screen renders (the import runs init synchronously).
import { applyPersistedAppLanguage } from '../src/i18n';
import { useColorScheme, Platform, AppState, type AppStateStatus } from 'react-native';
import { AudioPlayerProvider } from '../src/context/AudioPlayerContext';
import { MiniPlayer } from '../src/components/MiniPlayer';
import { FullPlayerModal } from '../src/components/FullPlayerModal';
import { QuranAudioProvider } from '../src/context/QuranAudioContext';
import QuranAudioMiniPlayer from '../src/components/quran/QuranAudioMiniPlayer';
import {
  useFonts,
  Amiri_400Regular,
  Amiri_700Bold,
  Amiri_400Regular_Italic,
} from '@expo-google-fonts/amiri';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import * as SplashScreen from 'expo-splash-screen';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { useStore } from '../src/store';
import { Colors } from '../src/constants/colors';
import { PrivacyConsentModal } from '../src/components/PrivacyConsentModal';
import { WelcomeModal } from '../src/components/WelcomeModal';
import {
  hasConsentBeenShown,
  saveConsent,
  logSession,
} from '../src/services/locationAnalytics';
import {
  refreshDhikr,
  refreshDuas,
  refreshNamesOfAllah,
} from '../src/services/content';
// Daily Knowledge is deferred to v1.1+; the background warm-up is suspended.
// Re-enable this import (and the call below) when the curated content lands.
// import { fetchTodaysDailyKnowledge } from '../src/services/dailyKnowledgeService';
import {
  downloadHadithBook,
  isHadithBookCached,
} from '../src/services/hadithCache';
import { migrateInvalidPersistedSettings } from '../src/services/prayerTimesService';
import { resetHadithBookmarksForV2Once } from '../src/utils/bookmarks';
import {
  refreshNotificationsIfStale,
  refreshNotificationsOnForeground,
} from '../src/services/notificationsService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

const KEEP_AWAKE_TAG = 'islam-daily-root';

export default function RootLayout() {
  const { t } = useTranslation();
  // expo-keep-awake's WakeLock API throws on web when the tab isn't focused.
  // Use the imperative API inside an effect with a platform guard so the hook
  // order stays stable across renders (Rules of Hooks safe).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);

  const colorScheme = useColorScheme();
  const loadPersistedData = useStore((s) => s.loadPersistedData);
  const settingsScheme = useStore((s) => s.settings.colorScheme);

  const [fontsLoaded, fontError] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    Amiri_400Regular_Italic,
    NotoNastaliqUrdu_400Regular,
    IndoPakNastaleeq: require('../assets/fonts/IndoPakNastaleeq.ttf'),
  });

  // If any font fails to load (corrupted asset, network for Google fonts on
  // first run), don't block the splash forever. Log and proceed — text will
  // render in the system font as a fallback.
  const fontsReady = fontsLoaded || !!fontError;

  const [showConsent, setShowConsent] = useState(false);
  // Gates first-launch modal stacking. WelcomeModal must not mount while the
  // consent modal is still on screen; both render through the same Modal layer.
  const [consentResolved, setConsentResolved] = useState(false);
  const analyticsRan = useRef(false);

  useEffect(() => {
    // Apply the saved App Language (English/Urdu) before the rest of startup.
    applyPersistedAppLanguage();
    loadPersistedData();
    migrateInvalidPersistedSettings();
    // One-time wipe of stale hadith bookmarks for the v2 source switch (the old
    // idInBook ids no longer map to the new numbering). Other bookmarks kept.
    resetHadithBookmarksForV2Once().catch((err) =>
      console.warn('[Layout] hadith bookmark reset failed', err),
    );
    // Re-arm prayer notifications if last scheduled > 24h ago. Silent on web
    // and when permission has not been granted; the settings UI surfaces state.
    refreshNotificationsIfStale().catch((err) =>
      console.warn('[Layout] notifications refresh failed', err),
    );
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setPositionAsync('relative').catch(() => {});
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    }
  }, []);

  // Re-arm notifications whenever the app comes back to the foreground.
  // Catches: device left in background past the 7-day window, timezone
  // crossed during a flight, DST shift overnight, permission toggled in
  // OS settings while the app was paused. The service itself short-circuits
  // when nothing has changed, so the cost on a normal foreground is ~one
  // pref read.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refreshNotificationsOnForeground().catch((err) =>
          console.warn('[Layout] foreground notif refresh failed', err),
        );
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontError) {
      console.warn('[Layout] font load failed, proceeding with fallback', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (!fontsReady) return;
    SplashScreen.hideAsync().catch(() => {});
    // Check consent once after app is ready
    hasConsentBeenShown()
      .then((shown) => {
        if (!shown) {
          setShowConsent(true);
        } else {
          setConsentResolved(true);
          if (!analyticsRan.current) {
            analyticsRan.current = true;
            logSession(); // fire-and-forget
          }
        }
      })
      .catch((err) => {
        console.warn('[Layout] consent check failed', err);
        // Don't block the app: treat the failure as "consent flow done"
        // so the Welcome modal can still appear.
        setConsentResolved(true);
      });

    // Silent background refresh of bundled content. Failures are swallowed;
    // the screens always render from bundled JSON regardless.
    refreshNamesOfAllah();
    refreshDuas();
    refreshDhikr();
    // fetchTodaysDailyKnowledge() — suspended; see DailyKnowledgeCard for rationale.

    // (The Quran is bundled inside the APK at assets/data/quran.json — no
    // download needed. The data never changes, so there's nothing to refresh.)

    // Quietly pre-warm Bukhari so the first tap is instant. The other 5 books
    // remain lazy on first open — see services/hadithCache.ts.
    if (!isHadithBookCached('bukhari')) {
      downloadHadithBook('bukhari').catch(() => {});
    }
  }, [fontsReady]);

  const handleConsent = async (granted: boolean) => {
    setShowConsent(false);
    setConsentResolved(true);
    await saveConsent(granted);
    if (granted && !analyticsRan.current) {
      analyticsRan.current = true;
      logSession(); // fire-and-forget
    }
  };

  if (!fontsReady) return null;

  const isDark =
    settingsScheme === 'dark' ||
    (settingsScheme === 'system' && colorScheme === 'dark');

  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaProvider>
    <AudioPlayerProvider>
    <QuranAudioProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="prayer-times" options={{ headerShown: false }} />
        <Stack.Screen name="prayer-times-settings" options={{ headerShown: false }} />
        <Stack.Screen name="city-picker" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="qibla" options={{ title: t('nav.titles.qibla') }} />
        <Stack.Screen name="hadith" options={{ title: t('nav.titles.hadith') }} />
        <Stack.Screen name="names" options={{ title: t('nav.titles.names') }} />
        <Stack.Screen name="calendar" options={{ title: t('nav.titles.calendar') }} />
        <Stack.Screen name="quran/[id]" options={{ title: t('nav.titles.quranReader') }} />
        <Stack.Screen name="downloads" options={{ title: t('nav.titles.downloads') }} />
        <Stack.Screen name="language" options={{ title: t('nav.titles.language') }} />
        <Stack.Screen name="settings" options={{ title: t('nav.titles.settings') }} />
        <Stack.Screen name="customize-home" options={{ title: t('nav.titles.customizeHome') }} />
        <Stack.Screen name="hifz-tracker" options={{ title: t('nav.titles.hifzTracker') }} />
        <Stack.Screen name="prayer-streak" options={{ title: t('nav.titles.prayerStreak') }} />
        <Stack.Screen name="mosque-finder" options={{ title: t('nav.titles.mosqueFinder') }} />
        <Stack.Screen name="zakat-calculator" options={{ title: t('nav.titles.zakatCalculator') }} />
        <Stack.Screen name="islamic-books" options={{ title: t('nav.titles.islamicBooks') }} />
        <Stack.Screen name="custom-adhan" options={{ title: t('nav.titles.customAdhan') }} />
        <Stack.Screen name="halal-finder" options={{ title: t('nav.titles.halalFinder') }} />
        <Stack.Screen name="ramadan" options={{ title: t('nav.titles.ramadan') }} />
        <Stack.Screen name="audio-library" options={{ title: t('nav.titles.audioLibrary') }} />
        <Stack.Screen name="tasbeeh" options={{ headerShown: false }} />
        <Stack.Screen name="tasbeeh-list" options={{ headerShown: false }} />
        <Stack.Screen name="tasbeeh-edit" options={{ headerShown: false }} />
      </Stack>
      <MiniPlayer isDark={isDark} />
      <FullPlayerModal isDark={isDark} />
      {/* Quran-recitation player bar — floats above the tab bar whenever an
          ayah is loaded. Independent from the Adhkar AudioPlayer (which is
          hidden in v1 via featureFlags). */}
      <QuranAudioMiniPlayer />
      <StatusBar style="light" backgroundColor={Colors.primary} />
      {showConsent && (
        <PrivacyConsentModal
          onAccept={() => handleConsent(true)}
          onDecline={() => handleConsent(false)}
        />
      )}
      {/* Welcome modal only mounts after consent is dismissed (or already shown),
          so two modals don't stack on the same layer on first launch. */}
      {consentResolved && <WelcomeModal />}
    </GestureHandlerRootView>
    </QuranAudioProvider>
    </AudioPlayerProvider>
    </SafeAreaProvider>
  );
}
