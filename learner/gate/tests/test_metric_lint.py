"""Checks for the metric-failure rubric lint (see .checks/metric-rubric-lint.md).

Hermetic: canned tests run against tmp fixture trees and an injected fake
client; the live enumeration and census proofs read the committed repo
sources. No test touches the network.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from learner.gate import metric_lint, standards
from learner.gate.metric_snapshot import (
    MetricSnapshotError,
    failure_vocabularies,
    load_metric_snapshot,
)

REPO = Path(__file__).resolve().parents[3]


# --- S1: snapshot + runtime derivation ---------------------------------------


def test_frozensets_derived_preserve_legacy_behavior() -> None:
    """C1: derived vocabularies behave exactly like the legacy frozensets."""
    assert standards.game_metric_violations(
        {"metrics": {"abusive_admitted": 2}}
    ) == ["abusive_admitted=2"]
    assert standards.game_metric_violations(
        {"metrics": {"overheated": True}}
    ) == ["overheated=true"]
    assert standards.game_metric_violations(
        {"metrics": {"totally_unclassified_name": 5}}
    ) == []


def test_snapshot_failure_nonzero_detected(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """C2: a snapshot failure(nonzero) entry drives game_metric_violations."""
    snap_path = tmp_path / "snapshot.yaml"
    snap_path.write_text(
        "version: 1\n"
        "shared: {}\n"
        "games:\n"
        "  game-99-fx:\n"
        "    crashes: {classification: failure(nonzero), provenance: manual:test}\n",
        encoding="utf-8",
    )
    snapshot = load_metric_snapshot(snap_path)
    nonzero, _ = failure_vocabularies(snapshot)
    assert "crashes" in nonzero
    monkeypatch.setattr(standards, "_NONZERO_FAILURE_METRICS", nonzero)
    monkeypatch.setattr(standards, "_TRUE_FAILURE_METRICS", frozenset())
    assert standards.game_metric_violations({"metrics": {"crashes": 3}}) == ["crashes=3"]


@pytest.mark.parametrize(
    "content,needle",
    [
        (None, "missing"),  # file absent
        ("version: 1\nshared: {}\ngames:\n  g: {classification: failure(nonzero), provenance: manual:x}\n",
         "must be a mapping"),
        ("version: 1\nshared: {}\ngames:\n  g:\n    m: {classification: bogus, provenance: manual:x}\n",
         "classification"),
        ("version: 1\nshared: {}\ngames:\n  g:\n    m: {classification: not_failure}\n",
         "provenance"),
        ("version: 1\nshared: {}\ngames:\n  g:\n"
         "    m: {classification: not_failure, provenance: manual:x}\n"
         "    m: {classification: not_failure, provenance: manual:x}\n",
         "duplicate"),
    ],
)
def test_malformed_snapshot_fails_closed(
    tmp_path: Path, content: str | None, needle: str
) -> None:
    """C3: every shape error raises MetricSnapshotError naming the entry."""
    snap_path = tmp_path / "snapshot.yaml"
    if content is not None:
        snap_path.write_text(content, encoding="utf-8")
    with pytest.raises(MetricSnapshotError) as exc:
        load_metric_snapshot(snap_path)
    assert needle in str(exc.value)


# --- S2: enumeration -----------------------------------------------------------


FIXTURE_GAME = (
    "export function evaluate() {\n"
    "  return {\n"
    "    metrics: {\n"
    "      outer_count: 3,\n"
    "      nested: { inner_ok: true, deeper: { deep_key: 1 } },\n"
    "    },\n"
    "  };\n"
    "}\n"
)


def test_enumeration_extracts_literal_keys(tmp_path: Path) -> None:
    """C4a: literal keys extracted at any nesting depth, computed keys skipped."""
    game_src = tmp_path / "engines" / "voxelDojo" / "game-99-fx" / "src" / "sim"
    game_src.mkdir(parents=True)
    (game_src / "levels.ts").write_text(FIXTURE_GAME, encoding="utf-8")
    census = metric_lint.enumerate_metrics(tmp_path)
    assert census["game-99-fx"] == {"outer_count", "nested", "inner_ok", "deeper", "deep_key"}


def test_enumeration_game10_live() -> None:
    """C4b: the real game-10 sources yield their known metric names."""
    census = metric_lint.enumerate_metrics(REPO)
    game10 = census["game-10-hash-ring"]
    assert {"owner_predictions", "moved_keys", "arc_prediction_ok"} <= game10


def test_rubrics_only_metrics_enumerated() -> None:
    """C5: every rubrics pass_when metric appears in the census."""
    census = metric_lint.enumerate_metrics(REPO)
    import yaml

    rubrics = yaml.safe_load(
        (REPO / "learner" / "gate" / "evidence_rubrics.yaml").read_text(encoding="utf-8")
    )
    expected = {
        p["field"][len("metrics."):]
        for r in rubrics["rubrics"]
        for p in r["pass_when"]
        if str(p["field"]).startswith("metrics.")
    }
    assert expected == census["rubrics"]


# --- S3: propose ----------------------------------------------------------------


class FakeClient:
    def __init__(self, answers: dict[str, Any] | None = None, error: Exception | None = None):
        self.answers = answers or {
            "game-99-fx::alpha": {
                "type": "choice", "choice": "failure_nonzero",
                "probabilities": {"failure_nonzero": 0.97}, "confidence": 0.97,
            },
            "game-99-fx::beta": {
                "type": "choice", "choice": "not_failure",
                "probabilities": {"not_failure": 0.99}, "confidence": 0.99,
            },
        }
        self.error = error

    def __call__(self, state: dict[str, Any], questions: dict[str, Any]) -> dict[str, Any]:
        if self.error is not None:
            raise self.error
        assert set(self.answers) == set(questions), "fake answers must cover questions"
        return self.answers


def test_propose_writes_receipts_and_prints_yaml(tmp_path: Path) -> None:
    """C6: receipts land; the snippet carries classification + provenance."""
    receipts = tmp_path / "receipts"
    snippet = metric_lint.propose(
        {"game-99-fx": {"alpha", "beta"}},
        {"shared": {}},
        client=FakeClient(),
        receipts_root=receipts,
    )
    files = list(receipts.glob("metric-lint-*.ndjson"))
    assert len(files) == 1, "one digest-named receipt per sweep"
    lines = [json.loads(l) for l in files[0].read_text(encoding="utf-8").splitlines()]
    assert all(line["kind"] == "choice" for line in lines)
    assert {line["question"] for line in lines} == {
        "game-99-fx::alpha",
        "game-99-fx::beta",
    }
    assert "classification: failure(nonzero)" in snippet
    assert "classification: not_failure" in snippet
    assert "provenance: receipt:" in snippet
    assert "# p=0.97" in snippet


def test_propose_without_key_exits_2(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture
) -> None:
    """C7: --propose without a key exits 2 naming the variable."""
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.setattr(metric_lint, "enumerate_metrics", lambda root=None: {"g": {"m"}})
    monkeypatch.setattr(
        metric_lint, "load_metric_snapshot", lambda: {"shared": {}, "g": {}}
    )
    assert metric_lint.main(["--propose"]) == 2
    assert "TYPESAFE_API_KEY" in capsys.readouterr().err


def test_propose_judgment_failure_stays_unknown(tmp_path: Path) -> None:
    """C8: judgment failure degrades to unknown entries + fallback receipt."""
    receipts = tmp_path / "receipts"
    snippet = metric_lint.propose(
        {"game-99-fx": {"alpha"}},
        {"shared": {}},
        client=FakeClient(error=RuntimeError("api down")),
        receipts_root=receipts,
    )
    assert "classification: unknown" in snippet
    fallback = list(receipts.glob("metric-lint-*-fallback.ndjson"))
    assert len(fallback) == 1
    line = json.loads(fallback[0].read_text(encoding="utf-8"))
    assert line["status"] == "fallback" and line["error_class"] == "RuntimeError"


# --- S4: check + CI -------------------------------------------------------------


def test_check_fails_closed_on_gaps() -> None:
    """C9: missing metrics and unknown entries both fail, named."""
    census = {"game-99-fx": {"covered", "missing_one", "unknown_one"}}
    snapshot = {
        "shared": {},
        "game-99-fx": {
            "covered": {"classification": "not_failure", "provenance": "manual:t"},
            "unknown_one": {"classification": "unknown", "provenance": "manual:t"},
        },
    }
    gaps = metric_lint.check(census, snapshot)
    assert any("missing_one" in g and "missing from snapshot" in g for g in gaps)
    assert any("unknown_one" in g and "classified unknown" in g for g in gaps)
    assert not any("covered" in g for g in gaps)


def test_check_census_green_over_current_repo() -> None:
    """C10: the committed snapshot covers the repo's full metric census."""
    assert metric_lint.main(["--check"]) == 0


def test_ci_guard_step_present() -> None:
    """C11: the Python learner CI job runs the offline guard."""
    workflow = (REPO / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    python_job = workflow.split("Python (learner + curriculum shared)", 1)[1]
    assert "learner.gate.metric_lint --check" in python_job
