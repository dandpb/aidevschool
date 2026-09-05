# Spec: abrir a Trilha Dev ao público (OS + engines já existentes)

Change-id: `trilha-dev-publica` · From: `/workspace/aidevschool-intent/intent.md` (aceito 2026-09-01) · Status: `accepted` (Daniel, 2026-09-01 no chat)  
Repo: `dandpb/aidevschool` · Superfícies: LiteracyDojo avulso, CodexDojo OS, voxelDojo, pixelDojo, dojoToday

## How this fits

LiteracyDojo avulso já é a oferta pública de **IA na Prática** (`https://aidevschool-literacydojo.netlify.app`). A Trilha Dev no mesmo app está rotulada “Em breve”; as 3 lições Dev do catálogo de literacy **não** entram nesse app.

O CodexDojo OS já implementa as duas trilhas no catálogo gerado (`src/data/missions.ts`): `ai-pratica` (l01–l03 hospedadas) e `dev` (entrada `game-02-warehouse`). Desktop, Engine Hub (`src/engines/registry.ts`), VoxelGamePicker (16 jogos), PixelQuest, dojoToday e literacy já têm adapters. O que a oferta **esconde**:

- `Onboarding.tsx` força `selectedTrackId = 'ai-pratica'` e copy “sem menu de motores”.
- `remapLegacyDevTrackProgress` em `studentPath.ts` **reescreve** quem está em `dev` de volta para IA Prática.
- Guia do estudante da oferta paga: sem Hub, sem escolha de trilha.
- Engine Hub e dojoToday estão `internal` / fora do CTA.

Este spec **não** cria currículo 01–18 nem labs de operador. Liga, publica e deixa de mentir o que já roda.

## Verified 2026-09-01 (código + HTTP, sem clone)

- OS alias **já público**: `https://aidevschool-codexdojo-os.netlify.app/` → 200, title `codexDojo OS`.
- LiteracyDojo avulso **já público**: `https://aidevschool-literacydojo.netlify.app/` → 200. Trilha Dev ainda “Em breve”; não navega para o OS.
- Catálogo gerado do OS (`src/data/missions.ts`, contentVersion 2026-08-31.1): trilha `ai-pratica` com l01–l14 + l18–l20; trilha `dev` com **7 voxel** (WAREHOUSE, WORMHOLE, RELAY STATION, PIPELINE PLANT, CHECKPOINT CITY, TIMELINE TOWER, DOCKING BAY) **e** l15–l17 (prévia Dev do literacy, fora do app avulso).
- `build:pilot` empacota essas missões **same-origin** (`VITE_LITERACYDOJO_URL=/apps/literacydojo/` e jogos voxel no bundle). O Engine Hub (`resolveEngineUrl`) **recusa** same-origin — são dois caminhos.
- voxelDojo no disco: **16** jogos. Os outros 9 **não** entram no bundle piloto.
- PixelQuest e dojoToday: adapters no registry; **não** estão no catálogo de missões do estudante nem no `build:pilot`. dojoToday tem `netlify.toml`, **sem** alias público verificado.
- Picker de trilha **foi removido** do onboarding (não está só escondido). Journey Hub (`src/journey/Hub.tsx`) existe; Engine Hub é desktop/lab.
- Product-readiness dos journeys OS/Dev: outcome `stale`.


## Requirements

1. **URL pública do OS.** Canônica: `https://aidevschool-codexdojo-os.netlify.app/` (já 200). LiteracyDojo avulso permanece na URL atual. Docs (VISION/handbook) deixam de dizer que o OS não é entrada pública.
2. **CTA no LiteracyDojo.** “Trilha Dev” deixa de ser “Em breve”. O controle navega para o OS público com trilha Dev pré-selecionada (query estável, ex. `?track=dev`). Não abre as 3 lições Dev *dentro* do LiteracyDojo avulso.
3. **Escolha de trilha no OS.** Onboarding oferece **IA Prática** ou **Dev**. Quem escolhe Dev (ou chega com `?track=dev`) **não** é remapeado para IA Prática. `remapLegacyDevTrackProgress` deixa de expulsar a trilha Dev nesta oferta. IA Prática l01–l03 não é pré-requisito do trilho Dev.
4. **Trilho Dev guiado.** Ordem publicada do capítulo: WAREHOUSE (`game-02-warehouse`) → WORMHOLE → RELAY STATION. O bundle piloto já tem **mais 4** voxel (PIPELINE PLANT, CHECKPOINT CITY, TIMELINE TOWER, DOCKING BAY) e l15–l17: **não** entram no trilho guiado; ficam no Hub (voxel) ou fora (l15–l17 não são CTA até um spec futuro).  Resultado do host: no máximo `completed` local. Nunca `mastered`. Evidência bruta ≠ verificada ≠ domínio.
5. **Engine Hub visível na oferta Dev.** No launcher/Activities do OS público o aprendiz abre o Engine Hub. Allowlist pública:
   - `voxelDojo` — catálogo dos 16 jogos já implementados; evidência bruta rotulada não verificada; renderer 3D ou projeção acessível.
   - `pixelDojo` — PixelQuest; emite evidência; não marca domínio.
   - `dojoToday` — “lição de hoje” read-only.
   - `literacyDojo` — microlições no-code hospedadas (troca de trilha / prática paralela).
6. **Hub: o que não aparece no CTA público.** `codexDojo`, `minimaxDojo`, `miniMaxEvolutionEngine`, `openclaw`, `aiDevschoolMvp`, `zaiDuolingoLike`, `miniTown`. Podem existir no registry interno; o aprendiz público não os vê como produto.
7. **dojoToday sem conta.** Não depende de `learner/learning_state.yaml` gerado no build do desenvolvedor. Projeta o próximo passo a partir do progresso **local do OS** (missão ativa / próxima do trilho Dev / jogo voxel ainda não `completed` neste browser). Copy diz “sugestão neste dispositivo”, nunca FSRS canônico nem `mastered`.
8. **Origens separadas.** Cada engine web do Hub e cada jogo voxel hospedado usa origem distinta do OS (`resolveEngineUrl` já recusa same-origin). Sem secret em `VITE_*`. URLs de produção entram no build do OS.
9. **Verificação honesta.** Deploy público usa a bridge já existente do OS (`/__dojo/bridge/v1/verification`, Netlify function). Se a bridge estiver indisponível, o host reporta “não submetido / indisponível” — nunca PASS fabricado. Producer ≠ verifier. O OS não grava `learner/learning_state.yaml`.
10. **Retomar.** Mesmo browser/dispositivo restaura onboarding, trilha escolhida e status local das missões (`os-returning-learner`). Outro aparelho começa do zero. Copy explícita. Sem conta/sync.
11. **Linguagem.** Em toda tela de resultado: jogou / `completed` no host / evidência bruta / verificador independente / `mastered`. 16 jogos voxel **não** são os 18 projetos do `curriculum/catalog.md`.
12. **Docs da oferta.** `docs/product-readiness/student-guide.md` e `facilitator-guide.md` passam a descrever escolha de trilha, Hub allowlist, trilho de 3 missões e o CTA do LiteracyDojo. VISION deixa de dizer que Trilha Dev permanece “Em breve” *depois* deste release. Use cases `os-voxel-guided-missions`, `os-returning-learner`, `pixelquest-evidence-encounter`, `voxel-standalone-learning-loop`, `dojotoday-daily-guidance` são revalidados (hoje `stale`).
13. **Não-regressão IA na Prática.** LiteracyDojo avulso (14 missões) e o capítulo l01–l03 hospedado no OS para quem escolhe IA Prática continuam iguais em contrato (local-first, sem `mastered`).

## UX / behavior (implementável)

```text
LiteracyDojo avulso                    CodexDojo OS (URL pública)
┌─────────────────────┐                ┌──────────────────────────────────┐
│ IA na Prática (14)  │  CTA Dev       │ Onboarding: IA Prática | Dev     │
│ [Trilha Dev → OS]   │ ─────────────► │ query ?track=dev pré-seleciona   │
└─────────────────────┘                │ Entrar na escola                 │
                                       │   Dev rail: WH → WH → RS         │
                                       │   Engine Hub (allowlist 4)       │
                                       │   desktop / retomar neste browser│
                                       └──────────────────────────────────┘
```

- **LiteracyDojo:** o chip/card da Trilha Dev vira botão. Destino: OS + `track=dev`. Texto: programadores, sem conta, progresso no outro site. Não promete 01–18.
- **OS onboarding:** duas opções visíveis (não um card único “sequência do piloto”). Recomendação pode sugerir IA Prática para `confidence=low`, mas a escolha Dev permanece clicável e persistida.
- **Depois de entrar (Dev):** trilho com 3 missões; cada uma abre a simulação hospedada; ao voltar, ResultScreen distingue completed vs evidência vs mastery. Próxima missão só após a anterior `completed` no host (ordem do capítulo).
- **Engine Hub:** lista só os 4 ids da allowlist. Voxel abre VoxelGamePicker (16). PixelQuest e literacy embedem na origem configurada. dojoToday mostra a sugestão local. Engine indisponível (URL vazia) = estado `unavailable` já existente, não um iframe vazio.
- **Acessibilidade:** se WebGL falhar ou `prefers-reduced-motion`, usar a projeção acessível já prevista nas missões voxel; não contar como completed um frame em branco.
- **Suporte:** recovery continua apontando para `daniel@heropa.com` / WhatsApp do facilitador.

## Open questions (do intent) — resolvidas

| # | Decisão |
| --- | --- |
| 1. Onde entra o público | LiteracyDojo CTA **e** OS URL pública, um funil (`?track=dev`). Hostname canônico do OS = `https://aidevschool-codexdojo-os.netlify.app/` (HTTP 200 verificado 2026-09-01). Não é draft. |
| 2. Hub no offer | Só voxel 16 + PixelQuest + dojoToday + literacy. Labs de operador ocultos. |
| 3. voxel no dia 1 | Catálogo 16 no Hub; trilho guiado continua só as 3 missões. |
| 4. dojoToday sem conta | Projeção local a partir do progresso do OS, rotulada como sugestão neste dispositivo. |
| 5. miniTown | Fora do CTA (continua experimental / incubating). |

Levar para o plan: matriz `/apps/*` no `build:pilot` vs sites Netlify extras; se o desktop completo (Files/Terminal/mentor) fica no first paint da jornada Dev ou só depois do trilho.

## Design

- **Host:** `engines/codexdojo-os-prototype` (jornada `src/journey/*`, Hub de engines `src/engines/*`, progresso `src/progress/*`, verificação `src/verification/*` + Netlify function já roteada).
- **CTA:** `engines/literacyDojo` — substituir o estado “Em breve” por link externo configurável (env/build), sem puxar as lições Dev para o percurso das 14 missões.
- **Catálogo de missões:** continuar gerado por `python3 -m learner.substrate` (`src/data/missions.ts` é derived). Ajuste de oferta (trilho de 3 vs lista longa no copy de onboarding) é binding/copy, não editar o arquivo gerado à mão.
- **Registry:** campo de visibilidade pública (allowlist) sobre `engineRegistry`; `masteryAuthority: 'never'` permanece em todos.
- **dojoToday:** modo “OS-local projection” quando não há substrate canônico; o app continua sem escrever learner state.
- **Jornada vs Engine Hub:** missões do trilho continuam no bundle `build:pilot` same-origin (já é o deploy 200). Engine Hub público ou amplia esse bundle em `/apps/*` com allowlist, ou usa origens distintas. Plan escolhe uma; não as duas.
- **voxelDojo / pixelDojo:** attempt surfaces inalteradas. 7 voxel já no piloto; os outros 9 + PixelQuest + dojoToday precisam entrar no bundle ou ganhar URL configurada antes do Hub público não mostrar `unavailable`.
- **Docs / readiness:** student-guide, facilitator-guide, VISION (parágrafo de lançamento), inventory de product-readiness. Revalidar scenarios stale.

## Policy applied

- Golden rule: mastery nunca do LLM nem do jogo (producer ≠ verifier).
- Local-first, sem conta, sem PII de texto livre no caminho Dev (mesmo contrato do MVP IA na Prática).
- Origens separadas no Hub; sem tokens em `VITE_*`.
- Product-readiness é claim de jornada, não de mastery.
- AI-native SDLC: `plan.md` descreve wiring; código só depois de aceite humano do plan.

## Flagged concerns

- **`remapLegacyDevTrackProgress` é política de produto hoje** — owner: Daniel. Este spec **revoga** o remap para a oferta pública. Aprendizes que já foram forçados para IA Prática no mesmo browser devem poder escolher Dev de novo no onboarding/settings, sem apagar `completed` de l01–l03.
- **dojoToday foi desenhado contra YAML canônico** — owner: Daniel. Sem conta, FSRS real é mentira. A projeção local é o substituto; copy tem de ser mais fraca que “sua revisão vencida no substrate”.
- **Readiness `stale`** — owner: Product/facilitator. Publicar URL sem revalidar os use cases Dev seria repetir o MVP com claim podre. Aceitar este spec autoriza o plan a incluir a revalidação como critério de pronto, não a pular.
- **16 jogos ≠ 18 projetos** — owner: Daniel. UX do VoxelGamePicker e do CTA não pode listar “projeto 01 Rate Limiter concluído” a partir de um jogo. Título do jogo + “simulação / evidência bruta”.
- **Bridge Netlify ≠ `python3 -m learner.gate` canônico** — owner: tech/Product. O host pode dizer “verificado neste deploy” só se a function independente passou. Nunca promover `learner/learning_state.yaml` a partir do browser.
- **Matriz de origens** — owner: deploy. Sem os `VITE_*_URL` de voxel/pixel/literacy/dojoToday, o Hub público mostra `unavailable`. O spec exige as origens; o plan nomeia os sites.
- **Copy do onboarding lista 7 simulações** (WAREHOUSE… DOCKING BAY) mas o guia do estudante promete 3. Este spec fixa **3 no trilho**. O resto vive no Hub, não no trilho.

## Out of scope

- Implementar ou certificar curriculum 01–18 (polyglot, benchmark, evolution).
- Conta, sync, backend learner, filesystem remoto.
- Expor labs de operador no CTA (minimax, openclaw, evolution, dashboard).
- miniTown como aula ou mastery; zai-duolingo-like (diretório vazio).
- Mentor LLM obrigatório (BYOK no dojoToday continua opcional e fora do caminho de evidência).
- Mudar o contrato de evidência / learning gate.
