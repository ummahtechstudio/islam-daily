import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  useColorScheme,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
import { getSetting, setSetting, resetAllSettings } from '../src/utils/settings';

// ─── Option lists ─────────────────────────────────────────────────────────────

type ThemeOption = 'dark' | 'light' | 'auto';
type FontSize = 'small' | 'medium' | 'large';
type Madhab = 'standard' | 'hanafi';

const THEME_OPTIONS: { value: ThemeOption; label: string; comingSoon: boolean }[] = [
  { value: 'dark', label: 'Dark', comingSoon: false },
  { value: 'light', label: 'Light', comingSoon: true },
  { value: 'auto', label: 'Auto', comingSoon: true },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const CALC_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'MuslimWorldLeague', label: 'Muslim World League' },
  { value: 'ISNA', label: 'ISNA (North America)' },
  { value: 'EgyptianGeneralAuthority', label: 'Egyptian General Authority' },
  { value: 'UmmAlQura', label: 'Umm Al-Qura (Makkah)' },
  { value: 'Karachi', label: 'University of Karachi' },
  { value: 'Kuwait', label: 'Kuwait' },
  { value: 'Qatar', label: 'Qatar' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Tehran', label: 'Tehran' },
  { value: 'Dubai', label: 'Dubai' },
];

const MADHAB_OPTIONS: { value: Madhab; label: string }[] = [
  { value: 'standard', label: "Standard (Shafi'i, Maliki, Hanbali)" },
  { value: 'hanafi', label: 'Hanafi' },
];

const HIJRI_OFFSETS: number[] = [-2, -1, 0, 1, 2];

const TRANSLATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'sahih_international', label: 'Saheeh International' },
  { value: 'mohsin_khan', label: 'Mohsin Khan (Hilali-Khan)' },
  { value: 'pickthall', label: 'Pickthall' },
  { value: 'yusuf_ali', label: 'Yusuf Ali' },
];

const RECITER_OPTIONS: { value: string; label: string }[] = [
  { value: 'alafasy', label: 'Mishary Rashid Alafasy' },
];

const HADITH_TIME_OPTIONS: string[] = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '18:00', '20:00', '21:00',
];

const APP_VERSION = '1.0.0';
const CONTACT_EMAIL = 'ummahtech.studio@gmail.com';
const PRIVACY_URL = 'https://ummahtechstudio.github.io/islam-daily/privacy.html';
const TERMS_URL = 'https://ummahtechstudio.github.io/islam-daily/terms.html';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  useEffect(() => { trackScreen('Settings'); }, []);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  // Existing prefs
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean | null>(null);
  const [contentLang, setContentLang] = useState<ContentLanguage | 'auto'>('auto');

  // settings_* prefs
  const [theme, setTheme] = useState<ThemeOption>('dark');
  const [arabicFontSize, setArabicFontSize] = useState<FontSize>('medium');
  const [englishFontSize, setEnglishFontSize] = useState<FontSize>('medium');
  const [calcMethod, setCalcMethod] = useState<string>('MuslimWorldLeague');
  const [madhab, setMadhab] = useState<Madhab>('standard');
  const [hijriOffset, setHijriOffset] = useState<number>(0);
  const [quranTranslation, setQuranTranslation] = useState<string>('sahih_international');
  const [showTransliteration, setShowTransliteration] = useState<boolean>(true);
  const [reciter, setReciter] = useState<string>('alafasy');
  const [adhanEnabled, setAdhanEnabled] = useState<boolean>(true);
  const [preAdhan, setPreAdhan] = useState<boolean>(false);
  const [dailyHadith, setDailyHadith] = useState<boolean>(true);
  const [dailyHadithTime, setDailyHadithTime] = useState<string>('08:00');
  const [fridayReminder, setFridayReminder] = useState<boolean>(true);

  // Storage info
  const [cacheSizeKB, setCacheSizeKB] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@privacy_consent').then((v) => {
      setAnalyticsEnabled(v === 'granted');
    });
    AsyncStorage.getItem(CONTENT_LANGUAGE_KEY).then((v) => {
      setContentLang((v as ContentLanguage | 'auto') ?? 'auto');
    });

    // Load all settings_* prefs
    (async () => {
      setTheme(await getSetting<ThemeOption>('theme', 'dark'));
      setArabicFontSize(await getSetting<FontSize>('arabic_font_size', 'medium'));
      setEnglishFontSize(await getSetting<FontSize>('english_font_size', 'medium'));
      setCalcMethod(await getSetting<string>('calc_method', 'MuslimWorldLeague'));
      setMadhab(await getSetting<Madhab>('madhab', 'standard'));
      setHijriOffset(await getSetting<number>('hijri_offset', 0));
      setQuranTranslation(await getSetting<string>('quran_translation', 'sahih_international'));
      setShowTransliteration(await getSetting<boolean>('show_transliteration', true));
      setReciter(await getSetting<string>('reciter', 'alafasy'));
      setAdhanEnabled(await getSetting<boolean>('adhan_enabled', true));
      setPreAdhan(await getSetting<boolean>('pre_adhan', false));
      setDailyHadith(await getSetting<boolean>('daily_hadith', true));
      setDailyHadithTime(await getSetting<string>('daily_hadith_time', '08:00'));
      setFridayReminder(await getSetting<boolean>('friday_reminder', true));
    })();

    computeCacheSize();
  }, []);

  const computeCacheSize = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
      if (cacheKeys.length === 0) {
        setCacheSizeKB(0);
        return;
      }
      const entries = await AsyncStorage.multiGet(cacheKeys);
      let bytes = 0;
      for (const [, v] of entries) {
        if (v) bytes += v.length;
      }
      setCacheSizeKB(Math.round(bytes / 1024));
    } catch {
      setCacheSizeKB(null);
    }
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
  const themeColors = isDark ? Colors.dark : Colors.light;

  // ─── Persistent setters ────────────────────────────────────────────────────

  const onSelectTheme = async (value: ThemeOption) => {
    if (value !== 'dark') {
      Alert.alert('Coming Soon', 'Light and Auto themes will be available in a future update.');
      return;
    }
    setTheme(value);
    await setSetting('theme', value);
  };

  const onSelectArabicFontSize = async (v: FontSize) => {
    setArabicFontSize(v);
    await setSetting('arabic_font_size', v);
  };

  const onSelectEnglishFontSize = async (v: FontSize) => {
    setEnglishFontSize(v);
    await setSetting('english_font_size', v);
  };

  const onSelectCalcMethod = async (v: string) => {
    setCalcMethod(v);
    await setSetting('calc_method', v);
  };

  const onSelectMadhab = async (v: Madhab) => {
    setMadhab(v);
    await setSetting('madhab', v);
  };

  const onSelectHijriOffset = async (v: number) => {
    setHijriOffset(v);
    await setSetting('hijri_offset', v);
  };

  const onSelectTranslation = async (v: string) => {
    setQuranTranslation(v);
    await setSetting('quran_translation', v);
  };

  const onToggleTransliteration = async (v: boolean) => {
    setShowTransliteration(v);
    await setSetting('show_transliteration', v);
  };

  const onSelectReciter = async (v: string) => {
    setReciter(v);
    await setSetting('reciter', v);
  };

  const onToggleAdhan = async (v: boolean) => {
    setAdhanEnabled(v);
    await setSetting('adhan_enabled', v);
  };

  const onTogglePreAdhan = async (v: boolean) => {
    setPreAdhan(v);
    await setSetting('pre_adhan', v);
  };

  const onToggleDailyHadith = async (v: boolean) => {
    setDailyHadith(v);
    await setSetting('daily_hadith', v);
  };

  const onSelectDailyHadithTime = async (v: string) => {
    setDailyHadithTime(v);
    await setSetting('daily_hadith_time', v);
  };

  const onToggleFridayReminder = async (v: boolean) => {
    setFridayReminder(v);
    await setSetting('friday_reminder', v);
  };

  // ─── Storage actions ───────────────────────────────────────────────────────

  const onClearCache = () => {
    Alert.alert(
      'Clear Cache?',
      'This will remove cached prayer times, Quran data, and hadith data. Your bookmarks and settings will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
              if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
              await computeCacheSize();
              Alert.alert('Cache Cleared', 'Cached data has been removed.');
            } catch {
              Alert.alert('Error', 'Could not clear cache.');
            }
          },
        },
      ],
    );
  };

  const onResetSettings = () => {
    Alert.alert(
      'Reset All Settings?',
      'This will restore all preferences to their defaults. Your bookmarks will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllSettings();
            setTheme('dark');
            setArabicFontSize('medium');
            setEnglishFontSize('medium');
            setCalcMethod('MuslimWorldLeague');
            setMadhab('standard');
            setHijriOffset(0);
            setQuranTranslation('sahih_international');
            setShowTransliteration(true);
            setReciter('alafasy');
            setAdhanEnabled(true);
            setPreAdhan(false);
            setDailyHadith(true);
            setDailyHadithTime('08:00');
            setFridayReminder(true);
            Alert.alert('Settings Reset', 'All preferences have been restored to defaults.');
          },
        },
      ],
    );
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {}
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

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

  const ComingSoonBadge = () => (
    <View style={[styles.badge, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      <Text style={[styles.badgeText, { color: themeColors.textMuted }]}>Coming Soon</Text>
    </View>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ── HOME SCREEN ────────────────────────────────────────────────── */}
        <SectionLabel>Home Screen</SectionLabel>
        <SectionCard>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/customize-home' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="grid" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Customize Home Screen</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>
                Choose which tiles appear on your home
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── APPEARANCE ─────────────────────────────────────────────────── */}
        <SectionLabel>Appearance</SectionLabel>
        <SectionCard>
          {/* Theme radios */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="color-palette" size={18} color="#8B5CF6" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Theme</Text>
            </View>
            <View style={styles.radioColumn}>
              {THEME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.radioRow}
                  onPress={() => onSelectTheme(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, { borderColor: theme === opt.value ? Colors.primary : themeColors.border }]}>
                    {theme === opt.value && <View style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: themeColors.text }]}>{opt.label}</Text>
                  {opt.comingSoon && <ComingSoonBadge />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Divider />

          {/* Existing Dark Mode functional switch (kept — drives the actual app theme) */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="moon" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Dark Mode</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>Currently the only available theme</Text>
            </View>
            <Switch
              value={settings.colorScheme === 'dark'}
              onValueChange={(v) => updateSettings({ colorScheme: v ? 'dark' : 'light' })}
              trackColor={{ false: themeColors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Divider />

          {/* Arabic Font Size slider */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="text" size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Arabic Font Size</Text>
            </View>
            <View style={styles.segmentRow}>
              {FONT_SIZE_OPTIONS.map((opt) => {
                const active = arabicFontSize === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: active ? Colors.primary : themeColors.surface,
                        borderColor: active ? Colors.primary : themeColors.border,
                      },
                    ]}
                    onPress={() => onSelectArabicFontSize(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#fff' : themeColors.text }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Divider />

          {/* English Font Size slider */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="text-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>English Font Size</Text>
            </View>
            <View style={styles.segmentRow}>
              {FONT_SIZE_OPTIONS.map((opt) => {
                const active = englishFontSize === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: active ? Colors.primary : themeColors.surface,
                        borderColor: active ? Colors.primary : themeColors.border,
                      },
                    ]}
                    onPress={() => onSelectEnglishFontSize(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#fff' : themeColors.text }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SectionCard>

        {/* ── CONTENT LANGUAGE (existing) ────────────────────────────────── */}
        <SectionLabel>Content Language</SectionLabel>
        <SectionCard>
          {LANGUAGE_OPTIONS.map((opt, idx) => (
            <React.Fragment key={opt.value}>
              <TouchableOpacity
                style={styles.row}
                onPress={async () => {
                  setContentLang(opt.value);
                  await saveContentLanguage(opt.value);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: themeColors.text }]}>{opt.label}</Text>
                  {opt.native !== opt.label && (
                    <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{opt.native}</Text>
                  )}
                </View>
                {contentLang === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
              {idx < LANGUAGE_OPTIONS.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </SectionCard>

        {/* ── PRAYER TIMES ───────────────────────────────────────────────── */}
        <SectionLabel>Prayer Times</SectionLabel>
        <SectionCard>
          {/* Calculation method (new settings_* picker) */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="compass" size={18} color={Colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Calculation Method</Text>
            </View>
            <View style={styles.pickerColumn}>
              {CALC_METHOD_OPTIONS.map((opt) => {
                const active = calcMethod === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pickerRow,
                      {
                        backgroundColor: active ? Colors.primary + '15' : 'transparent',
                        borderColor: active ? Colors.primary : themeColors.border,
                      },
                    ]}
                    onPress={() => onSelectCalcMethod(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, { color: themeColors.text }]}>{opt.label}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Divider />

          {/* Madhab radios */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="book" size={18} color="#10B981" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Madhab for Asr</Text>
            </View>
            <View style={styles.radioColumn}>
              {MADHAB_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.radioRow}
                  onPress={() => onSelectMadhab(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, { borderColor: madhab === opt.value ? Colors.primary : themeColors.border }]}>
                    {madhab === opt.value && <View style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: themeColors.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.explainer, { color: themeColors.textMuted }]}>
              Hanafi madhab uses a later Asr time
            </Text>
          </View>

          <Divider />

          {/* Hijri offset stepper */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EAB30820' }]}>
                <Ionicons name="calendar" size={18} color="#EAB308" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Hijri Date Offset</Text>
            </View>
            <View style={styles.segmentRow}>
              {HIJRI_OFFSETS.map((offset) => {
                const active = hijriOffset === offset;
                const label = offset > 0 ? `+${offset}` : `${offset}`;
                return (
                  <TouchableOpacity
                    key={offset}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: active ? Colors.primary : themeColors.surface,
                        borderColor: active ? Colors.primary : themeColors.border,
                      },
                    ]}
                    onPress={() => onSelectHijriOffset(offset)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#fff' : themeColors.text }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.explainer, { color: themeColors.textMuted }]}>
              Adjust if your country sees the moon differently
            </Text>
          </View>

          <Divider />

          {/* Existing CALCULATION_METHODS (Aladhan ids) — kept for compatibility with prayer-time service */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#06B6D420' }]}>
                <Ionicons name="time" size={18} color="#06B6D4" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Provider Method (Aladhan)</Text>
            </View>
            <View style={styles.pickerColumn}>
              {CALCULATION_METHODS.map((method) => {
                const active = settings.calculationMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.pickerRow,
                      {
                        backgroundColor: active ? Colors.primary + '15' : 'transparent',
                        borderColor: active ? Colors.primary : themeColors.border,
                      },
                    ]}
                    onPress={() => updateSettings({ calculationMethod: method.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, { color: themeColors.text }]}>{method.name}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SectionCard>

        {/* ── QURAN ──────────────────────────────────────────────────────── */}
        <SectionLabel>Quran</SectionLabel>
        <SectionCard>
          {/* Translation picker */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="library" size={18} color={Colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Translation</Text>
            </View>
            <View style={styles.pickerColumn}>
              {TRANSLATION_OPTIONS.map((opt) => {
                const active = quranTranslation === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pickerRow,
                      {
                        backgroundColor: active ? Colors.primary + '15' : 'transparent',
                        borderColor: active ? Colors.primary : themeColors.border,
                      },
                    ]}
                    onPress={() => onSelectTranslation(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, { color: themeColors.text }]}>{opt.label}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.explainer, { color: themeColors.textMuted }]}>More translations coming soon</Text>
          </View>

          <Divider />

          {/* Show transliteration */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="language" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Show Transliteration</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>Romanized Arabic pronunciation</Text>
            </View>
            <Switch
              value={showTransliteration}
              onValueChange={onToggleTransliteration}
              trackColor={{ false: themeColors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Divider />

          {/* Reciter picker */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="musical-notes" size={18} color="#8B5CF6" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Reciter for Audio</Text>
            </View>
            <View style={styles.pickerColumn}>
              {RECITER_OPTIONS.map((opt) => {
                const active = reciter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pickerRow,
                      {
                        backgroundColor: active ? Colors.primary + '15' : 'transparent',
                        borderColor: active ? Colors.primary : themeColors.border,
                      },
                    ]}
                    onPress={() => onSelectReciter(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, { color: themeColors.text }]}>{opt.label}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SectionCard>

        {/* ── NOTIFICATIONS ──────────────────────────────────────────────── */}
        <SectionLabel>Notifications</SectionLabel>
        <SectionCard>
          {/* Existing prayer notifications switch */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="notifications" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Prayer Notifications</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>Get notified at prayer times</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
              trackColor={{ false: themeColors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Divider />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="volume-high" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Adhan Notifications</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>Play adhan at prayer times</Text>
            </View>
            <Switch
              value={adhanEnabled}
              onValueChange={onToggleAdhan}
              trackColor={{ false: themeColors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Divider />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="alarm" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Pre-Adhan Reminder</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>10 minutes before each prayer</Text>
            </View>
            <Switch
              value={preAdhan}
              onValueChange={onTogglePreAdhan}
              trackColor={{ false: themeColors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Divider />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="book" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Daily Hadith</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>One hadith every day</Text>
            </View>
            <Switch
              value={dailyHadith}
              onValueChange={onToggleDailyHadith}
              trackColor={{ false: themeColors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {dailyHadith && (
            <>
              <Divider />
              <View style={[styles.row, styles.rowColumn]}>
                <View style={styles.rowHeader}>
                  <View style={[styles.iconBox, { backgroundColor: '#06B6D420' }]}>
                    <Ionicons name="time-outline" size={18} color="#06B6D4" />
                  </View>
                  <Text style={[styles.rowLabel, { color: themeColors.text }]}>Daily Hadith Time</Text>
                </View>
                <View style={styles.timeRow}>
                  {HADITH_TIME_OPTIONS.map((t) => {
                    const active = dailyHadithTime === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: active ? Colors.primary : themeColors.surface,
                            borderColor: active ? Colors.primary : themeColors.border,
                          },
                        ]}
                        onPress={() => onSelectDailyHadithTime(t)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.timeChipText, { color: active ? '#fff' : themeColors.text }]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          <Divider />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#EAB30820' }]}>
              <Ionicons name="star" size={18} color="#EAB308" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Friday Reminder</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>Reminder to read Surah Al-Kahf</Text>
            </View>
            <Switch
              value={fridayReminder}
              onValueChange={onToggleFridayReminder}
              trackColor={{ false: themeColors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </SectionCard>

        {/* ── PRIVACY (existing) ─────────────────────────────────────────── */}
        <SectionLabel>Privacy</SectionLabel>
        <SectionCard>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Anonymous Analytics</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>
                City &amp; country only — no personal data stored
              </Text>
            </View>
            {analyticsEnabled !== null && (
              <Switch
                value={analyticsEnabled}
                onValueChange={toggleAnalytics}
                trackColor={{ false: themeColors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            )}
          </View>
          <View style={[styles.privacyNote, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.privacyNoteText, { color: themeColors.textMuted }]}>
              When enabled, Islam Daily logs your approximate city and country on each app launch to help us
              understand which regions the app serves. No name, email, device ID, or precise location is
              ever collected or shared with third parties.
            </Text>
          </View>
        </SectionCard>

        {/* ── STORAGE & DATA ─────────────────────────────────────────────── */}
        <SectionLabel>Storage &amp; Data</SectionLabel>
        <SectionCard>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#06B6D420' }]}>
              <Ionicons name="archive" size={18} color="#06B6D4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Cached Data</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>
                {cacheSizeKB === null
                  ? 'Calculating…'
                  : cacheSizeKB === 0
                  ? 'No cached data'
                  : `${cacheSizeKB < 1024 ? `${cacheSizeKB} KB` : `${(cacheSizeKB / 1024).toFixed(1)} MB`} cached`}
              </Text>
            </View>
          </View>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={onClearCache} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="trash" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>Clear Cache</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={onResetSettings} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="refresh" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>Reset All Settings</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── ABOUT ──────────────────────────────────────────────────────── */}
        <SectionLabel>About</SectionLabel>
        <SectionCard>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Islam Daily</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>Version {APP_VERSION}</Text>
            </View>
          </View>

          <Divider />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="business" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Developer</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>Ummah Tech Studio</Text>
            </View>
          </View>

          <Divider />

          <TouchableOpacity
            style={styles.row}
            onPress={() => openLink(`mailto:${CONTACT_EMAIL}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="mail" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Contact</Text>
              <Text style={[styles.rowSub, { color: Colors.primary }]}>{CONTACT_EMAIL}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={() => openLink(PRIVACY_URL)} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={() => openLink(TERMS_URL)} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#06B6D420' }]}>
              <Ionicons name="document-text" size={18} color="#06B6D4" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>Terms of Service</Text>
            <Ionicons name="open-outline" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── CREDITS ────────────────────────────────────────────────────── */}
        <SectionLabel>Credits &amp; Data Sources</SectionLabel>
        <SectionCard>
          <View style={[styles.creditsBlock, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.creditsHeader, { color: themeColors.text }]}>
              We gratefully acknowledge these open data sources:
            </Text>
            <View style={styles.creditsList}>
              <CreditLine label="Quran" source="Tanzil" colorScheme={themeColors} />
              <CreditLine label="Hadith" source="A7med3bdulBaset/hadith-json" colorScheme={themeColors} />
              <CreditLine label="Duas" source="Hisn al-Muslim" colorScheme={themeColors} />
              <CreditLine label="Prayer Times" source="Aladhan API" colorScheme={themeColors} />
            </View>
          </View>
        </SectionCard>

        <View style={[styles.about, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.bismillah, { color: Colors.primary }]}>بِسْمِ اللَّهِ</Text>
          <Text style={[styles.aboutText, { color: themeColors.textMuted }]}>
            Built with care for the Muslim community
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CreditLine({
  label,
  source,
  colorScheme,
}: {
  label: string;
  source: string;
  colorScheme: typeof Colors.dark;
}) {
  return (
    <View style={styles.creditRow}>
      <Text style={[styles.creditLabel, { color: colorScheme.textSecondary }]}>{label}</Text>
      <Text style={[styles.creditSource, { color: colorScheme.text }]}>{source}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
  rowColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  // Radio
  radioColumn: { gap: 10, paddingLeft: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { flex: 1, fontSize: 14 },
  // Segment
  segmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 56,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
  // Picker
  pickerColumn: { gap: 6 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  pickerText: { flex: 1, fontSize: 14 },
  // Time chips
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeChipText: { fontSize: 13, fontWeight: '600' },
  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Misc
  explainer: { fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  privacyNote: { padding: 14 },
  privacyNoteText: { fontSize: 12, lineHeight: 18 },
  // Credits
  creditsBlock: { padding: 14, gap: 10 },
  creditsHeader: { fontSize: 13, fontWeight: '600' },
  creditsList: { gap: 6 },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  creditLabel: { fontSize: 12, fontWeight: '600' },
  creditSource: { fontSize: 12 },
  // Footer
  about: {
    alignItems: 'center',
    paddingTop: 28,
    gap: 8,
    borderTopWidth: 1,
    marginTop: 24,
  },
  aboutText: { fontSize: 12 },
  bismillah: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 24,
  },
});
