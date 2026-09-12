# AID-13 — Inventário técnico da stack

Data de referência: 2026-08-04

Este documento complementa `AID-13_REPOSITORY_OPERATIONAL_MAP_2026-08-04.md` com a visão técnica por módulo. O repositório não é um monólito: é um ecossistema poliglota com estado educacional compartilhado e várias superfícies executáveis independentes.

## Resumo da stack

| Família | Tecnologias centrais | Papel |
| --- | --- | --- |
| Substrato e orquestração | Python 3.11+, PyYAML, FSRS, pytest/unittest | Estado canônico do aluno, gates, projeções, tutor e runner |
| Apps educacionais web | TypeScript, Vite, Vitest, Biome | Dashboards e experiências locais |
| Apps React | React, React DOM, Testing Library, jsdom, Playwright | OS educacional e AI Literacy |
| Jogos 2D/3D | TypeScript, Three.js, Vite, Vitest, Playwright | Experiências pedagógicas com evidência executável |
| Projetos curriculares | Node.js, TypeScript; Express em projetos de serviço | Implementações verificáveis dos desafios compartilhados |
| Contrato de evidência | pacote local `@aidevschool/evidence`, JSON/NDJSON | Integra produtor, verificador e gate de aprendizagem |

## Stack por engine e superfície

| Módulo | Runtime e framework | Qualidade e teste | Observação operacional |
| --- | --- | --- | --- |
| `engines/codexDojo` | TypeScript + Vite, DOM sem React | Biome, Vitest, jsdom | Dashboard e documentação de produto; mudanças contratuais também alcançam o manifesto do ecossistema |
| `engines/codexdojo-os-prototype` | React + TypeScript + Vite | Biome, Vitest, Testing Library, jsdom, Playwright | Experiência OS canônica; lê snapshot derivado e não concede `mastered` |
| `engines/dojoToday` | TypeScript + Vite | Biome e `selfcheck` | Superfície diária integrada ao pacote local de evidência |
| `engines/literacyDojo` | React + TypeScript + Vite; conteúdo YAML gerado | Biome, Vitest, Testing Library, fake-indexeddb, Playwright | App local-first para público não técnico; conteúdo canônico deve ser regenerado antes da validação |
| `engines/miniTown` | TypeScript + Three.js + Vite | Biome, Vitest, Playwright | Exploração Level 0; não escreve estado do aluno |
| `engines/pixelDojo` | workspace pnpm 9; TypeScript + Three.js + Vite | Biome, Vitest, Playwright | Workspace 2D; `pixel-quest` é o app executável e produz evidência via pacote compartilhado |
| `engines/voxelDojo` | catálogo TypeScript + Three.js + Vite | Biome, Vitest, Playwright por jogo | Workspace 3D; `game-10-hash-ring` é a referência arquitetural |
| `engines/minimaxDojo` | Python | pytest | Núcleo profundo de tutoria; thresholds numéricos vêm de `config/learner.yaml` |
| `engines/openclaw` | Python e arquivos de checklist | pytest | Runner das cinco fases `simulate-grade`; registra processo auditável |
| `engines/miniMaxEvolutionEngine` | Claude Code, shell e artefatos Markdown/YAML | validações próprias dos comandos e hooks | Motor de agentes; não substitui o estado canônico do aluno |
| `learner/substrate` | Python, PyYAML e FSRS | pytest/unittest | Valida YAML canônico e regenera projeções em `.mavis/` e engines |
| `engines/shared/teaching-evidence` | pacote TypeScript local | consumido pelos workspaces | Primitivas transversais de evidência; evita contratos incompatíveis por engine |

## Currículo executável

`curriculum/` é a fonte compartilhada dos desafios e de suas evidências. Existem 18 trilhas `node-impl`, de `01_rate_limiter` a `18_search_engine`, predominantemente em Node.js e TypeScript. Cada projeto mantém seu próprio manifesto e configuração TypeScript, portanto versões e scripts devem ser validados no diretório do projeto, não inferidos da raiz.

O projeto `02_key_value_store/node-impl` é a trilha de referência atualmente verificada. Sua stack inclui Express, TypeScript, Vitest, Supertest, ESLint e cobertura V8. Os demais projetos seguem o padrão de implementação isolada, mas não devem herdar alegações de robustez ou benchmark do projeto de referência sem evidência própria.

## Camada Python compartilhada

O `pyproject.toml` define Python 3.11 ou superior e centraliza apenas as dependências das ilhas Python compartilhadas:

- `pyyaml>=6,<7` para estado e conteúdo YAML;
- `fsrs>=6,<7` para repetição espaçada;
- `pytest>=8,<9` como dependência opcional de desenvolvimento.

O `Makefile` não é um build global do ecossistema. Seus alvos cobrem somente as suítes Python compartilhadas: instalação editável, suíte agregada, tutor core e learner substrate.

## Autoridade e fluxo de dados

1. `learner/` e `curriculum/` guardam as fontes canônicas.
2. `learner.substrate.validate` aplica invariantes sobre esse estado.
3. `learner.substrate.sync` gera projeções para `.mavis/` e engines consumidoras.
4. Engines apresentam experiências e produzem tentativas ou evidências, mas não promovem domínio por conta própria.
5. A promoção para `mastered` exige tentativa e verificação independente compatível com o gate declarado.

Essa separação é a decisão arquitetural mais importante do repositório: interfaces podem evoluir localmente, enquanto progresso, currículo e evidência permanecem compartilhados e auditáveis.

## Estratégia de validação

| Escopo alterado | Validação mínima relevante |
| --- | --- |
| Python compartilhado | `make test`, ou o alvo específico `make test-core` / `make test-substrate` |
| `codexDojo` | lint, testes e build no diretório do engine |
| OS prototype | lint, testes, build e smoke |
| AI Literacy | gerar conteúdo, lint, testes, build e E2E |
| `miniTown` | lint, testes, typecheck, build e smoke |
| `pixelDojo` ou `voxelDojo` | comandos do workspace: lint, testes, typecheck, build e smoke |
| Projeto curricular | scripts definidos no `package.json` daquele projeto e evidência compatível com seu gate |

Não existe um comando raiz que valide todo o ecossistema Node/TypeScript. A seleção da suíte faz parte da responsabilidade de quem altera um bounded context.

## Riscos técnicos que orientam mudanças

- Estado derivado pode parecer editável: projeções devem ser regeneradas a partir do YAML canônico.
- Há múltiplos gerenciadores e escopos: npm e pnpm coexistem; o comando correto pertence ao engine.
- Passar no build visual não comprova aprendizagem: evidência e verificador independente continuam obrigatórios.
- O catálogo voxel repete configuração por jogo: mudanças transversais exigem cobertura de catálogo, não apenas do jogo de referência.
- Dependências instaladas no ambiente não são garantidas pelo checkout. Na validação de 2026-08-04,
  o runner não oferecia `make`, `pip` ou `uv`; foi necessário instalar as dependências declaradas em
  um diretório temporário com o executável autocontido oficial do pip. Com Python 3.13.5, pytest
  8.4.2, PyYAML 6.0.3 e FSRS 6.3.1, a suíte `learner/substrate/tests` concluiu com **151 testes
  aprovados em 2,27 segundos**.

## Conclusão operacional

Para trabalhar com segurança neste repositório, primeiro identifique a fonte de autoridade da mudança, depois o engine consumidor e só então a suíte local. O código compartilha currículo, learner state e contrato de evidência, mas preserva runtimes e pipelines independentes por experiência. Essa combinação — autoridade central e execução descentralizada — explica tanto a arquitetura quanto a estratégia de testes da AI DevSchool.
