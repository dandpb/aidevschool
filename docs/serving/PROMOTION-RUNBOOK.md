# Runbook canônico de promoção staging→prod (2 superfícies)

**Status:** processo canônico (promovido do work-product AID-956 por AID-989/Opção A, 2026-09-07).
Fluxo provado 3× ponta-a-ponta nas ondas AID-935 (`65d64bca`), AID-960 (`c2937e55`) e AID-964
(`e41b9b93`). **Owner operacional:** FPE. **Merge single-writer:** CEO. **Countersign de conteúdo:**
QA. Substitui o runbook efêmero `_work-products/AID-956/REDEPLOY-RUNBOOK.md` (não mais
reproduzido; os registros de onda permanecem a evidência histórica).

**Caracterização honesta (herdada do doc AID-982 §1.2):** o "staging" aqui é um **draft deploy
efêmero + precheck script** — não é ambiente durável com URL estável, não há ambiente separado de
prod, e deploy público exige CLI autenticado + autorização founder. Não existe CI/CD de deploy:
merge no GitHub **não** gera deploy automático. Opção A mantém esse desenho e o formaliza.

## 0. Quando usar

Qualquer mudança de conteúdo nas 2 superfícies (code ou docs que afetem o bundle). Deploys de
rotina seguem este runbook ponta-a-ponta; não existe promoção "rápida" fora dele.

## 1. Gates de entrada (todos obrigatórios, verificados first-hand)

1. **Countersign QA GO** sobre o head a promover (issue da QA citando o sha).
2. **Merge single-writer do CEO** no GitHub (PR com revisão; o merge commit é o pin candidato).
3. **CI verde no pin:** check-runs do merge commit aguardados até conclusão (0 fail; platform-skip
   aceitável).
4. **Autorização founder** para deploy público (padrão single-writer vigente;
   `docs/ESTADO_REAL_2026-08-17.md`).

## 2. Pin

- `git fetch origin main`; conferir `origin/main` == merge commit alvo.
- Criar/conferir branch de referência `release/<sha-curto>` no pin (`git ls-remote`) — âncora de
  rastreabilidade do deploy (o manifest do OS carrega `sourceRevision`).

## 3. Build (worktree limpo, detached no pin)

Worktree dedicado (ex.: `/tmp/opencode/promo<wave>/wt`), detached no pin, `git status` vazio.

- **OS:** `COMMIT_REF=<sha> VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics node scripts/build-pilot-bundle.mjs`
  (em `engines/codexdojo-os-prototype/`; env pins espelhados do `[build.environment]` do próprio
  `netlify.toml` do pin — o script de bundle não injeta esses env). O manifest gerado deve ter
  `sourceRevision == <sha>`; functions staged devem ser byte-idênticas ao canônico
  `learner/gate/netlify-functions` (o deploy aborta em drift).
- **Literacy:** `npm run build` com `VITE_ANALYTICS_ENDPOINT` + `VITE_LITERACY_VERIFIER_URL`
  espelhados de `engines/literacyDojo/netlify.toml`; staging de functions com `netlify.toml`
  byte-idêntico ao do pin **exceto** a linha `functions` (CLI recusa `../../` fora da raiz;
  semântica preservada: mesmas redirects, mesmos env pins).

## 4. Deploy draft (staging efêmero) + precheck

1. `deploy-pilot-bundle.mjs --site aidevschool-codexdojo-os` (sem `--prod`) para o OS; para a
   literacy, deploy CLI `--no-build` do staging próprio.
2. **Precheck completo contra draft E alias de produção** — adaptar o script da onda anterior
   (`_work-products/AID-935/precheck-65d64bca.mjs` é o ancestral; a onda corrente copia e ajusta
   âncoras de conteúdo). Cobertura obrigatória (72 checks na onda AID-935): identidade de
   manifesto/sourceRevision/sha de superfície; páginas 200; env pins + endpoint de telemetria
   baked; `/privacidade.html` 200 com copy de telemetria; **coletor cross-origin 403**; **export
   fail-closed (401 sem token com `ANALYTICS_EXPORT_TOKEN` armado)**; **smoke de ingestão
   same-origin 202** (OS v1 + literacy v2, eventId UUID); envelope inválido 422; bridges de
   verificação preservadas; catálogo uniforme (`contentVersion` ×N, `verifierRequired`, fallback);
   dist literacy byte-idêntico local↔deploy quando aplicável.
3. **Precheck precisa estar 100% verde nos 2 alvos.** Falha = não promover; defect novo = child
   issue com blocker nomeado (ver §7).

## 5. Alias de produção + verificação pós-deploy

1. Alias `--prod` **somente com precheck verde** (OS: `deploy-pilot-bundle.mjs --prod --site…`;
   literacy: `--no-build --site <site-id>` — ver gotcha §8.1).
2. Pós-deploy first-hand nas 2 superfícies: **2× POST idêntico → 202/202 com dedup** (exatamente
   1 linha por eventId no export); **export com bearer → 200 ndjson >0 linhas**; 401 sem token;
   403 cross-site; manifest `sourceRevision` == pin.
3. **Recibo** (receipt): comentário na issue da onda com pin, deploy IDs (draft+prod), timestamps
   UTC, sha256 do bundle, output bruto arquivado, desvios e pendências — insumo para a
   re-verificação independente (QA/fase 2) e para o fechamento pelo CEO.

## 6. Rollback (owner: FPE)

Critério: defeito de integridade/serviço no alias de produção que não tenha correção mais rápida
que o rollback.

1. Identificar o deploy anterior elegível (tabela do receipt da onda anterior; branch
   `release/<sha-anterior>` intacta é o caminho preferencial).
2. Rebuild no pin anterior (worktree limpo, §3) + redeploy com alias `--prod`.
3. Re-rodar o precheck **contra o alias re-pinado** (mínimo: manifesto/sourceRevision, 401/403,
   smoke de ingestão, export >0).
4. Registrar o rollback como receipt (motivo, janela de indisponibilidade, sha de volta) e abrir
   child issue do defeito com blocker nomeado.
5. Nunca reverter unilateralmente conteúdo QA-GO sem registro: o rollback é decisão operacional e
   fica auditada no thread da onda.

## 7. Incidente

- **Defeito revelado por deploy/monitor:** child issue da cadeia competente (ex.: AID-961 nasceu
  assim do redeploy AID-960), com owner + blocker nomeados; produção só volta a mudar por este
  runbook.
- **Queda/indisponibilidade apontada pelo monitor externo:** seguir
  [`UPTIME-MONITOR-SETUP.md`](UPTIME-MONITOR-SETUP.md) §incidente (triagem 401/403 vs 5xx vs
  DNS/plataforma) e, se houver mudança de produção, este runbook.
- **Achados de monitoramento/incidente re-entram como novo `intent.md`** (skill ai-native-sdlc) —
  não como hotfix silencioso.

## 8. Gotchas operacionais (vivos, aprendidos nas ondas)

1. **Literacy por slug falha no CLI:** "Failed retrieving site data… Not Found" gera deploy em
   erro e desperdiça créditos. **Pinar o site-ID** (`--site ba44d0c6…`) em vez do slug.
2. **Propagação de leitura no Blobs literacy:** read-your-writes pode levar **~1–8 min** entre
   réplicas (OS é imediato). Asserts de export "0 linhas" sem aguardar propagação dão
   falso-negativo.
3. **eventId do literacy deve ser UUID:** marcador não-UUID recebe 202 com
   `acceptedEventIds: []` (comportamento intencional). Sondas/smoke usam eventId UUID.
4. **Drafts remanescentes** ficam no site (não-alias) — inofensivos, mas constam no receipt.
5. **`literacy-verify` untracked:** a função viva no site literacy (verificadora independente da
  journey standalone) precisa ser preservada no staging manual até ser rastreada in-repo
   (follow-up aberto desde AID-935).
6. **Créditos:** cada onda consome ~60–90 créditos do pool free (300/mês; deploy prod = 15
   créditos cada) — ver `README.md` §postura de cotas antes de agendar várias ondas no mesmo mês.

## 9. Custos

US$0/mês (free tier) sob a escala do piloto; onda de promoção custa tempo FPE (~1–2h) + créditos
Netlify (ver §8.6). Nenhum SLA é oferecido — contratos do piloto declaram **best-effort** (postura
honesta do doc AID-982 §2-A).
