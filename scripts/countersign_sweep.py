#!/usr/bin/env python3
"""countersign-sweep — proactive ~hourly deletion detector for Countersign citations.

AID-5243 (follow-up AID-5235 item 4; deviation §11 ratified in AID-5241/A3).

The countersign-gate detects citation deletion LAZILY: only when the gate
re-runs on the same head (new push or a merge attempt through the single
door). That covers the merge path but leaves a gap: an ABANDONED open PR
with a stale green check whose citations get deleted is never re-evaluated.
This sweep closes that gap with proactive ~hourly sampling:

  1. for every OPEN PR, snapshot the ids of comments carrying a canonical
     'Countersign: <AID|GH>-<n> verdict <ref> [head=<40-hex>]' line
     (same CITATION_RE as the gate — single source of truth, no drift;
     code-fenced lines are documentation, never citations, AID-2824);
  2. when a snapshotted citation comment disappears from the conversation,
     post a DELETION ALERT comment on the PR + a ::error annotation;
  3. snapshot state lives in the GitHub Actions cache ONLY — never a repo
     commit (the workflow restores/saves it around this script);
  4. this is post-hoc DETECTION, not enforcement: it does not replace or
     relax the countersign-gate, and its alert comments carry no
     'Countersign:'/'Provenance:' operative lines (a quoted citation is
     fenced, and never becomes the operative citation — AID-2824 doctrine).

Fail-safe doctrine (mirrors the gate's fail-closed stance where it matters):
  - NO previous snapshot (first run, cache eviction, corrupt/wrong-schema
    file): re-baseline silently — never alert from an absent baseline;
  - transport/parse failure on ANY PR: fail CLOSED (rc 2) — snapshot is
    left untouched, no alerts, no snapshot shrink;
  - a suspected deletion is CONFIRMED by a second independent fetch of the
    PR conversation before any alert is posted (pagination-glitch guard);
    unconfirmable -> rc 2 with the previous snapshot preserved;
  - alert posting is idempotent (marker per deleted comment id scanned in
    the live conversation) and the snapshot is persisted after EACH post;
  - a newer citation does not launder a deletion; deletion records stay in
    the snapshot for the life of the PR (audit trail), but each deleted
    comment id alerts exactly once.

Usage:
  countersign_sweep.py --self-test
  countersign_sweep.py --run --snapshot-file PATH [--repo owner/name]
                       [--only-pr N] [--dry-run]

Exit: 0 clean sweep (no NEW alerts posted) · 1 new deletion alerts posted
(the scheduled run reddens — an honest detector signal, not a gate) ·
2 fail-closed (environment/transport/unconfirmed deletion; snapshot
untouched).
"""

import argparse
import glob
import json
import os
import re
import sys
import tempfile
import time

# Single source of truth: citation grammar, fence stripping, gh plumbing and
# concatenated-JSON pagination decoding are the gate's own (no drift; the
# receipt canon already cross-imports from the gate the same way).
from countersign_gate_check import (  # noqa: E402
    CITATION_RE,
    PROVENANCE_RE,
    annotate,
    decode_concat_json,
    gh_output,
    repo_slug,
    strip_code_fences,
)

SNAPSHOT_SCHEMA = "countersign-sweep.snapshot/1"
ALERT_MARKER_RE = re.compile(
    r"^countersign-sweep-deletion-alert comment=([0-9]+)\s*$", re.MULTILINE
)


# ---------------------------------------------------------------------------
# Pure core — compute_next(prev, observed, now) ->
#                 (next_snapshot, alerts, uncertain_prs, deletion_candidates)
# ---------------------------------------------------------------------------

def citations_of(comment):
    """Canonical citation lines in one comment body (fence-stripped)."""
    body = strip_code_fences(comment.get("body") or "")
    return [m.group(0).strip() for m in CITATION_RE.finditer(body)]


def load_prev(raw_text):
    """Parse a previous snapshot; ANY defect -> None (re-baseline fail-safe)."""
    if not raw_text:
        return None
    try:
        doc = json.loads(raw_text)
    except ValueError:
        return None
    if not isinstance(doc, dict) or doc.get("schema") != SNAPSHOT_SCHEMA:
        return None
    prs = doc.get("prs")
    if not isinstance(prs, dict):
        return None
    for entry in prs.values():
        if not isinstance(entry, dict) or not isinstance(entry.get("citations"), dict):
            return None
        for field in ("deleted", "alerted"):
            if not isinstance(entry.get(field, []), list):
                return None
    return doc


def compute_next(prev, observed, now):
    """Diff one observation against the previous snapshot.

    prev      previous snapshot doc (validated) or None (baseline run)
    observed  {"prs": {"<n>": {"head": 40hex, "comments": [comment, ...]}},
               optional "_confirmed_deletions": {"<n>": set(ids)}} — OPEN PRs
              only, comments in any order
    now       ISO timestamp stamped on the new snapshot

    Returns (next_snapshot, alerts, uncertain_prs, deletion_candidates):
      alerts              [{"pr","commentId","citation","createdAt","author",
                            "firstSeenAt","head"}] — CONFIRMED NEW deletions
      uncertain_prs       PRs whose prev entry is kept verbatim because a
                          deletion candidate could not be confirmed (live
                          mode -> fail-closed, rc 2)
      deletion_candidates {pr: set(comment ids)} — every id that vanished,
                          BEFORE confirmation (drives the double-read)
    """
    prev_prs = (prev or {}).get("prs") or {}
    obs_prs = (observed or {}).get("prs") or {}
    confirmed = observed.get("_confirmed_deletions") or {}
    next_prs, alerts, uncertain, candidates = {}, [], [], {}

    for pr, obs in sorted(obs_prs.items(), key=lambda kv: int(kv[0])):
        head = (obs.get("head") or "").strip()
        current = {}
        for c in obs.get("comments") or []:
            for line in citations_of(c):
                current[str(c.get("id"))] = {
                    "createdAt": c.get("createdAt") or c.get("created_at") or "",
                    "citation": line,
                    "author": ((c.get("user") or {}).get("login")
                               or c.get("author") or ""),
                }
        pentry = prev_prs.get(pr)
        if pentry is None:
            # First sighting: baseline — never alert from an absent baseline.
            next_prs[pr] = {"head": head, "citations": current,
                            "deleted": [], "alerted": [], "firstSeenAt": now}
            continue

        pcites = {str(k): dict(v) for k, v in
                  (pentry.get("citations") or {}).items()}
        deleted = list(pentry.get("deleted") or [])
        alerted = list(pentry.get("alerted") or [])
        first_seen = pentry.get("firstSeenAt") or now

        gone = {cid for cid in pcites if cid not in current}
        if gone:
            candidates[pr] = set(gone)
            if not ((confirmed.get(pr) or set()) >= gone):
                # Deletion not (yet) confirmed by the caller's second read:
                # keep the previous entry verbatim, alert nothing.
                uncertain.append(pr)
                next_prs[pr] = dict(pentry)
                continue
            for cid in sorted(gone):
                rec = dict(pcites[cid])
                rec.update({"commentId": cid, "detectedAt": now, "head": head})
                deleted.append(rec)
                if cid not in alerted:
                    alerted.append(cid)
                # A popped id cannot re-enter `gone` on later sweeps, so
                # each confirmed deletion alerts exactly once.
                alerts.append({"pr": pr, "commentId": cid,
                               "citation": rec.get("citation", ""),
                               "createdAt": rec.get("createdAt", ""),
                               "author": rec.get("author", ""),
                               "firstSeenAt": first_seen, "head": head})
            for cid in gone:
                pcites.pop(cid, None)

        # New citations join the snapshot; recorded deletions persist (a
        # newer citation does not launder a deletion — audit trail stays).
        merged = dict(pcites)
        merged.update(current)
        next_prs[pr] = {"head": head, "citations": merged,
                        "deleted": deleted, "alerted": alerted,
                        "firstSeenAt": first_seen}

    # PRs in prev but not observed: closed/merged between sweeps — out of
    # the sweep's open-PR scope (the gate's merged-PR audit owns those).
    return ({"schema": SNAPSHOT_SCHEMA, "updatedAt": now, "prs": next_prs},
            alerts, uncertain, candidates)


def alert_body(alert, snapshot_at):
    """DELETION ALERT comment body — fence-safe by construction.

    The deleted citation is quoted ONLY inside a code fence (AID-2824:
    a fenced line is documentation, never an operative citation), and the
    body carries NO 'Provenance:' trailer (it must not shift the gate's §5
    producer attribution nor ever read as a countersign). The marker line
    makes alert posting idempotent.
    """
    cite = (alert.get("citation") or "").strip()
    return (
        "**Countersign Sweep — DELETION ALERT (AID-5243 · incident class "
        "AID-5233)**\n\n"
        "The citation comment below was recorded in the sweep snapshot for "
        "this PR and is no longer present in the conversation. Citations "
        "cannot be deleted after the fact; a newer citation does not launder "
        "a deletion (countersign-gate §11).\n\n"
        "- comment id: `%s`\n"
        "- posted at: `%s`\n"
        "- sweep first saw it: `%s`\n"
        "- recorded head: `%s`\n"
        "\n"
        "countersign-sweep-deletion-alert comment=%s\n"
        "\n"
        "Recorded citation (quoted in a fence — documentation, not "
        "operative):\n\n"
        "```\n%s\n```\n\n"
        "Disposition the incident on the board; if this PR still needs a "
        "countersign, post a FRESH independent one.\n\n"
        "— countersign-sweep (proactive post-hoc detector; does not replace "
        "the countersign-gate)\n"
        % (alert.get("commentId"), alert.get("createdAt") or "unknown",
           alert.get("firstSeenAt") or snapshot_at, alert.get("head") or "",
           alert.get("commentId"), cite)
    )


# ---------------------------------------------------------------------------
# Live observation (gh CLI) + run mode
# ---------------------------------------------------------------------------

def list_open_prs(slug, only_pr=None):
    if only_pr is not None:
        raw = gh_output(["gh", "pr", "view", str(only_pr), "--repo", slug,
                         "--json", "number,state,headRefOid"])
        doc = json.loads(raw)
        if not isinstance(doc, dict) or doc.get("state") != "OPEN":
            return []
        return [(str(doc["number"]), doc.get("headRefOid") or "")]
    raw = gh_output(["gh", "pr", "list", "--repo", slug, "--state", "open",
                     "--limit", "500", "--json", "number,headRefOid"])
    docs = json.loads(raw)
    if not isinstance(docs, list):
        raise RuntimeError("gh pr list returned %s, not a list"
                           % type(docs).__name__)
    return [(str(d["number"]), d.get("headRefOid") or "") for d in docs
            if isinstance(d, dict) and d.get("number")]


def fetch_pr_comments(slug, pr):
    raw = gh_output(["gh", "api", "repos/%s/issues/%s/comments" % (slug, pr),
                     "--paginate"])
    comments = decode_concat_json(raw)
    if not isinstance(comments, list):
        raise RuntimeError("comments for PR %s parsed as %s, not a list"
                           % (pr, type(comments).__name__))
    return comments


def atomic_write(path, text):
    d = os.path.dirname(os.path.abspath(path)) or "."
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".sweep-snap-", suffix=".json")
    try:
        with os.fdopen(fd, "w") as fh:
            fh.write(text)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def run_sweep(args):
    slug = args.repo or repo_slug()
    if not slug:
        annotate("error", "countersign-sweep: no repository slug "
                          "(GITHUB_REPOSITORY unset and origin unresolvable)")
        return 2
    if not (os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")):
        annotate("error", "countersign-sweep: GH_TOKEN/GITHUB_TOKEN unset")
        return 2

    try:
        prev_text = None
        if os.path.exists(args.snapshot_file):
            with open(args.snapshot_file) as fh:
                prev_text = fh.read()
        prev = load_prev(prev_text)
        rebaselined = prev_text is not None and prev is None

        observed = {"prs": {}}
        for pr, head in list_open_prs(slug, args.only_pr):
            observed["prs"][pr] = {"head": head,
                                   "comments": fetch_pr_comments(slug, pr)}

        # Pass 1 — pure diff to surface deletion candidates (no alerts).
        _, _, _, candidates = compute_next(prev, observed, "")

        # Pass 2 — confirm each candidate with a SECOND independent fetch
        # of that PR's conversation (pagination-glitch guard).
        confirmed = {}
        for pr, ids in sorted(candidates.items()):
            recheck = {str(c.get("id"))
                       for c in fetch_pr_comments(slug, pr)}
            if not (ids & recheck):
                confirmed[pr] = ids
        observed["_confirmed_deletions"] = confirmed

        # Pass 3 — final diff with confirmations.
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        nxt, alerts, uncertain, _ = compute_next(prev, observed, now)

        if uncertain:
            annotate("error", "countersign-sweep: unconfirmed deletion "
                              "(kept previous state, snapshot untouched) "
                              "for PR(s): %s"
                              % ", ".join(sorted(uncertain, key=int)))
            return 2

        total_cites = sum(len(e["citations"]) for e in nxt["prs"].values())
        posted = 0
        for a in alerts:
            # Idempotency: never post the same (pr, comment id) alert twice,
            # even if a previous snapshot/cache was lost.
            already = False
            for c in observed["prs"][a["pr"]]["comments"]:
                m = ALERT_MARKER_RE.search(c.get("body") or "")
                if m and m.group(1) == a["commentId"]:
                    already = True
                    break
            if already:
                continue
            if args.dry_run:
                print("DRY-RUN would alert on PR #%s: comment %s"
                      % (a["pr"], a["commentId"]))
                continue
            annotate("error",
                     "countersign-sweep: PR #%s DELETION ALERT — comment %s "
                     "(%s) posted %s is gone"
                     % (a["pr"], a["commentId"], a["citation"][:80],
                        a["createdAt"] or "?"))
            gh_output(["gh", "pr", "comment", a["pr"], "--repo", slug,
                       "--body", alert_body(a, nxt.get("updatedAt"))])
            posted += 1
            # Persist AFTER each post: a later failure must not cause a
            # duplicate alert on the next sweep.
            if not args.dry_run:
                atomic_write(args.snapshot_file,
                             json.dumps(nxt, indent=1, sort_keys=True))

        if not args.dry_run:
            atomic_write(args.snapshot_file,
                         json.dumps(nxt, indent=1, sort_keys=True))

        if alerts:
            print("countersign-sweep: DELETION ALERT — %d deletion(s), %d "
                  "new alert(s) posted, open PRs=%d citations=%d%s"
                  % (len(alerts), posted, len(nxt["prs"]), total_cites,
                     " [rebaselined]" if rebaselined else ""))
            return 1 if posted else 0
        print("countersign-sweep: PASS — open PRs=%d citations=%d%s"
              % (len(nxt["prs"]), total_cites,
                 " [rebaselined]" if rebaselined else ""))
        return 0
    except RuntimeError as exc:
        annotate("error", "countersign-sweep: fail-closed — %s" % exc)
        return 2


# ---------------------------------------------------------------------------
# Hermetic self-test (no network; fixture JSON only)
# ---------------------------------------------------------------------------

def _comment(cid, body, at="2026-10-20T12:00:00Z", login="qa-lead"):
    return {"id": cid, "createdAt": at, "body": body,
            "user": {"login": login}}


def _cite(n=9006, ref="52350001-0000-4000-8000-000000000001",
          head="e4f5b71c" * 5):
    return "Countersign: AID-%d verdict %s head=%s" % (n, ref, head)


def _prev(prs):
    return {"schema": SNAPSHOT_SCHEMA, "updatedAt": "2026-10-20T11:23:00Z",
            "prs": prs}


def self_test():
    HEAD = "a" * 40
    T = "2026-10-20T12:00:00Z"
    cite = _cite(head=HEAD)
    cases = []

    def scenario(name, ok):
        cases.append((name, ok))
        print("  [%s] %s" % ("ok" if ok else "FAIL", name))

    def run_core(prev, obs, confirmed=None):
        if confirmed is not None:
            obs = dict(obs)
            obs["_confirmed_deletions"] = confirmed
        return compute_next(prev, obs, T)

    # 1. baseline: no prev snapshot -> record, never alert
    nxt, alerts, unc, cands = run_core(None, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(1, cite)]}}})
    scenario("baseline records citations without alerting",
             not alerts and not unc and not cands
             and nxt["prs"]["733"]["citations"]["1"]["citation"] == cite)

    # 2. steady state: same observation -> no alerts, idempotent snapshot
    nxt2, alerts2, unc2, cands2 = run_core(nxt, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(1, cite)]}}})
    scenario("steady state is idempotent",
             not alerts2 and not unc2 and not cands2 and nxt2 == nxt)

    # 3. deletion detected when confirmed
    prev = _prev({"733": {"head": HEAD, "firstSeenAt": "2026-10-20T11:23:00Z",
                          "citations": {"1": {"createdAt": T,
                                              "citation": cite,
                                              "author": "qa-lead"}},
                          "deleted": [], "alerted": []}})
    nxt, alerts, unc, cands = run_core(prev, {"prs": {"733": {
        "head": HEAD, "comments": []}}}, confirmed={"733": {"1"}})
    scenario("confirmed deletion raises exactly one alert",
             len(alerts) == 1 and alerts[0]["commentId"] == "1"
             and alerts[0]["firstSeenAt"] == "2026-10-20T11:23:00Z"
             and not unc and cands == {"733": {"1"}}
             and nxt["prs"]["733"]["alerted"] == ["1"]
             and nxt["prs"]["733"]["deleted"][0]["citation"] == cite
             and "1" not in nxt["prs"]["733"]["citations"])

    # 4. unconfirmed deletion: candidate surfaces, prev entry kept verbatim,
    #    no alert, uncertain (live mode -> rc 2)
    nxt_unc, alerts, unc, cands = run_core(prev, {"prs": {"733": {
        "head": HEAD, "comments": []}}})
    scenario("unconfirmed deletion keeps previous state, flags uncertain",
             not alerts and unc == ["733"] and cands == {"733": {"1"}}
             and nxt_unc["prs"]["733"] == prev["prs"]["733"])

    # 5. alert once per deleted id (re-run after alert: no new alert)
    nxt2, alerts2, unc2, _ = run_core(nxt, {"prs": {"733": {
        "head": HEAD, "comments": []}}}, confirmed={"733": set()})
    scenario("already-alerted deletion stays silent",
             not alerts2 and not unc2
             and nxt2["prs"]["733"]["deleted"]
             and nxt2["prs"]["733"]["alerted"] == ["1"])

    # 6. a newer citation does not launder a recorded deletion
    cite2 = _cite(ref="52350002-0000-4000-8000-000000000002", head=HEAD)
    nxt3, alerts3, _, _ = run_core(nxt, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(2, cite2)]}}},
        confirmed={"733": set()})
    scenario("new citation does not clear the deletion record",
             not alerts3
             and nxt3["prs"]["733"]["citations"]["2"]["citation"] == cite2
             and nxt3["prs"]["733"]["deleted"]
             and "1" not in nxt3["prs"]["733"]["citations"]
             and nxt3["prs"]["733"]["alerted"] == ["1"])

    # 7. re-posted citation under a NEW comment id is recorded as new state
    #    (GitHub ids are immutable — a re-post gets a new id)
    nxt4, alerts4, _, _ = run_core(nxt, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(9, cite)]}}},
        confirmed={"733": set()})
    scenario("re-posted citation under a new id is recorded, not laundered",
             not alerts4 and "9" in nxt4["prs"]["733"]["citations"]
             and nxt4["prs"]["733"]["deleted"])

    # 8. closed/merged PR disappears from the snapshot (open-PR scope)
    nxt, alerts, _, _ = run_core(
        _prev({"700": {"head": HEAD, "citations": {}, "deleted": [],
                       "alerted": []}}),
        {"prs": {"733": {"head": HEAD, "comments": []}}})
    scenario("closed PR is dropped silently",
             "700" not in nxt["prs"] and not alerts)

    # 9. corrupt / wrong-schema prev -> baseline fail-safe via load_prev
    for bad in (None, "not json{", '{"schema": "other/1", "prs": {}}',
                '{"schema": "%s", "prs": {"733": {"citations": null}}}'
                % SNAPSHOT_SCHEMA):
        scenario("bad prev snapshot (%r) re-baselines without alerts"
                 % (bad[:28] if bad else bad),
                 load_prev(bad) is None)

    # 10. fenced citation is documentation, never a citation
    fenced = "notes:\n```\n%s\n```\n" % cite
    nxt, alerts, _, _ = run_core(None, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(1, fenced)]}}})
    scenario("code-fenced citation line is not snapshotted",
             not nxt["prs"]["733"]["citations"] and not alerts)

    # 11. CRLF-pasted citation still matches (AID-3050 tolerance)
    nxt, alerts, _, _ = run_core(None, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(1, cite + "\r")]}}})
    scenario("CRLF citation line is snapshotted",
             "1" in nxt["prs"]["733"]["citations"])

    # 12. free-text 'Countersign:' prose is not the canonical line
    prose = "Countersign: approved by QA earlier today, thanks!"
    nxt, alerts, _, _ = run_core(None, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(1, prose)]}}})
    scenario("non-canonical Countersign prose is ignored",
             not nxt["prs"]["733"]["citations"])

    # 13. alert body is fence-safe: no operative citation outside fences,
    #     no Provenance trailer, and carries the idempotency marker
    alert = {"pr": "733", "commentId": "1", "citation": cite,
             "createdAt": T, "author": "qa-lead",
             "firstSeenAt": "2026-10-20T11:23:00Z", "head": HEAD}
    body = alert_body(alert, T)
    scenario("alert body has no unfenced operative citation",
             not CITATION_RE.search(strip_code_fences(body)))
    scenario("alert body has no Provenance trailer",
             not PROVENANCE_RE.search(strip_code_fences(body)))
    m = ALERT_MARKER_RE.search(body)
    scenario("alert body carries the idempotency marker",
             bool(m) and m.group(1) == "1")

    # 14. multiple PRs: mixed steady/deletion/baseline in one sweep
    multi_prev = _prev({
        "10": {"head": HEAD, "firstSeenAt": "2026-10-20T11:23:00Z",
               "citations": {"1": {"createdAt": T, "citation": cite,
                                   "author": "qa"}},
               "deleted": [], "alerted": []},
        "11": {"head": HEAD, "citations": {}, "deleted": [],
               "alerted": []}})
    nxt, alerts, unc, cands = run_core(multi_prev, {"prs": {
        "10": {"head": HEAD, "comments": []},
        "11": {"head": HEAD, "comments": [_comment(7, cite)]},
        "12": {"head": HEAD, "comments": []}}},
        confirmed={"10": {"1"}})
    scenario("multi-PR sweep: one alert, one steady, one baseline",
             len(alerts) == 1 and alerts[0]["pr"] == "10" and not unc
             and cands == {"10": {"1"}}
             and nxt["prs"]["11"]["citations"]["7"]["citation"] == cite
             and not nxt["prs"]["12"]["citations"])

    # 15. snapshot round-trip through load_prev
    nxt, alerts, _, _ = run_core(None, {"prs": {"733": {
        "head": HEAD, "comments": [_comment(1, cite)]}}})
    scenario("snapshot round-trips through load_prev",
             load_prev(json.dumps(nxt)) == nxt)

    # 16. atomic write replaces content and leaves no temp litter
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "snap.json")
        atomic_write(path, json.dumps(nxt))
        atomic_write(path, json.dumps(nxt) + "\n")
        scenario("atomic write persists and leaves no temp files",
                 os.path.exists(path)
                 and not glob.glob(os.path.join(d, ".sweep-snap-*")))

    passed = sum(1 for _, ok in cases if ok)
    total = len(cases)
    print("countersign-sweep self-test: %d/%d passed" % (passed, total))
    return 0 if passed == total else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--run", action="store_true",
                    help="live sweep (needs gh + GH_TOKEN)")
    ap.add_argument("--snapshot-file",
                    default="countersign-sweep-snapshot.json")
    ap.add_argument("--repo", help="owner/name (default: auto)")
    ap.add_argument("--only-pr", type=int,
                    help="restrict the sweep to one PR (drills/backfill)")
    ap.add_argument("--dry-run", action="store_true",
                    help="compute and print; post nothing, write nothing")
    args = ap.parse_args()

    if args.self_test:
        sys.exit(self_test())
    if args.run:
        sys.exit(run_sweep(args))
    ap.print_usage()
    sys.exit(2)


if __name__ == "__main__":
    main()
