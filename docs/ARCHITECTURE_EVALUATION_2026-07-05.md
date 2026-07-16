# Avaliação de Arquitetura — Ecossistema AI DevSchool

**Data:** 2026-07-05
**Modo:** avaliação de sistema + gap analysis (para fechar os engines atuais)
**Método:** exploração dos 6 engines + substrato compartilhado, com verificação de cada afirmação contra o filesystem (regra 3: sem afirmações sem evidência).

---

## Veredito

A arquitetura é sólida e os componentes estão maduros individualmente, mas **o ecossistema viola suas próprias regras de ouro no estado atual**: `learner/learning_state.yaml` declara as 18 unidades como `mastered` (gates de 2026-07-01) enquanto o filesystem só contém **1 arquivo de tentativa** (`learner/attempts/U0-...-attempt-1.md`) e o catálogo só certifica **1 projeto** (`01_rate_limiter`). Nenhum engine fechou um loop de aprendizado completo de ponta a ponta. O gap crítico não é código faltando — é **integridade do estado** e **o verificador ausente** que liga evidência a masterização.

---

## Estado por engine (verificado)

| Engine | Papel | Estado | Loop completo hoje? |
| --- | --- | --- | --- |
| **miniMaxEvolutionEngine** | Motor Claude Code, loop 5 fases | 25+ agentes, 18 comandos, skill agora-continuum, symlinks OK | Não — pipeline parado em `impl-done` desde ciclo 2026-06-04, aguardando `reviewer` (`learner/pipeline_status.md`) |
| **minimaxDojo** | Camada de protocolo/spec (14 agentes) | State machine Python implementada e testada (`core/state_machine/`, testes em `tests/`) | Não por design — spec layer; prompts + cron_registry for scheduler |
| **codexDojo** | Dashboard read-only | Completo: 9 arquivos de teste, build OK, snapshot gerado 2026-07-02 | N/A — superfície de leitura, por contrato não escreve estado |
| **pixelDojo** | Jogo arcade que emite evidência | Projetos 01–04 jogáveis; 05–18 sem `encounterKind` (só títulos em `curriculumPack.ts`); evidência fica em `window.__pixelQuestEvidence` | Não — **verificador inexistente**; evidência não persiste em `learner/` (último registro: `.logs/last_run_evidence.json`, 2026-06-09) |
| **openclaw** | Runner contínuo file-based + Hermes bus | `runner/`, `hermes/bus.py`, testes presentes; modo simulate | Não verificado — sem trace de execução real |
| **voxelDojo** | Simulações 3D didáticas | **Documentation-first: zero código** (só README, PLAN, ARCHITECTURE, GAP_ANALYSIS); piloto Game 10 HASH RING especificado | Não — não existe runtime |

Nota: o `CLAUDE.md` raiz lista só 4 engines; `openclaw` e `voxelDojo` estão fora do mapa de estrutura.

---

## Gaps priorizados

### GAP 1 — Estado de masterização sem evidência (CRÍTICO, integridade)

- **Evidência:** `learner/learning_state.yaml` → 18× `mastered: true`, todas com gate `2026-07-01` / `pass_first_try`; porém `learner/attempts/` contém apenas U0; `curriculum/BACKLOG_STATUS.md` → 1 `implemented`, 17 `scaffolded`. Commit `04a3463` (2026-07-02, "refresh state") escreveu o estado — não foi produzido por um loop verificado.
- **Violação:** regras de ouro 1 (learning gate) e 3 (sem afirmações sem evidência); anti-pattern explícito do `AGENTS.md` ("Do not claim mastery... without executable evidence").
- **Correção:** reverter U1–U17 para estado compatível com o catálogo (`practicing`/`evaluating`), ou anexar evidência executável real por unidade. Enquanto isso, todo consumidor do estado (codexDojo, .mavis, whiteboard) exibe dados falsos.

### GAP 2 — Verificador ausente (CRÍTICO, é a peça que fecha o loop)

- **Evidência:** pixelDojo emite evidência tipada e validada (`src/game/evidence/evidence.ts`), mas nada a lê nem escreve em `units_log`. Produtor ≠ verificador está correto no jogo; o outro lado do contrato não existe.
- **Correção:** criar o verificador (contexto Prometor): lê evidência (via Playwright ou arquivo NDJSON persistido), valida contra `empirical_gates`, faz append em `units_log` e transiciona o estado. É o menor artefato que torna o MVP ("fechar 1 loop real") possível.

### GAP 3 — Loop do miniMaxEvolutionEngine parado em `impl-done` (ALTO)

- **Evidência:** `learner/pipeline_status.md`: fase `impl-done`, `awaiting: reviewer`, ciclo `2026-06-04-01-rate-limiter`. Faltam `/devschool-review`, `/devschool-benchmark`, `/devschool-optimize` para o 01 virar um ciclo completo certificado.
- **Nota:** benchmark do 01 é N=1; o gate exige N≥3.

### GAP 4 — pixelDojo cobre 4/18 projetos (MÉDIO)

- Projetos 05–18 em `curriculumPack.ts` não têm encounter. Sem encounter → sem tentativa → sem evidência → gate impossível para esses projetos via jogo.

### GAP 5 — voxelDojo sem código (RETRATADO em 2026-07-05)

- **Correção:** a exploração inicial via sandbox mostrou apenas docs, mas `engines/voxelDojo/game-10-hash-ring/` existe (untracked no git; src completo, testes, playwright, smoke screenshots em `.logs/`) — a visão do mount estava defasada. Além disso, `learner.substrate.sync()` escreve `game-10-hash-ring/src/content/reviewSlice.ts`, então rebaixar quebraria o substrato. voxelDojo permanece em `engines/` como piloto em andamento. Pendência real: commitar o trabalho untracked.

### GAP 6 — Higiene de documentação (BAIXO)

- `CLAUDE.md` raiz desatualizado (4 engines listados, existem 6); `predictions.yaml` vazio (feature futura, aceitável); orquestração do loop 5 fases é 100% manual (aceitável por ora — openclaw é o candidato a automatizar).

---

## Sequência recomendada para "terminar os engines"

1. **Corrigir integridade** (GAP 1): reverter masterizações sem evidência. Tudo que vier depois herda credibilidade disso.
2. **Construir o verificador** (GAP 2) e fechar **1 loop real** com pixelDojo no projeto 01: jogar → evidência persistida → verificador aprova → `units_log` recebe entrada legítima → snapshot regenerado → codexDojo exibe. Isso cumpre o MVP.
3. **Terminar o ciclo do 01** no miniMaxEvolutionEngine (GAP 3): review → benchmark N≥3 → optimize → catálogo confirma `implemented` com evidência completa.
4. **Repetir o loop no projeto 02** para promover `scaffolded → implemented` via processo, não via edição de estado.
5. **Decidir voxelDojo** (construir piloto ou rebaixar) e **expandir encounters do pixelDojo** conforme o currículo avança — não antes.
6. Atualizar `CLAUDE.md` raiz com os 6 engines.

## Registro de correções aplicadas (2026-07-05, mesma sessão)

- **GAP 1 fechado:** `learning_state.yaml` resetado — as 18 masterizações semeadas removidas; correção registrada em `learner/journal.md` (entradas de "Verification" de 2026-07-01 marcadas como não-substanciadas, preservadas pela regra de auditoria).
- **GAP 2 fechado:** verificador hoje em `learner/gate/` (Python, source-agnostic). Valida
  unit/project match, attempt-before-solution, estado `evaluating` e consistência interna; aplica o
  gate pela API atômica do substrato antes de gravar. A localização original sob Pixel foi removida.
- **MVP cumprido:** primeiro loop real fechado — U0 gateado a partir da evidência GATEKEEPER real (2026-06-09) + attempt file: `units_log` tem 1 entrada legítima (`pass_first_try`, 2026-07-05); streak 1. Views derivadas regeneradas (`.mavis/`, codexDojo `learner.ts`, whiteboard, review slices).
- **GAP 5 retratado:** ver acima — voxelDojo mantido.
- **GAP 6 fechado:** `CLAUDE.md` raiz atualizado com os 6 engines e o fluxo do gate.
- **GAP 3 permanece aberto** (requer sessão do Claude Code em `engines/miniMaxEvolutionEngine/`: `/devschool-review` → `/devschool-benchmark` (N≥3) → `/devschool-optimize`). **GAP 4 adiado** por decisão (expandir encounters conforme o currículo avança).

## Consequências

- Fica mais fácil: confiar no dashboard e no estado; medir progresso real; automatizar depois (openclaw) sobre um loop que comprovadamente funciona manual.
- Fica mais difícil: o progresso aparente regride (de "18/18 mastered" para ~0–1 verificado) — mas esse é o número honesto.
- Revisitar: automação da orquestração via openclaw após 2 loops manuais bem-sucedidos.
