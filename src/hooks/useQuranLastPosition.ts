import { useCallback, useEffect, useRef, useState } from 'react';
import { prefs, PREFS_KEYS } from '../lib/storage';
import { TOTAL_PAGES } from '../utils/quranNav';

export type QuranLastPosition = {
  mode: 'mushaf' | 'translation';
  page?: number;
  surah?: number;
  ayah?: number;
  scrollOffset?: number;
  updatedAt: number;
};

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

function isValidPosition(pos: QuranLastPosition | null): pos is QuranLastPosition {
  if (!pos || typeof pos !== 'object') return false;
  if (pos.mode === 'mushaf') {
    return typeof pos.page === 'number' && pos.page >= 1 && pos.page <= TOTAL_PAGES;
  }
  if (pos.mode === 'translation') {
    return (
      typeof pos.surah === 'number' &&
      pos.surah >= 1 &&
      pos.surah <= 114 &&
      typeof pos.ayah === 'number' &&
      pos.ayah >= 1
    );
  }
  return false;
}

export function readLastPosition(): QuranLastPosition | null {
  const raw = prefs.getJSON<QuranLastPosition>(PREFS_KEYS.QURAN_LAST_POSITION);
  if (!raw || !isValidPosition(raw)) {
    if (raw) {
      console.warn('[QuranLastPosition] discarded invalid stored position', raw);
    }
    return null;
  }
  if (Date.now() - raw.updatedAt > STALE_AFTER_MS) return null;
  return raw;
}

export function writeLastPosition(pos: Omit<QuranLastPosition, 'updatedAt'>): void {
  const next: QuranLastPosition = { ...pos, updatedAt: Date.now() };
  if (!isValidPosition(next)) return;
  prefs.setJSON(PREFS_KEYS.QURAN_LAST_POSITION, next);
}

export function dismissResumeBanner(): void {
  prefs.set(
    PREFS_KEYS.QURAN_LAST_POSITION_DISMISSED_UNTIL,
    String(Date.now() + DISMISS_DURATION_MS),
  );
}

function readDismissedUntil(): number {
  const raw = prefs.get(PREFS_KEYS.QURAN_LAST_POSITION_DISMISSED_UNTIL);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Returns the current resume banner state. Re-reads on `version` change so
 * callers can force a refresh after dismissing or after a save.
 */
export function useResumeBanner(): {
  position: QuranLastPosition | null;
  dismiss: () => void;
  refresh: () => void;
} {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const [position, setPosition] = useState<QuranLastPosition | null>(null);

  useEffect(() => {
    const stored = readLastPosition();
    const dismissedUntil = readDismissedUntil();
    if (!stored || Date.now() < dismissedUntil) {
      setPosition(null);
    } else {
      setPosition(stored);
    }
  }, [version]);

  const dismiss = useCallback(() => {
    dismissResumeBanner();
    setPosition(null);
  }, []);

  return { position, dismiss, refresh };
}

/**
 * Debounced writer hook. Returns a stable function callers can invoke
 * frequently (e.g. on every page change or scroll tick); the actual MMKV
 * write is debounced by `delay`.
 */
export function useDebouncedPositionWriter(delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Omit<QuranLastPosition, 'updatedAt'> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) writeLastPosition(pending);
  }, []);

  const schedule = useCallback(
    (pos: Omit<QuranLastPosition, 'updatedAt'>) => {
      pendingRef.current = pos;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const p = pendingRef.current;
        pendingRef.current = null;
        if (p) writeLastPosition(p);
      }, delay);
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      // Flush on unmount so a position update isn't lost when user navigates away.
      flush();
    };
  }, [flush]);

  return { schedule, flush };
}
