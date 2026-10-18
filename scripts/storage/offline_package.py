#!/usr/bin/env python3
"""Pacotes offline determinísticos de mídia — AID-2928 (produção local-first).

Decisão do founder (AID-2931, card encerrado 2026-10-17): o cutover R2 é
aditado; a produção do pipeline de mídia vira **100% local-first** —
assets estáticos versionados via GitHub Release Assets + pacotes offline
determinísticos que a pessoa aprende baixa para `learner/downloads/`.
Custo recorrente: US$0 (repo público — Releases/Pages gratuitos), abaixo
do teto US$25/mês da ADR AID-2886.

Contrato (espelha o pipeline R2 — o repo continua fonte da verdade das
*referências*; o pacote é armazém de bytes imutável):

1. Bytes são content-addressed: `blobs/<sha256>.<ext>` — imutável e
   idempotente por construção (mesmo conteúdo → mesmo blob; o build é
   deduplicado automaticamente).
2. `manifest.json` mapeia caminho lógico → sha256 → blob; `SHA256SUMS.txt`
   é verificável com `sha256sum -c` padrão. Ambos vivem DENTRO do pacote.
3. Determinismo: duas builds dos mesmos bytes produzem o mesmo
   `NAME-VERSION.zip` (ordem ordenada, timestamps fixos, compresslevel
   fixo) — o sha256 do zip é a identidade do pacote.
4. Restore fail-closed: só grava arquivo cujo sha256 casa com o manifest
   (objeto corrompido entra em `problems`, nunca no destino).
5. Sem conta, sem login, sem telemetria: download via URL pública de
   Release Asset (ou cópia direta); a verificação é local, offline.
6. Provider model (founder, AID-2928): `file://` é o provedor primário e
   Release Assets é o fallback de distribuição; a ferramenta expõe
   `--provider file|release` (default `file`) e o manifest registra qual
   provedor atende cada entrada — SHA-256 fail-closed em todo caminho.

Storage preserva e move bytes — nunca avalia (producer ≠ verifier).

Uso:
  offline_package.py build --file ARQ [--file ARQ...] [--path CAMINHO_LOGICO]
                           --name NOME --version V --out DIR [--zip]
                           [--provider file|release] [--release-base URL]
  offline_package.py verify --package DIR
  offline_package.py verify --zip ARQUIVO.zip [--expect SHA256]
  offline_package.py restore --package DIR --into DESTINO
  offline_package.py self-test        # e2e sem rede, stdlib apenas

Todo comando emite recibo JSON em stdout; `verify`/`restore` saem com rc=1
em FAILED (monitoramento pode pendurar nisso).
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

READ_SIZE = 1 << 20
# Timestamp ZIP fixo (mínimo representável) — determinismo entre builds.
ZIP_FIXED_DATE_TIME = (1980, 1, 1, 0, 0, 0)
ZIP_COMPRESSLEVEL = 9
SCHEMA_VERSION = 1
PROVIDERS = ("file", "release")  # ADR AID-2928 §Provider model: `file` é o primário


def utcnow_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(READ_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def ext_of(path: Path) -> str:
    return path.suffix.lstrip(".").lower() or "bin"


def blob_name(sha256: str, ext: str) -> str:
    return f"blobs/{sha256}.{ext}"


def emit(receipt: dict) -> None:
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


# -------------------------------------------------------------------- build


def cmd_build(args: argparse.Namespace) -> int:
    if not args.file:
        raise SystemExit("build exige ao menos um --file")
    out_dir = Path(args.out).expanduser()
    package_dir = out_dir / f"{args.name}-{args.version}"
    if package_dir.exists():
        raise SystemExit(f"pacote já existe: {package_dir} (build é append-only; use versão nova)")
    blobs_dir = package_dir / "blobs"
    blobs_dir.mkdir(parents=True)

    entries: list[dict] = []
    logical_paths: list[str] = []
    for spec in args.file:
        source, _, logical = spec.partition("::")
        src = Path(source).expanduser()
        if not src.is_file():
            raise SystemExit(f"arquivo não encontrado: {src}")
        logical = logical or src.name
        if logical in logical_paths:
            raise SystemExit(f"caminho lógico duplicado: {logical}")
        logical_paths.append(logical)
        sha = sha256_of(src)
        blob = blob_name(sha, ext_of(src))
        blob_path = package_dir / blob
        if not blob_path.exists():  # dedup por conteúdo
            tmp = blob_path.with_suffix(blob_path.suffix + ".tmp")
            shutil.copyfile(src, tmp)
            tmp.replace(blob_path)  # atómico
        size = src.stat().st_size
        entries.append({"path": logical, "sha256": sha, "size": size, "blob": blob})

    entries.sort(key=lambda entry: entry["path"])
    total_bytes = sum(entry["size"] for entry in entries)
    provider = args.provider
    release_base = (args.release_base or "").rstrip("/")
    if provider == "release" and not release_base:
        raise SystemExit("--provider release exige --release-base (URL base da release media-v<N>)")
    for entry in entries:
        entry["provider"] = provider
        if provider == "release":
            entry["url"] = f"{release_base}/{entry['blob']}"
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "name": args.name,
        "version": args.version,
        "provider": provider,
        "totalBytes": total_bytes,
        "entries": entries,
    }
    if provider == "release":
        manifest["releaseBase"] = release_base
    manifest_path = package_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    # SHA256SUMS.txt — linhas ordenadas, formato `sha256  caminho` (sha256sum -c).
    sums_lines: list[str] = []
    for path in sorted(package_dir.rglob("*")):
        if path.is_file():
            sums_lines.append(f"{sha256_of(path)}  {path.relative_to(package_dir).as_posix()}")
    (package_dir / "SHA256SUMS.txt").write_text("\n".join(sums_lines) + "\n", encoding="utf-8")

    receipt: dict = {
        "command": "build",
        "status": "ok",
        "package": str(package_dir),
        "name": args.name,
        "version": args.version,
        "provider": provider,
        "files": len(entries),
        "blobs": len(list(blobs_dir.iterdir())),
        "totalBytes": total_bytes,
        "generatedAt": utcnow_iso(),
    }

    if args.zip:
        zip_path = deterministic_zip(out_dir, package_dir, args.name, args.version)
        zip_sha = sha256_of(zip_path)
        (out_dir / f"{zip_path.name}.sha256").write_text(
            f"{zip_sha}  {zip_path.name}\n", encoding="utf-8"
        )
        receipt["zip"] = str(zip_path)
        receipt["zipSha256"] = zip_sha
        receipt["zipBytes"] = zip_path.stat().st_size

    emit(receipt)
    return 0


def deterministic_zip(out_dir: Path, package_dir: Path, name: str, version: str) -> Path:
    """ZIP determinístico: ordem ordenada, timestamps e attrs fixos, nível fixo."""
    zip_path = out_dir / f"{name}-{version}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=ZIP_COMPRESSLEVEL) as zf:
        for path in sorted(package_dir.rglob("*")):
            if not path.is_file():
                continue
            arcname = f"{name}-{version}/{path.relative_to(package_dir).as_posix()}"
            info = zipfile.ZipInfo(arcname, date_time=ZIP_FIXED_DATE_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with path.open("rb") as handle:
                zf.writestr(info, handle.read())
    return zip_path


# ------------------------------------------------------------------- verify


def verify_package_dir(package_dir: Path) -> dict:
    problems: list[str] = []
    manifest_path = package_dir / "manifest.json"
    if not manifest_path.is_file():
        return {"status": "failed", "problems": [f"sem manifest.json: {package_dir}"]}
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != SCHEMA_VERSION:
        problems.append(f"schemaVersion != {SCHEMA_VERSION}: {manifest.get('schemaVersion')!r}")

    checked = 0
    for entry in manifest.get("entries", []):
        blob_path = package_dir / entry["blob"]
        provider = entry.get("provider", "file")  # pacotes antigos: default file
        if provider not in PROVIDERS:
            problems.append(f"provider inválido: {provider!r} ({entry['path']})")
        if provider == "release" and not entry.get("url"):
            problems.append(f"entrada provider=release sem url: {entry['path']}")
        if not blob_path.is_file():
            problems.append(f"blob ausente: {entry['blob']} ({entry['path']})")
            continue
        actual = sha256_of(blob_path)
        checked += 1
        if actual != entry["sha256"]:
            problems.append(f"sha256 divergente: {entry['blob']} manifest={entry['sha256']} atual={actual}")
        if blob_path.stat().st_size != entry["size"]:
            problems.append(f"tamanho divergente: {entry['blob']}")

    # Blobs não referenciados = sujeira (não quebra restore, mas quebra o contrato).
    referenced = {entry["blob"] for entry in manifest.get("entries", [])}
    for blob in sorted((package_dir / "blobs").glob("*")) if (package_dir / "blobs").is_dir() else []:
        if blob.is_file() and blob.name.endswith(".tmp"):
            problems.append(f"tmp órfão: {blob.name}")
        elif blob.is_file() and f"blobs/{blob.name}" not in referenced:
            problems.append(f"blob não referenciado no manifest: {blob.name}")

    # SHA256SUMS.txt é a camada verificável por ferramenta padrão.
    sums_path = package_dir / "SHA256SUMS.txt"
    if sums_path.is_file():
        for line in sums_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            expected, _, rel = line.partition("  ")
            target = package_dir / rel
            if not target.is_file():
                problems.append(f"SHA256SUMS aponta arquivo ausente: {rel}")
            elif sha256_of(target) != expected:
                problems.append(f"SHA256SUMS divergente: {rel}")

    return {
        "status": "ok" if not problems else "failed",
        "package": str(package_dir),
        "name": manifest.get("name"),
        "version": manifest.get("version"),
        "entries": len(manifest.get("entries", [])),
        "blobsChecked": checked,
        "problems": problems,
    }


def cmd_verify(args: argparse.Namespace) -> int:
    if args.zip:
        zip_path = Path(args.zip).expanduser()
        if not zip_path.is_file():
            emit({"command": "verify", "status": "failed", "problems": [f"zip ausente: {zip_path}"]})
            return 1
        actual = sha256_of(zip_path)
        problems: list[str] = []
        sidecar = zip_path.with_name(zip_path.name + ".sha256")
        expected = args.expect
        if expected is None and sidecar.is_file():
            expected = sidecar.read_text(encoding="utf-8").split()[0]
        if expected is None:
            problems.append("sem --expect e sem sidecar .sha256 — nada a conferir")
        elif actual != expected:
            problems.append(f"sha256 divergente: esperado {expected} atual {actual}")
        receipt = {
            "command": "verify",
            "status": "ok" if not problems else "failed",
            "zip": str(zip_path),
            "sha256": actual,
            "expected": expected,
            "problems": problems,
        }
        emit(receipt)
        return 0 if not problems else 1

    receipt = verify_package_dir(Path(args.package).expanduser())
    receipt["command"] = "verify"
    receipt["generatedAt"] = utcnow_iso()
    emit(receipt)
    return 0 if receipt["status"] == "ok" else 1


# ------------------------------------------------------------------ restore


def cmd_restore(args: argparse.Namespace) -> int:
    package_dir = Path(args.package).expanduser()
    into = Path(args.into).expanduser()
    manifest_path = package_dir / "manifest.json"
    if not manifest_path.is_file():
        emit({"command": "restore", "status": "failed", "problems": [f"sem manifest.json: {package_dir}"]})
        return 1
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    restored: list[str] = []
    problems: list[str] = []
    for entry in manifest.get("entries", []):
        blob_path = package_dir / entry["blob"]
        if not blob_path.is_file():
            problems.append(f"blob ausente: {entry['blob']}")
            continue
        if sha256_of(blob_path) != entry["sha256"]:  # fail-closed
            problems.append(f"sha256 divergente, NÃO gravado: {entry['path']}")
            continue
        target = into / entry["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".tmp")
        shutil.copyfile(blob_path, tmp)
        tmp.replace(target)  # atómico
        restored.append(entry["path"])

    receipt = {
        "command": "restore",
        "status": "ok" if not problems else "failed",
        "package": str(package_dir),
        "into": str(into),
        "restored": len(restored),
        "paths": restored,
        "problems": problems,
        "generatedAt": utcnow_iso(),
    }
    emit(receipt)
    return 0 if not problems else 1


# ---------------------------------------------------------------- self-test


def cmd_self_test(_: argparse.Namespace) -> int:
    with tempfile.TemporaryDirectory() as tmp_name:
        tmp = Path(tmp_name)
        media = tmp / "media"
        (media / "aula").mkdir(parents=True)
        (media / "aula" / "icone.png").write_bytes(b"\x89PNG-fake-do-icone-192")
        (media / "aula" / "wallpaper.png").write_bytes(b"\x89PNG-fake-wallpaper-maior" * 64)
        # mesmo conteúdo, caminho lógico diferente → dedup num único blob
        (media / "aula" / "icone-duplicado.png").write_bytes(b"\x89PNG-fake-do-icone-192")

        out1 = tmp / "out1"
        out2 = tmp / "out2"
        checks: list[tuple[str, bool, str]] = []

        def run_build(out: Path) -> dict:
            proc = subprocess_run_cli(
                "build",
                "--file", str(media / "aula" / "icone.png"),
                "--file", str(media / "aula" / "icone-duplicado.png"),
                "--file", str(media / "aula" / "wallpaper.png") + "::aula/fundo.png",
                "--name", "autoteste", "--version", "1.0.0",
                "--out", str(out), "--zip",
            )
            return json.loads(proc.stdout)

        b1 = run_build(out1)
        checks.append(("build ok", b1.get("status") == "ok", json.dumps(b1)[:200]))
        checks.append(("dedup 2 blobs p/ 3 arquivos", b1.get("blobs") == 2, f"blobs={b1.get('blobs')}"))

        v = subprocess_run_cli("verify", "--package", str(out1 / "autoteste-1.0.0"))
        vj = json.loads(v.stdout)
        checks.append(("verify ok", v.returncode == 0 and vj["status"] == "ok", v.stdout[:200]))

        r = subprocess_run_cli("restore", "--package", str(out1 / "autoteste-1.0.0"), "--into", str(tmp / "rest"))
        rj = json.loads(r.stdout)
        same = all(
            (tmp / "rest" / p).read_bytes() == (media / "aula" / src).read_bytes()
            for p, src in (("icone.png", "icone.png"), ("icone-duplicado.png", "icone-duplicado.png"), ("aula/fundo.png", "wallpaper.png"))
        )
        checks.append(("restore byte-idêntico", r.returncode == 0 and rj["restored"] == 3 and same, r.stdout[:200]))

        # determinismo: mesma build em outro diretório → mesmo sha256 de zip
        b2 = run_build(out2)
        checks.append(("zip determinístico", b1.get("zipSha256") == b2.get("zipSha256"),
                       f"{b1.get('zipSha256')} vs {b2.get('zipSha256')}"))

        # tamper: corrompe um blob → verify falha e restore recusa gravar
        victim = next((out1 / "autoteste-1.0.0" / "blobs").glob("*.png"))
        victim.write_bytes(b"CORROMPIDO")
        vt = subprocess_run_cli("verify", "--package", str(out1 / "autoteste-1.0.0"))
        vtj = json.loads(vt.stdout)
        checks.append(("tamper detectado (verify)", vt.returncode == 1 and vtj["status"] == "failed", vt.stdout[:200]))
        rt = subprocess_run_cli("restore", "--package", str(out1 / "autoteste-1.0.0"), "--into", str(tmp / "rest2"))
        rtj = json.loads(rt.stdout)
        checks.append(("tamper fail-closed (restore)", rt.returncode == 1 and rtj["restored"] < 3, rt.stdout[:200]))

        zt = subprocess_run_cli("verify", "--zip", str(out1 / "autoteste-1.0.0.zip"))
        checks.append(("verify --zip contra sidecar", zt.returncode == 0, zt.stdout[:200]))

        # provider release (ADR AID-2928 §Provider model): manifest registra url por entrada
        br = subprocess_run_cli(
            "build",
            "--file", str(media / "aula" / "icone.png"),
            "--name", "autoteste-rel", "--version", "1.0.0",
            "--out", str(tmp / "out-rel"), "--zip",
            "--provider", "release",
            "--release-base", "https://github.com/x/y/releases/download/media-v1",
        )
        brj = json.loads(br.stdout)
        rel_manifest = json.loads((tmp / "out-rel" / "autoteste-rel-1.0.0" / "manifest.json").read_text())
        entry_rel = rel_manifest["entries"][0]
        checks.append((
            "provider release registra url",
            br.returncode == 0
            and rel_manifest["provider"] == "release"
            and entry_rel["url"].startswith(rel_manifest["releaseBase"])
            and entry_rel["url"].endswith(entry_rel["blob"]),
            json.dumps(entry_rel)[:200],
        ))
        vr = subprocess_run_cli("verify", "--package", str(tmp / "out-rel" / "autoteste-rel-1.0.0"))
        checks.append(("verify provider release ok", vr.returncode == 0 and json.loads(vr.stdout)["status"] == "ok", vr.stdout[:200]))

        failed = [name for name, ok, _ in checks if not ok]
        receipt = {
            "command": "self-test",
            "status": "ok" if not failed else "failed",
            "checks": [{"name": n, "ok": ok, "detail": d} for n, ok, d in checks],
            "generatedAt": utcnow_iso(),
        }
        emit(receipt)
        return 0 if not failed else 1


def subprocess_run_cli(*args: str):
    import subprocess

    return subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), *args],
        capture_output=True, text=True, check=False,
    )


# ---------------------------------------------------------------------- CLI


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build", help="monta pacote determinístico (blobs + manifest + SHA256SUMS [+ zip])")
    p_build.add_argument("--file", action="append", required=True,
                         metavar="ARQ[::CAMINHO_LOGICO]", help="arquivo de entrada (repetível)")
    p_build.add_argument("--name", required=True, help="nome do pacote")
    p_build.add_argument("--version", required=True, help="versão semântica do pacote")
    p_build.add_argument("--out", required=True, help="diretório de saída")
    p_build.add_argument("--provider", choices=PROVIDERS, default="file",
                         help="provedor que atende as entradas (default file — ADR AID-2928)")
    p_build.add_argument("--release-base", dest="release_base",
                         help="URL base da release (obrigatório com --provider release), ex.: .../releases/download/media-v1")
    p_build.add_argument("--zip", action="store_true", help="gera também NAME-VERSION.zip determinístico + sidecar .sha256")
    p_build.set_defaults(fn=cmd_build)

    p_verify = sub.add_parser("verify", help="verifica pacote (re-hash) ou zip (contra sidecar/--expect)")
    p_verify.add_argument("--package", help="diretório do pacote")
    p_verify.add_argument("--zip", help="arquivo .zip")
    p_verify.add_argument("--expect", help="sha256 esperado do zip")
    p_verify.set_defaults(fn=cmd_verify)

    p_restore = sub.add_parser("restore", help="restaura caminhos lógicos (fail-closed por sha256)")
    p_restore.add_argument("--package", required=True, help="diretório do pacote")
    p_restore.add_argument("--into", required=True, help="diretório de destino")
    p_restore.set_defaults(fn=cmd_restore)

    p_self = sub.add_parser("self-test", help="e2e sem rede (build/verify/restore/tamper/determinismo)")
    p_self.set_defaults(fn=cmd_self_test)

    args = parser.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    raise SystemExit(main())
