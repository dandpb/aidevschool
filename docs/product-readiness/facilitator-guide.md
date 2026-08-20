# Facilitator Guide

This guide covers use case `literacy-standalone-first-lesson` and owns cross-product preparation, observation, recovery, and evaluation. Engine-local commands and diagnostics remain owned by the [LiteracyDojo README](../../engines/literacyDojo/README.md).

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
