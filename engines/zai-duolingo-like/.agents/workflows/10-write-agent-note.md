# 10 — Write an agent note

**Trigger:** making a durable decision worth recording — a structural choice, a removal, a workflow/convention change. See the layout and rules in [.agents/notes/README.md](../notes/README.md).

## Steps

1. Place the file at `.agents/notes/<lifecycle>/<class>/yyyy-mm-dd-<topic>.md`:
   - Lifecycle: `proposed` → (never archived) → `implemented` or `rejected` (move the file).
   - Class: `simplification` (removal), `architecture` (structure), `process` (workflow/convention).
2. Follow the existing format: `Status`, then **Problem** (with consumer evidence — greps, failing tests, file citations), **Proposal/Decision**, **Consequences** (what is given up), **Acceptance criteria**, **Risks**.
3. When it ships, move it to `implemented/` and append a `> Shipped <date>` block recording deviations between what was proposed and what actually landed — including the audit's own mistakes (the `leagueXp` self-correction is the model to copy).
4. One physical line per prose paragraph; relative Markdown links.

## Verification

- The note answers "what stops someone from relitigating this?" — rejected notes exist precisely to prevent re-debate.
- Acceptance criteria are checkable by the bar in [verify before done](02-verify-before-done.md).

## Pitfalls

- A note is a decision record, not a task list. If it has checkboxes for work items, it belongs in the worklog, not here.
- When later code changes make a note obsolete, fold its rationale into the current owner's note before deleting it — do not leave stale decisions floating.
- `worklog.md` is institutional memory (what happened, task by task); notes are *why* things are the way they are. Record in the right one.

## Sources

- [.agents/notes/README.md](../notes/README.md)
- Any `> Shipped` block under [notes/implemented/](../notes/implemented/)
