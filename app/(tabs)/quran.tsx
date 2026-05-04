import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../../src/constants/colors';
import { trackScreen } from '../../src/services/analytics';
import { useStore } from '../../src/store';
import { useIsOnline } from '../../src/hooks/useIsOnline';
import {
  DownloadProgress,
  downloadFullQuran,
  isQuranCached,
} from '../../src/services/quranCache';
import QuranDownloadOverlay from '../../src/components/quran/QuranDownloadOverlay';
import TranslationTab from '../../src/components/quran/TranslationTab';
import ReciteTab from '../../src/components/quran/ReciteTab';
import ListenTab from '../../src/components/quran/ListenTab';

type QuranTab = 'translation' | 'recite' | 'listen';
const ACTIVE_TAB_KEY = 'quran_active_tab';

const TABS: Array<{
  key: QuranTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: 'translation', label: 'Translation', icon: 'book-open' },
  { key: 'recite',      label: 'Recite',      icon: 'bookmark'  },
  { key: 'listen',      label: 'Listen',      icon: 'headphones' },
];

export default function QuranScreen() {
  useEffect(() => {
    trackScreen('Quran');
  }, []);

  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark =
    settingsScheme === 'dark' ||
    (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<QuranTab>('recite');
  const [hydrated, setHydrated] = useState(false);

  const [cacheReady, setCacheReady] = useState<boolean>(() => isQuranCached());
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const isOnline = useIsOnline();

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_TAB_KEY)
      .then((v) => {
        if (v === 'translation' || v === 'recite' || v === 'listen') {
          setActiveTab(v);
        }
      })
      .catch((err) => console.warn('[Quran] read active tab failed', err))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ACTIVE_TAB_KEY, activeTab).catch(() => {});
  }, [activeTab, hydrated]);

  useEffect(() => {
    if (cacheReady) return;
    if (!isOnline) return;
    if (downloadError) return;
    let cancelled = false;
    setProgress(null);
    downloadFullQuran((p) => {
      if (!cancelled) setProgress(p);
    })
      .then(() => {
        if (!cancelled) setCacheReady(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error('Download failed');
        setDownloadError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [cacheReady, isOnline, downloadError, retryNonce]);

  if (!cacheReady) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.background }]}
        edges={['top']}
      >
        <View style={[styles.header, { backgroundColor: Colors.primary }]}>
          <Text style={styles.headerTitle}>The Holy Quran</Text>
          <Text style={styles.headerSub}>القرآن الكريم</Text>
        </View>
        <QuranDownloadOverlay
          progress={progress}
          error={downloadError}
          isOnline={isOnline}
          onRetry={() => {
            setDownloadError(null);
            setRetryNonce((n) => n + 1);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>The Holy Quran</Text>
        <Text style={styles.headerSub}>القرآن الكريم</Text>
      </View>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabPill,
                isActive && styles.tabPillActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
            >
              <Feather
                name={tab.icon}
                size={15}
                color={isActive ? '#fff' : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#fff' : theme.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.body}>
        {activeTab === 'translation' && <TranslationTab isDark={isDark} />}
        {activeTab === 'recite' && <ReciteTab />}
        {activeTab === 'listen' && <ListenTab isDark={isDark} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  body: { flex: 1 },
});
