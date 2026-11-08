# AID-3826: CI: 'product readiness (claims)' falha em todo push-merge para main (producer reports ausentes p/ sha de merge) — ruído vermelho pós-merge

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Platform & CI Engineer | **Created:** 2026-10-02T22:18:52.609449+00:00 | **Updated:** 2026-10-02T23:03:11.276+00:00
- **ID:** `8a330bec-61ac-4ef5-98bf-6bd6b70321ff`

## Description

# Achado (fechamento AID-3701, observação de CI — não-regressão do diff)

## Problema

O job `product readiness (claims)` (`.github/workflows/ci.yml:476`) falha em **commits de merge push para `main`**: o passo `assert producer reports present` não encontra artifacts `*-readiness-<sha>` para o sha do merge commit e fail-fast.

## Evidência (first-hand, 2026-10-02)

- `ae61479e` (merge PR #652, AID-3701): `product readiness (claims)` → **failure**; 47/47 concluídos, 45 success/1 skip/1 failure.
- `f3038852` (merge PR #627, alheio): `product readiness (claims)` → **failure** (mesmo padrão, pré-existente).
- `e2bfd191` (head do PR #652, mesmo diff, evento pull_request): `product readiness (claims)` → **success**.

## Impacto

Todo merge para main exibe um check vermelho esperado — ruído que dessensibiliza vermelhos reais no receipt de push-run (padrão aparentado do AID-3278, ruído cross-PR do countersign-gate).

## Ação sugerida (Platform & CI)

Avaliar: (a) produzir/baixar producer reports também em eventos push de merge (ou saltar o assert quando o sha é merge de PR cujo head já validou); (b) ou isolar o job para eventos pull_request. Sem mudança de semântica do gate de claims.

## Notas

- Descoberto no fechamento da AID-3701 (merge `ae61479e`, diff do PR passou o mesmo check no head). Issue de CI/higiene — owner natural: Platform & CI Engineer (`1e9be0fa`).
- Evidência local: `/paperclip/aid3701-evidence/2026-10-01-pr652-quickwin-escola.md` §Adendo 2026-10-02.

## Document `Continuation Summary` (2026-10-02)

# Continuation Summary

- Issue: AID-3826 — CI: 'product readiness (claims)' falha em todo push-merge para main (producer reports ausentes p/ sha de merge) — ruído vermelho pós-merge
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 9732a88e-9977-4537-9cd5-44c7273a2c54
- Agent: Platform & CI Engineer (opencode_local)

## Objective

# Achado (fechamento AID-3701, observação de CI — não-regressão do diff)

## Problema

O job `product readiness (claims)` (`.github/workflows/ci.yml:476`) falha em **commits de merge push para `main`**: o passo `assert producer reports present` não encontra artifacts `*-readiness-<sha>` para o sha do merge commit e fail-fast.

## Evidência (first-hand, 2026-10-02)

- `ae61479e` (merge PR #652, AID-3701): `product readiness (claims)` → **failure**; 47/47 concluídos, 45 success/1 skip/1 failure.
- `f3038852` (merge PR #627, alheio): `product readiness (claims)` → **failure** (mesmo padrão, pré-existente).
- `e2bfd191` (head do PR #652, mesmo diff, evento pull_request): `product readiness (claims)` → **success**.

## Impacto

Todo merge para main exibe um check vermelho esperado — ruído que dessensibiliza vermelhos reais no receipt de push-run (padrão aparentado do AID-3278, ruído cross-PR do countersign-gate).

## Ação sugerida (Platform & CI)

Avaliar: (a) produzir/baixar producer reports também em eventos push de merge (ou saltar o assert quando o sha é merge de PR cujo head já validou); (b) ou isolar o job para eventos pull_request. Sem mudança de semântica do
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `9732a88e-9977-4537-9cd5-44c7273a2c54` finished with status `succeeded` at 2026-10-02T23:03:17.800Z.
- I have local context from a recent heartbeat (`tmp_3827_3826.json` fetched 18:32 today). Let me read the issue thread and related context.

I have the issue snapshot. Now let me gather the reconciliation context: AID-3825 (likely the already-tracked readiness failure), the workflow file, and the PR654 proposal.

AID-3825 is the countersign FPE, not the readiness failure. Let me search the board for the tracked readiness issue and inspect the workflow + PR654.

The workflow shows the design: `assert producer reports present` only fails on ZERO reports (AID-1669), and the main push lane is the *designed* sole blocking consumer of the stale-claims window (`check --require-current`, AID-1890) — the re-grant factory trigger. Now let me verify the primary log first-hand (read-only GET) and check PR654 + the tracked readiness issue AID-3723.

Primary job data confirms the user's reading: step 7 `assert producer reports present` → **success**; the failure is step 10 `check claims staleness window (main push lane only)` = `check --require-current`. Let me verify the log details (25 files, 24 aggregated, 5 stale claims) and check the already-tracked issue AID-3723.

All u
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `9732a88e-9977-4537-9cd5-44c7273a2c54` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (2)

**founder** · 2026-10-02T23:00:03.471275+00:00

Orientação ao [@Platform & CI Engineer](agent://1e9be0fa-c320-4309-9704-c755c53da7fd?i=git-branch), dono desta AID-3826: fazer somente triagem read-only, com um único wake autorizado. Corrigir a premissa com o log primário de main ae61479e: em 22:16:14 UTC havia 25 producer readiness report files; em 22:16:17 foram agregados 24 resultados; em 22:16:19 fontes e matriz estavam válidas e sincronizadas; a falha de 22:16:20 foi check --require-current por fingerprints stale de 5 claims. Fonte: [https://github.com/dandpb/aidevschool/actions/runs/37071221461/job/111051894667](https://github.com/dandpb/aidevschool/actions/runs/37071221461/job/111051894667) . Reconciliar com a falha de readiness já acompanhada e a proposta existente PR654; verificar se 3826 é duplicata ou se há algum problema distinto realmente comprovado. Não assumir ausência de reports nem tratar o vermelho como ruído. Não remover/saltar assert, restringir o job a pull\_request, modificar gates/testes, criar tarefa/regrant duplicado ou repetir testes/CI inalterados. Preservar permissões e aprovações pendentes; sem credenciais, acessos ou mudança manual de status para destravar a fila. Registrar aqui a conclusão factual, o responsável e o próximo passo legítimo, ou o bloqueio exato.

**Platform & CI Engineer** · 2026-10-02T23:03:11.2299+00:00

## Triagem read-only AID-3826 (wake único autorizado) — premissa corrigida, 3826 = duplicata do ciclo de re-grant já acompanhado

Respondendo ao comentário 09363c3b: correção de premissa acatada e **verificada 1ª-mão** (leituras read-only da API do GitHub; nenhum assert/gate/job/teste tocado, nenhum regrant/tarefa duplicado, sem credenciais/acessos/mudança manual de status).

### Conclusão factual (log primário, verificado por mim)

Job 111051894667 (run 37071221461, push-merge `ae61479e`, job `product readiness (claims)`):

| UTC | passo | resultado |
|---|---|---|
| 22:16:14 | `assert producer reports present` | **success** — `producer readiness report files present: 25` |
| 22:16:17 | `aggregate tested-SHA producer facts` | success — `Aggregated 24 producer result(s)` |
| 22:16:19 | `validate readiness sources and candidate report` | success (fontes e matriz válidas/sincronizadas) |
| 22:16:20 | passo 10 `check claims staleness window (main push lane only, factory trigger)` = `cli.py check --require-current` | **failure** — STALE-WINDOW em 5 claims: `literacy-standalone-corridor-mod01-03`, `literacy-standalone-first-lesson`, `os-literacy-guided-mission`, `os-returning-learner`, `os-voxel-guided-missions` |

Contramprova no segundo run citado pela issue: `f3038852` (job 111024417517) — assert também **success**, mesma falha no passo 10. A premissa original da 3826 ("producer reports ausentes p/ sha de merge" → fail-fast do assert) está **refutada nos dois runs de evidência**: producer reports existem para SHAs de merge porque os jobs produtores rodam no mesmo SHA do mesmo run de push.

### Reconciliação com o acompanhamento existente

- O vermelho no push de main **não é defeito nem ruído**: é o desenho AID-1890/AID-1669 — a janela de claims stale tem exatamente **um** consumidor bloqueante, a lane de push de main, cujo run vermelho é o **gatilho da fábrica de re-grant** (`workflow_run` em CI de push falho). Em lanes de PR o mesmo sinal é warning não-bloqueante (por isso o head `e2bfd191` do PR #652 ficou verde).
- A janela stale e sua cura já estão acompanhadas: **AID-3723** (owner QA Lead `ca6a3f95`; FPE reservado à AID-3710) sobre a proposta existente **PR #654** (auto re-grant v107 da fábrica). Os 5 claims STALE-WINDOW do run `ae61479e` estão no escopo desse mesmo ciclo (3 grupos OS + literacy staleado por merges que tocam seus sourcePaths, p.ex. #652 `/escola/`). Não há proposta mais nova da fábrica (PR #654 é o carrier único; #655–657 são fixes unrelated).
- Estado atual do ciclo (1ª-mão agora): PR #654 está com label `regrant-observation-complete` (observação independente concluída — evoluiu desde o snapshot bloqueado da AID-3723), `mergeable_state: behind`, aguardando countersign + update-branch pelo dono legítimo da branch + aprovação maintainer das 3 execuções de workflow (rota já reportada à Dani).

### Veredito

**AID-3826 é duplicata** da falha de readiness já acompanhada (AID-3723 / PR #654), com premissa refutada. Nenhum problema distinto ficou comprovado: "falha em todo push-merge" = persistência da janela stale enquanto o ciclo de re-grant está pendente — mesma causa-raiz, mesmo owner. Nada a mudar em CI (assert e gates preservados; job não será restringido a pull_request — o vermelho na lane de push é o gatilho projetado da fábrica).

### Responsável e próximo passo legítimo

- **Responsável:** QA Lead (`ca6a3f95`) — ciclo de observação/countersign da AID-3723 sobre o PR #654 (FPE: AID-3710); aprovação maintainer dos workflows do PR #654 segue com a Dani (rota já registrada; CEO sem autoridade de maintainer).
- **Próximo passo legítimo:** countersign + merge do PR #654 pela porta única quando os checks estiverem verdes no merge ref (label `regrant-observation-complete` já presente; update-branch pelo dono legítimo; aprovação maintainer das 3 runs pendente na rota Dani). O push-run seguinte cura a main (padrão da fábrica). Fechando a 3826 como `done` (duplicata/triagem concluída) — sem trabalho de código próprio desta issue.

Provenance: agent=platform-ci-engineer task=AID-3826 triage read-only

---

