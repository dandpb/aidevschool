# 🏛️ Carreira & Arquitetura de Software

**Seção:** Centro-inferior do board, com a trilha de carreira, tipos de arquiteto, e conceitos de DDD

> A progressão de carreira em tech, os diferentes tipos de arquiteto, e os conceitos
> fundamentais de Domain-Driven Design (DDD).

## 🎯 Trilha de Carreira em Tech

A progressão visualizada no board (com ícones de troféu e corredor):

```
🏆 Programador (Complexo)
  ↓
🧑‍💻 Programador Júnior
  ↓
🧑‍💻 Programador Pleno
  ↓
🧑‍💻 Programador Sênior
  ↓
👨‍💻 Tech Lead
  ↓
⚙️ Engenharia
  ↓
🏛️ Arquiteto de Software | LLD (Low-Level Design)
  ↓
🏛️ Arquiteto de Soluções | HLD (High-Level Design)
  ↓
🌐 Arquiteto Corporativo
```

Diferenças-chave entre os papéis:

| Papel | Foco | Saída típica |
|---|---|---|
| **Programador Júnior** | Aprender, executar tarefas pequenas | Código funcional simples |
| **Programador Pleno** | Autonomia em features, mentoring | Features completas |
| **Programador Sênior** | Decisões técnicas, arquitetura de features | Features bem arquitetadas |
| **Tech Lead** | Decisões técnicas + liderança técnica | Sistemas, padrões técnicos |
| **Engenharia** | Processos, padrões organizacionais | Frameworks internos, governança |
| **Arquiteto de Software (LLD)** | Design detalhado de sistemas | Diagramas de classes, componentes |
| **Arquiteto de Soluções (HLD)** | Soluções para problemas de negócio | Diagramas de sistemas, integrações |
| **Arquiteto Corporativo** | Estratégia tecnológica da empresa | Padrões, políticas, roadmap tech |

## 🏛️ Tópicos de Arquitetura

Os 12 capítulos da fase de arquitetura:

1. Arquitetura de Software
2. Níveis de Arquitetura
3. Tipos de Arquiteto
4. Papéis e Responsabilidades
5. Domain Driven Design
6. Modelagem Estratégica
7. Modelagem Tática
8. Arquitetura em Camadas
9. Monolito modular
10. Requisitos Não Funcionais (NFRs)
11. Planejamento de Capacidade
12. Escalabilidade e Performance
13. Consistência
14. Disponibilidade (HA)
15. Segurança como Requisito Arquitetural
16. Sistemas distribuídos e Padrões Arquiteturais

## 🎯 Conceitos de Domain-Driven Design (DDD)

Os blocos fundamentais do DDD aparecem no board como sub-tópicos da Modelagem Tática e Estratégica:

### 🧩 Building Blocks (Blocos Táticos)

1. **Linguagem Ubíqua** — Vocabulário comum entre devs e experts de domínio
2. **Entity** — Objetos com identidade única (ID) que persiste ao longo do tempo
3. **Value Object** — Objetos imutáveis definidos apenas pelos seus valores
4. **Bounded Contexts** — Limites explícitos onde um modelo de domínio se aplica
5. **Aggregate Root** — Entidade raiz que controla um grupo de objetos correlacionados
6. **Repository** — Abstração para persistir e recuperar aggregates
7. **Domain Service** — Lógica de domínio que não pertence a uma entity específica
8. **Factory** — Encapsula a criação complexa de objetos

### 🗺️ Modelagem Estratégica

1. **Context Map** — Mapeamento dos relacionamentos entre Bounded Contexts
2. **Domínio e Subdomínios** — Core Domain, Supporting Subdomain, Generic Subdomain
3. **EventStorming** — Workshop colaborativo para descobrir o domínio
4. **User Story Mapping** — Técnica para mapear jornadas e features
5. **Domain Storytelling** — Narrativa visual dos processos de domínio

## 🏗️ Arquitetura de Aplicação

Estilos arquiteturais cobertos:

1. Arquitetura em Camadas (Layered)
2. Arquitetura Hexagonal (Ports & Adapters)
3. Onion Architecture
4. Monolito Modular
5. Arquitetura de Microsserviços
6. Arquitetura Orientada a Eventos (EDA)
7. Arquitetura Serverless
8. Arquitetura Corporativa (múltiplos sistemas)
