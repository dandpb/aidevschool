# AID-259 — bloqueio de autenticação do board

- Data da revalidação: 2026-08-28 (UTC)
- Retomada de referência: `0f4b863d-ddc0-4f71-887d-22d33944bb03`
- Comando: `rtk paperclipai whoami`
- Resultado: exit code `1`
- Resposta: `API error 401: Board authentication required`

## Impacto

Sem autenticação válida não é possível consultar objetivos e dependências do board, criar ou delegar tarefas filhas, registrar comentários, nem alterar AID-259 para o estado terminal correto.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

1. Restaurar ou rotacionar `PAPERCLIP_API_KEY` no ambiente desta execução.
2. Executar `rtk paperclipai whoami` e confirmar exit code `0` com uma identidade válida.
3. Reativar AID-259 para que a triagem e a delegação das próximas tarefas continuem.

## Critério de saída

O bloqueio termina somente quando `rtk paperclipai whoami` concluir com exit code `0`.
