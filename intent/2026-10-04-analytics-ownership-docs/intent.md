# R7: navegação do ownership de analytics

Origem: delegação do Dani nesta sessão, 2026-10-04. R5 documental foi aceito
como entrega local revisada; pedido seguinte autoriza R7 documental útil e
independente, sem runtime, testes, permissões, contratos ou publicação.

## Contexto observado

HEAD permanece `b9f77774643b94bfd9fafbd756a1b17482c33e45`, branch `work`.
A árvore já contém a página, entrada no handbook e registros de R5; preservar
seus bytes, acrescentando apenas a entrada R7 no índice compartilhado.

`learner/gate/analytics/README.md` descreve ferramentas e relatórios; o handbook
não possui rota de ownership. Fontes atuais distinguem o collector de produto,
os schemas de `learner/analytics_events/` e o cliente PostHog `learner/analytics.py`.
Comentários históricos de transporte OFF coexistem com configuração e emendas
de ativação: um guia novo precisa apontar a fonte por tipo de pergunta, sem
declarar disponibilidade live. Os vocabulários JSON já são fonte única;
documentar, não consolidar novamente.

## Resultado autorizado

Mapa de leitura e efeitos dos comandos em `docs/handbook/16_analytics_ownership.md`,
com uma entrada no índice e artefatos SDLC locais. Nenhuma modificação aos quatro
documentos R1/R8 do Mac, a ADRs, a runtime/estado, a testes ou a proteções.
Não repetir suites Python de R5; verificar links, fontes, comandos offline e
invariância de arquivos com inputs sintéticos e saídas em `/tmp`.

## Atualização de autorização R2a recebida durante R7

A delegação de 2026-10-04 registra aprovação do Dani às 14:21 UTC para
acrescentar regressões de tabela malformada/indentada, symlink e wildcard em
`engines/codexDojo/src/manifestNavigation.test.ts`, preservando testes existentes.
Não autoriza override, hooks ou outros testes. R7 continua documental; nenhum
teste de R2a é criado aqui. A retomada depende de transporte fiel dos artefatos
finais do Mac; se um guard negar, parar e reportar, sem contornar.
