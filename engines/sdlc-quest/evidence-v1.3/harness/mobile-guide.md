# SDLC Quest v1.3 — execução, gates e evidências

## Estado da integração

Referência fornecida: https://github.com/dandpb/harness-toolkit
O repositório não pôde ser lido nesta revisão. Nenhuma API, comando, licença, formato ou garantia do harness-toolkit foi verificada. O HTML e o runner são implementações próprias do Quest, não uma integração real confirmada.

## Uso no jogo

1. Abra a central de execução.
2. Experimente pular direto para o pacote ou declarar tudo pronto: o motor deve recusar.
3. Descobrir: selecione problema, resultado, escopo e questão aberta; execute o gate.
4. Planejar: selecione os cinco critérios, incluindo os negativos; execute.
5. Implementar: materialize uma candidata. A versão original contém um bug de tenant.
6. Verificar: execute a suíte completa. Inspecione baseline, candidata e mutante.
7. Corrija a candidata para busca por ID e tenant; reexecute implementação e verificação.
8. Revisar: selecione o parecer didático atual, sem blocker; execute.
9. Validar pacote: os cinco recibos anteriores devem ser atuais. Exporte o JSON.
10. Altere o código após o verde e observe os recibos desatualizados. Produção continua negada.

## O que realmente executa

O HTML roda funções JavaScript locais sobre dados fictícios. A suíte completa produz 15 asserções em três versões. Ela deve reprovar a baseline e o mutante, mas aprovar a candidata correta. Não chama agentes, GitHub, npm, CI ou o toolkit.

No pacote-fonte, execute: `node tools/quest-gate.cjs`. Esse runner próprio reconstrói o HTML, executa testes de regras e jornadas de navegador e grava logs, hashes e códigos de saída. Requer Node, Python, Playwright e Chromium; dependências faltantes são falhas, não aprovações. Nenhuma instalação é feita automaticamente.

## Mapeamento proposto; não é API do toolkit

- tlc-discover → intenção/decisões → validação das entradas.
- tlc-plan → critérios/checks → validação da matriz.
- tlc-implement → revisão candidata → execução do verificador.
- the-judge → achados/parecer → pendências e vínculo com a revisão.
- Runner externo → logs/exit codes/identidade → evidência de execução rastreável.
- Infra protegida → identidade/aprovação independente → autorização de merge/release.

## Para concluir a integração real

Verificar README, commit, licença, executável, estados, formatos de entrada/saída e testes do repositório. Depois implementar um adaptador sobre a interface efetivamente encontrada, sem inferir comandos. Validar falta de etapa, falha/timeout, evidência antiga, alteração da política, budget e indisponibilidade do executor. Conferir as permissões fora do workspace.

## Limites

Completar etapas não prova a correção de todos os requisitos. JSON local pode ser alterado. O backup restaura entradas, não execução. Não houve revisão independente. Não há autorização de produção. O runner local não é uma sandbox nem controla um atacante com acesso aos seus arquivos.
