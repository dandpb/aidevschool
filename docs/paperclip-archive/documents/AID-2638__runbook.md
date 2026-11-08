<!-- issue: AID-2638 | key: runbook | doc_id: 36a1e0fd-c95f-4fa8-b146-68d6aeae1940 | updated: 2026-09-20 11:42:10.662+00 -->

# RUNBOOK — Rotação do segredo CI PAPERCLIP_API_TOKEN (dandpb/aidevschool)

(AID-2638)

# RUNBOOK — Rotação do segredo CI `PAPERCLIP_API_TOKEN`

**Repo:** `dandpb/aidevschool` · **Gate consumidor:** job `SDLC guardrails (diff)` (AID-2318/AID-2428), resolver `scripts/sdlc_aid_resolve.sh` contra `PAPERCLIP_API_URL`.
**Owners:** founder/board minta a key e atualiza o secret (rotas de agente em `/api/board-api-keys` retornam 401/403 — by design). CEO verifica, agenda a próxima rotação e registra a receita. QA/FPE não tocam credenciais (AID-2635 §Desbloqueio).

**Key vigente:** mintada 2026-09-20T11:33Z · TTL 60d · **expira 2026-11-19T11:33Z** · secret `PAPERCLIP_API_TOKEN` atualizado às 11:33:34Z.

## Por que existe
Board API keys têm TTL 60d. O guard é fail-closed: token inválido ⇒ toda PR que cita AID- fica vermelha e o merge train para. Incidente AID-2635 (2026-09-20): 401 às 11:22Z no PR #514 → key reemitida 11:33Z → guard verde 11:34:06Z. **MTTR 12 min** com este fluxo.

## Gatilhos
1. **Agendado (canônico):** monitor da issue de rotação acorda o CEO **T-16d** antes do vencimento (próxima: 2026-11-03) → prompt ao founder → executar até **T-7d** (2026-11-12).
2. **Canário reativo:** guard vermelha com `Paperclip credentials rejected (HTTP 401)` no log do resolver — responder com este runbook imediatamente (não esperar agenda).
3. **Checagem manual:** `updated_at` do secret (GitHub API, proxy da emissão) + 60d = vencimento.

## Procedimento (~15 min)
1. **Founder — board UI:** API keys → criar/reemitir key nomeada `ci-sdlc-countersign-resolver`, TTL 60d. Copiar o JWT exibido (mostrado 1×).
2. **Founder — GitHub:** repo → Settings → Secrets and variables → Actions → atualizar `PAPERCLIP_API_TOKEN`. (Só tocar `PAPERCLIP_API_URL` se o endpoint público mudar de domínio; última atualização 2026-09-19T23:33Z.)
3. **CEO — verificação first-hand:** rerun do job `SDLC guardrails (diff)` na PR do corredor vigente (rerun-failed-jobs ou re-push) e conferir no log: linha `countersign citation accepted (AID-2318/AID-2428 gate)` + self-tests N/N PASS + conclusion `success`. Evidência de que o resolver autenticou (fail-closed garante falso-positivo impossível).
4. **Founder — hygiene:** revogar a key antiga na board UI (evitar keys sobrepostas ativas).
5. **CEO — fechamento:** receipt na issue de rotação (timestamps: secret `updated_at`, job id/attempt, linha do log) → criar a PRÓXIMA issue de rotação com monitor T-16d → fechar `done`.

## Regras
- Agente não minta key nem envie JWT por comment/commit — só secret do GitHub.
- Rotacionar cedo (T-7d mínimo); nunca no dia do vencimento.
- Founder sem resposta ao prompt em 3 dias ⇒ escalar via carrier "Desbloqueio de proximas tarefas" citando a janela e o deadline duro.
- Não multiplicar gates: 1 issue de rotação ativa por vez (SoT = a mais nova; supersede e fecha a anterior).

## Histórico
| # | Evento | Evidência |
|---|--------|-----------|
| 1 | 2026-09-18 — mint #1 + secrets criados (AID-2423/AID-2323) | guard verde no head `33a64f60` (PR #482, 42/42) |
| — | 2026-09-19 23:33Z — `PAPERCLIP_API_URL` atualizado (endpoint público) | secret `updated_at` |
| 2 | 2026-09-20 11:22Z 401 (AID-2635) → 11:33Z mint #2 → 11:34:06Z guard verde | job 106071403701 attempt 3, `countersign citation accepted … AID-2321 verdict 34a5c74b`, 41/41 PASS; PR #514 `mergeable_state: clean` |
| 3 | **Agendada:** janela 2026-11-03→11-12, expira 2026-11-19T11:33Z | issue filha de AID-2638 (monitor T-16d) |
