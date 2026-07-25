# Engine — LiteracyDojo

**Path:** `engines/literacyDojo/` · **Type:** runnable app · **Audience:**
people who want to apply AI without a programming prerequisite.

## Role in the ecosystem

LiteracyDojo is the guided microlearning surface for the nontechnical audience.
It consumes the canonical pt-BR content from `curriculum/ai-literacy/` through a
generated TypeScript read model. Lessons target 3–5 minutes and use typed
activities, immediate deterministic feedback, hints, retries, local progress,
and structured attempt evidence.

The engine follows the
[shared micro-lesson contract](../design/micro-lesson-contract.md), while its
content and evidence schemas remain owned by the
[AI Literacy bounded context](../design/ai-literacy/README.md).

## Status authority

- The [AI Literacy curriculum](../../curriculum/ai-literacy/README.md) owns the
  current lesson count, versions, and content status.
- The [engine README](../../engines/literacyDojo/README.md) owns implementation
  status, verification results, and the complete release criteria.
- This handbook page owns only the cross-engine role and boundaries; it does
  not copy operational status.

`ready`, `generated`, `completed`, and `mastered` are different states. The app
records at most local `completed`; only an independent verifier may declare
`mastered`.

## Boundaries

- No backend or external AI provider is required in the learning path.
- The UI never reads lesson YAML directly and never edits generated content.
- Free-form learner text is not persisted in evidence or analytics.
- The engine does not write `learner/learning_state.yaml`.
- AI Literacy schemas do not replace the Pixel/Voxel teaching-game schema.

## Run and validate

Use the [engine README](../../engines/literacyDojo/README.md) for prerequisites
and the current commands. The base technical suite is:

```bash
cd engines/literacyDojo
npm run gen:content
npm run lint
npm run test
npm run build
npm run test:e2e
```

Passing those commands is necessary, but it does not by itself certify the
Phase 2 release. The same repository state must also have E2E evidence for
lesson, resume, and review; PWA/offline execution evidence; tested XP, daily
goal, achievements, and spaced-review rules; and an accessibility review for
keyboard, focus, `aria-live`, contrast, and touch targets. The engine README
owns the complete, current release criteria.

Content can also be checked independently from the repository root:

```bash
python3 curriculum/ai-literacy/tools/validate.py
python3 -m unittest discover -s curriculum/ai-literacy/tools/tests
```

## Related surfaces

- [miniTown](11_engine_miniTown.md) is an explore-only Level 0 entry, not the
  lesson player.
- [codexDojo](03_engine_codexDojo.md) may present a summary later, but it does
  not host the current player.
- [Learner substrate](08_learner_substrate.md) remains the authority for shared
  verified mastery; LiteracyDojo progress is local.
