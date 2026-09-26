"""Core value objects for the agentic factory.

Naming follows the POC HTML: Event (entrada), Contract (contrato congelado),
Build (construir em worktree isolado), Proof/Verify (provar com Verifier
independente), and the promotion gates P1–P5.
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

STATIONS = ("queued", "contracted", "built", "verified", "promoted", "blocked")

RISK_LEVELS = ("low", "medium", "high")

PROFILES = ("cheap", "standard")


def utcnow() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="milliseconds")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def canonical_json(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest_obj(obj) -> str:
    return sha256_text(canonical_json(obj))


@dataclass
class WorkEvent:
    """Estação 1 — entrada: item com ID, origem, escopo, risco (fila + lease)."""

    id: str
    origin: str
    scope: str
    risk: str = "low"
    owner: str = "human"
    created_at: str = field(default_factory=utcnow)

    def __post_init__(self) -> None:
        if not self.id or not self.origin:
            raise ValueError("event needs id and origin")
        if self.risk not in RISK_LEVELS:
            raise ValueError(f"risk must be one of {RISK_LEVELS}")

    def to_json(self) -> str:
        return canonical_json(asdict(self))

    @classmethod
    def from_json(cls, text: str) -> "WorkEvent":
        return cls(**json.loads(text))


@dataclass
class Check:
    """Uma obrigação executável do contrato (checks.md)."""

    id: str
    cmd: str
    profile: str = "cheap"
    required: bool = True

    def __post_init__(self) -> None:
        if self.profile not in PROFILES:
            raise ValueError(f"profile must be one of {PROFILES}")


@dataclass
class Proof:
    """Resultado executável de um check, ligado a um SHA pelo recibo."""

    check_id: str
    cmd: str
    exit_code: int
    output_sha256: str
    started_at: str
    finished_at: str
    context_id: str
    output_path: str

    @property
    def passed(self) -> bool:
        return self.exit_code == 0


@dataclass
class Lease:
    """Reserva exclusiva do item (P1: dois agentes não assumem o mesmo item).

    `epoch` é o fencing token: começa em 1 e só cresce em takeover pós-expiração.
    Writers com época velha são recusados pelas estações (AID-2718/AID-2721).
    """

    event_id: str
    holder: str
    acquired_at: str = field(default_factory=utcnow)
    heartbeat_at: str = field(default_factory=utcnow)
    ttl_seconds: int = 3600
    epoch: int = 1

    def to_json(self) -> str:
        return canonical_json(asdict(self))

    @classmethod
    def from_json(cls, text: str) -> "Lease":
        return cls(**json.loads(text))


@dataclass
class Receipt:
    """Transição de estação; append-only, encadeada por hash no ledger."""

    seq: int
    run_id: str
    station_from: str
    station_to: str
    actor_role: str  # coordinator | author | verifier | human
    context_id: str
    ts: str = field(default_factory=utcnow)
    sha: Optional[str] = None
    contract_digest: Optional[str] = None
    proof_refs: list = field(default_factory=list)
    detail: dict = field(default_factory=dict)
    prev_hash: Optional[str] = None
    hash: Optional[str] = None

    def payload(self) -> dict:
        d = asdict(self)
        d.pop("hash")
        return d

    def compute_hash(self) -> str:
        return digest_obj(self.payload())

    def seal(self) -> "Receipt":
        self.hash = self.compute_hash()
        return self

    def to_json_line(self) -> str:
        if self.hash is None:
            self.seal()
        return canonical_json(asdict(self))

    @classmethod
    def from_json(cls, text: str) -> "Receipt":
        return cls(**json.loads(text))
