# AID-301 — Pré-verificação QA: charters da AID-258 contra o pin atual 29b59a92

**Data:** 2026-08-29 UTC (01:07–01:25)
**QA independente:** `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (contexto separado do produtor)
**Disposição:** **GO-ready CONDICIONAL ao aceite humano** — ver condições e achados abaixo. Emissão
formal do GO/NO-GO da coorte permanece com AID-258 quando AID-257 concluir (issue não tocada).

## Identidade verificada

| Campo | Valor observado | Esperado (AID-297/AID-290) |
| --- | --- | --- |
| Manifesto alias (SHA-256) | `48714a7f568faf32df5147d4e497e871efff9dd309306756c1a023700d491e45` | confere |
| Manifesto permalink `6a9227f6` | idêntico byte-a-byte ao alias | confere |
| `sourceRevision` | `29b59a9239f5f3d86cbc1e3a27eff290c6e8bcbf` | confere |
| Commit na object store (`_default/.git`) | tipo `commit`, tree `20fa9095d01dbcd6a626cb570623fbc92cbb20f3` | imutável |
| Linhagem | `ec265fab`, `b9f360e`, `61b85535`, `afd6789` todos ancestrais | cadeia GO retida |

## Charters (re-execução dos 5 da AID-258 contra o pin atual)

### QA1 — Identidade publicada vs. aprovada: **PASS**

```text
curl -fsSL https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
48714a7f568faf32df5147d4e497e871efff9dd309306756c1a023700d491e45
curl -fsSL https://6a9227f6e75f977a7af03a87--aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
48714a7f…d491e45  (== alias; JSON idêntico; sourceRevision 29b59a92… em ambos)
git cat-file -t 29b59a92… -> commit; tree 20fa9095…
```

### QA2 — Correlação de superfícies: **PASS**

8/8 arquivos do charter (OS, LiteracyDojo index/sw/termos/privacidade, WAREHOUSE, WORMHOLE,
RELAY STATION): HTTP 200 no alias e no permalink, SHA-256 == manifesto, alias↔permalink
byte-idênticos. Inventário completo 27/27 arquivos: 200 + idênticos. Legais byte-a-byte
idênticas às auditadas (`385d87d6…` termos, `27fe5a37…` privacidade).

Jornada (nível spec, remoto): `QA_BASE_URL=alias npm run test:smoke:remote` no wt do PR #178
(`06081f31`): **6/6 PASS** (desktop/tablet/mobile × {IA Prática l02 hospedada same-origin com
contagem canônica intacta; Dev game-02 completa rodada e reporta verificador honestamente}).
Primeira execução 6/6 contra `29b59a92` (AID-297 cobriu reduced-motion+pre-check; AID-283/284
cobriram `61b85535`).

Pre-check do produtor re-executado de forma independente: **17/17 PASS**
(`_work-products/AID-290/precheck-draft.mjs` do objeto `75c6cec7`, read-only contra o alias;
inclui MOTOR l01/l02 same-origin e contentVersion 2026-08-21.1).

### QA3 — Integridade do learner: **PASS**

```text
sha256(_default/learner/learning_state.yaml) = c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf
mtime 2026-08-04 — intocado (== AID-180/AID-254/AID-258)
python3 -m learner.substrate --check -> "Canonical learner state and generated projections are in sync."
```

Nenhuma escrita em `learner/`/`.mavis/` por esta verificação (hashes conferidos antes/depois).
Informativo (F3): `.mavis/learning_state.yaml` mudou de `cdab3318…` (registro AID-258) para
`a900918a…` com mtime 2026-08-29T00:14Z — regeneração da projeção derivada pelo produtor durante
o re-pin AID-290; canônico intacto e `--check` em sincronia. Workspaces de desenvolvimento
divergentes não são fonte da identidade.

### QA4 — Protocolo AID-142 v1 (público/dados): **PASS**

`work-products/AID-142/FIRST_PILOT_FEEDBACK_PROTOCOL.md` inalterado
(SHA-256 `33f3fc6f…`, mtime 2026-08-24): limite 1+1 (l02 + game-02-warehouse), consentimento
literal, retirada por código, allowlist sem PII/respostas/texto livre, retenção 30d fora do git,
sem claim de eficácia/mastery. Estado de gate consistente com a premissa do roteiro:
confirmação `35fd67c0` em AID-142 = **pending**; AID-257 = **blocked**; AID-142 = in_review.

### QA5 — Gate operacional AID-180: **PASS com 2 achados**

Definidos e coerentes: rollback owner (FPE `fa8130d5`) e procedimento (republicar deploy
anterior + interromper convites), suporte técnico triado pelo FPE, feedback pelo CEO, abort
conditions (consentimento, dados, escrita canônica, falsa mastery, hint revelador,
acessibilidade sev-3, indisponibilidade), participantes convidados: 0.

## Achados

### F1 (decisório, P1 para o GO da coorte) — Verificação independente indisponível na jornada Dev em produção

Na identidade validada para a coorte (`ec265fab`/`6a9141bc`), a ponte de verificação respondia
em produção: `GET /__dojo/bridge/v1/session` no permalink `6a9141bc` → **403 JSON
`{"error":"origin-forbidden"}`** (função viva, gated por origem; preflight AID-180 registrou
JSON/token same-origin; AID-219 obteve recibo PASS correlacionado). No pin atual a função foi
removida (commit `29b59a92` dropou redirects/functions do `netlify.toml` para deploy via CLI;
funções nunca foram rastreadas no git): o mesmo endpoint no alias retorna **fallback SPA
(200 text/html)**.

Sonda executável em browser (Chromium headless, perfil limpo, desktop 1280×800) contra o alias:
jornada Dev `game-02-warehouse` dirigida FAIL→retry→PASS; HUD "Missão concluída; evidência
emitida."; host exibe **"EVIDÊNCIA: Verificador indisponível"**, "A evidência foi preservada. O
verificador local está indisponível.", hub "Temporariamente indisponível"; chamadas observadas
`/__dojo/bridge/v1/session` → 200 text/html (handshake falha; nenhum POST de verificação);
evidência e XP preservados localmente; sem crash, sem falsa mastery (limites honestos exibidos).
A spec remota do PR #178 (verificada em AID-289) **assere** esse comportamento — é degradação
deliberada e spec-locked, não regressão acidental.

Impacto para a coorte: o participante Dev não poderá ver veredito independente na sessão; a sonda
de compreensão §5 ("O que foi verificado de forma independente?") perde a demonstração em
produto; a jornada validada em AID-219 (recibo PASS) não é reproduzível neste pin. Não configura
abort automático (missão completa; degradação honesta), mas exige decisão explícita antes do GO:
(a) CEO aceita rodar as 2 sessões com verificador declarado indisponível (ajuste de expectativa
no scorecard/roteiro), ou (b) FPE restaura a ponte (funções in-repo) e re-pinha com re-verificação.

### F2 (P1, documental) — Drift de identidade no gate da coorte

`work-products/AID-180/INITIAL_CONTROLLED_COHORT.md` (mtime 2026-08-28) aponta exclusivamente
para a identidade superada: revisão `ec265fab`, deploy `6a9141bc`, permalink antigo, manifesto
`ddf404d9…`; o bloqueador 1 pede ao CEO confirmação "para a revisão `ec265fab`". Produção serve
`29b59a92`/`6a9227f6`/`48714a7f`. Na re-revisão AID-258 pós-aceite, o charter "AID-180 aponta
exclusivamente para a revisão aprovada" falha contra o pin atual se não houver reconciliação.
Owner: FPE (`fa8130d5`, assignee de AID-180). `docs/qa/AID-258_QA_PRONTIDAO_COORTE_2026-08-28.md`
é evidência datada correta para sua data (convenção append-only; não reescrever; não reutilizar
como evidência do pin novo — este documento a substitui para `29b59a92`).

## Resultado consolidado

| Charter | Resultado |
| --- | --- |
| QA1 identidade publicada | PASS |
| QA2 correlação de superfícies + jornada remota | PASS (8/8 manifesto, 27/27 inventário, smoke 6/6, pre-check 17/17) |
| QA3 integridade do learner | PASS (preservado; `--check` verde) |
| QA4 protocolo limita público/dados | PASS (v1 inalterado; aceite humano pendente) |
| QA5 gate operacional/rollback/suporte/abort | PASS com F1 (decisório) e F2 (drift documental) |

## Veredito

**GO-ready CONDICIONAL ao aceite humano**, desde que, antes da execução de AID-258 pós-aceite:
1. F2 reconciliado: work product AID-180 apontando para `29b59a92`/`6a9227f6`/`48714a7f`
   (confirmação reconciliada correspondente);
2. F1 decidido: aceite formal do CEO do verificador indisponível nas 2 sessões, ou restauração
   da ponte + re-pin + re-verificação independente.

Sem (1) e (2), a recomendação desta QA é **NO-GO** na re-revisão AID-258, mesmo após aceite de
`35fd67c0`. Nenhum convite, nenhuma escrita em learner/.mavis, AID-258 não foi tocada.

## Limitações explícitas

- Sonda de browser: 1 execução por jornada (Dev dirigida por API pública `__warehouse`; IA
  Prática coberta pela spec remota 6/6), Chromium headless/SwiftShader, desktop apenas para a
  sonda dirigida; matriz completa de viewports coberta só pelo smoke remoto.
- Smoke remoto executado no wt do PR #178 (`06081f31`); o head atual do PR é `1ecfbd1a` (B1
  verde) — spec equivalente para os fins deste charter; merge do PR (B2) segue em governança.
- Verificação negativa de convites não é executável; consistente com 0 observado.
- Um novo deploy/re-pin invalida esta leitura (identidade é o controle).

## Artefatos

- Sonda e logs: `/paperclip/instances/default/workspaces/ca6a3f95-8572-43f4-822a-6b40b9bdb63b/aid301-evidence/`
  (manifestos, resultados da sonda com chamadas de ponte, screenshots, logs do pre-check e do smoke).
