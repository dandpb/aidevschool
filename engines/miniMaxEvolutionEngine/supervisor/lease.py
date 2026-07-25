"""Versioned, explicitly recoverable operational lease."""

from __future__ import annotations

import fcntl
import json
import os
import socket
import tempfile
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from .outbox import valid_id


class LeaseHeldError(RuntimeError):
    pass


def _time(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("invalid lease timestamp") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("lease timestamp must be timezone-aware")
    return parsed


def _validate(value: object) -> dict:
    fields = {
        "schema_version",
        "owner",
        "process_id",
        "host",
        "acquired_at",
        "expires_at",
    }
    if not isinstance(value, dict) or set(value) != fields or value.get("schema_version") != 1:
        raise ValueError("invalid lease schema")
    if (
        not valid_id(value.get("owner"))
        or type(value.get("process_id")) is not int
        or type(value.get("host")) is not str
        or not value["host"]
    ):
        raise ValueError("invalid lease identity")
    acquired_at = _time(value["acquired_at"])
    expires_at = _time(value["expires_at"])
    if expires_at <= acquired_at:
        raise ValueError("lease expiry must follow acquisition")
    return value


def _read_fd(fd: int) -> dict:
    os.lseek(fd, 0, os.SEEK_SET)
    try:
        raw = os.read(fd, 16_384)
        value = json.loads(raw.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"invalid lease: {exc}") from exc
    return _validate(value)


def read_lease(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"invalid lease: {exc}") from exc
    return _validate(value)


def _same_file(fd: int, path: Path) -> bool:
    try:
        opened = os.fstat(fd)
        current = path.stat(follow_symlinks=False)
    except FileNotFoundError:
        return False
    return (opened.st_dev, opened.st_ino) == (current.st_dev, current.st_ino)


def _fsync_directory(path: Path) -> None:
    directory_fd = os.open(path, os.O_RDONLY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)


@dataclass(frozen=True, slots=True)
class Lease:
    path: Path
    owner: str
    fd: int

    def release(self) -> None:
        try:
            current = _read_fd(self.fd)
            if current["owner"] != self.owner:
                raise LeaseHeldError("lease ownership changed; refusing release")
            if not _same_file(self.fd, self.path):
                raise LeaseHeldError("lease path changed; refusing release")
            self.path.unlink()
            _fsync_directory(self.path.parent)
        finally:
            os.close(self.fd)


def acquire(
    path: Path,
    owner: str,
    acquired_at: str,
    process_id: int,
    duration_seconds: int = 300,
) -> Lease:
    if not valid_id(owner) or duration_seconds <= 0:
        raise ValueError("invalid lease owner or duration")
    acquired = _time(acquired_at)
    value = {
        "schema_version": 1,
        "owner": owner,
        "process_id": process_id,
        "host": socket.gethostname(),
        "acquired_at": acquired_at,
        "expires_at": (acquired + timedelta(seconds=duration_seconds)).isoformat(),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_fd, temporary = tempfile.mkstemp(prefix=".lease-", dir=path.parent)
    try:
        fcntl.flock(temporary_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        payload = (json.dumps(value, sort_keys=True) + "\n").encode("utf-8")
        with os.fdopen(os.dup(temporary_fd), "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(temporary, path)
        except FileExistsError as exc:
            raise LeaseHeldError(f"lease already exists: {path}") from exc
        os.unlink(temporary)
        _fsync_directory(path.parent)
        return Lease(path, owner, temporary_fd)
    except BaseException:
        os.close(temporary_fd)
        Path(temporary).unlink(missing_ok=True)
        raise


def recover(path: Path, now: str) -> str:
    fd = os.open(path, os.O_RDONLY)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise LeaseHeldError("lease is still held by an active process") from exc
        value = _read_fd(fd)
        if _time(value["expires_at"]) >= _time(now):
            raise LeaseHeldError("lease has not expired")
        if not _same_file(fd, path):
            raise LeaseHeldError("lease path changed; refusing recovery")
        path.unlink()
        _fsync_directory(path.parent)
        return value["owner"]
    finally:
        os.close(fd)
