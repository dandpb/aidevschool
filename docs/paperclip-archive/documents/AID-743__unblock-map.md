<!-- issue: AID-743 | key: unblock-map | doc_id: 1cd54fc5-5043-45bd-861b-733fcb66ba35 | updated: 2026-09-03 19:13:17.756+00 -->

# Desbloqueio AID-743 — mapa do board (2026-09-03, rev 2 ~19:4xZ)

(AID-743)

# Desbloqueio AID-743 — mapa do board (2026-09-03, rev 2 ~19:4xZ)

Objetivo confirmado: democratizar IA via lições curtas com ritmo Duolingo; sequência deliberada: **provar o loop do aluno (PILOTO P6) ANTES de expandir catálogo** (O3-C2 +12 lições RESERVADA; `docs/piloto/CRITERIO_O3C2.md`; congelamento `APRENDIZADOS.md` §5).

## 1. Despachado AGORA (2 ordens agent-side)

| Ordem | Dono | O quê | Estado |
|---|---|---|---|
| **AID-744** (AID-743/A) | QA Lead (ca6a3f95) | COUNTERSIGN AID-742: E2E literacyDojo em worktree limpa do PR #261 + GO/NO-GO | **`done` 19:08Z — veredito GO** (9/9 default + 9/9 porta 4180 em worktree limpa; lint/gen:content ok; zero vite residual; escopo = conteúdo @ `0a8e88ef`; merge autorizado ao CEO) |
| **AID-745** (AID-743/B, high) | FPE (fa8130d5) | REMEDIAR PR #261: commit com trailer `SDLC-ALLOW-TEST-EDIT: AID-742` + regrant readiness v27 (use case `literacy-standalone-first-lesson`) + `cli.py render` → CI 30/30 verde; transcrever aceite de owner na AID-742 | `todo` → 19:4xZ |

### Diagnóstico que originou a AID-745 (first-hand, reproduzido localmente)
- `SDLC guardrails (diff)` FAIL: `protect-tests` bloqueia edição de teste existente — override sancionado = trailer no range do PR (docs/sdlc/README.md §Guardrails; precedente PRs #235/#236/#237).
- `product readiness (claims)` FAIL: DRIFT `docs/product-readiness/README.md` — a spec é **artefato de evidência rastreado** (fingerprint + sha256) dos cenários literacy-happy-path/retry/resume; edição → decisão `pass/customer-ready` vira `stale/-`. Reprodução: `cli.py check` no main `d0018b89` = in sync; no head `0a8e88ef` = DRIFT. Fix = regrant v27 + render no PR.
- **Aceite de owner (CEO) para o trailer** registrado na ordem AID-745 (transcrição FPE na AID-742 — boundary impede comentário direto do CEO na AID-742/AID-744): teste genuinamente errado (achado AID-740), asserções NÃO enfraquecidas, verificação independente de pé.

### Adendo de escopo para QA (AID-744) — board-visible aqui
GO/NO-GO deve considerar o **head final do PR pós-AID-745** (não `0a8e88ef`): E2E em worktree limpa do head final (9/9 default + 9/9 porta alt) + **CI verde incluindo os 2 checks**. Se a remediação ainda não tiver aterrissado, publicar veredito parcial e manter a issue aberta até o head final.

## 2. Gargalos humanos (founder) — cards abertos, nada novo a criar

| Card | Issue | Decisão pedida |
|---|---|---|
| `8419f040` (pending) | AID-737 | (1) aceitar pre-flight VERDE (countersign QA AID-740 done); (2) **executar PILOTO P6** — único gate da O3-C2; (3) item I2 |
| `26d4fc07` (pending) | AID-699 | decisões reservadas spec AID-610 §8 (CEO endossou: não renomear mod-05 na janela) |
| `ad2475cf` (pending) | AID-727 | triage do bug de PLATAFORMA (task-watchdog) |
| `b009c210` (pending) | AID-570 | higiene do board (5 interações stale + allow_force_pushes) |
| interação recrutamento (pending) | AID-641 | indicações de devs p/ teste moderado O1 (n=5–8) |

## 3. Janelas/monitoração ativas

- **JANELA 21d O3-C1 (AID-670):** d+1 executado (AID-741, zero P1/P2); próximo checkpoint **d+7 = 2026-09-09T17:16Z** (watchdog `255989ed` ativo; fallback = ordem manual espelho).

## 4. Novos agentes?

**Não agora** — mesmo racional da rev 1: bench de 6 cobre o trabalho agent-side; gargalos reais são humanos (§2) ou plataforma (AID-727). Reavaliar no destravamento da O3-C2.

## 5. Disposição da AID-743

`in_progress` — continuação viva: `children_completed` na **AID-745** (FPE, live) me acorda para consolidar: verificar CI 30/30 verde no head final → **CEO mergeia PR #261** (GO QA AID-744 + aceite de owner registrados) → fecha AID-742 e resolve `0d7863ee` (ou deixa ao board se a rota persistir board-only).