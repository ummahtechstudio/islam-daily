import { useState, useEffect, useCallback } from 'react';
import { fetchPrayerTimes, PrayerTimesData } from '../services/api';
import { LocationData } from './useLocation';

const DISPLAYED_PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = typeof DISPLAYED_PRAYERS[number];

export interface NextPrayer {
  name: PrayerName;
  time: string;
  minutesLeft: number;
  secondsLeft: number;
}

function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function getNextPrayer(timings: Record<string, string>): NextPrayer | null {
  const now = new Date();

  for (const name of DISPLAYED_PRAYERS) {
    const t = parseTime(timings[name]);
    if (t > now) {
      const diffMs = t.getTime() - now.getTime();
      return {
        name,
        time: timings[name],
        minutesLeft: Math.floor(diffMs / 60000),
        secondsLeft: Math.floor(diffMs / 1000),
      };
    }
  }

  // All prayers passed — next is Fajr tomorrow
  const fajr = parseTime(timings['Fajr']);
  fajr.setDate(fajr.getDate() + 1);
  const diffMs = fajr.getTime() - now.getTime();
  return {
    name: 'Fajr',
    time: timings['Fajr'],
    minutesLeft: Math.floor(diffMs / 60000),
    secondsLeft: Math.floor(diffMs / 1000),
  };
}

export function usePrayerTimes(location: LocationData | null, method = 4) {
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPrayerTimes(location.latitude, location.longitude, method);
      setData(result);
      setNextPrayer(getNextPrayer(result.timings));
    } catch (err) {
      setError('Failed to load prayer times');
    } finally {
      setLoading(false);
    }
  }, [location, method]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update countdown every second
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      setNextPrayer(getNextPrayer(data.timings));
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  return { data, nextPrayer, loading, error, refresh };
}
