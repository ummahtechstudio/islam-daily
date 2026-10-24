import citiesData from '../../assets/data/cities.json';

type CityEntry = {
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

const CITIES = citiesData as CityEntry[];

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Nearest bundled city (assets/data/cities.json) and its distance in km. */
export function nearestBundledCity(
  latitude: number,
  longitude: number,
): { city: CityEntry; km: number } | null {
  let best: { city: CityEntry; km: number } | null = null;
  for (const city of CITIES) {
    const km = distanceKm(latitude, longitude, city.latitude, city.longitude);
    if (!best || km < best.km) best = { city, km };
  }
  return best;
}
