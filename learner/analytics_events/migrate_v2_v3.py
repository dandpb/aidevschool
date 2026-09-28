"""Migrate v2 event fixtures to v3: rename learner_anon_id -> subject_anon_id,
discard deprecated events with structured notice (never silent)."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

RENAMES = {"learner_anon_id": "subject_anon_id"}

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True); ap.add_argument("--dst", required=True)
    a = ap.parse_args()
    src, dst = Path(a.src), Path(a.dst)
    dst.mkdir(parents=True, exist_ok=True)
    for stale in dst.glob("*.json"):
        stale.unlink()
    schema = json.loads((Path(__file__).parent / "schema.v3.json").read_text(encoding="utf-8"))
    deprecated = set(schema.get("deprecated_events", []))
    migrated = discarded = 0
    for f in sorted(src.glob("*.json")):
        ev = json.loads(f.read_text(encoding="utf-8"))
        if ev.get("event_type") in deprecated:
            discarded += 1
            print(f"discarded: {ev['event_type']} ({f.name})")
            continue
        for old, new in RENAMES.items():
            if old in ev:
                ev[new] = ev.pop(old)
        (dst / f.name).write_text(json.dumps(ev, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        migrated += 1
    print(f"migrated={migrated} discarded={discarded}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
