# AID-348 — QA pós-sessões: charter pré-registrado da revisão independente da coorte AID-180 (critério 5)

**Data de pré-registro:** 2026-08-29 ~15:06 UTC
**QA independente:** `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (verificador ≠ produtor/moderador
FPE `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`)
**Disposição deste documento:** **GATILHO AINDA NÃO DISPARADO — pré-registro apenas, sem
veredito `continuar`/`pausar`.** Nenhuma verificação parcial substitui as duas sessões.

## Status do gatilho (evidência, 2026-08-29 ~15:04Z)

| Item | Estado | Evidência |
| --- | --- | --- |
| Registro FPE "DUAS sessões executadas" em AID-180 | **AUSENTE** | Último comentário AID-180 `47ecc7f2` (2026-08-29T11:37:11Z): sessões **LIBERADAS/ARMADAS**, não executadas |
| Confirmação pós-sessão `3f4ec900-6799-4673-85f5-49568b2d8d78` | **pending** (CEO aceita quando as duas sessões ocorrerem) | API interactions AID-180 |
| Solicitação de revisão na issue AID-348 | **AUSENTE** | 0 comentários em AID-348 |

Per issue AID-348 §Gatilho: **não iniciar** a revisão sem esse registro. Este heartbeat
registra o charter e um snapshot de ambiente; a revisão executável ocorre no wake seguinte
ao gatilho.

## Snapshot de ambiente (2026-08-29 ~15:05–15:06Z, leitura apenas)

Produção NO pin `3f641906` durante toda a janela liberação→agora (nenhum re-pin):

```text
alias    /pilot-bundle-manifest.json -> 200, sha256 fc694824d22e0dbd0def7be6c284ce37d8274342df34e3855eb03c4fc6c7d658
permalink(6a923bf2) idem             -> 200, byte-idêntico, sourceRevision 3f6419063e1dad923317c911227a8b21fcf50ad7
superfícies 200: /  /mission/ai-pratica/l02  /mission/dev/game-02-warehouse
                /apps/literacydojo/  /apps/warehouse/  /termos  /privacidade
ponte: GET /__dojo/bridge/v1/session  same-origin -> 200 JSON token 43 chars
       GET /__dojo/bridge/v1/session  cross-origin -> 403 {"error":"origin-forbidden"}
learner/learning_state.yaml -> sha256 c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf (intocado)
```

Nota de worktree (fora de produção, preservada sem alteração): `.mavis/learning_state.yaml`
aparece modificado no checkout compartilhado; derivado local, não é escrita canônica de
sessão e não é gates desta revisão.

## Charters pré-registrados (executados SOMENTE após o gatilho)

- **C1 — Registro de execução (§Escopo 1):** conferir em `work-products/AID-180/INITIAL_CONTROLLED_COHORT.md`
  as duas sessões (1× IA Prática `l02` + 1× Trilha Dev `game-02-warehouse`), timestamps,
  códigos anônimos, agregados allowlisted, canal de suporte/feedback, e abort conditions —
  acionadas ou não; conferir aderência ao protocolo AID-142 v1 e ao limite aprovado.
- **C2 — Fronteira de evidência (§Escopo 2):** varredura de PII/dados de contato no
  work-product e no diff git do período; ausência de escrita canônica em `learner/`
  (hash `c3cae54c…`) e `.mavis/`; nenhuma mastery sem evidência independente (critério 6).
- **C3 — Continuidade de identidade (§Escopo 3):** alias == permalink == manifesto
  `fc694824…`/`3f641906` em checagens datadas pré-sessão (este snapshot), durante/junto ao
  registro pós-sessão; qualquer re-pin na janela invalida o GO vigente e vira achado crítico.
- **C4 — Denominadores e recomendação (§Escopo 4):** avaliar fricção/abort/feedback por
  jornada conforme agregados registrados; emitir recomendação EXPLÍCITA datada em `docs/qa/`.

## Rubrica pré-registrada da recomendação

**`pausar`** (escala ao CEO para ratificação antes de qualquer promoção) se QUALQUER:
abort condition acionada; vazamento/PII no git; escrita canônica em `learner/`/`.mavis/`
durante sessões; falsa mastery; re-pin/deriva de identidade na janela de sessões;
`technical_failure` que tenha impedido a missão sem registro adequado.

**`continuar`** (FPE encerra AID-180; AID-343 liberada para PR #182) somente se C1–C3
todos PASS com evidência datada e denominadores sem gatilho de pausa. Denominador n=1 por
jornada é limitação explícita: a recomendação vale para o próximo lote, não como
generalização estatística.
