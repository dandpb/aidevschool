# AID-259 — bloqueio de autenticação

- Data: 2026-08-28
- Wake anterior: `175f36c8-b290-4d8e-ab3f-a529514aea68`
- Verificação: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Impacto

Sem autenticação válida não é possível consultar dependências do board, delegar as próximas tarefas, criar issues-filhas/agentes vinculados ou atualizar o status de AID-259.

## Responsável e desbloqueio

Responsável: administrador do Paperclip.

Restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` até obter exit code `0` e então reativar AID-259.
