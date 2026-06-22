import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AudioItem } from '../constants/audioLibraryData';

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];
const posKey = (id: string) => `@audio_pos_${id}`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AudioState {
  currentTrack: AudioItem | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  speed: Speed;
  sleepMinutes: number | null;
  isFullPlayerOpen: boolean;
  isMiniPlayerVisible: boolean;
  playlist: AudioItem[];
  playlistIndex: number;
}

interface AudioCtx extends AudioState {
  playTrack: (track: AudioItem, playlist?: AudioItem[], index?: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skipNext: () => void;
  skipPrev: () => void;
  cycleSpeed: () => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  stop: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AudioPlayerContext = createContext<AudioCtx | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const sleepRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef<Speed>(1);
  // Guards against the playTrack race: createAsync resolving after the provider
  // unmounted, or after a newer playTrack started, would otherwise orphan a
  // native Sound that keeps playing and is never unloaded.
  const isMountedRef = useRef(true);
  const loadTokenRef = useRef(0);
  // Lets onStatus auto-advance without a circular dependency on playTrack.
  const playTrackRef = useRef<
    ((track: AudioItem, playlist?: AudioItem[], index?: number) => Promise<void>) | null
  >(null);

  const [state, setState] = useState<AudioState>({
    currentTrack: null,
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    speed: 1,
    sleepMinutes: null,
    isFullPlayerOpen: false,
    isMiniPlayerVisible: false,
    playlist: [],
    playlistIndex: 0,
  });

  // Mirror of state for callbacks that need the freshest values without
  // forcing themselves into setState updaters (which must be pure).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Configure audio session once on mount
  useEffect(() => {
    // Re-arm on (re)mount so a StrictMode/Fast-Refresh remount — whose cleanup
    // already set this false — doesn't leave the ref permanently false and
    // suppress post-load playback. Mirrors QuranAudioContext.
    isMountedRef.current = true;
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    }).catch((err) => console.warn('[AudioPlayer] setAudioMode failed', err));
    return () => {
      isMountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
      if (sleepRef.current) clearTimeout(sleepRef.current);
      if (saveRef.current) clearInterval(saveRef.current);
    };
  }, []);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setState(prev => ({
      ...prev,
      isPlaying: status.isPlaying,
      positionSec: Math.floor((status.positionMillis ?? 0) / 1000),
      durationSec: Math.floor((status.durationMillis ?? 0) / 1000),
    }));
    if (status.didJustFinish) {
      // Auto-advance to the next track in the playlist; otherwise just stop.
      const { playlist, playlistIndex } = stateRef.current;
      if (playlistIndex < playlist.length - 1) {
        const nextIdx = playlistIndex + 1;
        playTrackRef.current?.(playlist[nextIdx], playlist, nextIdx);
      } else {
        setState(prev => ({ ...prev, isPlaying: false, positionSec: 0 }));
      }
    }
  }, []);

  const playTrack = useCallback(async (
    track: AudioItem,
    playlist: AudioItem[] = [],
    index = 0,
  ) => {
    // Token for this load. If a newer playTrack starts (or we unmount) while we
    // await below, this load is stale and must not assign soundRef / start an
    // interval, or it would orphan a second native Sound that keeps playing.
    const myToken = ++loadTokenRef.current;

    // Clean up previous track
    if (saveRef.current) clearInterval(saveRef.current);
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    // Load saved resume position
    let startMs = 0;
    try {
      const saved = await AsyncStorage.getItem(posKey(track.id));
      if (saved) startMs = parseInt(saved, 10) * 1000;
    } catch {}

    if (myToken !== loadTokenRef.current || !isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      currentTrack: track,
      playlist: playlist.length ? playlist : [track],
      playlistIndex: index,
      isMiniPlayerVisible: true,
      isPlaying: false,
      positionSec: 0,
      durationSec: 0,
    }));

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        {
          shouldPlay: true,
          positionMillis: startMs,
          rate: speedRef.current,
          shouldCorrectPitch: true,
        },
        onStatus,
      );
      // A newer load started (or we unmounted) while createAsync was in flight —
      // discard this sound so it can't play over the newer one or leak.
      if (myToken !== loadTokenRef.current || !isMountedRef.current) {
        sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
      setState(prev => ({ ...prev, isPlaying: true }));

      // Persist position every 5 s
      saveRef.current = setInterval(async () => {
        const s = await sound.getStatusAsync();
        if (s.isLoaded && s.positionMillis) {
          await AsyncStorage.setItem(posKey(track.id), String(Math.floor(s.positionMillis / 1000)));
        }
      }, 5000);
    } catch (e) {
      console.warn('[AudioPlayer] load error:', e);
    }
  }, [onStatus]);

  // Keep onStatus's auto-advance pointed at the latest playTrack without making
  // onStatus depend on it (which would recreate the playback-status callback).
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    const s = await soundRef.current.getStatusAsync();
    if (!s.isLoaded) return;
    if (s.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    await soundRef.current?.setPositionAsync(Math.max(0, seconds) * 1000);
  }, []);

  // Read the freshest playlist/position from stateRef so callbacks stay
  // closure-stable and never fire side effects from inside a setState updater
  // (which must be pure — StrictMode would double-invoke and race playTrack).
  const skipNext = useCallback(() => {
    const { playlist, playlistIndex } = stateRef.current;
    if (playlistIndex < playlist.length - 1) {
      const nextIdx = playlistIndex + 1;
      playTrack(playlist[nextIdx], playlist, nextIdx);
    }
  }, [playTrack]);

  const skipPrev = useCallback(() => {
    const { positionSec, playlist, playlistIndex } = stateRef.current;
    if (positionSec > 5) {
      seekTo(0);
      return;
    }
    if (playlistIndex > 0) {
      const prevIdx = playlistIndex - 1;
      playTrack(playlist[prevIdx], playlist, prevIdx);
    }
  }, [playTrack, seekTo]);

  const cycleSpeed = useCallback(async () => {
    // Read current speed from ref so we don't have side effects inside a
    // setState updater (StrictMode safety).
    const idx = SPEEDS.indexOf(stateRef.current.speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    speedRef.current = next;
    soundRef.current?.setRateAsync(next, true).catch(() => {});
    setState(prev => ({ ...prev, speed: next }));
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    setState(prev => ({ ...prev, sleepMinutes: minutes }));
    if (minutes) {
      sleepRef.current = setTimeout(async () => {
        await soundRef.current?.pauseAsync();
        setState(prev => ({ ...prev, sleepMinutes: null }));
      }, minutes * 60_000);
    }
  }, []);

  const stop = useCallback(async () => {
    if (saveRef.current) clearInterval(saveRef.current);
    if (sleepRef.current) clearTimeout(sleepRef.current);
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setState(prev => ({
      ...prev,
      currentTrack: null,
      isPlaying: false,
      isMiniPlayerVisible: false,
      isFullPlayerOpen: false,
      positionSec: 0,
      durationSec: 0,
      sleepMinutes: null,
    }));
  }, []);

  const openFullPlayer = useCallback(() => {
    setState(prev => ({ ...prev, isFullPlayerOpen: true }));
  }, []);

  const closeFullPlayer = useCallback(() => {
    setState(prev => ({ ...prev, isFullPlayerOpen: false }));
  }, []);

  return (
    <AudioPlayerContext.Provider value={{
      ...state,
      playTrack,
      togglePlay,
      seekTo,
      skipNext,
      skipPrev,
      cycleSpeed,
      setSleepTimer,
      openFullPlayer,
      closeFullPlayer,
      stop,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudioPlayer(): AudioCtx {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used inside AudioPlayerProvider');
  return ctx;
}
