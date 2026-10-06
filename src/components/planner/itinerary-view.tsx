"use client";

import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addDaysToDate, formatDatePt, type Itinerary, type TripState } from "@/lib/itinerary";

type Props = {
  trip: TripState;
  itinerary: Itinerary;
  activeIndex: number;
  onSelect: (mapIndex: number) => void;
  onBack: () => void;
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-24 rounded-lg bg-muted px-3.5 py-2 text-center">
      <div className="text-base font-extrabold">{value}</div>
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

const channelLabel: Record<TripState["notifyChannel"], string> = {
  app: "Alertas no app",
  whatsapp: "Alertas via WhatsApp",
  telegram: "Alertas via Telegram",
};

export function ItineraryHeader({ trip, itinerary, onBack }: Pick<Props, "trip" | "itinerary" | "onBack">) {
  const { totals } = itinerary;
  const end = addDaysToDate(trip.startDate, totals.days);
  return (
    <div className="flex flex-wrap items-center gap-4 border-b bg-card px-7 py-4">
      <Button variant="outline" onClick={onBack}><ArrowLeft /> Ajustar viagem</Button>
      <div className="min-w-44 flex-1">
        <div className="text-base font-bold">{[trip.origin, ...trip.destinations.map((d) => d.name)].join(" → ")}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDatePt(trip.startDate)} – {formatDatePt(end)}</span>
          <Badge variant="outline">{channelLabel[trip.notifyChannel]}</Badge>
          {trip.beginnerMode && <Badge variant="secondary">Modo iniciante</Badge>}
        </div>
      </div>
      <Stat value={`${totals.km.toLocaleString("pt-BR")} km`} label="distância" />
      <Stat value={`${totals.days} dias`} label="dias" />
      <Stat value={`~${totals.hours}h`} label="direção" />
    </div>
  );
}

export function Timeline({ itinerary, activeIndex, onSelect }: Pick<Props, "itinerary" | "activeIndex" | "onSelect">) {
  return (
    <div className="flex flex-col gap-3 p-5 pb-16">
      <p className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        Distâncias, tempos e paradas são estimativas geradas automaticamente — sujeitas a confirmação na estrada.
      </p>
      {itinerary.items.map((it, i) => {
        const active = it.mapIndex === activeIndex;
        const base = "cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-colors hover:border-primary";
        if (it.type === "travel") {
          return (
            <button key={i} onClick={() => onSelect(it.mapIndex)} className={`${base} ${active ? "border-primary bg-accent" : "bg-card"}`}>
              <div className="text-[10px] font-extrabold tracking-wide text-primary uppercase">Dia {it.day}</div>
              <div className="mt-1 text-sm font-bold">{it.from.split(",")[0]} → {it.to.split(",")[0]}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{it.km} km · ~{it.hours}h de direção</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {it.isIntermediateStop && (
                  <Badge variant="secondary">Parada sugerida — trecho excede o limite diário</Badge>
                )}
                {it.roadAlert && (
                  <Badge variant="destructive">Alerta de condição da estrada (estimativa)</Badge>
                )}
              </div>
            </button>
          );
        }
        const label = it.dayStart === it.dayEnd ? `Dia ${it.dayStart}` : `Dias ${it.dayStart}–${it.dayEnd}`;
        return (
          <button key={i} onClick={() => onSelect(it.mapIndex)} className={`${base} border-dashed ${active ? "border-primary bg-accent" : "bg-muted"}`}>
            <div className="text-[10px] font-extrabold tracking-wide text-primary uppercase">{label}</div>
            <div className="mt-1 text-sm font-bold">Estadia em {it.place.split(",")[0]}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{it.days} {it.days === 1 ? "dia" : "dias"} de permanência</div>
          </button>
        );
      })}
    </div>
  );
}
