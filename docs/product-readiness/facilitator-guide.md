# Facilitator Guide

This guide covers `literacy-standalone-first-lesson`,
`os-literacy-guided-mission`, `os-voxel-guided-missions`, and
`os-returning-learner`. It owns cross-product preparation, observation,
recovery, and evaluation. Engine-local commands and diagnostics remain owned by
the [LiteracyDojo README](../../engines/literacyDojo/README.md) and the
[codexDojo OS README](../../engines/codexdojo-os-prototype/README.md).

## Standalone LiteracyDojo

### Prepare

- Confirm the supported public route opens in the learner's intended browser and device.
- Decide whether the observation needs a fresh profile or a returning profile. Use a separate browser profile for a clean run rather than clearing a learner's existing data.
- For local operation, content generation, browser installation, and release checks, follow the [LiteracyDojo README](../../engines/literacyDojo/README.md#como-rodar). Do not substitute copied commands from this guide.
- Tell the learner that progress stays in this browser, no account is created, and `completed` is not `mastered`.

### Observe without leading

Ask the learner to open the route, complete onboarding, start the first lesson, recover from one incorrect attempt, finish, and state the next action. Observe whether they find corrective feedback, the hint, and retry without instruction. After completion, ask: "What was saved, and what would you do next?"

Record the scenario outcome, visible failures, browser/device context, and any intervention. A passing automated browser suite is producer evidence; it does not grant the `customer-ready` tier.

### Recover and escalate

| Visible symptom | Safe recovery | Escalate when |
| --- | --- | --- |
| Public route does not load | Confirm general connectivity, retry once, and pause the journey without reporting completion. | The route remains unavailable or redirects unexpectedly. |
| Lesson or generated content is missing | Stop the session; use the engine-owned content checks in the [README](../../engines/literacyDojo/README.md#problemas-comuns). | Regeneration or the published route remains inconsistent. |
| Incorrect attempt appears stuck | Return to the map, reopen the lesson, and retry; in-progress answers are disposable. | Feedback, hint, or retry remains unavailable. |
| Progress disappears after reload | Confirm the same browser profile and that site storage is enabled. | Same-profile progress repeatedly disappears. |
| Learner changes browser/device or clears data | Explain that the new context starts separately; do not reconstruct or claim prior completion. | The supported promise or session script required continuity that is no longer observable. |

### Evaluate

The journey passes observation only when the learner can start without repository knowledge, use feedback and retry, reach a local completed result, explain that it is not mastery, and name the next supported action. Record any critical or high gap as blocking; documentation is not a workaround for a broken core or recovery journey.

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
| Verification is unavailable or rejected | Keep the visible state as not submitted or rejected; preserve raw evidence and explain the next supported action. | The host implies acceptance, completion, or mastery without independent verification. |
| Progress does not resume | Confirm the same browser profile and enabled storage; restart onboarding if local data was cleared. | Same-profile supported state repeatedly disappears. |
| WebGL initialization fails | Select the accessible renderer and retry the core interaction with keyboard controls. | Both projections fail or the accessible projection loses the promised interaction. |
| Reduced-motion or keyboard flow is blocked | Keep reduced motion enabled, use the semantic projection, and exit safely if focus cannot advance. | A claimed accessibility path cannot complete the core journey. |

### Evaluate

The integrated journey passes observation only when the learner can choose a
track, enter and leave the hosted mission boundary, explain the result and next
action, resume same-device state, and distinguish local completion from
verification and mastery. Any false status, inaccessible core path, unsupported
host failure, or undocumented repository intervention is a blocking gap.
