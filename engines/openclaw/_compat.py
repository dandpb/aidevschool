"""Compatibility helpers for older Python versions.

The ecosystem ``pyproject.toml`` declares ``requires-python = ">=3.9"`` but
``enum.StrEnum`` only exists from Python 3.11. This shim provides an
equivalent on older interpreters; on 3.11+ the stdlib class is used
unchanged.
"""

from __future__ import annotations

try:
    from enum import StrEnum
except ImportError:  # pragma: no cover — Python < 3.11 only
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        """Minimal stand-in for ``enum.StrEnum`` on Python < 3.11."""

        def __str__(self) -> str:
            return str(self.value)


__all__ = ["StrEnum"]
