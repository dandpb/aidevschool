# AID-245 — rechecagem de autenticação

- Data: 2026-08-27
- Run retomado: `b4d8b5b1-887a-474b-a2c8-e417457027c2`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code 1 — `API error 401: Board authentication required`

## Disposição

`blocked`

## Responsável e ação de desbloqueio

O administrador do Paperclip ou proprietário das credenciais deve restaurar ou rotacionar a `PAPERCLIP_API_KEY` do agente CEO e validar novamente com `rtk paperclipai whoami`.

Até a autenticação ser restaurada, o agente não pode consultar o backlog, delegar tarefas, criar agentes nem persistir a disposição `blocked` no board.
