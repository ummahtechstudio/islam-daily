import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../src/constants/colors';
import { urduStyle } from '../src/constants/fonts';
import { trackScreen } from '../src/services/analytics';
import { useStore } from '../src/store';
import {
  getBundledNamesOfAllah,
  getCachedOrBundledNamesOfAllah,
} from '../src/services/content';
import type { NameOfAllah } from '../src/types/content';

// Map content-layer NameOfAllah to the screen's display shape.
interface AllaName {
  id: number;
  name: string;
  transliteration: string;
  pronunciation: string;
  meaning: string;
  description?: string | null;
}

function toDisplay(rows: NameOfAllah[]): AllaName[] {
  return rows.map((n) => ({
    id: n.id,
    name: n.arabic,
    transliteration: n.transliteration,
    pronunciation: '',
    meaning: n.english_meaning,
    description: n.urdu_meaning ?? n.meaning_detail ?? null,
  }));
}

export default function NamesScreen() {
  useEffect(() => { trackScreen('NamesOfAllah'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  // Initial render — bundled JSON only, never touches storage. SSR-safe.
  const [names, setNames] = useState<AllaName[]>(() => toDisplay(getBundledNamesOfAllah()));
  const [selected, setSelected] = useState<AllaName | null>(null);

  // After mount on the client, upgrade to the cached snapshot if MMKV has fresher content.
  useEffect(() => {
    setNames(toDisplay(getCachedOrBundledNamesOfAllah()));
  }, []);

  const renderName = ({ item }: { item: AllaName }) => (
    <TouchableOpacity
      style={[styles.nameCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => setSelected(item)}
      activeOpacity={0.75}
    >
      <Text style={[styles.nameNum, { color: Colors.primary }]}>{item.id === 0 ? '✦' : item.id}</Text>
      <Text style={[styles.nameArabic, { color: theme.text }]}>{item.name}</Text>
      <Text style={[styles.nameTranslit, { color: theme.textSecondary }]} numberOfLines={1}>
        {item.transliteration}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>99 Names of Allah</Text>
        <Text style={styles.headerAr}>أسماء الله الحسنى</Text>
      </View>

      <FlatList
        data={names}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderName}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
            <View style={[styles.detailHeader, { backgroundColor: Colors.primary }]}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Text style={{ color: '#fff', fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailNum}>{selected.id === 0 ? '✦ The Greatest Name' : `${selected.id} / 99`}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <Text style={[styles.detailArabic, { color: theme.text }]}>{selected.name}</Text>
              <Text style={[styles.detailTranslit, { color: Colors.primary }]}>
                {selected.transliteration}
              </Text>
              {selected.pronunciation && (
                <Text style={[styles.detailPronounce, { color: theme.textSecondary }]}>
                  /{selected.pronunciation}/
                </Text>
              )}
              <View style={[styles.meaningCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.meaningLabel, { color: Colors.primary }]}>Meaning</Text>
                <Text style={[styles.meaningText, { color: theme.text }]}>{selected.meaning}</Text>
              </View>
              {selected.description && (
                <Text style={[styles.description, { color: theme.textSecondary }, urduStyle(18)]}>
                  {selected.description}
                </Text>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: 16, paddingTop: 14, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerAr: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Amiri_400Regular', fontSize: 18, marginTop: 2 },

  grid: { padding: 10 },
  row: { gap: 8, marginBottom: 8 },
  nameCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    minHeight: 100,
    justifyContent: 'center',
  },
  nameNum: { fontSize: 11, fontWeight: '700' },
  nameArabic: { fontFamily: 'Amiri_400Regular', fontSize: 20, textAlign: 'center' },
  nameTranslit: { fontSize: 11, textAlign: 'center' },

  detailHeader: { padding: 16, alignItems: 'center', position: 'relative' },
  closeBtn: { position: 'absolute', right: 16, top: 16 },
  detailNum: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  detailContent: { padding: 24, alignItems: 'center', gap: 8 },
  detailArabic: { fontFamily: 'Amiri_700Bold', fontSize: 52, textAlign: 'center' },
  detailTranslit: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  detailPronounce: { fontSize: 16, fontStyle: 'italic' },
  meaningCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  meaningLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  meaningText: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  description: { fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 8 },
});
