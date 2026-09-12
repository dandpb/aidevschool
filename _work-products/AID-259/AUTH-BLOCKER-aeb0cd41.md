# AID-259 — bloqueio de autenticação

- Data: 2026-08-28 UTC
- Wake/run inspecionado: `aeb0cd41-e30f-414c-b486-508b015b0d49`
- Comando de revalidação: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`
- Disposição: `blocked`

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

Restaurar ou rotacionar `PAPERCLIP_API_KEY`, confirmar que `rtk paperclipai whoami`
termina com exit code `0` e então reativar AID-259. Até essa correção, o agente não
consegue consultar dependências, delegar tarefas, criar issues-filhas/agentes ou
atualizar o status no board.
