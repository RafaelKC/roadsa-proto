"use client";

import { useMemo, useRef, useState } from "react";
import { TripForm } from "@/components/planner/trip-form";
import { ItineraryHeader, Timeline } from "@/components/planner/itinerary-view";
import { TripList } from "@/components/planner/trip-list";
import { TripMap } from "@/components/planner/trip-map";
import { Button } from "@/components/ui/button";
import { buildItinerary, legsInfo, type TripState } from "@/lib/itinerary";
import { SAMPLE_SAVED_TRIPS, blankTrip, type SavedTrip } from "@/lib/saved-trips";

function titleFor(trip: TripState): string {
  const last = trip.destinations[trip.destinations.length - 1]?.name ?? trip.origin;
  return `${trip.origin.split(",")[0]} → ${last.split(",")[0]}`;
}

export function Planner() {
  const [trips, setTrips] = useState<SavedTrip[]>(SAMPLE_SAVED_TRIPS);
  const [trip, setTrip] = useState<TripState>(blankTrip());
  const [view, setView] = useState<"list" | "form" | "itinerary">("list");
  const [activeIndex, setActiveIndex] = useState(-1);
  const editingId = useRef<string | null>(null);

  const itinerary = useMemo(() => buildItinerary(trip), [trip]);
  const legs = useMemo(() => legsInfo(itinerary.items), [itinerary]);

  function openList() { setView("list"); }
  function createTrip() { editingId.current = null; setTrip(blankTrip()); setView("form"); }
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
    : view === "form"
    ? { n: 2, title: "Destinos e restrições da viagem" }
    : { n: 3, title: "Roteiro gerado" };

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
        <TripList trips={trips} onOpen={openSavedTrip} onCreate={createTrip} />
      ) : view === "form" ? (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="w-full shrink-0 overflow-y-auto border-b bg-card md:w-[420px] md:border-r md:border-b-0">
            <TripForm
              trip={trip}
              onChange={setTrip}
              totalDays={itinerary.totals.days}
              onGenerate={generate}
            />
          </aside>
          <div className="min-h-80 flex-1 bg-muted">
            <TripMap stops={itinerary.mapStops} legs={legs} routeStyle={trip.roadType.style} showControls />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ItineraryHeader trip={trip} itinerary={itinerary} onBack={() => setView("form")} />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="w-full shrink-0 overflow-y-auto border-b bg-card md:w-[460px] md:border-r md:border-b-0">
              <Timeline itinerary={itinerary} activeIndex={activeIndex} onSelect={setActiveIndex} />
            </div>
            <div className="min-h-80 flex-1 bg-muted">
              <TripMap stops={itinerary.mapStops} legs={legs} activeIndex={activeIndex} routeStyle={trip.roadType.style} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
