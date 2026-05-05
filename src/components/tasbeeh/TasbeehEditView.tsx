import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import {
  getCounters,
  saveCounter,
  setSelectedCounterId,
  deleteCounter,
} from '../../utils/tasbeeh';
import type { TasbeehCounter } from '../../types/tasbeeh';

export interface TasbeehEditViewProps {
  theme: typeof Colors.dark;
  /** ID of an existing counter to edit, or null/undefined for new. */
  editingId?: string | null;
  /** Optional back chevron handler. */
  onBack?: () => void;
  /** Called after a successful save. New counter is auto-selected. */
  onSaved: (counterId: string) => void;
  /** Called after a successful delete. */
  onDeleted?: () => void;
  /** Cancel — return to caller without saving. */
  onCancel: () => void;
}

export function TasbeehEditView({
  theme,
  editingId,
  onBack,
  onSaved,
  onDeleted,
  onCancel,
}: TasbeehEditViewProps) {
  const isEditing = !!editingId;

  const [name, setName] = useState('');
  const [arabic, setArabic] = useState('');
  const [target, setTarget] = useState('33');
  const [source, setSource] = useState('');
  const [original, setOriginal] = useState<TasbeehCounter | null>(null);

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      const all = await getCounters();
      const c = all.find((x) => x.id === editingId);
      if (!c) return;
      setOriginal(c);
      setName(c.name);
      setArabic(c.arabic);
      setTarget(String(c.target));
      setSource(c.source || '');
    })();
  }, [editingId]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedArabic = arabic.trim();
    const targetNum = parseInt(target, 10);

    if (trimmedName.length < 1 || trimmedName.length > 50) {
      Alert.alert('Invalid name', 'Name must be 1–50 characters.');
      return;
    }
    if (trimmedArabic.length < 1) {
      Alert.alert('Arabic required', 'Please enter Arabic text for this counter.');
      return;
    }
    if (!Number.isFinite(targetNum) || targetNum < 1 || targetNum > 9999) {
      Alert.alert('Invalid target', 'Target must be a number between 1 and 9999.');
      return;
    }

    const counter: TasbeehCounter = original
      ? {
          ...original,
          name: trimmedName,
          arabic: trimmedArabic,
          target: targetNum,
          source: source.trim() || undefined,
        }
      : {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: trimmedName,
          arabic: trimmedArabic,
          target: targetNum,
          currentCount: 0,
          rounds: 0,
          totalCount: 0,
          totalTime: 0,
          createdAt: Date.now(),
          isDefault: false,
          source: source.trim() || undefined,
        };

    await saveCounter(counter);
    if (!isEditing) {
      await setSelectedCounterId(counter.id);
    }
    onSaved(counter.id);
  };

  const handleDelete = () => {
    if (!original || original.isDefault) return;
    Alert.alert(
      'Delete counter?',
      `This will permanently remove "${original.name}" and its progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCounter(original.id);
            onDeleted?.();
          },
        },
      ],
    );
  };

  const showDelete = isEditing && original && !original.isDefault;

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { backgroundColor: Colors.primary }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.topTitle}>
          {isEditing ? 'Edit Counter' : 'New Counter'}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 18, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label="Name (English)"
            theme={theme}
            value={name}
            onChange={setName}
            placeholder="e.g. SubhanAllah"
            maxLength={50}
          />
          <Field
            label="Arabic Text"
            theme={theme}
            value={arabic}
            onChange={setArabic}
            placeholder="سُبْحَانَ اللَّهِ"
            arabic
          />
          <Field
            label="Target Count"
            theme={theme}
            value={target}
            onChange={(v) => setTarget(v.replace(/[^0-9]/g, ''))}
            placeholder="33"
            keyboardType="number-pad"
            maxLength={4}
          />
          <Field
            label="Source / Reference (optional)"
            theme={theme}
            value={source}
            onChange={setSource}
            placeholder="e.g. Bukhari 843"
            maxLength={120}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost, { borderColor: theme.border }]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnGhostText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: Colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.btnText}>{isEditing ? 'Save Changes' : 'Create Counter'}</Text>
            </TouchableOpacity>
          </View>

          {showDelete ? (
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: '#EF4444' }]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.deleteText}>Delete Counter</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  theme,
  keyboardType,
  maxLength,
  arabic,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  theme: typeof Colors.dark;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  arabic?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.fieldInput,
          {
            color: arabic ? Colors.primary : theme.text,
            borderColor: theme.border,
            backgroundColor: theme.card,
            textAlign: arabic ? 'right' : 'left',
            fontSize: arabic ? 22 : 15,
            fontFamily: arabic ? 'Amiri_400Regular' : undefined,
            writingDirection: arabic ? 'rtl' : 'ltr',
          },
        ]}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
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

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnGhost: { borderWidth: 1, backgroundColor: 'transparent' },
  btnGhostText: { fontSize: 14, fontWeight: '700' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  deleteText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
});
