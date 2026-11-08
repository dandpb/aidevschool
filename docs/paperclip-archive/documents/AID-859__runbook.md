<!-- issue: AID-859 | key: runbook | doc_id: d9f561dc-3752-415e-813c-32a0e58c62df | updated: 2026-09-05 13:11:09.306+00 -->

# RUNBOOK — Gates temporais janela 21d O3-C1 sob contenção AID-814/823 (carrier in_progress/in_review + assignee agente + monitor one-shot)

(AID-859)

# RUNBOOK — Gates temporais da janela 21d O3-C1 sob a contenção AID-814/823

**Owner:** SDLC Scrum Master (ce84c27f), por ORDEM AID-858/A (AID-859).
**Vigência:** janela 21d O3-C1 (âncora AID-670; d+0 = 2026-09-02T17:16:03Z; saída d+21 = 2026-09-23T17:16Z).
**Estado verificado ao vivo:** 2026-09-05T13:1xZ (API first-hand; fontes citadas por issue/permalink).

Fontes primárias: Emenda A (AID-852 comentário 11:10:55Z; AID-832 comentário 01:07:44Z), Emenda B (AID-832 comentário 01:08:30Z), contenção do spin (AID-840 04:07Z; AID-852 11:15:58Z; AID-670 04:00:41Z), workaround §5 / repro (AID-823 doc `defect-report` + comentários 00:0xZ), contenção AID-814 (comentário 18:50:17Z), runbook do checkpoint (`checkpoint-d7-runbook` rev `604c8bba`, doc na AID-780), ledger (`janela-21d` rev `5665857a` + `baseline-d0`, docs na AID-670).

## 0. Restrições vigentes (não negociáveis)

1. **Nenhum watchdog** (task-watchdog) nesta árvore: removidos na contenção AID-814 (regressão AID-727 = loop de self-retrigger de stop fingerprint); **não rearmar** até fix upstream. Wake agendado = **monitor one-shot** somente.
2. **Monitor nunca em issue `blocked`** (bug AID-823: PATCH em `blocked` descarta o campo `monitor` silenciosamente — evidência AID-815 comentário `5ed9dbc3`). Carrier válido = `in_progress`/`in_review` **+ assignee agente**.
3. **`monitor` nunca na raiz do body** — zod strip silencioso (200 sem echo = write falhou). Sempre no caminho aninhado `executionPolicy.monitor`.
4. **Flips de status destroem monitores** (efeito AID-823): qualquer mudança de status + arme de monitor tem que ser **um PATCH atômico único**.
5. Sem conteúdo/código; sem merges (single-writer main = CEO); métricas só de superfícies existentes; hipóteses, nunca claim; não tocar issues de outros agentes (boundary por atribuição).

## 1. Arme do monitor (Emenda A — primeira ação de qualquer run num gate)

**1.1 Regra:** a criação da issue NÃO grava monitor (comportamento conhecido, AID-832). Toda run que acorda um gate/carrier começa garantindo o monitor armado, antes de qualquer disposition.

**1.2 Quem arma:** a run **detentora do checkout** da issue. PATCH vindo de outra run toma **409 `Issue run ownership conflict`** (observado: AID-840 04:03Z; Emenda A AID-852 — issue com execution run próprio `3df92a1f`; AID-832 01:07Z). Se tomou 409: não insistir; registrar e deixar o arme para a run dona (ou o próximo wake dono do checkout).

**1.3 Body canônico (copiar e preencher):**

```
PATCH /api/issues/{carrier-id}
{"executionPolicy":{"monitor":{
  "nextCheckAt":"<gate ISO 8601 UTC>",
  "notes":"<gatilho + protocolo idempotente resumido + referências ao runbook/ledger>",
  "scheduledBy":"board",
  "recoveryPolicy":"wake_owner"
}}}
```

- `recoveryPolicy: wake_owner` acorda o **assignee** → carrier tem que ter `assigneeAgentId` = agente (aqui: CEO `501cb456`).
- Se o carrier precisa mudar de status (ex.: repouso `in_review`), incluir `"status"` **no mesmo PATCH** (atomicidade, regra 0.4).

**1.4 Re-GET de verificação (obrigatório, sempre):**

```
GET /api/issues/{carrier-id}
```

Confirmar **os DOIS campos**:
- `monitorNextCheckAt` (e `executionState.monitor.status = "scheduled"`) = alvo pretendido;
- `assigneeAgentId` = agente esperado (o sweep AID-851 flagrou `assigneeAgentId` silenciosamente dropado nas carriers AID-832/AID-814).

**Regra §5 AID-823: HTTP 200 sem echo = write FALHOU** — reabrir o PATCH (caminho aninhado, carrier em `in_progress`/`in_review`). Em carrier `blocked` o caminho aninhado corretamente rejeita com 400 explícito ("Monitor can only be scheduled on issues assigned to an agent in in_progress or in_review") — nesse caso o carrier errado, não o body.

**1.5 Recovery actions:** se a plataforma abrir recovery (ex.: auto-flip `in_progress`→`blocked` "no live execution path", observado 13:04:16Z em AID-840/AID-852), resolver com

```
POST /api/issues/{id}/recovery-actions/resolve
{"outcome":"restored"|"false_positive","sourceIssueStatus":"<status real>"}
```

e restaurar o carrier ao repouso `in_review` + monitor (PATCH atômico). Não deixar recovery ativa.

## 2. Regra do carrier (onde o gate "mora")

| Requisito | Valor |
|---|---|
| Tipo | gate token de primeira classe (child da issue que protege), sem trabalho próprio |
| Status de repouso | **`in_review` + monitor one-shot** (o monitor É o caminho de review — disposição contratual "in_review com monitor"; padrão aceito na contenção do spin AID-727, provado em AID-840 04:07Z, AID-852 11:16Z, AID-832 01:14Z) |
| `in_progress` | **só durante a janela ativa de execução** (o detector `issue_continuation_needed` — regressão AID-727 — spinna carrier `in_progress` em ~4 wakes/min mesmo com rodadas zero-mutation; e a auto-recovery a flipa para `blocked`) |
| `blocked` | **proibido como carrier** (descarta monitor, AID-823); válido apenas como descanso de âncora atrás de gate token estruturado (padrão AID-670 ← AID-840) |
| Assignee | sempre agente (CEO `501cb456`); assignee vazio = monitor inválido + orphan-blocker flip-flop (AID-810 18:20Z) |
| Condição única de fechamento | `now(UTC) >= <gate>` — nunca antes |

## 3. No-op pré-gate (Emenda A padrão)

Acordou **antes** do gate (`now < gate ISO`):

1. Re-GET barato: monitor `scheduled` + `nextCheckAt` intacto + `assigneeAgentId` ok.
2. Se intacto → **zero mutação**: ack de 1 linha (ou silêncio, se o último ack cobre a sequência — regra anti-spam AID-670 receipt `d6622650`), sem comentário extra, sem PATCH, sem scan.
3. Se quebrado → rearmar por §1 e só então fechar a rodada.
4. **Nunca** executar passos do protocolo, publicar checkpoint, fechar tokens ou mudar disposition antes do gate — protege a integridade da janela de métricas 21d (d+0→d+21) e a leitura anti-duplicação dos marcadores.

## 4. Execução no gate (idempotente — ordem fixa)

**Princípio: reconcile primeiro; executar só o que falta; receipt; fechar tokens; armar o próximo gate.**

**4.1 Reconcile (anti-duplicação):** procurar o marcador pós-gate — comentário com `CHECKPOINT d+7` na AID-670 (formato espelha o d+1: seções 1–5), linha d+7 do ledger `janela-21d`, receipt na AID-780. Se já existe → reconciliar aderência ao protocolo (ledger §Método por checkpoint), comentar apenas se faltar algo, pular para 4.4.

**4.2 Executar só o que falta** — runbook `checkpoint-d7-runbook` rev `604c8bba` (doc na AID-780):
1. Scan P1/P2 abertos nas C1 l01–l07 (board completo; baseline d+1 = zero).
2. CI no pin `4c2aeb7` (check-runs GitHub; baseline d+1 = verde 36/36 = 35 success + 1 skipped; `main` avançar não é defeito C1).
3. Cadeia pós-promoção: AID-657/AID-667 `done` + PR #249 (só não-regressão).
4. Métricas só de superfícies existentes (tentativas/pass das 13 atividades l01-a2/a3…l07-a2/a3; conclusão de revisões; abandono E1 = **N/A-sem-canal**, nunca inferir; funil OP-B direcional se ativo; síntese UX AID-641 se publicada). Regra de honestidade: tendência reportada só com dado real em ambos os extremos; N/A no d+1 e sem dado no d+7 → veredito "N/A — sem canal", nunca "estável".
5. P1/P2 novo em C1 a qualquer momento → follow-up imediato de defeito (dono FPE `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`), sem esperar d+21.
6. Publicar comentário `CHECKPOINT d+7` na AID-670 + atualizar ledger `janela-21d` (linha d+7 + seção estado entre checkpoints).

**4.3 Receipt:** feito/reconciliado + permalink do comentário do checkpoint + veredito curto de tendência d+1→d+7 por métrica (subiu/estável/caiu/N/A-sem-canal) — insumo do go/no-go O3-C2.

**4.4 Fechar tokens — SOMENTE em/após 2026-09-09T17:16:03Z, nesta ordem (folha → raiz):**

```
AID-810 → AID-802 → AID-782 → AID-780
```

`done` em cada um; no fechamento da AID-780 incluir `resume: true` no payload do comentário (comentário genérico em issue fechada é inerto). Chain: AID-780 (ORDEM SD checkpoint d+7) ← AID-782 ← AID-802 ← AID-810 (terminal, dormante por design).

**4.5 Armar o próximo gate da cadeia** (re-arme em 3 fases, notas da carrier AID-840): no d+6 arma-se o token d+7; no fechamento do d+7 arma-se o d+21 (2026-09-23T17:16Z, saída §6). Usar §1 (carrier novo ou monitor na âncora liberada, nunca `blocked`, nunca watchdog).

**4.6 Pós-GO:** dispatch O3-C2 (AID-838; acatar confirmation pendente `02abea83`, senão criar confirmation fresca; acatar resposta da ask `36cf8ba8`/AID-849 se houver). **O3-C2 NÃO liberado** até C1 sustentar + evidência OP-B (spec AID-644 §8.7).

**4.7 Saída d+21 (§6 ledger):** A1–A8 verdes + zero P1/P2 nas C1 → veredito ao board → âncora `done`; senão → follow-up com dono nomeado → `blocked` (unblock owner = dono).

## 5. Mapa dos 3 gates restantes (estado verificado 2026-09-05T13:1xZ)

| Gate | Gatilho (UTC) | Dono | Wake primário (vivo, verificado) | Wakes redundantes (vivos) |
|---|---|---|---|---|
| **d+6** | **2026-09-08T17:16:00Z** | CEO | Carrier **AID-840** `in_review` + monitor `scheduled` → 17:16:00Z (`scheduledBy assignee`, assignee CEO; zero recovery ativa) | (1) rotina founder `c68a1d61` (horária `0 * * * *` America/Sao_Paulo, trigger `5f539db9` enabled, nextRunAt 14:00Z hoje) — primeiro wake **em/após** o gate executa o sweep **AID-815** (protocolo manual d+6; 1ª janela útil 18:00Z de 09-08); (2) qualquer comentário/interação nas threads AID-840/AID-670 |
| **d+7** | **2026-09-09T17:16:03Z** | CEO | Carrier **AID-852** (CEO BACKSTOP) `in_review` + monitor `scheduled` → **17:20:00Z** `recoveryPolicy wake_owner` → acorda o CEO 4min pós-gate; protocolo completo na própria descrição | (1) FASE 1 do d+6 (AID-840) arma o token d+7 conforme runbook `604c8bba`; (2) rotina founder `c68a1d61` (sweep diário vê os tokens); (3) passo 4 do protocolo AID-815 (fecho dos tokens em/após 17:16:03Z) |
| **d+21** (saída §6) | **2026-09-23T17:16Z** | CEO (âncora **AID-670** `blocked` atrás de AID-840) | **Nenhum monitor agendado ainda — por design é armado no fechamento do d+7** (cadeia de re-arme, §4.5). Não é gap: enquanto isso valem os redundantes | (1) rotina founder `c68a1d61` horária — precedente de ORDEM manual espelho AID-739/B → AID-741 se nenhum carrier disparar; (2) comentário/interação na AID-670 |

Checagem rápida de sanidade antes de cada gate (≤2 min): `GET` carrier (monitor + assignee), `GET /api/issues/{id}/recovery-actions` (zero ativas), rotina `c68a1d61` viva (`GET /api/routines/c68a1d61-9f96-4e86-9605-8ab9857d7b44`).

## 6. Riscos conhecidos e mitigações

| Risco | Sintoma (evidência) | Mitigação |
|---|---|---|
| **409 run ownership** | PATCH de arme de run não-dona: `Issue run ownership conflict` (AID-840 04:03Z; AID-852 Emenda A; AID-832) | Armar só pela run detentora do checkout; senão registrar e adiar para o próximo wake dono; nunca "forçar" re-PATCH em loop |
| **403 boundary por atribuição** | Ator não consegue comentar/criar interaction em issue de outro agente — 403 "outside this actor's authorization boundary" (Emenda B, AID-832, UX `0bfa47c1`) | Child **RELAY** assignee = agente dono da lane, com protocolo verbatim; fallback (relay sem despacho ~30min): card `request_confirmation` na própria thread, mesmo idempotencyKey |
| **PATCH em `blocked` descarta monitor** | 200 silencioso, `monitor: null` (AID-823; `5ed9dbc3`) | Carrier sempre `in_progress`/`in_review`; âncora descansa `blocked` atrás de gate token; PATCH atômico status+monitor; re-GET §1.4 |
| **`monitor` na raiz do body é stripado** | 200 sem echo, campo some (zod strip — repro AID-823 §3) | Só caminho aninhado `executionPolicy.monitor`; 200-sem-echo = falhou |
| **`assigneeAgentId` dropado** | Carrier sem assignee → monitor inválido (sweep AID-851, carriers AID-832/AID-814) | Re-GET confirma os DOIS campos (§1.4) |
| **Spin do detector AID-727** | Carrier `in_progress` acordada ~4x/min com rodadas zero-mutation (AID-670 03:5xZ; AID-840 04:0xZ; AID-852 11:1xZ) | Repouso `in_review` + monitor; rodadas idle = zero mutação; anti-spam (sem comentário redundante) |
| **Auto-recovery flip para `blocked`** | "retry made progress, but still has no live execution path" (13:04:16Z, AID-840/852) | Resolver recovery (§1.5) + restaurar repouso `in_review` + monitor atômico |
| **Watchdog rearmado por engano** | self-retrigger loop (AID-814; períodos 9.5h→3m) | Watchdogs seguem deletados; deleção só por run CEO de escopo normal (runs watchdog-scoped levam 403/409) |
| **Wake perdido (nenhum caminho dispara)** | checkpoint em atraso sem marcador | Rotina founder horária é redundância permanente; P1/P2 em C1 escala imediatamente ao FPE `fa8130d5`; registro do atraso no ledger (precedente: d+1 manual via AID-739/B → AID-741) |

## 7. Ponteiros (não re-escavar)

- Runbook do checkpoint d+7: doc `checkpoint-d7-runbook` rev `604c8bba` (issue AID-780).
- Ledger da janela: docs `janela-21d` (rev `5665857a`) + `baseline-d0` (issue AID-670).
- Checkpoint d+1 (formato + baseline numérico): comentário AID-670 2026-09-03T18:12Z; receipt AID-741 `742a8051`.
- Bugs de plataforma: AID-814 (self-retrigger watchdog; contenção 18:50Z) · AID-823 (PATCH blocked; repro + patch proposto no doc `defect-report`) · relay upstream = card founder `97f3b5d6`.
- Precedente de carrier/backstop: AID-832 (gate 12:05Z executado e fechado `done` 12:08Z — padrão provado em produção).
- Este runbook: doc `runbook` (issue AID-859). Mudanças aqui = nova revisão + comentário na AID-859 apontando o que mudou (auditoria SDLC: artifact chain visível).
