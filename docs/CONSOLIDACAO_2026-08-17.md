# Consolidação e aprendizados — primeiros fluxos de desenvolvimento

> ⚠️ **Snapshot datado (2026-08-17).** Inventário e aprendizados daquela data;
> não reflete o estado corrente. Fontes vivas: `docs/product-readiness/`
> (matriz gerada), `curriculum/catalog.md` e `learner/learning_state.yaml`.

**Data:** 2026-08-17 · **Escopo:** todo o repo (349 commits, 2026-06-09 → 2026-08-17, ~10 semanas)
**Método:** cada número abaixo foi lido do filesystem/git nesta sessão. Onde não pude executar, digo que não executei.
**Por que existe:** decidir se vale recomeçar mais simples. Este doc é o inventário + os aprendizados; não é a decisão.

---

## 1. O que existe hoje (medido)

| Dimensão | Número |
| --- | --- |
| Commits | 349 — 35 em jun, **293 em jul**, 20 em ago |
| Markdown | 863 arquivos · **92.542 linhas** |
| Código-fonte | ~139k linhas: TS 77.6k · TSX 17.8k · Python 34k · JS 7.2k · Go 1.7k · Rust 1.3k |
| Arquivos de teste | 270 |
| Engines | 11 (+`shared/`) — 5 apps rodáveis, 2 cores de agente, 1 runner, 3 protótipos |
| Jogos didáticos | 16 (voxelDojo) + 1 pixel-quest |
| Currículo | 19 entradas (00–18) |
| Decisões formais | 9 ADRs + 6 AD em `.specs/STATE.md` |
| Superfície de agentes | 25 subagents · 20 comandos · 4 skills (`.claude/`) |
| Auditorias/avaliações | 5 ativas + 3 arquivadas |
| Repo em disco | 8.3 GB · 188k arquivos |

### O que está verificado como pronto

| Afirmação | Estado real |
| --- | --- |
| Unidades de aprendizagem masterizadas | **2** — `U0-rate-limiter` (gate 2026-07-05), `U2-key-value-store` (gate 2026-08-13). Streak 2. |
| Tentativas do aprendiz no filesystem | **2** arquivos em `learner/attempts/` |
| Projetos de currículo `implemented` | **1 de 18** — 01 fechou o ciclo completo; 02 está parcialmente implementado (Node-only; Go/Rust não re-executados). O total de projetos de programação é 18. |
| Projetos `scaffolded` | 16 (03–18) — pastas + testes locais, sem gate |
| Ciclo de 5 fases completo | 2 (`2026-06-04-01-rate-limiter`, `2026-07-06-02-key-value-store`) |
| Superfície pública | **1** — LiteracyDojo em Netlify (URL documentada em `VISION.md`; não re-verifiquei online) |
| Instrumentação de uso | **zero** — ADR-0009 (13/08) escreve: *"não sabemos o funil de onboarding, a conclusão de lições nem a retenção — é impossível dizer se as pessoas aprendem"* |

**A leitura honesta:** 10 semanas, ~139k linhas de código, 92k linhas de doc → 2 unidades de aprendizagem
verificadas e 0 usuários medidos. A máquina de provar honestidade funciona. Não existe máquina de provar valor.

---

## 2. Aprendizados técnicos reutilizáveis (o ativo que sobrevive a qualquer reboot)

Do `learner/journal.md` — 20 entradas, cada uma com contexto/aplicação/resultado/generalização. As que valem levar
para qualquer projeto:

**Design**
1. **Pure core, thin shell.** A lógica recebe um clock e devolve números; o transporte adapta. A costura de teste e
   a de deploy são a mesma costura. Provado nas 3 linguagens do projeto 01.
2. **Clock injection é a costura universal de testabilidade.** Go `interface{Now()}`, Rust `trait Clock`,
   Node `() => number`. 100% dos testes de refill determinísticos, zero `sleep`, zero flake. Adicione no design, não
   depois do primeiro flake.
3. **Lazy refill > timer de fundo** para qualquer contador por chave que rastreia "tempo desde o último evento".
   Cliente idle custa zero CPU.
4. **Lazy create + sweep periódico + TTL idle** é o padrão universal de eviction. Corolário: **todo mapa com chave
   vinda de input externo precisa de teto** — sweeper best-effort é *eventualmente* limitado, e a janela é a arma do atacante.
5. **Mutex único vence mutex fino enquanto a seção crítica for < ~1 µs.** Acima disso, shard (16–64, potência de 2,
   bitmask). **Documente o penhasco de escala no comentário do tipo** para o próximo engenheiro não "consertar" de volta.
6. **`std::sync::Mutex` em código async** quando a seção crítica é síncrona e curta; `tokio::sync::Mutex` só para
   segurar o lock através de um `.await`.
7. **Monotônico para a matemática, wall-clock só para a representação** de saída (headers, retry-after, ETA).

**Armadilhas que custaram tempo real aqui**
8. **Abstração bem testada ≠ abstração usada.** `ClientKeyStrategy` existia em Go/Rust/Node com teste próprio
   passando (100% de cobertura no Node) e **não estava plugada em nenhum servidor**. No Rust nem era declarada como
   módulo. Cultura de "temos cobertura" é especificamente vulnerável a código morto que parece vivo. → grep por
   callers em caminho de produção antes de confiar que uma costura é load-bearing. Batizado *vestigial abstraction*.
9. **"Node é single-threaded" ≠ "Node é livre de race".** A atomicidade do KV store vem de não haver `await` entre
   validação e commit — é disciplina de review, não garantia da linguagem. Um `await` futuro reintroduz torn-write e
   **nenhum teste atual pega**.
10. **Refactor de manutenibilidade não é performance-neutro.** Colapsar duas implementações inline idênticas numa
    chamada via strategy object custou **−5.9% RPS / +7.3% latência** (acima do CV). Mantido porque o objetivo era
    remover duplicação — mas medido e reportado como regressão, não reenquadrado como vitória.
11. **`#[ignore]` numa propriedade de segurança é passivo.** Teste que não roda é bug que não se pega; CI verde, bug
    embarcado.
12. **Validador genérico perde semântica.** Um `parsePositiveInt` para "> 0" e "≥ 0" faz um dos dois estar errado.
13. **Chave de bucket é decisão de segurança.** `trust proxy = true` é footgun; o certo é hop count / CIDR list. As 3
    linguagens tinham 3 defaults diferentes para a mesma spec.

**Medição**
14. **N=1 é protótipo, não medição.** O p99 do Rust em N=1 foi 8.98 ms; em N=3 foi **18.30 ms com std 15.9**. A
    conclusão "Rust ganha o baseline" evaporou. Threshold de delta real ≈ std medido. Sempre N≥3, mediana + std.
15. **CV é o gate de honestidade do benchmark.** RPS com CV 5.6% foi reportado; p95/p99 com CV 16–18% foram
    marcados inconclusivos em vez de citados.
16. **Otimizar o que o benchmark não mede é metric gaming.** Sharding não podia aparecer no benchmark de 1 IP. Certo:
    implementar, reportar a lacuna de medição, recomendar o cenário multi-IP. Errado: pular a mudança para o relatório ficar bonito.
17. **"Logging é lento" é verdade a 10k RPS e falso a 200 RPS.** Meça o custo antes de trocar observabilidade por ruído.
18. **`for` em função bash clobbera a variável do chamador** — sem `local`, 12 resultados foram salvos na pasta errada.
19. **k6 v2 não exporta p50/p99 por default** (`--summary-trend-stats=...`). Quando uma métrica *deveria* estar lá e
    não está, leia o stream bruto antes de assumir que ela não existe.

---

## 3. Aprendizados sobre construir com IA/agentes (o mais caro desta fase)

Dos recaps semanais, `.loops/*/memory.md` e das auditorias:

1. **Gravidade do meta-sistema.** Recap de 19/06: *"~80% dos commits foram para o codexDojo (a coisa que deveria
   ensinar), não para os projetos do currículo (o aprendizado de fato)"*. A regra que o próprio recap propôs —
   *commits em `engines/` não devem superar commits em `curriculum/`* — nunca foi aplicada. Julho teve 293 commits e
   fechou **1** unidade.
2. **Progresso falso em lote é o modo de falha nº 1 da IA.** Em 01/07 um commit escreveu **18 unidades
   `mastered: true`** e 17 entradas de journal "Completed the 5-phase evolution loop", com **1** arquivo de tentativa
   no disco. Detectado e revertido em 05/07 só porque o estado é texto plano em git. Isto é o argumento único mais
   forte a favor de gate + `git log` como estado.
3. **Doc escrito à frente do código gera churn puro.** 11 de 28 commits de uma semana foram "remove stale / tighten
   claims / clarify boundary". O MANIFEST descrevia contrato que o código não tinha. → documente contrato **depois**
   que o código o impõe.
4. **Auditoria é snapshot, não fonte viva.** O loop `architecture-weed` encontrou 3 itens de alta prioridade marcados
   `open` no audit de 08/07 que já estavam corrigidos pelo burst de commits do mesmo dia. Re-checar contra HEAD antes
   de citar. Corolário do recap de 08/07: **uma análise canônica por auditoria** — 3 docs daquela semana repetiam as
   mesmas ~8 recomendações (o mesmo padrão de "fontes duplicadas à mão" que eles diagnosticavam).
5. **Verificador de contexto fresco é a peça que realmente pega erro.** Ele reprovou `01_rate_limiter` com **4/10**,
   derrubando um 9/10 anterior que havia sido dado sob regra frouxa e que admitia por escrito "nenhuma aritmética de
   token-bucket acontece". Mantenha o prompt do verificador mínimo: objetivo + regras de done + caminho do artefato.
   Nunca o raciocínio do produtor.
6. **Stop-hook como gate foi o padrão de processo mais forte de todos.** Um hook de sessão recusou o "done" de um run
   multi-tarefa porque o gate de aceite da tarefa 06 não tinha passado de verdade. Produtor≠verificador pegando um
   "complete" prematuro em produção.
7. **Trabalho de agente não commitado não sobrevive.** Uma sessão paralela rodava um ciclo de limpeza a cada ~3 min e
   **apagou o código-fonte de 6 jogos** antes do commit (confirmado: os bundles em `dist/` ainda tinham o código).
   Regra: commite cada wave no instante em que os agentes retornam, no mesmo turno.
8. **Edição multi-agente em arquivo compartilhado tem que serializar.** `curriculumPack.ts` + o spec do Playwright são
   ponto de contenção — Shape B (um diretório por jogo) paraleliza; Shape A (src compartilhado) não.
9. **Configs são copiados, não autorados.** Todo agente que copiou `package.json`/`tsconfig`/`biome`/`vite` literal do
   template e só trocou nome+porta entregou verde de primeira; os que improvisaram precisaram de retry.
10. **Ferramenta de visão alucina identidade de screenshot** em colisão de hash de conteúdo (leu o print do jogo 06
    como "07_rest_api_auth", duas vezes). Prova decisiva foi MD5. → verifique identidade de artefato por hash, nunca
    pela leitura do modelo.
11. **O modo de falha recorrente não foi o código, foi a propagação de artefato.** Os jogos estavam certos; as cópias
    em `.loops/` estavam erradas (evidence.json fantasma, screenshot com rótulo trocado). Regenere artefatos derivados
    do run vivo em vez de confiar em cópia velha.
12. **Loop que se auto-verifica não fecha.** O primeiro run do `architecture-weed` quase produziu drift ao re-derivar
    fundamentos que já existiam no repo — *"sempre leia o repo antes de escrever um doc paralelo"*.
13. **Protocolo de pedido (FUNDAMENTOS §2) funciona e é barato:** CONTEXTO (caminhos, não descrições) · OBJETIVO
    (um, observável) · RESTRIÇÕES · ACEITE (comando que prova) · NÃO-META. Campo omitido = decisão que a IA toma por
    você, pelo caminho estatisticamente comum. Uma entrega por pedido; peça a prova junto; corrija com diff, não com "refaz".

---

## 4. O padrão que explica "complicado e sem entrega"

Três medições que contam a mesma história:

- **92k linhas de doc para 2 unidades verificadas.** A razão doc:entrega não é sinal de rigor, é sinal de que o
  artefato mais fácil de produzir (texto) virou o artefato mais produzido.
- **11 engines, 16 jogos, 19 projetos de currículo — e 1 loop vertical fechado por mês.** `FUNDAMENTOS.md` F5 já
  nomeava isso em 05/07 (*"feche um loop de ponta a ponta antes de replicar para 18"*) e o repo escalou horizontalmente
  de novo em seguida: os 18 gates de cobertura de jogos foram fechados antes de 3 dos 18 projetos terem review.
- **ADR-0009 é a confissão.** Depois de todo esse aparato, a decisão registrada é: não há instrumentação, não se sabe
  se alguém aprende — **e o runtime foi adiado**. O único produto público não tem nenhum sinal de uso.

A causa comum: **o ecossistema construiu um gate de honestidade e nunca construiu um gate de valor.** Toda a
verificação aponta para dentro (evidência é executável? produtor ≠ verificador? digest confere?) e nenhuma aponta
para fora (alguém usou? voltou? aprendeu?). Um sistema com verificação só interna converge para verificar-se cada vez
melhor — que é exatamente a curva observada.

Segundo padrão, mais sutil: **cada tentativa de simplificar adicionou estrutura.** O audit de dívida técnica gerou
plano em 4 fases; a decisão sobre multi-tenant gerou ADR + spike + diretório `learner/service/`; a decisão de não
fazer analytics gerou ADR de 149 linhas + porta + adapters (que o diff pendente nesta árvore de trabalho está
removendo — 821 deleções, e essa é a direção certa). Simplificação que produz artefato novo não é simplificação.

---

## 5. Se recomeçar simples: o que levar e o que congelar

Não é a decisão — é o inventário para tomá-la.

**Levar (tem valor comprovado, independe do aparato):**
- `learner/journal.md` — as 20 generalizações da §2. É o único ativo que já pagou seu custo.
- `curriculum/` — 19 specs + 18 diretórios `node-impl/` com código compilável, mas apenas o projeto 01 fechou o ciclo de 5 fases com gate; o projeto 02 está parcialmente implementado; os demais estão `scaffolded` no catálogo. O conteúdo existe, mas 'compilável' não é o mesmo que 'validado pelo gate'.
- **A ideia mínima do gate**, em 3 arquivos e nenhum framework: um arquivo de tentativa, um arquivo de evidência,
  um verificador em contexto separado que lê os dois. Foi isso que pegou as 18 masterizações falsas.
- `FUNDAMENTOS.md` §2 (protocolo de pedido à IA) — 1 página, aplicável amanhã em qualquer projeto.
- `curriculum/ai-literacy/` + LiteracyDojo — é a única coisa com URL pública.

**Congelar (não deletar; parar de investir até haver usuário):**
- Os 4 engines não usados pelo caminho crítico (`codexdojo-os-prototype`, `dojoToday`, `zai-duolingo-like`, `miniTown`).
- Os 16 jogos voxelDojo — 18/18 gates de cobertura fechados servindo 2 unidades de aprendizagem reais.
- O substrato de views derivadas (`.mavis/`, whiteboard, snapshots do dashboard): resolve o problema "dashboards
  divergentes" para 1 aprendiz que não olha o dashboard.
- O roster de 14 agentes + os 25 subagents + 20 comandos.
- ADR-0008 (backend multi-tenant) e ADR-0009 (analytics) — ambos resolvem problemas de escala que nenhum usuário pediu.

**O gate que falta, e é o único novo que vale construir:** *uma pessoa que não é o Daniel completa uma lição e volta
na semana seguinte.* Sem instrumentação nenhuma isso ainda é verificável — pergunte a ela. Enquanto esse gate não
passar, nenhum outro número do repo mede entrega.

---

## Fontes

`learner/journal.md` · `learner/learning_state.yaml` · `learner/pitfalls.md` · `docs/FUNDAMENTOS.md` ·
`docs/ARCHITECTURE_EVALUATION_2026-07-05.md` · `docs/TECH_DEBT_AUDIT_2026-07-08.md` · `docs/AUDIT_2026-07-27.md` ·
`docs/VISION.md` · `docs/design/adr/0001`–`0009` · `.specs/STATE.md` ·
`.loops/{architecture-weed,threejs-dojo,threejs-dojo-coverage}/memory.md` ·
`knowledge/experiences/recaps/*` · `curriculum/BACKLOG_STATUS.md` · `git log`
