import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../src/constants/colors';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import CardActionsRow from '../../components/CardActionsRow';

// ─── Hisnul Muslim dataset (local asset) ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const HISNUL_MUSLIM: DuaCategory[] = require('../../assets/hisnul_muslim.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DHIKR_DATA: DhikrCategory[] = require('../../assets/dhikr.json');

const GOLD = '#EF9F27';

interface Dua {
  arabic: string;
  transliteration: string;
  english: string;
  reference: string;
}

interface DuaCategory {
  id: string;
  title: string;
  icon: string;
  duas: Dua[];
}

interface DhikrItem {
  arabic: string;
  transliteration: string;
  english: string;
  count: number;
  benefit: string;
  reference: string;
}

interface DhikrCategory {
  id: string;
  title: string;
  icon: string;
  items: DhikrItem[];
}

// ─── Category icon overrides (time-aware, more descriptive) ──────────────────

const CATEGORY_ICONS: Record<string, string> = {
  waking:      '🌅',
  morning:     '☀️',
  evening:     '🌙',
  sleep:       '🌛',
  prayer:      '🕌',
  eating:      '🍽️',
  travel:      '✈️',
  distress:    '🤲',
  forgiveness: '💚',
  mosque:      '🕍',
  protection:  '🛡️',
  dua_parents: '👨‍👩‍👧',
  rain:        '🌧️',
  knowledge:   '📖',
  sickness:    '🤒',
  marriage:    '💍',
  rizq:        '💰',
  friday:      '🕌',
};

// ─── "Dua of the Moment" ─────────────────────────────────────────────────────

function getDuaOfMoment(): { category: DuaCategory; dua: Dua; reason: string } | null {
  const hour = new Date().getHours();
  let catId: string;
  let reason: string;

  if (hour >= 4 && hour < 7) {
    catId = 'waking'; reason = 'Morning awakening';
  } else if (hour >= 7 && hour < 12) {
    catId = 'morning'; reason = 'Morning adhkar time';
  } else if (hour >= 12 && hour < 13) {
    catId = 'prayer'; reason = 'Dhuhr prayer time';
  } else if (hour >= 13 && hour < 16) {
    catId = 'knowledge'; reason = 'Midday — seek knowledge';
  } else if (hour >= 15 && hour < 18) {
    catId = 'evening'; reason = 'Evening adhkar time';
  } else if (hour >= 18 && hour < 20) {
    catId = 'evening'; reason = 'Sunset adhkar';
  } else if (hour >= 20 && hour < 23) {
    catId = 'sleep'; reason = 'Preparing for sleep';
  } else {
    catId = 'sleep'; reason = 'Late night';
  }

  const category = HISNUL_MUSLIM.find((c) => c.id === catId) ?? HISNUL_MUSLIM[0];
  const dua = category.duas[new Date().getDate() % category.duas.length];
  return dua ? { category, dua, reason } : null;
};

type Tab = 'dua' | 'dhikr';

export default function DuaScreen() {
  useEffect(() => { trackScreen('Dua'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const { dhikrCount, incrementDhikr, resetDhikr } = useStore();
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [tab, setTab] = useState<Tab>('dua');
  const [selectedCategory, setSelectedCategory] = useState(HISNUL_MUSLIM[0].id);
  const [selectedDhikrCategory, setSelectedDhikrCategory] = useState(DHIKR_DATA[0].id);
  const [selectedDhikr, setSelectedDhikr] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { setExpanded(null); }, [selectedCategory]);
  useEffect(() => { setExpanded(null); }, [searchQuery]);

  const currentCategory = HISNUL_MUSLIM.find((c) => c.id === selectedCategory);
  const baseDuas = currentCategory?.duas ?? [];
  const filteredDuas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseDuas;
    return baseDuas.filter((d) =>
      (d.english || '').toLowerCase().includes(q) ||
      (d.transliteration || '').toLowerCase().includes(q) ||
      (d.reference || '').toLowerCase().includes(q),
    );
  }, [baseDuas, searchQuery]);

  const currentDhikrCategory =
    DHIKR_DATA.find((c) => c.id === selectedDhikrCategory) ?? DHIKR_DATA[0];
  const dhikrItems = currentDhikrCategory.items;
  const safeDhikrIdx = Math.min(selectedDhikr, dhikrItems.length - 1);
  const currentDhikr = dhikrItems[safeDhikrIdx];
  const targetCount = currentDhikr.count;
  const progress = Math.min(dhikrCount / targetCount, 1);
  const duaOfMoment = getDuaOfMoment();

  const handleDhikrTap = async () => {
    incrementDhikr();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if ((dhikrCount + 1) % targetCount === 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: Colors.primary }]}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Dua & Dhikr</Text>
        </View>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'dua' && styles.tabBtnActive]}
            onPress={() => setTab('dua')}
          >
            <Text style={[styles.tabBtnText, tab === 'dua' && styles.tabBtnTextActive]}>
              Duas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'dhikr' && styles.tabBtnActive]}
            onPress={() => setTab('dhikr')}
          >
            <Text style={[styles.tabBtnText, tab === 'dhikr' && styles.tabBtnTextActive]}>
              Dhikr
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'dua' ? (
        <View style={{ flex: 1 }}>
          {/* Dua of the Moment */}
          {duaOfMoment && !searchQuery && (
            <View style={[styles.duaMomentCard, { backgroundColor: Colors.primary }]}>
              <View style={styles.duaMomentHeader}>
                <View style={styles.duaMomentBadge}>
                  <Text style={styles.duaMomentIcon}>
                    {CATEGORY_ICONS[duaOfMoment.category.id] ?? duaOfMoment.category.icon}
                  </Text>
                  <Text style={styles.duaMomentBadgeText}>Dua of the Moment</Text>
                </View>
                <Text style={styles.duaMomentReason}>{duaOfMoment.reason}</Text>
              </View>
              <Text style={styles.duaMomentArabic} textBreakStrategy="simple" numberOfLines={3}>
                {duaOfMoment.dua.arabic}
              </Text>
              <Text style={styles.duaMomentEnglish} numberOfLines={2}>
                {duaOfMoment.dua.english}
              </Text>
            </View>
          )}

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search English, transliteration, or reference (e.g. Bukhari)…"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {HISNUL_MUSLIM.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    isActive && styles.catChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.catIcon}>
                    {CATEGORY_ICONS[cat.id] ?? cat.icon}
                  </Text>
                  <Text
                    style={[
                      styles.catLabel,
                      { color: isActive ? '#fff' : theme.text },
                    ]}
                    numberOfLines={1}
                  >
                    {cat.title}
                  </Text>
                  <Text
                    style={[
                      styles.catCount,
                      { color: isActive ? 'rgba(255,255,255,0.85)' : theme.textMuted },
                    ]}
                  >
                    {cat.duas.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Duas list */}
          {filteredDuas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : '🤲'}</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {searchQuery ? 'No duas match your search' : 'No duas in this category yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                {searchQuery ? 'Try different keywords or clear the search' : 'We\'re adding more soon InshaAllah'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.duaList} showsVerticalScrollIndicator={false}>
              {filteredDuas.map((dua, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.duaCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => setExpanded(expanded === idx ? null : idx)}
                  activeOpacity={0.8}
                >
                  {/* Gold left accent bar */}
                  <View style={styles.duaGoldAccent} />

                  <View style={styles.duaHeader}>
                    <View style={[styles.duaNumBadge, { backgroundColor: Colors.primary + '22' }]}>
                      <Text style={[styles.duaNum, { color: Colors.primary }]}>{idx + 1}</Text>
                    </View>
                    <Ionicons
                      name={expanded === idx ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={theme.textMuted}
                    />
                  </View>

                  <Text
                    style={[styles.duaArabic, { color: theme.text }]}
                    textBreakStrategy="simple"
                    numberOfLines={expanded === idx ? undefined : 3}
                  >
                    {dua.arabic || '—'}
                  </Text>

                  {expanded === idx && (
                    <>
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />
                      {dua.transliteration ? (
                        <Text style={[styles.duaTranslit, { color: Colors.primary }]}>
                          {dua.transliteration}
                        </Text>
                      ) : (
                        <Text style={[styles.duaTranslit, { color: theme.textMuted }]}>
                          Transliteration not available
                        </Text>
                      )}
                      <Text style={[styles.duaEnglish, { color: theme.textSecondary }]}>
                        {dua.english || 'Translation not available'}
                      </Text>
                      <View style={[styles.referenceContainer, { borderTopColor: theme.border }]}>
                        <Text style={[styles.referenceLabel, { color: theme.textMuted }]}>📖 Reference:</Text>
                        <Text style={[styles.referenceText, { color: theme.textMuted }]}>
                          {dua.reference || 'Hisn al-Muslim'}
                        </Text>
                      </View>
                      <CardActionsRow
                        bookmark={{
                          type: 'dua',
                          id: `dua-${selectedCategory}-${idx}`,
                          title: `${currentCategory?.title ?? 'Dua'} #${idx + 1}`,
                          arabic: dua.arabic,
                          translation: dua.english,
                          reference: dua.reference || 'Hisn al-Muslim',
                          category: currentCategory?.title,
                        }}
                        shareable={{
                          arabic: dua.arabic,
                          translation: dua.english,
                          reference: dua.reference || 'Hisn al-Muslim',
                          type: 'dua',
                        }}
                        iconColor={theme.textMuted}
                      />
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        /* ── Dhikr Counter ── */
        <ScrollView contentContainerStyle={styles.dhikrContainer}>
          {/* Dhikr category selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dhikrTabs}
          >
            {DHIKR_DATA.map((cat) => {
              const isActive = selectedDhikrCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.dhikrCatChip,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    isActive && {
                      backgroundColor: Colors.primary,
                      borderColor: Colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDhikrCategory(cat.id);
                    setSelectedDhikr(0);
                    resetDhikr();
                  }}
                >
                  <Text style={styles.dhikrCatIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.dhikrCatLabel,
                      { color: isActive ? '#fff' : theme.text },
                    ]}
                  >
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Dhikr item selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dhikrTabs}
          >
            {dhikrItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dhikrChip,
                  { borderColor: theme.border, backgroundColor: theme.card },
                  safeDhikrIdx === idx && {
                    backgroundColor: Colors.primary,
                    borderColor: Colors.primary,
                  },
                ]}
                onPress={() => { setSelectedDhikr(idx); resetDhikr(); }}
              >
                <Text
                  style={[
                    styles.dhikrChipText,
                    { color: safeDhikrIdx === idx ? '#fff' : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.transliteration}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Counter display */}
          <View style={[styles.counterCard, { backgroundColor: theme.card, borderColor: GOLD + '40' }]}>
            <View style={styles.counterGoldBar} />
            <Text style={[styles.dhikrArabic, { color: theme.text }]}>
              {currentDhikr.arabic}
            </Text>
            <Text style={[styles.dhikrTranslit, { color: Colors.primary }]}>
              {currentDhikr.transliteration}
            </Text>
            <Text style={[styles.dhikrEnglish, { color: theme.textSecondary }]}>
              {currentDhikr.english}
            </Text>

            {/* Progress bar */}
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: Colors.primary },
                ]}
              />
            </View>
            <Text style={[styles.countDisplay, { color: theme.text }]}>
              {dhikrCount % (targetCount + 1)}{' '}
              <Text style={{ color: theme.textMuted, fontSize: 18 }}>/ {targetCount}</Text>
            </Text>

            {/* Benefit + Reference */}
            {currentDhikr.benefit ? (
              <Text style={[styles.dhikrBenefit, { color: theme.textSecondary }]}>
                ✨ {currentDhikr.benefit}
              </Text>
            ) : null}
            <View style={[styles.referenceContainer, { borderTopColor: theme.border, alignSelf: 'stretch' }]}>
              <Text style={[styles.referenceLabel, { color: theme.textMuted }]}>📖 Reference:</Text>
              <Text style={[styles.referenceText, { color: theme.textMuted }]}>
                {currentDhikr.reference}
              </Text>
            </View>
            <View style={{ alignSelf: 'stretch' }}>
              <CardActionsRow
                bookmark={{
                  type: 'dhikr',
                  id: `dhikr-${selectedDhikrCategory}-${safeDhikrIdx}`,
                  title: `${currentDhikrCategory.title} — ${currentDhikr.transliteration}`,
                  arabic: currentDhikr.arabic,
                  translation: currentDhikr.english,
                  reference: currentDhikr.reference,
                  category: currentDhikrCategory.title,
                }}
                shareable={{
                  arabic: currentDhikr.arabic,
                  translation: currentDhikr.english,
                  reference: currentDhikr.reference,
                  type: 'dhikr',
                }}
                iconColor={theme.textMuted}
              />
            </View>
          </View>

          {/* Tap button */}
          <TouchableOpacity
            style={styles.tapButton}
            onPress={handleDhikrTap}
            activeOpacity={0.75}
          >
            <Text style={styles.tapButtonText}>Tap to Count</Text>
            <Text style={styles.tapSubtext}>Total: {dhikrCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: theme.border }]}
            onPress={resetDhikr}
          >
            <Ionicons name="refresh" size={16} color={theme.textSecondary} />
            <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header tabs
  tabBar: { padding: 16, paddingTop: 14, alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  screenTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 3 },
  tabBtn: { paddingHorizontal: 24, paddingVertical: 7, borderRadius: 18 },
  tabBtnActive: { backgroundColor: '#fff' },
  tabBtnText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 14 },
  tabBtnTextActive: { color: Colors.primary },

  // Dua of the moment
  duaMomentCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    padding: 18,
  },
  duaMomentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  duaMomentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  duaMomentIcon: { fontSize: 14 },
  duaMomentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  duaMomentReason: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  duaMomentArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    textAlign: 'right',
    lineHeight: 38,
    color: '#fff',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  duaMomentEnglish: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Dua
  categories: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 13, fontWeight: '600' },
  catCount: { fontSize: 11, fontWeight: '700', marginLeft: 2 },
  duaList: { padding: 12, gap: 12, paddingBottom: 32 },
  duaCard: {
    borderRadius: 16,
    padding: 16,
    paddingLeft: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  duaGoldAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: GOLD,
  },
  duaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  duaNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  duaNum: { fontSize: 12, fontWeight: '700' },
  duaArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 42,
    writingDirection: 'rtl',
  },
  divider: { height: 1, marginVertical: 10 },
  duaTranslit: { fontSize: 14, fontStyle: 'italic', marginBottom: 6 },
  duaEnglish: { fontSize: 14, lineHeight: 22, marginBottom: 6 },

  // Reference row (subtle, muted)
  referenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  referenceLabel: { fontSize: 11, fontWeight: '600' },
  referenceText: { fontSize: 11, flexShrink: 1, lineHeight: 16 },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },

  // Dhikr
  dhikrContainer: { padding: 16, alignItems: 'center', gap: 16, paddingBottom: 32 },
  dhikrTabs: { gap: 8, paddingVertical: 4 },
  dhikrCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dhikrCatIcon: { fontSize: 14 },
  dhikrCatLabel: { fontSize: 13, fontWeight: '700' },
  dhikrChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 220,
  },
  dhikrChipText: { fontSize: 13, fontWeight: '600' },
  counterCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  counterGoldBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: GOLD,
  },
  dhikrArabic: { fontFamily: 'Amiri_400Regular', fontSize: 26, textAlign: 'center', lineHeight: 44 },
  dhikrTranslit: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  dhikrEnglish: { fontSize: 13, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },
  dhikrBenefit: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  progressBg: { width: '100%', height: 6, borderRadius: 3, marginTop: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  countDisplay: { fontSize: 42, fontWeight: '800' },
  tapButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    gap: 4,
  },
  tapButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  tapSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  resetText: { fontSize: 14 },
});
