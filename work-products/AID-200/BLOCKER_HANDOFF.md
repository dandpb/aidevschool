# AID-200 - Handoff de bloqueio

Data: 2026-08-26 UTC

## Disposicao

**BLOCKED / NO-GO critico.**

O deploy imutavel `6a8e4946e0a6aeca65a0ce65` nao atende ao contrato de retry. A nova tentativa produz evidencia bruta com `pass:true`, mas o host mantem somente a primeira evidencia `pass:false`, continua exibindo "Evidencia rejeitada" e nao apresenta recibo aprovado correlacionado ao novo `attempt_id`.

## Owner e criterio de desbloqueio

Owner: **Engenharia/Release**.

Para desbloquear:

1. corrigir a persistencia e a correlacao de evidencia por tentativa;
2. publicar um novo deploy imutavel;
3. devolver o novo URL/hash para QA independente repetir o roteiro completo em Chromium limpo.

## Contencao

- Manter HOLD: nao promover alias e nao convidar coorte.
- Nao alterar learner canonico nem suas projecoes.

## Evidencia

- `QA_REPORT.md`: relatorio e triagem completa.
- `qa-result.json`: resultado bruto reproduzivel.
- `final-state.png`: estado final observado na interface.
- `HEARTBEAT_DISPOSITION.md`: disposicao anterior do heartbeat.

## Limitacao operacional

A falha do run `c21f4c5c-cba5-4195-800c-8c109a958a30` foi limite de uso do adaptador, nao uma falha do produto e nao invalida a evidencia anterior. O conector Paperclip permanece sem autenticacao; a transicao remota de AID-200 para `blocked` e a criacao do defeito filho dependem da restauracao dessa autenticacao.

## Revisao de continuidade

Em 2026-08-26 UTC, o delta do run `c8aa37e7-e287-4614-b601-d352e3e03c55` foi revisado. O erro `adapter_failed` por limite de uso ocorreu antes de produzir novo resultado e nao substitui nem contradiz o E2E publicado, os 14 testes focados e o build registrados em `QA_REPORT.md`. Sem novo candidato imutavel ou comentario de engenharia, repetir o mesmo roteiro nao acrescentaria evidencia.

Disposicao mantida: **BLOCKED / NO-GO critico**. Proxima acao pertence a **Engenharia/Release**: corrigir, publicar novo permalink imutavel e devolve-lo para reteste independente.

## Revisao do delta mais recente

O run `42df2177-f999-4b8d-a7ee-fa2d3401f27e` terminou em `adapter_failed` por limite de uso do modelo. Esta e uma falha de infraestrutura posterior a coleta e nao altera a conclusao do candidato: os artefatos de QA permanecem presentes e nao vazios, e o resultado bruto continua demonstrando o retry `pass:true` sem persistencia/aprovacao correspondente no host.

Nao ha novo deploy imutavel nem comentario de engenharia neste delta. Portanto, nao cabe repetir o E2E contra o mesmo artefato. AID-200 deve permanecer **blocked** ate Engenharia/Release fornecer novo permalink; HOLD de alias e coorte permanece ativo.
