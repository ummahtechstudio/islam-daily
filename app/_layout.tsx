import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Text, StyleSheet, Platform } from 'react-native';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { useStore } from '../src/store';
import { Colors } from '../src/constants/colors';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { PrivacyConsentModal } from '../src/components/PrivacyConsentModal';
import {
  hasConsentBeenShown,
  saveConsent,
  logSession,
} from '../src/services/locationAnalytics';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return (
    <View style={banner.bar}>
      <Ionicons name="wifi" size={13} color="#fff" style={{ opacity: 0.85 }} />
      <Text style={banner.text}>No internet connection — showing offline content</Text>
    </View>
  );
}

const banner = StyleSheet.create({
  bar: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '500' },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const loadPersistedData = useStore((s) => s.loadPersistedData);
  const settingsScheme = useStore((s) => s.settings.colorScheme);

  const [fontsLoaded] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    Amiri_400Regular_Italic,
    NotoNastaliqUrdu_400Regular,
  });

  const [showConsent, setShowConsent] = useState(false);
  const analyticsRan = useRef(false);

  useEffect(() => {
    loadPersistedData();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setPositionAsync('relative');
      NavigationBar.setVisibilityAsync('visible');
    }
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync();
    // Check consent once after app is ready
    hasConsentBeenShown()
      .then((shown) => {
        if (!shown) {
          setShowConsent(true);
        } else if (!analyticsRan.current) {
          analyticsRan.current = true;
          logSession(); // fire-and-forget
        }
      })
      .catch((err) => console.warn('[Layout] consent check failed', err));
  }, [fontsLoaded]);

  const handleConsent = async (granted: boolean) => {
    setShowConsent(false);
    await saveConsent(granted);
    if (granted && !analyticsRan.current) {
      analyticsRan.current = true;
      logSession(); // fire-and-forget
    }
  };

  if (!fontsLoaded) return null;

  const isDark =
    settingsScheme === 'dark' ||
    (settingsScheme === 'system' && colorScheme === 'dark');

  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaProvider>
    <AudioPlayerProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="prayer-times" options={{ title: 'Prayer Times' }} />
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
    </GestureHandlerRootView>
    </AudioPlayerProvider>
    </SafeAreaProvider>
  );
}
