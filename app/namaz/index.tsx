import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../src/constants/colors';
import { spacing, radius } from '../../src/constants/spacing';
import { urduStyle } from '../../src/constants/fonts';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { getNamazCategories } from '../../src/services/namazContent';
import { NamazBrandingHeader } from '../../src/components/namaz/NamazBrandingHeader';

export default function NamazHomeScreen() {
  useEffect(() => { trackScreen('Namaz'); }, []);
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const categories = getNamazCategories();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['bottom']}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <NamazBrandingHeader />

        <View style={styles.list}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => router.push(`/namaz/${cat.id}`)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>
                <Text style={styles.icon}>{cat.icon}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.titleEn, { color: theme.text }]}>
                  {cat.title_en}
                </Text>
                <Text style={[styles.titleUr, { color: theme.textSecondary }]}>
                  {cat.title_ur}
                </Text>
                <Text style={[styles.count, { color: theme.textMuted }]}>
                  {t('namaz.categoryCount', { count: cat.items.length })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => router.push('/namaz/about')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={theme.textMuted}
            />
            <Text style={[styles.aboutText, { color: theme.textMuted }]}>
              {t('namaz.about.link')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  cardText: { flex: 1 },
  titleEn: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  titleUr: { ...urduStyle(14), textAlign: 'left' },
  count: { fontSize: 12, marginTop: 2 },

  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  aboutText: { fontSize: 13, fontWeight: '600' },
});
