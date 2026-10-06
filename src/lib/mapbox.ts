// Chamadas à API do Mapbox (Geocoding, Directions, Search Box) com cache em memória.
// O token é público (NEXT_PUBLIC_*), exposto no client por desenho do Mapbox GL JS.
import { hashStr } from "@/lib/itinerary";

export type LngLat = [number, number];

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const MAP_STYLES = {
  light: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

// ---------- Geocoding ----------
const CITY_COORDS: Record<string, LngLat> = {
  "Curitiba, PR": [-49.2733, -25.4284],
  "Florianópolis, SC": [-48.548, -27.5954],
  "Chapecó, SC": [-52.6152, -27.1004],
  "Foz do Iguaçu, PR": [-54.5882, -25.5478],
  "Dourados, MS": [-54.8056, -22.2211],
  "Bonito, MS": [-56.4836, -21.1261],
};
const geocodeCache: Record<string, LngLat> = { ...CITY_COORDS };
const pendingGeocodes = new Set<string>();

// Fallback determinístico: usado enquanto a geocodificação real não responde (ou se falhar).
export function estimateCoords(name: string): LngLat {
  const lat = -33 + (hashStr(name + "|lat") % 3800) / 100;
  const lng = -73 + (hashStr(name + "|lng") % 3900) / 100;
  return [lng, lat];
}

export function cacheCoords(name: string, coords: LngLat) {
  geocodeCache[name] = coords;
}

// Retorna na hora (cache ou fallback) e dispara a geocodificação real em background;
// `onResolved` é chamado quando a cidade nova for resolvida.
export function getCoords(name: string, onResolved: () => void): LngLat {
  if (geocodeCache[name]) return geocodeCache[name];
  if (MAPBOX_TOKEN && !pendingGeocodes.has(name)) {
    pendingGeocodes.add(name);
    fetchJson<{ features?: { center: LngLat }[] }>(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(name)}.json` +
        `?access_token=${MAPBOX_TOKEN}&country=br&language=pt&limit=1`,
    ).then((data) => {
      pendingGeocodes.delete(name);
      const center = data?.features?.[0]?.center;
      if (center) {
        geocodeCache[name] = center;
        onResolved();
      }
    });
  }
  return estimateCoords(name);
}

export type CitySuggestion = { name: string; center: LngLat };

export async function fetchCitySuggestions(query: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
  if (!MAPBOX_TOKEN || !query.trim()) return [];
  const data = await fetchJson<{ features?: { place_name: string; center: LngLat }[] }>(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${MAPBOX_TOKEN}&country=br&language=pt&types=place&autocomplete=true&limit=6`,
    signal,
  );
  return (data?.features ?? []).map((f) => ({ name: f.place_name, center: f.center }));
}

// ---------- Directions (trajeto real por trecho) ----------
const directionsCache = new Map<string, Promise<LngLat[] | null>>();

export function getRouteLeg(a: LngLat, b: LngLat, style: "rapida" | "cenica"): Promise<LngLat[] | null> {
  const key = `${a}|${b}|${style}`;
  let p = directionsCache.get(key);
  if (!p) {
    // "cênica" evita rodovias (exclude=motorway) — proxy razoável sem dado de tipo de via.
    const exclude = style === "cenica" ? "&exclude=motorway" : "";
    p = MAPBOX_TOKEN
      ? fetchJson<{ routes?: { geometry: { coordinates: LngLat[] } }[] }>(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${a};${b}` +
            `?geometries=geojson&overview=full${exclude}&access_token=${MAPBOX_TOKEN}`,
        ).then((d) => d?.routes?.[0]?.geometry.coordinates ?? null)
      : Promise.resolve(null);
    directionsCache.set(key, p);
  }
  return p;
}

// ---------- POIs nas paradas (posto / restaurante / hotel) ----------
export const POI_CATEGORIES = [
  { key: "gas", category: "gas_station", icon: "⛽" },
  { key: "food", category: "restaurant", icon: "🍽️" },
  { key: "hotel", category: "hotel", icon: "🏨" },
] as const;
export type PoiCategory = (typeof POI_CATEGORIES)[number];
export type Poi = { name: string; center: LngLat };

const poiCache = new Map<string, Promise<Poi | null>>();

export function getPOI(stopName: string, coords: LngLat, category: PoiCategory): Promise<Poi | null> {
  const key = `${stopName}|${category.key}`;
  let p = poiCache.get(key);
  if (!p) {
    p = MAPBOX_TOKEN
      ? fetchJson<{ features?: { properties: { name: string }; geometry: { coordinates: LngLat } }[] }>(
          `https://api.mapbox.com/search/searchbox/v1/category/${category.category}` +
            `?proximity=${coords[0]},${coords[1]}&language=pt&country=br&limit=1&access_token=${MAPBOX_TOKEN}`,
        ).then((d) => {
          const f = d?.features?.[0];
          return f ? { name: f.properties.name, center: f.geometry.coordinates } : null;
        })
      : Promise.resolve(null);
    poiCache.set(key, p);
  }
  return p;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
