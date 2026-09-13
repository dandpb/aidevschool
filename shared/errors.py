"""Cross-context error: on-disk state is corrupt and a human must look at it.

Lifted from ``engines/openclaw/errors.py`` (2026-09-13) because three contexts
raise it — openclaw (pipeline/checklist state), curriculum (status/evidence
files), and the learner gate — and the import graph it created was a cycle
(``curriculum._shared.evidence`` ⇄ ``engines.openclaw``).

Deliberately NOT an ``OpenclawError`` subclass: engine-specific bases stay in
their engines. CLI boundaries that previously caught a single engine base now
catch this class explicitly.
"""


class StateCorruptionError(Exception):
    """A state or evidence file on disk is unreadable or malformed.

    The message always names the offending file and what to do about it
    (usually: inspect, fix, or delete the file and re-run).
    """
