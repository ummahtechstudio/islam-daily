import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Returns true when the device appears to have internet connectivity.
 * - Web: uses the native navigator.onLine event system (instant, accurate).
 * - Native: does a lightweight HEAD request on mount and every 30 s.
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsOnline(navigator.onLine);
      const up = () => setIsOnline(true);
      const down = () => setIsOnline(false);
      window.addEventListener('online', up);
      window.addEventListener('offline', down);
      return () => {
        window.removeEventListener('online', up);
        window.removeEventListener('offline', down);
      };
    }

    // Native – lightweight connectivity probe
    let cancelled = false;
    const probe = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4_000);
        await fetch('https://api.aladhan.com/v1/asmaAlHusna?limit=1', {
          method: 'HEAD',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!cancelled) setIsOnline(true);
      } catch {
        if (!cancelled) setIsOnline(false);
      }
    };

    probe();
    const id = setInterval(probe, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return isOnline;
}
