# Procedência do pipeline e fronteira do tutor MVP

> Build this with **tlc-implement**. Cada critério vira prova nomeada; questões
> abertas não são autorização para inventar comportamento.

## Intent

O campo `phase` não distingue avanço por checklist de avanço após verificação
independente. O tutor MVP usa `MASTERED`, gates e revisões com significado
diferente da jornada canônica. Operadores precisam interpretar esses estados
sem atribuir uma autoridade que a origem não possui; custo em horas não medido.

Registrar procedência dos avanços existentes e documentar a fronteira do MVP.
O usuário aceitou as duas recomendações e pediu implementação em 2026-09-14:
“do the recomendations actoin and than tlc-implement”.

10 critérios em 3 slices · 1 contrato persistido · 0 abertas.
Uma tarefa: as duas decisões foram aceitas juntas; não há dependência externa
nem necessidade de implantação intermediária. Tamanho segue o default tlc-plan,
não uma inferência sobre tamanho de PRs no histórico.

## Criteria

### S1 — Avanços identificáveis, compatíveis com o legado

1. Arquivo legado sem procedência carrega com `grade: unspecified` e
   `advanced_by: ""`, sem reescrever o arquivo ao ler.
2. Cada avanço de checklist persiste `grade: simulate` e
   `advanced_by: openclaw-checklist`, mantendo as fases e espelhamento atuais.
3. O override CLI `--phase` persiste `grade: simulate` e
   `advanced_by: openclaw-cli-override`, mesmo quando não há steps posteriores.
4. O supervisor, após PASS independente e autorização durável, persiste
   `grade: verified` e `advanced_by: mme-supervisor` no tracer autônomo existente;
   o digest autorizado corresponde exatamente aos bytes persistidos.
5. Ao gravar sequencialmente simulate e verified, a leitura retorna a procedência
   da última gravação. Valores de grade fora de `simulate|verified|unspecified`
   são rejeitados; grades declarados requerem `advanced_by` não vazio.

### S2 — Operador consegue interpretar a procedência

6. A saída normal do CLI e o briefing SessionStart mostram `grade` e
   `advanced_by`; o briefing declara que `simulate` e `unspecified` não substituem
   `verified` quando este é exigido, mantendo a execução somente leitura.
7. O contrato PhaseRunner exige que o orquestrador registre `verified` e seu
   comando após PASS independente. Instruções dos produtores não autorizam
   registro de fase apenas porque produziram o artefato. O modo simulate permanece.
8. As gravações programáticas passam por `save_status`; o digest planejado usa
   a mesma serialização do writer. Falha de verificador não altera fase/procedência.

### S3 — Leitor distingue o resultado do MVP da jornada canônica

9. O mapa de contextos registra três colisões: `MASTERED` do ledger MVP versus
   mastery canônica; gates G1–G4 versus learning/empirical gate; revisão gap-ladder
   versus FSRS canônico e revisão local LiteracyDojo.
10. O README do MVP e os glossários da jornada/ciclo explicitam essas autoridades;
    o MANIFEST aponta os contratos e provas. Nenhum runtime, currículo ou ledger
    do MVP é migrado por este trabalho.

## Out of scope

- Convergência do MVP, novo gate de aprendizagem ou alteração de seus critérios.
- Split de analytics/evidência/host, mudança no emissor, UI ou contrato dojoToday.
- Lock global, compare-and-swap entre todos os writers, auditoria histórica de
  cada transição ou promoção de dados legados para verified.
- Mudança de fases, autonomia além de spec, preview-only, deploy, push ou dados reais.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| CLI normal | Acrescenta procedência ao relatório; flags/defaults permanecem | 3, 6; existing argparse |
| CLI preview | Formato, exit codes e ausência de escrita permanecem | existing preview_checklist |
| CLI falha | ERROR em stderr, código 2 para corrupção; sem relatório de sucesso | existing handler + 5 |
| SessionStart | Exibe procedência e limite da recomendação; não executa fase | 6 |
| YAML | Enum fechado, writer nomeado, leitura legada sem backfill | 1–5 |
| Contratos e glossários | Tabelas existentes, linguagem de domínio, limites explícitos | 7, 9, 10 |

## Swept

- validation: 1, 5.
- failure modes: 8; existing rollback dos dois arquivos no Scheduler.step.
- idempotency and retry: existing reescrita atômica e outbox/ledger do supervisor;
  procedência não é chave de idempotência.
- authorization: 4, 7, 8; existing learning gate, PASS e autorização durável.
- concurrency and ordering: 5 prova sequência, não concorrência; existing
  compare-and-advance/lease do supervisor; lock global fora de escopo.
- data lifecycle: 1; sem migração de ledger, reviews ou snapshots.
- external-dependency failure: existing limites/falhas do executor autônomo;
  nenhuma dependência externa nova.
- state transitions: 2–4, 8; todas as fases preservadas.
- observability: 6; novos campos descrevem última gravação, não prova criptográfica.

## Impact

| Front | What changes |
| --- | --- |
| domain | `grade`: classe do avanço de pipeline, independente de mastery |
| domain | `advanced_by`: executor/comando que registrou o avanço |
| domain | `phase`: mesma fase, agora interpretada junto à procedência; consumidores: os_adapter, PhaseRunner, supervisor |
| domain | `MASTERED`, gate, review: significados do MVP explicitamente limitados ao ledger próprio |
| stored data | Campos aditivos; legado lido como unspecified; nenhum backfill |

## Decided

| Decision | Shape | Alternative rejected |
| --- | --- | --- |
| Procedência publicada | `grade: simulate|verified|unspecified`, `advanced_by: string`; legado unspecified/empty; writers novos nomeados | PASS-only: removeria o modo simulate que o usuário decidiu preservar |

## Sources

- Conversa 2026-09-14: recomendações “preservar os dois modos e registrar a
  procedência” e “documentar a fronteira e preservar os dois modelos”; aceite
  literal citado em Intent. Autoriza plano, implementação e commits locais.
- `.tasks/pipeline-write-authority.md` no checkout de origem: critérios 1–7 e
  campos propostos; a decisão aberta foi fechada pelo aceite acima.
- `.tasks/evidence-kernel-boundaries.md` no checkout de origem: apenas colisões
  do MVP; split de pacotes e convergência não foram aceitos neste recorte.
- Correções de fonte após grounding: BENCHMARK_DONE espelha OPTIMIZE, não
  cycle-complete; `_PHASE_MAP` é local a Scheduler.step. O supervisor possui
  lease/compare-and-advance, embora não exista lock comum a todos os writers.
  `save_status` já é o writer; `_status_bytes` duplica sua serialização para
  digest, não grava YAML por conta própria. Estas correções substituem as
  descrições inexatas da tarefa anterior e não alteram as fases.
- `AGENTS.md`, `REVIEW.md`, instruções dos dois engines e ADR-0002.

## Unresolved

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| | | None | |
