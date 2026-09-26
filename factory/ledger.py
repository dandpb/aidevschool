"""Append-only, hash-chained run ledger.

Rules from the POC HTML (§03, §04):
- fila, lease, tentativas, logs e recibos de transição ficam fora do Git;
- cada prova aponta para o item, o hash do contrato e o SHA do código;
- "falha e retry não apagam o histórico" — a blocked/promoted receipt is
  appended, never a rewrite.
"""

from __future__ import annotations

import json
from pathlib import Path

from .model import Receipt


class LedgerError(RuntimeError):
    pass


class RunLedger:
    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.touch()

    def append(self, receipt: Receipt) -> Receipt:
        entries = self.read()
        if entries:
            last = entries[-1]
            if receipt.seq != last.seq + 1:
                raise LedgerError(
                    f"seq must continue at {last.seq + 1}, got {receipt.seq}"
                )
            receipt.prev_hash = last.hash
        receipt.seal()
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(receipt.to_json_line() + "\n")
        return receipt

    def read(self) -> list[Receipt]:
        receipts: list[Receipt] = []
        with self.path.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    receipts.append(Receipt.from_json(line))
        return receipts

    def verify_chain(self) -> bool:
        """Recomputa a cadeia; retorna False em qualquer divergência."""
        prev_hash = None
        prev_seq = 0
        for r in self.read():
            if r.seq != prev_seq + 1:
                return False
            if r.prev_hash != prev_hash:
                return False
            if r.hash != r.compute_hash():
                return False
            prev_seq, prev_hash = r.seq, r.hash
        return True

    def last(self) -> Receipt | None:
        entries = self.read()
        return entries[-1] if entries else None

    def find(self, station_to: str) -> list[Receipt]:
        return [r for r in self.read() if r.station_to == station_to]

    def snapshot(self) -> dict:
        entries = self.read()
        if not entries:
            return {"station": None, "entries": 0, "chain_ok": True}
        return {
            "station": entries[-1].station_to,
            "entries": len(entries),
            "chain_ok": self.verify_chain(),
        }


def load_raw(path: Path) -> list[dict]:
    out = []
    with Path(path).open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out
