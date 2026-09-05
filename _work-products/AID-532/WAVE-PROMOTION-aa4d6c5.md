# AID-532 — Onda dev l21–l23 (mod-05, ch11–13): registro de execução e promoção única

**Data (UTC):** 2026-09-01 (T0 #221 ~20:0xZ … promoção ~20:3xZ) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM CEO AID-527/E (issue AID-532) executada via AID-552 (triagem CEO AID-551/A) · **Verificação independente pendente:** QA Lead (ca6a3f95) — wave-level /F (AID-533), padrão AID-412/AID-444/AID-464

## Cadeia de merges

| Etapa | PR | Conteúdo | Merge commit | CI no head |
| --- | --- | --- | --- | --- |
| T0 emenda §3 (AID-531) | [#221](https://github.com/dandpb/aidevschool/pull/221) | ids l21–l23 + mod-05 dev wave no contrato; header catalog; schema id.description; +2 fixtures de contrato (divulgadas AID-536 c1+c2, comentário `244c2f4c` na AID-531) | `e97d1b3fe58ee4549a5891d324c0bc46cb2096ea` | verde (merged pelo CEO ~13:04 local) |
| update-branch da onda sobre main `e97d1b3` (inclui #223/#225/#226 trilha-dev-publica) | #222 (head novo) | merge `4d02ed3`: conflitos resolvidos para pós-flip; MapScreen/ProgressScreen = versão main (#225/#226 rail pública anônima de 6) verbatim; readiness README = render main (`cli.py render` in-sync) | head `4d02ed367ab4f728bb15ca5bac0d647c9b505489` | **4/4 obrigatórios verdes** (36 checks: 34✓ + 1 skip + 1 falha NÃO-obrigatória — ver waiver) |
| T1–T3 onda l21–l23 + promoção única | [#222](https://github.com/dandpb/aidevschool/pull/222) | 13 arquivos (+1181/−74): 3 YAMLs, flip `ready` 23/0, bindings ch11–13 (prereqs [l16]/[l16]/[l15]), contentVersion `2026-09-01.1` (catálogo + 25 strings), corpus do verificador regenerado, projeções `missions.ts` 27→30, chapter-continuity l21–l23, migration 30, fixtures 23 ready | `aa4d6c5b1552877000a06b2e27b0122ffdc500f3` (merge commit com proveniência ORDEM AID-532/AID-551 + spec `787cebef` + promoção única) | head `4d02ed3` (4/4 ✓) |

**Lições (blob SHA do YAML canônico):** l21 `7d6766cb…` · l22 `831ea9b6…` · l23 `b4dec5e2…` (autoradas no commit `e8449c5`, spec AID-528 rev 2 §2.1–§2.3 literal)

## Promoção única (fluxo AID-253/254/AID-440/AID-462)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `aa4d6c5b1552877000a06b2e27b0122ffdc500f3` == `refs/heads/release/aa4d6c5` == `main` (ls-remote verificado) |
| Build | worktree limpo no pin (`/tmp/opencode/promo462`, checkout `aa4d6c5`), `build-pilot-bundle.mjs` com `COMMIT_REF` pinado: OS + 19 runtimes + funções staged (verificador + collector + corpus `literacy-corpus.mjs` byte-idênticos ao canônico — `verifyStagedVerifier` verde no deploy) |
| sha256 manifesto | `e3c6d5a7d898cba1a3b2299a83dc3288a2a3be89313f9a7a6597aa51ce3f58f8` |
| sha256 superfície os | `0ea3de7ecf2f374538656f5fb46f19b0cc59f3108d97bd74cb806b132dc1c9d4` |
| Deploy draft | `6a973513542f1ca2a98c2215` — precheck **84/84** |
| **Deploy produção (vigente)** | `6a9736375e5071a0cf458828` → alias `aidevschool-codexdojo-os.netlify.app` — precheck **84/84** no alias **e** no permalink (draft == alias == permalink == build local: manifesto `e3c6d5a7…` idêntico nos três) |
| Precheck (script) | `/paperclip/tmp/aid552/precheck-aa4d6c5.mjs` (adaptado do AID-462): identidade de manifesto/sourceRevision/os-sha; 20 superfícies 200 (os + 19 apps); env pins same-origin (`VITE_*_URL=/apps/*` — as strings `127.0.0.1` do bundle são metadados canônicos de binding, não URLs de launch; idênticas ao pin anterior `9a22041b`); contentVersion `2026-09-01.1` embutida no motor (e `2026-08-31.1` ausente); reflow@320; **MOTOR hosted l01+l21/l22/l23** (iframe same-origin); **mapa público anônimo honesto em 6** (#225 preservada) + **catálogo embutido 23 literacy + 7 games = 30**; bridge 200/403/401; **dispatch independente dos 8 novos tipos estruturados da onda** (l21-a2/a3, l22-a1 rubric_review/a2/a3, l23-a1/a2 safety_classification/a3 — PASS, `independent-literacy-verifier`, `producer_writes_mastered:false`); **probe prompt_builder fail-closed** (l21-a1 → FAIL "cannot be independently re-evaluated", `mastery_eligible:false` — honestidade de texto livre); regressões AID-448 (echo attempt_id) e AID-449 (literacy PASS/forged-FAIL/422); regressão jogos (wormhole/pipeline-plant) |
| Rollback owner | FPE (fa8130d5); rollback elegível = re-pin `refs/heads/release/9a22041b` (produção anterior, deploy `6a955ee1cdc8b156be799c66`) |

## contentVersion (critério 3 da AID-536 — consumado no merge)

`2026-09-01.1` (merge-day do #222) no catálogo + `tracks[ai-pratica]` + `tracks[dev]` + 17 `runtime.contentVersion` (25 strings no bindings). Verificado pós-merge em `main@aa4d6c5`: `validate.py` → `OK: 23 lição(ões) ready validadas: 17 IA na Prática, 6 Dev; 0 planned`.

## Waiver documentado — `SDLC guardrails (diff)` (não-obrigatório, vermelho esperado)

O guard (adicionado à CI pelo PR #223) sinaliza **4 arquivos de teste** no diff do #222:
1. `curriculum/ai-literacy/tools/tests/test_content_contract.py` — **pre-divulgado** (AID-536 c1, comentário `244c2f4c` na AID-531; mesmo par do T0 #221/#199): sync mecânico de expectativa (23 ready, 0 planned), zero asserção removida.
2. `curriculum/ai-literacy/tools/tests/test_facade_contract.py` — idem (stdout `OK: 23 … 0 planned`).
3. `engines/codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts` — **não enumerado na ORDEM AID-552** (ela antecipava só o par de fixtures): extensão da suíte para hospedar/completar l21–l23 (handlers `rubric_review`/`safety_classification`, prereq chain l15→l16, setTimeout 180s). Escopo da spec §4.2 ("missão jogável hosted") e divulgado no receipt da AID-532 (comentário `0bd97927`, item 4 da matriz).
4. `engines/codexdojo-os-prototype/src/progress/migration.test.ts` — contagem 27→30 (catálogo da onda), mesma raiz.
Todos os 4 são edição de fixture/teste exigida pelo critério "CI verde" §6.1 da própria spec; `SDLC_ALLOW_TEST_EDIT` NÃO usado (hook é do Claude Code, não wired na CI — verificado AID-536 c2). Auditoria final: QA /F.

## Desvios e notas de execução
- **Main avançou além do previsto pela ORDEM AID-552** (ela citava só #221): #223 (guard SDLC), #225 e #226 (trilha-dev-publica) também caíram antes do update-branch. Resolução: conflitos (MapScreen/ProgressScreen/readiness) resolvidos para a versão main + delta da onda; o diff do #222 colapsou para 13 arquivos de onda.
- **Mapa 27→30 vs. rail pública 6:** a spec §4.3 ("mapa 27→30") data de antes do #225; a oferta pública anônima mostra a rail honesta de 6 (l01–l03 + game-02/03/05 — hardcoded em `studentPath.ts`). O catálogo completo de 30 está no mapa operador/embutido e nas rotas diretas `/mission/dev/l2{1,2,3}` (hosted, precheck MOTOR verde). Nenhuma lição da onda vazou para a rail pública.
- **Defeito pré-existente AID-539** (`test_enforce_rejects_report_narrower_than_published_grants` falha local) reproduzido primeira-mão em `main@e97d1b3` intocado — não é da onda; segue com a QA.
- **Registro da promoção (este arquivo) aberto como PR docs e NÃO mergeado** — limite literal da AID-552 ("nenhum merge além do #222"); merge do registro fica para o CEO/QA pós-veredito.

## Pendências
- QA wave-level /F (AID-533): GO/NO-GO + re-grant de readiness (os-\* seguem honestamente `stale`; padrão AID-412/AID-421/AID-464).
- Merge do PR docs deste registro (pelo CEO, ao fechar a janela de review).
