# AID-3738: Sweep VEE: coerção de chave hasOwnProperty(record.*) em dojo-verification-bridge.mjs — classe do achado AID-3717 (observação FSE 9949e752)

- **Status:** backlog | **Priority:** high | **Origin:** manual
- **Assignee:** Verifier & Evidence Engineer | **Created:** 2026-10-02T01:26:12.186112+00:00 | **Updated:** 2026-10-18T11:36:49.397+00:00
- **ID:** `61a60d18-d165-45ed-89a6-12babcc07240`

## Description

**Origem:** observação não-bloqueante do FSE na revisão nativa APPROVED de AID-3717 (comentário 9949e752, head b29631ee): *"dojo-verification-bridge.mjs tem hasOwnProperty com level/stationId de record (linhas 537-1069) — classe similar merece sweep próprio em issue separada"*.

**Classe de defeito (fixada em AID-3717/AID-3737, PR #656 @ b29631ee):** `Object.prototype.hasOwnProperty.call(MAP, record.<campo>)` coage a chave via ToPropertyKey — array de string única (`["l02-a1"]`/aninhado) vira chave válida e pode produzir **PASS com identidade vazia no recibo**; `{toString:null}` lança **TypeError** em vez de recibo FAIL. AUI exige string por schema; falha deve ser fail-closed com recibo.

**Tarefa (dono: VEE):**
1. Inventariar TODOS os sítios `hasOwnProperty(·, record.<campo>)` (e derivados de lookup por chave de record) em `learner/gate/` — não só bridge — com arquivo:linha.
2. Para cada sítio, probe em fixture isolada module-level com chaves não-string (array/array aninhado/número/booleano/objeto/`{toString:null}`/null/ausente) e registro honesto do resto; tabela veredito × recibo.
3. Onde confirmado fail-open (PASS com identidade vazia) ou throw sem recibo: guarda `typeof <campo> === "string"` com curto-circuito antes do lookup (mesmo padrão do fix b29631ee), FAIL fail-closed com erro de identidade existente.
4. Regressivos em arquivos de teste NOVOS (política SDLC docs/sdlc/README.md:578 — protect-tests); PR pequeno por módulo, descrevendo que evidência o check passa a aceitar/rejeitar.

**Limites:** sem alterar critérios/verbetes pedagógicos; sem engine genérico; sem merge/push main (porta FPE); sem deploy.

## Acceptance Criteria

- Inventário público gate × sítio × status (tabela em comentário com arquivo:linha)
- Cada sítio confirmado defeituoso corrigido com guarda de tipo + regressivo commitado em arquivo novo
- Suítes existentes verdes no novo head; logs publicados
- PR(s) pequenos na fronteira do módulo tocado, sem merge

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-3738 — Sweep VEE: coerção de chave hasOwnProperty(record.*) em dojo-verification-bridge.mjs — classe do achado AID-3717 (observação FSE 9949e752)
- Status: in_review
- Priority: high
- Current mode: review
- Last updated by run: 847dc212-f7d7-4b50-94f2-8fd0571d6c19
- Agent: Verifier & Evidence Engineer (opencode_local)

## Objective

**Origem:** observação não-bloqueante do FSE na revisão nativa APPROVED de AID-3717 (comentário 9949e752, head b29631ee): *"dojo-verification-bridge.mjs tem hasOwnProperty com level/stationId de record (linhas 537-1069) — classe similar merece sweep próprio em issue separada"*.

**Classe de defeito (fixada em AID-3717/AID-3737, PR #656 @ b29631ee):** `Object.prototype.hasOwnProperty.call(MAP, record.<campo>)` coage a chave via ToPropertyKey — array de string única (`["l02-a1"]`/aninhado) vira chave válida e pode produzir **PASS com identidade vazia no recibo**; `{toString:null}` lança **TypeError** em vez de recibo FAIL. AUI exige string por schema; falha deve ser fail-closed com recibo.

**Tarefa (dono: VEE):**
1. Inventariar TODOS os sítios `hasOwnProperty(·, record.<campo>)` (e derivados de lookup por chave de record) em `learner/gate/` — não só bridge — com arquivo:linha.
2. Para cada sítio, probe em fixture isolada module-level com chaves não-string (array/array aninhado/número/booleano/objeto/`{toString:null}`/null/ausente) e registro honesto do resto; tabela veredito × recibo.
3. Onde confirmado fail-open (PASS com identidade vazia) ou throw sem recibo: g
[truncated]

## Acceptance Criteria

- Inventário público gate × sítio × status (tabela em comentário com arquivo:linha)
- Cada sítio confirmado defeituoso corrigido com guarda de tipo + regressivo commitado em arquivo novo
- Suítes existentes verdes no novo head; logs publicados
- PR(s) pequenos na fronteira do módulo tocado, sem merge

## Recent Concrete Actions

- Run `847dc212-f7d7-4b50-94f2-8fd0571d6c19` finished with status `failed` at 2026-10-18T11:04:46.476Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): `opencode models` timed out after 20s.

## Files / Routes Touched

- `scripts/countersign_gate_check.py`

## Commands Run

- Heartbeat run `847dc212-f7d7-4b50-94f2-8fd0571d6c19` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Comments (3)

**founder** · 2026-10-17T16:21:54.391042+00:00

🚀 Prioridade alta na `main` pós-PR #657 (`b08e0096`): executar sweep de `Object.hasOwn` em `dojo-verification-bridge.mjs` e verificadores correlatos com testes de regressão.

**?** · 2026-10-17T18:10:21.012719+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - Failed to execute statement. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `bf9a06ed-c8ba-4a8d-8cd3-464c5dcb0d8f`
- Recovery owner: [QA Lead](/AID/agents/ca6a3f95-8572-43f4-822a-6b40b9bdb63b)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:51.770792+00:00

PR #711 aberto com fail-closed identity guards em dojo-verification-bridge.

---

