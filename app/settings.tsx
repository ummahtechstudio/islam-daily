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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { CALCULATION_METHODS } from '../src/constants';
import { trackScreen } from '../src/services/analytics';
import {
  LANGUAGE_OPTIONS,
  CONTENT_LANGUAGE_KEY,
  ContentLanguage,
  saveContentLanguage,
} from '../src/services/localization';

export default function SettingsScreen() {
  useEffect(() => { trackScreen('Settings'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean | null>(null);
  const [contentLang, setContentLang] = useState<ContentLanguage | 'auto'>('auto');

  useEffect(() => {
    AsyncStorage.getItem('@privacy_consent').then((v) => {
      setAnalyticsEnabled(v === 'granted');
    });
    AsyncStorage.getItem(CONTENT_LANGUAGE_KEY).then((v) => {
      setContentLang((v as ContentLanguage | 'auto') ?? 'auto');
    });
  }, []);

  const toggleAnalytics = async (value: boolean) => {
    setAnalyticsEnabled(value);
    await AsyncStorage.setItem('@privacy_consent', value ? 'granted' : 'denied');
    if (!value) {
      Alert.alert(
        'Analytics disabled',
        'Anonymous location data will no longer be collected. This takes effect on next app launch.',
      );
    }
  };

  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Content Language */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Content Language</Text>
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {LANGUAGE_OPTIONS.map((opt, idx) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.row,
                idx < LANGUAGE_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
              onPress={async () => {
                setContentLang(opt.value);
                await saveContentLanguage(opt.value);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>{opt.label}</Text>
                {opt.native !== opt.label && (
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>{opt.native}</Text>
                )}
              </View>
              {contentLang === opt.value && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Appearance</Text>
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="moon" size={18} color="#8B5CF6" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
            <Switch
              value={settings.colorScheme === 'dark'}
              onValueChange={(v) => updateSettings({ colorScheme: v ? 'dark' : 'light' })}
              trackColor={{ false: theme.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="text" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Arabic Font Size</Text>
            <View style={styles.fontRow}>
              <TouchableOpacity
                onPress={() => updateSettings({ arabicFontSize: Math.max(16, settings.arabicFontSize - 2) })}
                hitSlop={8}
              >
                <Ionicons name="remove-circle" size={26} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.fontVal, { color: theme.text }]}>{settings.arabicFontSize}</Text>
              <TouchableOpacity
                onPress={() => updateSettings({ arabicFontSize: Math.min(40, settings.arabicFontSize + 2) })}
                hitSlop={8}
              >
                <Ionicons name="add-circle" size={26} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Notifications</Text>
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="notifications" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Prayer Notifications</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>Get notified at prayer times</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
              trackColor={{ false: theme.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Prayer Calculation */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Prayer Calculation</Text>
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {CALCULATION_METHODS.map((method, idx) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.row,
                idx < CALCULATION_METHODS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
              onPress={() => updateSettings({ calculationMethod: method.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>{method.name}</Text>
              </View>
              {settings.calculationMethod === method.id && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Privacy</Text>
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Anonymous Analytics</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>
                City &amp; country only — no personal data stored
              </Text>
            </View>
            {analyticsEnabled !== null && (
              <Switch
                value={analyticsEnabled}
                onValueChange={toggleAnalytics}
                trackColor={{ false: theme.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            )}
          </View>
          <View style={[styles.privacyNote, { backgroundColor: theme.surface }]}>
            <Text style={[styles.privacyNoteText, { color: theme.textMuted }]}>
              When enabled, Islam Daily logs your approximate city and country on each app launch to help us
              understand which regions the app serves. No name, email, device ID, or precise location is
              ever collected or shared with third parties.
            </Text>
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.about, { borderTopColor: theme.border }]}>
          <Text style={[styles.aboutText, { color: theme.textMuted }]}>Islam Daily v1.0.0</Text>
          <Text style={[styles.aboutText, { color: theme.textMuted }]}>Built with care for the Muslim community</Text>
          <Text style={[styles.bismillah, { color: Colors.primary }]}>بِسْمِ اللَّهِ</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 1 },
  fontRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fontVal: { fontSize: 16, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  privacyNote: {
    padding: 14,
  },
  privacyNoteText: { fontSize: 12, lineHeight: 18 },
  about: {
    alignItems: 'center',
    paddingTop: 28,
    gap: 4,
    borderTopWidth: 1,
    marginTop: 24,
  },
  aboutText: { fontSize: 13 },
  bismillah: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 24,
    marginTop: 8,
  },
});
