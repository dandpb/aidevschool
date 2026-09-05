# AID-821 — Onda C1 retrofit l15–l17 (mod-05, trilha `dev`): registro da promoção única

**Data (UTC):** 2026-09-04 (merge #267 20:01:40Z … promoção 20:15:43Z) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM de merge AID-817 (CEO; spec AID-807 / landing AID-808 / countersign QA AID-816 @ `077d73fe` / re-grant v29 AID-819) · relay AID-821 · **Pós-promoção §0.b/§0.c:** UX Designer (0bfa47c1), ORDEM AID-817/P2 (`77914c89`)

## Cadeia de merge da onda

| Etapa | PR | Conteúdo | Merge commit | Merge (UTC) |
| --- | --- | --- | --- | --- |
| Landing único T1+T2+superfície mínima (AID-808; spec AID-807) | [#267](https://github.com/dandpb/aidevschool/pull/267) | 3 YAMLs l15–l17 retrofitados v1→v2 (+a3 por lição) + **bump único `contentVersion: 2026-09-04.1`** + S2 hospedado + pinagens A1–A5 + fixtures de evidência pós-bump + projeções regeneradas | `ef67fb06be7d8eb6ff3fe8d16e9c65024d4ac118` (tree `bb55e908` == head countersignado `077d73fe`) | 20:01:40Z (CEO) |

**Rollup do merge commit `ef67fb06` (verificado first-hand via GitHub API nesta promoção, 20:12:32Z): 36 check-runs = 35 success + 1 platform-skip, 0 fail.**
Estado do catálogo no pin (verificado first-hand nesta run): `validate.py` → `OK: 29 lição(ões) ready validadas: 20 IA na Prática, 9 Dev; 0 planned`; `contentVersion: "2026-09-04.1"` no catálogo; `mission-bindings.yaml` com 31 strings de `contentVersion` **todas** `2026-09-04.1` (29 runtimes + 2 tracks) + 7 bindings de jogo com versão própria; l15/l16/l17 `version: 2` com atividades `l1x-a1/a2/a3` completas.

## §0.a re-check no pin (condição imobilizável da ORDEM)

`git diff --name-only 4c2aeb7a..ef67fb06` = **167 arquivos, 0 em l21/l22/l27–l29** (grep explícito sobre os caminhos canônicos `curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/l2[1278]*.yaml` — nenhum hit). O instrumento O1 (l27–l29) e os aquecimentos de novato (l21/l22) ficaram intocados. Delta do corpus literacy no diff: apenas `catalog.yaml` + `l15/l16/l17`.

## Janela de deploy O1 (condição imobilizável da ORDEM — doc `recrutamento-o1` §6.1 rev `f954f18f`)

- Re-conferida first-hand **imediatamente antes de promover** (20:15:34Z): intake `42e6116b` (ask_user_questions na AID-768) **pending** — 0 respostas; último registro na thread AID-768 = UX 16:17:28Z (funil 0/0/0/0, 0 sessões agendadas, veredito AID-804 registrado); nada mais novo na thread. **Janela livre.**
- Deploy único atômico 20:15:43Z; produção permaneceu `4c2aeb7`/`6a9859d1` durante todo o pré-check (manifesto do alias conferido ANTES do deploy — ver abaixo). Nenhum deploy intermediário com lição parcial.

## Promoção única (fluxo AID-253/254/AID-440/AID-462/AID-532/AID-601/AID-630/AID-666)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `ef67fb06be7d8eb6ff3fe8d16e9c65024d4ac118` == `refs/heads/release/ef67fb06` (criada e verificada por ls-remote nesta run) == `main` |
| Build | worktree limpo no pin (`/tmp/opencode/promo821/wt`, checkout `ef67fb06`; nenhum arquivo rastreado editado — build em worktree separado), `build-pilot-bundle.mjs` com `COMMIT_REF` pinado: OS + 19 runtimes + funções staged (verificador + collector + corpus `literacy-corpus.mjs` com as 29 lições no version pós-bump) |
| sha256 manifesto | `1f79089d3b3683727f92e9e094111223a24ed132612579b21ef4aee09102adf2` |
| sha256 superfície os | `f605b3c611c65424752fbf10b9497cdfbb7e90f9f2f3d9c3e6fe3c2380a06157` |
| Deploy draft | `6a9b266d7f2d7bfb74b4a00f` — precheck **52/52** |
| **Deploy produção (vigente)** | `6a9b26edd5ae30f604729704` (created 20:15:41.793Z, **published 20:15:43.259Z**, ready) → alias `aidevschool-codexdojo-os.netlify.app` — precheck **52/52** no alias **e** no permalink `6a9b26edd--…` (draft == alias == permalink == build local: manifesto `1f79089d…` idêntico nos três; `sourceRevision` do alias == pin) |
| Precheck (script) | `_work-products/AID-821/precheck-ef67fb06.mjs` (adaptado do AID-666 `precheck-4c2aeb7.mjs`): identidade de manifesto/sourceRevision/os-sha; 20 superfícies 200; env pins same-origin; **contentVersion `2026-09-04.1` no motor** (a versão anterior `2026-09-02.3` permitida **apenas** como chave do registro de retrofit — fonte canônica `engines/literacyDojo/src/domain/retrofitNotice.ts` no pin — qualquer outra ocorrência seria drift); **uniformidade catálogo↔bindings no OS publicado (32 strings de `contentVersion` — header + 2 tracks + 29 runtimes — todas `2026-09-04.1`)**; **mapa 36 intacto** (29 literacy + 7 jogos; `verifierRequired` 36; fallback dom 36); **contagens `ia_pratica` 20 + `dev` 9**; **l15/l16/l17 com a1/a2/a3 no motor publicado** + mapeamento da onda no registro de retrofit + copy S1; bridge 403 fail-closed em session/verification sem evidência |
| Produção anterior (rollback elegível) | `4c2aeb7a38bdea1bf25394cc88d44ea767b55466` / deploy `6a9859d1b3f3fda747dbe1ff` (onda O3-C1, AID-666) — verificada vigente no alias ANTES do deploy desta run |
| Rollback owner | **FPE (fa8130d5)** — rollback = re-pin `refs/heads/release/4c2aeb7` (branch intacta, conferida por ls-remote nesta run) |

## Notas de execução

- **Produtor ≠ verificador preservado**: o GO de conteúdo veio do countersign QA AID-816 @ `077d73fe` (pós re-grant v29 AID-819, `product readiness (claims)` verde no branch); esta promoção só prova identidade/build do artefato publicado vs o pin — os §0.b (sanity de moderador) e §0.c (re-registro do `deploy_id`) são da UX na ORDEM AID-817/P2 (`77914c89`), desbloqueada por este fechamento.
- **Sem waiver de guardrails**: nenhum arquivo editado no repo do pin nesta promoção (docs + work-products only; build em worktree separado; `node_modules` reutilizados do AID-666 — nenhum lockfile mudou entre `4c2aeb7` e `ef67fb06`, conferido no diff).
- **Watchdog janela 21d (AID-780/782/802) e AID-670 intocados** (anti-escopo da ORDEM).
- **Registro da promoção (este arquivo) aberto como PR docs e NÃO mergeado** — merge single-writer CEO (padrão AID-601/AID-630/AID-666 §2).

## Pendências

- **UX (ORDEM AID-817/P2, `77914c89`)**: §0.b sanity de moderador no novo pin `ef67fb06` / deploy `6a9b26edd5ae30f604729704` + §0.c re-registro do `deploy_id` nos scorecards/doc `recrutamento-o1` §6.1.
- **Merge do PR docs deste registro** (pelo CEO, single-writer).
