# AID-2679: COUNTERSIGN QA — PR #528 (AID-2674): SDLC Quest beta URL pública — publish.sh + runbook + intent (GO/NO-GO antes do merge FPE)

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-26T01:50:28.59794+00:00 | **Updated:** 2026-11-01T14:12:26.071+00:00
- **ID:** `5e5c40bc-9c70-4e9f-9636-8f6afaf51d4c`

## Description

## Pedido de countersign independente (AID-2219: veredito antes do merge)

**PR:** https://github.com/dandpb/aidevschool/pull/528 (head `3a9af45d`, branch `ops/aid-2674-sdlc-quest-beta-url`, base `main`)
**Contexto:** AID-2674 (este issue pai) — beta do founder, diretiva AID-2660 01:20Z. Registro do produtor já commitado no PR (`intent/AID-2674-sdlc-quest-beta-url/`).

**O que verificar (contra `plan.md` do registro):**
1. Diff toca APENAS `intent/AID-2674-sdlc-quest-beta-url/` e `scripts/deploy/sdlc-quest-beta/` — zero mudanças em `engines/sdlc-quest/` (manifesto `SHA256SUMS.txt` intocado) e em domínios de produto.
2. `publish.sh` aborta se qualquer arquivo divergir do manifesto SHA256SUMS na revisão de origem; segredo somente via env (`NETLIFY_AUTH_TOKEN`), nada no repo.
3. `netlify.toml`: headers `noindex, follow` (superfície beta, não promoção), nosniff, no-referrer; CSP estrita em `/` e `/index.html` sem enfraquecer o jogo (single-file offline leva só headers baseline).
4. CI verde no head (job `sdlc-quest (TS)` + `sdlc-guards`).
5. Smoke `smoke/sdlc-quest-beta.spec.ts`: joga a campanha até o gate de produção na URL ao vivo e falha em qualquer erro de console; respostas derivadas de `src/data.js` em runtime (não hardcoded).

**Evidência first-hand do produtor:** URL https://aidevschool-sdlcquest.netlify.app — smoke passed (15/18, gate autorizado, zero erros console); screenshots anexos em AID-2674; deploys `6ab723bfcd…`/`6ab72452cda…` a partir do main `4461841f`.

**Entrega esperada:** veredito GO/NO-GO no PR #528 (comentário no PR ou neste issue). GO → FPE (fa8130d5) executa o merge single-writer citando o countersign na merge message. NO-GO → achados aqui; produtor corrige no mesmo PR.

**Limites:** não é pedido de revalidação de readiness (matriz customer-tier não cobre sdlc-quest — é beta de founder, `noindex`).

## Document `Continuation Summary` (2026-09-26)

# Continuation Summary

- Issue: AID-2679 — COUNTERSIGN QA — PR #528 (AID-2674): SDLC Quest beta URL pública — publish.sh + runbook + intent (GO/NO-GO antes do merge FPE)
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 07bdbdfb-21c6-4e6c-a397-e15b44b82849
- Agent: QA Lead (opencode_local)

## Objective

## Pedido de countersign independente (AID-2219: veredito antes do merge)

**PR:** https://github.com/dandpb/aidevschool/pull/528 (head `3a9af45d`, branch `ops/aid-2674-sdlc-quest-beta-url`, base `main`)
**Contexto:** AID-2674 (este issue pai) — beta do founder, diretiva AID-2660 01:20Z. Registro do produtor já commitado no PR (`intent/AID-2674-sdlc-quest-beta-url/`).

**O que verificar (contra `plan.md` do registro):**
1. Diff toca APENAS `intent/AID-2674-sdlc-quest-beta-url/` e `scripts/deploy/sdlc-quest-beta/` — zero mudanças em `engines/sdlc-quest/` (manifesto `SHA256SUMS.txt` intocado) e em domínios de produto.
2. `publish.sh` aborta se qualquer arquivo divergir do manifesto SHA256SUMS na revisão de origem; segredo somente via env (`NETLIFY_AUTH_TOKEN`), nada no repo.
3. `netlify.toml`: headers `noindex, follow` (superfície beta, não promoção), nosniff, no-referrer; CSP estrita em `/` e `/index.html` sem enfraquecer o jogo (single-file offline leva só headers baseline).
4. CI verde no head (job `sdlc-quest (TS)` + `sdlc-guards`).
5. Smoke `smoke/sdlc-quest-beta.spec.ts`: joga a campanha até o gate de produção na URL ao vivo e falha em qualquer erro de conso
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `07bdbdfb-21c6-4e6c-a397-e15b44b82849` finished with status `succeeded` at 2026-09-26T02:01:43.023Z.
- CI no head: `sdlc-quest (TS)` e `SDLC guardrails (diff)` verdes. Agora monto o ambiente de verificação independente (clone scratch do PR).

Arquivos do PR lidos. Agora executo os charters de verificação: (2) publish.sh abort/não-segredo, (3) headers ao vivo, (5) smoke E2E, (6) provenance do conteúdo publicado vs manifesto.

Headers de segurança ausentes na resposta ao vivo? Verificação completa antes de concluir:

Achado crítico em formação. Diagnostico se o deploy ao vivo contém o `netlify.toml` e se o conteúdo bate com o manifesto:

**T4 PASS — provenance comprovada**: os 15 arquivos ao vivo são byte-idênticos aos pins do manifesto. Agora o smoke E2E ao vivo (T5):

O comando de smoke do runbook não resolve `@playwright/test` em clone limpo (achado próprio). Executo com `NODE_PATH` apontando para o cache do npx:

Spec do produtor não roda em clone limpo (CJS vs ESM). Crio cópia QA-adaptada (só resolução de módulo; lógica do jogo intacta) para executar a mesma carta E2E:

Terceiro defeito do spec: profundidade relativa errada (`../../../` resolve para `scripts/`, faltaria 1 nível). Corrijo na cópia QA e rodo:

**T5 PASS — smoke ao vivo aprovado** (15/18, gate au
[truncated]

## Files / Routes Touched

- `scripts/engines`

## Commands Run

- Heartbeat run `07bdbdfb-21c6-4e6c-a397-e15b44b82849` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-09-26T02:00:01.623227+00:00

## COUNTERSIGN ENTREGUE — veredito NO-GO no PR #528

**Veredito completo:** https://github.com/dandpb/aidevschool/pull/528#issuecomment-5842186409

**Resumo:** NO-GO com 1 blocker e 1 médio; demais verificações PASS.
- **F1 (ALTA/blocker):** headers documentados (`noindex, follow`, nosniff, no-referrer, CSP em `/` e `/index.html`) **ausentes** na URL pública (curl 2026-09-26T01:59Z: nenhum header custom em `/`, `/index.html`, `/sdlc-quest.html`, `/src/app.js`; `/netlify.toml` 404). Hipótese de causa-raiz: `publish.sh` dispara `npx netlify deploy` do repo root, onde o CLI não descobre o `netlify.toml` (que só existe em `scripts/deploy/sdlc-quest-beta/` e em `$WORK`). Superfície beta está indexável — contraria o intent.
- **F2 (MÉDIA):** smoke do runbook não roda em clone limpo: (a) `@playwright/test` não resolvível; (b) `import.meta`+`__dirname` incompatíveis em CJS/ESM; (c) `../../../engines/...` tem um nível a menos (resolve `scripts/engines`).

**PASS:** escopo do diff (6 arquivos, `engines/` intocado; manifesto 227/227 OK no head); guards do publish.sh (abort sem token; abort em tamper — canary scratch e48eb1ce; zero segredos no repo); CI head 3a9af45d 41✓/2skipped/0✗ incl. `sdlc-quest (TS)` + `SDLC guardrails (diff)`; **provenance ao vivo 15/15 arquivos byte-idênticos ao manifesto**; journey ao vivo com cópia QA-adaptada do spec: missões 1–5 até o gate de produção, 15/18, gate autorizado, zero erros de console.

**Evidência:** `workspaces/ca6a3f95…/aid2679-evidence/` (headers ao vivo, hashes, screenshots `shots/sdlc-0{1,3,4}-*.png`).

**Condição de GO:** F1+F2 corrigidos no mesmo PR + headers re-verificados ao vivo + smoke executável conforme runbook → re-countersign rápido (QA).

**Limitações:** deploy ids Netlify não verificáveis sem acesso à conta (mitigado pela conferência de hash do conteúdo ao vivo).

Disposição: countersign entregue; issue done. Desbloqueio é do produtor (AID-2674) no PR #528.

---

