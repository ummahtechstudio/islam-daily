import React, { useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../src/constants/colors';
import { spacing, radius } from '../../src/constants/spacing';
import { useStore } from '../../src/store';
import { trackScreen } from '../../src/services/analytics';
import { getHowToPraySequence } from '../../src/services/namazContent';
import { useQuranAudio } from '../../src/context/QuranAudioContext';
import { StepCard } from '../../src/components/namaz/StepCard';

export default function HowToPrayScreen() {
  useEffect(() => { trackScreen('Namaz:walkthrough'); }, []);
  const { t } = useTranslation();
  const router = useRouter();
  const { step: stepParam } = useLocalSearchParams<{ step?: string }>();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const sequence = getHowToPraySequence();
  const total = sequence?.steps.length ?? 0;

  // Single route with internal step state (not one stack push per step) so
  // the Android back button exits the walkthrough in one press.
  const initialStep = Math.min(
    Math.max(parseInt(stepParam ?? '0', 10) || 0, 0),
    Math.max(total - 1, 0),
  );
  const [stepIndex, setStepIndex] = useState(initialStep);
  const scrollRef = useRef<ScrollView>(null);

  const { stop: stopAudio } = useQuranAudio();
  // Stop any recitation audio when the step changes or the screen unmounts.
  useEffect(() => {
    return () => {
      void stopAudio();
    };
  }, [stepIndex, stopAudio]);

  if (!sequence || total === 0) return null;
  const step = sequence.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const goTo = (next: number) => {
    setStepIndex(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['bottom']}
    >
      {/* Progress */}
      <View style={styles.progressWrap}>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {t('namaz.step.progress', { current: stepIndex + 1, total })}
        </Text>
        <View style={styles.progressBar}>
          {sequence.steps.map((s, idx) => (
            <View
              key={s.id}
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    idx <= stepIndex ? Colors.primary : theme.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StepCard step={step} order={stepIndex + 1} />
      </ScrollView>

      {/* Prev / Next pinned at the bottom */}
      <View style={[styles.navRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.navBtn,
            styles.navBtnSecondary,
            { borderColor: theme.border, opacity: isFirst ? 0.4 : 1 },
          ]}
          onPress={() => !isFirst && goTo(stepIndex - 1)}
          disabled={isFirst}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={16} color={theme.text} />
          <Text style={[styles.navBtnTextSecondary, { color: theme.text }]}>
            {t('namaz.step.prev')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnPrimary]}
          onPress={() => (isLast ? router.back() : goTo(stepIndex + 1))}
          activeOpacity={0.8}
        >
          <Text style={styles.navBtnTextPrimary}>
            {isLast ? t('namaz.step.finish') : t('namaz.step.next')}
          </Text>
          {!isLast && <Ionicons name="chevron-forward" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  progressWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  progressText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  progressBar: { flexDirection: 'row', gap: 3 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },

  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },

  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  navBtnSecondary: { borderWidth: 1 },
  navBtnPrimary: { backgroundColor: Colors.primary },
  navBtnTextSecondary: { fontSize: 14, fontWeight: '700' },
  navBtnTextPrimary: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
