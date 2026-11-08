# AID-753: QA — veredito independente pre-merge PR #262 (Sentinel HIGH: XSS dojoToday renderLocalSuggestion): GO/NO-GO + compatibilidade janela O3-C1 — NÃO mergear

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-03T22:03:29.213274+00:00 | **Updated:** 2026-11-01T14:16:20.297+00:00
- **ID:** `af966853-afba-4a21-95a0-47dd6d595660`

## Description

ORDEM CEO (AID-752, desbloqueio 2026-09-03 22:0xZ): **QA Lead — veredito independente pre-merge do PR #262**. Review-only: **NÃO mergear, NÃO landar**; decisão de merge fica com o roteamento CEO pós-veredito.

## Contexto (verificado first-hand pelo CEO nesta rodada)
- **PR #262** aberto por `dandpb` (Sentinel/Jules) às 2026-09-03T19:55:17Z: `🛡️ Sentinel: [HIGH] Fix XSS in dojoToday local suggestion innerHTML rendering`, branch `sentinel/fix-xss-dojotoday-local-suggestion-11053281535048140696` -> `main`.
- Head `1570048d` — checks **30/30 não-falhos** (29 success, 1 skipped); `mergeable_state: clean`.
- Diff (2 arquivos): `engines/dojoToday/src/localProjection.ts` (+4/-2 — envolve `suggestion.title` e `suggestion.detail` em `escapeHtml()` do módulo `./escape` existente; import posicionado no meio do arquivo, funcional por hoisting de ESM) e `docs/product-readiness/README.md` (+1/-1 — downgrade da linha `dojotoday-daily-guidance` de `pass/validated-journey` para `stale/-` por fingerprint de fonte stale).
- **Sem tracking no board até agora** — descoberto na varredura de desbloqueio AID-752.

## Análise rápida do CEO (a validar/refutar independentemente)
- `projectLocalSuggestion` hoje deriva title/detail de constantes (`DEV_RAIL` + strings fixas); dados de progresso (IndexedDB, não-confiáveis) entram apenas como lookup. O fix parece **defesa em profundidade** contra regressão futura, não correção de XSS explorável hoje — confirmar.

## Entregas
1. Verificar corretude do escape (`escapeHtml` de `engines/dojoToday/src/escape.ts`): cobertura de `&<>'"`, chamadas existentes, nenhum double-escape em caminhos que já escapam.
2. Verificar se `renderLocalSuggestion` tem outros call sites/dados não-confiáveis (ex.: `assistant.ts`, `main.ts`) e se o PR cobre a superfície real.
3. Avaliar o efeito colateral do README: downgrade `dojotoday-daily-guidance` para `stale` está aderente ao contrato de readiness (fingerprint de fonte mudou) ou é conflate indevido? O PR exige re-grant de readiness pós-merge?
4. Regressão: rodar escopo mínimo dojoToday (unit + E2E readiness specs) no head do PR.
5. **Compatibilidade com a janela 21d O3-C1 (AID-670)**: fix toca engine dojoToday, não as lições retrofitadas l01–l07 — declarar se é window-compatible (sem tocar métricas da janela) ou se exige gate founder.
6. Publicar veredito **GO / NO-GO / GO-COM-AJUSTES** como comment nesta issue com evidência (comandos, hashes, logs) — formato dos vereditos AID-708/AID-744.

## Limites
- Não merge, não deploy, não push para `main`.
- Não alterar a spec O3-C2 nem os gates §8.7.
- Achados novos fora do escopo do PR -> abrir issue própria e apontar aqui.

## Critério de aceite
Veredito publicado com evidência independente + posição explícita sobre (a) corretude do escape, (b) downgrade de readiness, (c) compatibilidade com a janela O3-C1. Roteamento pós-veredito (merge por FPE com countersign, ou gate founder) fica com o CEO.

## Document `Continuation Summary` (2026-09-03)

# Continuation Summary

- Issue: AID-753 — QA — veredito independente pre-merge PR #262 (Sentinel HIGH: XSS dojoToday renderLocalSuggestion): GO/NO-GO + compatibilidade janela O3-C1 — NÃO mergear
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 044ec88e-f848-4e67-9cb2-40869eb761d8
- Agent: QA Lead (opencode_local)

## Objective

ORDEM CEO (AID-752, desbloqueio 2026-09-03 22:0xZ): **QA Lead — veredito independente pre-merge do PR #262**. Review-only: **NÃO mergear, NÃO landar**; decisão de merge fica com o roteamento CEO pós-veredito.

## Contexto (verificado first-hand pelo CEO nesta rodada)
- **PR #262** aberto por `dandpb` (Sentinel/Jules) às 2026-09-03T19:55:17Z: `🛡️ Sentinel: [HIGH] Fix XSS in dojoToday local suggestion innerHTML rendering`, branch `sentinel/fix-xss-dojotoday-local-suggestion-11053281535048140696` -> `main`.
- Head `1570048d` — checks **30/30 não-falhos** (29 success, 1 skipped); `mergeable_state: clean`.
- Diff (2 arquivos): `engines/dojoToday/src/localProjection.ts` (+4/-2 — envolve `suggestion.title` e `suggestion.detail` em `escapeHtml()` do módulo `./escape` existente; import posicionado no meio do arquivo, funcional por hoisting de ESM) e `docs/product-readiness/README.md` (+1/-1 — downgrade da linha `dojotoday-daily-guidance` de `pass/validated-journey` para `stale/-` por fingerprint de fonte stale).
- **Sem tracking no board até agora** — descoberto na varredura de desbloqueio AID-752.

## Análise rápida do CEO (a validar/refutar independentemente)
- `proje
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `044ec88e-f848-4e67-9cb2-40869eb761d8` finished with status `succeeded` at 2026-09-03T22:12:44.355Z.
- Entendi o escopo. Vou primeiro levantar os artefatos de referência (formato dos vereditos AID-708/AID-744, janela O3-C1 em AID-670) e o estado do repo/PR.

PR confirmado via API GitHub. Agora vou examinar o código-fonte dojoToday relevante no workspace base.

Panorama do código-fonte confirmado. Agora, vamos verificar o `assistant.ts` para outros pontos de inserção (sinks), o contrato de readiness e o estado do branch-protection:

Contract-crítico: o README é **gerado** ("DO NOT EDIT BY HAND"). Vou verificar se o hand-edit do PR sobrevive à regeneração via CLI, checar a política de freshness, e o estado do `main` remoto:

Contract do readiness entendido (`current_decision` computa `stale` por fingerprint). Vou montar worktree limpa no head do PR e verificar se o hand-edit do README equivale à regeneração via CLI:

O hand-edit do README é **idêntico à regeneração da CLI**. Agora o controle: no base `b549aea5`, o render produz `pass` (fingerprint vigente), provando que o downgrade decorre da própria mudança de fonte do PR:

Controle confirmado: base = `pass`, head = `stale`, ambos "already in sync" — o downgrade é consequência mecânica da própria mudança de fonte.
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `044ec88e-f848-4e67-9cb2-40869eb761d8` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-09-03T22:12:26.525723+00:00

## VEREDITO QA (AID-753, 2026-09-03): **GO** para o merge do PR #262 (head `1570048d`) — sem ajustes bloqueantes

Reexecução independente do QA Lead (agente `ca6a3f95`) em **worktree limpa e dedicada** (`git worktree add --detach /tmp/opencode/aid753/wt 1570048da686bb3b4debd207b9f5f1f2b3ac0fc1`), sem reusar servidores/sessões de outros workspaces. Roteamento de merge permanece com o CEO (ORDEM AID-752): QA não mergeia.

### Triage de severidade (posição explícita)
- **Sink real, não explorável hoje**: o controle negativo no base `b549aea5` confirma que `renderLocalSuggestion` interpolava `title`/`detail` crus em template que termina em `root.innerHTML` (main.ts:341, rota hosted `?host=os`). Porém o **dataflow atual não entrega string hostil**: `projectLocalSuggestion` deriva `title` das constantes `DEV_RAIL` e `detail` de strings fixas; o dado não-confiável (IndexedDB `codexdojo-os`) entra apenas como lookup (`activeMissionId` em `find()`, comparações de status) — probe com `activeMissionId='<svg onload=alert(5)>'` e statuses hostis projeta `title="WAREHOUSE"` sem injeção (8/8 checks no head; 4 falhas esperadas no base). **O claim HIGH "exploitable XSS" do Sentinel é superestimado; o fix é defesa em profundidade contra regressão futura** — e ainda assim vale o merge (endurece o único sink não-escapado do engine).
- Superfície: `assistant.ts` usa `textContent` (sem sink HTML); `render(today)` em main.ts escapa todas as interpolações de string via `escapeHtml`; numéricos do streak (`s.current/longest/freezes*`) são `readonly number` da snapshot gerada pelo substrato (classe de confiança distinta; observação de hardening apenas). O PR cobre a superfície real do sink.

### (a) Corretude do escape — **VERIFICADA**
- `escapeHtml` (src/escape.ts) cobre os 5 caracteres `& < > " '` com semântica de escape único; probe confirma `&quot;`/`&#39;`/`&amp;`/`&lt;script&gt;` e pass-through de strings benignas (**sem double-escape**). Único call site novo (`main.ts:341` → `loadHostLocalToday()`) recebe strings cruas da projeção, não pré-escapadas — sem dupla aplicação.
- Import no meio do arquivo (ESM hoisting): funcional; **biome clean** e `tsc --noEmit` OK (via build) no head. Nota cosmética apenas.
- Bundle de produção contém o escape: `dist/assets/index-Bd2oByGW.js` → `<h2>${i(e.title)}</h2>` (`i` = escapeHtml minificada).

### (b) Downgrade de readiness — **ADERENTE ao contrato; re-grant exigido pós-merge**
- `docs/product-readiness/README.md` é gerado ("DO NOT EDIT BY HAND") — verifiquei se o hand-edit equivale à regeneração: `python3 docs/product-readiness/tools/cli.py render` no head `1570048d` → **"already in sync"**, diff byte-idêntico ao commit. Controle no base `b549aea5` → render mantém `pass/validated-journey` e sync. Ou seja: o downgrade `dojotoday-daily-guidance` → `stale/-` é a **consequência mecânica e correta** da mudança de fingerprint de fonte provocada pelo próprio PR (`evaluate.py:79/143` — "source fingerprint is stale" → STALE), não conflate indevido. O PR corretamente rebaixa o claim em vez de deixar um `pass` stale.
- **Pós-merge é obrigatório revalidar**: re-executar os cenários readiness dojoToday no novo SHA, promover resultados e registrar avaliação independente ("A runnable engine or passing producer test does not grant a readiness tier") para restaurar `pass/validated-journey`. Passo de roteamento pós-veredito — dono: CEO/FPE.

### (c) Compatibilidade janela O3-C1 (AID-670) — **WINDOW-COMPATIBLE, sem gate founder**
- Diff = exatamente 2 arquivos (`engines/dojoToday/src/localProjection.ts` +4/−2; `docs/product-readiness/README.md` +1/−1). Zero toque em `engines/literacyDojo/`, `curriculum/ai-literacy/`, `learner/`, spec O3-C2 ou gates §8.7.
- Métricas da janela (literacy-evidence v1, tentativas/pass l01–l07, revisões, abandono E1, funil OP-B) não dependem de dojoToday; a linha readiness alterada é `dojotoday-daily-guidance` — `literacy-standalone-first-lesson` permanece `pass/customer-ready`.

### Execução no head `1570048d` (worktree limpa, node v24.18.0, npm 11.17.0, `npm ci --include=dev`)
| Passo | Comando | Resultado |
| --- | --- | --- |
| Diff audit | API GitHub `pulls/262/files` + `git diff b549aea5..1570048d` | 2 arquivos, +5/−3, 2 commits (450fd970 fix, 1570048d README) |
| Selfcheck | `npm run selfcheck` | OK (track + game_dir) |
| Lint | `npm run lint` (biome 1.9.4) | 8 arquivos, clean |
| Build | `npm run build` (prebuild `python3 -m learner.substrate`; tsc --noEmit && vite build) | OK, 8 módulos, dist 17.64 kB JS |
| E2E readiness | `npx playwright test` (Playwright 1.62.0) | **1 passed** (`dojotoday-active-unit-guidance`) |
| Probe XSS | esbuild-bundle unit probe (8 checks) + controle negativo no base | **8/8 PASS head; base 4/4 FAIL conforme esperado** — log `/paperclip/aid753_xss_probe.log` |
| Readiness render | `cli.py render` no head e no base | head: sync + `stale`; base: sync + `pass` — log `/paperclip/aid753_suite_head.log` |

### CI e mergeability no head (first-hand, API GitHub)
- **36/36 check-runs no head `1570048d`: 35 success + 1 skipped** (pixelDojo matrix) — inclui os 4 contexts requeridos (`literacyDojo`, `codexdojo-os (TS)`, `Python (learner + curriculum shared)`, `product readiness (claims)`) e `SDLC guardrails (diff)`. (Nota: contagem inicial de 30 no payload da ORDEM era página incompleta da API.)
- `mergeable: true`, base = `origin/main` HEAD `b549aea5` (sem drift). `mergeable_state: blocked` deve-se exclusivamente a `require_last_push_approval: true` (proteção de branch) — **contersign pendente, não defeito**.

### Follow-up (não bloqueante)
- **Child issue aberta** (id `07b800d4`, backlog): *"dojoToday — gap de cobertura: rota hosted (?host=os) / renderLocalSuggestion sem teste automatizado"* — o readiness.spec.ts só cobre a vista principal; regressão do escape não seria capturada por CI. Proposta de teste E2E com stub IndexedDB hostil.
- Re-grant de `dojotoday-daily-guidance` pós-merge (item (b)).

**Disposição: GO.** Limitações: veredito cobre o head `1570048d` pinado; nova push à branch invalida e exige re-verificação. Nenhum defeito de produto encontrado no PR.

---

