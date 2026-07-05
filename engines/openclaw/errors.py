"""Exception hierarchy for the OpenClaw runner.

Deliberately small — OpenClaw is a tracer bullet. Callers only need to
distinguish "state on disk is corrupt, a human must look at it" from other
runner failures, so we define one base class and two specific subclasses
instead of a taxonomy.
"""

from __future__ import annotations


class OpenclawError(Exception):
    """Base class for all OpenClaw runner errors.

    Catch this at the CLI boundary to print a clean message instead of a
    traceback.
    """


class StateCorruptionError(OpenclawError):
    """A state or event file on disk is unreadable or malformed.

    Raised for corrupted ``scheduler_state.json``, malformed
    ``pipeline_status.md`` / ``learning_state.yaml``, and broken Hermes event
    files. The message always names the offending file and what to do about
    it (usually: inspect, fix, or delete the file and re-run).
    """


class EventNotFoundError(OpenclawError):
    """An event expected in the Hermes inbox is not there.

    Usually means the event was acked twice or was never consumed before
    ``ack()`` was called.
    """
