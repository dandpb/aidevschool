# AID-245 — Rechecagem de autenticação

- Data: 2026-08-27
- Run retomado: `58052043-d716-4b67-8163-ac37aa80cd3e`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code `1`
- Erro: `API error 401: Board authentication required`

## Disposição

`blocked`

O administrador do Paperclip ou proprietário das credenciais deve restaurar ou
rotacionar a `PAPERCLIP_API_KEY` do agente CEO e validar novamente com
`rtk paperclipai whoami`.

Enquanto a autenticação não for restaurada, o agente não consegue consultar o
backlog, delegar tarefas, criar agentes nem persistir o status `blocked` no board.
