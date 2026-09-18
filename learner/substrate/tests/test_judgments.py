"""Checks for the semantic judgment enrichment (see .checks/semantic-substrate-seam.md).

Hermetic by construction: every canned test runs against a fixture tree under
``tmp_path`` with an injected fake client — no repo data, no network. The one
exception is the live smoke (C8), skipped unless ``TYPESAFE_API_KEY`` is set.
"""

from __future__ import annotations

import json
import os
import urllib.error
from pathlib import Path
from typing import Any

import pytest

from learner.substrate.dashboard_snapshot import build_snapshot
from learner.substrate.tests.judgments_fixture import (
    FIXTURE_TODAY,
    PT_ONLY_PROFILE_MD,
    RECORDED_HIT_INDICES,
    STATE,
    write_fixture_tree,
)

GOLDEN = Path(__file__).parent / "fixtures" / "judgments_golden.json"


class FakeClient:
    """Injected judgment client: canned answers by question-id rule."""

    def __init__(
        self,
        noul_rule: Any = None,
        choices: dict[str, dict[str, Any]] | None = None,
        error: Exception | None = None,
        raw_answers: dict[str, Any] | None = None,
    ) -> None:
        self.noul_rule = noul_rule or (lambda qid: 0.05)
        self.choices = choices or {
            "dreyfus_overall": {"type": "choice", "choice": "competent",
                                "probabilities": {"competent": 0.99}, "confidence": 0.99},
            "bloom_overall": {"type": "choice", "choice": "analyze",
                              "probabilities": {"analyze": 0.97}, "confidence": 0.97},
        }
        self.error = error
        self.raw_answers = raw_answers
        self.calls: list[tuple[dict[str, Any], dict[str, Any]]] = []

    def __call__(self, state: dict[str, Any], questions: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((state, questions))
        if self.error is not None:
            raise self.error
        if self.raw_answers is not None:
            return self.raw_answers
        answers: dict[str, Any] = {}
        for qid in questions:
            if qid in self.choices:
                answers[qid] = self.choices[qid]
            else:
                answers[qid] = {"type": "noul", "noul": float(self.noul_rule(qid))}
        return answers


def recorded_hits(qid: str) -> float:
    """Canned noul mirroring the live 2026-09-17 sweep distribution."""
    entry_id = qid.rsplit("__", 1)[1]
    return 0.6 if int(entry_id[1:]) in RECORDED_HIT_INDICES else 0.05


def build(root: Path, receipts: Path, client: Any = None) -> dict[str, Any]:
    return build_snapshot(
        root / "learner" / "learning_state.yaml",
        state=STATE,
        source_root=root,
        today=FIXTURE_TODAY,
        judgment_client=client,
        judgment_receipts_root=receipts,
    )


def receipt_files(receipts: Path) -> list[Path]:
    return sorted(receipts.glob("*.ndjson")) if receipts.exists() else []


def receipt_lines(receipts: Path) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    for path in receipt_files(receipts):
        lines.extend(json.loads(line) for line in path.read_text(encoding="utf-8").splitlines())
    return lines


# --- S1: runner, receipts, fallback -----------------------------------------


def test_receipt_written_on_success(tmp_path: Path) -> None:
    """C1: one JSON object per asked question, all provenance fields present."""
    root = write_fixture_tree(tmp_path / "src")
    receipts = tmp_path / "receipts"
    snap = build(root, receipts, FakeClient())
    assert snap["topPitfalls"], "fixture must yield a pitfall"
    files = receipt_files(receipts)
    assert len(files) == 2, f"expected pitfalls+profile receipts, got {files}"
    ok_lines = [line for line in receipt_lines(receipts) if line["status"] == "ok"]
    assert ok_lines, "no ok receipt lines written"
    import re as _re
    for path in files:
        assert _re.match(r"^(pitfalls|profile)-[0-9a-f]{16}\.ndjson$", path.name), path.name
    for line in ok_lines:
        assert line["kind"] in {"noul", "choice"}
        assert isinstance(line["question"], str)
        assert "answer" in line and "probabilities" in line
        assert line["model"]
        assert "usage" in line
        digest = line["input_digest"]
        assert isinstance(digest, str) and len(digest) == 64
        assert all(c in "0123456789abcdef" for c in digest)
        assert line["timestamp"]


def test_no_client_is_byte_identical_to_golden(tmp_path: Path) -> None:
    """C2: without a client, the snapshot equals the pre-change golden."""
    root = write_fixture_tree(tmp_path / "src")
    receipts = tmp_path / "receipts"
    snap = build(root, receipts)  # no client: deterministic path
    assert receipt_files(receipts) == [], "no receipts may appear without a client"
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    assert json.dumps(snap, sort_keys=True, ensure_ascii=False) == json.dumps(
        golden, sort_keys=True, ensure_ascii=False
    )


def test_fallback_on_client_failure(tmp_path: Path) -> None:
    """C3a: an HTTP error falls back to deterministic values + fallback receipt."""
    root = write_fixture_tree(tmp_path / "src")
    receipts = tmp_path / "receipts"
    failing = FakeClient(error=urllib.error.HTTPError(
        "https://api.typesafe.ai", 500, "boom", None, None
    ))
    snap = build(root, receipts, failing)
    baseline = build(root, tmp_path / "receipts_baseline")
    assert json.dumps(snap, sort_keys=True) == json.dumps(baseline, sort_keys=True)
    fallback = [line for line in receipt_lines(receipts) if line["status"] == "fallback"]
    assert fallback, "no fallback receipt written"
    assert all(line["error_class"] == "HTTPError" for line in fallback)


def test_fallback_on_mismatched_answer_keys(tmp_path: Path) -> None:
    """C3b: answers whose keys do not match the questions fall back."""
    root = write_fixture_tree(tmp_path / "src")
    receipts = tmp_path / "receipts"
    bogus = FakeClient(raw_answers={"totally_bogus": {"type": "noul", "noul": 0.9}})
    snap = build(root, receipts, bogus)
    baseline = build(root, tmp_path / "receipts_baseline")
    assert json.dumps(snap, sort_keys=True) == json.dumps(baseline, sort_keys=True)
    fallback = [line for line in receipt_lines(receipts) if line["status"] == "fallback"]
    assert fallback and all(
        line["error_class"] == "JudgmentError" for line in fallback
    )


def test_key_never_in_receipt(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """C4: the API key value never appears in any receipt file."""
    monkeypatch.setenv("TYPESAFE_API_KEY", "sk-sentinel-do-not-leak")
    root = write_fixture_tree(tmp_path / "src")
    receipts = tmp_path / "receipts"
    build(root, receipts, FakeClient())
    assert receipt_files(receipts), "expected receipts to exist for the leak scan"
    for path in receipt_files(receipts):
        assert "sk-sentinel-do-not-leak" not in path.read_text(encoding="utf-8")


def test_next_reviews_unchanged_by_enrichment(tmp_path: Path) -> None:
    """C5: judgments change no scheduling output."""
    root = write_fixture_tree(tmp_path / "src")
    enriched = build(root, tmp_path / "r1", FakeClient())
    plain = build(root, tmp_path / "r2")
    assert enriched["nextReviews"] == plain["nextReviews"]


# --- S2: pitfall recurrence --------------------------------------------------


def test_occurrences_count_semantic_hits(tmp_path: Path) -> None:
    """C6: 21 canned hits -> occurrences 21, id/lastSeen unchanged."""
    root = write_fixture_tree(tmp_path / "src")
    snap = build(root, tmp_path / "receipts", FakeClient(noul_rule=recorded_hits))
    pitfall = snap["topPitfalls"][0]
    assert pitfall["occurrences"] == 21
    assert pitfall["id"] == "P-001"
    assert pitfall["lastSeen"] == "2026-06-18"


def test_new_recurrence_updates_count_and_receipt(tmp_path: Path) -> None:
    """C7: a new repeating entry raises the count and writes a new receipt."""
    root = write_fixture_tree(tmp_path / "src")
    receipts = tmp_path / "receipts"
    journal = root / "learner" / "journal.md"
    before = build(root, receipts, FakeClient(noul_rule=recorded_hits))
    assert before["topPitfalls"][0]["occurrences"] == 21
    files_before = len(receipt_files(receipts))

    journal.write_text(
        journal.read_text(encoding="utf-8")
        + "\n### Journal lesson 51 (2026-09-10, project 02)\n\nRepeated the trap.\n",
        encoding="utf-8",
    )

    def hits_plus_new(qid: str) -> float:
        return 0.8 if qid.endswith("__e51") else recorded_hits(qid)

    after = build(root, receipts, FakeClient(noul_rule=hits_plus_new))
    assert after["topPitfalls"][0]["occurrences"] == 22
    # Digest-named receipts: the changed pitfalls sweep adds one file; the
    # unchanged profile sweep overwrites its own, so the count grows by one.
    assert len(receipt_files(receipts)) == files_before + 1

    stayed = build(root, receipts, FakeClient(noul_rule=recorded_hits))
    assert stayed["topPitfalls"][0]["occurrences"] == 21


@pytest.mark.skipif(
    not os.environ.get("TYPESAFE_API_KEY"),
    reason="live smoke requires TYPESAFE_API_KEY",
)
def test_live_smoke_occurrences(tmp_path: Path) -> None:
    """C8: one real-API run over the repo journal yields occurrences >= 15."""
    from learner.substrate.judgments import http_client

    client = http_client(os.environ["TYPESAFE_API_KEY"])
    snap = build_snapshot(
        judgment_client=client,
        judgment_receipts_root=tmp_path / "receipts",
        today=FIXTURE_TODAY,
    )
    assert snap["topPitfalls"][0]["occurrences"] >= 15


# --- S3: profile levels -------------------------------------------------------


def test_profile_choice_overrides(tmp_path: Path) -> None:
    """C9: canned Choices override BOTH axes; no client keeps parser values."""
    root = write_fixture_tree(tmp_path / "src")
    # Both canned values differ from the parser baseline (proficient/analyze)
    # so the override is proven for dreyfus AND bloom, each against a
    # differing deterministic value.
    canned = FakeClient(choices={
        "dreyfus_overall": {"type": "choice", "choice": "competent",
                            "probabilities": {"competent": 0.99}, "confidence": 0.99},
        "bloom_overall": {"type": "choice", "choice": "evaluate",
                          "probabilities": {"evaluate": 0.95}, "confidence": 0.95},
    })
    enriched = build(root, tmp_path / "receipts", canned)
    assert enriched["profile"]["dreyfus"] == "competent"
    assert enriched["profile"]["bloom"] == "evaluate"
    plain = build(root, tmp_path / "r2")
    assert plain["profile"]["dreyfus"] == "proficient"  # parser (golden)
    assert plain["profile"]["bloom"] == "analyze"  # parser (golden)


def test_profile_portuguese_only_cells(tmp_path: Path) -> None:
    """C10: PT-only cells keep the parser default; a judgment reads them."""
    root = write_fixture_tree(tmp_path / "src")
    (root / "learner" / "learner_profile.md").write_text(PT_ONLY_PROFILE_MD, encoding="utf-8")
    plain = build(root, tmp_path / "r1")
    assert plain["profile"]["dreyfus"] == "competent"  # parser default, silent
    pt_choice = {
        "dreyfus_overall": {"type": "choice", "choice": "proficient",
                            "probabilities": {"proficient": 0.9}, "confidence": 0.9},
        "bloom_overall": {"type": "choice", "choice": "analyze",
                          "probabilities": {"analyze": 0.9}, "confidence": 0.9},
    }
    enriched = build(root, tmp_path / "r2", FakeClient(choices=pt_choice))
    assert enriched["profile"]["dreyfus"] == "proficient"


# --- S4: masteredCount --------------------------------------------------------


def test_mastered_count_from_units_log(tmp_path: Path) -> None:
    """C11: masteredCount counts units_log, immune to catalog status edits."""
    root = write_fixture_tree(tmp_path / "src")
    snap = build(root, tmp_path / "receipts")
    assert snap["masteredCount"] == 2  # units_log has 2 mastered units

    catalog = root / "curriculum" / "catalog.md"
    catalog.write_text(
        catalog.read_text(encoding="utf-8").replace("| **Status** | scaffolded |",
                                                    "| **Status** | ✅ Implemented |"),
        encoding="utf-8",
    )
    after = build(root, tmp_path / "r2")
    assert after["masteredCount"] == 2


def test_replay_cached_reuses_recorded_answers(tmp_path: Path) -> None:
    """Replay-by-digest: an identical (state, questions) pair reuses the
    committed receipt and never calls the live client; a changed question
    set misses and falls through."""
    from learner.substrate.judgments import _input_digest, replay_cached

    state = {"known": "x"}
    questions = {"q1": {"type": "noul", "instructions": "i", "criteria": {}}}
    receipts = tmp_path / "receipts"
    receipts.mkdir()
    digest = _input_digest(state, questions)
    line = json.dumps(
        {
            "kind": "noul", "question": "q1", "answer": 0.9,
            "probabilities": None, "model": "jev-latest", "usage": {},
            "input_digest": digest, "timestamp": "2026-09-17T00:00:00Z",
            "status": "ok",
        }
    )
    (receipts / f"pitfalls-{digest[:16]}.ndjson").write_text(line + "\n", encoding="utf-8")

    def explode(s: dict, q: dict) -> dict:
        raise AssertionError("live client must not be called on a replay hit")

    replayed = replay_cached(explode, receipts)
    assert replayed(state, questions) == {"q1": {"type": "noul", "noul": 0.9}}

    other_questions = {"q2": {"type": "noul", "instructions": "i", "criteria": {}}}
    miss = replay_cached(lambda s, q: {"q2": {"type": "noul", "noul": 0.1}}, receipts)
    assert miss(state, other_questions) == {"q2": {"type": "noul", "noul": 0.1}}
