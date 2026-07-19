# Audit estendido — engines, curriculum, agents vs. VISION.md

| Campo | Valor |
| --- | --- |
| Status | **Draft para revisão do Daniel** (não é relatório final nem ADR) |
| Data | 2026-07-19 |
| Escopo | `engines/`, `curriculum/`, agent prompts (`engines/minimaxDojo/prompts/`, `engines/miniMaxEvolutionEngine/.claude/agents/`) |
| Critério | A ideia central vigente em [`docs/VISION.md`](VISION.md) |
| Complementa | [`docs/DOC_ALIGNMENT_REVIEW_2026-07-19.md`](DOC_ALIGNMENT_REVIEW_2026-07-19.md) (audit de 1ª linha: já aplicado) |

## TL;DR

A camada **canônica** (raiz, `docs/`, handbook) foi alinhada com a visão pelo review de 2026-07-19
— cinco correções aplicadas, todas verificadas. As camadas **engines, curriculum e agent prompts**
**não foram auditadas** e contêm o gap mais importante: a peça que falta pra visão pode já existir,
mas está **invisível**.

> **A descoberta chave:** `engines/miniTown/` é um simulador cozy de cidade (Townscaper + A Short
> Hike) com plano completo de 5 tasks, decisão `plan_complete: true`, 31/31 testes verdes. **Não
> está em `engines/AGENTS.md`, no MANIFEST do codexDojo, no handbook, nem na VISION.md.** Pode ser
> o "Nível 0 / entrada cozy" que a visão pede — ou pode ser um experimento paralelo. Decidir.

---

## 1. Inventário por categoria

### 1.1 Engines ativas (com presença documental)

| Engine | Tipo | Coberto por docs? | Menciona visão? |
|---|---|---|---|
| `engines/codexDojo/` | Dashboard Vite/TS (controle) | ✅ sim | parcial ("control surface for a continuous multi-agent software engineering school") |
| `engines/codexdojo-os-prototype/` | OS educacional React/Vite | ✅ sim | parcial ("educational Linux desktop where each application can become a computing fundamentals lab") |
| `engines/pixelDojo/` | Jogo 2D ensino (pixel-quest) | ✅ sim | **não** — foco em "curriculum subjects" e gates de evidence |
| `engines/voxelDojo/` | Simulações 3D Three.js | ✅ sim | **não** — "threejs-dojo", HASH RING |
| `engines/minimaxDojo/` | Core 14 agentes | ✅ sim | **não** — "MiniMax" + 14 agentes + state machine |
| `engines/miniMaxEvolutionEngine/` | Motor Claude Code 5 fases | ✅ sim | **não** — dev workflow, .claude/agents |
| `engines/openclaw/` | Runner file-based | ✅ sim | n/a (infra) |
| `engines/shared/` | Primitivos de evidence | ✅ sim | n/a (infra) |
| `engines/phantasy-codex-adventure/` | Jogo (legado) | parcial | n/a |
| **`engines/miniTown/`** | **Simulador cozy de cidade** | **❌ NÃO COBERTO** | **❌ invisível** |

**10 engines existem, 1 está fora do inventário.** Isso é a fonte #1 de desalinhamento silencioso.

### 1.2 Curriculum (atual)

- 18 projetos em `curriculum/01..18_*`, **100% poliglota Go/Rust/Node**, todos com mecânica
  avançada (rate limiter, KV store, distributed cache, Raft, search engine).
- Nível 1 já exige **token bucket + concorrência**. Sem entrada para não-técnicos.
- `curriculum/AGENTS.md` é governança, não fala de público.
- 1 trilha implícita: programador intermediário→avançado.
- 0 trilhas: não-técnicos, IA-no-dia-a-dia, primeiros passos.

### 1.3 Agent prompts (quem ensina)

| Agente | Audiência implícita | Compatível com visão dupla? |
|---|---|---|
| `socrates.md` | Dev intermediário, "Dreyfus novice→expert", STAP, 15 hints/dia | parcial — sofisticado, mas pressupõe "linguagem foco" |
| `mestre_conteudo.md` | Dev, "faded worked examples + Parsons Problems" em ⟪LINGUAGEM_FOCO⟫ | parcial — bom pra dev; sem modo "explica em linguagem natural" |
| `sonda.md` | Dev, "escreva 1 teste em TS" | **não** — gate pressupõe código |
| `promotor.md` | Adversarial verifier de code/benchmarks | **não** — sem modo "no-code verifier" |
| `galileu.md` | Benchmarks estatísticos | **não** — sem paralelo "mediu que melhorou a rotina?" |
| `minemosyne.md` | Memory, 3 camadas | parcial — design agnostic, mas perfil carrega "linguagem foco" |
| 8 outros agentes | Variados | em geral pressupõem dev |

**Nenhum agente tem um modo "non_developer" declarado.**

---

## 2. A descoberta: `engines/miniTown/`

### 2.1 O que é (de fato)

Engine Three.js/Vite com:

- Visual "Low-poly stylized 3D" entre Townscaper, A Short Hike e pixel-art 3D
- 5 tasks completas: skeleton (T1), world-construction (T2), agent-simulation (T3), UI/HUD (T4),
  integration-verify (T5)
- Dia/noite 5min = 24 sim-hours, 7 fases (dawn→morning→noon→afternoon→sunset→dusk→night)
- 3 tipos de zona (residential/shop/workspace), 5 estágios de construção (plot→foundation→frame→roofed→inhabited)
- Residentes low-poly + carros com car-following
- HUD mínimo: zone palette (Explore/Res/Shop/Workspace), time bar, hover tooltip
- **"No menus, no settings panel, no pause button — keep it light and observational. Day/night is automatic."**
- Evidence contract via `window.__miniTown`

### 2.2 Estado (factual)

| Métrica | Valor | Fonte |
|---|---|---|
| Linhas de código | ~30 arquivos TS, scene/ sim/ game/ ui/ evidence/ | `engines/miniTown/src/` |
| Tests | 31/31 passando | `decision.json` |
| Build | verde (`pnpm run build`) | `decision.json` |
| Dev server | 200 em `/` | `decision.json` |
| Plan status | `plan_complete: true` | `.mavis/plans/decision.json` |
| README | **ausente** | `ls engines/miniTown/README.md` → no such file |
| AGENTS.md | **ausente** | `ls engines/miniTown/AGENTS.md` → no such file |
| Em `engines/AGENTS.md`? | **não** | `grep miniTown engines/AGENTS.md` → 0 hits |
| Em MANIFEST do codexDojo? | **não** | (não verificado, mas o padrão de "engines fora do inventário" é claro) |
| Em `docs/handbook/`? | **não** | `find docs/handbook -name '*miniTown*'` → 0 hits |
| Em VISION.md? | **não** | (era a 1ª pergunta do audit) |

### 2.3 Por que isso importa pra visão

A **pegada Duolingo** que a VISION.md pede (pequenas lições, baixa fricção, tom amigável,
"roda com duplo-clique" depois) tem vários candidatos a **engine de massa** no repo:

- `pixelDojo/pixel-quest`: tem mecânica Duolingo no tom (SONDA dialogue, ambientado em
  "Laboratório de Robustez") mas é top-down RPG com currículo pesado por trás.
- `codexdojo-os-prototype`: experiência Linux desktop bonita, mas "computing fundamentals lab"
  ancora em código.
- **`miniTown`**: **simulador cozy**. **Não fala de código em lugar nenhum.** Townscaper + A
  Short Hike é a estética que **a pessoa não-técnica** reconhece como "cozy, posso mexer sem
  medo".

Se miniTown for posicionado como **Nível 0 / entrada cozy**, ele vira a **prova executável** de
que a visão dupla é viável: o segundo motor existe, o código está pronto, é só falta
classificar.

Se for um experimento paralelo, ele precisa de uma **decisão de manutenção** (manter / arquivar
em `docs/archive/` / promover).

---

## 3. Gap analysis por eixo da VISION.md

### 3.1 Pequenas lições

| Onde | Estado |
|---|---|
| Definição estrutural (átomo) | 🟢 `learner/CONTEXT.md` define; pixelDojo "1 conceito → 1 mecânica" |
| Mecânica real fora dos jogos | 🔴 "Attempt em MD + pytest + gates" = ciclo de estudo, não micro-lição de 5 min |
| **microTown como micro-lição** | 🟡 **engine pronto, mas sem trilha pedagógica atrelada** |
| Trilha curta de IA-prática | 🔴 não existe |

### 3.2 Pegada Duolingo

| Onde | Estado |
|---|---|
| Spaced repetition (FSRS) | 🟢 `docs/design/spaced-repetition-streak/` (única doc que cita Duolingo) |
| Streak / freeze | 🟢 learner state tem |
| Mecânica de toque (miniTown = swipe to build) | 🟡 engine existe, mecânica existe, sem framing Duolingo |
| Tom narrativo infantilizado | 🟢 só em pixel-quest/dialogues/sonda.md; resto do repo é sênior |
| Hearts/leaderboards | 🟢 excluídos por design (correto) |
| Mascote / sequência diária curta | 🔴 não existe |

### 3.3 Democratização

| Onde | Estado |
|---|---|
| VISION.md registrada | 🟢 feito hoje |
| Onboarding de não-dev | 🔴 não existe |
| Quick path "abrir e funcionar" | 🔴 exige Node/pnpm/Python |
| Replicação da instância | 🔴 manual |
| Engine voltado ao público amplo | 🟡 **`miniTown` é o candidato, mas não está classificado** |

### 3.4 Programadores (o que já funciona)

🟢 Cobertura forte:

- 18 projetos poliglotas com benchmark/evolution/verdict
- 14 agentes, ciclo de 5 fases, gates empíricos
- Coverage ≥ 80%, mutation ≥ 60%, benchmark N≥3 como critério
- Spaced repetition, FSRS, streak, freeze
- Toda a infra de audit (TECH_DEBT, DOMAIN_ANALYSIS, COMPONENT_DOMAIN_MAP, MODULAR_DECOMPOSITION,
  ARCHITECTURE_EVALUATION)

A visão "dois públicos" pede **manter isso e somar o outro público**, não substituir.

---

## 4. Recomendações (P0 → P3, com esforço)

### P0 — não-destrutivo, baixo risco (15 min)

- [ ] Promover `engines/miniTown/` no inventário: adicionar linha em `engines/AGENTS.md`
      (STRUCTURE e WHERE TO LOOK) e uma entrada em `engines/codexDojo/ecosystem/MANIFEST.md`.
      Não muda código. Não promete nada. Só classifica.
- [ ] Criar `engines/miniTown/README.md` mínimo (10 linhas): o que é, como rodar, que tipo de
      engine, qual status (MVP/beta), onde está a evidência. Não toca em código.

### P1 — posicionar (decisão de produto, mas baixa fricção)

- [ ] Decidir: miniTown é o Nível 0 / entrada cozy? (ou arquivar em `docs/archive/`)
- [ ] Se sim: adicionar parágrafo em VISION.md reconhecendo miniTown como o motor do público
      não-técnico.
- [ ] Adicionar entrada "Nível 0" em `curriculum/catalog.md` apontando pra miniTown.

### P2 — adaptar agent prompts (média fricção, alto valor)

- [ ] Adicionar `mode: developer | non_developer` em `engines/minimaxDojo/config/learner.yaml`
      (perfil_pedagogico).
- [ ] Sonda/Sócrates/Mestre-Conteúdo ganham ramo "non_developer": analogias do cotidiano, zero
      código, gate via "consegui aplicar no trabalho" (log escrito pelo aprendiz).
- [ ] Promotor ganha ramo "no-code verifier": sem pytest, sem mutation; em vez disso, checklist
      executável ("a IA disse X, verifiquei que X é verdade na minha realidade").

### P3 — onboarding zero-install (long-term)

- [ ] Build estático de miniTown + bundle de lições no codexdojo-os-prototype (já roda sem
      build de backend, só Vite static).
- [ ] `setup.sh onboard` que só precisa de `git clone` + `pnpm i` + `pnpm dev` em miniTown.
- [ ] Cloudflare Pages / Vercel static deploy do miniTown (link público pra mandar pra
      qualquer pessoa).

---

## 5. Itens que **NÃO** entram no escopo deste audit

- ADR definitivo sobre o futuro de cada engine.
- Mudanças em código de qualquer engine.
- Mudanças no curriculum/18.
- Decisão sobre replicação multi-learner.

Esses são consequência da **decisão de produto** que cabe ao Daniel, não ao audit.

---

## 6. Verificação: o que eu li pra escrever isto

- `engines/AGENTS.md` (8 engines listadas, miniTown ausente)
- 5 READMEs de engine (codexDojo, codexdojo-os-prototype, pixelDojo, voxelDojo, minimaxDojo)
- 2 DESIGN.md (codexDojo, codexdojo-os-prototype)
- 2 prompts de agent (socrates, mestre_conteudo)
- `engines/miniTown/docs/concepts/CONCEPTS.md` (visual direction completa)
- `.mavis/plans/miniTown.yaml` (5 tasks)
- `.mavis/plans/decision.json` (plan_complete: true)
- `curriculum/catalog.md` (18 projetos, todos poliglotas)
- `docs/design/spaced-repetition-streak/README.md` (única âncora Duolingo)
- `docs/DOCUMENTATION.md`, `README.md`, `CLAUDE.md`, `docs/handbook/README.md` (canônica)
- `docs/VISION.md`, `docs/PROMPTS/-01_GOAL.md`, `docs/PROMPTS/00_IDEIAS_minimax.md`

**Não li (propositalmente):** `node_modules/`, `dist/`, `.mavis/plans/persona-*` (14 personas),
loop memory, evidence packages, code review reports antigos.

---

## 7. Próximo passo sugerido

1. **Daniel decide** sobre miniTown (P0 + P1): promover, arquivar, ou esperar.
2. Se promover: o audit orienta 4 edits de doc (engines/AGENTS.md, miniTown/README.md, VISION.md,
   curriculum/catalog.md). ~30 min de trabalho de copy + 1 commit.
3. P2 (modo non_developer nos agentes) merece um chat focado à parte, com discussão sobre
   "como medir mastery sem código executável" — esse é o **único ponto** que toca o coração da
   regra de ouro (evidência executável) e exige repensar a porta empírica, não só a doc.

Este doc é draft. Não é relatório final. Não fez mudanças. Está aqui pra você decidir.
