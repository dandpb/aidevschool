import csv
import io
from collections.abc import Iterable, Mapping


_COLUMNS = ("id", "title", "completed_at", "priority")


def export_completed_tasks(
    tasks: Iterable[Mapping[str, object]], user_id: str
) -> str:
    """Return the authenticated user's completed tasks as deterministic CSV."""
    if not user_id:
        raise ValueError("user_id must not be empty")

    eligible = []
    for task in tasks:
        if task.get("owner_id") != user_id or task.get("status") != "completed":
            continue

        completed_at = task.get("completed_at")
        if not completed_at:
            task_id = task.get("id", "<unknown>")
            raise ValueError(f"completed task {task_id} must have completed_at")

        eligible.append(task)

    eligible.sort(key=lambda task: str(task["completed_at"]), reverse=True)

    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=_COLUMNS, lineterminator="\n")
    writer.writeheader()
    for task in eligible:
        writer.writerow(
            {
                "id": task.get("id", ""),
                "title": task.get("title", ""),
                "completed_at": task["completed_at"],
                "priority": task.get("priority", "normal"),
            }
        )

    return buffer.getvalue()
