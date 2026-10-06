"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { addDaysToDate, type TripState } from "@/lib/itinerary";
import { cacheCoords, fetchCitySuggestions, type CitySuggestion } from "@/lib/mapbox";

type Props = {
  trip: TripState;
  onChange: (trip: TripState) => void;
  totalDays: number;
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

function AddDestination({ onAdd }: { onAdd: (name: string, days: number) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("2");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  // autocomplete com debounce de 300ms
  useEffect(() => {
    abortRef.current?.abort();
    if (!name.trim()) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      const list = await fetchCitySuggestions(name, ctrl.signal);
      if (!ctrl.signal.aborted) { setSuggestions(list); setHighlighted(-1); }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [name]);

  function pick(item: CitySuggestion) {
    cacheCoords(item.name, item.center); // já resolvida, sem geocodificar de novo
    setName(item.name);
    setSuggestions([]);
  }
  function reset() { setOpen(false); setName(""); setDays("2"); setSuggestions([]); }
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
      <div className="relative">
        <Input
          autoFocus
          placeholder="Nome da cidade, UF"
          autoComplete="off"
          value={name}
          onChange={(e) => { setName(e.target.value); if (!e.target.value.trim()) setSuggestions([]); }}
          onBlur={() => setSuggestions([])}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSuggestions([]);
            if (!suggestions.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, suggestions.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
            if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); pick(suggestions[highlighted]); }
          }}
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-popover shadow-lg">
            {suggestions.map((s, i) => (
              <div
                key={s.name}
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                className={`cursor-pointer border-b px-3 py-2 text-sm last:border-b-0 hover:bg-accent ${i === highlighted ? "bg-accent" : ""}`}
              >
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <Input placeholder="Dias de permanência" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={reset}>Cancelar</Button>
        <Button size="sm" onClick={confirm}>Adicionar</Button>
      </div>
    </div>
  );
}

export function TripForm({ trip, onChange, totalDays, onGenerate }: Props) {
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
                onClick={() => trip.destinations.length > 1 && set({ destinations: trip.destinations.filter((_, i) => i !== idx) })}
              ><X /></Button>
            </div>
          ))}
        </div>
        <AddDestination onAdd={(name, days) => set({ destinations: [...trip.destinations, { name, days }] })} />
      </section>

      <Separator />

      <section className="space-y-4">
        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Restrições da viagem</Label>
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
        <p className="text-xs text-muted-foreground">≈ {totalDays} dias no total, com base nas restrições acima</p>
      </section>

      <Button size="lg" className="h-11 w-full text-base" onClick={onGenerate}>Gerar roteiro</Button>
    </div>
  );
}
