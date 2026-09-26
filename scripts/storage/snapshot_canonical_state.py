#!/usr/bin/env python3
"""Snapshot, verify and restore the repo-as-database canonical state of AiDevSchool.

Scope (canonical state that may run ahead of git; see
docs/runbooks/storage-canonical-state-backup.md for the contract):
  - learner/learning_state.yaml          (hard requirement, fail-closed)
  - curriculum/catalog.md                (hard requirement, fail-closed)
  - .mavis/                              (generated read models)
  - engines/*/src/data/                  (dashboard read models, e.g. curriculum-data)

Storage layout (default root /paperclip/storage/aidevschool, override with
AID_SNAPSHOT_ROOT):
  <root>/snapshots/<UTC-timestamp>/bundle.tar.gz   exact file images, repo-relative paths
  <root>/snapshots/<UTC-timestamp>/manifest.sha256 sha256sum -c compatible digest per file
  <root>/snapshots/<UTC-timestamp>/meta.json       provenance + digests + retention policy
  <root>/snapshots/LATEST                          pointer file with the newest snapshot id
  <root>/drills/                                   restore drill logs (receipts)

Retention policy (single source of truth: RETENTION below):
  keep newest always; last 24 hourly; newest/day for 7 days; newest/ISO-week
  for 4 weeks; newest/month for 6 months; never prune snapshots younger than
  1 hour. Budget: soft cap 2048 MiB (alert >= 80%), hard cap 2560 MiB
  (prunes oldest first; exit 2 if still over -> sweep escalates).

Producer never verifies learner mastery; this tool only preserves bytes and
reports integrity receipts. Exit codes: 0 ok, 1 failure, 2 budget/cap alarm.
"""

from __future__ import annotations

import argparse
import fcntl
import glob as globmod
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

TOOL = "snapshot_canonical_state.py"
TOOL_VERSION = 1
SCHEMA = 1

REPO_DEFAULT = Path(__file__).resolve().parents[2]
SNAPSHOT_ROOT_DEFAULT = Path("/paperclip/storage/aidevschool")
SNAP_DIRNAME = "snapshots"

SCOPE_LITERAL = [
    "learner/learning_state.yaml",
    "curriculum/catalog.md",
    ".mavis",
]
SCOPE_GLOB = [
    "engines/*/src/data",
]
SCOPE_REQUIRED = {"learner/learning_state.yaml", "curriculum/catalog.md"}

EXCLUDE_NAMES = {"__pycache__", "node_modules", ".DS_Store"}
EXCLUDE_SUFFIXES = (".pyc", ".pyo")

RETENTION = {
    "hourly_keep": 24,
    "daily_keep": 7,
    "weekly_keep": 4,
    "monthly_keep": 6,
    "min_age_seconds_before_prune": 3600,
    "budget_soft_mib": 2048,
    "budget_hard_mib": 2560,
    "budget_alert_pct": 80,
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def log(msg: str) -> None:
    print(f"[{utcnow().isoformat(timespec='seconds')}] {msg}", flush=True)


def root_from(args: argparse.Namespace) -> Path:
    return Path(os.environ.get("AID_SNAPSHOT_ROOT", "") or getattr(args, "root", None) or SNAPSHOT_ROOT_DEFAULT)


def snaps_root(args: argparse.Namespace) -> Path:
    return root_from(args) / SNAP_DIRNAME


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def iter_scope_files(repo: Path) -> tuple[list[str], list[str], list[str]]:
    """Return (relative file paths sorted, missing scope entries, skipped symlinks)."""
    files: list[str] = []
    missing: list[str] = []
    skipped: list[str] = []
    entries: list[str] = []
    for lit in SCOPE_LITERAL:
        if (repo / lit).exists():
            entries.append(lit)
        else:
            missing.append(lit)
    for pat in SCOPE_GLOB:
        hits = sorted(globmod.glob(str(repo / pat)))
        if hits:
            entries.extend(str(Path(h).relative_to(repo)) for h in hits)
        else:
            missing.append(pat)
    for rel in entries:
        p = repo / rel
        if p.is_file():
            files.append(rel)
            continue
        for dirpath, dirnames, filenames in os.walk(p):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_NAMES]
            for name in sorted(filenames):
                if name in EXCLUDE_NAMES or name.endswith(EXCLUDE_SUFFIXES):
                    continue
                fp = Path(dirpath) / name
                if fp.is_symlink():
                    skipped.append(str(fp.relative_to(repo)))
                    continue
                files.append(str(fp.relative_to(repo)))
    return sorted(set(files)), missing, skipped


def git_info(repo: Path) -> dict:
    def run(*argsv: str) -> str | None:
        try:
            out = subprocess.run(
                ["git", "-C", str(repo), *argsv],
                capture_output=True, text=True, timeout=30,
            )
            return out.stdout.strip() if out.returncode == 0 else None
        except Exception:
            return None

    head = run("rev-parse", "HEAD")
    branch = run("rev-parse", "--abbrev-ref", "HEAD")
    dirty_scope: list[str] = []
    if head:
        out = run("status", "--porcelain", "--", *SCOPE_LITERAL, *SCOPE_GLOB)
        if out:
            dirty_scope = [l[3:] for l in out.splitlines() if l.strip()]
    return {"head": head, "branch": branch, "dirty_scope_count": len(dirty_scope), "dirty_scope_sample": dirty_scope[:20]}


def list_snapshots(args: argparse.Namespace) -> list[Path]:
    base = snaps_root(args)
    if not base.is_dir():
        return []
    return sorted(p for p in base.iterdir() if p.is_dir() and (p / "meta.json").is_file())


def read_meta(snap: Path) -> dict:
    return json.loads((snap / "meta.json").read_text())


def single_flight(args: argparse.Namespace):
    lock_path = root_from(args) / ".locks" / "snapshot.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    fh = open(lock_path, "w")
    try:
        fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print(json.dumps({"status": "busy", "detail": "another snapshot run holds the lock"}))
        fh.close()
        return None, None
    return fh, lock_path


def cmd_snapshot(args: argparse.Namespace) -> int:
    repo = Path(args.repo).resolve()
    lock_fh, _ = single_flight(args)
    if lock_fh is None:
        return 0
    with lock_fh:
        files, missing, skipped = iter_scope_files(repo)
        fatal_missing = sorted(SCOPE_REQUIRED.intersection(missing))
        if fatal_missing:
            log(f"FATAL: canonical file(s) missing, refusing snapshot: {fatal_missing}")
            return 1
        sid = utcnow().strftime("%Y%m%dT%H%M%SZ")
        base = snaps_root(args)
        final_dir = base / sid
        tmp_dir = base / f".tmp-{sid}-{os.getpid()}"
        if final_dir.exists():
            log(f"FATAL: snapshot id collision {sid}")
            return 1
        tmp_dir.mkdir(parents=True)

        t0 = time.time()
        total_bytes = 0
        manifest_lines: list[str] = []
        bundle_tmp = tmp_dir / "bundle.tar.gz"
        with tarfile.open(bundle_tmp, "w:gz") as tar:
            for rel in files:
                full = repo / rel
                total_bytes += full.stat().st_size
                manifest_lines.append(f"{sha256_file(full)}  {rel}")
                tar.add(full, arcname=rel, recursive=False)
        (tmp_dir / "manifest.sha256").write_text("\n".join(manifest_lines) + "\n")

        manifest_sha = sha256_file(tmp_dir / "manifest.sha256")
        meta = {
            "schema": SCHEMA,
            "tool": TOOL,
            "tool_version": TOOL_VERSION,
            "snapshot_id": sid,
            "created_at": utcnow().isoformat(timespec="seconds"),
            "repo": str(repo),
            "git": git_info(repo),
            "scope": {"literal": SCOPE_LITERAL, "glob": SCOPE_GLOB},
            "missing_scope_entries": missing,
            "skipped_symlinks": skipped,
            "files": len(files),
            "bytes_uncompressed": total_bytes,
            "bundle_bytes": bundle_tmp.stat().st_size,
            "bundle_sha256": sha256_file(bundle_tmp),
            "manifest_sha256": manifest_sha,
            "content_id": manifest_sha,
            "retention_policy": RETENTION,
        }
        (tmp_dir / "meta.json").write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n")
        os.rename(tmp_dir, final_dir)
        (base / "LATEST").write_text(sid + "\n")
        dt = time.time() - t0
        log(f"snapshot {sid}: files={len(files)} bytes={total_bytes} bundle={meta['bundle_bytes']} content_id={manifest_sha[:12]} in {dt:.2f}s")
        if missing:
            log(f"WARN: missing optional scope entries: {missing}")
        if skipped:
            log(f"WARN: skipped symlinks (not backed up): {skipped}")
        if args.prune:
            return prune_all(args, quiet=True)
        return 0


def resolve_snapshot(args: argparse.Namespace, ref: str) -> Path | None:
    base = snaps_root(args)
    if ref == "LATEST":
        lp = base / "LATEST"
        if lp.is_file():
            ref = lp.read_text().strip()
        else:
            return None
    cand = base / ref
    if cand.is_dir() and (cand / "meta.json").is_file():
        return cand
    for snap in list_snapshots(args):
        if read_meta(snap).get("content_id", "").startswith(ref):
            return snap
    return None


def verify_snapshot(args: argparse.Namespace, snap: Path, workdir: Path | None = None) -> tuple[bool, str]:
    meta = read_meta(snap)
    bundle = snap / "bundle.tar.gz"
    if not bundle.is_file():
        return False, "missing bundle.tar.gz"
    if sha256_file(bundle) != meta["bundle_sha256"]:
        return False, "bundle digest mismatch vs meta.json"
    extracted = workdir or Path(tempfile.mkdtemp(prefix="aid-verify-"))
    extracted.mkdir(parents=True, exist_ok=True)
    with tarfile.open(bundle) as tar:
        tar.extractall(extracted, filter="data")
    ok, bad = True, []
    for line in (snap / "manifest.sha256").read_text().splitlines():
        if not line.strip():
            continue
        digest, rel = line.split("  ", 1)
        fp = extracted / rel
        if not fp.is_file() or sha256_file(fp) != digest:
            ok = False
            bad.append(rel)
    if workdir is None:
        shutil.rmtree(extracted, ignore_errors=True)
    return ok, ("all %d files match manifest" % meta["files"]) if ok else "digest mismatch: %s" % bad


def cmd_verify(args: argparse.Namespace) -> int:
    snap = resolve_snapshot(args, args.snapshot)
    if snap is None:
        log(f"FATAL: snapshot not found: {args.snapshot}")
        return 1
    log(f"verifying {snap.name} ...")
    ok, detail = verify_snapshot(args, snap)
    log(("OK: " if ok else "FAIL: ") + detail)
    print(json.dumps({"snapshot": snap.name, "verified": ok, "detail": detail}, indent=2))
    return 0 if ok else 1


def cmd_restore(args: argparse.Namespace) -> int:
    snap = resolve_snapshot(args, args.snapshot)
    if snap is None:
        log(f"FATAL: snapshot not found: {args.snapshot}")
        return 1
    target = Path(args.target).resolve()
    log(f"restore {snap.name} -> {target}")
    ok, detail = verify_snapshot(args, snap)
    if not ok:
        log(f"FATAL: snapshot failed verification, refusing restore: {detail}")
        return 1
    log(f"pre-restore verify OK ({detail})")
    target.mkdir(parents=True, exist_ok=True)
    overlap: list[str] = []
    for line in (snap / "manifest.sha256").read_text().splitlines():
        if not line.strip():
            continue
        _, rel = line.split("  ", 1)
        if (target / rel).exists():
            overlap.append(rel)
    if overlap and not args.force_overwrite:
        log(f"FATAL: target already contains {len(overlap)} overlapping file(s), pass --force-overwrite (sample: {overlap[:5]})")
        return 1
    if overlap:
        bdir = target / f".pre-restore-backup-{utcnow().strftime('%Y%m%dT%H%M%SZ')}"
        for rel in overlap:
            src = target / rel
            dst = bdir / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        log(f"backed up {len(overlap)} pre-existing file(s) to {bdir}")
    with tarfile.open(snap / "bundle.tar.gz") as tar:
        tar.extractall(target, filter="data")
    bad: list[str] = []
    for line in (snap / "manifest.sha256").read_text().splitlines():
        if not line.strip():
            continue
        digest, rel = line.split("  ", 1)
        fp = target / rel
        if not fp.is_file() or sha256_file(fp) != digest:
            bad.append(rel)
    if bad:
        log(f"FATAL: post-restore verification failed: {bad}")
        return 1
    meta = read_meta(snap)
    log(f"restore complete: {meta['files']} files verified byte-identical to manifest {meta['content_id'][:12]}")
    return 0


def usage_bytes(args: argparse.Namespace) -> int:
    total = 0
    base = snaps_root(args)
    if not base.is_dir():
        return 0
    for dirpath, _dirnames, filenames in os.walk(base):
        for name in filenames:
            fp = Path(dirpath) / name
            try:
                total += fp.stat().st_size
            except OSError:
                pass
    return total


def retention_keep_set(snaps: list[Path]) -> set[str]:
    keep: set[str] = set()
    metas = [(s.name, read_meta(s)) for s in snaps]
    if not metas:
        return keep
    newest = max(metas, key=lambda x: x[0])[0]
    keep.add(newest)
    by_hour = sorted((n for n, _ in metas), reverse=True)
    keep.update(by_hour[: RETENTION["hourly_keep"]])
    def newest_per(keyfn) -> list[str]:
        buckets: dict[str, str] = {}
        for name, meta in metas:
            dt = datetime.fromisoformat(meta["created_at"])
            k = keyfn(dt)
            if k not in buckets or name > buckets[k]:
                buckets[k] = name
        return sorted(buckets.values())
    days = newest_per(lambda d: d.strftime("%Y-%m-%d"))
    keep.update(sorted(days, reverse=True)[: RETENTION["daily_keep"]])
    weeks = newest_per(lambda d: f"{d.isocalendar().year}-W{d.isocalendar().week:02d}")
    keep.update(sorted(weeks, reverse=True)[: RETENTION["weekly_keep"]])
    months = newest_per(lambda d: d.strftime("%Y-%m"))
    keep.update(sorted(months, reverse=True)[: RETENTION["monthly_keep"]])
    return keep


def prune_all(args: argparse.Namespace, quiet: bool = False) -> int:
    snaps = list_snapshots(args)
    if not snaps:
        if not quiet:
            log("nothing to prune (no snapshots)")
        return 0
    keep = retention_keep_set(snaps)
    now = time.time()
    removed: list[str] = []
    freed = 0
    for snap in snaps:
        if snap.name in keep:
            continue
        age = now - snap.stat().st_mtime
        if age < RETENTION["min_age_seconds_before_prune"]:
            continue
        size = sum(f.stat().st_size for f in snap.rglob("*") if f.is_file())
        shutil.rmtree(snap)
        removed.append(snap.name)
        freed += size
    used = usage_bytes(args)
    hard = RETENTION["budget_hard_mib"] * 1024 * 1024
    soft = RETENTION["budget_soft_mib"] * 1024 * 1024
    rc = 0
    over_hard = used > hard
    if over_hard:
        remaining = sorted(list_snapshots(args), key=lambda s: s.name)
        for snap in remaining[:-1]:
            if used <= hard:
                break
            size = sum(f.stat().st_size for f in snap.rglob("*") if f.is_file())
            shutil.rmtree(snap)
            removed.append(snap.name)
            freed += size
            used -= size
        if used > hard:
            log(f"ALARM: usage {used} > hard cap {hard} after emergency prune")
            rc = 2
    if not quiet:
        log(f"prune: kept={len(keep)} removed={len(removed)} freed={freed} bytes; usage={used} soft={soft} hard={hard}")
    elif removed or over_hard:
        log(f"prune (post-snapshot): removed={len(removed)} freed={freed} bytes; usage={used}")
    return rc


def cmd_status(args: argparse.Namespace) -> int:
    snaps = list_snapshots(args)
    used = usage_bytes(args)
    soft = RETENTION["budget_soft_mib"] * 1024 * 1024
    hard = RETENTION["budget_hard_mib"] * 1024 * 1024
    pct = round(100.0 * used / soft, 2)
    last_age = None
    last = None
    if snaps:
        last = snaps[-1].name
        last_age = round(time.time() - snaps[-1].stat().st_mtime, 1)
    report = {
        "snapshot_root": str(snaps_root(args)),
        "snapshots": len(snaps),
        "newest": last,
        "newest_age_seconds": last_age,
        "bytes": used,
        "mib": round(used / (1 << 20), 2),
        "soft_cap_mib": RETENTION["budget_soft_mib"],
        "hard_cap_mib": RETENTION["budget_hard_mib"],
        "pct_of_soft": pct,
        "alert": pct >= RETENTION["budget_alert_pct"] or used > hard,
        "retention": RETENTION,
    }
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        log(f"status: {report['snapshots']} snapshots, {report['mib']} MiB ({pct}% of soft cap {RETENTION['budget_soft_mib']} MiB), newest={last} (age {last_age}s) alert={report['alert']}")
    return 2 if report["alert"] else 0


def cmd_drill(args: argparse.Namespace) -> int:
    """End-to-end restore drill: snapshot -> tamper sandbox -> restore -> verify + negative test."""
    drills_dir = root_from(args) / "drills"
    drills_dir.mkdir(parents=True, exist_ok=True)
    drill_id = utcnow().strftime("%Y%m%dT%H%M%SZ")
    log_path = drills_dir / f"DRILL-{drill_id}.log"
    repo = Path(args.repo).resolve()
    import io
    import contextlib

    buf = io.StringIO()
    rc = 1
    with contextlib.redirect_stdout(buf):
        rc = run_drill(args, repo, drill_id)
    out = buf.getvalue()
    log_path.write_text(out)
    print(out)
    log(f"drill log saved: {log_path}")
    return rc


def run_drill(args: argparse.Namespace, repo: Path, drill_id: str) -> int:
    log(f"DRILL {drill_id}: canonical-state restore drill starting (repo={repo})")
    snap_rc = cmd_snapshot(argparse.Namespace(**{**vars(args), "prune": False}))
    if snap_rc != 0:
        log("DRILL FAIL: could not take snapshot")
        return 1
    snap = resolve_snapshot(args, "LATEST")
    if snap is None:
        log("DRILL FAIL: LATEST missing")
        return 1
    log(f"DRILL: using snapshot {snap.name}")

    sandbox = Path(tempfile.mkdtemp(prefix=f"aid-drill-{drill_id}-"))
    ok, detail = verify_snapshot(args, snap)
    log(f"DRILL step1 verify-in-place: {'OK' if ok else 'FAIL'} ({detail})")
    if not ok:
        return 1

    log("DRILL step2 sha256sum -c compatibility (external tool receipt):")
    verify_dir = sandbox / "verify"
    verify_dir.mkdir(parents=True)
    with tarfile.open(snap / "bundle.tar.gz") as tar:
        tar.extractall(verify_dir, filter="data")
    proc = subprocess.run(
        ["sha256sum", "-c", str(snap / "manifest.sha256")],
        cwd=verify_dir, capture_output=True, text=True,
    )
    tail = proc.stdout.strip().splitlines()
    for line in tail[:3] + (["... %d lines total" % len(tail)] if len(tail) > 3 else []):
        log("  " + line)
    if proc.returncode != 0:
        log("DRILL FAIL: sha256sum -c mismatch")
        return 1

    log("DRILL step3 disaster simulation: tamper restored copy of learner/learning_state.yaml")
    victim = verify_dir / "learner" / "learning_state.yaml"
    original = victim.read_bytes()
    victim.write_bytes(original + b"\n# tampered\n")
    proc2 = subprocess.run(
        ["sha256sum", "-c", str(snap / "manifest.sha256")],
        cwd=verify_dir, capture_output=True, text=True,
    )
    tamper_detected = proc2.returncode != 0
    bad_line = next((l for l in proc2.stdout.splitlines() if "FAILED" in l or "FAILED" in l.upper()), "")
    log(f"  tamper detection: {'OK (verify FAILED as expected)' if tamper_detected else 'FAIL (verify passed tampered data!)'} {bad_line}")
    victim.write_bytes(original)
    if not tamper_detected:
        return 1

    log("DRILL step4 restore into clean sandbox + post-restore verification")
    target = sandbox / "restored"
    rc = cmd_restore(argparse.Namespace(**{**vars(args), "snapshot": snap.name, "target": str(target), "force_overwrite": False}))
    if rc != 0:
        log("DRILL FAIL: restore step failed")
        return 1

    log("DRILL step5 byte-diff restored vs live canonical files")
    diffs = 0
    for line in (snap / "manifest.sha256").read_text().splitlines():
        if not line.strip():
            continue
        _digest, rel = line.split("  ", 1)
        live = repo / rel
        restored = target / rel
        if not live.is_file():
            log(f"  WARN live missing (snapshot-only): {rel}")
            continue
        if sha256_file(live) != sha256_file(restored):
            diffs += 1
            log(f"  DIFF {rel}")
    log(f"  diff result: {diffs} differing file(s) vs live (0 expected right after snapshot)")
    if diffs:
        return 1

    shutil.rmtree(sandbox, ignore_errors=True)
    log(f"DRILL {drill_id}: PASS — verify, tamper-detection, restore and byte-diff all OK")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--root", help=f"snapshot root (default {SNAPSHOT_ROOT_DEFAULT}, env AID_SNAPSHOT_ROOT)")
    p.add_argument("--repo", default=str(REPO_DEFAULT), help="path to the aidevschool repo working tree")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("snapshot", help="take a snapshot now").add_argument("--prune", action="store_true", help="apply retention after snapshot")
    v = sub.add_parser("verify", help="verify a snapshot (bundle digest + manifest)")
    v.add_argument("snapshot", help="snapshot id, content-id prefix, or LATEST")
    r = sub.add_parser("restore", help="verify + extract a snapshot to a target dir")
    r.add_argument("snapshot")
    r.add_argument("--target", required=True)
    r.add_argument("--force-overwrite", action="store_true")
    sub.add_parser("prune", help="apply retention policy")
    s = sub.add_parser("status", help="budget + inventory report (for the hourly sweep)")
    s.add_argument("--json", action="store_true")
    d = sub.add_parser("drill", help="run full restore drill and save receipt log")
    d.add_argument("--log-copy", default=None, help="also copy drill log here")

    args = p.parse_args()
    rc = {
        "snapshot": cmd_snapshot,
        "verify": cmd_verify,
        "restore": cmd_restore,
        "prune": lambda a: prune_all(a, quiet=False),
        "status": cmd_status,
        "drill": cmd_drill,
    }[args.cmd](args)
    if args.cmd == "drill" and getattr(args, "log_copy", None):
        drills_dir = root_from(args) / "drills"
        latest = max(drills_dir.glob("DRILL-*.log"), key=lambda p_: p_.name)
        shutil.copy2(latest, args.log_copy)
    return rc


if __name__ == "__main__":
    sys.exit(main())
