# Casos reais do repositório

**Data do corte:** 2026-08-17  
**Regra:** cada caso aponta para arquivos e comandos reais. Os casos C01–C03 foram executados
nesta rodada; C04–C10 são próximos casos de execução, não resultados fabricados.

## C01 — Higiene antes de publicar

- **Onde:** `.gitignore`, `git status`, `engines/codexdojo-os-prototype/.env.production`, zip de
  debug e `test-results-pilot/`.
- **Situação real:** artefatos locais conhecidos não estavam cobertos pela regra do repositório.
- **Ação mínima:** ignorar os caminhos sem apagar arquivos; verificar com `git check-ignore` sem
  abrir valores.
- **Aceite:** quatro caminhos ignorados, nenhum candidato rastreado, `git diff --check` verde.
- **Resultado:** executado e verde. Relatório completo em `caso-p1-higiene/VALIDACAO.md`.

## C02 — Build estático autônomo do CodexDojo OS

- **Onde:** `engines/codexdojo-os-prototype/netlify.toml`, `scripts/bundle-missions.mjs`,
  `playwright.pilot.config.ts` e `tests-pilot/pilot-build.smoke.spec.ts`.
- **Situação real:** o `HEAD` não declarava `build:pilot` nem as quatro URLs `/apps/*`; o shell
  poderia depender de portas locais.
- **Ação mínima:** declarar o contrato no `netlify.toml` e executar o smoke contra `vite preview`.
- **Aceite:** quatro runtimes empacotados; uma missão IA e uma Dev montam sem dev-server das
  missões; estado sem verificador permanece honesto.
- **Resultado:** executado localmente e verde; release ainda depende de incluir os arquivos de
  suporte não rastreados. Relatório em `caso-p2-os-pilot/VALIDACAO.md`.

## C03 — Entrada pública encontrável

- **Onde:** `README.md`, `docs/VISION.md` e `https://aidevschool-literacydojo.netlify.app`.
- **Situação real:** o README dizia que não havia rota pública, mas a visão apontava para uma URL
  que respondeu HTTP 200.
- **Ação mínima:** corrigir a promessa do README e protegê-la com verificador textual.
- **Aceite:** link presente; frase stale ausente; HTTP 200; trilha Dev continua separada.
- **Resultado:** executado e verde. Relatório em `caso-p3-public-entry/VALIDACAO.md`.

## C04 — Separar o working tree em uma entrega revisável

- **Onde:** raiz do Git; mudanças em `.mcp.json`, curriculum, engines, `learner/journal.md`,
  documentação do curso e arquivos do piloto.
- **Situação real:** o corte chegou a 73 linhas de status, misturando mudanças rastreadas e não
  rastreadas de várias frentes.
- **Teste proposto:** gerar um inventário por intenção, separar em commits/branches e tentar um
  clone limpo de cada entrega.
- **Aceite:** cada commit tem escopo único; nenhum arquivo de outra frente entra na release.
- **Status:** não executado nesta rodada; exige decisão humana sobre atribuição das mudanças.

## C05 — Colocar o smoke do piloto dentro do CI

- **Onde:** `.github/workflows/ci.yml` e `engines/codexdojo-os-prototype/package.json`.
- **Situação real:** busca no workflow não encontrou `test:smoke:pilot`; o smoke existe localmente,
  mas não é uma barreira explícita do pipeline.
- **Teste proposto:** job Linux com `npm ci`, browser Playwright e `npm run test:smoke:pilot`.
- **Aceite:** PR que quebra o bundle estático fica vermelho com caminho de falha claro.
- **Status:** não executado nesta rodada.

## C06 — Medir ativação de um aluno real

- **Onde:** LiteracyDojo público, `learner/attempts/` e `learner/verifier_receipts/`.
- **Situação real:** o estado observado tinha 3 attempts e 1 receipt; isso é evidência de processo,
  não evidência de adoção de uma turma.
- **Teste proposto:** acompanhar uma jornada curta: abrir → escolher rota → completar primeira
  atividade → voltar no dia seguinte; registrar apenas eventos mínimos e sem texto livre.
- **Aceite:** pelo menos uma jornada observada de ponta a ponta e feedback explícito sobre bloqueios.
- **Status:** não executado com aluno real nesta rodada.

## C07 — Reconciliar o catálogo curricular com o que foi verificado

- **Onde:** `curriculum/catalog.md`, `curriculum/02_key_value_store/` e as implementações Node,
  Go e Rust.
- **Situação real:** o catálogo informa 18 projetos, a maior parte `scaffolded`, e declara U2
  Go/Rust como `unverified`; nesta rodada `go test` e `cargo test` passaram, mas isso não substitui
  o ciclo de evidência/certificação.
- **Teste proposto:** executar lint/test/build/benchmark/gate por implementação e atualizar o
  catálogo somente após evidência correspondente.
- **Aceite:** cada status do catálogo aponta para uma prova reproduzível ou permanece explicitamente
  não verificado.
- **Status:** parcialmente explorado; não foi promovido nenhum status.

## C08 — Decidir o contrato mínimo de feedback/analytics

- **Onde:** `docs/design/adr/0009-product-analytics.md` e `engines/literacyDojo/src/`.
- **Situação real:** existe ADR de analytics, mas a busca atual não encontrou um `AnalyticsSink` ou
  os eventos de produto ativos no código do LiteracyDojo; há arquivos de analytics deletados no
  working tree pré-existente.
- **Teste proposto:** escolher entre restaurar um sink mínimo ou remover/arquivar o contrato; em
  ambos os casos, sem texto livre, sem segredo e com consentimento/escopo claro.
- **Aceite:** um fluxo de feedback utilizável e documentado, sem telemetria inventada.
- **Status:** não executado nesta rodada.

## C09 — Tornar a escrita de receipts resistente a crash

- **Onde:** `engines/pixelDojo/verifier/__init__.py:320` e
  `learner/substrate/fsio.py:16`.
- **Situação real:** o verifier do Pixel escreve o JSON com `Path.write_text()` direto; o substrate
  possui helper de escrita atômica separado.
- **Teste proposto:** escrever primeiro um teste de falha/interrupção e extrair ou reutilizar o
  helper atômico sem mudar o contrato do ledger.
- **Aceite:** nenhum receipt parcialmente escrito é aceito na recuperação; testes antigos continuam
  verdes.
- **Status:** não executado nesta rodada.

## C10 — Medir o peso do primeiro carregamento do piloto

- **Onde:** bundles de `game-03-wormhole` e `game-05-relay-station`, gerados por
  `scripts/bundle-missions.mjs`.
- **Situação real:** o smoke passou, mas o build emitiu warnings de chunks acima de 500 kB minificados
  nos runtimes wormhole e relay-station.
- **Teste proposto:** medir download e tempo de primeira interação no caminho real; só depois decidir
  code splitting ou redução de dependências.
- **Aceite:** uma meta de carregamento definida com medição, não uma otimização por estética.
- **Status:** warning registrado; medição de usuário não executada nesta rodada.
