// Mock de rotas salvas para a listagem inicial. Em memória apenas — sem persistência
// real (nem localStorage, nem backend); reinicia a cada carregamento da página.

import { DEFAULT_TRIP, type TripState } from "@/lib/itinerary";

export type SavedTrip = { id: string; title: string; trip: TripState };

export function blankTrip(): TripState {
  return {
    origin: "Curitiba, PR",
    destinations: [{ name: "Florianópolis, SC", days: 2 }],
    maxHours: 6,
    maxKm: 450,
    startDate: new Date().toLocaleDateString("sv-SE"),
    roadType: { surface: "asfalto", style: "rapida" },
    pilots: [],
    notifyChannel: "app",
    beginnerMode: false,
  };
}

export const SAMPLE_SAVED_TRIPS: SavedTrip[] = [
  {
    id: "litoral-sc",
    title: "Litoral de Santa Catarina",
    trip: DEFAULT_TRIP,
  },
  {
    id: "serra-gaucha",
    title: "Serra Gaúcha em família",
    trip: {
      origin: "Curitiba, PR",
      destinations: [
        { name: "Gramado, RS", days: 3 },
        { name: "Canela, RS", days: 2 },
      ],
      maxHours: 5,
      maxKm: 400,
      startDate: "2026-11-02",
      roadType: { surface: "asfalto", style: "cenica" },
      pilots: [],
      notifyChannel: "whatsapp",
      beginnerMode: true,
    },
  },
  {
    id: "nordeste-moto",
    title: "Nordeste com o motoclube",
    trip: {
      origin: "Salvador, BA",
      destinations: [
        { name: "Praia do Forte, BA", days: 2 },
        { name: "Jericoacoara, CE", days: 4 },
      ],
      maxHours: 6,
      maxKm: 450,
      startDate: "2026-12-01",
      roadType: { surface: "asfalto", style: "rapida" },
      pilots: [
        { id: "p1", name: "Caco", maxHours: 7, maxKm: 500 },
        { id: "p2", name: "Mariana", maxHours: 5, maxKm: 350 },
      ],
      notifyChannel: "telegram",
      beginnerMode: false,
    },
  },
];
