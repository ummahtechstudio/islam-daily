import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { ADHAN_SOUNDS, CACHE_KEYS, PRAYER_LIST } from '../src/constants';
import { trackScreen } from '../src/services/analytics';

type AdhanPrefs = Record<string, string>; // prayerName -> soundId

let Audio: any = null;
try {
  // expo-av must be installed: npx expo install expo-av
  Audio = require('expo-av').Audio;
} catch {}

export default function CustomAdhanScreen() {
  useEffect(() => { trackScreen('CustomAdhan'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [prefs, setPrefs] = useState<AdhanPrefs>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const soundRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEYS.customAdhan)
      .then((raw) => {
        if (raw) setPrefs(JSON.parse(raw));
      })
      .catch((err) => console.warn('[CustomAdhan] load prefs failed', err));
    return () => {
      soundRef.current?.unloadAsync?.();
    };
  }, []);

  const savePrefs = async (next: AdhanPrefs) => {
    setPrefs(next);
    await AsyncStorage.setItem(CACHE_KEYS.customAdhan, JSON.stringify(next));
  };

  const selectAdhan = (prayer: string, soundId: string) => {
    savePrefs({ ...prefs, [prayer]: soundId });
  };

  const playPreview = async (soundId: string, url: string) => {
    if (!Audio) {
      alert('expo-av is not installed. Run: npx expo install expo-av');
      return;
    }
    if (playingId === soundId) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setPlayingId(null);
      return;
    }
    try {
      setLoadingId(soundId);
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(soundId);
      setLoadingId(null);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setPlayingId(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      setLoadingId(null);
      alert('Failed to load audio preview.');
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        <View style={[styles.banner, { backgroundColor: Colors.primary }]}>
          <Text style={styles.bannerTitle}>Custom Adhan</Text>
          <Text style={styles.bannerSub}>Choose a different Adhan sound for each prayer</Text>
        </View>

        {PRAYER_LIST.map((prayer) => {
          const selected = prefs[prayer] ?? 'makkah';
          return (
            <View key={prayer} style={{ marginBottom: 20 }}>
              <Text style={[styles.prayerLabel, { color: theme.textSecondary }]}>{prayer}</Text>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {ADHAN_SOUNDS.map((sound, idx) => {
                  const isSelected = selected === sound.id;
                  const isPlaying = playingId === `${prayer}_${sound.id}`;
                  const isLoading = loadingId === `${prayer}_${sound.id}`;
                  return (
                    <TouchableOpacity
                      key={sound.id}
                      style={[
                        styles.soundRow,
                        idx < ADHAN_SOUNDS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                        isSelected && { backgroundColor: Colors.primary + '10' },
                      ]}
                      onPress={() => selectAdhan(prayer, sound.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, { borderColor: isSelected ? Colors.primary : theme.border }]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.soundName, { color: isSelected ? Colors.primary : theme.text }]}>
                        {sound.name}
                      </Text>
                      <TouchableOpacity
                        style={[styles.previewBtn, { backgroundColor: isPlaying ? Colors.primary : theme.surface, borderColor: theme.border }]}
                        onPress={() => playPreview(`${prayer}_${sound.id}`, sound.url)}
                        hitSlop={8}
                      >
                        {isLoading ? (
                          <ActivityIndicator size={14} color={Colors.primary} />
                        ) : (
                          <Ionicons
                            name={isPlaying ? 'stop' : 'play'}
                            size={14}
                            color={isPlaying ? '#fff' : Colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <Text style={[styles.note, { color: theme.textMuted }]}>
          Note: Tap the play button to preview each Adhan sound. Your selection is saved automatically.
          {!Audio && '\n\nAudio preview requires expo-av. Run: npx expo install expo-av'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' },

  prayerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  soundName: { flex: 1, fontSize: 15, fontWeight: '600' },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
