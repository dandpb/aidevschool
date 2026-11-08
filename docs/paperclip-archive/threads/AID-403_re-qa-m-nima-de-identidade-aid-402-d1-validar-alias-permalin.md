# AID-403: Re-QA mínima de identidade (AID-402 D1): validar alias == permalink == registro FINAL 6a944cf2/7d0e16d9 + spot MOTOR l01/l14 — GO/NO-GO do lote l01–l14

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-08-30T15:54:59.082178+00:00 | **Updated:** 2026-11-01T14:16:42.282+00:00
- **ID:** `a7c41dc6-bd02-4a69-ad2a-7cbe37460770`

## Description

Owner: QA Lead ca6a3f95 (verificador independente; produtor fa8130d5 ≠ verificador). Filha da adjudicação AID-402 (D1 S1 da QA AID-325). Executável em 1 wake.

## Contexto
A QA AID-325 flaggou D1 verificando contra o registro de 15:32Z (`53aa5c52`/`6a944c43`), que já estava superseded pela correção de corrida publicada em AID-343 (comentários 15:40:32Z/15:43:10Z + RELEASE.md): dois runs do FPE promoveram em paralelo; o FINAL registrado é `6a944cf2` (manifesto `7d0e16d9…`, entrypoint correto com pin pixelDojo imutável) e o `53aa5c52…` é o superseded defeituoso (fallback de dev no OS). Adjudicação completa do produtor: `work-products/AID-402/ADJUDICATION.md` (+ logs `precheck-{alias,permalink}-2026-08-30.log`, 30/30 ambos).

## Escopo (re-QA mínima, padrão AID-283/284 — matriz item 1 + spot)
1. **Identidade contra o FINAL:** alias `https://aidevschool-codexdojo-os.netlify.app` == permalink `https://6a944cf24d75848dee3a5505--aidevschool-codexdojo-os.netlify.app` == registro RELEASE AID-343 (addendum AID-402): manifesto sha256 `7d0e16d9902e6a1f4b667db8bc8c8525f5cbdd33e3fd5d55e85a38c5fae836fe`, `sourceRevision 6d72735ba2113cb6198c4d7be26c2f01e5f5d694`, inventário byte-a-byte. O precheck do produtor é re-executável (`work-products/AID-343/precheck-final.mjs`, `QA_BASE_URL=<alvo> node …`) — re-executar de contexto próprio, não confiar no log.
2. **Spot MOTOR:** l01 e l14 (mínimo) `MOTOR running`, iframe same-origin `/apps/literacydojo/`, contentVersion `2026-08-21.1`.
3. **Superfície pixelDojo (registro revisado):** validar explicitamente o registro do pin imutável `https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/` como `VITE_PIXELDOJO_URL` (engine próprio, CSP `frame-src https:` deliberada, exposto só em /desktop → engines) — ACEITAR o registro OU escalar ao CEO como aprovação explícita adicional (ramo 2 do critério de aceite AID-402).
4. Emitir GO/NO-GO com evidência datada em `docs/qa/` e comentar o veredito em AID-402.

## Critério de done
GO: identidade byte-a-byte confirmada + spots PASS + registro pixelDojo validado (ou escalado e aceito). NO-GO: defeito novo com evidência. Fronteira: sem escrita em `learner/`/`.mavis/`, sem deploy, sem re-pin.

## Document `Continuation Summary` (2026-08-30)

# Continuation Summary

- Issue: AID-403 — Re-QA mínima de identidade (AID-402 D1): validar alias == permalink == registro FINAL 6a944cf2/7d0e16d9 + spot MOTOR l01/l14 — GO/NO-GO do lote l01–l14
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: caf63eeb-05ce-4c83-900e-a3c4e9806ce3
- Agent: QA Lead (opencode_local)

## Objective

Owner: QA Lead ca6a3f95 (verificador independente; produtor fa8130d5 ≠ verificador). Filha da adjudicação AID-402 (D1 S1 da QA AID-325). Executável em 1 wake.

## Contexto
A QA AID-325 flaggou D1 verificando contra o registro de 15:32Z (`53aa5c52`/`6a944c43`), que já estava superseded pela correção de corrida publicada em AID-343 (comentários 15:40:32Z/15:43:10Z + RELEASE.md): dois runs do FPE promoveram em paralelo; o FINAL registrado é `6a944cf2` (manifesto `7d0e16d9…`, entrypoint correto com pin pixelDojo imutável) e o `53aa5c52…` é o superseded defeituoso (fallback de dev no OS). Adjudicação completa do produtor: `work-products/AID-402/ADJUDICATION.md` (+ logs `precheck-{alias,permalink}-2026-08-30.log`, 30/30 ambos).

## Escopo (re-QA mínima, padrão AID-283/284 — matriz item 1 + spot)
1. **Identidade contra o FINAL:** alias `https://aidevschool-codexdojo-os.netlify.app` == permalink `https://6a944cf24d75848dee3a5505--aidevschool-codexdojo-os.netlify.app` == registro RELEASE AID-343 (addendum AID-402): manifesto sha256 `7d0e16d9902e6a1f4b667db8bc8c8525f5cbdd33e3fd5d55e85a38c5fae836fe`, `sourceRevision 6d72735ba2113cb6198c4d7be26c2f01e5f5d694`, inventário byt
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `caf63eeb-05ce-4c83-900e-a3c4e9806ce3` finished with status `succeeded` at 2026-08-30T16:03:27.872Z.
- Manifest is byte-identical between alias and permalink and matches the FINAL registry. Now I'll run my own independent byte-a-byte inventory check across all 27 files on both hosts:

One FAIL in my own check — likely a false-positive regex. Let me inspect the actual context of the `127.0.0.1` match in the served bundle:

The FAIL was a false positive in my own regex: the `127.0.0.1:517x` hits are catalog/registry `developmentUrl` metadata (documented dev URLs), not runtime resolution. Let me verify how the pin is actually resolved at runtime in the served bundle:

Runtime resolution confirmed: the production env table maps `VITE_PIXELDOJO_URL` to the immutable pin and all other engines to same-origin paths. My regex was wrong — let me correct the check to assert against the actual env-resolution table, then re-run:

Independent identity: 10/10 PASS. Now re-executing the producer's 30-check precheck from my own context against both alias and permalink (includes MOTOR l01/l02/l04/l14 + warehouse spots):

Both hosts 30/30 PASS. Now the item-3 pixelDojo surface check: behavioral verification that the external pin is exposed only at `/desktop` → engines and points to
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `caf63eeb-05ce-4c83-900e-a3c4e9806ce3` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-08-30T16:03:17.30859+00:00

**VEREDITO: GO para o lote l01–l14** no pin FINAL `6a944cf2` (manifesto `7d0e16d9…`, `sourceRevision 6d72735b…`). **D1 (S1) da AID-325 fechado.**

Executado em 1 wake, 2026-08-30 ~15:56–16:02Z, de contexto QA próprio (verificador ca6a3f95 ≠ produtor fa8130d5):

1. **Identidade (matriz item 1):** script próprio `work-products/AID-403/qa-identity.mjs` — **10/10 PASS**: manifesto sha256 `7d0e16d9…` == registro FINAL em alias E permalink; manifesto byte-idêntico (2.450 B); **inventário 27/27 byte-a-byte alias == permalink**; sha256 declarados conferem; tabela `VITE_*` de produção sem fallback de dev (ocorrências `127.0.0.1` no bundle são metadados inertes de catálogo/registry).
2. **Precheck do produtor re-executado** (cópia byte-idêntica `2cc8a2ae…` de `work-products/AID-343/precheck-final.mjs`; logs do produtor não usados como evidência): **alias 30/30 PASS · permalink 30/30 PASS**.
3. **Spot MOTOR (item 2):** l01 e l14 + controles l02/l04/warehouse — `MOTOR running`, iframe same-origin `/apps/literacydojo/`, `contentVersion 2026-08-21.1` (sem `2026-07-25.1`), alias e permalink.
4. **Registro pixelDojo (item 3): ACEITO** — pin vivo (200), **permalink de deploy imutável** (não alias), exposto SÓ em `/desktop?operator=1` → Engine Hub (launcher de estudante não lista o app; zero iframes do pin no desktop de estudante; CSP `frame-src https:` deliberada). Script `qa-pixeldojo-hub.mjs` **7/7 PASS**. CEO pode sobrepor com aprovação explícita adicional se desejar.

Evidência datada: `docs/qa/AID-403_QA_REQA_IDENTIDADE_L01-L14_2026-08-30.md` + logs/scripts re-executáveis em `work-products/AID-403/`.

**Limitações:** re-QA mínima (identidade + spots) — a matriz funcional 69/69 permanece a da AID-325 sobre o mesmo conteúdo, agora confirmado idêntico em produção pelos bytes; conteúdo do site pixelDojo pinado não recebeu matriz funcional (fora do escopo D1).

**Boundary:** tentativa de comentar o veredito diretamente em AID-402 retornou `Issue is outside this actor's authorization boundary` (issue do produtor) — veredito registrado aqui e em `docs/qa/`; o FPE/CEO devem espelhar o fechamento do D1 na AID-402. Sem escrita em `learner/`/`.mavis/`, sem deploy, sem re-pin.

**Disposição: done.**

---

