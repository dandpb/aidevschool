# First public learner vertical slice

| Field | Decision |
| --- | --- |
| Status | Approved by CEO on 2026-08-05; implementation awaiting independent integrity review |
| Owner | Founding Product Engineer |
| Audience | A person without a programming background who wants to use AI more safely and effectively |
| Production surface | Standalone `engines/literacyDojo/` browser app |
| Canonical content | `curriculum/ai-literacy/`; never copied into the app |
| First activity | `l02` output-comparison activity, presented as **Mapa Inicial** |
| Public promise | Complete one useful attempt-feedback-retry loop and see whether that attempt was independently checked |
| Explicit non-promise | Completion or a passing receipt does not mean `mastered` |

## Outcome

Ship one link that lets a new learner, without an account or installation, make
an attempt before seeing the answer, receive specific deterministic feedback,
use a progressive hint, retry, submit structured evidence, and see a receipt
from a verifier that is independent of the producing browser app.

This is a release slice, not a new curriculum or engine. It narrows the approved
`MVP_IA_NA_PRATICA_2026-07-25.md` to the first externally testable learning
loop. The existing guided/intermediate recommendation remains a next-step link,
but completion of later lessons is not required to activate in this slice.

## Why this surface and activity

`literacyDojo` is already the bounded context for nontechnical microlearning. It
has canonical generated content, deterministic feedback, IndexedDB progress,
structured evidence, mobile browser coverage, and no mandatory model call. The
Mapa Inicial is the shortest existing route to a meaningful action and already
routes by observed performance rather than self-confidence.

The alternatives lose on scope or integrity:

- `codexdojo-os-prototype` is the broader cross-track host. Making it the first
  public surface would add catalog, host protocol, and developer-track release
  risk before validating the no-code learner loop.
- `miniTown` is deliberately explore-only and emits no mastery evidence.
- Publishing `literacyDojo` as static-only would prove local completion but
  could not honestly satisfy independent verification. Therefore the public
  slice includes a narrow verification boundary; it does not move verification
  into the producer app.

## Learner journey

1. **Open.** The learner opens a public HTTPS link and can start without an
   account, installation, name, or free-text profile.
2. **Orient.** The app explains in plain language that progress is stored on
   this device and that lesson completion is different from verified skill.
3. **Attempt.** The learner reaches Mapa Inicial in under two minutes and
   compares AI outputs before any answer or solution is revealed.
4. **Feedback.** A wrong attempt produces criterion-specific deterministic
   feedback. It does not mark the activity complete.
5. **Hint and retry.** The learner may request a progressive hint and submit a
   fresh attempt. The hint guides the reasoning without disclosing the complete
   answer before the retry.
6. **Evidence.** Every evaluated attempt emits a schema-valid
   `LiteracyEvidenceRecord` containing structured checks and no learner-entered
   free text. The browser labels it as raw evidence requiring verification.
7. **Independent check.** A verifier outside the producing app re-evaluates the
   envelope and returns an identity-bound PASS or FAIL receipt. Transport or
   verifier failure remains retryable and cannot silently become PASS.
8. **Result.** The result screen distinguishes three states: **lesson completed
   on this device**, **attempt independently checked (PASS/FAIL)**, and
   **mastery not claimed**. A next-lesson recommendation is available but is
   outside the activation requirement.
9. **Resume.** Reload preserves local route and completion. It never fabricates
   a receipt or writes `learner/learning_state.yaml`.

## Behavioral contract

### Invariants

- An evaluated attempt exists before feedback, a hint, evidence, or a receipt.
- The producer app cannot create, mutate, or self-approve a verifier receipt.
- PASS, local `completed`, and canonical `mastered` are distinct states.
- No UI path, analytics event, producer evidence, or receipt writes canonical
  mastery.
- Canonical lesson YAML is compiled into the typed read model; generated
  projections are never hand-edited.
- A failed or unavailable verifier is visible and retryable. It never blocks
  local learning and never degrades to an implicit pass.
- Analytics and evidence exclude answers, prompts, names, email addresses, and
  other learner-entered free text.

### Receipt acceptance

A receipt shown as independently checked must be bound to the exact evidence
digest, lesson and activity identity, content version, verifier version,
decision, and timestamp. The UI rejects stale, malformed, mismatched, or
producer-authored receipts. A PASS means only that this attempt met the declared
activity checks; it is not a mastery promotion.

## Success measure

The primary activation metric is:

> Percentage of new, consented sessions that reach an independently checked
> Mapa Inicial receipt within ten minutes of opening the public link.

The initial pilot target is **at least 4 of 5 representative learners**, with
no facilitator intervention after the link is opened. This is a product
decision threshold for the five-session pilot, not a permanent tutor config.

Guardrail measures:

- 100% of evaluated attempts observed in acceptance testing emit a valid raw
  evidence envelope.
- 0 receipts are accepted when evidence identity or digest is altered.
- 0 analytics payloads contain learner-entered free text or evidence contents.
- 100% of observed result screens distinguish completion, receipt, and mastery.
- Median time to first practical attempt is under two minutes; the full loop is
  designed to fit within ten minutes, including one failed attempt and retry.

## Privacy and data boundary

- No account, name, email, chat transcript, or open text is required.
- Lesson progress, onboarding choices, and route remain local in IndexedDB.
- The verification boundary receives only the allowlisted evidence envelope;
  it does not receive the learner's raw selections or prose.
- Product analytics is opt-in for the pilot and contains only anonymous session
  identity plus allowlisted lifecycle facts. Evidence, deterministic checks,
  content, and verifier receipts are not analytics payloads.
- Retention, hosting region, abuse controls, and deletion policy for any remote
  verification or analytics service require CEO approval before production
  data is collected.

## Release criteria

All criteria are blocking:

1. A versioned public HTTPS preview runs the standalone LiteracyDojo build; a
   local dev server or deploy configuration alone is not release evidence.
2. Canonical content validation, engine lint, unit tests, production build, and
   the bounded browser journey pass at the release revision.
3. Browser acceptance covers first attempt, specific failure feedback, hint,
   retry, evidence emission, independent PASS and FAIL, receipt mismatch,
   verifier outage/retry, reload, keyboard operation, 360 px layout, and the
   explicit no-mastery language.
4. An independent reviewer—different from the implementation producer—accepts
   the evidence/receipt boundary and its tests.
5. A privacy review confirms the allowlists and production retention settings;
   no production secret is stored in the client bundle or repository.
6. The rollback procedure is exercised on the preview deployment.
7. Five representative learner sessions are run. Release proceeds only if the
   activation threshold is met and no learning-integrity, accessibility,
   privacy, or data-loss blocker remains.

No release, performance, privacy, or learning claim is made until the matching
executable or observed evidence exists.

## Deliberately out of scope

- Accounts, cross-device sync, certificates, rankings, payments, or social
  features.
- Open chat, mandatory LLM calls, personalized content generation, or agents
  acting for the learner.
- Developer-track missions, engine consolidation, or embedding LiteracyDojo in
  the OS shell.
- Canonical mastery promotion or writes to `learner/learning_state.yaml`.
- New lesson content or a broad analytics platform.

## Delivery split after approval

1. **Producer implementation:** add the narrow public verification transport,
   receipt states, privacy-safe activation events, and bounded acceptance tests
   in LiteracyDojo and the owning verification adapter.
2. **Independent integrity review:** a separate reviewer challenges receipt
   identity, producer/verifier separation, failure behavior, and no-mastery
   language using executable tests.
3. **Release operations:** configure preview hosting, least-privilege secrets,
   retention, monitoring, and rollback after CEO approval of vendors and data
   policy.
4. **Learner pilot:** run five sessions and record only consented, privacy-safe
   funnel outcomes and qualitative observations.

Implementation child issues should be created only after CEO approval of this
scope. Vendor, production-data, recurring-cost, and public-launch choices remain
CEO decisions.

## Canonical references

- `docs/plans/MVP_IA_NA_PRATICA_2026-07-25.md`
- `docs/design/micro-lesson-contract.md`
- `docs/design/ai-literacy/evidence-contract.md`
- `docs/design/adr/0005-ai-literacy-bounded-context.md`
- `curriculum/ai-literacy/modules/01-ai-sem-misterio/l02-ia-nao-e-fonte-de-verdade.yaml`
- `engines/literacyDojo/README.md`
- `learner/gate/literacy_verifier.py`
