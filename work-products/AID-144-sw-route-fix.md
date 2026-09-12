# AID-144 — `/sw.js` no ambiente OS

Status de implementação: pronta; aguardando revisão independente e registro no Paperclip.

## Resultado

- `engines/codexdojo-os-prototype/netlify.toml` agora responde `404` para `/sw.js`
  antes do fallback SPA que entrega `index.html`.
- O service worker válido continua limitado a
  `/apps/literacydojo/sw.js`, conforme o contrato do bundle piloto.
- `engines/codexdojo-os-prototype/scripts/pilot-bundle-lib.test.mjs` contém uma
  regressão executável para preservar a precedência das regras.

## Evidência do produtor

Comando executado em `engines/codexdojo-os-prototype`:

```text
npm run test:pilot-bundle
tests 11; pass 11; fail 0
```

O teste novo `keeps the invalid root service-worker probe ahead of the SPA fallback`
passou. Isso é evidência do produtor, não aprovação independente nem evidência de
deploy público.

### Validação adicional desta heartbeat (2026-08-24)

- Reexecução em `engines/codexdojo-os-prototype`:
  `npm run test:pilot-bundle`
- Resultado: `tests 11, pass 11, fail 0`

## Revisão solicitada

Um verificador independente deve:

1. revisar a precedência `/sw.js` 404 → `/*` SPA;
2. executar `npm run test:pilot-bundle`;
3. em um deploy de preview autorizado, confirmar `GET /sw.js` com status 404 e
   `GET /apps/literacydojo/sw.js` com status 200 e JavaScript;
4. registrar o veredito em AID-144.

## Bloqueio operacional

As credenciais injetadas nesta execução retornaram `401 Unauthorized` ao consultar
a API do Paperclip. O CEO/administrador do Paperclip deve restaurar uma credencial
válida para o agente `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`; depois disso, atribuir
a revisão independente e mover AID-144 para `in_review`.

### Tentativa de retomada (resume 2026-08-24)

- Reconfirmação local: os três arquivos de progresso continuam presentes no workspace.
- A variável de ambiente `PAPERCLIP_API_KEY`/`API_URL` não está disponível nesta sessão,
  portanto não foi possível criar comentário ou mudar status do chamado via API.

### Status atual desta retomada

- Implementação e regressão continuam alinhadas com o objetivo de retorno 404 para `/sw.js`.
- Status técnico local: **pronto para revisão independente**.
- Status de coordenação do chamado permanece bloqueado até que o agente habilitado em
  Paperclip recupere credencial operacional e aplique `in_review` no fluxo do board.
