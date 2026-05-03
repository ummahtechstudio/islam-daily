import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  Platform,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import {
  getCounters,
  getSelectedCounterId,
  setSelectedCounterId,
  getSettings,
  saveSettings,
  updateCounter,
  resetCounter,
} from '../src/utils/tasbeeh';
import type { TasbeehCounter, TasbeehSettings } from '../src/types/tasbeeh';

const { width: SCREEN_W } = Dimensions.get('window');
const RING_SIZE = Math.min(SCREEN_W * 0.72, 320);
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;
const GOLD = '#EF9F27';

type Mode = 'touch' | 'timer';

const triggerCount = (settings: TasbeehSettings) => {
  if (settings.vibrationEnabled && Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else if (settings.soundEnabled && Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {});
  }
};

const triggerTarget = (settings: TasbeehSettings) => {
  if (settings.vibrationOnTarget && Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TasbeehScreen() {
  useEffect(() => { trackScreen('Tasbeeh'); }, []);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const appSettings = useStore((s) => s.settings);
  const isDark =
    appSettings.colorScheme === 'dark' ||
    (appSettings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [counters, setCounters] = useState<TasbeehCounter[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>('default-1');
  const [settings, setSettings] = useState<TasbeehSettings | null>(null);
  const [mode, setMode] = useState<Mode>('touch');
  const [elapsed, setElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoundCelebration, setShowRoundCelebration] = useState(false);

  // Timer mode state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState(1000);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [nextCountdown, setNextCountdown] = useState(0);

  const sessionStart = useRef<number>(Date.now());
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = useMemo(
    () => counters.find((c) => c.id === selectedId) || counters[0],
    [counters, selectedId],
  );

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      sessionStart.current = Date.now();
      setElapsed(0);
      (async () => {
        const [allCounters, sel, s] = await Promise.all([
          getCounters(),
          getSelectedCounterId(),
          getSettings(),
        ]);
        if (!alive) return;
        setCounters(allCounters);
        const id = allCounters.some((c) => c.id === sel) ? sel : allCounters[0]?.id || 'default-1';
        setSelectedIdState(id);
        setSettings(s);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  // Elapsed timer (always runs while screen visible)
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Persist totalTime when leaving screen / counter changes
  useFocusEffect(
    useCallback(() => {
      const startedFor = selectedId;
      const startedAt = Date.now();
      return () => {
        const delta = Math.floor((Date.now() - startedAt) / 1000);
        if (delta > 0 && startedFor) {
          // Fire and forget — fetch latest counter then bump totalTime
          (async () => {
            try {
              const all = await getCounters();
              const c = all.find((x) => x.id === startedFor);
              if (c) await updateCounter(startedFor, { totalTime: c.totalTime + delta });
            } catch {}
          })();
        }
      };
    }, [selectedId]),
  );

  // Auto-counter loop for Timer Mode
  useEffect(() => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    if (countdownIdRef.current) {
      clearInterval(countdownIdRef.current);
      countdownIdRef.current = null;
    }
    if (mode === 'timer' && timerRunning && selected) {
      const tick = () => {
        increment();
        setNextCountdown(timerInterval);
      };
      setNextCountdown(timerInterval);
      timerIdRef.current = setInterval(tick, timerInterval);
      countdownIdRef.current = setInterval(() => {
        setNextCountdown((v) => Math.max(0, v - 100));
      }, 100);
    }
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (countdownIdRef.current) clearInterval(countdownIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, timerRunning, timerInterval, selectedId]);

  // Stop timer on mode switch / counter switch
  useEffect(() => {
    if (mode === 'touch') setTimerRunning(false);
  }, [mode]);

  const increment = useCallback(async () => {
    if (!selected || !settings) return;
    const newCount = selected.currentCount + 1;
    if (newCount >= selected.target) {
      // Round complete
      const updated: TasbeehCounter = {
        ...selected,
        currentCount: 0,
        rounds: selected.rounds + 1,
        totalCount: selected.totalCount + 1,
      };
      setCounters((prev) => prev.map((c) => (c.id === selected.id ? updated : c)));
      triggerTarget(settings);
      setShowRoundCelebration(true);
      setTimeout(() => setShowRoundCelebration(false), 1600);
      await updateCounter(selected.id, {
        currentCount: 0,
        rounds: updated.rounds,
        totalCount: updated.totalCount,
      });
    } else {
      const updated: TasbeehCounter = {
        ...selected,
        currentCount: newCount,
        totalCount: selected.totalCount + 1,
      };
      setCounters((prev) => prev.map((c) => (c.id === selected.id ? updated : c)));
      triggerCount(settings);
      await updateCounter(selected.id, {
        currentCount: newCount,
        totalCount: updated.totalCount,
      });
    }
  }, [selected, settings]);

  const decrement = useCallback(async () => {
    if (!selected) return;
    if (selected.currentCount === 0 && selected.rounds === 0) return;
    let newCount = selected.currentCount - 1;
    let newRounds = selected.rounds;
    if (newCount < 0) {
      if (newRounds > 0) {
        newRounds -= 1;
        newCount = selected.target - 1;
      } else {
        newCount = 0;
      }
    }
    const newTotal = Math.max(0, selected.totalCount - 1);
    const updated: TasbeehCounter = {
      ...selected,
      currentCount: newCount,
      rounds: newRounds,
      totalCount: newTotal,
    };
    setCounters((prev) => prev.map((c) => (c.id === selected.id ? updated : c)));
    await updateCounter(selected.id, {
      currentCount: newCount,
      rounds: newRounds,
      totalCount: newTotal,
    });
  }, [selected]);

  const handleReset = useCallback(() => {
    if (!selected) return;
    Alert.alert(
      'Reset counter?',
      `This resets the current count and rounds for ${selected.name}. Lifetime total stays.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetCounter(selected.id);
            setCounters((prev) =>
              prev.map((c) =>
                c.id === selected.id ? { ...c, currentCount: 0, rounds: 0 } : c,
              ),
            );
          },
        },
      ],
    );
  }, [selected]);

  const handleTempoTap = useCallback(() => {
    const now = Date.now();
    const newTaps = [...tapTimes, now].slice(-3);
    setTapTimes(newTaps);
    if (newTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setTimerInterval(Math.max(200, Math.min(5000, Math.round(avg))));
    }
    if (settings?.vibrationEnabled && Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [tapTimes, settings]);

  const startStopTimer = useCallback(() => {
    if (tapTimes.length < 2) {
      Alert.alert('Set tempo first', 'Tap "Set Tempo" 3 times in rhythm to set the speed.');
      return;
    }
    setTimerRunning((v) => !v);
  }, [tapTimes]);

  const updateSettingsField = useCallback(
    async (patch: Partial<TasbeehSettings>) => {
      if (!settings) return;
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSettings(next);
    },
    [settings],
  );

  if (!selected || !settings) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.loadingBox}>
          <Text style={{ color: theme.textSecondary }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pct = selected.target > 0 ? selected.currentCount / selected.target : 0;
  const dashOffset = RING_CIRC * (1 - pct);
  const pctLabel = Math.round(pct * 100);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.titleWrap}
          onPress={() => router.push('/tasbeeh-list' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.titleText} numberOfLines={1}>{selected.name}</Text>
          <Ionicons name="chevron-down" size={16} color={GOLD} />
        </TouchableOpacity>
        <View style={styles.topRight}>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color={GOLD} />
            <Text style={styles.timeText}>{formatTime(elapsed)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/tasbeeh-list' as any)}
            hitSlop={10}
            style={{ marginLeft: 10 }}
          >
            <Ionicons name="list" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Mode Tabs ── */}
      <View style={[styles.modeTabs, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {(['touch', 'timer'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.modeTab,
              mode === m && { backgroundColor: Colors.primary },
            ]}
            onPress={() => setMode(m)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={m === 'touch' ? 'finger-print' : 'timer-outline'}
              size={14}
              color={mode === m ? '#fff' : theme.textSecondary}
            />
            <Text style={[
              styles.modeTabText,
              { color: mode === m ? '#fff' : theme.textSecondary },
            ]}>
              {m === 'touch' ? 'Touch Mode' : 'Timer Mode'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Dhikr Display ── */}
      <View style={styles.dhikrBlock}>
        <Text style={styles.dhikrArabic}>{selected.arabic}</Text>
        <Text style={[styles.dhikrName, { color: theme.text }]}>{selected.name}</Text>
        {selected.source ? (
          <Text style={[styles.dhikrSource, { color: theme.textMuted }]} numberOfLines={2}>
            {selected.source}
          </Text>
        ) : null}
      </View>

      {/* ── Progress Ring ── */}
      <View style={styles.ringWrap}>
        <Pressable
          onPress={mode === 'touch' ? increment : undefined}
          style={({ pressed }) => [
            styles.ringPress,
            pressed && mode === 'touch' && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={isDark ? '#2A4438' : '#E8EDE9'}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={GOLD}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringInner}>
            <Text style={[styles.bigCount, { color: theme.text }]}>{selected.currentCount}</Text>
            <Text style={[styles.targetText, { color: theme.textMuted }]}>
              {selected.currentCount} / {selected.target}
            </Text>
            <View style={styles.ringMetaRow}>
              <View style={[styles.metaPill, { backgroundColor: Colors.primary + '22' }]}>
                <Text style={[styles.metaPillText, { color: Colors.primary }]}>
                  Round {selected.rounds}
                </Text>
              </View>
              <View style={[styles.metaPill, { backgroundColor: GOLD + '22' }]}>
                <Text style={[styles.metaPillText, { color: GOLD }]}>{pctLabel}%</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {showRoundCelebration ? (
          <View style={styles.celebration}>
            <Text style={styles.celebrationText}>
              ✨ Round {selected.rounds} complete!
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Timer Mode Controls (when active) ── */}
      {mode === 'timer' ? (
        <View style={[styles.timerBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.timerRow}>
            <TouchableOpacity
              style={[styles.tempoBtn, { backgroundColor: Colors.primary }]}
              onPress={handleTempoTap}
              activeOpacity={0.8}
            >
              <Ionicons name="hand-left-outline" size={14} color="#fff" />
              <Text style={styles.tempoBtnText}>
                {tapTimes.length === 0 ? 'Tap 3× to set tempo' : `Tap (${tapTimes.length}/3)`}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.tempoInterval, { color: theme.textSecondary }]}>
              {(timerInterval / 1000).toFixed(2)}s
            </Text>
          </View>
          <View style={styles.timerRow}>
            <TouchableOpacity
              style={[
                styles.playBtn,
                { backgroundColor: timerRunning ? '#EF4444' : Colors.primary },
              ]}
              onPress={startStopTimer}
              activeOpacity={0.8}
            >
              <Ionicons
                name={timerRunning ? 'pause' : 'play'}
                size={18}
                color="#fff"
              />
              <Text style={styles.playBtnText}>
                {timerRunning ? 'Pause' : 'Start Auto'}
              </Text>
            </TouchableOpacity>
            {timerRunning ? (
              <Text style={[styles.countdown, { color: GOLD }]}>
                Next: {(nextCountdown / 1000).toFixed(1)}s
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Control Bar ── */}
      <View style={[styles.controls, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <ControlBtn icon="refresh" label="Reset" theme={theme} onPress={handleReset} />
        <ControlBtn icon="remove" label="−1" theme={theme} onPress={decrement} />
        <ControlBtn
          icon="add"
          label="+1"
          theme={theme}
          onPress={increment}
          highlight
        />
        <ControlBtn
          icon="list"
          label="List"
          theme={theme}
          onPress={() => router.push('/tasbeeh-list' as any)}
        />
        <ControlBtn
          icon="settings-outline"
          label="Settings"
          theme={theme}
          onPress={() => setShowSettings(true)}
        />
      </View>

      {/* ── Settings Modal ── */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSettings(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Tasbeeh Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ToggleRow
              label="Sound feedback"
              value={settings.soundEnabled}
              theme={theme}
              onToggle={(v) => updateSettingsField({ soundEnabled: v })}
            />
            <ToggleRow
              label="Vibration"
              value={settings.vibrationEnabled}
              theme={theme}
              onToggle={(v) => updateSettingsField({ vibrationEnabled: v })}
            />
            <ToggleRow
              label="Vibrate on round complete"
              value={settings.vibrationOnTarget}
              theme={theme}
              onToggle={(v) => updateSettingsField({ vibrationOnTarget: v })}
            />

            <View style={styles.lifetimeBox}>
              <Text style={[styles.lifetimeLabel, { color: theme.textMuted }]}>
                LIFETIME TOTAL
              </Text>
              <Text style={[styles.lifetimeNum, { color: GOLD }]}>
                {selected.totalCount.toLocaleString()}
              </Text>
              <Text style={[styles.lifetimeLabel, { color: theme.textMuted }]}>
                Total time: {formatTime(selected.totalTime + elapsed)}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helper components ────────────────────────────────────────────────────────

function ControlBtn({
  icon,
  label,
  theme,
  onPress,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: typeof Colors.dark;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.ctrlBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[
        styles.ctrlIconBox,
        { backgroundColor: highlight ? Colors.primary : theme.card, borderColor: theme.border },
      ]}>
        <Ionicons name={icon} size={20} color={highlight ? '#fff' : theme.text} />
      </View>
      <Text style={[styles.ctrlLabel, { color: theme.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  value,
  theme,
  onToggle,
}: {
  label: string;
  value: boolean;
  theme: typeof Colors.dark;
  onToggle: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleRow, { borderColor: theme.border }]}
      onPress={() => onToggle(!value)}
      activeOpacity={0.7}
    >
      <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
      <View style={[
        styles.toggleTrack,
        { backgroundColor: value ? Colors.primary : theme.border },
      ]}>
        <View style={[
          styles.toggleThumb,
          { transform: [{ translateX: value ? 20 : 2 }] },
        ]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  titleText: { color: '#fff', fontSize: 16, fontWeight: '800', maxWidth: 180 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
  },
  timeText: { color: GOLD, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },

  modeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeTabText: { fontSize: 13, fontWeight: '700' },

  dhikrBlock: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'center',
    gap: 4,
  },
  dhikrArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 30,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 50,
    writingDirection: 'rtl',
  },
  dhikrName: { fontSize: 14, fontWeight: '700' },
  dhikrSource: { fontSize: 11, textAlign: 'center', marginTop: 2 },

  ringWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  ringPress: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bigCount: {
    fontSize: 76,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 84,
  },
  targetText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  ringMetaRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  metaPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  metaPillText: { fontSize: 11, fontWeight: '800' },
  celebration: {
    position: 'absolute',
    top: 16,
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  celebrationText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  timerBox: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tempoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tempoBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tempoInterval: { fontSize: 13, fontWeight: '700', minWidth: 56, textAlign: 'right' },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  playBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  countdown: { fontSize: 12, fontWeight: '700', minWidth: 80, textAlign: 'right' },

  controls: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-around',
  },
  ctrlBtn: { alignItems: 'center', gap: 4, flex: 1 },
  ctrlIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  ctrlLabel: { fontSize: 11, fontWeight: '600' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1,
    gap: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },

  lifetimeBox: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
  },
  lifetimeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  lifetimeNum: { fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
