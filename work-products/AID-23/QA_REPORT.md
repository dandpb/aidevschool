# AID-23 — Ambiente QA para smokes Playwright

**Data:** 2026-08-22 UTC  
**Disposição:** BLOQUEADO parcialmente por configuração pnpm inválida no checkout  
**Severidade do bloqueio:** Alta para o smoke integrado do CodexDojo OS

## Resultado executivo

O browser requerido pelo Playwright 1.57 foi provisionado com sucesso no cache compartilhado do runner (`chromium-1228`, `chromium_headless_shell-1228`, `ffmpeg-1011`). O Corepack foi habilitado em `/paperclip/.local/bin` e o pnpm 9.15.9 foi fixado como versão global do Corepack. PixelDojo, MiniTown e o pacote de referência VoxelDojo executaram jornadas reais no Chromium e passaram.

O smoke integrado do CodexDojo OS não está liberado: ao subir o `codexDojo dashboard`, `pnpm exec vite` termina antes do servidor com `ERROR packages field missing or empty`. A mesma falha afeta o comando normal do MiniTown. Os arquivos não rastreados `engines/codexDojo/pnpm-workspace.yaml` e `engines/miniTown/pnpm-workspace.yaml` contêm apenas `allowBuilds` e não declaram `packages`. Eles já estavam presentes no checkout e foram preservados.

## Ambiente

- Debian trixie, Linux, UTC
- Node 24.18.0; npm 11.17.0; Corepack 0.35.0
- pnpm 9.15.9 via shim `/paperclip/.local/bin/pnpm`
- Cache Playwright: revisões 1148 e 1228; execução headless
- Workspace compartilhado com alterações preexistentes; nenhum estado canônico do learner foi alterado

## Charters e evidência executável

| Risco / charter | Comando | Resultado |
|---|---|---|
| Browser requerido pelo PixelDojo ausente | `cd engines/pixelDojo && PATH=/paperclip/.local/bin:$PATH pnpm exec playwright install chromium` | PASS: instalou Chromium e headless shell 1228 |
| PixelDojo percorre labs e emite evidência | `cd engines/pixelDojo && PATH=/paperclip/.local/bin:$PATH pnpm run smoke` | PASS: 1/1, 5,0 s |
| MiniTown carrega e avança simulação pública | `cd engines/miniTown && PATH=/paperclip/.local/bin:$PATH pnpm --ignore-workspace run smoke` | PASS: 1/1, 2,2 s |
| VoxelDojo renderiza WebGL e emite evidência válida | `cd engines/voxelDojo && PATH=/paperclip/.local/bin:$PATH pnpm --filter game-10-hash-ring run smoke` | PASS: 3/3, 6,1 s |
| OS integrado sobe as engines dependentes | `cd engines/codexdojo-os-prototype && PATH=/paperclip/.local/bin:$PATH DEBUG=pw:webserver npm run test:smoke` | BLOCKED: dashboard em 5175 não inicia; pnpm rejeita workspace inválido |

## Reprodução do bloqueio

1. Confirme que `engines/codexDojo/pnpm-workspace.yaml` contém apenas `allowBuilds` e nenhuma chave `packages`.
2. Execute `PATH=/paperclip/.local/bin:$PATH pnpm exec vite --host 127.0.0.1 --port 5175 --strictPort` em `engines/codexDojo`.
3. Esperado: Vite atende `http://127.0.0.1:5175`.
4. Atual: pnpm encerra com código 1 e `packages field missing or empty`.

O mesmo ocorre com `pnpm run smoke` em `engines/miniTown`. Usar `pnpm --ignore-workspace run smoke` prova que o produto e o browser funcionam; não corrige a configuração integrada.

## Limitações

- O sweep completo dos 16 pacotes VoxelDojo não foi executado; `game-10-hash-ring`, pacote de referência definido em AGENTS.md, foi usado como prova mínima do ambiente WebGL/Playwright.
- O smoke integrado do OS não alcançou testes de UI; falhou na preparação dos webservers.
- Lint, unit, typecheck e build não foram repetidos porque AID-19 já os havia levado até o ponto do bloqueio e AID-23 é estritamente de provisionamento/smoke.

## Critério de desbloqueio

O responsável de engenharia deve corrigir ou remover os dois `pnpm-workspace.yaml` inválidos, mantendo política explícita de build para `esbuild`; QA então repete o comando normal do MiniTown e `npm run test:smoke` do OS sem `--ignore-workspace`.
