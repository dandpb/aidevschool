# AID-13 — Mapa operacional do repositório

**Data:** 2026-08-04  
**Responsável:** Founding Product Engineer  
**Escopo:** reconhecimento do produto, dos limites entre engines, das fontes canônicas e dos gates de evidência

## Resultado executivo

AI DevSchool é um ecossistema de aprendizagem, não um monólito. A experiência canônica começa no
`codexdojo-os-prototype`, mas cada engine continua sendo uma máquina independente. Todas consomem
um currículo compartilhado e uma única jornada de learner. A autoridade de mastery não pertence a
nenhuma UI: ela permanece no gate independente e no substrate Python auditável.

Princípio operacional: **um learner, um currículo, muitas engines**. Uma mudança de produto deve
começar no bounded context que possui o comportamento, respeitar a fonte canônica correspondente e
ser verificada com os comandos daquele engine. Não existe instalação ou build Node na raiz.

## Arquitetura que manda

| Camada | Superfícies | Autoridade e limite |
| --- | --- | --- |
| Host canônico | `engines/codexdojo-os-prototype/` | Porta de entrada mission-first; estado local não é mastery e a projeção do learner é somente leitura. |
| Apps de aprendizagem | `literacyDojo`, `miniTown`, `pixelDojo`, `voxelDojo` | Produzem interação, tentativa e/ou evidência bruta. Nunca promovem `mastered`. |
| Dashboard | `engines/codexDojo/` | Controle e leitura do ecossistema; não é o tutor core nem o OS. |
| Tutoria e orquestração | `minimaxDojo`, `miniMaxEvolutionEngine`, `openclaw` | Tutor spec/reference, motor interativo e checklist runner, respectivamente. OpenClaw não faz verificação semântica. |
| Estado compartilhado | `learner/` | Fonte única da jornada, gate, pipeline, tentativas, memória e agenda FSRS. |
| Conteúdo compartilhado | `curriculum/` | Catálogo 00–18, AI Literacy, specs, implementações e evidência de projetos. |
| Projeções | `.mavis/`, whiteboard e módulos TypeScript gerados | Saídas de `python3 -m learner.substrate`; nunca editar à mão. |

## Fluxos end-to-end

### Jornada do learner

1. O host recomenda IA Prática ou Trilha Dev.
2. O engine especializado executa a atividade e registra estado local ou evidência bruta conforme
   seu contrato.
3. Uma tentativa precede qualquer solução assistida.
4. Um verificador em contexto separado avalia a evidência declarada pelo gate.
5. Somente a API do gate/substrate pode persistir uma transição aceita.
6. O substrate regenera as projeções consumidas pelas UIs e jogos.

### Ciclo de software

`spec -> implement -> review -> benchmark -> optimize` é persistido em
`learner/pipeline_status.yaml`. A presença e tamanho de artefatos no OpenClaw não equivalem a
compilação, revisão semântica ou mastery. O ciclo de software e o learning gate são relacionados,
mas distintos.

## Mapa de mudança por domínio

| Mudança desejada | Começar em | Verificação mínima típica |
| --- | --- | --- |
| Shell, hub, missões, mentor | `engines/codexdojo-os-prototype/` | `npm run lint && npm run test && npm run build`; smoke para fluxo visível |
| Dashboard e contratos do portfólio | `engines/codexDojo/` | `pnpm run lint && pnpm run test && pnpm run build` |
| Lição não técnica | `curriculum/ai-literacy/` e depois geração do read model | `npm run gen:content`, lint, test, build; E2E para jornada |
| Exploração Level 0 | `engines/miniTown/` | lint, test, typecheck, build; smoke para interação |
| Mecânica 2D | `engines/pixelDojo/pixel-quest/` | lint, test, typecheck, build; smoke e envelope de evidência |
| Simulação 3D | `engines/voxelDojo/game-*/` | lógica headless + scripts catalog-wide proporcionais; smoke para prova WebGL |
| Invariante/projeção do learner | `learner/learning_state.yaml`, `learner/substrate/` | testes do substrate; depois `python3 -m learner.substrate` |
| Tutor core/gates numéricos | `engines/minimaxDojo/` e `config/learner.yaml` | `make test-core`; manter docs e marcadores de config alinhados |
| Projeto curricular | `curriculum/NN_*/` | ler `AGENTS.md` e scripts locais; não assumir runner uniforme |

## Contratos que não podem regredir

- `mastered` exige tentativa e evidência aceita por verificador independente.
- Producer e verifier são contextos diferentes; evidência produzida não se autoaceita.
- UIs, jogos, XP local, checklists e screenshots não têm autoridade de mastery.
- Ratings do FSRS vêm somente de outcomes do gate, nunca de autorrelato.
- `learning_state.yaml` é canônico; projeções são regeneradas, não reconciliadas manualmente.
- Conteúdo AI Literacy é canônico em `curriculum/ai-literacy/`; o TypeScript correspondente é gerado.
- Mudanças em prompts, gates, roadmap, memória ou cobertura de entregáveis também atualizam
  `engines/codexDojo/ecosystem/MANIFEST.md`.

## Limites e riscos atuais

1. **Level 0 não promove mastery hoje.** ADR-0004 define o checklist falsificável, mas o schema v2
   do substrate ainda não persiste esse tipo de evidência. `completed` local não pode ser anunciado
   como `mastered`.
2. **Múltiplos gerenciadores e raízes.** codexDojo, Pixel e Voxel usam pnpm; OS e Literacy usam npm;
   Python compartilhado usa `make`/pytest/unittest. Rodar comandos no diretório errado é um risco
   recorrente.
3. **Estado local versus canônico.** IndexedDB/local progress melhora continuidade de UX, porém não
   sincroniza entre dispositivos nem substitui o gate.
4. **OpenClaw é um tracer bullet.** Seu checklist valida artefatos por caminho/tamanho; claims de
   correção exigem a suíte real do projeto e revisão independente.
5. **Status por diretório é enganoso.** A quantidade de games ou implementações não prova cobertura,
   qualidade pedagógica, release readiness ou performance.

## Sequência segura para entrega de produto

1. Localizar o bounded context e ler o `AGENTS.md` mais próximo.
2. Confirmar a fonte canônica e o contrato de evidência antes de editar.
3. Preservar a tentativa do learner antes de oferecer implementação quando o gate estiver bloqueado.
4. Implementar no engine proprietário, mantendo lógica testável fora de render/UI quando aplicável.
5. Rodar a menor verificação que prova a mudança; adicionar browser smoke quando a claim for visual
   ou depender de evidência emitida no runtime.
6. Regenerar projeções somente pelo substrate/compilador proprietário.
7. Solicitar revisão independente para trabalho sensível a conclusão, release ou mastery.

## Fontes lidas

- `AGENTS.md` e os contratos locais em `engines/`, `learner/`, `learner/substrate/` e `curriculum/`.
- `docs/handbook/README.md`, `docs/handbook/01_architecture.md` e
  `docs/handbook/08_learner_substrate.md`.
- `learner/substrate/interface.md`.
- Scripts dos `package.json` das superfícies TypeScript/Vite.

## Evidência de validação do substrate

Em 2026-08-04, a suíte do substrate foi executada com Python 3.13.5, pytest 8.4.2, PyYAML 6.0.3 e
FSRS 6.3.1. Como o runner não oferecia `make`, `pip` ou `uv`, as dependências declaradas em
`pyproject.toml` foram instaladas isoladamente em `/tmp` usando o executável autocontido oficial do
pip, sem alterar o Python do sistema nem o repositório.

O comando equivalente a `make test-substrate`, com o diretório temporário no `PYTHONPATH`, coletou
151 testes em `learner/substrate/tests`: **151 passaram em 2,27 segundos**. Isso confirma, para o
baseline analisado, os contratos executáveis do estado canônico, gate, projeções, snapshots e
integrações de catálogo cobertos pela suíte.

Este documento é um mapa de operação, não evidência de release, performance ou mastery.
