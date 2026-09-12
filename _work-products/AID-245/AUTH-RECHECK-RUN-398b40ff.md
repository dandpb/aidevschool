# AID-245 — rechecagem de autenticação

- Data: 2026-08-27
- Wake anterior: `398b40ff-9867-4686-86fe-201720eb6b4a`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code 1 — `API error 401: Board authentication required`

## Disposição

`blocked`

Responsável pelo desbloqueio: administrador do Paperclip ou proprietário das credenciais.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO e validar novamente com `rtk paperclipai whoami`.

Enquanto a autenticação não for restaurada, o agente não consegue consultar o backlog, delegar tarefas, criar agentes nem persistir o status `blocked` no board.
