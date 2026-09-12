# AID-178 — QA independente do candidato AID-177

**Execução:** 2026-08-25T18:24:21Z  
**Responsável:** QA Lead `ca6a3f95-8572-43f4-822a-6b40b9bdb63b`  
**Host OS:** `6a8ddcddb4a14cda431ff91e`  
**LiteracyDojo:** `6a8ddc9afe6838bdcf19a465`  
**Disposição:** **GO — nenhum defeito bloqueador reproduzido; HOLD pode ser removido pelo CEO**

## Resultado executivo

Em Chromium headless, contexto novo e sem estado persistido, a jornada pública IA Prática foi
concluída no permalink imutável. O iframe resolveu exatamente para o permalink LiteracyDojo
declarado, a tentativa `l02` v3 obteve recibo independente `PASS`, e o mesmo
`attempt_id=att-000001` apareceu no payload e na UI. Termos e privacidade retornaram 200 e os
SHA-256 coincidiram com o registro do candidato. Não houve `mastered` na tela; o recibo limitou a
alegação do produtor a `completed` e declarou `producer_writes_mastered=false`. Hash e mtime do
arquivo canônico local permaneceram inalterados.

## Cartas de risco e evidência

| Risco | Prova executada | Resultado |
| --- | --- | --- |
| Host apontar para origem mutável/incorreta | inspeção de `iframe.src` em browser limpo | PASS; permalink exato `6a8ddc9afe6838bdcf19a465` |
| Jornada pública quebrada | entrada → missão → resposta B + fontes + limites → conclusão | PASS |
| Verificador ausente ou permissivo | POST real observado no endpoint imutável | PASS; HTTP 200, `source=independent-literacy-verifier`, `verifier_version=1-netlify-l02-v3` |
| Recibo não correlacionado | comparar payload e texto renderizado | PASS; `att-000001` em ambos |
| Drift legal | GET pelos links da jornada + SHA-256 | PASS; 200/200 e hashes esperados |
| Falso mastery/escrita do produtor | tela e campos do recibo | PASS; sem `mastered`, `producer_writes_mastered=false`, `max_producer_claim=completed` |
| Escrita canônica no workspace | SHA-256 + mtime antes/depois | PASS; ambos inalterados |
| Regressão de contrato/bundle | `test:pilot-bundle` + testes focados de intake/gateway | PASS; 13/13 e 16/16 |

Evidência visual: [qa-public-journey-result.png](./qa-public-journey-result.png)  
Harness reproduzível: [qa-public-journey.mjs](./qa-public-journey.mjs)

## Comandos e ambiente

Linux; Node `v24.18.0`; npm `11.17.0`; Playwright/Chromium `1.61.1`; viewport 1280×900.

```bash
rtk node work-products/AID-178/qa-public-journey.mjs
cd engines/codexdojo-os-prototype
rtk npm run test:pilot-bundle
rtk npm test -- --run src/verification/localBridgeGateway.test.ts src/verification/evidenceIntake.test.ts
```

Resultados: harness público PASS; bundle 13/13 PASS; contratos focados 16/16 PASS.

## Recibo observado

```text
endpoint                 https://6a8ddc9afe6838bdcf19a465--aidevschool-literacydojo.netlify.app/.netlify/functions/literacy-verify
HTTP                     200
verdict                  PASS
context_isolated         true
lesson_id/version        l02 / 3
activity_id              l02-a1
attempt_id               att-000001
producer_writes_mastered false
max_producer_claim       completed
```

```text
termos.html                 385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12
privacidade.html            27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487
learner/learning_state.yaml c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf
```

## Limitações

- O verificador deste candidato cobre intencionalmente somente `l02` v3; nenhuma alegação é feita
  sobre outras lições.
- A ausência de escrita canônica foi comprovada no workspace compartilhado por hash e mtime. QA
  não possui observabilidade do filesystem interno da função Netlify.
- A aceitação usa somente os dois permalinks imutáveis; aliases mutáveis não fazem parte do gate.
- Não foi executada a suíte completa do monorepo: os testes focados e a jornada pública cobrem os
  riscos do candidato sem interferir nas mudanças concorrentes presentes no workspace.

## Disposição

**GO para o candidato AID-177.** A evidência independente satisfaz os critérios de AID-178. O CEO
pode remover o HOLD de convites para este candidato imutável, respeitando o limite explícito da
missão `l02` v3. Qualquer novo deploy ou mudança de hash exige nova QA.
