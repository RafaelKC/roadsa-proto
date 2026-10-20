"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildItinerary, formatBRL, routeNames, type Distances, type TripState } from "@/lib/itinerary";
import type { SavedTrip } from "@/lib/saved-trips";

type Props = {
  trips: SavedTrip[];
  onOpen: (trip: SavedTrip) => void;
  onCreate: () => void;
  distancesFor: (trip: TripState) => Distances;
  isExact: (trip: TripState) => boolean;
};

const channelLabel: Record<SavedTrip["trip"]["notifyChannel"], string> = {
  app: "Alertas no app",
  whatsapp: "Alertas via WhatsApp",
  telegram: "Alertas via Telegram",
};

export function TripList({ trips, onOpen, onCreate, distancesFor, isExact }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-7">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="rounded-2xl bg-accent px-5 py-4">
          <div className="text-base font-bold">Planeje sua road trip, dia a dia.</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Diga de onde você sai, para onde quer ir e quanto aguenta dirigir por dia. O RoadSA monta o roteiro com
            paradas, horários e custo estimado, e recalcula tudo quando você muda algo. Você viaja com o seu próprio
            carro ou moto: aqui só planejamos.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Minhas rotas</h1>
            <p className="text-sm text-muted-foreground">Rotas de exemplo e as que você criar nesta sessão.</p>
          </div>
          <Button onClick={onCreate}><Plus /> Nova rota</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {trips.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer gap-2 p-4 ring-1 ring-foreground/10 transition-colors hover:ring-primary"
              onClick={() => onOpen(s)}
            >
              <div className="text-sm font-bold">{s.title}</div>
              <div className="text-xs text-muted-foreground">
                {routeNames(s.trip).join(" → ")}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {s.trip.pilots.length > 0 && (
                  <Badge variant="secondary">{s.trip.pilots.length + 1} perfis de motorista</Badge>
                )}
                {s.trip.beginnerMode && <Badge variant="secondary">Modo iniciante</Badge>}
                <Badge variant="outline">{channelLabel[s.trip.notifyChannel]}</Badge>
                {isExact(s.trip) && <Badge variant="outline">~{formatBRL(buildItinerary(s.trip, distancesFor(s.trip)).cost.total)}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
