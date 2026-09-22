import type { Coordinates, Location } from './types';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// Great-circle distance between two points (haversine formula).
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number): string {
  if (km < 1) return '< 1 km';
  return `${Math.round(km)} km`;
}

// Cities the user can pick during onboarding when they don't want to share
// their device location.
export const CITIES: Location[] = [
  { city: 'Copenhagen', lat: 55.6761, lon: 12.5683 },
  { city: 'Aarhus', lat: 56.1629, lon: 10.2039 },
  { city: 'Odense', lat: 55.4038, lon: 10.4024 },
  { city: 'Aalborg', lat: 57.0488, lon: 9.9217 },
  { city: 'Esbjerg', lat: 55.4765, lon: 8.4594 },
  { city: 'Roskilde', lat: 55.6415, lon: 12.0803 },
  { city: 'Kolding', lat: 55.4904, lon: 9.4722 },
  { city: 'Randers', lat: 56.4607, lon: 10.0364 },
];

export function nearestCity(point: Coordinates): Location {
  let best = CITIES[0];
  let bestDistance = Infinity;
  for (const city of CITIES) {
    const d = distanceKm(point, city);
    if (d < bestDistance) {
      best = city;
      bestDistance = d;
    }
  }
  return best;
}

export function isValidCoordinates(point: Coordinates): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}
