"""Read-only parsers for the human-maintained learner snapshot sources."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

_DREYFUS_KEYWORDS = ("novice", "advanced beginner", "competent", "proficient", "expert")
_BLOOM_LEVELS = ("create", "evaluate", "analyze", "apply", "understand", "remember")


def profile_matrix(learner_profile: Path) -> dict[str, str]:
    """Return the first populated Dreyfus and Bloom cells from the profile matrix."""
    result: dict[str, str] = {"dreyfus": "competent", "bloom": "apply"}
    if not learner_profile.exists():
        return result
    text = learner_profile.read_text(encoding="utf-8")
    for line in text.splitlines():
        if not (
            line.startswith("|")
            and "Dreyfus" not in line
            and "---" not in line
            and "Conceito" not in line
        ):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
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


def pitfalls_from_markdown(pitfalls_path: Path, journal_path: Path) -> list[dict[str, Any]]:
    """Return the five most recent pitfalls with journal-derived occurrence counts."""
    if not pitfalls_path.exists():
        return []
    text = pitfalls_path.read_text(encoding="utf-8")
    pitfalls: list[dict[str, Any]] = []
    pattern = re.compile(r"^##\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+?)$", re.MULTILINE)
    journal_lines = (
        journal_path.read_text(encoding="utf-8").lower().splitlines()
        if journal_path.exists()
        else []
    )
    for match in pattern.finditer(text):
        last_seen, title = match.groups()
        keyword = title.split()[0].lower()
        occurrences = 1 + sum(1 for line in journal_lines if keyword in line)
        pitfalls.append(
            {
                "id": "P-" + str(len(pitfalls) + 1).zfill(3),
                "description": title.strip(),
                "occurrences": min(occurrences, 9),
                "lastSeen": last_seen,
            }
        )
    return pitfalls[:5]


def aidi_trend_from_journal(journal_path: Path) -> list[dict[str, str]]:
    """Return dated AIDI mentions from the journal."""
    if not journal_path.exists():
        return []
    pattern = re.compile(r"(?:AIDI|aidi)[:=]\s*([0-9]+(?:\.[0-9]+)?)")
    date_pattern = re.compile(r"^##\s+\[(\d{4}-\d{2}-\d{2})\]", re.MULTILINE)
    points: list[dict[str, str]] = []
    last_date: str | None = None
    for line in journal_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            date_match = date_pattern.match(line)
            if date_match:
                last_date = date_match.group(1)
        value_match = pattern.search(line)
        if value_match and last_date:
            points.append({"date": last_date, "value": float(value_match.group(1))})
    return points[-30:]


def status_token(cell: str) -> str:
    """Extract the leading status token from a backlog table cell."""
    cell = cell.strip()
    token_match = re.match(r"`([^`]+)`", cell)
    if token_match:
        return token_match.group(1).strip()
    bare_status = cell.strip("`").strip()
    return bare_status.split()[0] if bare_status else ""


def counts_from_backlog(backlog_path: Path) -> tuple[int, int]:
    """Return implemented and scaffolded project counts from the backlog table."""
    if not backlog_path.exists():
        return 0, 0
    implemented = 0
    scaffolded = 0
    for line in backlog_path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) < 3:
            continue
        status = status_token(cells[1])
        if status == "implemented":
            implemented += 1
        elif status == "scaffolded":
            scaffolded += 1
    return implemented, scaffolded
