import { useEffect, useState } from 'react';
import {
  downloadFullQuran,
  isQuranCached,
  type DownloadProgress,
} from '../services/quranCache';
import { useIsOnline } from './useIsOnline';

type State = {
  cached: boolean;
  progress: DownloadProgress | null;
  error: Error | null;
};

type Listener = (s: State) => void;

let state: State = {
  cached: isQuranCached(),
  progress: null,
  error: null,
};
let inFlight = false;
// Tracks the previous isOnline so we can detect offline→online transitions
// and auto-retry a previously failed download without user intervention.
let wasOnline = true;
const listeners = new Set<Listener>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

function startIfNeeded(isOnline: boolean) {
  if (state.cached || inFlight || !isOnline || state.error) return;
  inFlight = true;
  setState({ progress: null });
  downloadFullQuran((p) => setState({ progress: p }))
    .then(() => {
      inFlight = false;
      setState({ cached: true });
    })
    .catch((e: unknown) => {
      inFlight = false;
      const err = e instanceof Error ? e : new Error('Download failed');
      setState({ error: err });
    });
}

export function useQuranDownload() {
  const isOnline = useIsOnline();
  const [s, setS] = useState<State>(state);

  useEffect(() => {
    const l: Listener = (next) => setS(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  useEffect(() => {
    // When connectivity returns after a previous failure, clear the error and
    // retry automatically — otherwise the user is stuck having to tap "Retry"
    // even though the network came back on its own.
    const cameOnline = !wasOnline && isOnline;
    wasOnline = isOnline;
    if (cameOnline && state.error && !state.cached) {
      setState({ error: null });
    }
    startIfNeeded(isOnline);
  }, [isOnline]);

  return {
    cached: s.cached,
    progress: s.progress,
    error: s.error,
    isOnline,
    retry: () => {
      setState({ error: null });
      // Defer to next tick so state subscribers see the cleared error before
      // we attempt the next start.
      setTimeout(() => startIfNeeded(isOnline), 0);
    },
  };
}
