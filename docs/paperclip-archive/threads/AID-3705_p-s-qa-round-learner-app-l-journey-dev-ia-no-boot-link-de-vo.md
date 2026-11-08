# AID-3705: [Pós-QA-ROUND] Learner App lê ?journey=dev|ia no boot + link de volta para /escola/ no footer da Home

- **Status:** backlog | **Priority:** high | **Origin:** manual
- **Assignee:** Learner App Engineer | **Created:** 2026-10-01T22:09:26.159116+00:00 | **Updated:** 2026-10-18T11:36:45.994+00:00
- **ID:** `3bd6a511-5128-4c44-b905-bfd16d238bc6`

## Description

Origem: decisão de produto AID-3702 (D1 + D2) + F3/F4 do AID-3685 L11 (matriz linhas 8 e 12; evidência /paperclip/aid3685-evidence/2026-10-01-l11-growth-web-entrada-links.md).

GATE: NÃO iniciar durante a rodada QA-ROUND. Condicionado ao aceite do PO na decisão AID-3702 e ao fim da rodada. Issue em backlog, sem atribuição até o aceite.

Escopo pequeno:
1. Boot do app (`engines/literacyDojo/src/app/App.tsx`): ler `URLSearchParams` uma vez; `journey=dev|ia` seta a jornada inicial (hoje só estado interno em `HomeScreen.tsx:137-160`). Ausente/inválido = comportamento atual (visão de duas jornadas).
2. Home footer: link discreto para `/escola/` (rótulo honesto, ex.: “Escola de IA · ver as duas jornadas”). Nada no header — não competir com o loop de aprendizado.
3. Testes: estender `journeySwitchFlow.test.tsx` com casos do param (dev, ia, inválido, ausente) + teste do link de retorno.

Aceite: `npm test` e `npm run build` verdes; param não afeta SW (shell da raiz intacto, chaves de navegação isoladas); link `/escola/` same-origin; sem mudança de produto além do escopo D1/D2.

Dono sugerido: especialista Learner App; revisão independente.

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-3705 — [Pós-QA-ROUND] Learner App lê ?journey=dev|ia no boot + link de volta para /escola/ no footer da Home
- Status: in_review
- Priority: high
- Current mode: review
- Last updated by run: b1836eea-8ae1-4882-93a4-ff71e0044478
- Agent: Learner App Engineer (opencode_local)

## Objective

Origem: decisão de produto AID-3702 (D1 + D2) + F3/F4 do AID-3685 L11 (matriz linhas 8 e 12; evidência /paperclip/aid3685-evidence/2026-10-01-l11-growth-web-entrada-links.md).

GATE: NÃO iniciar durante a rodada QA-ROUND. Condicionado ao aceite do PO na decisão AID-3702 e ao fim da rodada. Issue em backlog, sem atribuição até o aceite.

Escopo pequeno:
1. Boot do app (`engines/literacyDojo/src/app/App.tsx`): ler `URLSearchParams` uma vez; `journey=dev|ia` seta a jornada inicial (hoje só estado interno em `HomeScreen.tsx:137-160`). Ausente/inválido = comportamento atual (visão de duas jornadas).
2. Home footer: link discreto para `/escola/` (rótulo honesto, ex.: “Escola de IA · ver as duas jornadas”). Nada no header — não competir com o loop de aprendizado.
3. Testes: estender `journeySwitchFlow.test.tsx` com casos do param (dev, ia, inválido, ausente) + teste do link de retorno.

Aceite: `npm test` e `npm run build` verdes; param não afeta SW (shell da raiz intacto, chaves de navegação isoladas); link `/escola/` same-origin; sem mudança de produto além do escopo D1/D2.

Dono sugerido: especialista Learner App; revisão independente.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `b1836eea-8ae1-4882-93a4-ff71e0044478` finished with status `failed` at 2026-10-18T11:05:02.120Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): `opencode models` timed out after 20s.

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `b1836eea-8ae1-4882-93a4-ff71e0044478` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Comments (5)

**founder** · 2026-10-17T16:21:54.520534+00:00

🚀 DECISÃO DE PRODUTO APROVADA (AID-3702): Implementar leitura de `?journey=dev|ia` no boot do Learner App (`engines/literacyDojo`) + link de volta para `/escola/` no footer da Home.

**Learner App Engineer** · 2026-10-17T19:21:33.268442+00:00

**AID-3705 — implementação completa, PR aberto para revisão independente**

## PR
**https://github.com/dandpb/aidevschool/pull/708** — `feat(literacyDojo): AID-3705 — boot lê ?journey=dev|ia + link de volta para /escola/ na Home`
Branch `aid3705/journey-param-escola-link` @ `ceac6741`, base `main` @ `b08e0096`. 4 arquivos, +136/−5 (App.tsx, HomeScreen.tsx, journeySwitchFlow.test.tsx, README do engine). Sem merge/deploy — merge é porta do FPE (countersign-gate).

## Escopo D1 (decisão AID-3702)
- Boot não-hospedado lê `URLSearchParams` UMA vez; `journey=dev|ia` seta a jornada inicial via `switchJourney` (mesma semântica do switch manual AID-3584: idempotente, statuses só quando ausentes, cursores preservados), ANTES do `resumeSession`.
- Ausente/inválido = comportamento atual (visão de duas jornadas). Sem onboarding completo = ignorado. Falha de persistência = fallback silencioso, boot nunca quebra.
- **SW intocado** (`sw.js`/`index.html`/PWA zero mudanças) — param é client-side apenas; shell da raiz e chaves de navegação isoladas preservados.

## Escopo D2
- Rodapé da Home: link discreto same-origin `/escola/`, rótulo “Escola de IA · ver as duas jornadas”. Nada no header (não compete com o loop de aprendizado).

## Verificação (aceite da issue)
- `npm test`: **54 arquivos / 389 passed + 1 skipped** (383 pré + 6 novos: dev, ia, inválido, ausente, sem-onboarding, link de volta) ✓
- `npm run build` (tsc -b + vite) ✓ · `npm run lint` (biome) ✓ · `gen:content` 32 ready = 23 IA + 9 Dev ✓
- Playwright contra `vite preview` (build real): `?journey=dev` → `aria-pressed=true`; link → `/escola/` (`#start-fundamentals`); mobile 320px sem overflow; `?journey=banana` → IA ativa ✓

## Capturas reais (QA visual)
- `/paperclip/aid3705-evidence/aid3705-home-dev-desktop.png` (1280px, Home com Dev ativa via param + rodapé)
- `/paperclip/aid3705-evidence/aid3705-home-dev-mobile.png` (320px, sem overflow)
- `/paperclip/aid3705-evidence/aid3705-home-footer.png` (crop do rodapé com o link)

## Próximo passo
Revisão independente (QA Lead ou FPE) + countersign no PR #708; merge pela porta do FPE. Entry links da `/escola/` apontando para `/?journey=` são follow-up do funil (dono Growth/UX), não deste escopo.

**Learner App Engineer** · 2026-10-17T19:38:10.770515+00:00

Resuming — README edit needs a shorter anchor. Fixing now:

Now generating PR screenshots. Starting a preview server and driving the real UI with Playwright:

PR #708 created. Checking CI status and finding the Paperclip API conventions:

`gh pr checks` blocks while pending — will poll via API later. Reading the Paperclip API helper:

Interrupted — verifying whether the comment landed before retrying:

HTTPS to the API hangs. Testing TLS variants:

Remote API is partitioned. Retrying with bounded backoff:

API still down. One more retry round, then leave the queued post script if needed:

Paperclip API is down (5min of retries). Work is durable on GitHub. Quick non-blocking CI check before wrapping up:

CI green so far. Checking the literacyDojo-specific checks:

CI fully green (28 success incl. `literacyDojo (TS + content)`). Final retry of the Paperclip update:

The Paperclip API stayed unreachable through the entire heartbeat (~10 min of retries — HTTPS handshake stalls; HTTP only 301s into it). All engineering work is complete and durable. Final state:

## AID-3705 — implementation complete, PR open, CI green

**PR #708**: https://github.com/dandpb/aidevschool/pull/708 — `aid3705/journey-param-escola-link` @ `ceac6741` (base `main` @ `b08e0096`), 4 files, +136/−5.

**Scope delivered (D1/D2, nothing more):**
- **D1** `App.tsx`: boot lê `?journey=dev|ia` uma vez → `switchJourney` antes do `resumeSession` (mesma semântica do switch manual AID-3584: idempotente, statuses só quando ausentes, cursores preservados). Inválido/ausente/sem-onboarding = comportamento atual; falha de persistência = fallback silencioso; SW/`index.html` intocados.
- **D2** `HomeScreen.tsx`: link discreto same-origin `/escola/` no rodapé (“Escola de IA · ver as duas jornadas”), nada no header.
- Testes: +6 em `journeySwitchFlow.test.tsx` (dev, ia, inválido, ausente, sem-onboarding, link de volta).

**Verificação**: `npm test` 389 passed/1 skipped ✓ · `npm run build` ✓ · lint ✓ · gen:content ✓ · CI no PR: 28 success + 2 skipped, incl. `literacyDojo (TS + content)` ✓ · Playwright real: `aria-pressed=true` com param, link → `/escola/`, mobile 320 sem overflow ✓. Capturas: `/paperclip/aid3705-evidence/` (desktop/mobile/footer).

**Disposição**: `in_review` — revisor path real existe (revisão independente + countersign + merge pela porta do FPE). Bloqueio pontual: a API Paperclip está em partição de rede; o comentário com recibo + PATCH de status para `in_review` está pronto em `/tmp/opencode/aid3705_post.py` e deve ser executado no próximo heartbeat quando a API responder (unblock owner: infra/harness; nenhum bloqueio de engenharia).

**?** · 2026-10-17T19:51:25.066771+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - Failed to execute statement. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `63306465-2b60-4a08-8c16-9e9902a78fed`
- Recovery owner: [Founding Product Engineer](/AID/agents/fa8130d5-e24e-4f98-8470-ccfeef17c6d5)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:51.817416+00:00

PR #708 aberto (boot lê ?journey=dev|ia + link /escola/ na Home).

---

