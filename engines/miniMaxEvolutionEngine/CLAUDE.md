# AI DevSchool

Ágora Continuum (Claude Code)

> Camada nativa do **Claude Code** para o **MiniMax Evolution Engine** deste repositório.
> O Claude Code é mais uma plataforma de orquestração ao lado de OpenClaw, Mavis,
> OpenCode e Codex — todas dirigindo o **mesmo** sistema file-based de 5 fases + verificador
> adversarial + learning gate. **Não reinvente o protocolo: ele já existe nos `docs/`.**

Fontes canônicas (leia quando precisar do contrato completo, não duplique aqui):
- [docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md](docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md) — arquitetura e loop
- [docs/PROMPTS/IDEIAS/codexDojo/01_agent_definitions.md](docs/PROMPTS/IDEIAS/codexDojo/01_agent_definitions.md) — papéis, I/O, RACI, critérios de qualidade
- [docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md](docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md) — prompts canônicos por fase (Prompt 2.x)
- [.mavis/plans/plan.yaml](.mavis/plans/plan.yaml) — contrato operacional vivo do ciclo 1 (tasks + verify_prompt + learning_gate)
- [curriculum/catalog.md](curriculum/catalog.md) — catálogo/currículo de projetos
- [learner/journal.md](learner/journal.md) — base de conhecimento global, append-only

## Local school supervisor

Always inspect the read-only status first. The supervisor can then perform one bounded tick or watch
local canonical state without installing or creating a service:

```bash
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor status
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor tick
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor poll --interval-seconds 5 --max-interval-seconds 60
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor poll --autonomous --config .mavis/school-supervisor/autonomous.yaml
```

Polling is supervised by default. It publishes one local phase request and leaves it pending for
an operator. `--autonomous` is explicit, disabled unless its existing local config is valid and
enabled, and remains spec-phase-only. It does not provide cross-phase autonomy.

This is a foreground local wrapper, not a daemon or service installer. It creates no cloud
schedules, cron entries, launchd jobs, or runtime configuration. Polling and autonomous execution
never grant mastery: canonical learner gates and independently verified evidence remain required.

Slice 5 is verified with isolated fixtures over the real supervisor composition and injected role
results. This is not a production daemon and does not certify broad cross-phase autonomy: only the
`spec` tracer is autonomous, local, foreground, explicitly enabled, and fixture-verified.

SessionStart only recommends the read-only `/devschool-status` and supervisor `status` surfaces. It
must never invoke `tick`, `poll`, `execute`, recover a lease, resolve a request, clear a blocker, or
start a model process. After interruption, follow the status `action` and `reason`: reconcile only
durably authorized canonical advancement, otherwise fail or block the pending request and resume
only after the recorded cause is repaired.

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
4. **Filesystem é a fonte da verdade.** Todo handoff é um arquivo em `docs/`/`curriculum/` ou no
   outbox operacional documentado. Sem estado escondido e sem banco. O supervisor pode usar uma
   lease JSON curta e exclusiva apenas para impedir ticks concorrentes; ela nunca é autoridade de
   domínio e nunca é roubada silenciosamente.
5. **Falha nunca é silenciada.** Se algo não pode ser feito, documente o bloqueio e pare.

---

## O loop de 5 fases (máquina de estados YAML-first em `learner/pipeline_status.yaml`)

| Fase | `phase` em status.yaml | Subagent produtor | Artefato | Próximo |
|------|----------------------|-------------------|----------|---------|
| 1 — Spec & Arquitetura | `spec-done` | `curator` | `curriculum/NN/docs/spec.md` | implementação |
| 2 — Implementação (node-first) | `impl-done` | `dev-node` (default); `dev-go`/`dev-rust` só pilot `01` ou `--polyglot` | `curriculum/NN/node-impl/` (+ go/rust no pilot) | review |
| 3 — Review & Pedagogia | `review-done` | `reviewer` | `code_review.md`, `learning_notes.md`, `quiz.md` | benchmark |
| 4 — Benchmark & Profiling | `benchmark-done` | `benchmarker` | `benchmark_results.md` + `benchmarks/results/` | otimização |
| 5 — Evolução & Escala | `cycle-complete` | `optimizer` | `evolution_report.md` | próximo projeto |

Entre **cada** fase produtora roda o **portão do verificador** (`verifier`), que re-deriva a
correção do zero (não confia no produtor). Só atualize o status do pipeline para a próxima fase
**depois** que o verificador retornar PASS. Em FAIL, "acorde" o produtor com o feedback concreto
(retry, respeitando `retry_limit`).

Nomes de arquivo canônicos (alinhados ao `.mavis/plans/plan.yaml` e `docs/PROMPTS/IDEIAS/codexDojo/01_agent_definitions.md`):
`spec.md`, `code_review.md`, `learning_notes.md`, `quiz.md`, `benchmark_results.md`,
`evolution_report.md`, `diagnostic.md`, `deliverable-*.md`. Globais na raiz:
`learner/pipeline_status.yaml` é sempre a autoridade de máquina; `learner/pipeline_status.md` é
somente narrativa humana e nunca é parseado como fallback. `learner/journal.md` é append-only.

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
  cobertura ≥ 80%, mutation ≥ `⟨config: gates.mutation_score_min⟩` quando aplicável.
  Consenso/opinião **não** substitui execução.
- **Guardrail anti-dependência:** responda de forma socrática — peça a tentativa e o ponto exato de
  confusão antes de dar dica; nunca entregue a solução pronta numa unidade ainda em `practicing`.
- Erros recorrentes do aprendiz viram "memória de pegadinhas" em [learner/pitfalls.md](learner/pitfalls.md);
  acertos viram generalizações em `learner/journal.md`.

> Disparar uma sessão de aprendizado ativa o skill **`agora-continuum`**, que detalha o protocolo.

---

## Subagents disponíveis (`.claude/agents/`)

Invoque via a ferramenta Agent/Task. Subagents **não** chamam outros subagents — **você** os
encadeia. Default de implementação é **só `dev-node`**. Os 3 `dev-*` em paralelo só no pilot
`01_rate_limiter` ou quando `/devschool-implement --polyglot` for pedido.

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
| `/devschool-status` | Lê `pipeline_status.yaml` (autoridade de máquina) + `learner/learning_state.yaml` e diz onde estamos / próxima ação; Markdown é só narrativa |
| `/devschool-diagnose` | Roda o learning gate: invoca `sonda` para a unidade ativa |
| `/devschool-socratic` | Tutor socrático (anti-dependência) — exige a tentativa antes de qualquer hint |
| `/devschool-recall` | Micro-sessão de repetição espaçada (15-20 min) — invoca `mneme` |
| `/devschool-mnemosyne-compact` | Compactação semanal da memória — invoca `mnemosyne` |
| `/devschool-cron-list` | Lista/audita os crons ativos — invoca `cronos` (use `[acao: auditar]` para auditoria semanal) |
| `/devschool-decide` | Abre SLA 24h para decisão consequente — invoca `seneca` (lista negra no prompt) |
| `/devschool-cycle` | Roda o loop completo de 5 fases para o projeto atual/indicado, com portão do verificador |
| `/devschool-spec` | Fase 1 — invoca `curator` |
| `/devschool-implement` | Fase 2 — invoca `dev-node` (default; polyglot só em `01` ou `--polyglot`) + `verifier` |
| `/devschool-review` | Fase 3 — invoca `reviewer` + `verifier` |
| `/devschool-benchmark` | Fase 4 — invoca `benchmarker` + `verifier` |
| `/devschool-optimize` | Fase 5 — invoca `optimizer` + `verifier` |
| `/devschool-verify` | Roda o `verifier` numa fase/artefato específico |
| `/devschool-audit` | Auditoria amostral cross-model — dispara `verifier-haiku` numa fração `audit_sample_rate` das fases já completadas |
| `/devschool-next` | Fecha o ciclo: feedback do optimizer → curator escolhe o próximo projeto do catálogo |

---

## Operação contínua (long-running)

- `rtk python3 -m engines.miniMaxEvolutionEngine.supervisor tick` executa uma decisão limitada e pode
  publicar uma solicitação supervisionada em `.mavis/school-supervisor/outbox/pending/`. Nesta etapa, o
  supervisor **não executa** slash commands: uma sessão interativa ou operador consome a solicitação.
  Cada solicitação usa somente o comando e os papéis da tabela de fases e exige um contexto novo
  para o verifier.
- `status` combina estado canônico, lease, ledger, tentativa e solicitação pendente sem escrever;
  `complete`, `fail` e `block` encerram uma solicitação sem avançar estado canônico. `reconcile`
  reconhece avanço já persistido, `abandon` recupera um planejamento interrompido antes da publicação,
  e `resume` limpa o bloqueio operacional da fase atual. `recover-lease` só remove uma lease expirada
  cujo processo não mantém mais o lock; nunca há roubo silencioso.
- `learner/pipeline_status.yaml` e `learner/learning_state.yaml` continuam sendo a autoridade
  canônica. Ledger e outbox são histórico operacional e nunca concedem mastery. Somente o adapter,
  após autorização durável de verifier PASS e nova comparação canônica, pode persistir o próximo
  `phase`; ele nunca altera estado do aprendiz. Um ciclo completo sem mastery espera evidência e a
  transição pelo gate canônico.
- O adapter autônomo é **desabilitado por padrão**. `execute <request-id>` consome exatamente uma
  solicitação pendente somente com configuração local estrita em
  `.mavis/school-supervisor/autonomous.yaml` (modelo em `autonomous.example.yaml`). Ele reserva
  orçamento, mantém a lease durante produtor + verificador em processos/contextos separados, falha
  fechado em interrupção e só avança uma fase após verifier PASS. `autonomous-status` inspeciona a
  habilitação e execuções interrompidas. `tick` permanece supervisionado e somente publica.
- O adapter nunca altera `learner/learning_state.yaml`, concede mastery ou retoma contexto Claude.
  `poll` apenas repete o tick limitado, relê o estado canônico a cada iteração e pode consumir a
  solicitação pendente quando `--autonomous` estiver explicitamente habilitado. Recuperação após
  execução interrompida continua deliberadamente manual via inspeção, `reconcile` ou `fail`; a
  solicitação pendente permanece disponível e nunca é redisparada automaticamente.
- Neste slice, execução autônoma é limitada à fase `spec`: não há `Bash` nem comandos de teste.
  Cada execução usa sessão UUID fresca e determinística por papel, HOME isolado, MCP vazio e
  capacidades simbólicas convertidas em regras fechadas. Reservas e liquidações de orçamento são
  duráveis; reserva sem liquidação cobra o máximo. Um PASS fresco autoriza o avanço em evento
  `advancement_authorized`; reconciliação autônoma sem esse evento cria bloqueio de segurança.
- Produtor e verificador recebem apenas contratos imutáveis, identidades/contextos e limites da
  solicitação. O verificador parte dos arquivos do projeto, nunca do resultado do produtor. Os
  processos rodam na raiz com ferramentas disponíveis explicitamente limitadas; `EditProject` vira
  apenas `Edit(curriculum/<projeto>/**)`, enquanto `Bash`, agentes aninhados, estado canônico,
  operações, ambiente e segredos permanecem negados.
- O avanço compara novamente identidade e digests imediatamente antes da escrita e falha em qualquer
  divergência. Isso é CAS por cooperação/advisory no filesystem, não uma transação entre arquivos:
  escritores externos que ignoram o protocolo ainda podem correr no intervalo mínimo da persistência.
- `poll` aceita intervalos e limite de ticks explícitos para execução/teste delimitado, aplica
  backoff enquanto a projeção semântica não muda e volta ao intervalo inicial após mudança canônica.
  `SIGINT`/`SIGTERM` apenas marcam cancelamento; a saída ocorre fora do handler, depois que a operação
  limitada libera a lease. Estados de espera são read-only para currículo e aprendiz.
- O runtime operacional fica em `.mavis/school-supervisor/`: ledger NDJSON append-only, lease curta,
  configuração local e documentos pending/retired/resolved. Nunca edite esses arquivos manualmente.
  Comece por `status`; use `reconcile` para avanço já autorizado, `fail`/`block` para preservar a fase,
  `abandon` para planejamento não publicado, `resume` apenas depois do reparo e `recover-lease` apenas
  para uma lease realmente expirada.
- Limites conhecidos: um workspace, um projeto atual, polling foreground local e CAS cooperativo no
  filesystem. Não é daemon, scheduler em nuvem, transação distribuída nem autoridade de mastery.
  Somente `spec -> spec-done` é autônomo; implementação, review, benchmark e optimize continuam
  supervisionados até terem sandbox de comandos verificável.
- Para rodar **constantemente** (estilo MiniMax Agent Team), use o skill `/schedule` para agendar
  `/devschool-cycle` ou `/devschool-diagnose` numa rotina recorrente. **Rotinas rodam na nuvem da
  Anthropic e são faturadas** — peça confirmação ao usuário antes de criar; nunca crie sozinho.
- Sessões frescas devem começar lendo o status YAML-first + `learner/learning_state.yaml` (o hook
  `SessionStart` já injeta esse briefing).

## Segurança / sandbox

- Builds e testes (go/cargo/npm) e `docker build/run` devem rodar em ambiente isolado. Em macOS,
  o Docker Desktop faz throttling de CPU — o `benchmarker` deve registrar isso como caveat e nunca
  declarar vencedor em diferença < 10% sob ruído.
- **Sem Docker disponível**, a Fase 4 usa o harness nativo do substrato compartilhado
  (`curriculum/_shared/benchmarks/native_runner.sh`, N≥3 runs por linguagem — ver
  `/devschool-benchmark`); registre "nativo em macOS, máquina compartilhada" como caveat de
  metodologia.
- Não amplie permissões além do necessário. Rode `/fewer-permission-prompts` para criar um allowlist
  enxuto das chamadas read-only/build mais frequentes, se quiser menos prompts.

## Convenções de código (do usuário)

- Aplique o skill `andrej-karpathy-skills:karpathy-guidelines`: mudanças cirúrgicas, sem
  overcomplicação, com critérios de sucesso verificáveis.
- Antes de qualquer commit: rode `/simplify` no diff, aplique as recomendações, **depois** commite.
