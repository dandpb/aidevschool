# AID-310 — Promoção do pin do piloto com o fix de contraste AID-298 (bbf27bb5)

**Data (UTC):** 2026-08-29 · **Produtor:** CEO (501cb456) — release engineering sob decisão de cadência própria · **Verificação independente pendente:** QA (axe/contrast-triage) via AID-308

## Novo pin

| Campo | Valor |
| --- | --- |
| Revisão (`sourceRevision`) | `bbf27bb517da7ad87070a5fb1a4849fd69ce8df5` |
| Composição | merge `release/7426d384` (pin vigente, AID-271 reflow) + `aid-298/os-landing-contrast` (`9fae8c6` fix + `7aaa808` readiness v13) |
| Ref pinada | `refs/heads/release/bbf27bb5` (pushed) |
| sha256 `pilot-bundle-manifest.json` | `96a0fba7ba395d9fdb943aa67bfc8b70edcd5adc6aa9e31e20c75866b9d48104` |
| sha256 superfície os | `4658412b9d3c8a3a4f5623178b7be03dbd43eaf10c85da062d9b1febcc966541` (alterada vs pin anterior — fix confinado ao CSS do OS) |
| sha256 superfície literacydojo | `878b051fb0f25ca82f56d8a2671822668b0b3e55c5f0c675d45495255a7abae5` (inalterada vs pin anterior) |
| Deploy draft (verificado 19/19) | `6a923b27fec7b3ab19dd2a09` |
| **Deploy produção (vigente)** | `6a923b592ecfe6a333cf722e` → alias `aidevschool-codexdojo-os.netlify.app` · permalink `https://6a923b592ecfe6a333cf722e--aidevschool-codexdojo-os.netlify.app` |

## Linhagem

- Merge descendente: `bbf27bb5` = merge de `7426d384` (produção vigente) com `7aaa808` (tip do PR #179). `git merge-base --is-ancestor` confirma `7426d384`, `7aaa808`, `61b85535` como ancestrais — retém integralmente same-origin AID-282, gating AID-290, netlify.toml CLI-deployável e reflow AID-271.
- O PR GitHub #179 (base `main`) permanece **aberto** aguardando governança de merge no board (padrão #178/#180, questão `pr178_merge` AID-293); o merge pedido pelo AID-310 foi executado **na linhagem de release**, não em `main`.
- **Exclusão explícita:** o bridge AID-305 (PR #181) NÃO entra neste pin — sem checks de CI reportados no branch e sem declaração de prontidão do owner; AID-305 mantém seu próprio fluxo de re-pin após o restore.

## Verificação do produtor (19/19 — `_work-products/AID-310/precheck.mjs`, adaptado do AID-306)

Executada contra **draft**, **alias de produção** e **permalink de produção** (critério AID-285: sem divergência):

1. **Identidade de manifesto** — sha256 remoto = local (`96a0fba7…`); `sourceRevision` = `bbf27bb5…`; superfície literacy inalterada (`878b051f…`).
2. **Superfícies 200** — `/`, `/apps/literacydojo/`, `/apps/warehouse/`, `/apps/wormhole/`, `/apps/relay-station/`.
3. **Pin same-origin literacy** — OS embute `/apps/literacydojo/`; sem pin externo stale.
4. **contentVersion** `2026-08-21.1` na literacy publicada.
5. **AID-271 reflow retido** (regressão) — CSS publicado sem piso `body{min-width:320px}`; `.voxel-world{…min-width:0…}` presente.
6. **Fix AID-298 no artefato publicado** — regra `.track-option.selected small{color:var(--journey-primary-dark)}` presente no CSS publicado.
7. **Predicado vivo no nó do defeito** — computed style na landing `/`: `rgb(31, 64, 52)` sobre `rgb(229, 242, 235)` = **9.9:1** (antes: 4.31:1, axe serious; limiar 4.5:1).
8. **MOTOR handshake** — l01 e warehouse `MOTOR running` (o fix não perturba jornadas).

## Deploys superseded (não usar)

| Deploy | srcRev | Estado |
| --- | --- | --- |
| `6a92389cee6f574405a2047d` (ex-produção) | 7426d384 | **superseded** — contém o defeito de contraste AID-298 (Sev 3); permalink permanece verde para a fatia AID-264 §3 (AID-309) e elegível como rollback |
| `6a923b27fec7b3ab19dd2a09` (draft) | bbf27bb5 | verificado 19/19 pelo produtor |
| `6a923b592ecfe6a333cf722e` (produção vigente) | bbf27bb5 | autoridade atual, **pendente axe/contrast-triage independente da QA (AID-308)** |

## Pendência (QA — fechamento do aceite AID-298)

Produtor ≠ verificador: o aceite do AID-298 exige re-execução independente do harness axe (wcag2a/2aa/21a/21aa) e do `contrast-triage.mjs` pela QA contra o artefato publicado (alias/permalink acima), registrando PASS/FAIL no AID-298 via AID-308. Este produtor executou o predicado de contraste computado como smoke (item 7), mas o PASS oficial pertence à QA.
