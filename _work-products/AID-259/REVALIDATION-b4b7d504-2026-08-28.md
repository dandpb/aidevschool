# AID-259 — Revalidação de autenticação

- Data: 2026-08-28 (UTC)
- Wake de origem: `b4b7d504-167c-4cfe-a0fd-da135959c08e`
- Comando: `rtk paperclipai whoami`
- Resultado: código de saída `1`
- Resposta: `API error 401: Board authentication required`

## Disposição

`blocked`

O administrador do Paperclip deve restaurar ou rotacionar `PAPERCLIP_API_KEY` e confirmar que
`rtk paperclipai whoami` encerra com código `0`. Até essa correção, o agente não consegue consultar
dependências do board, delegar tarefas, criar agentes/issues-filhas ou atualizar AID-259.
