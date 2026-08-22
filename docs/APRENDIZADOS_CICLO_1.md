# Aprendizados do ciclo 1 — pacote portátil

**Para quê:** sobreviver se o resto do repo for congelado.  
**Não é:** decisão de reboot, inventário de arquivos, nem plano de implementação.  
**Corte:** 2026-08-17 · ~10 semanas · 349 commits.  
**Irmãos:** números em `docs/CONSOLIDACAO_2026-08-17.md`; execução do mesmo dia em `docs/ESTADO_REAL_2026-08-17.md`.

Leia isto como o que o primeiro fluxo *ensinou*. O código pode parar. Estas regras não.

---

## 1. O que o ciclo tentou ser

Três missões no mesmo disco, sem dono único:

| Semente | Promessa |
| --- | --- |
| `docs/PROMPTS/-01_GOAL.md` | Agentes contínuos que ensinam **você** a programar, com projetos pequenos que crescem |
| `docs/VISION.md` | Democratizar IA para **dois públicos**, Duolingo + voxel |
| `learner/learning_state.yaml` | Código profissional robusto **sem dependência de IA** |

Cada uma puxou um motor. O resultado: 11 engines, 16 jogos 3D, 19 projetos, 92k linhas de doc, **2 unidades verificadas**, **0 usuários medidos**.

A leitura honesta do consolidado: a máquina de provar *honestidade* funciona. Não existe máquina de provar *valor*.

---

## 2. Vocabulário que deve viajar

Não misturar estas palavras. Foi o que impediu (e depois corrigiu) o teatro de conclusão.

| Termo | Significa | Não é |
| --- | --- | --- |
| **Tentativa (Attempt)** | O aprendiz tenta *antes* da solução, em arquivo | screenshot, chat, “eu fiz” |
| **Evidência executável** | Saída que outro processo pode re-julgar | opinião do modelo, XP, `completed` local |
| **Elegibilidade** | Pode o verificador nem olhar? | um fail de mastery |
| **Gate Outcome** | fail / pass_retried / pass_first_try / pass_exceeds | “o jogo mostrou PASS” |
| **Mastered / DOMINADO** | Só o verificador independente, com evidência da classe do gate | código existe, docs prontos, dashboard verde |
| **Produtor** | Gera tentativa, artefato ou run judgment | quem atesta domínio |
| **Verificador (Prometor)** | Contexto isolado; único que promove | o próprio jogo, o tutor, o CI sozinho |
| **Estado canônico** | `learner/` em texto + git | IndexedDB, ledger paralelo, view gerada |
| **View derivada** | Regenerada (`python3 -m learner.substrate`) | verdade editável à mão |
| **AIDI** | Dependência de IA (menor é melhor) | produtividade, velocity |
| **Streak** | Dias com Gate Outcome *passando* | sequência de tentativas |

Contrato pedagógico mínimo (vale para qualquer superfície):

```text
objetivo → tentativa → feedback → dica/retry → evidência bruta → revisão
```

`completed` / XP / streak motivam voltar. **Nunca** provam competência. Certeza de conclusão **nunca** vive no LLM.

---

## 3. Oito fundamentos (com prova neste repo)

De `docs/FUNDAMENTOS.md`. Cada um já tem cicatriz.

1. **Contrato antes de código.** pixelDojo emitia evidência perfeita que ninguém lia. Um contrato de um lado só é um produtor mudo.
2. **Uma fonte, muitas views.** Editar `learner/`, regenerar o resto. AIDI mostrou 0.34 / 0.5 / 0.0 ao mesmo tempo porque adapters inventaram número (ADR-0003).
3. **Produtor ≠ verificador.** Em 2026-07-01, 18 unidades viraram `mastered` sem tentativa (`04a3463`). Todo dashboard mentiu até 2026-07-05. Detectável *só* porque o estado é arquivo no git.
4. **Estado auditável: texto + git.** Se não dá `git log` do estado, não dá para saber quando ele mentiu.
5. **Fatia vertical antes de escala.** Seis (depois doze) engines a 80% com um loop fechado por mês não é MVP. O próprio F5 foi escrito *depois* disso acontecer — e o repo escalou de novo em seguida.
6. **Gates empíricos, não opinião.** N≥3, limiar pré-declarado. “Parece bom” e N=1 não são gates.
7. **Falha visível.** O loop ficou um mês em `impl-done`; o arquivo tornou isso um fato, não uma surpresa.
8. **Simplicidade obrigatória.** `/simplify` no diff **antes** de commitar. Cada tentativa de “simplificar” que *adiciona* ADR + porta + adapter não é simplificação.

### Como pedir trabalho à IA (levar amanhã, 5 linhas)

```
CONTEXTO:  caminhos de arquivo + 1 linha de situação
OBJETIVO:  um resultado observável
RESTRIÇÕES: o que não pode mudar
ACEITE:    comando que prova
NÃO-META:  o que fica de fora
```

Campo omitido = decisão que a IA toma pelo caminho estatisticamente comum. Uma entrega por pedido. Peça a prova junto. Decisão grande → opções antes de código. Corrija com diff, não com “refaz”.

---

## 4. Decisões que continuam válidas (mesmo congelando o código)

| Decisão | Levar |
| --- | --- |
| Node-first; poliglota só como exceção deliberada | Sim. Go/Rust no 01/02 foram review/proposta, não paridade medida. |
| Literacy: local-first, sem LLM em runtime, `completed` ≠ `mastered` | Sim. Único produto que alguém de fora já pode abrir. |
| Gate no-code (ADR-0004): checklist falsificável, rótulo `gate_kind: no_code`, nunca promove unidade de código | Sim, se houver trilha não-técnica. |
| OpenClaw = tracer / checklist, não dono do ciclo de qualidade | Sim. Não fundir runner com orquestrador. |
| Ledger paralelo (aiDevschoolMvp) é contexto *declarado*, não acidente | Se existir um segundo produto, declare a fronteira. Não finja “1 aprendiz” se o estado está noutro JSON. |
| dojoToday embute só a missão ativa; tutor BYOK e off | Padrão: superfície diária determinística; IA opcional. |
| CI cheio em `main` + PRs, não em todo push de branch | Sim. |
| Analytics / multi-tenant | **Não levar agora.** Resolvem escala sem usuário. ADR-0008 ainda `Proposed`; ADR-0009 é design-only. |
| CURR | Proxy não validado. Não dirige automação. |
| Gate exige tentativa **humana** antes de a IA implementar ou marcar domínio | Inviolável. |

---

## 5. Aprendizados de produto e pedagogia

1. **Dois públicos no mesmo host sem uma porta de frente.** LiteracyDojo tem onboarding próprio (Vila Lume). O OS tem outro, para as mesmas trilhas. Duas portas, uma decisão de trilha, zero dono.
2. **Microlição de 3–5 min com critério articulável funciona.** l02 obriga escolher *por que* uma resposta de IA é mais confiável. Feedback numérico + motivo faltante + retry. Isso é pedagogia, não trivia.
3. **`completed` local é honesto e insuficiente.** O verificador no-code existe e quase não promoveu ninguém. O aprendiz sai com XP, não com prova.
4. **Conteúdo curto acaba rápido.** O catálogo tem 17 lições válidas, mas o release público oferece 14 × 3–5 min (cerca de 1 hora); as 3 Dev são prévia separada. Uma semana de uso e o produto encontra o vazio.
5. **A trilha Dev distribuiu respostas, não exercícios.** Os 18 `node-impl/` já têm a solução. “Tentativa antes de solução” é inaplicável se o aprendiz clona a resposta. Sem um artefato “desafio” (assinaturas + testes vermelhos + spec) separado de `solution/`, não há trilha Dev — há repositório de referência.
6. **Jogo de 12 min e ciclo de 5 fases não são a mesma unidade de valor.** Um ensina um conceito; o outro levou semanas por projeto e rendeu 2 unidades em 10 semanas. Apresentar os dois como “a trilha” mistura escalas.
7. **Jogo é superfície de tentativa, não autoridade.** Emite evidência bruta duas vezes (global + console). Nunca escreve `mastered`. Recibo do verificador é outro arquivo, com digest que ignora `ts`.
8. **Um jogo = um conceito**, lido do catálogo e do `learning_state`, nunca inventado no engine.
9. **Catálogo é a lista canônica.** ROADMAP e backlog são views. Quando o ROADMAP diz “02 not started” e o `units_log` diz mastered, o catálogo + filesystem vencem — e o doc derivado está mentindo.
10. **Vocabulário de status no artefato** (`implemented` / `scaffolded` / `planned` / `proposal` / `blocked`) é mais barato e mais honesto que caveat em prosa.
11. **Docs nunca movem nível de aprendizagem.** Pitfall 2026-06-18: MANIFEST completo ≠ mastery de um conceito de programação.
12. **Zero instrumentação = zero prova de valor.** ADR-0009: impossível saber se alguém aprende. O gate que falta é externo: *uma pessoa que não é o autor completa uma lição e volta na semana seguinte.*

---

## 6. Aprendizados de processo com agentes (o mais caro do ciclo)

1. **Gravidade do meta-sistema.** Recap 19/06: ~80% dos commits foram no *aparelho que deveria ensinar*, não no currículo. A regra proposta (“commits em `engines/` não superam `curriculum/`”) nunca foi aplicada. Julho: 293 commits, 1 unidade fechada.
2. **Progresso falso em lote é o modo de falha nº 1.** Um commit, 18 `mastered`, 1 attempt file. Gate + git não são burocracia; são o único detector.
3. **Doc à frente do código gera churn.** Semana com 11/28 commits “remove stale / tighten claims”. Documente o contrato *depois* que o código o impõe.
4. **Auditoria é snapshot.** Três itens “open” no audit de 08/07 já estavam corrigidos no mesmo dia. Rechecar HEAD. Uma análise canônica por auditoria — não três docs repetindo as mesmas 8 recomendações.
5. **Verificador de contexto fresco pega o que o produtor não vê.** Reprovou o 01 com 4/10 depois de um 9/10 sob regra frouxa. Prompt mínimo: objetivo + done-rules + caminho do artefato. **Nunca** o raciocínio do produtor.
6. **Stop-hook como gate funciona.** Recusou um “done” multi-tarefa porque o aceite da tarefa 06 não tinha passado.
7. **Trabalho de agente não commitado não sobrevive.** Sessão paralela apagou fonte de 6 jogos (os `dist/` ainda tinham o código). Commite a wave no mesmo turno em que os agentes voltam.
8. **Arquivo compartilhado + N agentes = serialize.** Shape B (um diretório por jogo) paraleliza; um `curriculumPack.ts` único não.
9. **Configs se copiam, não se improvisam.** Template de `package.json`/`tsconfig`/`biome`/`vite` com nome+porta = verde de primeira. Improviso = retry.
10. **Visão alucina identidade de screenshot.** Colisão de conteúdo: leu print do jogo 06 como 07. Prova = hash, não o modelo.
11. **Falha recorrente: propagação de artefato, não o jogo.** Jogos certos; cópias em `.loops/` erradas. Regenere do run vivo.
12. **Loop que se auto-verifica não fecha.** O primeiro architecture-weed quase reescreveu `FUNDAMENTOS.md`. Leia o repo antes de um doc paralelo.
13. **Suíte verde, produto morto.** 208 testes do OS passam com iframe mockado; `npm run build` comum entrega 6 missões em `127.0.0.1`. O mecanismo certo (`build:pilot` + `.env.production`) já existia e não foi o comando medido. Mesmo padrão da `ClientKeyStrategy`: teste da peça, não do caminho real.
14. **Symlinks no git são contrato de máquina.** `core.symlinks=false` materializou `logger.ts` como texto do caminho. CI Linux verde; Mac local vermelho. O ambiente do aprendiz faz parte do contrato.

---

## 7. Aprendizados de engenharia (journal — o ativo que já pagou o custo)

### Forma

- **Núcleo puro, casca fina.** A lógica recebe um clock e devolve números. HTTP/CLI/WS é adapter. A costura de teste e a de deploy são a mesma.
- **Clock injetado no design**, não depois do flake. Go `Now()`, Rust `trait Clock`, Node `() => number`.
- **Refill preguiçoso** para “tempo desde o último evento”. Idle custa zero CPU. Timer de fundo só se houver efeito colateral ou outro leitor.
- **Lazy-create + sweep + TTL idle (~10× o intervalo)** é eviction. **Mais um teto duro** se a chave vem de input externo — senão a janela do sweep é DoS.
- **Mutex grosso enquanto a seção crítica ≲ 1 µs.** Depois: 16–64 shards, potência de 2, bitmask. Documente o penhasco no tipo para ninguém “consertar” de volta.
- **`std::sync::Mutex` no Rust async** se não há `.await` sob o lock. `tokio::sync::Mutex` é ordens de grandeza mais caro para um lookup + uns floats.
- **Monotônico para a matemática, wall-clock só para o header/ETA.** Âncora na construção. NTP não quebra o limiter; testes predizem `X-RateLimit-Reset`.

### HTTP por linguagem

- Go: stdlib `net/http` + `ServeMux` + shutdown por sinal. Framework só se o roteador ou a cadeia de middleware pedirem.
- Rust: axum + tower; `route_layer` = subset; `.layer` = global. Pin da major: a API muda. Tokio test runtime pode travar em teardown de `interval` — prefira teste síncrono.
- Node: classe pura + adapter Express. `req`/`res`/`req.ip` ficam fora da classe.
- **Trust-proxy é hop count ou CIDR, não boolean.** As três linguagens nasceram com três defaults para a mesma spec.

### Performance e medição

- Caminho quente de limiter/WAF/throttler é o **deny**. Pré-aloque o body 4xx.
- V8: ~8 chamadas dummy do método quente antes de `listen()` se o spike p99 for o primeiro request.
- `setInterval(...).unref()` só para housekeeping. Heartbeat e job que o operador espera **não**.
- Benchmark HTTP com cliente de verdade (k6 / autocannon), carga *acima* da spec.
- **N=1 é protótipo.** Rust p99 8.98 ms → 18.30 ms (std 15.9) em N=3. Delta real ≈ std. Mediana + desvio.
- CV alto (16–18% em p95/p99) = inconclusivo, não vitória.
- Otimização invisível no bench: implemente, declare a lacuna, adicione o cenário. Não pule para o relatório ficar bonito.
- “Logging é lento” a 200 RPS é ruído. Meça syscall antes de dropar observabilidade.
- `docker stats --no-stream` no fim responde “estável?”. Pico de GC pede poller.
- k6 v2 não exporta p50/p99 no summary default. Leia o stream bruto antes de assumir que a métrica não existe.
- Concorrência: `go test -race`; Rust async → loom ou recorte síncrono; Node “single-thread” é *model check*, não detector de race.
- **Node sem `await` entre validate e commit é disciplina, não garantia.** Um `await` futuro reintroduz torn-write; o teste atual não pega.

### Armadilhas já pagas em código

- **Abstração vestigial.** `ClientKeyStrategy` nas três linguagens, testes verdes, zero caller no servidor. Rust nem `mod`. Grep o caminho de produção, não a cobertura.
- **Manutenibilidade não é neutra em velocidade.** Ligar a strategy no hot path Node: −5.9% RPS / +7.3% latência. Medir e reportar a regressão; não rebatizar como vitória.
- **`#[ignore]` / `it.skip` em propriedade de segurança** = bug embarcado com CI verde.
- **Validador genérico perde domínio.** `parsePositiveInt` rejeitou `CLEANUP_INTERVAL_MS=0` (“não varrer”), que a spec permite.
- **`for` em função bash sem `local`** clobbera o caller. Doze arquivos de bench foram para a pasta `node/`.
- Identificadores legados de evidência (rate limiter) são contrato de persistência. Rename só no content pack quebra verifier e `units_log`.
- Kind de evidência desconhecido **não** cai no token-bucket.
- Validação estrutural do envelope ≠ validação de domínio da lição.
- Teste de catálogo não hardcoda “N lições ready”.
- Workspace pnpm aninhado em subprojeto quebra CI. Substrate compartilhado do evolution engine é **symlink**, não cópia.

---

## 8. O padrão que explica “complicado e sem entrega”

Três medições, uma causa:

- 92k linhas de doc / 2 unidades verificadas — o artefato mais fácil (texto) virou o mais produzido.
- 11 engines, 16 jogos, 19 projetos — 1 loop vertical fechado por mês. F5 nomeou isso em 05/07; o repo escalou de novo.
- ADR-0009 confessa: depois de todo o aparato, não se sabe se alguém aprende, e o runtime foi adiado.

**O ciclo construiu um gate de honestidade e nunca um gate de valor.** Verificação só para dentro (digest, produtor ≠ verificador) converge para verificar-se cada vez melhor.

Segundo padrão: **simplificar adicionando estrutura** (audit → 4 fases; multi-tenant → ADR + spike + `learner/service/`; “não fazer analytics” → ADR de 149 linhas + porta). Simplificação que produz artefato novo não é simplificação.

---

## 9. Se congelar: o que levar, o que parar, o que não repetir

### Levar (já pagou o custo; independe do aparato)

- Este arquivo + `learner/journal.md` + `learner/pitfalls.md` + `docs/FUNDAMENTOS.md`
- A ideia mínima do gate, em três arquivos e nenhum framework: tentativa + evidência + verificador em contexto separado
- `curriculum/` como conteúdo (specs e impls Node são reais, mesmo sem exercício separado)
- `curriculum/ai-literacy/` + LiteracyDojo (única URL pública)
- Protocolo de pedido à IA (FUNDAMENTOS §2)
- Node-first, núcleo puro, clock injetado, status no artefato

### Congelar (não apagar; parar de investir até haver usuário)

- OS desktop / Engine Hub, dojoToday, miniTown, zai-duolingo-like
- voxelDojo além do jogo da unidade ativa; pixel além de pixel-quest
- 14 agentes + 25 subagents + 20 comandos + evolution engine como rotina
- Views derivadas (`.mavis/`, whiteboard, snapshots) para um aprendiz que não olha o dashboard
- ADR-0008 e ADR-0009
- Poliglota Go/Rust como obrigação de cada projeto
- Architecture-weed de ADRs novos, coverage sweep threejs, segundo tutor (aiDevschoolMvp) até o bridge existir de verdade

### Não repetir

- Três missões de produto no mesmo repo sem escolher a da semana
- 18 soluções commitadas chamadas de “trilha”
- Dois onboardings para as mesmas trilhas
- Teste que mocka o único caminho que o usuário vê
- Doc, manifesto ou dashboard como prova de aprendizado
- Engine novo para “completar o mapa”
- Analytics / contas / multi-tenant antes de um usuário real voltar

### O único gate novo que vale

Uma pessoa que não é o autor completa uma lição e volta na semana seguinte. Sem produto de analytics isso ainda é verificável: pergunte a ela. Enquanto esse gate não passar, nenhum outro número do repo mede entrega.

---

## Fontes

`learner/journal.md` · `learner/pitfalls.md` · `learner/CONTEXT.md` · `learner/learning_state.yaml` ·  
`docs/FUNDAMENTOS.md` · `docs/VISION.md` · `docs/PROMPTS/-01_GOAL.md` ·  
`docs/ARCHITECTURE_EVALUATION_2026-07-05.md` · `docs/CONSOLIDACAO_2026-08-17.md` · `docs/ESTADO_REAL_2026-08-17.md` ·  
`docs/design/adr/0001`–`0009` · `docs/design/micro-lesson-contract.md` · `docs/design/teaching-game-contract.md` ·  
`curriculum/catalog.md` · `curriculum/BACKLOG_STATUS.md` · memória do projeto (regras, decisões, gotchas) · recaps em `knowledge/experiences/recaps/`
