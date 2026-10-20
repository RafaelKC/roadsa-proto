// Saídas "leves" do roteiro: texto para colar no WhatsApp/stories e CSV para planilha/offline
// (pedido de quem viaja sem sinal e de quem divide o roteiro com o grupo). Sem React.

import {
  addDaysToDate, formatBRL, formatDatePt, routeNames, withPeriod,
  type Itinerary, type TripState,
} from "@/lib/itinerary";

export function itineraryToText(trip: TripState, it: Itinerary): string {
  const end = addDaysToDate(trip.startDate, it.totals.days);
  const lines = [
    `🛣️ ${routeNames(trip).map((n) => n.split(",")[0]).join(" → ")}`,
    `${formatDatePt(trip.startDate)} – ${formatDatePt(end)} · ${it.totals.km} km · ${it.totals.days} dias`,
    `Custo estimado: ${formatBRL(it.cost.total)} (${formatBRL(it.cost.perPerson)} por pessoa, ${trip.travelers} ${trip.travelers === 1 ? "pessoa" : "pessoas"})`,
    "",
  ];
  for (const x of it.items) {
    if (x.type === "travel") {
      lines.push(`Dia ${x.day}: ${x.from.split(",")[0]} → ${x.to.split(",")[0]} · ${x.km} km · saída ${withPeriod(x.departure)}, chegada ~${withPeriod(x.arrival.replace(" (+1)", ""))}${x.arrival.includes("+1") ? " do dia seguinte" : ""}`);
    } else {
      const label = x.dayStart === x.dayEnd ? `Dia ${x.dayStart}` : `Dias ${x.dayStart}–${x.dayEnd}`;
      lines.push(`${label}: estadia em ${x.place.split(",")[0]}`);
    }
  }
  lines.push("", "Estimativas — confirme na estrada. Planejado no RoadSA.");
  return lines.join("\n");
}

export function itineraryToCsv(trip: TripState, it: Itinerary): string {
  const rows = [["dia", "data", "tipo", "de", "para", "km", "saida", "chegada", "pausas", "combustivel_rs", "pedagio_rs"]];
  for (const x of it.items) {
    if (x.type === "travel") {
      rows.push([
        String(x.day), addDaysToDate(trip.startDate, x.day), "viagem", x.from, x.to, String(x.km),
        x.departure, x.arrival, String(x.restStops), x.fuelCost.toFixed(2), x.tollCost.toFixed(2),
      ]);
    } else {
      for (let d = x.dayStart; d <= x.dayEnd; d++) {
        rows.push([String(d), addDaysToDate(trip.startDate, d), "estadia", x.place, x.place, "0", "", "", "0", "0", "0"]);
      }
    }
  }
  // ; como separador e BOM: abre direto no Excel em pt-BR.
  return "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
}

export function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Links de navegação (só abrem o app; nada do Google é guardado). Com endereço de hospedagem, ele vira o destino.
export function mapsUrl(from: string, to: string, address?: string): string {
  const dest = address ? `${address}, ${to}` : to;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from + ", Brasil")}&destination=${encodeURIComponent(dest + ", Brasil")}&travelmode=driving`;
}
export function wazeUrl(to: string, address?: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent((address ? `${address}, ${to}` : to) + ", Brasil")}&navigate=yes`;
}

// Número BR com DDD → só dígitos com 55 na frente; null se não parecer um telefone.
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const n = d.startsWith("55") && d.length >= 12 ? d : "55" + d;
  return n.length >= 12 && n.length <= 13 ? n : null;
}

// Link do WhatsApp com a localização atual (se o navegador permitir) para o contato de emergência.
export function emergencyLink(trip: TripState, coords?: { lat: number; lng: number }): string | null {
  const phone = normalizePhone(trip.emergency.phone);
  if (!phone) return null;
  const where = coords ? ` Minha localização: https://maps.google.com/?q=${coords.lat},${coords.lng}` : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(`Preciso de ajuda na estrada (viagem pelo RoadSA).${where}`)}`;
}
