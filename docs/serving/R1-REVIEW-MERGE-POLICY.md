# Política R1 de review/merge multi-dev (ATIVA — R1.0 desde 2026-09-14)

**Status:** ATIVA (R1.0). **Proprietário operacional:** Platform & Release
Engineer; **aprovação:** FPE + CEO (fund ratificado no plano AID-1521; quorum no thread AID-1526;
ordem de execução AID-1816 sob delegação founder AID-1814). **Vigência:** 2026-09-14 — substitui o
regime single-writer ("apenas o FPE merga"); registro completo na §7.
**Objetivo:** escalar o time dev com segurança, mantendo intocáveis os gates existentes
(QA countersign, autorização founder para deploy, producer ≠ verifier).

## 1. Papéis

| Papel | Quem (na ativação) | Pode |
| --- | --- | --- |
| **Contributor** | qualquer dev/agent com write | abrir PRs; revisar (findings advisory) |
| **Reviewer de área** | devs designados por área (CODEOWNERS) | aprovar PRs da sua área |
| **Merger** | FPE (default) + CEO | executar merge em `main` |
| **Countersign de conteúdo** | QA (inalterado) | GO/NO-GO de conteúdo nas superfícies |
| **Autorização de deploy** | founder (inalterado) | autorizar onda de promoção pública |

Regras atuais que **não mudam** com R1: producer ≠ verifier (absoluto, `REVIEW.md`); QA countersign
para conteúdo/promoção; deploy somente via `PROMOTION-RUNBOOK.md`; zero push direto em `main`.

## 2. Regras de review por tipo de mudança

| Tipo de mudança | Reviews mínimos | Reviewer obrigatório | Merger |
| --- | --- | --- | --- |
| Docs/processos (`docs/`, runbooks, receipts) | 1 | qualquer Reviewer | FPE ou CEO |
| CI/build/tooling (`.github/`, `scripts/`, configs de deploy) | 1 | Platform & Release Engineer | FPE ou CEO |
| Código de engine/domínio (`engines/`, `learner/`, `curriculum/`) | 2 | 1 Reviewer **da área** + 1 qualquer Reviewer | FPE ou CEO |
| Gates/SDLC/segredos/pipeline de promoção | 2 | FPE **e** Platform Engineer | CEO |
| Superfície live (conteúdo/build que afete bundle) | idem código **+ QA countersign** | QA | FPE |

PRs continuam pequenos e autocontidos (regra vigente do plano AID-1521). Findings de review são
advisory e severity-rankados como em `REVIEW.md` — a decisão de gate é do merger, exceto onde há
countersign QA obrigatório.

Quando o autor da PR detém o papel de reviewer obrigatório da linha aplicável, a revisão passa ao
substituto na cadeia **Platform → FPE → CEO** (producer ≠ verificador preservado; evita deadlock de
reviewer único).

## 3. Gates de merge (enforcement mecânico, na ativação)

1. **Branch protection em `main`:** PR obrigatório; CI verde com required checks por
   **nome exato do check-run** (10 — onda 1 do ratchet B1, decisão CEO AID-1714/r10, análise §5.3 @
   `d434ba26`; 10º acrescido por emenda formal CEO via relay AID-1837, 2026-09-14, aplicado por
   PUT idempotente — change-id `AID-1831-required-context-10-amendment`): `literacyDojo (TS +
   content)`, `codexdojo-os (TS)`, `Python (learner + curriculum shared)`,
   `product readiness (claims)`, `SDLC guardrails (diff)`, `pixelDojo (TS)`,
   `miniTown (TS)`, `dojoToday (TS + substrate)`, `voxelDojo (TS)`,
   `Promotion precheck baseline (self-test + dry-run)` (nome do workflow `CI` não gera
   check-run; jobs skipped/literais da matrix ficam fora). **Ratchet B1:** contexts da matriz
   `voxelDojo games/<id> (TS)` **nunca** são required crus (dinâmicos por `catalog.json` —
   required-por-jogo quebraria a protection a cada jogo novo/rename); bloqueio por jogo, se um dia
   desejado, é via **meta-check agregado de contexto único estável (onda 2, opcional — critérios de
   disparo §8 da análise; revisitar pós-R1)**; force push e delete de `main` proibidos;
   `enforce_admins` mantido. **Limite R1.0 (identidade GitHub única):** contador mecânico de
   approvals permanece 0 (self-approval não conta); o ≥N da §2 é verificado proceduralmente pelo
   merger com a review registrada no PR. Contador ≥1 requer identidades GitHub por agente (decisão
   founder).
2. **CODEOWNERS** (`.github/CODEOWNERS`) mapeando a tabela §2 e o plano AID-1521, declarativo na
   R1.0 (identidade única `@dandpb`): `/curriculum/`→Curriculum Platform Engineer;
   `/engines/`→Learning Engine Engineer; `/learner/`→Learner App Engineer;
   `/.github/`+`/scripts/`+`/docs/serving/`→Platform & Release Engineer (fallback FPE);
   cross-domain→Full-Stack Feature Engineer como 2º revisor. `require_code_owner_reviews` só liga
   com identidades por agente.
3. **Sem bypass:** nunca merge com checks vermelhos; calibração de checks só com QA Lead e por PR.

## 4. Graduação para Merger (R1.1, após ≥2 semanas de R1.0 estável)

Dev torna-se Merger quando: (a) ≥3 PRs próprios mergeados sob R1 sem blocker de review; (b) ≥3
reviews substantivas em PRs de outros; (c) countersign explícito FPE + CEO no thread de graduação.
Na ativação da R1.1, mergers = FPE, CEO + no máximo 2 graduados; revisão da lista a cada ciclo de
readiness (alias sem adoção = remover, mesma postura do design-foundations).

## 5. Métricas de saúde (postadas no board a cada ciclo)

- Latência de first review: alvo <24h (bloqueador de escala se recorrente >48h).
- Tempo de fila de merge: alvo <24h após approvals.
- CI por PR: alvo <10 min (medido 5–7 min em 2026-09-12 — folga ok).
- PRs mergeados vs abertos por semana; taxa de rollback/defeito pós-merge por área.

## 6. Incidentes de merge/promoção

Postmortem curto (≤10 linhas) na issue da mudança quando: merge causar regressão em `main`, CI
vermelho pós-merge, ou reversão de promoção. Dono: Platform & Release Engineer; escalada
FPE → CEO → founder; produção paralela ao `PROMOTION-RUNBOOK.md` §7.

## 7. Ativação (registro — concluída em 2026-09-14)

- [x] Aprovação FPE + CEO neste doc (thread AID-1526: FPE APPROVE @ `2b248684`, review 5648707074;
      CEO APPROVE relay AID-1551, verbatim no comentário `21b51476`; PDE cross-domain GO @
      `ea9da44f`, despacho AID-1735; card board-only `cd35f433` stale-superseded pela diretiva
      founder AID-1814).
- [x] Branch protection + required checks configurados em `main` (owner: Platform Engineer): PUT +
      GET verificados 2026-09-14 — 9 contexts (§3.1), `strict`, `enforce_admins`, force-push e
      delete proibidos, conversation resolution obrigatória, contador mecânico de approvals 0
      (limite R1.0).
- [x] CODEOWNERS criado no mesmo PR de ativação (`.github/CODEOWNERS`, PR #408).
- [x] Anúncio no board com a data de vigência e a lista inicial de Reviewers por área (payload F do
      kit rev 2 — comentário `894e7963` na AID-1816, 2026-09-14T06:54:30Z).
- [x] Registro da ativação nesta seção: **data** 2026-09-14 · **policy** mergeada via PR #351
      (`9ec63fcb`, merger FPE single-writer — AID-1817) · **ativação** via PR #408 (`828e0594`,
      reviewer FPE por substituição §2/B3 — AID-1821) · **quorum/revisores**: FPE, CEO, PDE
      cross-domain, founder (AID-1814) · **payload D rev 2 aplicado** (9 contexts). Governança: o
      kit `activation-kit` rev 3 (10º context `Promotion precheck baseline (self-test + dry-run)`,
      AID-1556/PR #359), artefato de run stale (incidente AID-1818, correção AID-1820), foi
      **canonizado e aplicado em 2026-09-14** por linha CEO explícita (relay AID-1837, decisão
      sobre o pedido `7caa207d` da AID-1831): PUT idempotente verificado por GET (10 contexts;
      diff pré→pós = somente o append; demais campos inalterados). Hardening puro: nenhum merge
      futuro entra em `main` com a baseline de precheck vermelha.

## 8. Fora de escopo (R2+, exige decisão founder)

Deploy automático pós-merge (CI/CD de deploy), ambientes duráveis, serviços pagos de
observabilidade. A Opção A vigente (draft efêmero + precheck + alias manual autorizado) permanece
até ordem explícita do founder.
