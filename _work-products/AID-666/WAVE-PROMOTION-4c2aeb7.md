# AID-666 — Onda O3-C1 retrofit l01–l07 (mod-01/mod-02, trilha `ia_pratica`): registro da promoção única

**Data (UTC):** 2026-09-02 (merge #248 16:47Z … promoção 17:16Z) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** spec AID-644 rev 2 `4acfe250` §5.6 (dispatch do SD AID-664; padrão AID-630) · **Verificação independente pendente:** QA Lead (ca6a3f95) — Gate wave-level §5.7 AID-657 (complemento AID-667), dispara sobre esta promoção

## Cadeia de merge da onda

| Etapa | PR | Conteúdo | Merge commit | Merge (UTC) |
| --- | --- | --- | --- | --- |
| Landing único T1+T2+superfície mínima (AID-654; autorias AID-648/AID-649; relays AID-652 cancelada/AID-653) | [#248](https://github.com/dandpb/aidevschool/pull/248) | 7 YAMLs l01–l07 retrofitados (13 atividades novas, R1.1 append-only) + **bump único `contentVersion: 2026-09-02.3`** + S1/S2 + item D + flag idempotente + pinagens A1–A6 + projeções regeneradas | `4c2aeb7a38bdea1bf25394cc88d44ea767b55466` | 16:47:22Z (CEO) |

**Rollup do merge commit `4c2aeb7` (verificado first-hand via GitHub API nesta promoção): 36 check-runs = 35 success + 1 platform-skip, 0 fail.**
Estado do catálogo no pin (verificado first-hand nesta run): `validate.py` → `OK: 29 lição(ões) ready validadas: 20 IA na Prática, 9 Dev; 0 planned`; `contentVersion: "2026-09-02.3"` no catálogo; `mission-bindings.yaml` com 31 strings de `contentVersion` **todas** `2026-09-02.3` (29 runtimes + 2 tracks — desvio #1 divulgado no receipt AID-654: o validador canônico `mission_catalog_bindings.py` exige versão canônica em TODAS as missões literacyDojo). Correlação spec: `l01-a2` sort · `l01-a3`/`l04-a3` missing_context · `l02-a2`/`l05-a2`(multi)/`l06-a3`(multi)/`l07-a2` choice · `l02-a3` sort · `l03-a3`/`l05-a3` output_comparison · `l04-a2`/`l06-a2`/`l07-a3` prompt_builder — 13/13 conforme tabela final §2.8; versões v2/v4/v2/v2/v3/v2/v2.

## Promoção única (fluxo AID-253/254/AID-440/AID-462/AID-532/AID-601/AID-630 — padrão AID-630 estendido)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `4c2aeb7a38bdea1bf25394cc88d44ea767b55466` == `refs/heads/release/4c2aeb7` == `main` (ls-remote verificado) |
| Build | worktree limpo no pin (`/tmp/opencode/promo666`, checkout `4c2aeb7`; árvore limpa — apenas node_modules não rastreados), `build-pilot-bundle.mjs` com `COMMIT_REF` pinado: OS + 19 runtimes + funções staged (verificador + collector + corpus `literacy-corpus.mjs` regenerado com as 29 lições no version pós-bump) |
| sha256 manifesto | `c4a1e9b4a223a3bb85d8ab8f2a630e5f7ed72ba4eda0d6406a4f8dc7d4c772ac` |
| sha256 superfície os | `9ed2fb4223f88dde675c45282d1a3dffe4b7665e823bece2b56989d5be48e9bb` |
| Deploy draft | `6a9858ddb119d1977959d766` (17:11:57Z) — precheck **129/129** |
| **Deploy produção (vigente)** | `6a9859d1b3f3fda747dbe1ff` (created 17:16:01Z, published 17:16:03Z, ready) → alias `aidevschool-codexdojo-os.netlify.app` — precheck **129/129** no alias **e** no permalink `6a9859d1--…` (draft == alias == permalink == build local: manifesto `c4a1e9b4…` idêntico nos três; `sourceRevision` do alias == pin) |
| Precheck (script) | `_work-products/AID-666/precheck-4c2aeb7.mjs` (adaptado do AID-630 `precheck-7653822.mjs`): identidade de manifesto/sourceRevision/os-sha; 20 superfícies 200; env pins same-origin; **contentVersion `2026-09-02.3` no motor (e `2026-09-02.2`/`.1`/`2026-09-01.1` ausentes)**; **uniformidade catálogo↔bindings no OS publicado (32 strings de `contentVersion` embutidas — header do catálogo + 2 tracks + 29 runtimes — todas `2026-09-02.3`)**; **mapa 36 intacto** (29 literacy + 7 games; `verifierRequired` 36; fallback dom 36); **contagens `ia_pratica` 20 + `dev` 9**; **13 ids de atividades novas embutidos + a1/a2/a3 nas 7 lições**; **copy S1/S2 + item D embarcada**; **MOTOR hosted l01–l07** (iframe same-origin `/apps/literacydojo/`, rota `/mission/ai-pratica/l*`) + regressão l27; rail pública anônima honesta em 6 (#225 preservada); **S1/S2 render E2E** (learner returning com l01 `completed` sob `2026-09-02.2` semeado no IndexedDB → migração força revisão devida → S1 no card do Home, S2 na intro, ack estruturado `literacydojo:retrofit-acks` = `{l01:2026-09-02.3}`, S2 idempotente 1×/bump na reentrada, item D plural na intro de revisão, **contador `ATIVIDADE 1 DE 3`** na sessão); **S2 hospedado dentro do iframe do motor + sessão hosted com 3 atividades**; bridge 200/403/401; **dispatch independente dos 10 tipos re-avaliáveis da onda** (sort/choice/missing_context/output_comparison — PASS, `independent-literacy-verifier`, `producer_writes_mastered:false`); **3 probes prompt_builder fail-closed** (l04-a2/l06-a2/l07-a3 → FAIL "cannot be independently re-evaluated", `mastery_eligible:false`); regressões AID-448 (echo attempt_id), AID-449 (literacy PASS/forged-FAIL/422) e jogos (wormhole/pipeline-plant) |
| Rollback owner | **FPE (fa8130d5)** — rollback elegível = re-pin `refs/heads/release/7653822` (produção anterior, deploy `6a9816a506dee943d5e6ec25`) |
| Janela (E3) | Deploy único atômico 17:16Z (nenhum deploy intermediário: produção permaneceu `6a9816a5`/pin `7653822` durante todo o pré-check — verificado no manifesto do alias ANTES do deploy). Horário coerente com as duas promoções de onda anteriores (12:29Z/12:16Z); sem funil OP-B não há dado de tráfego real — "baixo tráfego" permanece hipótese (disciplina AID-559), e a proteção efetiva do E3 é a atomicidade: nenhuma lição parcial jamais publicada |

## Deltas do precheck vs AID-630 (91 → 129 checks)

Os 38 checks novos cobrem o contrato literal do §5.6 da spec AID-644 rev 2: uniformidade `contentVersion` catálogo↔bindings no OS publicado (1), presença das 7 missões da onda (1), 13 ids novos + 3-atividades por lição no motor publicado (8), copy S1/S2/item D embarcada (3), MOTOR da onda nas 7 missões `ai-pratica` (12, incl. regressão l27 fora da onda), **S1/S2 render E2E com learner returning semeado + idempotência + ack + item D + sessão de 3 atividades** (6), **S2 hospedado no iframe + sessão hosted 3 atividades** (2), dispatches independentes das 10 atividades re-avaliáveis novas (30 checks = 10×3) e fail-closed dos 3 prompt_builder novos (6). Checks de mapa/contagens re-ancorados para uniformidade `.3` (32 strings).

## Notas de execução

- **Produção anterior (`7653822`, onda O1 l27–l29)** permaneceu vigente no alias até 17:16:03Z — **nenhum deploy intermediário com lição parcial** (primeiro e único deploy de bundle desde a promoção AID-630; mapa público segue 36 missões; motor literacy segue 29 lições — a onda muda a forma de l01–l07, não o mapa).
- **Readiness `os-literacy-guided-mission` segue honestamente `stale`** (sourcePaths tocam `engines/literacyDojo/src/`) — re-grant NÃO é da promoção, é da QA wave-level §5.7 (AID-657/AID-667).
- **Sem waiver de guardrails**: nenhum arquivo editado no repo do pin nesta promoção (docs + work-products only; build em worktree separado).
- **Registro da promoção (este arquivo) aberto como PR docs e NÃO mergeado** — merge single-writer CEO (padrão AID-601/AID-630 §2); ao mergear, o Gate QA wave-level §5.7 (AID-657, QA Lead ca6a3f95 — GO/NO-GO condicionado a esta promoção) executa sobre o bundle `4c2aeb7`.
- Receipt da promoção retransmitido ao SD (bb7b8143) via issue de relay para o close-out §5.8 da AID-644 (boundary: comentário direto na AID-644 bloqueado para o FPE).

## Pendências

- QA wave-level §5.7 (AID-657 + complemento AID-667; padrão AID-602/AID-608): GO/NO-GO sobre a superfície de 7 lições + re-grant de readiness `os-literacy-guided-mission` + a11y + grep vendor-neutral RD4.
- Merge do PR docs deste registro (pelo CEO, single-writer).
- Close-out §5.8 (SD): receipt na AID-644 + reconciliação de gates (padrão AID-607) + abertura da janela 21d (d+1/d+7/d+21 contados desta promoção, 17:16Z).
