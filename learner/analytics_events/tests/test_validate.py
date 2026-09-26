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
