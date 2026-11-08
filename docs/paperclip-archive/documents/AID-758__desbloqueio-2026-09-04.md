<!-- issue: AID-758 | key: desbloqueio-2026-09-04 | doc_id: f80f529f-74f2-49dd-8fc0-40a68c17a2eb | updated: 2026-09-04 01:09:19.434+00 -->

# AID-758 — Desbloqueio de próximas tarefas: estado do board, ações e delegações (2026-09-04)

(AID-758)

# Desbloqueio de próximas tarefas — AID-758 (CEO, 2026-09-04 ~01:0xZ)

## 1. Objetivos (confirmados)
- **Missão:** democratizar conhecimento e aplicação de IA via lições curtas e práticas com ritmo Duolingo-like — servindo (a) pessoas que querem usar IA sem programar e (b) devs que querem construir software robusto com IA. Repo: github.com/dandpb/aidevschool.
- **Estado atual do produto:** ondas O1 (l27–l29) e O3-C1 (l01–l07) promovidas em produção com CI bloqueante 36/36; piloto P6 **GO `run-now`** (decisão founder registrada no kit via PR #263); janela de consolidação 21d O3-C1 ativa (d+0 = 02/Sep 17:16Z).

## 2. Inventário completo de issues abertas (varredura AID-1..AID-758, 2026-09-04)
| Issue | Status | Owner | Estado | Ação do CEO nesta passada |
| --- | --- | --- | --- | --- |
| AID-754 | backlog | FPE | teste automatizado rota hosted `?host=os` / `renderLocalSuggestion` (achado QA AID-753) | **Desbloqueada** → ORDEM AID-760 |
| AID-757 | in_review | SD | decisões founder no kit P6 — PR #263 aguardando merge CEO | **PR #263 MERGEADO pelo CEO** (`d5e692e`) → fechamento delegado via AID-759 |
| AID-670 | todo | SD | janela 21d O3-C1 ativa; d+1 executado manualmente 03/Sep; d+7 = 09/Sep 17:16Z | Higiene `in_progress` delegada via AID-759 |
| AID-641 | in_progress | UX | teste moderado O1 — **aguardando resposta do founder** (card `cf8b749c`, pending desde 02/Sep 17:10Z) | Aguarda founder (ver §4) |
| AID-570 | in_review | CEO (eu) | higiene do board — 14 cards stale aguardando cliques do founder (card `9d4b638a`) | Aguarda founder (ver §4) |
| AID-400 | todo | SDLC SM | registro rolling de auditorias — Registro #6 CONFORME (04/Sep 00:06Z) | Sem ação — by design (rolling) |

## 3. Ações executadas nesta passada (evidência)
1. **PR #263 mergeado** (single-writer CEO, conforme limite da ORDEM AID-751/A): merge commit `d5e692e2468446b0d87b35d14471a0d433db6154`; diff auditado docs-only; CI 36/36 no head `c0876d7` incl. 4 contextos required.
2. **AID-759 criada** (SD): fechar AID-757 com receipt first-hand + PATCH AID-670 → `in_progress` (rest window até d+7 09/Sep; fallback manual se watchdog `255989ed` seguir morto — defeito AID-727).
3. **AID-760 criada** (FPE): executar AID-754 — cobertura automatizada da rota hosted, loop SDLC da casa, PR → merge single-writer CEO.

## 4. Pendências cujo unblock owner é o FOUNDER (não há agente que possa resolver)
1. **AID-641 — card `cf8b749c`** (pending ~31h): "Como recrutar os 5–8 devs participantes?" — recomendado: **Rede do founder**. Cronograma: sessões ≤16/Sep; limiar de risco ~05/Sep. Sem resposta, a UX declara risco no doc `sintese`.
2. **AID-570 — card `9d4b638a`**: 14 cards stale re-conferidos `pending` aguardando cliques do founder (wake-on-response ativo).
3. **Piloto P6 `run-now`**: o kit está pronto e GO registrado — a execução das sessões é do founder (≥3 participantes).

## 5. Decisão sobre novos agentes
**Não criar agora.** Justificativa: gargalo atual não é capacidade de agentes (FPE idle, SD ocioso pós-janela, QA idle) e sim (a) input do founder (§4) e (b) fila curta de engenharia. Content Designer já cobre aceleração de conteúdo (mod-07+/l21+). Reavaliar se o founder aprovar recrutamento externo no teste moderado (AID-641) ou quando a trilha de conteúdo voltar a ser caminho crítico.

## 6. Disposição
AID-758 = `done`: objetivos confirmados, tarefas desbloqueadas e delegadas (AID-759, AID-760), pendências founder nomeadas com owner/ação. Continuação vive nas issues delegadas e nos cards `cf8b749c`/`9d4b638a` (wake-on-response).