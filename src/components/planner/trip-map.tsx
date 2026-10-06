"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { Minus, Plus, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MapStop, TravelItem } from "@/lib/itinerary";
import {
  MAPBOX_TOKEN, MAP_STYLES, POI_CATEGORIES, getCoords, getPOI, getRouteLeg,
  type LngLat, type PoiCategory,
} from "@/lib/mapbox";

type Props = {
  stops: MapStop[];
  legs: TravelItem[];
  activeIndex?: number;
  routeStyle: "rapida" | "cenica";
  showControls?: boolean;
};

const LEG_PALETTE = ["#1f8a8a", "#f2784b", "#3aa675", "#8e6bd9", "#d9a83a", "#3b82c4", "#d9548f", "#6b7f2a", "#c4572f", "#2f6f9e"];
const SOURCE = "route";
const LAYER = "route-line";

function legFeature(coords: LngLat[], i: number, leg?: TravelItem): GeoJSON.Feature {
  return {
    type: "Feature",
    id: i,
    properties: {
      color: LEG_PALETTE[i % LEG_PALETTE.length],
      day: leg?.day ?? null, from: leg?.from ?? null, to: leg?.to ?? null,
      km: leg?.km ?? null, hours: leg?.hours ?? null, stop: leg?.isIntermediateStop ?? false,
    },
    geometry: { type: "LineString", coordinates: coords },
  };
}

function markerEl(stop: MapStop, index: number, active: boolean): HTMLElement {
  const el = document.createElement("div");
  const isStop = stop.kind === "parada";
  const size = isStop ? "size-4" : active ? "size-9" : "size-7";
  const color = stop.kind === "origin" ? "bg-chart-3" : isStop ? "bg-muted-foreground" : "bg-primary";
  el.className =
    `${size} ${color} flex items-center justify-center rounded-full border-[3px] border-card text-[11px] font-bold text-primary-foreground shadow-md` +
    (active ? " ring-4 ring-secondary" : "");
  if (!isStop) el.textContent = stop.kind === "origin" ? "O" : String(index);
  return el;
}

function poiEl(category: PoiCategory): HTMLElement {
  const el = document.createElement("div");
  el.className = "flex size-[22px] items-center justify-center rounded-full border-2 border-border bg-card text-xs shadow";
  el.textContent = category.icon;
  return el;
}

function legPopupContent(p: Record<string, unknown>): HTMLElement {
  const root = document.createElement("div");
  root.className = "min-w-32 text-xs text-foreground";
  const line = (text: string, bold = false) => {
    const d = document.createElement("div");
    d.className = bold ? "mb-0.5 font-bold" : "mb-0.5";
    d.textContent = text;
    root.appendChild(d);
  };
  if (p.day) line(`Dia ${p.day}`, true);
  if (p.from && p.to) line(`${String(p.from).split(",")[0]} → ${String(p.to).split(",")[0]}`);
  if (p.km != null) line(`${p.km} km · ~${p.hours}h de direção`);
  if (p.stop === true || p.stop === "true") line("Parada sugerida", true);
  return root;
}

export function TripMap({ stops, legs, activeIndex = -1, routeStyle, showControls = false }: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const currentStyleRef = useRef<string>("");
  const styleReadyRef = useRef(false); // false enquanto um setStyle está em andamento
  const [satellite, setSatellite] = useState(false);
  const [styleTick, setStyleTick] = useState(0); // sobe a cada style.load (sources somem ao trocar de estilo)
  const [geoTick, setGeoTick] = useState(0); // sobe quando uma cidade nova é geocodificada

  const styleUrl = satellite ? MAP_STYLES.satellite : resolvedTheme === "dark" ? MAP_STYLES.dark : MAP_STYLES.light;
  const styleUrlRef = useRef(styleUrl);
  useEffect(() => { styleUrlRef.current = styleUrl; }); // declarado antes do efeito que cria o mapa

  const bumpGeo = useCallback(() => setGeoTick((t) => t + 1), []);
  // geoTick é dependência de propósito: recalcula as coordenadas quando uma geocodificação resolve.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const coords = useMemo(() => stops.map((s) => getCoords(s.name, bumpGeo)), [stops, bumpGeo, geoTick]);

  // 1) cria o mapa uma vez
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrlRef.current,
      center: [-51, -15],
      zoom: 3.4,
    });
    currentStyleRef.current = styleUrlRef.current;
    mapRef.current = map;
    map.on("style.load", () => {
      styleReadyRef.current = true;
      setStyleTick((t) => t + 1);
    });

    // hover: destaca o trecho e mostra km/h do dia (handlers por layerId sobrevivem a setStyle)
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "route-hover-popup" });
    let hovered: string | number | null = null;
    map.on("mousemove", LAYER, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      if (hovered !== null && hovered !== f.id) map.setFeatureState({ source: SOURCE, id: hovered }, { hover: false });
      hovered = f.id ?? null;
      if (hovered !== null) map.setFeatureState({ source: SOURCE, id: hovered }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
      popup.setLngLat(e.lngLat).setDOMContent(legPopupContent(f.properties ?? {})).addTo(map);
    });
    map.on("mouseleave", LAYER, () => {
      if (hovered !== null) map.setFeatureState({ source: SOURCE, id: hovered }, { hover: false });
      hovered = null;
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      styleReadyRef.current = false;
    };
  }, []);

  // 2) troca de estilo (tema / satélite)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || currentStyleRef.current === styleUrl) return;
    currentStyleRef.current = styleUrl;
    styleReadyRef.current = false;
    map.setStyle(styleUrl);
  }, [styleUrl]);

  // 3) desenha marcadores, rota, POIs e câmera
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    let cancelled = false;

    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: LAYER, type: "line", source: SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 7, 4],
          "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.9],
        },
      });
    }
    const setFeatures = (features: GeoJSON.Feature[]) =>
      (map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });

    const markers: mapboxgl.Marker[] = [];
    stops.forEach((s, i) => {
      markers.push(
        new mapboxgl.Marker({ element: markerEl(s, i, i === activeIndex), anchor: "center" })
          .setLngLat(coords[i])
          .setPopup(new mapboxgl.Popup({ offset: 14, closeButton: false }).setText(s.name))
          .addTo(map),
      );
    });

    // linha reta imediata; troca pela estrada real quando a Directions API responder
    setFeatures(coords.slice(0, -1).map((c, i) => legFeature([c, coords[i + 1]], i, legs[i])));
    Promise.all(coords.slice(0, -1).map((c, i) => getRouteLeg(c, coords[i + 1], routeStyle))).then((real) => {
      if (cancelled) return;
      setFeatures(real.map((r, i) => legFeature(r?.length ? r : [coords[i], coords[i + 1]], i, legs[i])));
    });

    stops.forEach((s, i) => {
      if (s.kind !== "parada") return;
      POI_CATEGORIES.forEach((category) => {
        getPOI(s.name, coords[i], category).then((poi) => {
          if (cancelled || !poi) return;
          markers.push(
            new mapboxgl.Marker({ element: poiEl(category), anchor: "center" })
              .setLngLat(poi.center)
              .setPopup(new mapboxgl.Popup({ offset: 10, closeButton: false }).setText(`${category.icon} ${poi.name}`))
              .addTo(map),
          );
        });
      });
    });

    if (activeIndex >= 0 && coords[activeIndex]) {
      map.flyTo({ center: coords[activeIndex], zoom: Math.max(map.getZoom(), 8), speed: 0.8 });
    } else if (coords.length > 1) {
      const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 9, duration: 600 });
    }

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
    };
  }, [styleTick, coords, stops, legs, activeIndex, routeStyle]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-muted p-6 text-center text-sm font-medium text-muted-foreground">
        Defina NEXT_PUBLIC_MAPBOX_TOKEN em .env.local para exibir o mapa (veja .env.example).
      </div>
    );
  }

  return (
    <div className="relative size-full">
      <div ref={containerRef} className="size-full" />
      {showControls && (
        <div className="absolute top-4 right-4 flex flex-col gap-1.5 rounded-xl bg-card p-1.5 shadow-lg">
          <Button size="icon" variant={satellite ? "default" : "outline"} title="Satélite" onClick={() => setSatellite((s) => !s)}>
            <Satellite />
          </Button>
          <Button size="icon" variant="outline" title="Aproximar" onClick={() => mapRef.current?.zoomIn()}><Plus /></Button>
          <Button size="icon" variant="outline" title="Afastar" onClick={() => mapRef.current?.zoomOut()}><Minus /></Button>
        </div>
      )}
    </div>
  );
}
