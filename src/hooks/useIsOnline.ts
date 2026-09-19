import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { R2_HADITHS_BASE_URL } from '../services/hadiths';

// Android reports "internet validated" natively, so NetInfo never probes a URL
// there. iOS has no such flag, so the library polls a URL from JS for the rest
// of the session once anyone subscribes (60 s when reachable, 5 s when not).
// Its default target is Google's generate_204; point it at our own content CDN
// so the app contacts no extra third party (privacy policy §3). A 1.4 KB
// index file with a HEAD request keeps it as cheap as the default.
NetInfo.configure({
  reachabilityUrl: `${R2_HADITHS_BASE_URL}/index.json`,
  reachabilityMethod: 'HEAD',
  reachabilityTest: (response) => Promise.resolve(response.status === 200),
});

/**
 * Subscribes to NetInfo and reports a boolean for offline-aware UI.
 * Treats `isInternetReachable === false` as offline; an unknown reachability
 * (`null`) is treated as online to avoid false negatives on first probe.
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    return unsub;
  }, []);
  return isOnline;
}
