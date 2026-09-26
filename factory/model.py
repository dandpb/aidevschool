"""Core value objects for the agentic factory.

Naming follows the POC HTML: Event (entrada), Contract (contrato congelado),
Build (construir em worktree isolado), Proof/Verify (provar com Verifier
independente), and the promotion gates P1–P5.
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import json
from dataclasses import dataclass, field, asdict, fields
from pathlib import Path
from typing import Optional

# `freezing` é a estação intermediária de write-ahead do freeze (AID-2726):
# o state é gravado ANTES dos efeitos, então um kill no meio da estação deixa
# a run retomável em vez de travada.
STATIONS = ("queued", "freezing", "contracted", "built", "verified", "promoted", "blocked")

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


def proof_evidence(proof: Proof) -> dict:
    """Âncora mínima de uma prova (AID-2715): o que o recibo `verified`
    sela no ledger encadeado. Tudo o que ficar só no runtime (gitignored)
    é auto-atestável e não conta como evidência."""
    return {
        "check_id": proof.check_id,
        "cmd_sha256": sha256_text(proof.cmd),
        "exit_code": proof.exit_code,
        "output_sha256": proof.output_sha256,
    }


def evidence_digest(evidence: dict) -> str:
    return digest_obj(evidence)


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
    # Túmulo legível (AID-2762): `release(holder_enforcement=True)` regrava o
    # lease com `released_at` preenchido; o campo first-class garante que o
    # arquivo-remanescente seja desserializável por qualquer leitor.
    released_at: Optional[str] = None

    def to_json(self) -> str:
        return canonical_json(asdict(self))

    @classmethod
    def from_json(cls, text: str) -> "Lease":
        # Leitura tolerante (AID-2762): chaves desconhecidas são ignoradas em
        # vez de envenenar `lease_of`/`claim`/`lease_expired` com TypeError.
        known = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in json.loads(text).items() if k in known})


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
    proof_digests: list = field(default_factory=list)
    detail: dict = field(default_factory=dict)
    prev_hash: Optional[str] = None
    hash: Optional[str] = None

    def payload(self) -> dict:
        d = asdict(self)
        d.pop("hash")
        # Compat AID-2715: recibos pré-âncora (campo vazio) continuam com o
        # mesmo payload/hash de quando foram selados — `verify_chain` de
        # ledgers antigos não pode quebrar por causa do campo novo.
        if not d.get("proof_digests"):
            d.pop("proof_digests")
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
