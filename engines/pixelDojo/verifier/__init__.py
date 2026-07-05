"""pixelDojo verifier — the Prometor context that owns the ``mastered`` transition.

Closes the loop the game deliberately leaves open (producer != verifier):

    game emits raw evidence  ->  THIS verifier validates it against the
    empirical gate  ->  appends a gate review to learner/learning_state.yaml
    units_log  ->  regenerates derived views.

The game never writes ``mastered``; this module never produces evidence. It only
reads an evidence file the game produced, checks the preconditions of the
learning gate (attempt before solution, executable evidence, unit match), and
records the outcome through the substrate's own scheduling primitives, so every
invariant the substrate validator enforces is honored by construction.

Two evidence formats are accepted (see ``EVIDENCE_CONTRACT.md``):

- legacy single-record JSON (``.logs/last_run_evidence.json``) — one object;
- the NDJSON contract (``pixel-quest/.logs/evidence.ndjson``) — one JSON
  object per line, one line per completed encounter attempt, in play order.
  The verifier selects the **latest** record matching the active unit; the
  other lines are other units' attempts and are ignored (they gate when their
  unit becomes active).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml

from learner.substrate import load_and_validate, validate
from learner.substrate.scheduling import RATING_FROM_GATE, record_gate_outcome

#: Fields every evidence record must carry regardless of game.
REQUIRED_EVIDENCE_FIELDS = ("unit_id", "project", "game", "ts", "pass")


def _parse_ts(ts: str) -> datetime:
    """Parse an ISO-8601 evidence timestamp (``Z`` suffix tolerated)."""
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


class _NoAliasDumper(yaml.SafeDumper):
    """safe_dump emits anchors/aliases for shared objects (e.g. the gate date
    appearing in both units_log and streak); keep the canonical file plain."""

    def ignore_aliases(self, data: Any) -> bool:  # noqa: ARG002
        return True


@dataclass
class GateDecision:
    """Outcome of a verification run (before anything is written)."""

    passed: bool
    gate_outcome: str  # fail | pass_retried | pass_first_try | pass_exceeds
    rating: str  # derived via RATING_FROM_GATE — the gate is the only rating producer
    errors: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def load_evidence(path: str | Path) -> dict[str, Any]:
    """Load an evidence JSON file produced by a pixelDojo game."""
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_evidence_ndjson(path: str | Path) -> list[dict[str, Any]]:
    """Parse the NDJSON evidence contract file (one JSON object per line).

    Strict by design: the emitter validates every record before writing, so a
    malformed line means the file was tampered with or truncated — the whole
    file is rejected (``ValueError``) rather than silently skipping lines.
    Blank lines are tolerated; an empty file yields ``[]``.
    """
    path = Path(path)
    records: list[dict[str, Any]] = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}: line {lineno} is not valid JSON: {exc}") from exc
        if not isinstance(record, dict):
            raise ValueError(f"{path}: line {lineno} is not a JSON object")
        records.append(record)
    return records


def select_evidence(
    records: list[dict[str, Any]], active_unit: dict[str, Any]
) -> dict[str, Any] | None:
    """Latest NDJSON record for the active unit (records come in play order).

    Returns ``None`` when no record targets the active unit — that is *nothing
    to grade*, not a rejection: the other lines belong to other units.
    """
    matches = [r for r in records if r.get("unit_id") == active_unit.get("id")]
    return matches[-1] if matches else None


def _last_gated_evidence_ts(units_log: list[dict[str, Any]], unit_id: str) -> str | None:
    """Latest ``evidence_ts`` already recorded in a gate review for this unit."""
    latest: str | None = None
    for entry in units_log or []:
        if entry.get("unit_id") != unit_id:
            continue
        for review in entry.get("reviews") or []:
            ts = review.get("evidence_ts")
            if isinstance(ts, str) and (latest is None or ts > latest):
                latest = ts
    return latest


def check_evidence(
    evidence: dict[str, Any],
    active_unit: dict[str, Any],
    root: Path,
    units_log: list[dict[str, Any]] | None = None,
) -> list[str]:
    """Return the list of gate-precondition violations (empty means eligible).

    Checks are about *eligibility to be gated*, not pass/fail of the run itself:
    a well-formed evidence file with ``pass: false`` is eligible — it gates to
    ``fail``. A malformed or mismatched file is not eligible at all.
    """
    errors: list[str] = []

    for fname in REQUIRED_EVIDENCE_FIELDS:
        if fname not in evidence:
            errors.append(f"evidence missing required field {fname!r}")
    if errors:
        return errors

    if not isinstance(evidence["pass"], bool):
        errors.append("evidence field 'pass' must be a boolean")

    if evidence["unit_id"] != active_unit.get("id"):
        errors.append(
            f"evidence unit_id {evidence['unit_id']!r} does not match "
            f"active_unit {active_unit.get('id')!r}"
        )
    if evidence["project"] != active_unit.get("project"):
        errors.append(
            f"evidence project {evidence['project']!r} does not match "
            f"active_unit project {active_unit.get('project')!r}"
        )

    # Learning gate: a learner attempt must exist before any mastery transition.
    attempt = active_unit.get("attempt_file")
    if not attempt:
        errors.append("active_unit has no attempt_file; attempt-before-solution unmet")
    elif not (root / attempt).exists():
        errors.append(f"attempt file not found: {attempt}")
    elif not (root / attempt).read_text(encoding="utf-8").strip():
        errors.append(f"attempt file is empty (stub): {attempt}; attempt-before-solution unmet")

    if active_unit.get("state") != "evaluating":
        errors.append(
            f"active_unit.state is {active_unit.get('state')!r}; the gate only "
            "runs on 'evaluating' (attempt made, awaiting verification)"
        )

    # Internal-consistency sanity: a run that admitted abusive traffic cannot
    # claim PASS, whatever the flag says.
    if evidence.get("pass") is True and evidence.get("abusive_admitted", 0) > 0:
        errors.append(
            "evidence claims pass but abusive_admitted > 0 — inconsistent record"
        )

    # NDJSON-contract records carry a per-kind metrics variant; if present it
    # must at least be a discriminated object (the emitter guarantees this,
    # so anything else is a tampered/hand-written record).
    metrics = evidence.get("metrics")
    if metrics is not None and (not isinstance(metrics, dict) or not metrics.get("kind")):
        errors.append("evidence.metrics must be an object with a 'kind' discriminator")

    # Anti-replay: evidence already consumed by a previous gate (or older than
    # it) cannot be graded again. Gate reviews record the evidence 'ts' they
    # consumed (see apply_gate); a new record must be strictly newer.
    try:
        evidence_ts = _parse_ts(str(evidence["ts"]))
    except ValueError:
        errors.append(f"evidence ts {evidence['ts']!r} is not a valid ISO-8601 timestamp")
    else:
        last_ts = _last_gated_evidence_ts(units_log or [], active_unit.get("id"))
        if last_ts is not None and evidence_ts <= _parse_ts(last_ts):
            errors.append(
                f"evidence ts {evidence['ts']!r} is not newer than the last gated "
                f"evidence for this unit ({last_ts!r}) — stale or duplicate record; "
                "replay the mission to produce fresh evidence"
            )

    return errors


def decide(
    evidence: dict[str, Any],
    active_unit: dict[str, Any],
    root: Path,
    units_log: list[dict[str, Any]] | None = None,
) -> GateDecision:
    """Check eligibility and map the run result to a gate outcome + rating."""
    errors = check_evidence(evidence, active_unit, root, units_log)
    if errors:
        return GateDecision(passed=False, gate_outcome="fail", rating="again", errors=errors)

    if evidence["pass"]:
        outcome = "pass_first_try" if int(active_unit.get("retry_count", 0)) == 0 else "pass_retried"
    else:
        outcome = "fail"
    return GateDecision(passed=evidence["pass"], gate_outcome=outcome, rating=RATING_FROM_GATE[outcome])


def _evidence_date(evidence: dict[str, Any]) -> date:
    return datetime.fromisoformat(evidence["ts"].replace("Z", "+00:00")).date()


def apply_gate(
    state: dict[str, Any],
    evidence: dict[str, Any],
    decision: GateDecision,
    today: date,
) -> dict[str, Any]:
    """Apply an eligible gate decision to the canonical state (pure; returns new state)."""
    if not decision.ok:
        raise ValueError(f"decision is not eligible to gate: {decision.errors}")

    new_state = yaml.safe_load(yaml.safe_dump(state, sort_keys=False))  # deep copy
    unit = new_state["active_unit"]

    entry = {
        "unit_id": unit["id"],
        "concept": unit.get("title", unit["id"]),
        "kind": "concept",
        "project": unit["project"],
        "mastered": decision.passed,
        "evidence_file": unit.get("evidence_file"),
        "attempt_file": unit.get("attempt_file"),
        "reviews": [
            {"date": _evidence_date(evidence), "event": "presented"},
            {
                "date": today,
                "event": "gate",
                "rating": decision.rating,
                "gate_outcome": decision.gate_outcome,
                # Anti-replay marker: the exact evidence timestamp this gate
                # consumed. check_evidence rejects any record not newer.
                "evidence_ts": evidence["ts"],
            },
        ],
    }
    new_state.setdefault("units_log", []).append(entry)

    if decision.passed:
        unit["state"] = "mastered"
        new_state["next_action"] = {
            "owner": "leader",
            "action": (
                f"{unit['id']} mastered with executable evidence. Pick the next "
                "unit (Cartografo) and present it before any implementation."
            ),
        }
    else:
        unit["retry_count"] = int(unit.get("retry_count", 0)) + 1
        new_state["next_action"] = {
            "owner": "learner",
            "action": (
                f"Gate failed for {unit['id']} "
                f"(retry {unit['retry_count']}/{unit.get('retry_limit', 3)}). "
                "Replay the mission and produce new evidence."
            ),
        }

    new_state["streak"] = record_gate_outcome(
        new_state.get("streak", {}), decision.passed, today
    )

    invariant_errors = validate(new_state)
    if invariant_errors:
        raise ValueError(f"gated state violates substrate invariants: {invariant_errors}")
    return new_state


def verify_and_gate(
    root: str | Path,
    evidence_path: str | Path,
    today: date | None = None,
    dry_run: bool = False,
) -> GateDecision | None:
    """End-to-end run: load, decide, and (unless dry_run) persist + resync views.

    ``evidence_path`` may be a legacy single-record ``.json`` file or the
    NDJSON contract (``*.ndjson``); for NDJSON the latest record matching the
    active unit is graded. Returns ``None`` when the NDJSON file holds no
    record for the active unit — nothing to grade (distinct from a rejection).
    """
    root = Path(root)
    today = today or date.today()

    state = load_and_validate(root / "learner" / "learning_state.yaml")
    if Path(evidence_path).suffix == ".ndjson":
        evidence = select_evidence(load_evidence_ndjson(evidence_path), state["active_unit"])
        if evidence is None:
            return None
    else:
        evidence = load_evidence(evidence_path)
    decision = decide(evidence, state["active_unit"], root, state.get("units_log"))
    if not decision.ok or dry_run:
        return decision

    new_state = apply_gate(state, evidence, decision, today)
    (root / "learner" / "learning_state.yaml").write_text(
        yaml.dump(
            new_state,
            Dumper=_NoAliasDumper,
            sort_keys=False,
            allow_unicode=True,
            width=100,
        ),
        encoding="utf-8",
    )
    return decision
