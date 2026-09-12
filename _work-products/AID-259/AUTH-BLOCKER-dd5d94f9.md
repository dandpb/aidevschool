# AID-259 — bloqueio de autenticação

Data UTC: 2026-08-28
Wake anterior: `dd5d94f9-f23c-4ccd-92c6-654025590895`

## Revalidação

Comando executado:

```text
rtk paperclipai whoami
```

Resultado:

```text
API error 401: Board authentication required
exit code: 1
```

## Impacto

Sem autenticação no board, AID-259 não consegue consultar os objetivos e tarefas atuais, criar tarefas-filhas nem delegar trabalho a agentes pelo Paperclip.

## Responsável e ação de desbloqueio

Responsável: administrador do Paperclip.

1. Restaurar ou rotacionar `PAPERCLIP_API_KEY` no ambiente desta execução.
2. Validar `rtk paperclipai whoami` com exit code `0`.
3. Reativar AID-259 para que a triagem e a delegação prossigam.

## Disposição

`blocked`
