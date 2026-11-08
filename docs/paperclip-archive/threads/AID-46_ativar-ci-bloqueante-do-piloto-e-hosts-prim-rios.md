# AID-46: Ativar CI bloqueante do piloto e hosts primários

- **Status:** done | **Priority:** critical | **Origin:** manual
- **Assignee:** Founding Product Engineer | **Created:** 2026-08-22T14:03:30.602439+00:00 | **Updated:** 2026-11-01T14:16:48.495+00:00
- **ID:** `e87983a9-8d7f-4dca-8dfa-7fa9f87b7980`

## Description

Desbloqueio operacional da cadeia de lançamento. Use os contratos já concluídos em AID-28, AID-30, AID-31 e AID-32. Implementar e documentar geração, lint, testes unitários, build e E2E proporcional para LiteracyDojo, host canônico, core Python compartilhado e superfícies primárias/embutidas do caminho de release; excluir explicitamente superfícies experimentais/arquivadas. Corrigir ou abrir defeitos filhos para falhas reais. Critérios: comandos reproduzíveis; checks bloqueiam merge; evidência mínima registrada; sem alterar learner state ou política de mastery. Esta tarefa supersede operacionalmente a AID-33, que está fora do boundary deste projeto.

## Document `Continuation Summary` (2026-08-22)

# Continuation Summary

- Issue: AID-46 — Ativar CI bloqueante do piloto e hosts primários
- Status: in_review
- Priority: critical
- Current mode: review
- Last updated by run: a3cf63d9-945e-404e-ada3-2dfb66b525f5
- Agent: Founding Product Engineer (codex_local)

## Objective

Desbloqueio operacional da cadeia de lançamento. Use os contratos já concluídos em AID-28, AID-30, AID-31 e AID-32. Implementar e documentar geração, lint, testes unitários, build e E2E proporcional para LiteracyDojo, host canônico, core Python compartilhado e superfícies primárias/embutidas do caminho de release; excluir explicitamente superfícies experimentais/arquivadas. Corrigir ou abrir defeitos filhos para falhas reais. Critérios: comandos reproduzíveis; checks bloqueiam merge; evidência mínima registrada; sem alterar learner state ou política de mastery. Esta tarefa supersede operacionalmente a AID-33, que está fora do boundary deste projeto.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `a3cf63d9-945e-404e-ada3-2dfb66b525f5` finished with status `succeeded` at 2026-08-23T15:05:22.102Z.
- AID-88 forneceu GO independente para a PR #161, com quatro checks verdes e OpenClaw comprovadamente read-only.

A PR ainda está bloqueada por revisão humana e `main` mantém o comportamento antigo. Abri confirmação formal para aprovação e merge protegido, sem bypass.

AID-46 permanece `in_review`; após o merge, falta correlacionar o run de `push` no SHA integrado.

## Files / Routes Touched

- `.github/workflows/ci.yml`
- `scripts/run-engine-lab.mjs`

## Commands Run

- Heartbeat run `a3cf63d9-945e-404e-ada3-2dfb66b525f5` invoked adapter `codex_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Comments (9)

**Founding Product Engineer** · 2026-08-22T14:08:28.881063+00:00

Implementação do gate do piloto concluída e encaminhada para revisão/ativação protegida.

Mudanças:
- `.github/workflows/ci.yml`: quatro checks bloqueantes estáveis — `pilot / LiteracyDojo`, `pilot / canonical host`, `pilot / shared Python`, `pilot / release E2E`; jobs Go/Rust seguem informativos.
- `engines/codexdojo-os-prototype/playwright.release.config.ts` + script `test:release`: smoke dedicado às duas jornadas do piloto em 1280 e 375 px, subindo apenas OS, LiteracyDojo e `game-02/03/05`.
- `docs/runbooks/RELEASE_CI.md`: comandos reproduzíveis, boundary explícito e procedimento de branch protection/revisão independente.

Evidência desta execução:
- `git diff --check`: PASS.
- parse YAML + dependências de jobs: PASS.
- `npx playwright ... --list`: 4/4 casos enumerados.
- lint do host: exit 0, com 26 warnings CSS preexistentes.
- smoke real: topologia subiu; 4 casos não iniciaram porque o runner não possui Chromium (`chromium_headless_shell-1228`). O workflow instala `playwright install --with-deps chromium`; não há alegação de passe E2E local.

Nenhum learner state, projeção gerada, gate ou política de mastery foi alterado. Superfícies internas/incubating/arquivadas e catálogo Voxel não vinculado permanecem fora do gate.

Revisão/ação pendente: interação `45c0ee6e-ec24-4432-97c4-7e4a30e1b8ac` solicita aprovação do CEO para tornar os quatro nomes obrigatórios em `main`, sem bypass. Após aprovação, o owner de repositório deve aplicar branch protection e um revisor independente deve anexar URL/SHA do primeiro run e provar que falha impede merge.

**founder** · 2026-08-22T19:08:25.138596+00:00

NO-GO crítico na revisão independente AID-58. Matriz local equivalente passou (Literacy: 81 unit + 6 E2E; host: 215 testes + build; Python: 51+151; release E2E: 4/4 desktop/mobile), porém main não tem branch protection e o run remoto mais recente (https://github.com/dandpb/aidevschool/actions/runs/32586620642, SHA 3586cb5) ainda usa o workflow antigo. Defeito delegado em null. Relatório: work-products/AID-58/QA_REPORT.md. AID-46 não está aprovada; AID-47 não deve ser liberada.

**founder** · 2026-08-22T19:09:05.854728+00:00

Complemento: defeito Sev 1 criado como AID-59 e atribuído ao Founding Product Engineer.

**Founding Product Engineer** · 2026-08-22T19:09:58.705757+00:00

NO-GO da AID-58 aceito como autoridade independente. A matriz funcional local passou, mas isso não satisfaz “bloqueia merge”: `main` continua sem protection/ruleset e o run remoto 32586620642/SHA `3586cb5` executou o workflow anterior.

Ação concreta desta rodada:
- criei AID-60 como filho crítico de AID-46, atribuído ao CEO/admin, para publicar o candidato via branch/PR, obter os quatro checks no mesmo SHA, proteger `main` sem bypass e demonstrar bloqueio/liberação em PR controlado;
- abri a confirmação `2dc2522c-8c2f-47df-be38-e3adb0cb9e40`, pois branch protection exige aprovação do CEO;
- mantive AID-47 explicitamente sem liberação até novo GO do QA Lead.

Unblock owner/action: CEO executa AID-60 após confirmar; QA Lead repete a verificação e registra URL, SHA, configuração e teste negativo de merge. AID-46 permanece sem aprovação e não há alegação de CI bloqueante neste estado.

**Founding Product Engineer** · 2026-08-22T19:10:41.857114+00:00

Complemento incorporado: AID-59, não AID-60, é o Sev 1 canônico e está atribuído ao Founding Product Engineer. Registrei em AID-59 o blocker explícito (aprovação/ação do CEO via confirmação 2dc2522c-8c2f-47df-be38-e3adb0cb9e40) e mantive AID-46 bloqueada. AID-60 é duplicata atribuída ao CEO; meu ator não tem autorização para cancelá-la, então o CEO é o owner dessa higiene.

**Founding Product Engineer** · 2026-08-23T05:05:39.256726+00:00

Retomada solicitada após consolidação AID-78. Próxima execução: auditar o restante do escopo de AID-46 contra os quatro checks reais já protegidos e encaminhar a validação independente em AID-48; não refazer AID-59.

**Founding Product Engineer** · 2026-08-23T05:07:08.673766+00:00

Blocker operacional removido e evidência reconciliada.

Verificação direta em 2026-08-23:
- branch protection de `main`: `strict=true`; 1 aprovação; aprovação do último push; conversas resolvidas; regras aplicadas a admins; force-push/delete desabilitados;
- checks requeridos reais: `literacyDojo (TS + content)`, `codexdojo-os (TS)`, `Python (learner + curriculum shared)`, `product readiness (claims)`;
- run remoto 32586620642: `success`, SHA `3586cb587092abea2c4881b2f6a8b926e9487921`; os quatro checks requeridos passaram.

Retirei do worktree somente o candidato local supersedido (`pilot / ...`, config E2E e runbook associados), preservando mudanças concorrentes. Isso evita reintroduzir contexts não publicados e deadlock de merge.

AID-79 foi criada e atribuída ao QA Lead como revisão independente final. AID-46 vai para `in_review`; não há GO de release até o QA registrar GO explícito, incluindo prova de que check vermelho impede merge e auditoria de que CI não escreve learner state/mastery.

**Founding Product Engineer** · 2026-08-23T15:05:17.915451+00:00

GO independente recebido via AID-88/AID-79 para a PR #161, head `73d108f3ec70a36967365b3d51580416d454345d`, run 32627283147. Os quatro checks requeridos estão `SUCCESS`; QA reproduziu OpenClaw read-only (23 testes, preview e guard sem diff em `learner/`) e confirmou proteção sem bypass.

Estado ao reconciliar: PR #161 `OPEN`, `MERGEABLE`, porém `BLOCKED`; `reviewDecision=REVIEW_REQUIRED`, zero reviews. `main` permanece em `3586cb587092abea2c4881b2f6a8b926e9487921`, que ainda contém o comportamento OpenClaw mutante identificado pela QA. Portanto o GO autoriza o fluxo normal, mas AID-46 ainda não pode ser marcada done.

Gate administrativo real: confirmação `3df47f24-99f9-40c0-9cf3-72dc1c8e91c0`. Um revisor GitHub elegível deve aprovar e o CEO/owner deve integrar a PR #161 sem bypass; depois, correlacionar o run de push com o SHA efetivamente integrado. Mudança do head exige nova QA. AID-46 permanece `in_review` e AID-47 só pode avançar após essa correlação.

**Founding Product Engineer** · 2026-08-29T05:09:56.706814+00:00

Fechamento `done` por higiene de board decretada pelo CEO (AID-327/AID-328): cumprida — CI bloqueante ativo e verificado (proteção de `main` sem bypass confirmada pela QA em 2026-08-23; matriz 35/35 em vigor). Verificado agora via API GitHub: merges #179 (`70ba9f34`, contraste AID-298) e #180 (`29e4f9d7`, reflow AID-271) ambos merged — impossível sem os checks requeridos verdes dado branch protection strict. PR #161 (head `73d108f3`) permanece aberta e SUPERSEDED pela cadeia de pins posterior (`ec265fab` → … → `3f641906`); seu GO técnico histórico permanece registrado em `docs/qa/AID-88_CI_FINAL_GO_2026-08-23.md`. Nenhum achado aberto.

---

