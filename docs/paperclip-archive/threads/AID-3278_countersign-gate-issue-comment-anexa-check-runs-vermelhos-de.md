# AID-3278: countersign-gate (issue_comment) anexa check-runs vermelhos de OUTROS PRs ao HEAD da main — ruído cross-PR nos receipts de push-run

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** Platform & CI Engineer | **Created:** 2026-09-28T22:30:29.080826+00:00 | **Updated:** 2026-10-19T19:32:22.472+00:00
- **ID:** `67f559eb-9048-452e-a7a3-9e499fbd4145`

## Description

Achado da triagem AID-3272 (pós-merge PR #604, observado 2026-09-28T22:26Z).

## Problema
O workflow `countersign-gate.yml` com gatilho `issue_comment` roda no head da main e resolve o PR a partir do comentário. Runs disparados por comentários em PRs antigos/abertos (ex.: PR #547) ficam com `head_sha` = HEAD da main, então o check-run vermelho aparece na lista de checks do commit de main e contamina o receipt de push-run de merges não relacionados.

Evidência: run 36492377134 (event=issue_comment, PR=547, head_sha=a02b1833) marcou `countersign-gate failure` no HEAD da main 4 min após o merge do PR #604; o padrão já ocorria no commit anterior 8390e913 antes do merge (failures 22:08:45Z/22:17:02Z). O comentário guard de #547 que disparou o run das 22:26:13Z foi deletado em seguida, mas o check-run vermelho persiste no head.

## Impacto
- Receipts de push-run leem como vermelho por causa de atividade não relacionada.
- Risco de dessensibilização: vermelho esperado (gate real) vs ruído fica indistinguível sem investigar o evento.

## Ação sugerida (Platform & CI)
Avaliar: (a) ignorar/rotular runs issue_comment que resolvem para PR ≠ merge do commit; ou (b) fixar o check-run no head do PR alvo, não no head da main; ou (c) documentar no protocolo de receipt como filtrar por event.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3278 — countersign-gate (issue_comment) anexa check-runs vermelhos de OUTROS PRs ao HEAD da main — ruído cross-PR nos receipts de push-run
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 782f5494-eb79-44aa-9259-76ad1f16e594
- Agent: Platform & CI Engineer (opencode_local)

## Objective

Achado da triagem AID-3272 (pós-merge PR #604, observado 2026-09-28T22:26Z).

## Problema
O workflow `countersign-gate.yml` com gatilho `issue_comment` roda no head da main e resolve o PR a partir do comentário. Runs disparados por comentários em PRs antigos/abertos (ex.: PR #547) ficam com `head_sha` = HEAD da main, então o check-run vermelho aparece na lista de checks do commit de main e contamina o receipt de push-run de merges não relacionados.

Evidência: run 36492377134 (event=issue_comment, PR=547, head_sha=a02b1833) marcou `countersign-gate failure` no HEAD da main 4 min após o merge do PR #604; o padrão já ocorria no commit anterior 8390e913 antes do merge (failures 22:08:45Z/22:17:02Z). O comentário guard de #547 que disparou o run das 22:26:13Z foi deletado em seguida, mas o check-run vermelho persiste no head.

## Impacto
- Receipts de push-run leem como vermelho por causa de atividade não relacionada.
- Risco de dessensibilização: vermelho esperado (gate real) vs ruído fica indistinguível sem investigar o evento.

## Ação sugerida (Platform & CI)
Avaliar: (a) ignorar/rotular runs issue_comment que resolvem para PR ≠ merge do commit; ou (b) fixar o c
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `782f5494-eb79-44aa-9259-76ad1f16e594` finished with status `succeeded` at 2026-10-19T19:32:39.585Z.
- Gate PASS, but main moved once more (behind=1) — the citation is stale again. QA responds in ~5-7 min; my monitor cadence (~20 min) is the bottleneck. Executing iteration 4 with a tighter monitor (+12 min) to compress the race window.

**PR #706 was already MERGED** — `origin/main` HEAD is `d46d1a80` "Merge pull request #706" (19:15:13Z, 3 min after QA's citation, before my monitor woke). The "behind: 1" was the merge itself. Verifying who/how it merged and whether it went through the door.

The merge went **through the door properly** (Daniel via `scripts/merge_pr.sh`: live gate PASS, citation `7f834b07`, head pinned, parents prove branch was current). Now the post-merge obligations — starting with the push-run receipt on main HEAD `d46d1a80`, which is exactly what this issue was about.

46 success / 2 skipped / 1 failure — and **both `countersign-gate` comment-tier runs on main HEAD are GREEN** (the exact class that used to redden main). Identifying the 1 failure and pulling the emitted verdicts for the receipt.

Production proof of the fix, first-hand: the green comment-tier run on main HEAD `d46d1a80` evaluated **PR #721** (a different PR — the exact cross-P
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`
- `.github/workflows/countersign-gate.yml`
- `scripts/countersign_gate_check.py`
- `scripts/sdlc_aid_resolve.sh`
- `scripts/sdlc_guard_check.sh`
- `.github/workflows/merge-msg-gate.yml`
- `scripts/merge_msg_check.py`

## Commands Run

- Heartbeat run `782f5494-eb79-44aa-9259-76ad1f16e594` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Interaction [request_confirmation] Decidir plano anti-ruído cross-PR do countersign-gate em commits de main — AID-3278 (expired)

Diagnóstico entregue (comment 8e1e30f9): TODO countersign-gate em commit de main vem de runs issue_comment de PRs alheios (18 vermelhos em 7 HEADs só em 2026-09-28), e o tier 'autoritativo' nunca escreve no head do PR (proteção pretendida inerte). Decidir: aprovar Fase 1 (docs/receipt) e Fase 2 = (b3) postar veredito via Checks API no head do PR com nome distinto + job neutral [recomendado], ou (a2) apenas silenciar o tier (log-only), ou manter só Fase 1.

## Comments (22)

**founder** · 2026-09-30T19:39:21.296669+00:00

Despacho autorizado — Platform & CI Engineer: executar uma única investigação delimitada, somente leitura, sobre o ruído cross-PR descrito neste item. Preservar o título, a descrição e toda a evidência existente.



Entregável aqui em AID-3278: (1) matriz verificável de event, PR alvo, head\_sha, run/check URL, timestamp e conclusão, incluindo o caso run 36492377134 / PR 547 / a02b1833 e um controle de push/merge não relacionado; (2) diagnóstico do mecanismo que vincula o check ao SHA errado e distinção entre gate real e ruído; (3) comparação das opções já descritas: filtrar/rotular issue\_comment, vincular o check ao head do PR alvo, ou filtrar por event no protocolo de receipt; (4) um plano candidato concreto com arquivos/contratos afetados, riscos, critérios positivos e negativos, evidência de aceitação e decisão necessária. Se a evidência histórica não estiver mais acessível, registrar o limite e a fonte disponível sem inventar recibos.



Limites deste despacho: não alterar código, workflows, segurança, guards de CI, approvals, agentes/modelos ou rotinas; não executar bypass, merge, publicação, novos tickets ou agendamentos. Não reabrir Docs AID-3067, mapeamento AID-3497 nem duplicar AID-3453/PR 616. Não repetir QA já concluído ou fazer polling sem nova evidência.



Publicar os achados e as fontes neste item, explicitar qualquer bloqueio, e encerrar a execução ao entregar o diagnóstico. A disposição deverá ser In Review, aguardando decisão sobre o plano; não declarar o defeito corrigido ou marcar Done apenas pelo diagnóstico. Se não houver acesso à evidência essencial, usar Blocked com o bloqueio concreto. Trabalho de implementação precisa de autorização posterior.

**Platform & CI Engineer** · 2026-09-30T19:44:58.880479+00:00

**Entrega do despacho (comment 805b6c8f): investigação delimitada, somente leitura — matriz, diagnóstico, opções e plano candidato. Nenhum código/workflow foi alterado.**

## 1. Matriz verificável (first-hand, APIs GitHub, janela 2026-09-28)

### Main HEAD `a02b18334fda0336ceccfd4f9d2529fb3351752a` (= merge commit do PR #604, committer 22:22:00Z; parents `8390e913` + `7def2c99`)

Todos os 5 check-runs `countersign-gate` neste commit vêm de runs `issue_comment`; **nenhum** pertence ao PR #604:

| # | check-run | started_at (UTC) | run | event | PR avaliado | resultado / razão (log do job) |
|---|---|---|---|---|---|---|
| 1 | failure | 22:26:19Z | [36492377134](https://github.com/dandpb/aidevschool/actions/runs/36492377134) | issue_comment | **547** | FAIL §7: VOID/HELD pós-citação (comentário guard 22:26:13Z, deletado em seguida) |
| 2 | failure | 22:29:56Z | [36492680464](https://github.com/dandpb/aidevschool/actions/runs/36492680464) | issue_comment | **547** | FAIL §3: pin stale — head do 547 movido p/ `30c4c3de…` |
| 3 | success | 22:34:53Z | [36493221306](https://github.com/dandpb/aidevschool/actions/runs/36493221306) | issue_comment | 547 | PASS |
| 4 | failure | 22:37:10Z | [36493452511](https://github.com/dandpb/aidevschool/actions/runs/36493452511) | issue_comment | **605** | FAIL §1: sem citação (PR #605 aberto 22:27:48Z, regrant) |
| 5 | success | 22:38:33Z | [36493588985](https://github.com/dandpb/aidevschool/actions/runs/36493588985) | issue_comment | 547 | PASS |

**Controle (push-run do merge, não relacionado):** o push do merge gerou o run `36491949848` (ci.yml, started 22:22:07Z) — todos os jobs success exceto `product readiness (claims)` (falha pré-existente, alheia ao gate). O evento push **não gera** check-run `countersign-gate`; os 3 vermelhos acima são atividade dos PRs #547/#605 4–15 min após o merge — exatamente a contaminação descrita.

### Main HEAD anterior `8390e9139a138707fd484797022dce4ec46fdf43`

| check-run | started_at | run | event | PR avaliado | razão |
|---|---|---|---|---|---|
| failure | 20:00:10Z | [36476072036](https://github.com/dandpb/aidevschool/actions/runs/36476072036) | issue_comment | **604** | FAIL §5 produtor sem atribuição — o PR que viraria o próprio merge pintou o head anterior |
| failure | 22:08:45Z | [36490609158](https://github.com/dandpb/aidevschool/actions/runs/36490609158) | issue_comment | 547 | FAIL §5 qa-lead == produtor |
| failure | 22:17:02Z | [36491431308](https://github.com/dandpb/aidevschool/actions/runs/36491431308) | issue_comment | 547 | FAIL §5 idem |
| failure | 22:20:07Z | [36491751206](https://github.com/dandpb/aidevschool/actions/runs/36491751206) | issue_comment | 547 | FAIL §2 resolver AID-3273 → transport error HTTP 000 (flake de infra também vira vermelho em main) |

(+ 5 successes 22:13–22:17, mesmo padrão.)

### Controle de contraste: head REAL do PR #547 (`30c4c3deb69d…`)

O head do PR #547 tem **um único** check-run `countersign-gate`: run [36492597639](https://github.com/dandpb/aidevschool/actions/runs/36492597639), event `pull_request`, success, 22:37:23Z. Contraste: no mesmo período o run `36492535562` (pull_request, **failure** 22:27:52Z) anexou-se ao head `4cff0f02…` do PR de regrant — vermelho **real** de gate, no lugar certo (head do PR).

### Escala do padrão
Só em 2026-09-28: **18 check-runs vermelhos** `countersign-gate` anexados a **7 HEADs distintos de main** (`bec43dca`, `ebb62ffc`, `9d386dfd`, `9aaaeb9e`, `6e9d799d`, `8390e913`, `a02b1833`), todos de runs `issue_comment` avaliando PRs alheios (11:19–12:21, 19:59, 22:08–22:37). Ruído estrutural contínuo, não incidente isolado.

## 2. Diagnóstico do mecanismo

1. Workflow com gatilho `issue_comment` executa a cópia do **default branch** (intencional — tier "autoritativo", `.github/workflows/countersign-gate.yml:29-36`) e o check-run resultante é anexado ao `github.sha` do evento = **HEAD corrente da main**, não ao head do PR avaliado (comportamento documentado do GitHub Actions para `issue_comment`).
2. O job resolve o PR do comentário (`github.event.issue.number` → `gh pr view $PR`) e avalia **aquele** PR — o veredito de uma conversa alheia vira check vermelho no commit de main vigente. Comentários de guard/countersign em PRs com atividade pré-merge (quando vermelho é esperado **na conversa do PR**) são o gatilho.
3. **Gate real vs ruído (regra de leitura):** veredito de gate real = check-runs `countersign-gate` com event `pull_request` no **head do PR** (+ re-run live de `scripts/merge_pr.sh` na hora do merge, linha 90: required check no head). Ruído = check-runs `countersign-gate` em **commits de main** (event `issue_comment`/`workflow_dispatch`) — o veredito pertence a outra conversa. Em main, o check **nunca** corre por push, então qualquer ocorrência em commit de main é cross-PR por construção.
4. **Achado adicional (proteção pretendida está inerte):** a "sobreposição autoritativa" que o comentário do workflow anuncia (avaliar o PR com a lógica de main e sobrescrever o check) **não acontece** — o veredito do tier `issue_comment` nunca alcança o head do PR (controle §1: head do #547 só tem o run pull_request). Hoje o tier é apenas ruído em main + log de auditoria. O enforcement real permanece: check required servido pelo tier `pull_request` + re-run live da porta de merge.

## 3. Comparação das opções

| Opção | Remove ruído em main? | Restaura a proteção pretendida (veredito no head do PR)? | Risco/bypass | Custo |
|---|---|---|---|---|
| (a1) receipt filtrar por event | leitura sim; UI de main continua vermelha | não | nenhum | doc only |
| (a2) tier issue_comment concluir neutral (log-only) | sim | não (assume auditoria only) | mínimo | 1 workflow |
| (b3) postar veredito via Checks API no head do PR (nome distinto, não-required) e job terminar neutral | sim | **sim** | `checks: write`; mesmo-nome mitigado por nome distinto | workflow + doc |
| (b-dispatch) workflow_dispatch no ref do PR | sim | parcial | **executaria a cópia do PR** — reintroduz a fraqueza que o two-tier evita (descartada) | — |
| (c) documentar filtro por event no protocolo de receipt | leitura | não | nenhum | doc only |

`(c)` é base comum de qualquer caminho; `(b3)` é o único que resolve ruído **e** restaura a intenção do design AID-2768.

## 4. Plano candidato (exige autorização — este despacho era read-only)

**Fase 1 — hygienização do protocolo (docs only, risco zero):**
- `docs/sdlc/README.md` §Merge protocol: regra nova para receipt de push-run — checks `countersign-gate` em commits de main são ignorados/scopados a runs `event=push` (na prática: nenhum); evidência de gate do merge é o check do **head do PR** + re-run live da porta.
- `scripts/merge_pr.sh:301` (texto de obrigação pós-merge) referencia a regra.
- Critério positivo: receipt do próximo merge sem vermelho estranho; negativo: nenhuma mudança mecânica.

**Fase 2 — fix estrutural (b3):**
- `.github/workflows/countersign-gate.yml`: job `issue_comment` ganha `checks: write`; após avaliar, POST `repos/{o}/{r}/check-runs` com `head_sha` = **head do PR alvo**, nome distinto `countersign-gate (main-authority)` (informativo, não-required); job conclui neutral → 0 check-runs em commits de main. Tier `pull_request` e required check inalterados; porta de merge inalterada.
- Opcional: flag `--report-sha` em `scripts/countersign_gate_check.py` (core intocado).
- Riscos: expansão de permissão `checks:write`; colisão de nome (mitigada); dogfooding do PR introdutor (dois tiers verdes nele).
- **Critérios positivos:** comentário num PR antigo/aberto → 0 novos `countersign-gate` em commits de main (verificar `commits/<head-main>/check-runs`); head do PR alvo recebe o veredito autoritativo; receipt de push-run de merge não relacionado limpo; self-test 35/35.
- **Critérios negativos:** nenhuma mudança no required check/porta; nenhum caminho vermelho→verde sem countersign válido.
- **Evidência de aceitação:** re-executar esta matriz (mesmos endpoints) pós-change.

**Decisão necessária do board:** aprovar Fase 1 e escolher Fase 2 = (b3) [recomendado] ou (a2) [se preferir zero mudança de permissão].

## 5. Fontes e limites

- Endpoints: `actions/runs/{id}`, `actions/runs/{id}/jobs` + job logs (extração `PR=<n>` e razão do FAIL), `commits/{sha}/check-runs` (`a02b1833…`, `8390e9139…`, `30c4c3de…`), `pulls/{547,604,605}`.
- Arquivos: `.github/workflows/countersign-gate.yml` (gatilhos/tiers), `scripts/merge_pr.sh` ( porta única, leitura de check-runs linha 53-62, obrigação pós-merge linha 301), `docs/sdlc/README.md` §Merge protocol.
- Limites: logs confirmados first-hand apenas para a janela 2026-09-28 (suficiente; padrão é contínuo); comentário guard de #547 deletado — conteúdo preservado no log do run 36492377134; runs anteriores a 2026-09-28 não re-auditados (desnecessários ao diagnóstico). Nada foi inventado: toda célula da matriz tem URL de run/commit correspondente.

**Disposição: In Review** — diagnóstico entregue; implementação (Fase 1/Fase 2) aguarda decisão do board via a interação de confirmação criada nesta issue. Defeito **não** está corrigido.

**founder** · 2026-09-30T19:53:47.769737+00:00

Platform & CI: revisão independente do diagnóstico confirmou as 18 falhas issue\_comment em sete SHAs de main, mas NÃO aprova implementação do plano atual nem a interação 00f6460f. Corrija somente o desenho e o recibo nesta mesma issue, sem código, workflows, permissões, novos tickets ou novas solicitações ao founder antes de consolidar uma decisão clara.



Correções obrigatórias: (1) concluir neutral não elimina o check-run nativo do GitHub; retire a promessa de zero check-runs em main. (2) Um check de nome distinto não-required é informativo e não restaura enforcement de merge. (3) Faça a leitura de receipts por run/evento/PR/SHA; não descarte globalmente todos os checks de main nem o vermelho real de push. O run 36491949848 contém product-readiness failed e precisa permanecer visível no recibo.



Fase 1 proposta: documentação e receipt com escopo de run e proveniência verificável, sem mudar avaliação/autoridade. Fase 2: desenho de avaliador confiável em main que emite veredito estruturado para o SHA exato avaliado; considere serialização, eventos obsoletos, VOID, reopen, erros fail-closed e separação entre dispatcher e autoridade. Preserve as regras atuais. O wrapper final de merge também precisa ter o expected SHA explicitamente fixado no desenho, não apenas reconsultado antes. Mudanças de required check, proteção de branch ou permissões de escrita exigem aprovação explícita separada e não estão autorizadas nesta rodada.



Entregue o plano corrigido com critérios positivos e negativos e liste a menor decisão de segurança realmente necessária. Mantenha a implementação bloqueada, preserve o histórico e identifique o plano/interação anterior como não aprovado e superado pelo desenho revisado; não tome a publicação deste comentário como autorização para executar Fase 1 ou Fase 2. Siga a disposição nativa e respeite 403/409/422, sem troca de papel para recuperar escrita negada.

**Platform & CI Engineer** · 2026-09-30T19:55:43.983368+00:00

**Resposta à revisão independente f0a85dba — plano corrigido (v2), somente desenho. Implementação segue BLOQUEADA; nada abaixo é autorização para executar.**

## 0. Registros de estado
- Interação `00f6460f` e plano v1 (comment 8e1e30f9 §4): **NÃO aprovados, superados por este desenho**. Tentativa de cancelar a interação pela rota nativa retornou denial board-only ("Agent actors cannot resolve issue-thread interactions through this board-only route") — registrado aqui conforme regra 403/409/422, sem troca de papel. A interação pendente deve ser tratada como morta pelo board.
- Diagnóstico (§1–§2 de 8e1e30f9): **confirmado pela revisão** (18 falhas issue_comment em 7 SHAs de main). Sem retratação da evidência.

## 1. Retratações obrigatórias (aceitas)
- **R1 — "0 check-runs em commits de main" é impossível**: qualquer job Actions disparado em main emite o check-run nativo anexado a `github.sha` (neutral/success/skipped incluídos). Promessa retirada. Correção: o check-run nativo é **aceito e rotulado por escopo** no receipt (Fase 1), não eliminado.
- **R2 — check de nome distinto não-required é informativo**: não restaura enforcement de merge (só required check ou o re-run live da porta bloqueiam). A frase "restaura a proteção pretendida" está retirada; o correto é: restauraria apenas *visibilidade* do veredito no PR — e mesmo isso exige escrita (checks:write/issues:write), **não autorizada nesta rodada e não solicitada**.

## 2. Fase 1 v2 — receipt com escopo de run/evento/PR/SHA (docs only; avaliação/autoridade intactas)

Regra do receipt de push-run para o commit de merge M (novo item do §Merge protocol em `docs/sdlc/README.md` + referência no texto pós-merge de `scripts/merge_pr.sh:301`):
1. Enumerar check-runs de M (`commits/{M}/check-runs --paginate`) e **resolver cada linha pela run de origem** (`actions/runs/{id}` → event, workflow, head_commit; para countersign-gate, log do job extrai `PR=<n>` e o veredito).
2. Classificar por proveniência, nunca descarte global:
   - run com `event=push` (head_commit = M): veredito **pertence a M** — vermelho é REAL e permanece visível (ex.: `product readiness (claims)` failed no run 36491949848 do M=a02b1833).
   - run com `event=issue_comment|workflow_dispatch` avaliando PR P head H≠M: **veredito cross-PR** — linha mantida com rótulo de proveniência (run URL, PR P, head H), separada do veredicto do CI de M.
3. Proveniência verificável: cada linha do receipt cita o endpoint usado; qualquer revisor reproduz a classificação.
- **Sem descarte global** de checks de main; **sem esconder vermelho real de push**; **sem mudança mecânica** — somente documento e texto de obrigação pós-merge.

## 3. Fase 2 v2 — desenho do avaliador confiável em main (DESIGN ONLY)

**Separação dispatcher/autoridade:**
- **Dispatcher** = listener mínimo de comentários (tier issue_comment atual): NÃO avalia; resolve (PR, comment_id, evento) e invoca a autoridade; impõe serialização por PR.
- **Autoridade** = núcleo de avaliação pinado à versão de main (o core atual `scripts/countersign_gate_check.py`, **regras §1–§7 preservadas sem alteração**), com self-test como passo pinado próprio; emite o **veredito estruturado**.

**Veredito estruturado** (job summary + annotation + log — **delta de permissão ZERO**), schema: `{evaluator_version (SHA do arquivo de workflow), run_id, event_id (comment id), evaluated_pr, evaluated_head (40-hex EXATO avaliado — headRefOid no momento da avaliação), verdict (PASS|FAIL), reason_code (§1..§7 | FAIL_CLOSED_RESOLVER_ERROR), stale_at_emission (bool), emitted_at}`.
- **Erros fail-closed distinguíveis**: falha de resolver/transporte (ex.: HTTP 000 no run 36491751206) → `FAIL_CLOSED_RESOLVER_ERROR`, nunca verde, nunca conflitado com FAIL de regra.
- **Serialização**: `concurrency` por PR (`group: countersign-eval-pr-{n}`, cancel-in-progress=false) — heartbeats paralelos em corrida (padrão AID-2840) não interlecionam; vereditos são imutáveis por `(run_id, evaluated_head)` e ordenados por `emitted_at`.
- **Eventos obsoletos**: se o head moveu entre disparo e avaliação, o veredito é emitido **para o SHA que efetivamente avaliou** com `stale_at_emission=true`; consumidores casam por SHA, nunca por "mais recente".
- **VOID/reopen**: re-avaliação integral da conversa a cada evento (§7 atual) — VOID/reopen posterior emite veredito novo que supersede o anterior **daquele SHA**; histórico permanece append-only.
- **Check-run nativo em main**: permanece com o nome `countersign-gate` (semântica de required check intocada — mudar nome/required exigiria decisão de proteção de branch, não autorizada); o receipt o escopa por evento (Fase 1). Nenhuma promessa de ausência de check-run em main.

**Wrapper de merge (requisito de desenho):** `scripts/merge_pr.sh` passa a fixar **expected_head** explicitamente — registrado no momento da verificação/countersign, conferido fail-closed em CADA passo entre o re-run do gate e a chamada de merge (recusa se head atual ≠ expected_head; hoje a porta reconsulta o head, o que deixa janela TOCTOU entre o pin do countersign e o merge). Desenho apenas; mudança exige autorização posterior.

## 4. Critérios
**Positivos:** (i) receipt do próximo merge não relacionado: vermelhos reais de push presentes (incl. product-readiness) E linhas countersign-gate cross-PR presentes com rótulo de proveniência — nada silenciosamente descartado; (ii) toda linha do receipt reproduzível pelos endpoints citados; (iii) revisão do desenho confirma: zero mudança de permissão/required-check/branch-protection, regras §1–§7 intactas, dispatcher sem lógica de avaliação; (iv) veredito estruturado referencia sempre o SHA exato avaliado (post-implementação: corridas serializadas ordenam vereditos, evento obsoleto marcado, flake de resolver vira FAIL_CLOSED_RESOLVER_ERROR).
**Negativos:** (i) nenhum descarte global de checks de main nem ocultação de vermelho real de push; (ii) nenhum vermelho→verde sem countersign válido; (iii) nenhuma semântica de enforcement movida para check informativo; (iv) nenhum merge com head ≠ expected_head; (v) nenhuma permissão de escrita nova exercida nesta rodada.

## 5. Menor decisão de segurança realmente necessária
**Nenhuma** para a Fase 1 v2 (docs) nem para a Fase 2 v2 como desenhada (veredito via job summary/annotation/log e receipts por leitura de API — delta zero). A primeira decisão genuinamente de segurança — e que fica **explícita e diferida, não solicitada agora** — é qualquer write-back de veredito para conversa/head de PR (`issues:write`/`checks:write`) ou alteração de required check/proteção de branch.

## Disposição
`in_review` — aguardando veredicto do revisor independente (autor de f0a85dba) sobre este desenho v2. Implementação bloqueada; histórico preservado (v1 e interação 00f6460f marcados não aprovados/superados).

**founder** · 2026-09-30T20:00:19.37739+00:00

Uma única precisão no desenho v2, sem repetir a investigação: a operação FINAL de merge deve receber o SHA esperado como precondição atômica da própria API de merge. Checagens anteriores, mesmo imediatamente antes da chamada, não fecham a janela TOCTOU. Acrescente essa frase e o negativo “head movido após a última leitura \=> operação de merge recusada pelo servidor” ao desenho existente. Apenas correção documental deste plano; não executar merge, editar wrapper/workflow, expandir permissões nem iniciar nova revisão completa. Os demais limites e a implementação bloqueada permanecem.

**Platform & CI Engineer** · 2026-09-30T20:00:46.204797+00:00

**Adendo v2.1 ao desenho v2 (comment f9eb7665), conforme revisão bb1aa9b5 — correção documental única; demais limites e implementação bloqueada inalterados.**

**Precisão acrescentada à seção "Wrapper de merge" do desenho v2:** a operação FINAL de merge deve receber o **SHA esperado como precondição atômica da própria API de merge** — no contrato GitHub, o parâmetro `sha` de `PUT /repos/{o}/{r}/pulls/{n}/merge`: o servidor recusa a operação se o head do PR divergir do SHA informado (409), de modo que o pin é avaliado atomicamente DENTRO da própria operação de merge. Checagens anteriores ao chamado — mesmo imediatamente antes — não fecham a janela TOCTOU (entre a checagem e a execução da chamada o head pode mover); portanto as conferências por etapa do desenho v2 são defesa em profundidade, e a **precondição atômica do servidor é o mecanismo de fechamento obrigatório**.

**Critério negativo acrescentado (à lista de §4 do v2):** *head movido após a última leitura ⇒ operação de merge recusada pelo servidor* — nenhuma checagem cliente-side substitui essa recusa; a porta trata a resposta de divergência (409) como fail-closed, sem retry automático sobre o head novo.

Nada além disso foi alterado: sem merge executado, sem edição de wrapper/workflow, sem expansão de permissões, sem nova revisão completa. Disposição mantida: `in_review`, aguardando o revisor independente.

**Platform & CI Engineer** · 2026-09-30T21:22:26.445196+00:00

**Consolidação — child AID-3521 concluída (done): Fase 1 v2.1 docs-only draft entregue e APROVADO em revisão independente. Status de integração: NÃO integrado (por mandato).**

O que existe agora como produto (evidência em `aid3521-evidence/aid3521-fase1-v21-docs-only.patch`, 97 linhas, docs-only):
- `docs/sdlc/templates/push-run-receipt.md` (novo, +53) — template de recibo de push-run que resolve CADA check-run pela run de origem e classifica por proveniência: `push @ M` (vermelho REAL fica visível e nominado) · `cross-PR (PR P @ H)` (rotulado com run/PR/SHA, mantido — nunca descartado) · `derived @ M` (workflow_run encadeado) · `unresolved` (fail-closed). Critérios negativos embutidos (contagem bate; vermelho de push nominado; endpoint por linha).
- `docs/sdlc/README.md` §Merge protocol item 8 (+18 líquido) referenciando AID-3278 e o template. Referência a `scripts/merge_pr.sh:301` diferida (script fora do escopo autorizado).

Validação (veredito c1d3f7ee, Verifier & Evidence Engineer, first-hand GitHub API):
- Amostra positiva ✔ — falha REAL `product readiness (claims)` do run 36491949848 (push @ a02b1833) nominada em destaque.
- Amostras negativas ✔ — as 5 countersign-gate `issue_comment` rotuladas `cross-PR` (PRs 547/605, razões §7/§3/§1 revalidadas ao vivo nos logs de job); 3 `workflow_run` classificadas `derived`.
- Docs-only ✔ — zero workflow/script/permissão/required-check/proteção.

**Estado do repo:** nada integrado — main @ `d9dbdd5c504e` sem o item 8 e sem o template; integração aguarda autorização (o mandato da child parava em draft + revisão).

**Mapa de decisões pendentes nesta issue:** (1) autorizar a integração do patch aprovado (PR docs pela porta única `scripts/merge_pr.sh`, com countersign); (2) Fase 2 v2/v2.1 permanece somente desenho, NÃO autorizada. Nenhuma nova solicitação ao founder é criada nesta rodada — o board (frente 4, AID-3307) segue dirigindo.

Disposição mantida: `in_review` — desenhos v2/v2.1 sob revisão do revisor independente; Fase 1 tem agora draft aprovado pronto para integração quando autorizado.

**Platform & CI Engineer** · 2026-09-30T22:08:47.701105+00:00

**Consolidação — child sucessora AID-3540 concluída (done): patch aprovado rev1 → branch isolada + PR Draft #630, revisão V&E APROVADA (1/1) no head final. Merge NÃO executado (por mandato: "pare ANTES do merge").**

Estado atual da lane Fase 1 v2.1 nesta issue:
- **Draft PR #630** — https://github.com/dandpb/aidevschool/pull/630 (state open, isDraft true, base main @ `86fca779`, branch `aid3540/fase1-v21-docs-patch`, commit único head `f0d4346bcdc3147eba591424d86ac68c7a0ffcf2`, autor Platform & CI Engineer).
- **Diff mínimo verificável:** 2 arquivos — `docs/sdlc/README.md` +18/−0 (item 8 §Merge protocol) e `docs/sdlc/templates/push-run-receipt.md` +53/−0; total +71/−0; zero workflow/script/required-check/proteção/permissão.
- **Fidelidade ao rev1 aprovado (AID-3521):** template byte-idêntico (sha256 `395e54d4…46237`); único desvio = reversão cosmética de indentação (7 linhas, escape hatch 5→4 espaços), registrada no corpo do PR — autorizada pelo mandato e recomendada pelo V&E.
- **Aprovação independente:** veredito `241b525f` (V&E, first-hand, matriz 7/7 OK — rastreabilidade, fronteira docs-only, preservação do controle positivo run 36491949848/product-readiness, classificação cross-PR derivada, branch isolada).

Encadeamento da lane (para auditoria): AID-3278 desenho v2/v2.1 (comments `f9eb7665`/`df4214dd`) → AID-3521 draft+review aprovados → AID-3540 branch+Draft PR aprovado. Fase 2 permanece SOMENTE desenho, não autorizada.

**Próximo passo decisório (board/revisor):** autorizar a finalização do PR #630 (sair de draft, countersign independente no head `f0d4346b`, merge pela porta única `scripts/merge_pr.sh` com o pin atômico de SHA do desenho v2.1 na medida em que a porta o suporte hoje). Nenhuma solicitação nova ao founder é criada nesta rodada.

Disposição mantida: `in_review` — Fase 1 com artefato aprovado e PR Draft rastreável pronto para finalização quando autorizado; Fase 2 aguarda decisão.

**founder** · 2026-10-17T16:18:36.616186+00:00

🚀 APROVADO PELO FOUNDER: Prioridade alta! Corrija `.github/workflows/countersign-gate.yml` para que o evento `issue_comment` não anexe check-runs vermelhos de outros PRs ao HEAD da `main`.

**founder** · 2026-10-17T16:21:54.05116+00:00

🚀 APROVADO PELO FOUNDER: Prioridade alta! Corrija `.github/workflows/countersign-gate.yml` para que o evento `issue_comment` não anexe check-runs vermelhos de outros PRs ao HEAD da `main`.

**Platform & CI Engineer** · 2026-10-17T19:20:38.274586+00:00

# Receipt: AID-3278 — countersign-gate issue_comment tier vira verdict emitter (main nunca fica vermelha por comentário de outro PR)

Producer: Platform & CI Engineer (agent `1e9be0fa`, opencode_local) · Founder approval comment `240f2c95` (HIGH, 2026-10-17) · Run anterior `0e5222e5`/`22b29970` falharam por erro de adapter/process-lost; o edit estava íntegro no working tree e foi retomado, reverificado e promulgado neste run.

## What was produced

- **PR #706**: `aid3278/countersign-issue-comment-noise` → `main`, head `b61d46780dc70de669a162de1b6fa7d59296dbbc`, 2 arquivos +175/−7 — https://github.com/dandpb/aidevschool/pull/706
  - `.github/workflows/countersign-gate.yml` (+120/−7): tier `issue_comment` passa a **verdict emitter** — self-tests e gate live rodam sob `continue-on-error` (só nesse tier), gate grava `GATE_RC` + tee para `gate-output.txt`, e um passo novo `emit structured verdict` mapeia {self-tests, GATE_RC, reason} num documento `countersign-gate.verdict/1` (job summary) pinado ao PR+head avaliados, com linha `VERDICT:` e annotation `::notice`(PASS)/`::warning`(FAIL/FAIL_CLOSED). O job fica verde em toda classe de verdict — main só pode ficar vermelha por falha bruta de infra (runner/checkout), sinal honesto de "CI quebrado". Concorrência serializada por PR no tier de comentário (AID-2840); demais tiers com grupo único (sem mudança).
  - `intent/AID-3278-countersign-comment-tier/intent.md`: intent colapsado com evidência-âncora (run 36492377134, PR #547 vs HEAD a02b1833 = merge do PR #604; 18 check-runs vermelhos cross-PR em 7 HEADs da main).
- **Semântica preservada onde importa**: tier `pull_request` continua sendo o GATE required no head do PR; `workflow_dispatch` mantém vermelho/verde clássico; `scripts/merge_pr.sh` segue re-executando o gate live no merge.

## Verification run (first-hand, same session)

| # | Comando | Resultado |
| --- | --- | --- |
| 1 | `python3 scripts/countersign_gate_check.py --self-test` | **49/49 passed** (nota: leva ~2min — 49 cenários spawnam subprocess; o timeout de 120s do run anterior matou o comando, não é hang) |
| 2 | `bash scripts/merge_pr.sh --self-test` | **26 passed, 0 failed** |
| 3 | YAML do workflow parseado; bloco `run:` do emitter extraído do YAML parseado (dedent) e `ast.parse` | **syntax OK** |
| 4 | Emitter executado com env fiel ao runner (PR/GATE_RC/gate-output.txt/gh stub) nas classes: PASS(gate rc=0), FAIL(rc=1), FAIL_CLOSED(self-test csg failure), FAIL_CLOSED(rc=2 + both self-tests failure) | **4/4**: verdict correto no `VERDICT:` line, annotation notice/warning correta, **rc=0 (job verde) em todos** |
| 5 | CI no head `b61d4678` (PR #706) | `countersign-gate` fail e `SDLC guardrails (diff)` fail = **estado correto pré-countersign** (path process-authority exige citação `Countersign:` de agente distinto — AID-2318; mesmo shape do receipt AID-3899 passo 9); demais checks pending |

## Containment

- Commit baseado em `origin/main` (`b08e0096`) — NÃO carrega o commit local não-publicado de outro agente (`bc065bc5`, growth docs AID-909); working-tree WIP de outra sessão (curriculum/engines) ficou intocado e fora do commit/PR.

## Disposition

- **in_review** — PR #706 aguarda countersign independente de agente distinto (protocolo AID-2318/AID-2768): child issue criada para o QA Lead com checklist de reprodução fresh-context. Sem blockers técnicos.

**?** · 2026-10-17T20:14:43.682076+00:00

Paperclip needs a disposition before this issue can continue.

**?** · 2026-10-17T20:27:02.256529+00:00

Paperclip could not resolve this issue's missing disposition automatically. The issue is blocked on a recovery owner.

**founder** · 2026-10-18T10:33:51.787252+00:00

PR #706 aberto corrigindo ruído de issue_comment no countersign-gate.

**founder** · 2026-10-19T16:08:42.774659+00:00

Desbloqueio (Daniel aprovou o merge do PR #706 após countersign independente). O PR #706 já implementa esta issue. Próximos passos: (1) o produtor posta no PR #706 o trailer \`Provenance: agent\=\<slug> task\=AID-3278 run\=\<run real> session\=\<sessão real>\` (hoje falta e o gate dá 'producer unattributed'); (2) um verificador independente (QA Lead) faz o countersign \`Countersign: AID-3278 verdict \<ref> head\=\<SHA atual>\` com seu próprio Provenance; (3) merge somente via scripts/merge\_pr.sh 706.

**Platform & CI Engineer** · 2026-10-19T16:18:47.948715+00:00

# Receipt: AID-3278 — heartbeat c9def56a (recovery do run b0222fb4, adapter timeout) — passo 1 do desbloqueio 52e41a74 EXECUTADO

Run anterior b0222fb4 falhou por timeout do adapter (`opencode models`, 20s) sem tocar o estado; nenhum passo do plano tinha sido executado por ele. Este run retomou do estado real.

## O que foi feito (verificado 1º-mão, 2026-10-19T16:2xZ)

1. **Estado reconstruído:** PR #706 (head `b61d46780dc70de669a162de1b6fa7d59296dbbc`, OPEN, mergeable, base main) sem nenhum comentário e sem trailer no body → gate falhava **§5 'producer unattributed'** (é o vermelho atual de `countersign-gate` e `SDLC guardrails (diff)` no PR — estado correto pré-countersign).
2. **Trailer de Provenance do produtor postado no PR #706** ([issuecomment-6271821556](https://github.com/dandpb/aidevschool/pull/706#issuecomment-6271821556)): `Provenance: agent=platform-ci task=AID-3278 run=c9def56a-0a6b-439c-b8ab-cfb68e5303d2 session=ses_eab10dc5affegLs2QjG8gWdMXM` — run real (este heartbeat) e sessão real (não-placeholder, política 2026-10-01/AID-4898 §4).
3. **Verificação pré-postagem (mesma sessão):** trailer validado contra `PROVENANCE_RE` + `is_placeholder` do próprio gate; corpo do comentário auditado para não conter citação operativa fora de fence nem marcadores de hold; `evaluate()` simulado com o body real do PR → falha muda de §5 para §1.
4. **Verificação pós-postagem (caminho real):** `python3 scripts/countersign_gate_check.py --pr 706` ao vivo com resolver real → **FAIL §1 'no citation'** (antes: §5 'producer unattributed'). Atribuição do produtor REGISTRADA; único requisito pendente no PR é a citação independente.

## Caminho de revisão (ativo, não é polling)

- **AID-5139** (child, QA Lead `ca6a3f95`, in_progress, HIGH): revisar PR #706 conforme REVIEW.md e postar o countersign citando `AID-3278` com pino do head atual + trailer próprio (agente distinto, sessão real de run succeeded — âncora registry §8b). A pré-condição "produtor posta o Provenance dele" da descrição da child está agora satisfeita; o checklist completo para o verificador está publicado no próprio PR (comment 6271821556), visível 1º-mão.
- Tentativa de comentar direto na child AID-5139 foi recusada pelo boundary de autorização ("outside this actor's authorization boundary") — registrado conforme regra 403, sem troca de papel; a child é autossuficiente (descrição + PR).
- **Merge:** após gate verde, exclusivamente via `scripts/merge_pr.sh 706` (aprovado por Daniel, comentário 52e41a74; porta re-executa o gate live no merge com pin atômico de SHA).

## Disposition

**in_review** — implementação completa no PR #706 (founder-approved HIGH, 240f2c95); revisor real designado via AID-5139 (countersign independente QA Lead); merge pós-verde pela porta única é o próximo passo executor desta issue.

**Platform & CI Engineer** · 2026-10-19T17:16:08.73537+00:00

# Receipt: AID-3278 — heartbeat c27fc6e3 — merge door executado; head moveu por update-branch; re-countersign delegado (AID-5147)

## Sequência (1º-mão, 2026-10-19T17:1xZ)

1. **Countersign QA válido no head `b61d4678`** — citation `ad9d1eef` (16:44:10Z) validada ao vivo pelo gate (agentes distintos platform-ci/qa-lead, pino OK, sessão ancorada ao run b26c5ae9 succeeded, sem supersedes). Child AID-5139 encerrada `done` pelo QA (16:45Z).
2. **Checks re-rodados e verdes no head antigo**: `countersign-gate` success + `SDLC guardrails (diff)` success (runs 39058188016/39058188270 re-executados).
3. **Merge door executado** (`scripts/merge_pr.sh 706 --merge`, worktree main atualizada isolada em /tmp/opencode/aid3278-main): **gate live PASS no passo 2**; API merge RECUSADA pelo GitHub — proteção de branch exige branch atualizada com main (behind de #709/#710). Nenhum merge executado (fail-closed; fallback NÃO aplicável — não era falha de transporte).
4. **update-branch executado** → **novo head `1ed0e23385eb76f90e5e6a0b1d955a04a81f6678`** (merge de main; diff próprio do PR inalterado — verificado: `git diff b61d4678..1ed0e233 -- .github/workflows/countersign-gate.yml intent/AID-3278-countersign-comment-tier` vazio).
5. **Gate ao vivo no head novo**: FAIL §3 (citação pinou head antigo) — comportamento projetado (fail-closed por head-move, AID-2768 §3).

## Continuação (dono definido, sem polling)

- **AID-5147** (child nova, QA Lead `ca6a3f95`, HIGH): re-countersign no head `1ed0e233` com checklist delta-only — precedente AID-2885/PR #559. Modelo de citação e trailer publicados no PR (comment 6272927264) e na child.
- Após citação: produtor re-roda os checks falhos no head novo e executa o merge door novamente (monitor abaixo é o gatilho do produtor).

## Disposition

**in_review** — revisor real: QA Lead via AID-5147 (re-countersign head novo); monitor re-armado 20:00Z (wake_owner): se gate verde no head `1ed0e233` → merge door; senão re-avaliar AID-5147.

**founder** · 2026-10-19T18:06:26.674972+00:00

[@Platform & CI Engineer](agent://1e9be0fa-c320-4309-9704-c755c53da7fd?i=git-branch) — AID-5147 (re-countersign QA no head 1ed0e233 do PR #706) está concluída. Por favor retome AID-3278: confirme o gate countersign verde no head atual e siga o protocolo de merge (scripts/merge\_pr.sh, sem mudar política de CI). Se o gate ainda estiver fail-closed, documente por quê.

**Platform & CI Engineer** · 2026-10-19T18:08:31.902034+00:00

**Resposta ao comentário `e2e2f106` (Daniel):** AID-5147 foi verificada 1º-mão — o re-countersign `7079c0b5` no head `1ed0e233` **passou no gate ao vivo** (PASS completo: agentes distintos, pino, sessão ancorada ao run 6dc096a5). O merge door foi então acionado e **recusado pelo GitHub** com uma condição ANTERIOR ao gate: a proteção de branch exige a branch atualizada com main, e o main avançou (PR #712, 17:44Z). Fail-closed correto — nenhum merge executado.

Executado nesta sequência (mesma regra, 2ª iteração): `update-branch` → **head atual `e72e4116ad6fb5774e1f3c7dbd49e93153c1e9c0`**; diff próprio do PR inalterado (verificado por `git diff`); gate agora falha §3 (pino expirou com o head-move, por projeto). **Re-countersign delegado: AID-5155** (QA Lead, HIGH) com checklist delta-only; template publicado no PR (comments 6273938245/6273943805).

GATE ainda fail-closed POR DESIGN até a nova citação independente pinar `e72e4116` — não é defeito: é o AID-2768 §3 (head-move exige countersign fresco) cumprindo exatamente a função de impedir merge com veredito de head antigo. Sem mudança de política de CI, conforme sua instrução. Se main avançar de novo antes da porta executar, o ciclo repete; uma pausa curta nos merges de main fecharia a janela (sugestão registrada, não solicitada como mudança de política).

Disposição: **in_review** — revisor: QA Lead via AID-5155; monitor do produtor re-armado 19:30Z (wake_owner): citação válida no head atual → re-run dos checks falhos → `scripts/merge_pr.sh 706 --merge`.

**founder** · 2026-10-19T19:06:19.452587+00:00

Daniel aprovou o merge do PR #706 após countersign independente (GO do QA Lead em AID-5155 no head e72e4116). CEO/merge operator: re-rode o countersign-gate e faça o merge somente via scripts/merge\_pr.sh 706 a partir da main atualizada. Se o head mudar, peça re-countersign ao QA.

**Platform & CI Engineer** · 2026-10-19T19:07:42.848143+00:00

**Resposta ao comentário `023c949c` (Daniel):** GO do QA em AID-5155 verificado 1º-mão — gate ao vivo **PASS** no head `e72e4116` (citação `34d93e68`, sessão ancorada ao run a9087d35). Merge door acionado em seguida e **recusado de novo pelo GitHub**: main avançou entre o re-countersign e a porta (#716–#720; último #720). Pela 3ª vez: update-branch executado → **head atual `489d23eb8346b7605d440c44a3fc8895ca04e951`**; diff próprio do PR inalterado (verificado); gate fail-closed §3 até nova citação — comportamento projetado, não defeito.

**Re-countersign delegado: AID-5161** (QA Lead, HIGH; template no PR, comment 6275072589).

**Pedido operacional (não é mudança de política de CI):** o gargalo é a janela entre a citação do QA e a execução da porta (~5 min) contra o ritmo de merges de main (~30–60 min). Uma **pausa curta nos merges de main (~30 min)** fecha o ciclo com o merge pela porta única. Sem a pausa, seguirá iterando corretamente — cada iteração é fail-closed e segura, apenas custa um ciclo de QA.

Disposição: **in_review** — revisor: QA Lead via AID-5161; monitor do produtor 19:30Z (wake_owner): citação válida no head atual → re-run dos checks falhos → `scripts/merge_pr.sh 706 --merge` a partir da main atualizada.

**Platform & CI Engineer** · 2026-10-19T19:32:22.362381+00:00

# Receipt FINAL: AID-3278 — MERGED via porta única + push-run receipt do novo HEAD da main (defeito corrigido e verificado em produção)

## Merge (1º-mão)
- **PR #706 MERGED** às 2026-10-19T19:15:14Z pelo operador `dandpb` **via `scripts/merge_pr.sh`** (corpo do merge commit `d46d1a80` cita a porta e a citação operativa). Parents `[cdc6d335, 489d23eb]` — branch current no momento do merge.
- Citação operativa usada pela porta: `Countersign: AID-3278 verdict 7f834b07 head=489d23eb` (QA Lead, 19:12:54Z; agentes distintos platform-ci/qa-lead; sessão ancorada ao run do QA). Gate live PASS no merge — confirmado também por este produtor no run 33cfe5fd.
- Nota de processo: 3 iterações de update-branch/re-countersign (heads b61d4678 → 1ed0e233 → e72e4116 → 489d23eb) porque a main avançou (#709–#720) entre citação e porta em cada ciclo — cada recusa foi fail-closed correto (AID-2768 §3); nenhum merge ocorreu fora da porta.

## Push-run receipt — main HEAD `d46d1a8048749e331633a3e148fdbe17b37a17c1` (49 check-runs: 46 success, 2 skipped, 1 failure)

| proveniência | check-run | estado | evidência |
|---|---|---|---|
| **push @ d46d1a80** (veredicto REAL da main) | `product readiness (claims)` | **failure (vermelho real, pré-existente, mantido visível por design)** | run 39309418853/job 118257595477 |
| push @ d46d1a80 | demais 45 checks do CI + 2 skipped | success | — |
| **cross-PR (PR #721 @ d939e98e)** — ANTES seria o ruído vermelho do AID-3278 | `countersign-gate` ×2 | **success — verdict emitter** | runs 39309841480 e 39310904607 (event=issue_comment) |

**Prova viva do fix (run 39309841480, log do job):** comentário em OUTRO PR (#721) disparou o tier `issue_comment` no HEAD da main; o gate avaliou #721 @ `d939e98e`, o emitter publicou `::notice::countersign-gate verdict=PASS PR=#721 @ d939e98e…` e o **check-run na main ficou VERDE** — exatamente a classe de run que vermelhava HEADs de main não relacionados (run 36492377134 / PR #547 / a02b1833 na evidência original). Classes FAIL/FAIL_CLOSED mantêm o job verde com `::warning` (comprovadas em CI: self-tests 49/49; matriz do emitter 4/4 no receipt d9152649).

## Artefatos
- Workflow em produção na main: `.github/workflows/countersign-gate.yml` (tier pull_request = gate required inalterado; tier issue_comment = verdict emitter; workflow_dispatch = vermelho/verde clássico).
- Intent: `intent/AID-3278-countersign-comment-tier/intent.md` (merged).
- Thread de revisão: countersigns QA `ad9d1eef` (b61d4678), `7079c0b5` (1ed0e233), `34d93e68` (e72e4116), `7f834b07` (489d23eb — usada pela porta); childs AID-5139/5147/5155/5161.

## Disposition
**done** — implementação merged pela porta única com countersign independente; efeito verificado em produção no primeiro HEAD pós-merge (cross-PR verde na main; único vermelho = push real `product readiness (claims)`, alheio ao gate). Monitor desarmado.

---

