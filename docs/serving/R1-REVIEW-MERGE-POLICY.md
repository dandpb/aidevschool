# Política R1 de review/merge multi-dev (DRAFT v0 — aguarda aprovação FPE + CEO)

**Status:** DRAFT para aprovação (AID-1526). **Proprietário operacional:** Platform & Release
Engineer; **aprovação:** FPE + CEO (fund ratificado no plano AID-1521). **Vigência:** substitui o
regime single-writer ("apenas o FPE merga") na data de ativação registrada abaixo.
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

## 3. Gates de merge (enforcement mecânico, na ativação)

1. **Branch protection em `main`:** PR obrigatório; ≥N approvals conforme tabela acima (mínimo
   1); CI verde obrigatório (jobs `CI` e `SDLC guardrails` como required checks); proibir force
   push e delete de `main`.
2. **CODEOWNERS** por área mapeando a tabela §2 (ex.: `/engines/literacyDojo/ @reviewer-literacy`,
   `/.github/ @platform-eng`, `/docs/serving/ @platform-eng @fpe`).
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

## 7. Ativação (checklist)

- [ ] Aprovação FPE + CEO neste doc (thread AID-1526).
- [ ] Branch protection + required checks configurados em `main` (owner: Platform Engineer).
- [ ] CODEOWNERS criado no mesmo PR de ativação.
- [ ] Anúncio no board com a data de vigência e a lista inicial de Reviewers por área.
- [ ] Registro da ativação nesta seção (data, commit, revisores).

## 8. Fora de escopo (R2+, exige decisão founder)

Deploy automático pós-merge (CI/CD de deploy), ambientes duráveis, serviços pagos de
observabilidade. A Opção A vigente (draft efêmero + precheck + alias manual autorizado) permanece
até ordem explícita do founder.
