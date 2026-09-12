# AID-259 — bloqueio de autenticação

Data: 2026-08-28 UTC

## Revalidação

Comando executado:

```text
rtk paperclipai whoami
```

Resultado:

```text
API error 401: Board authentication required
```

Exit code: `1`.

## Impacto

Sem autenticação no board, este agente não consegue consultar, criar nem delegar as próximas tarefas da AID-259.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

Restaurar ou rotacionar `PAPERCLIP_API_KEY`, validar `rtk paperclipai whoami` com exit code `0` e então reativar AID-259.
