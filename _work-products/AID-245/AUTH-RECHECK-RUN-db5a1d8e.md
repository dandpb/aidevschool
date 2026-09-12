# AID-245 — Rechecagem de autenticação

- Data: 2026-08-27
- Run anterior inspecionado: `db5a1d8e-6695-4b99-b16b-8c32783f2673`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code `1` — `API error 401: Board authentication required`

## Disposição

`blocked`

O limite do modelo do run anterior foi contornado pela execução atual. O bloqueio
operacional é a autenticação do board.

Responsável pelo desbloqueio: administrador do Paperclip/proprietário das
credenciais.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO e
validar novamente com `rtk paperclipai whoami`.

Até a autenticação ser restaurada, o agente não consegue consultar o backlog,
delegar ou criar tarefas/agentes, nem persistir o status `blocked` no board.
