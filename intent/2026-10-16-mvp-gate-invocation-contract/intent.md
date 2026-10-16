# Intent: Qualificar o contrato de invocação dos gates no tutor MVP

Author: QA de uso declarado de C17, contexto `/root/qa_hermes_mvp` · Change-id: `2026-10-16-mvp-gate-invocation-contract` · Status: **draft**

Origem: incidente observado durante o critério 17 do [plano de prontidão](../2026-10-15-ecosystem-product-readiness/plan.md), que mantém incidentes novos fora do reparo em execução. Este rascunho registra a evidência para decisão própria; não aceita um plano nem autoriza implementação.

> C17 exige tentativa representativa → gates G1–G4 → agendamento/recomputação → card/ledger próprios, incluindo negativa pedagógica/retry/retorno. Script com exit não zero repassa o erro literalmente e para; não se faz autoreparo ou retry improvisado.

## Problem

No harness efetivamente observado, a primeira resposta do aprendiz não chegou a um veredito pedagógico nos casos G3 e G1. Em outro contexto, uma chamada G4 com os campos requeridos chegou ao adaptador existente e parou por ausência de julgamento gravado. O ciclo de prontidão ficou **blocked**; retry pedagógico, agendamento/recomputação, card e retorno permanecem sem prova live completa.

A observação ocorreu em 2026-10-16 UTC, sobre a fonte `0a2e2dbeda5e41b00642a5280e40a0d8102d1102`, com Hermes `0.21.5+2295.gc6e0f24` e o provider já configurado Alibaba / `qwen3.8-max`. Foram usados checkout completo privado, perfil nativo descartável, respostas sintéticas e estado próprio do MVP. Não se mediu impacto em aprendizes reais, outros modelos ou outras plataformas.

| Caso e sessão | Observação real | Resultado esperado de erro e resultado observado |
|---|---|---|
| G3 / C01 — `20261015_222727_3e2def` | `next_step.py` abriu C01, retornou `att_c01_0001` e as perguntas públicas. Após a resposta crua `A A B`, o tutor enviou `raw_reply` em vez de `reply_text` para `gate_check.py`. | Script exit **1**, `Missing required argument reply_text.` O tutor repetiu literalmente o erro e parou, sem outro tool call. Não houve veredito pedagógico; C01 continuou com zero tentativas e apenas eventos de entrada no ledger. |
| G1 / C14 — `20261015_222933_2756e3` | Um cenário com pré-requisitos sintéticos recebeu `concept_id:C14` e `attempt_id:att_c14_0001` de `next_step.py`. O tutor omitiu ambos na chamada do gate e enviou `raw_reply:1`. | Script exit **1**, `Missing required argument concept_id.` O tutor repetiu literalmente o erro e parou, sem schedule/recompute/card. Não se executou um retry dessa falha. |
| G4 / C12 — `20261015_222934_daee50` | A chamada usou `state_dir`, `skill_dir`, `concept_id`, `attempt_id` e `reply_text`, chegando à consulta existente de julgamento gravado. | Script exit **1**, `no recorded G4 judgments for rubric c12_prompt_rewrite.` O tutor repetiu literalmente o erro e parou. O shell encerrou com **0** porque a linha incluía `echo EXIT=$?`; seu stdout preservou `EXIT=1`. O exit externo do Hermes também foi 0 e não constitui PASS do gate. |

São distinções necessárias para o diagnóstico:

- **Prompt e resposta do modelo:** os prompts de QA deram a SKILL, o estado/skill privados e a proibição de inventar veredito ou reparar erro. Os JSONs incorretos de G1/G3 foram produzidos pelo modelo; os prompts e comandos concretos estão retidos. Não se demonstrou que o comportamento se repete em qualquer modelo ou prompt.
- **Schema do script:** [gate_check.py:104–110](../../engines/aiDevschoolMvp/aidevschool/scripts/gate_check.py) requer os cinco campos citados acima. A [SKILL](../../engines/aiDevschoolMvp/aidevschool/SKILL.md) exige um objeto JSON stdin, mas não enumera esses nomes. Essa diferença documental é observável; ainda não está demonstrado que seja a única causa das chamadas incorretas.
- **Pré-requisito G4:** [gate_check.py:88–100](../../engines/aiDevschoolMvp/aidevschool/scripts/gate_check.py) procura um registro pelo digest do artefato e encerra se ele falta. O erro de C12 evidencia essa condição, distinta de uma chamada com schema inválido. Não prova que o avaliador tenha julgado a resposta incorreta nem, sozinho, que o comportamento de rejeição seja defeituoso.
- **Julgamentos separados já retidos:** a sessão nova `20261015_222845_9e38f6` produziu mapas de julgamento para três artefatos sintéticos. Dois registros C13 foram preparados somente no runtime privado; nenhum gate os consumiu antes da limpeza. Temperatura zero não foi comprovada. Isso não fecha a integração G4 e não transforma fixture em verificação live.

### Evidência retida

Os caminhos abaixo são relativos à raiz do repo e permanecem em `.scratch/readiness-implementation-20261015/qa-mvp/`. São evidências locais de execução, não uma entrega de código nem um assessment independente de prontidão. Cada arquivo de comando contém argv/cwd, timestamps e o exit externo.

| Arquivo sob `qa-mvp/` | SHA-256 |
|---|---|
| `02-g3-wrong.tool-evidence.json` | `8e378532b3fddec297be024f450033382759b01e71c2fcadfddfa7c15fc4e020` |
| `02-g3-wrong.result.json` | `2994c93afc400a15fb9203e223e17f9ff4c14c4eee26ae501571833439ff7e4a` |
| `02-g3-wrong.command.json` | `153fca6b34b5cbc034eae56d19e95b51c6bf08997b55dfc76de8abfdd0e6eb41` |
| `04-g1-wrong.tool-evidence.json` | `66bc28a8f9fc674094b8253bf9aa2e0bc1fd86e5f8623dfdfc116d81feb44bc4` |
| `04-g1-wrong.result.json` | `4a20f19c89058768bdbf75b9b7ff1dee292c14c5fe2e3657db2ed34b85e91b62` |
| `04-g1-wrong.command.json` | `69e95adf3e14cba9f65ca60dcd51070729521b715059a209f3ffd6f81e4b52c9` |
| `07-g4-unrecorded.tool-evidence.json` | `0f1d326711686d3665b8589c133f48f6e2a40d32c951c42e3021def7ae7ed4af` |
| `07-g4-unrecorded.result.json` | `280cfaa689820715a265dcc27b95a76397165b81a4f3cf33f42c036b4f97b858` |
| `07-g4-unrecorded.command.json` | `89760cb7e9c7aedac8dc0725e45a4515f49e344f82f055b4871edc97db98e24a` |
| `c01-after-script-error.json` | `489e71b80281b17a4ea202fadb6cf481583c79ef55dc69bea580b13d1eb91da9` |
| `g4-live-judgments.json` | `934f18ddcd0e8fbbe7b559990c54258b3a9b4d8ed8dbd0d403dbfe26b0559f60` |
| `source-sha256.json` | `2a67577a1b058d7633c3db90327f129ed136b484610cfdaf1717c6ca801f94fe` |

Contexto completo: [relatório QA](../../.scratch/readiness-implementation-20261015/qa-mvp/REPORT.md), [comandos](../../.scratch/readiness-implementation-20261015/qa-mvp/commands.json), [transcrição inicial](../../.scratch/readiness-implementation-20261015/qa-mvp/01-start.transcript.json). O runtime privado foi encerrado: cron próprio removido, perfil ausente e worktree arquivado. O relatório preserva a limitação dos hashes do DB compartilhado após a gestão nativa de perfil; não se infere corrupção de chat.

## Proposed outcome

Decidir e tornar verificável o contrato oferecido entre o tutor e os scripts: uma resposta crua de aprendiz deve chegar ao gate com a identidade de tentativa devolvida pelos scripts e produzir o resultado previsto pelo contrato. O ciclo representativo deve permitir distinguir negativa pedagógica com retry normal, erro de invocação e ausência de pré-requisito G4.

Para G4, a oferta deve explicitar como um julgamento elegível chega ao registro por digest, ou declarar a limitação correspondente. Uma chamada sem registro continua repassando o erro literal e parando, enquanto essa for a regra vigente. A prova futura deve separar o exit do script, do shell e do harness; um exit externo 0 não pode encobrir uma falha interna.

Este intent não escolhe solução técnica nem pede novas chamadas de modelo. O resultado desejado exige um plano próprio aceito e evidência nova no candidato que eventualmente o implementar.

## Affected users and systems

`engines/aiDevschoolMvp/`, sua SKILL, as cinco interfaces JSON de scripts, o adaptador G4 por registro de digest e a qualificação C17. A evidência atual cobre apenas o perfil de QA no Hermes indicado acima. Os estados `MASTERED`, card e ledger continuam pertencendo ao MVP; `learner/` e o currículo compartilhado não ganham autoridade ou migração por este incidente.

## Constraints

- Rascunho somente: sem fix, novas fixtures, alteração de provider/modelo, novas credenciais, operações Hermes adicionais, commit, push ou publicação.
- Não alterar checks congelados nem converter a qualificação bloqueada em PASS usando testes de contrato, presença de CLI ou respostas simuladas.
- Manter o repasse literal e a parada em qualquer exit não zero; não improvisar veredito, autoreparo ou retry de script.
- Não expor chaves, dados pessoais reais ou exemplares privados no contexto do tutor. Evidência usa somente dados sintéticos e digests.
- Preservar as fronteiras entre estado local do MVP, maestria canônica e readiness. Uma futura verificação deve ter contexto distinto do produtor.
- Qualquer futura mudança de contrato/gate segue o plano aceito, a revisão e a atualização de MANIFEST aplicáveis; este arquivo não executa essas etapas.

## Open questions

1. Qual contrato de invocação o operador e o tutor devem receber, e como sua suficiência será demonstrada sem atribuir previamente a causa ao prompt, à SKILL ou ao modelo?
2. Quais harnesses, versões e configurações compõem a oferta? A evidência atual de Hermes/Alibaba não decide suporte ou falha de outros modelos/plataformas.
3. Como a oferta G4 obtém julgamentos gravados vinculados ao artefato, com contexto e parâmetros verificáveis? Ausência de registro é um bloqueio esperado, um pré-requisito de operação a documentar ou uma lacuna da oferta?
4. Qual sequência aceita demonstra erro pedagógico/retry/retorno e schedule/recompute/card, conservando a regra de parada em erro técnico?
5. Como distinguir e reter exits internos quando o shell ou o harness encerra com 0, sem promover esses sinais externos a sucesso do gate?
6. Quais evidências locais precisam de retenção durável antes de uma eventual publicação/revisão, já que `.scratch/` não é fonte versionada?
