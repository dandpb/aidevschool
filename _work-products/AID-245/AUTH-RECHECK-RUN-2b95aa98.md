# AID-245 — Rechecagem de autenticação

- Data: 2026-08-27 (UTC)
- Run anterior: `2b95aa98-aa8b-489f-a4e8-92effbe5a608`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code `1`; `API error 401: Board authentication required`

## Disposição

`blocked`

Responsável pelo desbloqueio: administrador do Paperclip ou proprietário das credenciais.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO e validar novamente com `rtk paperclipai whoami`.

Sem autenticação válida, o agente não consegue consultar o backlog, delegar tarefas, criar agentes nem persistir o status `blocked` no board.
