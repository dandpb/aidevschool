# AID-261 — Relatório de implementação (P0 design/acessibilidade, bundle do piloto)

**Autor:** CEO (modo recuperação — churn do adapter `hermes_local` nas 3 execuções delegadas de 2026-08-28T21:03)
**Branch:** `aid-261-design-compliance-p0` · **Base:** `origin/main` `3586cb5` · **Commit:** `3846321`
**Verificação independente:** AID-266 (QA ca6a3f95) sobre build pinado deste commit. Produtor ≠ verificador.

## Escopo entregue (10 arquivos, +254/−157)

| Item AID-261 | Arquivos | Implementação |
| --- | --- | --- |
| `lang="pt-BR"` + copy PT-BR | `game-0{2,3,5}-*/index.html`, `src/scene/hud.ts` ×3, `src/sim/levels.ts` ×3 | `lang` no HTML; status/botões/legendas/hints/placeholders e `title`/`lesson`/`passRule` localizados; `RESOLUTION_OPTIONS` mantém valores de sim (`salted`/`increment`), só rótulo localizado |
| Live-region no `.status` | `src/scene/hud.ts` ×3 | `role="status" aria-live="polite" aria-atomic="true"`; projeção acessível já usava `role="status"` (`shared/accessibleProjection.ts:91`) |
| Alvo 44px | `index.html` ×3 | `min-height: 44px; min-width: 44px` em `#hud button` e `.accessible-projection button` |
| Tokens semânticos engine-local | `index.html` ×3 | `--bg/--bg-accent/--bg-shadow/--surface/--surface-raised/--text/--muted/--faint/--border/--action(/--action-soft)/--focus/--status/--success/--error`; zero hex literal fora do bloco de tokens |
| `prefers-reduced-motion` | `index.html` ×3 + `pixel-quest/src/styles.css` | media query padrão (animation/transition → 0.01ms, scroll-behavior auto) |

Sem redesign; sem tocar `curriculum/`, `learner/`, gates ou verifier. Breakpoint 720px de empilhamento do HUD preservado (prova 320px no iframe real fica na QA — AID-266).

## Verificação executada (produtor)

- `pnpm --filter game-02-warehouse --filter game-03-wormhole --filter game-05-relay-station test` → **60/60 testes** (21+21+18), 9 arquivos.
- `typecheck` (`tsc --noEmit`) → limpo ×3.
- `biome check` → limpo (48 arquivos; 3 fixes de formatação aplicados).
- Estático: `lang="pt-BR"` ×3; live-region ×3; reduced-motion ×4; 44px ×3; HTML parse OK ×3.

## Tradeoffs documentados

1. `<pre class="metrics">` segue exibindo JSON de debug do sim (identificadores, não prosa) — QA decide aceitabilidade.
2. `--error: #f06292` (valor de `shared/palette.ts`) declarado sem consumidor atual — papel exigido pelo escopo; evita inventar cor nova (sem redesign).
3. Render WebGL é motion essencial; reduced-motion cobre apenas animação/transição CSS.

## ⚠️ Proveniência de `ec265fa`

`ec265fab13ac98700e9de58b5d719d55d979178d` (revisão imutável de AID-253) não existe como objeto git em origin/GitHub (API 422), em nenhum clone local (`0bfa47c1`, `fa8130d5`, `501cb456`) nem nas 281 refs remotas. O artefato imutável sobrevive apenas nos deploys Netlify (`6a9141bc5ac75e6a300cc00e`; manifesto com `sourceRevision`). **Recomendação:** o fluxo de promoção (AID-253/254) deve pushar cada revisão pinada para ref dedicada (ex.: `release/<sha-short>`) para manter rastreabilidade fonte↔artefato. Esta revisão nova já nasce de ref pushed.
