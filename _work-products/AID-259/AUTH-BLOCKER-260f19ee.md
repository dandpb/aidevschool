# AID-259 — bloqueio de autenticação

Data: 2026-08-28 UTC
Wake de origem: `260f19ee-6a48-4448-8e32-0c277f364504`

- Comando executado: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`
- Impacto: sem acesso ao board, não é possível consultar, criar ou delegar as próximas tarefas.
- Responsável pelo desbloqueio: administrador do Paperclip.
- Ação necessária: restaurar ou rotacionar `PAPERCLIP_API_KEY`, validar `rtk paperclipai whoami` com exit code `0` e reativar AID-259.

Disposição: `blocked`.
