# Decomposição Modular — Patterns 1–5 (Ecossistema AI DevSchool)

**Data:** 2026-07-08 · **Escopo:** ecossistema inteiro (engines + substrato) · **Método:** pipeline
modular-decomposition (inventário → domínio comum → flattening → coupling → agrupamento), com a
análise DDD prévia ([docs/DOMAIN_ANALYSIS_2026-07-08.md](DOMAIN_ANALYSIS_2026-07-08.md)) reusada no Pattern 5.

**Medições feitas neste relatório** (verificadas por comando no repo em 2026-07-08): LOC/arquivos
por componente, md5 de arquivos duplicados, volatilidade git (60 dias), imports cross-boundary.
Claims herdados da auditoria/DDD prévias estão citados como tal.

---

## Sumário Executivo

```
CODEBASE:        aidevschool (plataforma ≈ 72k LOC; curriculum content ≈ 45k LOC à parte)
COMPONENTES:     9 componentes de plataforma + curriculum (conteúdo)
DEPENDÊNCIAS:    11 pares analisados
CRÍTICOS:        3 (emissor de evidência ×17 divergente; verifier escreve canônico direto;
                  árvore órfã pixelDojo/games)
MODERADOS:       5
SAÚDE GERAL:     🟡 Atenção — arquitetura de contratos é boa; execução dos contratos drifta
```

O ecossistema **já é modular por desenho** (6 engines sobre substrato compartilhado, contratos
publicados, single-writer). Os problemas encontrados não são de fronteira — são de **disciplina de
contrato**: duplicação simétrica do caminho produtor de evidência, escrita direta no arquivo
canônico e uma árvore inteira de conteúdo no engine errado.

---

## Pattern 1 — Inventário e Sizing de Componentes

Métrica: LOC não-vazias de código (`.ts/.py/.js/.go/.rs`), proxy para statements; excl.
`node_modules/dist/coverage`. Plataforma = tudo exceto `curriculum/` (conteúdo produzido pelo
aprendiz: implementações Go/Rust/Node dos 18 projetos — 44.934 LOC, 387 arquivos, avaliado à parte).

| Componente | Namespace | LOC | Arquivos | % plataforma | Status |
| ---------- | --------- | --: | -------: | -----------: | ------ |
| pixelDojo/games (árvore órfã) | `engines/pixelDojo/games/` | 28.608 | 176 | 39,6% | ⚠️ Too Large **e** órfã (ver P3) |
| voxelDojo | `engines/voxelDojo/` | 26.385 | 263 | 36,6% | ⚠️ Too Large no agregado; internamente particionado em 16 games (~1,6k LOC cada) ✅ |
| pixelDojo/pixel-quest | `engines/pixelDojo/pixel-quest/` | 7.208 | 61 | 10,0% | ✅ OK |
| codexDojo | `engines/codexDojo/` | 4.111 | 60 | 5,7% | ✅ OK |
| learner/substrate | `learner/substrate/` | 2.083 | 14 | 2,9% | ✅ OK |
| openclaw | `engines/openclaw/` | 1.735 | 24 | 2,4% | ✅ OK |
| minimaxDojo | `engines/minimaxDojo/` | 1.059 | 12 | 1,5% | ✅ OK (camada de spec; grosso é MD) |
| verifier compartilhado (snapshot histórico sob Pixel) | movido para `learner/gate/` | 778 | 4 | 1,1% | ✅ Localização corrigida após a medição (P3) |
| miniMaxEvolutionEngine | `engines/miniMaxEvolutionEngine/` | 224 | 1 | 0,3% | 🔍 Motor de prompts (52 arquivos MD); LOC não é a métrica certa aqui |

**Estatística:** total plataforma ≈ 72.191 LOC; média ≈ 8.021; desvio-padrão ≈ 11.255.
`games/` (+1,8σ) e voxelDojo (+1,6σ) são os outliers; com 9 componentes (app pequena, limiar 30%),
ambos excedem o limiar.

**Leitura:** o único oversized *real* é `pixelDojo/games/` — 39,6% da plataforma numa árvore que a
análise DDD já classificou como conteúdo 3D duplicado sob o engine errado (candidata a remoção, não
a split). voxelDojo é grande mas já é uma federação de 16 componentes-folha bem dimensionados.

---

## Pattern 2 — Domínio Comum Duplicado

### 2.1 Emissor de evidência — duplicação de **domínio** (consolidar ✅)

- **Medição:** 17 arquivos `evidence*.ts` em engines (excl. node_modules); **md5 de todos os 17 é
  diferente** — nenhuma cópia igual à outra. O caminho produtor mais crítico do contrato
  (evidência → gate) bifurcou silenciosamente 17×.
- **Similaridade:** todos implementam o mesmo envelope NDJSON (`source`, `unit_id`, `ts`, `pass`,
  `metrics`) do `EVIDENCE_CONTRACT.md`; diferenças legítimas se resumem a `metrics.kind`.
- **Coupling antes/depois:** hoje CA efetivo = 0 (cópias independentes) mas com **coupling
  funcional simétrico** oculto ×17; consolidado como biblioteca compartilhada, CA = 17 explícito e
  verificável. Sem aumento real de acoplamento — ele já existe, só que invisível.
- **Recomendação:** **Shared Library** (pacote único `@aidevschool/evidence` com o
  `validateEvidenceRecord` e o envelope; `metrics` fica genérico por tipo). Não é serviço: é
  utilitário estável de contrato.

### 2.2 State machine do gate — duplicação simétrica documentada (Shared Kernel)

minimaxDojo (`core/state_machine`, threshold `mutation_score_min: 0.65`) × canônico
(`learning_state.yaml`, `mutation_min: 0.6`) × subagents do miniMaxEvolutionEngine. Duplicação
**intencional e documentada** (handbook), mas driftando (thresholds divergem — confirmado pela
análise DDD). **Recomendação:** não consolidar código; adicionar **drift-check automatizado**
(mesmo padrão do `learner.ts` gerado) que falha se thresholds/roster divergirem.

### 2.3 Ciclo de 5 fases — duplicação **não documentada**

miniMaxEvolutionEngine (subagents interativos) × openclaw (runner Hermes) implementam o mesmo
vocabulário de fases/produtor/verificador de forma independente; openclaw ausente da tabela de
engines do handbook. **Recomendação:** decisão explícita (sucessor automatizado vs. spike
experimental) antes de qualquer consolidação.

### 2.4 Dados de catálogo/roster copiados à mão

`curriculum/catalog.md` × `BACKLOG_STATUS.md` (tie-break por convenção); codexDojo
`projects.ts/agents.ts/cycle.ts/ecosystem.ts` sem header AUTO-GENERATED ao lado de `learner.ts`
gerado. **Recomendação:** estender o gerador do substrato — o padrão já existe e funciona.

### 2.5 Infraestrutura duplicada (não consolidar como domínio)

- **Medição:** 35 `biome.jsonc` em engines; **34 byte-idênticos** (md5 único). 36 `package.json`
  standalone (até profundidade 4).
- Classificação: **infraestrutura**, não domínio — tratar via workspace compartilhado
  (pnpm workspace + config raiz), não via serviço. Idem boilerplate de cena Three.js ×16
  (auditoria #18): candidato a lib interna `voxel-kit` quando estabilizar.

---

## Pattern 3 — Flattening / Hierarquia

### Classes/arquivos órfãos por namespace-raiz

| Namespace-raiz | Órfãos encontrados | Diagnóstico | Estratégia |
| -------------- | ------------------ | ----------- | ---------- |
| **raiz do repo** | `REFACTOR_PLAN.md`, `TECH_DEBT_AUDIT_2026-06-28.md`, `REMEDIATION_ROADMAP_2026-06-28.md`, `codexdojo-dashboard-snapshot.md/.png`, `coverage.out`, `_probe_commit_test.txt` | Sprawl de planejamento e artefatos de teste na raiz (auditoria já flagava) | **Consolidar para baixo**: docs de planejamento → `docs/`; artefatos (`coverage.out`, `_probe_commit_test.txt`) → deletar/gitignore |
| `engines/` | `test_engine_contracts.py`, `__init__.py` | Órfão **justificado**: teste de contrato cross-engine pertence ao nível pai por definição | ✅ Manter; documentar a exceção |
| `engines/pixelDojo/` | `verifier/` (módulo compartilhado por pixel **e** voxel) + `games/` (176 arquivos de conteúdo 3D duplicado do voxelDojo, schema de evidência divergente) | **Dois problemas de posicionamento**: o verificador é ecosystem-level morando num engine; `games/` é árvore órfã de merge antigo (`a892c1b`) | **Extract shared**: mover verifier para nível compartilhado (ex.: `engines/verifier/` ou `learner/verifier/`) — a análise DDD chama isso de "naming smell" explícito. `games/`: **deletar/migrar** (já flagado na auditoria #despejo) |
| `engines/codexDojo/src/data/` | `linuxApps.ts` + `render/linuxLab.ts` | Capacidade de negócio distinta (simulador Linux) dentro do dashboard | **Split up**: módulo próprio, fora do dashboard read-only |

**Regra validada:** nos demais engines a estrutura é achatada e saudável (componentes só em folhas;
voxelDojo com 16 folhas uniformes é o melhor exemplo).

---

## Pattern 4 — Análise de Coupling (força × distância × volatilidade)

Volatilidade medida por commits/arquivo-touch nos últimos 60 dias:
`curriculum` 1.008 · `pixelDojo` 724 · `voxelDojo` 448 · `codexDojo` 230 · `minimaxDojo` 167 ·
`miniMaxEvolutionEngine` 86 · `learner` 62 · `openclaw` 38. Subdomínios core (alta volatilidade):
Learner Journey, Teaching Games. Genéricos (baixa): Hermes, dashboard.

### Mapa de dependências anotado

```
[games ×17+16] --[FUNCTIONAL:symmetric ×17]--> [contrato de evidência]     🔴
[verifier]     --[MODEL/INTRUSIVE: write_text no YAML canônico]--> [learner/] 🔴
[pixelDojo/games órfã] --[FUNCTIONAL:symmetric, schema divergente]--> [voxelDojo] 🔴
[openclaw]     --[INTRUSIVE: regex sobre prosa]--> [pipeline_status.md]    🟠
[minimaxDojo]  <--[FUNCTIONAL:symmetric (Shared Kernel doc.)]--> [miniMaxEvolutionEngine] 🟡
[predictions.py] --[INTRUSIVE: bypass single-writer]--> [learner/predictions.yaml] 🟠
[substrate]    --[CONTRACT: views geradas + header]--> [codexDojo, whiteboard, slices] 🟢
[games]        --[CONTRACT: NDJSON publicado]--> [verifier]                 🟢
[adapters openclaw] --[CONTRACT: eventos Hermes idempotentes]--> [bus]      🟢
[catalog.md]   <--[FUNCTIONAL:symmetric]--> [BACKLOG_STATUS.md]             🟠
[voxelDojo]    --[CONTRACT compartilhado]--> [learner.gate]                  🟢
```

### Issues por severidade

**🔴 CRÍTICO — Emissor de evidência bifurcado ×17**
Força: ALTA (funcional simétrico — mesma regra de negócio, 17 cópias, md5 todos distintos).
Distância: ALTA (17 projetos standalone sem workspace). Volatilidade: ALTA (pixel 724 + voxel 448
touches/60d — as áreas mais quentes do repo). `EFFORT = 1×1×1`. Mudar o contrato de evidência hoje
exige 17 edições manuais sincronizadas no caminho que alimenta o gate.
→ **Recomendação:** shared library (P2.1). Maior alavancagem do relatório.

**🔴 CRÍTICO — Verifier escreve o canônico por representação interna**
`verifier/__init__.py:320` faz `write_text` direto em `learning_state.yaml` (não-atômico; conhece o
formato interno do arquivo). Força: ALTA (model coupling na escrita, embora use `validate()` do
substrato como contrato de leitura). Distância: MÉDIA-ALTA. Volatilidade: ALTA (arquivo mais core
do sistema). → **Recomendação:** substrato expõe API única de escrita gateada
(`record_gate_review()`) com escrita atômica (reusar `openclaw.fsio.atomic_write_text`); verifier
passa a contract coupling puro. Resolve também o risco #1 da auditoria.

**🔴 CRÍTICO — Árvore órfã `pixelDojo/games/` (39,6% da plataforma)**
Conteúdo 3D duplicado do voxelDojo sob engine errado, com schema de evidência divergente
(`02_key_value_store-v1`). Coupling simétrico com voxelDojo sem nenhuma sincronização.
→ **Recomendação:** deletar/migrar antes de qualquer outra consolidação — remove 28,6k LOC de ruído
das análises e do contrato.

**🟠 ATENÇÃO — openclaw ↔ `pipeline_status.md` (intrusivo)**
Regex sobre prosa Markdown que não foi desenhada como interface. Força ALTA, distância ALTA,
volatilidade MÉDIA (learner 62 touches). → front-matter YAML estruturado (auditoria #11).

**🟠 ATENÇÃO — `predictions.py` bypassa o single-writer** → rotear pelo substrato (DDD, ACL).

**🟠 ATENÇÃO — `catalog.md` ↔ `BACKLOG_STATUS.md`** — simétrico, distância BAIXA (mesmo diretório),
volatilidade ALTA (curriculum é a área mais quente: 1.008 touches) → complexidade local; gerar um a
partir do outro.

**🟡 ACEITÁVEL — Shared Kernel minimaxDojo ↔ miniMaxEvolutionEngine** — força alta, distância alta,
mas duplicação documentada; exige drift-check (P2.2) para permanecer aceitável.

### Padrões positivos ✅

- `substrate.sync()` → views com header AUTO-GENERATED: **contract coupling exemplar** (Open Host
  Service). Exceção: 15/16 reviewSlices do voxel não são de fato gerados (auditoria #4) — o padrão
  é bom, a cobertura é que falta.
- Evidência NDJSON validada na emissão + verifier source-agnostic: Published Language real.
- Hermes: eventos imutáveis com idempotência por content-hash — contrato limpo (embora sem
  consumidores externos ainda).

---

## Pattern 5 — Agrupamento por Domínio

Base: [docs/DOMAIN_ANALYSIS_2026-07-08.md](DOMAIN_ANALYSIS_2026-07-08.md) (DDD estratégico, 2026-07-08), validada contra
os Patterns 1–4 acima. Mapeamento componente → domínio:

| Domínio (bounded context) | Tipo | Componentes | % plataforma | Coesão |
| ------------------------- | ---- | ----------- | -----------: | ------ |
| **Learner Journey & Mastery** (`LearnerJourneyContext`) | Core | `learner/` + `learner/substrate` + **verifier** (hoje mal posicionado em pixelDojo) | ~4% | ✅ Alta como conceito; API de escrita única resolve o resto |
| **Teaching Games / Evidence** (`TeachingGameContext-{Pixel,Voxel}`) | Core ×2 | `pixel-quest/`, `voxelDojo/game-*` (16), emissor de evidência (a extrair como lib) | ~47% | ✅ Alta entre si (contrato); 🔴 árvore órfã `games/` deve sair |
| **Tutoring Agent Roster** (`TutoringAgentContext`) | Core | `minimaxDojo` + `miniMaxEvolutionEngine` (Shared Kernel em 2 plataformas) | ~2% | ⚠️ Média — drift de thresholds; precisa drift-check |
| **Polyglot Project Cycle** (`PolyglotProjectCycleContext`) | Supporting | openclaw + subagents de ciclo do MME + `pipeline_status.md` | ~2,5% | ⚠️ Média — 2 implementações não reconciliadas |
| **Curriculum Catalog** (`CurriculumCatalogContext`) | Supporting | `curriculum/` (catalog + BACKLOG + 18 projetos) | (conteúdo) | ⚠️ Média — 2 fontes de verdade manuais |
| **Polyglot Arena** (`PolyglotArenaContext`) | Supporting (nascente) | `curriculum/_shared/arena/` | <1% | ❌ Baixa — viola single-writer |
| **Learner Dashboard** (`LearnerDashboardContext`) | Generic | codexDojo (menos linuxLab) | ~6% | ⚠️ Média — dados copiados à mão + Linux Lab intruso |
| **Event Bus Infra** (`EventBusInfraContext`) | Generic | `openclaw/hermes` + `.mavis/hermes/` | ~1% | ❌ Contexto sem consumidores — rotular como experimental |

**Validação de agrupamento (coesão):** 8 domínios (dentro da faixa ideal 3–7+1); vocabulários são
disjuntos e documentados (contrato dos jogos, interface do substrato, tópicos `dojo.*`). Os dois
únicos componentes cuja **atribuição diverge da estrutura física atual** são: o **verifier**
(pertence ao Learner Journey, mora em pixelDojo) e o **Linux Lab** (não pertence a domínio nenhum
dos 8 — capacidade separada dentro do codexDojo). A árvore `pixelDojo/games/` não pertence a
domínio algum (artefato de merge).

---

## Recomendações Consolidadas (entrada para o roadmap — Pattern 6)

Prioridade por alavancagem (evidência dos patterns + auditoria). Detalhe operacional por item
(paths concretos, ordem de moves) em
[COMPONENT_DOMAIN_MAP_2026-07-08.md](COMPONENT_DOMAIN_MAP_2026-07-08.md) ("Namespace / Path
Realignment Plan") — atualizar os dois juntos:

1. **Deletar/migrar `engines/pixelDojo/games/`** (P1+P3+P4) — remove o maior componente da
   plataforma, que é ruído.
2. **Extrair emissor de evidência para lib única** (P2+P4, 🔴) — 17 cópias divergentes no caminho
   mais quente e mais crítico do contrato.
3. **API de escrita única e atômica no substrato para o gate** (P4, 🔴) — verifier vira contract
   coupling; fecha auditoria #1.
4. **Realocar o verifier para namespace compartilhado** (P3+P5) — corrige o naming smell de
   ownership.
5. **Estender geração do substrato**: reviewSlices voxel ×15 (contrato quebrado), codexDojo
   `projects/agents/cycle.ts`, `catalog.md`⇄`BACKLOG_STATUS.md` (P2).
6. **Drift-check do Shared Kernel** minimaxDojo⇄MME (thresholds/roster) (P2+P4).
7. **`pipeline_status` estruturado** + decisão explícita sobre o papel do openclaw (P4+P5).
8. **Workspace compartilhado** (34 `biome.jsonc` idênticos, 36 `package.json`) — infra, ganho de
   manutenção (P2.5).
9. **Split do Linux Lab** para fora do codexDojo (P3+P5).
10. Higiene de raiz: planejamento → `docs/`, artefatos de teste fora do git (P3).

> **Próximo passo:** para fases, marcos e ordem de extração detalhada, rodar o skill
> **decomposition-planning-roadmap** usando este relatório como insumo.

## Fechamento das recomendações — 2026-07-11

As medições e diagnósticos acima registram o estado observado em 2026-07-08 e
permanecem históricos. A matriz abaixo registra o fechamento no código atual. O
fechamento inclui decisões explícitas quando a arquitetura implementada tornou a
forma original da recomendação desnecessária.

| # | Recomendação atômica | Estado em 2026-07-11 | Evidência atual |
| -: | --- | --- | --- |
| 1 | Remover a árvore órfã `pixelDojo/games/` | Fechada | A árvore não existe; `pixel-quest/` é o único app Pixel canônico. |
| 2 | Unificar o emissor de evidência | Fechada | `engines/shared/teaching-evidence/` publica `@aidevschool/evidence`; Pixel e Voxel o consomem pelos workspaces locais. |
| 3 | Expor escrita atômica do gate no substrato | Fechada | `learner.substrate.gate.commit_gate_transition()` persiste pela API canônica. |
| 4 | Realocar o verificador compartilhado | Fechada | `learner/gate/` avalia evidência de qualquer engine e chama somente a API do substrato. |
| 5 | Gerar todos os `reviewSlice.ts` do Voxel | Fechada | `python3 -m learner.substrate` faz fan-out para todos os pacotes `game-*`. |
| 6 | Gerar `projects.ts`, `agents.ts`, e `cycle.ts` | Fechada | `catalog.py` e `dashboard_data.py` geram os três módulos com cabeçalho de arquivo gerado. |
| 7 | Tornar catálogo e backlog um único fluxo | Fechada | `curriculum/catalog.md` é canônico; o substrato gera `BACKLOG_STATUS.md` e `projects.ts`. |
| 8 | Detectar drift de thresholds e roster | Fechada | Configuração de dashboard/roster vive em YAML; testes de drift comparam o contrato do minimaxDojo e o motor Claude. |
| 9 | Estruturar o estado do ciclo | Fechada | `learner/pipeline_status.yaml` é a fonte de máquina; Markdown contém somente narrativa humana. |
| 10 | Decidir o papel do OpenClaw | Fechada | ADR-0002 define um checklist runner simulate-grade, não um segundo dono do ciclo. |
| 11 | Documentar OpenClaw no handbook | Fechada | A tabela de engines e o fluxo de arquitetura incluem o runner e seu limite de autoridade. |
| 12 | Compartilhar infraestrutura JavaScript | Fechada por decisão | O root permanece agnóstico a package manager; Pixel e Voxel usam workspaces locais e dependências compartilhadas por link. |
| 13 | Consolidar boilerplate Three.js | Fechada | `voxelDojo/shared/{sceneHarness,viewport}.ts` forma o kit interno usado pelos jogos. |
| 14 | Separar Linux Lab do dashboard | Fechada | A compatibilidade vive em `codexDojo/src/linuxLab/`; o OS completo continua no bounded context próprio. |
| 15 | Corrigir higiene da raiz | Fechada | Planos históricos foram arquivados e artefatos gerados estão cobertos pela política de ignore. |
| 16 | Manter contrato cross-engine no pai | Fechada | `engines/test_engine_contracts.py` verifica fronteiras e exceções compartilhadas. |
| 17 | Rotear previsões da Arena pelo substrato | Fechada | `curriculum/_shared/arena/predictions.py` delega a `learner.substrate.prediction_store`. |
| 18 | Resolver o barramento Hermes sem consumidores | Fechada por remoção | Não há runtime Hermes; OpenClaw é somente o checklist runner baseado em arquivos. |

O diretório `engines/codexDojo/ecosystem/` permanece ativo como contrato de produto.
`Prometor` designa o contexto adversarial do gate de aprendizagem; o `Verifier`
do ciclo de cinco fases valida a saída de cada fase. Os nomes não representam
dois arquivos equivalentes nem autorizam o produtor a verificar o próprio trabalho.

---

## Anexo — Comandos de medição

```
LOC/arquivos:  find <comp> -prune(node_modules|dist|coverage) -name '*.ts|*.py|*.js|*.go|*.rs' | xargs grep -cve '^\s*$'
Duplicatas:    find engines ... \( evidence*.ts | biome.jsonc | reviewSlice.ts \) + md5sum | uniq -c
Volatilidade:  git log --since="60 days ago" --format="" --name-only | agrupado por engines/<nome>
Cross-imports: grep -rn "from engines|from learner" --include='*.py' learner/substrate engines/*/
```
