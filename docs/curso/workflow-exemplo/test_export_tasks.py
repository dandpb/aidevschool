import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent))

from export_tasks import export_completed_tasks


BASE_DATE = "2026-08-17T12:00:00Z"


def test_exports_only_completed_tasks_owned_by_authenticated_user_in_descending_order():
    tasks = [
        {
            "id": "t-old",
            "owner_id": "ana",
            "status": "completed",
            "title": "Tarefa antiga",
            "completed_at": "2026-08-15T09:00:00Z",
            "priority": "low",
        },
        {
            "id": "t-other",
            "owner_id": "bia",
            "status": "completed",
            "title": "Não pode vazar",
            "completed_at": BASE_DATE,
            "priority": "high",
        },
        {
            "id": "t-pending",
            "owner_id": "ana",
            "status": "pending",
            "title": "Ainda aberta",
            "completed_at": None,
            "priority": "high",
        },
        {
            "id": "t-new",
            "owner_id": "ana",
            "status": "completed",
            "title": "Tarefa nova",
            "completed_at": BASE_DATE,
            "priority": "high",
        },
    ]

    result = export_completed_tasks(tasks, "ana")

    assert result.splitlines() == [
        "id,title,completed_at,priority",
        "t-new,Tarefa nova,2026-08-17T12:00:00Z,high",
        "t-old,Tarefa antiga,2026-08-15T09:00:00Z,low",
    ]


def test_escapes_csv_values_instead_of_concatenating_strings():
    tasks = [
        {
            "id": "t-1",
            "owner_id": "ana",
            "status": "completed",
            "title": 'Revisar, "exportação"\ncom aluno',
            "completed_at": BASE_DATE,
            "priority": "medium",
        }
    ]

    result = export_completed_tasks(tasks, "ana")

    assert '"Revisar, ""exportação""\ncom aluno"' in result


def test_returns_header_for_empty_result():
    assert export_completed_tasks([], "ana") == "id,title,completed_at,priority\n"


def test_rejects_empty_authenticated_user():
    try:
        export_completed_tasks([], "")
    except ValueError as error:
        assert str(error) == "user_id must not be empty"
    else:
        raise AssertionError("expected ValueError")


def test_rejects_completed_task_without_completion_date():
    tasks = [
        {
            "id": "t-1",
            "owner_id": "ana",
            "status": "completed",
            "title": "Sem data",
            "completed_at": "",
            "priority": "low",
        }
    ]

    try:
        export_completed_tasks(tasks, "ana")
    except ValueError as error:
        assert str(error) == "completed task t-1 must have completed_at"
    else:
        raise AssertionError("expected ValueError")
