# Estado real — verificado por execução

**Data:** 2026-08-17 · **Método:** tudo abaixo foi **executado** nesta sessão (suítes, CLIs, builds, apps no
browser). Nada foi copiado de doc. Onde um doc do repo contradiz o que rodou, o doc está marcado como errado.
**Ambiente:** node 22.23.2 · pnpm 9.15.9 · Python 3.11.11 (.venv) · go 1.26.4 · cargo 1.85.0 — toolchain completo.

> **Nota de atualização (2026-08-21):** este relatório preserva o snapshot em
> que o app expunha 17 missões/5 módulos. O release candidate atual limita a
> jornada pública a 14 missões/4 módulos; as 3 lições Dev continuam no catálogo
> como prévia fora do percurso. Consulte `engines/literacyDojo/README.md` para o
> gate vigente.

---

## 1. O que está funcionando

### Engenharia — verde de verdade

| Superfície | Comando executado | Resultado |
| --- | --- | --- |
| Python compartilhado (substrate, gate, openclaw, minimaxDojo, `curriculum/_shared`, tools ai-literacy) | `pytest -q` | **693 passed, 1 skipped** |
| Projeções derivadas | `learner.substrate --check` | em sync com o canônico |
| Gate do aprendiz | `learner.gate --dry-run` | funciona — recusou corretamente (unidade em `mastered`, não `evaluating`) |
| Verificador no-code | `learner.gate.literacy_verifier --help` | funciona |
| Runner de checklist | `openclaw --preview` | funciona — `PASS, cycle-complete` |
| **literacyDojo** | `gen:content` · `lint` · `test` · `build` · **`test:e2e`** | 17 lições validadas · lint limpo · **76 testes** · build 281 KB · **E2E 6/6 incl. PWA offline** |
| codexDojo (dashboard) | `lint` `test` `build` | limpo · **88 testes** · build OK |
| codexdojo-os-prototype | `lint` `test` `build` | limpo · **208 testes** · build 347 KB |
| pixelDojo | `lint` `test` `typecheck` `build` | limpo · **113 testes** · OK |
| voxelDojo (16 jogos) | `test` `typecheck` `build` | verde nos 16 (lint falha — §2.3) |
| miniTown | `lint` `test` `typecheck` `build` | limpo · 26 testes · OK |
| dojoToday | `lint` `build` | limpo · OK |
| curriculum 01 **Go** | `gofmt` `vet` `test -race -cover` | limpo · **cov 85.9% / 99.2%** |
| curriculum 01 **Rust** | `fmt --check` `clippy -D warnings` `test` | limpo · **14 unit + 6 integração** (1 ignored conhecido) |
| curriculum Node | `npm test` × 18 | **13 de 18 verdes** |

### Produto — o que um usuário real consegue fazer hoje

Percorri o fluxo inteiro no browser, como usuário.

**IA na Prática (literacyDojo) — é um produto de verdade.** Onboarding de 5 etapas ("Vila Lume", guia Lumi,
voxel art), seleção de objetivo/contexto/confiança/situação, mapa da vila com **17 missões em 5 bairros**,
XP + sequência, rota adaptativa funcionando (a missão 1 apareceu **bloqueada** e a 2 **disponível** — rota
intermediária atribuída pelo desempenho, exatamente como especificado).

A lição em si é boa pedagogia, não trivia. Exemplo real que fiz (l02, "IA não é uma fonte de verdade"):
cenário concreto (números do mercado de delivery para uma apresentação à diretoria), duas respostas de IA —
uma alucinando números específicos com confiança total, outra admitindo o limite e propondo onde verificar —
e checkboxes que obrigam a **articular o critério** da escolha. Errei parte e o feedback foi específico:
*"Pontuação desta tentativa: 60%. Faltou este motivo: uma resposta confiável indica a origem dos dados…"*,
com retry oferecido (o gate de 75% funcionou). Progresso em IndexedDB local, sem conta.

**Trilha Dev (codexdojo OS) — o shell funciona.** Onboarding, hub com missão em destaque, mentor contextual
com orçamento de 5 pistas e rótulo honesto (*"não cria evidência nem avalia domínio"*), estado canônico lido
corretamente (`mastered`, 2 verificadas). O jogo WAREHOUSE roda standalone e é bom: canvas 3D, "L1 — Hash →
shelf", meta observável ("prever a prateleira de ≥80% dos crates").

---

## 2. O que não está funcionando

### 2.1 As missões do OS morrem em qualquer build — o pior problema encontrado

O OS é descrito no README como *"a experiência mission-first canônica"*. Ela embute cada missão num iframe.
`src/data/missions.ts` aponta as 6 missões para **portas de dev-server hardcoded**:
`127.0.0.1:5178` (×3 lições) · `:5202` · `:5203` · `:5205`.

Existe o mecanismo de override certo — `runtimeUrl()` em `src/missions/catalog.ts:32` faz
`configuredUrl(environmentKey) ?? entrypoint`, com chaves `VITE_LITERACYDOJO_URL`, `VITE_WAREHOUSE_URL`,
`VITE_WORMHOLE_URL`, `VITE_RELAY_STATION_URL`. Mas:

- **nenhuma das 4 está declarada** em `src/vite-env.d.ts` (que declara um conjunto diferente e não usado aqui);
- **nenhuma está setada** em `netlify.toml` (que não define env algum);
- **nenhum dos 4 apps-filho tem URL pública** (só o literacyDojo tem).

Consequência medida: abri a missão Dev no build servido e o iframe deu
`net::ERR_CONNECTION_REFUSED` — *"127.0.0.1 refused to connect"*. Um deploy no Netlife/Netlify entrega **6 missões
mortas**. Localmente só funciona se você subir 4 dev-servers nas portas exatas com `--host 127.0.0.1`
(confirmei: subindo o game-02 em 5202 com esse bind, o iframe carrega e o canvas aparece).

**E os 208 testes passam** porque o iframe é mockado por fixture (`missionSessionTestKit.ts`,
`evidenceIntakeTestFixtures.ts`). É o aprendizado *"abstração bem testada ≠ abstração usada"* do próprio
journal, agora no nível do produto: suíte verde, produto morto.

### 2.2 5 de 18 projetos do currículo não rodam nesta máquina

Projetos 01, 03, 06, 07, 09 falham com `Transform failed: Unexpected "."`. Causa raiz:
`git config core.symlinks = false` neste Mac. O commit `1b0a309` (2026-07-19, *"apply ponytail + thermo-nuclear
quality cuts"*) substituiu 8 cópias de `logger.ts` por symlinks para `curriculum/_shared/log.ts`; com
`core.symlinks=false` o git materializou **7 deles como arquivos de texto contendo o caminho**.

Verificado: recriei o symlink do 06 e o teste foi de `Transform failed` para **4 passed**. CI (Linux) é verde —
o que quebra é só o ambiente local. Fix: `git config core.symlinks true` + recheckout dos 7 arquivos.

### 2.3 Lint do voxelDojo vermelho

16 erros, todos idênticos e auto-fixáveis: `assist/source/organizeImports — Sort these imports` em
`game-NN/src/evidence/emit.ts`. São as 16 cópias do emissor de evidência (item #17 do tech-debt audit:
*"evidence emitter copy-pasted ~31×"*) driftando juntas. `biome check --write` resolve.

### 2.4 Docs desatualizados sobre Go/Rust

`curriculum/catalog.md` e o journal dizem, para o projeto 01: *"Go/Rust não re-executados — toolchain
indisponível no sandbox"*. **O toolchain existe e os dois passam** (Go: vet+race+85.9%/99.2%; Rust: clippy
`-D warnings` limpo, 14+6 testes). A ressalva de certificação continua válida só para **benchmark/optimize**,
que seguem Node-only.

### 2.5 Duas portas de entrada concorrentes

literacyDojo tem onboarding próprio (5 etapas, Vila Lume, voxel). O OS tem outro onboarding (1 tela,
3 dropdowns) para **as mesmas duas trilhas**. Dois produtos, dois onboardings, uma decisão de trilha — e o OS
embute o literacyDojo por iframe. Não há resposta no repo para "qual é a porta da frente".

### 2.6 Zero instrumentação

Continua verdade (ADR-0009): nenhum evento é emitido. Não há funil, conclusão nem retenção. Como o próprio ADR
escreve: *"é impossível dizer se as pessoas aprendem"*.

---

## 3. O que falta para funcionar (engenharia — pequeno e mensurável)

Ordem de valor. Tudo aqui é bug conhecido com causa identificada, não pesquisa.

| # | O que | Custo | Prova de pronto |
| --- | --- | --- | --- |
| 1 | Deploy dos 3 jogos Dev + setar as 4 `VITE_*_URL` no build do OS; declarar as chaves em `vite-env.d.ts` | horas | abrir o OS deployado e concluir 1 missão de cada trilha sem dev-server local |
| 2 | Smoke que carrega o iframe **de verdade** (sem fixture) e falha se a missão não montar | ~1 teste | o smoke reprova hoje e aprova depois do item 1 |
| 3 | `git config core.symlinks true` + recheckout dos 7 `logger.ts` | minutos | os 18 projetos verdes localmente |
| 4 | `biome check --write` no voxelDojo | minutos | `pnpm run lint` verde nos 16 |
| 5 | Corrigir a ressalva Go/Rust no catalog/journal | minutos | doc bate com o que roda |
| 6 | Escolher **uma** porta de entrada e aposentar o outro onboarding | 1 decisão | um único caminho do primeiro clique à primeira lição |
| 7 | Ligar os 4 eventos do ADR-0009 (sink NDJSON local já desenhado) | horas | responder "quantos começaram e quantos concluíram a lição 1" |

Nada disso é reescrita. O item 1 é a diferença entre "temos um app" e "um usuário consegue usar".

---

## 4. O que falta para ser um produto que cria caminho de aprendizado

Aqui o problema **não é engenharia**. As duas trilhas têm gaps de natureza diferente.

### IA na Prática — é produto; falta público e falta trilha depois da trilha

O que existe: 17 lições reais, rota adaptativa, revisão espaçada, PWA offline, URL pública, fronteira de
privacidade respeitada. É a única coisa no repo que um cliente consegue usar hoje sozinho.

O que falta para "fazer sentido":

1. **Uma pessoa real.** Nenhum usuário além do autor jamais completou uma lição, e não há como saber. Todo o
   resto é hipótese.
2. **Conteúdo além da primeira semana.** 17 lições × 3–5 min ≈ **70 minutos de conteúdo total**. Alguém
   engajado termina tudo em uma semana e encontra o vazio. Uma trilha "Duolingo-like" precisa de meses de
   material; hoje há dias.
3. **Prova de que a pessoa aprendeu.** O produto marca `completed`, nunca `mastered`, e isso está certo. Mas o
   verificador no-code existe e **nunca promoveu nada** — ninguém tem evidência de domínio na trilha 00. O
   aprendiz sai com XP, não com prova.
4. **"Trilha Dev — EM BREVE"** dentro do produto que funciona. Metade da promessa da visão é um botão inerte.

### Trilha Dev — não é produto ainda, e o motivo é pedagógico

O caminho prometido é: 18 projetos de currículo (spec → impl polyglot → review → benchmark → evolve) + 16 jogos
voxel + pixel-quest. Verifiquei o que existe de fato: **os 18 `node-impl/` contêm as implementações prontas**,
161–1301 linhas cada, com testes passando. Ou seja:

> **O currículo Dev distribui as respostas, não os exercícios.**

A regra de ouro do ecossistema é "tentativa antes de solução". Ela é inaplicável quando a solução está
commitada no repo que o aprendiz clona. Isso explica o número que abriu esta investigação: **2 unidades
verificadas em 10 semanas** — não por falta de motor, mas porque não existe o artefato "desafio" separado do
artefato "resposta".

O que falta, concretamente:

1. **Separar exercício de solução.** Cada projeto precisa de um estado inicial (assinaturas + testes que
   falham + spec) com a solução fora do alcance — branch separada, diretório `solution/` não distribuído, ou
   testes-como-especificação. Sem isso, não há trilha Dev, só um repositório de referência.
2. **Ligar mais de 3 missões.** Existem 16 jogos e 1 pixel-quest com 18/18 gates de cobertura fechados, e
   apenas **3** estão no catálogo de missões do OS. O trabalho está feito e desconectado.
3. **Definir a unidade de valor.** Um jogo de 12 min ensina um conceito; um projeto de currículo é um ciclo de
   5 fases que levou semanas. São escalas incompatíveis apresentadas como uma trilha só. Falta decidir se a
   trilha Dev é "conceitos em 12 min" (escala do jogo, replicável) ou "projetos completos" (escala do ciclo,
   que rendeu 2 em 10 semanas).
4. **Um público que não é você.** A trilha Dev foi desenhada para um aprendiz — `learner.id:
   daniel-barreto`, hardcoded. Multi-learner é ADR-0008, ainda `Proposed`, com spike read-only.

### A pergunta que decide tudo

Existem hoje **dois produtos possíveis** no repo, e eles competem por atenção:

| | IA na Prática | Trilha Dev |
| --- | --- | --- |
| Estado | funciona, público, testado E2E | shell funciona, missões mortas em build, sem exercícios |
| Conteúdo | 17 lições (~70 min) | 18 specs + 18 soluções + 17 jogos |
| Falta para o cliente | usuários + mais conteúdo + prova de domínio | separar exercício de solução + ligar missões |
| Distância até valor | **curta** — está a um piloto de distância | **longa** — falta o artefato pedagógico central |

Escolher um é a decisão. Manter os dois foi o que produziu 92k linhas de doc e 2 unidades verificadas.

---

## 5. Ressalvas deste relatório

- Não re-verifiquei a URL pública do literacyDojo (não fiz chamada externa). Rodei o build local e o E2E.
- `05_websocket_chat` e `08_event_driven_order_system` também têm o `logger.ts` quebrado, mas passam porque os
  testes não importam esse módulo — passam por sorte, não por saúde.
- Recriei **um** symlink (`06/node-impl/src/logger.ts`) para provar o diagnóstico. Os outros 6 continuam
  quebrados; nenhuma outra mudança foi feita no working tree.
- Benchmarks não foram re-executados. A ressalva "benchmark/optimize é Node-only" nos projetos 01 e 02
  continua válida e não foi testada aqui.
- Concluí 1 lição de 17 no literacyDojo e 0 missões Dev completas (o gate de conclusão não foi exercido
  ponta a ponta no browser; os 6 E2E do engine cobrem isso).

---

## 6. Fechamento — o que foi corrigido (mesma data, verificado por execução)

As seções 1–5 acima são o **diagnóstico** e ficam como registro. Esta seção é a resolução. Cada
item cita o comando que prova o fechamento.

| § | Item | Correção | Prova |
| --- | --- | --- | --- |
| 2.1 | Missões do OS mortas em qualquer build | `.env.production` aponta as 4 chaves para `/apps/<nome>/`; `scripts/bundle-missions.mjs` compila os 4 runtimes com `--base` para `dist/apps/`; `build:pilot` e `netlify.toml` usam isso | `npm run test:smoke:pilot` → 2/2 contra o `dist/` **sem dev-server**; removendo `dist/apps/` os 2 falham |
| — | *(novo)* Nenhum teste cobria o artefato entregável | `tests-pilot/pilot-build.smoke.spec.ts` + `playwright.pilot.config.ts`: roda `vite preview` sobre o build e exige que a origem do iframe seja a do host | mesma suíte acima; guarda-corpo verificado por falha proposital |
| — | *(novo)* Regressão pré-existente no smoke de dev | 3 seletores `exact: 'Começar'` desatualizados desde `dac4078` (04/08, renomeou para "Começar missão") | `npm run test:smoke` → de **52 passed / 9 failed** para **61 passed / 0 failed** |
| 2.2 | 5 de 18 projetos do currículo não rodavam | `git config core.symlinks true` + recheckout dos 7 `logger.ts` materializados como texto | 18/18 com exit code 0 |
| 2.3 | Lint do voxelDojo vermelho | `biome check --write` nos 16 `evidence/emit.ts` | `pnpm run lint` limpo em 222 arquivos; smoke 16/16 jogos, 50 testes |
| 2.4 | Docs afirmavam falta de toolchain Go/Rust | `catalog.md` reescrito com o que roda de fato; ressalva de benchmark mantida (verdadeira) e recausada como tarefa pendente | Go 85.9%/99.2% + vet + race; Rust clippy `-D warnings` |
| — | *(novo)* `nanoid` <3.3.18, high severity, deps de produção do OS | `npm audit fix` (postcss 8.5.16 → 8.5.23) | `npm audit --omit=dev` → 0 vulnerabilidades; `pnpm audit --prod` limpo nos outros 4 engines |
| — | *(novo)* Teste de propriedade de segurança `#[ignore]`d em Rust | trocado `#[tokio::test]` + `tokio::spawn` por `#[test]` + `std::thread::scope` — `check` é síncrono, o runtime async era a causa do hang | **15 passed, 0 ignored** (era 14+1); 5 execuções seguidas sem flake |

### O que continua aberto — e por que não foi "corrigido"

| Item | Por que não | O que destrava |
| --- | --- | --- |
| **Duas portas de entrada** (§2.5) | é decisão de produto, não defeito: qual é a porta da frente é escolha do dono | você decide; aí um dos onboardings é aposentado |
| **Zero instrumentação** (§2.6) | feature nova, deliberadamente adiada pelo ADR-0009; num piloto de 1 pessoa, observar vale mais | os 4 critérios do piloto passarem — aí instrumentar tem alvo |
| **Deploy público** | ação externa: precisa da sua autorização e do CLI autenticado | você rodar `netlify deploy` (o `netlify.toml` já está correto) |
| **Benchmark Go/Rust do projeto 01** | é trabalho de ciclo (N≥3, harness), não um bug | uma sessão de benchmark dedicada |
| **Exercício separado da solução na trilha Dev** (§4) | é o artefato pedagógico central que falta; criar 18 estados iniciais é projeto, não correção | a decisão do §4 sobre qual produto perseguir |

### Nota de método

O smoke de dev do OS foi rodado **antes e depois** das correções. Isso é o que revelou a regressão
do `dac4078`: eu tinha reportado na §2.1 que "os 208 testes passam porque o iframe é mockado por
fixture" e estava certo sobre os unit tests, mas **errado ao supor que nada carregava o iframe de
verdade** — a suíte Playwright carregava, e estava vermelha havia duas semanas sem ninguém notar.
A lição vale mais que a correção: rodar a suíte inteira antes de afirmar o que ela cobre.
