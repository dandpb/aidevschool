from __future__ import annotations

from collections.abc import Callable
from typing import Final, assert_never

from .contracts import Cycle, Handler, LessonRecord
from .handlers.config import patch_json_config
from .handlers.planning import plan_safe_renames, plan_task_dependencies
from .handlers.reliability import build_retry_schedule, snapshot_ttl_cache
from .handlers.review import check_unified_diff, summarize_access_log
from .handlers.safety import migrate_records_v1_v2, scan_synthetic_secrets
from .handlers.structured import filter_logs


ArtifactHandler = Callable[[Cycle, tuple[LessonRecord, ...]], bytes]
HANDLERS: Final[dict[Handler, ArtifactHandler]] = {
    Handler.FILTER_NDJSON: filter_logs,
    Handler.PATCH_JSON_CONFIG: patch_json_config,
    Handler.BUILD_RETRY_SCHEDULE: build_retry_schedule,
    Handler.SNAPSHOT_TTL_CACHE: snapshot_ttl_cache,
    Handler.PLAN_TASK_DEPENDENCIES: plan_task_dependencies,
    Handler.PLAN_SAFE_RENAMES: plan_safe_renames,
    Handler.CHECK_UNIFIED_DIFF: check_unified_diff,
    Handler.SUMMARIZE_ACCESS_LOG: summarize_access_log,
    Handler.MIGRATE_RECORDS: migrate_records_v1_v2,
    Handler.SCAN_SYNTHETIC_SECRETS: scan_synthetic_secrets,
}


def build_artifact(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes | None:
    match cycle.handler:
        case Handler.METADATA:
            return None
        case (
            Handler.FILTER_NDJSON
            | Handler.PATCH_JSON_CONFIG
            | Handler.BUILD_RETRY_SCHEDULE
            | Handler.SNAPSHOT_TTL_CACHE
            | Handler.PLAN_TASK_DEPENDENCIES
            | Handler.PLAN_SAFE_RENAMES
            | Handler.CHECK_UNIFIED_DIFF
            | Handler.SUMMARIZE_ACCESS_LOG
            | Handler.MIGRATE_RECORDS
            | Handler.SCAN_SYNTHETIC_SECRETS
        ):
            return HANDLERS[cycle.handler](cycle, resolved)
        case unreachable:
            assert_never(unreachable)
