# AID-259 — bloqueio de autenticação

Revalidação em 2026-08-28, após o run `2e400c6f-e2dc-4e0e-89f2-c69bc074db0e`.

## Evidência

Comando: `rtk paperclipai whoami`

Resultado: `API error 401: Board authentication required`

Exit code: `1`

## Impacto

Sem autenticação no board, não é possível consultar o portfólio de tarefas, criar tarefas filhas, delegar trabalho ou atualizar o estado de AID-259 pelo Paperclip.

## Desbloqueio necessário

Responsável: administrador do Paperclip.

Ação: restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` e confirmar exit code `0`; depois reativar AID-259.
