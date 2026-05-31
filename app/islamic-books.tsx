import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import {
  BOOKS,
  Book,
  BookLanguage,
  openBook,
} from '../src/services/books';
import { FEATURES } from '../src/constants/featureFlags';

const TABS: { key: BookLanguage; label: string; icon: string }[] = [
  { key: 'arabic',  label: 'Arabic',  icon: 'text' },
  { key: 'urdu',    label: 'Urdu',    icon: 'language' },
  { key: 'english', label: 'English', icon: 'globe-outline' },
];

const LANGUAGE_COLORS: Record<BookLanguage, string> = {
  arabic:  '#22C55E',
  urdu:    '#0F6E56',
  english: '#3B82F6',
};

const LANGUAGE_LABELS: Record<BookLanguage, string> = {
  arabic:  'Arabic',
  urdu:    'Urdu',
  english: 'English',
};

const CATEGORY_COLORS: Record<string, string> = {
  Hadith:    '#22C55E',
  Fiqh:      '#3B82F6',
  Aqeedah:   '#8B5CF6',
  Seerah:    '#F59E0B',
  Tasawwuf:  '#0F6E56',
  Dua:       '#EF4444',
  Tafseer:   '#10B981',
  General:   '#6366F1',
  History:   '#78716C',
  Women:     '#EC4899',
  Kids:      '#F97316',
};

function IslamicBooksScreenInner() {
  useEffect(() => { trackScreen('IslamicBooks'); }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<BookLanguage>('english');

  const books = BOOKS.filter((b) => b.language === activeTab);

  const handlePress = (book: Book) => {
    if (book.available) openBook(book);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>{t('islamicBooks.header.title')}</Text>
        <Text style={styles.headerSub}>{t('islamicBooks.header.sub')}</Text>
      </View>

      <View style={[styles.tabRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={15}
                color={active ? Colors.primary : theme.textMuted}
              />
              <Text style={[styles.tabLabel, { color: active ? Colors.primary : theme.textMuted }]}>
                {t(`islamicBooks.tabs.${tab.key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {books.map((book, idx) => {
          const catColor = CATEGORY_COLORS[book.category] ?? Colors.primary;
          const isAvailable = !!book.available;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={isAvailable ? 0.7 : 1}
              onPress={() => handlePress(book)}
              style={[styles.bookCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.bookTop}>
                <View style={[styles.bookIcon, { backgroundColor: book.color + '18' }]}>
                  <Text style={{ fontSize: 26 }}>{book.icon}</Text>
                </View>
                <View style={styles.bookInfo}>
                  <Text style={[styles.bookTitle, { color: theme.text }]}>{book.title}</Text>
                  {book.titleAr && (
                    <Text style={[styles.bookTitleAr, { color: theme.textSecondary }]}>{book.titleAr}</Text>
                  )}
                  <Text style={[styles.bookAuthor, { color: Colors.primary }]}>{book.author}</Text>
                  <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
                      <Text style={[styles.badgeText, { color: catColor }]}>{book.category}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: LANGUAGE_COLORS[book.language] + '20', borderColor: LANGUAGE_COLORS[book.language] + '40' }]}>
                      <Text style={[styles.badgeText, { color: LANGUAGE_COLORS[book.language] }]}>{t(`islamicBooks.badges.languages.${book.language}`)}</Text>
                    </View>
                    {isAvailable ? (
                      <View style={[styles.badge, { backgroundColor: Colors.success + '20', borderColor: Colors.success + '40' }]}>
                        <Text style={[styles.badgeText, { color: Colors.success }]}>{t('islamicBooks.badges.available')}</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }]}>
                        <Text style={[styles.badgeText, { color: '#F59E0B' }]}>{t('common.comingSoon')}</Text>
                      </View>
                    )}
                    <Text style={[styles.sizeText, { color: theme.textMuted }]}>{book.sizeEst}</Text>
                  </View>
                </View>
              </View>

              {!isAvailable && (
                <View style={[styles.comingSoonRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.comingSoonText, { color: theme.textMuted }]}>
                    {t('islamicBooks.comingSoonText')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          {t('islamicBooks.footer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Hidden in v1 — every book entry is "Coming Soon". The screen still exists
// (will be re-enabled in v1.1) but a pasted URL or stale deep link redirects
// to Home rather than landing on an empty list.
export default function IslamicBooksScreen() {
  if (!FEATURES.islamicBooks) {
    return <Redirect href={'/' as any} />;
  }
  return <IslamicBooksScreenInner />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  bookCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  bookTop: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  bookIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: { flex: 1, gap: 2 },
  bookTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  bookTitleAr: { fontSize: 14, lineHeight: 22 },
  bookAuthor: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sizeText: { fontSize: 11 },

  comingSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  comingSoonText: { flex: 1, fontSize: 12, lineHeight: 18 },

  footer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
