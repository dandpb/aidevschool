# AID-47: Integrar host canônico com jornadas e analytics privados

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** Founding Product Engineer | **Created:** 2026-08-22T14:03:43.165716+00:00 | **Updated:** 2026-11-01T14:16:48.495+00:00
- **ID:** `82656e36-203e-4fee-909e-a70238a97935`

## Description

Após AID-46, implementar a jornada do host canônico para LiteracyDojo e para o primeiro capítulo developer, seguindo AID-30 e AID-31. Adicionar eventos de ativação/retomada somente comportamentais, estados visíveis de erro/recuperação, copy de progresso local/limitações, metadados de release e rollback. Proibido capturar respostas de lição ou texto livre sensível. Critérios: ambas as rotas passam no candidato; testes focados e evidência; analytics privacy-safe; sem alterar mastery. Esta tarefa supersede operacionalmente a AID-34, fora do boundary deste projeto.

## Document `Continuation Summary` (2026-08-22)

# Continuation Summary

- Issue: AID-47 — Integrar host canônico com jornadas e analytics privados
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: b693b697-62c6-470f-bf91-c84e8adb88b7
- Agent: Founding Product Engineer (opencode_local)

## Objective

Após AID-46, implementar a jornada do host canônico para LiteracyDojo e para o primeiro capítulo developer, seguindo AID-30 e AID-31. Adicionar eventos de ativação/retomada somente comportamentais, estados visíveis de erro/recuperação, copy de progresso local/limitações, metadados de release e rollback. Proibido capturar respostas de lição ou texto livre sensível. Critérios: ambas as rotas passam no candidato; testes focados e evidência; analytics privacy-safe; sem alterar mastery. Esta tarefa supersede operacionalmente a AID-34, fora do boundary deste projeto.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `b693b697-62c6-470f-bf91-c84e8adb88b7` finished with status `succeeded` at 2026-08-29T11:42:59.740Z.
- The `request_confirmation` was **accepted** at 2026-08-29T11:34Z — that's the wake. PR #183 still shows REVIEW_REQUIRED (no GitHub review yet). Checking who accepted and the PR mergeable state before closing.

Independent acceptance confirmed: the confirmation was resolved **accepted** by a user (`resolvedByUserId` set — CEO side), outcome `accepted`. PR #183 is MERGEABLE but BEHIND (strict branch protection will require an update before merge). Updating the feature branch, then closing AID-47 per the accepted commitment.

Main advanced with a deployed verification bridge and new deploy scripts — my RELEASE.md claims may be stale against this. Checking before closing.

My RELEASE.md's "no bridge in static deploy" claim is now false on main (AID-305 same-origin Netlify bridge). Fixing the runbook against the updated branch before the reviewer merges stale docs.

The remote smoke now asserts the deployed bridge works ('Verificação independente aprovada', no 'Verificador indisponível'). Rewriting RELEASE.md against the current pipeline and fixing the stale README claim.

All checks green at `8e4740f`. Posting the closing evidence and marking AID-47 done per the acc
[truncated]

## Files / Routes Touched

- `scripts/pilot-bundle-lib.test.mjs`

## Commands Run

- Heartbeat run `b693b697-62c6-470f-bf91-c84e8adb88b7` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Interaction [request_confirmation] Revisão independente do PR #183 para fechar AID-47 (accepted)

AID-47 entregue no PR #183 (funil Dev realinhado + runbook de release/rollback). Aceitar após revisão independente aprovada e checks verdes no PR; recusar aponta o defeito para eu corrigir.

## Comments (6)

**founder** · 2026-08-22T19:09:19.749541+00:00

Bloqueio de release: AID-58 concluiu NO-GO para a CI bloqueante. AID-47 não deve iniciar/liberar até AID-59 provar branch protection e os quatro checks no SHA candidato.

**Founding Product Engineer** · 2026-08-22T19:10:43.897759+00:00

NO-GO acolhido. AID-47 permanece sem início e sem liberação. Desbloqueio condicionado a AID-59 anexar evidência independente e reproduzível de branch protection ativa e dos quatro checks obrigatórios verdes no mesmo SHA candidato; AID-46 continua como dependência estrutural. Dono do desbloqueio: assignee de AID-59 (Founding Product Engineer), com aceite independente antes de qualquer trabalho de release em AID-47.

**Founding Product Engineer** · 2026-08-29T05:10:52.083799+00:00

Efeito colateral esperado do decreto AID-327/AID-328: o fechamento `done` de AID-46 resolveu o blocker terminal deste issue e o status auto-flipou para `in_progress`. Conforme o decreto, AID-47 será re-triado pelo CEO na janela pós-coorte — nada foi iniciado aqui (nenhum checkout, nenhum trabalho). Rebaixando para `todo` para refletir o estado real e a diretiva; precedência vigente continua com AID-180 (coorte) sobre a fila AID-322.

**Founding Product Engineer** · 2026-08-29T05:34:33.423842+00:00

## Outcome — retomada pós-desbloqueio (AID-46 done, AID-59 done, wake `issue_blockers_resolved`)

Blockers confirmados resolvidos antes de retomar: AID-46 `done`, AID-59 `done` (addendum AID-58 QA_REPORT: branch protection ativa em `main`, checks exigidos sem bypass). Candidate verificado: `origin/main` @ `1fca324`.

### Verificação executada no candidato (evidência local, Node 24.18)

- `vitest run` (host canônico): **47 arquivos / 283 testes passaram** (inclui suites de analytics e do bridge).
- Gates de analytics: `events.test.ts` **61/61** com thresholds 100% (lines/branches/functions/statements); complexidade `maxCC=8 limit=8`.
- Smokes estáticos do piloto (`playwright.pilot.config.ts`): **3/3** — missão hospedada IA Prática monta do build empacotado; simulacao hospedada relata verificador honestamente; retry corrigido WAREHOUSE supersede estado falho.
- Trio de readiness (dev-server): **5/5** — chapter-continuity (capítulos de 3 missões das duas trilhas preservados em switches/reloads), readiness-recovery, renderer-fallback.
- Activation funnel: **2/2 após o fix abaixo** — ambas as rotas assertam schema content-free (`FORBIDDEN_ANALYTICS_FIELDS` ausentes: sem respostas de lição, sem texto livre).
- Sem alteração de mastery: smokes assertam `sem alteração local` / `O gate canônico continua separado`; nenhum arquivo de `learner/` tocado.

### Defeito real encontrado e corrigido — PR https://github.com/dandpb/aidevschool/pull/183 (branch `aid-47/dev-funnel-realign-release-runbook`, commit `f4640b9`)

1. **Funil de ativação Dev quebrado desde `741140f` (2026-08-22), fora da cobertura selecionada da CI**: `tests/activation-funnel.smoke.spec.ts:88` ainda clicava o botão removido `Trilha técnica ... Dev`. O shell atual publica uma única sequência (IA Prática primeiro; trilha Dev = capítulo "Simulações hospedadas"). Realinhei o spec: sinal comportamental de intenção técnica (`onboarding.completed` com `recommendationChanged: true`, seleção permanece `ai-pratica`), entrada no primeiro capítulo Dev pelo mapa publicado, mesmas asserções de ordem/funnel content-free para `trackId: dev`. Confirmado por probe: eventos `mission.started/structured_attempt.submitted/passed/mission.completed` com contexto `trackId: dev`, `engineId: voxelDojo`, `contentVersion: game-02-warehouse@0.1.0`.
2. **Gap de entregável AID-47 — metadados de release e rollback**: adicionado `engines/codexdojo-os-prototype/RELEASE.md` (SHA candidato; versões de conteúdo pinadas em `config/mission-bindings.yaml` → projeção gerada `src/data/missions.ts`; stamps `engineVersion`/`contentVersion` por evento; promoção via `build:pilot` + pre-check remoto `QA_BASE_URL`; rollback estático com invariantes explícitas — progresso device-local sobrevive, estado canônico nunca escrito pelo OS, batches analytics permanecem content-free e version-stamped). README linka o runbook.

### Limitação / próximo passo de release (fora do fechamento desta issue)

- O pre-check remoto (`npm run test:smoke:remote` contra deploy publicado) roda no momento da promoção, conforme RELEASE.md; não há deploy novo a validar agora.
- Nota de ambiente: a execução local exigiu neutralizar a injeção de `NODE_ENV=production` pelo harness (`/paperclip/.npmrc` `omit=dev` → npm injeta NODE_ENV), mesma classe de interferência documentada no QA report AID-58; CI não é afetada.

### Disposição

`in_review`: PR #183 aberto contra `main` protegida, revisor `dandpb` solicitado, checks de CI em execução. Não faço merge sem aprovação independente (producer != verifier). Aceite independente do PR + checks verdes fecham esta issue; qualquer defeito volta como comment aqui.

**Founding Product Engineer** · 2026-08-29T05:38:40.907671+00:00

Update do estado de revisão: todos os 34 checks do PR #183 passaram no SHA `f4640b9` — incluindo `codexdojo-os (TS)` (2m32s, cobre lint/unit/build/pilot smokes/readiness no CI), `literacyDojo (TS + content)`, `Python (learner + curriculum shared)` e `product readiness (claims)`. Resta apenas a aprovação independente do revisor (`dandpb`, solicitada) e o aceite do request_confirmation pendente neste issue para eu fechar AID-47 como done.

**Founding Product Engineer** · 2026-08-29T11:42:47.929782+00:00

## Fechamento — aceite independente recebido

O `request_confirmation` (id `9e88ef86-5a5f-4f14-b2c4-09ca1184d0a1`) foi **aceito por usuário** em 2026-08-29T11:34:30Z (`resolvedByUserId` definido, outcome `accepted`), satisfazendo a exigência de aceite independente antes do fechamento.

### Ação de manutenção pós-aceite (mantém o entregável honesto)

Após o aceite, o `main` avançou com o bridge same-origin AID-305 e o pipeline de bundle do piloto. O PR #183 estava `BEHIND` (proteção strict exige atualização) e meu RELEASE.md descrevia o modelo de deploy antigo ("sem bridge no deploy estático" — agora falso). Executei:

1. `update-branch` do PR #183 → merge de `main` em `8ce74ca` (limpo, sem conflito).
2. Realinhei `engines/codexdojo-os-prototype/RELEASE.md` ao pipeline vigente: bundle manifest-gated (`pilot-bundle-manifest.json` com `sourceRevision` + hashes SHA-256 por superfície), verificador staged byte-idêntico a `learner/gate/netlify-functions/`, promoção via `build:pilot` → `deploy:pilot` (aborta em drift), rollback pelo mesmo pipeline; corriji a frase stale do `README.md` sobre bridge inexistente em deploy estático. Commit `8e4740f`.
3. Verificação: `node --test scripts/pilot-bundle-lib.test.mjs` pass; CI do PR #183 em `8e4740f`: **todos os checks verdes** (codexdojo-os 2m46s, literacyDojo 1m28s, product readiness, Python shared, entre outros).

### Estado final

- PR https://github.com/dandpb/aidevschool/pull/183 aberto em `8e4740f`, MERGEABLE, aguardando apenas a revisão GitHub do revisor solicitado (`dandpb`) para merge — não faço merge de `main` protegida sem essa aprovação.
- Critérios AID-47 cumpridos com evidência executável (comentários anteriores): ambas as rotas passam no candidato (pilot smokes 3/3, readiness 5/5, activation funnels 2/2), analytics privacy-safe (schema enumerado, 100% cobertura, `FORBIDDEN_ANALYTICS_FIELDS` ausentes), sem alteração de mastery (`sem alteração local`; nenhum arquivo `learner/` tocado), metadados de release e rollback documentados no RELEASE.md agora alinhado ao deploy real.
- Limitação registrada: pre-check remoto (`QA_BASE_URL`) roda por ocasião de cada promoção, conforme RELEASE.md.

Marco AID-47 como `done`. O merge do PR #183 permanece no fluxo do revisor; qualquer revisão rejeitada reabre trabalho aqui.

---

