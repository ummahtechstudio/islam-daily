/**
 * Returns a short human-readable description of how long ago a timestamp was.
 * Examples: "today", "yesterday", "3 days ago", "2 weeks ago".
 *
 * Buckets are intentionally coarse — this is meant for footer labels like
 * "Updated 2 days ago", not precise relative timers.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return 'just now';
  if (diff < hour) {
    const m = Math.floor(diff / minute);
    return m === 1 ? '1 minute ago' : `${m} minutes ago`;
  }
  if (diff < day) {
    const h = Math.floor(diff / hour);
    return h === 1 ? '1 hour ago' : `${h} hours ago`;
  }
  if (diff < 2 * day) return 'yesterday';
  if (diff < week) {
    const d = Math.floor(diff / day);
    return `${d} days ago`;
  }
  if (diff < 4 * week) {
    const w = Math.floor(diff / week);
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  const months = Math.floor(diff / (30 * day));
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(diff / (365 * day));
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
