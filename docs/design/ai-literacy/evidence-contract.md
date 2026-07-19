# Contrato de evidência — trilha `ai-literacy`

A experiência preserva a separação entre **tentativa**, **feedback** e
**verificação**. Este contrato é próprio do bounded context AI Literacy: o
contrato de teaching games (`docs/design/teaching-game-contract.md`) não é
alterado até haver uma abstração comum comprovada.

## Progresso ≠ engajamento ≠ competência

| Conceito | Significado | Pode ser local? |
| --- | --- | --- |
| Progresso de experiência | telas vistas, lições iniciadas, posição atual, `completed` | sim |
| Engajamento | XP, sequência, meta diária, conquistas | sim |
| Competência verificada | habilidade demonstrada por evidência + verificador independente | **não** — nunca depende só da UI ou de um LLM |

O estado local pode registrar `completed` em uma lição. O termo `mastered` é
**reservado** a uma futura integração com verificador independente: não aparece
no conteúdo (o schema de lição proíbe), no estado local, na evidência nem em
analytics. Um desafio realmente aberto pode ser marcado como
`application_reported` — "aplicação concluída", não "competência dominada".

## Envelope: LiteracyEvidenceRecord

Emitido pela UI (ou pelo canal de teste) para **cada tentativa avaliada**:

```ts
type LiteracyEvidenceRecord = {
  schemaVersion: 1
  source: "literacydojo"
  attemptId: string
  lessonId: string
  lessonVersion: number
  activityId: string
  activityType: string            // um dos 7 tipos do content-contract
  skillIds: string[]
  deterministicChecks: Record<string, boolean | number | string>
  score: number                   // 0..1
  pass: boolean
  timestamp: string               // ISO 8601
  verifierRequired: true
}
```

Notas:

- `deterministicChecks` carrega somente resultados estruturados dos checks
  (ex.: `fieldsFilled: 4`, `betterOutputChosen: true`, `itemsCorrect: 6`) —
  nunca o texto livre da resposta.
- `verifierRequired: true` é literal e obrigatório: todo consumidor sabe que a
  evidência é bruta e ainda não passou por verificação independente.
- A lição declara sua política de evidência no bloco `evidence` do conteúdo
  (`verifierRequired: true`, `completionClaim: "lesson_completed" |
  "application_reported"`, `includesFreeText: false`), imposta pelo schema.

## Regras

1. **A UI emite evidência bruta e nunca promove domínio.** Nenhum caminho de
   código do app transforma tentativa em competência.
2. `mastered` é reservado a verificador independente (futuro); feedback
   generativo e verificação usam caminhos distintos, e o resultado de um LLM
   nunca substitui os checks determinísticos.
3. **Sem texto livre em analytics/evidência por padrão.** Quando necessário,
   registrar somente digest, categorias e resultado da rubrica.
4. Manter separados os três conceitos (progresso, engajamento, competência) em
   estado, eventos e telas — a tela de resultado distingue "lição concluída" de
   "competência verificada".
5. Em testes end-to-end, a evidência emitida deve ser capturada e validada
   contra este envelope (Fase 1, Playwright).
6. Estratégia para exercícios abertos: (1) resposta construída por campos
   estruturados sempre que possível; (2) checks determinísticos verificam
   presença, consistência e restrições; (3) feedback generativo pode explicar
   qualidade; (4) o LLM nunca substitui os checks; (5) desafio aberto vira
   `application_reported`, nunca `mastered`.

## Eventos de analytics propostos

O domínio não conhece ferramentas de analytics (adapter inicial:
`NoopAnalyticsSink`). Eventos propostos, todos **sem texto livre do usuário**:

| Evento | Quando dispara | Payload permitido (exemplos) |
| --- | --- | --- |
| `onboarding_started` | início do onboarding | — |
| `onboarding_completed` | fim do onboarding | contexto escolhido (categoria) |
| `lesson_started` | abertura de lição | `lessonId`, `lessonVersion` |
| `activity_attempted` | tentativa avaliada | `activityId`, `activityType`, `pass`, `score` |
| `hint_requested` | pedido de dica | `activityId`, `hintIndex` |
| `activity_passed` | atividade aprovada | `activityId`, tentativas até passar |
| `lesson_completed` | lição concluída | `lessonId`, `score`, duração real |
| `review_started` | início de revisão espaçada | `lessonId`, `intervalDays` |
| `review_completed` | fim de revisão | `lessonId`, `score` |
| `real_world_application_reported` | usuário relata aplicação real | `lessonId`, categoria da tarefa |

Esses eventos alimentam as métricas do plano (funil, aprendizagem, qualidade) —
em particular a norteadora: usuários que aplicam IA com sucesso em pelo menos
uma tarefa real por semana.
