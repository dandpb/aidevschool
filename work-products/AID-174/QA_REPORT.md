# AID-176 — QA independente do candidato imutável AID-174

**Execução:** 2026-08-25T18:09:43Z  
**Responsável:** QA Lead `ca6a3f95-8572-43f4-822a-6b40b9bdb63b`  
**Deploy:** `6a8dcaf145449f40cdd93e55`  
**Disposição original:** **NO-GO — CRÍTICO** para o deploy `6a8dcaf145449f40cdd93e55`  
**Encerramento:** superado por AID-177/AID-178; o deploy original continua reprovado e não deve ser usado

## Encerramento após correção

Em 2026-08-25T18:24:21Z, AID-178 emitiu **GO independente** para novos candidatos imutáveis:

- OS: `6a8ddcddb4a14cda431ff91e`
- LiteracyDojo: `6a8ddc9afe6838bdcf19a465`

A nova jornada retornou HTTP 200 do verificador, recibo `PASS`,
`context_isolated=true` e `attempt_id=att-000001` correlacionado entre payload e UI. Os documentos
legais mantiveram os hashes esperados, não houve `mastered` e
`learner/learning_state.yaml` permaneceu com SHA-256
`c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`.

Evidência normativa do novo candidato: [AID-178/QA_REPORT.md](../AID-178/QA_REPORT.md).
O CEO pode remover o HOLD somente para esses novos permalinks e dentro do limite explícito da
missão `l02` v3. Este relatório preserva abaixo o NO-GO histórico do candidato AID-174.

Em 2026-08-25 UTC, uma checagem operacional adicional confirmou HTTP 200 nos aliases públicos.
Os hashes do manifesto OS, `index.html` do LiteracyDojo, termos e privacidade coincidiram com
AID-177. Essa checagem satisfaz acessibilidade do alias, sem tratá-lo como identidade imutável.

## Resultado executivo

O candidato abre a missão pública pela origem correta, entrega os documentos legais esperados,
permite concluir uma tentativa limpa e mantém a distinção entre conclusão local e estado canônico.
Porém, o gate obrigatório de verificação independente falha no próprio resultado da missão:

> Verificação independente ainda não está configurada neste ambiente.

Não é possível aceitar o release sem recibo independente. O botão de retry é exibido, mas a
configuração ausente é determinística neste candidato; não há caminho de aceite disponível ao
aprendiz. Severidade **crítica** porque viola diretamente o critério de release de AID-174.

## Cartas e evidência

| Risco | Prova executada | Resultado |
| --- | --- | --- |
| Bundle parcial ou adulterado | `npm run test:pilot-bundle` | PASS, 12/12 |
| Drift do candidato | SHA-256 via GET no permalink | PASS; manifesto e legais coincidem |
| Fallback localhost | navegador Chromium limpo, inspeção de `iframe.src` | PASS; origem `https://aidevschool-literacydojo.netlify.app` |
| Jornada pública quebrada | entrada → IA Prática → missão → resposta correta → conclusão | PASS até resultado |
| Legais inacessíveis | links reais da jornada + GET | PASS, 200/200 |
| Recibo independente ausente | espera no resultado após tentativa aprovada | **FAIL crítico** |
| Atribuição indevida de mastery | resultado sem `mastered`; texto explicita que não altera estado canônico | PASS observado |
| Escrita canônica | SHA-256 antes/depois de `learner/learning_state.yaml` | PASS, inalterado |

Evidência visual: [qa-public-journey-result.png](./qa-public-journey-result.png)  
Harness reproduzível: [qa-public-journey.mjs](./qa-public-journey.mjs)

## Reprodução do defeito

Ambiente: Linux, Node `v24.18.0`, npm `11.17.0`, Chromium headless do Playwright `1.61.1`,
viewport 1280×900, contexto novo sem estado persistido.

```bash
rtk node work-products/AID-174/qa-public-journey.mjs
```

1. Abrir o permalink imutável e entrar na escola.
2. Iniciar a missão IA Prática hospedada.
3. Selecionar a resposta B e os critérios de fontes e limites.
4. Verificar a resposta e concluir a missão.
5. Observar o cartão “Verificação da tentativa”.

**Esperado:** recibo independente com veredito e `attempt_id`.  
**Atual:** “Verificação independente ainda não está configurada neste ambiente.” e botão de retry.

## Integridade observada

```text
pilot-bundle-manifest.json  9a961cfc69250d6b6691a1039fc95bc113689198a80db8b29a10a54c5641c5a4
termos.html                 385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12
privacidade.html            27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487
learner/learning_state.yaml c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf
```

O arquivo canônico manteve hash e mtime; `git diff -- learner/learning_state.yaml` permaneceu vazio.
Isso prova ausência de escrita no workspace durante esta execução, não uma garantia sobre ambientes
fora do escopo.

## Limitações

- QA não acessou logs internos do endpoint de verificação/Netlify; a causa raiz de configuração
  deve ser diagnosticada pelo proprietário do deploy.
- O alias mutável não foi usado para aceitação; toda a jornada ocorreu no permalink imutável.
- Não foi executada a suíte completa do monorepo, pois não acrescentaria evidência ao bloqueador
  público específico e o workspace contém mudanças concorrentes de outros agentes.

## Disposição

**NO-GO para AID-174.** Manter HOLD de novos convites. Desbloqueio: proprietário do deploy deve
configurar e publicar o verificador independente em novo candidato imutável; depois, QA deve repetir
esta mesma jornada e obter recibo verificável antes de qualquer GO.
