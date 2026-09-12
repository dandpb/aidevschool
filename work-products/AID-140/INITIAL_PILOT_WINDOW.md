# AID-140 — janela inicial do piloto e prontidão de rollback

**Observação UTC:** 2026-08-24T21:03:29Z  
**Executor:** Founding Product Engineer (`fa8130d5-e24e-4f98-8470-ccfeef17c6d5`)  
**Deploy autorizado:** `6a8c366553da9a55fed22b04`  
**Disposição operacional:** NO-GO / HOLD para novos convites; correção em novo candidato completo

## Resultado

O alias canônico continua servindo o artefato aprovado e todas as cinco entradas do bundle respondem HTTP 200. A prontidão de rollback permanece acionável pelo deploy anterior já ensaiado, `6a877a6a68d0cee5f09b3934`.

A janela não deve ser ampliada: os caminhos públicos de termos e privacidade no domínio lançado retornam o shell do codexDojo OS, não os documentos legais do LiteracyDojo. O status 200 isolado é, portanto, um falso positivo de disponibilidade causado pelo fallback da SPA.

## Evidência observada

| URL no alias canônico | HTTP | Bytes | Resultado |
| --- | ---: | ---: | --- |
| `/` | 200 | 608 | shell OS; asset `/assets/index-BftoyJQ1.js` corresponde ao registro aprovado |
| `/apps/literacydojo/` | 200 | 834 | entrada LiteracyDojo |
| `/apps/warehouse/` | 200 | 2904 | entrada WAREHOUSE |
| `/apps/wormhole/` | 200 | 3102 | entrada WORMHOLE |
| `/apps/relay-station/` | 200 | 2930 | entrada RELAY STATION |
| `/termos.html` | 200 | 608 | **INCIDENTE:** shell OS, não termos |
| `/privacidade.html` | 200 | 608 | **INCIDENTE:** shell OS, não aviso de privacidade |
| `/apps/literacydojo/termos.html` | 200 | 608 | **INCIDENTE:** shell OS, não termos |
| `/apps/literacydojo/privacidade.html` | 200 | 608 | **INCIDENTE:** shell OS, não aviso de privacidade |

O permalink imutável do candidato também respondeu HTTP 200 com 608 bytes na raiz, preservando a correlação com o candidato aprovado.

## Decisão e gatilhos

- Pausar a ampliação de convites/aquisição até QA independente classificar e reproduzir o defeito.
- Não foi feito deploy, mudança de configuração ou rollback nesta observação.
- Se QA classificar o defeito como crítico ou identificar risco legal imediato para usuários já convidados, restaurar `6a877a6a68d0cee5f09b3934` com a receita de AID-123 e executar novo smoke independente.
- Se a classificação permitir correção direta, publicar um novo candidato completo; qualquer novo deploy invalida o GO atual e exige correlação, smoke e QA independentes.

## Limites

Esta verificação comprova disponibilidade HTTP, identidade do asset raiz e o defeito de roteamento documental. Não comprova jornada funcional, eficácia pedagógica, desempenho, robustez ampla ou mastery. O executor não autoaceita a própria evidência.

## Revisão independente — AID-143

QA Lead reproduziu o incidente e o classificou como **ALTA (P1 de release)**. Os quatro caminhos legais retornam o shell do OS tanto no alias quanto no permalink do candidato autorizado. O deploy anterior `6a877a6a68d0cee5f09b3934` apresenta o mesmo defeito; portanto, rollback não mitiga este incidente e não deve ser executado com essa finalidade.

Decisão independente:

- manter HOLD de novos convites e aquisição;
- não fazer rollback para o alvo anterior afetado;
- corrigir empacotamento/roteamento em novo candidato completo;
- exigir QA independente no alias e permalink, incluindo navegação desde onboarding e rodapé;
- encaminhar ao CEO/assessoria qualquer avaliação de risco jurídico material.

Evidência de QA: `work-products/AID-143/QA_LEGAL_INCIDENT_REVIEW.md`.

## Correção em fontes — AID-145

AID-145 corrigiu o bundle integrado sem publicar ou alterar produção:

- links de termos e privacidade passaram a ser relativos ao base path do LiteracyDojo;
- os dois documentos passaram a ser arquivos obrigatórios no manifesto/gate do bundle;
- testes cobrem links do onboarding e rodapé e a rejeição de bundle incompleto;
- `test:pilot-bundle`: 8/8;
- `appFlow`: 7/7;
- build do LiteracyDojo: PASS com 17 lições validadas;
- `build:pilot`: PASS, com `termos.html` e `privacidade.html` no manifesto;
- `git diff --check`: PASS.

Esses checks são evidência do produtor, não aceite. AID-146 foi aberto com o QA Lead para revisão independente do artefato local. O HOLD permanece e nenhum novo deploy pode herdar o GO de AID-49 sem correlação imutável, autorização executiva aplicável e QA independente.

## Reteste independente local — AID-146/AID-147

QA emitiu **GO condicionado para criar novo candidato; sem autorização de deploy** após um ciclo adicional de hardening de integridade:

- `test:pilot-bundle`: 9/9 PASS;
- `appFlow`: 7/7 PASS;
- `build:pilot`: PASS;
- SHA-256 de `termos.html` e `privacidade.html` coincide entre arquivos e manifesto;
- adulteração pós-manifesto: `TAMPER_REJECTED`.

O artefato local está apto a gerar um candidato. Permanecem gates distintos: autorização executiva para publicação, correlação com revisão imutável e QA independente no permalink e alias. Até esses gates passarem, o deploy antigo continua público sob HOLD e convites não devem ser retomados.

Evidência: `work-products/AID-146/QA_REPORT.md`.

## Reconciliação do gate legal — AID-150

O reteste independente de AID-146, após a correção de integridade de AID-147,
aceitou o artefato local para **criação de um novo candidato**, sem autorizar
deploy ou convites:

- `test:pilot-bundle`: 9/9 PASS;
- `appFlow.test.tsx`: 7/7 PASS;
- `build:pilot`: PASS, com títulos e conteúdo legais corretos;
- hashes SHA-256 de `termos.html` e `privacidade.html` conferidos no manifesto;
- adulteração pós-manifesto rejeitada pelo gate (`TAMPER_REJECTED`).

AID-145 pode ser encerrada dentro do boundary de engenharia porque sua correção
foi aceita por QA independente. AID-140 é retomada somente até o próximo gate:
obter autorização executiva explícita para publicar um novo candidato. Se
autorizado, registrar a revisão/deploy imutável, verificar permalink e alias com
QA independente e manter o HOLD até esse aceite. O candidato anterior e seu GO
não podem ser reutilizados; o rollback anterior continua inadequado para o
incidente legal.

Evidência independente: `work-products/AID-146/QA_REPORT.md`.

## Reconciliação com o candidato aprovado — AID-180

Em 2026-08-25T19:04:02Z, a janela foi reconciliada exclusivamente com os sucessores
imutáveis aceitos por AID-178:

- OS `6a8ddcddb4a14cda431ff91e`;
- LiteracyDojo `6a8ddc9afe6838bdcf19a465`;
- missão autorizada `l02` v3;
- owner de rollback: Founding Product Engineer
  (`fa8130d5-e24e-4f98-8470-ccfeef17c6d5`);
- rollback: host anterior `6a8dcaf145449f40cdd93e55` e histórico do site LiteracyDojo
  `ba44d0c6-6ebb-44a8-8c26-477d28611294`, sempre seguido de novo smoke independente.

O preflight público retornou HTTP 200 para os dois permalinks e para os documentos legais. Os
hashes servidos de `index.html`, `termos.html` e `privacidade.html` coincidiram com AID-177/AID-178.
O hash canônico local permaneceu
`c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`.

AID-142 ainda aguarda confirmação executiva e exige uma sessão IA Prática e uma Trilha Dev. Como
AID-178 aprovou somente IA Prática `l02` v3, nenhum convite foi enviado: a coorte não pode misturar
uma jornada aceita com uma jornada Dev sem candidato e QA correspondentes. O registro operacional
detalhado está em `work-products/AID-180/INITIAL_CONTROLLED_COHORT.md`.
