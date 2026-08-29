# PRD — Higiene de artefatos locais antes da entrega

## Problema

O working tree contém arquivos locais de ambiente, debug e testes que aparecem como `??` no
Git. Mesmo quando não carregam uma credencial, podem ser adicionados por engano a um commit ou
vazar detalhes da máquina.

## Usuário

A pessoa que mantém ou publica o repositório.

## Objetivo

Impedir que artefatos locais conhecidos sejam oferecidos como arquivos versionáveis e deixar a
verificação reproduzível.

## Escopo

- ignorar variantes locais `.env.production.local`;
- ignorar também `.env.production`; sua presença local não autoriza adicionar valores ao Git, mesmo quando o arquivo contém apenas configuração de build;
- ignorar o zip de sessão de debug identificado nesta rodada;
- ignorar resultados de teste do piloto;
- criar uma verificação executável que falhe se esses caminhos deixarem de estar ignorados;
- não imprimir valores de arquivos de ambiente;

## Fora de escopo

- apagar `.env.production`;
- rotacionar credenciais;
- alterar configuração do Netlify;
- limpar ou reverter mudanças pré-existentes;
- afirmar que o arquivo de ambiente contém ou não contém segredo a partir apenas do nome.

## Critérios de aceite

- [x] Os quatro caminhos locais são reconhecidos por `git check-ignore`.
- [x] Nenhum arquivo `.env.production.local` ou zip de debug está rastreado.
- [x] `.env.production` é ignorado e tem revisão explícita antes de ser adicionado ao Git.
- [x] A verificação pode ser executada sem revelar valores.
- [x] `git diff --check` passa.
- [x] O relatório separa higiene local de auditoria completa de segredos.
