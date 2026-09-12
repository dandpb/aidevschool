# AID-259 — bloqueio de autenticação

- Revalidado em: 2026-08-28 (UTC)
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`
- Impacto: sem acesso ao board, não é possível consultar prioridades, delegar próximas tarefas ou criar os respectivos agentes/child issues.
- Responsável pelo desbloqueio: administrador do Paperclip.
- Ação necessária: restaurar ou rotacionar `PAPERCLIP_API_KEY`, executar `rtk paperclipai whoami` até obter exit code `0` e então reativar AID-259.

Disposição: `blocked`.
