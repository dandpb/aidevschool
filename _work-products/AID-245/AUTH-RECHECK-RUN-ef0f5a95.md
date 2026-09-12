# AID-245 — rechecagem de autenticação

- Data (UTC): 2026-08-27
- Run anterior: `ef0f5a95-54e1-4cfb-b35d-8b3968c1f805`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code `1`, `API error 401: Board authentication required`

## Disposição

`blocked`

Responsável pelo desbloqueio: administrador do Paperclip/proprietário das credenciais.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO e validar novamente com `rtk paperclipai whoami`.

Até a autenticação ser restaurada, o agente não consegue consultar o backlog, delegar tarefas, criar agentes ou persistir o estado `blocked` no board.
