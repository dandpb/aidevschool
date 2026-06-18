# Prompt Gap Implementation Learnings

- Expand honest dashboard metrics by adding `measurement` metadata and rendering a clear `não medido ainda` placeholder when evidence is missing.
- Keep `target` as goal context, not as a stand-in for measured values, so the dashboard does not imply fake benchmark data.
- Metric expansion should follow the evaluation model dimensions directly and stay in Portuguese labels for the dashboard surface.
- For docs-only gap formalization, add structured `planned` status labels and a smallest executable verification slice without implying the missing distributed behavior exists.
- Memory curation needs an operational contract (owner, trigger, input, output, verification) separate from the descriptive memory model, so curation is auditable rather than ad hoc.
- Never move Dreyfus/Bloom levels from documentation, dashboard, or contract work; only executable verifier evidence moves a learning level. Record this as a spaced-review pitfall.
- The learner substrate (`python3 -m learner.substrate`) currently fails validation against `learner/learning_state.yaml` (missing `learner.id`, `learner.level`, `requires_attempt_before_solution=true`); this is a pre-existing schema gap, blocked separately from any docs task.
