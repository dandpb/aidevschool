# Matriz de execução dos 14 engines

Apêndice de [plan.md](plan.md), critérios 16–30. Status: **planejado, não executado**. Fonte local lida em `f98e7fa3`; comparação remota até `0a2e2dbe` não altera comandos de lançamento. Recontar a oferta no candidato final e registrar os IDs, sem editar a evidência histórica.

## Protocolo comum

1. Depois dos reparos, pinne o candidato e congele por engine: promessa, fonte/seção, variantes realmente oferecidas, casos obrigatórios, entrada, ambiente e responsável operacional. Metadado de catálogo não é prova de jornada. Variante anunciada mas quebrada fica `blocked`; não é retirada silenciosamente da oferta para obter PASS.
2. Use um checkout/cópia completa por execução que grava dados, com symlinks resolvendo dentro dessa cópia e fixtures de aprendiz identificadas como teste. O diretório de trabalho original e o aprendiz real não são alvo de `prebuild`, runner, import ou gate. Capture digest dos arquivos de estado reais antes/depois como prova de preservação, sem copiar conteúdo pessoal para o relatório.
3. No venv privado, instale as dependências de teste da raiz com `rtk proxy python -m pip install -e ".[dev]"`. Use a ferramenta de pacotes declarada por cada engine. `rtk proxy` preserva output exato da prova; lint usa `RTK_DISABLED=1` para manter o escopo do script. Zero exit inesperado fica sem triagem; falha de ambiente não vira falha de produto presumida nem PASS.
4. Registre cwd/argv, SHA/fingerprint, runtime/versão/origem/porta, começo/fim UTC, exit code, produtor/contexto e observador/contexto distintos. Reter stdout/stderr, traces/capturas/observações com path/URL e digest. Segredos e respostas pessoais não entram no pacote.
5. Confira a origem do servidor antes de reutilizá-lo. Reserve portas ou use o override realmente suportado pelo engine. Não execute suites concorrentes na mesma porta, DB, perfil ou árvore que regenera projeções.
6. Aplique os casos da Journey: entrada vazia/primeiro uso, fluxo principal, erro/retry, retorno/limite de persistência, verificador/provider indisponível e próximo passo. Um estado inaplicável exige justificativa ligada à fonte. Não inventar persistência ou maestria para uma superfície exploratória/readonly.
7. Produtor verde não encerra prova semântica. Configs que capturam somente falha precisam de captura positiva pelo observador; aplicar a regra vigente de screenshot/vídeo/trace e verificação independente de evidência. Guardar mídia no `test-results/` do engine ou CI retido, com referência/digest durável.
8. Cada caso recebe resultado e cada engine recebe `pass`, `blocked` ou `unverified` segundo o critério 16. Registrar lacuna, owner e próximo passo. Incidente novo entra como intent próprio; não autoriza expansão automática do patch. A conclusão global continua pendente até o critério 34.

Os comandos abaixo são executados **um por vez**, no diretório indicado. São scripts existentes; a seta separa etapas e não é um comando shell. Quando um script exige um arquivo/credencial/ambiente, o preflight registra o valor concreto sem expor segredo antes de executar.

## aiDevschoolMvp — critério 17

Fonte: [README](../../engines/aiDevschoolMvp/README.md), [SKILL](../../engines/aiDevschoolMvp/aidevschool/SKILL.md), [installer](../../engines/aiDevschoolMvp/aidevschool/install.py).

- Raiz: `rtk proxy python3 engines/aiDevschoolMvp/aidevschool/install.py --check`; `rtk proxy python3 -m pytest engines/aiDevschoolMvp/tests/installer engines/aiDevschoolMvp/tests/acceptance -q`.
- Uso real: SKILL no harness externo OpenClaw/Hermes que estiver oferecido; `next_step.py` → tentativa crua → `gate_check.py` → `schedule.py`/`plan_recompute.py` → `progress_card.py`. Os scripts recebem JSON stdin com `state_dir`/`skill_dir` conforme o contrato da SKILL; produzir e reter esses inputs concretos antes da chamada.
- Casos: primeira tentativa, negativa pedagógica/feedback/retry e retorno ao card/ledger; ligar os 24 conceitos e variantes de gate oferecidas à cobertura de casos, sem exigir uma nova plataforma. **Script com exit não zero repassa o erro literalmente e para**, conforme a SKILL; não improvisar correção ou repetição para satisfazer recovery. G4 consulta julgamento gravado pelo digest do artefato: ausência de julgamento encerra essa variante como não comprovada; fixture não demonstra verificação live.
- Isolamento: a instalação real pode registrar cron de 30 min e announce/delivery; Hermes tem default de entrega `all`. Não instalar no perfil padrão, não criar entrega a canal real e não inventar flag para desabilitar efeitos. Usar runtime descartável/perfil nativo isolado realmente suportado; sem ele, spike termina `unverified` com pré-requisito.
- Encerramento do spike: tentativa/ciclo representativo e erro/retry/retorno por promessa/variante oferecida com artefatos atribuíveis, ou pré-requisito externo ausente demonstrado. O `MASTERED` do MVP e seu ledger continuam próprios, sem promoção automática do aprendiz canônico.

## codexDojo — critério 18

Fonte: [README](../../engines/codexDojo/README.md), [AGENTS](../../engines/codexDojo/AGENTS.md), [Playwright](../../engines/codexDojo/playwright.config.ts).

- No engine: `rtk proxy pnpm install` → `RTK_DISABLED=1 pnpm run lint` → `rtk proxy pnpm run test` → `rtk proxy pnpm run build` → `rtk proxy pnpm run test:e2e`.
- Entrada para observação: `rtk proxy pnpm run dev` ou o preview real do E2E. A suite usa 4177 estrita, sem reuso; override existente `CODEXDOJO_E2E_APP_PORT`.
- Casos: projeção reconhecível → próxima ação → copiar prompt; ponte OS com `VITE_CODEXDOJO_OS_URL` configurada e ausente. Registrar a configuração do build que foi servido e comprovar zero gravação no aprendiz. Não exigir backend de chat novo.

## codexdojo-os-prototype — critério 19

Fonte: [README](../../engines/codexdojo-os-prototype/README.md), [AGENTS](../../engines/codexdojo-os-prototype/AGENTS.md), [scripts](../../engines/codexdojo-os-prototype/package.json), [catálogo gerado](../../engines/codexdojo-os-prototype/src/data/missions.ts), [bundle](../../engines/codexdojo-os-prototype/scripts/bundle-missions.mjs).

- Pré-requisito: venv da raiz e conteúdo Literacy gerado na cópia privada.
- No engine: `rtk proxy npm install` → `RTK_DISABLED=1 npm run lint` → `rtk proxy npm run test` → `rtk proxy npm run build` → `rtk proxy npm run test:smoke` → `rtk proxy npm run test:smoke:pilot` → `rtk proxy npm run test:readiness`.
- Entrada: `rtk proxy npm run dev`; remoto é camada separada com `QA_BASE_URL` resolvida e `rtk proxy npm run test:smoke:remote`.
- Censo de orientação: 39 missões no catálogo gerado (23 IA Prática, 16 Dev), Hub com 9 adaptadores limitados; bundle inclui Literacy e 16 superfícies voxel. São conjuntos diferentes: enumerar o que é realmente lançado em cada rota/trilha, sem converter metadata/bundle em execução aprovada.
- Casos: onboarding IA/Dev → missão suportada → resultado → próxima ação; falha no host/verificação → retry/saída; retorno mesmo perfil e storage limpo; `/desktop`/Hub nos limites declarados. Mentor/terminal/arquivos locais não representam backend externo ou maestria.

## dojoToday — critério 20

Fonte: [README](../../engines/dojoToday/README.md), [scripts](../../engines/dojoToday/package.json), [Playwright](../../engines/dojoToday/playwright.config.ts).

- No engine: `rtk proxy npm ci` → `RTK_DISABLED=1 npm run lint` → `rtk proxy npm run selfcheck` → `rtk proxy npm run build` → `rtk proxy npm run test:readiness`. Não há script genérico `test`.
- Entrada: `rtk proxy npm run dev`; suites reservam 5180–5184. `prebuild` regenera o substrate: executar somente na cópia privada e revisar projeções resultantes.
- Casos: reviews/streak/unidade/next action correspondem à fixture/projeção; jogo inline somente 02. Sócrates determinístico offline é o padrão; BYOK oferecido permanece experimental e requer endpoint/chave/modelo existentes. Observar provider indisponível, limpar configuração e ausência de conversa persistida; nunca registrar a chave do localStorage.
- Revalidar nomes acessíveis no candidato que incorpora #679; prova do snapshot anterior não cobre a mudança por renomear o relatório.

## literacyDojo — critério 21

Fonte: [README](../../engines/literacyDojo/README.md), [scripts](../../engines/literacyDojo/package.json), [vertical slice](../../engines/literacyDojo/playwright/vertical-slice.spec.ts), [Netlify](../../engines/literacyDojo/netlify.toml).

- Raiz: `rtk proxy python3 curriculum/ai-literacy/tools/validate.py`.
- No engine: `rtk proxy npm install` → `rtk proxy npm run gen:content` → `RTK_DISABLED=1 npm run lint` → `rtk proxy npm run test` → `rtk proxy npm run build` → `rtk proxy npm run test:e2e`. Instalar Chromium pelo Playwright do projeto quando necessário.
- Entrada: `rtk proxy npm run dev -- --port 4173`; registrar se é Vite, preview ou deploy. E2E Vite não serve automaticamente a função Netlify.
- Oferta atual de orientação: 23 lições IA Prática em sete módulos (01–04, 06–08); as nove lições Dev são encaminhadas para OS. Congelar IDs e casos do percurso standalone, desafios/revisão e retorno sem tratar todo o catálogo de 32 como oferta standalone.
- Casos: tentativa incorreta → feedback/hint/retry; fluxo correto; desafio/review; IndexedDB preserva progresso, mas reload durante atividade reinicia a lição e não recupera resposta transitória. Provar l02 v4 a1/a2/a3 e retry do endpoint (critérios 8–13).
- Incluir `/escola/` no candidato que incorpora #626: Enter/click no mapa textual mantém foco no cartão e `tabindex=-1`; não editar o teste existente para obter verde. O endpoint publicado segue o deploy real e `VITE_LITERACY_VERIFIER_URL` de build; OS compartilha staging das funções, mas usa bridge hospedada distinta.

## miniMaxEvolutionEngine — critério 22

Fonte: [README](../../engines/miniMaxEvolutionEngine/README.md), [AGENTS](../../engines/miniMaxEvolutionEngine/AGENTS.md), [CLAUDE](../../engines/miniMaxEvolutionEngine/CLAUDE.md).

- Raiz: `rtk proxy python3 -m pytest engines/miniMaxEvolutionEngine/tests -q`; preflight readonly `rtk proxy python3 -m engines.miniMaxEvolutionEngine.supervisor status`.
- Uso real: abrir Claude Code no engine privado → `/devschool-status` → `/devschool-diagnose` se bloqueado → `/devschool-cycle` quando permitido. `tick` e `poll --interval-seconds 5` são superfícies existentes do supervisor, mas gravam requests/estado; executar somente em checkout descartável com symlinks internos.
- Casos: ciclo supervisionado de cinco fases com produtor/verificador distintos; interrupção → status → recuperação explícita (`reconcile`, `complete/fail/block/abandon/resume`, `recover-lease` conforme o CLI existente), sem redispatch automático.
- Autonomia, apenas se oferecida: `spec → spec-done`, default desabilitada, controles atuais de config/budget/kill switch. Um `tick` que gera solicitação e um tracer de fixture não executam o modelo. Não ampliar autonomia para completar a prova.
- Spike termina com ciclo representativo + recovery observado nas variantes oferecidas, ou pré-requisito externo ausente. Nunca usar a pipeline real do fundador como fixture.

## miniTown — critério 23

Fonte: [README](../../engines/miniTown/README.md), [scripts](../../engines/miniTown/package.json).

- No engine: `rtk proxy pnpm install` → `RTK_DISABLED=1 pnpm run lint` → `rtk proxy pnpm run test` → `rtk proxy pnpm run typecheck` → `rtk proxy pnpm run build` → `rtk proxy pnpm run smoke`.
- Entrada: `rtk proxy pnpm run dev`; `./setup.sh onboard` ainda instala dependências, não é um deploy público sem instalação.
- Casos: cidade/dia-noite/HUD e interação exploratória → saída/reabertura; falha de WebGL/rota segue o limite declarado de reload/ajuda. `window.__miniTown` é canal de observação. Persistência, lição, evidência pedagógica e mastery são inaplicáveis por contrato; manter `experimental`.

## minimaxDojo — critério 24

Fonte: [README](../../engines/minimaxDojo/README.md), [AGENTS](../../engines/minimaxDojo/AGENTS.md), [Quick Start](../../engines/minimaxDojo/docs/QUICK_START.md).

- Raiz: `rtk proxy make test-core` ou `rtk proxy python3 -m unittest discover -s engines/minimaxDojo/tests -t .`.
- Uso real: cópia de `config/learner.yaml` com linguagem/tempo de teste → `prompts/bootstrap/00_system.md` e `01_first_cycle.md` no MiniMax Agent Team.
- Casos: Maestro/Sonda → trilha/unidade → tentativa → Prometor/Crítico fresco → relatório/whiteboard/reflexão; falha/SLA/retry e retorno ao Maestro. Registrar versão/plataforma/contextos, sem copiar whiteboard como autoridade global.
- Spike termina após tentativa/ciclo representativo e erro/retry/retomada atribuíveis, ou acesso/plataforma ausente. Core Python verde é prova de referência/contrato, não execução do Team Engine real.

## openclaw — critério 25

Fonte: [README](../../engines/openclaw/README.md), [CLI](../../engines/openclaw/__main__.py).

- Raiz privada: `rtk proxy python3 -m pytest engines/openclaw/tests -q`; `rtk proxy python3 -m engines.openclaw --preview`.
- Avanço somente no checkout descartável completo: `rtk proxy python3 -m engines.openclaw --project curriculum/01_rate_limiter --phase spec --mode simulate --max-events 20`.
- A CLI não tem `--root`; deriva a raiz do módulo e `--phase` escreve pipeline antes de rodar. Uma pasta temporária parcial não isola essa execução.
- Casos: preview sem escrita; artefato ausente/tamanho insuficiente/gate bloqueado → parada correspondente; artefatos de teste válidos → fase/pipeline corretos; retomada respeita o estado registrado. É checklist simulate-grade: sem IA, compilação ou prova empírica de mastery.

## pixelDojo — critério 26

Fonte: [README](../../engines/pixelDojo/README.md), [PixelQuest](../../engines/pixelDojo/pixel-quest/README.md), [contrato de evidência](../../engines/pixelDojo/EVIDENCE_CONTRACT.md).

- Workspace: `rtk proxy pnpm install` → `RTK_DISABLED=1 pnpm run lint` → `rtk proxy pnpm run test` → `rtk proxy pnpm run typecheck` → `rtk proxy pnpm run build` → `rtk proxy pnpm run smoke`.
- Entrada: `rtk proxy pnpm --filter pixel-quest dev`. O smoke usa porta 4176 e permite reuso fora de CI; conferir a instância privada antes de começar.
- Oferta de orientação: 18 labs curriculares em PixelQuest. `games/` é reservada e seeds de brainstorm não são lançamentos.
- Casos por lab/variante: briefing/mapa/prática/duelo → evidência exportável → review/gate; erro/replay/retorno aplicável; NDJSON append-only conserva as tentativas. Smoke pode produzir NDJSON; um observador e verificador separados conferem conteúdo/binding. O jogo não escreve `mastered`.

## school-entry — critério 27

Fonte: [README](../../engines/school-entry/README.md), [scripts](../../engines/school-entry/package.json), [catálogo](../../engines/school-entry/server/catalog.mjs).

- No engine: `rtk proxy npm ci` → `rtk proxy npx playwright install chromium` → `rtk proxy npm test` → `rtk proxy npm run test:browser` → `rtk proxy npm run check`. Não inventar `lint`/`build` ausentes.
- Entrada: `rtk proxy npm start`, Node ≥22.13, `DATA_DIR` privado, password hash de teste e `ENGINE_TARGETS_FILE` de destinos confiáveis. `test:live` só com credencial existente e ambiente isolado; não provisionar segredo nem fazer chamada real no planejamento.
- Casos: zero destinos liberados (estado inicial esperado dos 13 destinos) → indisponibilidade explícita; operador autenticado libera target confiável → checker do controle inicial → descrição/recomendação de até três elegíveis → lançamento. Anônimo não libera. Chave ausente/timeout/erro de IA usa fallback distinguível; falha de storage é erro.
- O checker mantém same-origin, GET/HEAD, sem redirects/WS/serviceworker. Não desativar proteção para tornar tutor sem app web um destino publicável. Entry passa por sua função própria; não precisa liberar todos os engines para provar que eles funcionam nos seus harnesses.

## sdlc-quest — critério 28

Fonte: [README](../../engines/sdlc-quest/README.md), [scripts](../../engines/sdlc-quest/package.json).

- Node ≥22, sem `npm install`: `rtk proxy npm test` → `rtk proxy npm run check:package` → `rtk proxy npm run build`. Browser gate requer Python ≥3.10: `rtk proxy npm run setup:tests` → `rtk proxy npm run gate`.
- Entrada HTTP: `rtk proxy npm start` (127.0.0.1:8080), ou `rtk proxy npm start -- --port 8081` quando a primeira porta não estiver disponível. Abrir também o HTML standalone oferecido no navegador real, como modo distinto.
- Casos: campanha, workshop TLC e lab nos idiomas oferecidos → resultado → salvar/retomar; export → preview de import → confirmação em perfil descartável. Explicar que import substitui o estado e remove aprovações do lab; origem/porta diferente tem storage próprio.
- O gate de browser usa `set_content` e storage simulado: não o chamar de prova de `file://` nativo, dispositivo físico ou servidor HTTP. `gate:release` é outro contrato, não publica e pode encerrar exit 2 por autorização externa ausente; não tratar isso como falha da jornada local.

## voxelDojo — critério 29

Fonte: [README](../../engines/voxelDojo/README.md), [AGENTS](../../engines/voxelDojo/AGENTS.md), [catalog.json](../../engines/voxelDojo/catalog.json).

- Workspace: `rtk proxy pnpm install` → `RTK_DISABLED=1 pnpm run lint` → `rtk proxy pnpm run test` → `rtk proxy pnpm run typecheck` → `rtk proxy pnpm run build` → `rtk proxy pnpm run smoke`.
- Entrada: `rtk proxy pnpm run dev:catalog` ou filtro do jogo declarado, por exemplo `rtk proxy pnpm --filter game-10-hash-ring dev`. Não executar catálogo + todos os smokes concorrentes sem reserva das portas; referência usa 5175 no smoke, diferente de 5177 do catálogo.
- Censo: 17 pacotes no catálogo: `game-02-warehouse`, `game-03-wormhole`, `game-04-task-queue`, `game-05-relay-station`, `game-06-pipeline-plant`, `game-07-checkpoint-city`, `game-08-timeline-tower`, `game-09-docking-bay`, `game-10-hash-ring`, `game-11-air-traffic`, `game-12-mission-control`, `game-13-breaker-grid`, `game-14-river-delta`, `game-15-observatory`, `game-16-freight-yard`, `game-17-lighthouse-network`, `game-18-stacks`.
- Casos por jogo/variante oferecida: entrada/controles → L1–L4 → evidência do conceito → verificador; erro/retry/retorno e renderer acessível onde suportado. Evidência não se reduz ao localStorage; package/CI verde não aprova os 17 runtimes.

## zai-duolingo-like — critério 30

Fonte: [QWEN](../../engines/zai-duolingo-like/QWEN.md), [scripts](../../engines/zai-duolingo-like/package.json), [Playwright](../../engines/zai-duolingo-like/playwright.config.ts), [setup E2E](../../engines/zai-duolingo-like/e2e/global-setup.ts), [currículo](../../engines/zai-duolingo-like/src/lib/curriculum-data.ts).

- No engine privado: `rtk proxy npm ci` → `rtk proxy npm run db:generate` → `RTK_DISABLED=1 npm run verify` → `rtk proxy npm run build` → `rtk proxy npm run test:e2e`.
- Entrada dev: `rtk proxy npm run dev` (3000). O E2E usa Next na 3100 e banco `db/e2e.db`; Vitest recria `db/test.db`. Conferir que não são links para DB real e que não há servidor alheio na 3100 (`reuseExistingServer:true`). O `npm start` usa Bun standalone; provar esse modo separadamente quando oferecido.
- `DATABASE_URL` de app precisa apontar para banco descartável. `npm run db:push` já contém `--accept-data-loss`; não usar em banco real, nem executar `db:reset`/setup E2E como preparação genérica do produto. A suíte E2E já tem setup próprio de schema/currículo.
- Antes de observar manualmente Next/Bun, preparar **também o banco do app**; gerar cliente e executar E2E não o preparam. Em cwd confirmado como cópia privada, sem symlink do DB e com o arquivo abaixo novo/descartável, a composição usa o schema e `prisma/seed.ts` existentes. O seed apaga progresso/lições/módulos: registrar o alvo resolvido antes de permitir a escrita. Estes comandos de preparação ainda não foram executados nesta rodada; falha de preparação mantém o ambiente não verificado, sem diagnosticar catálogo vazio como defeito do app.

```bash
export AIDEV_ZAI_QA_DB_URL="file:${PWD}/db/readiness-app.db"
DATABASE_URL="$AIDEV_ZAI_QA_DB_URL" rtk proxy npm run db:push
DATABASE_URL="$AIDEV_ZAI_QA_DB_URL" rtk proxy bun prisma/seed.ts
rtk proxy python3 - <<'PY'
import os
import sqlite3
from pathlib import Path
target = Path(os.environ['AIDEV_ZAI_QA_DB_URL'].removeprefix('file:')).resolve()
with sqlite3.connect(target.as_uri() + '?mode=ro', uri=True) as database:
    modules = database.execute('SELECT count(*) FROM "Module"').fetchone()[0]
    lessons = database.execute('SELECT count(*) FROM "Lesson"').fetchone()[0]
assert (modules, lessons) == (9, 27), (modules, lessons)
print({'modules': modules, 'lessons': lessons, 'database': str(target)})
PY
DATABASE_URL="$AIDEV_ZAI_QA_DB_URL" rtk proxy npm run dev
```

- Esperado no preflight: schema/seed exit 0, consulta readonly confirma 9 módulos/27 lições e app usa esse mesmo alvo. Para o modo Bun, iniciar `npm start` com o mesmo `DATABASE_URL` privado após parar a instância anterior e preparar seu build. Reter comandos/output e não sobrescrever banco de outro perfil.
- Oferta de orientação: onboarding `neon-syntax` e `silicon-shrine`; nove módulos/27 lições do currículo local. Congelar os IDs no candidato e cobrir progressão/revisão e falha/retorno nas variantes oferecidas, sem promover identidade/progresso locais ao aprendiz canônico.
- Chat `/api/chat` requer `LLM_API_KEY`, base/modelo do provider configurado. Provar caminho real configurado quando oferecido e o comportamento com provider ausente/falhando; não chamar resposta de fallback de verificação live.

## Saída e retenção

O resultado da execução será o pacote informativo definido em Shape da discovery, com uma linha por engine e casos por variante; este arquivo de planejamento não preenche resultados como PASS.

Para grants, criar bundles canônicos **em subdiretório dedicado `claims/`**, abaixo da pasta de observações da iniciativa. O loader atual faz `glob("*.json")` e exige chaves exatas; passar a pasta que contém `engine-qualification.json` causaria erro de shape. Também filtrar producer reports para os use cases revalidados: incluir casos alheios sem observação pode rebaixar claims.

No encerramento, executar a prova de claims do plano e verificar a lane de main; revisão independente e decisão de Daniel seguem separadas. A descoberta de uma lacuna preserva seu ID e sua evidência, sem fabricar sucesso para fechar a tabela.
