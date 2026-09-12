# AID-185 — candidato imutável da jornada Dev

**Data:** 2026-08-25 UTC  
**Disposição do produtor:** publicado; **HOLD até QA independente**

## Resultado

O candidato da jornada Dev está publicado em um permalink imutável do OS:

- deploy OS: `6a8e1fd068712e4edf67d617`;
- permalink: <https://6a8e1fd068712e4edf67d617--aidevschool-codexdojo-os.netlify.app>;
- SHA Git do workspace: `9d4b744526891335f0749f77db0f151b2c7ed8b7` (o
  checkout compartilhado contém mudanças não commitadas; a identidade de aceite
  é deploy + hashes, não o SHA isolado);
- SHA-256 do manifesto servido: `cd25b19ba2e04bfa58e4ca5362d17c6706f4b5963500cf13c97bb5047fba4be4`;
- SHA-256 de `termos.html`: `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12`;
- SHA-256 de `privacidade.html`: `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487`;
- SHA-256 de `learner/learning_state.yaml`: `c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`.

As três missões Dev atualmente lançáveis são partes do mesmo artefato imutável:

- `/apps/warehouse/` — primeira missão da coorte, `game-02-warehouse`;
- `/apps/wormhole/` — missão subsequente, `game-03-wormhole`;
- `/apps/relay-station/` — missão subsequente, `game-05-relay-station`.

O build injeta URLs relativas no host (`VITE_WAREHOUSE_URL`,
`VITE_WORMHOLE_URL` e `VITE_RELAY_STATION_URL`). Assim, o permalink do OS
congela simultaneamente host e runtimes, sem depender dos fallbacks localhost.

O Engine Hub também aponta PixelDojo para o deploy imutável
`6a8e1f4c591b550b69173c71`, mas esse catálogo não é a identidade da primeira
missão Dev e não amplia o escopo de aceite.

## Evidência do produtor

- PixelDojo: `pnpm run build` — PASS.
- Proteções do bundle: `npm run test:pilot-bundle` — PASS, 15/15.
- Bundle integrado: `npm run build:pilot` — PASS; OS, LiteracyDojo, WAREHOUSE,
  WORMHOLE e RELAY STATION compilados e inventariados antes da promoção.
- Publicação: `npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json` — PASS.
- GET do manifesto imutável: hash remoto igual ao artefato local.
- GET `/apps/warehouse/`: HTTP 200 no permalink.
- Chromium limpo: onboarding Dev → primeira missão → iframe visível em
  `/apps/warehouse/` no mesmo origin imutável — PASS; o hash e mtime do learner
  canônico permaneceram idênticos antes/depois.
- GET dos documentos legais embutidos: HTTP 200 e hashes iguais ao candidato
  IA Prática aprovado, sem alterar aquele deploy.
- Estado canônico: hash preservado; nenhuma escrita de mastery foi realizada.

## Limite e gate independente

Este registro prova identidade, integridade inicial e acessibilidade do artefato;
não prova que a jornada completa funciona nem que a evidência foi aceita. O
produtor não emite GO.

QA deve, em contexto Chromium limpo:

1. selecionar Trilha Dev e abrir `game-02-warehouse`;
2. confirmar que o iframe fica no mesmo permalink, em `/apps/warehouse/`, sem
   localhost nem alias mutável;
3. executar tentativa, feedback e retry, preservando attempt-before-solution;
4. capturar a evidência bruta e exigir decisão do verificador separado;
5. rejeitar qualquer recibo ausente, incompatível ou produzido pela engine;
6. confirmar na UI que conclusão local, verificação e mastery são estados
   distintos;
7. confirmar que `learner/learning_state.yaml` e projeções geradas permanecem
   inalterados.

Até esse QA emitir GO, a jornada Dev permanece em HOLD e nenhum convite deve
usar este candidato.

## Rollback

Não houve promoção do alias de produção. O candidato é um deploy draft; rollback
operacional consiste em não distribuir o permalink. Qualquer novo deploy ou
mudança de hash exige novo candidato e nova revisão independente.
