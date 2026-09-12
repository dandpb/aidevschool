# AID-259 — bloqueio de autenticação

Data: 2026-08-28 UTC
Wake de origem: `90d70780-e44b-41fb-8f33-7e813bdd2058`

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

Sem autenticação no board, AID-259 não consegue consultar os objetivos e a fila atual,
delegar tarefas, criar issues filhas nem registrar a disposição diretamente no Paperclip.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

1. Restaurar ou rotacionar `PAPERCLIP_API_KEY` no ambiente deste agente.
2. Executar `rtk paperclipai whoami` e confirmar exit code `0`.
3. Reativar AID-259 para continuar a triagem e delegação.

Disposição: `blocked`.
