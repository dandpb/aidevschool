# AID-6478: Definir a proxima iniciativa do AiDevSchool (pos-board limpo, decisao do founder)

- **Status:** in_review | **Priority:** high | **Origin:** manual
- **Assignee:** CEO | **Created:** 2026-11-08T02:58:51.150007+00:00 | **Updated:** 2026-11-08T03:01:56.033+00:00
- **ID:** `c498ba86-ea01-490d-b62d-a5b8f368ce31`

## Description

Contexto (recon 2026-11-08T02:58:51Z): board 100% fechado (0 issues abertas; ultima atividade 2026-11-01), goal ativo ('AI DevSchool democratizes AI knowledge...'), repo github.com/dandpb/aidevschool. Time de 24 agentes idle/paused, sem trabalho aprovado em fila e sem monitor ativo.

Como CEO nao decico direcao nova sem o founder (propose, don't decide). Esta issue carrega a pergunta concreta e as opcoes; a interacao ask_user_questions e o caminho vivo de wake (wake_assignee).

Checklist de fecho: decisao do founder registrada -> despachar o primeiro item aprovado com dono unico -> fila por delta.

## Document `Proposta de proxima iniciativa (pos-board limpo) — decisao do founder` (2026-11-08)

# Proposta: proxima iniciativa do AiDevSchool (pos-board limpo)

**Status:** proposta ao founder — decisao pendente (ask_user_questions nesta issue, wake_assignee)
**Autor:** CEO | **Data:** 2026-11-08 | **Repo:** github.com/dandpb/aidevschool (main ~#764)

## 1. Ponto de partida (verificado 1a mao)

- Board 100% fechado: 0 issues abertas, ultima atividade 2026-11-01; serie "Desbloqueio" aposentada pelo founder com 22 PRs mergeados na `main` (AID-4358).
- Duas URLs de launch no ar: **LiteracyDojo** (14 missoes praticas de AI, Level 0 no-code) e **CodexDojo OS** (Trilha Dev: escolha de track, rail guiado de 3 missoes, Engine Hub allowlist). dojoToday e companion secundario fora do marketing; voxel-warehouse/PixelQuest/miniTown/dashboard sem URL de launch (triagem AID-6005).
- Product-readiness das jornadas Dev esta **`stale`** (avaliacao fresca pendente) — curriculum 01-18 nao e claim customer-ready (README + docs/product-readiness).
- Produto e local-first (progresso no browser, sem conta); verificador independente decide mastery (nunca o LLM).
- Time de 24 agentes idle/paused, sem fila aprovada e sem monitor ativo.

**Leitura do CEO:** o ultimo ciclo foi todo build-side (copy de launch, guia de entrada, URLs, a11y). Nao existe nenhuma evidencia de uso por aprendizes reais nas URLs de launch. A iniciativa seguinte deve comprar evidencia, nao mais superficie.

## 2. Opcoes

### Opcao A — Beta fechado com aprendizes reais (RECOMENDADA)
Recrutar 10-30 aprendizes reais (2 perfis: no-code e dev) para percorrer as 2 URLs de launch durante ~3-4 semanas, com facilitator guide em uso real e coleta estruturada de feedback (checklist falsificavel do Level 0 como instrumento de aceite).
- **Por que agora:** e o unico caminho que gera dados para decidir B vs C com evidencia em vez de opiniao; usa exatamente o que ja foi lancado; nao exige novo build pesado.
- **Entregas 30d:** plano de recrutamento + consentimento; instrumento de feedback; 2 loops semanais de observacao; relatorio de evidencias (completacao por missao, drop-off, mastery verificada); backlog priorizado por dor real.
- **Metrica de sucesso:** >=10 aprendizes completando >=1 missao com evidencia verificada por capa; lista top-5 de dor validada.
- **Risco:** dependencia de canal de recrutamento do founder (unico gate externo).

### Opcao B — Refresh de readiness da Trilha Dev + expansao do rail guiado
Re-assessment da readiness (hoje `stale`) do curriculum 01-18 e expansao do rail guiado do CodexDojo OS de 3 para mais missoes.
- **Por que:** fecha divida declarada publicamente no README; prepara o lado dev para o beta.
- **Contra:** mais build-side sem usuarios na ponta; readiness pode continuar sem demanda validada.

### Opcao C — Cadencia de conteudo LiteracyDojo
Novas missoes (ex.: privacidade/dados ja existe intent AID-2697), repeticao espacada e consolidacao PT-BR do LiteracyDojo (14 -> N missoes).
- **Por que:** ritmo Duolingo depende de cadencia; conteudo e o produto.
- **Contra:** aumentar oferta antes de medir demanda real.

### Opcao D — Outra direcao especificada pelo founder
Ex.: monetizacao/cohort pago, B2B/workshops, nova engine. CEO estrutura em plano assim que especificada.

## 3. Recomendacao

**A (beta fechado)** como iniciativa principal, com first item aprovado = "Plano de beta fechado + instrumento de feedback" (dono unico, revisivel pelo PO). B fica como candidato de segunda posicao apenas se sobrar capacidade; C espera dados do beta.

## 4. Checklist de fecho (herdado da issue)
1. Decisao do founder registrada nesta issue (resposta a ask_user_questions).
2. Despachar o primeiro item aprovado com dono unico e camino de wake suportado.
3. Atualizar fila por delta e registrar o estado observado da execucao.

## Document `Continuation Summary` (2026-11-08)

# Continuation Summary

- Issue: AID-6478 — Definir a proxima iniciativa do AiDevSchool (pos-board limpo, decisao do founder)
- Status: in_review
- Priority: high
- Current mode: review
- Last updated by run: 3b8ec806-ca21-49ea-bfd3-26bc8d033059
- Agent: CEO (opencode_local)

## Objective

Contexto (recon 2026-11-08T02:58:51Z): board 100% fechado (0 issues abertas; ultima atividade 2026-11-01), goal ativo ('AI DevSchool democratizes AI knowledge...'), repo github.com/dandpb/aidevschool. Time de 24 agentes idle/paused, sem trabalho aprovado em fila e sem monitor ativo.

Como CEO nao decico direcao nova sem o founder (propose, don't decide). Esta issue carrega a pergunta concreta e as opcoes; a interacao ask_user_questions e o caminho vivo de wake (wake_assignee).

Checklist de fecho: decisao do founder registrada -> despachar o primeiro item aprovado com dono unico -> fila por delta.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `3b8ec806-ca21-49ea-bfd3-26bc8d033059` finished with status `succeeded` at 2026-11-08T03:02:07.685Z.
- I'm woken on AID-6478 (new issue, no comments). Let me get the issue details and check recent context scripts to understand the board state and API patterns.

The issue is the one I spawned last heartbeat to carry the founder decision. Now I need to: recon the repo/board for grounding, write the proposal document, and open the `ask_user_questions` interaction. Let me check prior interaction/document API patterns and repo state.

Board confirmed clean (0 open). Now let me ground the proposal in the actual repo state.

Repo grounded: 2 launch URLs live (LiteracyDojo 14 missions; CodexDojo OS dev rail), Dev-journey readiness `stale`, board clean since 11-01. Now let me check the exact interaction/document API shapes used previously.

No prior POST-documents example, so I'll probe the schema while creating the real `brief` document (proposal artifact), then verify.

Document `brief` saved (rev `e3acc12d`). Now the receipt comment + the `ask_user_questions` interaction (live wake path), then status → `in_review`.

Interaction `45f0831a` pending with `wake_assignee`. Final step: status → `in_review` and verify.

AID-6478 heartbeat complete — proposal produced and foun
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `3b8ec806-ca21-49ea-bfd3-26bc8d033059` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Interaction [ask_user_questions] Founder: qual a proxima iniciativa do AiDevSchool? (board limpo desde 01/nov — 1 escolha) (pending)

Board 100% fechado e time idle. Proposta completa no doc `brief` desta issue (rev e3acc12d): 4 opcoes com entregas, metricas e riscos. Recomendacao do CEO: Opcao A (beta fechado com 10-30 aprendizes reais nas 2 URLs de launch) — compra evidencia de uso real antes de mais build. Sua resposta registra a decisao, me acorda (wake_assignee) e eu despacho o primeiro item aprovado com dono unico e fila por delta.

## Comments (1)

**CEO** · 2026-11-08T03:01:47.78537+00:00

**Recibo CEO (AID-6478):** proposta da proxima iniciativa salva no documento `brief` (rev e3acc12d) desta issue.

Ponto de partida verificado 1a mao: board 0 abertas (desde 2026-11-01, 22 PRs mergeados — AID-4358); URLs de launch LiteracyDojo (14 missoes) e CodexDojo OS (rail guiado de 3) no ar; readiness Dev `stale`; 24 agentes idle.

Opcoes: **A** beta fechado com aprendizes reais (recomendada) | **B** refresh de readiness Dev + expandir rail | **C** cadencia de conteudo LiteracyDojo | **D** outra direcao do founder.

Pergunta estruturada aberta abaixo (ask_user_questions, wake_assignee): sua resposta registra a decisao e me acorda para despachar o primeiro item aprovado com dono unico.

---

