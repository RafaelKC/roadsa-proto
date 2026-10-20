"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CityInput } from "@/components/planner/city-input";
import type { TripState } from "@/lib/itinerary";

type Props = {
  trip: TripState;
  onChange: (trip: TripState) => void;
  onNext: () => void;
};

const choice = "flex-1 rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary";

export function StartStep({ trip, onChange, onNext }: Props) {
  const canContinue = trip.origin.trim().length > 0;
  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto bg-muted p-6">
      <div className="mt-8 flex w-full max-w-xl flex-col gap-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div>
          <h2 className="text-xl font-bold">De onde você vai sair?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Informe a cidade de partida da sua road trip.</p>
        </div>

        <section className="space-y-2">
          <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Cidade de início</Label>
          <CityInput
            autoFocus
            value={trip.origin}
            onChange={(origin) => onChange({ ...trip, origin })}
            onEnter={() => canContinue && onNext()}
          />
        </section>

        <section className="space-y-2">
          <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            A rota é circular?
          </Label>
          <div className="flex gap-3">
            <button
              type="button"
              aria-pressed={trip.roundTrip}
              onClick={() => onChange({ ...trip, roundTrip: true })}
              className={`${choice} ${trip.roundTrip ? "border-primary bg-accent" : ""}`}
            >
              <div className="text-sm font-semibold">Sim, volto ao início</div>
              <div className="text-xs text-muted-foreground">Termina em {trip.origin.split(",")[0] || "onde começou"}</div>
            </button>
            <button
              type="button"
              aria-pressed={!trip.roundTrip}
              onClick={() => onChange({ ...trip, roundTrip: false })}
              className={`${choice} ${!trip.roundTrip ? "border-primary bg-accent" : ""}`}
            >
              <div className="text-sm font-semibold">Não, termina no último destino</div>
              <div className="text-xs text-muted-foreground">Só ida</div>
            </button>
          </div>
        </section>

        <Button size="lg" className="h-11 w-full text-base" disabled={!canContinue} onClick={onNext}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
