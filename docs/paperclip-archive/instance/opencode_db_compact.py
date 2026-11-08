#!/usr/bin/env python3
"""opencode.db maintenance — AID-3012 #1 (runbook companion).

Usage:
  opencode_db_compact.py --backup            # online backup + sha256 + integrity_check
  opencode_db_compact.py --compact [--prune-days 7] [--force]
      Prunes event/part/message/todo/session rows of sessions older than --prune-days,
      then VACUUM + wal_checkpoint(TRUNCATE). Safety: refuses to run unless the db is
      quiet (no OTHER session updated <5 min AND max(event.id) stable for 60s) unless
      --force is given (board-restart pause, AID-2984). A fresh verified backup
      (<24h) is required and enforced. AID-3025: the whole estimated write phase
      [start, start+WRITE_BUDGET_S] must avoid the forbidden minute schedule below
      (smoke bursts :00/:20/:40, monitor cluster :00-:16, agent tick :30), and
      quietness+window are re-checked immediately BEFORE VACUUM; on re-check failure
      the prune is kept (already committed) and VACUUM is skipped (exit 5).
  opencode_db_compact.py --verify            # integrity_check + counts + sizes receipt
  opencode_db_compact.py --check-window      # is now inside a safe window? + next slot
"""
import argparse, hashlib, json, os, sqlite3, subprocess, sys, time

DB = "/paperclip/.local/share/opencode/opencode.db"
BK = "/paperclip/storage/opencode-db/backups"
LOCK = "/paperclip/instances/default/tmp/opencode-db-compaction.lock"
KEEP_BACKUPS = 2
QUIET_MIN = 30

# AID-3025 (incident AID-3023): the guard must ensure the estimated start+end of
# the EXCLUSIVE-WRITE phase crosses no smoke burst and no known scheduled agent
# tick — not just the opening minute. Guard passed :28 on window #1 and the
# prune+VACUUM crossed :30 -> 4 adapter_failed runs, 2 agents in error.
SMOKE_BURSTS = (0, 20, 40)    # zai-beta-tunnel smoke monitor bursts (20-min cadence)
SMOKE_TAIL_MIN = 2            # observed burst duration ~1-2 min (COMPACTION-LOG #1)
AGENT_TICKS = (30,)           # SDLC Scrum hourly tick + QA recovery dispatch
TICK_TAIL_MIN = 2             # tick + dispatch runtime observed ~1-2 min
MONITOR_CLUSTER = (0, 17)     # hourly monitor ticks :11/:15/:16 + runtime -> :00-:16
WRITE_BUDGET_S = 480          # prune (~2 min observed) + VACUUM (55 s obs., 2-6 min est.)
VACUUM_BUDGET_S = 360         # worst-case VACUUM alone, for the pre-VACUUM re-check
QUIET_RECHECK_S = 15          # short quiet probe right before VACUUM


def human(n):
    return f"{n/1e9:.2f}GB" if n > 1e9 else f"{n/1e6:.0f}MB"


def connect(uri=True, path=DB):
    return sqlite3.connect(f"file:{path}?mode=ro" if uri else path, uri=uri, timeout=30)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def latest_backup():
    if not os.path.exists(f"{BK}/LATEST"):
        return None
    p = open(f"{BK}/LATEST").read().strip()
    return p if p and os.path.exists(p) else None


def backup_fresh(p):
    if not p:
        return False
    meta_p = p.replace(".db", ".meta.json")
    if not os.path.exists(meta_p):
        return False
    meta = json.load(open(meta_p))
    age_h = (time.time() - os.path.getmtime(p)) / 3600
    return age_h < 24 and meta.get("integrity") == "ok"


def do_backup():
    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    dst = f"{BK}/opencode-{ts}.db"
    src = connect(); out = sqlite3.connect(dst)
    t0 = time.time(); src.backup(out); out.close()
    ic = connect(path=dst).execute("PRAGMA integrity_check").fetchone()[0]
    src.close()
    meta = {"file": dst, "size_bytes": os.path.getsize(dst), "sha256": sha256(dst),
            "integrity": ic, "taken_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "elapsed_s": round(time.time() - t0, 1), "source": DB}
    json.dump(meta, open(f"{BK}/opencode-{ts}.meta.json", "w"), indent=1)
    open(f"{BK}/LATEST", "w").write(dst)
    rotate()
    print(json.dumps({k: meta[k] for k in ("file", "size_bytes", "integrity", "elapsed_s")}))
    return meta


def rotate():
    dbs = sorted(d for d in os.listdir(BK) if d.endswith(".db"))
    for old in dbs[:-KEEP_BACKUPS]:
        print(f"rotate: rm {old}")
        os.remove(f"{BK}/{old}")
        mp = f"{BK}/{old[:-3]}.meta.json"
        os.path.exists(mp) and os.remove(mp)


def is_quiet():
    # Refined AID-3012 criteria (validated 2026-09-26T23:18Z): hourly monitor ticks
    # create sessions every hour, so "no sessions created <30min" never passes.
    # Quiet = no OTHER agent mid-write: sessions with time_updated <5min must be
    # <=1 (our own current run) AND max(event.id) stable across the idle probe
    # (our session writes nothing during a tool call — verified empirically).
    return probe_quiet(60)


def probe_quiet(seconds):
    con = connect()
    now = int(time.time() * 1000)
    active = con.execute("select count(*) from session where time_updated > ?",
                         (now - 300000,)).fetchone()[0]
    maxid1 = con.execute("select max(id) from event").fetchone()[0]
    con.close()
    time.sleep(seconds)
    con = connect()
    maxid2 = con.execute("select max(id) from event").fetchone()[0]
    con.close()
    return active <= 1 and maxid1 == maxid2, active, maxid1, maxid2


def forbidden_intervals():
    """(start_min, end_min, reason) — minute-of-hour intervals in which no part
    of the exclusive-write phase may fall. Extend AGENT_TICKS as new scheduled
    agent ticks are mapped (keep AID-3025 guard total: :00/:20/:40 + :30)."""
    ivs = [(MONITOR_CLUSTER[0], MONITOR_CLUSTER[1],
            "hourly monitor tick cluster :00-:16 (:11/:15/:16 + runtime)")]
    for m in SMOKE_BURSTS:
        ivs.append((m, m + 1 + SMOKE_TAIL_MIN, f"smoke burst :{m:02d} (zai-beta-tunnel)"))
    for m in AGENT_TICKS:
        ivs.append((m, m + 1 + TICK_TAIL_MIN, f"agent tick :{m:02d} (SDLC Scrum + QA dispatch)"))
    return sorted(ivs)


def window_violation(epoch_s, budget_s):
    """None if [epoch_s, epoch_s+budget_s] crosses no forbidden minute, else why.
    Checks every minute-of-hour touched by the interval, across hour wrap."""
    t0 = int(epoch_s) // 60
    t1 = int(epoch_s + budget_s) // 60
    for mk in range(t0, t1 + 1):
        moh = mk % 60
        for a, b, why in forbidden_intervals():
            if a <= moh < b:
                return f"minute :{moh:02d} inside {why}"
    return None


def next_slot(after_epoch_s, budget_s=WRITE_BUDGET_S, horizon_h=2):
    t = after_epoch_s
    while t <= after_epoch_s + horizon_h * 3600:
        if window_violation(t, budget_s) is None:
            return (int(t) // 60) * 60
        t = (int(t) // 60 + 1) * 60
    return None


def do_compact(prune_days, force):
    if not backup_fresh(latest_backup()):
        print("REFUSED: no verified backup <24h. Run --backup first."); sys.exit(2)
    if not force:
        quiet, active, m1, m2 = is_quiet()
        if not quiet:
            print(f"REFUSED: db not quiet (active_sessions={active} event_id {m1}->{m2}). "
                  "Use --force only inside an approved restart window (AID-2984)."); sys.exit(3)
    else:
        print("WARNING: --force given; skipping quietness check (approved restart window only).")
    # AID-3025: crossing-aware window guard — the estimated write phase
    # [now, now+WRITE_BUDGET_S] must not touch smoke bursts (:00/:20/:40), the
    # monitor cluster (:00-:16) or known agent ticks (:30). Runs AFTER the 60s
    # quiet probe so it uses the real write-start minute, not a stale one.
    viol = window_violation(time.time(), WRITE_BUDGET_S)
    if viol:
        ns = next_slot(time.time())
        ns_s = time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime(ns)) if ns else "none within 2h"
        print(f"REFUSED: estimated write phase ({WRITE_BUDGET_S}s) crosses {viol}. "
              f"Next safe slot: {ns_s}")
        sys.exit(4)
    cutoff = int(time.time() * 1000) - prune_days * 86400000
    con = sqlite3.connect(DB, timeout=30)
    cur = con.cursor()
    before = os.path.getsize(DB)
    old_sessions = [r[0] for r in cur.execute("select id from session where time_created < ?", (cutoff,))]
    q = "delete from {} where {}".format("{}", "{}")
    n_ev = cur.execute("delete from event where aggregate_id in (%s)" % ",".join("?" * len(old_sessions)), old_sessions).rowcount if old_sessions else 0
    n_pt = cur.execute("delete from part where session_id in (%s)" % ",".join("?" * len(old_sessions)), old_sessions).rowcount if old_sessions else 0
    n_ms = cur.execute("delete from message where session_id in (%s)" % ",".join("?" * len(old_sessions)), old_sessions).rowcount if old_sessions else 0
    n_ss = cur.execute("delete from session where id in (%s)" % ",".join("?" * len(old_sessions)), old_sessions).rowcount if old_sessions else 0
    con.commit()
    # AID-3025 deliverable 2: the prune may have consumed minutes and the
    # pre-write state is stale — re-check quietness AND the window immediately
    # BEFORE issuing VACUUM. On failure the prune stays committed (deletes are
    # safe; only space is unreclaimed) and VACUUM is deferred to a later run.
    if not force:
        quiet, active, m1, m2 = probe_quiet(QUIET_RECHECK_S)
        viol = window_violation(time.time(), VACUUM_BUDGET_S)
        if not quiet or viol:
            why = f"window: {viol}" if viol else f"not quiet (active={active} event_id {m1}->{m2})"
            print(f"VACUUM SKIPPED: {why}. Prune committed and safe; rerun --compact in a "
                  "safe slot to reclaim space. Exit 5.")
            sys.exit(5)
    t0 = time.time(); print("VACUUM start %s" % time.strftime("%H:%M:%S", time.gmtime()))
    cur.execute("VACUUM")
    cur.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    con.commit(); con.close()
    after = os.path.getsize(DB)
    print(json.dumps({"pruned_sessions": n_ss, "pruned_messages": n_ms, "pruned_parts": n_pt,
                      "pruned_events": n_ev, "before": before, "after": after,
                      "recovered_bytes": before - after, "vacuum_s": round(time.time() - t0, 1)}))


def do_verify():
    con = connect()
    ic = con.execute("PRAGMA integrity_check").fetchone()[0]
    counts = {t: con.execute(f"select count(*) from {t}").fetchone()[0]
              for t in ("session", "message", "part", "event")}
    con.close()
    b = latest_backup()
    print(json.dumps({"integrity": ic, "counts": counts, "db_bytes": os.path.getsize(DB),
                      "latest_backup": b, "backup_fresh": backup_fresh(b)}))


def do_check_window():
    t = time.time()
    viol = window_violation(t, WRITE_BUDGET_S)
    ns = next_slot(t)
    print(json.dumps({
        "now_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t)),
        "allowed": viol is None,
        "violation": viol,
        "write_budget_s": WRITE_BUDGET_S,
        "vacuum_budget_s": VACUUM_BUDGET_S,
        "forbidden": [f":{a:02d}-:{b - 1:02d} {why}" for a, b, why in forbidden_intervals()],
        "next_safe_slot_utc": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime(ns)) if ns else None,
    }))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--backup", action="store_true")
    ap.add_argument("--compact", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--check-window", action="store_true")
    ap.add_argument("--prune-days", type=int, default=7)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    os.makedirs(BK, exist_ok=True)
    if a.backup:
        do_backup()
    elif a.compact:
        do_compact(a.prune_days, a.force)
    elif a.verify:
        do_verify()
    elif a.check_window:
        do_check_window()
    else:
        ap.print_help()
