# Inventariar as engines disponíveis para a Trilha Dev

Type: research
Status: resolved

## Question

Quais capacidades de aprendizagem, tutoria, prática, visualização, orquestração e evidência cada
curriculum/engine existente realmente oferece hoje, com qual maturidade comprovada, e como elas
podem compor a Trilha Dev sem criar uma nova engine?

## Answer

> **Correção pós-resolução (2026-07-25 16:05).** A linha do `aiDevschoolMvp` abaixo diz
> "`tests/` vazio (`no tests ran`)". Isso era verdade quando a auditoria rodou (15:29), mas os
> arquivos de teste e os scripts da engine foram escritos **depois**, entre 15:39 e 16:03.
> Reexecução: `python3 -m pytest engines/aiDevschoolMvp/tests/ -q` → **7 passed, 1 skipped**.
> Portanto a exclusão do `aiDevschoolMvp` da composição por "maturidade não comprovada" perdeu
> essa justificativa. As outras duas permanecem: o ADR-0006 segue `Proposed`, e a engine não usa
> `learner/gate` nem `learner/substrate` — se ela entrar na Trilha Dev, o mapa herda um quarto
> modelo de gate com julgamento de LLM. Isso é decisão, não fato: vai para
> [Definir a topologia das duas trilhas](03-definir-a-topologia-das-duas-trilhas.md).

Levantamento feito em 2026-07-25 no commit de trabalho atual (branch `main`, `d6920fd` + working
tree sujo). Toda linha de maturidade abaixo vem de arquivo lido ou de comando executado nesta
sessão. Onde não houve execução, está escrito "não executado".

### 0. O que foi executado (evidência de comando)

Suítes Python, uma execução agregada da raiz do ecossistema:

```
python3 -m pytest engines/openclaw/tests/ learner/gate/tests/ learner/substrate/tests/ \
  engines/minimaxDojo/tests/ engines/miniMaxEvolutionEngine/tests/ \
  engines/aiDevschoolMvp/tests/ engines/test_engine_contracts.py -q
→ 438 passed, 1 skipped, 34 subtests passed in 8.06s
```

Quebra por suíte (execuções individuais):

| Suíte | Resultado |
| --- | --- |
| `engines/openclaw/tests` | 18 passed |
| `learner/gate/tests` | 112 passed |
| `learner/substrate/tests` | 128 passed, 11 subtests |
| `engines/minimaxDojo/tests` | 60 passed, 1 skipped, 13 subtests |
| `engines/miniMaxEvolutionEngine/tests` | 99 passed |
| `engines/aiDevschoolMvp/tests` | **no tests ran** (diretório vazio) |
| `engines/test_engine_contracts.py` | 21 passed, 10 subtests |

Suítes JS/TS (vitest, `npm test` / `pnpm run test` em cada engine):

| Engine | Resultado |
| --- | --- |
| `engines/codexDojo` | 15 arquivos / **92 passed** |
| `engines/codexdojo-os-prototype` | 12 arquivos / **70 passed** |
| `engines/literacyDojo` | 7 arquivos / **57 passed** |
| `engines/miniTown` | 3 arquivos / **31 passed** |
| `engines/pixelDojo` (`pixel-quest`) | 16 arquivos / **113 passed** |
| `engines/voxelDojo` | 16 pacotes / **317 passed** |
| `engines/dojoToday` | sem suíte de teste; `npm run selfcheck` → `OK: self-check passou (trilha + game_dir)`; `npm run lint` → `Checked 4 files. No fixes applied.` |

**Não executado:** todas as suítes Playwright/E2E (`literacyDojo test:e2e`, `miniTown smoke`,
`codexdojo-os-prototype test:smoke`, `pixelDojo/voxelDojo smoke`) — exigem download de binários de
browser e rede; não tentei. Também não executei `build` de nenhuma engine (o `prebuild` de
`dojoToday` e `literacyDojo` regenera arquivos rastreados e sujaria a árvore de trabalho).

### (a) Inventário: engine × capacidades × maturidade comprovada

Capacidades: **A**=aprendizagem/conteúdo · **T**=tutoria · **P**=prática · **V**=visualização ·
**O**=orquestração · **E**=evidência.

| Engine | O que faz | A | T | P | V | O | E | Maturidade COMPROVADA | Evidência |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| `learner/` + `learner/substrate/` + `learner/gate/` (substrato, não engine) | Estado canônico do aprendiz, state machine do gate, FSRS/streak, recibos de verificador, views derivadas | — | — | — | — | — | ✅ | **Executável e testado**: 128+112 testes verdes | `learner/substrate/` (14 módulos .py); `learner/gate/README.md:1-30`; `learner/learning_state.yaml` (units_log com 1 unidade `mastered: true`) |
| `engines/voxelDojo` | 16 jogos 3D Three.js, um por conceito espacial do currículo; sim core headless determinístico + cena + níveis L1–L4 + emissão de evidência | ○ | — | ✅ | ✅ | — | ✅ | **Executável e testado**: 16 pacotes, 317 testes verdes. README declara 15/18 conceitos; `catalog.json` lista 16 diretórios | `engines/voxelDojo/README.md:5-12`; `engines/voxelDojo/catalog.json:1-18`; execução acima |
| `engines/pixelDojo` | Arcade 8-bit + 5 encontros de regra (`tokenBucket`, `sequenceFlow`, `taskQueue`, `policyGate`, `routeHealth`) + contrato de evidência NDJSON | ○ | — | ✅ | ✅ | — | ✅ | **Executável e testado**: 113 testes verdes; primeiro gate real fechado em 2026-07-05 (U0) | `engines/pixelDojo/pixel-quest/src/game/encounters/` (7 arquivos); `engines/pixelDojo/EVIDENCE_CONTRACT.md:1-30`; `learner/learning_state.yaml` units_log[0] `mastered: true`, `evidence_file: engines/pixelDojo/.logs/last_run_evidence.json` |
| `engines/miniMaxEvolutionEngine` | Motor Claude Code do loop 5 fases (spec→impl→review→benchmark→optimize) com 24 subagentes `.claude/agents/`, comandos `/devschool-*`, skill `agora-continuum`, supervisor Python | ○ | ✅ | ✅ | — | ✅ | ○ | **Executável e testado**: 99 testes verdes (supervisor). Os 24 agentes são prompts Markdown — não têm teste próprio | `engines/miniMaxEvolutionEngine/.claude/agents/` (24 .md); `engines/miniMaxEvolutionEngine/README.md:1-40`; execução acima |
| `engines/codexDojo` | Dashboard read-only do estado do aprendiz (Vite/TS, zero deps de runtime) + `ecosystem/` como spec canônica do produto | ○ | — | — | ○ | — | — | **Executável e testado**: 92 testes verdes | `engines/codexDojo/README.md:1-30`; `engines/codexDojo/ecosystem/MANIFEST.md:47-61` (vocabulário de status) |
| `engines/codexdojo-os-prototype` | "OS educacional": desktop web, Engine Hub que embeda codexDojo/pixelDojo/voxelDojo por URL, registry tipado de 6 engines, ponte loopback dev-only com 3 ações fixas, read model do learner, LearningRail | ○ | ○ | ✅ | ✅ | ✅ | ○ | **Executável e testado**: 70 testes verdes. MANIFEST já o chama de "canonical educational OS experience". Nome de pasta ainda diz "prototype" | `engines/codexdojo-os-prototype/src/engines/` (registry.ts, EngineHubApp.tsx, voxelCatalog.ts, evidence.ts + testes); `engines/codexDojo/ecosystem/MANIFEST.md:26-29`; execução acima |
| `engines/minimaxDojo` | Tutor core: state machine determinística, gates empíricos, event store, memória, whiteboard; roster de 14 agentes | ○ | ✅ | — | — | ✅ | ✅ | **Executável e testado**: 60 testes verdes (state machine, gates, drift de roster/threshold, adapter de OS). ⚠️ `agents/` contém **apenas um README** — os 14 agentes são spec, não runtime | `engines/minimaxDojo/core/` (config, gates, memory, state_machine); `engines/minimaxDojo/agents/` = 1 arquivo README.md; `engines/minimaxDojo/tests/` (8 arquivos) |
| `engines/literacyDojo` | MVP de microlições para não-técnicos (IA na Prática): mundo voxel, mapa, fluxo tentativa→feedback→dica→retry, gamificação local-first, PWA | ✅ | ○ | ✅ | ✅ | — | ○ | **Executável e testado**: 57 testes verdes. Deploy público declarado. E2E não executado aqui | `engines/literacyDojo/README.md:14-24`; `curriculum/ai-literacy/README.md:1-25` (14/14 lições `ready`); execução acima |
| `engines/dojoToday` | "Lição de hoje do programador": superfície só-leitura que consome FSRS + streak + gate; embeda o jogo voxel ativo em iframe; tutor Sócrates opcional (BYO-key, determinístico por padrão) | — | ○ | ○ | ○ | — | — | **Executável, sem suíte de testes**: só `selfcheck` (passou) e `lint` (limpo). É a única superfície do repo explicitamente rotulada "público: programadores" | `engines/dojoToday/README.md:1-12` (público programadores), `:45-66` (origem dos dados FSRS), `:68-84` (Sócrates opcional), `:86-96` (jogar inline, só o jogo 02) |
| `engines/openclaw` | Runner de checklist file-based que avança as 5 fases verificando existência/tamanho de artefatos. Sem bus, sem IA | — | — | — | — | ○ | ○ | **Executável e testado**: 18 testes verdes. ADR-0002 o limita a "simulate-grade orchestration only" | `engines/openclaw/README.md:1-40`; `docs/design/adr/0002-openclaw-role.md` |
| `engines/miniTown` | Simulador cozy de cidade Three.js (Nível 0, público não-técnico). Superfície observacional, nunca escreve estado | — | — | ○ | ✅ | — | — | **Executável e testado**: 31 testes verdes (README diz 14/14 — desatualizado). Explicitamente **não** emite mastery | `engines/miniTown/README.md:1-8`, `:20-27`, `:40-42`; execução acima |
| `engines/shared/teaching-evidence` | Pacote `@aidevschool/evidence`: envelope, validação e emissão dual-channel compartilhados por pixel e voxel | — | — | — | — | — | ✅ | **Executável**: 3 arquivos, consumido pelas duas engines de jogo. Sem suíte própria (coberto indiretamente) | `engines/shared/teaching-evidence/README.md:1-9` |
| `engines/aiDevschoolMvp` | Skill de tutor de IA-literacy (24 conceitos) com scripts de gate/schedule/progress e rubricas | ○ | ✅ | — | — | ○ | ○ | **NÃO comprovada**: `tests/` está vazio (`no tests ran`). `scripts/` e `keys/` estão **untracked** no git. ADR-0006 (o contrato do gate G4) está `Proposed`, não aceito | `engines/aiDevschoolMvp/tests/` (vazio); `git status` → `?? engines/aiDevschoolMvp/aidevschool/keys/`, `?? .../scripts/`; `docs/design/adr/0006-g4-verifier-bridge-contract.md:1-3` (`Status: Proposed`) |
| `engines/graphify-out` | Cache de ferramenta (`cache/`), não é engine | — | — | — | — | — | — | Não é engine | `engines/graphify-out/` contém só `cache` |

Legenda: ✅ = capacidade coberta com código executável · ○ = coberta parcialmente ou só como
superfície de leitura/consumo · — = não cobre.

**Currículo (conteúdo da Trilha Dev):** os 19 projetos (00–18) têm `docs/spec.md` + `node-impl/`
scaffold — verificado em `03_url_shortener`, `10_distributed_cache`, `18_search_engine`. Mas o
status canônico é: **01 `✅ Implemented`** (com ressalva: benchmark/otimização só Node.js),
**02 "Partially implemented"** (Node gated & certified; Go/Rust não verificados), **00 e 03–18
`scaffolded`** (`curriculum/catalog.md:39-320`). O `units_log` real do aprendiz tem **2 entradas,
1 `mastered: true`** (U0/rate limiter) e a ativa U2 em `evaluating` (`learner/learning_state.yaml`).

### (b) O que é APENAS proposta/design (não usar como peça da trilha)

| Item | Status declarado | Fonte |
| --- | --- | --- |
| Polyglot Evolution Arena | `proposal` (arquivado), **demovido** de `engines/polyglotEvolutionArena/` em 2026-06-21. "There was **no executable scaffold**, no test harness, and no comparison runner" | `docs/design/polyglot-arena/STATUS.md:1-30` |
| ADR-0006 (bridge do verificador G4 da skill `aiDevschoolMvp`) | `Proposed` · "pendente ratificação" | `docs/design/adr/0006-g4-verifier-bridge-contract.md:3` |
| Os 14 agentes do minimaxDojo como runtime | Spec/prompt layer; `agents/` só tem README. O runtime equivalente existe em `miniMaxEvolutionEngine/.claude/agents/` | `engines/minimaxDojo/agents/README.md` (único arquivo) |
| `docs/VISION.md` inteiro | "Canônico para intenção de produto (**não é estado operacional**)"; a própria VISION marca Trilha Dev como "em breve" no MVP | `docs/VISION.md:5`, `:56-58` |
| Gate no-code (ADR-0004) executável | ADR `Accepted`, mas o catálogo registra: "Verificação executável do no-code gate (Prometor) **pendente**" | `docs/design/adr/0004-no-code-empirical-gate.md`; `curriculum/catalog.md:47` |

### (c) Recomendação de composição da Trilha Dev (só peças comprovadas)

Nenhuma engine nova. A trilha se monta com 6 peças já verdes:

| Camada | Peça | Por que ela e não outra |
| --- | --- | --- |
| **Entrada / hub** | `codexdojo-os-prototype` (Engine Hub) | 70 testes verdes; é a única peça que **já compõe** as outras (registry tipado de 6 engines, embed por URL de codexDojo/pixelDojo/voxelDojo, intake de evidência bruta, estados "indisponível" honestos). O MANIFEST já o trata como canônico. Custo zero de integração — o trabalho de composição está feito. |
| **Loop diário** | `dojoToday` | Única superfície do repo com público declarado "programadores", já ligada ao scheduler FSRS + streak e já capaz de embutir o jogo voxel ativo. **Risco: zero testes automatizados** — ver lacunas. |
| **Prática + visualização** | `voxelDojo` (16 jogos, 317 testes) + `pixelDojo` (5 encontros, 113 testes) | Cobre conceito-por-conceito, com sim core determinístico testado. Voxel para estrutura/topologia, pixel para regra/orçamento. É aqui que "voxel art como linguagem visual" já é real e não aspiracional. |
| **Evidência + gate** | `learner/gate` + `learner/substrate` + `@aidevschool/evidence` | 240 testes verdes somados; produtor ≠ verificador já implementado (recibo separado + digest canônico). É a peça mais madura do repositório inteiro. |
| **Progresso / dashboard** | `codexDojo` (92 testes) | Read-only, zero deps de runtime, já embedado pelo OS. |
| **Ciclo profundo (opcional, avançado)** | `miniMaxEvolutionEngine` (99 testes, 24 subagentes) | Para quem quer o loop 5 fases completo. Deve ficar **atrás** da trilha, não na entrada: exige abrir o Claude Code com raiz na engine — não é rota de navegador. |

**Ficam de fora da composição, com motivo:** `openclaw` (ADR-0002 o restringe a simulate-grade;
não acrescenta nada que o supervisor do miniMaxEvolutionEngine não faça melhor), `miniTown` e
`literacyDojo` (são a trilha IA na Prática, público não-técnico), `minimaxDojo` (spec layer — sua
state machine já é consumida via substrato; os 14 agentes não são runtime), `aiDevschoolMvp`
(maturidade não comprovada).

**Tutoria: a lacuna melhor coberta hoje** é o Sócrates opcional do `dojoToday` — determinístico
por padrão, LLM só com chave do próprio aprendiz, e o caminho de evidência nunca passa por ele
(`engines/dojoToday/README.md:68-84`). Esse é o único assistente pedagógico com código real e
limite de poder explícito no repo.

### (d) Lacunas — onde nada maduro existe

1. **Conteúdo, não engine.** 16 dos 19 projetos estão `scaffolded`. As engines de jogo cobrem 16
   conceitos com jogos testados, mas o percurso de aprendizagem por projeto (spec → attempt →
   gate) só foi percorrido de ponta a ponta **uma vez** (U0/rate limiter, `mastered: true`). A
   Trilha Dev tem superfície de sobra e trilha percorrida de menos.
2. **`dojoToday` sem testes.** É a peça que a composição mais precisa e a única sem suíte. Só
   `selfcheck` + `lint`. Antes de ser a entrada oficial, precisa de cobertura mínima do read model.
3. **Embed de jogos não generalizado.** `dojoToday` embute **só o jogo 02**; o README já aponta
   que generalizar para os 18 "vive melhor no `codexdojo-os-prototype`"
   (`engines/dojoToday/README.md:86-96`). Ou seja: as duas peças de entrada se sobrepõem e a
   decisão de qual é a entrada ainda não foi tomada — é decisão de mapa, não de código.
4. **Nome vs. status do OS.** O MANIFEST chama `codexdojo-os-prototype` de canônico, mas o
   diretório ainda se chama "prototype". Sem ADR que ratifique a promoção.
5. **Sem rota pública sem instalação para a Trilha Dev.** `literacyDojo` tem deploy Netlify
   declarado; `dojoToday` e `miniTown` têm `netlify.toml` mas nenhum README afirma URL pública
   verificada para a trilha de programadores. Sem evidência de deploy da Trilha Dev.
6. **Nenhuma evidência de E2E nesta sessão.** Todos os números acima são de teste unitário/sim
   core. Os smokes Playwright — que são justamente o que produz o arquivo de evidência NDJSON real
   (`EVIDENCE_CONTRACT.md:11-16`) — não foram executados. O caminho jogo→evidência→gate está
   testado por partes, mas não foi observado ponta a ponta aqui.
7. **Onboarding e transição entre trilhas: sem evidência.** Nenhum código encontrado que faça
   descoberta/transição IA na Prática → Trilha Dev. A VISION marca a Trilha Dev como "em breve".
