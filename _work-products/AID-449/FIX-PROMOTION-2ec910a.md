# AID-449 — Fix landing + promoção: staged bridge verifica `literacy-evidence` (pin `2ec910a`)

**Data (UTC):** 2026-08-31 (merge 07:13Z … promoção ~07:2xZ) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM CEO AID-455/A (issue AID-456) — revisão independente do CEO: **GO** (PR auditado primeira-mão, checks 34✓+1 skip legítimo, diff 11 arquivos +4111/−28, execução independente em worktree: bridge 18/18, drift guard, corpus regenerado byte-idêntico) · **QA pós-promoção:** issue irmã AID-457 (QA Lead ca6a3f95 — producer != verifier)

## Landing (fluxo AID-423/A, AID-428/B, AID-440, AID-454)

| Campo | Valor |
| --- | --- |
| PR | [#208](https://github.com/dandpb/aidevschool/pull/208) `fix(os,gate): staged bridge literacy-evidence verifier + generated corpus (AID-449)` |
| Head guard | `bc9bf2e740babbebd70db961f26bc7b839e89185` (merge pinned ao head; sem squash) |
| Base | `8a6e44cddd4442fc7104d9510443edf958b2539e` == `main` no instante do merge (guard anti-drift) |
| CI no head | 35/35 concluídos — 34✓ + 1 skip legítimo (matriz pixelDojo TS, idêntico ao head do PR #206 já promovido), incl. `product readiness (claims)`; nenhum incompleto/não-sucesso |
| **Merge commit** | **`2ec910a921ac3675f64d6a157a4f91a2d2928628`** (`main` @ 07:13:41Z) |
| Janela de proteção | 07:13:38–07:13:42Z (4s; apenas `require_last_push_approval→false` + `required_approving_review_count→0`; status checks e `enforce_admins` mantidos) |
| Proteção restaurada | byte-idêntica, verificada por API (log: `/paperclip/tmp/aid456/window_208_log.json`, snapshot `prot_before_208.json`) |

## Promoção única (fluxo AID-253/254, AID-440, AID-454)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `2ec910a921ac3675f64d6a157a4f91a2d2928628` == `refs/heads/release/2ec910a` == `main` (ls-remote) |
| Build | worktree limpo no pin (`/paperclip/tmp/aid456/promo`), `build-pilot-bundle.mjs` com `COMMIT_REF` pinado; verificador staged **byte-idêntico** ao canônico (`dojo-verification-bridge.mjs` sha256 `06e839f7fa339e0ab9fd41b22a8194a2f6736bb0af005346e86aa0f87f6bc896`) e **corpus staged byte-idêntico ao canônico** (`_shared/literacy-corpus.mjs` sha256 `b5df8e5166091f6b189b2936cbfc29a7a3c3e73c004b8ba17a19084ef7552449`; regenerado no pin pela ferramenta canônica `validate.py --compile-verifier` — 20 lições OK, byte-idêntico) |
| sha256 manifesto | `0a3a65c69fcadbe4d0cf84e68dbc271a4a39a53412f30b931469ea1c5506c055` |
| sha256 superfície os | `d17742cf66e572c4e70c2ccdbdc7169112ea5a525456cfb496eacf4fa4c03a08` (inalterada vs e7d4221 — as 6 superfícies UI são byte-idênticas; o delta do pin é exatamente o boundary: bridge + corpus) |
| Deploy draft | `6a952a6d99ce0c331976f8b7` — precheck **31/31** |
| **Deploy produção (vigente)** | `6a952acfab35991971bb6699` → alias `aidevschool-codexdojo-os.netlify.app` — precheck **31/31** no alias **e** no permalink (sem divergência; draft == alias == permalink == build local) |
| Precheck (script) | `/paperclip/tmp/aid456/precheck-2ec910a.mjs` (adaptado do AID-454): identidade de manifesto (sha + `sourceRevision` + bytes os), 6 superfícies 200, pins same-origin + pixelDojo imutável, contentVersion `2026-08-31.1`, reflow CSS, MOTOR l01 hosted, mapa **24 missões**, bridge 200/403/401, probes AID-448 (dispatch teaching-game inalterado) + probes AID-449 (abaixo) |
| Rollback owner | FPE (fa8130d5); rollback elegível = re-pin `refs/heads/release/e7d4221` (produção anterior, deploy `6a951b9eb8459ddf9576d3cc`) |

## Probes do fix no deploy promovido (bridge hospedado)

- `fix-literacy-l01-pass-verdict` — **o repro exato do defeito (AID-444/AID-449)**: record hospedado `literacy-evidence` v1 (antes `422 unsupported-schema` no pin e7d4221, rejeição honesta sem veredito hospedado possível) → agora `200` + receipt `verdict=PASS` recomputado de forma independente, `source=independent-literacy-verifier`, `producer_writes_mastered=false`, `max_producer_claim=completed` (contrato canônico preservado; `mastery_eligible` só por PASS independente).
- `fix-literacy-forged-pass-fail-closed` — fail-closed: record com **respostas erradas** e claim produtor forjado (`pass:true`, `score:1.0`) → recomputação corpus-bound → `verdict=FAIL`, `mastery_eligible=false`. Nenhum caminho de falsa aprovação adicionado.
- `bridge-unknown-schema-still-422` — schemas desconhecidos continuam `422 unsupported-schema` (superfície de dispatch inalterada além de literacy).
- `fix-accepts-wormhole-L1-no-attempt-id` / `bridge-accepts-wormhole-L1-echo` / `bridge-accepts-pipeline-plant-L1-echo` — path teaching-game-evidence **inalterado** (fix AID-448 intacto: ausência↔ausência; eco exato quando o id existe).

## Limites respeitados

- Escopo pousado = exatamente o PR #208 revisado (11 arquivos, +4111/−28): verificador literacy de paridade no bridge + corpus gerado pela ferramenta canônica (`_shared/` segue a convenção Netlify de shared-code — empacotado com a função, nunca implantado como função) + guards de drift (CI + deploy abort) + fixtures/matrix. Zero mudança adicional em jogos/bridge/verification/curriculum.
- Branch protection inalterada no estado permanente (janela mínima de 4s com restauração byte-idêntica registrada).
- Nenhum `mastered`, nenhum gate, nenhum texto de instrução/feedback entra no boundary (projeção mínima: id/version/skillIds/activities).
- A UI ('Verificação independente aprovada' nas 20 lições literacy + probe negativo) permanece propriedade da QA pós-landing (AID-457) — não verificada aqui.
