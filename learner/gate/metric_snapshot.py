"""The metric-failure snapshot: committed source of truth for which metric
names emitted by the teaching games are failure indicators.

``standards.game_metric_violations`` derives its vocabularies from this file
at import (the declared-seam discipline of ``load_thresholds`` reading
``learner.yaml``): nothing hardcodes failure metric names anymore. Loading is
fail-closed — a missing, malformed, or unprovenanced entry raises
:class:`MetricSnapshotError` naming the path and the offending entry, never
an empty vocabulary.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]

SNAPSHOT_PATH = REPO_ROOT / "learner" / "gate" / "metric_failure_snapshot.yaml"

#: Valid classifications. ``unknown`` is the pre-judgment state: the lint's
#: ``--check`` fails on any ``unknown`` entry until it is resolved.
CLASSIFICATIONS = frozenset(
    {"failure(nonzero)", "failure(true)", "not_failure", "unknown"}
)

_PROVENANCE = re.compile(r"^(receipt:[0-9a-f]{16}|manual:[a-z0-9][a-z0-9._-]*)$")


class MetricSnapshotError(ValueError):
    """The metric-failure snapshot is missing, unreadable, or malformed.

    Subclasses :class:`ValueError` so CLI boundaries surface it as a clean
    non-zero exit naming the path — mirrors :class:`ThresholdSeamError`.
    """


class _StrictLoader(yaml.SafeLoader):
    """SafeLoader that raises on duplicate mapping keys (YAML silently keeps
    the last duplicate otherwise — exactly the shadowing this validator exists
    to catch)."""


def _construct_mapping(loader: yaml.Loader, node: yaml.Node, deep: bool = False) -> dict:
    mapping: dict = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise MetricSnapshotError(f"duplicate key in snapshot: {key!r}")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


_StrictLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping
)


def _validate_entry(where: str, entry: object) -> dict[str, str]:
    if not isinstance(entry, dict):
        raise MetricSnapshotError(f"{where}: entry must be a mapping")
    classification = entry.get("classification")
    if classification not in CLASSIFICATIONS:
        raise MetricSnapshotError(
            f"{where}: classification {classification!r} not in {sorted(CLASSIFICATIONS)}"
        )
    provenance = entry.get("provenance")
    if not isinstance(provenance, str) or not _PROVENANCE.match(provenance):
        raise MetricSnapshotError(
            f"{where}: provenance must be receipt:<digest16> or manual:<who>"
        )
    return {"classification": str(classification), "provenance": provenance}


def _load_shared(raw: dict) -> dict[str, dict[str, dict[str, str]]]:
    shared = raw.get("shared") or {}
    if not isinstance(shared, dict):
        raise MetricSnapshotError("metric snapshot 'shared' must be a mapping")
    return {
        "shared": {
            str(metric): _validate_entry(f"shared.{metric}", entry)
            for metric, entry in shared.items()
        }
    }


def _load_games(raw: dict) -> dict[str, dict[str, dict[str, str]]]:
    games = raw.get("games") or {}
    if not isinstance(games, dict):
        raise MetricSnapshotError("metric snapshot 'games' must be a mapping")
    scopes: dict[str, dict[str, dict[str, str]]] = {}
    for game, metrics in games.items():
        if not isinstance(metrics, dict):
            raise MetricSnapshotError(f"games.{game} must be a mapping")
        for metric, entry in metrics.items():
            scopes.setdefault(str(game), {})[str(metric)] = _validate_entry(
                f"games.{game}.{metric}", entry
            )
    return scopes


def load_metric_snapshot(path: Path | None = None) -> dict[str, dict[str, dict[str, str]]]:
    """Return ``{scope: {metric: {"classification", "provenance"}}}``.

    ``scope`` is ``"shared"`` (engine-wide vocabulary) or a game id. Duplicate
    metric within a scope, bad classification, or missing provenance fail
    closed with the entry named.
    """
    snapshot_path = path or SNAPSHOT_PATH
    if not snapshot_path.is_file():
        raise MetricSnapshotError(f"metric snapshot missing: {snapshot_path}")
    try:
        raw = yaml.load(snapshot_path.read_text(encoding="utf-8"), Loader=_StrictLoader)
    except (OSError, yaml.YAMLError) as exc:
        raise MetricSnapshotError(f"metric snapshot unreadable: {snapshot_path}: {exc}") from exc
    if not isinstance(raw, dict) or "version" not in raw:
        raise MetricSnapshotError(
            f"metric snapshot must be a mapping with 'version': {snapshot_path}"
        )
    return {**_load_shared(raw), **_load_games(raw)}


def failure_vocabularies(
    snapshot: dict[str, dict[str, dict[str, str]]] | None = None,
) -> tuple[frozenset[str], frozenset[str]]:
    """Derive the runtime vocabularies: (nonzero-failure names, true-failure names).

    Union across every scope: a name classified as a failure indicator
    anywhere is a failure indicator for the disagreement check everywhere.
    """
    if snapshot is None:
        snapshot = load_metric_snapshot()
    nonzero: set[str] = set()
    true: set[str] = set()
    for metrics in snapshot.values():
        for name, entry in metrics.items():
            if entry["classification"] == "failure(nonzero)":
                nonzero.add(name)
            elif entry["classification"] == "failure(true)":
                true.add(name)
    return frozenset(nonzero), frozenset(true)
