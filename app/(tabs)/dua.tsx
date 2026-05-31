import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../src/constants/colors';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { MomentSubtab } from '../../src/components/dua/MomentSubtab';
import { DuasSubtab } from '../../src/components/dua/DuasSubtab';
import { DhikrSubtab } from '../../src/components/dua/DhikrSubtab';
import { TasbeehSubtab } from '../../src/components/tasbeeh/TasbeehSubtab';

const SUBTAB_KEY = 'dua_section_active_subtab';

type Subtab = 'moment' | 'duas' | 'dhikr' | 'tasbeeh';

const SUBTABS: { id: Subtab; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'moment',  icon: 'time-outline' },
  { id: 'duas',    icon: 'book-outline' },
  { id: 'dhikr',   icon: 'sparkles-outline' },
  { id: 'tasbeeh', icon: 'repeat' },
];

export default function DuaScreen() {
  useEffect(() => { trackScreen('Dua'); }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [subtab, setSubtab] = useState<Subtab>('moment');
  const [hydrated, setHydrated] = useState(false);
  const [tasbeehHandoffId, setTasbeehHandoffId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SUBTAB_KEY);
        if (raw === 'moment' || raw === 'duas' || raw === 'dhikr' || raw === 'tasbeeh') {
          setSubtab(raw);
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const switchSubtab = (next: Subtab) => {
    setSubtab(next);
    AsyncStorage.setItem(SUBTAB_KEY, next).catch(() => {});
  };

  const handleCountWithTasbeeh = (counterId: string) => {
    setTasbeehHandoffId(counterId);
    switchSubtab('tasbeeh');
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.headerBar, { backgroundColor: Colors.primary }]}>
        <Text style={styles.screenTitle}>{t('dua.screenTitle')}</Text>
        <View style={styles.subtabRow}>
          {SUBTABS.map(({ id, icon }) => {
            const active = subtab === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.subtabPill, active && styles.subtabPillActive]}
                onPress={() => switchSubtab(id)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={icon}
                  size={14}
                  color={active ? Colors.primary : 'rgba(255,255,255,0.85)'}
                />
                <Text
                  style={[
                    styles.subtabLabel,
                    { color: active ? Colors.primary : 'rgba(255,255,255,0.85)' },
                  ]}
                >
                  {t(`dua.tabs.${id}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.flex}>
        {!hydrated ? null : subtab === 'moment' ? (
          <MomentSubtab theme={theme} />
        ) : subtab === 'duas' ? (
          <DuasSubtab theme={theme} />
        ) : subtab === 'dhikr' ? (
          <DhikrSubtab theme={theme} onCountWithTasbeeh={handleCountWithTasbeeh} />
        ) : (
          <TasbeehSubtab
            theme={theme}
            initialCounterId={tasbeehHandoffId}
            onInitialCounterConsumed={() => setTasbeehHandoffId(null)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  headerBar: { padding: 16, paddingTop: 14, alignItems: 'center', gap: 12 },
  screenTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },

  subtabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    padding: 4,
    gap: 4,
    alignSelf: 'stretch',
  },
  subtabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 18,
  },
  subtabPillActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  subtabLabel: { fontSize: 13, fontWeight: '700' },
});
