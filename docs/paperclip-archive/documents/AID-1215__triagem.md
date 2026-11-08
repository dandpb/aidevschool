<!-- issue: AID-1215 | key: triagem | doc_id: c1bdf5d3-52e2-48b5-8999-52d46e76b3fe | updated: 2026-09-10 06:28:28.936+00 -->

# Triagem SDLC AID-1215 — onda de intents LEARN: 3 ACEITAR (F2 primeiro, W1, F1 condicionado) / 3 AGENDAR (O3-C2, F3, W2 data-gated) / 0 rejeitar — calibração §5 AID-1214 executada com dados AID-1212

(AID-1215)

# Triagem SDLC — onda de intents do ciclo LEARN (AID-1215 / ORDEM AID-1211/D)

**SM:** SDLC Scrum Master (ce84c27f) · **Data:** 2026-09-10 · **Trigger:** blockers resolvidos — drafts publicados nas issues B (AID-1213, docs `sintese` + `intent-drafts`) e C (AID-1214, doc `arco-proposta`).
**Base de auditoria (first-hand):** `docs/sdlc/README.md`, `docs/sdlc/templates/intent.md`, `intent/README.md`, relatório `measurement` da QA (AID-1212, doc `measurement` rev `8a86b1e0`) e clone read-only do main `e839d0fc`.
**Fronteira respeitada:** isto é **recomendação** — aceite/agendamento/rejeição é gate do product owner (founder; CEO by proxy). Nenhuma intent foi aceita aqui; nenhum commit em `intent/` foi feito; nenhuma issue filha de implementação foi criada (gate do CEO).

**Spot-checks de evidência executados pelo SM (main `e839d0fc`):** ADR `docs/design/spaced-repetition-streak/README.md` status **Proposed** ✔; catálogo `curriculum/ai-literacy/catalog.yaml` 29/29 `ready`, 0 `planned`, `contentVersion "2026-09-06.1"` ✔; contagem de atividades: l08–l13 = **1 atividade cada** (dívida O3-C2 real), l02/l03 = 3 ✔. Citações numéricas dos drafts conferidas contra §3/§4/§5 do relatório AID-1212 (baselines 33% OS / 67% literacy start→1ª submissão: consistentes) ✔.

---

## 1. Auditoria de conformidade — veredito por item

| # | Item (path canônico do artefato) | Veredito | Gap | Próxima ação | Dono |
| --- | --- | --- | --- | --- | --- |
| 1 | AID-1213 doc `intent-drafts` — Draft 1 `2026-09-10-activation-first-activity` (F1) | **CONFORME** ao template `docs/sdlc/templates/intent.md` (problema/resultado observável/afetados/restrições/perguntas abertas; origem linkada e quotada; baselines citadas e conferidas) | menor: sem teto de esforço explícito em Constraints | ACEITAR → Design (spec só após eventos do Draft 2 + sessões O1 responderem as open questions) | product owner (decide) · System Designer (spec) |
| 2 | AID-1213 doc `intent-drafts` — Draft 2 `2026-09-10-entry-brief-instrumentation` (F2) | **CONFORME** (resultado observável: 100% sessões com evento de entrada; medida de dwell; zero PII; vocabulário aditivo retro-compat; producer≠verifier citado) | menor: idem teto de esforço | ACEITAR → Design **AGORA** — candidato a 1ª spec da onda Build (destrava o diagnóstico de F1 na próxima janela MEASURE) | product owner (decide) · UX+SD (spec) |
| 3 | AID-1213 doc `intent-drafts` — Draft 3 `2026-09-10-return-habit-loop` (F3) | **CONFORME no formato**; evidência **confundida** (funil O1 0/0/0/0/0 — o próprio draft declara a confusão) | evidência de demanda inexistente até a janela O1 | AGENDAR com gate explícito: scorecards O1 (~09-23) ou 1º sinal de aprendiz recorrente; ancorar no ADR existente (não criar sistema paralelo) | product owner (agenda) · UX/SD (faseamento na hora) |
| 4 | AID-1214 doc `arco-proposta` — W1 mod-08 "Rotina com IA II" (l30–l32) | **CONFORME** como proposta de onda (padrão AID-414/528/610: emenda T0 board-gated regra 7, briefs spec-grade pré-existentes AID-528 rev 1 §5, promoção única, QA wave-level; zero produção antecipada) | nenhum bloqueante | ACEITAR W1 como onda de conteúdo da próxima janela Build | product owner (decide) · CEO (dispatch/T0) |
| 5 | AID-1214 doc `arco-proposta` — W2 dev l33–l35 | **CONFORME** (data-gated por design, §3.2) | tema depende de scorecards O1 | AGENDAR data-gated — T0 de W2 só abre com o gate de dados §5-R4 | product owner · CEO |
| 6 | AID-1214 doc `arco-proposta` — O3-C2 retrofit l08–l13 | **CONFORME** (sem ids novos; ruling AID-640 já concedido; padrão O3-C1 provado) | nenhum | AGENDAR como companheiro de consolidação (paralelável a W1; sem T0) | product owner · CD (autoria) |
| 7 | Processo das issues B/C | **CONFORME** — nada foi commitado em `intent/` antes do gate (correto per `intent/README.md`); artefatos como documentos citando a fonte por revisão; limitações declaradas com honestidade (n minúsculo, confundidores, cutoff do relatório) | — | manter o padrão: commit de `intent/<change-id>/intent.md` só pós-aceite, com status `accepted` registrado pelo owner | UX/CD (na execução) |

**Gaps menores registrados (viram insumo de spec, não bloqueio):**
1. Drafts 1–3 não declaram teto de esforço/budget em Constraints (o template pede). Ação: a spec de cada um define escopo mínimo viável. Dono: System Designer com UX.
2. Open question do `game-02-warehouse` (drop 100% com n=1) corretamente NÃO virou intent — carregar para as sessões O1. Dono: UX (roteiro AID-641).

## 2. Calibração data-informed EXECUTADA (regras pré-registradas AID-1214 §5, com o relatório AID-1212)

O `measurement` da QA pousou **após** o cutoff verificado pela CD (AID-1214 §2: issue AID-1212 `in_progress` às ~06:2Z; AID-1213 já o consumiu às 06:21Z). As regras §5 são "executáveis pelo SM na triagem D" — executadas agora:

| Regra | Gatilho (dados AID-1212) | Resultado |
| --- | --- | --- |
| R1 — drop em l08–l11 ⇒ puxar O3-C2 antes de W1 | **Não dispara**: nenhum aprendiz alcançou l08+ (drop-off observado só em l02/l03/game-02, §5) | O3-C2 segue como dívida first-hand (verificada), não urgência de funil |
| R2 — drop em l24–l26 ou ativação inicial ⇒ rotear à UX | **Dispara**: drop concentrado na entrada (l02 OS 67% / literacy 50%; game-02 100%, §5) | Roteado aos drafts F1/F2 da AID-1213; o arco não muda |
| R3 — conclusão saudável no fim do arco confirma W1 | **Não confirma**: zero sessões em l20/l26 | W1 vale por sucessão+custo (R5), não por demanda |
| R4 — scorecards O1 definem tema W2 | Sem dados (funil 0/0/0/0/0, AID-909) | W2 permanece data-gated (~09-23) |
| R5 — sem tráfego real na janela | **Dispara parcial**: zero envelopes 09-08→09-10 (§8.2); funil O1 zerado | W1 válida (sucessão+custo); W2 adia o gate uma janela; O3-C2 ganha prioridade relativa |

## 3. Recomendações ao product owner (aceitar / agendar / rejeitar)

| Draft | Recomendação | Motivo em uma linha |
| --- | --- | --- |
| `2026-09-10-entry-brief-instrumentation` (F2) | **ACEITAR — 1º da fila** | menor risco (aditivo, zero PII), destrava o diagnóstico de F1; sem ele a próxima MEASURE continua cega |
| W1 mod-08 l30–l32 (arco AID-1214) | **ACEITAR** | briefs spec-grade já board-vistos (AID-528 rev 1 §5), custo de spec ≈15–30 min, pipeline vazio (0 planned) |
| `2026-09-10-activation-first-activity` (F1) | **ACEITAR → Design condicionado** | P1 correto, mas as open questions exigem eventos de F2 + sessões O1; spec antes disso seria chute |
| O3-C2 retrofit l08–l13 | **AGENDAR** (companheiro) | dívida real first-hand; prioridade relativa ↑ por R5, mas R1 não disparou |
| `2026-09-10-return-habit-loop` (F3) | **AGENDAR** (gate O1) | evidência confundida pelo funil zerado — o próprio draft é condicional |
| W2 dev l33–l35 | **AGENDAR** (data-gated) | tema final depende de scorecards O1 (R4) |

Nenhuma rejeição recomendada: nenhum draft deixou de responder problema/resultado/plano-de-ataque, e nenhum achado ficou sem evidência.

## 4. Decomposição proposta do próximo ciclo Build (decisão CEO)

Sequência recomendada (streams paralelos viram issues filhas no dispatch do CEO — não criadas aqui):

- **B1 — Instrumentação entrada/brief (F2):** spec (UX+SD) → plan gate → build FPE → countersign QA. Vocabulário aditivo; envelopes OS v1 / literacy v2 compatíveis; `journey.returned` sem quebrar a série histórica.
- **B2 — Onda de conteúdo W1 (paralela a B1, stream distinto):** emenda T0 board-gated (regra 7; re-id l21–l23→l30–l32) → T1–T3 autoria CD → landing FPE em PR único (trailer `SDLC-ALLOW-TEST-EDIT: AID-<n>` para fixtures, política AID-554) → promoção única → QA wave-level.
- **B3 — O3-C2 (paralelizável a B2, autores distintos):** retrofit l08–l13 ao padrão de 3 atividades, sem T0, padrão AID-644/648 provado; bump por lição (ruling AID-640).
- **B4 — Sessões O1 (AID-641, já em curso via funil AID-909):** roteiros usam as open questions de F1/F5 da síntese UX.
- **B5 — Spec de F1 (ativação):** abre quando B1 landar + primeiras sessões O1 entregarem sinal.
- **B6 — W2 dev:** T0 só abre com o gate de dados (R4).

Gates lembrados para a onda: aceite de intent/spec via `request_confirmation` do owner; aprovação do plan antes das subtasks de implementação; producer ≠ verificador em cada PR/onda (countersign QA); commit de `intent/<change-id>/intent.md` com status `accepted` **após** o aceite (o change-id dos drafts já segue o formato `YYYY-MM-DD-slug`).

## 5. Métricas do playbook (destaques desta onda)

- **Trigger→intent:** ORDEM AID-1211 despachada e drafts publicados no mesmo dia 2026-09-10 (AID-1214 06:16Z; AID-1213 06:16/06:21Z) — latência ~zero na janela. ✔
- **Honestidade sobre dashboards verdes:** ambos os produtores declararam limitações (n=6+3, funil zerado, cutoff do relatório) e separaram observado/hipótese/confundido — padrão a manter. ✔
- **Risco de churn pós-build:** baixo — W1 reusa briefs board-vistos; F2 é aditivo; nada depende de decisões abertas de Design.

**Recibo:** triagem concluída neste issue (`done`); decisão de onda e dispatch pertencem ao CEO, que foi despertado citando este issue. Próximo passo canônico do aceite: para cada draft aceito, commit do `intent/<change-id>/intent.md` (status `accepted`) no PR de abertura da respectiva spec.
