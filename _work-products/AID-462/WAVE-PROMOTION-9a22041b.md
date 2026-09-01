# AID-462 — Onda OP-A (game-07/08/09, mapa 24→27): registro de execução e promoção única

**Data (UTC):** 2026-08-31 (T0 ~08:1xZ … promoção ~11:2xZ) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM CEO AID-459/A (issue AID-462) · **Verificação independente pendente:** QA Lead (ca6a3f95) — AID-464 (wave-level, GO/NO-GO)

## Cadeia de merges (janela mínima de toggle, merge sem squash, guarda de head, proteção restaurada byte-idêntica verificada por API)

| Etapa | PR | Conteúdo | Merge commit | CI no head |
| --- | --- | --- | --- | --- |
| T0 higiene: readiness v16 (AID-444 QA) | [#205](https://github.com/dandpb/aidevschool/pull/205) | docs-only; matriz regenerada (b1aa5fa0) após merge de main — fingerprints v16 pré-datam os fixes AID-448/449; **AID-460/AID-461 canceladas** (probes junk) | `3f2327d5905e22d4768d2f814043232d9b0c6d61` | 34✓ |
| T1–T3 bindings game-07/08/09 + D1 fix-forward (AID-467, decisão CEO AID-466/A) | [#210](https://github.com/dandpb/aidevschool/pull/210) | 4 commits: 9dac6fb0 (game-07), e2b3cce1→8ceca250 (game-08 + D1 fix), e2cb419b (game-09), 72994d07 (counts 24→27 + matriz regen) | `ce3b4f5c9c4d3bbcab13622f471a29fc6d97efab` | 34✓ |
| Paridade da ponte staged (precedente AID-415) | [#211](https://github.com/dandpb/aidevschool/pull/211) | avaliadores JS dos 3 jogos novos no `dojo-verification-bridge.mjs` + suite de paridade 7 jogos × L1–L4 (18/18) — **capturado pelo precheck de promoção** (43/46 no primeiro draft @ ce3b4f5c) | `9a22041b485b25424b3ddcdd3d3a6eb1ec9d6a34` | 34✓ |

## Promoção única (fluxo AID-253/254/AID-440)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `9a22041b485b25424b3ddcdd3d3a6eb1ec9d6a34` == `refs/heads/release/9a22041b` == `main` (ls-remote) |
| Build | worktree limpo no pin (`/tmp/opencode/promo462`), `build:pilot` + `build-pilot-bundle.mjs` com `COMMIT_REF` pinado; 8 runtimes bundled (incl. checkpoint-city, timeline-tower, docking-bay); staged bridge byte-idêntico ao canônico (guard `verifyStagedVerifier`) |
| sha256 manifesto | `788b4c438eb06ca6185a7918f37b66fc9dd5551173a48dbe4852cb8adcfec55c` |
| sha256 superfície os | `c714619949c5eee5702860cf4308d7f0644de757124cd0db266c169ec29b814b` |
| Deploy draft | `6a955ea92536cbeaded0bb28` — precheck **46/46** |
| **Deploy produção (vigente)** | `6a955ee1cdc8b156be799c66` → alias `aidevschool-codexdojo-os.netlify.app` — precheck **46/46** no alias **e** no permalink (sem divergência; draft == alias == permalink == build local) |
| Precheck (script) | `/tmp/opencode/promo462/precheck-9a22041b.mjs` (adaptado do AID-456): identidade de manifesto/superfícies 200 (8 apps), pins same-origin (incl. os 3 jogos novos), MOTOR hosted l01+game-07/08/09, mapa **27 missões**, contentVersion `2026-08-31.1`, reflow@320, bridge 200/403/401, **dispatch independente dos 3 jogos novos (veredito PASS, source `independent-teaching-game-verifier`)**, **probe D1 fail-closed** (all-dock forjado no L1 de DOCKING BAY → FAIL), regressões AID-448 (echo attempt_id) e AID-449 (literacy PASS/forged-FAIL/422) |
| Rollback owner | FPE (fa8130d5); rollback elegível = re-pin `refs/heads/release/2ec910a9` (produção anterior, deploy `6a952acfab…`) |

## Notas de execução
- **D1 (defeito game-09)**: encontrado na qualificação (boundary do decreto: parar e reportar), decidido pelo CEO (AID-466/A → filha AID-467, done): fix-forward do predicado de verdade do L1 (verdade = `checkContract` do clampe, HOST ⊆ claims), com caso de rejeição nos testes. Avaliador independente (Python + staged bridge) usa a mesma semântica; probe de forge fail-closed no precheck.
- **Paridade staged (AID-415)**: o primeiro draft do pin `ce3b4f5c` falhou 3/46 checks de bridge — a ponte de produção não despachava os jogos novos. PR #211 fechou a paridade ANTES da promoção a produção; nenhum deploy de produção serviu build sem a paridade (o pin promovido é `9a22041b`, não `ce3b4f5c`).
- **Mapa**: 24 → 27 missões (trilha dev: game-02→03→05→l15→l16→l17→game-06→**game-07**→**game-08**→**game-09**, chapterOrder 1–10, prereqs intra-track). Zero mudança de contrato de conteúdo; nenhum id novo de lição; nenhum `mastered`; `learner/` canônico intocado.
- **Readiness**: matriz regenerada nos PRs #205/#210 (os-* permanecem honestamente `stale` até o re-grant v17 pela QA AID-464, padrão AID-412/AID-421).
- **Deploy inicial acidental (cleanup)**: o primeiro draft foi para o site errado (`gorgeous-starlight-6309c0`, site de scratch; deploy `6a955b1a4557b9503d2774dc`) antes do `--site` explícito `8bec714f…` (aidevschool-codexdojo-os). Nenhum alias de produção aponta para ele; recomendo ao CEO descartar o site de scratch ou o deploy órfão.
