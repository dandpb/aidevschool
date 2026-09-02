# AID-601 — Onda O2 l24–l26 (mod-07 "IA além do texto", ch18–20): registro da promoção única

**Data (UTC):** 2026-09-02 (T0 #235 ~05:07Z … promoção ~08:3xZ) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM CEO AID-600/A via issue AID-601 (protocolo AID-577 comentário `41d996c2` §5, gatilho 3×`ready` confirmado first-hand pelo CEO em origin/main @ `c3310cb`) · **Verificação independente pendente:** QA Lead (ca6a3f95) — Gate B wave-level, dispara no merge deste registro

## Cadeia de merges da onda

| Etapa | PR | Conteúdo | Merge commit | CI no head |
| --- | --- | --- | --- | --- |
| T0 emenda de contrato (AID-581) | [#235](https://github.com/dandpb/aidevschool/pull/235) | ids l24–l26 + mod-07 no contrato; header catalog; 2 fixtures de contrato (desvios aceitos CEO AID-585) | `9bceddb1e2aaee7bc953142f777246d1e05c0fee` | verde (merged pelo CEO 05:07Z) |
| T1 l24 (AID-593) | [#236](https://github.com/dandpb/aidevschool/pull/236) | YAML l24 + flip `ready` + binding ch18/prereq [l18] + **bump único `contentVersion: 2026-09-02.1`** + fixtures/regen | `4fb35c8` | verde |
| T2 l25 (AID-592) | [#237](https://github.com/dandpb/aidevschool/pull/237) | YAML l25 + flip + binding ch19/prereq [l12]; sem bump | `dfd6162` | verde |
| T3 l26 (AID-591) | [#238](https://github.com/dandpb/aidevschool/pull/238) | YAML l26 + flip + binding ch20/prereq [l20]; sem bump | `c3310cb8bb20cda236e84e823dfd25c0d7981979` | 36/36 (35✓ + 1 platform-skip) |

**Rollup do merge commit `c3310cb` (verificado first-hand via GitHub API nesta promoção): 35 success + 1 skipped, 0 fail.**
Estado do catálogo no pin: `validate.py` → `OK: 26 lição(ões) ready validadas: 20 IA na Prática, 6 Dev; 0 planned`; `contentVersion: "2026-09-02.1"` (catálogo + `tracks[ai-pratica]` + 27 strings de binding; `tracks[dev]` segue `2026-09-01.1` — fora da onda).

**Lições (sha256 do YAML canônico no pin):** l24 `c4935004…b2c00` (154 linhas) · l25 `b48fb7de…d6366` (150) · l26 `d80279a8…97c13` (139) — todas byte-idênticas aos drafts CD (AID-582 `436f41b`-era / AID-583 / AID-584), conferidas nos receipts de landing.

## Promoção única (fluxo AID-253/254/AID-440/AID-462/AID-532)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `c3310cb8bb20cda236e84e823dfd25c0d7981979` == `refs/heads/release/c3310cb8` == `main` (ls-remote verificado) |
| Build | worktree limpo no pin (`/tmp/opencode/promo601`, checkout `c3310cb`; árvore idêntica ao head T3 `fb61fbe` — `git diff fb61fbe c3310cb` vazio), `build-pilot-bundle.mjs` com `COMMIT_REF` pinado: OS + 19 runtimes + funções staged (verificador + collector + corpus `literacy-corpus.mjs` regenerado no T3) |
| sha256 manifesto | `6d187275a2383f50d79ffba47574927c7780699ff4f5759b87fe7d3f054c8304` |
| sha256 superfície os | `271a9238ff60286edcbf92ea386a9fe056b77497268293f44d33bdf81b7722aa` |
| Deploy draft | `6a97db6b755b7b83b8c418cf` — precheck **88/88** |
| **Deploy produção (vigente)** | `6a97dbaa4c1143277c2a9186` → alias `aidevschool-codexdojo-os.netlify.app` — precheck **88/88** no alias **e** no permalink (draft == alias == permalink == build local: manifesto `6d187275…` idêntico nos três) |
| Precheck (script) | `_work-products/AID-601/precheck-c3310cb8.mjs` (adaptado do AID-532): identidade de manifesto/sourceRevision/os-sha; 20 superfícies 200; env pins same-origin; **contentVersion `2026-09-02.1` embutida no motor (e `2026-09-01.1` ausente)**; **mapa 30→33** (26 missões literacy + 7 games = 33 embutidas no catálogo OS); **contagem `ia_pratica` 20** (20 missões + header da track); wave missions/chapterOrders presentes; reflow@320; **MOTOR hosted l01+l24/l25/l26** (iframe same-origin); rail pública anônima honesta em 6 (#225 preservada); bridge 200/403/401; **dispatch independente dos 8 tipos estruturados da onda** (l24-a1 choice/a3 missing_context, l25-a1 safety_classification/a2/a3, l26-a1 output_comparison/a2/a3 sort — PASS, `independent-literacy-verifier`, `producer_writes_mastered:false`); **probe prompt_builder fail-closed** (l24-a2 → FAIL "cannot be independently re-evaluated", `mastery_eligible:false`); regressões AID-448 (echo attempt_id) e AID-449 (literacy PASS/forged-FAIL/422); regressão jogos (wormhole/pipeline-plant) |
| Rollback owner | FPE (fa8130d5); rollback elegível = re-pin `refs/heads/release/aa4d6c5` (produção anterior, deploy `6a9736375e5071a0cf458828`) |

## Deltas do precheck vs AID-532 (84 → 88 checks)

Os 4 checks novos cobrem o contrato literal do Gate A (AID-577 `41d996c2` §5): `catalog-embeds-26-literacy-evidence` (contagem dupla do mapa), `catalog-counts-ia-pratica-20`, `wave-missions-present` (l24/l25/l26 com unitId próprio), `wave-chapterOrders-18-20`.

## Notas de execução

- **Produção anterior (`aa4d6c5`, onda dev l21–l23)** permanecia vigente no alias durante os re-grants de readiness (#231–#233, docs-only) — esta é a primeira promoção de bundle desde `aa4d6c5`; mapa público embutido 30→33, motor literacy 23→26 lições (17→20 IA na Prática + 6 Dev).
- **`output_comparison` e `sort`** já existiam no verificador (usados pela onda dev l22); nesta onda são o primeiro uso em produção na track ai-pratica (l26). `prompt_builder` (l24-a2) segue fail-closed por desenho — probe verde.
- **Sem waiver de guardrails**: nenhum arquivo de teste editado nesta promoção (docs + work-products + runbook only).
- **Registro da promoção (este arquivo) aberto como PR docs e NÃO mergeado** — merge single-writer CEO (AID-601 §2); ao mergear, o Gate B (QA wave-level, QA Lead ca6a3f95) dispara.

## Pendências

- QA wave-level Gate B (padrão AID-478/AID-533): GO/NO-GO + re-grant de readiness (os-* seguem honestamente `stale` desde T1; re-grant pertence à QA — mesmo transitório dos precedentes).
- Merge do PR docs deste registro (pelo CEO, single-writer).
