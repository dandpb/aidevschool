"""CLI for the AID-5009 bridge.

Reads NDJSON feeds of engine-emitted events (synthetic fixtures or operator
exports), envelope-validates every line, computes the dictionary funnel and
retention, projects the canonical subset, and writes one JSON report.

Usage:
    python3 -m learner.analytics_bridge \
        --literacy learner/analytics_bridge/fixtures/synthetic/bridge-literacy-v2.ndjson \
        --os learner/analytics_bridge/fixtures/synthetic/bridge-os-v1.ndjson \
        [--out-json /tmp/bridge.json]

Exit codes: 0 ok; 2 control failure (unreadable input, unlabelled real data
under fixtures/, envelope violations, forbidden term in output).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import BRIDGE_VERSION
from .canonical import SUBJECT_ID_SCOPES, mapping_matrix, project_stream, unmapped_emitters
from .contracts import detect_stream
from .funnel import compute_funnel, dedup, validate_stream
from .retention import compute_literacy_retention, compute_os_retention

FORBIDDEN = ("mastered",)  # ADR-0009 — analytics never emits competence
SYNTHETIC_LABEL = "synthetic"


def die(msg: str) -> None:
    print(f"analytics_bridge: FALHA de controle: {msg}", file=sys.stderr)
    raise SystemExit(2)


def load_feed(path: Path, require_synthetic: bool) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as exc:
                die(f"{path.name}:{lineno} NDJSON ilegível: {exc}")
            if require_synthetic and rec.get(SYNTHETIC_LABEL) is not True:
                die(f"{path.name}:{lineno} sem rótulo synthetic:true — recusa (NC-7)")
            if detect_stream(rec) is None:
                die(f"{path.name}:{lineno} não parece evento literacy v2 nem OS v1")
            rows.append(rec)
    return rows


def guard_no_forbidden(obj) -> None:
    """NC-6: no output ever contains a forbidden competence term."""
    blob = json.dumps(obj, ensure_ascii=False).lower()
    for term in FORBIDDEN:
        if term in blob:
            die(f"saída contém termo proibido {term!r} (ADR-0009)")


def data_provenance(rows: list[dict]) -> dict:
    labelled = sum(row.get(SYNTHETIC_LABEL) is True for row in rows)
    synthetic = bool(rows) and labelled == len(rows)
    label = (
        "FIXTURES SINTÉTICAS — nenhum aprendiz real; nenhuma exportação de produção"
        if synthetic else
        "FEEDS DO OPERADOR — origem sintética não comprovada; "
        "não inferir presença de aprendizes reais"
    )
    return {
        "synthetic": synthetic,
        "label": label,
        "rows": len(rows),
        "synthetic_labelled_rows": labelled,
        "subject_id_scopes": SUBJECT_ID_SCOPES,
    }


def build_report(lit_rows: list[dict], os_rows: list[dict]) -> dict:
    envelope_errors = validate_stream(lit_rows, "literacy") + validate_stream(os_rows, "os")
    if envelope_errors:
        die("envelopes inválidos:\n  " + "\n  ".join(envelope_errors[:20]))

    lit, _ = dedup(lit_rows, "literacy")
    os_, _ = dedup(os_rows, "os")

    funnel = compute_funnel(lit_rows, os_rows)
    projection_lit = project_stream(lit, "literacy")
    projection_os = project_stream(os_, "os")

    return {
        "bridge_version": BRIDGE_VERSION,
        "data_provenance": data_provenance(lit_rows + os_rows),
        "pipeline": funnel["pipeline"],
        "envelope_validation": {"checked": len(lit_rows) + len(os_rows), "violations": 0},
        "funnel": {"literacy": funnel["literacy"], "os": funnel["os"]},
        "retention": {
            "os": compute_os_retention(os_),
            "literacy": compute_literacy_retention(lit),
        },
        "canonical": {
            "schema": "learner/analytics_events/schema.v3.json",
            "gated_by": "learner/analytics_events/validate.py::validate_event",
            "projected_literacy": len(projection_lit["projected"]),
            "projected_os": len(projection_os["projected"]),
            "skipped_literacy": projection_lit["skipped"],
            "skipped_os": projection_os["skipped"],
            "mapping_matrix": mapping_matrix(),
            "unmapped_emitters": unmapped_emitters(),
            "projected_events": projection_lit["projected"] + projection_os["projected"],
        },
        "not_measured": {
            "retention_literacy_standalone": "G8: sessionId efêmero (sem identificador cross-dia)",
            "feedback_shown": "TF-1: feedback_shown fora dos vocabulários dos dois envelopes",
            "os_attempt_level_verdict": "TF-3: OS v1 sem attempt_id (veredito por co-ocorrência)",
        },
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="learner.analytics_bridge")
    ap.add_argument("--literacy", required=True, type=Path)
    ap.add_argument("--os", required=True, type=Path, dest="os_feed")
    ap.add_argument("--out-json", type=Path)
    ap.add_argument("--allow-real", action="store_true",
                    help="operator switch: feeds sem rótulo synthetic (export real)")
    args = ap.parse_args(argv)

    lit_rows = load_feed(args.literacy, require_synthetic=not args.allow_real)
    os_rows = load_feed(args.os_feed, require_synthetic=not args.allow_real)

    report = build_report(lit_rows, os_rows)
    guard_no_forbidden(report)

    blob = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.out_json:
        args.out_json.write_text(blob, encoding="utf-8")
    else:
        print(blob)
    return 0


if __name__ == "__main__":
    sys.exit(main())
