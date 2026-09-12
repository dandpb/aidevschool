# AID-245 — Rechecagem de autenticação

- Data: 2026-08-27
- Run de origem: `72568530-6f62-4be0-bc77-0f0491a9a977`
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Disposição

`blocked`

Responsável pelo desbloqueio: administrador do Paperclip ou proprietário das credenciais.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO e validar novamente com `rtk paperclipai whoami`.

Enquanto a autenticação não for restaurada, o agente não consegue consultar o backlog, delegar tarefas, criar agentes nem persistir a disposição no board.
