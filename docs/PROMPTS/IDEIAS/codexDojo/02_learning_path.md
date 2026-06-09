# Trilha de Aprendizagem e Catálogo de Projetos

> Documento vivo — evolui junto com o ecossistema MiniMax Agent Team.
> Última atualização: 2026-06-03

---

## Parte 1: Princípios de Aprendizagem

A **aidevschool** não é um curso tradicional. É um ecossistema de agentes de IA (rodando continuamente em **OpenClaw** e **Hermes**) que ensina engenharia de software através da **implementação poliglota hands-on**. Os seguintes princípios guiam toda a jornada:

### 1.1 Complexidade Progressiva

Cada projeto é construído sobre o conhecimento dos anteriores. Você não pula etapas — você **cresce** em cima do que já aprendeu.

- **Níveis 1–2**: fundamentos sólidos (estruturas de dados, concorrência, I/O)
- **Níveis 3–4**: padrões de arquitetura e distribuição
- **Níveis 5–6**: sistemas complexos do mundo real

A ideia é a mesma de uma **escada**: cada degrau é alcançável com o que você já domina, mas te leva a um lugar mais alto.

### 1.2 Aprendizagem Comparativa

O **mesmo problema** é resolvido em **linguagens diferentes** (Go, Rust, Node.js/TypeScript). Isso revela algo que nenhum curso tradicional consegue:

- Por que **Go** usa goroutines enquanto **Rust** usa `async/await` + ownership?
- Por que **Node.js** brilha em I/O mas sofre com CPU-bound?
- Por que **Rust** garante segurança de memória em tempo de compilação?

Você não aprende *uma* linguagem — você aprende **o que cada paradigma oferece e quando usá-los**.

### 1.3 Compreensão Guiada por Métricas

Números não mentem. Cada projeto é **benchmarkado** com critérios objetivos:

| Métrica                | O que revela                              |
|------------------------|-------------------------------------------|
| Latência (p50, p95, p99) | Comportamento sob carga típica e cauda    |
| Throughput (req/s)     | Capacidade real de processamento          |
| Uso de memória (RSS)   | Eficiência de alocação                    |
| CPU utilization        | Aproveitamento de recursos                |
| Tamanho do binário     | Custo de deploy e distribuição            |
| Tempo de compilação    | Velocidade do ciclo de desenvolvimento    |
| Linhas de código (LoC) | Complexidade e expressividade da linguagem |

Comparar **Rate Limiter em Go vs Rust vs Node.js** com as mesmas métricas é mais educativo do que ler 10 artigos sobre o tema.

### 1.4 Melhoria Iterativa

Nenhum projeto está **"pronto"**. Todo sistema na aidevschool passa por ciclos contínuos:

```
v0.1 (MVP funcional)
   ↓ feedback dos agentes + benchmarks
v0.2 (otimização, refatoração, testes)
   ↓ novos requisitos + edge cases descobertos
v0.3 (features avançadas, observabilidade)
   ↓ ... e assim por diante, indefinidamente
```

O software é um **organismo vivo**, não uma foto estática.

### 1.5 Aprendizagem Assistida por IA

Os agentes não **substituem** o aprendizado — eles o **amplificam**. O modelo pedagógico é:

- **Agente gera spec** → você aprende a ler e questionar requisitos
- **Agente implementa código** → você aprende lendo código de qualidade de produção
- **Agente revisa código** → você aprende habilidades de code review
- **Agente faz benchmark** → você aprende a interpretar métricas
- **Agente otimiza** → você aprende padrões de escalabilidade
- **Agente te questiona** → você **ref força ativamente** o conhecimento

> **A IA é o professor paciente que está sempre disponível. Você é o engenheiro que decide o que aprofundar.**

---

## Parte 2: Trilha de Aprendizagem (Learning Path)

A trilha está organizada em **6 níveis de complexidade crescente**, totalizando **18 projetos** (3 por nível). Cada projeto pode ser implementado em **uma ou mais linguagens** (Go, Rust, Node.js/TypeScript), conforme a matriz da Parte 4.

### Nível 1: Fundamentos

**Foco**: estruturas de dados básicas, servidores HTTP, tratamento de erros.

Conceitos trabalhados: tipos primitivos, mapas, slices, JSON, funções puras, I/O básico.

#### 📘 Projeto 01: Rate Limiter (Token Bucket)

- **Descrição**: implementa o algoritmo **Token Bucket** para limitar requisições por cliente/endpoint.
- **Aprenda**: primitivas de concorrência, algoritmos baseados em tempo, refil atômico, estado compartilhado.
- **Desafio extra**: variantes leaky bucket, sliding window, distributed rate limiting.

#### 📘 Projeto 02: Key-Value Store (in-memory)

- **Descrição**: um pequeno banco de dados chave-valor em memória, com API CRUD via TCP/HTTP.
- **Aprenda**: estruturas de dados (hash maps, listas), APIs REST, noções de persistência (snapshot/RDB), serialização.
- **Desafio extra**: expiração por TTL, transações simples, linguagem de comandos própria (SET, GET, DEL, EXPIRE).

#### 📘 Projeto 03: URL Shortener

- **Descrição**: encurta URLs longas em códigos curtos, com redirecionamento e contagem de acessos.
- **Aprenda**: hashing (base62, SHA-256 truncado), design de banco de dados relacional, redirects HTTP (301/302), IDs únicos.
- **Desafio extra**: analytics em tempo real, custom aliases, detecção de abuso.

---

### Nível 2: Concorrência e Performance

**Foco**: padrões de concorrência, I/O assíncrono, segurança de thread.

Conceitos trabalhados: goroutines, channels, mutexes, futures, streams, event loops.

#### 📘 Projeto 04: Concurrent Task Queue

- **Descrição**: fila de tarefas processada por **worker pools** com retry e dead-letter.
- **Aprenda**: worker pools, agendamento de jobs, backpressure, prioridades, timeouts.
- **Desafio extra**: persistência de jobs, execução agendada (delayed jobs), rate limit por job.

#### 📘 Projeto 05: WebSocket Chat Server

- **Descrição**: servidor de chat em tempo real com múltiplas salas e broadcasting.
- **Aprenda**: protocolos em tempo real (WebSocket, SSE), gerenciamento de conexões, fan-out, presença.
- **Desafio extra**: mensagens privadas, histórico, indicadores de digitação, escalabilidade horizontal.

#### 📘 Projeto 06: File Upload/Processing Pipeline

- **Descrição**: API de upload que processa arquivos em chunks (ex.: thumbnails, hash, validação).
- **Aprenda**: streaming, processamento em chunks, gerenciamento de memória, upload multipart, pipelines.
- **Desafio extra**: processamento paralelo por arquivo, integração com S3-compatível, antivírus simulado.

---

### Nível 3: Arquitetura e Design Patterns

**Foco**: Clean Architecture, design patterns, separação de responsabilidades.

Conceitos trabalhados: camadas, injeção de dependência, repositórios, casos de uso, eventos.

#### 📘 Projeto 07: REST API with Auth

- **Descrição**: API REST completa com autenticação JWT, RBAC, validação e versionamento.
- **Aprenda**: JWT (sign/verify), middleware, arquitetura em camadas, dependency injection, validação de input.
- **Desafio extra**: refresh tokens, OAuth2 client credentials, audit log, multi-tenancy.

#### 📘 Projeto 08: Event-Driven Order System

- **Descrição**: sistema de pedidos orientado a eventos, com **pub/sub** e **event sourcing**.
- **Aprenda**: pub/sub, event sourcing, consistência eventual, projeções, sagas.
- **Desafio extra**: replay de eventos, snapshots, versionamento de schema de eventos.

#### 📘 Projeto 09: Plugin System

- **Descrição**: sistema extensível onde plugins são carregados dinamicamente (WASM, FFI ou JS).
- **Aprenda**: extensibilidade, interfaces, dynamic loading, isolamento de plugins, ciclo de vida de plugins.
- **Desafio extra**: marketplace de plugins, sandboxing, versionamento de APIs de plugins.

---

### Nível 4: Escalabilidade e Distribuição

**Foco**: sistemas distribuídos, caching, balanceamento de carga.

Conceitos trabalhados: particionamento, replicação, consenso,选举, vector clocks.

#### 📘 Projeto 10: Distributed Cache

- **Descrição**: cache distribuído com invalidação, TTL e eviction LRU/LFU.
- **Aprenda**: invalidação de cache, TTL, LRU/LFU eviction, consistência eventual, gossip protocol.
- **Desafio extra**: sharding consistente, cache-aside vs write-through, cache stampede prevention.

#### 📘 Projeto 11: Load Balancer

- **Descrição**: reverse proxy com health checks e algoritmos de balanceamento.
- **Aprenda**: reverse proxy, health checks, round-robin, least-connections, consistent hashing.
- **Desafio extra**: TLS termination, rate limit por backend, circuit breaker por backend, sticky sessions.

#### 📘 Projeto 12: Distributed Job Scheduler

- **Descrição**: agendador de tarefas distribuído com leader election e locks.
- **Aprenda**: leader election (Raft simplificado), distributed locks (Redis-like), cron-like scheduling, fault tolerance.
- **Desafio extra**: sharding de jobs, prioridade, dependências entre jobs, retry exponencial.

---

### Nível 5: Resiliência e Observabilidade

**Foco**: circuit breakers, retries, logging estruturado, métricas.

Conceitos trabalhados: SRE, golden signals, tracing distribuído, chaos engineering.

#### 📘 Projeto 13: API Gateway with Circuit Breaker

- **Descrição**: gateway com circuit breaker, retry, fallback e bulkheading por rota.
- **Aprenda**: fault tolerance, fallbacks, bulkheading, retry com backoff exponencial, jitter.
- **Desafio extra**: rate limit por tenant, request coalescing, adaptive concurrency limits.

#### 📘 Projeto 14: Log Aggregator

- **Descrição**: agregador de logs estruturados (JSON) com filtros, busca e retenção.
- **Aprenda**: structured logging, log levels, pipelines de agregação, compressão, indexação.
- **Desafio extra**: tracing distribuído (OpenTelemetry-like), correlação de logs, alerting baseado em logs.

#### 📘 Projeto 15: Metrics Collector & Dashboard

- **Descrição**: coletor de métricas (counters, gauges, histograms) com agregação e visualização.
- **Aprenda**: time-series data, agregação (sum, avg, p95), visualização, retenção, downsampling.
- **Desafio extra**: alertas baseados em thresholds, anomalia detection, integração com Prometheus-like format.

---

### Nível 6: Sistemas Complexos

**Foco**: sistemas distribuídos complexos, padrões do mundo real.

Conceitos trabalhados: particionamento, replicação, consistência, durability, ranking.

#### 📘 Projeto 16: Mini Message Queue (like Kafka)

- **Descrição**: message queue com topics, partitions, consumer groups e offsets.
- **Aprenda**: topics, partitions, consumer groups, offsets, log-structured storage, replication.
- **Desafio extra**: exactly-once semantics, transações entre partitions, compactação de logs.

#### 📘 Projeto 17: Distributed Configuration Service

- **Descrição**: serviço de configuração distribuído com watch/notify, versionamento e consenso.
- **Aprenda**: consenso (Raft/Paxos simplificado), watch/notify, versionamento, linearizability.
- **Desafio extra**: ACL por chave, auditoria, rollback, multi-region replication.

#### 📘 Projeto 18: Search Engine

- **Descrição**: mecanismo de busca com indexação, tokenização e ranking.
- **Aprenda**: inverted indexes, tokenização, TF-IDF/BM25, ranking algorithms, query parsing.
- **Desafio extra**: fuzzy search, autocomplete, indexação incremental, persistência do índice.

---

## Parte 3: Matriz de Conceitos por Projeto

A tabela abaixo mapeia cada projeto às **6 dimensões de aprendizagem** da engenharia de software moderna:

| Projeto | Concorrência | Networking | Persistência | Arquitetura | Escalabilidade | Resiliência |
|---------|:------------:|:----------:|:------------:|:-----------:|:--------------:|:-----------:|
| 01. Rate Limiter            | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 02. Key-Value Store         | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 03. URL Shortener           | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 04. Concurrent Task Queue   | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| 05. WebSocket Chat Server   | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| 06. File Upload Pipeline    | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 07. REST API with Auth      | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 08. Event-Driven Order Sys. | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 09. Plugin System           | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 10. Distributed Cache       | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11. Load Balancer           | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| 12. Distributed Job Sched.  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13. API Gateway + CB        | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| 14. Log Aggregator          | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 15. Metrics Collector       | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 16. Mini Message Queue      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17. Distributed Config Svc  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 18. Search Engine           | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |

### Legenda

- **Concorrência**: goroutines, threads, async/await, channels, actors, locks
- **Networking**: HTTP, TCP/UDP, WebSocket, gRPC, DNS
- **Persistência**: arquivos, bancos SQL/NoSQL, WAL, snapshots, indexação
- **Arquitetura**: camadas, padrões (Repository, Strategy, Observer), Clean/Hexagonal
- **Escalabilidade**: sharding, replicação, load balancing, horizontal scaling
- **Resiliência**: retries, circuit breakers, fallbacks, health checks, chaos testing

> **Observação**: o Projeto 08 (Event-Driven Order System) e o 16 (Mini Message Queue) são os que tocam mais dimensões simultaneamente — por isso são recomendados como projetos-âncora do Nível 3 e Nível 6, respectivamente.

---

## Parte 4: Melhor Caso de Uso por Linguagem

Cada linguagem tem um **perfil de forças e fraquezas**. Conhecer esse perfil é tão importante quanto saber a sintaxe.

### 🐹 Go

**Ideal para**: microsserviços, APIs, CLI tools, networking, processamento concorrente.

**Pontos fortes**:
- ⚡ Compilação extremamente rápida
- 🧵 Concorrência **built-in** (goroutines + channels)
- 📦 Binários pequenos e estáticos (fáceis de distribuir)
- 📚 Standard library excelente (net/http, encoding/json, sync)
- 👀 Código idiomático é fácil de ler e revisar

**Pontos fracos**:
- 😐 Verbosidade no tratamento de erros (`if err != nil`)
- 🐌 GC pode causar pausas (apesar de otimizado)
- 🆘 Generics só foram adicionados recentemente (1.18+)
- 🧩 Ecossistema web menos maduro que Node.js

**Projetos ideais na trilha**: 01, 04, 05, 07, 10, 11, 13

> **Regra de ouro**: se for uma **API de rede** ou **ferramenta de infra**, Go é provavelmente a melhor escolha.

---

### 🦀 Rust

**Ideal para**: programação de sistemas, performance crítica, sistemas concorrentes memory-safe.

**Pontos fortes**:
- 🛡️ **Segurança de memória garantida em tempo de compilação** (sem GC)
- ⚡ Performance comparável a C/C++
- 🧠 Sistema de ownership/borrowing que **força** bom design
- 🔥 "Fearless concurrency" — data races são impossíveis em código seguro
- 🧰 Cargo: melhor gerenciador de dependências do mercado

**Pontos fracos**:
- 📈 Curva de aprendizado **íngreme** (borrow checker!)
- ⏱️ Tempos de compilação longos
- 🌐 Ecossistema web ainda em maturação (Actix/Axum são ótimos, mas menos maduros)
- 📚 Documentação de crates varia muito em qualidade

**Projetos ideais na trilha**: 01, 02, 06, 10, 16, 18

> **Regra de ouro**: se **performance** e **segurança** são não-negociáveis, ou se é um sistema de **infraestrutura crítica** (storage, queue, engine), Rust brilha.

---

### 🟢 Node.js / TypeScript

**Ideal para**: aplicações real-time, APIs, full-stack, prototipagem rápida, workloads I/O-heavy.

**Pontos fortes**:
- 🚀 **Async por padrão** (event loop, promises, async/await)
- 📦 Maior ecossistema do mundo (npm: 2M+ de pacotes)
- 📝 **TypeScript** adiciona tipos estáticos ao JavaScript
- 🔄 JSON é nativo (sem serialização)
- 🌍 Full-stack com Next.js / NestJS / Fastify
- 🔥 Hot reload e ciclos de feedback rápidos

**Pontos fracos**:
- 🧵 **Single-threaded** (CPU-bound trava tudo)
- 💾 Uso de memória tipicamente mais alto
- ⏸️ GC pauses podem ser significativos em hot paths
- 😵 Callback hell e complexidade de error handling em código antigo
- 🐢 Performance bruta menor que Go/Rust em CPU-bound

**Projetos ideais na trilha**: 05, 07, 08, 09, 14, 15

> **Regra de ouro**: se é **I/O-heavy** (chat, dashboard, gateway, agregação), Node.js entrega em dias o que levaria semanas em outras stacks.

---

### 📊 Resumo Comparativo

| Critério              | Go          | Rust         | Node.js/TS        |
|-----------------------|-------------|--------------|-------------------|
| Velocidade de compile | ⚡⚡⚡⚡⚡       | ⚡⚡           | ⚡⚡⚡⚡⚡ (interpretação) |
| Performance runtime   | ⚡⚡⚡⚡       | ⚡⚡⚡⚡⚡       | ⚡⚡                |
| Concorrência          | ⚡⚡⚡⚡       | ⚡⚡⚡⚡⚡       | ⚡⚡⚡ (event loop)   |
| Segurança de memória  | ⚡⚡⚡ (GC)    | ⚡⚡⚡⚡⚡ (compile) | ⚡⚡ (GC)          |
| Ecossistema web       | ⚡⚡⚡⚡       | ⚡⚡⚡         | ⚡⚡⚡⚡⚡            |
| Curva de aprendizado  | ⚡⚡⚡⚡       | ⚡⚡           | ⚡⚡⚡⚡             |
| Velocidade de prototipagem | ⚡⚡⚡⚡   | ⚡⚡           | ⚡⚡⚡⚡⚡            |
| Tamanho do binário    | ⚡⚡⚡⚡⚡      | ⚡⚡⚡⚡        | N/A (runtime)      |

---

## Parte 5: Integração com IA no Processo de Aprendizagem

A IA não é um atalho — é um **amplificador cognitivo**. Os agentes da aidevschool (rodando em **OpenClaw** e **Hermes**) seguem um fluxo pedagógico em 6 etapas, cada uma desenhada para ativar uma **habilidade diferente** no engenheiro humano.

### 5.1 Agente Gera Spec → Você Aprende a Ler Requisitos

O agente produz uma **especificação técnica** detalhada: requisitos funcionais, não-funcionais, casos de uso, critérios de aceitação, edge cases.

**O que você aprende**:
- Decompor problemas vagos em requisitos claros
- Identificar ambiguidades e fazer as perguntas certas
- Avaliar trade-offs antes de codificar
- Pensar em **comportamento observável**, não em implementação

> **Habilidade treinada**: *requirements engineering* e *critical reading*.

### 5.2 Agente Implementa Código → Você Aprende Lendo Produção

O agente entrega uma **implementação completa, testada e documentada**. Seu trabalho é **ler, entender e questionar**.

**O que você aprende**:
- Idiomas da linguagem (Go: error wrapping, defer; Rust: lifetimes, traits; TS: discriminated unions)
- Padrões de design aplicados em contexto real
- Estruturação de projetos (package layout, module boundaries)
- Boas práticas que só se aprendem vendo produção

> **Habilidade treinada**: *code comprehension* e *pattern recognition*.

### 5.3 Agente Revisa Código → Você Aprende Code Review

O agente revisa seu código (ou código de outros) com o mesmo rigor de um senior engineer: identifica bugs, sugere simplificações, aponta problemas de performance, questiona naming.

**O que você aprende**:
- Identificar code smells (long functions, deep nesting, god objects)
- Pensar em **legibilidade e manutenibilidade** como cidadãos de primeira classe
- Dar e receber feedback técnico com objetividade
- Equilibrar pragmatismo e pureza

> **Habilidade treinada**: *code review* e *quality judgment*.

### 5.4 Agente Faz Benchmark → Você Aprende a Interpretar Métricas

O agente executa benchmarks padronizados (wrk, k6, hyperfine, criterion) e gera relatórios comparativos.

**O que você aprende**:
- Diferença entre **throughput** e **latência**
- Por que **p99** importa mais que **média**
- Como variações de alocação de memória explicam diferenças de performance
- A separar **otimizações reais** de **otimizações placebo**

> **Habilidade treinada**: *performance analysis* e *data-driven thinking*.

### 5.5 Agente Otimiza → Você Aprende Padrões de Escalabilidade

O agente identifica gargalos (profiling, tracing) e propõe otimizações: caching, sharding, batching, connection pooling, async pipelines.

**O que você aprende**:
- Onde estão os **gargalos clássicos** (CPU, I/O, lock contention, GC)
- Padrões que escalam (read replicas, CQRS, event sourcing)
- Por que **complexidade prematura** é o pecado capital
- A arte de **medir antes de otimizar**

> **Habilidade treinada**: *scalability design* e *systems thinking*.

### 5.6 Agente Te Questiona → Você Reforça Conhecimento Ativamente

O agente faz **perguntas socráticas** sobre o sistema: "Por que você escolheu X em vez de Y?", "O que acontece se o disco encher?", "Como você testaria isso?"

**O que você aprende**:
- Raciocínio defensivo (pensar em falhas)
- Trade-offs explícitos (consistência vs disponibilidade, latência vs throughput)
- Comunicação técnica clara e concisa
- A diferença entre **saber a resposta** e **saber explicar a resposta**

> **Habilidade treinada**: *articulação técnica* e *self-explanation* (a forma mais poderosa de aprendizado ativo, comprovada por pesquisa em ciência da aprendizagem).

---

### O Ciclo Pedagógico

```
   ┌─────────────────────────────────────────────┐
   │                                             │
   ▼                                             │
 [Spec] ──▶ [Implement] ──▶ [Review] ──▶ [Benchmark] ──▶ [Optimize] ──▶ [Quiz]
   │                                                                     │
   └─────────────────────────────────────────────────────────────────────┘
              (cada volta aprofunda compreensão e adiciona novos requisitos)
```

> **Lembre-se**: o objetivo não é ter 18 projetos "prontos". É ter passado por **18 ciclos de aprendizado profundo**, cada um deixando você mais capaz de projetar, implementar e operar sistemas reais.

---

## Anexo: Resumo Visual da Trilha

```
Nível 1 ─ Fundamentos          [01] [02] [03]
Nível 2 ─ Concorrência         [04] [05] [06]
Nível 3 ─ Arquitetura          [07] [08] [09]
Nível 4 ─ Escalabilidade       [10] [11] [12]
Nível 5 ─ Resiliência          [13] [14] [15]
Nível 6 ─ Sistemas Complexos   [16] [17] [18]
```

**Total**: 18 projetos × 3 linguagens (no máximo) = até **54 implementações comparativas**, cada uma evoluindo continuamente.

---

*"Não é sobre chegar ao fim. É sobre se tornar o tipo de engenheiro que gosta do caminho."*
