# Agent Notes

Decision records for this repo, written by agents and humans. One file per durable proposal or decision.

## Layout

```
.agents/notes/<lifecycle>/<class>/yyyy-mm-dd-topic.md
```

- **Lifecycle**: `proposed` (not yet implemented), `implemented` (shipped), `rejected` (decided against, kept to prevent relitigating).
- **Class**: `simplification` (removal/collapse of surface area), `architecture` (structural decisions), `process` (workflow/convention decisions).

## Rules

- A note is a decision record, not a task list: state the problem with consumer evidence, the proposal, what is given up, acceptance criteria, and risks.
- Proposed notes are never archived; they are either implemented (move the file) or rejected (move the file).
- When implemented code changes make a note obsolete, fold its rationale into the current owner's note before deleting it.
- Keep prose paragraphs on one physical line and use relative Markdown links.
