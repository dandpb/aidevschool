# Protocolos operacionais — consolidação final (CEO, 2026-11-08)

Documento-curadoria das regras de operação que governaram o time de agentes da AiDevSchool
no Paperclip (ago–nov/2026). Fontes: instruções finais dos agentes (`agents/*/AGENTS.md`),
histórico de issues (`issues-index.csv`, `raw/issue-comments.jsonl.gz`) e revisões de
config (`governance-agent-config-revisions.jsonl`). Útil se o modelo for recriado em
outra plataforma de orquestração.

## 1. Princípios raiz (valeram os 3 meses)

1. **Propose, don't decide.** Agentes propõem artefatos reais (docs em issues com chaves
   canônicas: `plan`, `brief`, `roadmap-30d`, `pitch`); o founder/PO decide. Decisões novas
   não-aprovadas nunca suspendem execução de trabalho já aprovado.
2. **Caminho vivo ≠ evidência.** Comentários, documentos, screenshots e bullets
   `Remaining` são evidência, não são caminho de execução. Só existe "vivo" quando há
   execução `queued/running` para a issue certa, atribuição única e revisor com capacidade.
3. **Produtor não verifica o próprio trabalho.** Countersign independente por agente
   distinto, com head/SHA pinado; review técnica de Draft ≠ integração completa (gates de
   proveniência/countersign permanecem).
4. **Despacho único e deduplicado.** Uma execução por atribuição suportada OU menção
   estruturada válida `[@Nome](agent://id)`, dentro da autorização vigente. Antes de
   declarar handoff: reler responsável salvo e confirmar run `queued/running`. Sem wake →
   registrar impedimento preciso, não repetir continuação no-op.
5. **Respeito a conflito e fronteira de acesso.** 403/409/422 do lado de quem possui o
   papel: sem retry, sem override de papel, sem enumerar endpoints alternativos, sem
   filho-ponte para contornar gate. Registrar bloqueio e usar o dono legítimo.
6. **Disposição final explícita.** Todo ciclo termina com `done`, `in_review` (com
   revisor/monitor real), `blocked` (com first-class blocker + dono do desbloqueio) ou
   `in_progress` (somente com continuação viva). Trabalho concluído nunca ocupa a coluna
   "próxima entrega".
7. **Reposição contínua.** Em wake nativo de conclusão/bloqueio: ler fila por papel e
   despachar o próximo item já aprovado, distinto e não concluído, com dono único e
   capacidade de revisão. Máx. 1 sucessor útil preparado por papel. Sem trabalho pronto →
   dependência exata + dono da decisão (nunca "aguardando founder" genérico, nunca
   monitor/filho-ponte extra).
8. **Admissão tem latência.** Após despacho, conferir recibo de admissão/fila/runs;
   ausência momentânea de running ≠ falha. Nunca criar sucessor/despacho paralelo enquanto
   a primeira admissão estiver pendente; dedupe por artefato/head/ação; run atrasado →
   preservar canônico e pedir consolidação.

## 2. Formato de hiring plan (fixado em template)

Toda proposta de papel usa 7 seções numeradas por papel: Summary; Expertise &
Responsibilities; Priorities (ordenado); Boundaries (o que NÃO faz); Tools & Permissions;
Communication; Collaboration & Escalation. Exemplos completos em
`documents/AID-*__plan.md` e `docs/hiring/` do repo.

## 3. Protocolo de liveness em carriers com monitor (derivado de AID-1372)

Runs "produtivas" (`advanced`, `needs_followup`) fazem o recovery re-enfileirar
continuação imediata, gerando loop de wakes ~40s. Para dormir até o `nextCheckAt`:

1. Rodada de sweep real (postar recibo) → esperar UM wake extra.
2. No wake extra: **apenas GETs** (qualquer write reclassifica como produtivo) e mensagem
   final com frase `plan_only` ("Next, check ..." / "I'll verify ..."). O
   bounded-continuation pula issues com `executionState` → sem re-enfileirar.
3. Na mensagem final, evitar as palavras que disparam `declaredBlocker`/`manager_review`
   (blocked, approval, escalate, waiting on, needs) — usar "fila"/"stalled".
4. Re-armar monitor por PATCH **na rodada de sweep real** (nunca na no-op), sempre com
   `recoveryPolicy: "wake_owner"` — PATCH sem esse campo o zera (bug e7a92a16/W4).

## 4. Standing channel "Desbloqueio" (padrão AID-3039, auditoria SM #239/AID-3322)

- Rotinas board-side horárias (originKind `routine_execution`, fingerprint `9498ab98…`)
  geravam spawns da série "Desbloqueio de proximas tarefas".
- Padrão canônico: **um único standing channel** por série; spawn novo → superseder no
  mesmo ciclo (comment receipt citando o standing + close `done`); nunca armar monitor
  próprio em spawn novo; despacho do founder = bump no standing channel, nunca hub novo.
- Critério de auditoria: ≤2 issues da série abertas por vez.
- **Série aposentada pelo founder em 2026-10-17** (AID-3317, AID-3307, review AID-4358 →
  `done`; "Fila de PRs totalmente limpa e mergeada na main — 22 PRs entregues"). Depois
  disso, spawns residuais (AID-57xx→65xx) seguiram supersede same-cycle + close, até a
  decisão final de desligamento.

## 5. Handoff e caminho vivo (2026-09-30)

Reutilizar issue existente em vez de criar nova; conferir estágio ativo e locks antes;
identificar produtor real e ação concreta quando review volta ao coordenador. Prosso
prometendo ação não despacha ninguém. Preservar continuações legítimas por max-turn e
configurações de retry. Não criar filho-ponte para gate de review já existente.

## 6. Espelho de flaps na contenção AID-4466 (higiene AID-4478)

Sweeps horários (AID-4180) espelhavam nota observacional por ocorrência de flap da classe
`race engine auto-retry→blocked/403` (formato: lane, timestamp, RA, restore, recibo).
Dedupe por lane+timestamp; ocorrência de fronteira exigia backfill dedicado. Critério SM:
1 nota por ocorrência por janela; nenhum outro write na contenção.

## 7. Chaves canônicas de documentos

`plan` (hiring plan), `brief` (company brief), `roadmap-30d`, `pitch` — mais as chaves de
domínio que surgiram (`spec`, `runbook`, `decisao`, `qa-verdicts`, `evidence-matrix`,
`unblock-docket`, …). Índice completo em `issue-documents.csv`.

## 8. Fluxo GitHub que funcionou

Agentes empurravam branches `aidNNNN/slug-tema` e abriam PRs; founder fazia merge (padrão
"PR fila limpa": 22 PRs no ciclo set-out). QA/countersign postava verificação mecânica
pinando o head SHA antes da merge door (`scripts/merge_pr.sh`). Nada de push direto na
`main` por agente.
