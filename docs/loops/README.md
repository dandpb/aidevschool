# Loop memory (tracked, append-only)

This directory is the **canonical, versioned home of loop memory** for the
orchestration loops defined in `.claude/skills/*/SKILL.md`.

## Why this exists (decision, 2026-09-12 — AID-1528, achado A da auditoria AID-1522)

PR #349 (merge `d92f2f90`) correctly moved `.loops/` runtime **output
artifacts** out of version control (`output/` dirs: screenshots, evidence
JSONs, verifier reports — derived, bulky, regenerable). It also deleted the
tracked `memory.md` / `ROUTING_MANIFEST.md` files, which are **not**
derivable: they are append-only run history the skills are required to read
first (AGENTS.md + `threejs-dojo-coverage` SKILL made that mandatory, so a
fresh clone was left pointing at files that no longer existed — QA finding A,
severity medium).

Owner decision: split the two concerns.

| Concern | Home | Versioned? |
| --- | --- | --- |
| Append-only loop memory (`memory.md`, `ROUTING_MANIFEST.md`) | `docs/loops/<loop>/` | **Yes** (this tree) |
| Run output artifacts (`output/<run-id>/`, screenshots, reports) | `.loops/<loop>/output/` | No (`.gitignore`) |

## Contents

- `threejs-dojo/memory.md`, `threejs-dojo/ROUTING_MANIFEST.md` — restored
  verbatim from pre-#349 tracking (`69bfdd3d`, history preserved).
- `threejs-dojo-coverage/memory.md` — idem.
- `architecture-weed/memory.md` — idem.

## Rules

1. Runs **read** `docs/loops/<loop>/memory.md` first and **append** their new
   entry to it (commit the append with the run's deliverable); bulky evidence
   stays under `.loops/<loop>/output/` (untracked).
2. Append-only: never rewrite or prune past entries; corrections go in a new
   entry.
3. New loops register here (one dir per loop) before their first run commits
   memory.
