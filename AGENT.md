# RoadSA — instruções do projeto

Protótipo (MVP de projeto de faculdade) de uma plataforma de **planejamento inteligente de road trips** no Brasil.
O diferencial é o **motor de planejamento**: transformar restrições (dias, horas/dia, km/dia, permanência por destino)
em um roteiro dia a dia, recalculado quando qualquer variável muda. O mapa é só visualização.

Mantenha simples: é um MVP acadêmico. Prefira a solução mais direta e componentes prontos do shadcn a abstrações novas.

## Stack

- **Next.js 16** (App Router, `src/`) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (estilo `base-nova`, sobre Base UI) — componentes em `src/components/ui`
- **next-themes** (modo claro/escuro, classe `.dark`)
- **Mapbox GL JS** (mapa, Geocoding, Directions, Search Box)
- **pnpm**

> Next 16 tem mudanças que quebram APIs antigas (ex.: `middleware` virou `proxy`). Antes de usar uma API do Next,
> leia o guia em `node_modules/next/dist/docs/` (ver também `AGENTS.md`).

## Comandos

```bash
pnpm install
cp .env.example .env.local   # cole seu token público do Mapbox
pnpm dev                     # http://localhost:3000
pnpm lint
pnpm build
```

## Estrutura

```
src/
  proxy.ts                  # protege rotas: sem cookie → /login; logado em /login → /
  app/
    layout.tsx              # ThemeProvider, fontes
    page.tsx                # tela principal (header + <Planner/>), protegida
    actions.ts              # server actions: login / logout
    login/                  # página e formulário de login
  components/
    planner/                # planner.tsx (estado), trip-form, itinerary-view, trip-map
    ui/                     # shadcn (gerado — adicione com `pnpm dlx shadcn@latest add <nome>`)
  lib/
    itinerary.ts            # MOTOR do roteiro (lógica de negócio, sem React/Mapbox)
    mapbox.ts               # chamadas ao Mapbox + caches
    auth.ts                 # constantes e validação do login fake
```

## Regras de negócio (não quebrar)

- `buildItinerary()` em `src/lib/itinerary.ts` é o motor. **Não mova lógica de negócio para o mapa**; o mapa apenas desenha o resultado.
- Por trecho: `effectiveMaxKm = max(80, min(maxKm, maxHours × 75 km/h))` e `dias = ceil(km / effectiveMaxKm)`.
  Trechos longos viram vários dias com **paradas sugeridas**.
- Distâncias/paradas ainda são tabelas fixas (`DIST_TABLE`, `WAYPOINT_TABLE`) com fallback determinístico por hash —
  placeholder de demo, a ser trocado por Directions API real.
- Escopo geográfico do MVP: **só Brasil**. Sem navegação in-app (só planejamento). Web desktop-first (≥ 1366×768).
- **Manter o disclaimer** de estimativas na tela de roteiro ("Distâncias, tempos e paradas são estimativas…").
- Tipo de estrada (asfalto/terra) é pós-MVP: o seletor "Pavimento" é só cosmético — não ampliar.
- Não cachear/persistir rotas do Google Maps (restrição de compliance); o provedor atual é o Mapbox.

## Login fake

- Aceita **qualquer e-mail válido + senha de exatamente 3 dígitos** (`src/lib/auth.ts`). Não há usuário nem backend.
- O login (server action) grava o cookie `roadsa_session` (httpOnly, `sameSite=lax`, `maxAge` 30 min) com o e-mail.
  Cookie expirado = deslogado; o `proxy.ts` redireciona para `/login`.
- Logout (server action) apaga o cookie. **Não use isso como segurança real** — é só para o fluxo do protótipo.

## Tema

Duas cores complementares, definidas como tokens em `src/app/globals.css` (`:root` e `.dark`):
**teal** (`--primary`, ação/principal) e **coral** (`--secondary`, destaque/avisos). Use sempre os tokens do
shadcn (`bg-primary`, `text-muted-foreground`, `bg-secondary`…) — nunca cores hex fixas na UI.
(Exceção: a paleta de trechos da rota no mapa, em `trip-map.tsx`, precisa de hex literais.)

## Mapbox

- Token público em `NEXT_PUBLIC_MAPBOX_TOKEN` (`.env.local`, fora do git). Sem token, o mapa mostra um aviso em vez de quebrar.
- O estilo do mapa acompanha o tema (claro/escuro) e há um modo satélite na tela de destinos.
- Rota: linha reta imediata → trajeto real (Directions) assim que responde; cada trecho é uma feature com hover (km/h do dia).

## Convenções

- Texto da UI em **português (pt-BR)**; código e nomes técnicos em inglês.
- Componentes interativos com estado são `"use client"`; páginas e server actions ficam no servidor.
- Antes de concluir uma mudança: `pnpm lint` e `pnpm build` devem passar.
- Contexto de produto e decisões originais: `Brief para Claude Code — Mapa Real no Protótipo RoadSA.md`
  (o protótipo original era um `roadsa-prototype.html` único; está no histórico do git).
