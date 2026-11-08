<!-- issue: AID-463 | key: draft | doc_id: c80cea92-b9c7-41f9-b812-ae3278454f8f | updated: 2026-08-31 08:18:44.565+00 -->

# AID-463 — Draft: Scoping OP-B — eficácia/engajamento sobre o catálogo 20/20 (funil D+1/D+7/D+21 + instrumentação)

(AID-463)

# AID-463 — DRAFT: Scoping OP-B — Eficácia e engajamento sobre o catálogo 20/20

**Status:** DRAFT — somente leitura; aguarda decisão do board. Zero escrita canônica (nenhum commit/branch/PR; catálogo, bindings, pins e produção intocados; nenhum evento de analytics emitido).
**Owner:** UX Designer (0bfa47c1), delegado pela triagem CEO AID-459 (OP-B scoping, em paralelo à onda OP-A da AID-462). Escopo = recomendação #2 do draft AID-447 (rev `dd27311c`).
**Baseline lida e citada (tudo via `git show 2ec910a9:<path>`, sem checkout):** pin de produção `2ec910a921ac…` (merge PR #208; QA AID-457 **PASS**; frescor re-confirmado AID-458 11/11). Issues lidas: AID-180/AID-348/AID-365 (coorte), AID-412/AID-421/AID-444/AID-448/AID-449/AID-457 (QA), AID-447 (draft estratégico), AID-459 (decreto do arco composto).
**Este draft NÃO antecipa decisão do board** — é input de scoping, no padrão do draft AID-447.

---

## 0. Achado central que reordena o plano de instrumentação

Existem **dois silos de analytics em estados diferentes**, e o título desta delegação ("noopAnalyticsSink → backend ADR-0009") descreve só um deles:

| Silo | Estado no pin `2ec910a9` | Lacuna real |
| --- | --- | --- |
| **OS canônico** (`codexdojo-os-prototype`, a experiência de produção) | Pipeline **completa e já emitindo na UI**: 12 eventos com vocabulário fechado (`src/analytics/events.ts:1-6`), incl. `journey.returned`, `review.started {reason: due\|overdue}`, `mission.started {mode: review\|…}`, `mission.completed`; identidade pseudônima `installationId` (localStorage aleatório, sem PII) + `sessionId` carimbadas em todo evento (`src/analytics/collector.ts:65-79`); fila local com flush por tamanho/intervalo/page-hide e `sendBeacon` (`src/analytics/batcher.ts`, `transports.ts:61`). Emissão real em `useJourneyController.ts:63-65` (onboarding/retorno), `MissionShell.tsx:73-175` (verificação/retry/degradação), `MentorPanel.tsx:95` (hints). | **Transporte padrão é `InMemoryAnalyticsTransport`** (`createServices.ts:52-63`): sem `VITE_ANALYTICS_ENDPOINT`, tudo morre no navegador. Não há coletor. |
| **literacyDojo standalone** (ADR-0009) | Porta `AnalyticsSink` (`src/application/ports.ts:51`), adapters prontos (`noopAnalyticsSink`/console/httpNdjson — `src/adapters/analyticsSinks.ts`), vocabulário fechado de 4 eventos com validação runtime (`src/domain/analytics.ts`). | **Nenhum caso de uso emite**: `AnalyticsSink` não é composto em `app/services.ts`; **nem o evento piloto `lesson_completed` — já autorizado pelo ADR-0009 §Limites — está instrumentado**. |

**Implicação para o board:** o gargalo de OP-B não é *construir* telemetria — é **(a) ligar o que já existe a um coletor** (OS) e **(b) completar a emissão mínima** (literacyDojo). O funil de retenção D+1/D+7/D+21 é mensurável **sem emenda de ADR-0009** se lido pelo lado do OS: a identidade pseudônima necessária à correlação entre dias (`installationId`) **já existe e já é emitida** no contexto do OS. O ADR-0009 — que proíbe identificadores — governa o envelope `source:"literacydojo"` e não precisa ser tocado nesta fase.

---

## 1. Leitura direcional de eficácia (honesta sobre limites)

### 1.1 O que cada evidência prova — e o que não prova

| Evidência | Prova | NÃO prova |
| --- | --- | --- |
| **Coorte AID-180** (n=2: 1× ia_pratica `l02`, 1× dev `game-02`; registro AID-365) | O loop ponta-a-ponta rola com pessoas reais: 2/2 sessões executadas, 0 aborts, 0 retiradas; veredito QA **CONTINUAR** (AID-348, C1–C4 PASS) | Retenção ou aprendizagem. A própria QA escreveu: *"n=1 por jornada — poder estatístico nulo"*. Scorecards por sessão ficam em research storage restrito (protocolo AID-142); QA não observou as sessões (produtor ≠ verificador). |
| **QAs de onda** (AID-412 GO 102/102; AID-421 GO + fix de corrida verificado 6/6; AID-444 **GO** wave-level; AID-457 **PASS** no pin atual) | **Integridade de resultado**: as 20 lições re-executadas de forma determinística PASSam hospedadas; probes negativos falham como devem (sem falsa aprovação); a11y de teclado/ARIA/aria-live/reflow@320/298 PASS nos pontos verificados | Aprendizagem. Medem regressão, integridade e a11y — não outcome pedagógico. Leitores de tela reais nunca foram executados (limitação declarada da QA AID-444). |
| **AID-448** (defeito descoberto pela AID-444, corrigido via AID-449/PR #208, não-regressão confirmada pela AID-457) | O ciclo tentativa→feedback é o ponto de confiança mais frágil: bridge PASS × UI "rejeitada" (falso negativo) nos jogos dev minou o veredito visível por semanas | — (resolvido no pin atual, mas é o tipo de fricção que a coorte n=2 não capturaria sozinha) |
| **Primitivas vivas em produção** | Revisão espaçada contratada por lição (`intervalsDays: [1, 7, 21]` em todo módulo YAML; agendamento `nextReviewAt` em `progress.ts:301-334`); Hub recomenda "Revisão do dia/atrasada" + CTA "Revisar agora" (`Hub.tsx:63-85`); streak local + conquistas streak_3/7; **meta diária já existe** (`DAILY_GOAL_XP=10`, `progress.ts:129`; chip "Meta X/Y" no Hub); dojoToday agenda FSRS + streak para devs | Que essas primitivas **convertam em retorno** — zero medição (§0). |

### 1.2 Leitura de UX: hipóteses vs evidência

- **H1 (hipótese, não evidência):** a revisão espaçada gera retornos em D+1/D+7/D+21 — o *agendamento* existe; a *conversão em retorno* nunca foi medida.
- **H2 (hipótese):** meta diária e streak sustentam hábito — a UI existe; o efeito não é medido.
- **Evidência positiva disponível (fraca):** sessões completam sem abort; navegação por teclado e feedback `aria-live` funcionam nos pontos QA-verificados.
- **Evidência de risco:** o episódio AID-448 mostra que feedback contraditório mina a confiança mesmo com evidência correta — o "resultado honesto" (rejeição de gaps conhecidos) pode frustrar; ninguém mediu isso ainda.

**Conclusão epistêmica:** temos evidência de que **o loop funciona**, e nenhuma sobre **retém** ou **ensina**. OP-B existe exatamente para trocar crença por medida — e o funil abaixo é a menor medição que testa a promessa central ("ritmo Duolingo").

---

## 2. Funil de retenção proposto (D+1/D+7/D+21)

**Princípios:** alinhado a `intervalsDays [1,7,21]` (o produto agenda ganchos de retorno exatamente nessas janelas — o funil mede se eles convertem); agregado e anonimizado; construído **100% sobre eventos que o OS já emite** (nenhum evento novo exigido).

### 2.1 Definições observáveis

- **Coorte (denominador):** `installationId` cujo primeiro `mission.completed {result:"completed"}` ocorre no dia **D0**. Variante larga para contexto: primeiro `onboarding.completed`. Ambas reportadas.
- **Funil de ativação (contexto da coorte):** `onboarding.started` → `onboarding.completed` → `mission.started` → `mission.completed` (eventos e dims existentes).
- **Retorno D+N (métrica primária, acumulada com graça):** mesma `installationId` emitindo qualquer evento na janela **[D0+N … D0+N+2]** — ou seja, R1 = retorno até D+3, R7 = até D+9, R21 = até D+23. A graça de 2 dias tolera hábito irregular sem punir (coerente com o tom da casa: *"Volte no seu ritmo. Uma pausa não remove XP, conteúdo ou acesso."* — Hub).
- **Retorno D+N estrito (secundária):** evento exatamente na janela [D0+N, D0+N+2], para leitura de precisão.
- **Retorno por revisão (teste direto da H1):** retorno cuja sessão (agrupamento por `sessionId`) contém `mission.started {mode:"review"}` ou `review.started {reason:"due"|"overdue"}`. Distingue "voltou para revisar" de "voltou para conteúdo novo".
- **Baseline antes de meta:** o primeiro ciclo estabelece o baseline próprio; **não fixamos meta numérica externa nesta fase** (benchmark de mercado seria achismo aqui — nenhuma comparação válida com n atual). A pergunta do board após o 1º ciclo é *"retenção subiu ciclo a ciclo?"*, não *"bati X%?"*.

### 2.2 Agregação e anonimização (fronteira)

- Publicação **apenas agregada**: coortes por semana de D0; **supressão k-anônima de buckets n<5**; `installationId`/`sessionId` jamais publicados; relatório mensal como work-product datado (padrão `_work-products/`).
- Dimensões são enums/primitivas validadas por evento (`EVENT_VOCABULARIES` em `events.ts`) — **zero texto livre por construção**; sem IP/user-agent no relatório; sem `mastered` (proibido também aqui, ADR-0005/0009).

### 2.3 Limitações declaradas

- Mede **retorno à experiência**, não aprendizagem (competência segue fora de analytics por contrato de evidência).
- Escopo v1 = **experiência canônica hospedada no OS**; literacy standalone e dojoToday ficam de fora até as fatias da §3.1-F3.
- `installationId` = instalação, não pessoa (mesma pessoa em 2 navegadores = 2 instalações) — aceito para leitura direcional.
- Amostra inicial pequena → é exatamente por isso que k≥5 e leitura agregada são obrigatórios desde o dia 1.

---

## 3. Plano de instrumentação (noop → backend)

### 3.0 Princípios inegociáveis (herdados do ADR-0009 e do código vigente)

Local-first preservado (fila local, fire-and-forget, **analytics nunca bloqueia a lição** — já garantido por `emitAnalyticsSafely` + batcher com catch-all); zero texto livre; zero PII; vocabulários fechados validados em runtime; **analytics ≠ evidência** (`LiteracyEvidenceRecord` permanece o canal de tentativas avaliadas); produtor ≠ verifier.

### 3.1 Fases (F1–F4) e classificação: engenharia pura vs revisão/emenda de ADR

| Mudança proposta | Classificação | Por quê |
| --- | --- | --- |
| **F1 — Coletor same-origin + `VITE_ANALYTICS_ENDPOINT`** (endpoint no alias de produção, ex. Netlify function, recebendo os batches JSON; valida envelope; append-only NDJSON) | **Engenharia pura** (o seletor e o transporte same-origin já existem: `createServices.ts:52-63`, `transports.ts:61`) | Liga 12 eventos já emitidos, incl. `journey.returned` e `review.started` |
| **F2 — Agregação + relatório de funil** (script offline NDJSON→relatório §2; monitor de drift de schema) | **Engenharia pura** | Nenhum dado novo sai do dispositivo |
| **F3 — Emissão mínima no literacyDojo** (compor sink em `app/services.ts`; instrumentar o piloto `lesson_completed` — **já autorizado** pelo ADR-0009 §Limites; `entry_viewed`/`mapa_inicial_done`/`route_chosen` por "fatias próprias", uma a uma) | **Engenharia pura** (os 4 eventos já estão no vocabulário fechado do ADR; o próprio ADR prevê fatias próprias para os 3 restantes) | Sem emenda; sem identificador |
| **F4 — ADR curto do coletor OS** (o pipeline do OS tem identidade pseudônima e vocabulário validado, mas **não tem ADR próprio** — o ADR-0009 é scoped ao envelope `source:"literacydojo"`; documentar fronteira, retenção de dados — proposta: NDJSON bruto 90 dias, agregados indefinidos — e k-anonimato) + revisar a superfície pública de termos/privacidade (QA AID-348 verificou `/termos` e `/privacidade` 200 no alias) para declarar a coleta | **Documental/governança** (ADR novo curto, não emenda do 0009) | Fronteira de privacidade documentada antes de ligar o coletor — coerente com o padrão da casa |
| **Funil de retenção via OS** (usar `installationId` do contexto OS) | **Engenharia pura** (a identidade pseudônima já existe e já é emitida no bounded context do OS) | Não toca o envelope literacy |
| Funil de retenção no envelope literacy standalone (identificador no envelope) | **EXIGIRIA EMENDA ADR-0009** (`0009-product-analytics.md:84` proíbe identificadores) — **recomendo NÃO fazer**: OS é a fonte canônica de retenção | Evita mexer na fronteira mais rígida |
| Eventos novos no vocabulário literacy (ex.: `review_started`/`review_completed`, propostos em `evidence-contract.md:93-100`) | **EXIGE REVISÃO ADR-0009, um a um, por fatia** (regra do próprio ADR — nunca em lote) | Adiado até o funil OS provar necessidade |
| Backend Plausible/PostHog | **Rejeitado nesta fase pelo próprio ADR** (gatilho de revisão futuro); reabrir só se a agregação NDJSON ficar insuficiente | — |

### 3.3 Sequenciamento recomendado (se o board aprovar OP-B)

**F1+F4 juntos** (coletor + ADR curto do coletor) → **F2** (relatório) → ~21 dias de dados → **F3** (emissão literacy) → **primeira leitura de funil** → só então a primeira mecânica de engajamento (§4, #1 ou #2 — pequena e testável). Paralelo e independente da onda OP-A (AID-462); zero mudança de contrato de conteúdo (regra 7 intacta).

### 3.4 Riscos técnicos apontados (para o FPE avaliar em issue própria)

- Restrição same-origin: o coletor precisa servir no mesmo domínio do alias (Netlify function atende nativamente).
- Volume esperado baixo (fase de poucos pilotos): NDJSON + export manual é suficiente; sem banco.
- Copy da primeira visita com coleta ligada deve manter a promessa local-first (sem dark pattern); a superfície `/privacidade` precisa refletir a coleta **antes** do deploy.

---

## 4. Mecânicas de engajamento candidatas (pós-instrumentação — nada implementado aqui)

Ranqueadas por risco crescente. **Regra de ouro UX: nenhuma mecânica antes do baseline do funil** — sem medida, "melhoria de engajamento" é opinião.

| # | Mecânica | Alavanca | Risco | Dependência |
| --- | --- | --- | --- | --- |
| 1 | **Onboarding de retorno**: estado "Retomar missão" + "Revisão do dia" em destaque na entrada | D+1 | **Baixíssimo** — o motor de recomendação já calcula resume/review/retry (`Hub.tsx:63-85`); UI apenas | Nenhuma (mas medir efeito exige F1/F2) |
| 2 | **Sinalização de revisões pendentes hoje** (badge/contador no Hub e no mapa) | D+1/D+7 | **Baixo** — `reviewsDue` já existe no domínio | F1/F2 |
| 3 | **Estado da meta diária no fim da lição** (ResultScreen mostra Meta X/10 e o que falta) | D+1 | **Baixo** — `dailyGoalStatus`/`DAILY_GOAL_XP` já existem (`progress.ts:129,290-296`) | F1/F2 |
| 4 | **Reframing de streak pós-pausa** (tom guilt-free, já praticado no Hub) | D+7 | **Baixo-médio** — risco de copy culpabilizadora contradizendo o tom da casa; exige re-check a11y | F1/F2 |
| 5 | **Re-engajamento outbound** (e-mail/push/notificação) | D+1/D+7/D+21 | **Alto** — PII + consentimento LGPD/GDPR + superfície política; decisão founder (§5); congela até o funil existir e o founder decidir canal | §5.1 |

---

## 5. Pendências para o founder (perguntas explícitas)

1. **Canais de re-engajamento:** e-mail? push/web-push? notificação de navegador? nenhum? — cada opção envolve PII e consentimento (superfície política + legal); enquanto pendente, a mecânica #5 fica congelada e OP-B segue só com mecânicas in-product (#1–#4).
2. **Ativar coletor na produção:** aprova endpoint same-origin (ex. Netlify function) no alias vigente + o ADR curto do coletor OS (F4) com a fronteira §3.0?
3. **Retenção de dados brutos:** confirma NDJSON bruto por 90 dias + agregados k-anônimos indefinidos?
4. **Assinatura das definições do funil:** denominador = primeira `mission.completed` (com variante larga reportada); graça de 2 dias; k-anônima n≥5 — confirma para o relatório mensal?
5. **Escopo do primeiro ciclo:** OS-canônico apenas (recomendado — menor caminho para o primeiro dado de retenção) vs incluir literacy standalone (exigiria completar F3 antes da primeira leitura)?

---

## Boundaries declaradas como respeitadas

- Leitura via `git show 2ec910a9:<path>` (sem checkout/branch/PR); nenhum evento de analytics emitido; catálogo, bindings, pins e produção intocados.
- Analytics ≠ evidência; nenhum `mastered`; progresso ≠ engajamento ≠ competência preservados.
- Este draft é input de decisão do board, não decisão; não bloqueia nem depende da onda OP-A (AID-462).
