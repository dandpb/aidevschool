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


class LedgerCorruptError(LedgerError):
    """Linha ilegível/divergente no ledger — fail-closed com localização.

    Contrato de saída (AID-2728/AID-2737): nada de traceback cru; o motivo
    carrega nº de linha e razão para o veredito estruturado do CLI.
    """

    def __init__(self, line_no: int, reason: str) -> None:
        self.line_no = line_no
        self.reason = reason
        super().__init__(f"ledger line {line_no}: {reason}")


def _parse_receipt_line(line_no: int, line: str) -> Receipt:
    try:
        return Receipt.from_json(line)
    except json.JSONDecodeError as exc:
        raise LedgerCorruptError(line_no, f"invalid JSON: {exc}") from exc
    except (TypeError, ValueError) as exc:
        raise LedgerCorruptError(line_no, f"invalid receipt: {exc}") from exc


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
            for line_no, line in enumerate(fh, 1):
                line = line.strip()
                if line:
                    receipts.append(_parse_receipt_line(line_no, line))
        return receipts

    def verify_report(self, expected_head: str | None = None) -> dict:
        """Veredito estruturado da cadeia — nunca derruba exceção por linha
        malformada (AID-2728 S5b): qualquer problema vira
        ``{"chain_ok": false, "error": {"line", "reason"}}``.

        AID-2719 (X6): `expected_head` é a âncora externa do head (persistida
        em `state.json`/`receipt.summary.json`, fora do ledger). Cadeia
        internamente íntegra mas com head ≠ âncora = sufixo truncado ou
        reescrito → `chain_ok=false` com motivo de âncora.
        """
        report: dict = {
            "entries": 0, "hashes_ok": True, "chain_ok": True, "error": None,
            "head": None, "anchored_head": expected_head,
        }
        prev_hash = None
        prev_seq = 0
        with self.path.open("r", encoding="utf-8") as fh:
            for line_no, raw in enumerate(fh, 1):
                line = raw.strip()
                if not line:
                    continue
                report["entries"] += 1
                try:
                    r = _parse_receipt_line(line_no, line)
                except LedgerCorruptError as exc:
                    report["chain_ok"] = False
                    report["hashes_ok"] = False
                    report["error"] = {"line": exc.line_no, "reason": exc.reason}
                    return report
                if r.hash != r.compute_hash():
                    report["hashes_ok"] = False
                    report["chain_ok"] = False
                    report["error"] = {"line": line_no, "reason": "receipt hash mismatch"}
                    return report
                if r.seq != prev_seq + 1:
                    report["chain_ok"] = False
                    report["error"] = {"line": line_no, "reason": f"seq {r.seq} != {prev_seq + 1}"}
                    return report
                if r.prev_hash != prev_hash:
                    report["chain_ok"] = False
                    report["error"] = {"line": line_no, "reason": "prev_hash does not chain"}
                    return report
                prev_seq, prev_hash = r.seq, r.hash
        report["head"] = prev_hash
        if report["chain_ok"] and expected_head is not None and prev_hash != expected_head:
            report["chain_ok"] = False
            report["error"] = {
                "line": report["entries"],
                "reason": (
                    f"ledger head {prev_hash} != external anchor {expected_head} "
                    "(suffix truncated or rewritten)"
                ),
            }
        return report

    def verify_chain(self, expected_head: str | None = None) -> bool:
        """Recomputa a cadeia; retorna False em qualquer divergência,
        inclusive linha ilegível (AID-2728 S5b — sem exceção) e head divergente
        da âncora externa, quando informada (AID-2719 X6)."""
        return self.verify_report(expected_head=expected_head)["chain_ok"]

    def last(self) -> Receipt | None:
        entries = self.read()
        return entries[-1] if entries else None

    def find(self, station_to: str) -> list[Receipt]:
        return [r for r in self.read() if r.station_to == station_to]

    def snapshot(self) -> dict:
        report = self.verify_report()
        if report["error"] is not None:
            return {
                "station": "unreadable",
                "entries": report["entries"],
                "chain_ok": False,
                "error": report["error"],
            }
        if not report["entries"]:
            return {"station": None, "entries": 0, "chain_ok": True}
        return {
            "station": self.read()[-1].station_to,
            "entries": report["entries"],
            "chain_ok": report["chain_ok"],
        }


def load_raw(path: Path) -> list[dict]:
    out = []
    with Path(path).open("r", encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError as exc:
                    raise LedgerCorruptError(line_no, f"invalid JSON: {exc}") from exc
    return out
