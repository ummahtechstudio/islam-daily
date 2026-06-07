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
  playRange: (surah: number, ayahStart: number, ayahEnd: number) => Promise<void>;
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

  // Bounded playback (e.g. Al-Fatiha in the Namaz guide): when set,
  // auto-advance stops after this ayah instead of rolling on through the
  // rest of the Quran. Direct playAyah calls clear it; startAyah preserves
  // it so the range survives auto-advance, next/prev, and reciter swaps.
  const rangeEndRef = useRef<Playing | null>(null);

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
      const end = rangeEndRef.current;
      if (end && cur.surah === end.surah && cur.ayah === end.ayah) {
        // Reached the end of a bounded range — stop instead of advancing.
        rangeEndRef.current = null;
        setState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }
      const nxt = nextAyah(cur.surah, cur.ayah);
      if (!nxt) {
        // End of Quran — stop cleanly.
        setState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }
      void playAyahRef.current(nxt.surah, nxt.ayah);
    }
  }, []);

  // Core load-and-play. Deliberately does NOT touch rangeEndRef — it is the
  // path auto-advance, next/prev, retry, and reciter swaps go through, all of
  // which must preserve an active bounded range.
  const startAyah = useCallback(
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

  // Update the ref every time startAyah is reconstructed so the status
  // callback (which only sees the first version via its closure) always
  // dispatches the latest implementation.
  useEffect(() => {
    playAyahRef.current = startAyah;
  }, [startAyah]);

  // Public play: a direct user tap escapes any active bounded range.
  const playAyah = useCallback(
    async (surah: number, ayah: number) => {
      rangeEndRef.current = null;
      await startAyah(surah, ayah);
    },
    [startAyah],
  );

  // Bounded play: start at ayahStart and stop after ayahEnd (inclusive).
  // Used by the Namaz guide so Al-Fatiha stops at 1:7 instead of rolling
  // into Al-Baqarah.
  const playRange = useCallback(
    async (surah: number, ayahStart: number, ayahEnd: number) => {
      rangeEndRef.current = { surah, ayah: ayahEnd };
      await startAyah(surah, ayahStart);
    },
    [startAyah],
  );

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
    await startAyah(nxt.surah, nxt.ayah);
  }, [startAyah]);

  const prev = useCallback(async () => {
    const cur = stateRef.current.current;
    if (!cur) return;
    const prv = prevAyah(cur.surah, cur.ayah);
    if (!prv) return;
    await startAyah(prv.surah, prv.ayah);
  }, [startAyah]);

  const stop = useCallback(async () => {
    rangeEndRef.current = null;
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
    await startAyah(cur.surah, cur.ayah);
  }, [startAyah]);

  const setReciter = useCallback(
    (id: string) => {
      if (!RECITERS.some((r) => r.id === id)) return;
      prefs.set(RECITER_PREF_KEY, id);
      setState((prev) => ({ ...prev, reciterId: id }));
      // If audio is playing, swap to the new reciter for the same ayah so
      // the change is audible immediately.
      const cur = stateRef.current.current;
      if (cur) {
        void startAyah(cur.surah, cur.ayah);
      }
    },
    [startAyah],
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
    playRange,
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
