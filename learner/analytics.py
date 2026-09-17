"""Shared PostHog analytics client for learner-side Python runtimes."""

from __future__ import annotations

import atexit
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from posthog import Posthog


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _debug_enabled() -> bool:
    return os.getenv("POSTHOG_DEBUG", "false").lower() == "true"


def _is_development() -> bool:
    return os.getenv("AIDEVSCHOOL_ENV", "production").lower() in {
        "dev",
        "development",
        "local",
    }


def initialize_posthog() -> Posthog | None:
    """Create the process-wide SDK client when analytics is configured."""
    project_token = os.getenv("POSTHOG_PROJECT_TOKEN")
    host = os.getenv("POSTHOG_HOST")
    if not project_token:
        if _is_development() or _debug_enabled():
            raise RuntimeError(
                "POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or "
                "un-configured, this causes events to be silently missed. This error "
                "stops appearing once POSTHOG_PROJECT_TOKEN is configured"
            )
        return None
    if not host:
        if _is_development() or _debug_enabled():
            raise RuntimeError(
                "POSTHOG_HOST variable required by PostHog is missing or un-configured, "
                "this causes events to be silently missed. This error stops appearing "
                "once POSTHOG_HOST is configured"
            )
        return None

    client = Posthog(
        project_token,
        host=host,
        debug=_debug_enabled(),
        enable_exception_autocapture=True,
    )
    atexit.register(client.shutdown)
    return client


posthog_client = initialize_posthog()


def identify_learner(
    learner_id: str,
    properties: dict[str, Any],
) -> None:
    """Update person properties for a known learner."""
    if posthog_client is not None:
        posthog_client.set(distinct_id=learner_id, properties=properties)


def capture_event(
    distinct_id: str,
    event: str,
    properties: dict[str, Any] | None = None,
) -> None:
    """Capture an event when the process has PostHog configured."""
    if posthog_client is not None:
        posthog_client.capture(
            event,
            distinct_id=distinct_id,
            properties=properties or {},
        )


def capture_exception(exception: BaseException, distinct_id: str) -> None:
    """Capture a handled exception without changing application error flow."""
    if posthog_client is not None:
        posthog_client.capture_exception(exception, distinct_id=distinct_id)
