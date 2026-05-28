import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Platform } from 'react-native';
import { AudioPlayerProvider } from '../src/context/AudioPlayerContext';
import { MiniPlayer } from '../src/components/MiniPlayer';
import { FullPlayerModal } from '../src/components/FullPlayerModal';
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
  downloadFullQuran,
  getQuranFromCache,
} from '../src/services/quranCache';
import {
  downloadHadithBook,
  isHadithBookCached,
} from '../src/services/hadithCache';
import { migrateInvalidPersistedSettings } from '../src/services/prayerTimesService';
import { refreshNotificationsIfStale } from '../src/services/notificationsService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

const KEEP_AWAKE_TAG = 'islam-daily-root';

export default function RootLayout() {
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
    loadPersistedData();
    migrateInvalidPersistedSettings();
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

    // Re-pull the full Quran in the background if the cache is older than
    // 30 days, in case Tanzil corrects a typo. Silent — bound only by network.
    const idx = getQuranFromCache();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (idx && Date.now() - idx.fetchedAt > THIRTY_DAYS) {
      downloadFullQuran().catch(() => {});
    }

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
        <Stack.Screen name="qibla" options={{ title: 'Qibla Finder' }} />
        <Stack.Screen name="hadith" options={{ title: 'Hadith Browser' }} />
        <Stack.Screen name="names" options={{ title: '99 Names of Allah' }} />
        <Stack.Screen name="calendar" options={{ title: 'Islamic Calendar' }} />
        <Stack.Screen name="quran/[id]" options={{ title: 'Quran Reader' }} />
        <Stack.Screen name="downloads" options={{ title: 'Offline Downloads' }} />
        <Stack.Screen name="language" options={{ title: 'Translation Language' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="customize-home" options={{ title: 'Customize Home Screen' }} />
        <Stack.Screen name="hifz-tracker" options={{ title: 'Hifz Tracker' }} />
        <Stack.Screen name="prayer-streak" options={{ title: 'Prayer Streak' }} />
        <Stack.Screen name="mosque-finder" options={{ title: 'Mosque Finder' }} />
        <Stack.Screen name="zakat-calculator" options={{ title: 'Zakat Calculator' }} />
        <Stack.Screen name="islamic-books" options={{ title: 'Islamic Library' }} />
        <Stack.Screen name="custom-adhan" options={{ title: 'Custom Adhan' }} />
        <Stack.Screen name="halal-finder" options={{ title: 'Halal Restaurant Finder' }} />
        <Stack.Screen name="ramadan" options={{ title: 'Ramadan' }} />
        <Stack.Screen name="audio-library" options={{ title: 'Audio Library — آڈیو لائبریری' }} />
        <Stack.Screen name="tasbeeh" options={{ headerShown: false }} />
        <Stack.Screen name="tasbeeh-list" options={{ headerShown: false }} />
        <Stack.Screen name="tasbeeh-edit" options={{ headerShown: false }} />
      </Stack>
      <MiniPlayer isDark={isDark} />
      <FullPlayerModal isDark={isDark} />
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
    </AudioPlayerProvider>
    </SafeAreaProvider>
  );
}
