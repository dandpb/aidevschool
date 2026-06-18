# codexDojo Memory Model

## Goals

Memory exists to make the learner better over time. It stores durable learning state, architectural decisions, mistakes, completed projects, and next steps.

Memory must not become a transcript dump. Every durable entry needs a future use.

## Three Layers

| Layer | Scope | Examples |
| --- | --- | --- |
| In-agent memory | Short-lived context inside a single agent run. | Current prompt, current unit constraints. |
| Handoff files | One agent passes structured evidence to another. | `unit_spec.md`, `submission.md`, `verdict.md`, `review.md`. |
| Whiteboard | Persistent curated learner state. | Profile, pitfalls, ADRs, event log, promoted skills. |

## Canonical Files

| File | Purpose |
| --- | --- |
| `learner/learning_state.yaml` | Active learning gate state. |
| `learner/learner_profile.md` | Current Dreyfus/Bloom profile and gaps. |
| `learner/pitfalls.md` | Frequent mistakes for spaced review. |
| `engines/minimaxDojo/whiteboard/learner_profile.md` | Deep-core learner profile. |
| `engines/minimaxDojo/whiteboard/trail.md` | Personalized robustness trail. |
| `engines/minimaxDojo/whiteboard/event_log/` | Auditable event stream. |
| `learner/journal.md` | Append-only global lessons. |

## Event Schema

```json
{
  "ts": "2026-06-04T00:00:00Z",
  "agent": "mentor",
  "event": "unit.evaluated",
  "unit": "U-001",
  "project": "curriculum/01_cli_tasks",
  "result": "pass",
  "evidence": ["pnpm run test", "review.md"],
  "next": "U-002"
}
```

## Learner Profile Fields

| Field | Meaning |
| --- | --- |
| `active_focus` | Current primary language or domain. |
| `weekly_time_hours` | Planning budget for challenge size. |
| `dreyfus_by_concept` | Skill level per topic. |
| `bloom_by_concept` | Cognitive level per topic. |
| `ai_dependency_index` | How much reasoning is delegated to AI. |
| `pitfalls` | Repeated mistakes requiring spaced review. |
| `mastered_units` | Units proven by executable evidence. |
| `next_action` | One concrete next challenge. |

## Memory Update Policy

Write memory only after a cycle creates evidence:

1. Diagnostic completed.
2. Code submitted.
3. Verifier result published.
4. Review result published.
5. Reflection answered.
6. Next challenge selected.

## What To Store

- Repeated mistake plus how to avoid it.
- Decision that changes future architecture.
- Metric trend that changes the roadmap.
- Completed project and evidence commands.
- Next unit and why it was selected.

## What Not To Store

- Raw chat.
- One-off commentary.
- Unverified claims.
- Private credentials.
- Large logs that can be regenerated.

## Curation Loop

Active curation is defined in [MEMORY_CURATION.md](./MEMORY_CURATION.md). The curation contract distinguishes documented memory layers (this document) from the operational curation loop that keeps learner state fresh.
