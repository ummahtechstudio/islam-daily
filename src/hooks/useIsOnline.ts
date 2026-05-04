import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

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
