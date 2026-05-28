import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { urduStyle } from '../src/constants/fonts';
import { trackScreen } from '../src/services/analytics';
import { useAudioPlayer } from '../src/context/AudioPlayerContext';
import {
  AUDIO_LIBRARY,
  AUDIO_CATEGORIES,
  AudioItem,
  AudioLanguage,
} from '../src/constants/audioLibraryData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOLD = '#C9A84C';
const { width: W } = Dimensions.get('window');
const CAT_W = (W - 44) / 2;

type LangFilter = 'all' | AudioLanguage;

const LANG_TABS: { key: LangFilter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'urdu',    label: 'Urdu اردو' },
  { key: 'arabic',  label: 'Arabic عربی' },
  { key: 'english', label: 'English' },
];

const fmtDuration = (m: number) => {
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r > 0 ? `${h}h ${r}m` : `${h}h`;
  }
  return `${m}m`;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AudioLibraryScreen() {
  useEffect(() => { trackScreen('AudioLibrary'); }, []);

  const colorScheme = useColorScheme();
  const settings = useStore(s => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let list = AUDIO_LIBRARY.filter(i => i.enabled !== false);
    if (langFilter !== 'all') list = list.filter(i => i.language === langFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        i =>
          i.title_english.toLowerCase().includes(q) ||
          i.title_urdu.includes(q) ||
          i.author.toLowerCase().includes(q),
      );
    }
    return list;
  }, [langFilter, query]);

  const catItems = useMemo(
    () => (activeCat ? filtered.filter(i => i.category === activeCat) : []),
    [activeCat, filtered],
  );

  const handlePlay = (item: AudioItem, playlist?: AudioItem[]) => {
    const list = playlist ?? [item];
    const idx = list.indexOf(item);
    playTrack(item, list, idx < 0 ? 0 : idx);
    setRecentIds(prev =>
      [item.id, ...prev.filter(id => id !== item.id)].slice(0, 10),
    );
  };

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const recentItems = recentIds
    .map(id => AUDIO_LIBRARY.find(i => i.id === id))
    .filter((i): i is AudioItem => Boolean(i) && i!.enabled !== false);
  const favItems = AUDIO_LIBRARY.filter(i => favorites.has(i.id) && i.enabled !== false);

  const requestContent = () =>
    Linking.openURL(
      'mailto:ummahtech.studio@gmail.com?subject=Audio%20Request%20-%20Islam%20Daily',
    );

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['bottom']}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="headset" size={22} color="#fff" />
          <View>
            <Text style={styles.headerTitle}>Audio Library</Text>
            <Text style={[urduStyle(15), styles.headerUrdu]}>آڈیو لائبریری</Text>
          </View>
        </View>
        <TouchableOpacity onPress={requestContent} style={styles.requestBtn}>
          <Ionicons name="add-circle-outline" size={14} color={GOLD} />
          <Text style={styles.requestTxt}>Request</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={theme.textMuted} />
        <TextInput
          placeholder="Search by title, scholar, reciter…"
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={t => {
            setQuery(t);
            if (t.trim()) setActiveCat(null);
          }}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Language filter tabs ── */}
      <View
        style={[
          styles.langTabRow,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        {LANG_TABS.map(t => {
          const active = langFilter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setLangFilter(t.key)}
              style={[
                styles.langTab,
                active && {
                  borderBottomColor: Colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.langTabTxt,
                  { color: active ? Colors.primary : theme.textMuted },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >

        {/* ── Search results ── */}
        {query.trim() ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Search Results ({filtered.length})
            </Text>
            {filtered.length === 0 ? (
              <Text style={[styles.emptyTxt, { color: theme.textMuted }]}>
                No results found.
              </Text>
            ) : (
              filtered.map(item => (
                <AudioRow
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  isActive={currentTrack?.id === item.id}
                  isCurrentlyPlaying={currentTrack?.id === item.id && isPlaying}
                  isFav={favorites.has(item.id)}
                  onPlay={() => handlePlay(item, filtered)}
                  onFav={() => toggleFav(item.id)}
                />
              ))
            )}
          </View>
        ) : (
          <>
            {/* ── Favorites ── */}
            {favItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="heart" size={15} color="#EF4444" />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Favorites
                  </Text>
                </View>
                {favItems.map(item => (
                  <AudioRow
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    isActive={currentTrack?.id === item.id}
                    isCurrentlyPlaying={currentTrack?.id === item.id && isPlaying}
                    isFav
                    onPlay={() => handlePlay(item, favItems)}
                    onFav={() => toggleFav(item.id)}
                  />
                ))}
              </View>
            )}

            {/* ── Recently Played ── */}
            {recentItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="time-outline" size={15} color={Colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Recently Played
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                >
                  {recentItems.map(item => (
                    <RecentCard
                      key={item.id}
                      item={item}
                      isDark={isDark}
                      isActive={currentTrack?.id === item.id}
                      onPlay={() => handlePlay(item)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Category grid ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Browse by Category
              </Text>
              <View style={styles.catGrid}>
                {AUDIO_CATEGORIES.map(cat => {
                  const count = filtered.filter(i => i.category === cat.id).length;
                  if (count === 0) return null;
                  const active = activeCat === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.75}
                      onPress={() => setActiveCat(active ? null : cat.id)}
                      style={[
                        styles.catCard,
                        {
                          backgroundColor: active ? cat.color : theme.card,
                          borderColor: active ? cat.color : theme.border,
                          width: CAT_W,
                        },
                      ]}
                    >
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.catLabel,
                          { color: active ? '#fff' : theme.text },
                        ]}
                        numberOfLines={2}
                      >
                        {cat.label_english}
                      </Text>
                      <Text
                        style={[
                          urduStyle(11),
                          { color: active ? 'rgba(255,255,255,0.75)' : theme.textMuted },
                        ]}
                      >
                        {cat.label_urdu}
                      </Text>
                      <View
                        style={[
                          styles.countBadge,
                          {
                            backgroundColor: active
                              ? 'rgba(255,255,255,0.22)'
                              : cat.color + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.countTxt,
                            { color: active ? '#fff' : cat.color },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Selected category items ── */}
            {activeCat && catItems.length > 0 && (() => {
              const cat = AUDIO_CATEGORIES.find(c => c.id === activeCat);
              if (!cat) return null;
              return (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                    <Text style={[styles.sectionTitle, { color: cat.color }]}>
                      {cat.label_english}
                    </Text>
                    <Text
                      style={[urduStyle(13), { color: theme.textMuted }]}
                    >
                      {cat.label_urdu}
                    </Text>
                  </View>
                  {catItems.map(item => (
                    <AudioRow
                      key={item.id}
                      item={item}
                      isDark={isDark}
                      isActive={currentTrack?.id === item.id}
                      isCurrentlyPlaying={currentTrack?.id === item.id && isPlaying}
                      isFav={favorites.has(item.id)}
                      onPlay={() => handlePlay(item, catItems)}
                      onFav={() => toggleFav(item.id)}
                    />
                  ))}
                </View>
              );
            })()}

            {/* ── All items grouped by category (no selection) ── */}
            {!activeCat &&
              AUDIO_CATEGORIES.map(cat => {
                const items = filtered.filter(i => i.category === cat.id);
                if (items.length === 0) return null;
                const preview = items.slice(0, 3);
                return (
                  <View key={cat.id} style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                      <Text style={[styles.sectionTitle, { color: cat.color }]}>
                        {cat.label_english}
                      </Text>
                      <Text
                        style={[urduStyle(12), { color: theme.textMuted, flex: 1 }]}
                        numberOfLines={1}
                      >
                        {cat.label_urdu}
                      </Text>
                    </View>
                    {preview.map(item => (
                      <AudioRow
                        key={item.id}
                        item={item}
                        isDark={isDark}
                        isActive={currentTrack?.id === item.id}
                        isCurrentlyPlaying={currentTrack?.id === item.id && isPlaying}
                        isFav={favorites.has(item.id)}
                        onPlay={() => handlePlay(item, items)}
                        onFav={() => toggleFav(item.id)}
                      />
                    ))}
                    {items.length > 3 && (
                      <TouchableOpacity
                        onPress={() => setActiveCat(cat.id)}
                        style={[
                          styles.seeMore,
                          { borderColor: cat.color + '40' },
                        ]}
                      >
                        <Text style={[styles.seeMoreTxt, { color: cat.color }]}>
                          See all {items.length} {cat.label_english}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={cat.color}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
          </>
        )}

        {/* ── Request content card ── */}
        <TouchableOpacity
          onPress={requestContent}
          style={[
            styles.requestCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          activeOpacity={0.75}
        >
          <View style={[styles.requestIconBox, { backgroundColor: Colors.primary + '18' }]}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.requestCardTitle, { color: theme.text }]}>
              Request Audio Content
            </Text>
            <Text style={[styles.requestCardSub, { color: theme.textMuted }]}>
              Missing a scholar or series? Let us know.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── AudioRow ─────────────────────────────────────────────────────────────────

function AudioRow({
  item,
  isDark,
  isActive,
  isCurrentlyPlaying,
  isFav,
  onPlay,
  onFav,
}: {
  item: AudioItem;
  isDark: boolean;
  isActive: boolean;
  isCurrentlyPlaying: boolean;
  isFav: boolean;
  onPlay: () => void;
  onFav: () => void;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const cat = AUDIO_CATEGORIES.find(c => c.id === item.category);
  const accent = cat?.color ?? Colors.primary;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isActive ? accent + '12' : theme.card,
          borderColor: isActive ? accent + '40' : theme.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPlay}
        style={[
          styles.rowPlayBtn,
          { backgroundColor: isCurrentlyPlaying ? accent : accent + '1A' },
        ]}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isCurrentlyPlaying ? 'pause' : 'play'}
          size={18}
          color={isCurrentlyPlaying ? '#fff' : accent}
        />
      </TouchableOpacity>

      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title_english}
        </Text>
        {(item.language === 'urdu' || item.language === 'arabic') && (
          <Text
            style={[urduStyle(12), { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {item.title_urdu}
          </Text>
        )}
        <Text
          style={[styles.rowAuthor, { color: accent }]}
          numberOfLines={1}
        >
          {item.author}
        </Text>
        <View style={styles.rowMeta}>
          <View style={[styles.rowBadge, { backgroundColor: accent + '1A' }]}>
            <Text style={[styles.rowBadgeTxt, { color: accent }]}>
              {item.sub_category}
            </Text>
          </View>
          <Text style={[styles.rowDur, { color: theme.textMuted }]}>
            {fmtDuration(item.duration_minutes)}
            {item.total_episodes != null ? `  ·  ${item.total_episodes} ep` : ''}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onFav} hitSlop={8}>
        <Ionicons
          name={isFav ? 'heart' : 'heart-outline'}
          size={20}
          color={isFav ? '#EF4444' : theme.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── RecentCard ───────────────────────────────────────────────────────────────

function RecentCard({
  item,
  isDark,
  isActive,
  onPlay,
}: {
  item: AudioItem;
  isDark: boolean;
  isActive: boolean;
  onPlay: () => void;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const cat = AUDIO_CATEGORIES.find(c => c.id === item.category);
  const accent = cat?.color ?? Colors.primary;

  return (
    <TouchableOpacity
      onPress={onPlay}
      style={[
        styles.recentCard,
        {
          backgroundColor: theme.card,
          borderColor: isActive ? accent : theme.border,
        },
      ]}
      activeOpacity={0.75}
    >
      <View
        style={[styles.recentArt, { backgroundColor: accent + '20' }]}
      >
        <Text style={{ fontSize: 26 }}>{cat?.icon ?? '🎧'}</Text>
      </View>
      <Text
        style={[styles.recentTitle, { color: theme.text }]}
        numberOfLines={2}
      >
        {item.title_english}
      </Text>
      <Text
        style={[styles.recentAuthor, { color: accent }]}
        numberOfLines={1}
      >
        {item.author}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerUrdu: { color: 'rgba(255,255,255,0.72)' },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  requestTxt: { color: GOLD, fontSize: 12, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  langTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  langTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  langTabTxt: { fontSize: 12, fontWeight: '600' },

  section: { paddingHorizontal: 14, paddingTop: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  emptyTxt: { fontSize: 14, textAlign: 'center', marginTop: 20 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  catCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  catIcon: { fontSize: 24, marginBottom: 4 },
  catLabel: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  countBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  countTxt: { fontSize: 11, fontWeight: '800' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  rowPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: { flex: 1, gap: 1 },
  rowTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  rowAuthor: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  rowBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  rowBadgeTxt: { fontSize: 10, fontWeight: '700' },
  rowDur: { fontSize: 11 },

  recentCard: {
    width: 128,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },
  recentArt: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentTitle: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  recentAuthor: { fontSize: 11, fontWeight: '600' },

  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 4,
  },
  seeMoreTxt: { fontSize: 13, fontWeight: '600' },

  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  requestIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCardTitle: { fontSize: 14, fontWeight: '700' },
  requestCardSub: { fontSize: 12, marginTop: 1 },
});
