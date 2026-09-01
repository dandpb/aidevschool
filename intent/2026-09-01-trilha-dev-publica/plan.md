# Plan: wiring da Trilha Dev pública

Change-id: `trilha-dev-publica`  
From: `/workspace/aidevschool-intent/intent.md` (aceito) + `spec.md` (aceito 2026-09-01)  
Status: `accepted` (Daniel, 2026-09-01 11:33 America/Sao_Paulo) — incluindo `/apps/*` same-origin  
Repo: `dandpb/aidevschool` (leitura via GitHub raw/API; implementação só depois do aceite, via PR)

Lido no `main` (`d26f503`) em 2026-09-01. Não clonar na box.

## Goal

Parar de esconder o que já roda. LiteracyDojo deixa de dizer “Em breve” e aponta para o OS já vivo; o OS deixa o programador escolher Dev, cumprir 3 missões, e abrir o Hub allowlist. Sem currículo 01–18, sem labs de operador, sem contas.

OS canônico (já 200): `https://aidevschool-codexdojo-os.netlify.app/`  
LiteracyDojo (já 200): `https://aidevschool-literacydojo.netlify.app/`

## Verificado no código (não inventário de chat)

- `Onboarding.tsx`: `selectedTrackId = STUDENT_TRACK_ID` (`ai-pratica`). Sem picker. Copy “sem menu de motores”. Lista 7 simulações no trilho.
- `studentPath.ts`: `remapLegacyDevTrackProgress` reescreve `onboarding.selectedTrackId` de `dev` para `ai-pratica` sempre; se literacy incompleto, também `activeTrackId` e `recommendedTrackId`.
- `EngineHubApp.tsx`: renderiza **todo** `engineRegistry`. `operatorSurface` existe (`?operator=1` ou DEV); em produção pública `isOperatorSurface()` é `false` e **não filtra** a lista hoje.
- `registry.ts`: `masteryAuthority: 'never'` em todos. `resolveEngineUrl` recusa same-origin. `literacyDojo` já `learner-facing`; `voxelDojo`/`pixelDojo` `supporting`; `dojoToday` `internal`; labs `internal`/`incubating`.
- `VoxelGamePicker.tsx` e `VoxelEngine.tsx` existem. `EngineHubApp.test.tsx` e `studentPath.test.ts` existem. **Não há** `Onboarding.test.tsx`.
- `isOperatorSurface`: query `operator=1|0`; default `import.meta.env.DEV`.

## Order of work

### 0. Artefatos no repo

Commit `intent/2026-09-01-trilha-dev-publica/{intent,spec,plan}.md` no mesmo PR do wiring (hoje só na box). GitHub CLI nesta máquina está deslogado; o PR nasce via cloud agent no repo Cursor.

### 1. Oferta: CTA + trilha (mentira-fix)

1. LiteracyDojo: controle “Trilha Dev” deixa de ser “Em breve”. Link para `https://aidevschool-codexdojo-os.netlify.app/?track=dev`. Copy: programadores, sem conta, progresso no outro site. Não injeta l15–l17 nas 14 missões.
2. OS onboarding: duas opções visíveis, IA Prática | Dev. `?track=dev` pré-seleciona Dev. Recomendação pode sugerir IA Prática se `confidence=low`; Dev permanece clicável.
3. `remapLegacyDevTrackProgress` **não** expulsa `dev`. Quem já foi remapeado no mesmo browser pode escolher Dev de novo sem apagar `completed` de l01–l03.
4. Trilho guiado Dev: só WAREHOUSE → WORMHOLE → RELAY STATION. PIPELINE PLANT, CHECKPOINT CITY, TIMELINE TOWER, DOCKING BAY saem do trilho (Hub). l15–l17 fora do CTA.
5. Copy: onboarding/guia param de listar 7 missões no trilho e de dizer “sem menu de motores”.

**Files (confirmados):**
- `engines/literacyDojo/src/screens/OnboardingScreen.tsx` (testid `dev-track-teaser`)
- `engines/literacyDojo/tests/app/appFlow.test.tsx`
- `engines/codexdojo-os-prototype/src/journey/Onboarding.tsx` (+ criar `Onboarding.test.tsx`)
- `engines/codexdojo-os-prototype/src/journey/studentPath.ts`
- `engines/codexdojo-os-prototype/src/journey/studentPath.test.ts`
- `engines/codexdojo-os-prototype/src/journey/useJourneyController.ts`
- `engines/codexdojo-os-prototype/src/progress/migration.ts`
- `engines/codexdojo-os-prototype/config/mission-bindings.yaml`
- `engines/codexdojo-os-prototype/src/journey/Hub.tsx` / `MapScreen.tsx` — filtro do capítulo Dev para 3 missões
- bindings do catálogo (fonte substrate) — **não** editar `src/data/missions.ts` à mão
- testes Playwright OS (`tests/`, `tests-pilot/`, `tests-remote/`) e LiteracyDojo (CTA)

### 2. Engine Hub público (allowlist)

1. Oferta pública (`operatorSurface === false`): Hub lista só `voxelDojo`, `pixelDojo`, `dojoToday`, `literacyDojo`. Labs (`codexDojo`, `minimaxDojo`, `miniMaxEvolutionEngine`, `openclaw`, `aiDevschoolMvp`, `zaiDuolingoLike`, `miniTown`) só com `?operator=1`.
2. Campo de visibilidade no registry (ex. `publicOffer: true`) **ou** allowlist no Hub. Preferir allowlist no Hub para não mentir `portfolioStatus` interno.
3. VoxelGamePicker: 16 jogos. Título de simulação + “evidência bruta”; nunca “projeto 01 concluído”.
4. **Opção tomada (spec pediu uma):** ampliar `build:pilot` same-origin em `/apps/*` para PixelQuest, dojoToday e os 9 voxel que faltam no bundle. Relaxar `resolveEngineUrl` **somente** para paths staged `/apps/...` no origin do OS. Não criar 16 sites Netlify.
5. Engine sem bundle: estado `unavailable` já existente, sem iframe vazio.
6. `masteryAuthority: 'never'` não muda.

**Files (confirmados):**
- `engines/codexdojo-os-prototype/src/apps/studentCatalog.ts` + `studentCatalog.test.ts`
- `engines/codexdojo-os-prototype/src/engines/EngineHubApp.tsx`
- `engines/codexdojo-os-prototype/src/engines/EngineHubApp.test.tsx`
- `engines/codexdojo-os-prototype/src/engines/registry.ts` (só se o campo de visibilidade for necessário; senão intocado além de testes)
- `engines/codexdojo-os-prototype/src/engines/VoxelGamePicker.tsx`
- `engines/codexdojo-os-prototype/src/engines/VoxelEngine.tsx`
- `engines/codexdojo-os-prototype/src/engines/voxelCatalog.ts`
- `engines/codexdojo-os-prototype/src/surface/operatorSurface.ts` (já existe; Hub passa a honrar)
- `engines/codexdojo-os-prototype/src/engines/registry.ts` `resolveEngineUrl` + `client.test.ts`
- script `build:pilot` (confirmar nome no `package.json` no checkout) e `netlify.toml` só se `/apps/*` exigir redirect

### 3. dojoToday sem YAML canônico

Quando embedado no OS público, projeta o próximo passo a partir de `OsProgress` local (missão ativa / próxima do trilho / voxel ainda não `completed` neste browser). Copy: “sugestão neste dispositivo”. Sem FSRS canônico, sem escrita em `learner/`. BYOK Sócrates permanece opcional e fora do caminho de evidência.

**Files:**
- `engines/dojoToday/src/**` (modo host/local projection)
- `engines/dojoToday/tools/gen-today.py` não vira requisito de deploy público
- contrato de postMessage/host se o OS já passar progresso; senão read-only a partir de query/localStorage do host

### 4. Verificação e honestidade

Não tocar no contrato de evidência. Deploy público continua na bridge Netlify `/__dojo/bridge/v1/verification`. Se a function falhar: “indisponível” / “não submetido”. Nunca PASS fabricado. Nunca escrever `learner/learning_state.yaml` a partir do browser.

**Files:**
- `engines/codexdojo-os-prototype/src/journey/ResultScreen.tsx` + `ResultScreen.test.tsx` (copy completed ≠ mastered)
- `engines/codexdojo-os-prototype/src/journey/useVerificationByMission.ts` (não mudar contrato; cobrir fallback)

### 5. Docs da oferta + readiness

- `docs/product-readiness/student-guide.md` e `facilitator-guide.md`: escolha de trilha, trilho de 3, Hub allowlist, CTA do LiteracyDojo, OS URL canônica. Apagar “Não há Hub nem escolha”.
- `docs/VISION.md` e README raiz: Trilha Dev deixa de ser “Em breve” *depois* deste release.
- Revalidar use cases `stale`: `os-voxel-guided-missions`, `os-returning-learner`, `pixelquest-evidence-encounter`, `voxel-standalone-learning-loop`, `dojotoday-daily-guidance`. Publicar o claim só com assessment fresco.
- `tickets.md` só se o board ainda usar esse arquivo.

## Risks e opções não tomadas

| Risco | Mitigação | Não vamos |
| --- | --- | --- |
| `remapLegacyDevTrackProgress` existe porque o offer antigo forçava IA Prática first | Revogar só o remap; manter capítulo IA Prática intacto para quem o escolhe | Sequência obrigatória l01–l03 antes de Dev |
| Engine Hub recusa same-origin | Allowlist de `/apps/*` staged no OS origin; evidência continua postMessage para `hostOrigin` | 16 sites Netlify + `VITE_*` por jogo |
| Bundle piloto cresce (9 voxel + pixel + dojoToday) | Code-split / lazy no picker; jogos fora do trilho não pré-carregam | Prometer os 16 no trilho |
| dojoToday mentir FSRS sem conta | Projeção local com copy fraca | Ligar `learning_state.yaml` do Daniel no deploy |
| Aprendiz localStorage antigo preso em IA Prática | Onboarding/settings deixam reescolher Dev | Wipe de progresso |
| Hub público hoje lista labs (operatorSurface não filtra) | Allowlist no Hub quando `operatorSurface === false` | Expor minimax/openclaw/miniTown no CTA |
| Readiness `stale` | Revalidar no passo 5; CTA pode ir ao ar com copy honesta “local / não é mastery” | Claim `customer-ready` sem assessment |
| 16 jogos lidos como 18 projetos | Naming só de simulação | Mapear game-id → catalog 01–18 na UI |
| Desktop esconde Hub e LAB esconde literacy/dojoToday | `studentCatalog.ts` + Hub filtrado | Hub só no operator |
| `appFlow.test.tsx` trava “Em breve”; Hub teste exige 11 engines | Reescrever testes no mesmo PR | Enfraquecer asserts |
| GitHub desconectado nesta máquina | Cloud agent no repo conectado do Cursor | Clonar o repo na box |

## Proof (antes de “pronto”)

1. HTTP: LiteracyDojo 200, OS 200. CTA Dev no avulso navega para OS `?track=dev`.
2. Playwright OS: onboarding escolhe Dev; reload no mesmo perfil **não** remapeia para IA Prática; trilho mostra exatamente 3 missões na ordem WH → WH → RS.
3. Completar uma missão Dev: host `completed`; copy **não** diz `mastered`; se bridge cair, status indisponível (não PASS).
4. Engine Hub público: só 4 engines visíveis; `?operator=1` ainda mostra labs; voxel picker lista 16 nomes de simulação; PixelQuest emite evidência bruta.
5. dojoToday embedado: nenhuma chamada a YAML canônico; texto de sugestão local.
6. Não-regressão: 14 missões do LiteracyDojo avulso + l01–l03 no OS para trilha IA Prática.
7. Screenshot das duas URLs públicas (CTA + onboarding Dev + Hub allowlist) no PR.
8. Product-readiness dos use cases Dev revalidado ou explicitamente ainda `stale` no student-guide (nunca silencioso).
9. Testes unitários: `studentPath.test.ts` cobre “não remapear `dev`”; `EngineHubApp.test.tsx` cobre allowlist pública vs operator; novo `Onboarding.test.tsx` cobre picker + `?track=dev`; `appFlow.test.tsx` cobre CTA (não teaser); `studentCatalog.test.ts` mostra Hub+4 engines ao aprendiz Dev.

## Out of scope neste plan

Código de curriculum 01–18, contas, sync, miniTown como aula, labs de operador no CTA, mentor LLM obrigatório, mudar `learner.gate`.

## Gate

Daniel aceitou este plan (incluindo matriz `/apps/*`). PR via cloud agent. Se o diff divergir, atualizar este arquivo no mesmo commit.
