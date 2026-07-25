from __future__ import annotations

from datetime import datetime


class GateSecurityError(ValueError):
    pass


def parse_aware_timestamp(raw: str) -> datetime:
    parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise GateSecurityError("timestamp must include a timezone offset")
    return parsed
