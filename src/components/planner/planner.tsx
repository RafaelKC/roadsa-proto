"use client";

import { useMemo, useState } from "react";
import { TripForm } from "@/components/planner/trip-form";
import { ItineraryHeader, Timeline } from "@/components/planner/itinerary-view";
import { TripMap } from "@/components/planner/trip-map";
import { DEFAULT_TRIP, buildItinerary, legsInfo, type TripState } from "@/lib/itinerary";

export function Planner() {
  const [trip, setTrip] = useState<TripState>(DEFAULT_TRIP);
  const [view, setView] = useState<"form" | "itinerary">("form");
  const [activeIndex, setActiveIndex] = useState(-1);

  const itinerary = useMemo(() => buildItinerary(trip), [trip]);
  const legs = useMemo(() => legsInfo(itinerary.items), [itinerary]);

  const step = view === "form"
    ? { n: 2, title: "Destinos e restrições da viagem" }
    : { n: 3, title: "Roteiro gerado" };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b bg-card px-7 py-2">
        <div>
          <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Passo {step.n} de 4</div>
          <div className="text-sm font-bold">{step.title}</div>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`size-2 rounded-full ${n === step.n ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>

      {view === "form" ? (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="w-full shrink-0 overflow-y-auto border-b bg-card md:w-[420px] md:border-r md:border-b-0">
            <TripForm
              trip={trip}
              onChange={setTrip}
              totalDays={itinerary.totals.days}
              onGenerate={() => { setActiveIndex(-1); setView("itinerary"); }}
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
