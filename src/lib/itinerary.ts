// Motor de planejamento do roteiro. É a lógica de negócio do produto: o mapa
// só VISUALIZA o que este módulo decide (ver AGENT.md). Sem dependência de React/Mapbox.

export type Destination = { name: string; days: number };

// Perfil individual de piloto/moto — grupos com resistência diferente por pessoa
// podem cadastrar mais de um; o limite efetivo do grupo é sempre o mais conservador.
export type PilotProfile = { id: string; name: string; maxHours: number; maxKm: number };

export type NotifyChannel = "app" | "whatsapp" | "telegram";

export type TripState = {
  origin: string;
  destinations: Destination[];
  maxHours: number;
  maxKm: number;
  startDate: string; // YYYY-MM-DD
  roadType: { surface: "asfalto" | "terra"; style: "rapida" | "cenica" };
  pilots: PilotProfile[];
  notifyChannel: NotifyChannel;
  beginnerMode: boolean;
};

export type TravelItem = {
  type: "travel";
  day: number;
  from: string;
  to: string;
  km: number;
  hours: number;
  isIntermediateStop: boolean;
  mapIndex: number;
  // Placeholder de demo para alerta de condição de estrada em tempo real (pedido de entrevista).
  // Determinístico por hash do trecho — a integração real viria de um provedor de trânsito/clima.
  roadAlert: boolean;
};
export type StayItem = {
  type: "stay";
  dayStart: number;
  dayEnd: number;
  place: string;
  days: number;
  mapIndex: number;
};
export type ItineraryItem = TravelItem | StayItem;

export type MapStop = { name: string; kind: "origin" | "destino" | "parada" };

export type Itinerary = {
  items: ItineraryItem[];
  mapStops: MapStop[];
  totals: { km: number; days: number; hours: number };
};

export const SPEED_KMH = 75; // velocidade média assumida pro cálculo de horas de direção

export const DEFAULT_TRIP: TripState = {
  origin: "Curitiba, PR",
  destinations: [
    { name: "Florianópolis, SC", days: 3 },
    { name: "Foz do Iguaçu, PR", days: 2 },
    { name: "Bonito, MS", days: 4 },
  ],
  maxHours: 6,
  maxKm: 500,
  startDate: "2026-10-12",
  roadType: { surface: "asfalto", style: "rapida" },
  pilots: [],
  notifyChannel: "app",
  beginnerMode: false,
};

const DIST_TABLE: Record<string, number> = {
  "Curitiba, PR|Florianópolis, SC": 300,
  "Florianópolis, SC|Foz do Iguaçu, PR": 940,
  "Foz do Iguaçu, PR|Bonito, MS": 700,
};
const WAYPOINT_TABLE: Record<string, string[]> = {
  "Florianópolis, SC|Foz do Iguaçu, PR": ["Chapecó, SC"],
  "Foz do Iguaçu, PR|Bonito, MS": ["Dourados, MS"],
};

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Placeholder de demo: pares fora da tabela ganham um km determinístico (180–829).
// É isto que a Directions API real substituiria no produto final.
function estimateKm(a: string, b: string): number {
  return 180 + (hashStr(a + "|" + b) % 650);
}

function getDistance(a: string, b: string): number {
  return DIST_TABLE[a + "|" + b] ?? estimateKm(a, b);
}

function getWaypoints(a: string, b: string, count: number): string[] {
  const table = WAYPOINT_TABLE[a + "|" + b] ?? [];
  return Array.from({ length: Math.max(0, count) }, (_, i) => table[i] ?? `Parada intermediária ${i + 1}`);
}

export function buildItinerary(state: TripState): Itinerary {
  const chain = [state.origin, ...state.destinations.map((d) => d.name)];
  const items: ItineraryItem[] = [];
  const mapStops: MapStop[] = [{ name: state.origin, kind: "origin" }];
  let dayCounter = 1;
  let totalKm = 0;
  let totalHours = 0;

  // Com mais de um piloto/moto cadastrado, o limite do grupo é o mais conservador entre eles.
  const groupMaxHours = state.pilots.length
    ? Math.min(state.maxHours, ...state.pilots.map((p) => p.maxHours))
    : state.maxHours;
  const groupMaxKm = state.pilots.length
    ? Math.min(state.maxKm, ...state.pilots.map((p) => p.maxKm))
    : state.maxKm;

  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    const km = getDistance(from, to);
    const effectiveMaxKm = Math.max(80, Math.min(groupMaxKm, groupMaxHours * SPEED_KMH));
    const numDays = Math.max(1, Math.ceil(km / effectiveMaxKm));
    const perDayKm = km / numDays;
    const waypoints = getWaypoints(from, to, numDays - 1);

    let segFrom = from;
    for (let d = 0; d < numDays; d++) {
      const isLast = d === numDays - 1;
      const segTo = isLast ? to : waypoints[d];
      const segKm = Math.round(perDayKm);
      const segHours = +(segKm / SPEED_KMH).toFixed(1);
      totalKm += segKm;
      totalHours += segHours;
      mapStops.push({ name: segTo, kind: isLast ? "destino" : "parada" });
      items.push({
        type: "travel", day: dayCounter, from: segFrom, to: segTo,
        km: segKm, hours: segHours, isIntermediateStop: !isLast,
        mapIndex: mapStops.length - 1,
        roadAlert: hashStr(segFrom + "|" + segTo) % 7 === 0,
      });
      dayCounter++;
      segFrom = segTo;
    }

    const dest = state.destinations[i];
    if (dest && dest.days > 0) {
      items.push({
        type: "stay", dayStart: dayCounter, dayEnd: dayCounter + dest.days - 1,
        place: to, days: dest.days, mapIndex: mapStops.length - 1,
      });
      dayCounter += dest.days;
    }
  }

  return { items, mapStops, totals: { km: totalKm, days: dayCounter - 1, hours: Math.round(totalHours) } };
}

export function legsInfo(items: ItineraryItem[]): TravelItem[] {
  return items.filter((it): it is TravelItem => it.type === "travel");
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days - 1);
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD no fuso local
}

export function formatDatePt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}
