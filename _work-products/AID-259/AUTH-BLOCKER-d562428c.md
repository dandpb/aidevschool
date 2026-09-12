# AID-259 — bloqueio de autenticação

- Data UTC: 2026-08-28
- Wake de origem: `d562428c-18ba-4d44-bc8f-ab68de14e315`
- Comando: `rtk paperclipai whoami`
- Resultado: `API error 401: Board authentication required`
- Exit code: `1`

## Disposição

`blocked`

Responsável pelo desbloqueio: administrador do Paperclip.

Ação necessária: restaurar ou rotacionar `PAPERCLIP_API_KEY`, validar o comando acima com exit code `0` e reativar AID-259. Sem autenticação do board não é possível consultar dependências, delegar tarefas, criar issues-filhas/agentes ou atualizar o status da issue.
