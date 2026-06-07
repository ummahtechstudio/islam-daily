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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, palette } from '../../src/constants/colors';
import { spacing, radius } from '../../src/constants/spacing';
import { urduStyle } from '../../src/constants/fonts';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { getNamazCategory, getNamazEntry } from '../../src/services/namazContent';
import { useTranslationLanguage } from '../../src/hooks/useTranslationLanguage';
import { RecitationCard } from '../../src/components/namaz/RecitationCard';
import { StepCard } from '../../src/components/namaz/StepCard';
import { ChecklistCard } from '../../src/components/namaz/ChecklistCard';
import { ReferenceTable } from '../../src/components/namaz/ReferenceTable';
import { DuaLinkGrid } from '../../src/components/namaz/DuaLinkGrid';
import type { NamazDuaLink, NamazSequence } from '../../src/types/namaz';

function SequenceSection({
  sequence,
  theme,
}: {
  sequence: NamazSequence;
  theme: typeof Colors.dark;
}) {
  const language = useTranslationLanguage();
  const intro =
    language === 'urdu' && sequence.intro_ur
      ? sequence.intro_ur
      : sequence.intro_en;
  const introIsUrdu = language === 'urdu' && !!sequence.intro_ur;

  return (
    <View style={styles.sequence}>
      <Text style={styles.sequenceTitleEn}>{sequence.title_en}</Text>
      <Text style={[styles.sequenceTitleUr, { color: theme.textSecondary }]}>
        {sequence.title_ur}
      </Text>
      {intro ? (
        <Text
          style={[
            introIsUrdu ? styles.sequenceIntroUr : styles.sequenceIntro,
            { color: theme.textMuted },
          ]}
        >
          {intro}
        </Text>
      ) : null}
      <View style={styles.steps}>
        {sequence.steps.map((step, idx) => (
          <StepCard key={step.id} step={step} order={idx + 1} />
        ))}
      </View>
    </View>
  );
}

export default function NamazCategoryScreen() {
  const { category: categoryId } = useLocalSearchParams<{ category: string }>();
  useEffect(() => { trackScreen(`Namaz:${categoryId}`); }, [categoryId]);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const category = categoryId ? getNamazCategory(categoryId) : undefined;
  const isHowToPray = category?.id === 'how_to_pray';
  const walkthrough = isHowToPray
    ? category?.items.find((i): i is NamazSequence => i.kind === 'sequence')
    : undefined;
  const duaLinks =
    category?.items.filter((i): i is NamazDuaLink => i.kind === 'dua_link') ??
    [];

  const headerTitle = category
    ? i18n.language === 'ur'
      ? category.title_ur
      : category.title_en
    : '';

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: headerTitle }} />
      {!category ? null : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {isHowToPray && walkthrough ? (
            <>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => router.push('/namaz/how-to-pray')}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.startBtnText}>
                  {t('namaz.startWalkthrough')}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.stepsHeading, { color: theme.text }]}>
                {t('namaz.steps')}
              </Text>
              <View
                style={[
                  styles.stepIndex,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                {walkthrough.steps.map((step, idx) => (
                  <TouchableOpacity
                    key={step.id}
                    style={[
                      styles.stepIndexRow,
                      idx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.border,
                      },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/namaz/how-to-pray',
                        params: { step: String(idx) },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.stepIndexNum, { color: Colors.primary }]}>
                      {idx + 1}
                    </Text>
                    <View style={styles.stepIndexText}>
                      <Text style={[styles.stepIndexTitle, { color: theme.text }]}>
                        {step.title_en}
                      </Text>
                      <Text
                        style={[styles.stepIndexTitleUr, { color: theme.textMuted }]}
                        numberOfLines={1}
                      >
                        {step.title_ur}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            category.items.map((item, idx) => {
              switch (item.kind) {
                case 'entry': {
                  const entry = getNamazEntry(item.entryId);
                  return entry ? <RecitationCard key={idx} entry={entry} /> : null;
                }
                case 'sequence':
                  return (
                    <SequenceSection key={item.id} sequence={item} theme={theme} />
                  );
                case 'checklist':
                  return <ChecklistCard key={item.id} checklist={item} />;
                case 'table':
                  return <ReferenceTable key={item.id} table={item} />;
                case 'dua_link':
                  return null; // rendered once as a grid below
                default:
                  return null;
              }
            })
          )}

          {duaLinks.length > 0 ? (
            <>
              <Text style={[styles.linkedHint, { color: theme.textMuted }]}>
                {t('namaz.linkedDuas.hint')}
              </Text>
              <DuaLinkGrid links={duaLinks} theme={theme} />
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  stepsHeading: { fontSize: 14, fontWeight: '700', marginTop: spacing.sm },
  stepIndex: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  stepIndexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  stepIndexNum: { width: 22, fontSize: 13, fontWeight: '700' },
  stepIndexText: { flex: 1 },
  stepIndexTitle: { fontSize: 14, fontWeight: '600' },
  stepIndexTitleUr: { ...urduStyle(12), textAlign: 'left' },

  sequence: { gap: spacing.sm },
  sequenceTitleEn: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.gold,
    marginTop: spacing.sm,
  },
  sequenceTitleUr: { ...urduStyle(15), textAlign: 'left' },
  sequenceIntro: { fontSize: 13, lineHeight: 20 },
  sequenceIntroUr: { ...urduStyle(14) },
  steps: { gap: spacing.md, marginTop: spacing.xs },

  linkedHint: { fontSize: 12, marginTop: spacing.xs },
});
