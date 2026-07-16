# codexDojo OS — plano inicial

## Visão

O codexDojo OS é um ecossistema de ensino de computação com IA apresentado como um desktop Linux no navegador. O sistema não separa “curso” e “projeto”: o aluno aprende ao operar, investigar e construir os próprios aplicativos. Cada ação relevante pode revelar o fundamento usado, propor uma pergunta e registrar uma evidência de domínio.

O objetivo de longo prazo é oferecer dezenas de aplicativos funcionais. O objetivo inicial é validar o contrato que permite criá-los com consistência, segurança e valor pedagógico.

## Estado da integração com o ecossistema

O shell é o bounded context canônico da experiência de desktop. Ele recebe um snapshot tipado e
somente leitura gerado por `python3 -m learner.substrate`, a partir da mesma verdade usada pelo
dashboard. Estado de janela, catálogo, missões, Terminal e Mentor continua local: nenhuma interação
React grava `learner/learning_state.yaml` ou promove domínio. Evidência executável e verificação
isolada permanecem contratos futuros para cada laboratório.

## Princípios do produto

1. **Aprender fazendo:** toda unidade termina em uma ação observável dentro de um app.
2. **Explicar o que está por trás:** o Modo Aprender relaciona interface, código e fundamento.
3. **Progresso por domínio:** XP motiva, mas o desbloqueio exige evidência.
4. **IA com contexto e limites:** o mentor conhece a tela, o objetivo e os erros, mas não substitui a tentativa do aluno.
5. **Apps reais em pequenos cortes:** cada ciclo entrega um fluxo completo, não uma coleção de telas vazias.
6. **Arquitetura instrumentada:** ações geram eventos pedagógicos desde a primeira versão.

## Arquitetura proposta

```text
Experience Shell
  ├─ Desktop / Window Manager / Navigation / Accessibility
  ├─ App SDK
  │    ├─ AppManifest
  │    ├─ Capability API
  │    ├─ Storage API
  │    └─ Event API
  ├─ Learning Engine
  │    ├─ Curriculum graph
  │    ├─ Mastery model
  │    ├─ Missions / XP / streaks
  │    └─ Evidence store
  ├─ AI Mentor Gateway
  │    ├─ Context builder
  │    ├─ Guardrails / tools
  │    ├─ Prompt and model adapters
  │    └─ Evaluation / telemetry
  └─ Web Runtime
       ├─ Process simulation
       ├─ Virtual filesystem
       ├─ Event bus
       └─ Persistence / sync
```

### Contratos centrais

```ts
type AppManifest = {
  id: string
  version: string
  capabilities: string[]
  learningObjectives: string[]
}

type LearningEvent = {
  learnerId: string
  appId: string
  action: string
  conceptIds: string[]
  evidence?: unknown
  timestamp: string
}

type MentorContext = {
  currentApp: string
  currentMission?: string
  visibleState: unknown
  recentAttempts: unknown[]
  allowedTools: string[]
}
```

Esses contratos evitam que cada app implemente janela, persistência, progresso, segurança e IA de formas incompatíveis.

## Modelo pedagógico

O currículo é um grafo, não uma lista rígida. Cada conceito possui pré-requisitos, explicações, experiências práticas e critérios de domínio.

```text
Fundamento → observação guiada → prática → desafio → evidência → revisão espaçada
```

Uma atividade deve declarar:

- objetivo observável;
- fundamentos praticados;
- pré-requisitos;
- evento inicial e estado esperado;
- evidência produzida pelo aluno;
- rubrica de avaliação;
- dicas progressivas da IA;
- revisão futura sugerida.

O Mentor IA opera em quatro modos: explicar, perguntar, dar uma dica e revisar uma evidência. A resposta final completa não deve aparecer antes de uma tentativa, salvo quando o aluno pedir explicitamente uma demonstração.

## Navegação

- **Desktop:** espaço de contexto e continuidade dos projetos.
- **Launcher:** busca por app ou fundamento, com status de maturidade visível.
- **Dock:** apps ativos e favoritos.
- **Trilhas Dojo:** sequência recomendada e missão atual.
- **Modo Aprender:** painel contextual global, sempre opcional.
- **Projetos:** artefatos persistentes que atravessam várias trilhas.

Em telas pequenas, uma janela ocupa o espaço útil e o Modo Aprender vira uma folha inferior. A hierarquia continua igual; só muda a apresentação.

## Evolução incremental

### Ciclo 0 — contrato e experiência

- shell do desktop, dock, launcher, janelas e responsividade;
- AppManifest e registro central de apps;
- LearningEvent e Modo Aprender;
- trilha inicial, XP local e mentor determinístico para validar a interação;
- quatro apps demonstrativos: Terminal, Arquivos, Arquitetura e Central de Apps.

**Saída:** o protótipo deste pacote.

### Ciclo 1 — runtime educacional

- filesystem virtual persistente;
- gerenciador de processos simulado;
- event bus e timeline de ações;
- conta local, progresso e restauração de sessão;
- testes de contrato para apps.

**Critério:** Terminal e Arquivos compartilham o mesmo estado e geram evidências auditáveis.

### Ciclo 2 — primeira trilha completa

- fundamentos de dados, instruções, processos e arquivos;
- 12–16 missões curtas;
- testes de domínio e repetição espaçada;
- painel de progresso e caderno;
- mentor conectado por uma interface de provider, com ferramentas limitadas.

**Critério:** um aluno conclui uma trilha e publica um pequeno projeto verificável.

### Ciclo 3 — plataforma de apps

- SDK documentado e CLI de scaffolding;
- permissões por capability;
- sandbox para execução de código;
- editor de código, monitor do sistema e Git Studio;
- telemetria de aprendizagem e avaliações de qualidade da IA.

**Critério:** um novo app é adicionado sem alterar o shell ou o motor pedagógico.

### Ciclos seguintes — expansão por domínios

Expandir em pacotes coerentes: Web e Redes; Bancos de Dados; Algoritmos e Estruturas; Sistemas Operacionais; Segurança; Cloud; IA; Hardware. Cada pacote deve entregar apps funcionais, uma trilha e um projeto integrador.

## Priorização dos aplicativos

| Ordem | Apps | Fundamentos principais | Por quê |
| --- | --- | --- | --- |
| 1 | Terminal + Arquivos + Monitor | processos, I/O, árvores, recursos | tornam o próprio sistema observável |
| 2 | Editor + Testing Lab + Git Studio | linguagens, testes, grafos | criam o primeiro ciclo profissional completo |
| 3 | Web Lab + Network Lab + API Lab | DOM, HTTP, DNS, eventos | conectam código a sistemas distribuídos |
| 4 | Database Studio + Data Structures | persistência, índices, complexidade | aprofundam decisões de desempenho |
| 5 | Security + Cloud + AI Labs | confiança, escala, modelos | dependem dos fundamentos anteriores |

## Qualidade e segurança

- apps executam apenas capabilities declaradas;
- código do aluno roda em sandbox com limites de CPU, memória, rede e tempo;
- eventos pedagógicos não armazenam conteúdo sensível por padrão;
- respostas da IA são avaliadas por correção, utilidade, nível de pista e segurança;
- toda missão possui testes determinísticos quando possível;
- progresso, streak e XP não substituem evidência de domínio;
- catálogo distingue claramente disponível, laboratório e planejado.

## Métricas iniciais

- tempo até a primeira ação prática;
- taxa de conclusão da primeira missão;
- tentativas antes de pedir a solução;
- retenção do conceito após 1, 7 e 21 dias;
- porcentagem de eventos com evidência válida;
- custo e latência do mentor por missão;
- acessibilidade e sucesso em telas pequenas.

## Decisões que podem esperar

Backend definitivo, fornecedor de IA, multiplayer, marketplace público, certificação e monetização não são necessários para validar o primeiro ciclo. As interfaces devem permitir substituição posterior sem antecipar complexidade.
