<!-- issue: AID-667 | key: qa-prepromo | doc_id: e08469e2-beb0-4c89-96a3-2b6273e8289a | updated: 2026-09-02 17:11:50.09+00 -->

# QA O3-C1 — verificação preparatória em main @ 4c2aeb7 (A1–A8 + a11y + RD4 + mapa 36) — pré-promoção

(AID-667)

# QA AID-667 — Verificação preparatória O3-C1 em main @ `4c2aeb7` (pré-promoção)

**QA Lead:** ca6a3f95 · **Data:** 2026-09-02 ~17:0xZ · **Pin:** `4c2aeb7a38bdea1bf25394cc88d44ea767b55466` (= `refs/heads/main`, clone fresco; árvore limpa) · **Ambiente:** linux x64, node v24.18.0, Python 3.13.5, vitest 3.2.7, biome 1.9.4, @playwright/test 1.62.0 (chromium).

**Sequenciamento (spec rev 2 §5):** verificação preparatória em main executada agora; **GO/NO-GO + re-grant de readiness somente pós-promoção AID-666 (§5.6 → §5.7 → §5.8)**. Este documento NÃO é veredito de porta.

## Suíte executada (tudo first-hand, worktree QA dedicado)

| Check | Resultado |
| --- | --- |
| `python3 curriculum/ai-literacy/tools/validate.py` | ✅ `OK: 29 ready: 20 IA na Prática, 9 Dev; 0 planned` |
| `npm run gen:content` | ✅ read model regenerado idêntico ao commit (árvore permaneceu limpa) |
| `npm run lint` (biome) | ✅ 80 arquivos, 0 erros |
| `npm run test` (vitest) | ✅ **138/138** em 18 arquivos |
| `npm run build` (tsc -b && vite build) | ✅ 77 módulos, 0 erros |
| `npm run test:e2e` (playwright + readiness-report) | ✅ **9/9** (30,5s), 3 readiness JSON reportados |
| Gate do verificador independente | ✅ pytest 17/17 + node --test 18/18 (corpus regenerado) |
| CI do commit main `4c2aeb7` (GitHub API) | ✅ 36 check-runs = 35 success + 1 skipped, **0 fail** |

## Checklist A1–A8 (spec rev 2 §6) — estado pré-promoção

- **A1 Nenhum rebaixamento** — ✅ `migration.test.ts` "retrofit O3-C1 (A1)": l01 `completed` só-a1 @ `2026-09-02.2` permanece `completed` pós-bump (grandfathering §1.3); `currentLessonId` preservado. Passa (21/21 nos 2 arquivos alvo).
- **A2 Revisão devida preservada** — ✅ `migration.test.ts` "retrofit O3-C1 (A2)": skill praticada ⇒ `nextReviewAt == now` no bump (re-pin sob catálogo novo).
- **A3 Predicado version-blind** — ✅ `progress.test.ts`: só-a1 ⇒ `completed:false` + `missingActivityIds=[l01-a2,l01-a3]`; 3× ≥0,75 ⇒ `completed:true`; 0,7 ⇒ `false` (fronteira exata em l04).
- **A4 Conteúdo** — ✅ 44/44 checks estáticos (log `static-a4.log`): 7×3 atividades `a1/a2/a3`; `requiredActivityIds` = conjunto completo + `minimumScore 0.75`; rubricas **3 critérios weight 1** nas 7 (l02 `r-identifica-risco/r-escolhe-verificavel/r-justifica-criterios` e l05 `r-campos-especificos/r-contexto-suficiente/r-pedido-utilizavel` = as 3 pré-existentes MANTIDAS; nas demais, critérios antigos preservados + 1 novo); `version` v2/v4/v2/v2/v3/v2/v2; minutos 4/4/4/4/5/4/4 (l01/l04 3→4); catálogo `contentVersion 2026-09-02.3`. Baseline conferido por `git show 4c2aeb7^1` → transições exatas +13 atividades (l01 +2, l02 +2, l03 +1, l04 +2, l05 +2, l06 +2, l07 +2).
- **A5 Aviso** — ✅ `retrofitNotice.test.ts` (domínio): mapa da onda = exatamente l01–l07 no contentVersion vigente; devido só para concluída sem ack; **idempotência 1×/learner/lição/bump com rearme em bump futuro**; ack de outra lição não interfere; **copy S1/S2 verbatim do sign-off AID-646** (constraints §3). `retrofitAcks.test.ts` (adapter): chave estruturada sem texto livre, regravação não acumula, reset limpa, lixo degrada sem lançar. `retrofitNotice.test.tsx` (app): S1 no card de revisão do Home; S2 1× na intro de revisão sem reaparecer; **item D plural aplicado** ("refaça **as** atividades"); learner sem conclusão não vê aviso. **Zero mudança em gates/evidence schema**: diff toca só fixtures de teste (`lessonVersion` numérico) e corpus do verificador regenerado — nenhum arquivo de schema/policy.
- **A6 Regressão de jornada** — ✅ `progress.test.ts` "Mapa Inicial continua em l02" (`MAP_INITIAL_LESSON_ID == "l02"` + skillIds não vazios); `migration.test.ts` cobre v2→v3 com reabertura no Mapa Inicial (`migrateV2toV3` referencia l01/l02 literalmente — código conferido); entry dos tracks em `mission-bindings.yaml` = `l02` (ai-pratica). Jornada `in_progress`/retomada coberta em `appFlow.test.tsx` (reload volta ao player) e e2e `literacy-resume` ✅.
- **(E3 aceito)** — ✅ `lessonSession.test.ts`: finish sem bestScores ⇒ `finishPayload` undefined ("ainda falta"), sem crash; modo initial/review preservado no payload; duração clamped.
- **A8 QA wave-level** — ✅ suíte completa acima (gen:content/lint/test/build/e2e) + **R1 diff puramente aditivo**: `git diff 7101cf4..4c2aeb7` = 34 arquivos +1865/−212; TODAS as 212 deleções auditadas = metadados (linhas `version`, `contentVersion` .2→.3, `estimatedMinutes` 3→4, `requiredActivityIds` supersets substituídos pelo conjunto completo, comentários de cabeçalho), tipo de rota estendido com `mode?: "review"` (aditivo) e item D singular→plural (mandato §3). **Nenhuma remoção de conteúdo, atividade, skill, binding, gate ou schema.**

## Mapa de missões e desvio #1 divulgado

- `mission-bindings.yaml`: **36 missões** (29 literacyDojo + 7 voxelDojo); tracks `ai-pratica` e `dev` ambas @ `2026-09-02.3`; chapters dev 1–16 contínuos; contagem **ia-pratica 20 / dev 9** confirmada. Read model gerado `missions.ts` = 36 missões, 32 menções `.3`, **0 menções `.2` residual**.
- Bump propagado às 29 missões literacy (exigência do validador canônico) — conferido e consistente com o desvio divulgado pelo FPE na AID-654.

## a11y (pré-promoção, local)

- e2e `reflow-320.spec.ts` ✅ (standalone 320px, iframe hospedada 298px, piso de largura).
- Probe QA dedicado (`qa667-a11y-probe.spec.ts`, evidência anexada ao worktree QA): onboarding→Mapa Inicial (l02, superfície da onda) — `lang=pt-BR`; **0 controles sem nome acessível**; navegação 100% teclado (Tab foca input, Space seleciona radio, Enter submete); feedback pós-tentativa em região `aria-live="polite"` (`FeedbackPanel`). ✅ 1/1.
- Contador dinâmico "atividade 1 de 3" observado no player (plural-safe).

## Vendor-neutral RD4

- 22 padrões sobre os 29 YAMLs + slices do motor (`retrofitNotice.ts`, `LessonScreen.tsx`, `HomeScreen.tsx`, `App.tsx`): **0 hits reais**. Falsos positivos auditados: `o3-` = tag da onda "O3-C1" em comentários; `openai/gpt-4` em l17 (trilha **dev**, fora da onda, intocada pelo PR — último touch Jul 25). ✅

## Readiness (estado em main @ 4c2aeb7)

- `os-literacy-guided-mission`: **`stale`** — honesto pós-merge (source fingerprints incluem `engines/literacyDojo/src/`). Re-grant é carga da QA **somente pós-promoção** (AID-666).
- `os-voxel-guided-missions`: `pass`/`customer-ready` (mantido). ✅
- **Observação (não-bloqueante, decisão de escopo p/ close-out):** `literacy-standalone-first-lesson` (literacyDojo standalone) também ficou `stale` (artifact digest de `vertical-slice.spec.ts` mudou no PR). Fora do escopo mandato (flag (ii) AID-559 = os-literacy), mas o mesmo ciclo de re-grant pós-promoção pode cobri-la — deferido ao SD/board no close-out §5.8.

## Limitações

- Hospedagem (alias/pin/permalink production, S1/S2 renderizando em produção, jornada hosted com 3 atividades) **pende da promoção AID-666** — será verificada na fase de veredito.
- a11y: teclado/ARIA/aria-live/reflow verificados localmente; contraste e leitor de tela reais não auditados nesta sessão (sem tooling) — mesma limitação declarada no gate AID-631.
- E3 "sessão em voo" verificado por testes de unidade/app (mecanismo), não por sessão real pré/pós-bump em produção.

## Próximo passo (gatilho first-class)

`blockedBy: AID-666` (promoção §5.6, owner FPE). Após promoção: verificação hosted (7 lições com 3 atividades + aviso S1/S2 + contentVersion novo + mapa 36 + contagens 20/9 em produção), veredito **GO/NO-GO** na AID-657/AID-667 e re-grant `os-literacy-guided-mission` (padrão AID-631 v22: perna automatizada CI do pin + perna observada em produção).
