# Brief para Claude Code — Mapa Real no Protótipo RoadSA

2026-09-21 · @Someone

## 1. Contexto do produto — RoadSA

RoadSA é uma plataforma de **planejamento inteligente de road trips**, começando pelo mercado nacional (Brasil) antes de expandir pra América do Sul. O diferencial não é o mapa/rota em si — isso o Google Maps já resolve — é o **motor de planejamento**: transformar restrições do usuário (dias disponíveis, horas máx./dia dirigindo, km máx./dia, dias de permanência por destino) em um roteiro dia a dia completo, realista e recalculável quando qualquer variável muda.

### Decisões já tomadas no Notion do projeto (workspace RoadSA) relevantes pra esta tarefa

- **Escopo geográfico do MVP: nacional (Brasil), não internacional** (decisão de 16/08/2026, página *MVP*). O motor é agnóstico a fronteira, mas o MVP testa só rotas dentro do Brasil pra validar o núcleo com mais volume/velocidade de usuários, sem depender ainda de dados de fronteira/documentação dos 5 países do foco original (Argentina, Chile, Uruguai, Paraguai, Bolívia). Internacional volta como primeira prioridade pós-MVP.
- **Stack decidida**: Angular + .NET/C# + PostgreSQL + Azure (só trocar com ganho claro). O protótipo atual (`roadsa-prototype.html`) é vanilla HTML/CSS/JS standalone — **não é** a stack final, é só um artefato de validação de UX/fluxo antes de portar pra Angular.
- **Plataforma do MVP: web responsive, desktop-first** (decisão de 18/08/2026). Suporta a partir de 1366×768, sem breakpoints mobile/tablet dedicados no MVP — a criação/edição do roteiro é entrada de dados complexa, mais adequada a tela grande.
- **Sem navegação in-app** (decisão de 17/08/2026): o produto cuida só do planejamento (roteiro, tempo/distância estimado, paradas, atrações); o usuário abre um app externo (deep link) pra dirigir de fato. Isso importa pra esta tarefa porque o mapa real que vamos plugar é **só visualização/planejamento**, não precisa de turn-by-turn nem de tracking de posição em tempo real.
- **Restrição de cache de rotas do Google Maps Platform** (Regulação/Compliance, 17/08/2026): os termos do Google Maps Platform proíbem pré-busca, indexação ou armazenamento de conteúdo de rotas/tiles fora das condições limitadas do contrato. Isso afeta diretamente qualquer feature de reuso de rotas calculadas (ex.: "usar este roteiro" do backlog) e pesa na escolha de provedor — ver seção 5 deste brief.
- **Disclaimer de responsabilidade por estimativas** (CDC, mesma página de Regulação): tempo, custo, condições de estrada e informações de fronteira são estimativas geradas por IA/APIs terceiras — o produto real precisa de um disclaimer visível na tela de roteiro. O protótipo já inclui esse texto ("Distâncias, tempos e paradas são estimativas geradas automaticamente — sujeitas a confirmação na estrada") — **manter esse disclaimer** na versão com mapa real.
- **Tipo de estrada (asfalto/terra, rápida/cênica) é pós-MVP**, não input do MVP (página *Planejamento de rota*, "O que entra depois"). O protótipo já não tem esse seletor — não reintroduzir.
- A IA é o "cérebro" do produto — não um chatbot que só gera texto, mas um sistema que toma decisões sobre o roteiro cruzando rota + restrições + tempo + interesses + dados externos. O algoritmo de rota puro (A→B = X horas) já é resolvido por APIs de mapas; o valor do produto é a **camada de restrições + recálculo** em cima disso — é exatamente essa camada que o protótipo simula com JS puro, e que precisa continuar sendo o "motor" mesmo depois de plugar um mapa de verdade (o mapa é só a *visualização* do que o motor decide, não deve virar a fonte da lógica de negócio).

## 2. Estado atual do artefato — `roadsa-prototype.html`

Arquivo único, standalone, sem dependências externas (nenhum CDN, nenhum build step) — abre direto no navegador. \~650 linhas: `<style>` inline, `<body>` com dois `<section>` (`#screen-destinos` e `#screen-roteiro`) e um `<script>` IIFE no final. **Este é exatamente o arquivo que o Claude Code vai receber e evoluir** — ele deve ler o arquivo inteiro antes de tocar em qualquer linha.

### Estrutura de dados (`state`)

```js
const state = {
  origin: "Curitiba, PR",
  destinations: [
    { name: "Florianópolis, SC", days: 3 },
    { name: "Foz do Iguaçu, PR", days: 2 },
    { name: "Bonito, MS", days: 4 }
  ],
  maxHours: 6,
  maxKm: 500,
  startDate: "2026-10-12"
};
const SPEED_KMH = 75; // velocidade média assumida pro cálculo de horas de direção
```

### Tabelas hardcoded de distância e paradas

- `DIST_TABLE`: dicionário `"CidadeA|CidadeB" → km` com 3 pares reais aproximados (Curitiba→Florianópolis 300km, Florianópolis→Foz do Iguaçu 940km, Foz do Iguaçu→Bonito 700km).
- `getDistance(a,b)`: consulta `DIST_TABLE`; se o par não existir (ex.: usuário adiciona uma cidade nova pelo formulário), cai em `estimateKm(a,b)` — um hash determinístico das strings que gera um número entre 180 e 830. **Isso é só placeholder de demo** — é exatamente o que a geocodificação + Directions API real substitui.
- `WAYPOINT_TABLE`: paradas intermediárias pré-definidas por par de cidades (`Florianópolis, SC|Foz do Iguaçu, PR` → `["Chapecó, SC"]`; `Foz do Iguaçu, PR|Bonito, MS` → `["Dourados, MS"]`). Pares sem entrada geram nome genérico `"Parada intermediária N"`.

### Motor de geração do roteiro — `buildItinerary()`

Esta é a função central e **não deve ser removida nem ter sua lógica de negócio alterada** — só a forma como o resultado é desenhado no mapa muda.

1. Monta a cadeia `[origem, ...destinos na ordem]`.
2. Para cada trecho consecutivo, calcula `km` via `getDistance`, define `effectiveMaxKm = min(maxKm, maxHours*SPEED_KMH)`, e `numDays = ceil(km / effectiveMaxKm)`.
3. Se `numDays > 1`, busca paradas em `getWaypoints(from,to,numDays-1)` e quebra o trecho em `numDays` dias de viagem, cada um com sua própria entrada `{type:"travel", day, from, to, km, hours, isIntermediateStop}`.
4. Depois de cada trecho, se o destino tiver `days > 0`, insere uma entrada `{type:"stay", dayStart, dayEnd, place, days}`.
5. Retorna `{ items, mapStops, totals: {km, days, hours} }` — `mapStops` é a sequência ordenada cronologicamente de todos os pontos (origem, paradas intermediárias, destinos), na ordem exata em que aparecem na viagem. Cada `travel` item recebe um `mapIndex` correspondente à posição do seu destino em `mapStops`; cada `stay` item recebe o `mapIndex` do destino onde a estadia acontece.

### Renderização do mapa atual — a parte que será substituída

- `pointForIndex(i, total, w, h)`: gera coordenadas x/y **fictícias** (não são lat/lng reais) espalhando N pontos numa curva diagonal dentro de um viewBox `1000×800`, só pra dar impressão de rota.
- `smoothPath(points)`: gera um `d` de `<path>` SVG usando curvas quadráticas simples entre os pontos.
- `renderMap(svgEl, tagsContainer, mapStops, activeIndex)`: limpa e redesenha tudo via SVG puro (`document.createElementNS`) — grid de fundo, path da rota, círculos coloridos por tipo de ponto (verde=origem, azul=destino, cinza pequeno=parada), labels de texto, e tags HTML posicionadas em `%` sobre o SVG com o nome da cidade.
- Chamada em dois lugares: `refreshMap1()` (tela 1, atualiza a cada mudança no formulário) e dentro de `renderRoteiro()` / no `onclick` de cada `.day-card` (tela 2, com `activeIndex` = `mapIndex` do dia clicado, que aumenta o raio do círculo daquele ponto).

### Telas e navegação

- `goToScreen(n)`: alterna a classe `.active` entre `#screen-destinos` e `#screen-roteiro`, atualiza o texto do topbar ("Passo 2 de 4" / "Passo 3 de 4") e chama `refreshAll()` ou `renderRoteiro()`.
- Tela 1: sidebar com origem (fixo), lista de destinos (nome, stepper de dias, mover ▲▼, remover ✕), formulário inline de "+ Adicionar destino", sliders de horas/km máx. por dia (`<input type=range>`), campos de data (início editável, retorno calculado e desabilitado), texto "≈ N dias no total" recalculado a cada input, botão "Gerar roteiro".
- Tela 2: header com botão voltar, título com a cadeia de cidades, 3 "stat pills" (km/dias/horas), timeline scrollável de `.day-card` (clicável, destaca o card e o ponto no mapa) e o mapa ao lado.

### Tema e responsividade

- Variáveis CSS em `:root` com fallback de dark mode via `@media (prefers-color-scheme: dark)` e `:root[data-theme="dark"]`.
- `@media (max-width: 900px)` empilha sidebar/mapa e timeline/mapa verticalmente — mas o produto real é desktop-first (ver seção 1), então isso é só uma rede de segurança, não o alvo principal.

## 3. Objetivo desta tarefa

O usuário pediu explicitamente: **"você consegue usar o mapa de verdade?"** — ou seja, substituir o mapa esquemático em SVG (pontos fictícios numa curva) por um **mapa interativo real**, com tiles/imagery de verdade e, idealmente, a rota real desenhada por uma Directions API (não mais a curva `smoothPath` fake).

Esse trabalho está sendo feito no Claude Code (não no ambiente de chat) porque o artefato publicado no Claude.ai roda num sandbox que bloqueia qualquer requisição de rede/imagem externa fora de uma lista curta de CDNs de script (cdnjs, jsdelivr, tailwind cdn, jquery) — então tiles de mapa (Google Maps, Mapbox, Leaflet+OSM) simplesmente não carregam lá. Rodando localmente via Claude Code não existe essa restrição.

### Limite explícito — características mínimas do usuário, ipsis litteris

Essas são as características que o usuário definiu pro protótipo, palavra por palavra, e que já estão implementadas no arquivo (seção 2 desta doc). **Esta tarefa não adiciona nada além do item "Mapa com a rota" da segunda lista — o resto já existe e não deve ser expandido:**

**Núcleo (sem isso não é o produto):**

- Origem + lista de destinos
- Dias totais + dias de permanência por destino
- Limite de horas/dia e km/dia dirigindo
- Motor gera roteiro dia a dia (texto simples: "Dia 1 — A → B, X km, Y h")
- Recalcular quando usuário muda algo (add dia, muda destino)

**Mínimo pra não parecer brinquedo:**

- Mapa com a rota ← **é isso que esta tarefa entrega, com mapa de verdade em vez do embed/SVG**
- Timeline visual do roteiro (mesmo que simples) — já existe (`.day-card`)
- Paradas intermediárias sugeridas quando trecho > limite — já existe (`isIntermediateStop`)

O Claude Code **não deve** interpretar "mapa de verdade" como licença pra adicionar funcionalidade nova fora dessa lista (reservas, hotéis, IA conversacional, fronteira, etc. — tudo isso já está fora de escopo na seção 9). O trabalho é estritamente trocar a camada visual do mapa, mantendo cada característica acima intacta.

### Sem backend, sem lógica avançada — é mock

Reforçando: **nenhum backend, nenhum serviço de servidor, nenhuma lógica de negócio nova**. O arquivo continua sendo um HTML/JS estático rodando no navegador, exatamente como é hoje (seção 2) — o Claude Code não deve introduzir um servidor, banco de dados, geocodificação dinâmica em tempo real contra uma API paga, nem qualquer processamento que não existia antes.

O objetivo desta tarefa é só **dar a noção visual e de custo** de como fica/quanto custaria usar um mapa de verdade — não construir a versão funcional de produção. Isso muda a seção 6 (Dados e credenciais) e a seção 7 (Especificação técnica) desta doc: em vez de chamar geocodificação em tempo real pra cidades novas, **usar sempre coordenadas mockadas/hardcoded** — as 6 cidades já na tabela da seção 6 cobrem o roteiro de demonstração; se o usuário digitar uma cidade fora dessa lista no "+ Adicionar destino", pode cair num ponto aproximado fixo (mesmo hash determinístico que já existe hoje pra distância) só pra não quebrar a tela, sem chamada de rede de geocodificação de verdade. Isso também responde a pergunta 3 da seção 9 — decisão tomada: **mockar, não geocodificar de verdade**.

### O que muda

- O mapa real substitui inteiramente `pointForIndex`, `smoothPath` e a parte de desenho de pontos/rota dentro de `renderMap()` nas duas telas (`#mapSvg1`/`#mapTags1` e `#mapSvg2`/`#mapTags2`).
- Os pinos continuam representando exatamente os mesmos dados que `buildItinerary()` já calcula (`mapStops`: origem, paradas intermediárias, destinos) — só a camada visual troca de SVG fictício pra tiles + coordenadas geográficas reais.
- A rota entre pinos deve, no mínimo, ligar os pontos com uma linha; idealmente, usar a Directions/Routes API do provedor escolhido pra desenhar o traçado real da estrada (mais fiel que uma linha reta entre os pinos).
- O clique num `.day-card` da tela 2 continua centralizando/destacando o pino correspondente no mapa — esse comportamento (`activeIndex` → destaque) precisa ser recriado com a API do mapa escolhido (ex.: `map.flyTo()`/`panTo()` + trocar o ícone do marcador).

## 4. Referências visuais enviadas pelo usuário

O usuário anexou 7 screenshots de concorrentes/apps de referência. Segue o que vale aproveitar de cada uma **especificamente pra esta tarefa de mapa** (padrões mais amplos de produto ficam fora de escopo — ver seção 9):

1. **Wanderlog — tela "Explore"** (trip "Trip to Patagonia"): mapa real do Google Maps ocupa a maior parte da tela (à direita), sidebar de planejamento à esquerda menor. Pinos numerados (1, 2, 3...) na mesma ordem da lista do painel — é exatamente o padrão que o protótipo já segue com `mapIndex`, só falta a camada real. Controles flutuantes no canto superior direito do mapa: busca, camadas (satélite), ícone de hospedagem — nosso `.map-controls` já imita essa posição/estilo, só precisa ficar funcional. Botão "Export" com selo "PRO" no canto superior esquerdo do mapa.
2. **Wanderlog — tela "Places to visit"**: mesmo mapa da tela 1, mas o painel esquerdo agora lista lugares recomendados com foto + descrição "From the web: ..." e um carrossel horizontal de "Recommended places" com botão `+` pra adicionar. Tag flutuante "Zoom into places" no canto inferior esquerdo do mapa — sugere um botão de **auto-fit dos pinos no viewport** (`fitBounds`) sempre que a lista de destinos muda; vale replicar esse comportamento quando o Claude Code trocar o SVG pelo mapa real.
3. **Furkot (print rotulado "Teste")**: painel esquerdo é uma tabela (Destino, Noites com stepper +/-, Sleeping, Activities, Transport) — muito parecido com nossa lista de destinos + steppers de dias. O mais relevante pro mapa: as **linhas entre os pinos são retas/pontilhadas por cima do mapa real**, não uma rota seguindo estradas, e cada segmento mostra um badge vermelho com a distância ("96 km", "461 km"...) direto sobre a linha. Isso confirma que uma primeira versão com linha reta (polyline simples) entre coordenadas reais já é aceitável — a rota seguindo estrada de verdade (Directions API) pode vir depois. Também vale copiar o badge de km sobre o próprio traçado do mapa, não só na lista lateral.
4. **Roadtrippers**: aqui sim a rota desenhada **segue a estrada de verdade** (linha azul acompanhando a BR/rodovia, não reta), com pinos numerados de início/fim arredondados. Painel esquerdo com "Trip settings", "Routing options", lista de paradas por dia e botão "+ Add a stop". Esse é o alvo final pra quando plugarmos uma Directions/Routes API de verdade em vez de só uma polyline reta.
5. **Google Flights**: não é rota de carro, mas o padrão de campo "Descreva sua viagem ideal, deixe a IA encontrar" é uma pista de UX pra uma fase futura de criação de viagem via linguagem natural — **fora de escopo desta tarefa de mapa**, fica registrado pro backlog de IA conversacional.
6. **Mindtrip**: interface é chat-first (histórico de conversa à esquerda) com o roteiro sendo descrito em texto estruturado (lista numerada com nomes de lugar em negrito + descrição) e um mapa real ao lado em tema escuro, com marcadores por cidade/região. O padrão de "a conversa aponta um lugar → o mapa reage" é o mesmo princípio do nosso clique no `.day-card` → destaque no mapa, só que disparado por chat em vez de clique. Fica de referência pra quando a IA conversacional entrar (pós-MVP).
7. **Rome2Rio** (Curitiba → Roma): mapa mundial com linha reta "como o pássaro voa" entre origem e destino, junto com uma lista de opções de transporte (voo, ônibus+voo) mostrando duração e faixa de preço por opção. Não se aplica a rotas de carro dentro do Brasil, mas o padrão de **múltiplas opções de rota com trade-off de tempo/preço lado a lado** é exatamente o que a página *Planejamento de rota* já registra como pós-MVP ("múltiplas opções de rota com trade-off explicado") — não implementar agora, só ficar de olho pra reaproveitar esse layout depois.

## 5. Opções de provedor de mapa

A página **Decisões** do Notion lista o provedor de mapas como **decisão em aberto** — ainda falta comparar candidatos e custo/cobertura na América do Sul (ver página *APIs*). Este brief não fecha essa decisão de produto; só recomenda um provedor **pro protótipo/spike no Claude Code**, sabendo que pode trocar depois sem reescrever o motor (`buildItinerary` já é agnóstico de mapa).

| Provedor | A favor | Contra / risco |
| --- | --- | --- |
| **Google Maps Platform** (JS API + Directions) | Cobertura e qualidade de dados no Brasil é referência; a maioria dos concorrentes (Wanderlog, Roadtrippers) usa. | Termos de serviço **proíbem cache/armazenamento de rotas e tiles** fora das condições limitadas do contrato (já registrado na seção 1) — trava a feature futura de "usar este roteiro". Custo por carregamento de mapa + por chamada de Directions escala rápido. Exige cartão de crédito pra gerar a key mesmo no free tier. |
| **Mapbox GL JS** | Free tier generoso pra prototipagem (50k carregamentos de mapa/mês), estilos customizáveis, Directions API própria, sem a mesma restrição contratual de cache de tiles do Google. Usado pelo Furkot e pelo Roadtrippers (print 4) — os dois concorrentes mais próximos do nosso caso de uso. | Cobertura/qualidade de geocodificação em cidades menores do Brasil pode ser um pouco inferior ao Google em alguns pontos; ainda assim, boa pra rodovias/cidades médias-grandes que o MVP nacional cobre. |
| **Leaflet + tiles OpenStreetMap (OSM) gratuitos** | Zero custo, zero API key pra só exibir o mapa; ótimo pra um primeiro spike bem rápido no Claude Code. | Tiles públicos do OSM (`tile.openstreetmap.org`) têm política de uso justo (fair use) — não são pra tráfego de produção; sem Directions API própria (precisaria combinar com OpenRouteService ou OSRM pra rota real seguindo estrada). |
| **OpenRouteService** (rotas) + **Leaflet/OSM** (tiles) | Gratuito com limite razoável, API de rota real (isochrones, directions) sem os termos restritivos do Google. | Menos maduro/documentado que Mapbox; latência e disponibilidade menos previsíveis pra produção. |
| **HERE** | Alternativa enterprise com bom suporte a logística/rotas de veículo (inclusive restrições de caminhão, se um dia fizer sentido). | Menos usado nos concorrentes de referência (nenhum dos 7 prints usa HERE visivelmente); curva de integração menos documentada em exemplos web comuns. |

### Recomendação para este spike no Claude Code

**Mapbox GL JS**, pelos seguintes motivos: (1) é o que Furkot e Roadtrippers usam — os dois prints mais próximos do produto final (seção 4, itens 3 e 4); (2) free tier cobre com folga o uso de desenvolvimento/demo; (3) não carrega a mesma restrição contratual de cache que preocupa o Google Maps Platform, então o spike já nasce compatível com a decisão de compliance já tomada; (4) tem Directions API própria pra, numa segunda iteração, desenhar a rota seguindo estrada de verdade em vez de só uma linha reta entre pinos (como o Furkot faz — seção 4, item 3).

**Isso é uma recomendação de spike, não a decisão final de produto** — o Claude Code deve deixar o provedor fácil de trocar (isolado numa camada própria, nunca chamado direto espalhado pelo código) e o usuário confirma o provedor definitivo depois, junto com a página *APIs* do Notion.

## 6. Dados e credenciais necessárias

### Chave de API

- Criar uma conta Mapbox (ou o provedor escolhido) e gerar um **access token público** (Mapbox usa token público mesmo pro GL JS no client-side — isso é esperado e documentado, não é uma chave secreta de servidor).
- Guardar o token numa variável de ambiente/config, nunca hardcoded no HTML publicado: ex. um arquivo `.env` (`MAPBOX_TOKEN=...`) lido no build, ou um `config.js` **fora do controle de versão** (`.gitignore`) que o `roadsa-prototype.html` importa. O Claude Code deve deixar um `config.example.js` ou `.env.example` documentando a variável esperada, já que quem for rodar o protótipo vai precisar colar a própria key.

### Coordenadas (lat/lng) das cidades já usadas no protótipo

Uma geocodificação real (via API do provedor) é o caminho certo em produção, mas pra não depender de chamada de rede só pra plotar os pinos do protótipo, seguem coordenadas aproximadas dos centros das cidades já hardcoded em `DIST_TABLE`/`WAYPOINT_TABLE` — usar como fallback/seed local:

| Cidade | Latitude | Longitude |
| --- | --- | --- |
| Curitiba, PR | -25.4284 | -49.2733 |
| Florianópolis, SC | -27.5954 | -48.5480 |
| Chapecó, SC | -27.1004 | -52.6152 |
| Foz do Iguaçu, PR | -25.5478 | -54.5882 |
| Dourados, MS | -22.2211 | -54.8056 |
| Bonito, MS | -21.1261 | -56.4836 |

Pra qualquer cidade **adicionada dinamicamente** pelo formulário "+ Adicionar destino" (que hoje cai no `estimateKm` fictício), o Claude Code precisa decidir entre (a) geocodificar via API do provedor em tempo real (melhor, mas depende de rede/key), ou (b) manter um fallback de coordenada aproximada só pro protótipo não quebrar sem internet — deixar essa escolha explícita no código, não implícita.

### Variáveis de ambiente / config esperadas

```
MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Se o Claude Code preferir Google Maps Platform (trocando a recomendação da seção 5), a variável correspondente seria `GOOGLE_MAPS_API_KEY`, e nesse caso vale revisitar com o usuário a ressalva de cache de rotas antes de seguir.

## 7. Especificação técnica passo a passo

1. **Ler `roadsa-prototype.html` inteiro primeiro.** Não alterar `state`, `DIST_TABLE`, `WAYPOINT_TABLE`, `getDistance`, `getWaypoints` nem `buildItinerary` — essa é a lógica de negócio do motor de planejamento e deve continuar sendo a fonte da verdade.
2. **Adicionar um dicionário de coordenadas** (`CITY_COORDS`, seção 6 desta doc) e uma função `getCoords(cityName)` com fallback mockado (mesmo hash determinístico já usado em estimateKm) pra cidades fora do dicionário — nunca uma chamada de geocodificação real (ver "Sem backend, sem lógica avançada" na seção 3).
3. **Carregar o SDK do provedor** (Mapbox GL JS recomendado, seção 5) via `<script>`/`<link>` no `<head>`. Se for rodar só localmente no Claude Code (fora do sandbox de artifact publicado), pode usar o CDN oficial do Mapbox sem restrição de host.
4. **Substituir os dois `<svg id="mapSvg1">` / `<svg id="mapSvg2">`** por dois `<div>` contêineres (ex. `#map1`, `#map2`) onde o SDK do mapa vai montar o canvas/WebGL dele. Manter os `#mapTags1`/`#mapTags2` só se o design de popups do provedor não cobrir esse caso — senão, usar os popups/markers nativos do SDK.
5. **Reescrever `renderMap(...)`** pra, em vez de desenhar SVG, fazer: (a) instanciar o mapa uma única vez por tela (guardar a instância numa variável de módulo, não recriar a cada chamada); (b) limpar os markers antigos; (c) para cada item de `mapStops`, criar um marker na coordenada real (`getCoords`), com ícone/cor diferenciando origem (verde) / destino (azul, numerado) / parada intermediária (cinza, menor) — mesma lógica de cores que já existe hoje, só troca a implementação; (d) desenhar a rota entre os pontos — primeira iteração pode ser uma `LineString` reta ligando as coordenadas em ordem (como o Furkot faz, seção 4.3); iteração seguinte, se o tempo permitir, chamar a Directions API do provedor pra pegar o traçado real seguindo estrada (como o Roadtrippers, seção 4.4); (e) ajustar o viewport com `fitBounds`/`flyTo` pra enquadrar todos os pontos automaticamente (padrão do "Zoom into places" do Wanderlog, seção 4.2).
6. **Recriar o destaque de dia selecionado**: hoje o `onclick` de `.day-card` chama `renderMap(..., activeIndex)` que aumenta o raio do círculo SVG daquele ponto. Na versão real, trocar por: `map.flyTo({center: coords, zoom: ...})` e/ou troca visual do ícone do marker ativo (ex. escala maior, cor destacada), sem precisar redesenhar o mapa inteiro a cada clique.
7. **Manter o disclaimer de estimativas** (seção 1) visível na tela 2, sem alteração de texto.
8. **Não remover nem reintroduzir** o seletor de tipo de estrada — ele já foi removido do protótipo de propósito (seção 1) e continua fora do MVP.
9. **Testar os três cenários que já funcionam hoje** antes de considerar a tarefa concluída: adicionar/remover destino, mover destino com ▲▼, mudar sliders de horas/km (o recálculo de dias precisa continuar instantâneo), clicar em "Gerar roteiro" e depois em cada `.day-card`.

## 8. Critérios de aceite / não regressão

- [ ] Mapa real (tiles do provedor escolhido) renderiza nas duas telas, substituindo o SVG esquemático.
- [ ] Pinos aparecem nas coordenadas geográficas corretas (não mais posições fictícias em curva).
- [ ] Rota entre pinos desenhada (linha reta é aceitável na primeira versão; rota seguindo estrada é o alvo seguinte).
- [ ] Adicionar destino (tela 1) → novo pino aparece no mapa na posição certa.
- [ ] Remover destino → pino correspondente desaparece.
- [ ] Mover destino com ▲▼ → ordem dos pinos/rota atualiza.
- [ ] Sliders de horas máx./dia e km máx./dia → recálculo de "≈ N dias" continua instantâneo (isso é lógica de `buildItinerary`, não deveria quebrar, mas testar).
- [ ] Botão "Gerar roteiro" → tela 2 mostra os mesmos dados (km, dias, horas, paradas intermediárias) de antes, só que no mapa real.
- [ ] Clicar num `.day-card` → mapa reage (pan/zoom e/ou destaque visual do marker), reproduzindo o comportamento de destaque que existia com o SVG.
- [ ] Disclaimer de estimativas continua visível na tela 2.
- [ ] Tema claro/escuro (`prefers-color-scheme` e `data-theme`) continua funcionando — se o SDK do mapa tiver estilo de mapa escuro (Mapbox tem, ex. `mapbox://styles/mapbox/dark-v11`), trocar o estilo do mapa junto com o tema é um bônus, não obrigatório.
- [ ] Nenhuma chave de API fica hardcoded no HTML committado — variável de ambiente/config conforme seção 6.

## 9. Fora de escopo desta tarefa

- **Portar o protótipo pra Angular/.NET.** Isso continua sendo um HTML/JS standalone; a migração pra stack final é uma etapa separada, posterior à validação de UX.
- **Fechar a decisão definitiva de provedor de mapa.** A seção 5 recomenda Mapbox só pro spike; a decisão de produto (custo, cobertura AS, restrição de cache) fica pra página *APIs* do Notion, com o usuário.
- **Directions API com rota seguindo estrada de verdade** é desejável (seção 4.4, Roadtrippers) mas não é bloqueante — uma linha reta entre pinos (padrão Furkot, seção 4.3) já cumpre o pedido de "mapa de verdade" nesta primeira passada.
- **Geocodificação dinâmica de qualquer cidade digitada** — resolver com fallback simples (seção 6); geocodificação robusta de produção é trabalho futuro.
- **Filtro de tipo de estrada, reservas, hotéis, IA conversacional, múltiplas opções de rota com trade-off (Rome2Rio, seção 4.7)** — todos já registrados como pós-MVP no Notion; não implementar agora.
- **Responsividade mobile/tablet completa** — o `@media (max-width: 900px)` existente é suficiente; o produto real é desktop-first no MVP (seção 1).

### Perguntas em aberto pro usuário confirmar

1. Mapbox está OK como provedor do spike, ou prefere já testar direto com Google Maps Platform (aceitando a ressalva de cache por enquanto, já que é só um protótipo local)?
2. Vale a pena já implementar a Directions API real (rota seguindo estrada) nesta rodada, ou linha reta entre pinos é suficiente por agora?
3. \~\~Pra cidades novas adicionadas no formulário, geocodificar de verdade via API ou aceitar um fallback aproximado?\~\~ Resolvido: mockar sempre (ver seção 3, "Sem backend, sem lógica avançada").
