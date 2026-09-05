# AID-448 — Fix landing + promoção: receipt identity binds by canonical `attempt_id` echo (pin `e7d4221`)

**Data (UTC):** 2026-08-31 (merge 06:08Z … promoção ~06:5xZ) · **Produtor:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM CEO AID-453/A (issue AID-454) — revisão independente do CEO: **GO** (PR auditado primeira-mão, checks 35/35, diff 8 arquivos +151/−5, enfraquecimento zero do contrato) · **QA pós-promoção:** AID-452 (QA Lead ca6a3f95 — producer != verifier)

## Landing (fluxo AID-423/A, AID-428/B, AID-440)

| Campo | Valor |
| --- | --- |
| PR | [#206](https://github.com/dandpb/aidevschool/pull/206) `fix(os,gate): bind teaching-game receipt identity to canonical attempt_id echo (AID-448)` |
| Head guard | `16b2a2c2e0edf309971be301cbe58d0ac94532d7` (merge pinned ao head; sem squash) |
| Base | `b83f3641929c537b64ba518453f623854607c385` == `main` no instante do merge (guard anti-drift) |
| CI no head | 35/35 concluídos — 34✓ + 1 skip legítimo (matriz pixelDojo TS), incl. `product readiness (claims)`; nenhum incompleto/não-sucesso |
| **Merge commit** | **`e7d42210738dde0a7be0e95eed1ef2d9ccdf1214`** (`main` @ 06:08:15Z) |
| Janela de proteção | 06:08:14–06:08:17Z (3s; apenas `require_last_push_approval→false` + `required_approving_review_count→0`; status checks e `enforce_admins` mantidos) |
| Proteção restaurada | byte-idêntica, verificada por API (log: `/paperclip/tmp/aid454/window_206_log.json`, snapshot `prot_before_206.json`) |

## Promoção única (fluxo AID-253/254, AID-440)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `e7d42210738dde0a7be0e95eed1ef2d9ccdf1214` == `refs/heads/release/e7d4221` == `main` (ls-remote) |
| Build | worktree limpo no pin (`/paperclip/tmp/aid454/promo`), `build-pilot-bundle.mjs` com `COMMIT_REF` pinado; verificador staged **byte-idêntico** ao canônico (`learner/gate/netlify-functions/dojo-verification-bridge.mjs`, sha256 `7a97955781b6db27b78b44ecfaf3c5c94acfa2af82fdad209a7a5258c5776eb8` nos dois lados) |
| sha256 manifesto | `ffd8f82be4799e783342e07fdd32c8787b97a4d795e6eb68630d9d9336473ab7` |
| sha256 superfície os | `d17742cf66e572c4e70c2ccdbdc7169112ea5a525456cfb496eacf6fa4c03a08` |
| Deploy draft | `6a951aedb551c9d97993a8bf` — precheck **24/24** |
| **Deploy produção (vigente)** | `6a951b9eb8459ddf9576d3cc` → alias `aidevschool-codexdojo-os.netlify.app` — precheck **24/24** no alias **e** no permalink (sem divergência; draft == alias == permalink == build local) |
| Precheck (script) | `/paperclip/tmp/aid454/precheck-e7d4221.mjs` (adaptado do AID-440): identidade de manifesto (sha + `sourceRevision` + bytes os), 6 superfícies 200, pins same-origin + pixelDojo imutável, contentVersion `2026-08-31.1`, reflow CSS, MOTOR l01 hosted, mapa **24 missões**, bridge 200/403/401, **probes do fix** (abaixo) |
| Rollback owner | FPE (fa8130d5); rollback elegível = re-pin `refs/heads/release/69bb67a7` (produção anterior, deploy `6a94f023bd87c28fce557045`) |

## Probes do fix no deploy promovido (bridge hospedado)

- `fix-accepts-wormhole-L1-no-attempt-id` — **o repro exato do defeito (AID-444)**: record hospedado não-warehouse **sem** `attempt_id` → `200`, receipt `verdict=PASS` e **sem** `attempt_id` (ausência ↔ ausência). No pin anterior (`69bb67a7`) este payload era rejeitado (`receipt-mismatch`).
- `bridge-accepts-wormhole-L1-echo` / `bridge-accepts-pipeline-plant-L1-echo` — comportamento inalterado: record **com** `attempt_id` não-vazio → `PASS` + eco exato do id.
- A UI ('Verificação independente aprovada' nos 4 jogos + probe negativo) permanece propriedade da QA AID-452 — não verificada aqui.

## Limites respeitados

- Escopo pousado = exatamente o PR #206 revisado (8 arquivos, +151/−5): `receiptContract.ts` (binding `===` estrito preservado — mint/blank/drop continuam rejeitados), `dojo-verification-bridge.mjs` (eco canônico), fixtures + matrix de regressão. Zero mudança adicional em jogos/bridge/verification.
- Branch protection inalterada no estado permanente (janela mínima de 3s com restauração byte-idêntica registrada).
- Nenhum `mastered`, nenhum gate tocado, `learner/` intocado pelo PR.
