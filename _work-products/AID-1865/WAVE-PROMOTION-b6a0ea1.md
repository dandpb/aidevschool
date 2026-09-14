# WAVE-PROMOTION AID-1865 — og-visual QW4, 2 superfícies (draft stage record)

**Wave:** AID-1865 (R1 relay PR #414) · **Pin:** `b6a0ea1b7623bc04aa78bb62994161cde37de953`
(merge commit PR #414 == `origin/main` == `release/b6a0ea1`) · **Date:** 2026-09-14 ~15:3xZ ·
**Owner:** FPE (fa8130d5) · **Runbook:** `docs/serving/PROMOTION-RUNBOOK.md` (canônico)

## Escopo do release (delta `00789fe6..b6a0ea1b`)

- PR #414 apenas (static-only): `engines/literacyDojo/{index.html,public/og.png}`,
  `engines/codexdojo-os-prototype/{index.html,public/og.jpg}`, `intent/2026-09-14-og-visual-qw4/`.
- Literacy: `og:image og.png` (61.571 B, 1200×630) + `twitter:card` `summary`→`summary_large_image`.
- OS: primeira tag OG da superfície (`og:image og.jpg`, 57.801 B, 1200×630; antes: wallpaper 1,87 MB).

## Gates §1 do runbook (verificados first-hand nesta run)

| Gate | Estado |
| --- | --- |
| §1.1 QA countersign GO citando o sha a promover | **PENDENTE — child AID-1885 (QA Lead ca6a3f95)** — único gate em falta antes do alias `--prod` |
| §1.2 Merge via PR em main | ✓ PR #414 mergeado como `b6a0ea1b` (reviews R1 registradas: AID-1867 `f278d8d0` / AID-1868 `87b4b8f8` / QA AID-1869 `88f448ad`; espelho no PR: comentário 5666240631) |
| §1.3 CI verde no pin | ✓ `b6a0ea1b`: 41 check-runs = 37 success + 4 skipped, 0 fail (2026-09-14 ~15:3xZ) |
| §1.4 Autorização founder (deploy público) | ✓ despacho AID-1853 item 4 → AID-1858 → AID-1865 ("redeploy QW0 — owner FPE") |

## Build (§3) — worktree limpo, detached no pin

- Worktree `/tmp/opencode/promo1865/wt` @ `b6a0ea1b` (porcelain 0 linhas).
- OS: `COMMIT_REF=b6a0ea1b… VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics node scripts/build-pilot-bundle.mjs`
  → manifest `sourceRevision == b6a0ea1b…` ✓; functions staged byte-idênticas ao canônico (deploy script aborta em drift — passou).
- Literacy: `npm run build` com `VITE_LITERACY_VERIFIER_URL=/.netlify/functions/literacy-verify` +
  `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` espelhados do `netlify.toml` do pin;
  staging com `netlify.toml` byte-idêntico **exceto** a linha `functions` (semântica preservada).

## Deploys draft (§4.1)

| Superfície | Site | Deploy draft | URL |
| --- | --- | --- | --- |
| codexDojo OS | `aidevschool-codexdojo-os` (`8bec714f…`) | `6aa810851c1c3595d078ffd4` | https://6aa810851c1c3595d078ffd4--aidevschool-codexdojo-os.netlify.app |
| LiteracyDojo | `aidevschool-literacydojo` (`ba44d0c6…`, site-ID p/ gotcha §8.1) | `6aa811a4ecd600d4cdb4a748` | https://6aa811a4ecd600d4cdb4a748--aidevschool-literacydojo.netlify.app |

## Precheck (§4.2) — âncora `scripts/precheck/waves/AID-1865-b6a0ea1.json` (72 checks)

- Dry-run: config válida, registry ≡ anchorCheckIds (72).
- **Full run contra os 2 drafts: 72/72 PASS** (incl. byte-equivalence literacy 12/12, coletor
  403 cross-origin, export fail-closed 401/404, smoke ingestão 202 c/ dedup, catálogo uniforme
  `contentVersion 2026-09-10.2` ×35, verificador parity com o live).
- Evidência específica da onda (curl first-hand nos drafts): OS `<meta property="og:image" …/og.jpg>`
  + `og.jpg` 200 (57.801 B); literacy `og:image …/og.png` + `twitter:card summary_large_image` +
  `og.png` 200 (61.571 B); manifest draft `sourceRevision == b6a0ea1b…`.

## Estado

**Alias `--prod` NÃO executado** — aguarda §1.1 (QA countersign GO da onda, child AID-1885).
Zero `--prod` sem o gate (padrão AID-1854/AID-1861). Pós-GO: alias nas 2 superfícies + prova
§5.2 (2× POST dedup, export bearer >0, 401/403, manifest == pin) + receipt final no thread
AID-1865 + curl og:image nos alias live (critério Done da AID-1858).

## Rollback elegível (se §5 falhar)

- Literacy: deploy `6aa805f5c03cb755ea9fbd96` (pin `00789fe6`, branch `release/00789fe` — receipt AID-1854).
- OS: último deploy prod servindo `main@5bf86b97`-class (alias atual) — branch `release/<sha>` intacta.
