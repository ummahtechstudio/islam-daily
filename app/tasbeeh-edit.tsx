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
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import {
  getCounters,
  saveCounter,
  setSelectedCounterId,
} from '../src/utils/tasbeeh';
import type { TasbeehCounter } from '../src/types/tasbeeh';

const GOLD = '#EF9F27';

export default function TasbeehEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : null;
  const isEditing = !!editingId;

  const colorScheme = useColorScheme();
  const appSettings = useStore((s) => s.settings);
  const isDark =
    appSettings.colorScheme === 'dark' ||
    (appSettings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

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
    router.back();
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={[styles.topBar, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
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
              onPress={() => router.back()}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
});
