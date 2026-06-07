import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { urduStyle } from '../../constants/fonts';
import {
  getBundledDuas,
  getCachedOrBundledDuas,
} from '../../services/content';
import type { NamazDuaLink } from '../../types/namaz';

export interface DuaLinkGridProps {
  links: NamazDuaLink[];
  theme: typeof Colors.dark;
}

/**
 * Category 5 — links into the existing Hisn al-Muslim duas. No content is
 * duplicated: each card deep-links to the Dua tab pre-filtered by the
 * stable category slug.
 */
export function DuaLinkGrid({ links, theme }: DuaLinkGridProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Count from the SAME source the Duas tab renders (cached-or-bundled), so
  // the card counts always match the list each link lands on.
  const [duaCategories, setDuaCategories] = useState(() => getBundledDuas());
  useEffect(() => {
    setDuaCategories(getCachedOrBundledDuas());
  }, []);

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of duaCategories) map.set(cat.id, cat.duas.length);
    return map;
  }, [duaCategories]);

  return (
    <View style={styles.grid}>
      {links.map((link) => {
        const count = countByCategory.get(link.duaCategoryId) ?? 0;
        return (
          <TouchableOpacity
            key={link.id}
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() =>
              router.push({
                pathname: '/dua',
                params: { category: link.duaCategoryId },
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.count, { color: Colors.primary }]}>
                {t('namaz.linkedDuas.count', { count })}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={theme.textMuted}
              />
            </View>
            <Text style={[styles.titleEn, { color: theme.text }]} numberOfLines={2}>
              {link.title_en}
            </Text>
            <Text style={[styles.titleUr, { color: theme.textSecondary }]} numberOfLines={1}>
              {link.title_ur}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  count: { fontSize: 11, fontWeight: '700' },
  titleEn: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  titleUr: { ...urduStyle(13), textAlign: 'left' },
});
