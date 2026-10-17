"""AID-5009 — deterministic controls for the analytics bridge.

Covers: envelope validation (both engines), dictionary funnel derivations,
NC-1..NC-8, retention windows, and the fail-closed canonical projection
gated by learner/analytics_events/validate.py (schema v3).

Run: python3 -m pytest learner/analytics_bridge/tests/ -q
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from learner.analytics_bridge import BRIDGE_VERSION
from learner.analytics_bridge import __main__ as bridge_cli
from learner.analytics_bridge.canonical import (
    _schema_v3,
    first_os_gap,
    mapping_matrix,
    project_event,
    project_stream,
    unmapped_emitters,
)
from learner.analytics_bridge.contracts import (
    detect_stream,
    validate_event,
    validate_literacy_event,
    validate_os_event,
)
from learner.analytics_bridge.funnel import compute_funnel, dedup, rate
from learner.analytics_bridge.retention import (
    compute_literacy_retention,
    compute_os_retention,
)

HERE = Path(__file__).resolve().parent
FIXTURES = HERE.parent / "fixtures" / "synthetic"
CANONICAL_V3 = _schema_v3()


def _load(name: str) -> list[dict]:
    return [
        json.loads(line)
        for line in (FIXTURES / name).read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


@pytest.fixture(scope="module")
def lit() -> list[dict]:
    return _load("bridge-literacy-v2.ndjson")


@pytest.fixture(scope="module")
def osv() -> list[dict]:
    return _load("bridge-os-v1.ndjson")


@pytest.fixture(scope="module")
def report(lit, osv) -> dict:
    return bridge_cli.build_report(lit, osv)


# ── envelope validation ──────────────────────────────────────────────────


def test_fixture_envelopes_are_all_valid(lit, osv):
    assert bridge_cli.validate_stream(lit, "literacy") == []
    assert bridge_cli.validate_stream(osv, "os") == []


def test_detect_stream(lit, osv):
    assert detect_stream(lit[0]) == "literacy"
    assert detect_stream(osv[0]) == "os"
    assert detect_stream({"foo": 1}) is None
    assert validate_event({"foo": 1}) != []


def test_literacy_rejects_extra_prop(lit):
    bad = dict(lit[3], props={"lessonId": "l01", "activityType": "choice", "activityIndex": 0, "note": "x"})
    assert any("not allowed" in e for e in validate_literacy_event(bad))


def test_literacy_rejects_bad_activity_type(lit):
    bad = dict(lit[4], props={"lessonId": "l01", "activityType": "essay", "passed": True})
    assert any("activityType" in e for e in validate_literacy_event(bad))


def test_literacy_rejects_wrong_schema_version(lit):
    assert any("schemaVersion" in e for e in validate_literacy_event(dict(lit[0], schemaVersion=3)))


def test_literacy_rejects_non_uuid_session(lit):
    bad = dict(lit[0], sessionId="not-a-uuid")
    assert any("sessionId" in e for e in validate_literacy_event(bad))


def test_literacy_rejects_bad_entry_route(lit):
    bad = dict(lit[0], props={"entry": "deep-link"})
    assert any("entry" in e for e in validate_literacy_event(bad))


def test_os_rejects_missing_installation(osv):
    dims = dict(osv[0]["dimensions"])
    dims.pop("installationId")
    bad = dict(osv[0], dimensions=dims)
    assert any("installationId" in e for e in validate_os_event(bad))


def test_os_rejects_zero_sequence(osv):
    assert any("sequence" in e for e in validate_os_event(dict(osv[0], sequence=0)))


def test_os_rejects_bad_track_id(osv):
    dims = dict(osv[0]["dimensions"], trackId="tiktok")
    assert any("trackId" in e for e in validate_os_event(dict(osv[0], dimensions=dims)))


def test_os_rejects_unknown_event(osv):
    assert any("vocabulary" in e for e in validate_os_event(dict(osv[0], name="mission.deleted")))


def test_os_rejects_dimension_out_of_policy(osv):
    dims = dict(osv[0]["dimensions"], score=99)
    assert any("not allowed" in e for e in validate_os_event(dict(osv[0], dimensions=dims)))


# ── NC controls over the funnel ──────────────────────────────────────────


def test_nc1_dedup_eventid(lit):
    kept, dup = dedup(lit + [lit[0]], "literacy")
    assert dup == 1 and len(kept) == len(lit)


def test_nc2_sessions_not_people(report):
    # 3 page loads = 3 sessões; o relatório nunca emite "aprendizes".
    assert report["funnel"]["literacy"]["sessions_total"] == 3
    assert not any("aprendiz" in k or "learner" in k for k in report["funnel"]["literacy"])


def test_nc3_retry_is_not_new_completion(report):
    f = report["funnel"]["literacy"]
    assert f["retry_session_lesson_pairs"] == 1  # (S1, l01): 2 tentativas
    assert f["funnel_counts"]["licao_concluida"] == 1  # só o evento explícito


def test_nc4_error_only_adds_error_counter(report):
    f = report["funnel"]["literacy"]
    assert f["attempts_failed_deterministic"] == 1
    assert f["attempts_total"] == 3
    assert f["funnel_counts"]["tentativa"] == 2  # sessões com >=1 tentativa


def test_nc5_suppression_below_k(report):
    f = report["funnel"]["literacy"]
    assert f["attempt_error_rate"] == {"value": "suppressed", "n": 3, "k": 5}
    assert f["resume_rate"]["value"] == "suppressed"
    assert rate(1, 4)["value"] == "suppressed"
    assert rate(2, 5) == {"value": 0.4, "n": 2, "den": 5}


def test_nc8_absence_is_not_zero(report):
    f = report["funnel"]["os"]
    assert f["feedback_negative_not_observable"] == "not_measured"
    assert report["funnel"]["literacy"]["retention"] == "not_measured"


def test_nc6_no_forbidden_term(report):
    blob = json.dumps(report, ensure_ascii=False).lower()
    assert "mastered" not in blob


def test_nc7_unlabelled_line_refused(tmp_path):
    feed = tmp_path / "real.ndjson"
    feed.write_text(json.dumps({"eventId": "x"}) + "\n", encoding="utf-8")
    with pytest.raises(SystemExit):
        bridge_cli.load_feed(feed, require_synthetic=True)


# ── funnel numbers (baseline honesto) ────────────────────────────────────


def test_literacy_funnel_counts(report):
    assert report["funnel"]["literacy"]["funnel_counts"] == {
        "entrada": 3,
        "brief": 1,
        "licao_iniciada": 1,
        "primeira_atividade_exposta": 1,
        "tentativa": 2,
        "licao_concluida": 1,
    }
    assert report["funnel"]["literacy"]["entry_split"] == {"home": 1, "lesson-resume": 1}
    assert report["funnel"]["literacy"]["entry_pre_v4_without_prop"] == 1


def test_os_funnel_numbers(report):
    os_ = report["funnel"]["os"]
    assert os_["installations"] == 6
    assert os_["onboarding_started"] == 6
    assert os_["onboarding_completed"] == 2
    assert os_["onboarding_completion_rate"] == {"value": 0.3333, "n": 2, "den": 6}
    assert os_["attempts_submitted"] == 3
    assert os_["feedback_observable_passed"] == 1
    assert os_["attempts_error_proxy"] == 2
    assert os_["retry_requested"] == 1
    assert os_["missions_completed"] == 1


def test_os_retention_windows(report):
    ret = report["retention"]["os"]
    assert ret["subject_id"] == "installationId"
    assert ret["retention_cross_day"] == 1
    assert ret["retention_cross_day_rate"] == {"value": 0.1667, "n": 1, "den": 6}
    assert ret["windows"]["r1"]["installations"] == 1
    assert ret["windows"]["r7"]["installations"] == 1
    assert ret["windows"]["r21"]["installations"] == 1


def test_literacy_retention_not_measured_g8(report):
    ret = report["retention"]["literacy"]
    assert ret["value"] == "not_measured" and "G8" in ret["reason"]
    assert compute_literacy_retention([])["value"] == "not_measured"


def test_empty_streams_are_honest_zeros():
    empty = compute_funnel([], [])
    assert empty["literacy"]["sessions_total"] == 0
    assert empty["literacy"]["attempt_error_rate"]["value"] == "suppressed"
    assert empty["os"]["installations"] == 0
    assert compute_os_retention([])["retention_cross_day"] == 0


# ── canonical projection (schema v3 gate) ────────────────────────────────


def test_literacy_attempt_projects_and_passes_canonical_gate(lit):
    attempt = next(e for e in lit if e["event"] == "activity_attempted")
    projected, gap = project_event(attempt, "literacy", CANONICAL_V3)
    assert gap is None and projected is not None
    assert validate_event is not None
    # Gate real: o validador canônico do PR #621 aprova o registro.
    sys.path.insert(0, str(HERE.parent.parent / "analytics_events"))
    try:
        from validate import validate_event as canonical_validate_event  # noqa: WPS433

        assert canonical_validate_event(projected, CANONICAL_V3) == []
    finally:
        sys.path.pop(0)
    assert projected["payload"] == {
        "objective_id": "l01",
        "attempt_id": attempt["eventId"],
        "mode": "practice",
    }
    assert projected["subject_anon_id"] == attempt["sessionId"]
    assert projected["dojo"] == "literacyDojo"
    assert projected["module"] == "literacy-dojo"


def test_literacy_stream_projection_count(lit):
    outcome = project_stream(lit, "literacy")
    attempts = [e for e in lit if e["event"] == "activity_attempted"]
    assert len(outcome["projected"]) == len(attempts) == 3
    entry_gaps = {s["gap"] for s in outcome["skipped"]}
    assert "objective-id-not-emitted" in entry_gaps


def test_os_stream_never_projects(osv):
    outcome = project_stream(osv, "os")
    assert outcome["projected"] == []
    gaps = {s["gap"] for s in outcome["skipped"]}
    assert "mode-vocabulary-mismatch" in gaps
    assert "objective-id-not-emitted" in gaps
    assert first_os_gap({"name": "structured_attempt.submitted"}) == "mode-vocabulary-mismatch"


def test_non_uuid4_event_id_skips_not_rewrites(lit):
    attempt = dict(next(e for e in lit if e["event"] == "activity_attempted"))
    attempt["eventId"] = "custom-opaque-id"
    projected, gap = project_event(attempt, "literacy", CANONICAL_V3)
    assert projected is None and gap == "event-id-not-canonical-uuid4"


def test_mapping_matrix_is_pinned():
    matrix = {row["canonical_event"]: row for row in mapping_matrix()}
    assert set(matrix) == {
        "objective_viewed", "attempt_started", "attempt_feedback_shown",
        "evidence_recorded", "export_consented",
    }
    assert matrix["attempt_started"]["literacy"]["status"] == "mappable"
    assert matrix["attempt_started"]["os"]["status"] == "gap"
    assert "latency-not-emitted" in matrix["attempt_feedback_shown"]["literacy"]["gap_codes"]
    assert "evidence-channel-separate" in matrix["evidence_recorded"]["os"]["gap_codes"]
    unmapped = unmapped_emitters()
    assert "lesson_completed" in unmapped["literacy"]
    assert "mission.completed" in unmapped["os"]
    assert "activity_attempted" not in unmapped["literacy"]


def test_matrix_matches_projection_behavior(lit, osv):
    """Matrix and behavior must agree: the mappable cell really projects,
    every gap cell really skips."""
    matrix = {row["canonical_event"]: row for row in mapping_matrix()}
    attempt = next(e for e in lit if e["event"] == "activity_attempted")
    projected, gap = project_event(attempt, "literacy", CANONICAL_V3)
    mappable = matrix["attempt_started"]["literacy"]["status"] == "mappable"
    assert mappable == (projected is not None and gap is None)


# ── end-to-end CLI ───────────────────────────────────────────────────────


def test_cli_end_to_end(tmp_path, lit, osv):
    out = tmp_path / "bridge.json"
    rc = bridge_cli.main(
        [
            "--literacy", str(FIXTURES / "bridge-literacy-v2.ndjson"),
            "--os", str(FIXTURES / "bridge-os-v1.ndjson"),
            "--out-json", str(out),
        ]
    )
    assert rc == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["bridge_version"] == BRIDGE_VERSION
    assert data["pipeline"]["events_accepted"] == len(lit) + len(osv)
    assert data["envelope_validation"]["violations"] == 0
    assert data["canonical"]["projected_literacy"] == 3
    assert data["canonical"]["projected_os"] == 0
    assert data["retention"]["os"]["windows"]["r1"]["installations"] == 1
    assert "mastered" not in out.read_text(encoding="utf-8").lower()


def test_cli_rejects_invalid_envelope(tmp_path, lit):
    bad = tmp_path / "bad.ndjson"
    broken = dict(lit[0], event="evento_desconhecido")
    bad.write_text(json.dumps(broken) + "\n", encoding="utf-8")
    with pytest.raises(SystemExit):
        bridge_cli.main(
            [
                "--literacy", str(bad),
                "--os", str(FIXTURES / "bridge-os-v1.ndjson"),
                "--out-json", str(tmp_path / "out.json"),
            ]
        )
