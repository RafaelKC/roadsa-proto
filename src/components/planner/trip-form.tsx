"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { addDaysToDate, formatBRL, type Cost, type StopNeed, type TripState } from "@/lib/itinerary";
import { CityInput } from "@/components/planner/city-input";

type Props = {
  trip: TripState;
  onChange: (trip: TripState) => void;
  totalDays: number;
  cost: Cost;
  onGenerate: () => void;
};

const segmentedItem = "flex-1 aria-pressed:bg-primary aria-pressed:text-primary-foreground";

function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className="w-full rounded-lg bg-muted p-0.5"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} className={segmentedItem}>{o.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// Ritmos prontos para quem não sabe o próprio limite (pedido do Ciclo 1: "como vou saber meu limite?").
const PACES = [
  { label: "Leve", hours: 4, km: 300, hint: "Muitas pausas e tempo de sobra" },
  { label: "Confortável", hours: 5, km: 350, hint: "Recomendado para a 1ª viagem longa" },
  { label: "Moderado", hours: 6, km: 450, hint: "Para quem já tem estrada" },
  { label: "Puxado", hours: 8, km: 600, hint: "Dia cheio, só com descanso" },
];

const STOP_NEEDS: { value: StopNeed; label: string; hint: string }[] = [
  { value: "bebe", label: "Bebê / crianças", hint: "trocador, amamentação, banheiro limpo" },
  { value: "pet", label: "Pet-friendly", hint: "aceita animais, área verde" },
  { value: "foto", label: "Mirantes e fotos", hint: "paradas bonitas no caminho" },
  { value: "seguro", label: "Movimentadas e seguras", hint: "24h, iluminadas, com gente" },
];

function AddPilot({ onAdd }: { onAdd: (name: string, maxHours: number, maxKm: number) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [maxHours, setMaxHours] = useState("6");
  const [maxKm, setMaxKm] = useState("450");

  function reset() { setOpen(false); setName(""); setMaxHours("6"); setMaxKm("450"); }
  function confirm() {
    if (!name.trim()) return;
    onAdd(name.trim(), Math.max(1, parseInt(maxHours) || 6), Math.max(50, parseInt(maxKm) || 450));
    reset();
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full border-dashed text-primary" onClick={() => setOpen(true)}>
        <Plus /> Adicionar motorista/piloto
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
      <Input autoFocus placeholder="Nome (ex.: Ana)" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <Input placeholder="Horas máx./dia" inputMode="numeric" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
        <Input placeholder="Km máx./dia" inputMode="numeric" value={maxKm} onChange={(e) => setMaxKm(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={reset}>Cancelar</Button>
        <Button size="sm" onClick={confirm}>Adicionar</Button>
      </div>
    </div>
  );
}

function AddDestination({ onAdd }: { onAdd: (name: string, days: number) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("2");

  function reset() { setOpen(false); setName(""); setDays("2"); }
  function confirm() {
    if (!name.trim()) return;
    onAdd(name.trim(), Math.max(1, parseInt(days) || 1));
    reset();
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full border-dashed text-primary" onClick={() => setOpen(true)}>
        <Plus /> Adicionar destino
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
      <CityInput autoFocus value={name} onChange={setName} />
      <Input placeholder="Dias de permanência" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={reset}>Cancelar</Button>
        <Button size="sm" onClick={confirm}>Adicionar</Button>
      </div>
    </div>
  );
}

export function TripForm({ trip, onChange, totalDays, cost, onGenerate }: Props) {
  const set = (patch: Partial<TripState>) => onChange({ ...trip, ...patch });
  const setDest = (idx: number, days: number) =>
    set({ destinations: trip.destinations.map((d, i) => (i === idx ? { ...d, days } : d)) });
  const move = (idx: number, to: number) => {
    if (to < 0 || to >= trip.destinations.length) return;
    const next = [...trip.destinations];
    [next[idx], next[to]] = [next[to], next[idx]];
    set({ destinations: next });
  };
  const one = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number));

  return (
    <div className="flex flex-col gap-5 p-6">
      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Origem</Label>
        <div className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm font-medium">
          <span className="size-2 rounded-full bg-chart-3" /> {trip.origin} — Brasil
          {trip.roundTrip && <span className="ml-auto text-xs text-muted-foreground">Rota circular ↺</span>}
        </div>
      </section>

      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Destinos ({trip.destinations.length})
        </Label>
        <div className="flex flex-col gap-2">
          {trip.destinations.map((d, idx) => (
            <div key={d.name + idx} className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{d.name}</div>
                <div className="text-xs text-muted-foreground">Permanência: {d.days} {d.days === 1 ? "dia" : "dias"}</div>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-muted px-1">
                <Button size="icon-xs" variant="ghost" aria-label="Menos um dia" onClick={() => d.days > 1 && setDest(idx, d.days - 1)}>–</Button>
                <span className="w-4 text-center text-xs font-bold">{d.days}</span>
                <Button size="icon-xs" variant="ghost" aria-label="Mais um dia" onClick={() => setDest(idx, d.days + 1)}>+</Button>
              </div>
              <div className="flex flex-col">
                <Button size="icon-xs" variant="ghost" aria-label="Mover para cima" onClick={() => move(idx, idx - 1)}><ArrowUp /></Button>
                <Button size="icon-xs" variant="ghost" aria-label="Mover para baixo" onClick={() => move(idx, idx + 1)}><ArrowDown /></Button>
              </div>
              <Button
                size="icon-xs" variant="ghost" aria-label="Remover destino"
                className="hover:text-destructive"
                onClick={() => set({ destinations: trip.destinations.filter((_, i) => i !== idx) })}
              ><X /></Button>
            </div>
          ))}
        </div>
        <AddDestination onAdd={(name, days) => set({ destinations: [...trip.destinations, { name, days }] })} />
      </section>

      <Separator />

      <section className="space-y-3">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Quem viaja</Label>
        <Segmented
          value={trip.vehicle}
          options={[{ value: "carro", label: "Carro" }, { value: "moto", label: "Moto" }]}
          onChange={(vehicle) => set({ vehicle })}
        />
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
          <div>
            <div className="text-sm font-medium">Pessoas dividindo o custo</div>
            <div className="text-xs text-muted-foreground">Rateio automático no roteiro</div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon-xs" variant="outline" aria-label="Menos uma pessoa" onClick={() => set({ travelers: Math.max(1, trip.travelers - 1) })}>–</Button>
            <span className="w-5 text-center text-sm font-bold">{trip.travelers}</span>
            <Button size="icon-xs" variant="outline" aria-label="Mais uma pessoa" onClick={() => set({ travelers: Math.min(10, trip.travelers + 1) })}>+</Button>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Experiência</Label>
        <Segmented
          value={trip.beginnerMode ? "sim" : "nao"}
          options={[{ value: "nao", label: "Já viajei assim" }, { value: "sim", label: "Primeira viagem longa" }]}
          onChange={(v) => set({ beginnerMode: v === "sim" })}
        />
        {trip.beginnerMode && (
          <p className="text-xs text-muted-foreground">
            Modo iniciante ativado: termos técnicos do roteiro ficam com explicação extra e sugerimos abaixo um ritmo
            confortável pra quem nunca fez uma viagem longa.
          </p>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Restrições da viagem</Label>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Não sabe seu limite? Escolha um ritmo</Label>
          <div className="grid grid-cols-2 gap-2">
            {PACES.map((p) => {
              const active = trip.maxHours === p.hours && trip.maxKm === p.km;
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ maxHours: p.hours, maxKm: p.km })}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary ${active ? "border-primary bg-accent" : "bg-card"}`}
                >
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.hours}h · {p.km} km/dia</div>
                  {(trip.beginnerMode || p.label === "Confortável") && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Horas máx. de direção / dia</Label>
          <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
            <Slider min={2} max={10} step={1} value={[trip.maxHours]} onValueChange={(v) => set({ maxHours: one(v) })} />
            <span className="min-w-14 text-right text-sm font-bold">{trip.maxHours}h</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Km máx. / dia</Label>
          <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
            <Slider min={150} max={800} step={50} value={[trip.maxKm]} onValueChange={(v) => set({ maxKm: one(v) })} />
            <span className="min-w-14 text-right text-sm font-bold">{trip.maxKm} km</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Pausa obrigatória a cada</Label>
          <Segmented
            value={String(trip.restEveryHours)}
            options={[{ value: "0", label: "Sem" }, { value: "2", label: "2h" }, { value: "3", label: "3h" }, { value: "4", label: "4h" }]}
            onChange={(v) => set({ restEveryHours: Number(v) })}
          />
          <p className="text-xs text-muted-foreground">
            O roteiro conta as pausas (~15 min) no horário de chegada. Com bebê ou criança pequena, use 2h.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Pedágios</Label>
          <Segmented
            value={trip.avoidTolls ? "evitar" : "normal"}
            options={[{ value: "normal", label: "Rota normal" }, { value: "evitar", label: "Evitar (mais barato, mais longo)" }]}
            onChange={(v) => set({ avoidTolls: v === "evitar" })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Pavimento preferido</Label>
          <Segmented
            value={trip.roadType.surface}
            options={[{ value: "asfalto", label: "Asfalto" }, { value: "terra", label: "Terra" }]}
            onChange={(surface) => set({ roadType: { ...trip.roadType, surface } })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Estilo de rota</Label>
          <Segmented
            value={trip.roadType.style}
            options={[{ value: "rapida", label: "Mais rápida" }, { value: "cenica", label: "Mais cênica" }]}
            onChange={(style) => set({ roadType: { ...trip.roadType, style } })}
          />
          <p className="text-xs text-muted-foreground">
            &quot;Terra&quot; é só preferência de exibição neste protótipo — a rota real ainda usa vias pavimentadas.
          </p>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">O que as paradas precisam ter</Label>
        <div className="grid grid-cols-2 gap-2">
          {STOP_NEEDS.map((n) => {
            const on = trip.stopNeeds.includes(n.value);
            return (
              <button
                key={n.value}
                type="button"
                aria-pressed={on}
                onClick={() => set({ stopNeeds: on ? trip.stopNeeds.filter((x) => x !== n.value) : [...trip.stopNeeds, n.value] })}
                className={`rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary ${on ? "border-primary bg-accent" : "bg-card"}`}
              >
                <div className="text-sm font-semibold">{n.label}</div>
                <div className="text-[11px] text-muted-foreground">{n.hint}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Protótipo: o roteiro lista esses critérios em cada pausa — ainda não há base real de estabelecimentos.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Quem dirige (opcional)
        </Label>
        <p className="text-xs text-muted-foreground">
          Cada pessoa ou moto/carro com resistência diferente? Cadastre o limite de cada um — vale para grupo, casal ou
          revezamento. O roteiro sempre usa o mais conservador e avisa quem está puxando o limite.
        </p>
        {trip.pilots.length > 0 && (
          <div className="flex flex-col gap-2">
            {trip.pilots.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">até {p.maxHours}h / {p.maxKm}km por dia</div>
                </div>
                <Button
                  size="icon-xs" variant="ghost" aria-label="Remover perfil"
                  className="hover:text-destructive"
                  onClick={() => set({ pilots: trip.pilots.filter((x) => x.id !== p.id) })}
                ><X /></Button>
              </div>
            ))}
          </div>
        )}
        <AddPilot onAdd={(name, maxHours, maxKm) => set({ pilots: [...trip.pilots, { id: `${Date.now()}`, name, maxHours, maxKm }] })} />
      </section>

      <Separator />

      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Segurança (opcional)</Label>
        <p className="text-xs text-muted-foreground">
          Contato de confiança para o botão de emergência (envia sua localização por WhatsApp).
        </p>
        <Input
          placeholder="Nome do contato"
          value={trip.emergency.name}
          onChange={(e) => set({ emergency: { ...trip.emergency, name: e.target.value } })}
        />
        <Input
          placeholder="WhatsApp com DDD, ex.: 41 99999-0000"
          inputMode="tel"
          value={trip.emergency.phone}
          onChange={(e) => set({ emergency: { ...trip.emergency, phone: e.target.value } })}
        />
        <Segmented
          value={trip.emergency.checkIn ? "sim" : "nao"}
          options={[{ value: "nao", label: "Sem confirmação" }, { value: "sim", label: "Avisar se eu não chegar" }]}
          onChange={(v) => set({ emergency: { ...trip.emergency, checkIn: v === "sim" } })}
        />
      </section>

      <Separator />

      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Receber alertas por</Label>
        <Segmented
          value={trip.notifyChannel}
          options={[{ value: "app", label: "App" }, { value: "whatsapp", label: "WhatsApp" }, { value: "telegram", label: "Telegram" }]}
          onChange={(notifyChannel) => set({ notifyChannel })}
        />
        <Label className="pt-1 text-muted-foreground">Quantos alertas?</Label>
        <Segmented
          value={trip.notifyLevel}
          options={[{ value: "essenciais", label: "Só essenciais" }, { value: "resumo", label: "Resumo diário" }, { value: "todos", label: "Todos" }]}
          onChange={(notifyLevel) => set({ notifyLevel })}
        />
        <p className="text-xs text-muted-foreground">
          Protótipo: só salva a preferência — nenhum alerta é enviado de fato.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Datas</Label>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-muted-foreground">Início</Label>
            <Input type="date" value={trip.startDate} onChange={(e) => set({ startDate: e.target.value || trip.startDate })} />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-muted-foreground">Retorno estimado</Label>
            <Input type="date" disabled value={addDaysToDate(trip.startDate, totalDays)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Horário de saída de cada dia</Label>
          <Input type="time" value={trip.departureTime} onChange={(e) => set({ departureTime: e.target.value || trip.departureTime })} />
        </div>
        <p className="text-xs text-muted-foreground">≈ {totalDays} dias no total, com base nas restrições acima</p>
      </section>

      {trip.destinations.length > 0 && (
        <div className="rounded-lg bg-accent px-3 py-2.5">
          <div className="text-xs text-muted-foreground">Custo estimado (combustível + pedágio)</div>
          <div className="text-base font-extrabold">
            {formatBRL(cost.total)}{" "}
            <span className="text-xs font-medium text-muted-foreground">· {formatBRL(cost.perPerson)} por pessoa</span>
          </div>
        </div>
      )}

      <Button size="lg" className="h-11 w-full text-base" disabled={!trip.destinations.length} onClick={onGenerate}>Gerar roteiro</Button>
    </div>
  );
}
