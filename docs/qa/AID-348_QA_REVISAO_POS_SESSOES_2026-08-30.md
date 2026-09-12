# AID-348/AID-366 — QA pós-sessões: revisão independente da execução da coorte AID-180 (critério 5)

**Data:** 2026-08-30 UTC (~00:33–00:40; charter pré-registrado em 2026-08-29 ~15:06Z)
**QA independente:** `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (verificador ≠ produtor/moderador
FPE `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`)
**Charter pré-registrado:** `docs/qa/AID-348_QA_CHARTER_POS_SESSOES_2026-08-29.md`
(rubrica continuar/pausar fixada ANTES da execução das sessões)

## Veredito: **CONTINUAR**

Charters C1–C4 todos **PASS**. Nenhum gatilho de `pausar` da rubrica pré-registrada foi
acionado. A coorte inicial controlada (AID-180) atingiu seu critério 5: a execução pode
seguir para o próximo lote/promoção (AID-343/PR #182), condicionada às limitações §Limitações.

## Gatilho da revisão (satisfeito)

- Registro FPE em AID-180: seção "Execução da coorte — atestação CEO 2026-08-30T00:32:33Z"
  em `work-products/AID-180/INITIAL_CONTROLLED_COHORT.md` (consolidada pelo FPE em AID-365).
- Procedência executiva dupla: interação `bcafbb77` em AID-362 — fundador respondeu
  `coorte-sessoes` → **`sim-duas`** em 2026-08-30T00:31:31Z; aceite formal da confirmação
  `3f4ec900-6799-4673-85f5-49568b2d8d78` (AID-180) em 2026-08-30T00:32:33.460Z.
- CEO desbloqueou AID-348 ("desbloqueie", 00:32:21Z). Desvio procedural menor: a "solicitação
  do FPE nesta issue" materializou-se como delegação AID-366 (assignee QA Lead) + AID-365 —
  sem impacto na evidência.

## C1 — Registro de execução: **PASS (com limitação L1)**

Registro consolidado (untracked work-product, convenção da cadeia; dados de pesquisa ficam
fora do git por protocolo):

- **Denominador:** 2 sessões consentidas → 2 atestadas executadas (1 `IA Prática` `l02`;
  1 `Trilha Dev` `game-02-warehouse`); público não ampliado; convidados além do limite: 0.
- **Retiradas/aborts:** nenhum `withdrawal_requested`, nenhuma notificação de abort, nenhuma
  ação de rollback executada (owner FPE permanece).
- **Canal de suporte/feedback:** registrado (canal moderado em sessão; triagem técnica FPE
  fora de sessão; feedback CEO) — conforme protocolo AID-142 §5.
- **Abort conditions:** armadas; nenhuma acionada.
- **L1 (limitação):** aceite `3f4ec900` sem nota anexa — datas/horas por sessão e scorecards
  anonimizados permanecem no research storage restrito (fora do git, exclusão 30 dias,
  AID-142 §3) e **não são re-verificáveis pela QA**; a QA verifica a fronteira in-repo e a
  cadeia de atestação executiva, não os scorecards privados.

## C2 — Fronteira de evidência: **PASS**

```text
grep -rnEi '<email>|<telefone>|whatsapp|telegram' work-products/AID-180/  -> só datas/SHAs/UUIDs (0 PII)
sha256sum learner/learning_state.yaml -> c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf
  (== preflight 2026-08-25 == registro no pin 3f641906 — inalterado durante toda a coorte)
git log 3f641906..HEAD -- learner/ .mavis/ -> só 19cf3a67 (learner/substrate/*.py código/testes;
  NENHUM commit toca learning_state.yaml ou .mavis/)
grep -c "mastered: true" learner/learning_state.yaml -> 1 (pré-existente; hash idêntico prova
  não-escrita; nenhuma mastery nova na coorte)
```

- Nenhum dado pessoal/contato no git; somente códigos anonimizados/agregados allowlisted.
- `.mavis/learning_state.yaml` do worktree compartilhado: diff de 1 linha = path de workspace
  (projeção de ambiente, pré-existente) — preservado sem alteração; não é escrita de sessão.
- Critério 6 de AID-180 preservado: sem escrita canônica, sem mastery sem evidência independente.

## C3 — Continuidade de identidade na janela das sessões: **PASS**

Checagens independentes datadas da QA (alias E permalink, ambos byte-idênticos):

| Momento (UTC) | Manifesto SHA-256 | sourceRevision | Superfícies coorte | Ponte |
| --- | --- | --- | --- | --- |
| 2026-08-29 15:05–15:06Z (janela aberta pós-liberação 11:35Z) | `fc694824…` | `3f641906…` | 200 | 200 same-origin token 43 chars / 403 cross-origin |
| 2026-08-30 00:35:58Z (pós-atestação, momento do veredito) | `fc694824…` | `3f641906…` | 200 | idem |

Corroborado pelo produtor na liberação (~11:35Z) e pós-atestação. **Nenhum re-pin entre a
liberação das sessões e este veredito — as sessões correram na identidade aprovada pelo GO
(AID-313 4/4; AID-258/AID-320 5/5).** Merge do PR #182 (AID-367, autorizado pelo fundador)
não altera produção: alias continua no pin `3f641906` às 00:35:58Z.

## C4 — Denominadores e recomendação: **CONTINUAR**

Agregados registrados: 2/2 sessões executadas; 0 retiradas; 0 aborts; 0 convites além do
limite; 0 `technical_failure` reportada; 0 escaladas de suporte; 0 rollbacks.

Rubrica pré-registrada — gatilhos de `pausar` (abort acionado, PII no git, escrita canônica,
falsa mastery, re-pin na janela, technical_failure impedindo missão): **nenhum presente.**
C1–C3 PASS com evidência datada → **`continuar`**.

Consequências (conforme AID-348/AID-180): FPE pode encerrar AID-180; AID-343 liberada para
promover o lote l01–l14 (PR #182) pelo fluxo AID-253/254 (ref imutável pinada + GO de
promoção); **QA de regressão pós-promoção AID-325 permanece obrigatória e só executa após a
promoção** (permanece blocked até lá).

## Limitações explícitas

1. **L1:** scorecards/timestamps por sessão estão em research storage restrito fora do git —
   atestados pelo CEO (2×) e consolidados pelo FPE, não re-verificados pela QA (conforme
   protocolo).
2. **L2:** n=1 por jornada — poder estatístico nulo; os denominadores apenas excluem falha
   grossa. A recomendação vale para o próximo lote sob a mesma disciplina de gates; não é
   generalização estatística de qualidade.
3. **L3:** verificação de identidade por amostragem datada nos endpoints (alias+permalink),
   não telemetria contínua; janela coberta 11:35Z→00:36Z por 3+ checagens independentes + 2
   do produtor.
4. **L4:** a QA não observou as sessões (boundary produtor/verificador); a revisão cobre
   registro, fronteiras e identidade — não o conteúdo moderado das sessões.
