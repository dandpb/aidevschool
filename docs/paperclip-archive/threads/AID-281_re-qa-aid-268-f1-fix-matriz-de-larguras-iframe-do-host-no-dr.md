# AID-281: Re-QA AID-268 (F1 fix): matriz de larguras + iframe do host no draft 6a92048e (revisao 3f56acf) — veredito GO/NO-GO de warehouse/wormhole

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-08-28T22:02:09.807051+00:00 | **Updated:** 2026-08-28T22:07:36.621+00:00
- **ID:** `e750eebd-1c73-4b79-b33d-e66dec39dae5`

## Description

Re-QA independente do fix F1 (AID-275) pelo verificador ca6a3f95 (producer != verifier; produtor fa8130d5 nao aprova a propria mudanca).

**Candidato:** revisao imutavel 3f56acf5917773b72ac207c9f3cd13636ab1a190 (parent 161f8c9, nao mutado; diff = 2 linhas: #stage { flex: 1 1 0; min-width: 0 } em game-02-warehouse/index.html e game-03-wormhole/index.html, paridade com relay-station).

**Draft pinado:** https://6a92048e07e78c64703b806e--aidevschool-codexdojo-os.netlify.app (deploy 6a92048e07e78c64703b806e, sem --prod; alias canonico/producao intactos; pin pixel-quest inalterado). Manifesto servido: sourceRevision 3f56acf; sha256 das 5 superficies conferem (verificado pelo produtor).

**Escopo da re-QA (suite AID-268, ~2 min):** rodar _work-products/AID-268/scripts/qa_draft_a11y.mjs + qa_host_probe.mjs (ou as copias adaptadas em _work-products/AID-275/scripts/ que apontam o novo draft) e validar o criterio de aceite F1: matriz 320/375/768/1280 sem scroll horizontal essencial e HUD utilizavel em warehouse e wormhole, standalone + iframe real do host. Os demais criterios da matriz (lang, live-region, botoes >=44, reduced-motion, contraste) nao foram tocados pelo diff, mas a suite os cobre de todo jeito.

**Pre-check do produtor (nao substitui veredito):** 12/12 celulas PASS; iframe host 854px: hudW 340, overflow 0 (antes hudW 33 / scrollW 972). Artefatos: _work-products/AID-275/ (FIX-REPORT.md, qa-draft-a11y-results.json, host-iframe-results.json, shots/, scripts/).

**Nota F2:** as 2 falhas warehouse vitest (attempt_id) sao o defeito F2 pre-existente, rastreado em issue propria — fora do escopo desta re-QA.

## Document `Continuation Summary` (2026-08-28)

# Continuation Summary

- Issue: AID-281 — Re-QA AID-268 (F1 fix): matriz de larguras + iframe do host no draft 6a92048e (revisao 3f56acf) — veredito GO/NO-GO de warehouse/wormhole
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: c537fe83-2e26-4266-9190-c79392041d1c
- Agent: QA Lead (opencode_local)

## Objective

Re-QA independente do fix F1 (AID-275) pelo verificador ca6a3f95 (producer != verifier; produtor fa8130d5 nao aprova a propria mudanca).

**Candidato:** revisao imutavel 3f56acf5917773b72ac207c9f3cd13636ab1a190 (parent 161f8c9, nao mutado; diff = 2 linhas: #stage { flex: 1 1 0; min-width: 0 } em game-02-warehouse/index.html e game-03-wormhole/index.html, paridade com relay-station).

**Draft pinado:** https://6a92048e07e78c64703b806e--aidevschool-codexdojo-os.netlify.app (deploy 6a92048e07e78c64703b806e, sem --prod; alias canonico/producao intactos; pin pixel-quest inalterado). Manifesto servido: sourceRevision 3f56acf; sha256 das 5 superficies conferem (verificado pelo produtor).

**Escopo da re-QA (suite AID-268, ~2 min):** rodar _work-products/AID-268/scripts/qa_draft_a11y.mjs + qa_host_probe.mjs (ou as copias adaptadas em _work-products/AID-275/scripts/ que apontam o novo draft) e validar o criterio de aceite F1: matriz 320/375/768/1280 sem scroll horizontal essencial e HUD utilizavel em warehouse e wormhole, standalone + iframe real do host. Os demais criterios da matriz (lang, live-region, botoes >=44, reduced-motion, contraste) nao foram tocados pelo diff
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `c537fe83-2e26-4266-9190-c79392041d1c` finished with status `succeeded` at 2026-08-28T22:07:49.117Z.
- Contexto obtido: AID-281 é a re-QA independente do fix F1 (AID-275) no draft pinado `6a92048e` (revisão `3f56acf`), com veredito GO/NO-GO para warehouse/wormhole. Vou examinar a suíte original da AID-268 e os artefatos do produtor.

Os scripts do produtor diferem dos originais da AID-268 apenas em URL/import/output — asserções intactas. Agora vou montar minha verificação independente: proveniência do draft, diff da revisão e suíte de browser.

Diff da revisão confirmado: exatamente 2 arquivos/2 linhas, parent `161f8c9` não mutado. Agora a provenância do deploy pinado e dos aliases.

Achado: o alias canônico agora serve `b9f360e` (não `ec265fa`). Vou checar meu próprio veredito AID-270 para entender a linha do tempo de promoção.

Provenança do draft confirmada independentemente (manifesto servido = `3f56acf`, 8/8 sha256 conferem). Nota importante: alias canônico agora serve `b9f360e` (promoção AID-270, trilha paralela) — vou verificar se a produção atual ainda expõe o F1.

Produção atual (`b9f360e`) ainda expõe o F1 — promoção pendente do meu veredito, como esperado. Agora a suíte de browser independente (matriz de larguras + iframe do host) contra o draft pinado
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `c537fe83-2e26-4266-9190-c79392041d1c` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-08-28T22:07:29.676534+00:00

VEREDITO AID-281 (re-QA independente do fix F1): **GO para warehouse e wormhole** no draft 6a92048e @ 3f56acf.

Evidência executada por mim (produtor != verificador; suite AID-268 reutilizada com só URL/output alterados, asserções auditadas por diff):

1. Provenança: diff 161f8c9..3f56acf = exatamente 2 arquivos/2 linhas (#stage flex:1 1 0; min-width:0 em warehouse/wormhole); parent não mutado; manifesto servido sourceRevision=3f56acf com 8/8 sha256 conferindo contra o conteúdo servido (download próprio); HTML servido com min-width:0 nos 2 apps + relay (paridade).
2. Matriz de larguras standalone: 12/12 células PASS (warehouse/wormhole/relay × 320/375/768/1280), hOverflow=0 em todas; hudW @>=768: 340/360 (antes 33).
3. Iframe real do host (trilha Dev -> escola -> missão em destaque, 1280px, reduced-motion): warehouse 854px -> hudW 340 (antes 33), scrollW 854 = clientW 854 (antes 972>854), 12 botões HUD. Duas execuções, números idênticos.
4. Demais critérios da matriz (não tocados pelo diff): lang pt-BR, 1 live region role=status/aria-live=polite, botões >=44px, reduced-motion computado 0s, contraste AA 0 falhas — PASS nos 3 apps. Pixel-quest pin inalterado reexecutado: PASS.

Observação de release (não bloqueia o GO, exige decisão de promoção): o alias canônico agora serve b9f360e (promoção pós-GO AID-270, trilha D1) e essa revisão AINDA contém o F1 (verifiquei por fetch direto: warehouse/wormhole sem min-width:0). Promover o fix exige reconciliar 3f56acf (filho de 161f8c9) com a linhagem canônica atual — 2 linhas reaplicáveis; owner: produtor fa8130d5/CEO.

F2 (warehouse vitest attempt_id, 2 falhas) segue fora do escopo, pré-existente, issue própria.

Limitações: leitor de tela real indisponível (critério 3 estrutural, como em AID-268); zoom 400% aproximado por 320px; screenshots capturados mas não inspecionáveis por este verificador (evidência primária numérica).

Artefatos: instances/default/workspaces/ca6a3f95-8572-43f4-822a-6b40b9bdb63b/aid281-evidence/ (QA-VERDICT-AID-281.md, qa-draft-a11y-results.json, host-iframe-results.json, contrast-results.json, shots/, scripts reexecutáveis).

---

