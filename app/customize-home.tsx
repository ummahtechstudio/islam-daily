import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { getSetting, setSetting } from '../src/utils/settings';
import {
  HOME_TILES,
  HOME_TILES_STORAGE_KEY,
  DEFAULT_ENABLED_TILE_IDS,
  HomeTile,
} from '../src/constants/homeTiles';

export default function CustomizeHomeScreen() {
  useEffect(() => { trackScreen('CustomizeHome'); }, []);

  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const themeColors = isDark ? Colors.dark : Colors.light;

  const [enabledIds, setEnabledIds] = useState<string[]>(DEFAULT_ENABLED_TILE_IDS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getSetting<string[]>(
        HOME_TILES_STORAGE_KEY,
        DEFAULT_ENABLED_TILE_IDS,
      );
      setEnabledIds(stored);
      setLoaded(true);
    })();
  }, []);

  const requiredTiles = HOME_TILES.filter((t) => t.required);
  const optionalTiles = HOME_TILES.filter((t) => !t.required);

  const onToggle = async (tileId: string, value: boolean) => {
    const next = value
      ? [...enabledIds.filter((id) => id !== tileId), tileId]
      : enabledIds.filter((id) => id !== tileId);
    setEnabledIds(next);
    await setSetting(HOME_TILES_STORAGE_KEY, next);
  };

  const onResetToDefault = () => {
    Alert.alert(
      t('customizeHome.alerts.reset.title'),
      t('customizeHome.alerts.reset.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('customizeHome.alerts.reset.confirm'),
          style: 'destructive',
          onPress: async () => {
            setEnabledIds(DEFAULT_ENABLED_TILE_IDS);
            await setSetting(HOME_TILES_STORAGE_KEY, DEFAULT_ENABLED_TILE_IDS);
            Alert.alert(t('customizeHome.alerts.resetComplete.title'), t('customizeHome.alerts.resetComplete.message'));
          },
        },
      ],
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>{children}</Text>
  );

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      {children}
    </View>
  );

  const Divider = () => (
    <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
  );

  const RequiredRow = ({ tile, last }: { tile: HomeTile; last: boolean }) => (
    <>
      <View style={[styles.row, { opacity: 0.55 }]}>
        <View style={[styles.emojiBox, { backgroundColor: themeColors.surface }]}>
          <Text style={styles.emoji}>{tile.emoji}</Text>
        </View>
        <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t(`home.tiles.${tile.id}`)}</Text>
        <Ionicons name="lock-closed" size={16} color={themeColors.textMuted} />
      </View>
      {!last && <Divider />}
    </>
  );

  const OptionalRow = ({ tile, last }: { tile: HomeTile; last: boolean }) => {
    const enabled = enabledIds.includes(tile.id);
    return (
      <>
        <View style={styles.row}>
          <View style={[styles.emojiBox, { backgroundColor: themeColors.surface }]}>
            <Text style={styles.emoji}>{tile.emoji}</Text>
          </View>
          <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t(`home.tiles.${tile.id}`)}</Text>
          <Switch
            value={enabled}
            onValueChange={(v) => onToggle(tile.id, v)}
            trackColor={{ false: themeColors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>
        {!last && <Divider />}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          {t('customizeHome.subtitle')}
        </Text>

        <SectionLabel>{t('customizeHome.sections.alwaysShown')}</SectionLabel>
        <SectionCard>
          {requiredTiles.map((tile, idx) => (
            <RequiredRow
              key={tile.id}
              tile={tile}
              last={idx === requiredTiles.length - 1}
            />
          ))}
        </SectionCard>
        <Text style={[styles.explainer, { color: themeColors.textMuted }]}>
          {t('customizeHome.explainer')}
        </Text>

        <SectionLabel>{t('customizeHome.sections.optional')}</SectionLabel>
        <SectionCard>
          {loaded
            ? optionalTiles.map((tile, idx) => (
                <OptionalRow
                  key={tile.id}
                  tile={tile}
                  last={idx === optionalTiles.length - 1}
                />
              ))
            : null}
        </SectionCard>

        <TouchableOpacity
          style={[styles.resetBtn, { borderColor: themeColors.border }]}
          onPress={onResetToDefault}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={Colors.error} />
          <Text style={[styles.resetText, { color: Colors.error }]}>{t('customizeHome.resetBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 8,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  emojiBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  explainer: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: { fontSize: 14, fontWeight: '700' },
});
