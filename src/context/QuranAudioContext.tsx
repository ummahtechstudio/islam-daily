import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

import {
  DEFAULT_RECITER_ID,
  RECITERS,
  ayahAudioUrl,
  getReciterById,
  nextAyah,
  prevAyah,
  type QuranReciter,
} from '../utils/quranAudio';
import { prefs } from '../lib/storage';

const RECITER_PREF_KEY = 'quran_audio_reciter_v1';

// ─── State shape ──────────────────────────────────────────────────────────────

type Playing = { surah: number; ayah: number };

type State = {
  reciterId: string;
  current: Playing | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
};

interface QuranAudioCtx extends State {
  reciter: QuranReciter;
  reciters: QuranReciter[];
  setReciter: (id: string) => void;
  playAyah: (surah: number, ayah: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  stop: () => Promise<void>;
  retry: () => Promise<void>;
  isAyahActive: (surah: number, ayah: number) => boolean;
}

const QuranAudioContext = createContext<QuranAudioCtx | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function QuranAudioProvider({ children }: { children: React.ReactNode }) {
  // Hydrate reciter from MMKV on first render so the user's last choice is
  // remembered across launches.
  const initialReciter =
    (() => {
      const stored = prefs.get(RECITER_PREF_KEY);
      return stored && RECITERS.some((r) => r.id === stored)
        ? stored
        : DEFAULT_RECITER_ID;
    })();

  const [state, setState] = useState<State>({
    reciterId: initialReciter,
    current: null,
    isPlaying: false,
    isLoading: false,
    error: null,
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  // Mirror state in a ref so async callbacks (status updater, didJustFinish)
  // can read the freshest values without forcing rerender-driven closures.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  // Guard against unmount-during-load races: createAsync resolves with a
  // Sound, and if the user navigated away mid-load we must unload it.
  const isMountedRef = useRef(true);

  // Configure audio session once. staysActiveInBackground lets recitation
  // continue when the user switches apps or locks the phone. iOS additionally
  // needs UIBackgroundModes: ["audio"] in app.json (see Info.plist).
  useEffect(() => {
    isMountedRef.current = true;
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    }).catch((err) => console.warn('[QuranAudio] setAudioMode failed', err));
    return () => {
      isMountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const reciter = getReciterById(state.reciterId);

  // Forward declare for the status callback's `next` step. Re-declared as a
  // useCallback below; we read it through a ref so the status callback,
  // which closes over the very first `playAyah` only once, can still
  // dispatch the latest version.
  const playAyahRef = useRef<(s: number, a: number) => Promise<void>>(
    async () => {},
  );

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    // Push isPlaying changes into state so the UI reflects pause/resume
    // from any source (header buttons, OS media controls eventually).
    setState((prev) =>
      prev.isPlaying !== status.isPlaying
        ? { ...prev, isPlaying: status.isPlaying }
        : prev,
    );
    if (status.didJustFinish) {
      // Auto-advance: next ayah within surah, or first ayah of next surah,
      // or stop at end of Quran (114:6).
      const cur = stateRef.current.current;
      if (!cur) return;
      const nxt = nextAyah(cur.surah, cur.ayah);
      if (!nxt) {
        // End of Quran — stop cleanly.
        setState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }
      void playAyahRef.current(nxt.surah, nxt.ayah);
    }
  }, []);

  const playAyah = useCallback(
    async (surah: number, ayah: number) => {
      // Tear down any previous sound first.
      const prevSound = soundRef.current;
      soundRef.current = null;
      if (prevSound) {
        try {
          await prevSound.unloadAsync();
        } catch {
          /* swallow — replacement is starting */
        }
      }

      setState((prev) => ({
        ...prev,
        current: { surah, ayah },
        isPlaying: false,
        isLoading: true,
        error: null,
      }));

      const reciterForUrl = getReciterById(stateRef.current.reciterId);
      const url = ayahAudioUrl(reciterForUrl, surah, ayah);

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          onStatus,
        );
        if (!isMountedRef.current) {
          // Provider unmounted while we awaited the network — discard.
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: true,
        }));
      } catch (err) {
        // Network failure, 404, bad MIME, etc. Surface a retryable error
        // rather than freezing the UI.
        console.warn(`[QuranAudio] play ${surah}:${ayah} failed`, err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: `Couldn't load audio for ${surah}:${ayah}. Check your connection.`,
        }));
      }
    },
    [onStatus],
  );

  // Update the ref every time playAyah is reconstructed so the status
  // callback (which only sees the first version via its closure) always
  // dispatches the latest implementation.
  useEffect(() => {
    playAyahRef.current = playAyah;
  }, [playAyah]);

  const togglePlay = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (err) {
      console.warn('[QuranAudio] togglePlay failed', err);
    }
  }, []);

  const next = useCallback(async () => {
    const cur = stateRef.current.current;
    if (!cur) return;
    const nxt = nextAyah(cur.surah, cur.ayah);
    if (!nxt) return;
    await playAyah(nxt.surah, nxt.ayah);
  }, [playAyah]);

  const prev = useCallback(async () => {
    const cur = stateRef.current.current;
    if (!cur) return;
    const prv = prevAyah(cur.surah, cur.ayah);
    if (!prv) return;
    await playAyah(prv.surah, prv.ayah);
  }, [playAyah]);

  const stop = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {
        /* swallow */
      }
    }
    setState((prev) => ({
      ...prev,
      current: null,
      isPlaying: false,
      isLoading: false,
      error: null,
    }));
  }, []);

  const retry = useCallback(async () => {
    const cur = stateRef.current.current;
    if (!cur) return;
    await playAyah(cur.surah, cur.ayah);
  }, [playAyah]);

  const setReciter = useCallback(
    (id: string) => {
      if (!RECITERS.some((r) => r.id === id)) return;
      prefs.set(RECITER_PREF_KEY, id);
      setState((prev) => ({ ...prev, reciterId: id }));
      // If audio is playing, swap to the new reciter for the same ayah so
      // the change is audible immediately.
      const cur = stateRef.current.current;
      if (cur) {
        void playAyah(cur.surah, cur.ayah);
      }
    },
    [playAyah],
  );

  const isAyahActive = useCallback((surah: number, ayah: number) => {
    const cur = stateRef.current.current;
    return !!cur && cur.surah === surah && cur.ayah === ayah;
  }, []);

  const value: QuranAudioCtx = {
    ...state,
    reciter,
    reciters: RECITERS,
    setReciter,
    playAyah,
    togglePlay,
    next,
    prev,
    stop,
    retry,
    isAyahActive,
  };

  return (
    <QuranAudioContext.Provider value={value}>
      {children}
    </QuranAudioContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuranAudio(): QuranAudioCtx {
  const ctx = useContext(QuranAudioContext);
  if (!ctx) {
    throw new Error('useQuranAudio must be used inside QuranAudioProvider');
  }
  return ctx;
}
