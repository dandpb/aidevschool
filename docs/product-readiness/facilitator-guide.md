# Guia do facilitador

This guide covers `literacy-standalone-first-lesson`,
`os-literacy-guided-mission`, `os-voxel-guided-missions`,
`os-returning-learner`, `dojotoday-daily-guidance`,
`pixelquest-evidence-encounter`, `voxel-standalone-learning-loop`, and
`minitown-explore-only`. It owns
cross-product preparation, observation, recovery, and evaluation. Engine-local
commands and diagnostics remain in the linked engine READMEs.

## Oferta paga

Turma paga, duas superfícies: LiteracyDojo avulso e OS (link estático). Pode vender como customer-ready só a primeira lição avulsa (Mapa Inicial — l02; condicional, com 3 gaps baixos em aberto) e as missões de **IA Prática** no OS (catálogo l01–l03; pass). Caminho no OS: **Entrar na escola** → **IA Prática**; sem Hub, sem escolher Trilha Dev. Não venda as outras 14 lições avulsas como se existirem no OS, nem sincronização avulso→OS, certificação/domínio (**concluída ≠ domínio**), retorno no mesmo aparelho nem as missões voxel como customer-ready: retorno e voxel estão stale no main após #149. #143 não está no produto; sem checkout neste guia.

Para piloto humano de 1–3 pessoas só no LiteracyDojo, use também o
[kit operacional](../PILOTO_PERCURSO_CLIENTE.md).

### Roteiro rápido

| Etapa | O que fazer |
| --- | --- |
| Antes | Escolha a superfície (LiteracyDojo avulso **ou** OS). Teste o link no navegador da turma. Combine: mesmo aparelho, sem prometer sincronização nem domínio pela UI. |
| Abertura (2 min) | Diga que não há conta; progresso fica no navegador; **concluída ≠ competência verificada**; Trilha Dev no LiteracyDojo avulso está “em breve”. |
| Durante | Observe sem conduzir cada clique. No LiteracyDojo, mostre **Ver seu progresso → Baixar backup JSON** antes de sessão longa. |
| Verificador (OS) | No deploy estático, “Verificador indisponível” é honesto — não venda como certificação. |
| Suporte | WhatsApp [+55 11 98436-3878](https://wa.me/5511984363878) (principal) e [daniel@heropa.com](mailto:daniel@heropa.com) — SLA informal: 1 dia útil. |
| Fechamento | Pergunte: “O que ficou salvo? O que você faria em seguida?” Registre sintoma visível e contexto (navegador/aparelho). |

**Não inclua na oferta paga:** miniTown, trilha de programador avulsa, PixelQuest
ou catálogo voxel fora do OS — são experimentais ou exigem setup que este guia
não cobre.

## Percurso atual no codexDojo OS

No main atual, o OS não tem Hub nem escolha entre **IA Prática** e **Trilha Dev**.
O caminho customer-ready é **Entrar na escola** → **IA Prática** (catálogo l01–l03);
não venda as outras 14 lições avulsas como se existirem no OS. As três missões 3D
e retorno no mesmo aparelho existem no produto, mas não venda como customer-ready.
Não prometa sincronização avulso→OS — o aluno recomeça ao mudar de superfície.
Oriente a turma assim:

1. Onboarding curto → **Entrar na escola**.
2. Missões de **IA Prática** hospedadas (l01–l03), na ordem do trilho.
3. Depois, as três simulações 3D hospedadas (**WAREHOUSE**, **WORMHOLE**, **RELAY
   STATION**) seguem no produto — não estão prontas para cliente.
4. Mesmo aparelho, sem conta, sem prometer sincronização entre dispositivos nem
   entre avulso e OS.

Se o aprendiz retomar num perfil que tinha parado na trilha antiga **Dev**, o host
volta para **IA Prática** até esse capítulo terminar. Retorno no mesmo aparelho
existe no produto, mas está stale — não venda como customer-ready. Não peça para
escolher trilha — essa UI não existe mais no piloto.

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
