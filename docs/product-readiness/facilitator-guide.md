# Guia do facilitador

This guide covers `literacy-standalone-first-lesson`,
`os-literacy-guided-mission`, `os-voxel-guided-missions`,
`os-returning-learner`, `dojotoday-daily-guidance`,
`pixelquest-evidence-encounter`, `voxel-standalone-learning-loop`, and
`minitown-explore-only`. It owns
cross-product preparation, observation, recovery, and evaluation. Engine-local
commands and diagnostics remain in the linked engine READMEs.

## Oferta paga

**Pronta para cliente** (assessment v35, 2026-09-07, inclui a elevação AID-987/T1) — **oito caminhos customer-ready**:

1. **`literacy-standalone-first-lesson`** — primeira lição avulsa (**Mapa Inicial — l02**)
2. **`literacy-standalone-corridor-mod01-03`** — corredor avulso mod 01–03 (11 lições, desafios de módulo, revisões espaçadas no mesmo aparelho) — detalhes em [Standalone LiteracyDojo corridor](#standalone-literacydojo-corridor)
3. **`os-literacy-guided-mission`** — OS **IA Prática** l01–l03 (escolha **IA Prática** no onboarding)
4. **`os-voxel-guided-missions`** — OS trilho **Dev**: três missões 3D hospedadas (**WAREHOUSE**, **WORMHOLE**, **RELAY STATION**)
5. **`os-returning-learner`** — retorno no mesmo aparelho (literacy ou 3D)
6. **`pixelquest-evidence-encounter`** — PixelQuest: encontro documentado + handoff de evidência (app local)
7. **`voxel-standalone-learning-loop`** — voxelDojo avulso: WAREHOUSE de referência com rota estática
8. **`dojotoday-daily-guidance`** — dojoToday: vista diária somente leitura com rota estática

Superfícies: [LiteracyDojo avulso](https://aidevschool-literacydojo.netlify.app/) (itens 1–2) e [codexDojo OS](https://aidevschool-codexdojo-os.netlify.app/) (itens 3–5). O OS **oferece escolha de trilha IA Prática | Dev** — os dois caminhos CR (itens 3 e 4) são válidos. Os itens 6–8 foram elevados a `customer-ready` pela AID-987/T1 (cenários continuity + rotas estáticas); **miniTown** segue `experimental`. A composição da oferta paga e dos CTAs (Engine Hub, catálogo voxel completo, `?track=dev`) segue decisão do CEO — enquanto isso, no avulso **Trilha Dev** continua **Em breve** e o CTA do literacy não usa `?track=dev`. Sem prometer certificado ou domínio (concluída ≠ domínio).

Não venda as outras 14 lições avulsas no OS, sync avulso→OS, certificação/domínio (concluída ≠ domínio), checkout (#143) nem conta entre aparelhos.
>>>>>>> origin/main

Para piloto humano de 1–3 pessoas só no LiteracyDojo, use também o
[kit operacional](../PILOTO_PERCURSO_CLIENTE.md).

### Roteiro rápido

| Etapa | O que fazer |
| --- | --- |
| Antes | Escolha a superfície: LiteracyDojo avulso (**primeira lição** ou **corredor mod 01–03**) **ou** OS (IA Prática + três missões 3D + retorno). Teste o link no navegador da turma. Combine: mesmo aparelho, sem prometer sincronização nem domínio pela UI. |
| Abertura (2 min) | Diga que não há conta; progresso fica no navegador; **concluída ≠ competência verificada**; **Trilha Dev** no avulso continua **Em breve** (não é CTA `?track=dev` nesta oferta de literacy). |
| Durante | Observe sem conduzir cada clique. No LiteracyDojo, mostre **Ver seu progresso → Baixar backup JSON** antes de sessão longa. |
| Verificador (OS) | No deploy estático, “Verificador indisponível” é honesto — não venda como certificação. |
| Suporte | WhatsApp [+55 11 98436-3878](https://wa.me/5511984363878) (principal) e [daniel@heropa.com](mailto:daniel@heropa.com) — SLA informal: 1 dia útil. |
| Fechamento | Pergunte: “O que ficou salvo? O que você faria em seguida?” Registre sintoma visível e contexto (navegador/aparelho). |

**Não inclua na oferta paga:** miniTown (experimental), trilha de programador avulsa, PixelQuest, catálogo voxel avulso ou dojoToday — grant `validated-journey`, não customer-ready; exigem setup que este guia não cobre. Engine Hub além das três missões hospedadas no OS.

## Percurso atual no codexDojo OS

A oferta CR no OS inclui **IA Prática** (l01–l03), trilho **Dev** de três missões 3D hospedadas e retorno no mesmo aparelho — `customer-ready` (v35). O OS público **oferece escolha de trilha** entre **IA Prática** e **Dev** e um Engine Hub allowlist
(voxel, PixelQuest, dojoToday local, literacy) — o Hub segue **fora** da oferta paga até decisão do CEO. Labs e miniTown só com `?operator=1`.
O trilho Dev hospedado é **WAREHOUSE → WORMHOLE → RELAY STATION**. Não venda as outras 14
lições avulsas como se existirem no OS. PixelQuest, voxelDojo avulso (WAREHOUSE de referência) e dojoToday estão `customer-ready` (AID-987/T1) — venda conforme a matriz v35, sem prometer certificado/domínio. Não
prometa sincronização avulso→OS. Oriente a turma assim:

1. Onboarding curto → escolha **IA Prática** ou **Dev** → **Entrar na escola**.
2. Se **IA Prática**: missões hospedadas (l01–l03), na ordem do trilho.
3. Se **Dev** (ou após IA Prática): três simulações 3D hospedadas (**WAREHOUSE**, **WORMHOLE**, **RELAY
   STATION**), na ordem do trilho.
4. Mesmo aparelho, sem conta, sem prometer sincronização entre dispositivos nem
   entre avulso e OS.

Se o aprendiz retomar num perfil antigo, ele pode escolher **Dev** de novo no
onboarding/mapa sem apagar `completed` de l01–l03. O produto pode aceitar `?track=dev` na URL — descreve a UI, **não** é CTA de literacy no avulso.

## Como fazer a primeira lição no LiteracyDojo avulso

**Grant:** `literacy-standalone-first-lesson` — customer-ready **pass**. Esta seção cobre a primeira lição; o **corredor mod 01–03** é a outra oferta CR do avulso (veja [Standalone LiteracyDojo corridor](#standalone-literacydojo-corridor)). Pode orientar a primeira lição avulsa; não prometa domínio, sync nem transferência ao OS.

**O que observar**

1. O aprendiz abre [https://aidevschool-literacydojo.netlify.app/](https://aidevschool-literacydojo.netlify.app/) sem conta.
2. Na boas-vindas, **Trilha Dev** aparece **Em breve** e não entra no caminho.
3. Cinco perguntas curtas, depois o mapa da **Vila Lume**.
4. Primeira lição desta oferta: **Mapa Inicial** l02 (**IA não é uma fonte de verdade**).
5. Compara duas respostas, escolhe a mais confiável e marca motivos.
6. **Correta:** lição concluída neste aparelho (não domínio); próxima no mapa: **O que a IA faz bem e onde costuma falhar**.
7. **Errada:** feedback, dica, **Tentar novamente**; depois a próxima é **Sua primeira conversa com uma IA**.
8. Mesmo navegador: onboarding feito, l02 concluída, retorno na intro da próxima lição. Outro aparelho ou dados apagados = recomeço. Sem sync.

**O que não prometer**

- Domínio ou certificação por UI concluída.
- Sincronização entre aparelhos ou entre avulso e OS.
- **Trilha Dev** no avulso (em breve).
- As outras 14 lições avulsas como parte desta oferta no OS.
- Handoff “agora vá ao OS” após a primeira lição.

Mostre **Ver seu progresso → Baixar backup JSON** antes de sessão longa. Suporte: WhatsApp e e-mail já na seção **Oferta paga**. #143 não está no produto — sem checkout neste guia.

## Como fazer IA Prática no OS

**Grant:** `os-literacy-guided-mission` — customer-ready **pass** (v33 @ `e41b9b9`, 2026-09-06). Pode orientar IA Prática l01–l03 no OS.

**O que observar**

1. Entrada em `/` (não `/desktop`), onboarding (objetivo, contexto, confiança). O deploy público **oferece escolha IA Prática | Dev** — para **IA Prática**, o aprendiz escolhe esse cartão e **Entrar na escola**, com a mensagem de progresso neste dispositivo. **Dev** é caminho CR alternativo para as três missões 3D.
2. Chegada ao **hub de aprendizado** (`/hub`) — missão em destaque; a escolha de trilha pode ainda aparecer. **Não** é o Engine Hub do operador. Caminho **IA Prática**: missão em destaque (l02 primeiro).
3. Primeira recomendação l02; l01 no mapa sem pré-requisito; l03 após l02.
4. Três missões literacy completas seguindo a missão destacada.
5. Mapa **Seis missões, uma sequência**; voltar **← Hub**.
6. **WAREHOUSE** pode mostrar **Disponível** antes de terminar IA Prática — UI sem pré-requisito. No piloto, `recommendMission` prioriza literacy; o aprendiz deve seguir o destaque, não pular ao 3D só porque **WAREHOUSE** parece aberto.
7. Banner de verificador indisponível no deploy estático — honesto, não certificação. Concluída ≠ domínio.

**O que não prometer**

- Engine Hub, Central de Apps ou laboratório no caminho do estudante (`?operator=1` é só operador — ver abaixo).
- Catálogo voxel avulso, PixelQuest ou dojoToday como oferta paga CR.
- Domínio, sync entre dispositivos ou avulso→OS.
- As 14 lições extras do avulso no OS.
- CTA `?track=dev` no avulso como oferta de literacy (Trilha Dev no avulso continua **Em breve**).

**Facilitador/operador:** `?operator=1` abre Engine Hub, Central de Apps e laboratório. **Não** mostre isso ao estudante como caminho de aprendizado.

## Como fazer as três missões 3D

**Grant:** `os-voxel-guided-missions` — customer-ready **pass** (v33 @ `e41b9b9`, 2026-09-06). Pode orientar WAREHOUSE → WORMHOLE → RELAY STATION no OS (missões hospedadas — não o catálogo do Engine Hub).

**O que observar**

1. Após l01–l03, o hub aponta **WAREHOUSE**, depois **WORMHOLE**, depois **RELAY STATION**.
2. O aprendiz abre cada missão pelo destaque do hub e lê o status do host antes de seguir.
3. Mapa com **Seis missões, uma sequência**; voltar **← Hub**.
4. Se **WAREHOUSE** já parecia aberto antes de literacy, no piloto a sequência recomendada ainda é literacy primeiro.
5. Projeção acessível e teclado quando 3D falha ou movimento reduzido.
6. Status do host = progresso local; verificador indisponível = honesto, não mastery.

**O que não prometer**

- Domínio ou certificação pelo status do host.
- Que missões 3D substituem ou dispensam IA Prática no piloto.
- Sync, conta ou continuidade em outro aparelho.
- Catálogo voxel fora do OS ou missões além das três hospedadas.

## Como voltar no mesmo aparelho

**Grant:** `os-returning-learner` — customer-ready **pass** (v33 @ `e41b9b9`, 2026-09-06). Pode orientar retorno no mesmo aparelho; não prometa sync.

**O que observar (OS)**

1. Mesmo navegador/aparelho: `/` redireciona a `/hub` se `onboarding.completed`. A escolha **IA Prática | Dev** pode ainda aparecer; o retorno segue a missão destacada da trilha escolhida (literacy ou 3D).
2. Hub mostra a missão destacada conforme progresso local (literacy ou 3D).
3. Outro navegador, outro aparelho ou dados apagados = onboarding de novo. Sem sync.
4. Concluída neste aparelho ≠ domínio verificado.

**O que observar (LiteracyDojo avulso)**

1. Mesmo navegador: onboarding feito, l02 concluída, retorno na intro da próxima lição.
2. Backup JSON se já documentado; restauração só no mesmo perfil do navegador.
3. Avulso não transfere ao OS.

**O que não prometer**

- Sincronização entre dispositivos, navegadores ou superfícies (avulso ↔ OS).
- Que “concluída” ou “retomou” significa domínio verificado.
- Conta, login ou checkout (#143 fora do produto).

Suporte: WhatsApp e e-mail na seção **Oferta paga** — não invente novos canais.

## Standalone LiteracyDojo

### Prepare

- For the bounded 1–3 person human pilot, use the
  [Portuguese operational kit](../PILOTO_PERCURSO_CLIENTE.md); it owns participant criteria,
  consent, the three-session script, observation records, synthesis, and the pilot exit gate.
- Confirm the supported public route opens in the learner's intended browser and device.
- Decide whether the observation needs a fresh profile or a returning profile. Use a separate browser profile for a clean run rather than clearing a learner's existing data.
- For local operation, content generation, browser installation, and release checks, follow the [LiteracyDojo README](../../engines/literacyDojo/README.md#como-rodar). Do not substitute copied commands from this guide.
- Tell the learner that progress stays in this browser, no account is created, and `completed` is not `mastered`.
- Show them **Ver seu progresso → Baixar backup JSON** before a long session. Import uses the same `migrateProgress` path and still caps status at `completed`.
- Pilot support is [WhatsApp](https://wa.me/5511984363878) (primary) and [daniel@heropa.com](mailto:daniel@heropa.com) (backup). Informal SLA: reply within 1 business day.

### Observe without leading

Ask the learner to open the route, complete onboarding, start the first lesson, recover from one incorrect attempt, finish, and state the next action. Observe whether they find corrective feedback, the hint, and retry without instruction. After completion, ask: "What was saved, and what would you do next?"

Record the scenario outcome, visible failures, browser/device context, and any intervention. A passing automated browser suite is producer evidence; it does not grant the `customer-ready` tier.

### Recover and escalate

| Visible symptom | Safe recovery | Escalate when |
| --- | --- | --- |
| Public route does not load | Confirm general connectivity, retry once, and pause the journey without reporting completion. | The route remains unavailable or redirects unexpectedly. |
| Lesson or generated content is missing | Stop the session; use the engine-owned content checks in the [README](../../engines/literacyDojo/README.md#problemas-comuns). | Regeneration or the published route remains inconsistent. |
| Incorrect attempt appears stuck | Return to the map, reopen the lesson, and retry; in-progress answers are disposable. | Feedback, hint, or retry remains unavailable. |
| Progress disappears after reload | Confirm the same browser profile and that site storage is enabled. Restore from the learner's JSON backup if they have one. | Same-profile progress repeatedly disappears and no backup exists. |
| Learner changes browser/device or clears data | Explain that the new context starts separately; restore only from their export, never by reconstructing completion. | The supported promise or session script required continuity that is no longer observable. |
| Public recovery/error screen needs a person | Point to the on-screen email (`daniel@heropa.com`). Reply within 1 business day. | The learner cannot reach email or the destination is missing from the screen. |

### Evaluate

The journey passes observation only when the learner can start without repository knowledge, use feedback and retry, reach a local completed result, explain that it is not mastery, and name the next supported action. Record any critical or high gap as blocking; documentation is not a workaround for a broken core or recovery journey.

## Standalone LiteracyDojo corridor

### Preparar

- Mesma preparação do LiteracyDojo avulso (navegador compatível, armazenamento habilitado, perfil separado para observação limpa).
- Para o corredor, um perfil que já concluiu o módulo 1 (ou um backup JSON de retorno) é mais útil que um perfil novo: o momento observável é o Desafio de Módulo e a revisão espaçada.

### Observar (gate, retry, revisão)

- **Gate entre bairros:** ao concluir as lições de um bairro, o Desafio do Módulo abre no mapa e na Home ("Continuar: Desafio do Módulo N"). Observe se o aprendiz entende que precisa passar no desafio para entrar no próximo bairro — e que falhar não perde nada.
- **Retry no desafio:** se uma atividade do desafio falhar, observe se a pessoa lê o feedback, pede dica e tenta de novo sem pedir ajuda. O módulo seguinte deve continuar bloqueado até passar.
- **Revisão espaçada:** com uma revisão vencida (D+1), a Home mostra "Revisão pendente". Observe se a pessoa distingue revisão de conteúdo novo e se entende que revisar não muda a posição na trilha.
- Perguntas de fechamento: "O que aconteceu quando você errou no desafio?" e "O que você faria amanhã?"

### Recuperação segura

- Retry e reabertura são sempre seguros: nenhuma conclusão é perdida e lições antigas nunca são re-bloqueadas (grandfathering).
- **Nunca** reverta ou reescreva o progresso do aprendiz para "destravar" algo; se o gate parecer travado, verifique se o Desafio do Módulo anterior aparece concluído no mapa.
- Ajustes de relógio do aparelho não são suporte: revisões vencem por data local; mexer no relógio é manipulação de teste, não procedimento de facilitador.

### Escalonamento

Os mesmos canais do LiteracyDojo avulso: WhatsApp (primário) e daniel@heropa.com (backup), resposta em 1 dia útil. Escale se o Desafio de Módulo não abrir com o bairro concluído, se o módulo seguinte não destravar após aprovação, ou se a revisão vencida não aparecer na Home no dia seguinte.

## Experimental: miniTown

### Prepare

- Label miniTown as **experimental** and **explore-only** before launch. It is not
  a lesson, a progression route, or a customer-ready product promise.
- Prepare the local route and supported browser with the
  [miniTown README](../../engines/miniTown/README.md). Do not copy its setup or
  diagnostic commands into this guide.
- Tell the learner explicitly that miniTown does not save learner progress,
  emit learning evidence, provide progression, or mark mastery. If the learner
  wants guided practice, route them to the [student guide's standalone
  LiteracyDojo journey](student-guide.md#standalone-literacydojo).

### Observe without leading

Ask the learner to open the prepared route, explore the town, describe what they
can observe, and say whether anything was completed or saved. Do not prompt them
to treat the HUD or the `window.__miniTown` inspection contract as evidence.
Record the browser, renderer outcome, visible runtime failures, and any
intervention. This observation checks the experimental promise only; it does not
grant a readiness tier or learner mastery.

### Recover and escalate

| Visible symptom | Safe recovery | Escalate when |
| --- | --- | --- |
| Local route does not load | Confirm the prepared route and retry once using the engine README's local checks. | The route remains unavailable or requires undocumented repository intervention. |
| Canvas or Three.js renderer fails | Confirm the supported browser and record the experiment as unavailable; do not invent a completion path. | The learner cannot explore the declared surface or the failure is reproducible on the supported setup. |
| Learner asks where progress or evidence went | Explain that miniTown has no learner persistence, progression, evidence, or mastery contract. | Any guide, UI, or facilitator statement implies that exploration was completed, saved, verified, or mastered. |
| Learner wants a guided outcome | Exit miniTown and route to [standalone LiteracyDojo](student-guide.md#standalone-literacydojo). | The supported learner route or its entry promise is unavailable. |

### Evaluate

The experimental journey passes observation only when the route launches, the
learner can explore the simulation, and both people understand that miniTown
offers no completion, persistence, progression, evidence, or mastery promise.
Keep it explicitly experimental even when the smoke passes. A passing miniTown
run cannot inherit the customer-ready or validated-journey tier from LiteracyDojo,
the codexDojo OS, or any other engine.

## codexDojo OS guided journey

### Prepare

- Open the static pilot route and confirm that LiteracyDojo, WAREHOUSE,
  WORMHOLE, and RELAY STATION load from the host origin before the session.
- Use separate fresh and returning browser profiles. Never clear a learner's
  existing profile to manufacture a clean run.
- Check desktop keyboard operation and the reduced-motion accessible renderer.
- Follow the [OS README](../../engines/codexdojo-os-prototype/README.md) for
  engine-local build, pilot, and browser commands. This guide does not duplicate
  those instructions.
- State that host completion is local, raw evidence requires a verifier, and
  canonical mastery remains outside the OS.
- Pilot support on recovery/error screens is [WhatsApp](https://wa.me/5511984363878)
  (primary) and [daniel@heropa.com](mailto:daniel@heropa.com) (backup; SLA: 1 business day).

### Observe without leading

Ask a fresh learner to review the track recommendation, choose a track, open a
hosted mission, interpret the result, and name the next action. Ask a returning
learner to reload and explain what resumed. For Dev, observe each supported
mission and ask the learner to distinguish local completion, raw evidence,
verified evidence, rejection, and mastery.

Record route, browser, device, renderer mode, mission, visible status, recovery
attempts, and facilitator intervention. Automated reports are producer facts;
they cannot grant the customer-ready tier.

### Recover and escalate

| Visible symptom | Safe recovery | Escalate when |
| --- | --- | --- |
| Static pilot or hosted frame does not load | Confirm the public route, retry once, then exit without recording completion. | The host origin remains unavailable or the frame points to an unexpected origin. |
| Verification is unavailable or rejected | Keep the visible state as not submitted or rejected; preserve raw evidence and point to the on-screen email (`daniel@heropa.com`, 1 business day). | The host implies acceptance, completion, or mastery without independent verification. |
| Progress does not resume | Confirm the same browser profile and enabled storage; restart onboarding if local data was cleared. | Same-profile supported state repeatedly disappears. |
| WebGL initialization fails | Select the accessible renderer and retry the core interaction with keyboard controls. | Both projections fail or the accessible projection loses the promised interaction. |
| Reduced-motion or keyboard flow is blocked | Keep reduced motion enabled, use the semantic projection, and exit safely if focus cannot advance. | A claimed accessibility path cannot complete the core journey. |

### Evaluate

The integrated journey passes observation only when the learner can choose a
track, enter and leave the hosted mission boundary, explain the result and next
action, resume same-device state, and distinguish local completion from
verification and mastery. Any false status, inaccessible core path, unsupported
host failure, or undocumented repository intervention is a blocking gap.

## Programmer journeys

### Prepare

- Regenerate the shared learner projection before dojoToday sessions and use
  the [dojoToday README](../../engines/dojoToday/README.md) for local checks.
- dojoToday currently has self-check, lint, and build validation rather than a
  browser producer report. Keep its learner-understanding and stale-projection
  branches observed/unassessed until that evidence is recorded.
- Run the canonical PixelQuest browser smoke and use the
  [PixelDojo runbook](../../engines/pixelDojo/AGENTS.md) for evidence locations
  and engine diagnostics.
- Select the exact voxelDojo catalog packages in scope, run each package's
  browser smoke, and use the [voxelDojo README](../../engines/voxelDojo/README.md)
  for package-owned launch details.
- State before the session that guidance is read-only, game output is raw
  evidence, and only a separate verifier can accept evidence or grant mastery.
- The producer reports intentionally cover only browser assertions exercised by
  the smoke commands: the PixelQuest encounter and the voxelDojo catalog loop.
  Replay/missing-evidence and accessible-renderer branches have no dedicated
  browser producer report in this phase; record them as observed or
  document-reviewed and keep them unassessed until that proof exists.

### Observe without leading

Ask the dojoToday learner to identify due reviews, the active unit, and the next
action. Ask each game learner to complete the loop, locate the emitted record,
and explain who decides whether it is accepted. Record the exact package,
browser, renderer, evidence path, recovery attempt, and intervention.

### Recover and escalate

| Visible symptom | Safe recovery | Escalate when |
| --- | --- | --- |
| dojoToday view is stale or missing | Regenerate the canonical projection, reload, and retain the read-only boundary. | Canonical learner state cannot be read or the generated view still disagrees. |
| PixelQuest reports success but evidence is missing | Replay the encounter once and inspect the declared evidence channels. | No valid record appears or the game implies mastery without verification. |
| A voxel game fails to render | Use its declared accessible projection when that preserves the core interaction. | Neither renderer supports the loop or the fallback changes the evidence contract. |
| One voxel package passes while another fails | Record results per package and keep the aggregate journey incomplete. | A passing sibling is presented as proof for the failed package. |

### Evaluate

The journey passes observation only when dojoToday remains guidance-only, the
selected game completes its documented loop, the learner locates raw evidence,
and the learner names the independent verifier as the next authority. Missing
evidence, stale guidance, inaccessible core interaction, or any self-granted
mastery claim is a blocking gap.
