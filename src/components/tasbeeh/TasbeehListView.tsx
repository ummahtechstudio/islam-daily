import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import {
  getCounters,
  setSelectedCounterId,
  deleteCounter,
  loadDhikrTemplates,
  createCounterFromTemplate,
} from '../../utils/tasbeeh';
import type { TasbeehCounter, TasbeehTemplate } from '../../types/tasbeeh';

const GOLD = '#EF9F27';

type Row =
  | { kind: 'counter'; data: TasbeehCounter }
  | { kind: 'template'; data: TasbeehTemplate };

export interface TasbeehListViewProps {
  theme: typeof Colors.dark;
  /** Optional back chevron handler. */
  onBack?: () => void;
  /** Called when the user picks a counter to use. */
  onSelectCounter: (id: string) => void;
  /** Called when the user taps "+ New". */
  onNewCounter: () => void;
  /** Called when the user taps Edit on a counter. */
  onEditCounter: (id: string) => void;
}

export function TasbeehListView({
  theme,
  onBack,
  onSelectCounter,
  onNewCounter,
  onEditCounter,
}: TasbeehListViewProps) {
  const { t } = useTranslation();
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
        title: t('tasbeeh.list.sections.myCounters'),
        data: counters.map<Row>((c) => ({ kind: 'counter', data: c })),
      },
      {
        title: t('tasbeeh.list.sections.templates', { count: templates.length }),
        data: templates.map<Row>((tpl) => ({ kind: 'template', data: tpl })),
      },
    ],
    [counters, templates, t],
  );

  const handleSelect = useCallback(
    async (id: string) => {
      await setSelectedCounterId(id);
      onSelectCounter(id);
    },
    [onSelectCounter],
  );

  const handleDelete = useCallback(
    (counter: TasbeehCounter) => {
      if (counter.isDefault) return;
      Alert.alert(
        t('tasbeeh.edit.alerts.deleteCounter.title'),
        t('tasbeeh.edit.alerts.deleteCounter.message', { name: counter.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              await deleteCounter(counter.id);
              await reload();
            },
          },
        ],
      );
    },
    [reload, t],
  );

  const handleUseTemplate = useCallback(
    async (tpl: TasbeehTemplate) => {
      const created = await createCounterFromTemplate(tpl);
      await setSelectedCounterId(created.id);
      onSelectCounter(created.id);
    },
    [onSelectCounter],
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { backgroundColor: Colors.primary }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.topTitle}>{t('tasbeeh.list.title')}</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={onNewCounter}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={styles.newBtnText}>{t('tasbeeh.list.newBtn')}</Text>
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
        ListEmptyComponent={
          counters.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t('tasbeeh.list.empty.title')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                {t('tasbeeh.list.empty.subtitle')}
              </Text>
            </View>
          ) : null
        }
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
                    : () => onEditCounter(item.data.id)
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
    </View>
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
  const { t } = useTranslation();
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
            {t('tasbeeh.list.counter.round', { round: counter.rounds })}
          </Text>
          <Text style={[styles.cardMetaDot, { color: theme.textMuted }]}>•</Text>
          <Text style={[styles.cardMetaText, { color: GOLD }]}>
            {t('tasbeeh.list.counter.total', { total: counter.totalCount.toLocaleString() })}
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
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardArabic} numberOfLines={1}>{template.arabic}</Text>
        <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
          {template.name}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: theme.textSecondary }]}>
            {t('tasbeeh.list.counter.target', { target: template.target })}
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
        <Text style={styles.useBtnText}>{t('tasbeeh.list.useBtn')}</Text>
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

  emptyState: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 12, textAlign: 'center' },
});
