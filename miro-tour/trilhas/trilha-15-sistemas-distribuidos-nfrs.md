# 🛤️ Trilha 15 — Sistemas Distribuídos & NFRs

> **Fase do board:** F5 — Sistemas Distribuídos e NFRs (estágios 37–47) · **Duração:** 6–8 semanas · **Pré-requisito:** Trilha 14

## 🎯 Objetivo

O nível especialista: tratar requisitos não-funcionais como decisões de primeira
classe — consistência (CAP), resiliência (retry, circuit breaker, failover),
mensageria assíncrona (RabbitMQ), event-driven, observabilidade (distributed
tracing) e planejamento de capacidade. Consolida o caso de estudo completo do
e-commerce.

## 📦 Módulos

### M1 — NFRs como disciplina (0,5 semana)

- Revisitar o caso de estudo: `../05-requisitos-nfrs.md` — login, e-mail de
  confirmação, cálculo de compra, 99,9% UP, 1M usuários, < 200 ms.
- Estágio 38 do board: transformar cada NFR em decisão arquitetural rastreável
  (SLI/SLO/SLA).

**Checkpoint:** tabela NFR → SLI → componente responsável → trade-off aceito.

### M2 — Consistência de dados (1 semana)

- ⚠️ [Consistency in System Design (GeeksforGeeks)](https://www.geeksforgeeks.org/consistency-in-system-design/)
- Teorema CAP (visto na Trilha 03) aplicado: CP × AP por contexto do e-commerce
  (estoque = CP? catálogo = AP?).
- ✅ [ACID vs BASE (AWS)](https://aws.amazon.com/pt/compare/the-difference-between-acid-and-base-database/) — fechando o ciclo transacional.

**Checkpoint:** classificar 5 operações do e-commerce em strong/eventual consistency
com justificativa de negócio.

### M3 — Mensageria e assincronicidade (2 semanas)

Estágio 45 do board — assincronicidade/filas:

- ✅ [An Introduction to Asynchronous Processing and Message Queues (Medium/Hookdeck)](https://medium.com/hookdeck/an-introduction-to-asynchronous-processing-and-message-queues-218af596bf1b)
- ✅ [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials) — fazer os tutoriais 1–6 (hello world → RPC) e
  ✅ [RabbitMQ Docs](https://www.rabbitmq.com/docs) como referência.
- ⚠️ [Message Queues in System Design (GeeksforGeeks)](https://www.geeksforgeeks.org/message-queues-system-design/)
- ⚠️ [Event-Driven Architecture (GeeksforGeeks)](https://www.geeksforgeeks.org/event-driven-architecture-system-design/)

**Prática:** implementar o requisito 2 do caso de estudo — e-mail de confirmação
via fila (pedido criado → evento → consumer envia e-mail), com retry e dead-letter.

**Checkpoint:** demonstrar: matar o consumer → pedidos continuam sendo criados →
consumer volta → e-mails atrasados são processados (resiliência real).

### M4 — Resiliência e tolerância a falhas (1,5 semana)

- ✅ [Retry pattern (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) — backoff exponencial + jitter.
- ⚠️ [Circuit Breaker Pattern (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-circuit-breaker-pattern-in-microservices/) — fecha o loop do Retry Storm anti-pattern.
- ⚠️ [Failover Mechanisms (GeeksforGeeks)](https://www.geeksforgeeks.org/failover-mechanisms-in-system-design/)
- ⚠️ [Fault Tolerance in Distributed Systems (GeeksforGeeks)](https://www.geeksforgeeks.org/fault-tolerance-in-distributed-system/)
- ⚠️ [Graceful Degradation (GeeksforGeeks)](https://www.geeksforgeeks.org/graceful-degradation-in-distributed-systems/)
- ⚠️ [Zero Downtime Deployments (GeeksforGeeks)](https://www.geeksforgeeks.org/zero-downtime-deployments-in-distributed-systems/) — blue-green/rolling.
- ⚠️ [Design Patterns for High Availability (GeeksforGeeks)](https://www.geeksforgeeks.org/design-patterns-for-high-availability/)
- ⚠️ [Chaos Engineering (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-chaos-engineering/) — testar falhas de propósito.

**Checkpoint:** circuit breaker + retry com backoff no consumer de e-mails;
experimento de caos documentado (derrubar RabbitMQ e observar comportamento).

### M5 — Observabilidade e segurança arquitetural (1 semana)

- ⚠️ [Distributed Tracing in Microservices (GeeksforGeeks)](https://www.geeksforgeeks.org/distributed-tracing-in-microservices/) — correlacionar 1 requisição entre serviços (correlation ID / OpenTelemetry).
- Estágio 41: **Segurança como Requisito Arquitetural** — defense in depth,
  least privilege (IAM da Trilha 12), dados em trânsito/repouso.
- Estágio 42: **Planejamento de Capacidade** — juntar estimativa (Trilha 14) +
  monitoramento + limites (rate limiting) num plano de crescimento trimestral.

**Checkpoint:** 1 trace distribuído completo (API → fila → consumer) + plano de
capacidade com 3 marcos de crescimento.

## 🛠️ Projeto prático (capstone)

**E-commerce completo com NFRs comprovados** — o sistema construído desde a
Trilha 05 agora precisa demonstrar, com evidência executável:

| NFR (board) | Evidência exigida |
|---|---|
| Login e-mail/senha | Trilha 06 — hash + JWT |
| E-mail confirmação | Fila + consumer + dead-letter (M3) |
| Cálculo de compra | Agregado DDD testado (Trilha 13) |
| 99,9% disponível | Topologia multi-AZ + failover testado (M4) |
| 1M usuários | Estimativa + LB + cache + réplicas (Trilha 14) |
| < 200 ms | Benchmark p95 documentado (Trilha 14) |

## 🏁 Critérios de conclusão

- [ ] Tabela NFR → SLI → componente com trade-offs justificados.
- [ ] Fluxo assíncrono com retry + circuit breaker + DLQ demonstrado ao derrubar dependência.
- [ ] Trace distribuído completo atravessando fila.
- [ ] Experimento de caos executado e documentado (o que quebrou, o que segurou).
- [ ] Capstone: os 6 requisitos do board com evidência executável no repo.

## 📚 Livro

Microsserviços Prontos para Produção (Susan Fowler) — NFRs por serviço:
stability, reliability, scalability, fault tolerance...

**Fechamento:** você percorreu os 47 estágios do board. Volte ao
[`README.md`](./README.md) para os recursos contínuos e ao board original para o "Parabéns". 🎉
