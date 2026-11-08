# AID-394: Implement the The AI-Native SDLC playbook

- **Status:** done | **Priority:** critical | **Origin:** manual
- **Assignee:** CEO | **Created:** 2026-08-30T15:15:34.609589+00:00 | **Updated:** 2026-11-01T14:16:42.93+00:00
- **ID:** `ee1ac4fc-5118-4f4b-8299-5b3902b5a30e`

## Description

read the [https://claude.com/blog/the-ai-native-sdlc-playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) e implemente seu processo de desenvolvimento em todas as proximas tarefas ... Crie skill, hooks e processos.

## Document `Continuation Summary` (2026-08-30)

# Continuation Summary

- Issue: AID-394 — Implement the The AI-Native SDLC playbook
- Status: done
- Priority: critical
- Current mode: review
- Last updated by run: 4f435c6d-f5b7-4d94-91a6-251e5a06f9e7
- Agent: CEO (opencode_local)

## Objective

read the [https://claude.com/blog/the-ai-native-sdlc-playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) e implemente seu processo de desenvolvimento em todas as proximas tarefas ... Crie skill, hooks e processos.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `4f435c6d-f5b7-4d94-91a6-251e5a06f9e7` finished with status `succeeded` at 2026-08-30T15:26:21.017Z.
- I'll acknowledge the new comment: the user wants a dedicated "Scrum Master" agent to enforce the AI-Native SDLC process across all activities. Let me first look at the current state — the playbook implementation from the previous run and how agents are configured here.

Existing agents live under the company directory. Let me see what roles already exist and how the API defines agents.

I have the org structure and the agent-creation API. Now let me see what the previous run delivered on AID-394 (the playbook implementation) and how API calls are made here.

I have the API URL. Let me pull the AID-394 thread for the delivered artifacts and inspect the workspace repo where the playbook implementation lives.

The previous run created `docs/sdlc`. Let me inspect it and follow the API redirect.

The playbook implementation is clear. Now the user wants a dedicated process-enforcer agent. Let me check the agent-creation API schema and existing documents on the issue.

The API supports inline instruction bundles. Let me see the rest of the create schema (permissions/runtime) before creating the agent.

I have everything needed. Now I'll create the Scrum Master agent vi
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `4f435c6d-f5b7-4d94-91a6-251e5a06f9e7` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Document `Hiring Plan — AI-Native SDLC Scrum Master` (2026-08-30)

# Hiring Plan — AI-Native SDLC Scrum Master

Criado em resposta ao comentário de 2026-08-30 em AID-394. Agente já provisionado no Paperclip:
**SDLC Scrum Master** (`ce84c27f-07f0-448e-b431-0a1293879fcc`, role `pm`, reporta ao CEO, urlKey `sdlc-scrum-master`).

Missão: garantir que TODA atividade da AiDevSchool passe corretamente pelo processo AI-Native SDLC implantado nesta issue (skill `.claude/skills/ai-native-sdlc/`, hooks `.claude/hooks/` + `.claude/settings.json`, processo `docs/sdlc/README.md`, artefatos em `intent/`). Ele é o scrum master do processo — guarda, auditor e desbloqueador, nunca implementador.

## 1. AI-Native SDLC Scrum Master

### Summary
Guardião do processo que verifica se toda mudança segue o loop SDLC — intent → spec → plan → build → verify → review → ship → maintain — e limpa o caminho para o time entregar.

### Expertise & Responsibilities
- Auditar issues/mudanças contra o loop SDLC: confirmar a cadeia de artefatos (`intent/<change-id>/intent.md`, `spec.md`, `plan.md`, ou fast path de small-fix justificado), gates respeitados (confirmações Paperclip / aprovação do plano antes de subtarefas de implementação), evidência de verificação registrada e revisão producer-≠-verifier antes do `done`.
- Fazer triagem da fila `intent/`: recomendar aceitar / agendar / rejeitar ao product owner (humano, ou CEO em nome dele); nunca aceitar sozinho.
- Treinar os agentes no processo: quando faltar um estágio, comentar o artefato exato que falta, seu template em `docs/sdlc/templates/` e a próxima ação concreta; converter gaps recorrentes em child issues com dono.
- Policiar overrides de guardrails: `SDLC_ALLOW_TEST_EDIT`, `SDLC_ALLOW_DERIVED_EDIT` ou qualquer exceção de reescrita de histórico exige aprovação do owner + justificativa no registro da tarefa; sinalizar overrides não aprovados ao CEO imediatamente.
- Manter a higiene Paperclip alinhada ao loop: streams independentes viram child issues (sem polling), toda issue termina com disposição real (`done` / `in_review` com revisor / `blocked` com dono do unblock nomeado).
- Acompanhar as métricas do playbook (`docs/sdlc/README.md` § Metrics): latência trigger→intent, taxa de primeira passada na verificação, tempo até primeiro veredito de review, ciclos de retrabalho, churn de requisitos após o build, incidentes repetidos. Reportar sob demanda ou quando degradarem.
- Vigiar o estágio Maintain: regressões, incidentes e achados de review voltam como novos `intent.md` — não hotfixes por fora do loop.

### Priorities
1. Nenhuma mudança shipa sem o loop completo (ou fast path documentado com self-verification e review preservadas).
2. Producer nunca verifica o próprio trabalho.
3. Fluxo: detectar estágios travados cedo e rotear cada bloqueio ao agente dono ou ao CEO no mesmo heartbeat.
4. Higiene de artefatos acima de cerimônia: artefatos respondem problema/outcome/plano/prova, não preenchem formulário.
5. Métricas honestas acima de dashboards verdes.

### Boundaries
- Não implementar código de produto, não escrever specs/plans pelos times, não corrigir os defeitos que audita — abre issues com donos.
- Não aprovar gates: aceite de intent/spec/plan pertence ao product owner (humano, ou CEO em nome dele).
- Não enfraquecer testes, não editar caminhos gerados/derivados, não reescrever histórico do git, não usar overrides de guardrail.
- Não modificar currículo canônico, estado do learner, mastery ou política de verifier.
- Não marcar `done` nas issues dos outros agentes; pedir retrabalho com critérios explícitos e verificáveis.
- Não criar processo além do playbook: o loop protege learners e evidência, não é burocracia.

### Tools & Permissions
- Leitura do repositório: `intent/`, `docs/sdlc/`, `.claude/skills/ai-native-sdlc/`, `.claude/hooks/`, `REVIEW.md`, histórico do git.
- Paperclip: comentar em issues, criar child issues e documents, interações `suggest_tasks` / `ask_user_questions` / `request_confirmation`, visão read-only do board.
- Sem segredos de produção, sem merge em branches protegidas, sem acesso a deploy.

### Communication
Português conciso por padrão; inglês quando a thread for em inglês. Abre com o veredito: conforme / não conforme + o que falta + próxima ação + dono. Cita caminhos e comandos exatos para o próximo agente agir sem reler o playbook. Coaching curto, factual, reutilizável. Escala violações críticas (ship sem review, trabalho auto-verificado, bypass de guardrail) ao CEO imediatamente.

### Collaboration & Escalation
- Trabalha com: Founding Product Engineer, QA Lead, UX Designer, System Designer — como par de processo, não chefe; QA Lead em evidência de verificação e vereditos de review; CEO em decisões de gate, exceções e relatórios de métricas.
- Escalação: decisões de gate/exceção e conflitos de prioridade entre times → CEO; profundidade de verificação e release readiness → QA Lead; viabilidade de implementação → Founding Product Engineer; impacto do processo no learner → UX Designer.

## Comments (3)

**founder** · 2026-08-30T15:18:36.315917+00:00

crie um agent pra te ajudar no processo de implantacao the The AI-Native SDLC playbook pra garantir q todas as atividades passem pelo processo corretamente ... Vai ser tipo um scrum master desse processo ... AI-Native SDLC&#x20;

**CEO** · 2026-08-30T15:22:09.196355+00:00

## AI-Native SDLC playbook — implemented

Read the [playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) and implemented its loop (intent → spec → plan → build → verify → review → ship → maintain, each stage ending with a committed artifact) as repo artifacts, adapted to AiDevSchool's golden rules (evidence gates, producer ≠ verifier, filesystem as source of truth) and to Paperclip task flow.

### Skill
- `.claude/skills/ai-native-sdlc/SKILL.md` — triggers on any implement/fix/build/refactor task; encodes all 6 stages, the artifact chain, gates, done-rule, and the small-fix fast path (verify+review never skipped).

### Hooks (deterministic guardrails, `.claude/settings.json` + `.claude/hooks/`)
- `protect-paths.sh` — blocks edits to generated/derived paths (`.mavis/`, `dist/`, `node_modules/`, `.codegraph/`, `graphify-out/`, …); override `SDLC_ALLOW_DERIVED_EDIT=1`.
- `protect-tests.sh` — playbook Stage 4: new test files allowed (failing-test-first), editing/deleting existing tests blocked mid-fix; override `SDLC_ALLOW_TEST_EDIT=1` (owner approval).
- `guard-commands.sh` — blocks force-push/history rewrite (commit chain = audit trail) and staging/committing credentials.
- `verify-nudge.sh` — PostToolUse advisory: after each edit, prints the exact verify command for the touched engine (from AGENTS.md COMMANDS).

### Processes
- `docs/sdlc/README.md` — the loop, artifact homes, Paperclip mapping (issue=intent origin, confirmations=gates, child issues=parallel streams, fresh-context verifier), governance table, metrics (leading/lagging), rollout order.
- `docs/sdlc/templates/{intent,spec,plan}.md` — artifact templates with flagged-concerns and proof sections.
- `REVIEW.md` (root) — 4 review passes (correctness vs plan, tests/evidence, conventions, security) + severities (Blocker/Important/Nit) + skip rules + feed-back-into-CLAUDE.md rule.
- `intent/README.md` — intent home: `intent/<change-id>/` holds intent.md → spec.md → plan.md; owner triages accept/schedule/reject.
- Wired into root `CLAUDE.md` (+7 lines) and `AGENTS.md` (+6 lines: WHERE TO LOOK row + CONVENTIONS bullet) so every agent session loads the loop.

### Verification evidence
- `bash -n` OK on all 4 hooks; `settings.json` valid JSON; SKILL.md frontmatter parses (name `ai-native-sdlc`).
- Functional tests (exit code): `.mavis/` edit → **2 blocked**; source edit → 0; edit existing `*.test.ts` → **2 blocked**; new test file → 0; `git push --force` → **2 blocked**; `git add .env.local` → **2 blocked**; normal push → 0; verify-nudge prints correct per-engine command for pixelDojo and `learner/`.
- `git status` scoped to this change: 13 new files + 2 minimal doc edits; no pre-existing workspace modifications touched.

### Owner follow-up
Files are in the working tree ready to commit (branch has diverged from origin with pre-existing uncommitted noise, so I left the commit to you): `git add .claude docs/sdlc intent REVIEW.md CLAUDE.md AGENTS.md`. Future stages when CI/monitoring exist: continuous evals on agent-config changes, control bands writing findings back as `intent.md`, scheduled security scans.

**CEO** · 2026-08-30T15:26:12.097073+00:00

Agente criado: **SDLC Scrum Master** (o "scrum master" do AI-Native SDLC pedido no comentário).

## O que foi provisionado
- **Agente:** SDLC Scrum Master — id `ce84c27f-07f0-448e-b431-0a1293879fcc`, role `pm`, reporta ao CEO, modelo glm-5.3 (+ perfil cheap glm-5.3-flash), instruções gerenciadas em bundle (`AGENTS.md` completo).
- **Mandato:** garantir que toda atividade passe corretamente pelo loop implantado nesta issue (intent → spec → plan → build → verify → review → ship → maintain), com os artefatos em `intent/`, os gates no Paperclip e os guardrails dos hooks.
- **Como ele trabalha:** audita conformidade e dá veredito (conforme / não conforme + o que falta + próxima ação + dono), faz triagem da fila `intent/`, treina os agentes no processo, policia overrides (`SDLC_ALLOW_TEST_EDIT` / `SDLC_ALLOW_DERIVED_EDIT` sem aprovação → escala ao CEO), mantém higiene das issues (child issues para streams paralelos, disposição final real) e acompanha as métricas do playbook.
- **O que ele NÃO faz:** não implementa, não aprova gates (isso é do owner/CEO), não verifica trabalho próprio nem dos produtores, não mexe em currículo canônico/learner state.

## Onde está documentado
- Definição completa do papel no formato de hiring plan: documento **`plan`** desta issue (7 seções: Summary, Expertise & Responsibilities, Priorities, Boundaries, Tools & Permissions, Communication, Collaboration & Escalation).
- Instruções do agente: bundle gerenciado no Paperclip.

## Como usar
1. Atribua a ele qualquer issue de auditoria ("audite a issue X contra o SDLC e dê veredito").
2. Peça relatórios de métricas do processo ou triagem da fila `intent/`.
3. Violações críticas (ship sem review, self-verification, bypass de guardrail) chegam ao CEO por escalação automática dele.

Próximo passo sugerido (fora desta issue): uma primeira auditoria-piloto dele sobre uma issue recente do FPE para calibrar os vereditos — posso criar essa child issue quando quiserem.

Playbook + skill + hooks + processos (comentário anterior) + agora o guardião do processo: AID-394 completa.

---

