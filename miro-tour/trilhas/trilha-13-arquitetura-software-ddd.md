# 🛤️ Trilha 13 — Arquitetura de Software & DDD

> **Fase do board:** F4 — Arquitetura de Software (estágios 27–36) · **Duração:** 8–10 semanas · **Pré-requisitos:** Trilhas 08–11

## 🎯 Objetivo

Fazer a transção dev → arquiteto: estilos arquiteturais (camadas, hexagonal,
monólito modular, microsserviços, serverless), Domain-Driven Design (tático e
estratégico), papéis e tipos de arquiteto, e as ferramentas de descoberta
(EventStorming, User Story Mapping, C4).

## 📦 Módulos

### M1 — O que é arquitetura + papéis (1 semana)

- Estágios 28–35 do board: **Arquitetura de Software, Níveis de Arquitetura,
  Papéis e Responsabilidades, Tipos de Arquiteto** — usar o mapa de carreira em
  `../03-carreira-arquitetura.md` (Júnior→…→Arquiteto LLD/HLD/Corporativo;
  requisitos funcionais × não funcionais).
- ✅ [Client-Server Architecture (GeeksforGeeks)](https://www.geeksforgeeks.org/client-server-architecture-system-design/) — o estilo mais básico.
- ✅ [O que são microsserviços (AWS)](https://aws.amazon.com/pt/microservices/) — visão de referência.
- ✅ (opcional) [CS50 for Business — Week 2](https://cs50.harvard.edu/business/2017/weeks/2/) — tecnologia para quem vem do lado de negócio.

**Checkpoint:** escrever seu "plano de carreira até arquiteto" mapeando quais
trilhas desta série preenchem cada gap.

### M2 — Estilos arquiteturais (2 semanas)

- ✅ [Microservices (Martin Fowler)](https://martinfowler.com/articles/microservices.html) — o artigo canônico de Lewis & Fowler.
- ✅ [Portal de microservices (Martin Fowler)](https://martinfowler.com/microservices/)
- ⚠️ [Arquitetura de microsserviços (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices) — guia de estilos do Azure Architecture Center.
- ⚠️ [Microsserviços (GeeksforGeeks)](https://www.geeksforgeeks.org/microservices/) e
  [arquitetura Peer-to-Peer (GeeksforGeeks)](https://www.geeksforgeeks.org/peer-to-peer-p2p-architecture/#what-is-a-peertopeer-p2p-architecture) — estilos adicionais.
- ✅ [Serverless Architecture (Datadog)](https://www.datadoghq.com/knowledge-center/serverless-architecture/) e
  ⚠️ [Serverless Architectures (GeeksforGeeks)](https://www.geeksforgeeks.org/serverless-architectures/)
- Tópicos do board: **Arquitetura em Camadas** (aplicação→domínio→infra),
  **Arquitetura Hexagonal** (ports & adapters), **Monólito Modular** (módulos
  bem separados que podem virar serviços depois).
- ✅ [Microsserviços: a maior armadilha da arquitetura moderna × DDD](https://youtu.be/JXeJUfBCg4U) — o vídeo-chave do autor: DDD antes de quebrar em serviços.

**Checkpoint:** desenhar o mesmo sistema (e-commerce) em 4 estilos — camadas,
hexagonal, monólito modular, microsserviços — listando prós/contras de cada.

### M3 — DDD: modelagem estratégica (2 semanas)

- ✅ [DDD Starter Modelling Process (GitHub — RenatoAugustoFS)](https://github.com/RenatoAugustoFS/ddd-starter-modelling-process) — processo de modelagem passo a passo do autor do board.
- Tópicos do board: **Linguagem Ubíqua**, Bounded Contexts, Context Mapping.
- ✅ [EventStorming](https://www.eventstorming.com/) — descoberta de domínio com eventos.
- Ferramentas do board (estágio 36): EventStorming · **The Business Model Canvas** ·
  **User Story Mapping** · **Domain Storytelling** — praticar 1 workshop de cada
  (mesmo sozinho, com quadro branco/Miro).

**Checkpoint:** EventStorming do e-commerce → identificar 3+ bounded contexts
(catálogo, checkout, pagamento) e o mapa de contexto entre eles.

### M4 — DDD: modelagem tática (2 semanas)

- Blocos do board (ver `../03-carreira-arquitetura.md`): Entity, Value Object,
  Aggregate, Domain Service, Domain Event, Repository, Factory.
- Prática: implementar o agregado `Pedido` com entidades, value objects
  (Dinheiro, CPF), eventos de domínio (PedidoCriado) e repositório — usando a
  suíte de testes da Trilha 11 como rede de proteção.

**Checkpoint:** código do agregado com invariantes protegidas (não é possível
criar pedido sem itens; total recalculado por evento) + testes provando.

### M5 — Documentando arquitetura (1 semana)

- Seguir **Simon Brown / C4 Model** (influenciador do board): Contexto →
  Container → Componente → Código.
- Redigir ADRs (Architecture Decision Records) para 3 decisões do e-commerce
  (ex.: "monólito modular primeiro", "PostgreSQL", "mensageria para e-mails").

**Checkpoint:** 1 diagrama C4 de container + 3 ADRs no repo.

## 🛠️ Projeto prático

**EventStorming → código**: do workshop do M3 sair o monólito modular do
e-commerce com 3 módulos de domínio (catálogo, checkout, notificação), hexagonal
por dentro, testado e documentado em C4 + ADRs.

## 🏁 Critérios de conclusão

- [ ] EventStorming fotografado/documentado com bounded contexts identificados.
- [ ] Monólito modular com 3 módulos, agregados com invariantes testadas.
- [ ] Diagrama C4 (nível container) + 3 ADRs.
- [ ] Explicar LLD × HLD × arquiteto corporativo com entregável típico de cada.
- [ ] Responder: "quando NÃO usar microsserviços?" citando o trade-off principal.

## 📚 Livros

Fundamentos de Arquitetura de Software (Richards & Ford) · Clean Architecture /
Arquitetura Limpa (Uncle Bob) · Dominando DDD (Vernon).

**Próxima:** [Trilha 14 — System Design & Escalabilidade](./trilha-14-system-design-escalabilidade.md)
