"""Exception hierarchy for the OpenClaw runner.

Deliberately small — OpenClaw is a tracer bullet. ``StateCorruptionError``
moved to the neutral ``shared/errors.py`` home (2026-09-13) because three
contexts raise it; engine-specific errors stay here. Callers only need to
distinguish "state on disk is corrupt, a human must look at it" from other
runner failures.
"""


class OpenclawError(Exception):
    """Base class for OpenClaw-specific runner errors.

    Catch this at the CLI boundary to print a clean message instead of a
    traceback. Cross-context corrupt-state errors are
    ``shared.errors.StateCorruptionError``, caught alongside this class.
    """
