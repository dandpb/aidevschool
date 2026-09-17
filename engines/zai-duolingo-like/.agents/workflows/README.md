# Agent Workflows

Repeatable development workflows for this repo, distilled from the decision records in `.agents/notes/implemented/`. Each workflow lists its trigger, exact commands, verification criteria, and known pitfalls.

Unlike notes (decision records), workflows are living procedures: when a command or convention changes, update the workflow in the same commit.

## Index

| # | Workflow | Use when |
|---|----------|----------|
| 01 | [Fresh-clone setup](01-fresh-clone-setup.md) | First run on a new machine, or recreating the local database |
| 02 | [Verify before done](02-verify-before-done.md) | Before claiming any code change is complete |
| 03 | [Add or edit lesson content](03-add-lesson-content.md) | Changing curriculum (modules, lessons, exercises) |
| 04 | [Change game logic](04-change-game-logic.md) | Touching grading, hearts, streak, XP, or lesson completion rules |
| 05 | [Add an API endpoint](05-add-api-endpoint.md) | Creating a new route under `src/app/api/` |
| 06 | [Remove dead code safely](06-remove-dead-code.md) | Deleting routes, fields, dependencies, or components |
| 07 | [Write an E2E test](07-write-e2e-test.md) | Adding a Playwright spec under `e2e/` |
| 08 | [Debug a failing test](08-debug-failing-test.md) | A vitest or Playwright test is red or flaky |
| 09 | [Mini-service lifecycle](09-mini-service-lifecycle.md) | Adding, running, or debugging a service under `mini-services/` |
| 10 | [Write an agent note](10-write-agent-note.md) | Recording a durable decision in `.agents/notes/` |
