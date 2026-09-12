# AID-15 — Mapa de aprendizagem do repositório AI DevSchool

Data da leitura: 2026-08-04  
Papel: UX Designer de Aprendizagem  
Escopo: leitura do handbook, contratos de jornada/evidência, manifests e pontos de entrada das experiências canônicas. Este documento é um mapa operacional; não altera currículo, gates, estado do aprendiz ou produção.

## Resumo executivo

AI DevSchool é um ecossistema educacional, não um único app. A arquitetura preserva **um aprendiz, um currículo compartilhado e múltiplas engines**. O ponto de entrada canônico é `engines/codexdojo-os-prototype/`; ele recomenda **IA Prática** para pessoas não técnicas ou **Trilha Dev** para programadores e hospeda a jornada, enquanto engines especializadas executam atividades.

A regra estrutural mais importante é: uma tentativa e sua conclusão local não equivalem a domínio. A engine produtora emite evidência bruta; um verificador separado decide PASS/FAIL; somente o substrato do aprendiz pode persistir uma transição canônica. XP, streak, checkpoints e `completed` são sinais locais de continuidade e nunca autorizam `mastered`.

## Mapa do sistema

| Camada | Componentes | O que oferecem | Autoridade sobre progresso |
| --- | --- | --- | --- |
| Host da jornada | `codexdojo-os-prototype` | Onboarding, escolha de trilha, hub, mapa, mentor, catálogo e integração de engines | Lê projeção canônica; mantém apenas continuidade local |
| Superfícies de aprendizagem | `literacyDojo`, `miniTown`, `pixelDojo`, `voxelDojo` | Microlições não técnicas, exploração Level 0, jogo 8-bit e simulações 3D | Produzem interação/evidência; não marcam domínio |
| Superfície operacional | `codexDojo` | Dashboard de aprendiz, agentes, ciclo e roadmap | Somente leitura |
| Tutoria/orquestração | `minimaxDojo`, `miniMaxEvolutionEngine` | Núcleo de 14 agentes e motor Claude Code do ciclo em cinco fases | Opera sob gates; produtor e verificador ficam separados |
| Runner | `openclaw` | Checklist de artefatos em modo simulate-grade | Avança fases por critérios de arquivo; não substitui verificação pedagógica |
| Fonte compartilhada | `curriculum/`, `learner/` | Catálogo, conteúdo, tentativas, estado, agenda e trilha auditável | Fonte canônica no filesystem |
| Projeções derivadas | `.mavis/` e módulos gerados das engines | Read models específicos de cada superfície | Nunca devem ser editados ou sincronizados de volta |

## Jornada canônica entendida

```text
orientar → tentar → receber feedback → pedir dica (opcional) → tentar de novo
→ produzir evidência bruta → verificação independente → resultado local
→ gate canônico opcional
```

Cada etapa tem uma distinção de autoridade visível ao aprendiz:

- **Orientação:** objetivo, critério de sucesso e limite de dados.
- **Tentativa:** ação avaliável antes de uma solução completa.
- **Feedback:** critérios determinísticos dizem o que passou e o que melhorar.
- **Dica e retry:** preservam raciocínio; retry cria uma nova identidade de tentativa.
- **Evidência:** registro estruturado, vinculado à atividade, sem dados livres sensíveis por padrão.
- **Verificação:** contexto separado aceita ou rejeita o digest exato da evidência.
- **Resultado local:** diferencia conclusão, evidência, recibo e estado canônico.
- **Mastery:** apenas uma transição atômica aceita pelo gate do substrato.

O contrato de microlição visa um conceito observável em cerca de 3–5 minutos, com uma ação principal por etapa, linguagem simples, feedback imediato, dica progressiva, retomada e acessibilidade por teclado, foco visível, contraste e feedback não dependente apenas de cor.

## Experiências e bounded contexts

### codexDojo OS — host canônico

- Stack observada: React 19, TypeScript, Vite 8, Vitest, Testing Library, Playwright e Biome.
- `src/App.tsx` roteia a raiz para `JourneyApp` e mantém `/desktop` como superfície secundária.
- Oferece desktop, launcher, janelas, Dojo Tracks, Terminal, Files, Architecture Map, App Center e Engine Hub.
- Integra engines por iframes/origens configuradas e ações locais fixas; build estático não oferece ações locais.
- IndexedDB guarda continuidade local, não domínio canônico nem sincronização entre dispositivos.

### LiteracyDojo — IA Prática

- Stack observada: React 18, TypeScript/Vite 6, Vitest, Testing Library, Playwright e Biome.
- Consome conteúdo canônico de `curriculum/ai-literacy/` por read model gerado.
- É local-first e pode registrar no máximo `completed`; `LiteracyEvidenceRecord` precisa de verificação independente para qualquer gate elegível.

### miniTown — entrada exploratória Level 0

- Stack observada: TypeScript, Three.js, Vite, Vitest e Playwright.
- É deliberadamente explore-only: ajuda orientação e descoberta, mas não participa do ciclo avaliado e nunca escreve estado do aprendiz.

### pixelDojo — jogo 8-bit

- Stack observada: workspace pnpm, TypeScript, Three.js, Vite, Vitest, Playwright e Biome.
- `pixel-quest` transforma um conceito em mecânica jogável e emite evidência estruturada.
- O jogo é produtor, não verificador; smoke tests devem provar inclusive a ausência de escrita em mastery.

### voxelDojo — simulações 3D

- Stack observada: catálogo pnpm de 16 pacotes `game-*`, TypeScript, Three.js, Vite, Vitest, Playwright e Biome.
- Usa núcleos determinísticos/headless com projeção Three.js; `game-10-hash-ring` é a referência.
- Compartilha o contrato de teaching evidence com jogos, sem enfraquecer o gate.

### codexDojo — dashboard operacional

- Stack observada: TypeScript estrito, Vite 7, Vitest/jsdom e Biome; zero dependências de runtime.
- UI vanilla com fluxo unidirecional/reducer e templates HTML.
- Mostra snapshot, agentes, ciclo e roadmap; é read-only e não é a entrada canônica do aprendiz.

### minimaxDojo, miniMaxEvolutionEngine e openclaw

- `minimaxDojo`: especificação/prompt layer e referência Python do núcleo de tutoria com 14 papéis; thresholds numéricos vivem em `config/learner.yaml`.
- `miniMaxEvolutionEngine`: motor Claude Code do ciclo Spec → Implement → Review → Benchmark → Optimize, exposto por agentes e comandos locais.
- `openclaw`: runner Python de checklist de artefatos; útil para simular avanço de fase, mas não executa a tutoria interativa.

## Stack do ecossistema

| Área | Tecnologias observadas |
| --- | --- |
| Apps web | TypeScript, React em OS/Literacy, DOM vanilla em codexDojo, Three.js em miniTown/pixel/voxel |
| Build e pacotes | Vite 6–8, npm em OS/Literacy, pnpm nos workspaces de jogos/dashboard |
| Qualidade web | TypeScript strict, Biome, Vitest, Testing Library, Playwright |
| Substrato e runners | Python 3.11+, PyYAML, FSRS, pytest/unittest |
| Currículo de programação | Implementações Node em projetos 01–18; o projeto 01 também mantém Go e Rust |
| Estado/evidência | YAML, Markdown e NDJSON auditáveis; projeções TypeScript/Markdown geradas |

O repositório raiz não possui um package manager único. Os comandos de `make` cobrem apenas as suítes Python compartilhadas; cada app mantém seu próprio lockfile e comandos.

## Fontes de verdade e limites que orientam UX

1. `learner/learning_state.yaml` é o estado canônico; engines consomem projeções geradas.
2. `curriculum/catalog.md` e os contratos específicos governam conteúdo e evidência.
3. A UI precisa distinguir de forma explícita **tentativa**, **concluído localmente**, **evidência produzida**, **verificado** e **dominado**.
4. Falha de validação, FAIL do verificador e indisponibilidade de transporte são estados diferentes; nenhum pode degradar para PASS.
5. A mesma cadência pedagógica atravessa as trilhas, mas os schemas e atividades permanecem específicos do bounded context.
6. Alterações em prompts, roadmap, gates, memória ou cobertura de entregáveis exigem atualização do manifesto do ecossistema e ownership apropriado.

## Riscos e lacunas relevantes já documentados

O contrato de jornada declara conformidade cross-engine **parcial** em 2026-08-04. Quatro lacunas impedem alegar conformidade completa:

- envelope de teaching-game ainda não separa explicitamente track, versão do schema, versão canônica do conteúdo e produtor;
- recibo genérico ainda não vincula versão do verificador, timestamp e reason codes;
- recibo de Literacy também carece de versão do verificador e timestamp;
- não existe uma execução gravada única, revisada de forma independente, cobrindo o protocolo de aceite nas duas trilhas.

Há ainda uma diferença importante entre visão e capacidade atual: o gate Level 0 baseado no checklist falsificável está especificado, mas o substrato v2 não persiste essa classe de evidência. Logo, conclusão local de Level 0 não pode ser promovida a `mastered` hoje.

## Implicações práticas para futuras tarefas de UX

- Auditar primeiro a raiz do OS, a recomendação IA Prática/Trilha Dev e a passagem para a primeira missão; `/desktop` é secundário.
- Avaliar a jornada ponta a ponta por estados e autoridade, não apenas por telas isoladas.
- Tratar clareza entre conclusão local e mastery como requisito de compreensão, mensurável em teste de usabilidade.
- Respeitar padrões visuais existentes por engine; coerência cross-engine deve vir do ciclo, da terminologia e dos estados, não de um novo design system paralelo.
- Separar evidência observada, hipótese de fricção e preferência estética em qualquer auditoria.
- Não propor mudanças em gates ou resultados de aprendizagem sem escalar para curriculum ownership; riscos de acessibilidade, performance ou integração vão para technical ownership.

## Verificação desta aprendizagem

Leitura cruzada realizada em:

- `docs/handbook/README.md` e guias de arquitetura, engines, currículo e substrato;
- `docs/design/canonical-learner-journey.md`;
- `docs/design/micro-lesson-contract.md`;
- manifests `package.json`, `pyproject.toml` e pontos de entrada de apps;
- instruções raiz `AGENTS.md` fornecidas no contexto da issue.

Este trabalho verifica compreensão por rastreabilidade a fontes e código, não por execução das suítes. Nenhum código, currículo, gate, estado do aprendiz ou ambiente de produção foi alterado.
