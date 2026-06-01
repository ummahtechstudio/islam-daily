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
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { urduUiStyle } from '../src/constants/fonts';
import { useStore } from '../src/store';
import { CALCULATION_METHODS } from '../src/constants';
import { trackScreen } from '../src/services/analytics';
import i18n from '../src/i18n';
import {
  LANGUAGE_OPTIONS,
  CONTENT_LANGUAGE_KEY,
  ContentLanguage,
  saveContentLanguage,
} from '../src/services/localization';
import {
  getSetting,
  setSetting,
  resetAllSettings,
  getTranslationLanguage,
  setTranslationLanguage,
  TranslationLanguage,
  getAppLanguage,
  setAppLanguage,
  AppLanguage,
} from '../src/utils/settings';

// ─── Option lists ─────────────────────────────────────────────────────────────

type ThemeOption = 'dark' | 'light' | 'auto';
type FontSize = 'small' | 'medium' | 'large';
type Madhab = 'standard' | 'hanafi';

const THEME_OPTIONS: { value: ThemeOption; comingSoon: boolean }[] = [
  { value: 'dark', comingSoon: false },
  { value: 'light', comingSoon: true },
  { value: 'auto', comingSoon: true },
];

const FONT_SIZE_OPTIONS: { value: FontSize }[] = [
  { value: 'small' },
  { value: 'medium' },
  { value: 'large' },
];

const CALC_METHOD_OPTIONS: { value: string }[] = [
  { value: 'MuslimWorldLeague' },
  { value: 'ISNA' },
  { value: 'EgyptianGeneralAuthority' },
  { value: 'UmmAlQura' },
  { value: 'Karachi' },
  { value: 'Kuwait' },
  { value: 'Qatar' },
  { value: 'Singapore' },
  { value: 'Tehran' },
  { value: 'Dubai' },
];

const MADHAB_OPTIONS: { value: Madhab }[] = [
  { value: 'standard' },
  { value: 'hanafi' },
];

const HIJRI_OFFSETS: number[] = [-2, -1, 0, 1, 2];

const TRANSLATION_OPTIONS: { value: string }[] = [
  { value: 'sahih_international' },
  { value: 'mohsin_khan' },
  { value: 'pickthall' },
  { value: 'yusuf_ali' },
];

const RECITER_OPTIONS: { value: string }[] = [
  { value: 'alafasy' },
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
  const { t, i18n: i18nInstance } = useTranslation();
  // Re-render this screen whenever the UI language changes so the Urdu/English
  // labels (and the Urdu Nastaliq styling below) update immediately.
  const isUrduUI = i18nInstance.language === 'ur';
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
  const [translationLang, setTranslationLang] = useState<TranslationLanguage>('urdu');
  const [appLang, setAppLang] = useState<AppLanguage>('en');

  // Storage info
  const [cacheSizeKB, setCacheSizeKB] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@privacy_consent')
      .then((v) => setAnalyticsEnabled(v === 'granted'))
      .catch(() => setAnalyticsEnabled(false));
    AsyncStorage.getItem(CONTENT_LANGUAGE_KEY)
      .then((v) => setContentLang((v as ContentLanguage | 'auto') ?? 'auto'))
      .catch(() => setContentLang('auto'));

    // Load all settings_* prefs. If any individual read fails we fall through
    // to the per-setting default rather than letting one bad MMKV value stop
    // the whole screen from populating.
    (async () => {
      try {
        const [
          themeV, arabicV, englishV, calcV, madhabV, hijriV,
          translationV, transliterationV, reciterV, adhanV, preAdhanV,
          dailyHadithV, dailyHadithTimeV, fridayV, translationLangV, appLangV,
        ] = await Promise.all([
          getSetting<ThemeOption>('theme', 'dark'),
          getSetting<FontSize>('arabic_font_size', 'medium'),
          getSetting<FontSize>('english_font_size', 'medium'),
          getSetting<string>('calc_method', 'MuslimWorldLeague'),
          getSetting<Madhab>('madhab', 'standard'),
          getSetting<number>('hijri_offset', 0),
          getSetting<string>('quran_translation', 'sahih_international'),
          getSetting<boolean>('show_transliteration', true),
          getSetting<string>('reciter', 'alafasy'),
          getSetting<boolean>('adhan_enabled', true),
          getSetting<boolean>('pre_adhan', false),
          getSetting<boolean>('daily_hadith', true),
          getSetting<string>('daily_hadith_time', '08:00'),
          getSetting<boolean>('friday_reminder', true),
          getTranslationLanguage(),
          getAppLanguage(),
        ]);
        setTheme(themeV);
        setArabicFontSize(arabicV);
        setEnglishFontSize(englishV);
        setCalcMethod(calcV);
        setMadhab(madhabV);
        setHijriOffset(hijriV);
        setQuranTranslation(translationV);
        setShowTransliteration(transliterationV);
        setReciter(reciterV);
        setAdhanEnabled(adhanV);
        setPreAdhan(preAdhanV);
        setDailyHadith(dailyHadithV);
        setDailyHadithTime(dailyHadithTimeV);
        setFridayReminder(fridayV);
        setTranslationLang(translationLangV);
        setAppLang(appLangV);
      } catch (err) {
        // Hard storage failure — the screen keeps its default initial state
        // and the user can still navigate around. Better than a frozen blank.
        console.warn('[Settings] failed to load some prefs', err);
      }
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
        t('settings.alerts.analyticsDisabled.title'),
        t('settings.alerts.analyticsDisabled.message'),
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
      Alert.alert(t('common.comingSoon'), t('settings.alerts.comingSoon.message'));
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

  const onSelectTranslationLang = async (v: TranslationLanguage) => {
    setTranslationLang(v);
    await setTranslationLanguage(v);
  };

  // App (interface) language. Coupling rule the owner asked for:
  //   • Urdu  → also force Translation Language to Urdu ("everything in Urdu").
  //   • English → leave Translation Language untouched (keeps the default
  //     English-interface-with-Urdu-translations, and whatever the user chose).
  const onSelectAppLang = async (v: AppLanguage) => {
    setAppLang(v);
    await setAppLanguage(v);
    await i18n.changeLanguage(v);
    if (v === 'ur') {
      setTranslationLang('urdu');
      await setTranslationLanguage('urdu');
    }
  };

  // ─── Storage actions ───────────────────────────────────────────────────────

  const onClearCache = () => {
    Alert.alert(
      t('settings.alerts.clearCache.title'),
      t('settings.alerts.clearCache.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
              if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
              await computeCacheSize();
              Alert.alert(
                t('settings.alerts.clearCache.successTitle'),
                t('settings.alerts.clearCache.successMessage'),
              );
            } catch {
              Alert.alert(t('common.error'), t('settings.alerts.clearCache.errorMessage'));
            }
          },
        },
      ],
    );
  };

  const onResetSettings = () => {
    Alert.alert(
      t('settings.alerts.resetSettings.title'),
      t('settings.alerts.resetSettings.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reset'),
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
            setTranslationLang('urdu');
            setAppLang('en');
            i18n.changeLanguage('en');
            Alert.alert(
              t('settings.alerts.resetSettings.successTitle'),
              t('settings.alerts.resetSettings.successMessage'),
            );
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
      <Text style={[styles.badgeText, { color: themeColors.textMuted }]}>{t('common.comingSoon')}</Text>
    </View>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ── APP LANGUAGE (interface) ──────────────────────────────────── */}
        {/* Switches the whole UI via i18next. Choosing Urdu also flips the
            Translation Language to Urdu (see onSelectAppLang); choosing English
            leaves the translation choice alone. */}
        <SectionLabel>{t('settings.sections.appLanguage')}</SectionLabel>
        <SectionCard>
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.radioColumn}>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => onSelectAppLang('en')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, { borderColor: appLang === 'en' ? Colors.primary : themeColors.border }]}>
                  {appLang === 'en' && <View style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
                </View>
                <Text style={[styles.radioLabel, { color: themeColors.text }, isUrduUI && urduUiStyle(14)]}>
                  {t('settings.appLang.englishOption')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => onSelectAppLang('ur')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, { borderColor: appLang === 'ur' ? Colors.primary : themeColors.border }]}>
                  {appLang === 'ur' && <View style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
                </View>
                <Text style={[styles.radioLabel, { color: themeColors.text }, isUrduUI && urduUiStyle(14)]}>
                  {t('settings.appLang.urduOption')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.explainer, { color: themeColors.textMuted }, isUrduUI && urduUiStyle(12)]}>
              {t('settings.appLang.explainer')}
            </Text>
          </View>
        </SectionCard>

        {/* ── TRANSLATION LANGUAGE ──────────────────────────────────────── */}
        <SectionLabel>{t('settings.sections.translationLanguage')}</SectionLabel>
        <SectionCard>
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.radioColumn}>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => onSelectTranslationLang('urdu')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, { borderColor: translationLang === 'urdu' ? Colors.primary : themeColors.border }]}>
                  {translationLang === 'urdu' && <View style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
                </View>
                <Text style={[styles.radioLabel, { color: themeColors.text }, isUrduUI && urduUiStyle(14)]}>
                  {t('settings.translationLang.urduOption')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => onSelectTranslationLang('english')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, { borderColor: translationLang === 'english' ? Colors.primary : themeColors.border }]}>
                  {translationLang === 'english' && <View style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
                </View>
                <Text style={[styles.radioLabel, { color: themeColors.text }, isUrduUI && urduUiStyle(14)]}>
                  {t('settings.translationLang.englishOption')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.explainer, { color: themeColors.textMuted }, isUrduUI && urduUiStyle(12)]}>
              {t('settings.translationLang.explainer')}
            </Text>
          </View>
        </SectionCard>

        {/* ── HOME SCREEN ────────────────────────────────────────────────── */}
        <SectionLabel>{t('settings.sections.homeScreen')}</SectionLabel>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.homeScreen.customize')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>
                {t('settings.homeScreen.customizeSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── APPEARANCE ─────────────────────────────────────────────────── */}
        {/* v1 ships dark-only; the Theme radio group (Dark/Light/Auto) and
            the redundant "Dark Mode" toggle row were removed from the UI for
            launch. Theme persistence + Colors tokens + the store's
            colorScheme state are intentionally kept so v1.1 can wire real
            Light + Auto support without rebuilding the foundation. */}
        <SectionLabel>{t('settings.sections.appearance')}</SectionLabel>
        <SectionCard>
          {/* Arabic Font Size slider */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="text" size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.appearance.arabicFontSize')}</Text>
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
                    <Text style={[styles.segmentText, { color: active ? '#fff' : themeColors.text }]}>
                      {t(`settings.fontSize.options.${opt.value}`)}
                    </Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.appearance.englishFontSize')}</Text>
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
                    <Text style={[styles.segmentText, { color: active ? '#fff' : themeColors.text }]}>
                      {t(`settings.fontSize.options.${opt.value}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SectionCard>

        {/* ── CONTENT LANGUAGE (existing) ────────────────────────────────── */}
        <SectionLabel>{t('settings.sections.contentLanguage')}</SectionLabel>
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
                  <Text style={[styles.rowLabel, { color: themeColors.text }]}>
                    {t(`settings.contentLanguage.options.${opt.value}`)}
                  </Text>
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
        <SectionLabel>{t('settings.sections.prayerTimes')}</SectionLabel>
        <SectionCard>
          {/* Calculation method (new settings_* picker) */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="compass" size={18} color={Colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.prayerTimes.calcMethod')}</Text>
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
                    <Text style={[styles.pickerText, { color: themeColors.text }]}>
                      {t(`settings.calcMethod.options.${opt.value}`)}
                    </Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.prayerTimes.madhab')}</Text>
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
                  <Text style={[styles.radioLabel, { color: themeColors.text }]}>
                    {t(`settings.madhab.options.${opt.value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.explainer, { color: themeColors.textMuted }]}>
              {t('settings.prayerTimes.madhabExplainer')}
            </Text>
          </View>

          <Divider />

          {/* Hijri offset stepper */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EAB30820' }]}>
                <Ionicons name="calendar" size={18} color="#EAB308" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.prayerTimes.hijriOffset')}</Text>
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
              {t('settings.prayerTimes.hijriExplainer')}
            </Text>
          </View>

          <Divider />

          {/* Existing CALCULATION_METHODS (Aladhan ids) — kept for compatibility with prayer-time service */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#06B6D420' }]}>
                <Ionicons name="time" size={18} color="#06B6D4" />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.prayerTimes.providerMethod')}</Text>
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
        <SectionLabel>{t('settings.sections.quran')}</SectionLabel>
        <SectionCard>
          {/* Translation picker */}
          <View style={[styles.row, styles.rowColumn]}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="library" size={18} color={Colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.quran.translation')}</Text>
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
                    <Text style={[styles.pickerText, { color: themeColors.text }]}>
                      {t(`settings.translation.options.${opt.value}`)}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.explainer, { color: themeColors.textMuted }]}>{t('settings.quran.translationNote')}</Text>
          </View>

          <Divider />

          {/* Show transliteration */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="language" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.quran.showTransliteration')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.quran.transliterationSub')}</Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.quran.reciter')}</Text>
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
                    <Text style={[styles.pickerText, { color: themeColors.text }]}>
                      {t(`settings.reciter.options.${opt.value}`)}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SectionCard>

        {/* ── NOTIFICATIONS ──────────────────────────────────────────────── */}
        <SectionLabel>{t('settings.sections.notifications')}</SectionLabel>
        <SectionCard>
          {/* Existing prayer notifications switch */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="notifications" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.notifSection.prayerNotifications')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.notifSection.prayerNotificationsSub')}</Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.notifSection.adhanNotifications')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.notifSection.adhanNotificationsSub')}</Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.notifSection.preAdhan')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.notifSection.preAdhanSub')}</Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.notifSection.dailyHadith')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.notifSection.dailyHadithSub')}</Text>
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
                  <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.notifSection.dailyHadithTime')}</Text>
                </View>
                <View style={styles.timeRow}>
                  {HADITH_TIME_OPTIONS.map((timeOpt) => {
                    const active = dailyHadithTime === timeOpt;
                    return (
                      <TouchableOpacity
                        key={timeOpt}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: active ? Colors.primary : themeColors.surface,
                            borderColor: active ? Colors.primary : themeColors.border,
                          },
                        ]}
                        onPress={() => onSelectDailyHadithTime(timeOpt)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.timeChipText, { color: active ? '#fff' : themeColors.text }]}>{timeOpt}</Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.notifSection.fridayReminder')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.notifSection.fridayReminderSub')}</Text>
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
        <SectionLabel>{t('settings.sections.privacy')}</SectionLabel>
        <SectionCard>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.privacy.analyticsLabel')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>
                {t('settings.privacy.analyticsSub')}
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
              {t('settings.privacy.analyticsNote')}
            </Text>
          </View>
        </SectionCard>

        {/* ── STORAGE & DATA ─────────────────────────────────────────────── */}
        <SectionLabel>{t('settings.sections.storageData')}</SectionLabel>
        <SectionCard>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#06B6D420' }]}>
              <Ionicons name="archive" size={18} color="#06B6D4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.storage.cachedData')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>
                {cacheSizeKB === null
                  ? t('settings.storage.calculating')
                  : cacheSizeKB === 0
                  ? t('settings.storage.noCachedData')
                  : cacheSizeKB < 1024
                  ? t('settings.storage.cachedKB', { size: cacheSizeKB })
                  : t('settings.storage.cachedMB', { size: (cacheSizeKB / 1024).toFixed(1) })}
              </Text>
            </View>
          </View>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={onClearCache} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="trash" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.storage.clearCache')}</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={onResetSettings} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="refresh" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.storage.resetAllSettings')}</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── ABOUT ──────────────────────────────────────────────────────── */}
        <SectionLabel>{t('settings.sections.about')}</SectionLabel>
        <SectionCard>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.about.appName')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.about.version', { version: APP_VERSION })}</Text>
            </View>
          </View>

          <Divider />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="business" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.about.developer')}</Text>
              <Text style={[styles.rowSub, { color: themeColors.textMuted }]}>{t('settings.about.developerName')}</Text>
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
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.about.contact')}</Text>
              <Text style={[styles.rowSub, { color: Colors.primary }]}>{CONTACT_EMAIL}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={() => openLink(PRIVACY_URL)} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.about.privacyPolicy')}</Text>
            <Ionicons name="open-outline" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity style={styles.row} onPress={() => openLink(TERMS_URL)} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#06B6D420' }]}>
              <Ionicons name="document-text" size={18} color="#06B6D4" />
            </View>
            <Text style={[styles.rowLabel, { color: themeColors.text }]}>{t('settings.about.termsOfService')}</Text>
            <Ionicons name="open-outline" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── CREDITS ────────────────────────────────────────────────────── */}
        <SectionLabel>{t('settings.sections.credits')}</SectionLabel>
        <SectionCard>
          <View style={[styles.creditsBlock, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.creditsHeader, { color: themeColors.text }]}>
              {t('settings.credits.header')}
            </Text>
            <View style={styles.creditsList}>
              <CreditLine labelKey="quran" colorScheme={themeColors} />
              <CreditLine labelKey="hadith" colorScheme={themeColors} />
              <CreditLine labelKey="duas" colorScheme={themeColors} />
              <CreditLine labelKey="prayerTimes" colorScheme={themeColors} />
            </View>
          </View>
        </SectionCard>

        <View style={[styles.about, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.aboutText, { color: themeColors.textMuted }]}>
            {t('settings.about.footer')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CreditLine({
  labelKey,
  colorScheme,
}: {
  labelKey: 'quran' | 'hadith' | 'duas' | 'prayerTimes';
  colorScheme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.creditRow}>
      <Text style={[styles.creditLabel, { color: colorScheme.textSecondary }]}>
        {t(`settings.credits.labels.${labelKey}`)}
      </Text>
      <Text style={[styles.creditSource, { color: colorScheme.text }]}>
        {t(`settings.credits.sources.${labelKey}`)}
      </Text>
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
});
