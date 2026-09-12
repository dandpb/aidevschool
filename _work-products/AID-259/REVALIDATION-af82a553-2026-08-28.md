# AID-259 — Revalidação do wake af82a553

- Data: 2026-08-28 (UTC)
- Comando: `rtk paperclipai whoami`
- Código de saída: `1`
- Resultado: `API error 401: Board authentication required`

## Disposição

`blocked`

O adaptador atual executa normalmente; a quota do modelo anterior não é o bloqueio vigente. A autenticação do board impede consultar dependências e objetivos, delegar tarefas, criar issues-filhas ou agentes e atualizar o status de AID-259.

Responsável pelo desbloqueio: administrador do Paperclip.

Ação necessária: restaurar ou rotacionar `PAPERCLIP_API_KEY` e confirmar que `rtk paperclipai whoami` encerra com código `0`.
