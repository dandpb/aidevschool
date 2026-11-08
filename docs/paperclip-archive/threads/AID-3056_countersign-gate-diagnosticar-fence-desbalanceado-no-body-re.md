# AID-3056: countersign-gate: diagnosticar fence desbalanceado no body + retry de transporte no sdlc_aid_resolve.sh (follow-ups do desbloqueio AID-3055/PR #585)

- **Status:** backlog | **Priority:** high | **Origin:** manual
- **Assignee:** Product Delivery Engineer | **Created:** 2026-09-27T03:45:57.319239+00:00 | **Updated:** 2026-10-18T11:37:03.396+00:00
- **ID:** `c0cbd653-ab65-463c-b725-3b1061eedee4`

## Description

# Origem (evidência primeiro)

Desbloqueio do PR #585 (AID-3055) expôs 2 fragilidades de tooling no caminho do `countersign-gate`. Nada aqui é urgente — o gate falhou corretamente (fail-closed) nos dois casos; o custo foi diagnóstico equivocado e um rerun manual.

## 1. Diagnóstico enganoso quando um fence desbalanceado engole o trailer

- **Evidência**: body do PR #585 tinha o fechamento de code fence grudado no texto seguinte (` ```Prova de mutação... ` em uma linha). `strip_code_fences` (scripts/countersign_gate_check.py:100-123) trata fence com conteúdo na linha de fechamento como *abertura* — o resto do body (incluindo o trailer canônico recém-editado) ficava dentro de um fence nunca-fechado. O gate reportou `countersign agent 'qa-lead' IS the producer agent` (§5) — tecnicamente correto, mas a causa raiz era o fence; a primeira edição do trailer não resolveu e a mensagem não apontava para isso.
- **Risco**: produtor segue o remédio da mensagem (editar trailer), gate continua vermelho, ciclo extra de depuração por PR. Classe de falha silenciosa: markdown renderiza o rastro como código, mas ninguém olha.
- **Proposta**: em `evaluate()`, quando nenhum trailer canônico for encontrado no body fence-stripped, varrer o body **raw** por linha com padrão relaxado `^Provenance:` que exista apenas no raw (isto é, foi engolido por fence) e anexar ao violation message: "body carries a 'Provenance:' line that is inside a code fence / unbalanced fence — fences swallow trailers (AID-2824)". Fail-closed inalterado; só a mensagem melhora.
- **Verificação**: caso novo no self-test (trailer válido engolido por fence colado → mensagem cita o fence).

## 2. Resolver sem retry: 1 falha de transporte (HTTP 000) runner→board redden o gate

- **Evidência**: PR #585, run 36291186382 job 108541465380 (2026-09-27T03:37Z): FAIL apenas no §2 `cited AID-3053 did not resolve — resolve: Paperclip transport error (HTTP 000)`. Rerun do mesmo job verde (108543684062, 15s) sem qualquer mudança de dado. Taxa observada: 1/2 execuções nesse run; primeira ocorrência nesse formato.
- **Risco**: gate required vermelho por transiente de rede atrasa merge door do FPE e consome heartbeat de alguém para rerun manual.
- **Proposta**: no `sdlc_aid_resolve.sh`, para AID-: 1 retry com backoff curto (ex.: sleep 5) apenas quando o curl terminar em HTTP 000 (timeout/connfail). Semântica fail-closed preservada: 2 falhas seguidas continuam exit 2. Não silenciar 401/403/404.
- **Verificação**: self-test do resolver com stub curl que falha 1x e passa na 2ª (exit 0) e que falha 2x (exit 2).

# Escopo

- Arquivos: `scripts/countersign_gate_check.py` (mensagem+self-test), `scripts/sdlc_aid_resolve.sh` (retry). Ambos na área write do Engine Hardening Engineer; PR pequeno próprio, merge pela porta única.
- Não altera contrato de aceitação do gate (AID-2768) nem comportamento pedagógico.

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-3056 — countersign-gate: diagnosticar fence desbalanceado no body + retry de transporte no sdlc_aid_resolve.sh (follow-ups do desbloqueio AID-3055/PR #585)
- Status: in_progress
- Priority: high
- Current mode: implementation
- Last updated by run: 81183927-abb6-40b0-9911-f8ae04ef5817
- Agent: Product Delivery Engineer (opencode_local)

## Objective

# Origem (evidência primeiro)

Desbloqueio do PR #585 (AID-3055) expôs 2 fragilidades de tooling no caminho do `countersign-gate`. Nada aqui é urgente — o gate falhou corretamente (fail-closed) nos dois casos; o custo foi diagnóstico equivocado e um rerun manual.

## 1. Diagnóstico enganoso quando um fence desbalanceado engole o trailer

- **Evidência**: body do PR #585 tinha o fechamento de code fence grudado no texto seguinte (` ```Prova de mutação... ` em uma linha). `strip_code_fences` (scripts/countersign_gate_check.py:100-123) trata fence com conteúdo na linha de fechamento como *abertura* — o resto do body (incluindo o trailer canônico recém-editado) ficava dentro de um fence nunca-fechado. O gate reportou `countersign agent 'qa-lead' IS the producer agent` (§5) — tecnicamente correto, mas a causa raiz era o fence; a primeira edição do trailer não resolveu e a mensagem não apontava para isso.
- **Risco**: produtor segue o remédio da mensagem (editar trailer), gate continua vermelho, ciclo extra de depuração por PR. Classe de falha silenciosa: markdown renderiza o rastro como código, mas ninguém olha.
- **Proposta**: em `evaluate()`, quando nenhum trailer
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `81183927-abb6-40b0-9911-f8ae04ef5817` finished with status `failed` at 2026-10-18T11:09:19.549Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): `opencode models` timed out after 20s.

## Files / Routes Touched

- `scripts/countersign_gate_check.py`

## Commands Run

- Heartbeat run `81183927-abb6-40b0-9911-f8ae04ef5817` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Inspect the failed run, fix the cause, and resume from the most recent concrete action above.

## Comments (3)

**founder** · 2026-10-17T16:21:54.397532+00:00

🚀 Desbloqueado pelo Founder: endurecer `countersign_gate_check.py` contra fences desbalanceados no body + retry de transporte em `scripts/sdlc_aid_resolve.sh`.

**?** · 2026-10-17T17:18:48.360551+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - Failed to execute statement. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `325ea0b7-1b70-4ca3-a4f1-8aeebc226aa7`
- Recovery owner: [Platform & CI Engineer](/AID/agents/1e9be0fa-c320-4309-9704-c755c53da7fd)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:58.988141+00:00

Desbloqueado e reatribuído ao Product Delivery Engineer para abrir PR de hardening do countersign_gate_check.py e sdlc_aid_resolve.sh.

---

