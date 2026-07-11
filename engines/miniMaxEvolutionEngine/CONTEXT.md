# Polyglot Project Cycle

Takes one curriculum Project through a fixed build loop with an isolated verifier at each
transition. This is software-delivery staging for learning artifacts — not the learning-state
machine.

## Language

**Cycle**:
One full pass of a Project through the ordered phases until cycle-complete or blocked.
_Avoid_: sprint, iteration (those are calendar processes), learning attempt

**Project Phase**:
A stage of the cycle: spec-done → impl-done → review-done → benchmark-done → cycle-complete.
_Avoid_: Learning State, gate state, Kanban column

**Artifact**:
A phase output under a Project (specification, language implementation, review, benchmark
results, evolution report).
_Avoid_: blob, file drop, evidence (evidence is the learning-journey proof concept)

**Producer**:
Role or agent that creates an Artifact. Never verifies its own Artifact for phase advance.
_Avoid_: developer only (producers include curators and optimizers)

**Verifier**:
Independent checker that a phase Artifact meets its bar before the next Project Phase.
_Avoid_: Prometor-as-mastery-only (Prometor may play verifier here, but the object under test is a
cycle Artifact, not Learner Mastered)

**Blocker**:
A concrete reason the cycle cannot advance — missing Artifact, failed check, or unresolved
dispute.
_Avoid_: bug, exception, TODO

**Checklist Step**:
One explicit phase check performed by OpenClaw against the shared YAML pipeline state.
_Avoid_: background event, bus topic, hidden daemon work
