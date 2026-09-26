#!/usr/bin/env python3
"""Mechanical pre-merge countersign gate (AID-2768; CEO decision AID-2763).

Class F (merge without an independent pre-merge verdict — F1 #529, F2 #531,
F3 #533) survived the post-hoc SDLC guard citation gate (AID-2318/AID-2428):
that gate validates a resolvable 'Countersign:' citation, but it cannot see
VOID/HELD markers, cannot tell the countersigning AGENT from the producer
(independence is by agent, not runId — AID-2763), does not pin the verified
head, and only reddens after the merge on push runs. Advisory conventions
(comments VOID/HELD) do not contain a producer with a stale plan.

This gate is wired as its own REQUIRED status check ('countersign-gate',
.github/workflows/countersign-gate.yml) so GitHub itself refuses the merge
while it is red or missing: any actor — including the producer on the shared
credential — attempting to merge without a VALID countersign from a DISTINCT
agent, registered BEFORE the merge, gets a mechanical failure, not a warning.

ACCEPTANCE CONTRACT (all must hold; fail-closed in every ambiguity):

  1. CITATION — a PR COMMENT (line-start) matches
         Countersign: (AID|GH)-<n> verdict <ref> [head=<40-hex>]
     Body citations never count for the live gate (no posting time); on a
     merged PR (audit mode) the comment createdAt must be < mergedAt
     (same Stage-2 ordering rule as scripts/sdlc_guard_check.sh).
  2. RESOLVABLE — the cited AID/GH resolves via $SDLC_GUARD_AID_RESOLVER
     (exit 0 = exists), same contract as the SDLC guard.
  3. HEAD PIN — the full 40-hex SHA of the CURRENT PR head appears in the
     citation comment (anywhere: 'head=' token or a bare 40-hex token).
     A new push / update-branch moves the head -> the pin breaks -> red
     until a fresh countersign pins the new head.
  4. ATTRIBUTED — the citation comment carries a canonical provenance
     trailer (AID-2493):
         Provenance: agent=<slug> task=(AID|GH)-<n> run=<runId> session=<sessionId>
  5. DISTINCT AGENT — the earliest provenance trailer in the conversation
     (PR body first, then comments by createdAt) attributes the PRODUCER;
     the countersign agent slug must differ. No trailer anywhere ->
     'producer unattributed' (this is what F1/F2 looked like; a producer
     with a stale plan simply omits attribution, so it fails closed).
  6. OPERATIVE = LAST — only the chronologically LAST citation comment is
     evaluated. A producer self-cite posted after a valid QA countersign
     (the F3 pattern) makes that self-cite operative -> red until a fresh
     independent countersign supersedes it.
  7. NOT SUPERSEDED — no comment AFTER the operative citation contains an
     uppercase word-bounded VOID or HELD marker (guard-hold pattern: F3
     merged 94s after a HELD), and no 'reopened' timeline event is newer
     than the operative citation (containment close -> reopen must not
     ride a stale countersign; case #535).

Live data comes from gh (GH_TOKEN); hermetic mode (--context/--timeline)
runs the same core on fixture JSON so the self-test needs no network.

Usage:
  countersign_gate_check.py --pr <n>                 live gate via gh
  countersign_gate_check.py --context F [--timeline F] --head <sha> [--resolver P]
  countersign_gate_check.py --self-test

Exit: 0 gate passes, 1 gate fails (violations), 2 usage/environment error.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

CITATION_RE = re.compile(
    r"^Countersign:[ \t]+((?:AID|GH)-[1-9][0-9]*)[ \t]+verdict[ \t]+"
    r"([A-Za-z0-9][A-Za-z0-9._:-]*)[ \t]*(?:head[ \t]*=[ \t]*([0-9a-fA-F]{40}))?[ \t]*$",
    re.MULTILINE,
)
PROVENANCE_RE = re.compile(
    r"^Provenance:[ \t]+agent=(?P<agent>[A-Za-z0-9_][A-Za-z0-9._-]*)[ \t]+"
    r"task=(?P<task>(?:AID|GH)-[1-9][0-9]*)[ \t]+"
    r"run=(?P<run>[A-Za-z0-9_][A-Za-z0-9._:-]{3,})[ \t]+"
    r"session=(?P<session>[A-Za-z0-9_][A-Za-z0-9._:-]*)[ \t]*$",
    re.MULTILINE,
)
SHA40_RE = re.compile(r"\b[0-9a-fA-F]{40}\b")
VOID_HELD_RE = re.compile(r"\b(VOID|HELD)\b")

# Code-fence stripping (AID-2824, finding AID-2818): producer templates quote
# the citation/provenance format inside ```-fenced blocks, and a fenced line is
# documentation, never an operative citation — the producer template comment
# (GH 5843912536) became the "operative" citation for being the LAST comment
# with a 'Countersign:' line, surviving only by verbatim coincidence. All
# citation/provenance scans run on fence-stripped bodies. VOID/HELD markers
# keep scanning the RAW body (a hold inside a fence must still block — no
# weakening of fail-closed behavior).
_FENCE_LINE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")


def strip_code_fences(text):
    """Drop fenced code blocks (CommonMark ```/~~~ fences, incl. language tags).

    An unclosed fence swallows the rest of the body — fail-closed: a citation
    hidden that way is not seen, which reddens like a missing citation.
    """
    if not text:
        return ""
    out = []
    fence_char = None  # inside a block: the fence character ("`" or "~")
    for line in text.split("\n"):
        m = _FENCE_LINE_RE.match(line)
        if fence_char is None:
            if m:  # opening fence (info string allowed after ```/~~~)
                fence_char = m.group(1)[0]
            else:
                out.append(line)
        elif m and m.group(1)[0] == fence_char and not m.group(2).strip():
            fence_char = None  # closing fence (no trailing content allowed)
        # lines inside a fenced block are dropped
    return "\n".join(out)


class Violation(Exception):
    """One failed acceptance condition (message is human-readable)."""


def annotate(kind, msg):
    print("::%s::%s" % (kind, msg.replace("\n", " ")))


def decode_concat_json(text):
    """Parse concatenated JSON arrays (gh api --paginate emits one per page)."""
    dec = json.JSONDecoder()
    out, idx, n = [], 0, len(text)
    while idx < n:
        while idx < n and text[idx] in " \t\r\n":
            idx += 1
        if idx >= n:
            break
        obj, end = dec.raw_decode(text, idx)
        if isinstance(obj, list):
            out.extend(obj)
        else:
            out.append(obj)
        idx = end
    return out


def gh_output(argv):
    env = dict(os.environ)
    proc = subprocess.run(argv, capture_output=True, text=True, env=env)
    if proc.returncode != 0:
        raise RuntimeError(
            "command failed (rc=%d): %s\n%s"
            % (proc.returncode, " ".join(argv), proc.stderr.strip()[:500])
        )
    return proc.stdout


def repo_slug():
    slug = os.environ.get("GITHUB_REPOSITORY", "")
    if slug:
        return slug
    try:
        url = gh_output(["git", "remote", "get-url", "origin"]).strip()
    except Exception:
        return None
    m = re.search(r"[:/]([^/:]+/[^/]+?)(?:\.git)?$", url)
    return m.group(1) if m else None


# ---------------------------------------------------------------------------
# Core evaluation. ctx: {body, mergedAt, comments:[{createdAt, body}]};
# timeline: [{event, created_at}]; head: current PR head sha (40-hex).
# Returns (operative_comment, producer_agent) on success; raises Violation.
# ---------------------------------------------------------------------------

def evaluate(ctx, timeline, head, resolver):
    body = ctx.get("body") or ""
    merged_at = ctx.get("mergedAt") or None
    comments = sorted(
        [c for c in (ctx.get("comments") or []) if c.get("body")],
        key=lambda c: c.get("createdAt") or "",
    )
    # Fence-aware scanning (AID-2824): citation/provenance lines inside code
    # fences are templates/documentation and never count. VOID/HELD markers
    # below still scan the raw body (no fail-closed weakening).
    body = strip_code_fences(body)
    scanned = [(c, strip_code_fences(c.get("body") or "")) for c in comments]

    # Producer attribution: earliest provenance trailer, body counts first
    # (sort key 0 = body, 1 = comment createdAt — a timestamp string would
    # otherwise always sort before the literal "body" marker).
    earliest = None  # (sortkey, agent)
    m = PROVENANCE_RE.search(body)
    if m:
        earliest = ((0, ""), m.group("agent"))
    for c, sbody in scanned:
        m = PROVENANCE_RE.search(sbody)
        if m:
            key = (1, c.get("createdAt") or "")
            if earliest is None or key < earliest[0]:
                earliest = (key, m.group("agent"))
    if earliest is None:
        raise Violation(
            "producer unattributed: no 'Provenance: agent=… task=… run=… session=…' "
            "trailer in the PR body or any comment — the producer must register "
            "itself before an independent countersign can be checked against it "
            "(fail-closed, AID-2768 §5)"
        )
    producer_agent = earliest[1]

    # Operative citation = chronologically LAST comment with a line-start
    # 'Countersign:' citation (F3: a later producer self-cite supersedes and
    # must itself be valid; body-only citations are not orderable pre-merge).
    body_cited = None
    operative = None
    for c, sbody in scanned:
        if CITATION_RE.search(sbody):
            operative = c
    if operative is None:
        if CITATION_RE.search(body):
            body_cited = "body"
        where = (
            "the only 'Countersign:' citation is in the PR BODY, which has no "
            "verifiable posting time — post it as a PR comment (AID-2768 §1)"
            if body_cited
            else "no 'Countersign: <AID|GH>-<n> verdict <ref>' line found in any "
            "PR comment (AID-2768 §1)"
        )
        raise Violation(where)

    # Fence-stripped: a citation/trailer/head-pin inside a code fence is
    # template documentation, not operative content (AID-2824).
    cbody = strip_code_fences(operative.get("body") or "")
    when = operative.get("createdAt") or ""
    cite = CITATION_RE.search(cbody)
    aid, ref = cite.group(1), cite.group(2)

    # (audit mode) posted strictly before the merge.
    if merged_at and when and not when < merged_at:
        raise Violation(
            "operative citation posted at/after mergedAt (%s >= %s) — the "
            "countersign must be registered BEFORE the merge (AID-2768 §1)"
            % (when, merged_at)
        )

    # Resolvable.
    if not resolver:
        raise Violation(
            "SDLC_GUARD_AID_RESOLVER is not configured — cannot verify the cited "
            "verdict carrier %s (fail-closed, AID-2768 §2)" % aid
        )
    try:
        rc = subprocess.run([resolver, aid], capture_output=True, text=True)
    except OSError as exc:
        raise Violation("resolver %r not executable (%s) — fail-closed (AID-2768 §2)" % (resolver, exc))
    if rc.returncode != 0:
        detail = (rc.stderr or "").strip().splitlines()
        why = detail[0] if detail else "rc=%d" % rc.returncode
        raise Violation(
            "cited %s did not resolve ('Countersign: %s verdict %s') — %s "
            "(AID-2768 §2)" % (aid, aid, ref, why)
        )

    # Head pin: the full 40-hex CURRENT head must appear in the comment.
    if head and head.lower() not in [s.lower() for s in SHA40_RE.findall(cbody)]:
        raise Violation(
            "operative citation does not pin the CURRENT PR head %s — post the "
            "countersign with the full 40-hex head (e.g. 'Countersign: %s verdict "
            "%s head=%s'). A moved head (new push / update-branch) requires a "
            "fresh independent countersign (AID-2768 §3)" % (head, aid, ref, head)
        )

    # Attributed countersign agent.
    m = PROVENANCE_RE.search(cbody)
    if not m:
        raise Violation(
            "operative citation comment carries no valid 'Provenance: agent=… "
            "task=… run=… session=…' trailer — agent attribution is mandatory "
            "on process comments (AID-2493/AID-2768 §4)"
        )
    countersign_agent = m.group("agent")

    # Distinct agent (by AGENT, not runId — AID-2763).
    if countersign_agent == producer_agent:
        raise Violation(
            "countersign agent '%s' IS the producer agent — independence is by "
            "AGENT, not by runId; a verdict from any run of the producer does "
            "not count (F3/AID-2763, AID-2768 §5)" % countersign_agent
        )

    # Not superseded: VOID/HELD after the operative citation (F3 merged 94s
    # after a HELD) and reopened-after-citation (containment reopen, case #535).
    for c in comments:
        cwhen = c.get("createdAt") or ""
        if when and cwhen > when and VOID_HELD_RE.search(c.get("body") or ""):
            raise Violation(
                "a comment posted AFTER the operative citation contains a "
                "VOID/HELD marker (at %s) — the hold supersedes the countersign; "
                "a fresh independent countersign is required (AID-2768 §7)" % cwhen
            )
    for ev in timeline or []:
        if ev.get("event") == "reopened":
            t = ev.get("created_at") or ""
            if when and t > when:
                raise Violation(
                    "PR was REOPENED at %s, after the operative citation (%s) — "
                    "a containment close/reopen cannot ride a stale countersign; "
                    "a fresh independent countersign is required (case #535, "
                    "AID-2768 §7)" % (t, when)
                )

    return operative, producer_agent, countersign_agent


def run_gate(args):
    resolver = os.environ.get("SDLC_GUARD_AID_RESOLVER", "") or None
    if args.context:
        with open(args.context, "r", encoding="utf-8") as fh:
            ctx = json.load(fh)
        timeline = []
        if args.timeline and os.path.exists(args.timeline):
            with open(args.timeline, "r", encoding="utf-8") as fh:
                timeline = decode_concat_json(fh.read())
        head = args.head or ""
    else:
        if shutil.which("gh") is None:
            print("ERROR: gh CLI is required for live mode", file=sys.stderr)
            return 2
        slug = repo_slug()
        if not slug:
            print("ERROR: cannot determine repository slug", file=sys.stderr)
            return 2
        prj = json.loads(
            gh_output(
                ["gh", "pr", "view", str(args.pr), "--json",
                 "headRefOid,body,comments,mergedAt,state"]
            )
        )
        ctx = prj
        head = prj.get("headRefOid") or ""
        raw = gh_output(
            ["gh", "api", "repos/%s/issues/%s/timeline" % (slug, args.pr),
             "--paginate"]
        )
        timeline = decode_concat_json(raw)

    if not head:
        print("ERROR: no PR head SHA available (use --head in hermetic mode)", file=sys.stderr)
        return 2

    try:
        operative, producer, countersigner = evaluate(ctx, timeline, head, resolver)
    except Violation as exc:
        if args.print_citation:
            print("ERROR: gate fails — no operative citation to print: %s" % exc,
                  file=sys.stderr)
            return 1
        annotate("error", "countersign-gate FAIL (AID-2768): %s" % exc)
        print("countersign-gate: FAIL — %s" % exc)
        return 1

    cite = CITATION_RE.search(strip_code_fences(operative.get("body") or ""))
    if args.print_citation:
        print("%s (agent=%s, distinct from producer agent=%s, head=%s pinned, posted %s)"
              % (cite.group(0).strip(), countersigner, producer, head,
                 operative.get("createdAt")))
        return 0
    annotate(
        "notice",
        "countersign-gate PASS (AID-2768): operative citation '%s' (posted %s) — "
        "producer agent '%s' != countersign agent '%s', head %s pinned, no "
        "VOID/HELD or reopen supersedes it"
        % (cite.group(0).strip(), operative.get("createdAt"), producer,
           countersigner, head[:12]),
    )
    print(
        "countersign-gate: PASS — operative citation: %s (posted %s); producer "
        "agent '%s' / countersign agent '%s'; head %s pinned"
        % (cite.group(0).strip(), operative.get("createdAt"), producer,
           countersigner, head)
    )
    return 0


# ---------------------------------------------------------------------------
# Self-test: hermetic fixtures exercising every acceptance condition.
# ---------------------------------------------------------------------------

def _ctx(body, comments, merged_at=None):
    return {"body": body, "comments": comments, "mergedAt": merged_at}


def _comment(at, body):
    return {"createdAt": at, "body": body}


HEAD = "e4f5b71c4ec33d41ded6d2b05c6d6aa033faa9e5"
HEAD2 = "81afd2a4" + "0" * 32  # a different full 40-hex head


def self_test():
    tmp = tempfile.mkdtemp(prefix="csg-selftest.")
    stub = os.path.join(tmp, "resolver.sh")
    with open(stub, "w", encoding="utf-8") as fh:
        fh.write("#!/usr/bin/env bash\ncase \"$1\" in AID-9006) exit 0 ;; *) exit 1 ;; esac\n")
    os.chmod(stub, 0o755)

    prod_trailer = ("Provenance: agent=platform-ci task=AID-2768 run=w2800 "
                    "session=1e9be0fa-c320-4309-9704-c755c53da7fd")
    qa_trailer = ("Provenance: agent=qa-lead task=AID-9006 run=w2801 "
                  "session=ca6a3f95-0000-0000-0000-000000000000")
    cite_line = "Countersign: AID-9006 verdict 5843026877 head=" + HEAD

    def scenario(name, expected, ctx, timeline=None, head=HEAD, resolver=stub,
                 env_resolver=True, merged_at=None):
        if merged_at is not None:
            ctx = dict(ctx)
            ctx["mergedAt"] = merged_at
        ctxf = os.path.join(tmp, "ctx.json")
        with open(ctxf, "w", encoding="utf-8") as fh:
            json.dump(ctx, fh)
        tlf = os.path.join(tmp, "tl.json")
        with open(tlf, "w", encoding="utf-8") as fh:
            json.dump(timeline or [], fh)
        argv = [sys.executable, os.path.abspath(__file__), "--context", ctxf,
                "--timeline", tlf, "--head", head]
        env = dict(os.environ)
        env.pop("SDLC_GUARD_AID_RESOLVER", None)
        if env_resolver and resolver:
            env["SDLC_GUARD_AID_RESOLVER"] = resolver
        proc = subprocess.run(argv, capture_output=True, text=True, env=env)
        ok = proc.returncode == expected
        print("%s [%s] rc=%d (expected %d)%s"
              % ("PASS" if ok else "FAIL", name, proc.returncode, expected,
                 "" if ok else "\n    | " + proc.stdout.strip().replace("\n", "\n    | ")))
        return 1 if ok else 0

    T = "2026-09-26T05:00:00Z"
    cases = []

    # 1. no citation at all -> fail
    cases.append(scenario(
        "no citation fails", 1,
        _ctx("producer body\n" + prod_trailer, [_comment(T, "looking good")]),
    ))
    # 2. body-only citation -> fail (no posting time)
    cases.append(scenario(
        "body-only citation fails", 1,
        _ctx(cite_line + "\n" + prod_trailer, []),
    ))
    # 3. citation without provenance trailer -> fail
    cases.append(scenario(
        "citation without provenance fails", 1,
        _ctx("producer body\n" + prod_trailer, [_comment(T, cite_line)]),
    ))
    # 4. F3 regression: countersign agent == producer agent -> fail
    cases.append(scenario(
        "producer self-countersign fails (F3)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + prod_trailer)]),
    ))
    # 5. valid distinct-agent countersign pinning the head -> pass
    cases.append(scenario(
        "valid distinct-agent countersign passes", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 6. head moved (update-branch/new push) -> old pin fails
    cases.append(scenario(
        "stale head pin fails after new push", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
        head=HEAD2,
    ))
    # 7. short-sha pin only -> fail (must be full 40-hex)
    short_cite = "Countersign: AID-9006 verdict 5843026877 head=e4f5b71c"
    cases.append(scenario(
        "short-sha head pin fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, short_cite + "\nverified head e4f5b71c\n" + qa_trailer)]),
    ))
    # 8. producer unattributed -> fail (F1/F2 shape)
    cases.append(scenario(
        "producer unattributed fails (F1/F2)", 1,
        _ctx("producer body, no trailer anywhere",
             [_comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 9. VOID comment after the citation -> fail (F3: merged 94s after HELD)
    cases.append(scenario(
        "VOID after citation fails (F3 hold)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T05:01:00Z",
                       "GUARD: countersign anterior VOID, merge HELD.")]),
    ))
    # 10. HELD after the citation -> fail
    cases.append(scenario(
        "HELD after citation fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T05:01:00Z", "merge HELD pending new verdict")]),
    ))
    # 11. VOID/HELD BEFORE the citation -> does not supersede -> pass
    cases.append(scenario(
        "VOID before citation does not block", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T04:59:00Z", "GUARD: previous chain VOID, HELD."),
              _comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 12. producer self-cite AFTER a valid QA citation -> operative=last -> fail
    cases.append(scenario(
        "later producer self-cite supersedes (F3 pattern)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T05:02:00Z",
                       "Countersign: AID-9006 verdict 5842826621 head=" + HEAD
                       + "\n" + prod_trailer)]),
    ))
    # 13. reopened AFTER citation (containment reopen, case #535) -> fail
    cases.append(scenario(
        "reopened after citation fails (#535)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
        timeline=[{"event": "reopened", "created_at": "2026-09-26T05:30:00Z"}],
    ))
    # 14. reopened BEFORE citation -> pass
    cases.append(scenario(
        "reopened before citation passes", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
        timeline=[{"event": "reopened", "created_at": "2026-09-26T04:30:00Z"}],
    ))
    # 15. ghost AID (resolver rejects) -> fail
    ghost = "Countersign: AID-9999 verdict deadbeef head=" + HEAD
    cases.append(scenario(
        "unresolvable AID fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, ghost + "\n" + qa_trailer)]),
    ))
    # 16. resolver not configured -> fail-closed
    cases.append(scenario(
        "resolver not configured fails closed", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
        env_resolver=False,
    ))
    # 17. audit mode: citation posted after mergedAt -> fail
    cases.append(scenario(
        "post-merge citation fails (audit mode)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T06:00:00Z", cite_line + "\n" + qa_trailer)]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 18. audit mode: valid pre-merge citation -> pass
    cases.append(scenario(
        "pre-merge citation passes in audit mode", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 19. second push then fresh re-countersign on the new head -> pass
    re_cite = "Countersign: AID-9006 verdict 5843509691 head=" + HEAD2
    cases.append(scenario(
        "re-countersign on new head passes", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T05:10:00Z",
                       "update-branch moved the head; re-verified.\n"
                       + re_cite + "\n" + qa_trailer)]),
        head=HEAD2,
    ))
    # 20. head sha pinned only in the narrative body of the comment (not on
    # the citation line) still counts — the CONTRACT is comment-level.
    naked_cite = ("Countersign: AID-9006 verdict 5843026877\n"
                  "Head verificado: " + HEAD + "\n" + qa_trailer)
    cases.append(scenario(
        "head pinned in comment body passes", 0,
        _ctx("producer body\n" + prod_trailer, [_comment(T, naked_cite)]),
    ))
    # 21–26. fence-aware citation scan (AID-2824, finding AID-2818): lines
    # inside ```-fenced blocks are templates/documentation — the producer
    # template comment became the "operative" citation for being the LAST
    # comment with a 'Countersign:' line.
    fenced_template = (
        "Countersign template for the producer (copy/adapt):\n"
        "```\n"
        "Countersign: AID-9006 verdict 5843894601 head=" + HEAD + "\n"
        + prod_trailer + "\n"
        "```\n"
    )
    # 21. fenced template AFTER a valid countersign does not supersede it
    cases.append(scenario(
        "fenced template after countersign does not supersede (AID-2818)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T05:03:00Z", fenced_template)]),
    ))
    # 22. fenced template BEFORE the countersign does not become operative
    cases.append(scenario(
        "fenced template before countersign stays inert", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T04:55:00Z", fenced_template),
              _comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 23. citation ONLY inside a fence -> no operative citation -> fail
    cases.append(scenario(
        "citation only inside a fence fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "how to countersign:\n```\n" + cite_line + "\n"
                        + qa_trailer + "\n```")]),
    ))
    # 24. head pinned only inside a fence does not satisfy the pin
    cases.append(scenario(
        "head pinned only inside a fence fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 5843026877\n"
                        + "```\nexample head=" + HEAD + "\n```\n"
                        + qa_trailer)]),
    ))
    # 25. fenced provenance trailer does not attribute the producer
    cases.append(scenario(
        "fenced provenance trailer does not attribute producer", 1,
        _ctx("producer body quoting the format:\n```\n" + prod_trailer + "\n```",
             [_comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 26. unclosed fence swallows the rest — a citation "inside" it fails
    cases.append(scenario(
        "citation after an unclosed fence fails (fail-closed)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "scratchpad:\n```\n" + cite_line + "\n" + qa_trailer)]),
    ))

    passed = sum(cases)
    total = len(cases)
    print("countersign-gate self-test: %d/%d passed" % (passed, total))
    shutil.rmtree(tmp, ignore_errors=True)
    return 0 if passed == total else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--pr", type=int, help="PR number (live mode via gh)")
    ap.add_argument("--context", help="PR context JSON (gh pr view shape) — hermetic mode")
    ap.add_argument("--timeline", help="timeline JSON array (issue timeline events)")
    ap.add_argument("--head", help="current PR head SHA (hermetic mode)")
    ap.add_argument("--print-citation", action="store_true",
                    help="print the operative citation line (merge door body)")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        sys.exit(self_test())
    if args.pr:
        sys.exit(run_gate(args))
    if args.context:
        sys.exit(run_gate(args))
    ap.print_usage()
    sys.exit(2)


if __name__ == "__main__":
    main()
