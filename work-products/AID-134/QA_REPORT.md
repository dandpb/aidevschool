# AID-134 — reconciliação de AID-125 com o GO final de AID-130

**Disposição:** DONE — AID-125 superado por evidência posterior  
**Severidade máxima aberta:** nenhuma bloqueante  
**Data:** 2026-08-24 UTC

## Resultado executivo

O NO-GO de AID-125 foi correto para o candidato então testado: o WAREHOUSE falhava na compilação
TypeScript e impedia `npm run build:pilot`. AID-130 repetiu a verificação após a correção e obteve
GO condicionado, com o caminho feliz e os contratos fail-fast aprovados. Não há conflito entre os
vereditos: eles descrevem candidatos em estados diferentes.

Nesta reconciliação, o par mínimo de provas decisivas foi repetido na árvore atualmente disponível.
Os 7 testes do contrato do bundle passaram e o build integrado voltou a compilar as cinco
superfícies, inclusive WAREHOUSE, encerrando com status 0 e promovendo `dist`. Portanto, a condição
de reteste declarada por AID-125 está satisfeita e seu NO-GO não permanece como bloqueio ativo.

## Charter baseado em risco

1. **Rastreabilidade:** confirmar que AID-125 e AID-130 tratam a mesma condição bloqueante.
2. **Regressão do bloqueador:** provar novamente que WAREHOUSE e o agregado compilam.
3. **Integridade do bundle:** confirmar que os contratos automatizados fail-fast continuam verdes.

## Ambiente e comandos

- Workspace compartilhado, branch `main`, árvore com alterações preexistentes de múltiplos autores.
- Node `v24.18.0`, npm `11.17.0` (conforme a execução original de AID-130).
- Estado canônico do learner não foi editado.

```text
$ npm run test:pilot-bundle
tests 7; pass 7; fail 0

$ npm run build:pilot
[pilot] building OS
[pilot] building LiteracyDojo
[pilot] building WAREHOUSE
[pilot] building WORMHOLE
[pilot] building RELAY STATION
[pilot] complete bundle ready at .../engines/codexdojo-os-prototype/dist
exit 0
```

## Matriz de reconciliação

| Evidência | AID-125 | AID-130 | AID-134 |
| --- | --- | --- | --- |
| Contratos fail-fast | 4/4 PASS | 7/7 PASS | 7/7 PASS |
| `build:pilot` | FAIL no WAREHOUSE | PASS, 5 superfícies | PASS, 5 superfícies |
| Bundle publicável local | não produzido | produzido e verificado | produzido |
| Veredito aplicável | NO-GO ao candidato antigo | GO condicionado | mantém GO condicionado |

## Limitações

- Nenhum deploy Netlify real foi executado.
- O host local não reproduz Node 22 nem a imagem do provedor.
- A árvore está modificada e o manifesto usa revisão não fechada; publicação requer commit
  rastreável, credenciais/controles normais e validação pós-deploy.
- Este reteste focado não repete os 218 testes e 62 smokes de AID-130; ele reconfirma somente a
  condição que tornava AID-125 bloqueante e o contrato automatizado do bundle.

## Disposição final

**DONE.** AID-125 deve ser lido como registro histórico de um bloqueio já resolvido, não como veto
vigente. O veredito corrente permanece o GO condicionado de AID-130, com as limitações operacionais
acima. Mudança posterior no candidato invalida esse aceite e exige novo reteste focado.
