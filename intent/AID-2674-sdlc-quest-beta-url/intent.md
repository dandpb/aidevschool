# Intent — AID-2674: SDLC Quest beta em URL pública

- **Origin:** Paperclip issue AID-2674 (assignment Platform & Release Engineer),
  child of AID-2660. Founder directive (AID-2660, 2026-09-26 01:20Z): "deixar
  todos acessivel e pronta pra testes betas com o founder(eu)". CEO delegated
  AID-2674 to Platform & Release (AID-2660 comment 01:31Z).
- **Problem:** SDLC Quest v1.3 (pt-BR) só roda local (`npm start`, loopback
  127.0.0.1:8080); o founder não consegue testá-la no beta sem rodar Node.
- **Outcome observável:** uma URL pública servindo o jogo com o fluxo completo
  da campanha até o gate de produção jogável no navegador; publicação
  reproduzível por script a partir de um commit do main pinado pelo manifesto
  SHA256SUMS; reversão documentada.
- **Non-goals:** nenhuma mudança de gameplay/conteúdo do pacote
  `engines/sdlc-quest/` (manifesto permanece intocado); sem domínio próprio,
  sem serviço pago, sem conta nova (site free tier na conta Netlify já usada
  pelo pipeline); sem promoção a alias de produção — é superfície de beta
  (`noindex`), mesma decisão do beta-hub (AID-2669).
- **Constraints:** free tier apenas; `npm start` do pacote segue sendo a forma
  local; deploy somente de conteúdo idêntico ao manifesto do engine no commit
  de origem; hard rule do plano AID-1521 (zero deploys fora do pipeline)
  atendido com script versionado + runbook + PR pelo fluxo SDLC.

## Decisão técnica (static vs runtime)

`tools/serve.cjs` é um servidor estático read-only (expõe apenas
`/`, `/index.html`, `/sdlc-quest.html`, `/src/*.{js,css}`, `/favicon.ico`);
o jogo não faz fetch/XHR/imagens externas (só `localStorage`). Conclusão:
**deploy estático direto** — sem runtime Node. Verificado first-hand:
campanha completa (missões 1–5, 15/18 desafios, gate incluso) jogada por
Playwright contra o host estático com os headers de produção, zero erros de
console/JS (evidência no task record AID-2674 e screenshots anexos).
