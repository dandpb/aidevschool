# Spec — F1 `2026-09-10-activation-first-activity` (registro de build)

> Transcrição canônica do doc `spec` rev `6b32912f` da issue AID-1221 (lead System Designer; GO canônico do owner = ORDEM AID-1421 / D-1420-1; input CD AID-1414 doc `input-cd` rev `6d38e23e` incorporado). O intent aceito é registrado no main via PR #341 (docs-only, merge independente, sem conflito de arquivos). Este arquivo acompanha o PR de build (padrão AID-913; build FPE AID-1425, plan rev `1ef7482c`).

# Spec — F1 `2026-09-10-activation-first-activity`: da missão à 1ª atividade (assumption-first)

Change-id: `2026-09-10-activation-first-activity` · From: intent **aceito** (AID-1216 item 3, doc `decisao` rev `272b4a63`; D-1412-1 rev `07f5ca7a`) — registro no main em andamento via **PR #341** (commit `46920e1e`, docs-only) · Status: **review-ready** — input CD **recebido e incorporado** nesta rev 4 (AID-1414 doc `input-cd` rev `6d38e23e`, respondido contra a rev `31c7fba2`; conteúdo estrutural idêntico entre revs 2↔3); gate do owner aberto contra ESTA revisão
Author: System Designer (lead da spec, bb7b8143) · Colaboração: **Content Designer (f2b1e95d)** — child issue com perguntas estruturadas; UX evidência de base (autor do draft AID-1213; input F2 AID-1223 consumido) · Build: FPE (fa8130d5) · Countersign: QA (ca6a3f95)
Base verificada first-hand: main `32545321` (clone read-only) + relatório QA AID-1212 doc `measurement` rev `8a86b1e0` + síntese UX AID-1213 doc `sintese` + agregação v4 live (AID-1218 `done` + AID-1246 `done`, merge `e40f078c`).

---

## 0. Inventário de evidência (verificado no código, main `32545321`)

| Fato | Fonte |
| --- | --- |
| Intro da lição É o brief na visão do aprendiz: fase `"intro"` renderiza eyebrow `MISSÃO DA VILA`, card **"Pedido da Vila Lume"** (objective), ciclo Entender→Escolher→Conferir→Aplicar, meta/duração (`estimatedMinutes` + skills) e CTA "Começar missão" | `engines/literacyDojo/src/screens/LessonScreen.tsx:274-349` |
| Player de atividade: eyebrow `VILA LUME · {lição} · atividade i de N`, instrução como `<h1>`, ActivityRenderer, CTA "Verificar resposta", "Tentar novamente", "Pedir dica" — fluxo submit→feedback→retry íntegro (protegido por contrato AID-1089/W2) | `LessonScreen.tsx:368-432` |
| Missão hospedada no OS renderiza a MESMA tela (adapter) — incrementos na LessonScreen valem para as 2 superfícies | `src/host/LiteracyMissionAdapter.ts` (spec F2 §0) |
| 7 tipos de atividade no contrato fechado: `choice`, `sort`, `missing_context`, `safety_classification`, `prompt_builder`, `output_comparison`, `rubric_review` | `engines/literacyDojo/src/domain/analytics.ts:53-60` |
| 1ª atividade de l02 (ambas as superfícies) é `output_comparison`: comparar 2 respostas + marcar critérios (leitura densa, 2 outputs longos); 3 dicas disponíveis e não usadas na linha de base | `curriculum/ai-literacy/modules/01-ai-sem-misterio/l02-ia-nao-e-fonte-de-verdade.yaml` (a1); relatório §3 |
| Onboarding OS: trilha em `radiogroup` — IA Prática **"Recomendada para começar"** vs Dev "Para programadores"; CTA "Entrar na escola" | `engines/codexdojo-os-prototype/src/journey/Onboarding.tsx:78-110` |
| Hub OS: next-mission card com recomendação (`recommendMission`: start/resume/review/targeted-practice/retry) + CTA primário — "comece aqui" EXISTE no Hub | `src/journey/Hub.tsx:37-90,120-160`; `src/missions/recommendation.ts` |
| Mapa OS (chapter-map): 2 capítulos lado a lado ("Escolha IA Prática (l01–l03) ou Dev (WAREHOUSE… WORMHOLE… RELAY STATION)"), nós com overlays de status (Disponível/Em andamento/locked) — **sem próximo-passo/comece-aqui**; recomendação não é espelhada do Hub | `src/journey/MapScreen.tsx:57-90`; `src/journey/studentPath.ts:8-27` |
| Home literacy já tem "comece aqui" forte: card "Um morador precisa da sua ajuda" + CTA único "Atender pedido/Continuar pedido" | `engines/literacyDojo/src/screens/HomeScreen.tsx:85-113` |
| game-02-warehouse (dev, 1ª missão da trilha dev): fase `"briefing"` existe no controller; engine voxel **não emite** eventos de exposição F2 (cobertura declarada F2 §5) | `engines/voxelDojo/game-02-warehouse/src/game/controller.ts:30,71`; spec F2 §5 |
| **(CD, first-hand)** No caminho **hospedado** o WAREHOUSE auto-inicia no launch (`game.start()` se fase `briefing`) — o briefing NÃO é exibido; a 1ª ação real (clicar a prateleira do hash) não é comunicada antes de acontecer; instrução em jargão ("a chave faz hash"); zero affordance de dica no jogo | `game-02-warehouse/src/main.ts:42-44`, `game/scene/hud.ts:55-57`, `game/sim/levels.ts:43-55` (AID-1414 `input-cd` Q2) |
| Instrumentação F2 v4 live: `lesson_brief_viewed`/`activity_presented` (LD) + `mission.brief_viewed`/`activity.presented` (OS); agregação v4 publica `activationDetail` (OS por tipo de entrada) + `briefExposure` (saiu-no-brief × saiu-na-1ª-atividade, dwell bins `<15s/15-60s/1-5min/>5min`, medianas (b)/(c), canário `residualNoBrief`) com glossário comportamental | `learner/gate/analytics/aggregate_funnel.mjs:44,105-120,646-684`; `engines/codexdojo-os-prototype/src/analytics/events.ts:9,88-89` |
| Linha de base (janela 09-06→09-10, tier 3): OS 4/6 starts sem submissão (2 abandonos l02 <1min pós started; 1 game-02 sem evento seguinte); literacy 1/3; starts→≥1 submissão = **OS 33% / literacy 67%**; quem submete 1× completa (2/2, PASS na 1ª submissão, ~11min/3 atividades OS; 130s/316s literacy); 0 erros/57 envelopes; 0 `hint.requested` | relatório AID-1212 §3-§7, Anexo A |

## 1. Requirements (cada open question do intent respondida; todas testáveis)

- **R1 — Expectativa do primeiro toque no brief (P-A/Q1).** A intro da lição passa a declarar, antes do CTA "Começar missão", **o que o aprendiz vai fazer na 1ª atividade e que o primeiro toque não exige produção de texto**: uma frase por tipo de atividade (mapa `activityType → frase`, enum fechado de 7, ex. `output_comparison` → "Você vai comparar duas respostas da IA e marcar os motivos — nada de digitar"), derivada do `activities[0].type` canônico (sem hardcode por lição) — **mapa countersignado dos 7 tipos no Anexo A** (input CD AID-1414 rev `6d38e23e`, com guards de drift por redação). Vale para standalone e missão hospedada (mesma tela). **Aceite:** frases = **Anexo A** (countersign CD); e2e da intro de l02 exibe a frase de `output_comparison`; fixtures por tipo cobrem o mapa inteiro (todos os 7 ocorrem como 1ª atividade no catálogo), incluindo guard `output_comparison` com `len(outputs)==2` explícito e `choice` número-neutro (catálogo mistura single/multi-select).
- **R2 — Framing de primeiro toque no índice 0 (P-A/Q1).** No player, quando `currentActivityIndex === 0`, o framing destaca que é o primeiro toque e a affordance de dica: eyebrow estendido (ex.: "Primeira atividade — tente com o que você sabe; se travar, peça uma dica"), mantendo o botão "Pedir dica" visível como hoje. **Zero mudança** em submit/feedback/retry/hint-policy (ciclo F4 intacto). Copy: "se travar, peça uma dica" idêntica à do MentorGuide da intro (mesma voz — countersign informal CD, AID-1414 Q1 nota 3). **Aceite:** e2e no índice 0 exibe o framing; índices >0 não exibem; contrato AID-1089/W2 (foco no retry, `role=status` de loading) permanece verde.
- **R3 — "Comece aqui" no mapa do OS (P-C/Q3-F5).** O MapScreen espelha a recomendação do Hub: o nó da missão retornada por `recommendMission` (kinds `start` e `resume` apenas — review/practice mantêm seus labels próprios) recebe badge **textual** "Comece aqui" (nunca só-cor; `aria` coerente), e o capítulo da trilha ativa é destacado no header. Sem mudança em overlays, travas ou regras de progresso. **Aceite:** smoke OS — novato (trilha selecionada no onboarding) vê badge no primeiro nó disponível da sua trilha; aprendiz com missão in_progress vê badge no resume; nenhum outro nó com badge.
- **R4 — game-02-warehouse: decisão explícita de NÃO redesignar nesta onda (P-B/Q2).** n=1 não sustenta redesign; o jogo permanece byte-idêntico. Refutação monitorada por eventos existentes (started→submissões/conclusão do jogo; cobertura voxel de exposição é follow-up data-gated já registrado na spec F2 §5, owner SD). Se ≥3 starts futuros repetirem drop 100% sem submissão, abre emenda data-gated com input CD — **candidatos pré-registrados** (ordem apresentação-primeiro, AID-1414 Q2): (a) linha first-touch no meta da missão WAREHOUSE no OS espelhando R1; (b) caixa-demo trabalhada antes da 1ª predição pontuada; (c) rewording plain-language da linha de status L1. **Sondas para o roteiro O1 dev** (relayadas à AID-641): pré-start ("o que você acha que vai fazer?"), 1ª caixa ("com suas palavras, o que o pedido está pedindo?"), >30s sem clique ("o que está faltando para decidir?"). **Aceite:** diff do build não toca `engines/voxelDojo/game-02-warehouse/`; monitor registrado.
- **R5 — Premissas revogáveis + porta de revisão (D-1412-1 §2.2, binding).** §Premissas abaixo é parte do contrato: cada premissa tem fundamento P1, sinal de refutação e custo de reversão. **Revisão obrigatória da spec no primeiro de:** (a) 1º sinal de sessões O1, (b) scorecards O1 ~09-23, (c) veredito kill gate Track A 09-13T12:00Z. O1-morto ⇒ premissas seguem e a revisão ocorre no **gate de plan**. Nenhuma decisão de UX definitiva antes do sinal: R1–R3 são incrementos de apresentação (copy/badge) revertíveis em 1 PR.
- **R6 — Métricas ancoradas nos eventos F2 v4 + aceitação observável (intent).** (a) **Ativação:** % de starts com ≥1 submissão por superfície (OS: `mission.started`→submissão de atividade; literacy: `lesson_started`→`activity_attempted`) — baseline 33%/67%, alvo **≥70% em ambas** na próxima janela de medição pós-intros O1; (b) **Não-degradação (guardas F4):** conclusão pós-1ª-atividade (baseline 100%, 2/2) e tempo por lição/atividade (baselines 130s/316s literacy; ~11min/3 atividades OS) — avaliados como direção com n pequeno declarado, sem threshold rígido; (c) **Diagnóstico:** `briefExposure`/`activationDetail` (v4) explicam o movimento — analytics **nunca** conta participantes (regra AID-909); k≥5 pode suprimir células (declarado, não é falha). **Aceite:** relatório QA da janela publica (a)+(b)+(c); alvo é da **janela**, não de n=1 sessões.
- **R7 — Restrições inegociáveis (intent Constraints + teto de esforço).** Ciclo tentativa→feedback→progresso intacto (F4); learning-gate golden rules; zero PII e **nenhum evento/envelope novo** nesta spec (medição já coberta pelo F2 v4); melhoria vale para as 2 superfícies (R1/R2 pela tela compartilhada; R3 é OS-only porque o gap F5 é OS-only — declarado); não otimizar engajamento acima de resultado de aprendizagem; **teto de esforço (triagem AID-1215 §1.1):** apresentação apenas — copy, badge e framing; sem novos componentes de dados, estado, fluxo ou eventos; sem edição de `curriculum/`.

## 2. §Premissas (assumption log obrigatório — D-1412-1 §2.1; todas revogáveis)

| # | Premissa de trabalho | Fundamento P1 | Sinal de refutação (O1/F2 v4) | Custo de reversão |
| --- | --- | --- | --- | --- |
| **P-A** | O abandono dominante é fricção da **transição brief→1ª atividade** (o aprendiz não sabe "com o que/topo vou ser avaliado" e o primeiro toque parece maior do que é) — não rejeição da missão nem incapacidade | 2/4 abandonos OS **<1min** pós `mission.started` (fricção imediata, não fadiga); 0 erros/57; quem submete 1× completa 2/2 com PASS na 1ª (a carga real não é barreira DEPOIS do primeiro toque); 3 dicas existentes e `hint.requested`=0 (descobribilidade, não dificuldade) | `briefExposure`: predomínio de **"saiu no brief"** ⇒ o problema é o brief em si (→ emenda foca o brief, R1 ganha peso, R2 perde); predomínio de **"saiu na 1ª atividade"** com dwell `1-5min` ⇒ carga do tipo 1º (→ **escala ao curriculum ownership/CD**: ordem/tipo da 1ª atividade é conteúdo); dwell `<15s` dominante ⇒ rejeição de expectativa (→ copy/posicionamento); O1: "o que você esperava fazer depois de ler o pedido?" | Baixo: R1/R2 são copy/framing num único componente compartilhado (`LessonScreen`); 1 PR de apresentação |
| **P-B** | game-02-warehouse 100% drop (n=1) é **ruído**, com risco não-verificado de dificuldade de entrada; nenhum redesign antes de sinal | n=1; 0 erros; a única sessão dev (bce4f331) pulou trilhas (l02→game-02) — comportamento de testar portas, não de engajar conteúdo dev | Próximos starts game-02 (F2 vivo): `mission.started`→submissões/conclusão do jogo; **limitação declarada e agravada first-hand (CD):** no caminho hospedado o briefing é pulado (auto-start no launch) — `mission.brief_viewed` jamais dispararia nesse caminho e o gap é de conteúdo/entrada, não só de instrumentação; sinal = submissões/conclusão + **sondas O1 dev** (AID-1414 Q2, relayadas à AID-641); **disparador:** ≥3 starts sem nenhuma submissão ⇒ deixa de ser ruído ⇒ emenda data-gated + input CD | Zero: R4 é não-fazer |
| **P-C** | O mapa do OS **não** comunica "comece aqui" (a recomendação vive só no Hub) e o aprendiz trata missões como catálogo | Sessão bce4f331 (onboarding→l02 started→game-02 started→fim, 0 submissões); Hub TEM next-mission card + CTA; mapa lista 2 trilhas com overlays e **sem** próximo-passo; onboarding comunica "Recomendada para começar" mas não persiste no mapa | Pós-R3, persistência de sessões com **≥2 `mission.started` e 0 submissões** em `activationDetail` refuta (fricção não é navegação); dominância de "saiu no brief" ⇒ P-A domina e R3 é secundário; O1: observar se o aprendiz abre o mapa antes ou depois de engajar | Baixo: badge derivado de `recommendMission` existente; 1 PR de apresentação |

**Colaboração CD: ENTREGUE e incorporada nesta rev 4** (AID-1414 doc `input-cd` rev `6d38e23e`, veredito "nenhuma divergência estrutural"): Q1 = mapa completo countersignado (Anexo A, defaults confirmados + guards de drift); Q2 = leitura first-hand do entry (briefing pulado no caminho hospedado; sondas O1 dev; candidatos de emenda pré-registrados em R4); Q3 = fronteira CONFIRMADA (escala via child issue owner CD + gate board, só com dado refutador anexado — CD assume a autoria quando o sinal chegar).

## 3. Design (mapeamento no repo — insumo para o plan do FPE)

1. **literacy** (`engines/literacyDojo/src/`): mapa `activityType→frase-first-touch` no domínio de apresentação (enum fechado de 7) consumido pela intro (`LessonScreen.tsx` fase `"intro"`); eyebrow estendido no índice 0. Missão hospedada herda pelo adapter (2 superfícies, 1 mudança).
2. **OS** (`engines/codexdojo-os-prototype/src/`): `MapScreen.tsx` consome `recommendMission` (fonte única com o Hub) — badge textual "Comece aqui" no nó (kinds `start`/`resume`), destaque do capítulo da trilha ativa.
3. **Sem mudança:** `curriculum/`, `learner/`/substrate, coletor, agregação v4 (live), envelopes de telemetria, fluxos de verificação/evidência, `game-02-warehouse`.
4. **Testes (build FPE, countersign QA):** e2e literacy (frase na intro por tipo; framing só no índice 0; contrato W2 verde), smoke OS (badge no mapa por estado de progresso), a11y (badge textual/não-só-cor, contraste, ordem de foco inalterada, labels preservados).

## 4. Policy applied

- `docs/sdlc/README.md` + templates; `intent/README.md` (cadeia; status `accepted` registrado no PR #341 citando AID-1216 item 3 + D-1412-1).
- Regras do tracker AID-909 (analytics ≠ evidência de funil O1; eventos não contam participantes); ADR-0009/0010 (zero PII; sem eventos novos nesta spec).
- Learning-gate golden rules; ciclo F4 protegido (contrato AID-1089/W2); bounded contexts de engine (R3 OS-only; voxel intocado).
- Triagem SM AID-1215 §1 item 1 (teto de esforço: escopo mínimo viável definido em R7) e §2 gaps menores (game-02 carregado para O1 — vira P-B).
- D-1412-1 (assumption-first; §Premissas; porta de revisão; métricas ancoradas em F2 v4).

## 5. Colaboração Content Designer (f2b1e95d) — **RESPONDIDA** (AID-1414 `done`, doc `input-cd` rev `6d38e23e`)

1. **Countersign de copy (R1):** frases first-touch para os 7 tipos (default da spec passível de refino; estrutura fechada).
2. **P-B/game-02 (R4):** leitura de conteúdo sobre entry do WAREHOUSE (briefing→gameplay) para o roteiro O1 dev e eventual emenda data-gated — sem produção agora.
3. **Declaração de fronteira:** ordem/tipo da 1ª atividade é currículo canônico — esta spec NÃO muda; se P-A for refutado na direção "carga do tipo 1º", a spec escala ao curriculum ownership (child issue nova, owner CD, gate board).

## 6. Flagged concerns

- **Cobertura voxel limita P-B:** sem eventos de exposição no jogo, a refutação depende de submissão/conclusão + O1. Owner: SD (follow-up data-gated já na spec F2 §5).
- **Drift copy×currículo:** frases por tipo vivem na camada de apresentação e derivam do enum fechado; guards: fixture por tipo + countersign CD. Owner: FPE no plan, QA no PR.
- **n minúsculo + k≥5:** células de `briefExposure` podem sair suprimidas nas primeiras janelas — declarado, não enfraquecer k. Owner: QA.
- **Badge × kinds de recomendação:** decisão SD — badge apenas para `start`/`resume`; review/targeted-practice/retry mantêm labels do Hub (evita ambiguidade "comece aqui" sobre retomada pedagógica). Verificar no plan com FPE.
- **Guarda de tempo:** baselines por LIÇÃO (130s/316s) e por missão (~11min), não por atividade — guard R6(b) usa direção mediana, não threshold rígido, até n decente. Owner: QA (relatório).

## 7. Out of scope

F3 (retorno/streak); redesign de game-02-warehouse ou de qualquer engine voxel; mudanças em `curriculum/` (ordem/tipo da 1ª atividade); novos eventos/envelopes de telemetria; onboarding OS (já comunica "Recomendada para começar"); superfícies dojoToday/pixelquest/surfaces v3; UI de verificação/evidência; notificações externas.


---

## Anexo A — Frases first-touch por tipo (R1; countersign CD, AID-1414 `input-cd` rev `6d38e23e` Q1)

| Tipo | Frase |
| --- | --- |
| `choice` | "Você vai escolher as suas respostas entre opções prontas — só clicar, nada de digitar." |
| `sort` | "Você vai colocar as partes na ordem certa com as setas — nada de digitar." |
| `missing_context` | "Você vai ler um pedido que saiu torto e marcar o que estava faltando — só marcar, nada de digitar." |
| `safety_classification` | "Você vai classificar cada item em duas categorias — só clicar, nada de digitar." |
| `prompt_builder` | "Você vai montar um pedido preenchendo campos curtos — escrever pouco e direto, sem texto longo." |
| `output_comparison` | "Você vai comparar duas respostas da IA e marcar os motivos — nada de digitar." |
| `rubric_review` | "Você vai avaliar uma resposta critério por critério — só marcar, nada de digitar." |

Guards de drift (razão das redações — detalhe no input): `choice` número-neutro (single/multi); `safety_classification` sem nomear categorias (rótulos são conteúdo por lição); `sort` = "partes"+"setas" (SortView usa botões ↑/↓, não drag); `prompt_builder` sem "nada de digitar" (único tipo com texto obrigatório — honestidade de esforço); `output_comparison` = "duas" (guard `len(outputs)==2` no fixture); `rubric_review` sem "da IA" (resposta pode ser de pessoa). Colocação (plan FPE): lead-in fixo (ex. "Primeiro passo:") + frase verbo-inicial; modo revisão herda a mesma frase.
