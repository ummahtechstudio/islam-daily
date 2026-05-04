import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { useStore } from '../store';
import { useIsOnline } from '../hooks/useIsOnline';

const GREEN = '#0F6E56';

export type MosqueFinderEmptyStateProps = {
  onRetry?: () => void;
};

export default function MosqueFinderEmptyState({ onRetry }: MosqueFinderEmptyStateProps) {
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;
  const isOnline = useIsOnline();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Ionicons name="location" size={24} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mosque Finder</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Discover masjids near you
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.iconRing, { backgroundColor: GREEN + '15', borderColor: GREEN + '40' }]}>
          <Ionicons name="map-outline" size={56} color={GREEN} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Find Mosques Nearby</Text>
        <Text style={[styles.body_text, { color: theme.textSecondary }]}>
          Connect to the internet to discover masjids around you with directions, prayer times, and reviews.
        </Text>

        <TouchableOpacity
          style={[
            styles.retryBtn,
            { backgroundColor: Colors.primary },
            !isOnline && styles.retryBtnDisabled,
          ]}
          onPress={onRetry}
          disabled={!isOnline}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryText}>{isOnline ? 'Retry' : 'Waiting for connection…'}</Text>
        </TouchableOpacity>

        <Text style={[styles.note, { color: theme.textMuted }]}>
          Mosque locations need real-time data and can&apos;t be saved offline.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  iconRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body_text: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },
  retryBtnDisabled: { opacity: 0.4 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 17,
  },
});
