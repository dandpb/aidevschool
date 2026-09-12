# AID-256 — reconciliação do GO de AID-242 com o gate AID-180

## Resultado

O gate técnico da coorte foi atualizado para **GO** no bundle unificado promovido por AID-253. A
coorte permanece **BLOCKED antes de convites** exclusivamente pelos gates humanos já registrados
em AID-180: confirmação do CEO, nomeação de moderador e QA independente, armazenamento restrito e
recrutamento/agendamento consentido.

## Cadeia de aceite

1. AID-242 produziu o candidato integrado, sem declarar GO ou release.
2. AID-251, em contexto independente, emitiu GO funcional condicionado somente à rastreabilidade
   por revisão Git imutável.
3. AID-253 satisfez essa condição, vinculou o bundle à revisão
   `ec265fab13ac98700e9de58b5d719d55d979178d` e promoveu o artefato ao alias canônico.
4. AID-254 verificou a promoção em contexto independente: smoke remoto `6/6` no permalink e
   `6/6` no alias, correlação da revisão/tree e learner canônico preservado; disposição **GO**.
5. O preflight de AID-256 confirmou `HTTP 200` em `/` e `/apps/warehouse/`; o manifesto remoto
   declarou a mesma revisão de AID-253.

## Identidade aceita pelo gate técnico

- Revisão: `ec265fab13ac98700e9de58b5d719d55d979178d`
- Deploy: `6a9141bc5ac75e6a300cc00e`
- Permalink: <https://6a9141bc5ac75e6a300cc00e--aidevschool-codexdojo-os.netlify.app>
- Alias: <https://aidevschool-codexdojo-os.netlify.app>
- SHA-256 do manifesto: `ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f682c7fc6b7`

Qualquer novo deploy invalida este GO até nova correlação e QA independente. O aceite não autoriza
escrita em `learner/`/`.mavis/`, não declara mastery e não envia convites.

## Evidência consultada

- `_work-products/AID-242/VERIFICATION.md`
- `docs/qa/AID-251_QA_CANDIDATO_INTEGRADO_2026-08-28.md`
- `_work-products/AID-253/RELEASE.md`
- `docs/qa/AID-254_QA_PROMOCAO_AID-253_2026-08-28.md`
- `work-products/AID-180/INITIAL_CONTROLLED_COHORT.md`
