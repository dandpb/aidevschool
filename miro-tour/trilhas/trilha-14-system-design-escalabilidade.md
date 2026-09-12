# 🛤️ Trilha 14 — System Design & Escalabilidade

> **Fase do board:** F5 — Escalabilidade e Performance (estágios 24–25, 43–45) · **Duração:** 6–8 semanas · **Pré-requisitos:** Trilhas 03, 05, 13

## 🎯 Objetivo

Projetar sistemas que escalam de zero a milhões de usuários: estimativa
back-of-envelope, load balancing, caching, CDNs, replicação e sharding de dados,
CQRS — a espinha dorsal do System Design de entrevistas e da vida real.
Ataca os requisitos 4–6 do e-commerce (99,9%, 1M usuários, < 200 ms).

## 📦 Módulos

### M1 — Fundamentos de escala (1 semana)

- ✅ [System Design: escalando uma arquitetura do zero a 1 milhão de usuários (vídeo do autor)](https://www.youtube.com/watch?v=9g7twJrXqoY) — visão geral em vídeo antes da leitura.
- ✅ [Scale From Zero to Millions of Users (ByteByteGo)](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) — a narrativa canônica: LB → cache → replica → sharding → CDN → multi-AZ.
- ✅ [Back-of-the-Envelope Estimation (ByteByteGo)](https://bytebytego.com/courses/system-design-interview/back-of-the-envelope-estimation) — QPS, storage, latência de referência (números de Jeffrey Dean).
- ⚠️ [System Design — Horizontal vs Vertical Scaling (GeeksforGeeks)](https://www.geeksforgeeks.org/system-design-horizontal-and-vertical-scaling/)
- ✅ [Throughput vs Latency (AWS)](https://aws.amazon.com/pt/compare/the-difference-between-throughput-and-latency/)
- ✅ [Concurrency vs Parallelism (Oxylabs)](https://oxylabs.io/blog/concurrency-vs-parallelism)
- ✅ [System Design — Performance, Capacidade e Escalabilidade (Matheus Fidelis)](https://fidelissauro.dev/performance-capacidade-escalabilidade/)

**Checkpoint:** estimar no envelope: 1M usuários, 10 req/usuário/dia → QPS médio/pico,
storage/ano, largura de banda — os números do requisito 5 do e-commerce.

### M2 — Load balancing e disponibilidade (1 semana)

- ⚠️ [How Load Balancer Works (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-load-balancer-system-design/#how-load-balancer-works) — L4 × L7, algoritmos.
- ⚠️ [What is High Availability? (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-high-availability-in-system-design/) e
  [Availability in System Design](https://www.geeksforgeeks.org/availability-in-system-design/) — os noves do 99,9% (requisito 4).
- ⚠️ [Redundancy (GeeksforGeeks)](https://www.geeksforgeeks.org/redundancy-system-design/)
- ✅ [Rate Limiting Fundamentals (ByteByteGo)](https://blog.bytebytego.com/p/rate-limiting-fundamentals) e
  [Rate Limiting pattern (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern)
- ✅ [Cloud Design Patterns — catálogo completo (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/) — índice de referência de todos os padrões de nuvem usados nesta trilha e na 15.

**Checkpoint:** calcular o downtime anual permitido por 99,9% e desenhar a
topologia LB + multi-AZ que atinge.

### M3 — Caching e CDN (1,5 semana)

- ✅ [Cache-Aside: escalabilidade e performance (vídeo do autor)](https://youtu.be/vRO0UfvsbDw)
- ✅ [Cache-Aside pattern (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- ✅ [Caching Patterns com Redis (AWS)](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)
- ✅ [Top 8 Cache Eviction Strategies (ByteByteGo)](https://bytebytego.com/guides/top-8-cache-eviction-strategies/) — LRU/LFU/FIFO...
- ✅ [Caching HTTP (MDN)](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/Caching) — cache do navegador/proxy.
- ⚠️ [What is a CDN? (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-content-delivery-networkcdn-in-system-design/) e
  ✅ [O que é uma CDN? (Cloudflare)](https://www.cloudflare.com/pt-br/learning/cdn/what-is-a-cdn/) — o board cita CDN em dois estágios (24 e 45).
- Anti-pattern do board: **No Caching** (diagrama em `../08-banco-imagens.md`).

**Prática:** cache-aside com Redis na API do e-commerce; medir p95 antes/depois
(a meta é < 200 ms do requisito 6).

### M4 — Dados em escala (1,5 semana)

- ✅ [Data Replication (ByteByteGo)](https://blog.bytebytego.com/p/data-replication-a-key-component) — master-replica, consistência eventual.
- ✅ [Database Sharding (AWS)](https://aws.amazon.com/what-is/database-sharding/) — estratégias de partição por chave.
- ✅ [CQRS Pattern (AWS Prescriptive Guidance)](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/cqrs-pattern.html) — separar leitura de escrita (estágio 44 do board).
- ⚠️ [SQL Performance Tuning (GeeksforGeeks)](https://www.geeksforgeeks.org/sql-performance-tuning/) — fecho da Trilha 03.
- Problema N+1 (`../08-banco-imagens.md`) revisitado em escala.

**Checkpoint:** desenhar a topologia de dados do e-commerce: 1 writer + N replicas,
sharding por região, projeções de leitura via CQRS.

### M5 — Anti-patterns de performance (0,5 semana)

- ✅ [Cloud Anti-patterns (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/)
- Estágio 47 do board: **Busy Database, Instanciação Imprópria, Persistência
  Monolítica, Noisy Neighbor, Retry Storm, No Caching** — um caso de detecção
  e correção para cada.

**Checkpoint:** classificar os 6 anti-patterns em camada (app/dados/rede) e
proponer a correção de cada um.

## 🛠️ Projeto prático

**E-commerce a 1M de usuários**: pegar o sistema da Trilha 13 e adicionar —
LB + ASG (Trilha 12), Redis cache-aside, CloudFront, RDS com read-replicas —
com **benchmark documentado** mostrando p95 < 200 ms num endpoint de catálogo
(exigência do caso de estudo: evidência executável, não afirmação).

## 🏁 Critérios de conclusão

- [ ] Estimativa back-of-envelope do e-commerce defendida por escrito.
- [ ] Benchmark antes/depois do cache com números reais no README.
- [ ] Diagrama de arquitetura de dados (replica + sharding + CQRS).
- [ ] Os 6 anti-patterns explicados com correção.
- [ ] Simulado de entrevista: resolver 1 problema clássico do ByteByteGo em 45 min.

## 📚 Livros

System Design Interview Vol. 1 e 2 (Alex Xu) · [ByteByteGo course](https://bytebytego.com/?fpr=renato-augusto10) ✅ (indicação do board).

**Próxima:** [Trilha 15 — Sistemas Distribuídos & NFRs](./trilha-15-sistemas-distribuidos-nfrs.md)
