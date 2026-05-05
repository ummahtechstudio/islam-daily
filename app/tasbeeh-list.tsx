import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { TasbeehListView } from '../src/components/tasbeeh/TasbeehListView';

export default function TasbeehListScreen() {
  useEffect(() => { trackScreen('TasbeehList'); }, []);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const appSettings = useStore((s) => s.settings);
  const isDark =
    appSettings.colorScheme === 'dark' ||
    (appSettings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <TasbeehListView
        theme={theme}
        onBack={() => router.back()}
        onSelectCounter={() => router.back()}
        onNewCounter={() => router.push('/tasbeeh-edit' as any)}
        onEditCounter={(id) =>
          router.push({ pathname: '/tasbeeh-edit', params: { id } } as any)
        }
      />
    </SafeAreaView>
  );
}
