"""Authoring-time lint for game failure metrics — see .tasks/metric-rubric-lint.md.

Three modes:

- ``python3 -m learner.gate.metric_lint`` (no flags): print the enumeration
  census — every metric name each game emits, union of game-source object
  literals, ``evidence_rubrics.yaml`` ``pass_when`` fields, and on-disk
  evidence records.
- ``--propose`` (requires ``TYPESAFE_API_KEY``): ask a typed judgment per
  unclassified metric (Choice: ``failure_nonzero`` / ``failure_true`` /
  ``not_failure``), record digest-named receipts, and print a YAML snippet to
  paste into ``metric_failure_snapshot.yaml``.
- ``--check`` (offline, deterministic): exit 1 naming every enumerated metric
  missing from the snapshot and every ``unknown`` entry; exit 0 when covered.
  This is what CI runs — no API, no key, no network.
"""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

from learner.gate.metric_snapshot import (
    SNAPSHOT_PATH,
    load_metric_snapshot,
)
from learner.substrate import judgments

REPO_ROOT = Path(__file__).resolve().parents[2]

VOXEL_GAMES_GLOB = "game-*"
_METRICS_BLOCK = re.compile(r"\bmetrics\s*:\s*\{")
_LITERAL_KEY = re.compile(r"(?:^|[,{\s])([A-Za-z_][A-Za-z0-9_]*)\s*:")

_CHOICE_CRITERIA = {
    "failure_nonzero": (
        "A numeric count where any value > 0 means mistakes or failures "
        "occurred in the run (e.g. abusive_admitted, bad_routes)"
    ),
    "failure_true": (
        "A boolean where true means the scenario failed "
        "(e.g. overheated, queue_overflowed)"
    ),
    "not_failure": (
        "Success counter, accuracy/measure value, or discriminator: "
        "nonzero or true is good or neutral (e.g. good_admits, "
        "prediction_accuracy, kind)"
    ),
}


# ---------------------------------------------------------------------------
# Enumeration: game src object literals ∪ rubrics pass_when ∪ on-disk evidence
# ---------------------------------------------------------------------------


def _brace_block(text: str, open_idx: int) -> str:
    depth = 0
    for idx in range(open_idx, len(text)):
        if text[idx] == "{":
            depth += 1
        elif text[idx] == "}":
            depth -= 1
            if depth == 0:
                return text[open_idx : idx + 1]
    return text[open_idx:]


def _literal_keys(block: str) -> set[str]:
    return set(_LITERAL_KEY.findall(block))


def _game_source_metrics(game_src: Path) -> set[str]:
    names: set[str] = set()
    for source in game_src.rglob("*"):
        if source.suffix not in {".ts", ".tsx"} or not source.is_file():
            continue
        text = source.read_text(encoding="utf-8", errors="replace")
        for match in _METRICS_BLOCK.finditer(text):
            open_idx = text.find("{", match.start())
            if open_idx != -1:
                names |= _literal_keys(_brace_block(text, open_idx))
    return names


def _rubric_metrics(rubrics_path: Path) -> set[str]:
    import yaml

    if not rubrics_path.is_file():
        return set()
    raw = yaml.safe_load(rubrics_path.read_text(encoding="utf-8")) or {}
    names: set[str] = set()
    for rubric in raw.get("rubrics") or []:
        for predicate in rubric.get("pass_when") or []:
            field = str(predicate.get("field", ""))
            if field.startswith("metrics."):
                names.add(field[len("metrics.") :])
    return names


def _evidence_metrics(root: Path) -> set[str]:
    names: set[str] = set()
    for path in root.glob("engines/voxelDojo/*/.logs/evidence*.ndjson"):
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            metrics = record.get("metrics")
            if isinstance(metrics, dict):
                names.update(str(k) for k in metrics)
    return names


def enumerate_metrics(root: Path | None = None) -> dict[str, set[str]]:
    """Census: ``{game: metric names}`` across all three vocabularies."""
    root = root or REPO_ROOT
    census: dict[str, set[str]] = {}
    for game_dir in sorted((root / "engines" / "voxelDojo").glob(VOXEL_GAMES_GLOB)):
        if (game_dir / "src").is_dir():
            census[game_dir.name] = _game_source_metrics(game_dir / "src")
    census["pixelquest"] = _game_source_metrics(root / "engines" / "pixelDojo" / "pixel-quest" / "src")
    census["rubrics"] = _rubric_metrics(root / "learner" / "gate" / "evidence_rubrics.yaml")
    census["evidence-disk"] = _evidence_metrics(root)
    return {scope: names for scope, names in census.items() if names}


# ---------------------------------------------------------------------------
# Propose: typed judgment per unclassified metric
# ---------------------------------------------------------------------------


def _build_questions(unclassified: dict[str, set[str]]) -> tuple[dict[str, Any], dict[str, Any]]:
    entries: dict[str, Any] = {}
    questions: dict[str, Any] = {}
    for scope, names in sorted(unclassified.items()):
        for metric in sorted(names):
            qid = f"{scope}::{metric}"
            entries[qid] = {"metric_name": metric, "where_emitted": scope}
            questions[qid] = {
                "type": "choice",
                "instructions": (
                    f"Classify the emitted game metric `metric_name` in "
                    f"`entries.{qid}`. Does a nonzero count or a true value "
                    "mean the player FAILED the scenario?"
                ),
                "criteria": _CHOICE_CRITERIA,
            }
    return {"entries": entries}, questions


_CLASSIFICATION_FROM_CHOICE = {
    "failure_nonzero": "failure(nonzero)",
    "failure_true": "failure(true)",
    "not_failure": "not_failure",
}


def propose(
    census: dict[str, set[str]],
    snapshot: dict[str, dict[str, dict[str, str]]],
    *,
    client: Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]],
    receipts_root: Path | None = None,
) -> str:
    """Judge every unclassified metric; return the YAML snippet to paste.

    Failures degrade per question: the metric stays ``unknown`` and a
    fallback receipt records why (the ``_ask`` contract from judgments).
    """
    unclassified: dict[str, set[str]] = {}
    for scope, names in census.items():
        known = snapshot.get(scope, {}) | snapshot.get("shared", {})
        missing = {n for n in names if n not in known}
        if missing:
            unclassified[scope] = missing
    state, questions = _build_questions(unclassified)
    if not questions:
        return "# snapshot already covers every enumerated metric\n"
    answers = judgments._ask(
        "metric-lint", "choice", state, questions, client,
        receipts_root or judgments.DEFAULT_RECEIPTS_ROOT,
    )
    if answers is None:
        return _unknown_snippet(unclassified, reason="judgment failed; see fallback receipt")
    digest = judgments.record_judgment(
        "metric-lint", state, questions, answers, receipts_root
    )
    return _render_snippet(unclassified, answers, digest)


def _render_snippet(
    unclassified: dict[str, set[str]],
    answers: dict[str, Any],
    digest: str,
) -> str:
    lines: list[str] = []
    for scope, names in sorted(unclassified.items()):
        section = "shared" if scope in {"rubrics", "evidence-disk"} else scope
        lines.append(f"{section}:")
        for metric in sorted(names):
            answer = answers.get(f"{scope}::{metric}", {})
            choice = answer.get("choice")
            classification = _CLASSIFICATION_FROM_CHOICE.get(choice)
            if classification is None:
                lines.append(
                    f"  {metric}: {{classification: unknown, provenance: manual:judgment-unparsed}}"
                )
                continue
            probabilities = answer.get("probabilities") or {}
            lines.append(
                f"  {metric}: {{classification: {classification}, "
                f"provenance: receipt:{digest}}}  "
                f"# p={probabilities.get(choice, '?')}"
            )
    return "\n".join(lines) + "\n"


def _unknown_snippet(unclassified: dict[str, set[str]], reason: str) -> str:
    lines = [f"# judgment unavailable: {reason}"]
    for scope, names in sorted(unclassified.items()):
        section = "shared" if scope in {"rubrics", "evidence-disk"} else scope
        lines.append(f"{section}:")
        for metric in sorted(names):
            lines.append(f"  {metric}: {{classification: unknown, provenance: manual:pending}}")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Check: offline, deterministic, fail-closed
# ---------------------------------------------------------------------------


def check(census: dict[str, set[str]], snapshot: dict[str, dict[str, dict[str, str]]]) -> list[str]:
    """Every gap as ``<scope>::<metric>``: missing from the snapshot, or unknown."""
    gaps: list[str] = []
    for scope, names in sorted(census.items()):
        known = snapshot.get(scope, {}) | snapshot.get("shared", {})
        for metric in sorted(names):
            entry = known.get(metric)
            if entry is None:
                gaps.append(f"{scope}::{metric} (missing from snapshot)")
            elif entry["classification"] == "unknown":
                gaps.append(f"{scope}::{metric} (classified unknown)")
    return gaps


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    census = enumerate_metrics()
    if "--check" in argv:
        gaps = check(census, load_metric_snapshot())
        for gap in gaps:
            print(f"metric-lint: {gap}")
        return 1 if gaps else 0
    if "--propose" in argv:
        # Reuse the substrate entry client (env + dotenv + replay + memo):
        # identical policy, and disk replay makes re-propose idempotent.
        from learner.substrate import default_judgment_client

        client = default_judgment_client()
        if client is None:
            print("metric-lint: --propose requires TYPESAFE_API_KEY (env or .env)", file=sys.stderr)
            return 2
        print(propose(census, load_metric_snapshot(), client=client))
        return 0
    for scope, names in sorted(census.items()):
        print(f"{scope}: {sorted(names)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
