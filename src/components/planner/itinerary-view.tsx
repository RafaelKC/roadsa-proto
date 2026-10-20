"use client";

import { useState } from "react";
import { ArrowLeft, Copy, Download, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { downloadFile, emergencyLink, itineraryToCsv, itineraryToText, mapsUrl, wazeUrl } from "@/lib/export";
import { Input } from "@/components/ui/input";
import {
  addDaysToDate, formatBRL, formatDatePt, routeNames, withPeriod,
  type Itinerary, type StopNeed, type TripState,
} from "@/lib/itinerary";

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

const levelLabel: Record<TripState["notifyLevel"], string> = {
  essenciais: "só essenciais",
  resumo: "resumo diário",
  todos: "todos",
};

const needLabel: Record<StopNeed, string> = {
  bebe: "trocador/amamentação e banheiro limpo",
  pet: "aceita pet e tem área verde",
  foto: "mirante ou ponto bonito para foto",
  seguro: "movimentado, iluminado ou 24h",
};

export function ItineraryHeader({ trip, itinerary, onBack }: Pick<Props, "trip" | "itinerary" | "onBack">) {
  const { totals } = itinerary;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(itineraryToText(trip, itinerary));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: a planilha continua disponível
    }
  }
  const end = addDaysToDate(trip.startDate, totals.days);
  return (
    <div className="flex flex-wrap items-center gap-4 border-b bg-card px-7 py-4">
      <Button variant="outline" onClick={onBack}><ArrowLeft /> Ajustar viagem</Button>
      <div className="min-w-44 flex-1">
        <div className="text-base font-bold">{routeNames(trip).join(" → ")}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDatePt(trip.startDate)} – {formatDatePt(end)}</span>
          <Badge variant="outline">{channelLabel[trip.notifyChannel]} · {levelLabel[trip.notifyLevel]}</Badge>
          {trip.beginnerMode && <Badge variant="secondary">Modo iniciante</Badge>}
        </div>
      </div>
      <Stat value={`${totals.km.toLocaleString("pt-BR")} km`} label="distância" />
      <Stat value={`${totals.days} dias`} label="dias" />
      <Stat value={`~${totals.hours}h`} label="direção" />
      <Stat value={formatBRL(itinerary.cost.total)} label="custo estimado" />
      <div className="flex gap-2">
        <Button variant="outline" onClick={copy}><Copy /> {copied ? "Copiado!" : "Copiar para WhatsApp"}</Button>
        <Button
          variant="outline"
          onClick={() => downloadFile("roteiro-roadsa.csv", itineraryToCsv(trip, itinerary), "text/csv;charset=utf-8")}
        ><Download /> Baixar planilha</Button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card px-3.5 py-3">
      <div className="text-[10px] font-extrabold tracking-wide text-primary uppercase">{title}</div>
      {children}
    </section>
  );
}

function CostCard({ trip, itinerary }: Pick<Props, "trip" | "itinerary">) {
  const { cost } = itinerary;
  return (
    <Card title="Custo estimado da viagem">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xl font-extrabold">{formatBRL(cost.total)}</div>
          <div className="text-xs text-muted-foreground">
            {formatBRL(cost.perPerson)} por pessoa ({trip.travelers} {trip.travelers === 1 ? "pessoa" : "pessoas"}) · {formatBRL(cost.perDay)}/dia
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Combustível {formatBRL(cost.fuel)}</div>
          <div>Pedágio {trip.avoidTolls ? "evitado" : formatBRL(cost.toll)}</div>
          {cost.lodging > 0 && <div>Hospedagem {formatBRL(cost.lodging)}</div>}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {cost.lodging > 0 ? "Não inclui alimentação." : "Não inclui hospedagem nem alimentação (informe a diária em \"Ajustar viagem\")."} Premissas: {trip.vehicle === "moto" ? "moto ~25 km/l" : "carro ~12 km/l"}, gasolina a R$ 6,30/l.
        {trip.avoidTolls && " Rota sem pedágio ~8% mais longa."}
      </p>
    </Card>
  );
}

function SafetyCard({ trip, itinerary }: Pick<Props, "trip" | "itinerary">) {
  const [href, setHref] = useState<string | null>(null);
  const noSignal = itinerary.items.filter((it) => it.type === "travel" && it.noSignal).length;
  const hasContact = emergencyLink(trip) !== null;

  function sos() {
    const open = (coords?: { lat: number; lng: number }) => {
      const link = emergencyLink(trip, coords);
      if (!link) return;
      setHref(link);
      window.open(link, "_blank", "noopener");
    };
    if (!navigator.geolocation) return open();
    navigator.geolocation.getCurrentPosition(
      (pos) => open({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => open(),
      { timeout: 5000 },
    );
  }

  return (
    <Card title="Segurança">
      {hasContact ? (
        <>
          <p className="text-xs text-muted-foreground">
            Contato: <strong className="text-foreground">{trip.emergency.name || trip.emergency.phone}</strong>
            {trip.emergency.checkIn && " · avisado se você não confirmar a chegada"}
          </p>
          <Button variant="destructive" className="h-auto min-h-8 whitespace-normal py-1.5" onClick={sos}><Siren /> Emergência: enviar localização</Button>
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
              Não abriu? Toque aqui para enviar pelo WhatsApp
            </a>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Cadastre um contato de confiança em &quot;Ajustar viagem&quot; para ativar o botão de emergência.
        </p>
      )}
      {noSignal > 0 && (
        <p className="text-xs text-muted-foreground">
          {noSignal} {noSignal === 1 ? "trecho pode ter" : "trechos podem ter"} pouco sinal de celular (estimativa).
          Baixe o mapa offline e abasteça antes de entrar neles.
        </p>
      )}
    </Card>
  );
}

function Glossary() {
  return (
    <Card title="Entenda o roteiro">
      <dl className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div><dt className="inline font-semibold text-foreground">Limite por dia: </dt><dd className="inline">quanto você aguenta dirigir sem se cansar demais. Se um trecho passa disso, dividimos em mais de um dia.</dd></div>
        <div><dt className="inline font-semibold text-foreground">Parada sugerida: </dt><dd className="inline">cidade no meio do caminho onde você pode dormir quando o trecho é longo.</dd></div>
        <div><dt className="inline font-semibold text-foreground">Pausa: </dt><dd className="inline">descanso curto na estrada (banheiro, lanche, esticar as pernas).</dd></div>
        <div><dt className="inline font-semibold text-foreground">Estadia: </dt><dd className="inline">dias que você fica parado em um destino, para passear e descansar.</dd></div>
      </dl>
    </Card>
  );
}

export function Timeline({ trip, itinerary, activeIndex, onSelect, onChange, exact }: Pick<Props, "trip" | "itinerary" | "activeIndex" | "onSelect"> & { exact: boolean; onChange: (trip: TripState) => void }) {
  const { limitedBy } = itinerary;
  return (
    <div className="flex flex-col gap-3 p-5 pb-16">
      <p className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        Distâncias, tempos e paradas são estimativas geradas automaticamente — sujeitas a confirmação na estrada.
        No mapa, ⛽ 🍽️ 🏨 marcam um posto, um restaurante e um hotel perto de cada parada.
      </p>
      {!exact && (
        <p className="rounded-lg bg-secondary/20 px-3 py-2.5 text-xs">
          Calculando as distâncias reais das estradas… Até lá, km, horas e custo são aproximados e podem estar errados.
          {!MAPBOX_TOKEN && " (Sem token do Mapbox, as distâncias ficam sempre aproximadas.)"}
        </p>
      )}
      {trip.beginnerMode && <Glossary />}
      {limitedBy && (
        <p className="rounded-lg bg-accent px-3 py-2.5 text-xs">
          O limite diário do grupo está sendo definido por <strong>{limitedBy}</strong> (o mais conservador entre os perfis).
        </p>
      )}
      <CostCard trip={trip} itinerary={itinerary} />
      <SafetyCard trip={trip} itinerary={itinerary} />
      {itinerary.items.map((it, i) => {
        const active = it.mapIndex === activeIndex;
        const base = "cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-colors hover:border-primary";
        if (it.type === "travel") {
          // o endereço da hospedagem só vale no último trecho até o destino (não nas paradas no meio)
          const address = it.isIntermediateStop ? undefined : trip.destinations.find((d) => d.name === it.to)?.address;
          return (
            <div key={i} className={`${base} ${active ? "border-primary bg-accent" : "bg-card"}`}>
            <button className="block w-full text-left" onClick={() => onSelect(it.mapIndex)}>
              <div className="text-[10px] font-extrabold tracking-wide text-primary uppercase">Dia {it.day}</div>
              <div className="mt-1 text-sm font-bold">{it.from.split(",")[0]} → {it.to.split(",")[0]}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{it.km} km · ~{it.hours}h de direção</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Saída {withPeriod(it.departure)} · chegada ~{withPeriod(it.arrival.replace(" (+1)", ""))}{it.arrival.includes("+1") && " do dia seguinte"}
                {it.restStops > 0 && ` · ${it.restStops} ${it.restStops === 1 ? "pausa" : "pausas"} de 15 min (a cada ${trip.restEveryHours}h)`}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {it.isIntermediateStop && (
                  <Badge variant="secondary">Parada sugerida — trecho excede o limite diário</Badge>
                )}
                {it.roadAlert && (
                  <Badge variant="destructive">Alerta de condição da estrada (estimativa)</Badge>
                )}
                {it.noSignal && (
                  <Badge variant="outline">Pouco sinal de celular (estimativa)</Badge>
                )}
              </div>
              {trip.stopNeeds.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {it.restStops > 0 || it.isIntermediateStop ? "Nas paradas, procure: " : "Se parar no caminho, procure: "}{trip.stopNeeds.map((n) => needLabel[n]).join("; ")}.
                </div>
              )}
              {trip.beginnerMode && (it.isIntermediateStop || it.roadAlert || it.noSignal) && (
                <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {it.isIntermediateStop && <p>Dividimos este trecho porque ele é maior do que você aguenta dirigir em um dia.</p>}
                  {it.roadAlert && <p>Pode haver obra, chuva ou interdição. Confira antes de sair.</p>}
                  {it.noSignal && <p>Seu celular pode ficar sem internet. Baixe o mapa antes.</p>}
                </div>
              )}
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-2 text-xs">
              <label className="flex items-center gap-1.5 text-muted-foreground">
                Saída
                <Input
                  type="time"
                  className="h-7 w-28"
                  value={trip.departures[it.day] ?? trip.departureTime}
                  onChange={(e) => e.target.value && onChange({ ...trip, departures: { ...trip.departures, [it.day]: e.target.value } })}
                />
              </label>
              <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={mapsUrl(it.from, it.to, address)}>Abrir no Google Maps</a>
              <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={wazeUrl(it.to, address)}>Abrir no Waze</a>
            </div>
            </div>
          );
        }
        const label = it.dayStart === it.dayEnd ? `Dia ${it.dayStart}` : `Dias ${it.dayStart}–${it.dayEnd}`;
        return (
          <button key={i} onClick={() => onSelect(it.mapIndex)} className={`${base} border-dashed ${active ? "border-primary bg-accent" : "bg-muted"}`}>
            <div className="text-[10px] font-extrabold tracking-wide text-primary uppercase">{label}</div>
            <div className="mt-1 text-sm font-bold">Estadia em {it.place.split(",")[0]}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Você fica {it.days} {it.days === 1 ? "dia" : "dias"} aqui, sem dirigir longas distâncias.
              {trip.lodgingPerNight > 0 && ` Hospedagem: ${formatBRL(it.days * trip.lodgingPerNight)}.`}
            </div>
          </button>
        );
      })}
      <div className="rounded-xl border border-primary bg-accent px-3.5 py-3">
        <div className="text-[10px] font-extrabold tracking-wide text-primary uppercase">Fim da viagem · Dia {itinerary.totals.days}</div>
        <div className="mt-1 text-sm font-bold">
          {trip.roundTrip ? `Você volta para ${trip.origin.split(",")[0]}` : `Você termina em ${trip.destinations[trip.destinations.length - 1]?.name.split(",")[0]}`}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {itinerary.totals.km.toLocaleString("pt-BR")} km no total · {formatDatePt(addDaysToDate(trip.startDate, itinerary.totals.days))}
        </div>
      </div>
    </div>
  );
}
