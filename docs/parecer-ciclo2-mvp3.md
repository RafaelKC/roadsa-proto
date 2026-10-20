# RoadSA — Parecer do Ciclo 2 e definição do MVP3

> **Aviso de método.** Os pedidos abaixo são uma **estimativa** do que cada um dos 10 entrevistados do Ciclo 1 pediria ao ver o MVP2.
> Foram inferidos a partir dos relatórios RA1 e RA2 (dores, ganhos, faltas e dúvidas de cada um). **Não são falas reais.**
> Precisam ser confirmados nas entrevistas do Ciclo 2.

## 1. O que o MVP2 já entregou (e uma correção)

Perfis de piloto, alerta de condição de estrada (simulado), canal de notificação, modo iniciante e listagem de rotas.

**Correção:** o relatório do Ciclo 1 diz que o modo iniciante "simplifica a explicação dos termos no roteiro". No código do v2 ele só
mostrava um selo e o botão "Usar sugestão" (5h/350 km). A explicação dos termos **não existia** no roteiro. Passa a existir no v3.

## 2. O que cada entrevistado provavelmente pediria ao ver o MVP2

| # | Entrevistado | Reação provável ao v2 | Pedido para o v3 |
|---|---|---|---|
| 1 | Caco (motoclube) | Gostou dos perfis e do alerta, mas quer controle sobre o volume de notificações | Escolher quantos alertas receber; saber quem está limitando o grupo; ponto de encontro e avaliação de estradas por outros motociclistas |
| 2 | Tiago (só pelo bolso) | Continua sem ver o que o app faz que o Maps não faz | Custo da viagem (combustível e pedágio), opção de evitar pedágio, valor mostrado antes de qualquer pagamento |
| 3 | Camila (iniciante) | O modo iniciante ajudou, mas os termos continuam confusos | Explicação dos termos no próprio roteiro, ritmos prontos ("não sei meu limite"), roteiros-exemplo |
| 4 | Marcos e Nátaly (casal) | "Perfis de piloto" soa como coisa de moto | Perfis para qualquer motorista, rateio a dois, paradas "a dois" (mirantes), roteiro visível para os dois |
| 5 | Lucas (orçamento curto) | Quer o custo logo de cara | Custo total na tela inicial, rateio por pessoa, rota mais barata |
| 6 | Laura (internacional) | Satisfeita; o que falta está fora do escopo | Pacote internacional, documentação de fronteira, seguro-viagem (escopo futuro) |
| 7 | Diego e Elisa (bebê) | O v2 não trata pausa frequente nem infraestrutura | Pausa fixa a cada 2h, critérios de parada (trocador, amamentação), tela menos poluída, previsão de temperatura |
| 8 | Renata (pet) | Procura o filtro pet na primeira tela | Filtro pet-friendly visível (não em "avançado"), área verde nas paradas |
| 9 | Clara e Nathalia (grupo de amigas) | O roteiro é de uma pessoa só | Roteiro compartilhado, votação de paradas, paradas fotografáveis, compartilhar nos stories |
| 10 | Ana Beatriz (viaja só) | Acha o app "neutro demais" sobre segurança | Contato de emergência, aviso de trecho sem sinal, avisar contato se não chegar, paradas movimentadas |

**Pedidos que aparecem em mais de um perfil** (peso maior na priorização):
custo e rateio (#2, #4, #5, mais Rafael/Thiago, Jef, Karel no RA1); critérios de parada por perfil (#4, #7, #8, #9);
segurança (#10, #6, Thiago e Karel do RA1); compartilhar o roteiro (#4, #9, #1); termos mais simples (#3).

## 3. O que foi implementado no v3

| Mudança | Origem | Onde |
|---|---|---|
| Custo estimado (combustível + pedágio), rateio por pessoa, custo por dia; carro ou moto; opção "evitar pedágios" (+8% de caminho). Aparece no formulário, no cabeçalho, no roteiro e na listagem inicial | #2, #4, #5 | `itinerary.ts`, `trip-form.tsx`, `itinerary-view.tsx`, `trip-list.tsx` |
| Pausa obrigatória a cada 2h, 3h ou 4h, com horário de saída e de chegada contando as pausas (15 min cada) | #7, #4 | `itinerary.ts` |
| "O que as paradas precisam ter": bebê/crianças, pet-friendly, mirantes e fotos, movimentadas e seguras. Visível no formulário, listado em cada pausa | #7, #8, #9, #4, #10 | `trip-form.tsx`, `itinerary-view.tsx` |
| Segurança: contato de emergência, botão que envia a localização por WhatsApp, opção "avisar se eu não chegar" (só a preferência é salva), aviso de trecho com pouco sinal | #10, #6 | `export.ts`, `itinerary-view.tsx` |
| Compartilhar: copiar resumo para WhatsApp/stories e baixar planilha CSV para usar offline | #9, #4, #1 | `export.ts` |
| Modo iniciante de verdade: glossário no roteiro, explicação nos trechos e 4 ritmos prontos (Leve, Confortável, Moderado, Puxado) | #3 | `trip-form.tsx`, `itinerary-view.tsx` |
| "Quem dirige" em vez de "piloto"; o roteiro diz quem está puxando o limite do grupo | #1, #4 | `itinerary.ts`, `itinerary-view.tsx` |
| Quantidade de alertas: só essenciais, resumo diário ou todos | #1, #7 | `trip-form.tsx` |

**Limites do protótipo (mantidos de propósito):**
- Custos usam premissas fixas (12 km/l carro, 25 km/l moto, gasolina R$ 6,30/l, pedágio médio por km). Não incluem hospedagem nem alimentação.
- As paradas mostram **critérios**, não estabelecimentos. Não há base real de pontos de apoio.
- "Pouco sinal" e "alerta de estrada" são simulados por hash, como no v2.
- Nenhum alerta ou aviso de chegada é enviado de fato.
- Distâncias seguem estimativas (tabela fixa + hash). Nenhuma rota do Google Maps é guardada.

## 4. O que ficou de fora do v3 (e por quê)

- **Roteiro editável em tempo real e votação de paradas (#9, #4):** exige backend e contas. Fica para o v4.
- **Avaliação de estradas por outros usuários (#1, RA1 Jef/Karel):** exige comunidade e moderação, ainda sem massa de usuários.
- **Modo internacional e seguro-viagem (#6):** fora do escopo "só Brasil" do MVP.
- **Previsão de temperatura (#7, #8):** depende de provedor de clima. Entra junto com alertas reais.
- **Pacotes por viagem e freemium (#1, #2, #3, #5, #4):** é decisão de modelo de negócio, não de tela. Ver recomendação abaixo.

## 5. Recomendação sobre a Fonte de Receita

No Ciclo 1, 8 dos 10 entrevistados pagariam, quase todos com condição: "depois de testar", "por viagem" ou "se o filtro for confiável".
Só #2 e #5 resistem a qualquer mensalidade. Recomendação para validar no Ciclo 2: **freemium** (roteiro, custo e rateio grátis) **e um passe
por viagem** para as funções de segurança, filtros de parada e compartilhamento. Assinatura mensal fica como opção secundária (Caco, Diego e Elisa, Renata).
Há tensão a decidir: o público de orçamento curto (#5) conflita com o posicionamento premium dos demais.

## 6. Resposta para o quadro "MVP3 — versão após Ciclo 2"

### Quadro 1 — O que precisará ser ajustado? Sugestões e dicas para idealizar a versão 3

Custo estimado com rateio por pessoa e opção de evitar pedágio; pausa obrigatória a cada 2h/3h/4h com horário de chegada;
critérios de parada por perfil (bebê, pet, foto, segurança); contato de emergência com envio de localização e aviso de trecho sem sinal;
compartilhar o roteiro (WhatsApp e planilha offline); modo iniciante com glossário e ritmos prontos; limite do grupo mostrando quem o define;
quantidade de alertas configurável. Para o v4: roteiro colaborativo em tempo real, dados reais de paradas e de estrada, e modelo freemium + passe por viagem.

### Quadro 2 — Métricas e metas do Ciclo 2

1. **Taxa de compreensão do MVP:** % de entrevistados que compreenderam totalmente a proposta sem explicação extra.
   Ciclo 1: 60% (6 de 10). **Meta: ≥ 90%.**
2. **Taxa de dúvida na configuração de limites:** % que ficou em dúvida sobre horas/km por dia, com o ritmo pronto e o glossário disponíveis.
   **Meta: ≤ 10%** (o v2 mirava ≤ 20%).
3. **Taxa de adesão ao ritmo pronto e ao modo iniciante:** % de usuários sem experiência prévia que usam um ritmo sugerido.
   **Meta: ≥ 60%** (o v2 mirava ≥ 50%).
4. **Taxa de valor percebido em custo e rateio:** % que, ao ver o custo estimado por pessoa, diz que isso o ajuda a decidir a rota.
   **Meta: ≥ 70%.**
5. **Disposição a pagar:** % que aceitaria pagar no modelo freemium + passe por viagem.
   Ciclo 1: 8 de 10 com condição. **Meta: ≥ 60% sem condição**, ou seja, que topem pagar depois de testar.
