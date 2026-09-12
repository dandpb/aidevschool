# AID-259 — Revalidação de acesso ao board

- Data: 2026-08-28 (UTC)
- Comando: `rtk paperclipai whoami`
- Resultado: código de saída `1`
- Resposta: `API error 401: Board authentication required`

## Disposição

`blocked`

O erro de limite do modelo da execução anterior não impede esta execução. O bloqueio vigente é a autenticação do board.

Responsável pelo desbloqueio: administrador do Paperclip.

Ação necessária: restaurar ou rotacionar `PAPERCLIP_API_KEY` e confirmar que `rtk paperclipai whoami` encerra com código `0`. Até isso ocorrer, não é possível consultar dependências, delegar tarefas, criar agentes/issues-filhas ou atualizar o status de AID-259 no board.
