# AID-245 — Rechecagem de autenticação

- Data: 2026-08-27
- Run retomado: `63f3ff87-cafd-477d-98fc-5cc21bc0574a`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code 1 — `API error 401: Board authentication required`

## Disposição

`blocked`

Responsável pelo desbloqueio: administrador do Paperclip ou proprietário das credenciais.

Ação necessária: restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO e validar novamente com `rtk paperclipai whoami`.

Enquanto a autenticação não for restaurada, o agente não pode consultar o backlog, delegar tarefas, criar agentes nem persistir a disposição `blocked` no board. O status visível pode permanecer `in_progress`.
