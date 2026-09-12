# Revalidação do bloqueio — AID-259

- Data: `2026-08-28`
- Retomada de referência: `8a4c63fc-7d58-498d-b666-970bf5fa2eb8`
- Comando: `rtk paperclipai whoami`
- Código de saída: `1`
- Resposta: `API error 401: Board authentication required`
- Disposição: `blocked`

## Responsável e ação de desbloqueio

O administrador do Paperclip deve restaurar ou rotacionar `PAPERCLIP_API_KEY` e confirmar que `rtk paperclipai whoami` encerra com código `0`.

Enquanto a autenticação estiver indisponível, não é possível consultar dependências, delegar tarefas, criar agentes ou issues-filhas, nem persistir o status correto no board.
