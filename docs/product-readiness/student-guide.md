# Guia do estudante

This guide covers `literacy-standalone-first-lesson`,
`os-literacy-guided-mission`, `os-voxel-guided-missions`,
`os-returning-learner`, `dojotoday-daily-guidance`,
`pixelquest-evidence-encounter`, `voxel-standalone-learning-loop`, and
`minitown-explore-only`. It is
organized by learner goal rather than repository component.

## Oferta paga

Este guia ensina dois caminhos da turma: o LiteracyDojo avulso (primeira lição) e o site do OS (endereço fixo, no navegador), começando em IA Prática. Esses dois caminhos são a oferta da turma. Isso não é certificado e não prova domínio. Voltar no mesmo aparelho e as três missões 3D existem no percurso, mas não estão prontas para cliente. Sem conta nem cópia entre aparelhos. A Trilha Dev no LiteracyDojo avulso continua em breve.

## Percurso atual no codexDojo OS

Use esta seção para o piloto no site do OS. Não há escolha entre **IA Prática** e **Trilha Dev** nem menu para trocar de trilha. **IA Prática** é o caminho do OS concedido nesta oferta; as três missões 3D seguem no produto, mas não estão prontas para cliente.

1. Abra o endereço do OS que o facilitador passou, em um navegador atual com armazenamento local habilitado.
2. Responda ao onboarding curto (objetivo, contexto, confiança). A sequência publicada começa em **IA Prática**.
3. Selecione **Entrar na escola**.
4. Complete as missões de **IA Prática** hospedadas no OS, na ordem mostrada pelo trilho de aprendizado.
5. Depois de **IA Prática**, siga as três simulações 3D hospedadas no OS: **WAREHOUSE**, **WORMHOLE** e **RELAY STATION**.
6. Leia o resultado de cada missão antes de continuar. `completed` significa progresso local no host; não significa `mastered`.

**Retomar:** recarregar o mesmo aparelho deve restaurar o progresso suportado. Outro navegador, outro aparelho ou dados apagados começam do zero; não há conta nem sincronização entre dispositivos. Se você tinha parado na trilha antiga **Dev**, o OS volta para **IA Prática** até esse capítulo terminar.

O [LiteracyDojo avulso](https://aidevschool-literacydojo.netlify.app/) no Netlify continua sendo uma rota separada, fora do OS.

## Standalone LiteracyDojo

### Choose this journey

Use standalone LiteracyDojo when you want short, practical AI lessons without programming or an account. Start at [AI DevSchool](https://aidevschool-literacydojo.netlify.app/) in a current desktop or mobile browser with browser storage enabled.

### Complete your first lesson

1. Meet Lumi and continue through the five short onboarding steps. Choose your goal, context, confidence, and the situation you want to explore.
2. Open the first available activity from the Vila Lume map and read the resident's request.
3. Submit an answer. If it is incorrect, read the corrective feedback, request a hint if useful, and choose **Try again**. An incorrect attempt does not complete the lesson.
4. After a correct attempt, finish the lesson and read the result and suggested next lesson.

A successful result means `completed` in this browser. It does not mean `mastered`. Mastery requires separate evidence and independent verification outside LiteracyDojo.

### Resume or recover

Your onboarding and lesson progress are stored locally in this browser. Reloading or returning on the same device should restore the supported progress and next available lesson. There is no account or cross-device synchronization; another browser or device starts separately, and clearing site data can erase local progress.

#### Back up local progress

A paid or long session should not depend on the browser keeping the data. In **Ver seu progresso**, use **Baixar backup JSON** to save a copy of `LearnerProgress`. The file records at most `completed` lesson status — never `mastered`. To restore the same browser profile after a wipe, use **Restaurar backup** and choose that JSON. Import runs the same forward-only migration used on launch, so an older backup can load, but it cannot grant mastery.

Do this before clearing site data, switching browsers, or handing the device to someone else. A backup cannot sync to another account because there is no account.

If a page reload interrupts an activity, return to the map and restart that lesson; answers in progress are not saved. If the public route does not load, storage is blocked, or progress repeatedly disappears, stop retrying and email [daniel@heropa.com](mailto:daniel@heropa.com). The facilitator aims to reply within 1 business day. Do not interpret an outage or interrupted attempt as completion.

### Supported next action

Continue to the next available LiteracyDojo lesson on the same device. The standalone route does not automatically transfer progress to another engine or grant canonical mastery.

## Experimental: miniTown

### Choose this journey

Choose miniTown only when you want to look around an experimental town simulation.
It is an explore-only surface, not a lesson or a customer-ready journey. It makes
no promise of completion, persistence, progression, evidence, or mastery. Start
from the local route prepared by a facilitator; technical setup belongs to the
[miniTown engine README](../../engines/miniTown/README.md).

### Explore without a progress claim

1. Open the local miniTown route in the supported browser provided by your facilitator.
2. Look around the town and observe its automatic simulation, residents, vehicles,
   zones, and day/night cycle.
3. Leave the route when you have finished exploring. There is no lesson result,
   saved learner progress, evidence record, or next mission to complete here.

Nothing you see in miniTown means `completed`, `verified`, or `mastered`. The
simulation does not persist a learner journey or transfer progress to another
engine. Do not use its runtime inspection hook as learner evidence.

### Recover or choose a supported learning route

If the local route does not load, reload once and ask a facilitator to check the
engine-owned setup. There is no saved session to restore and no completion claim
to recover. If your goal is guided AI practice, return to
[standalone LiteracyDojo](#standalone-literacydojo) instead.

## codexDojo OS guided journey

### Choose this journey

Use the OS when a facilitator gives you the static pilot entry and you want one
guided route through hosted AI Literacy or Dev missions. Use a current browser
with local storage enabled. The OS can recommend a track, but you can change the
track before you enter the school.

### Complete a hosted mission

1. Review the recommended track, choose **IA Prática** or **Dev**, and select
   **Entrar na escola**.
2. Open the next mission shown by the learning rail.
3. For **IA Prática**, complete the hosted LiteracyDojo activity and return to
   the host result. For **Dev**, complete the supported WAREHOUSE, WORMHOLE, or
   RELAY STATION interaction and return to the host status.
4. Read the result before continuing. `completed` means local host progress.
   Produced evidence still requires an independent verifier, and neither state
   means `mastered`.

### Resume or recover

The OS saves supported setup and mission state in this browser profile. Reload
the same device to resume. Another browser, another device, or cleared site data
starts separately; there is no account or cross-device synchronization.

If a hosted mission does not load, retry once. If verification is unavailable,
leave the status as not submitted and continue only when the guide presents a
safe next action. The recovery screen names the support email
([daniel@heropa.com](mailto:daniel@heropa.com)); the facilitator aims to reply
within 1 business day. Do not treat a blank frame, unavailable verifier, or
browser reload as completion.

If 3D rendering is unavailable or you prefer reduced motion, use the accessible
projection and keyboard controls. Stop and ask a facilitator when neither the
3D nor accessible projection supports the core interaction.

### Supported next action

Continue to the next mission displayed by the OS on the same device. For a Dev
mission, submit raw evidence to the separate verifier when that service is
available. The OS does not accept its own evidence or grant canonical mastery.

## Programmer journeys

These validated journeys help you find today's work or produce raw evidence.
They are not customer-ready account services, and none of them can verify its
own output or mark a unit `mastered`.

The current automated proof covers the completed PixelQuest encounter and the
declared voxelDojo catalog smoke. Replay/recovery and accessible-renderer paths
remain facilitator-observed or document-review scenarios; treat them as
unassessed until that proof is recorded.

### Read today's guidance in dojoToday

Open the generated dojoToday view to see due reviews, your active unit, and the
documented next action. The view reads the canonical learner projection. It
does not schedule, evaluate, or write learner state.

If the view is stale or missing, ask a facilitator to regenerate the shared
projection. Stop if the canonical state is unavailable; don't use an old view
as proof of current progress. Follow the displayed game or next action when the
projection is current.

dojoToday currently has a self-check and build validation, not a browser
producer report. Treat the learner-understanding and stale-projection branches
as unassessed until a facilitator records them separately.

### Produce PixelQuest evidence

Use the [PixelQuest launch instructions](../../engines/pixelDojo/pixel-quest/README.md)
from a desktop browser with keyboard input. Complete the documented encounter,
then locate the emitted `EVIDENCE` record or `.logs/evidence.ndjson` artifact.
That record is raw evidence, not verifier acceptance or mastery.

If evidence is missing, replay the encounter once and inspect the evidence
channel again. A screenshot or success message is not a substitute. Stop and
ask a facilitator when the replay still emits no valid record. Your supported
next action is to hand the record to the independent verifier. The replay
branch has no dedicated browser producer report in this phase, so do not treat
the replay itself as validated until a facilitator observes it.

### Complete a standalone voxelDojo loop

Choose a package from the [voxelDojo catalog](../../engines/voxelDojo/README.md),
follow that package's launch instructions, and complete its deterministic
learning loop. Locate the emitted raw evidence before you leave the game. A
passing game validates only that declared package; it says nothing about its
siblings and does not grant mastery.

If WebGL is unavailable, use the game's declared accessible projection when it
preserves the core interaction. Stop when neither renderer supports the loop.
Hand valid raw evidence to the independent verifier, or exit at that unsupported
boundary without claiming completion. The accessible-renderer branch has no
dedicated browser producer report in this phase; keep it unassessed until it is
observed and recorded separately.
