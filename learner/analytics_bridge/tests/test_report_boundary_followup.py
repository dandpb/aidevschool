"""Provenance and raw-row accounting at the operator report boundary."""

from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys

import pytest

from learner.analytics_bridge.__main__ import build_report
from learner.analytics_bridge.contracts import validate_os_event

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures/synthetic"


def feeds():
    return tuple([json.loads(line) for line in (FIXTURES / name).read_text().splitlines() if line] for name in ("bridge-literacy-v2.ndjson", "bridge-os-v1.ndjson"))


@pytest.mark.parametrize("kind", ["unlabelled", "mixed", "empty"])
def test_report_never_assumes_synthetic_provenance(kind):
    lit, os_rows = feeds()
    if kind == "unlabelled":
        for row in lit + os_rows:
            row.pop("synthetic")
    elif kind == "mixed":
        lit[0].pop("synthetic")
    else:
        lit, os_rows = [], []
    provenance = build_report(lit, os_rows)["data_provenance"]
    assert provenance["synthetic"] is False
    assert "nenhum aprendiz real" not in provenance["label"]


def test_verified_synthetic_labels_keep_the_existing_positive_contract():
    lit, os_rows = feeds()
    assert build_report(lit, os_rows)["data_provenance"]["synthetic"] is True


def test_cli_allow_real_does_not_claim_unlabelled_exports_are_synthetic(tmp_path):
    paths = []
    for name, rows in zip(("literacy", "os"), feeds()):
        path = tmp_path / f"{name}.ndjson"
        path.write_text("".join(json.dumps({key: value for key, value in row.items() if key != "synthetic"}) + "\n" for row in rows))
        paths.append(path)
    result = subprocess.run([sys.executable, "-m", "learner.analytics_bridge", "--literacy", str(paths[0]), "--os", str(paths[1]), "--allow-real"], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data_provenance"]["synthetic"] is False


def test_report_preserves_raw_row_and_duplicate_counts():
    lit, os_rows = feeds()
    lit.append(deepcopy(lit[0]))
    report = build_report(lit, os_rows)
    assert report["pipeline"]["rows_read"] == len(lit) + len(os_rows)
    assert report["pipeline"]["duplicates_removed"] == 1
    assert report["envelope_validation"]["checked"] == report["pipeline"]["rows_read"]


def test_boolean_schema_version_is_rejected_like_the_typescript_emitter():
    _, os_rows = feeds()
    row = deepcopy(os_rows[0])
    row["schemaVersion"] = True
    assert validate_os_event(row)
