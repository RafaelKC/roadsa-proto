"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StartStep } from "@/components/planner/start-step";
import { TripForm } from "@/components/planner/trip-form";
import { ItineraryHeader, Timeline } from "@/components/planner/itinerary-view";
import { TripList } from "@/components/planner/trip-list";
import { TripMap } from "@/components/planner/trip-map";
import { Button } from "@/components/ui/button";
import { buildItinerary, legsInfo, routeNames, type Distances, type TripState } from "@/lib/itinerary";
import { getCoords, getLegDistanceKm, isGeocoded } from "@/lib/mapbox";
import { SAMPLE_SAVED_TRIPS, blankTrip, type SavedTrip } from "@/lib/saved-trips";

function titleFor(trip: TripState): string {
  const last = trip.destinations[trip.destinations.length - 1]?.name ?? trip.origin;
  return `${trip.origin.split(",")[0]} → ${last.split(",")[0]}`;
}

const pairKey = (from: string, to: string, t: TripState) => `${from}|${to}|${t.roadType.style}|${t.avoidTolls}`;

function tripPairs(t: TripState): [string, string][] {
  const names = routeNames(t);
  return names.slice(0, -1).map((from, i): [string, string] => [from, names[i + 1]]).filter(([a, b]) => a && b && a !== b);
}

// Distâncias reais por trecho (Directions). Enquanto não chegam, o motor usa a estimativa fixa.
function useRealDistances(trips: TripState[]) {
  const [real, setReal] = useState<Record<string, number>>({});
  const [geoTick, setGeoTick] = useState(0);
  const bump = useCallback(() => setGeoTick((n) => n + 1), []);
  const signature = JSON.stringify(trips.map((t) => [routeNames(t), t.roadType.style, t.avoidTolls]));

  useEffect(() => {
    for (const t of JSON.parse(signature) as [string[], "rapida" | "cenica", boolean][] ) {
      const [names, style, avoidTolls] = t;
      for (let i = 0; i < names.length - 1; i++) {
        const [from, to] = [names[i], names[i + 1]];
        if (!from || !to || from === to) continue;
        const a = getCoords(from, bump);
        const b = getCoords(to, bump);
        if (!isGeocoded(from) || !isGeocoded(to)) continue; // ainda no fallback: não pedir rota
        const key = `${from}|${to}|${style}|${avoidTolls}`;
        getLegDistanceKm(a, b, style, avoidTolls).then((km) => {
          if (km != null) setReal((prev) => (prev[key] === km ? prev : { ...prev, [key]: km }));
        });
      }
    }
  }, [signature, geoTick, bump]);

  const distancesFor = useCallback((t: TripState): Distances => {
    const out: Distances = {};
    for (const [a, b] of tripPairs(t)) {
      const km = real[pairKey(a, b, t)];
      if (km != null) out[`${a}|${b}`] = km;
    }
    return out;
  }, [real]);
  // sem token do Mapbox as distâncias nunca ficam reais: mostramos como aproximadas
  const isExact = useCallback((t: TripState) => tripPairs(t).every(([a, b]) => real[pairKey(a, b, t)] != null), [real]);
  return { distancesFor, isExact };
}

export function Planner() {
  const [trips, setTrips] = useState<SavedTrip[]>(SAMPLE_SAVED_TRIPS);
  const [trip, setTrip] = useState<TripState>(blankTrip());
  const [view, setView] = useState<"list" | "start" | "form" | "itinerary">("list");
  const [activeIndex, setActiveIndex] = useState(-1);
  const editingId = useRef<string | null>(null);

  const { distancesFor, isExact } = useRealDistances([trip, ...trips.map((s) => s.trip)]);
  const itinerary = useMemo(() => buildItinerary(trip, distancesFor(trip)), [trip, distancesFor]);
  const exact = isExact(trip);
  const legs = useMemo(() => legsInfo(itinerary.items), [itinerary]);

  function openList() { setView("list"); }
  function createTrip() { editingId.current = null; setTrip(blankTrip()); setView("start"); }
  function openSavedTrip(saved: SavedTrip) { editingId.current = saved.id; setTrip(saved.trip); setActiveIndex(-1); setView("itinerary"); }
  function generate() {
    setActiveIndex(-1);
    setView("itinerary");
    // id/ref resolvidos aqui fora: o updater do setState precisa ser puro (StrictMode o invoca 2x em dev).
    if (editingId.current) {
      const id = editingId.current;
      setTrips((prev) => prev.map((s) => (s.id === id ? { ...s, trip } : s)));
    } else {
      const id = `trip-${Date.now()}`;
      editingId.current = id;
      setTrips((prev) => [...prev, { id, title: titleFor(trip), trip }]);
    }
  }

  const step = view === "list"
    ? { n: 1, title: "Minhas rotas" }
    : view === "start"
    ? { n: 2, title: "Origem e tipo de rota" }
    : view === "form"
    ? { n: 3, title: "Destinos e restrições da viagem" }
    : { n: 4, title: "Roteiro gerado" };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b bg-card px-7 py-2">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <Button variant="ghost" size="sm" onClick={openList}>← Minhas rotas</Button>
          )}
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Passo {step.n} de 4</div>
            <div className="text-sm font-bold">{step.title}</div>
          </div>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`size-2 rounded-full ${n === step.n ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>

      {view === "list" ? (
        <TripList trips={trips} distancesFor={distancesFor} isExact={isExact} onOpen={openSavedTrip} onCreate={createTrip} />
      ) : view === "start" ? (
        <StartStep trip={trip} onChange={setTrip} onNext={() => setView("form")} />
      ) : view === "form" ? (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="min-h-0 w-full flex-1 overflow-y-auto border-t bg-card md:w-[420px] md:flex-none md:border-t-0 md:border-r">
            <TripForm
              trip={trip}
              onChange={setTrip}
              totalDays={itinerary.totals.days}
              cost={itinerary.cost}
              onGenerate={generate}
            />
          </aside>
          {/* no celular o mapa fica fixo no topo, sempre à vista enquanto o formulário rola */}
          <div className="order-first h-56 shrink-0 bg-muted md:order-last md:h-auto md:flex-1">
            <TripMap stops={itinerary.mapStops} legs={legs} routeStyle={trip.roadType.style} avoidTolls={trip.avoidTolls} showControls />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ItineraryHeader trip={trip} itinerary={itinerary} onBack={() => setView("form")} />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="min-h-0 w-full flex-1 overflow-y-auto border-t bg-card md:w-[460px] md:flex-none md:border-t-0 md:border-r">
              <Timeline trip={trip} itinerary={itinerary} exact={exact} onChange={setTrip} activeIndex={activeIndex} onSelect={setActiveIndex} />
            </div>
            <div className="order-first h-56 shrink-0 bg-muted md:order-last md:h-auto md:flex-1">
              <TripMap stops={itinerary.mapStops} legs={legs} activeIndex={activeIndex} routeStyle={trip.roadType.style} avoidTolls={trip.avoidTolls} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
