# Canonical learner pilot protocol

This protocol turns the [canonical learner journey](../canonical-learner-journey.md)
into a repeatable, moderated pilot. It covers onboarding followed by one assessed
mission in each audience track. It measures usability and evidence-boundary
comprehension; it does not grant mastery or claim real-user validation.

## Pilot decision

Run five consented sessions for **IA Prática** and five for **Trilha Dev**. A
participant completes only the track matching their audience. Use `l02` for IA
Prática and `game-02-warehouse` for Trilha Dev, the generated catalog's current
recommended entry missions. Do not substitute a mission without recording its
ID and content version in the scorecard.

The Product Engineer owns setup, moderation, anonymised storage, and synthesis.
The CEO owns recruitment of five eligible learners per audience and must not
receive raw participant notes. A reviewer who did not moderate the sessions
accepts or rejects the pilot synthesis before any product-gate claim.

## Eligibility and consent

- IA Prática: adult who uses a computer for work or study and does not identify
  as a professional software developer.
- Trilha Dev: adult learner who can explain a map/dictionary and has written a
  small program, but has not contributed to this mission implementation.
- Exclude employees, mission producers, and verifiers from learner results.
- Before recording, read: “We are testing the product, not you. Participation is
  voluntary. We will store an anonymous session code, task outcomes, timings,
  and product observations. We will not store your name, email, screen/audio,
  free-form answers, prompts, or account identifiers. You may stop at any time.
  Do you consent to continue?”
- Record only `consent=yes|no` and the UTC minute. If consent is `no`, stop and
  store only an aggregate refusal count outside the session dataset.

## Setup

1. Create a random session code such as `AI-03-K7Q`; keep no lookup table.
2. Use a clean browser profile and clear engine-local storage before the session.
3. Check out the exact revision under test and record it in the scorecard.
4. Start only the required engine-local services using their READMEs. Never edit
   generated learner projections or canonical learner state for a pilot.
5. Confirm the OS shows onboarding and the selected mission. Record setup failure
   as a product failure; do not coach around it silently.

## Moderator script

Read text in quotation marks verbatim. Neutral follow-ups are limited to “What
are you looking for?” and “What do you expect that to do?” Do not reveal a
solution, name the target control, or correct the learner during the attempt.

1. **Orient:** “Starting here, set up a learning path that fits you. Tell me when
   you believe onboarding is complete.” Start `onboarding_seconds`. Record track
   selection, visible confusion codes, and whether the learner reached a mission.
2. **Attempt:** “Complete this mission as you normally would. Please think aloud.
   I cannot help with the answer, but the product may.” Start `mission_seconds`.
   Mark `attempt_before_solution=yes` only after an assessable learner action.
3. **Feedback/retry:** On the first failed check, observe whether feedback names
   what to improve. If the learner requests help, let them use the in-product hint.
   Record whether it reveals the complete answer and whether a retry is possible.
4. **Result comprehension:** At the result, ask: “What does this screen say you
   have completed? What, if anything, has been independently verified or
   mastered?” Code the response; do not store the wording.
5. **Close:** “That completes the test. Is there anything you expected to happen
   that did not?” Convert the answer immediately to predefined observation codes;
   do not retain the verbatim response. Remind the learner how to withdraw using
   their session code.

## Observation codes and safe fields

Use only the fields in [scorecard-template.csv](scorecard-template.csv). Allowed
observation codes are `NAVIGATION`, `WORDING`, `TRACK_CHOICE`, `MISSION_START`,
`FEEDBACK`, `HINT`, `RETRY`, `RESULT_STATE`, `VERIFIER_OUTAGE`, and `OTHER_CODED`.
Severity is `0` none, `1` hesitation/self-recovery, `2` moderator-neutral prompt
needed, or `3` cannot proceed. Never store names, contact details, IP/device IDs,
account IDs, recordings, screenshots containing personal data, verbatim speech,
free-text answers, prompts, or raw analytics identifiers.

## Success thresholds

Evaluate each audience separately; do not pool them.

| Gate | Threshold across five consented sessions |
| --- | --- |
| Onboarding completion | at least 4/5 without severity-3 help |
| Mission start | at least 4/5 reach the intended mission without moderator direction |
| Attempt integrity | 5/5 make an assessable attempt before solution-level help |
| Feedback and retry | at least 4/5 understand the failed criterion and can retry |
| Evidence-state comprehension | at least 4/5 distinguish local completion from independent verification and mastery |
| Safety | 5/5 records contain only allowlisted fields; zero fabricated receipts or canonical writes |

The audience passes only if every gate passes. With fewer than five consented
sessions, report `insufficient-sample`; never extrapolate. Bugs, outages, and
drop-offs remain failures in the denominator after consent.

## Storage, synthesis, and independent acceptance

Create a dated directory outside git at
`$XDG_STATE_HOME/aidevschool/pilots/AID-10/<run-id>/` (or an equivalently access-
controlled research store). Save one CSV copied from the template, a manifest
containing revision and content versions, and a coded synthesis. Restrict access
to the Product Engineer; delete row-level data 30 days after synthesis and keep
only aggregate counts. A withdrawal request by session code deletes that row.

The moderator signs the synthesis as producer. A different reviewer checks field
allowlisting, denominators, threshold arithmetic, and at least one receipt per
track, then records `ACCEPT` or `REJECT` with identity and timestamp. No release,
performance, validation, or mastery claim is allowed before `ACCEPT`.

## Fixture dry-run

Before recruitment, copy the scorecard and run the bounded checks below from the
OS engine directory. They exercise onboarding/track continuity, both mission
adapters, evidence intake, result-state separation, and persistence boundaries:

```bash
NODE_ENV=test npm test -- src/progress/domain.test.ts src/missions/recommendation.test.ts \
  src/host/MissionShell.test.tsx src/verification/evidenceIntake.test.ts \
  src/verification/evidenceIntakeTeachingGame.test.ts \
  src/verification/evidenceIntakePersistence.test.ts \
  src/journey/ResultScreen.test.tsx
```

`NODE_ENV=test` is explicit because production-mode React does not expose the
test-only `act` helper used by the component fixtures.

Record the exact command and outcome in a receipt patterned after
[dry-run-receipt-2026-08-04.md](dry-run-receipt-2026-08-04.md). This is fixture
evidence only; it is not a learner session and does not count toward either 5/5.

## Recruitment next action

CEO: by **2026-08-11**, provide the Product Engineer ten opt-in candidates—five
matching IA Prática eligibility and five matching Trilha Dev eligibility—using a
separate contact system. Share scheduling details, not contact data, in the issue.
Product Engineer then assigns anonymous codes and schedules the sessions.
