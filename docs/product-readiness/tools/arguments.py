from __future__ import annotations

import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path


def aggregate_arguments(
    arguments: list[str], repo_root: Path
) -> tuple[tuple[Path, ...], tuple[Path, ...], Path, str, str, str] | None:
    if arguments[:1] != ["aggregate"] or "--reports" not in arguments or "--output" not in arguments:
        return None
    reports_start = arguments.index("--reports") + 1
    output_start = arguments.index("--output")
    if reports_start >= output_start:
        return None
    observations_start = arguments.index("--observations") if "--observations" in arguments else None
    reports_end = output_start if observations_start is None else observations_start
    directories = tuple(Path(value) for value in arguments[reports_start:reports_end])
    observation_directories = (
        ()
        if observations_start is None
        else tuple(Path(value) for value in arguments[observations_start + 1 : output_start])
    )
    if not directories or output_start + 1 >= len(arguments):
        return None
    output = Path(arguments[output_start + 1])
    options = arguments[output_start + 2 :]
    values: dict[str, str] = {}
    index = 0
    while index < len(options):
        option = options[index]
        if option not in {"--assessment-id", "--verified-at", "--revalidate-by"}:
            return None
        if index + 1 >= len(options):
            return None
        values[option] = options[index + 1]
        index += 2
    now = datetime.now(UTC).replace(microsecond=0)
    checkout = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, capture_output=True, text=True
    ).stdout.strip()
    return (
        directories,
        observation_directories,
        output,
        values.get("--assessment-id", f"{now.date().isoformat()}-{checkout[:8]}-candidate"),
        values.get("--verified-at", now.isoformat().replace("+00:00", "Z")),
        values.get("--revalidate-by", (now.date() + timedelta(days=30)).isoformat()),
    )
