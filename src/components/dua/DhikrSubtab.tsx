import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import {
  getBundledDhikr,
  getCachedOrBundledDhikr,
} from '../../services/content';
import { createCounterFromTemplate } from '../../utils/tasbeeh';
import { getTranslationLanguage, type TranslationLanguage } from '../../utils/settings';
import type { DhikrCategory, DhikrItem } from '../../types/content';
import type { TasbeehTemplate } from '../../types/tasbeeh';

const GOLD = '#EF9F27';

interface FlatDhikrEntry {
  key: string;
  categoryId: string;
  categoryTitle: string;
  index: number;
  item: DhikrItem;
}

function flatten(categories: DhikrCategory[]): FlatDhikrEntry[] {
  const out: FlatDhikrEntry[] = [];
  for (const cat of categories) {
    for (let i = 0; i < cat.items.length; i++) {
      out.push({
        key: `${cat.id}-${i}`,
        categoryId: cat.id,
        categoryTitle: cat.title,
        index: i,
        item: cat.items[i],
      });
    }
  }
  return out;
}

export interface DhikrSubtabProps {
  theme: typeof Colors.dark;
  /** Called when the user taps "Count this with Tasbeeh →".
   *  Parent should switch to the Tasbeeh sub-tab and pass the new counter ID. */
  onCountWithTasbeeh: (counterId: string) => void;
}

export function DhikrSubtab({ theme, onCountWithTasbeeh }: DhikrSubtabProps) {
  const { t } = useTranslation();
  // SSR-safe: bundled-only on first render, upgrade in useEffect.
  const [data, setData] = useState<DhikrCategory[]>(() => getBundledDhikr());
  const [language, setLanguage] = useState<TranslationLanguage>('urdu');

  useEffect(() => {
    setData(getCachedOrBundledDhikr());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const lang = await getTranslationLanguage();
        if (active) setLanguage(lang);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const entries = useMemo(() => flatten(data), [data]);

  const handleCount = useCallback(
    async (entry: FlatDhikrEntry) => {
      const tpl: TasbeehTemplate = {
        id: `tpl-${entry.categoryId}-${entry.index}`,
        name: entry.item.transliteration,
        arabic: entry.item.arabic,
        target: entry.item.count > 0 ? entry.item.count : 33,
        source: entry.item.reference,
        category: entry.categoryTitle,
      };
      const created = await createCounterFromTemplate(tpl);
      onCountWithTasbeeh(created.id);
    },
    [onCountWithTasbeeh],
  );

  if (entries.length < 5) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📿</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {t('dhikr.loading.title')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
          {t('dhikr.loading.subtitle')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.key}
      contentContainerStyle={styles.list}
      renderItem={({ item: entry }) => (
        <DhikrCard
          entry={entry}
          theme={theme}
          language={language}
          onCount={() => handleCount(entry)}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

function DhikrCard({
  entry,
  theme,
  language,
  onCount,
}: {
  entry: FlatDhikrEntry;
  theme: typeof Colors.dark;
  language: TranslationLanguage;
  onCount: () => void;
}) {
  const { t } = useTranslation();
  const { item } = entry;
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.goldAccent} />

      <View style={styles.cardHeader}>
        <View style={[styles.catBadge, { backgroundColor: Colors.primary + '18' }]}>
          <Text style={[styles.catBadgeText, { color: Colors.primary }]}>
            {entry.categoryTitle}
          </Text>
        </View>
        {item.count > 0 ? (
          <View style={[styles.targetBadge, { backgroundColor: GOLD + '22' }]}>
            <Text style={[styles.targetBadgeText, { color: GOLD }]}>
              × {item.count}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.arabic, { color: theme.text }]} textBreakStrategy="simple">
        {item.arabic}
      </Text>

      <Text style={[styles.translit, { color: Colors.primary }]}>
        {item.transliteration}
      </Text>

      <Text style={[styles.english, { color: theme.textSecondary }]}>
        {item.english}
      </Text>

      {language === 'urdu' && item.urdu ? (
        <Text style={[styles.urdu, { color: theme.textSecondary }]}>
          {item.urdu}
        </Text>
      ) : null}

      {item.benefit ? (
        <View style={[styles.benefitRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
            ✨ {item.benefit}
          </Text>
        </View>
      ) : null}

      <View style={[styles.referenceRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.referenceLabel, { color: theme.textMuted }]}>📖 </Text>
        <Text style={[styles.referenceText, { color: GOLD }]}>
          {item.reference}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.countBtn, { borderColor: Colors.primary }]}
        onPress={onCount}
        activeOpacity={0.8}
      >
        <Ionicons name="repeat" size={14} color={Colors.primary} />
        <Text style={[styles.countBtnText, { color: Colors.primary }]}>
          {t('dhikr.countWithTasbeeh')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 12, paddingBottom: 32 },

  card: {
    borderRadius: 16,
    padding: 16,
    paddingLeft: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    gap: 8,
  },
  goldAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: GOLD,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  targetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  targetBadgeText: { fontSize: 11, fontWeight: '800' },

  arabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 42,
    writingDirection: 'rtl',
  },
  translit: { fontSize: 14, fontStyle: 'italic', fontWeight: '600' },
  english: { fontSize: 14, lineHeight: 22 },
  urdu: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 16,
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu' : undefined,
  },

  benefitRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  benefitText: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  referenceLabel: { fontSize: 11 },
  referenceText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },

  countBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 4,
  },
  countBtnText: { fontSize: 13, fontWeight: '700' },

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
