import React, { useEffect } from 'react';
import {
  Linking,
  Platform,
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

import { Colors } from '../src/constants/colors';
import { spacing, radius } from '../src/constants/spacing';
import { urduStyle } from '../src/constants/fonts';
import { CREDIT_SECTIONS, type CreditEntry } from '../src/constants/credits';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';

const GOLD = '#EF9F27';

/**
 * Sources & Credits — every third-party data source, service, font and
 * library, with license and link. Proper nouns / licenses come from
 * constants/credits.ts (never translated); descriptions are i18n.
 */
export default function CreditsScreen() {
  useEffect(() => { trackScreen('Credits'); }, []);
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;
  const isUrdu = !!i18n.language?.startsWith('ur');
  const bodyStyle = isUrdu ? urduStyle(14) : undefined;

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, bodyStyle, { color: theme.textSecondary }]}>{t('credits.intro')}</Text>

        {/* Privacy statement — wording verified against the shipped code: no
            ad / analytics / tracking SDKs exist; the only outbound data is the
            Aladhan Qibla cross-check, the opt-in first-party session log
            (locationAnalytics.ts, sends coordinates) and user-sent feedback. */}
        <View style={[styles.privacyCard, { backgroundColor: Colors.primary + '14', borderColor: Colors.primary + '40' }]}>
          <View style={styles.privacyHeader}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
            <Text style={[styles.privacyTitle, isUrdu && urduStyle(15), { color: theme.text }]}>
              {t('credits.privacy.title')}
            </Text>
          </View>
          <Text style={[styles.privacyBody, bodyStyle, { color: theme.textSecondary }]}>
            {t('credits.privacy.body')}
          </Text>
        </View>

        {CREDIT_SECTIONS.map((section) => (
          <View key={section.id} style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, isUrdu && urduStyle(16), { color: Colors.primary }]}>
              {t(`credits.sections.${section.titleKey}`)}
            </Text>
            {section.entries.map((entry, i) => (
              <EntryRow
                key={`${section.id}-${i}`}
                entry={entry}
                theme={theme}
                bodyStyle={bodyStyle}
                onOpen={open}
              />
            ))}
            {section.verbatimNotice ? (
              <View style={[styles.noticeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.noticeText, { color: theme.textSecondary }]}>{section.verbatimNotice}</Text>
              </View>
            ) : null}
          </View>
        ))}

        <Text style={[styles.footer, bodyStyle, styles.footerAlign, { color: theme.textMuted }]}>{t('credits.footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function EntryRow({
  entry,
  theme,
  bodyStyle,
  onOpen,
}: {
  entry: CreditEntry;
  theme: typeof Colors.dark;
  bodyStyle: object | undefined;
  onOpen: (url: string) => void;
}) {
  const { t } = useTranslation();
  const Wrapper: React.ElementType = entry.url ? TouchableOpacity : View;
  const wrapperProps = entry.url
    ? { onPress: () => onOpen(entry.url as string), activeOpacity: 0.7, accessibilityRole: 'link' as const }
    : {};
  return (
    <Wrapper style={[styles.entry, { borderTopColor: theme.border }]} {...wrapperProps}>
      <View style={styles.entryBody}>
        <Text style={[styles.entryName, { color: theme.text }]}>{entry.name}</Text>
        {entry.descKey ? (
          <Text style={[styles.entryDesc, bodyStyle, { color: theme.textSecondary }]}>
            {t(`credits.entries.${entry.descKey}`)}
          </Text>
        ) : null}
        {entry.license ? (
          <Text style={[styles.entryLicense, { color: GOLD }]}>{entry.license}</Text>
        ) : null}
      </View>
      {entry.url ? <Ionicons name="open-outline" size={16} color={theme.textMuted} /> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] },
  intro: { fontSize: 14, lineHeight: 21 },

  privacyCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  privacyTitle: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  privacyBody: { fontSize: 13, lineHeight: 20 },

  section: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: spacing.xs },

  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryBody: { flex: 1, gap: 2 },
  entryName: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  entryDesc: { fontSize: 12, lineHeight: 18 },
  entryLicense: { fontSize: 11, fontWeight: '700' },

  noticeBox: { borderRadius: radius.sm, borderWidth: 1, padding: spacing.md, marginTop: spacing.xs },
  noticeText: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },

  footer: { fontSize: 12, lineHeight: 18, paddingHorizontal: spacing.md },
  // Listed after urduStyle so the footer stays centred in Urdu too.
  footerAlign: { textAlign: 'center' },
});
