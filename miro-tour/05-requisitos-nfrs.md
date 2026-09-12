# 📌 Requisitos Não-Funcionais (Caso de Estudo)

**Seção:** 6 post-its amarelos no board, na fase de Arquitetura de Software

> O board inclui um caso de estudo real: o **autor de um sistema de e-commerce**
> compartilha os 6 requisitos não-funcionais principais do projeto, que servem
> como exemplo prático para aplicar os conceitos aprendidos na trilha.

## 🎯 Os 6 Requisitos

Estes são os requisitos não-funcionais do sistema de e-commerce do exemplo:

### 1. O sistema deve permitir que o usuário faça login com e-mail e senha.
   - **Categoria:** 🔐 Segurança/Autenticação
   - **Contexto:** Requisito de segurança e experiência do usuário (UX).

### 2. O sistema deve enviar um e-mail de confirmação após o cadastro do usuário.
   - **Categoria:** 📧 Confirmação/Comunicação
   - **Contexto:** Requisito de fluxo de cadastro e integração com serviços de e-mail.

### 3. O sistema deve calcular o total da compra com frete, descontos e impostos.
   - **Categoria:** 💰 Cálculo/Regras de Negócio
   - **Contexto:** Requisito funcional complexo com regras de cálculo e integrações externas.

### 4. O sistema deve estar disponível 99,9% do tempo (alta disponibilidade).
   - **Categoria:** ⏱️ Disponibilidade (SLA)
   - **Contexto:** Requisito de disponibilidade (HA) — equivale a ~8.77h de downtime/ano.

### 5. O sistema deve suportar 1 milhão de usuários simultâneos (escalabilidade).
   - **Categoria:** 📈 Escalabilidade (Throughput)
   - **Contexto:** Requisito de capacidade — exige arquitetura distribuída e load balancing.

### 6. As requisições devem ser respondidas em até 200ms (performance).
   - **Categoria:** ⚡ Latência (Performance)
   - **Contexto:** Requisito de latência — exige caching, otimização de queries, CDN.

## 🗺️ Mapeamento: Requisito → Tópico da Trilha

Cada requisito acima está diretamente relacionado a tópicos da roadmap:

- **Login e-mail/senha** → Segurança, Autenticação e autorização (Fase 3)
- **E-mail de confirmação** → Integrações, Filas assíncronas, RabbitMQ (Fase 3/4)
- **Cálculo de compra** → Regras de Negócio, Domain Service (Fase 5)
- **Disponibilidade 99,9%** → Disponibilidade (HA), Replicação, Failover (Fase 5)
- **1M usuários simultâneos** → Escalabilidade, Load Balancing, Cache, Sharding (Fase 5)
- **Latência < 200ms** → Performance, CDN, Caching, Otimização SQL (Fase 4/5)

## 💡 Por que isso importa?

Este caso de estudo serve como **exercício mental**: ao longo da trilha, volte
neste arquivo e pergunte-se:

1. **Qual o SLA** do sistema que estou projetando? (Disponibilidade)
2. **Quantos usuários** simultâneos preciso suportar? (Throughput/Capacidade)
3. **Qual a latência aceitável**? (Performance)
4. **Como escalar horizontalmente**? (Elasticidade)
5. **Como garantir consistência** dos dados? (ACID vs BASE)
6. **Como proteger** contra falhas? (Resiliência, Chaos Engineering)

Respostas sólidas para essas perguntas são o que separam um dev de um arquiteto.