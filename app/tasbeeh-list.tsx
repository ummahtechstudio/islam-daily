import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import {
  getCounters,
  setSelectedCounterId,
  deleteCounter,
  loadDhikrTemplates,
  createCounterFromTemplate,
} from '../src/utils/tasbeeh';
import type { TasbeehCounter, TasbeehTemplate } from '../src/types/tasbeeh';

const GOLD = '#EF9F27';

type Row =
  | { kind: 'counter'; data: TasbeehCounter }
  | { kind: 'template'; data: TasbeehTemplate };

export default function TasbeehListScreen() {
  useEffect(() => { trackScreen('TasbeehList'); }, []);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const appSettings = useStore((s) => s.settings);
  const isDark =
    appSettings.colorScheme === 'dark' ||
    (appSettings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [counters, setCounters] = useState<TasbeehCounter[]>([]);
  const templates = useMemo(() => loadDhikrTemplates(), []);

  const reload = useCallback(async () => {
    const c = await getCounters();
    setCounters(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const sections = useMemo(
    () => [
      {
        title: 'My Counters',
        data: counters.map<Row>((c) => ({ kind: 'counter', data: c })),
      },
      {
        title: `Templates from Dhikr (${templates.length})`,
        data: templates.map<Row>((t) => ({ kind: 'template', data: t })),
      },
    ],
    [counters, templates],
  );

  const handleSelect = useCallback(async (id: string) => {
    await setSelectedCounterId(id);
    router.back();
  }, [router]);

  const handleDelete = useCallback((counter: TasbeehCounter) => {
    if (counter.isDefault) return;
    Alert.alert(
      'Delete counter?',
      `This will permanently remove "${counter.name}" and its progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCounter(counter.id);
            await reload();
          },
        },
      ],
    );
  }, [reload]);

  const handleUseTemplate = useCallback(async (tpl: TasbeehTemplate) => {
    const created = await createCounterFromTemplate(tpl);
    await setSelectedCounterId(created.id);
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={[styles.topBar, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Counters</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/tasbeeh-edit' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: Colors.primary }]}>
              {section.title.toUpperCase()}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          if (item.kind === 'counter') {
            return (
              <CounterCard
                counter={item.data}
                theme={theme}
                onSelect={() => handleSelect(item.data.id)}
                onEdit={
                  item.data.isDefault
                    ? undefined
                    : () => router.push({ pathname: '/tasbeeh-edit', params: { id: item.data.id } } as any)
                }
                onDelete={
                  item.data.isDefault
                    ? undefined
                    : () => handleDelete(item.data)
                }
              />
            );
          }
          return (
            <TemplateCard
              template={item.data}
              theme={theme}
              onUse={() => handleUseTemplate(item.data)}
            />
          );
        }}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

function CounterCard({
  counter,
  theme,
  onSelect,
  onEdit,
  onDelete,
}: {
  counter: TasbeehCounter;
  theme: typeof Colors.dark;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <View style={styles.cardLeft}>
        <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
          {counter.name}
        </Text>
        <Text style={styles.cardArabic} numberOfLines={1}>{counter.arabic}</Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: theme.textSecondary }]}>
            {counter.currentCount}/{counter.target}
          </Text>
          <Text style={[styles.cardMetaDot, { color: theme.textMuted }]}>•</Text>
          <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
            Round {counter.rounds}
          </Text>
          <Text style={[styles.cardMetaDot, { color: theme.textMuted }]}>•</Text>
          <Text style={[styles.cardMetaText, { color: GOLD }]}>
            Total {counter.totalCount.toLocaleString()}
          </Text>
        </View>
        {counter.source ? (
          <Text style={[styles.cardSource, { color: theme.textMuted }]} numberOfLines={1}>
            {counter.source}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardActions}>
        {onEdit ? (
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={styles.cardIconBtn}>
            <Ionicons name="pencil" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
        {onDelete ? (
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.cardIconBtn}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function TemplateCard({
  template,
  theme,
  onUse,
}: {
  template: TasbeehTemplate;
  theme: typeof Colors.dark;
  onUse: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardArabic} numberOfLines={1}>{template.arabic}</Text>
        <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
          {template.name}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: theme.textSecondary }]}>
            Target: {template.target}
          </Text>
          {template.category ? (
            <>
              <Text style={[styles.cardMetaDot, { color: theme.textMuted }]}>•</Text>
              <Text style={[styles.cardMetaText, { color: theme.textMuted }]} numberOfLines={1}>
                {template.category}
              </Text>
            </>
          ) : null}
        </View>
        {template.source ? (
          <Text style={[styles.cardSource, { color: theme.textMuted }]} numberOfLines={1}>
            {template.source}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.useBtn, { backgroundColor: Colors.primary }]}
        onPress={onUse}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={14} color="#fff" />
        <Text style={styles.useBtnText}>Use</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  newBtnText: { color: Colors.primary, fontWeight: '800', fontSize: 13 },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardLeft: { flex: 1, gap: 4 },
  cardName: { fontSize: 14, fontWeight: '700' },
  cardArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 20,
    color: Colors.primary,
    lineHeight: 30,
    writingDirection: 'rtl',
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardMetaText: { fontSize: 11, fontWeight: '600' },
  cardMetaDot: { fontSize: 11 },
  cardSource: { fontSize: 10, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconBtn: { padding: 4 },

  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  useBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
