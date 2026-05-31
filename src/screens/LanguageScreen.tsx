import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../constants/colors';
import { trackScreen } from '../services/analytics';
import { TRANSLATIONS, TranslationOption } from '../constants/translations';
import { useStore } from '../store';

export default function LanguageScreen() {
  useEffect(() => { trackScreen('Language'); }, []);
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const selected = settings.selectedTranslation ?? 'ur.jalandhry';

  const handleSelect = (option: TranslationOption) => {
    updateSettings({
      selectedTranslation: option.edition,
      selectedTranslationName: option.name,
    });
    router.back();
  };

  const renderItem = ({ item, index }: { item: TranslationOption; index: number }) => {
    const isSelected = item.edition === selected;
    const isLast = index === TRANSLATIONS.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.row,
          { borderBottomColor: theme.border },
          !isLast && styles.rowBorder,
          isSelected && { backgroundColor: Colors.primary + '0C' },
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        {/* Left: language flag-style accent bar */}
        <View style={[styles.accentBar, { backgroundColor: isSelected ? Colors.primary : theme.border }]} />

        {/* Text info */}
        <View style={styles.rowInfo}>
          <View style={styles.rowTitleRow}>
            <Text style={[styles.rowName, { color: isSelected ? Colors.primary : theme.text }]}>
              {item.name}
            </Text>
            {item.rtl && (
              <View style={[styles.rtlBadge, { backgroundColor: Colors.accent + '22' }]}>
                <Text style={[styles.rtlBadgeText, { color: Colors.accent }]}>RTL</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.nativeName,
              { color: theme.textSecondary },
              item.rtl && styles.nativeRtl,
            ]}
          >
            {item.nativeName}
          </Text>
          <Text style={[styles.translator, { color: theme.textMuted }]}>
            {item.translator}
          </Text>
        </View>

        {/* Checkmark */}
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={theme.border} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>{t('language.header.title')}</Text>
        <Text style={styles.headerSub}>
          {t('language.header.selected', { name: settings.selectedTranslationName ?? t('language.defaultName') })}
        </Text>
      </View>

      <FlatList
        data={TRANSLATIONS}
        keyExtractor={(item) => item.edition}
        renderItem={renderItem}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('language.listHeader')}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 4,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },

  list: { paddingBottom: 32 },

  sectionLabel: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  accentBar: {
    width: 4,
    height: 42,
    borderRadius: 2,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rtlBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rtlBadgeText: { fontSize: 10, fontWeight: '700' },
  nativeName: { fontSize: 14 },
  nativeRtl: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 15,
    textAlign: 'left', // we show it LTR even for RTL scripts in the list
  },
  translator: { fontSize: 12 },
});
