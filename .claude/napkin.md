# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-06-03] Request may arrive as MiniMax/Mavis prompt text**
   Do instead: inspect existing docs and plans first, then convert the prompt into concrete repo artifacts or learning-session state.

## Shell & Command Reliability
1. **[2026-06-03] Avoid `.opencode/node_modules` during broad scans**
   Do instead: exclude `.opencode/node_modules` and other generated folders when using `rg` or broad file listing.

## Domain Behavior Guardrails
1. **[2026-06-03] Keep the tutoring system evidence-gated**
   Do instead: preserve the presenting/practicing/evaluating/mastered state machine and require executable exercise evidence before marking mastery.

## User Directives
1. **[2026-06-03] User expects action from pasted specs**
   Do instead: read attached pasted text and act on it directly, only asking for missing inputs when they materially block the next observable step.
