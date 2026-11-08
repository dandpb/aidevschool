<!-- issue: AID-1216 | key: decisao | doc_id: 813545d9-22cb-491c-ae88-c6be56637914 | updated: 2026-09-10 06:37:45.376+00 -->

# Decisão CEO — onda Build pós-LEARN (AID-1216): 3 ACEITAR / 3 AGENDAR / 0 rejeitar; dispatch B1–B6

(AID-1216)

# Decisão CEO — onda Build pós-LEARN (AID-1216)

**Decisor:** CEO (product owner por delegação do founder, AID-1211). **Data:** 2026-09-10.
**Insumos:** triagem SM AID-1215 doc `triagem` rev `9040fe6b` (veredito CONFORME em todos os itens, spot-checks first-hand no main `e839d0fc`); relatório QA AID-1212 doc `measurement` rev `8a86b1e0`; drafts UX AID-1213 docs `sintese` + `intent-drafts`; arco Content AID-1214 doc `arco-proposta`; calibração R1–R5 pré-registrada (AID-1214 §5) executada pelo SM.

---

## 1. Decisões por draft (ratifico a recomendação SM §3, com racional próprio)

| # | Item | Decisão | Racional executivo |
| --- | --- | --- | --- |
| 1 | `2026-09-10-entry-brief-instrumentation` (F2) | **ACEITAR — 1º da fila** | Menor risco da onda (aditivo, retro-compat, zero PII) e maior alavancagem: sem os eventos de entrada/dwell, a próxima janela MEASURE continua cega e F1 não é diagnosticável. Destrava B5. |
| 2 | W1 mod-08 "Rotina com IA II" l30–l32 | **ACEITAR** | Briefs spec-grade já board-vistos (AID-528 rev 1 §5); pipeline vazio (0 `planned`); W1 vale por sucessão+custo (R3 não confirma por demanda — honestidade registrada). Alternância de trilhas restaurada (janela corrente `ia_pratica`). |
| 3 | `2026-09-10-activation-first-activity` (F1) | **ACEITAR → Design CONDICIONADO** | P1 correto (drop dominante pré-1ª-atividade; 0 erros técnicos), mas spec antes dos eventos de F2 + primeiras sessões O1 seria chute. Aceite registrado; spec abre só nos gates de B5. |
| 4 | O3-C2 retrofit l08–l13 | **AGENDAR** (companheiro) | Dívida first-hand verificada (6 lições do núcleo com 1 atividade ⇒ score binário); R5 dá prioridade relativa, R1 não disparou (ninguém alcançou l08+). Paralelizável a W1; sem T0; padrão O3-C1 provado. |
| 5 | `2026-09-10-return-habit-loop` (F3) | **AGENDAR** (gate O1) | Evidência confundida pelo funil zerado (0/0/0/0/0) — o próprio draft é condicional. Gate: scorecards O1 (~09-23) ou 1º sinal de aprendiz recorrente; ancorar no ADR `spaced-repetition-streak` (nada paralelo). |
| 6 | W2 dev l33–l35 | **AGENDAR** (data-gated) | Tema final depende dos scorecards O1 (R4); reserva AID-610 §8.4 (l30+ dev exige evidência de coorte/funil). Líder: "contexto de projeto"; alternativo: "revisão de segurança"; sem dados vale o líder. |

**Rejeições: 0** — nenhum draft deixou de responder problema/resultado/plano-de-ataque; nenhum achado sem evidência.

## 2. Registro de aceite (efeito canônico imediato)

Intents ACEITAS: F2 (`2026-09-10-entry-brief-instrumentation`) e F1 (`2026-09-10-activation-first-activity`). O commit `intent/<change-id>/intent.md` com status `accepted` acontece **no PR de abertura da respectiva spec** (F2 → B1 agora; F1 → B5 quando os gates cumprirem), citando o draft-fonte por revisão e esta decisão. Nada foi commitado em `intent/` antes deste gate ✔ (triagem §1 item 7). F3 fica `draft` até seu gate.

## 3. Dispatch da onda Build — B1–B6 (issues filhas deste issue)

| Slot | Issue (id) | Stream / Owner | Status | Gate de abertura |
| --- | --- | --- | --- | --- |
| B1 | `254ad270` F2 instrumentação — spec UX+SD, build FPE, countersign QA | Engenheria/Design · lead System Designer (bb7b8143) | todo → dispatchado | aberto agora; spec via `request_confirmation`; plan gate antes de subtasks |
| B2 | `aff6237c` onda W1 l30–l32 — T0 board-gated → T1–T3 CD → promoção única → QA wave-level | Conteúdo · Content Designer (f2b1e95d) | todo → dispatchado | T0 mergeia só após confirmação do owner; PR único; trailer AID-554 |
| B3 | `d38b4b46` O3-C2 retrofit l08–l13 (sem T0, ruling AID-640) | Conteúdo · Content Designer | todo → dispatchado | sequência: após T0 de B2 (paralelizável com autores distintos) |
| B4 | **sem issue nova** — sessões O1 continuam em AID-641 via funil AID-909 | UX/G&R (em curso) | em curso | nota de roteiro (open questions F1/F5) comentada em AID-641 |
| B5 | `81bf3ccb` spec F1 (gated: B1 landado ∥ primeiras sessões O1) | Design · SD+UX quando abrir | blocked (← B1) | SM/CEO confirma abertura quando ambos os gates cumprirem |
| B6 | `8e87ec09` W2 dev l33–l35 (data-gated §5-R4) | Conteúdo · CD quando abrir | blocked (← AID-641) | scorecards O1 ~09-23 definem tema (R4); sem dados vale líder |

Paralelismo: B1 ∥ B2 são streams distintos e já dispatchados; B3 companheiro; B5/B6 placeholders de gate (blocked) — nada de spec/produção antecipada.

## 4. Gates preservados (regras da casa, sem exceção)

1. Spec/plan/emenda T0 via `request_confirmation` do owner; plan aprovado ANTES de subtasks de implementação.
2. Producer ≠ verificador: countersign QA (ca6a3f95) por PR/onda.
3. Fixtures de content wave com trailer `SDLC-ALLOW-TEST-EDIT: AID-<n>` (política AID-554).
4. Analytics ≠ evidência de funil O1 (AID-909); zero PII (ADR-0009/0010); envelopes OS v1 / literacy v2 retro-compatíveis.
5. Learning-gate golden rules intocadas; W1/W2 não editam lições existentes (exceto O3-C2, retrofit versionado AID-640).

## 5. Métrica da onda (destaques)
- Triagem SM → decisão+dispatch CEO: mesmo dia 2026-09-10 (latência ~zero na janela — padrão AID-1211 sendo cumprido).
- Risco de churn pós-build: baixo (W1 reusa briefs board-vistos; F2 aditivo; nada depende de decisões abertas de Design).
- Honestidade: W1 aceita por sucessão+custo (não por demanda) — registrado para o pós-mortem da onda.

**Recibo:** decisão tomada e dispatch executado neste heartbeat; issues filhas B1/B2/B3 dispatchadas com assignees rodando, B5/B6 criadas como placeholders blocked com gates explícitos, B4 roteada em AID-641. Este issue fecha como `done` (escopo = decisão + dispatch); a execução da onda é rastreada nos filhos + cadência SM/board.