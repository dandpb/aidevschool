"""Multi-tenant server-mode spike (ADR-0008, option C).

Read-only proof that a thin FastAPI adapter can serve canonical learner state
on top of the existing filesystem substrate — without touching the substrate.
Deliberately WITHOUT auth, writes, or locks (next phase).

Instance resolution order for ``learner_id``:
1. ``learner/instances/<learner_id>/learning_state.yaml`` (server-mode shard)
2. the pilot instance ``learner/learning_state.yaml`` when its declared
   ``learner.id`` equals ``learner_id``.
"""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import FastAPI, HTTPException

from learner.substrate import load_canonical, validate

REPO_ROOT = Path(__file__).resolve().parents[2]

# Safe learner-id pattern: prevents path traversal and weird shards.
SAFE_LEARNER_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,62}$")

app = FastAPI(title="aidevschool learner service (spike)", version="0.1.0-spike")


def _resolve_instance_path(learner_id: str, root: Path | None = None) -> Path | None:
    root = root or REPO_ROOT
    if not SAFE_LEARNER_ID.match(learner_id):
        return None
    shard = root / "learner" / "instances" / learner_id / "learning_state.yaml"
    if shard.is_file():
        return shard
    pilot = root / "learner" / "learning_state.yaml"
    if pilot.is_file():
        try:
            state = load_canonical(pilot)
        except Exception:
            return None
        if isinstance(state, dict) and state.get("learner", {}).get("id") == learner_id:
            return pilot
    return None


@app.get("/learners/{learner_id}/state")
def get_learner_state(learner_id: str) -> dict:
    """Return the canonical state of one learner (read-only)."""
    state_path = _resolve_instance_path(learner_id)
    if state_path is None:
        raise HTTPException(status_code=404, detail="learner not found")
    state = load_canonical(state_path)
    errors = validate(state, state_path.parent.parent)
    return {
        "learner_id": learner_id,
        "canonical_path": str(state_path.relative_to(REPO_ROOT)),
        "valid": not errors,
        "validation_errors": errors,
        "state": state,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": "spike", "auth": "none"}
