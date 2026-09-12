# AID-204 — reconciliação da cadeia Dev após AID-200

Data: 2026-08-26 UTC

## Addendum — GO independente em 2026-08-27

O NO-GO abaixo permanece o registro correto para o candidato histórico `6a8e4946…`, mas deixou
de ser o veredito vigente da cadeia. AID-231 concluiu com **GO independente** para o novo candidato
WAREHOUSE `6a8f7ece5ac75e84270cc00e`:

- Chromium remoto: 1/1;
- intake/persistência: 6/6;
- dispatch Node: 5/5;
- tentativas FAIL/PASS com `attempt_id` e `evidenceId` distintos e correlacionados no mesmo
  `missionRunId`;
- persistência após reload;
- learner canônico inalterado.

Fonte independente: `docs/qa/AID-236_QA_CONSOLIDADA_WAREHOUSE_2026-08-27.md` e AID-231.

Consequências da reconciliação:

- AID-207 pode ser encerrada: seus critérios foram aceitos por QA independente no candidato novo;
- AID-190 deve ser encerrada pelo QA Lead, preservando o histórico de NO-GO dos candidatos antigos
  e registrando o GO consolidado do candidato `6a8f7ece…`;
- AID-180 está tecnicamente pronta para decisão executiva, mas nenhuma promoção de alias ou convite
  é autorizada sem confirmação explícita do CEO.

## Resultado

O veredito independente da AID-200 para o candidato imutável `6a8e4946e0a6aeca65a0ce65`
é **NO-GO**. O WAREHOUSE carrega e emite uma segunda evidência `pass:true` após retry, mas o
host persiste apenas a primeira evidência `pass:false`, mantém `Evidência rejeitada` e não produz
recibo aprovado correlacionado ao novo `attempt_id`.

O ramo NO-GO foi aplicado sem promover alias, convidar coorte, alterar mastery ou escrever no
learner canônico.

## Reconciliação

| Issue | Disposição | Base factual |
| --- | --- | --- |
| AID-197 | `cancelled` como supersedida | O mesmo blocker de retry agora vive unicamente na AID-207, com owner e critério de conclusão. |
| AID-191 | `done` | AID-200 confirmou iframe/WebGL carregado e ausência do erro de MIME que motivou a issue. |
| AID-190 | `done` | A responsabilidade de QA foi concluída com NO-GO e originou AID-191; não é trabalho de produto pendente. |
| AID-187 | `done` | AID-200 confirmou WAREHOUSE same-origin carregado; o blocker CSP não reapareceu. |
| AID-186 | `done` | A responsabilidade de QA foi concluída com NO-GO e originou AID-187. |
| AID-185 | `done` | O candidato e handoff foram produzidos; defeitos posteriores têm issues próprias e não reabrem a entrega histórica. |
| AID-207 | permanece caminho vivo | Único defeito crítico: corrigir persistência/correlação por tentativa, publicar novo candidato imutável e devolver a QA independente. |
| AID-180 | permanece `blocked` | Coorte e alias continuam em HOLD até novo candidato e novo GO independente. |

## Evidência consultada

- `work-products/AID-200/QA_REPORT.md`
- `work-products/AID-200/qa-result.json`
- `work-products/AID-200/final-state.png`
- `work-products/AID-206/UNBLOCK_REPORT.md`

## Guardrails

- nenhuma alteração em `learner/`, `.mavis/` ou projeções geradas;
- nenhuma alegação de mastery, release ou aprovação do candidato;
- produtor e verificador continuam separados: AID-207 é engenharia; o novo candidato exige novo
  QA independente;
- HOLD explícito para alias e convites de coorte.

## Disposição

`done` — a cadeia foi integralmente reconciliada. AID-190 foi encerrada pelo QA Lead; AID-207 foi
encerrada após o GO independente; todas as issues históricas listadas estão terminais. A decisão
executiva de retomar AID-180 foi preparada na interação
`a7973153-7292-4f2d-9d50-03cb5cfd644f`; alias e convites permanecem em HOLD até aceitação.
