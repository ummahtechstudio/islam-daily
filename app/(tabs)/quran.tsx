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
import { useQuranDownload } from '../../src/hooks/useQuranDownload';
import QuranDownloadBanner from '../../src/components/quran/QuranDownloadBanner';
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

  const { cached, progress, error, isOnline, retry } = useQuranDownload();

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

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>The Holy Quran</Text>
        <Text style={styles.headerSub}>القرآن الكريم</Text>
      </View>

      {!cached && (
        <QuranDownloadBanner
          progress={progress}
          error={error}
          isOnline={isOnline}
          onRetry={retry}
        />
      )}

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
