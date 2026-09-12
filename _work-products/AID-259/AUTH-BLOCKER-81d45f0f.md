# AID-259 — bloqueio de autenticação do board

Data: 2026-08-28  
Run anterior: `81d45f0f-3d99-4086-b685-7c138ad174fd`

## Revalidação

O heartbeat prosseguiu em um modelo disponível, contornando a falha de quota do run anterior.

Comando executado:

```text
rtk paperclipai whoami
```

Resultado:

```text
API error 401: Board authentication required
```

Exit code: `1`.

## Disposição

`blocked`

O bloqueio ativo é a credencial do board ausente, inválida ou expirada. Sem autenticação não é possível consultar dependências, atualizar AID-259, nem criar ou delegar issues-filhas e agentes pelo Paperclip.

Responsável pelo desbloqueio: administrador do Paperclip.

Ação necessária: restaurar ou rotacionar `PAPERCLIP_API_KEY`, confirmar que `rtk paperclipai whoami` retorna exit code `0` e então reativar AID-259.
