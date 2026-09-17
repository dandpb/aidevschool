# Alterações de empacotamento — 17/09/2026

Base: SDLC Quest v1.3. HTML original preservado com SHA-256:
`f942bb7d6d1d820c27850f7acb2de3a12e3bcc89d0dc810ce95a4adae7a4fcfd`.

Não foram alterados `index.html`, arquivos de `src/`, cenários, conteúdo, regras ou armazenamento do jogo.

Adições: servidor HTTP somente loopback usando Node nativo; build Node equivalente ao Python; enumeração portátil dos testes; detecção de Python/venv no runner; preparação explícita de dependências opcionais; inicializadores por sistema; README local; manifesto e testes do pacote.

`npm start`, `npm run build` e `npm test` não precisam de pacotes npm. A preparação de navegador é explícita via `npm run setup:tests`. Nenhum binário de Node, Python ou Chromium, `.venv` ou `node_modules` é redistribuído.

O gate existente foi alterado somente para usar o build Node e selecionar o interpretador Python conforme o sistema/venv. As etapas e as condições de falha permanecem. Não há mudança de status da integração real com harness-toolkit.

O README da entrega anterior foi preservado em `README-v1.3-original.md`. Relatórios históricos podem mencionar comandos e limitações do ambiente anterior; não substituem esta orientação de execução local.
