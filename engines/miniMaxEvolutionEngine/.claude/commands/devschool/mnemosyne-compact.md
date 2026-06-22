---
description: Compactação semanal da memória — dispara o subagent mnemosyne para arquivar handoffs >7d, rotacionar o núcleo curado, re-avaliar pegadinhas resolvidas, flagar skills órfãs. Use semanalmente (domingo, modo Pro) ou quando o event_log ficar >50k.
argument-hint: "(sem args)"
---

Estado da memória:
!`ls -la whiteboard/handoffs/ whiteboard/event_log/ 2>/dev/null | head -30 || echo "(sem whiteboard/)"`
!`du -sh whiteboard/ event_log/ learner/ 2>/dev/null || echo "(sem tamanhos)"`

Dispare o subagent **`mnemosyne`** (via Task) com `acao: compactar`. Passe a ele:
- `aluno_id` de `learner/learning_state.yaml`
- O caminho raiz do whiteboard (default `whiteboard/`)
- A data atual (para nomenclatura de arquivos: `events-<semana>.ndjson`, `archive/YYYY-MM/`)

Re-leia `engines/minimaxDojo/prompts/per_agent/mnemosyne.md` para as regras de compactação
semanal, rotação do núcleo curado (top-5 pegadinhas + top-5 skills ativas), promoção de Skill
(requer ≥3 usos sem regressão), e auditoria mensal.

Quando o `mnemosyne` retornar:
- Confirme que os arquivos foram movidos: `handoffs/U-NNN.* → archive/YYYY-MM/`, e
  `event_log/events-<data>.ndjson → event_log/events-<semana>.ndjson`.
- Se uma Skill foi promovida: notifique o aprendiz (Sêneca decide, esta é uma decisão
  consequente que abre SLA 24h).
- Apresente ao aprendiz um resumo do que mudou: handoffs arquivados, skills promovidas,
  pegadinhas rotacionadas.

Não promova Skills sem o consentimento de Sêneca — toda promoção é decisão consequente
(SLA 24h, default conservador = manter `versioned` por +1 ciclo).
