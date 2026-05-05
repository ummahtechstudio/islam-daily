import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { TasbeehEditView } from '../src/components/tasbeeh/TasbeehEditView';

export default function TasbeehEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : null;

  const colorScheme = useColorScheme();
  const appSettings = useStore((s) => s.settings);
  const isDark =
    appSettings.colorScheme === 'dark' ||
    (appSettings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <TasbeehEditView
        theme={theme}
        editingId={editingId}
        onBack={() => router.back()}
        onSaved={() => router.back()}
        onDeleted={() => router.back()}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
