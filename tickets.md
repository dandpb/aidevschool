# Tickets: MVP IA na Prática

Tracer bullets for the adaptive AI Literacy entry experience. Source: the ready-for-agent MVP adaptive-entry specification.

Work the **frontier**: any ticket whose blockers are all done. After the first ticket, the route, visual, and release tracks can proceed in parallel.

## Mapa Inicial guiado

Status: ready-for-agent

**What to build:** A nontechnical learner can open the entry experience, understand what an assistente de IA can help with, select a private use context and task category, complete the comparison activity, and enter the guided route with local progress.

**Blocked by:** None — can start immediately.

- [ ] The entry works without account creation, free-text collection, or an external AI provider.
- [ ] The comparison activity is available as the independent Mapa Inicial and records only local completed progress plus structured evidence.
- [ ] A learner who needs support reaches the first guided lesson and can resume in the same browser.
- [ ] Domain, application, component, and browser tests cover the complete guided path.

## Roteiro adaptativo

Status: ready-for-agent

**What to build:** The first practical performance selects a transparent guided or intermediate route, then both routes converge into the existing learning sequence without duplicating lessons.

**Blocked by:** Mapa Inicial guiado.

- [ ] A first-attempt success starts the intermediate route; error, hint, or retry start the guided route.
- [ ] The product explains the recommended route without treating self-confidence as a skill verdict.
- [ ] The selected route survives reload in the same browser and keeps the learner's next lesson correct.
- [ ] Both routes converge after the intended early lessons and retain existing review and evidence boundaries.

## Voxel art que explica

Status: ready-for-agent

**What to build:** The welcome and first learning flow use beautiful, lightweight voxel art to clarify practical situations such as scheduling, communication, and news research.

**Blocked by:** Mapa Inicial guiado.

- [ ] Every visual scene explains a learner task instead of acting as unrelated decoration.
- [ ] The scene selection reflects the structured task category without storing personal details.
- [ ] Small screens, keyboard navigation, contrast, motion preferences, and screen-reader flow remain usable.
- [ ] The player stays independent from the other 3D teaching engines.

## MVP acessível por link

Status: ready-for-agent

**What to build:** A person can use IA na Prática from a public browser link without installation or account creation, understands that progress remains local, and sees the Trilha Dev honestly marked as em breve.

**Blocked by:** Mapa Inicial guiado.

- [ ] The static release opens directly in a browser and preserves local progress on the same device.
- [ ] The product clearly states the local-progress limitation and does not claim cross-device recovery.
- [ ] The Trilha Dev is discoverable but cannot navigate to an unavailable flow.
- [ ] Release verification confirms the public route, not merely deployment configuration.

## Validação do piloto

Status: ready-for-agent

**What to build:** The released MVP has demonstrable evidence that both entry routes, visual explanation, local privacy boundary, and public release work together for the pilot.

**Blocked by:** Roteiro adaptativo; Voxel art que explica; MVP acessível por link.

- [ ] Browser scenarios cover guided and intermediate learners from entry through their next lesson and reload.
- [ ] Tests prove that structured evidence emits for evaluated attempts and free text is neither persisted nor sent to analytics.
- [ ] Accessibility and visual checks confirm that voxel art does not block comprehension or completion.
- [ ] Pilot readiness documents the observable success criterion: a nontechnical learner completes the entry without help, understands the route, and identifies a practical use.

