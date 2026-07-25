#!/usr/bin/env python3
"""progress_card.py — §4.2 read-only entry point. Renders plan.json verbatim as
the §7.2 plain-text progress card (~40 lines). The persona MAY prepend one
encouraging sentence but MUST NOT alter any status word, date, or count (law L2).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))

import _core

TRACK_TITLE = "AI Fluency Foundations"
_WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _emit(obj: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


def render_card(plan: dict[str, Any]) -> str:
    counts = plan["counts"]
    total = counts["mastered"] + counts["in_progress"] + counts["review_due"] + counts["remaining"]
    lines = [
        f"Progress · {TRACK_TITLE}",
        f"{counts['mastered']} of {total} mastered · {counts['review_due']} review due · {counts['remaining']} to go",
    ]
    for module in plan["modules"]:
        lines.append(f"{module['module']} · {module['title']}")
        for c in module["concepts"]:
            lines.append(f"{c['concept_id']} {c['title']} — {c['status_word']}")
        lines.append("")  # blank line between modules
    # drop the trailing blank line from the last module
    while lines and lines[-1] == "":
        lines.pop()

    # Next up: in-flight concept, else head of next_available
    titles = {c["concept_id"]: c["title"] for m in plan["modules"] for c in m["concepts"]}
    inflight = next(
        (c["concept_id"] for m in plan["modules"] for c in m["concepts"] if c["status"] in ("IN_PROGRESS", "ATTEMPTED")),
        None,
    )
    nxt = inflight or (plan["next_available"][0] if plan["next_available"] else None)
    if nxt:
        lines.append("")
        lines.append(f"Next up: {nxt} · {titles[nxt]}")

    # Reviews this week
    if plan["due_reviews"]:
        today = _core.parse_iso(plan["generated_at"]).date()
        parts = []
        for r in plan["due_reviews"]:
            due_date = _core.parse_iso(r["due_ts"]).date()
            if due_date == today:
                parts.append(f"{r['concept_id']} today (reply GO)")
            else:
                parts.append(f"{r['concept_id']} {_WEEKDAY[due_date.weekday()]}")
        lines.append(f"Reviews this week: {' · '.join(parts)}")
    return "\n".join(lines)


def main() -> None:
    args = _core.read_args()
    state_dir = Path(_core.require(args, "state_dir"))
    plan_path = state_dir / "plan.json"
    if not plan_path.is_file():
        _core.die("plan.json not found; run plan_recompute.py first", 1)
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    card = render_card(plan)
    _emit({"ok": True, "card_text": card, "counts": plan["counts"]})


if __name__ == "__main__":
    main()
