#!/usr/bin/env python3
"""merge_msg_check.py — mechanical post-merge canonical-line check (AID-3447).

Class "sem-linha-canônica" (AID-2655 item 5(2)): a PR merge whose merge commit
message does NOT carry a canonical `Countersign: <AID|GH>-<n> verdict <ref>
[head=<40-hex>]` line on its own line in the BODY. Five occurrences so far
(#481 → #491 → #495 → #514 → #607/`8975ba43`) — every one composed OUTSIDE
the single merge door (`scripts/merge_pr.sh` §5 composes the body
unconditionally with the citation, so a merge executed by the door always has
it; an empty/custom-body merge commit is the fingerprint of an out-of-door
merge, whichever path produced it: web UI, raw API, or CLI fallback).

AID-2655 item 3 made this a MANUAL self-check for the merge-writer
(`git show -s --format=%B <sha> | grep '^Countersign: '` after merging).
This script makes it MECHANICAL (decision CEO AID-3447): the workflow
`.github/workflows/merge-msg-gate.yml` runs it on every push to main and
goes RED on any violating merge commit in the pushed range — detection that
is independent of actor, credential, and merge path.

Acceptance contract (fail-closed):
  1. only MERGE commits are checked (>= 2 parents); regular and squash
     commits are out of scope (the canonical line is a merge-message
     obligation);
  2. the canonical line must match `^Countersign: ` at the start of a line
     in the BODY block (everything after the first blank line that ends the
     subject) with non-empty content — a `Countersign:` line in the subject
     block is a TITLE-ONLY citation and FAILS (the #514 shape: verdict cited
     inline in the title, nothing grep-able in the body);
  3. presence only — whether the cited verdict is valid, resolvable, and was
     posted pre-merge stays with the pre-merge gates (`countersign-gate`,
     `scripts/countersign_gate_check.py`, Stage-1/Stage-2); this check is
     the post-merge audit-trail detector, not a re-run of those gates.

Exit: 0 all checked merges carry the line (or nothing to check),
      1 violations found (each printed with sha/subject/reason),
      2 usage or environment error.

Usage:
  python3 scripts/merge_msg_check.py --range <base>..<head>   # pushed range
  python3 scripts/merge_msg_check.py --sha <sha>              # single commit
  python3 scripts/merge_msg_check.py --self-test              # hermetic fixtures
  python3 scripts/merge_msg_check.py --open-incident --sha <sha> [--sha <sha2>] \
       --run-url <url> [--repo <owner/name>]                  # CI failure path

`--open-incident` posts a Paperclip incident (best-effort, idempotent by
first violating sha in open-issue titles) using PAPERCLIP_API_URL /
PAPERCLIP_API_TOKEN / PAPERCLIP_COMPANY_ID. It never weakens the check: it
runs only after a violation was found (the workflow gate is already red) and
a missing env or transport failure logs a warning and exits 0 so the red
check stays the primary signal.
"""

import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

CANONICAL_PREFIX = "Countersign: "


def die(msg, code=2):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def git(*args, cwd=None):
    """Run git, returning stdout; failure is fatal (fail-closed: a transport
    failure must never read as 'no violations')."""
    try:
        return subprocess.run(
            ["git", *args], capture_output=True, text=True, check=True, cwd=cwd
        ).stdout
    except subprocess.CalledProcessError as e:
        die(f"git {' '.join(args[:2])} failed (rc={e.returncode}): {e.stderr.strip()[:300]}")


def commit_records(revs, cwd=None):
    """Yield (sha, parents, subject, body_lines) for each rev in `revs`
    (already resolved to shas), skipping non-merge commits."""
    for sha in revs:
        parents = git("show", "-s", "--format=%P", sha, cwd=cwd).split()
        if len(parents) < 2:
            continue  # not a merge commit — out of scope (contract item 1)
        subject = git("show", "-s", "--format=%s", sha, cwd=cwd).strip()
        body = git("show", "-s", "--format=%B", sha, cwd=cwd).splitlines()
        yield sha, parents, subject, body


def range_shas(rng, cwd=None):
    """All commits in `base..head`, oldest first."""
    out = git("log", "--reverse", "--format=%H", rng, cwd=cwd)
    return [line for line in out.splitlines() if line.strip()]


def body_block(lines):
    """Return the lines AFTER the first blank line (the subject separator).
    A message with no blank line has an empty body — title-only."""
    for i, line in enumerate(lines):
        if line.strip() == "":
            return lines[i + 1 :]
    return []


def canonical_line_ok(body_lines):
    """True iff some BODY line starts with 'Countersign: ' and carries
    non-empty content after it (presence check only — header item 3)."""
    for line in body_block(body_lines):
        if line.startswith(CANONICAL_PREFIX) and line[len(CANONICAL_PREFIX) :].strip():
            return True
    return False


def check(revs, cwd=None):
    """Return (merges_checked, violations) for the given revs."""
    violations = []
    merges = 0
    for sha, parents, subject, body_lines in commit_records(revs, cwd=cwd):
        merges += 1
        if not canonical_line_ok(body_lines):
            if body_block(body_lines):
                reason = "body present but no canonical '^Countersign: ' line in the body block"
            else:
                reason = "EMPTY body (title-only merge message — the out-of-door fingerprint, AID-3447)"
            violations.append((sha, subject, reason, len(parents)))
    return merges, violations


def report(merges, violations, label):
    print(f"merge-msg-gate: checked {merges} merge commit(s) {label}")
    for sha, subject, reason, nparents in violations:
        print(f"VIOLATION {sha} ({nparents} parents): {subject}")
        print(f"  -> {reason}")
    if violations:
        print(
            "Class AID-2655 item 5(2): every PR merge must carry "
            f"'{CANONICAL_PREFIX}<AID|GH>-<n> verdict <ref> [head=<40-hex>]' "
            "on its own line in the merge commit BODY. If this merge was "
            "legitimate (pre-merge citations + gates green), register the "
            "finding per docs/sdlc/README.md §Merge protocol item 5 (emenda "
            "AID-2655) — no retroactive rewrite of pushed history.",
            file=sys.stderr,
        )
        sys.exit(1)
    print("merge-msg-gate: PASS (all checked merge commits carry the canonical line)")


# ------------------------------------------------------------------ incident --


def incident_payload(rows, run_url, repo):
    """Compose (title, body) from pre-collected rows (pure; pinned by
    --self-test): rows = [(sha, n_parents, subject, has_line), ...]."""
    first = rows[0][0]
    lines = [
        f"- `{sha}` ({np} parents) — {subject} — canonical line: "
        f"{'present' if has else 'ABSENT'}"
        for sha, np, subject, has in rows
    ]
    title = (
        f"INCIDENT (merge-msg-gate): merge commit {first[:8]} sem linha "
        f"canônica 'Countersign:' no corpo — classe AID-2655 item 5(2)"
    )
    body = (
        "Aberto automaticamente pelo workflow `merge-msg-gate` "
        "(decisão CEO AID-3447: self-check AID-2655 item 3 mecânico).\n\n"
        "Merge commit(s) violadores:\n"
        + "\n".join(lines)
        + f"\n\nWorkflow run: {run_url}\n"
        + (f"Repo: {repo}\n" if repo else "")
        + "\nTriage (docs/sdlc/README.md §Merge protocol item 5, emenda "
        "AID-2655/AID-3447): verificar mitigações pré-merge — citações "
        "canônicas em comentário do PR com createdAt < merged_at, gates "
        "verdes no head, producer ≠ verifier ≠ merger — para classificar "
        "severidade (paridade #514/#607 quando íntegras: achado MÉDIA, sem "
        "ação retroativa). O merge foi composto fora da porta única "
        "(scripts/merge_pr.sh §5 sempre compõe o body com a linha canônica) "
        "— identificar o caminho (web UI/API/CLI fallback) e registrar.\n\n"
        "Dedup: não reabrir se já existir incidente aberto citando o mesmo sha."
    )
    return title, body


def incident_rows(shas):
    rows = []
    for sha in shas:
        parents = git("show", "-s", "--format=%P", sha).split()
        subject = git("show", "-s", "--format=%s", sha).strip()
        has = canonical_line_ok(git("show", "-s", "--format=%B", sha).splitlines())
        rows.append((sha, len(parents), subject, has))
    return rows


def open_incident(shas, run_url, repo):
    base = os.environ.get("PAPERCLIP_API_URL", "").rstrip("/")
    token = os.environ.get("PAPERCLIP_API_TOKEN", "")
    company = os.environ.get("PAPERCLIP_COMPANY_ID", "")
    if not (base and token and company):
        print(
            "WARN incident NOT opened: PAPERCLIP_API_URL/PAPERCLIP_API_TOKEN/"
            "PAPERCLIP_COMPANY_ID not all set (red check stays the signal)"
        )
        return
    rows = [r for r in incident_rows(shas) if not r[3]]
    if not rows:
        print("no violating merge commit among the given shas — incident not opened")
        return
    title, body = incident_payload(rows, run_url, repo)
    api = f"{base}/api/companies/{company}/issues"

    def req(url, data=None):
        r = urllib.request.Request(
            url,
            data=json.dumps(data).encode() if data else None,
            method="POST" if data else "GET",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(r, timeout=45) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}

    # Idempotency: skip if an OPEN issue title already cites the first sha.
    try:
        open_issues = req(f"{api}?status=todo,in_progress,in_review,blocked&limit=200")
        for it in open_issues if isinstance(open_issues, list) else []:
            t = it.get("title") or ""
            if shas[0][:8] in t and "merge-msg-gate" in t:
                print(
                    f"INCIDENT dedup: open issue {it.get('identifier')} "
                    f"already cites {shas[0][:8]} — not duplicated"
                )
                return
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"WARN incident dedup scan failed ({e}) — creating anyway")
    try:
        created = req(api, {"title": title, "description": body, "status": "todo"})
        print(f"INCIDENT opened: {created.get('identifier', '?')} — {title}")
    except urllib.error.URLError as e:
        print(f"WARN incident POST failed ({e}) — the red check remains the signal")


# ----------------------------------------------------------------- self-test --


def self_test():
    pass_n = fail_n = 0

    def st(label, expected, actual):
        nonlocal pass_n, fail_n
        if expected == actual:
            print(f"PASS [{label}] '{actual}'")
            pass_n += 1
        else:
            print(f"FAIL [{label}] expected '{expected}' got '{actual}'")
            fail_n += 1

    # Pure part: subject/body split and the canonical-line rule.
    good = ["Merge PR #1: x", "", "intro", "", "Countersign: AID-1 verdict 123 head=" + "a" * 40]
    st("canonical line in body accepted", True, canonical_line_ok(good))
    st("empty body rejected (out-of-door fingerprint)", False, canonical_line_ok(["Merge PR #607 from dandpb/x (countersign AID-3404 GO)"]))
    st("title-only canonical line rejected (#514 shape)", False, canonical_line_ok(["Countersign: AID-1 verdict 5", "", "body without the line"]))
    st("inline word in title rejected (#514 exact shape)", False, canonical_line_ok(["Merge PR #514: fix (countersign AID-2321 GO)", "", "body"]))
    st("empty-content line rejected", False, canonical_line_ok(["s", "", "Countersign: "]))
    st("no-blank-line message has no body block", False, canonical_line_ok(["Countersign: AID-1 verdict 5"]))
    st("indented line does not count", False, canonical_line_ok(["s", "", "  Countersign: AID-1 verdict 5"]))

    # Synthetic history: the #607 shape must be flagged, the door shape must
    # not, and regular commits must be out of scope.
    with tempfile.TemporaryDirectory() as td:
        env = {
            **os.environ,
            "GIT_AUTHOR_NAME": "t",
            "GIT_AUTHOR_EMAIL": "t@t",
            "GIT_COMMITTER_NAME": "t",
            "GIT_COMMITTER_EMAIL": "t@t",
        }

        def g(*a):
            return subprocess.run(
                ["git", "-C", td, *a], capture_output=True, text=True,
                env=env, check=True,
            ).stdout

        def commit_tree(*a):
            return subprocess.run(
                ["git", "-C", td, "commit-tree", *a], capture_output=True,
                text=True, env=env, check=True,
            ).stdout.strip()

        g("init", "-q", "--initial-branch=main")
        g("commit", "--allow-empty", "-m", "root")
        base = g("rev-parse", "HEAD").strip()
        g("commit", "--allow-empty", "-m", "side")
        side = g("rev-parse", "HEAD").strip()
        tree = g("write-tree").strip()
        bad = commit_tree(
            tree, "-p", base, "-p", side, "-m",
            "Merge pull request #607 from dandpb/x (countersign AID-3404 GO)",
        )
        good_merge = commit_tree(
            tree, "-p", side, "-p", bad, "-m", "Merge PR #1: x", "-m",
            "Merged via scripts/merge_pr.sh (single merge door, AID-2768).", "-m",
            f"Countersign: AID-1 verdict 123 head={side}",
        )
        revs = range_shas(f"{base}..{good_merge}", cwd=td)
        st("synthetic range: 3 commits listed (base exclusive)", 3, len(revs))
        merges, violations = check(revs, cwd=td)
        st("synthetic range: 2 merge commits checked", 2, merges)
        st("synthetic range: exactly 1 violation", 1, len(violations))
        st("synthetic range: violation is the #607-shape merge", bad[:8], violations[0][0][:8])
        st("synthetic range: reason names the empty-body fingerprint", True, "EMPTY body" in violations[0][2])

    # Incident composer (pure part): title/body cite sha, run url, class refs.
    rows = [("a1b2c3d4" + "0" * 32, 2, "Merge pull request #607 from x", False)]
    title, body = incident_payload(rows, "https://run/1", "dandpb/aidevschool")
    st("incident title cites sha8 + class + gate", True,
       "a1b2c3d4" in title and "AID-2655" in title and "merge-msg-gate" in title)
    st("incident body cites run url + triage + dedup", True,
       "https://run/1" in body and "AID-3447" in body and "mitigações" in body and "Dedup" in body)
    st("incident body lists the violating sha ABSENT", True,
       "canonical line: ABSENT" in body)

    print(f"merge_msg_check self-test: {pass_n} passed, {fail_n} failed")
    sys.exit(1 if fail_n else 0)


# ---------------------------------------------------------------------- main --


def main():
    args = sys.argv[1:]
    mode = None
    rng = ""
    shas = []
    run_url = ""
    repo = ""
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--self-test":
            mode = "self-test"
        elif a == "--range":
            i += 1
            rng = args[i]
            mode = mode or "range"
        elif a == "--sha":
            i += 1
            shas.append(args[i])
            mode = mode or "sha"
        elif a == "--open-incident":
            mode = "open-incident"
        elif a == "--run-url":
            i += 1
            run_url = args[i]
        elif a == "--repo":
            i += 1
            repo = args[i]
        else:
            die(f"unknown argument {a}")
        i += 1

    if mode == "self-test":
        self_test()

    if mode == "open-incident":
        if not shas or not run_url:
            die("--open-incident requires --sha <sha> and --run-url <url>")
        open_incident(shas, run_url, repo)
        return

    if mode == "range":
        if ".." not in rng:
            die("--range must look like <base>..<head>")
        merges, violations = check(range_shas(rng))
        report(merges, violations, f"in range {rng}")
        return

    if mode == "sha":
        merges, violations = check(shas)
        report(merges, violations, f"at {shas[0][:12]}")
        return

    die("nothing to do: pass --range <base>..<head>, --sha <sha>, --self-test, or --open-incident")


if __name__ == "__main__":
    main()
