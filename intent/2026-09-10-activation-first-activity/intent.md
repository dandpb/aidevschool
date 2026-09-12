# Intent: Aprendiz começa a 1ª atividade na 1ª sessão — reduzir o abandono pré-1ª-atividade

Author: UX Designer (AID-1213, estágio LEARN do piloto) · Change-id: `2026-09-10-activation-first-activity` · Status: **accepted**

> **Registro do aceite (gate canônico):** conteúdo = Draft 1 do doc `intent-drafts` (rev `54c02e18`) da issue AID-1213, transcrito abaixo sem reescrita. Aceite pelo product owner (CEO por delegação AID-1211): decisão `3 ACEITAR → Design CONDICIONADO` na issue AID-1216 (doc `decisao` rev `272b4a63`), baseada na triagem SM AID-1215 doc `triagem` §1 item 1 / §3. Condição 2 de abertura (sinal das 1ªs sessões O1) convertida de pré-requisito para **stream de validação** pela decisão CEO D-1412-1 (issue AID-1412, doc `decisao` rev `07f5ca7a`): a spec abre **assumption-first**, com premissas explícitas revogáveis ancoradas nos eventos F2 (v4 live). Spec autoritativa: doc `spec` na issue AID-1221 (lead System Designer, colaboração Content Designer). Nada em `intent/` antes deste commit (verificado: diretório inexistente no main `32545321`).

## Problem

Aprendizes iniciam missão/lição e abandonam antes de submeter a 1ª atividade (padrão dominante: OS 4/6 starts, literacy 1/3). Não é falha técnica (0 erros). Quem não passa da 1ª atividade nunca alcança o loop de aprendizagem que comprovadamente funciona (2/2 completam com PASS após a 1ª submissão).

## Proposed outcome

Observável, não implementação: na próxima janela de medição (pós-intros O1), a taxa de starts que alcançam ≥1 submissão de atividade sobe da linha de base (OS 33%, literacy 67%) para ≥70% em ambas as superfícies, SEM degradar a taxa de conclusão pós-1ª-atividade (hoje 100%, 2/2) nem o tempo-médio por atividade. Medição via eventos existentes (`activity_attempted`/submissão), sem novos PII.

## Affected users and systems

Aprendizes de 1ª sessão (não-programadores na trilha ai-prática e devs na dev). Engines `codexDojo` (OS) e `literacyDojo`; shared substrate `curriculum/` (ordem/tipo da 1ª atividade é conteúdo — escalar ao curriculum ownership); coletor de telemetria somente leitura.

## Constraints

- Preservar intacto o ciclo tentativa→feedback→progresso verificado (sinal positivo F4 da síntese).
- Learning-gate golden rules: nada aqui marca mastery nem altera gates.
- Zero novas PII (ADR-0009/0010); envelopes OS v1 / literacy v2 compatíveis.
- Uma aprendiz, um currículo compartilhado, múltiplos engines: a melhoria vale para as 2 superfícies, respeitando contexto limitado de cada engine.
- Não otimizar engajamento acima de resultado de aprendizagem.
- Teto de esforço definido na spec (gap menor da triagem AID-1215 §1 item 1): escopo mínimo viável = incrementos de apresentação/redirecionamento de atenção apenas; sem novos eventos (F2 v4 cobre a medição), sem mudança de fluxo/estado, sem edição de currículo.

## Open questions

- O abandono é fricção do brief da missão (clareza do "o que fazer") ou da 1ª atividade (carga do `output_comparison` como primeiro tipo)? — Design precisa de sessões O1 (AID-641) + os eventos do Draft 2.
- `game-02-warehouse` (dev) teve 100% drop com n=1: problema de conteúdo, de dificuldade de entrada, ou ruído?
- F5 (pulo de trilha l02→game-02 na mesma sessão): track selection comunica "comece aqui"? (primeiro mandato UX).

> **Disposition (D-1412-1 §2.1):** as três open questions viram **premissas de trabalho explícitas** (§Premissas da spec AID-1221), cada uma com fundamento no P1, sinal de refutação no stream de validação O1/F2 e custo de reversão. Revisão obrigatória no primeiro de: 1º sinal O1 · scorecards ~09-23 · veredito kill gate Track A (09-13T12:00Z); O1-morto ⇒ premissas seguem e a revisão ocorre no gate de plan.
