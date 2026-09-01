# Intent home

Version-controlled home for the artifact chain that starts every change
(playbook Stage 1): `intent.md` → `spec.md` → `plan.md`, one directory per
change.

## Layout

```
intent/
└── <change-id>/          # YYYY-MM-DD-<slug>, or AID-<n>-<slug> for Paperclip work
    ├── intent.md         # problem, outcome, affected systems, constraints, open questions
    ├── spec.md           # requirements + design in one pass, flagged concerns
    └── plan.md           # files that change, order of work, risks, proof
```

## Rules

- Templates live in `docs/sdlc/templates/` — copy, don't invent structure.
- The Paperclip issue (or incident record) is linked and quoted, not rewritten.
- Status lives in each file's header (`draft | accepted | rejected` /
  `draft | approved`); the accept/reject decision is recorded by the owner.
- The product owner (human, or CEO agent on their behalf) triages this queue:
  accept → Design; schedule → note it; reject → close with a reason.
- Nothing is implemented without an accepted plan (small-fix fast path aside,
  see `docs/sdlc/README.md`).
