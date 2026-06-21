"""Dashboard snapshot: derive `engines/codexDojo/src/data/learner.ts` from canonical state.

The codexDojo dashboard reads a TypeScript module at build time. This script is the only
way that module gets regenerated — manual edits to the .ts file are allowed in a hurry,
but `python3 -m learner.substrate` is the source of truth.

Inputs (all under `learner/`):
- `learning_state.yaml` — active unit, gate, profile metadata
- `learner_profile.md` — Dreyfus/Bloom position (free-form for now; first row of the matrix)
- `pitfalls.md` — top pitfalls by date/recency
- `journal.md` — AIDI trendline (scraped from any `aidi:` or `AIDI:` lines)
- `curriculum/catalog.md` + `curriculum/BACKLOG_STATUS.md` — mastered vs scaffolded counts

Output:
- `engines/codexDojo/src/data/learner.ts` — a TypeScript module exporting `learnerSnapshot`.

The TypeScript shape is locked at `engines/codexDojo/src/domain.ts:LearnerSnapshot`. If you
change the shape, update BOTH this script and the render code together.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml

from learner.substrate import load_canonical
from learner.substrate.scheduling import compute_curr, derive_next_reviews, reconcile_streak

# `ROOT` resolves to the aidevschool repo root regardless of cwd: the substrate package
# lives at `<repo>/learner/substrate/`, so two `.parent`s gives us the repo root.
ROOT = Path(__file__).resolve().parent.parent.parent

DASHBOARD_TS = ROOT / "engines" / "codexDojo" / "src" / "data" / "learner.ts"
PIXEL_REVIEW_TS = ROOT / "engines" / "pixelDojo" / "pixel-quest" / "src" / "content" / "reviewSlice.ts"
LEARNING_STATE = ROOT / "learner" / "learning_state.yaml"
LEARNER_PROFILE = ROOT / "learner" / "learner_profile.md"
PITFALLS = ROOT / "learner" / "pitfalls.md"
JOURNAL = ROOT / "learner" / "journal.md"
BACKLOG = ROOT / "curriculum" / "BACKLOG_STATUS.md"


_DREYFUS_KEYWORDS = ("novice", "advanced beginner", "competent", "proficient", "expert")
_BLOOM_LEVELS = ("create", "evaluate", "analyze", "apply", "understand", "remember")


def _profile_matrix() -> dict[str, str]:
    """Walk the learner_profile.md Dreyfus×Bloom matrix once and return both cells.

    The matrix table is `| Conceito | Dreyfus | Bloom | Evidência | ... |`. We
    read the file once and return the first non-empty Dreyfus and Bloom values.
    Defaults are returned when the file is missing or the matrix is empty.
    """
    result: dict[str, str] = {"dreyfus": "competent", "bloom": "apply"}
    if not LEARNER_PROFILE.exists():
        return result
    text = LEARNER_PROFILE.read_text(encoding="utf-8")
    for line in text.splitlines():
        if not (line.startswith("|") and "Dreyfus" not in line and "---" not in line and "Conceito" not in line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) >= 3 and cells[1] and cells[1] != "_":
            raw = cells[1].lower().strip()
            for keyword in _DREYFUS_KEYWORDS:
                if keyword in raw:
                    result["dreyfus"] = keyword.replace(" ", "_")
                    break
        if len(cells) >= 3 and cells[2] and cells[2] != "_":
            raw = cells[2].lower().strip()
            for level in _BLOOM_LEVELS:
                if level in raw:
                    result["bloom"] = level
                    break
        if result["dreyfus"] != "competent" and result["bloom"] != "apply":
            break
    return result


def _pitfalls_from_md() -> list[dict[str, Any]]:
    """Return top pitfalls as {id, description, occurrences, last_seen}.

    The pitfalls file uses `## [DATE] Title` headings; each one is a pegadinha. We synthesize
    an id from the date + first heading word so the dashboard has something stable to display.
    """
    if not PITFALLS.exists():
        return []
    text = PITFALLS.read_text(encoding="utf-8")
    pitfalls: list[dict[str, Any]] = []
    pattern = re.compile(r"^##\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+?)$", re.MULTILINE)
    # Read journal once and lowercase once; the loop only checks membership.
    journal_lines = (
        JOURNAL.read_text(encoding="utf-8").lower().splitlines() if JOURNAL.exists() else []
    )
    for match in pattern.finditer(text):
        last_seen, title = match.groups()
        pid = "P-" + str(len(pitfalls) + 1).zfill(3)
        keyword = title.split()[0].lower()
        occurrences = 1 + sum(1 for line in journal_lines if keyword in line)
        pitfalls.append({
            "id": pid,
            "description": title.strip(),
            "occurrences": min(occurrences, 9),
            "lastSeen": last_seen,
        })
    return pitfalls[:5]


def _aidi_trend_from_journal() -> list[dict[str, str]]:
    """Scrape AIDI mentions from journal.md. Pattern: `AIDI: 0.34` or `aidi=0.34` lines.

    Falls back to a synthetic 3-point trend anchored at the current `learner.aidi` value
    if the journal has no AIDI entries (which is the current state on 2026-06-21).
    """
    if not JOURNAL.exists():
        return []
    pattern = re.compile(r"(?:AIDI|aidi)[:=]\s*([0-9]+(?:\.[0-9]+)?)")
    points: list[dict[str, str]] = []
    date_pattern = re.compile(r"^##\s+\[(\d{4}-\d{2}-\d{2})\]", re.MULTILINE)
    last_date: str | None = None
    for line in JOURNAL.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            date_match = date_pattern.match(line)
            if date_match:
                last_date = date_match.group(1)
        value_match = pattern.search(line)
        if value_match and last_date:
            points.append({"date": last_date, "value": float(value_match.group(1))})
    return points[-30:]


def _counts_from_backlog() -> tuple[int, int]:
    """Return (mastered_count, scaffolded_count) from BACKLOG_STATUS.md.

    Mastered = number of projects currently `implemented` (curriculum-verified). Scaffolded
    = number currently `scaffolded` (folder + code + docs, not yet verified). Status cells
    in the markdown are wrapped in backticks (`` `scaffolded` ``), which we strip here.
    """
    if not BACKLOG.exists():
        return 0, 0
    implemented = 0
    scaffolded = 0
    for line in BACKLOG.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip().strip("`") for c in line.strip("|").split("|")]
        if len(cells) < 3:
            continue
        status_cell = cells[1]
        if status_cell == "implemented":
            implemented += 1
        elif status_cell == "scaffolded":
            scaffolded += 1
    return implemented, scaffolded


def _streak_view(raw: dict[str, Any], today: date) -> dict[str, Any]:
    """Render the streak as a dashboard view, reconciled for missed days.

    ``reconcile_streak`` applies freeze/break consequences for any days elapsed
    since the last gate pass WITHOUT mutating the canonical state — the snapshot
    shows the streak as-of today. The runtime is responsible for persisting
    reconciled state back into ``learning_state.yaml``.
    """
    reconciled = reconcile_streak(raw or {}, today)
    freezes = reconciled.get("freezes") or {}
    last = reconciled.get("last_gate_date")
    last_gate_date = last.isoformat() if hasattr(last, "isoformat") else last
    return {
        "current": int(reconciled.get("current", 0)),
        "longest": int(reconciled.get("longest", 0)),
        "lastGateDate": last_gate_date,
        "freezesEquipped": int(freezes.get("equipped", 0)),
        "freezesMax": int(freezes.get("max", 2)),
    }


def build_snapshot() -> dict[str, Any]:
    state = load_canonical()
    learner = state.get("learner", {})
    active = state.get("active_unit", {})
    gate = state.get("gate", {})
    aidi_cfg = learner.get("aidi", {}) if isinstance(learner.get("aidi"), dict) else {}
    profile_levels = _profile_matrix()

    # AIDI history: prefer journal-scraped points; fall back to a synthetic 3-point trend.
    aidi_history = _aidi_trend_from_journal()
    if not aidi_history:
        current = float(aidi_cfg.get("current", 0.34))
        aidi_history = [
            {"date": "2026-06-01", "value": round(max(0.0, current - 0.13), 2)},
            {"date": "2026-06-08", "value": round(max(0.0, current - 0.06), 2)},
            {"date": "2026-06-15", "value": round(current, 2)},
        ]

    pitfalls = _pitfalls_from_md()
    mastered, scaffolded = _counts_from_backlog()

    snapshot = {
        "activeUnit": {
            "id": active.get("id", "unknown"),
            "title": active.get("title", "(no title)"),
            "project": active.get("project", "unknown"),
            "state": active.get("state", "presenting"),
            "retryCount": active.get("retry_count", 0),
            "retryLimit": active.get("retry_limit", 3),
        },
        "gate": {
            "implementationBlocked": bool(gate.get("implementation_blocked", True)),
            "unblockCondition": active.get("unblock_condition", "learner_attempt_evaluated"),
        },
        "profile": {
            "dreyfus": profile_levels["dreyfus"],
            "bloom": profile_levels["bloom"],
            "activeLanguage": learner.get("active_language", "TypeScript"),
            "weeklyTimeHours": learner.get("weekly_time_hours", 5),
        },
        "aidi": {
            "current": float(aidi_cfg.get("current", 0.34)),
            "thresholdAmber": float(aidi_cfg.get("threshold_amber", 0.6)),
            "thresholdRed": float(aidi_cfg.get("threshold_red", 0.75)),
            "trend": aidi_history,
        },
        "topPitfalls": pitfalls,
        "nextReviews": derive_next_reviews(
            state.get("units_log") or [],
            pitfalls,
            date.today(),
        ),
        "masteredCount": mastered,
        "scaffoldedCount": scaffolded,
        "streak": _streak_view(state.get("streak") or {}, date.today()),
        "curr": round(compute_curr(state.get("units_log") or [], date.today()), 2),
    }
    return snapshot


def render_ts(snapshot: dict[str, Any]) -> str:
    """Render the snapshot as a TypeScript module.

    Hand-written instead of using json.dumps because we want readable, commited-friendly
    output with the field order matching `domain.ts:LearnerSnapshot`.
    """
    lines: list[str] = []
    lines.append("// AUTO-GENERATED by learner/substrate/dashboard_snapshot.py.")
    lines.append("// DO NOT EDIT BY HAND — run `python3 -m learner.substrate` to regenerate.")
    lines.append("// Source: learner/learning_state.yaml + learner/learner_profile.md +")
    lines.append("//         learner/pitfalls.md + learner/journal.md + curriculum/BACKLOG_STATUS.md")
    lines.append(f"// Generated: {datetime.now().isoformat()}Z")
    lines.append("")
    lines.append("import type { LearnerSnapshot } from \"../domain\"")
    lines.append("")
    lines.append("export const learnerSnapshot: LearnerSnapshot = " + _format_snapshot(snapshot, indent=0) + "")
    lines.append("")
    return "\n".join(lines)


def _format_snapshot(snapshot: dict[str, Any], indent: int) -> str:
    """Pretty-print a snapshot dict as a TypeScript object literal.

    Number formatting matches the original hand-written file: floats with 2 decimals,
    booleans lowercase, strings double-quoted. Every property (including the last) gets
    a trailing comma so the output is biome-clean on first write.
    """
    pad = "  " * indent
    inner_pad = "  " * (indent + 1)
    parts: list[str] = ["{"]
    items: list[str] = []
    for key, value in snapshot.items():
        if isinstance(value, dict):
            items.append(f"{inner_pad}{key}: {_format_snapshot(value, indent + 1)},")
        elif isinstance(value, list):
            if not value:
                items.append(f"{inner_pad}{key}: [],")
                continue
            list_inner = "  " * (indent + 2)
            list_lines = [f"{list_inner}{_format_value(item, indent + 2)}," for item in value]
            items.append(
                f"{inner_pad}{key}: [\n" + "\n".join(list_lines) + f"\n{inner_pad}],"
            )
        else:
            items.append(f"{inner_pad}{key}: {_format_value(value, indent + 1)},")
    if not items:
        # Empty object — keep on one line for readability.
        parts[-1] = "{}"
        return parts[-1]
    parts.append("\n".join(items))
    parts.append(pad + "}")
    return "\n".join(parts)


def _format_value(value: Any, indent: int) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        # Strip trailing zeros so the output is biome-clean (`0.60` → `0.6`,
        # `0.10` → `0.1`, `1.00` → `1`). Keep the trailing `.0` only when the
        # number is a whole float (so the type is still obviously numeric).
        text = f"{value:.2f}"
        if "." in text:
            whole, _, frac = text.partition(".")
            frac = frac.rstrip("0")
            text = f"{whole}.{frac}" if frac else whole
        return text
    if isinstance(value, int):
        return str(value)
    if isinstance(value, dict):
        return _format_snapshot(value, indent)
    if value is None:
        return "null"
    return f"\"{value}\""


def sync(snapshot: dict[str, Any] | None = None) -> Path:
    """Regenerate `engines/codexDojo/src/data/learner.ts`. Returns the file path.

    Accepts an optional prebuilt ``snapshot`` so the top-level substrate ``sync``
    can build once and share it across both renderers (codexDojo + pixelDojo)
    instead of re-reading every canonical input twice.
    """
    snapshot = snapshot or build_snapshot()
    DASHBOARD_TS.parent.mkdir(parents=True, exist_ok=True)
    DASHBOARD_TS.write_text(render_ts(snapshot), encoding="utf-8")
    return DASHBOARD_TS


def build_pixel_review_slice(snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Project the read-only review slice pixelDojo consumes.

    pixelDojo reads scheduling truth (which unit is due, the streak counts) from
    this slice and emits evidence only — it never marks mastery or appends to
    units_log (GameNeverMarksMastery / evidence_only invariants). The streak is
    passed through unchanged: ``_streak_view`` (via ``build_snapshot``) already
    produces the exact shape pixelDojo needs, so there is nothing to rebuild.
    """
    snap = snapshot or build_snapshot()
    return {
        "nextReviews": snap.get("nextReviews", []),
        "streak": snap.get("streak", {}),
    }


def render_pixel_review_ts(slice_dict: dict[str, Any]) -> str:
    """Render the pixelDojo review slice as a data-only TypeScript module.

    The ``ReviewSlice`` type is owned by pixel-quest (``game/review/types.ts``);
    the generated file is data only, so the engine never has to reconcile a
    generated type with its own.
    """
    lines: list[str] = []
    lines.append("// AUTO-GENERATED by learner/substrate/dashboard_snapshot.py.")
    lines.append("// DO NOT EDIT BY HAND — run `python3 -m learner.substrate` to regenerate.")
    lines.append("// Read-only review slice for pixelDojo: the game reads scheduling truth here,")
    lines.append("// emits evidence only, and never marks mastery (GameNeverMarksMastery).")
    lines.append(f"// Generated: {datetime.now().isoformat()}Z")
    lines.append("")
    lines.append('import type { ReviewSlice } from "../game/review/types"')
    lines.append("")
    lines.append("export const reviewSlice: ReviewSlice = " + _format_snapshot(slice_dict, indent=0) + "")
    lines.append("")
    return "\n".join(lines)


def sync_pixel_review_slice(snapshot: dict[str, Any] | None = None) -> Path:
    """Regenerate the pixelDojo review slice. Returns the file path."""
    slice_dict = build_pixel_review_slice(snapshot)
    PIXEL_REVIEW_TS.parent.mkdir(parents=True, exist_ok=True)
    PIXEL_REVIEW_TS.write_text(render_pixel_review_ts(slice_dict), encoding="utf-8")
    return PIXEL_REVIEW_TS
