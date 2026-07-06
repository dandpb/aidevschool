# Guia — engines do AI DevSchool: como rodar, testar e fechar as fases disponíveis

**Data:** 2026-07-06 · **Para:** Daniel · **Contexto:** continuação de `docs/SPEC_plano_execucao.md`
e da conversa que veio depois — a pergunta "os engines estão mesmo testados?" não tinha resposta
num lugar só. Este guia tenta ser esse lugar.

## 0. Por que este guia existe assim, agora

A versão anterior só cobria o pipeline de 5 fases (`miniMaxEvolutionEngine`) e o gate de
aprendizado (`pixelDojo`) — os dois engines que esta sessão realmente exercitou. Ao perguntar se
*todos* os engines estavam testados, ficou claro que não existia um documento único com o status
real de verificação por engine — exatamente o tipo de lacuna que o GAP 1 já expôs uma vez (estado
sem evidência), só que no eixo "código existe/testado" em vez de "aprendiz masterizou". Este guia
cobre os 6 engines: o que cada um faz, o comando exato pra rodar/testar de verdade, e a última
verificação real conhecida — não uma alegação, uma evidência com data e comando.

**Convenção usada abaixo:** "✅ verificado nesta sessão" significa que o comando foi rodado agora
(2026-07-06) e o resultado abaixo é real, não estimado. "⚠️ não verificável neste sandbox" significa
que o comando existe e é o certo, mas o ambiente Linux do Cowork não tinha o toolchain — rode você
mesmo no Mac para confirmar. "🔴 nunca verificado" é a alegação mais fraca: existe código, ninguém
rodou nada.

---

## 1. Tabela-resumo

| Engine | Papel | Stack | Última verificação real conhecida | Comando de teste |
|---|---|---|---|---|
| `miniMaxEvolutionEngine` | Orquestrador do pipeline de 5 fases (Claude Code) | Markdown + subagents | ✅ hoje: `01_rate_limiter` e `02_key_value_store` fechados (Node), Go/Rust não verificados | `/devschool-cycle` (ver §5) |
| `pixelDojo` | Jogo + verificador do gate de aprendizado | TS/Vite (jogo) + Python (verifier) | ✅ verifier tem 17 testes passando; ⚠️ proveniência da evidência do U0 nunca confirmada como jogo humano vs. script | `python3 -m pytest engines/pixelDojo/verifier/tests/` |
| `minimaxDojo` | Núcleo de tutoria — state machine + gates empíricos (14 agentes) | Python puro | ✅ verificado nesta sessão: 54 passed, 2 skipped | `python3 -m pytest engines/minimaxDojo/tests/ -v` |
| `codexDojo` | Dashboard read-only (consumidor, não decide nada) | TS/Vite/pnpm | ⚠️ não verificável neste sandbox (binários nativos macOS/arch); baseline documentado: 55 testes em 9 arquivos, último snapshot real 2026-07-02 | `pnpm run test` (no seu Mac) |
| `openclaw` | Runner contínuo, 5 fases via bus de eventos em arquivo | Python puro | ✅ verificado nesta sessão: 36 passed; simulate run rodou limpo | `python3 -m pytest engines/openclaw/tests/ -v` |
| `voxelDojo` | Simulações 3D didáticas (18 games) | TS/Vite + Playwright | ✅ os 18 games estão trackeados e têm smoke test próprio rodado localmente; 🔴 nenhum foi revisado pedagogicamente por um humano ainda | ver tabela §9 |

---

## 2. Onde abrir a sessão

```bash
cd ~/Development/aidevschool/engines/miniMaxEvolutionEngine
claude
```

Os comandos `/devschool-*` (usados nas §§4-5) são slash commands definidos em
`engines/miniMaxEvolutionEngine/.claude/commands/` e só existem dentro do Claude Code, com a raiz
aberta ali. O motor acessa o resto do ecossistema (`curriculum/`, `learner/`, `docs/`) via symlinks
internos. Os comandos Python (`pytest`, `learner.substrate`, etc.) rodam de qualquer terminal, com
`cd ~/Development/aidevschool` (raiz do ecossistema).

## 3. Primeiro comando, sempre: `/devschool-status`

```
/devschool-status
```

Lê `learner/pipeline_status.md` e `learner/learning_state.yaml` e te diz, em 2-3 linhas: em que
projeto/fase você está, se o `gate.implementation_blocked` está ativo, e qual o próximo comando
concreto a rodar. Não executa nada — só orienta. Rode isso toda vez que voltar a uma sessão.

---

## 4. `miniMaxEvolutionEngine` + `pixelDojo` — fechar o gate de aprendizado ativo (U1)

Isto é o que ficou pendente da Fase 2.2 do plano — a única parte que exige você, porque é o
princípio fundador do projeto: **a máquina não pode se ensinar no seu lugar.** Tem duas peças
distintas, que gateiam coisas diferentes.

### 4.1 — Diagnóstico textual (`/devschool-diagnose`) — desbloqueia a implementação

```
/devschool-diagnose
```

- Confirma a unidade ativa em `learner/learning_state.yaml > active_unit`.
- Apresenta um desafio de 4 tarefas (Test Design, Algorithm Sketch, Code Reading Risk Scan, Review
  Judgment) a partir do `diagnostic_file` da unidade.
- Você escreve sua tentativa em `learner/attempts/<unit_id>-attempt-<N>.md` (o comando te dá o
  template). **Sem solução pronta antes.**
- O subagent `sonda` avalia em 5 dimensões, classifica Dreyfus/Bloom por conceito, devolve
  `GATE: UNBLOCK_RECOMMENDED` ou `GATE: BLOCKED`.
- Se liberado: `gate.implementation_blocked` vira `false`.

**Nota sobre o projeto 02:** como a implementação Node já foi feita e revisada nesta sessão, o
diagnóstico pré-implementação não se aplica da mesma forma. Rode `/devschool-status` primeiro — se
não houver unidade nova aberta, peça: **"abra a próxima unidade de aprendizado (U1) para o projeto
02_key_value_store"** (aciona o Cartografo, o mesmo passo que `/devschool-next` faz sozinho ao abrir
um projeto novo).

### 4.2 — Evidência executável (jogar o pixelDojo de verdade) — fecha a masterização

Este é o gate que realmente marca `mastered: true` em `units_log`.

```bash
cd ~/Development/aidevschool/engines/pixelDojo/pixel-quest
npm install   # só na primeira vez
npm run dev   # abre http://127.0.0.1:5173
```

Jogue o encounter do projeto 02 (`encounterKind: "sequence_flow"` em `curriculumPack.ts`) — é você
quem joga, não um script. **Não rode `npm run smoke`** para gerar essa evidência: isso dispara o
Playwright automatizado, que é o teste de regressão do próprio jogo (QA), não uma tentativa sua.

### 4.3 — Rodar o verificador + regenerar as views

```bash
cd ~/Development/aidevschool
python3 -m engines.pixelDojo.verifier      # --dry-run para só ver a decisão sem gravar
python3 -m learner.substrate
```

O verificador procura a evidência (`pixel-quest/.logs/evidence.ndjson`, depois o formato legado
`engines/pixelDojo/.logs/last_run_evidence.json`), valida contra o `empirical_gate` da unidade
(`min_coverage`, `mutation_min`) e só então escreve em `units_log`. Exit `0` = gate aplicado (ou
nada a avaliar); `1` = evidência rejeitada/ilegível. `learner.substrate` regenera as views derivadas
(`.mavis/`, dashboard do codexDojo, whiteboard do minimaxDojo) — nunca edite essas views direto.

**Ponto em aberto que vale sua atenção:** a evidência que gateou U0 (`last_run_evidence.json`,
2026-06-09) nunca teve sua proveniência confirmada — ninguém checou se veio de você jogando de fato
ou de uma execução automatizada anterior. Não é urgente, mas antes de tratar U0 como o "modelo" de
como U1 deveria ficar, vale abrir esse arquivo e confirmar.

### 4.4 — `engines/pixelDojo/games/` vs. `pixel-quest/` — não confunda os dois

`pixel-quest/` é o motor do jogo em si (pnpm/vite, roda no navegador). `games/` é um diretório
irmão com 17 pastas (`02_key_value_store` … `18_search_engine`) de conteúdo/evidência por desafio,
trazido por um merge (`a892c1b`) durante esta mesma sessão — separado do que este guia testa e
comenta. Se for auditar conteúdo pedagógico por projeto, é ali que ele mora.

---

## 5. `miniMaxEvolutionEngine` — rodar o ciclo de 5 fases num projeto novo (03+), de verdade

Isto é o que a sessão de Cowork só conseguiu *replicar manualmente* para os projetos 01 e 02. Com o
Claude Code real, com os subagentes de verdade (`curator`, `dev-go`, `dev-rust`, `dev-node`,
`reviewer`, `benchmarker`, `optimizer`, `verifier`), fica mais robusto: portão do verificador entre
cada fase, automaticamente.

### Opção A — tudo de uma vez, com portões

```
/devschool-cycle
```

(ou `/devschool-cycle 03`). Roda a sequência inteira — Fase 1 `curator`→`verifier(spec)`→
`spec-done`; Fase 2 `dev-go`+`dev-rust`+`dev-node` em paralelo→`verifier(impl)` por linguagem→
`impl-done`; Fase 3 `reviewer`→`verifier(review)`→`review-done`; Fase 4 `benchmarker`→
`verifier(benchmark)`→`benchmark-done`; Fase 5 `optimizer`→`verifier(optimize)`→`cycle-complete`.
Se `gate.implementation_blocked: true`, ele para e roda `/devschool-diagnose` primeiro. Cada fase só
avança em **PASS** do verificador; em FAIL, o produtor tenta de novo (respeitando `retry_limit`).

### Opção B — fase a fase

```
/devschool-spec
/devschool-implement
/devschool-review
/devschool-benchmark
/devschool-optimize
```

### Depois de `cycle-complete`: abrir o próximo projeto

```
/devschool-next
```

Lê o `evolution_report.md`, escolhe o próximo projeto no catálogo, cria `curriculum/{NN}_{nome}/`,
abre uma nova unidade de aprendizado — o ciclo recomeça sozinho.

---

## 6. `minimaxDojo` — núcleo de tutoria (14 agentes, state machine)

**O que é:** a camada de protocolo por trás do gate — state machine determinística + gates
empíricos que decidem quando um aprendiz de fato masterizou algo. Segundo a própria documentação do
engine: "the 14-agent tutoring core... **it is not the runnable dashboard**." Mastery nunca é
julgamento de LLM sozinho — só o verificador ("Prometor") checando evidência executável (testes,
mutation score ≥60-70%, cobertura ≥80%).

**Stack:** Python puro, sem Node. Dependências no `pyproject.toml` da raiz do ecossistema:
`pyyaml>=6,<7`, `fsrs>=6,<7`, dev: `pytest>=8,<9`.

**Rodar de verdade:**

```bash
pip3 install pytest pyyaml
cd ~/Development/aidevschool
python3 -m pytest engines/minimaxDojo/tests/ -v
```

**Resultado real, rodado nesta sessão (2026-07-06): 54 passed, 2 skipped, 37 subtests passed em
0.30s**, cobrindo `test_config_seam.py`, `test_empirical_gates.py`, `test_event_store.py`,
`test_learning_unit_e2e_contract.py`, `test_state_machine.py`. Os 2 skips são checagens de
cross-referência de config, não falhas.

**Quando você mexe aqui:** normalmente nunca diretamente — é a config seam atrás do gate que a §4
já usa. Vale rodar o pytest de vez em quando (é rápido, 0.3s) só para confirmar que a peça mais
estável do ecossistema continua estável.

**Última verificação real via git:** `1c04e44` (adiciona cobertura de teste), `3f8f9a7` (normaliza
personas, corrige grafia "prometor"), `aad5dd2` (consolidação/wiring do núcleo de 14 agentes).

---

## 7. `codexDojo` — dashboard read-only

**O que é:** a superfície de produto do ecossistema — um SPA Vite/TypeScript que renderiza o
dashboard operacional (agentes, ciclo, roadmap, snapshot do aprendiz). É **consumidor read-only**:
lê `LearnerSnapshot` a partir de `learner/learning_state.yaml` via
`learner/substrate/dashboard_snapshot.py`. Não decide mastery, só mostra.

**Stack:** TypeScript estrito + Vite + Biome (lint) + Vitest/Testing Library, gerenciado via pnpm.

**Comandos reais (`package.json`):**

```bash
cd ~/Development/aidevschool/engines/codexDojo
pnpm install
pnpm run dev      # vite --host 127.0.0.1
pnpm run build    # tsc --noEmit && vite build
pnpm run test     # vitest run
pnpm run lint     # biome check src
```

**⚠️ Não verificável neste sandbox:** `pnpm install` falhou (limitação de `unlink` do mount, não é
bug de código). Usando o `node_modules` já commitado: `tsc --noEmit` passou limpo (zero erros de
tipo), mas `biome` e `vitest` quebraram por binário nativo de arquitetura errada
(`@biomejs/cli-linux-arm64`, `@rollup/rollup-linux-arm64-gnu` — o `node_modules` commitado é de
macOS/outra arch, não roda neste Linux). **No seu Mac isso deve rodar normal** — o baseline
documentado no próprio `CLAUDE.md` do engine é "vitest run (55 tests in 9 files)". Vale você rodar
`pnpm run test` uma vez para confirmar que ainda bate, porque o último snapshot real conhecido é de
**2026-07-02** — antes de tudo que mudamos hoje em `catalog.md`, `pipeline_status.md` e
`learning_state.yaml`. Rode `python3 -m learner.substrate` primeiro para garantir que o snapshot que
o dashboard lê está atualizado.

**Atenção ao git log:** os commits mais recentes incluem 4 seguidos com mensagem tipo `Merge
remote-tracking branch 'origin/palette...'` / `'origin/bolt...'` — parecem merges automatizados de
outro processo/bot, não trabalho manualmente verificado. Vale conferir o que essas branches trazem
antes de confiar cegamente no estado atual do dashboard.

---

## 8. `openclaw` — runner contínuo (Hermes bus)

**O que é:** o runner file-based que executa o pipeline de 5 fases (spec→impl→review→benchmark→
optimize) registrando cada handoff de agente como evento JSON imutável num "bus Hermes" em
`.mavis/hermes/`. Só o `--mode simulate` está implementado — os adapters verificam artefatos já no
disco em vez de invocar modelos de verdade.

**Rodar de verdade:**

```bash
cd ~/Development/aidevschool
python3 -m pytest engines/openclaw/tests/ -v
python3 -m engines.openclaw --project 01_rate_limiter --mode simulate
```

**Resultado real, rodado nesta sessão: 36 passed, 0 failed** (`engines/openclaw/tests/`, 4
arquivos). O simulate run **de fato executou** — criou `.mavis/hermes/{outbox,inbox,log,conflicts}/`
(não existiam antes) e terminou com "Tracer bullet completed successfully.", exit 0. Não escreveu
eventos porque `curriculum/02_key_value_store` já estava `cycle-complete` no momento do run.

**Modos além de `simulate` lançam `NotImplementedError`** — não tente `--mode real` ou parecido, não
existe ainda. Isso é a Fase 4 do plano: openclaw só ganha orquestração de verdade depois de 2 loops
manuais completos (Fase 1 + Fase 2, e Fase 2 só fecha com você tendo feito a §4 acima).

**Última verificação real via git:** `29a70d2` — hierarquia de erros, escrita atômica de estado,
testes de recovery, README. É um commit de hardening genuíno, não só conteúdo.

---

## 9. `voxelDojo` — simulações 3D didáticas (18 games)

**O que é:** engine de simulações 3D para conceitos de sistemas distribuídos, com um contrato
cross-engine em `docs/design/teaching-game-contract.md`. Cada "game" é um projeto Vite/TS/Three.js
independente, com seu próprio smoke test via Playwright.

**Atualização importante desde a nossa conversa anterior:** naquele momento, um processo concorrente
estava escrevendo games novos ao vivo e vários não tinham nem `.gitignore`. Isso **terminou** — hoje
(2026-07-06) os 18 games (`game-02` a `game-18`, sem `game-01`/`game-04`) estão todos trackeados no
git e todos têm infraestrutura de smoke test que já rodou pelo menos uma vez localmente:

| Game | Trackeado | Testes/smoke | Evidência de execução |
|---|---|---|---|
| game-02-warehouse … game-18-stacks (16 pastas) | ✅ todas | ✅ vitest/playwright + typecheck + build | ✅ `.logs/` com screenshots datados (Jul 5–6) |
| game-10-hash-ring | ✅ | ✅ | ✅ confirmado diretamente: `smoke-L1-cleared.png`, `smoke-L2-cleared.png` |
| game-15-observatory | ✅ | ✅ | ✅ confirmado diretamente: `smoke-L1/L2/L4-cleared.png` em `.logs/` (gitignored como os demais) |

Isso corrige a leitura de "committed mas nunca testado" da conversa anterior — na verdade cada game
tem sua própria pipeline local (typecheck/build/vitest/smoke) que já rodou. **Mas isso é verificação
de engenharia (compila, roda, a tela renderiza), não revisão pedagógica** — nenhum humano checou
ainda se o conceito ensinado em cada game está correto ou se o encounter é claro. Antes de apontar
qualquer game do voxelDojo para uma unidade de aprendizado de verdade (como a §4 faz com o
pixelDojo), vale um passe de revisão pedagógica — é o mesmo tipo de gap que a Fase 3.2 do plano já
sinalizava para o piloto do hash-ring.

**Comando para rodar um game específico e ver o smoke test de verdade:**

```bash
cd ~/Development/aidevschool/engines/voxelDojo/game-10-hash-ring   # ou qualquer outro
npm install     # primeira vez
npm run dev     # abre localmente
npm run test    # se existir — confira o package.json de cada game, os scripts variam pouco entre eles
npx playwright test   # smoke test com screenshot em .logs/
```

**Última verificação real via git:** `a892c1b` (merge trazendo 17 games do pixelDojo + WIP de
skills/ADRs/plans para `main`), `5dc7564` ("mark all-18 buildout complete" — nota: é um commit de
docs, não de teste; a evidência de teste real está nos `.logs/` locais, não commitados).

---

## 10. Preencher a lacuna de Go/Rust (o que o sandbox desta sessão não conseguiu)

Nesta sessão, Go e Rust não compilaram nem rodaram (sandbox Linux sem toolchain, rede bloqueada para
instalar) — por isso os benchmarks de `01_rate_limiter` e `02_key_value_store` só têm números reais
de Node. No seu Mac, onde os toolchains existem de verdade:

```bash
cd ~/Development/aidevschool
# instale k6 se ainda não tiver: brew install k6

# formato: native_runner.sh <project_dir> <lang> <port> <k6_script>
curriculum/_shared/benchmarks/native_runner.sh curriculum/01_rate_limiter go   8081 curriculum/_shared/benchmarks/generic_http_workload.js
curriculum/_shared/benchmarks/native_runner.sh curriculum/01_rate_limiter rust 8082 curriculum/_shared/benchmarks/generic_http_workload.js
curriculum/_shared/benchmarks/native_runner.sh curriculum/02_key_value_store go   8083 curriculum/_shared/benchmarks/kv_workload.js
curriculum/_shared/benchmarks/native_runner.sh curriculum/02_key_value_store rust 8084 curriculum/_shared/benchmarks/kv_workload.js
```

Rode cada um 10x (o gate canônico em `engines/minimaxDojo/config/learner.yaml` exige
`galileu.samples_min: 10`) e salve os JSONs em
`curriculum/{projeto}/benchmarks/results/native/{lang}/run-{1..10}.json` — depois é só pedir ao
Claude Code para juntar os três idiomas no relatório e remover a ressalva "Node.js-only" do catálogo.

---

## 11. Referência rápida — todos os comandos

| Comando | Engine | O que faz |
|---|---|---|
| `/devschool-status` | miniMaxEvolutionEngine | Bússola — onde você está, o que rodar em seguida. Não executa nada. |
| `/devschool-diagnose` | miniMaxEvolutionEngine | Gate textual pré-implementação (Sonda avalia sua tentativa). |
| `/devschool-cycle [NN]` | miniMaxEvolutionEngine | Roda as 5 fases com portão do verificador entre cada uma. |
| `/devschool-spec/implement/review/benchmark/optimize` | miniMaxEvolutionEngine | As mesmas 5 fases, uma por vez. |
| `/devschool-next` | miniMaxEvolutionEngine | Fecha o ciclo, escolhe o próximo projeto, abre a próxima unidade. |
| `npm run dev` (em `pixel-quest/`) | pixelDojo | Joga o encounter de verdade — gera evidência. |
| `python3 -m engines.pixelDojo.verifier [--dry-run]` | pixelDojo | Lê a evidência do jogo, gateia `units_log`. |
| `python3 -m learner.substrate` | (compartilhado) | Regenera as views derivadas após qualquer mudança de estado. |
| `python3 -m pytest engines/minimaxDojo/tests/ -v` | minimaxDojo | 54 passed, 2 skipped (verificado hoje). |
| `pnpm run test` (em `codexDojo/`) | codexDojo | 55 testes em 9 arquivos, documentado — rode no seu Mac para confirmar. |
| `python3 -m pytest engines/openclaw/tests/ -v` | openclaw | 36 passed (verificado hoje). |
| `python3 -m engines.openclaw --project NN --mode simulate` | openclaw | Único modo implementado; roda de verdade, sem gravar eventos se o ciclo já está completo. |
| `npm run dev` / `npx playwright test` (em cada `game-NN/`) | voxelDojo | Roda e faz smoke test de um game específico. |

**Regra de ouro em todos os passos:** se algo tentar marcar `mastered`/`implemented`/`done`/
`verificado` sem um comando executável rodado e conferido antes, pare — é exatamente o padrão que
gerou o GAP 1 que já corrigimos uma vez, e que motivou este guia existir engine por engine em vez de
uma alegação genérica de "tudo funciona".
