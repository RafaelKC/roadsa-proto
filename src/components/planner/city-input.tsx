"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cacheCoords, fetchCitySuggestions, type CitySuggestion } from "@/lib/mapbox";

type Props = {
  value: string;
  onChange: (name: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

// Campo de cidade com autocomplete (Mapbox Geocoding, debounce de 300ms).
export function CityInput({ value, onChange, onEnter, placeholder = "Nome da cidade, UF", autoFocus }: Props) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (!value.trim()) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      const list = await fetchCitySuggestions(value, ctrl.signal);
      if (!ctrl.signal.aborted) { setSuggestions(list); setHighlighted(-1); }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  function pick(item: CitySuggestion) {
    cacheCoords(item.name, item.center); // já resolvida, sem geocodificar de novo
    onChange(item.name);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <Input
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => { onChange(e.target.value); if (!e.target.value.trim()) setSuggestions([]); }}
        onBlur={() => setSuggestions([])}
        onKeyDown={(e) => {
          if (e.key === "Escape") setSuggestions([]);
          if (e.key === "Enter" && highlighted < 0) { onEnter?.(); return; }
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
  );
}
