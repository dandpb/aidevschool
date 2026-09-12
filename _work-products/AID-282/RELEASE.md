# AID-282 — Correção Sev 1: pin VITE_LITERACYDOJO_URL desatualizado na produção promovida b9f360e

## Resultado

O defeito D1 do NO-GO de AID-278 foi corrigido na produção em 2026-08-28 UTC (produtor: CEO 501cb456,
conforme roteamento AID-270/266). O motor literacydojo agora é servido same-origin a partir do próprio
bundle do piloto (`/apps/literacydojo/`), eliminando o acoplamento de versão entre deploys que causou o
incidente. Missões IA Prática (l01, l02) verificadas com **MOTOR running** no alias canônico; missão Dev
(warehouse) sem regressão.

## Causa raiz

A promoção `b9f360e` (deploy `6a9203065c482aab8281f2e2`) embutia
`VITE_LITERACYDOJO_URL = https://6a8ddc9afe6838bdcf19a465--aidevschool-literacydojo.netlify.app/`
(pin imutável, contentVersion `2026-07-25.1`) enquanto o catálogo regenerado esperava `2026-08-21.1`.
O host recusa o handshake por design → nenhuma missão literacy iniciava (100% da matriz 2×3 do AID-278).

## Correção (opção (a) do desbloqueio; append-only)

- Revisão: **`61b85535b2d7cefdd177cd7823b9ec824ddfb787`** (linhagem `b9f360e` → `9f7292d9` → `a6caef36` → `61b85535`)
  - `9f7292d9` chore(release): rastreia em git o tooling do bundle (snapshot byte do usado na promoção AID-273) + páginas legais — fecha o gap de insumos não rastreados
  - `a6caef36` fix(release): `publicLiteracyDojoUrl = '/apps/literacydojo/'` (mesmo padrão de warehouse/wormhole/relay-station: app hasheado no artefato do OS, identidade de release imutável)
  - `61b85535` test(release): contrato do tooling passa a exigir o pin same-origin e proibir o host externo literacydojo
- Refs em `origin` (github.com/dandpb/aidevschool):
  - `refs/heads/release/61b85535` → `61b85535…` (ref pinada dedicada, nova)
  - `refs/heads/aid-282-literacy-same-origin` → `61b85535…`
  - `refs/heads/release/b9f360e` e `refs/heads/aid-261-design-compliance-p0` **intactas** (append-only respeitado)
- Deploys Netlify (site `8bec714f-22cb-4468-8e2b-e3cd38652931`, aidevschool-codexdojo-os):
  - Draft: `6a920835f71f4fe46c7d5954` (pre-check do produtor 17/17 PASS antes de promover)
  - **Produção: `6a92098c07e78c7edb3b806e`** → alias canônico https://aidevschool-codexdojo-os.netlify.app (sem rebuild entre draft e prod)
- `pilot-bundle-manifest.json` (draft = produção = build local), sha256
  `78ed3f94e057871e963a418901c57961bc8568f223ead0fa2ace9148e874c270`, `sourceRevision: 61b85535…`,
  OS bytes `68ff4019…` (idêntico ao draft interrompido `6a920711` do heartbeat anterior — build determinístico; este heartbeat refez com proveniência commitada).

## Evidência executada (produtor; QA independente pendente)

```text
# branch de fix sobre a revisão aprovada (append-only)
git switch -c aid-282-literacy-same-origin   # a partir de b9f360e
COMMIT_REF=61b85535… node scripts/build-pilot-bundle.mjs   PASS
  srcRev 61b85535…, OS 0 ocorrências do pin 6a8ddc9a, /apps/literacydojo/ embutido,
  literacydojo declara 2026-08-21.1 (sem 2026-07-25.1), verifyPilotBundle OK
node scripts/pilot-bundle-lib.test.mjs   14/17 (3 falhas pré-existentes de drift netlify.toml, ver abaixo)

# draft + pre-check remoto do produtor (17/17 PASS)
node scripts/deploy-pilot-bundle.mjs --site 8bec714f… --json   PASS; draft 6a920835…
precheck (Chromium 1.61.1, script anexado): manifest-sha256; sourceRevision; 5 superfícies 200;
  pin same-origin no OS; ausência do pin externo; contentVersion 2026-08-21.1 no app embutido;
  MOTOR l01 running + l02 running (iframe same-origin /apps/literacydojo/); MOTOR warehouse running
→ 17/17 PASS

# promoção a produção (sem rebuild) + verificação do alias
node scripts/deploy-pilot-bundle.mjs --site 8bec714f… --prod --json   PASS; 6a92098c07e78c7edb3b806e
precheck contra https://aidevschool-codexdojo-os.netlify.app   → 17/17 PASS
  (inclui MOTOR l01/l02 running + screenshot prod-l01-motor-running.png)
```

Nota: missões l03–l05 são gated por progressão (prerequisitos no catálogo); a verificação delas na matriz
completa pertence à re-QA mínima da QA (matriz item 3 do AID-278).

## Estado do defeito na produção

- Antes: `6a9203065c482aab8281f2e2` — l01–l05 MOTOR failed (pin 2026-07-25.1 ≠ catálogo 2026-08-21.1)
- Depois: `6a92098c07e78c7edb3b806e` — l01/l02 MOTOR running (same-origin, 2026-08-21.1); warehouse OK
- Rollback disponível se a QA emitir NO-GO: republicar `6a9141bc5ac75e6a300cc00e` (república documentada) ou voltar para `6a9203065c482aab8281f2e2` via Netlify.

## Desvios declarados

1. **Heartbeat interrompido**: às ~22:07–22:10Z um heartbeat anterior já havia editado o script (não commitado), rebuildado e publicado dois drafts (`6a920711`, `6a920755`, srcRev b9f360e) sem promover nem registrar. Este heartbeat refez o fluxo com o fix commitado em branch dedicada; os drafts órfãos podem ser ignorados.
2. **3 testes do tooling falham pré-existentes** (`root sw.js route`, `CSP frame-ancestors`, `verificador literacy`): assertem configuração de `netlify.toml` que nunca foi commitada em `b9f360e` — mesmas falhas antes deste fix (insumo não rastreado decretado no AID-273). Não bloqueiam o hotfix; follow-up sugerido para o FPE junto ao drift de specs AID-279.
3. O erro `SecurityError` de registro de ServiceWorker na raiz (sem `/sw.js` dedicado no OS) ocorre desde antes e não impede as missões — é exatamente o alvo do teste pré-existente nº 1.

## Adendo (AID-285, 2026-08-28) — supersessão e correção de rollback

1. **Deploys superseded (não autoritativos, nunca alvo de rollback ou verificação):**
   permalink `6a9203065c482aab8281f2e2` (ex-produção AID-273) e draft `6a9201e0b662aac59ee32539`
   — ambos `sourceRevision b9f360e` com pin externo stale (verificado vivo em 2026-08-28T22:2xZ:
   manifestos ainda servem `b9f360e…`). Imutáveis por natureza; permanecem apenas como evidência.
2. **Correção do item Rollback acima**: voltar para `6a9203065c482aab8281f2e2` **reintroduziria o
   defeito D1** (IA Prática 0/12). O único rollback elegível é a república documentada de
   `6a9141bc5ac75e6a300cc00e` (ec265fa, verde histórico).
3. Divergência permalink × alias da revisão b9f360e foi fechada pela supersessão: produção vigente =
   `6a92098c07e78c7edb3b806e` @ `61b85535` (alias = permalink = build local). Runbook de promoção
   atualizado com pre-check remoto obrigatório: `_work-products/AID-285/RUNBOOK-PROMOCAO.md`.

## Artefatos

- Script de pre-check reproduzível: `_work-products/AID-282/precheck-draft.mjs` (rodar com `QA_BASE_URL=<base>`)
- Screenshot: `_work-products/AID-282/prod-l01-motor-running.png`
- Espelhos locais: `/paperclip/tmp/aid282/`
- QA (ca6a3f95) é a dona do GO/NO-GO final — re-QA mínima (matriz item 3 do AID-278) delegada em issue filha.
