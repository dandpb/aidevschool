import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from validate import load_schema, validate_event

def _schema():
    return load_schema(Path(__file__).resolve().parents[1] / "schema.v1.json")

def test_valid_fixture_passes():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/valid/objective_viewed.json").read_text())
    assert validate_event(ev, _schema()) == []

def test_bad_entry_rejected():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/invalid/bad-entry-enum.json").read_text())
    errs = validate_event(ev, _schema())
    assert any("entry" in e for e in errs)

def test_unknown_type_rejected():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/invalid/unknown-type.json").read_text())
    assert any("unknown event_type" in e for e in validate_event(ev, _schema()))

def _schema_v2():
    import json
    here = Path(__file__).resolve().parents[1]
    return load_schema(here / "schema.v2.json")

def test_v2_optional_fields_accepted():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/valid_v2/objective_viewed_v2.json").read_text())
    assert validate_event(ev, _schema_v2()) == []

def test_v1_events_still_valid_under_v2():
    here = Path(__file__).resolve().parents[1]
    for f in sorted((here / "fixtures/valid").glob("*.json")):
        ev = json.loads(f.read_text())
        assert validate_event(ev, _schema_v2()) == [], f.name

def test_v2_bad_optional_rejected():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/valid_v2/objective_viewed_v2.json").read_text())
    ev["engagement_ms"] = -5
    assert any("engagement_ms" in e for e in validate_event(ev, _schema_v2()))

def _schema_v3():
    import json
    here = Path(__file__).resolve().parents[1]
    return load_schema(here / "schema.v3.json")

def test_v3_fixture_passes():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/valid_v3/attempt_started_v3.json").read_text())
    assert validate_event(ev, _schema_v3()) == []

def test_v3_rejects_old_anon_field():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/valid_v3/attempt_started_v3.json").read_text())
    ev["learner_anon_id"] = ev.pop("subject_anon_id")
    errs = validate_event(ev, _schema_v3())
    assert any("subject_anon_id" in e for e in errs)

def test_v3_rejects_deprecated_heartbeat():
    here = Path(__file__).resolve().parents[1]
    ev = json.loads((here / "fixtures/valid/session_heartbeat.json").read_text())
    ev["subject_anon_id"] = ev.pop("learner_anon_id")
    errs = validate_event(ev, _schema_v3())
    assert any("deprecated" in e or "unknown event_type" in e for e in errs)
