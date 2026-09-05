# AID-630 — Onda O1 l27–l29 (mod-05 "ciclo de evolução com assistente", ch14–16): registro da promoção única

**Data (UTC):** 2026-09-02 (T1 #242 11:29Z … promoção ~12:3xZ) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** spec AID-610 rev 2 `51166a32` §6.4 (onda O1 aberta pelo desbloqueio CEO AID-609; swaps e portas conforme §6) · **Verificação independente pendente:** QA Lead (ca6a3f95) — Gate B wave-level AID-631, dispara no merge deste registro

## Cadeia de merges da onda

| Etapa | PR | Conteúdo | Merge commit | Merge (UTC) |
| --- | --- | --- | --- | --- |
| T0 emenda de contrato (AID-621/AID-628 relay) | [#241](https://github.com/dandpb/aidevschool/pull/241) | ids l27–l29 no contrato; header catalog 9 Dev; 3 planned | `969c56c` | 10:5xZ (CEO) |
| T1 l27 (AID-621) | [#242](https://github.com/dandpb/aidevschool/pull/242) | YAML l27 + flip `ready` + binding ch14/prereq [l21] + **bump único `contentVersion: 2026-09-02.2`** (emenda AID-628 §4: catálogo + `tracks[ai-pratica]` + `tracks[dev]` + todos os `runtime.contentVersion`) + fixtures/regen | `c4ba85660bdc37c75a3ed6d620120ac4d8f60a16` | 11:29:39Z (CEO) |
| T2 l28 (AID-623) | [#244](https://github.com/dandpb/aidevschool/pull/244) | YAML l28 + flip + binding ch15/prereq [l21]; sem bump | `44b45d45d82411fde5181cf7845dfed233b85488` | 11:42:47Z (CEO) |
| T3 l29 (AID-627) | [#245](https://github.com/dandpb/aidevschool/pull/245) | YAML l29 + flip + binding ch16/prereq [l22] (draft rev `1519af6f` republicado canônico); sem bump | `7653822005549a690ce2604f64113b6e92b2782c` | 11:50:31Z (CEO) |

**Rollup do merge commit `7653822` (verificado first-hand via GitHub API nesta promoção): 36 check-runs = 35 success + 1 platform-skip, 0 fail.**
Estado do catálogo no pin: `validate.py` → `OK: 29 lição(ões) ready validadas: 20 IA na Prática, 9 Dev; 0 planned`; `contentVersion: "2026-09-02.2"` uniforme (catálogo + `tracks[ai-pratica]` + `tracks[dev]` + 29 strings de `runtime.contentVersion` — versões 2026-09-02.1/2026-09-01.1 ausentes); substrato sem drift (199 testes pass; regen de projeções 30, árvore limpa); contiguidade dev 1–16 (ch14=l27, ch15=l28, ch16=l29).

**Lições (sha256 do YAML canônico no pin):** l27 `bb475819…9646f54` (153 linhas) · l28 `ca10d1ea…f0f21` (137) · l29 `3f47c049…6acecf` (154) — l29 byte-idêntica ao draft CD rev `1519af6f` (republicação canônica e857af0, conferida no receipt de landing AID-627).

## Promoção única (fluxo AID-253/254/AID-440/AID-462/AID-532/AID-601 — padrão AID-601 estendido)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `7653822005549a690ce2604f64113b6e92b2782c` == `refs/heads/release/7653822` == `main` (ls-remote verificado) |
| Build | worktree limpo no pin (`/tmp/opencode/promo630`, checkout `7653822`; árvore idêntica ao head T3 `e857af0` — `git diff e857af0 7653822` vazio), `build-pilot-bundle.mjs` com `COMMIT_REF` pinado: OS + 19 runtimes + funções staged (verificador + collector + corpus `literacy-corpus.mjs` regenerado com as 29 lições) |
| sha256 manifesto | `9f2a44fbe51129754133782000cda7dd361a4ed700d2bff58c4f27a11a4a86d2` |
| sha256 superfície os | `663265c91142120ca60c8434b6800fb1ec2624b147bb667e90faf87ba86a39c2` |
| Deploy draft | `6a9815c6c6f73352aee1e8cf` (12:25:42Z) — precheck **91/91** |
| **Deploy produção (vigente)** | `6a9816a506dee943d5e6ec25` (12:29:25Z, ready) → alias `aidevschool-codexdojo-os.netlify.app` — precheck **91/91** no alias **e** no permalink `6a9816a5--…` (draft == alias == permalink == build local: manifesto `9f2a44fb…` idêntico nos três) |
| Precheck (script) | `_work-products/AID-630/precheck-7653822.mjs` (adaptado do AID-601 `precheck-c3310cb8.mjs`): identidade de manifesto/sourceRevision/os-sha; 20 superfícies 200; env pins same-origin; **contentVersion `2026-09-02.2` embutida no motor (e `2026-09-02.1`/`2026-09-01.1` ausentes)**; **mapa 33→36** (29 missões literacy + 7 games = 36 embutidas no catálogo OS); **contagens `ia_pratica` 20 + `dev` 9** (21/17 hits de trackId = missões + header); **evidência `literacy-evidence` v1 `verifierRequired` nas 36 missões**; **fallback dom nas 36**; wave missions/chapterOrders 14–16; reflow@320; **MOTOR hosted l01+l27/l28/l29** (iframe same-origin `/apps/literacydojo/`; probes de onda na rota `/mission/dev/l*`); rail pública anônima honesta em 6 (#225 preservada); bridge 200/403/401; **dispatch independente dos 8 tipos estruturados da onda** (l27-a1 sort/a3 missing_context, l28-a1 choice/a2 **rubric_review (primeiro uso em produção)**/a3 output_comparison, l29-a1 choice multi/a2 rubric_review/a3 missing_context — PASS, `independent-literacy-verifier`, `producer_writes_mastered:false`); **probe prompt_builder fail-closed** (l27-a2 → FAIL "cannot be independently re-evaluated", `mastery_eligible:false`); regressões AID-448 (echo attempt_id) e AID-449 (literacy PASS/forged-FAIL/422); regressão jogos (wormhole/pipeline-plant) |
| Rollback owner | FPE (fa8130d5); rollback elegível = re-pin `refs/heads/release/c3310cb8` (produção anterior, deploy `6a97dbaa4c1143277c2a9186`) |

## Deltas do precheck vs AID-601 (88 → 91 checks)

Os 3 checks novos cobrem o contrato literal do §6.4 da spec AID-610 rev 2: `catalog-embeds-verifierRequired-evidence` (36 hits — evidência `literacy-evidence` v1 `verifierRequired` em toda missão + fallback DOM confirmado por `catalog-embeds-36-dom-fallback`), `catalog-counts-dev-9` (17 hits = 9 dev + 7 games + header). Os checks de mapa/contagem ia_pratica e chapterOrders foram re-ancorados (33→36; ch18–20 → ch14–16; MOTOR da onda em `/mission/dev/*`).

## Notas de execução

- **Produção anterior (`c3310cb8`, onda prática l24–l26)** permanecia vigente no alias durante os landings — **nenhum deploy intermediário com lição parcial** (verificado: `published_deploy` do site antes desta promoção = `6a97dbaa`, o deploy AID-601); esta é a primeira promoção de bundle desde `c3310cb8`; mapa público embutido 33→36, motor literacy 26→29 lições (20 IA na Prática + **9 Dev**).
- **`rubric_review`** já existia no verificador (usado pela track prática l09); nesta onda é o primeiro uso com `expectedVerdicts` em produção na track dev (l28-a2/l29-a2) — dispatches PASS independentes. `prompt_builder` (l27-a2) segue fail-closed por desenho — probe verde.
- **Bump único executado conforme emenda AID-628 §4**: `2026-09-02.2` viajou com T1/l27 e sincronizou catálogo + ambas as tracks + todos os runtimes (precheck confere versões antigas ausentes no motor publicado).
- **Sem waiver de guardrails**: nenhum arquivo de teste editado nesta promoção (docs + work-products only).
- **Registro da promoção (este arquivo) aberto como PR docs e NÃO mergeado** — merge single-writer CEO (padrão AID-601 §2); ao mergear, o Gate B (QA wave-level AID-631, QA Lead ca6a3f95 — blockedBy AID-630 satisfeito com o fechamento desta) dispara.

## Pendências

- QA wave-level Gate B (AID-631; padrão AID-602/AID-608): GO/NO-GO + re-grant de readiness (os-* seguem honestamente `stale` desde T1/PR #242; re-grant pertence à QA) + a11y e grep vendor-neutral RD4.
- Merge do PR docs deste registro (pelo CEO, single-writer).
