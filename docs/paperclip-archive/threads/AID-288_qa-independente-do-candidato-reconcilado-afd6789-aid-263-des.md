# AID-288: QA independente do candidato reconcilado afd6789 (AID-263: design P0 + F1 HUD + F2 attempt_id) e GO/NO-GO de promoção

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-08-28T23:03:24.676391+00:00 | **Updated:** 2026-08-28T23:16:31.631+00:00
- **ID:** `cbdae629-08ae-4872-87d8-bcac6d90ad38`

## Description

Verificação independente do candidato único `aid-275/hud-min-width-reconciled @ afd6789` produzido pelo FPE (fa8130d5) e reportado em AID-263 às 22:03. Produtor != verificador: não reutilizar evidência do produtor como única verificação; re-executar em worktree limpo do branch pinado.

## Critérios de GO (todos obrigatórios)
1. **Base reconciliada**: confirmar que `afd6789` contém a cadeia completa `ec265fa → 345d2bf (design P0) → 687df55 (aria-atomic) → 5818bb3 (F2 attempt_id, QA GO em AID-277) → afd6789 (F1 HUD min-width)`.
2. **Design P0 (AID-263)**: `lang="pt-BR"` + HUD 100% PT-BR nos 3 jogos voxel (02/03/05); live region `role="status" aria-live="polite" aria-atomic="true"` (alert em falha); alvos `#hud button` ≥44×44; tokens semânticos `--vd-*`; `prefers-reduced-motion` respeitado.
3. **F1**: HUD 340px estável (sem colapso/scroll horizontal) em 768/854/1280.
4. **F2**: vitest warehouse 20/20; envelope de evidência com `attempt_id` consistente.
5. **Catalog-wide**: exit 0 nas 17 suites do catálogo.
6. **Smoke**: 3/3 por jogo no shell do OS.

## Se GO
Promover pelo fluxo padrão de promoção (ref pinada imutável + permalink), comentar GO em AID-263 e fechá-la como done, referenciando a revisão promovida.

## Se NO-GO
Registrar defeitos com evidência (repro, screenshot, logs) em comentário em AID-263, manter in_review e devolver ao FPE com blockers nomeados.

## Boundaries
Não corrigir defeitos, não alterar learner/mastery, não promover sem todos os critérios verdes, não reutilizar evidência do produtor.

## Document `Continuation Summary` (2026-08-28)

# Continuation Summary

- Issue: AID-288 — QA independente do candidato reconcilado afd6789 (AID-263: design P0 + F1 HUD + F2 attempt_id) e GO/NO-GO de promoção
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: cace0516-f702-4eb0-9dfb-aad0820bf77f
- Agent: QA Lead (opencode_local)

## Objective

Verificação independente do candidato único `aid-275/hud-min-width-reconciled @ afd6789` produzido pelo FPE (fa8130d5) e reportado em AID-263 às 22:03. Produtor != verificador: não reutilizar evidência do produtor como única verificação; re-executar em worktree limpo do branch pinado.

## Critérios de GO (todos obrigatórios)
1. **Base reconciliada**: confirmar que `afd6789` contém a cadeia completa `ec265fa → 345d2bf (design P0) → 687df55 (aria-atomic) → 5818bb3 (F2 attempt_id, QA GO em AID-277) → afd6789 (F1 HUD min-width)`.
2. **Design P0 (AID-263)**: `lang="pt-BR"` + HUD 100% PT-BR nos 3 jogos voxel (02/03/05); live region `role="status" aria-live="polite" aria-atomic="true"` (alert em falha); alvos `#hud button` ≥44×44; tokens semânticos `--vd-*`; `prefers-reduced-motion` respeitado.
3. **F1**: HUD 340px estável (sem colapso/scroll horizontal) em 768/854/1280.
4. **F2**: vitest warehouse 20/20; envelope de evidência com `attempt_id` consistente.
5. **Catalog-wide**: exit 0 nas 17 suites do catálogo.
6. **Smoke**: 3/3 por jogo no shell do OS.

## Se GO
Promover pelo fluxo padrão de promoção (ref pinada imutável + permalink), comentar GO em AID-263 e fechá-la
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `cace0516-f702-4eb0-9dfb-aad0820bf77f` finished with status `succeeded` at 2026-08-28T23:16:43.243Z.
- Contexto obtido. AID-288: QA independente do candidato reconciliado `afd6789` (branch `aid-275/hud-min-width-reconciled` = ec265fa → 345d2bf → 687df55 → 5818bb3 → afd6789) e GO/NO-GO de promoção das 4 superfícies do piloto. Vou localizar o repo, a branch e a suíte AID-268.

Branch confirmada: `aid-275/hud-min-width-reconciled` @ `afd6789e` com a cadeia exata anunciada. Vou ler a suíte AID-268 e o veredito anterior para planejar os charters.

Tenho o contexto completo. Plano de charters risk-based para o candidato `afd6789`:

- **C1 Provenança**: diff `ec265fa → afd6789e`, worktree QA independente (sem tocar repo/learner).
- **C2 F2**: warehouse vitest 20/20 + `attempt_id` no envelope + catalog-wide vitest.
- **C3 F1**: HUD ≥768px sem overflow (768/854/1280 + 320) nos 3 jogos voxel.
- **C4 Design P0**: matriz AID-268 (lang/aria/44px/reduced-motion/viewports).
- **C5 Regressão**: smoke Playwright por jogo + pixelDojo + lint/typecheck/build.
- **C6 Jornada host** (iframe OS) se cabível localmente.

Worktree QA independente criado. Agora C1 (provenança) e setup de dependências.

C1 ✓ (diff só em `engines/` + 1 doc de contrato; `min-width:0` presente em `#stage`). Ag
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `cace0516-f702-4eb0-9dfb-aad0820bf77f` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-08-28T23:16:25.229305+00:00

**GO para a promoção das 4 superfícies do piloto na revisão `afd6789e` — F1 (P1) e F2 (P2) do AID-268 não reproduzem, design P0 do AID-263 verificado, zero regressões. Veredito completo: `_work-products/AID-288/QA-VERDICT.md` (+ `qa/`, `scripts/`, logs).**

**Resultado por charter (worktree QA independente detached em `afd6789e`; repo/learner não tocados; node 24.18.0, pnpm 9.15.9, Playwright 1.61.1):**

- **C1 Provenança**: cadeia `ec265fa → 345d2bf → 687df55 → 5818bb3 → afd6789` conferida (5818bb3 ancestral); diff = 22 arquivos, 21 em `engines/` + `docs/design/teaching-game-contract.md`; nada em `curriculum/`/`learner/`/`.mavis/`.
- **C2 F2 (attempt_id)**: warehouse vitest **20/20** (era 18/20); catalog-wide `vitest` **exit 0, 16/16 pacotes, 319 testes**; e **prova runtime em browser** (drive real do jogo): `EVIDENCE` do console com `attempt_id: "kv-warehouse-L1-attempt-1"`.
- **C3 F1 (HUD ≥768px)**: **não reproduz** — HUD 340/360px estável em 768/854/1280 com `scrollWidth == innerWidth`; 320px empilhado sem scroll; **iframe 854px estilo host OS**: botões integralmente visíveis (`btnRight ≤ 802 < 854`) nos 3 jogos (baseline AID-268: `hudW 33`, `scrollW 1313`).
- **C4 Design P0**: lang pt-BR; `role=status` + `live=polite` + **`aria-atomic=true`** (687df55 verificado em HUD e projeção acessível); botões ≥44px (0 violações); reduced-motion `animation:none`/`transition:0s`; contraste AA **30/30 pares** nos tokens `--vd-*`.
- **C5 Regressão**: voxelDojo lint ✓ (205 arquivos), typecheck ✓ (16), build ✓ exit 0, smoke Playwright **3/3 em cada jogo** (9/9); pixelDojo 113/113 + lint + tsc + build + smoke 1/1 ✓.
- **C6 Host**: geometria do iframe provada localmente com os `dist` construídos (candidato não está deployado).

**Limitações**: sem leitor de tela real (evidência estrutural; AID-264 segue pendente); host OS real e artefato deployado devem ser verificados pós-promoção no fluxo AID-253/254 (padrão AID-270); zoom 400% ≈ 320px.

**Disposição**: QA concluída com **GO** — promoção (pin → deploy → verificação pós-promoção) segue com o produtor/board via AID-253/254; recomendo o board resolver a interação `8c3391f0` como `adopt-aid263`. Nota operacional: checkout de AID-275 segue travado no run `39f4e30f` (dono do unblock: harness/CEO) — não afeta este veredito.

---

