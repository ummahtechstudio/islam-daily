import React, { useEffect } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../src/constants/colors';
import { spacing, radius } from '../../src/constants/spacing';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { NamazBrandingHeader } from '../../src/components/namaz/NamazBrandingHeader';

const CONTACT_EMAIL = 'ummahtech.studio@gmail.com';

export default function NamazAboutScreen() {
  useEffect(() => { trackScreen('Namaz:about'); }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['bottom']}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <NamazBrandingHeader title={t('namaz.about.title')} />

        <View style={styles.content}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.compiledBy, { color: theme.text }]}>
              {t('namaz.about.compiledBy')}
            </Text>
            <TouchableOpacity
              style={styles.emailRow}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={16} color={Colors.primary} />
              <Text style={[styles.email, { color: Colors.primary }]}>
                {CONTACT_EMAIL}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('namaz.about.methodologyTitle')}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {t('namaz.about.methodology')}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('namaz.about.sourcesTitle')}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {t('namaz.about.sources')}
            </Text>
          </View>

          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            {t('namaz.about.disclaimer')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },

  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  compiledBy: { fontSize: 15, fontWeight: '700' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  email: { fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 20 },

  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
});
