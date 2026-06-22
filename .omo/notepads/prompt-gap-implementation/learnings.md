# Prompt Gap Implementation Learnings

- Expand honest dashboard metrics by adding `measurement` metadata and rendering a clear `não medido ainda` placeholder when evidence is missing.
- Keep `target` as goal context, not as a stand-in for measured values, so the dashboard does not imply fake benchmark data.
- Metric expansion should follow the evaluation model dimensions directly and stay in Portuguese labels for the dashboard surface.
- For docs-only gap formalization, add structured `planned` status labels and a smallest executable verification slice without implying the missing distributed behavior exists.
- Memory curation needs an operational contract (owner, trigger, input, output, verification) separate from the descriptive memory model, so curation is auditable rather than ad hoc.
- Never move Dreyfus/Bloom levels from documentation, dashboard, or contract work; only executable verifier evidence moves a learning level. Record this as a spaced-review pitfall.
- The learner substrate (`python3 -m learner.substrate`) currently fails validation against `learner/learning_state.yaml` (missing `learner.id`, `learner.level`, `requires_attempt_before_solution=true`); this is a pre-existing schema gap, blocked separately from any docs task.
- OpenClaw/Hermes orchestration is documented as a manual workflow boundary; the runbook should say so plainly and keep continuous automation marked `planned` until an event bridge or scheduler actually exists.
- For orchestration docs, add deterministic path-existence tests for every artifact path in the checklist and skip command-only entries that are not filesystem paths.
- Backlog status trackers should follow the canonical catalog as the source of truth for status values, even when folders contain experimental code. The evidence column is where folder contents are honestly documented, preventing a contradiction between `planned` status and visible code.
- All 18 curriculum project folders (01-18) contain polyglot implementations with Go/Rust/Node source, tests, and docs, but the catalog only certifies Project 01 as `implemented`. This catalog-vs-folder divergence is a known gap; the BACKLOG_STATUS.md bridges it by noting folder contents in the evidence column.
- The manifest.test.ts only validates backtick-quoted paths in "Requested Deliverables Coverage" and "Requested Scope Coverage" sections, not "Canonical Surfaces". Paths added to Canonical Surfaces won't be test-validated, which is fine for informational references like the polyglot arena STATUS.md.
