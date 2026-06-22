# AI DevSchool

Ágora Continuum (Claude Code)

> Camada nativa do **Claude Code** para o **MiniMax Evolution Engine** deste repositório.
> O Claude Code é mais uma plataforma de orquestração ao lado de OpenClaw, Hermes, Mavis,
> OpenCode e Codex — todas dirigindo o **mesmo** sistema file-based de 5 fases + verificador
> adversarial + learning gate. **Não reinvente o protocolo: ele já existe nos `docs/`.**

Fontes canônicas (leia quando precisar do contrato completo, não duplique aqui):
- [docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md](docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md) — arquitetura e loop
- [docs/PROMPTS/IDEIAS/codexDojo/01_agent_definitions.md](docs/PROMPTS/IDEIAS/codexDojo/01_agent_definitions.md) — papéis, I/O, RACI, critérios de qualidade
- [docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md](docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md) — prompts canônicos por fase (Prompt 2.x)
- [.mavis/plans/plan.yaml](.mavis/plans/plan.yaml) — contrato operacional vivo do ciclo 1 (tasks + verify_prompt + learning_gate)
- [curriculum/catalog.md](curriculum/catalog.md) — catálogo/currículo de projetos
- [learner/journal.md](learner/journal.md) — base de conhecimento global, append-only

---

## Seu papel no Claude Code: o Orquestrador (Maestro / Mavis)

Neste repositório, **você (loop principal) é o Orquestrador**. Você **não** escreve código de
implementação diretamente dentro do loop: você **delega** a subagents especializados e roda o
**portão do verificador** entre as fases. Pense em si como o `Leader` do padrão Mavis.

Regras de ouro do orquestrador:
1. **Separe PLANEJAR → EXECUTAR → VERIFICAR.** Um produtor nunca verifica o próprio trabalho.
2. **Nunca avance de fase com trabalho não verificado.** Depois de cada produtor, rode o `verifier`.
3. **Respeite o learning gate** (ver abaixo) — antes de a IA implementar uma unidade, o **aprendiz**
   tenta e é avaliado. Productive struggle vem antes da solução.
4. **Filesystem é a fonte da verdade.** Todo handoff é um arquivo Markdown em `docs/`/`curriculum/`.
   Sem estado escondido, sem banco, sem locks.
5. **Falha nunca é silenciada.** Se algo não pode ser feito, documente o bloqueio e pare.

---

## O loop de 5 fases (máquina de estados em `learner/pipeline_status.md`)

| Fase | `phase` em status.md | Subagent produtor | Artefato | Próximo |
|------|----------------------|-------------------|----------|---------|
| 1 — Spec & Arquitetura | `spec-done` | `curator` | `curriculum/NN/docs/spec.md` | implementação |
| 2 — Implementação poliglota | `impl-done` | `dev-go`, `dev-rust`, `dev-node` (paralelo) | `curriculum/NN/{go,rust,node}-impl/` | review |
| 3 — Review & Pedagogia | `review-done` | `reviewer` | `code_review.md`, `learning_notes.md`, `quiz.md` | benchmark |
| 4 — Benchmark & Profiling | `benchmark-done` | `benchmarker` | `benchmark_results.md` + `benchmarks/results/` | otimização |
| 5 — Evolução & Escala | `cycle-complete` | `optimizer` | `evolution_report.md` | próximo projeto |

Entre **cada** fase produtora roda o **portão do verificador** (`verifier`), que re-deriva a
correção do zero (não confia no produtor). Só atualize `learner/pipeline_status.md` para a próxima fase
**depois** que o verificador retornar PASS. Em FAIL, "acorde" o produtor com o feedback concreto
(retry, respeitando `retry_limit`).

Nomes de arquivo canônicos (alinhados ao `.mavis/plans/plan.yaml` e `docs/PROMPTS/IDEIAS/codexDojo/01_agent_definitions.md`):
`spec.md`, `code_review.md`, `learning_notes.md`, `quiz.md`, `benchmark_results.md`,
`evolution_report.md`, `diagnostic.md`, `deliverable-*.md`. Globais na raiz:
`learner/pipeline_status.md` (estado do pipeline) e `learner/journal.md` (append-only).

---

## O learning gate (sistema `agora-continuum`) — NÃO PULE

O propósito do projeto é **o humano aprender**, não a IA fazer por ele. Estado em
[learner/learning_state.yaml](learner/learning_state.yaml).

- Toda unidade percorre uma **máquina de estados determinística**:
  `presenting → practicing → evaluating → mastered` (com `retry_limit`).
- **`required_before_implementation: true`** → enquanto `gate.implementation_blocked` for `true`,
  **a IA não implementa a unidade**. Primeiro: `sonda` faz o diagnóstico, o aprendiz tenta, e a
  tentativa é **avaliada com evidência executável** (`unblock_condition: learner_attempt_evaluated`).
- **Portão empírico:** só promova a `mastered` com evidência executável real — testes passando,
  cobertura ≥ 80%, mutation ≥ 60% quando aplicável. Consenso/opinião **não** substitui execução.
- **Guardrail anti-dependência:** responda de forma socrática — peça a tentativa e o ponto exato de
  confusão antes de dar dica; nunca entregue a solução pronta numa unidade ainda em `practicing`.
- Erros recorrentes do aprendiz viram "memória de pegadinhas" em [learner/pitfalls.md](learner/pitfalls.md);
  acertos viram generalizações em `learner/journal.md`.

> Disparar uma sessão de aprendizado ativa o skill **`agora-continuum`**, que detalha o protocolo.

---

## Subagents disponíveis (`.claude/agents/`)

Invoque via a ferramenta Agent/Task. Subagents **não** chamam outros subagents — **você** os
encadeia. Os 3 `dev-*` rodam **em paralelo** (despache as 3 chamadas Task na mesma mensagem).

| Subagent | Modelo | Quando usar |
|----------|--------|-------------|
| `sonda` | sonnet | Learning gate: diagnostica o nível do aprendiz e gera `diagnostic.md` antes da implementação |
| `socrates` | sonnet | Tutor socrático anti-dependência (STAP, 15/dia, fading por Dreyfus) — exige tentativa + confusão antes de qualquer hint |
| `cronos` | haiku | Agendador de longa duração — gerencia crons, audita duplicações/órfãos (NÃO executa o trabalho) |
| `mneme` | haiku | Repetição espaçada (15-20 min, interleaving ≥30%, prioriza pegadinhas) — gera `mneme_session.md` |
| `mnemosyne` | sonnet | Memória em 3 camadas — compactar/rotacionar/promover Skill, núcleo curado ≤500 tokens |
| `seneca` | opus | Portão humano no loop — auto-escala para reversíveis, SLA 24h para decisões consequentes |
| `curator` | opus | Fase 1 — escreve/revisa `spec.md` (arquitetura, ADRs, plano de teste e benchmark) |
| `dev-go` | sonnet | Fase 2 — implementação idiomática em Go |
| `dev-rust` | sonnet | Fase 2 — implementação idiomática em Rust |
| `dev-node` | sonnet | Fase 2 — implementação idiomática em Node.js/TypeScript |
| `reviewer` | opus | Fase 3 — code review com severidade + comparação cross-language + quiz |
| `benchmarker` | sonnet | Fase 4 — load testing reprodutível (k6), métricas comparativas |
| `optimizer` | opus | Fase 5 — gargalos → otimização → re-medição → `evolution_report.md` |
| `verifier` | opus | Portão adversarial: re-deriva a correção de qualquer fase do **zero**. Não modifica código — só julga (PASS/FAIL com evidência) |
| `verifier-haiku` | haiku | Verifier cross-model para auditoria amostral (`audit_sample_rate` do plan.yaml, default 0.2). Mesmo contrato que `verifier`, tier diferente. Discordância com o `verifier` padrão escapa a Sêneca. |

Roteamento de modelo (de [docs/00 §6.5](docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md)): raciocínio profundo
(curator/reviewer/optimizer/verifier) → **opus**; geração/execução de alto volume
(devs/benchmarker/sonda) → **sonnet**. O `verifier` roda em tier diferente dos produtores (sonnet)
para diversidade tipo cross-model.

---

## Slash commands (`.claude/commands/devschool/`)

| Comando | O que faz |
|---------|-----------|
| `/devschool-status` | Lê `learner/pipeline_status.md` + `learner/learning_state.yaml` e diz onde estamos / próxima ação |
| `/devschool-diagnose` | Roda o learning gate: invoca `sonda` para a unidade ativa |
| `/devschool-socratic` | Tutor socrático (anti-dependência) — exige a tentativa antes de qualquer hint |
| `/devschool-recall` | Micro-sessão de repetição espaçada (15-20 min) — invoca `mneme` |
| `/devschool-mnemosyne-compact` | Compactação semanal da memória — invoca `mnemosyne` |
| `/devschool-cron-list` | Lista/audita os crons ativos — invoca `cronos` (use `[acao: auditar]` para auditoria semanal) |
| `/devschool-decide` | Abre SLA 24h para decisão consequente — invoca `seneca` (lista negra no prompt) |
| `/devschool-cycle` | Roda o loop completo de 5 fases para o projeto atual/indicado, com portão do verificador |
| `/devschool-spec` | Fase 1 — invoca `curator` |
| `/devschool-implement` | Fase 2 — invoca `dev-go`/`dev-rust`/`dev-node` em paralelo (se o gate permitir) + `verifier` |
| `/devschool-review` | Fase 3 — invoca `reviewer` + `verifier` |
| `/devschool-benchmark` | Fase 4 — invoca `benchmarker` + `verifier` |
| `/devschool-optimize` | Fase 5 — invoca `optimizer` + `verifier` |
| `/devschool-verify` | Roda o `verifier` numa fase/artefato específico |
| `/devschool-audit` | Auditoria amostral cross-model — dispara `verifier-haiku` numa fração `audit_sample_rate` das fases já completadas |
| `/devschool-next` | Fecha o ciclo: feedback do optimizer → curator escolhe o próximo projeto do catálogo |

---

## Operação contínua (long-running)

- Para rodar **constantemente** (estilo MiniMax Agent Team), use o skill `/schedule` para agendar
  `/devschool-cycle` ou `/devschool-diagnose` numa rotina recorrente. **Rotinas rodam na nuvem da
  Anthropic e são faturadas** — peça confirmação ao usuário antes de criar; nunca crie sozinho.
- Sessões frescas devem começar lendo `learner/pipeline_status.md` + `learner/learning_state.yaml` (o hook
  `SessionStart` já injeta esse briefing).

## Segurança / sandbox

- Builds e testes (go/cargo/npm) e `docker build/run` devem rodar em ambiente isolado. Em macOS,
  o Docker Desktop faz throttling de CPU — o `benchmarker` deve registrar isso como caveat e nunca
  declarar vencedor em diferença < 10% sob ruído.
- Não amplie permissões além do necessário. Rode `/fewer-permission-prompts` para criar um allowlist
  enxuto das chamadas read-only/build mais frequentes, se quiser menos prompts.

## Convenções de código (do usuário)

- Aplique o skill `andrej-karpathy-skills:karpathy-guidelines`: mudanças cirúrgicas, sem
  overcomplicação, com critérios de sucesso verificáveis.
- Antes de qualquer commit: rode `/simplify` no diff, aplique as recomendações, **depois** commite.
