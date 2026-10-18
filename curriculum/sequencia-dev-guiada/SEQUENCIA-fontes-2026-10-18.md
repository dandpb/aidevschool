# Nota versionada de fontes — 2026-10-18 (PR #715)

Esta nota complementa a leitura da r1 sem editar seu registro histórico nem
ratificar uma revisão r2 da sequência.

A tabela da §1 continua descrevendo exclusivamente a base histórica
`d9dbdd5c504ef76a42d3f7944392dccee3eb6351`; nela, o blob de l28 é
`386c27fe1a6b`. l28 v3 usa o blob posterior `e88dc1192433`; essa revisão não
substitui o objeto histórico na tabela. O objetivo permanece equivalente; a
revisão posterior também alterou feedback de cobertura/review e metadados de
competências, além da versão.

## Erratas adiadas para emenda própria

O PR #715 mantém os bytes de pg-d03/pg-d04 aceitos em main pelo PR #710. As
erratas propostas abaixo ficam fora da onda l33–l35, pois mudam fontes
congeladas e fazem os adapters e o catálogo de missões rejeitar a composição:

- pg-d03 `enunciado.md`: trocar a âncora `386c27fe1a6b` por `e88dc1192433` e
  registrar `l28 v2→v3 na onda 2026-09-30.1; objetivo inalterado`.
- pg-d04 `rubrica-v1.md`: separar `nãoreporta` em `não reporta` no perCheck c1,
  e `verificadorreporta` em `verificador reporta` nos perChecks c2 e c5.

Uma emenda futura deve revisar extrações, âncoras e versões dos dois pacotes,
registrar o aceite dos campos `reviewRequired` e obter autorização específica
para alterar os testes existentes dos adapters, preservando os negativos reais.
Não basta substituir hashes. A restauração atual mantém as versões
`pg-d03@20b608d64a13` e `pg-d04@730ac9dc41c2`; não muda a lição l28 canônica.
Esta nota não concede readiness, maestria ou aceite pedagógico à onda W2.
