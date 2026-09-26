"""Contrato: intent + plano aprovado, checks derivados e congelados.

O registro canônico é versionado em `intent/<change-id>/` (intent.md, spec.md,
plan.md — regra do repositório). O piloto acrescenta `checks.md` com IDs de
obrigação e prova executável (HTML §03). Congelar = copiar os arquivos para o
run dir e fixar o digest; qualquer divergência posterior entre o run e o
registro versionado bloqueia a promoção (P4).
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path

from .model import Check, digest_obj

CONTRACT_FILES = ("intent.md", "spec.md", "plan.md", "checks.md")


class ContractError(RuntimeError):
    pass


# Dois formatos aprovados (AID-2732): o da POC (`Status: approved` em
# início de linha) e o header canônico do template SDLC, que carrega o
# status inline na linha `Change-id:` (`... · Status: approved`).
PLAN_APPROVED = re.compile(
    r"^\s*Status:\s*approved\b"
    r"|^\s*Change-id:.*·\s*Status:\s*approved\b",
    re.MULTILINE,
)


def parse_checks_md(text: str) -> list[Check]:
    """Linha de obrigação: `C1 | profile=standard | <comando shell>`.

    IDs são estáveis (C1, C2, ...); profile é `cheap` (default) ou `standard`.
    """
    checks: list[Check] = []
    seen: set[str] = set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line.startswith("C") or "|" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 2 or not re.fullmatch(r"C\d+", parts[0]):
            continue
        cid, rest = parts[0], parts[1:]
        profile = "cheap"
        cmd_parts = []
        for part in rest:
            m = re.fullmatch(r"profile=(\w+)", part)
            if m:
                profile = m.group(1)
            elif part:
                cmd_parts.append(part)
        if not cmd_parts:
            raise ContractError(f"check {cid} has no executable command")
        cmd = " | ".join(cmd_parts) if len(cmd_parts) > 1 else cmd_parts[0]
        if cid in seen:
            raise ContractError(f"duplicate check id {cid}")
        seen.add(cid)
        checks.append(Check(id=cid, cmd=cmd, profile=profile))
    if not checks:
        raise ContractError("checks.md declares no obligations")
    return checks


class Contract:
    """Contrato congelado de uma run."""

    def __init__(self, change_id: str, files: dict[str, str], base_sha: str) -> None:
        self.change_id = change_id
        self.files = files  # name -> content (frozen copy)
        self.base_sha = base_sha
        self.checks = parse_checks_md(files.get("checks.md", ""))
        self._require(files, "intent.md")
        self._require(files, "plan.md")
        plan = files["plan.md"]
        if not PLAN_APPROVED.search(plan):
            raise ContractError(
                "plan.md header must carry `Status: approved` before build (HTML §02: "
                "plano aprovado libera build)"
            )

    @staticmethod
    def _require(files: dict[str, str], name: str) -> None:
        if name not in files or not files[name].strip():
            raise ContractError(f"contract missing {name}")

    @property
    def digest(self) -> str:
        return digest_obj(
            {"change_id": self.change_id, "base_sha": self.base_sha, "files": self.files}
        )

    # -- persistence in the (git-ignored) run dir --------------------------

    def freeze(self, run_dir: Path) -> Path:
        target = Path(run_dir) / "contract"
        if target.exists():
            raise ContractError("contract already frozen for this run")
        (target / "checks.d").mkdir(parents=True, exist_ok=True)
        for name, content in self.files.items():
            (target / name).write_text(content, encoding="utf-8")
        meta = {"change_id": self.change_id, "base_sha": self.base_sha, "digest": self.digest}
        (target / "contract.lock.json").write_text(
            __import__("json").dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        return target

    @classmethod
    def load_frozen(cls, run_dir: Path) -> "Contract":
        import json

        target = Path(run_dir) / "contract"
        lock = json.loads((target / "contract.lock.json").read_text(encoding="utf-8"))
        files = {
            p.name: p.read_text(encoding="utf-8")
            for p in target.iterdir()
            if p.is_file() and p.name != "contract.lock.json"
        }
        contract = cls(change_id=lock["change_id"], files=files, base_sha=lock["base_sha"])
        if contract.digest != lock["digest"]:
            raise ContractError("frozen contract diverges from its lock digest (P4)")
        return contract


def load_from_registry(registry_root: Path, change_id: str, base_sha: str) -> Contract:
    """Lê o registro versionado `intent/<change-id>/` e instancia o contrato."""
    root = Path(registry_root) / change_id
    if not root.is_dir():
        raise ContractError(f"no versioned registry at {root}")
    files: dict[str, str] = {}
    for name in CONTRACT_FILES:
        path = root / name
        if path.exists():
            files[name] = path.read_text(encoding="utf-8")
    return Contract(change_id=change_id, files=files, base_sha=base_sha)


def copy_receipt_into_registry(run_dir: Path, registry_root: Path, change_id: str) -> Path | None:
    """Espelha o recibo pequeno de volta ao registro versionado (HTML §03:
    'um resumo pequeno entra no registro versionado ou no task record')."""
    src = Path(run_dir) / "receipt.summary.json"
    if not src.exists():
        return None
    dst_dir = Path(registry_root) / change_id
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / "verification.md.run-receipt.json"
    shutil.copyfile(src, dst)
    return dst
