// Shared fetch helper with timeout + offline detection used by features that
// require an internet connection (Mosque Finder, Halal Finder, etc).

export const OFFLINE_MESSAGE = 'Internet required for this feature. Please connect and retry.';

export class OfflineError extends Error {
  constructor() {
    super(OFFLINE_MESSAGE);
    this.name = 'OfflineError';
  }
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
