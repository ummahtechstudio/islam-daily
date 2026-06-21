// Shared fetch helper with timeout + offline detection used by features that
// require an internet connection (Mosque Finder, Halal Finder, etc).

export const OFFLINE_MESSAGE = 'Internet required for this feature. Please connect and retry.';

export class OfflineError extends Error {
  constructor() {
    super(OFFLINE_MESSAGE);
    this.name = 'OfflineError';
  }
}

// Reject a promise that doesn't settle within `ms`. Used to bound calls that
// have no built-in timeout (e.g. Location.getCurrentPositionAsync, which can
// hang indefinitely on a cold/indoor GPS fix) so callers can show an error +
// retry instead of an infinite spinner.
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (e: any) {
    // AbortError or "Network request failed" → treat as offline. Servers that
    // explicitly reject (HTTP 4xx/5xx) return a Response and don't reach here.
    if (e?.name === 'AbortError' || /network|failed|timeout/i.test(String(e?.message))) {
      throw new OfflineError();
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
