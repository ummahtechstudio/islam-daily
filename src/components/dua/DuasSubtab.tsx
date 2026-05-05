import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../../constants/colors';
import {
  getBundledDuas,
  getCachedOrBundledDuas,
} from '../../services/content';
import {
  getTranslationLanguage,
  type TranslationLanguage,
} from '../../utils/settings';
import CardActionsRow from '../../../components/CardActionsRow';
import type { Dua, DuaCategory } from '../../types/content';

const URDU_DISCLAIMER_KEY = 'urdu_disclaimer_dismissed';
const GOLD = '#EF9F27';

const DUA_CATEGORIES: { id: string; emoji: string; label: string }[] = [
  { id: 'waking',      emoji: '🌞', label: 'Waking' },
  { id: 'morning',     emoji: '🌅', label: 'Morning' },
  { id: 'evening',     emoji: '🌆', label: 'Evening' },
  { id: 'sleep',       emoji: '🌙', label: 'Sleep' },
  { id: 'prayer',      emoji: '🕌', label: 'Prayer' },
  { id: 'eating',      emoji: '🍴', label: 'Eating' },
  { id: 'travel',      emoji: '🛫', label: 'Travel' },
  { id: 'distress',    emoji: '🤲', label: 'Distress' },
  { id: 'forgiveness', emoji: '💚', label: 'Forgiveness' },
  { id: 'protection',  emoji: '🔰', label: 'Protection' },
  { id: 'sickness',    emoji: '🤒', label: 'Sickness' },
  { id: 'marriage',    emoji: '💍', label: 'Marriage' },
  { id: 'rizq',        emoji: '💰', label: 'Rizq' },
  { id: 'friday',      emoji: '📿', label: 'Friday' },
  { id: 'dua_parents', emoji: '👪', label: 'Parents' },
  { id: 'mosque',      emoji: '🕌', label: 'Mosque' },
  { id: 'knowledge',   emoji: '📚', label: 'Knowledge' },
  { id: 'rain',        emoji: '💧', label: 'Patience' },
];

const CATEGORY_ICONS: Record<string, string> = DUA_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.emoji }),
  {} as Record<string, string>,
);

function getDuaOfMoment(
  duas: DuaCategory[],
): { category: DuaCategory; dua: Dua; reason: string } | null {
  if (!duas.length) return null;
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

  const category = duas.find((c) => c.id === catId) ?? duas[0];
  const dua = category.duas[new Date().getDate() % category.duas.length];
  return dua ? { category, dua, reason } : null;
}

export interface DuasSubtabProps {
  theme: typeof Colors.dark;
}

export function DuasSubtab({ theme }: DuasSubtabProps) {
  const [hisnulMuslim, setHisnulMuslim] = useState<DuaCategory[]>(() => getBundledDuas());
  const [selectedCategory, setSelectedCategory] = useState(hisnulMuslim[0].id);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<TranslationLanguage>('urdu');
  const [disclaimerDismissed, setDisclaimerDismissed] = useState<boolean>(true);

  useEffect(() => {
    setHisnulMuslim(getCachedOrBundledDuas());
  }, []);

  useEffect(() => { setExpanded(null); }, [selectedCategory]);
  useEffect(() => { setExpanded(null); }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const lang = await getTranslationLanguage();
        if (active) setLanguage(lang);
        const dismissed = await AsyncStorage.getItem(URDU_DISCLAIMER_KEY);
        if (active) setDisclaimerDismissed(dismissed === '1');
      })();
      return () => { active = false; };
    }, []),
  );

  const dismissDisclaimer = async () => {
    setDisclaimerDismissed(true);
    await AsyncStorage.setItem(URDU_DISCLAIMER_KEY, '1');
  };

  const translationFor = (item: { english: string; urdu?: string }) =>
    language === 'urdu' && item.urdu ? item.urdu : item.english;

  const currentCategory = hisnulMuslim.find((c) => c.id === selectedCategory);
  const baseDuas = currentCategory?.duas ?? [];
  const filteredDuas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseDuas;
    return baseDuas.filter((d) =>
      (d.english || '').toLowerCase().includes(q) ||
      (d.urdu || '').toLowerCase().includes(q) ||
      (d.transliteration || '').toLowerCase().includes(q) ||
      (d.reference || '').toLowerCase().includes(q),
    );
  }, [baseDuas, searchQuery]);

  const duaOfMoment = getDuaOfMoment(hisnulMuslim);

  return (
    <View style={{ flex: 1 }}>
      {language === 'urdu' && !disclaimerDismissed && (
        <View style={[styles.disclaimerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
              ℹ️ Urdu translations are based on authentic Islamic sources. For verification, please refer to printed Hisn al-Muslim Urdu edition.
            </Text>
            <Text style={[styles.disclaimerTextUrdu, { color: theme.textMuted }]}>
              ℹ️ اردو تراجم مستند اسلامی ذرائع پر مبنی ہیں۔ تصدیق کے لیے براہ کرم حصن المسلم کی اردو طبع شدہ کتاب سے رجوع کریں۔
            </Text>
          </View>
          <TouchableOpacity onPress={dismissDisclaimer} hitSlop={8}>
            <Ionicons name="close" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

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
          <Text style={styles.duaMomentArabic} textBreakStrategy="simple">
            {duaOfMoment.dua.arabic}
          </Text>
          <Text
            style={
              language === 'urdu' && duaOfMoment.dua.urdu
                ? [styles.duaMomentEnglish, styles.duaMomentUrdu]
                : styles.duaMomentEnglish
            }
          >
            {translationFor(duaOfMoment.dua)}
          </Text>
        </View>
      )}

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categories}
      >
        {DUA_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const exists = hisnulMuslim.some((c) => c.id === cat.id);
          if (!exists) return null;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catPill,
                isActive ? styles.catPillActive : styles.catPillInactive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.catPillEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.catPillLabel,
                  { color: isActive ? '#FFFFFF' : Colors.primary },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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

              {dua.description_ur ? (
                <Text
                  style={[styles.duaDescription, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {dua.description_ur}
                </Text>
              ) : null}

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
                  {language === 'urdu' && dua.urdu ? (
                    <Text style={[styles.duaEnglish, styles.urduText, { color: theme.textSecondary }]}>
                      {dua.urdu}
                    </Text>
                  ) : (
                    <Text style={[styles.duaEnglish, { color: theme.textSecondary }]}>
                      {dua.english || 'Translation not available'}
                    </Text>
                  )}
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
                      translation: translationFor(dua),
                      reference: dua.reference || 'Hisn al-Muslim',
                      category: currentCategory?.title,
                    }}
                    shareable={{
                      arabic: dua.arabic,
                      translation: translationFor(dua),
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
  );
}

const styles = StyleSheet.create({
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

  categoriesScroll: { minHeight: 90, maxHeight: 90 },
  categories: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  catPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  catPillInactive: {
    backgroundColor: 'rgba(15,110,86,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(15,110,86,0.3)',
  },
  catPillActive: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  catPillEmoji: { fontSize: 24, marginBottom: 4, textAlign: 'center' },
  catPillLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
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
  duaDescription: {
    fontSize: 13,
    lineHeight: 24,
    marginBottom: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
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
  urduText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 16,
    lineHeight: 28,
    fontStyle: 'normal',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },
  duaMomentUrdu: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 14,
    lineHeight: 26,
    fontStyle: 'normal',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  disclaimerText: { fontSize: 12, lineHeight: 18 },
  disclaimerTextUrdu: {
    fontSize: 12,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },

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
});
