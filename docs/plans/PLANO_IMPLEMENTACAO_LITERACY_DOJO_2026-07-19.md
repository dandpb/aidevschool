# LiteracyDojo — plano de implementação

| Campo | Valor |
| --- | --- |
| Status | Proposta de implementação |
| Data | 2026-07-19 |
| Escopo | Microaprendizagem de IA para pessoas não técnicas |
| Engine proposto | `engines/literacyDojo/` |
| Público inicial | Profissionais não técnicos que querem usar IA no trabalho |
| Autoridade | Plano; não representa runtime, contrato aceito ou domínio implementado |

## Resumo executivo

Criar uma nova superfície educacional, com nome de trabalho **LiteracyDojo**, para ensinar uso prático e responsável de IA a pessoas não técnicas por meio de microlições de 3–5 minutos, exercícios interativos, feedback imediato, revisão espaçada e progressão visível.

A recomendação é implementar a solução como **um novo engine mobile-first**, sem transformar `codexDojo` ou `codexdojo-os-prototype` em um produto para outro público. O engine deve reutilizar os princípios centrais do ecossistema — tentativa antes de domínio, produtor diferente de verificador, conteúdo canônico fora da UI e evidência auditável — mas começar local-first, sem autenticação, banco de dados ou dependência obrigatória de um modelo de IA.

### Decisões recomendadas para o MVP

- **Público inicial:** profissionais não técnicos que querem usar IA no trabalho.
- **Promessa:** aprender a usar IA com confiança em cinco minutos por dia.
- **Formato:** PWA mobile-first com 14 lições em quatro módulos.
- **Nome técnico provisório:** `literacyDojo`; o nome comercial pode ser decidido depois.
- **Stack:** React + Vite + TypeScript, com Vitest, Testing Library, Playwright e Biome.
- **Persistência inicial:** progresso local, claramente separado de domínio verificado.
- **Feedback inicial:** determinístico e baseado em rubricas; IA generativa é opcional e posterior.
- **Backend:** fora do MVP. Criar portas e adapters para não bloquear uma evolução multiusuário.

---

## 1. Contexto arquitetural do repositório

O repositório atual é um ecossistema com vários engines, currículo e estado compartilhados. Algumas restrições precisam continuar verdadeiras:

1. O root não é uma única aplicação nem possui um package manager global.
2. Engines são projetos independentes e consomem fontes canônicas compartilhadas.
3. A interface não concede domínio por conta própria.
4. Um modelo de linguagem pode explicar e oferecer feedback, mas não deve ser a fonte exclusiva de certeza de conclusão.
5. Estado canônico e conteúdo não devem ser duplicados manualmente dentro de um engine.
6. Views geradas são somente leitura e nunca são atualizadas de volta para a fonte canônica.

Referências relevantes:

- [`README.md`](../README.md)
- [`AGENTS.md`](../AGENTS.md)
- [`docs/handbook/01_architecture.md`](handbook/01_architecture.md)
- [`learner/substrate/interface.md`](../learner/substrate/interface.md)
- [`docs/design/teaching-game-contract.md`](design/teaching-game-contract.md)
- [`engines/codexdojo-os-prototype/docs/PLANO_INICIAL.md`](../engines/codexdojo-os-prototype/docs/PLANO_INICIAL.md)

### Incompatibilidade que precisa ser tratada explicitamente

O produto final pretende servir muitas pessoas, enquanto o substrato atual é deliberadamente file-based e orientado a um aprendiz. O plano separa duas etapas:

- **Validação pedagógica local-first:** uma pessoa, progresso no navegador, conteúdo versionado e evidência capturada por testes.
- **Plataforma multiusuário:** autenticação, sincronização e armazenamento remoto somente após o MVP demonstrar ativação, retenção e aprendizagem.

Não usar `learner/learning_state.yaml` como banco de dados de usuários do produto público.

---

## 2. Bounded context e integração recomendada

Criar um bounded context novo, sem misturar a linguagem do ensino de programação com a alfabetização em IA.

### Superfícies propostas

```text
curriculum/
└── ai-literacy/
    ├── catalog.yaml
    ├── schemas/
    │   ├── lesson.schema.json
    │   └── rubric.schema.json
    └── modules/
        ├── 01-ai-sem-misterio/
        ├── 02-pedir-bem/
        ├── 03-avaliar-e-verificar/
        └── 04-seguranca-e-aplicacao/

engines/
└── literacyDojo/
    ├── AGENTS.md
    ├── README.md
    ├── package.json
    ├── src/
    │   ├── app/
    │   ├── screens/
    │   ├── components/
    │   ├── domain/
    │   ├── application/
    │   ├── adapters/
    │   └── data/generated/
    ├── tests/
    └── playwright/

docs/design/ai-literacy/
├── README.md
├── content-contract.md
└── evidence-contract.md
```

### Limites do engine

`literacyDojo` deve:

- renderizar as lições e coletar tentativas;
- oferecer feedback formativo;
- persistir progresso local de experiência;
- emitir evidência estruturada;
- funcionar sem provedor de IA;
- ser acessível em celular e desktop.

`literacyDojo` não deve:

- editar `learner/learning_state.yaml` diretamente;
- declarar `mastered` com base em uma resposta do próprio modelo;
- duplicar conteúdo canônico em componentes React;
- armazenar texto livre sensível em telemetria por padrão;
- introduzir backend antes de existir uma hipótese validada que o exija.

### Relação com os engines existentes

- **`codexDojo`:** pode exibir um resumo da trilha no futuro, mas não deve hospedar o player do MVP.
- **`codexdojo-os-prototype`:** pode integrar o engine pelo Engine Hub depois que o produto independente estiver estável.
- **`minimaxDojo`:** pode fornecer papéis de tutor e curadoria posteriormente; não deve ser pré-requisito de runtime.
- **`pixelDojo` e `voxelDojo`:** compartilham princípios de evidência, mas o contrato de teaching games não deve ser alterado prematuramente.
- **`learner/substrate`:** pode gerar o read model do catálogo e uma review slice quando houver contrato aceito.
- **`curriculum/`:** continua sendo a raiz compartilhada; `ai-literacy/` é uma trilha, não uma cópia de currículo.

---

## 3. Modelo pedagógico do MVP

Cada microlição segue o ciclo:

```text
Situação → conceito curto → tentativa → feedback → nova tentativa → aplicação real
```

### Competências centrais

1. **Entender:** reconhecer o que uma IA consegue e não consegue fazer.
2. **Pedir:** formular objetivo, contexto, público, formato e restrições.
3. **Avaliar:** detectar omissões, invenções, vieses e necessidade de verificação.
4. **Proteger:** evitar exposição de dados pessoais, profissionais ou confidenciais.
5. **Aplicar:** usar a IA em uma tarefa real sem terceirizar o próprio julgamento.

### Tipos iniciais de atividade

- escolha entre duas respostas;
- ordenar partes de uma boa instrução;
- identificar o contexto ausente;
- classificar informação como segura ou sensível;
- comparar duas saídas da IA;
- montar um pedido por campos estruturados;
- revisar uma resposta usando uma rubrica;
- aplicar o padrão a uma situação da rotina.

Atividades abertas podem receber feedback de IA, mas a conclusão verificada deve depender de sinais determinísticos ou de uma rubrica verificável separadamente.

---

## 4. Currículo inicial de 14 dias

### Módulo 1 — IA sem mistério

1. Sua primeira conversa com uma IA.
2. IA não é pessoa, consciência ou fonte de verdade.
3. O que a IA faz bem e onde costuma falhar.

### Módulo 2 — Aprender a pedir

4. Dê um objetivo claro.
5. Dê contexto suficiente.
6. Defina público, tom e formato.
7. Melhore a resposta em etapas.

### Módulo 3 — Avaliar e verificar

8. A primeira resposta não é necessariamente a melhor.
9. Como reconhecer uma resposta inventada.
10. Quando procurar fontes externas.
11. Como comparar alternativas e explicitar critérios.

### Módulo 4 — Segurança e aplicação

12. O que não compartilhar com uma IA.
13. Use IA para uma tarefa real de trabalho.
14. Desafio final: pedir, avaliar, melhorar e aplicar.

Cada lição deve declarar objetivo observável, duração estimada, pré-requisitos, habilidades praticadas, atividades, rubrica, evidência emitida e regra de revisão.

---

## 5. Contratos de conteúdo

O conteúdo deve ser dado versionado, não JSX escrito à mão.

### Exemplo de contrato

```ts
type LessonDefinition = {
  id: string
  version: number
  moduleId: string
  title: string
  objective: string
  estimatedMinutes: 3 | 4 | 5
  skillIds: string[]
  prerequisites: string[]
  activities: ActivityDefinition[]
  completion: {
    minimumScore: number
    requiredActivityIds: string[]
  }
  review: {
    intervalsDays: number[]
  }
}
```

### Contrato mínimo de atividade

```ts
type ActivityDefinition =
  | ChoiceActivity
  | SortActivity
  | MissingContextActivity
  | SafetyClassificationActivity
  | PromptBuilderActivity
  | OutputComparisonActivity
  | RubricReviewActivity
```

Cada atividade deve possuir:

- ID estável;
- instrução em linguagem simples;
- dados necessários para renderização;
- estratégia de avaliação;
- feedback por falha;
- habilidade praticada;
- política de armazenamento da resposta.

### Pipeline recomendado

```text
curriculum/ai-literacy/*
  → validação de schema
  → adaptador do substrate ou compilador de conteúdo
  → engines/literacyDojo/src/data/generated/lessons.ts
  → app consome somente o read model tipado
```

Regras:

- arquivos gerados carregam cabeçalho `DO NOT EDIT BY HAND`;
- IDs são estáveis e nunca dependem do título exibido;
- toda alteração de conteúdo incrementa a versão da lição;
- progresso antigo deve ter uma política explícita de migração;
- rubricas ficam próximas do conteúdo e possuem testes de contrato;
- conteúdo inválido deve falhar o build, não produzir fallback silencioso.

---

## 6. Progresso, gamificação e domínio

Separar três conceitos para não confundir engajamento com aprendizagem:

| Conceito | Significado | Pode ser local? |
| --- | --- | --- |
| Progresso de experiência | telas vistas, lições iniciadas, posição atual | sim |
| Engajamento | XP, sequência, meta diária, conquistas | sim |
| Competência verificada | habilidade demonstrada por evidência e verificador | não deve depender apenas da UI ou do LLM |

### Mecânicas recomendadas

- sequência diária sem punição agressiva;
- XP como motivação, não como prova de competência;
- mapa visual de módulos;
- revisão espaçada;
- conquistas por aplicação real;
- feedback do tipo “ainda falta X”, não apenas certo/errado;
- ausência de ranking público no MVP.

### Persistência local

Criar uma interface, sem acoplar a aplicação à tecnologia de armazenamento:

```ts
interface ProgressRepository {
  load(): Promise<LearnerProgress>
  save(progress: LearnerProgress): Promise<void>
  reset(): Promise<void>
}
```

A primeira implementação pode usar IndexedDB. O adapter remoto só entra após uma decisão arquitetural específica.

### Estado sugerido

```ts
type LessonStatus = "locked" | "available" | "in_progress" | "completed"

type SkillPractice = {
  skillId: string
  attempts: number
  lastScore: number
  lastPracticedAt: string
  nextReviewAt?: string
}

type LearnerProgress = {
  schemaVersion: number
  contentVersion: string
  currentLessonId: string
  lessonStatus: Record<string, LessonStatus>
  skills: Record<string, SkillPractice>
  xp: number
  streak: {
    current: number
    longest: number
    lastActivityDate?: string
  }
}
```

O estado local pode registrar `completed`; não deve registrar `mastered` sem integração com um verificador independente.

---

## 7. Evidência e verificação

A experiência deve preservar a separação entre tentativa, feedback e verificação.

### Envelope sugerido

```ts
type LiteracyEvidenceRecord = {
  schemaVersion: 1
  source: "literacydojo"
  attemptId: string
  lessonId: string
  lessonVersion: number
  activityId: string
  activityType: string
  skillIds: string[]
  deterministicChecks: Record<string, boolean | number | string>
  score: number
  pass: boolean
  timestamp: string
  verifierRequired: true
}
```

### Regras

- a UI emite evidência bruta e nunca promove domínio;
- feedback generativo e verificação usam caminhos distintos;
- respostas abertas não devem ser armazenadas em analytics por padrão;
- quando necessário, registrar somente digest, categorias e resultado da rubrica;
- Playwright deve capturar a evidência emitida e validar o envelope;
- criar um contrato próprio para alfabetização em IA, sem alterar o contrato de teaching games até haver uma abstração comum comprovada.

Para o MVP, conclusão de lição pode existir como estado local. O termo `mastered` deve ser reservado para uma futura integração com um verificador independente.

### Estratégia para exercícios abertos

1. O usuário constrói a resposta por campos estruturados sempre que possível.
2. Checks determinísticos verificam presença, consistência e restrições.
3. Feedback generativo pode explicar qualidade e sugerir melhorias.
4. O resultado do LLM nunca substitui os checks.
5. Um desafio realmente aberto pode ser marcado como “aplicação concluída”, não “competência dominada”.

---

## 8. Arquitetura da aplicação

### Camadas

```text
UI
  → casos de uso
    → domínio
      → portas
        → adapters locais / remotos
```

### Portas mínimas

```ts
interface ContentRepository {}
interface ProgressRepository {}
interface EvidenceSink {}
interface FeedbackProvider {}
interface AnalyticsSink {}
interface Clock {}
```

### Casos de uso mínimos

- `startLesson`
- `submitActivityAttempt`
- `requestHint`
- `retryActivity`
- `completeLesson`
- `scheduleReview`
- `resumeSession`
- `resetProgress`

### FeedbackProvider

Começar com uma implementação determinística:

- mensagens baseadas nas verificações da rubrica;
- exemplos pré-escritos;
- dicas progressivas;
- comparação com critérios explícitos.

Adicionar um provider generativo somente em fase posterior. A aplicação deve continuar funcional quando o provider estiver indisponível.

### AnalyticsSink

O domínio não deve conhecer ferramentas de analytics. O adapter inicial pode ser `NoopAnalyticsSink`; um adapter real entra quando houver política de dados e eventos aprovados.

Eventos propostos:

- `onboarding_started`
- `onboarding_completed`
- `lesson_started`
- `activity_attempted`
- `hint_requested`
- `activity_passed`
- `lesson_completed`
- `review_started`
- `review_completed`
- `real_world_application_reported`

Não anexar texto livre do usuário aos eventos por padrão.

---

## 9. Fluxos de produto do MVP

### Onboarding

1. “O que você quer fazer melhor com IA?”
2. Seleção de contexto: trabalho, estudos, negócio próprio ou vida cotidiana.
3. Autoavaliação simples de confiança.
4. Primeira lição imediatamente, sem cadastro obrigatório.

### Home

- missão do dia;
- progresso da trilha;
- revisão pendente;
- sequência;
- botão único para continuar.

### Lição

- uma ideia por tela;
- exemplos concretos;
- tentativa antes da explicação completa quando adequado;
- feedback acionável;
- possibilidade de tentar novamente;
- aplicação prática opcional no final.

### Resultado

- habilidade praticada;
- o que foi bem;
- o que revisar;
- próximo passo;
- distinção clara entre “lição concluída” e “competência verificada”.

### Progresso

- módulos e lições;
- habilidades praticadas;
- revisões futuras;
- conquistas;
- histórico sem expor conteúdo sensível.

---

## 10. Fases de implementação

### Fase 0 — decisão e contratos

- [ ] Criar ADR para o bounded context `AI Literacy`.
- [ ] Registrar a evolução de “um currículo” para “um currículo compartilhado com múltiplas trilhas”.
- [ ] Atualizar `CONTEXT-MAP.md`, handbook, documentação e `MANIFEST.md` quando a implementação começar.
- [ ] Definir schemas de lição, atividade, rubrica e evidência.
- [ ] Escrever três lições piloto no conteúdo canônico.
- [ ] Criar validador de conteúdo e testes de contrato.

**Critério de saída:** três lições válidas podem gerar um read model tipado sem código duplicado na UI.

### Fase 1 — vertical slice navegável

- [ ] Criar `engines/literacyDojo/` como app independente.
- [ ] Implementar onboarding curto.
- [ ] Implementar mapa da trilha, player de lição e tela de resultado.
- [ ] Implementar três tipos de atividade.
- [ ] Implementar feedback determinístico.
- [ ] Persistir progresso local por uma porta.
- [ ] Emitir evidência estruturada em canal de teste e console.
- [ ] Adicionar testes unitários, componentes e um fluxo Playwright completo.

**Critério de saída:** uma pessoa conclui três microlições no celular, fecha o navegador, retorna e continua do ponto salvo.

### Fase 2 — MVP de 14 dias

- [ ] Completar quatro módulos e 14 lições.
- [ ] Implementar pelo menos cinco tipos de atividade.
- [ ] Adicionar XP, sequência, meta diária e revisão espaçada.
- [ ] Tornar o app instalável e funcional com conectividade instável.
- [ ] Adicionar acessibilidade de teclado, leitor de tela, foco e contraste.
- [ ] Versionar conteúdo e criar migração de progresso.
- [ ] Instrumentar eventos sem coletar texto livre sensível.
- [ ] Adicionar uma área de progresso com habilidades praticadas e revisões futuras.

**Critério de saída:** todos os 14 dias podem ser concluídos, revisados e validados por testes automatizados, sem necessidade de um modelo externo.

### Fase 3 — feedback adaptativo opcional

- [ ] Criar gateway provider-neutral para IA.
- [ ] Construir contexto mínimo por lição e tentativa.
- [ ] Exigir resposta estruturada e validada por schema.
- [ ] Separar feedback formativo de decisão de aprovação.
- [ ] Criar suíte de avaliações com respostas boas, incompletas, inseguras e adversariais.
- [ ] Definir orçamento de custo, latência e fallback.

**Critério de saída:** desligar o provider de IA não impede o curso nem altera resultados verificados.

### Fase 4 — piloto multiusuário

Somente iniciar após validar o MVP local.

- [ ] Criar ADR para serviço hospedado e modelo de dados.
- [ ] Adicionar autenticação e sincronização por interfaces existentes.
- [ ] Implementar ingestão de eventos e evidências.
- [ ] Implementar publicação versionada de conteúdo.
- [ ] Oferecer exportação e exclusão dos dados do usuário.
- [ ] Criar painel mínimo para acompanhar ativação e conclusão, sem expor respostas pessoais.

**Critério de saída:** um piloto controlado pode usar múltiplas contas sem transformar arquivos do repositório em banco de dados de produção.

---

## 11. Sequência recomendada de pull requests

1. **ADR + contratos de conteúdo e evidência.**
2. **Scaffold do engine + três lições piloto.**
3. **Runner de lição + feedback determinístico.**
4. **Persistência local + evidência + Playwright.**
5. **Conteúdo completo de 14 dias.**
6. **Revisão espaçada, XP, sequência e acessibilidade.**
7. **PWA, telemetria e documentação operacional.**
8. **Gateway de IA opcional**, somente após a experiência determinística estar estável.
9. **Backend multiusuário**, condicionado às métricas do piloto.

Cada PR deve:

- atualizar os documentos exigidos pelo repositório;
- evitar edição manual de arquivos gerados;
- executar os checks locais do engine;
- executar os testes do substrate quando houver adapters novos;
- incluir evidência do fluxo Playwright;
- não declarar domínio a partir de feedback do próprio modelo.

---

## 12. Estratégia de testes

### Conteúdo

- validação de schema;
- IDs duplicados;
- referências a módulos, habilidades e pré-requisitos inexistentes;
- lições sem rubrica;
- conteúdo com versão inválida;
- ciclos no grafo de pré-requisitos.

### Domínio

- progressão e desbloqueio;
- cálculo de XP;
- sequência por data local;
- agendamento de revisão;
- migração entre versões;
- retry e feedback por check.

### Componentes

- teclado e foco;
- leitor de tela;
- estados vazio, loading e erro;
- atividade certa, errada e parcialmente correta;
- retomada de sessão.

### End-to-end

- onboarding → primeira lição → resultado;
- fechar e reabrir → retomar;
- concluir módulo;
- executar revisão;
- emitir evidência válida;
- provider de IA indisponível;
- conteúdo inválido falhando o build.

### Não regressão do ecossistema

- apps existentes continuam independentes;
- nenhum arquivo gerado é editado manualmente;
- o substrate não altera o estado de aprendizagem atual sem uma transição explícita;
- o contrato de teaching games permanece inalterado no primeiro slice.

---

## 13. Métricas de validação

### Funil

- início e conclusão do onboarding;
- início e conclusão da primeira lição;
- retorno no dia seguinte e após sete dias;
- conclusão do primeiro módulo e da trilha;
- abandono por tela e atividade.

### Aprendizagem

- melhoria entre primeira e segunda tentativa;
- desempenho em revisão após 1, 7 e 21 dias;
- capacidade de identificar resposta duvidosa;
- capacidade de reconhecer dados que não devem ser compartilhados;
- aplicação real relatada pelo usuário.

### Qualidade

- tempo até a primeira ação útil;
- falhas do conteúdo e schema;
- falhas de persistência e migração;
- cobertura dos fluxos críticos;
- acessibilidade em telas pequenas;
- custo e latência do provider de IA, quando existir.

A métrica norteadora proposta é: **usuários que aplicam IA com sucesso em pelo menos uma tarefa real por semana**.

---

## 14. Riscos e controles

| Risco | Controle |
| --- | --- |
| Misturar o produto para iniciantes com a escola de engenharia existente | Novo bounded context e novo engine. |
| Ensinar apenas “prompts mágicos” | Competências duráveis: contexto, critérios, iteração, verificação e segurança. |
| LLM aprovar o próprio trabalho | Feedback generativo separado de verificação determinística. |
| Gamificação substituir aprendizagem | XP e sequência classificados como engajamento, não domínio. |
| Conteúdo ficar obsoleto | Conteúdo versionado, schemas, revisão editorial e migrações. |
| Coleta de informações sensíveis | Telemetria sem texto livre por padrão e minimização de dados. |
| Backend prematuro | MVP local-first, com portas para evolução futura. |
| Lock-in de fornecedor de IA | `FeedbackProvider` provider-neutral e fallback determinístico. |
| Escopo crescer para muitos públicos | Começar por profissionais não técnicos e uma única trilha. |
| Forçar o modelo multiusuário no YAML atual | Backend posterior e separado do substrato file-based. |

---

## 15. Fora do escopo do primeiro MVP

- ranking público e competição social;
- marketplace de cursos;
- certificados formais;
- trilhas para muitas profissões;
- painel empresarial;
- correção de exercícios exclusivamente por LLM;
- chat aberto sem contexto;
- voz e avatar;
- integração com WhatsApp;
- migração do currículo de programação existente;
- backend multiusuário antes da validação do produto.

---

## 16. Definition of Done do MVP

- [ ] 14 lições de 3–5 minutos, organizadas em quatro módulos.
- [ ] Pelo menos cinco atividades interativas reutilizáveis.
- [ ] Experiência funcional em celular e desktop.
- [ ] Progresso local persistente e migrável.
- [ ] Feedback determinístico em todas as atividades avaliadas.
- [ ] Evidência estruturada emitida e validada em teste.
- [ ] Revisão espaçada, XP, sequência e metas sem confundir engajamento com domínio.
- [ ] Nenhum texto livre sensível enviado à telemetria por padrão.
- [ ] Fluxo completo coberto por Playwright.
- [ ] Testes de schema e conteúdo canônico.
- [ ] README local, handbook, context map, documentação e manifest atualizados.
- [ ] App utilizável sem provedor de IA e sem backend.

---

## 17. Primeira entrega sugerida

Construir uma vertical slice com estas três lições:

1. **IA não é uma fonte de verdade.** Comparar uma resposta convincente com evidência ausente.
2. **Dê contexto para obter uma resposta útil.** Melhorar um pedido genérico usando campos estruturados.
3. **Proteja suas informações.** Classificar dados seguros e sensíveis em cenários de trabalho.

Essa combinação testa entendimento, formulação de pedidos e segurança; cobre três tipos diferentes de atividade e demonstra o valor do produto sem exigir backend ou integração com um modelo externo.

### Critérios específicos da vertical slice

- primeira ação prática em menos de dois minutos;
- cada lição concluível em até cinco minutos;
- suporte a viewport de 360 px;
- progresso retomado após reload;
- feedback útil sem chamada externa;
- evidência emitida para cada tentativa avaliada;
- um teste Playwright percorre as três lições;
- nenhuma alteração em `learner/learning_state.yaml`;
- nenhum claim de `mastered`.

---

## 18. Próxima decisão após este plano

O primeiro PR de implementação deve começar pelo ADR e pelos contratos, não pelo desenho visual completo. A decisão arquitetural precisa confirmar:

1. `literacyDojo` como bounded context independente;
2. `curriculum/ai-literacy/` como trilha dentro do currículo compartilhado;
3. progresso local separado de domínio verificado;
4. conteúdo canônico compilado para um read model tipado;
5. ausência de backend e LLM obrigatório no vertical slice.
