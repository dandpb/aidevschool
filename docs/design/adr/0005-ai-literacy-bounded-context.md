# ADR-0005: Bounded context AI Literacy (`literacyDojo` + trilha `curriculum/ai-literacy/`)

**Status:** Accepted · **Data:** 2026-07-19 · **Decisor:** Daniel (aprovação do
plano `docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md`)
**Contexto:** O plano LiteracyDojo propõe um produto de microaprendizagem de IA
para pessoas não técnicas (PWA mobile-first, 14 lições em 4 módulos). Antes de
qualquer engine ou UI, a seção 18 do plano exige uma decisão arquitetural
registrada sobre cinco pontos. Este ADR confirma os cinco. A implementação do
engine (`engines/literacyDojo/`) é Fase 1 e fica para a próxima fatia.

## Opções

| # | Decisão | Alternativas | Escolhida |
| --- | --- | --- | --- |
| 1 | Onde vive o produto | (a) transformar `codexDojo`/`codexdojo-os-prototype` em produto para outro público; (b) bounded context novo | **(b) `literacyDojo` como bounded context independente** |
| 2 | Onde vive o conteúdo | (a) conteúdo dentro do engine (JSX/TS escrito à mão); (b) currículo novo separado; (c) trilha dentro do currículo compartilhado | **(c) `curriculum/ai-literacy/` como trilha** |
| 3 | O que o app pode registrar | (a) progresso local = domínio; (b) separar progresso local de domínio verificado | **(b) separação explícita** |
| 4 | Como a UI consome conteúdo | (a) importar YAML em runtime; (b) duplicar conteúdo em componentes; (c) compilar para read model tipado | **(c) read model tipado gerado** |
| 5 | Infra do vertical slice | (a) backend + LLM desde o início; (b) local-first, sem backend nem LLM obrigatório | **(b) local-first** |

## Decisão

### 1. `literacyDojo` é um bounded context independente

A alfabetização em IA para não-técnicos tem linguagem, público e régua próprios;
não se mistura com o ensino de programação dos engines existentes. O contexto
reutiliza os **princípios** do ecossistema (tentativa antes de domínio,
produtor ≠ verificador, conteúdo canônico fora da UI, evidência auditável), mas
não o vocabulário nem os componentes. Limites do contexto (o que o engine deve
e não deve fazer) estão em `docs/design/ai-literacy/README.md`.

### 2. `curriculum/ai-literacy/` é uma trilha dentro do currículo compartilhado

Registramos aqui a evolução do invariante do ecossistema: de **“um currículo”**
para **“um currículo compartilhado com múltiplas trilhas”**. O que muda e o que
permanece:

- **Permanece:** `curriculum/` é a única raiz de conteúdo canônico; engines
  referenciam, nunca duplicam; cada trilha é uma subárvore com identidade,
  catálogo e contratos próprios.
- **Muda:** deixa de existir uma única progressão (os projetos numerados).
  Passam a coexistir trilhas com públicos e gates diferentes: os projetos
  `01_`–`18_`, a trilha Nível 0 `00_ai_in_practice/` (gate no-code do ADR-0004,
  aprendiz único) e agora `ai-literacy/` (conteúdo de produto, multiusuário no
  futuro).
- **Não se confunde:** `ai-literacy/` não é a materialização de
  `00_ai_in_practice/`. A trilha 00 é conteúdo de escolarização gateada pelo
  Prometor para o aprendiz único do substrato; `ai-literacy/` é conteúdo de
  produto compilado em read model para o público do `literacyDojo`. As duas
  podem convergir no futuro por decisão própria; até lá, permanecem trilhas
  separadas com gates separados.

### 3. Progresso local é separado de domínio verificado

O app persiste localmente **progresso de experiência** (telas, posição,
`completed` de lição) e **engajamento** (XP, sequência, conquistas). Nada disso
é competência. O estado local pode registrar `completed`; o termo `mastered`
fica **reservado** a uma futura integração com verificador independente e é
proibido no conteúdo, no estado local e na evidência (o schema de lição impõe
essa restrição estruturalmente). Detalhes em
`docs/design/ai-literacy/evidence-contract.md`.

### 4. Conteúdo canônico é compilado para um read model tipado

A fonte de verdade é o conteúdo versionado em `curriculum/ai-literacy/`
(YAML + JSON Schema), nunca JSX/TS escrito à mão. Um compilador
(`curriculum/ai-literacy/tools/validate.py --compile`) valida e gera
`lessons.ts` tipado com cabeçalho `DO NOT EDIT BY HAND`; a UI consome somente
esse read model. Conteúdo inválido falha o build — sem fallback silencioso.
Contrato completo em `docs/design/ai-literacy/content-contract.md`.

### 5. O vertical slice não tem backend nem LLM obrigatório

O MVP é local-first: sem autenticação, sem banco, sem chamada de IA. O feedback
é determinístico, derivado dos checks e rubricas do conteúdo. Portas
(`ContentRepository`, `ProgressRepository`, `EvidenceSink`, `FeedbackProvider`,
`AnalyticsSink`) ficam definidas para não bloquear a evolução multiusuário, mas
nenhum adapter remoto entra antes de uma hipótese validada que o exija.
`learner/learning_state.yaml` **não** é banco de dados do produto.

## Limites explícitos

- Este ADR autoriza contratos, conteúdo e ferramenta de validação/compilação
  (Fase 0). A criação de `engines/literacyDojo/` exige a Fase 1 do plano.
- `CONTEXT-MAP.md`, handbook e `MANIFEST.md` só são atualizados na fatia de
  integração, quando a implementação começar.
- O contrato de teaching games (`docs/design/teaching-game-contract.md`)
  permanece inalterado; alfabetização em IA tem contrato de evidência próprio
  até haver abstração comum comprovada.
- A régua empírica dos níveis 1–6 e o gate no-code do ADR-0004 não se aplicam
  à trilha `ai-literacy/` (produto, não escolarização do aprendiz único), e a
  trilha `ai-literacy/` não promove unidades de nenhuma outra trilha.

## Consequências

- Fica mais fácil: evoluir o produto para não-técnicos sem tocar nos engines de
  programação; gerar o read model da Fase 1 sem duplicar conteúdo; adicionar
  novas trilhas ao currículo seguindo este precedente.
- Fica mais caro: um segundo vocabulário de conteúdo (lições/atividades vs.
  projetos/deliverables), um validador próprio para manter, e a disciplina de
  nunca deixar progresso local ser lido como domínio.
- Revisitar quando: o vertical slice demonstrar (ou não) ativação e
  aprendizagem — aí sim decidir backend multiusuário (Fase 4) e uma eventual
  integração com um verificador independente que possa emitir `mastered`.
