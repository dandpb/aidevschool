# Learner Journey

Proves — with executable evidence, not model opinion — that a learner mastered a concept, while
preserving productive struggle. Certainty of completion never lives in the LLM.

## People and identity

**Learner**:
The single human the ecosystem trains. One learner per ecosystem instance; owns level, active
language, goals, and history.
_Avoid_: user, student, account, player (player is a game-surface role)

**Learner Profile**:
The learner's standing on the Dreyfus × Bloom matrix per concept area — skill acquisition crossed
with cognitive depth.
_Avoid_: skill tree, XP, level alone (level is coarser)

**AIDI**:
A measure of how dependent the learner is on the AI. Lower is better; never a substitute for
mastery evidence.
_Avoid_: productivity score, DORA, velocity-as-skill

## Units and state

**Active Unit**:
The unit currently under the learning gate — identity, project, learning state, and retry budget.
_Avoid_: task, ticket, lesson, module (module is curriculum packaging)

**Learning State**:
Where the active unit sits in the four-state journey machine: presenting → practicing →
evaluating → mastered. Portuguese surface forms: apresentando / praticando / avaliando / dominado.
Does **not** include Failure Block; that is a separate escalation outcome (see below).
_Avoid_: phase (reserved for the project cycle), status (too vague)

**Mastered**:
A unit that received a passing Gate Outcome from the Verifier, with Executable Evidence and at
least one gate Review. Never means "the game showed PASS," "code exists," or "the AI said so."
Portuguese: **DOMINADO**.
_Avoid_: complete, done, finished, shipped, green, cleared (cleared is a play surface word)

**Retry**:
A counted failed Gate Outcome on the Active Unit, toward a retry limit. A Retry is not a new
unit and does not wipe prior Reviews. What happens at the limit is **escalation** (Failure Block
/ Sêneca), not automatic Mastered.
_Avoid_: redo, restart (restart implies wiping history), replay alone (replay produces new
evidence; Retry is the counted fail)

**Failure Block**:
Escalation after the retry budget is exhausted: human governance (Sêneca) must decide the next
route. Portuguese: **FALHA_BLOQUEIO**. Not a success state and not a silent permanent fail.
_Avoid_: ban, lockout, mastered-false

## Gates and proof

**Learning Gate**:
The rule that AI implementation stays blocked until the learner has Attempted and been evaluated.
Distinct from the Empirical Gate and from a Gate Outcome.
_Avoid_: lock, feature flag, permission (those are mechanisms, not the concept)

**Empirical Gate**:
The configured bar the Verifier applies when judging whether evidence is strong enough for a
passing Gate Outcome (e.g. coverage, mutation, suite, lints, benchmark stability for code units;
eligibility and concept metrics for teaching-game units). Opinion is not a gate.
_Avoid_: quality score, DoD (DoD may include more than the bar), LGTM

**Run Judgment**:
The producer surface's own pass/fail claim on a play or run (e.g. a game's `pass` flag). Input to
the Verifier, never Mastered by itself.
_Avoid_: Gate Outcome, Mastered, score

**Eligibility**:
Preconditions that must hold before the Verifier may record a Gate Outcome at all — correct unit
and project, non-empty Attempt, Active Unit in evaluating, fresh unconsumed evidence, internally
consistent record. Failing Eligibility is **not** a Gate Outcome and must not append a fail Review.
_Avoid_: validation error as mastery fail, reject as Retry

**Executable Evidence**:
Real execution output the Verifier consumes — test/coverage/mutation/benchmark artifacts, or a
teaching-game Evidence Record — that alone can justify a passing Gate Outcome.
_Avoid_: screenshot-only proof, chat transcript, self-report, localStorage "save", Run Judgment alone

**Attempt**:
A learner try at a unit, recorded before solutions are unlocked. Required for Eligibility and
before the Learning Gate opens to AI implementation.
_Avoid_: submission (implies grading portal), run (too mechanical), Evidence Record (different object)

**Diagnostic**:
The challenge the learner faces at the gate for a unit — the problem statement they attempt.
_Avoid_: quiz, exam, homework

**Gate Outcome**:
The classified result of an **eligible** verification: fail, pass_retried, pass_first_try, or
pass_exceeds. Only an eligible run produces one; ineligible runs produce no outcome.
_Avoid_: grade, score, Run Judgment, Eligibility failure

**Rating**:
Spaced-repetition quality derived only from a Gate Outcome (again / hard / good / easy). Never
self-reported and never invented when Eligibility fails.
_Avoid_: stars, thumbs, difficulty slider

**Review**:
A recorded gate or presentation event on a unit in the Units Log. A gate Review carries Gate
Outcome and Rating; it is the only path that can support Mastered.
_Avoid_: code review (that is the Crítico / project-cycle sense)

## Memory and habit

**Units Log**:
The append-only history of units and their Reviews that feeds spaced repetition and proves
Mastered.
_Avoid_: transcript, chat log, evidence file alone

**Streak**:
Consecutive days with a **passing** Gate Outcome. A failed Gate Outcome does not break the
streak by itself; missed days consume Freezes.
_Avoid_: combo, daily goal, attempt streak (attempts without a pass do not count)

**Freeze**:
A limited charge that absorbs a missed streak day without breaking the streak.
_Avoid_: skip, pardon, cheat day

**Pitfall**:
A recorded misconception or failure pattern the learner must not re-encode as success.
_Avoid_: bug, tech debt, TODO

**Journal Entry**:
A learner reflection or generalization captured after work — not evidence of mastery by itself.
_Avoid_: diary, notes, commit message

## Authority and views

**Producer**:
Whoever generates an Attempt, Artifact, or Run Judgment. A producer never certifies Mastered.
_Avoid_: author, generator, AI (too broad), teaching game (the game is one kind of producer surface)

**Verifier**:
The independent judge that checks Eligibility and applies the Empirical Gate, producing a Gate
Outcome. Same pedagogical role as **Prometor** in the tutoring roster. Only the Verifier may
advance a unit to Mastered.
_Avoid_: reviewer (pedagogical code review is different), linter, CI alone, the game

**Canonical State**:
The single source of truth for the learner journey. Everything else is derived.
_Avoid_: database, store, cache

**Derived View**:
A regenerated projection of Canonical State for a consumer. Never hand-edited as if it were truth.
_Avoid_: copy, mirror, backup, export (export implies one-shot)

**Review Slice**:
A Derived View telling a teaching game which unit is due and streak context. Games read it; they
do not compute scheduling.
_Avoid_: queue, playlist, curriculum order
