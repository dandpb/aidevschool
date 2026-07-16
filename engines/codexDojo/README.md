# codexDojo

`codexDojo` is the user-facing control surface for a continuous multi-agent software engineering school. It combines:

- A local Vite/TypeScript dashboard in `src/`.
- Canonical ecosystem artifacts in `ecosystem/`.
- The deeper long-running tutor core in `../minimaxDojo/`.
- Shared project workspaces in `../../curriculum/`.
- Learning state in `../../learner/` and `../../.mavis/`.

## Run The App

```bash
pnpm install
pnpm run dev
```

Then open `http://127.0.0.1:5173/`.

## Validate

```bash
pnpm run lint
pnpm run test
pnpm run build
```

## Ecosystem Entry Points

| Need | File |
| --- | --- |
| Requirement coverage | `ecosystem/MANIFEST.md` |
| Completion audit | `ecosystem/COMPLETION_AUDIT.md` |
| Operating architecture | `ecosystem/OPERATING_MODEL.md` |
| Individual agent prompts | `ecosystem/AGENT_PROMPTS.md` |
| First 10 projects | `ecosystem/ROADMAP.md` |
| Curriculum scope | `ecosystem/CURRICULUM_SCOPE.md` |
| Memory model | `ecosystem/MEMORY_MODEL.md` |
| Code and technology evaluation | `ecosystem/EVALUATION_MODELS.md` |
| OpenClaw checklist-runner runbook | `ecosystem/OPENCLAW_RUNBOOK.md` |
