<!-- issue: AID-1555 | key: activation-kit | doc_id: d0ff5707-af42-4d2f-a0e8-8363bce9c2b8 | updated: 2026-09-14 06:20:32.49+00 -->

# R1 Activation Kit rev3 — 10 required checks (r10 onda 1 + Promotion precheck baseline); PR #351 @ dc342a67; pronto p/ gatilho cd35f433

(AID-1555)

# R1 Activation Kit — AID-1555 (pronto para execução; aguarda gatilho)

**Status:** pronto/inerte. **Rev 3 (2026-09-14):** revalidado first-hand pós-onda #352–#407 (main `258544ff`); +`Promotion precheck baseline (self-test + dry-run)` (AID-1556/PR #359) no payload D → **10 contexts**; PR #351 sincronizada (`dc342a67`). Histórico: rev 1 (2026-09-12) → emenda r10 (2026-09-13, AID-1770, 5→9) → rev 3 (2026-09-14, 9→10). **Gatilho (único):** aceite formal da interação `cd35f433` (AID-1526, request_confirmation, board-only founder). **Unblock owner:** founder/board. Verificação do gatilho: `GET /api/issues/287e1622-2727-4533-aebc-252db354550f/interactions` → `cd35f433.status == accepted`. Snapshot 2026-09-14 (first-hand): `pending`, `resolvedAt: null`.

**Emenda r10 (2026-09-13, AID-1770):** onda 1 do ratchet B1 incorporada — payload D passa de **5 para 9 required checks** (decisão CEO carrier AID-1714/r10 adotando a recomendação §5.3/§7 da análise mergeada em main `d434ba26` — PR #400). **Gatilho `cd35f433` inalterado: nada executa antes do aceite formal.** Detalhes na seção "Emenda r10" (fim do doc); emenda é docs-only — zero escrita em settings. **Rev 3 (2026-09-14) soma a rev r10:** +`Promotion precheck baseline (self-test + dry-run)` (job novo da AID-1556/PR #359, verificado por nome exato no head `258544ff`) → payload D = **10 contexts**.

**Fatos verificados first-hand (2026-09-12, este heartbeat):**
- Repo `dandpb/aidevschool`: public; único colaborador com write = `@dandpb` (todas as 12 agents operam por essa identidade). PRs atuais: autor `dandpb`; reviews praticados como review COMMENT com identidade do agente no corpo (ex.: PR #350).
- Branch protection `main` (GET 200): required checks = `literacyDojo (TS + content)`, `codexdojo-os (TS)`, `Python (learner + curriculum shared)`, `product readiness (claims)` — **`SDLC guardrails (diff)` NÃO está na lista**; `strict=true`; `dismiss_stale=true`; `require_code_owner_reviews=false`; `required_approving_review_count=0`; `enforce_admins=true`; **`allow_force_pushes=true`** (a corrigir); `allow_deletions=false`; `required_conversation_resolution=false`.
- Check-runs no head da PR #351 (`ea9da44f`): 36 runs; nomes exatos estáveis (matrix expansiva: `voxelDojo games/game-*`, `pixelDojo games/*` — **não** requiring; job skipped literal `pixelDojo games/${{ matrix.game.name }} (TS)` não requerível). `SDLC guardrails (diff)` = success.
- PR #351 (policy DRAFT v0) `open`, head `ea9da44f`; FPE APPROVE + CEO APPROVE evidenciados; merge pendente do aceite + FPE (single-writer até R1 ativa).
- Mapeamento área→dono (plano AID-1521, aprovado): `curriculum/`→Curriculum Platform Engineer (ac0ec540); `engines/`→Learning Engine Engineer (98ed5775); `learner/`→Learner App Engineer (d0dfd2b7); CI/CD+promoção+observabilidade+R1→Platform & Release Engineer (8c58cf6e); slices cross-domain→Full-Stack Feature Engineer (e761b40c). FPE = fa8130d5.

**Constraint estrutural (desenha o formato da ativação):** com identidade GitHub única, `required_approving_review_count ≥ 1` deadloca **toda** merge (self-approval não conta; `enforce_admins=true` proíbe bypass). Logo R1.0 = enforcement mecânico do que é mecanizável (checks/PR/force-push) + enforcement **procedural** do ≥N reviews (evidência: review no PR identificando o agente; merger verifica). Contador mecânico ≥1 só quando o founder provisionar identidades por agente (boundaries AID-1521: sem conta nova sem ordem explícita).

---

## A) `.github/CODEOWNERS` (arquivo novo, conteúdo integral)

```
# CODEOWNERS — AiDevSchool R1 (docs/serving/R1-REVIEW-MERGE-POLICY.md §2/§3; plano AID-1521)
# R1.0: identidade GitHub única (@dandpb) — ownership por área abaixo é DECLARATIVO,
# auditável no board (producer ≠ verifier): a review da área deve ser postada como review
# no PR identificando o agente revisor; o merger verifica antes do merge.
# Substituição quando o autor detém o papel exigido (política §2): Platform → FPE → CEO.

# CI/build/tooling, gates, pipeline de promoção, runbooks → Platform & Release Engineer (fallback: FPE)
/.github/        @dandpb
/scripts/        @dandpb
/docs/serving/   @dandpb

# Progressão/ritmo/avaliação → Learning Engine Engineer
/engines/        @dandpb

# Superfícies do aprendiz, evidências, telemetria → Learner App Engineer
/learner/        @dandpb

# Formato de lições, autoria, validação de conteúdo → Curriculum Platform Engineer
/curriculum/     @dandpb

# Slices cross-domain (§2 linha 3: 2 reviews) → Full-Stack Feature Engineer como segundo revisor

# Raiz (fallback de registro) — merger R1.0: FPE (default) / CEO (gates e pipeline, §2 linha 4)
*                @dandpb
```

## B) Emendas à política (`docs/serving/R1-REVIEW-MERGE-POLICY.md`) — na PR de ativação

- **B1 §3.1 substituir** o texto "PR obrigatório; ≥N approvals conforme tabela acima (mínimo 1); CI verde obrigatório (jobs `CI` e `SDLC guardrails` como required checks); proibir force push e delete de `main`." por: "PR obrigatório; CI verde com required checks por **nome exato do check-run** (10 — onda 1 do ratchet B1, decisão CEO AID-1714/r10, análise §5.3 @ `d434ba26`; +precheck baseline rev 3): `literacyDojo (TS + content)`, `codexdojo-os (TS)`, `Python (learner + curriculum shared)`, `product readiness (claims)`, `SDLC guardrails (diff)`, `Promotion precheck baseline (self-test + dry-run)`, `pixelDojo (TS)`, `miniTown (TS)`, `dojoToday (TS + substrate)`, `voxelDojo (TS)` (nome do workflow `CI` não gera check-run; jobs skipped/literais da matrix ficam fora). **Ratchet B1:** contexts da matriz `voxelDojo games/<id> (TS)` **nunca** são required crus (dinâmicos por `catalog.json` — required-por-jogo quebraria a protection a cada jogo novo/rename); bloqueio por jogo, se um dia desejado, é via **meta-check agregado de contexto único estável (onda 2, opcional — critérios de disparo §8 da análise; revisitar pós-R1)**; force push e delete de `main` proibidos; `enforce_admins` mantido. **Limite R1.0 (identidade GitHub única):** contador mecânico de approvals permanece 0 (self-approval não conta); o ≥N da §2 é verificado proceduralmente pelo merger com a review registrada no PR. Contador ≥1 requer identidades GitHub por agente (decisão founder)."
- **B2 §3.2 substituir** o exemplo por: "CODEOWNERS (`.github/CODEOWNERS`) mapeando a tabela §2 e o plano AID-1521, declarativo na R1.0 (identidade única `@dandpb`): `/curriculum/`→Curriculum Platform Engineer; `/engines/`→Learning Engine Engineer; `/learner/`→Learner App Engineer; `/.github/`+`/scripts/`+`/docs/serving/`→Platform & Release Engineer (fallback FPE); cross-domain→Full-Stack Feature Engineer como 2º revisor. `require_code_owner_reviews` só liga com identidades por agente."
- **B3 §2 acrescentar** após o parágrafo "PRs continuam pequenas...": "Quando o autor da PR detém o papel de reviewer obrigatório da linha aplicável, a revisão passa ao substituto na cadeia **Platform → FPE → CEO** (producer ≠ verificador preservado; evita deadlock de reviewer único)."
- **B4 §7:** concluir o registro na micro-PR de fechamento (item E2).

## C) Runbook nit (mesma PR de ativação)

`docs/serving/PROMOTION-RUNBOOK.md` linha 5: `**Merge single-writer:** CEO.` → `**Merge:** R1 (docs/serving/R1-REVIEW-MERGE-POLICY.md) — merger FPE ou CEO conforme §2; single-writer encerrado na ativação R1 (<data>).` (linha 22 "Merge single-writer do CEO" — toque de coerência opcional, mesmo PR.)

## D) Branch protection (executar via API APÓS merge da PR de ativação; hoje = mudança de settings, não deploy)

```
PUT /repos/dandpb/aidevschool/branches/main/protection
{
  "required_status_checks": {"strict": true, "contexts": [
    "literacyDojo (TS + content)", "codexdojo-os (TS)",
    "Python (learner + curriculum shared)", "product readiness (claims)",
    "SDLC guardrails (diff)",
    "Promotion precheck baseline (self-test + dry-run)",
    "pixelDojo (TS)", "miniTown (TS)",
    "dojoToday (TS + substrate)", "voxelDojo (TS)"
  ]},
  "required_pull_request_reviews": {"dismiss_stale_reviews": true,
    "require_code_owner_reviews": false, "required_approving_review_count": 0},
  "enforce_admins": true,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "required_linear_history": false
}
```
Delta real vs. hoje (GET 2026-09-14 @ main `258544ff`: 4 contexts required, nenhum dos novos; demais flags inalteradas desde rev 1): +`SDLC guardrails (diff)` + `Promotion precheck baseline (self-test + dry-run)` **+ 4 contexts raiz** (onda 1 ratchet B1: `pixelDojo (TS)`, `miniTown (TS)`, `dojoToday (TS + substrate)`, `voxelDojo (TS)` — custo marginal zero, todos já correm em todo PR fora do caminho crítico, análise §5); `allow_force_pushes` true→false; `required_conversation_resolution` false→true. Os **10** nomes verificados como check-runs reais por nome exato no head `258544ff` (2026-09-14). Demais campos = reaffirmação do estado vigente. Verificação pós-PUT: GET + conferir `contexts` (**10**) e flags; anunciar (F).

## E) Sequência de execução (pós-gatilho; cada passo com dono)

1. **(Gatilho)** `cd35f433` accepted → **(FPE)** merge da PR #351 (single-writer; se ainda aberta, pingar FPE no thread e aguardar — eu não mergo). Se main avançou desde a última sincronização (rev 3: `dc342a67` @ 2026-09-14), sincronizar a branch primeiro e aguardar CI.
2. **(Eu)** branch `aid-1555/r1-activation` de `main` fresco → A + B1–B3 + C → PR (docs/tooling; §2 linha 2: reviewer obrigatório Platform = autor → substituição B3: **FPE revisa**; merger FPE ou CEO). Checks 5/5 verdes → merge via FPE.
3. **(Eu)** executar D (PUT) + verificar GET → se falhar, registrar e reverter ticks (§7 item 2) na micro-PR.
4. **(Eu)** micro-PR E2 "docs(serving): AID-1555 — R1 activation record (§7)": ticka §7 itens 2/4/5 + registro (data, merge commit da PR de ativação, revisores, payload D aplicado).
5. **(Eu)** anúncio no board (F) + recibo de fechamento AID-1555 `done`; nota de conclusão no thread AID-1526.

## F) Anúncio no board (rascunho, PT-BR — postar no fechamento)

> **R1 ATIVA — política de review/merge multi-dev em vigor desde `<data>`** (aceite `cd35f433`; PR #351 merge `<sha>`; ativação PR `<n>`)
> O que muda: toda PR para `main` exige **10 required checks verdes** (`SDLC guardrails (diff)` + `Promotion precheck baseline` + 4 contexts raiz de browser — `pixelDojo (TS)`, `miniTown (TS)`, `dojoToday (TS + substrate)`, `voxelDojo (TS)` — onda 1 do ratchet B1, decisão CEO AID-1714/r10), force push em `main` proibido, CODEOWNERS declarativo por área, ≥N reviews por tipo de mudança (§2) com revisão postada no PR identificando o agente (producer ≠ verificador). Merger default: FPE (gates/pipeline: CEO).
> Reviewers por área: `curriculum/` Curriculum Platform Engineer · `engines/` Learning Engine Engineer · `learner/` Learner App Engineer · CI/pipeline/runbooks Platform & Release Engineer (fallback FPE) · cross-domain Full-Stack Feature Engineer (2º revisor).
> Não muda: countersign QA para superfície live/promoção; autorização founder para deploy; Opção A (draft efêmero + precheck + alias autorizado); zero deploy fora do runbook.
> Limite R1.0: contador mecânico de approvals no GitHub fica 0 (identidade única `@dandpb`) — ≥N é procedural; mecânico ≥1 quando houver identidades por agente (decisão founder). R1.1 (graduação de mergers) ≥2 semanas após R1.0 estável.

## Guardrails desta preparação (já respeitados)

Zero mudança em produção/repo/settings neste heartbeat; nenhum PR aberto antes do gatilho; nenhum check enfraquecido (D só **adiciona** required checks — `SDLC guardrails (diff)` + 4 contexts raiz que já correm em todo PR — e **endurece** force-push/conversation-resolution); nenhum serviço/conta pago; PT-BR no board, inglês em identificadores.

## Emenda r10 (2026-09-13) — ratchet B1 onda 1 (execução AID-1770)

- **Proveniência da ordem:** ORDEM carrier AID-1714/r10 → AID-1770; decisão CEO **ADOTAR** a recomendação §5.3/§7 da análise `docs/product-readiness/REQUIRED-GATES-ELEVATION-ANALYSIS-2026-09-13.md` (AID-1757), mergeada em main via **PR #400** (`d434ba26`).
- **O que mudou neste kit (docs-only):** emenda **B1** (contexts 5→9 + regra do ratchet) · **payload D** (contexts 5→9) · **anúncio F** ("9 required checks"). Nada além disso.
- **Regras fixadas:** matriz `voxelDojo games/<id> (TS)` **nunca** required crua (dinâmica por `catalog.json`); meta-check agregado de contexto único = **onda 2 opcional**, critérios de disparo na §8 da análise (revisitar pós-R1).
- **Verificação first-hand desta emenda (2026-09-13):** run `34771688403` do workflow CI em main head `d434ba26`: os 9 contexts do payload D existem por nome exato, todos `success` (38 jobs no run). `GET .../branches/main/protection`: contexts required = 4 (inalterados) — a emenda **não tocou** em settings (boundary da AID-1770).
- **Gatilho inalterado:** `cd35f433` (board-only founder) continua sendo a única condição de execução; o kit segue pronto/inerte.

## Rev 3 (2026-09-14) — revalidação pós-onda + 10º context

- **Revalidação first-hand (este run):** main avançou `a447100b`→`258544ff` (PRs #352–#407, ~146 commits); `docs/serving/` intocado (política/runbook seguem válidos); protection re-mapeada = 4 contexts + `allow_force_pushes=true` (inalterada desde rev 1 — nenhum terceiro tocou settings).
- **+1 context:** `Promotion precheck baseline (self-test + dry-run)` (AID-1556/PR #359 — gate canônico do pipeline de promoção, domínio PRE) entra no payload D → **10 contexts**. Nome verificado por exato no head `258544ff`.
- **PR #351 mantida merge-ready:** sincronizada com main (update-branch 2026-09-14) → head `dc342a67`, CI re-rodando no novo head; sem conflitos (`docs/serving/` não mudou).
- **Gatilho inalterado:** `cd35f433` verificado neste run — **ainda `pending`** (`resolvedAt: null`, `updatedAt` intocado desde 09-12 19:55Z). Kit segue pronto/inerte; zero escrita em settings.
