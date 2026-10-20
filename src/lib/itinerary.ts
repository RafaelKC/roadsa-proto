// Motor de planejamento do roteiro. É a lógica de negócio do produto: o mapa
// só VISUALIZA o que este módulo decide (ver AGENT.md). Sem dependência de React/Mapbox.

export type Destination = { name: string; days: number; address?: string }; // address: hospedagem (opcional), usada nos links de navegação

// Perfil individual de piloto/moto — grupos com resistência diferente por pessoa
// podem cadastrar mais de um; o limite efetivo do grupo é sempre o mais conservador.
export type PilotProfile = { id: string; name: string; maxHours: number; maxKm: number };

export type NotifyChannel = "app" | "whatsapp" | "telegram";
// Frequência dos alertas: pedido de quem não quer "notificação a toda hora".
export type NotifyLevel = "essenciais" | "todos" | "resumo";
export type Vehicle = "carro" | "moto";
// Critérios que o viajante quer ver nas paradas (bebê, pet, foto, segurança).
export type StopNeed = "bebe" | "pet" | "foto" | "seguro";
export type Emergency = { name: string; phone: string; checkIn: boolean };

export type TripState = {
  origin: string;
  roundTrip: boolean; // circular: volta à origem depois do último destino
  destinations: Destination[];
  maxHours: number;
  maxKm: number;
  startDate: string; // YYYY-MM-DD
  roadType: { surface: "asfalto" | "terra"; style: "rapida" | "cenica" };
  pilots: PilotProfile[];
  notifyChannel: NotifyChannel;
  notifyLevel: NotifyLevel;
  beginnerMode: boolean;
  vehicle: Vehicle;
  travelers: number; // pessoas que dividem o custo
  avoidTolls: boolean;
  lodgingPerNight: number; // diária média (R$, total do grupo); 0 = não informado
  restEveryHours: number; // 0 = sem pausas fixas
  stopNeeds: StopNeed[];
  departureTime: string; // HH:MM padrão de todos os dias
  departures: Record<number, string>; // saída específica por dia (número do dia → HH:MM)
  emergency: Emergency;
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
  // Placeholder (hash): trecho isolado / sem sinal de celular — pedido de quem viaja só.
  noSignal: boolean;
  restStops: number; // pausas dentro do dia, conforme `restEveryHours`
  departure: string; // HH:MM
  arrival: string; // HH:MM (inclui as pausas); "+1" se passar da meia-noite
  fuelCost: number;
  tollCost: number;
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

// `generic`: parada sem cidade real (placeholder) — o mapa a posiciona entre as vizinhas, sem geocodificar.
export type MapStop = { name: string; kind: "origin" | "destino" | "parada"; generic?: boolean };

export type Cost = { fuel: number; toll: number; lodging: number; total: number; perPerson: number; perDay: number };

export type Itinerary = {
  items: ItineraryItem[];
  mapStops: MapStop[];
  totals: { km: number; days: number; hours: number };
  cost: Cost;
  // Perfil de piloto que está puxando o limite diário do grupo para baixo (null = ninguém).
  limitedBy: string | null;
};

const GENERIC_STOP = "Parada intermediária";

export const SPEED_KMH = 75; // velocidade média assumida pro cálculo de horas de direção
export const REST_MINUTES = 15; // duração assumida de cada pausa

// Premissas de custo (placeholder de demo, como as distâncias): consumo médio, preço do litro
// e pedágio médio por km. Moto paga metade do pedágio de carro.
export const COST_ASSUMPTIONS = {
  kmPerLiter: { carro: 12, moto: 25 } as Record<Vehicle, number>,
  fuelPrice: 6.3,
  tollPerKm: { carro: 0.09, moto: 0.045 } as Record<Vehicle, number>,
  tollDetourFactor: 1.08, // só no fallback sem Directions: "evitar pedágios" alonga o caminho em ~8%
};

export const DEFAULT_TRIP: TripState = {
  origin: "Curitiba, PR",
  roundTrip: false,
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
  notifyLevel: "essenciais",
  beginnerMode: false,
  vehicle: "carro",
  travelers: 2,
  avoidTolls: false,
  lodgingPerNight: 0,
  restEveryHours: 0,
  stopNeeds: [],
  departureTime: "08:00",
  departures: {},
  emergency: { name: "", phone: "", checkIn: false },
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

// Distâncias reais (Directions) por "origem|destino"; quando faltam, cai na tabela fixa e depois no hash.
export type Distances = Record<string, number>;

function getDistance(a: string, b: string, avoidTolls: boolean, real?: Distances): number {
  const key = a + "|" + b;
  if (real?.[key] != null) return real[key];
  const km = DIST_TABLE[key] ?? estimateKm(a, b);
  return avoidTolls ? Math.round(km * COST_ASSUMPTIONS.tollDetourFactor) : km;
}

function formatClock(totalMinutes: number): string {
  const day = Math.floor(totalMinutes / 1440);
  const m = Math.round(totalMinutes) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}${day > 0 ? " (+1)" : ""}`;
}

// "11:00" → "11:00 (manhã)": evita dúvida entre manhã e tarde.
export function withPeriod(clock: string): string {
  const h = Number(clock.slice(0, 2));
  const period = h < 6 ? "madrugada" : h < 12 ? "manhã" : h < 18 ? "tarde" : "noite";
  return `${clock} (${period})`;
}

function parseClock(value: string | undefined, fallback: number): number {
  const m = value ? /^(\d{1,2}):(\d{2})$/.exec(value) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function getWaypoints(a: string, b: string, count: number): string[] {
  const table = WAYPOINT_TABLE[a + "|" + b] ?? [];
  return Array.from({ length: Math.max(0, count) }, (_, i) => table[i] ?? `${GENERIC_STOP} ${i + 1}`);
}

// Sequência de cidades da rota; em rota circular a origem se repete no fim.
export function routeNames(state: TripState): string[] {
  const names = [state.origin, ...state.destinations.map((d) => d.name)];
  return state.roundTrip && state.destinations.length ? [...names, state.origin] : names;
}

export function buildItinerary(state: TripState, distances?: Distances): Itinerary {
  const chain = routeNames(state);
  const items: ItineraryItem[] = [];
  const mapStops: MapStop[] = [{ name: state.origin, kind: "origin" }];
  let dayCounter = 1;
  let totalKm = 0;
  let totalHours = 0;
  let fuelTotal = 0;
  let tollTotal = 0;
  const defaultDeparture = parseClock(state.departureTime, 8 * 60);
  const { kmPerLiter, fuelPrice, tollPerKm } = COST_ASSUMPTIONS;

  // Com mais de um piloto/moto cadastrado, o limite do grupo é o mais conservador entre eles.
  const groupMaxHours = state.pilots.length
    ? Math.min(state.maxHours, ...state.pilots.map((p) => p.maxHours))
    : state.maxHours;
  const groupMaxKm = state.pilots.length
    ? Math.min(state.maxKm, ...state.pilots.map((p) => p.maxKm))
    : state.maxKm;
  const baseLimit = Math.min(state.maxKm, state.maxHours * SPEED_KMH);
  const strictest = state.pilots.reduce<PilotProfile | null>((acc, p) => {
    const lim = Math.min(p.maxKm, p.maxHours * SPEED_KMH);
    return lim < baseLimit && (!acc || lim < Math.min(acc.maxKm, acc.maxHours * SPEED_KMH)) ? p : acc;
  }, null);
  const limitedBy = strictest?.name ?? null;

  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    const km = getDistance(from, to, state.avoidTolls, distances);
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
      const departMinutes = parseClock(state.departures[dayCounter], defaultDeparture);
      const restStops = state.restEveryHours > 0 ? Math.max(0, Math.ceil(segHours / state.restEveryHours) - 1) : 0;
      const fuelCost = (segKm / kmPerLiter[state.vehicle]) * fuelPrice;
      const tollCost = state.avoidTolls ? 0 : segKm * tollPerKm[state.vehicle];
      totalKm += segKm;
      totalHours += segHours;
      fuelTotal += fuelCost;
      tollTotal += tollCost;
      mapStops.push({ name: segTo, generic: !isLast && segTo.startsWith(GENERIC_STOP), kind: !isLast ? "parada" : i === state.destinations.length ? "origin" : "destino" });
      items.push({
        type: "travel", day: dayCounter, from: segFrom, to: segTo,
        km: segKm, hours: segHours, isIntermediateStop: !isLast,
        mapIndex: mapStops.length - 1,
        roadAlert: hashStr(segFrom + "|" + segTo) % 7 === 0,
        noSignal: hashStr(segTo + "|" + segFrom) % 5 === 0,
        restStops,
        departure: formatClock(departMinutes),
        arrival: formatClock(departMinutes + segHours * 60 + restStops * REST_MINUTES),
        fuelCost, tollCost,
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

  const days = dayCounter - 1;
  const lodging = Math.max(0, days - 1) * Math.max(0, state.lodgingPerNight); // 1 noite por dia, menos o último
  const total = fuelTotal + tollTotal + lodging;
  const travelers = Math.max(1, state.travelers);
  return {
    items, mapStops,
    totals: { km: totalKm, days, hours: Math.round(totalHours) },
    cost: { fuel: fuelTotal, toll: tollTotal, lodging, total, perPerson: total / travelers, perDay: days ? total / days : 0 },
    limitedBy,
  };
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
