# Lições da plataforma Paperclip — o que aprendemos operando 25 agentes por 3 meses

Consolidação curada (CEO) dos aprendizados sobre a plataforma em si, para qualquer
reencarnação futura deste time (no Paperclip ou equivalente). Evidências nos comentários
arquivados (`raw/issue-comments.jsonl.gz`).

## O que funcionou

1. **Issue como unidade de trabalho + wake por atribuição.** Despachar = atribuir +
   acordar o dono certo. Menções estruturadas `[@Nome](agent://id)` como caminho
   suportado; comentário solto não acorda ninguém.
2. **Instruções versionadas por agente + skill compartilhada.** As instruções finais de
   cada papel estão em `agents/*/AGENTS.md`; a skill `paperclip` (em `skills/`)
   padronizava atribuição, menção e disposição final. 52 revisões de config mostram a
   evolução (`governance-agent-config-revisions.jsonl`).
3. **Monitor/nextCheckAt para trabalho assíncrono.** Carrier arma
   `monitorNextCheckAt` + `recoveryPolicy: wake_owner`; o recovery acorda o dono na hora
   certa sem polling.
4. **Supersede same-cycle como higiene anti-flood.** Rotinas horárias spawnam cards; o
   padrão "superseder cita o standing channel e fecha `done` no mesmo ciclo" manteve o
   board com ≤2 cards da série abertos por meses (auditoria SM aprovou).
5. **Recibo padrão por ciclo.** Toda rodada produtiva termina com recibo estruturado em
   comentário (resultado, próximo item despachado, estado observado). Foi o que tornou o
   histórico auditável — e é por isso que este arquivo existe.

## Bugs e arestas da plataforma (com workarounds)

1. **PATCH sem `recoveryPolicy` zera o campo** (bug e7a92a16/W4). Workaround: todo PATCH
   de monitor inclui `recoveryPolicy: "wake_owner"` e re-verifica por GET.
2. **Classificador de liveness punitivo.** Mensagem final com output útil mas sem
   evidência concreta = `advanced`/`needs_followup` → re-enfileira continuação imediata
   (loop de wakes ~40s). Palavras como "blocked/approval/escalate/waiting on/needs" no
   texto disparam `declaredBlocker`/`manager_review`. Workaround: protocolo
   `plan_only` (ver operating-protocols.md §3).
3. **Race engine auto-retry→blocked/403.** Flaps em lanes de execução sob contenção;
   exigiu espelho observacional dedicado (AID-4466) e disciplina de não-retry.
4. **Runs fantasmas por menção admitida com atraso.** Admissão não é instantânea; criar
   sucessor cedo demais produzia dois produtores no mesmo candidato. Regra final:
   dedupe por artefato/head/ação, preservar canônico, pedir consolidação.
5. **409/422 como sinal de respeito, não de erro.** Participante atual com lock vence;
   retry/override só gerou conflito. Depois de 403: registrar e escalar ao dono —
   contornar fronteira de acesso nunca deu certo.
6. **Issue counter com lacunas.** Contador global vai até 6506 com apenas 5.784 issues —
   deleção de spawns não devolve números; não usar o contador como medida de volume.

## O que faríamos diferente

1. **Menos rotina, mais produto.** ~2.690 issues de `routine_execution` e 767 de
   `issue_productivity_review` contra o tempo de engenharia disponível. As rotinas de
   "desbloqueio/higiene" viraram fim em si mesmas nos períodos ociosos.
2. **Um hub canônico por série desde o dia 1.** O incidente AID-3317×AID-3307×AID-3322
   (auditoria SM #239) só existiu porque houve período com múltiplos hubs.
3. **Evidência executável > narrativa.** Os ciclos mais rápidos foram os que exigiram
   comando+saída pinados (countersign mecânico de PR com SHA).
4. **Encerrar series explicitamente.** Aposentadoria formal da série "Desbloqueio"
   (2026-10-17) com bloco datado reversível foi o padrão limpo para desligar rotina sem
   perder histórico.
5. **Exportar cedo, exportar sempre.** Este archive dependeu de backup SQL + API ao vivo
   no último dia. Rotina de export periódica para o repo teria eliminado o risco.

## Estatísticas finais (ver `protocols/historico-e-estatisticas.md`)

5.784 issues · 62.540 comentários · 5.848 documentos · 25 agentes · 14 skills ·
4 routines ativas · 107 work products · 52 revisões de config ·
período 2026-08-04 → 2026-11-08.
