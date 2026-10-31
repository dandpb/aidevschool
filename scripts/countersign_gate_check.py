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
     merged PR (audit mode) only comments with createdAt < mergedAt are in
     the citation pool (same Stage-2 ordering rule as
     scripts/sdlc_guard_check.sh, which skips at/after-mergedAt citations).
  2. RESOLVABLE — the cited AID/GH resolves via $SDLC_GUARD_AID_RESOLVER
     (exit 0 = exists), same contract as the SDLC guard.
  3. HEAD PIN — the full 40-hex SHA of the CURRENT PR head appears in the
     citation comment (anywhere: 'head=' token or a bare 40-hex token).
     A new push / update-branch moves the head -> the pin breaks -> red
     until a fresh countersign pins the new head.
   4. ATTRIBUTED — the citation comment carries a canonical provenance
      trailer (AID-2493):
          Provenance: agent=<slug> task=(AID|GH)-<n> run=<runId> session=<sessionId>
      and neither the citation's nor the producer's session= value is a
      PLACEHOLDER (AID-4898, audit AID-4897 criterion 4: form-only validation
      accepted session=opencode_local — policy 2026-10-01: a placeholder is
      not a session). The citation session may be anchored post-hoc by a
      SESSION ADDENDUM (§8a).
   5. DISTINCT AGENT — the earliest provenance trailer in the conversation
     (PR body first, then comments by createdAt) attributes the PRODUCER;
     the countersign agent slug must differ. No trailer anywhere ->
     'producer unattributed' (this is what F1/F2 looked like; a producer
     with a stale plan simply omits attribution, so it fails closed).
  6. OPERATIVE = LAST — only the chronologically LAST citation comment is
     evaluated. A producer self-cite posted after a valid QA countersign
     (the F3 pattern) makes that self-cite operative -> red until a fresh
     independent countersign supersedes it. In audit mode (mergedAt set)
     the pool is PRE-MERGE comments only (createdAt < mergedAt): a citation
     posted after the merge — e.g. a duplicate from a parallel heartbeat
     (AID-2840) — did not exist at the merge decision and cannot become
     operative, in either direction. No pre-merge citation at all -> red.
   7. NOT SUPERSEDED — no comment AFTER the operative citation contains an
      uppercase word-bounded VOID or HELD marker (guard-hold pattern: F3
      merged 94s after a HELD), and no 'reopened' timeline event is newer
      than the operative citation (containment close -> reopen must not
      ride a stale countersign; case #535). This scan covers the WHOLE
      conversation including post-merge comments: a countersign later found
      bogus (retro-VOID) must keep the audit red even though the citation
      pool itself is pre-merge only.
   8. SESSION ANCHOR (AID-4898) — the operative citation's session= must be
      the REAL session of its run=, proven against the run registry
      (PAPERCLIP_API_URL + PAPERCLIP_API_TOKEN/KEY):
        a. ADDENDUM PATH (conformant mid-run countersigns): a mid-run
           comment cannot know its own closing session id, and a
           hand-transcribed id can carry a typo (observed 1st hand:
           ses_ebbc4d26… vs registry ses_ebbb4d26…), so a LATER comment
           (pre-merge only in audit mode) carrying a trailer with the SAME
           agent=/task=/run= and a non-placeholder session= anchors the
           citation (no new 'Countersign:' line — the operative citation
           is untouched; latest addendum wins).
         b. REGISTRY: the cited run must EXIST, must have SUCCEEDED, and the
            effective session (trailer's, or the addendum's) must match one
            of the run's registered session ids (sessionIdBefore /
            sessionIdAfter / usageJson.persistedSessionId). Unconfigured
            registry credentials, transport errors, and auth rejections all
            FAIL CLOSED (same doctrine as SDLC_GUARD_AID_RESOLVER).
         c. RUN TEMPORAL WINDOW (AID-5235, incident AID-5233): the operative
            citation's createdAt must fall INSIDE the cited run's execution
            window [startedAt, finishedAt] (±120s clock tolerance). The
            incident's cloned citation was posted 82 min AFTER the cited run
            closed — every token in it was real (agent, task, run, session
            all matched the registry), it just belonged to a run that had
            long finished. A countersign is an act of a LIVE run; a registry
            record missing startedAt/finishedAt fails CLOSED (window
            unprovable).
   9. VERDICT RESOLUTION (AID-5235, incident AID-5233): the verdict token
      must be a canonical COMMENT ID — a Paperclip comment UUID for AID-
      tasks, a numeric GitHub comment id for GH- tasks — and it must RESOLVE:
      the comment exists on the cited task's thread, is not deleted, and was
      created by the CITED RUN (createdByRunId == the trailer's run=). The
      incident's token was the free-text word 'GO', which referred to the
      verdict of ANOTHER PR; free-text verdicts are rejected. Unconfigured
      registry credentials / transport / auth failures FAIL CLOSED.
  10. TASK↔PR BINDING (AID-5235, incident AID-5233): the cited task's thread
      must reference THIS PR number (#<n> / PR #<n> in title or description;
      the GH issue's title/body for GH- tasks). The incident's citation cited
      AID-5061 — a task whose thread names PR #700 only — cross-posted onto
      PR #714 (and #704): identity cloning from a closed run of another PR.
      A task that does not name the PR it verifies cannot countersign it.
  11. DELETION ALERT (AID-5235, incident AID-5233): prior SUCCESSFUL gate
      runs on the CURRENT head recorded an operative citation (live mode
      reads the prior successful countersign-gate workflow runs' logs for
      this head — check-run outputs are empty on GitHub Actions); if such a
      citation is no longer present in the conversation (same createdAt,
      same citation line), the gate reddens with a DELETION ALERT: the
      incident's citations were deleted ~5 min after greening the gate,
      leaving a stale green check. Deletion of a citation that greened the
      head can never be laundered by a newer citation — the alert stands
      until the incident is dispositioned on the board.

Live data comes from gh (GH_TOKEN); hermetic mode (--context/--timeline)
runs the same core on fixture JSON so the self-test needs no network.

Usage:
  countersign_gate_check.py --pr <n>                 live gate via gh
  countersign_gate_check.py --context F [--timeline F] --head <sha> [--resolver P]
  countersign_gate_check.py --self-test

Exit: 0 gate passes, 1 gate fails (violations), 2 usage/environment error.
"""

import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# CRLF tolerance (AID-3050): citations/provenance pasted from Windows
# tooling arrive with a residual CR before the newline. The trailing class
# accepts \r ONLY in the whitespace run immediately before the $ anchor —
# token classes and the head= pin anchor stay strict (self-test cases 31–35).
CITATION_RE = re.compile(
    r"^Countersign:[ \t]+((?:AID|GH)-[1-9][0-9]*)[ \t]+verdict[ \t]+"
    r"([A-Za-z0-9][A-Za-z0-9._:-]*)[ \t]*(?:head[ \t]*=[ \t]*([0-9a-fA-F]{40}))?[ \t\r]*$",
    re.MULTILINE,
)
PROVENANCE_RE = re.compile(
    r"^Provenance:[ \t]+agent=(?P<agent>[A-Za-z0-9_][A-Za-z0-9._-]*)[ \t]+"
    r"task=(?P<task>(?:AID|GH)-[1-9][0-9]*)[ \t]+"
    r"run=(?P<run>[A-Za-z0-9_][A-Za-z0-9._:-]{3,})[ \t]+"
    r"session=(?P<session>[A-Za-z0-9_][A-Za-z0-9._:-]*)[ \t\r]*$",
    re.MULTILINE,
)
SHA40_RE = re.compile(r"\b[0-9a-fA-F]{40}\b")
VOID_HELD_RE = re.compile(r"\b(VOID|HELD)\b")

# Verdict canonical shape (AID-5235 §9, incident AID-5233): the verdict token
# is a COMMENT ID — a Paperclip comment UUID (AID- tasks) or a numeric GitHub
# comment id (GH- tasks). Free-text verdicts ('GO', 'CONFORME', …) are what
# the incident's cloned citation carried; they name nothing resolvable.
VERDICT_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
VERDICT_GHID_RE = re.compile(r"^[1-9][0-9]{6,}$")

# §8c clock tolerance: GitHub comment timestamps and registry startedAt/
# finishedAt come from different clocks; sub-minute skew is expected, the
# incident's violation was 82 minutes.
CLOCK_TOLERANCE = datetime.timedelta(seconds=120)

# Session placeholder policy (AID-4898; audit AID-4897 criterion 4; metadata
# policy 2026-10-01 "placeholders are not sessions"). PROVENANCE_RE only
# validates SHAPE, so `session=opencode_local` — the adapter placeholder,
# not a session id — passed the gate while the countersigner's real run
# session (ses_ee18e706fffe…) was verifiable in the run registry. This list
# is the single source of truth: scripts/receipt_canon_check.py imports it
# (was its local KNOWN_PLACEHOLDERS, AID-3585) so the offline receipt helper
# and the live gate cannot drift. Real sessions in this fleet look like
# ses_<22+> or a UUID — none of the tokens below can be one in any runtime.
KNOWN_PLACEHOLDERS = frozenset({
    "_default", "default", "tbd", "todo", "fixme", "xxx", "xxxx", "xxxxx",
    "placeholder", "unknown", "n/a", "none", "null", "nil", "?", "??", "...",
    "-", "changeme", "change-me", "your-agent", "your-run", "your-session",
    "seu-agent", "sua-session", "agent", "run", "session", "task", "verdict",
    # adapter/runtime placeholders seen in the wild (AID-4897):
    "opencode_local", "opencode-local", "opencode", "local", "localhost",
    "local_run", "local-run", "offline", "anonymous", "anon", "unset",
    "missing", "pending", "test", "dev", "debug", "scratch", "n-a",
})
TEMPLATE_VALUE_RE = re.compile(r"^<[^>]*>$")


def is_placeholder(value):
    """True when a provenance field value is a known/template placeholder."""
    v = (value or "").strip()
    return v.lower() in KNOWN_PLACEHOLDERS or bool(TEMPLATE_VALUE_RE.match(v))

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


# AID-3056 (follow-up PR #585/AID-3055): RELAXED provenance detector for the
# fence-swallow diagnostic. PR #585's body had the closing fence glued to the
# following text ("```Prova de mutação…" on one line) — per CommonMark (and
# strip_code_fences above) that line is an OPENING fence, so the rest of the
# body, including the canonical trailer the producer had just edited in, sat
# inside a never-closed fence. The gate reddened §5 ("countersign agent IS
# the producer agent") — technically correct (the earliest VISIBLE trailer
# had flipped), but the message sent the producer chasing agent identity
# instead of the fence, costing a debug cycle. Diagnostic only: fail-closed
# behavior is unchanged, the violation message just names the swallow.
RELAXED_PROVENANCE_LINE_RE = re.compile(r"^ {0,3}Provenance:[ \t]*\S")


def fence_swallowed_provenance_lines(text):
    """Relaxed 'Provenance:' lines present in the raw body but swallowed by
    code fences (absent from the fence-stripped body).

    A line that also survives outside a fence is not reported: an operative
    trailer exists, so the fence is not the story.
    """
    if not text:
        return []
    kept = set(strip_code_fences(text).split("\n"))
    return [line for line in text.split("\n")
            if RELAXED_PROVENANCE_LINE_RE.match(line) and line not in kept]


def fence_swallow_hint(ctx):
    """AID-3056: append-ready diagnostic naming where a 'Provenance:' line is
    being swallowed by a fence (PR body or any comment). None when no
    swallow exists. Message-only — no acceptance condition changes.
    """
    sources = [("PR body", ctx.get("body") or "")]
    sources += [("comment posted %s" % (c.get("createdAt") or "?")[:19],
                 c.get("body") or "")
                for c in (ctx.get("comments") or [])]
    where = [name for name, raw in sources
             if fence_swallowed_provenance_lines(raw)]
    if not where:
        return None
    return ("diagnostic (AID-3056): %s carries a 'Provenance:' line that is "
            "inside a code fence / unbalanced fence — fences swallow trailers "
            "(AID-2824; PR #585 follow-up). Check for a glued/unclosed ``` "
            "line before the trailer and re-post it outside any fence."
            % "; ".join(where[:3]))


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
# Run registry anchor (AID-4898 §8b). HTTP via urllib (stdlib — no curl/gh
# dependency); the CI job already provisions PAPERCLIP_API_URL/TOKEN for the
# AID resolver, so this adds no new secret. Fail-closed on every failure
# class with a distinguishable message (resolver doctrine, AID-2768 §2).
# ---------------------------------------------------------------------------

def registry_config():
    base = (os.environ.get("PAPERCLIP_API_URL") or "").rstrip("/")
    token = os.environ.get("PAPERCLIP_API_TOKEN") or os.environ.get("PAPERCLIP_API_KEY") or ""
    if base.startswith("http://"):
        # The board redirects http->https and the redirect drops the
        # Authorization header (sdlc_aid_resolve.sh precedent) — normalize
        # except for loopback, where the hermetic self-test stub serves http.
        host = base[len("http://"):].split("/")[0].split(":")[0]
        if host not in ("127.0.0.1", "localhost", "::1"):
            base = "https://" + base[len("http://"):]
    return base, token


def lookup_run(run_id):
    """Fetch the run-registry record for run_id; raise Violation fail-closed.

    Returns the parsed record dict on 200. Unconfigured credentials, 404,
    auth rejection, transport failure, and malformed JSON are all Violations
    (never read as 'absent'/'ok' — AID-2836 convention).
    """
    base, token = registry_config()
    if not base or not token:
        raise Violation(
            "PAPERCLIP_API_URL/PAPERCLIP_API_TOKEN are not configured — cannot "
            "anchor the countersign run %s in the run registry (fail-closed, "
            "AID-4898 §8)" % run_id
        )
    req = urllib.request.Request(
        "%s/api/heartbeat-runs/%s" % (base, run_id),
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise Violation(
                "cited run %s does not exist in the run registry — a countersign "
                "must cite a real run (AID-4898 §8)" % run_id
            )
        if exc.code in (401, 403):
            raise Violation(
                "run-registry credentials rejected (HTTP %d) — cannot anchor run "
                "%s (fail-closed, AID-4898 §8)" % (exc.code, run_id)
            )
        raise Violation(
            "run-registry HTTP error (%s) on run %s — fail-closed (AID-4898 §8)"
            % (exc, run_id)
        )
    except Exception as exc:  # URLError, timeout, DNS…
        raise Violation(
            "run-registry transport error on run %s (%s) — fail-closed, retry or "
            "escalate to the FPE; never read as absent (AID-4898 §8 / AID-2836 "
            "convention)" % (run_id, exc)
        )
    try:
        rec = json.loads(payload)
        if not isinstance(rec, dict):
            raise ValueError("registry payload is %s, not an object" % type(rec).__name__)
    except ValueError as exc:
        raise Violation(
            "run-registry returned malformed JSON for run %s (%s) — fail-closed "
            "(AID-4898 §8)" % (run_id, exc)
        )
    return rec


def run_sessions(rec):
    """The session ids a run was actually executed under (registered facts)."""
    out = []
    for key in ("sessionIdBefore", "sessionIdAfter"):
        v = (rec.get(key) or "").strip() if isinstance(rec.get(key), str) else ""
        if v:
            out.append(v)
    usage = rec.get("usageJson")
    if isinstance(usage, dict):
        v = (usage.get("persistedSessionId") or "").strip()
        if v:
            out.append(v)
    return out


def parse_ts(value):
    """Parse an ISO-8601 timestamp (Z or offset, optional millis) or None."""
    if not isinstance(value, str) or not value.strip():
        return None
    s = value.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.datetime.fromisoformat(s)
    except ValueError:
        return None


def registry_get(path, context):
    """GET <PAPERCLIP_API_URL><path> and return the parsed JSON payload.

    Fail-closed Violation on every failure class (unconfigured credentials,
    404, auth rejection, transport, malformed JSON) — AID-2836 convention:
    a failure is never read as 'absent'/'ok'. `context` names the check the
    fetch serves (message detail only).
    """
    base, token = registry_config()
    if not base or not token:
        raise Violation(
            "PAPERCLIP_API_URL/PAPERCLIP_API_TOKEN are not configured — cannot "
            "%s (fail-closed, AID-5235)" % context
        )
    req = urllib.request.Request(
        "%s%s" % (base, path),
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise Violation("404 on %s while trying to %s — fail-closed (AID-5235)" % (path, context))
        if exc.code in (401, 403):
            raise Violation(
                "registry credentials rejected (HTTP %d) on %s — cannot %s "
                "(fail-closed, AID-5235)" % (exc.code, path, context)
            )
        raise Violation(
            "registry HTTP error (%s) on %s — fail-closed (AID-5235)" % (exc, path)
        )
    except Exception as exc:  # URLError, timeout, DNS…
        raise Violation(
            "registry transport error on %s (%s) — fail-closed, retry or "
            "escalate to the FPE; never read as absent (AID-2836 convention, "
            "AID-5235)" % (path, exc)
        )
    try:
        obj = json.loads(payload)
    except ValueError as exc:
        raise Violation(
            "registry returned malformed JSON for %s (%s) — fail-closed (AID-5235)"
            % (path, exc)
        )
    return obj


def verify_verdict_comment(aid, ref, countersign_run, slug):
    """§9 VERDICT RESOLUTION (AID-5235, incident AID-5233).

    The verdict token must be a canonical comment id that RESOLVES to a real,
    undeleted comment on the cited task's thread, created by the CITED RUN.
    The incident's token was the free word 'GO' pointing at another PR's
    verdict — resolvable tokens make verdict identity mechanical.
    """
    if aid.startswith("GH-"):
        if not VERDICT_GHID_RE.match(ref):
            raise Violation(
                "verdict token %r is not a canonical numeric GitHub comment id "
                "(AID-5235 §9, incident AID-5233: free-text verdicts like 'GO' "
                "named another PR's verdict) — cite the id of the verdict "
                "comment on the cited GH task thread" % ref
            )
        if not slug:
            raise Violation(
                "cannot resolve GH verdict comment %s — no repository slug "
                "available (fail-closed, AID-5235 §9)" % ref
            )
        try:
            raw = gh_output(["gh", "api",
                             "repos/%s/issues/comments/%s" % (slug, ref)])
            obj = json.loads(raw)
            issue_url = obj.get("issue_url") or ""
            if not issue_url.rstrip("/").endswith("/issues/%s" % aid[3:]):
                raise Violation(
                    "verdict comment %s belongs to another issue (%s), not the "
                    "cited %s (AID-5235 §9)" % (ref, issue_url, aid)
                )
        except RuntimeError as exc:
            raise Violation(
                "verdict comment %s did not resolve on %s — %s (AID-5235 §9)"
                % (ref, aid, str(exc).splitlines()[0][:200])
            )
        return
    # AID- task: Paperclip comment UUID on the cited task's thread.
    if not VERDICT_UUID_RE.match(ref):
        raise Violation(
            "verdict token %r is not a canonical comment id (UUID) — free-text "
            "verdicts are rejected: the AID-5233 citation's 'GO' was a real "
            "word naming ANOTHER PR's verdict; cite the id of the verdict "
            "comment posted by the countersign run on the cited task thread "
            "(AID-5235 §9)" % ref
        )
    comments = registry_get(
        "/api/issues/%s/comments" % aid,
        "resolve the verdict comment %s on the cited task %s" % (ref, aid),
    )
    if not isinstance(comments, list):
        raise Violation(
            "comment listing for %s is %s, not a list — fail-closed (AID-5235 §9)"
            % (aid, type(comments).__name__)
        )
    hit = next((c for c in comments
                if isinstance(c, dict)
                and str(c.get("id") or "").lower() == ref.lower()), None)
    if hit is None:
        raise Violation(
            "verdict comment %s does not exist on the cited task %s's thread — "
            "the verdict must be a real comment of the countersign run "
            "(AID-5235 §9)" % (ref, aid)
        )
    if hit.get("deletedAt"):
        raise Violation(
            "verdict comment %s is DELETED on the cited task %s — a deleted "
            "verdict cannot countersign a merge (AID-5235 §9, deletion pattern "
            "of incident AID-5233)" % (ref, aid)
        )
    creator = hit.get("createdByRunId")
    if not isinstance(creator, str) or not creator.strip():
        raise Violation(
            "verdict comment %s carries no createdByRunId — cannot prove it "
            "came from the cited run (fail-closed, AID-5235 §9)" % ref
        )
    if creator != countersign_run:
        raise Violation(
            "verdict comment %s was created by run %s, NOT by the cited run %s "
            "— the verdict must be the countersign run's own verdict "
            "(AID-5235 §9)" % (ref, creator, countersign_run)
        )


def task_mentions_pr(text, pr_number):
    """§10: does the task thread text reference THIS PR number?

    Accepts '#<n>' or 'PR #<n>'/'PR<n>' (case-insensitive), with lookarounds
    so the number is not embedded in a longer digit/hex run (a 40-hex SHA may
    contain '714' between hex letters).
    """
    n = str(int(pr_number))
    pat = (r"(?<![0-9A-Za-z])(?:#%s|PR[ \t]?#?%s)(?![0-9])" % (n, n))
    return re.search(pat, text or "", re.IGNORECASE) is not None


def verify_task_pr_binding(aid, pr_number, slug):
    """§10 TASK↔PR BINDING (AID-5235, incident AID-5233).

    The cited task's thread must name the PR being gated. The incident's
    citation cited AID-5061 (a task whose thread names PR #700 only) on PR
    #714: every registry token was real, but the TASK was bound to another
    PR. This check makes cross-PR identity cloning mechanically red.
    """
    if not pr_number:
        raise Violation(
            "PR number unavailable — cannot verify the task↔PR binding of the "
            "cited task (fail-closed, AID-5235 §10)"
        )
    if aid.startswith("GH-"):
        if not slug:
            raise Violation(
                "cannot verify binding of %s to the PR — no repository slug "
                "available (fail-closed, AID-5235 §10)" % aid
            )
        try:
            obj = json.loads(gh_output(
                ["gh", "api", "repos/%s/issues/%s" % (slug, aid[3:])]))
            text = "%s\n%s" % (obj.get("title") or "", obj.get("body") or "")
        except RuntimeError as exc:
            raise Violation(
                "cannot read the cited %s to verify its PR binding — %s "
                "(fail-closed, AID-5235 §10)" % (aid, str(exc).splitlines()[0][:200])
            )
    else:
        iss = registry_get(
            "/api/issues/%s" % aid,
            "verify the task↔PR binding of the cited task %s" % aid,
        )
        if not isinstance(iss, dict):
            raise Violation(
                "issue record for %s is %s, not an object — fail-closed "
                "(AID-5235 §10)" % (aid, type(iss).__name__)
            )
        text = "%s\n%s" % (iss.get("title") or "", iss.get("description") or "")
    if not task_mentions_pr(text, pr_number):
        raise Violation(
            "cited task %s does not reference PR #%s in its title/description — "
            "cross-PR countersign refused (incident AID-5233: a citation for "
            "AID-5061, a task bound to PR #700, greened PR #714 and #704); the "
            "countersign task must name the PR it verifies (AID-5235 §10)"
            % (aid, pr_number)
        )


# ---------------------------------------------------------------------------
# Core evaluation. ctx: {body, mergedAt, comments:[{createdAt, body}]};
# timeline: [{event, created_at}]; head: current PR head sha (40-hex).
# Returns (operative_comment, producer_agent) on success; raises Violation.
# ---------------------------------------------------------------------------

def evaluate(ctx, timeline, head, resolver, slug=None):
    body = ctx.get("body") or ""
    merged_at = ctx.get("mergedAt") or None
    pr_number = ctx.get("number") or None
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
    earliest = None  # (sortkey, agent, session)
    m = PROVENANCE_RE.search(body)
    if m:
        earliest = ((0, ""), m.group("agent"), m.group("session"))
    for c, sbody in scanned:
        m = PROVENANCE_RE.search(sbody)
        if m:
            key = (1, c.get("createdAt") or "")
            if earliest is None or key < earliest[0]:
                earliest = (key, m.group("agent"), m.group("session"))
    if earliest is None:
        raise Violation(
            "producer unattributed: no 'Provenance: agent=… task=… run=… session=…' "
            "trailer in the PR body or any comment — the producer must register "
            "itself before an independent countersign can be checked against it "
            "(fail-closed, AID-2768 §5)"
        )
    producer_agent = earliest[1]
    # Producer session placeholder (AID-4898 §4): a trailer whose session= is
    # a placeholder is not an attribution — the producer's run must be
    # identifiable in the registry by a real session id.
    if is_placeholder(earliest[2]):
        raise Violation(
            "producer trailer session=%r is a placeholder, not a session id "
            "(policy 2026-10-01, AID-4898 §4) — re-register the producer "
            "provenance with the real session of its run" % earliest[2]
        )

    # Operative citation = chronologically LAST comment with a line-start
    # 'Countersign:' citation (F3: a later producer self-cite supersedes and
    # must itself be valid; body-only citations are not orderable pre-merge).
    # Audit mode (AID-2840): on a merged PR the pool is restricted to comments
    # posted strictly BEFORE mergedAt — Stage-2 parity (sdlc_guard_check.sh
    # skips at/after-mergedAt citations). A duplicate citation posted after
    # the merge (parallel heartbeats racing the same re-pin) did not exist at
    # the merge decision and cannot become operative; comments without a
    # timestamp are also excluded (cannot prove pre-merge — fail-closed).
    # The audit question is "was the merge legitimate AT mergedAt?", so this
    # only narrows the SELECTION pool: §7 VOID/HELD and reopen checks below
    # still scan the whole conversation, so a retro-VOID keeps the audit red.
    # §11 DELETION ALERT (AID-5235, incident AID-5233) runs BEFORE the
    # operative-selection so a deleted citation reports as DELETION, not as a
    # generic "no citation found". Prior passes are supplied by the live
    # collector (successful countersign-gate workflow runs on THIS head whose
    # log recorded the operative citation); every prior citation that greened
    # this head must still be present verbatim (same createdAt, same line). A
    # newer citation cannot launder a deletion — the alert stands.
    for pp in ctx.get("priorGatePasses") or []:
        pcite = ((pp.get("citation") or "").strip())
        pwhen = (pp.get("postedAt") or "").strip()
        if not pcite or not pwhen:
            continue  # unparseable prior record — nothing provable from it
        present = any(
            c.get("createdAt") == pwhen and pcite in strip_code_fences(c.get("body") or "")
            for c in comments
        )
        if not present:
            raise Violation(
                "DELETION ALERT (AID-5235 §11, incident AID-5233): a citation "
                "that previously greened this head — %r (posted %s) — is no "
                "longer present in the conversation. Citations cannot be "
                "deleted after greening the gate; the incident's clones were "
                "deleted ~5 min after the green, leaving a stale check. "
                "Disposition the incident on the board and post a FRESH "
                "independent countersign; this alert does not clear by "
                "re-posting the same line." % (pcite[:160], pwhen)
            )

    body_cited = None
    operative = None
    pool_scanned = scanned
    if merged_at:
        pool_scanned = [
            (c, sbody) for c, sbody in scanned
            if c.get("createdAt") and c.get("createdAt") < merged_at
        ]
    for c, sbody in pool_scanned:
        if CITATION_RE.search(sbody):
            operative = c
    if operative is None:
        if CITATION_RE.search(body):
            body_cited = "body"
        if merged_at:
            where = (
                "no 'Countersign: <AID|GH>-<n> verdict <ref>' line found in any "
                "PR comment posted BEFORE mergedAt (%s) — on a merged PR the "
                "audit evaluates only pre-merge comments (AID-2768 §1/§6, "
                "AID-2840)" % merged_at
            )
        elif body_cited:
            where = (
                "the only 'Countersign:' citation is in the PR BODY, which has no "
                "verifiable posting time — post it as a PR comment (AID-2768 §1)"
            )
        else:
            where = (
                "no 'Countersign: <AID|GH>-<n> verdict <ref>' line found in any "
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
    countersign_run = m.group("run")
    cite_session = m.group("session")

    # SESSION ANCHOR (AID-4898). A mid-run comment cannot know its own
    # closing session id (the structural cause behind session=opencode_local,
    # audit AID-4897 §4), and a hand-transcribed id can carry a typo —
    # observed 1st hand on the very first countersign under this contract
    # (trailer ses_ebbc4d26… vs registry ses_ebbb4d26…). The REGISTRY is the
    # arbiter (§8b); the ADDENDUM is the conformant repair path: a comment
    # posted AFTER the operative citation (pre-merge only in audit mode — the
    # anchor must exist at the merge decision, same ordering rule as §6/§7)
    # carrying a trailer with the SAME agent=/task=/run= and a non-placeholder
    # session=. No new 'Countersign:' line: the operative citation is
    # untouched, only its session gets anchored. A placeholder operative
    # session REQUIRES an addendum; a non-placeholder one may be superseded
    # by a later addendum (latest wins — e.g. correcting a transcribed id);
    # every candidate still has to match the registry in §8b.
    anchor_pool = []
    for c, sbody in scanned:
        cwhen = c.get("createdAt") or ""
        if not (when and cwhen > when):
            continue  # strictly after the operative citation
        if merged_at and not (cwhen and cwhen < merged_at):
            continue  # audit mode: anchor must be pre-merge
        am = PROVENANCE_RE.search(sbody)
        if not am:
            continue
        if (am.group("agent") == countersign_agent
                and am.group("task") == m.group("task")
                and am.group("run") == countersign_run
                and not is_placeholder(am.group("session"))):
            anchor_pool.append((cwhen, am.group("session")))
    effective_session = cite_session
    if is_placeholder(cite_session):
        if not anchor_pool:
            raise Violation(
                "operative citation trailer session=%r is a placeholder, not a "
                "session id (policy 2026-10-01, audit AID-4897 §4) — post a "
                "provenance ADDENDUM (same agent/task/run, real session, no new "
                "'Countersign:' line) after the countersign run completes, or "
                "re-countersign with the real session (AID-4898 §8a)" % cite_session
            )
        effective_session = max(anchor_pool)[1]
    elif anchor_pool:
        # Latest addendum wins (registry-checked below): corrects a
        # mis-transcribed non-placeholder id without disturbing the citation.
        # An addendum can only redden, never green-wash: §8b still decides.
        effective_session = max(anchor_pool)[1]

    # REGISTRY ANCHOR (AID-4898 §8b): the cited run must be a real, SUCCEEDED
    # run whose registered session ids include the effective session. This is
    # what turns 'run=<id>' from a free-text token into an anchored fact.
    rec = lookup_run(countersign_run)
    run_status = rec.get("status")
    if run_status != "succeeded":
        raise Violation(
            "cited run %s has registry status %r (need 'succeeded') — a "
            "countersign must come from a completed run; if it is still "
            "running, wait for completion and re-run the gate (fail-closed, "
            "AID-4898 §8b)" % (countersign_run, run_status)
        )
    registered = run_sessions(rec)
    if effective_session not in registered:
        raise Violation(
            "session '%s' does not match any registered session of run %s "
            "(registry: %s) — the countersign must anchor the run's REAL "
            "session (audit AID-4897 §4, AID-4898 §8b)"
            % (effective_session, countersign_run,
               ", ".join(sorted(set(registered))) if registered else "none registered")
        )

    # §8c RUN TEMPORAL WINDOW (AID-5235, incident AID-5233): the citation
    # must have been posted while the cited run was EXECUTING. The incident's
    # clone was posted 82 min after the run closed — every token real, window
    # violated. Registry records without startedAt/finishedAt fail closed.
    run_started = parse_ts(rec.get("startedAt"))
    run_finished = parse_ts(rec.get("finishedAt"))
    when_dt = parse_ts(when)
    if run_started is None or run_finished is None or when_dt is None:
        raise Violation(
            "cannot establish the run window for cited run %s (registry "
            "startedAt=%r finishedAt=%r; citation posted %r) — a countersign "
            "must provably fall inside the cited run's execution window "
            "(fail-closed, AID-5235 §8c)"
            % (countersign_run, rec.get("startedAt"), rec.get("finishedAt"), when)
        )
    try:
        outside = when_dt < (run_started - CLOCK_TOLERANCE) or \
            when_dt > (run_finished + CLOCK_TOLERANCE)
    except TypeError:  # mixed naive/aware clocks — unprovable, fail closed
        raise Violation(
            "cannot compare citation time %r with run %s window [%r, %r] "
            "(mixed timestamp formats) — fail-closed (AID-5235 §8c)"
            % (when, countersign_run, rec.get("startedAt"), rec.get("finishedAt"))
        )
    if outside:
        raise Violation(
            "operative citation (posted %s) lies OUTSIDE the cited run %s "
            "execution window [%s .. %s] — a countersign must be posted by "
            "the run while it executes; the AID-5233 clone was posted 82 min "
            "AFTER the cited run closed (fail-closed, AID-5235 §8c)"
            % (when, countersign_run, rec.get("startedAt"), rec.get("finishedAt"))
        )

    # §9 VERDICT RESOLUTION (AID-5235, incident AID-5233).
    verify_verdict_comment(aid, ref, countersign_run, slug)

    # §10 TASK↔PR BINDING (AID-5235, incident AID-5233).
    verify_task_pr_binding(aid, pr_number, slug)

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

    return operative, producer_agent, countersign_agent, effective_session


def fetch_prior_gate_passes(slug, head):
    """§11 live collector (AID-5235): operative citations recorded by PRIOR
    SUCCESSFUL countersign-gate workflow runs on THIS head.

    GitHub Actions check-runs expose no output payload, so the prior verdict
    is recovered from the prior runs' logs (the canonical PASS line). Only
    head-attached tiers (pull_request / workflow_dispatch) can green a PR
    head; the comment tier attaches to main HEADs and is filtered out by the
    headSha match anyway. Transport failures raise (fail-closed upstream).
    """
    raw = gh_output([
        "gh", "run", "list", "--workflow=countersign-gate.yml",
        "--limit", "50", "--json", "databaseId,conclusion,headSha,event",
    ])
    runs = json.loads(raw)
    if not isinstance(runs, list):
        raise RuntimeError("gh run list returned %s, not a list" % type(runs).__name__)
    seen = set()
    out = []
    for r in runs:
        if not isinstance(r, dict):
            continue
        if (r.get("headSha") or "").lower() != (head or "").lower():
            continue
        if r.get("conclusion") != "success":
            continue
        if r.get("event") not in ("pull_request", "workflow_dispatch"):
            continue
        run_id = r.get("databaseId")
        if not run_id:
            continue
        log = gh_output(["gh", "run", "view", str(run_id), "--log"])
        for m in re.finditer(
            r"countersign-gate: PASS — operative citation: (.+?) \(posted ([^)]+)\)",
            log,
        ):
            key = (m.group(1).strip(), m.group(2).strip())
            if key not in seen:
                seen.add(key)
                out.append({"citation": key[0], "postedAt": key[1],
                            "sourceRunId": str(run_id)})
    return out


def run_gate(args):
    resolver = os.environ.get("SDLC_GUARD_AID_RESOLVER", "") or None
    slug = None  # set in live mode; hermetic GH verdict/binding checks fail closed
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
                 "number,headRefOid,body,comments,mergedAt,state"]
            )
        )
        ctx = prj
        head = prj.get("headRefOid") or ""
        raw = gh_output(
            ["gh", "api", "repos/%s/issues/%s/timeline" % (slug, args.pr),
             "--paginate"]
        )
        timeline = decode_concat_json(raw)
        # §11 (AID-5235): recover the citations that previously greened THIS
        # head from prior successful gate runs, so a deletion between runs is
        # a DELETION ALERT, not a generic missing-citation red. Transport
        # failure is fail-closed rc=2 (distinguishable, never 'absent').
        try:
            ctx["priorGatePasses"] = fetch_prior_gate_passes(slug, head)
        except RuntimeError as exc:
            print("ERROR: cannot read prior countersign-gate runs for head %s "
                  "— deletion check unavailable, fail-closed: %s"
                  % (head, exc), file=sys.stderr)
            return 2

    if not head:
        print("ERROR: no PR head SHA available (use --head in hermetic mode)", file=sys.stderr)
        return 2

    try:
        operative, producer, countersigner, session = evaluate(
            ctx, timeline, head, resolver, slug=slug)
    except Violation as raw_exc:
        # AID-3056 diagnostic (PR #585 follow-up): if a 'Provenance:' line is
        # being swallowed by an unbalanced/glued fence in the body or any
        # comment, NAME it — the incident's §5 message pointed at agent
        # identity while the root cause was the fence. Fail-closed verdict
        # and exit code are unchanged; only the message gains the hint.
        exc = raw_exc
        hint = fence_swallow_hint(ctx)
        if hint and hint[:40] not in str(exc):
            exc = Violation("%s | %s" % (exc, hint))
        if args.print_citation:
            print("ERROR: gate fails — no operative citation to print: %s" % exc,
                  file=sys.stderr)
            return 1
        annotate("error", "countersign-gate FAIL (AID-2768): %s" % exc)
        print("countersign-gate: FAIL — %s" % exc)
        return 1

    cite = CITATION_RE.search(strip_code_fences(operative.get("body") or ""))
    if args.print_citation:
        print("%s (agent=%s, distinct from producer agent=%s, head=%s pinned, "
              "session=%s anchored to run, posted %s)"
              % (cite.group(0).strip(), countersigner, producer, head,
                 session, operative.get("createdAt")))
        return 0
    annotate(
        "notice",
        "countersign-gate PASS (AID-2768): operative citation '%s' (posted %s) — "
        "producer agent '%s' != countersign agent '%s', head %s pinned, session "
        "%s anchored to run %s, no VOID/HELD or reopen supersedes it"
        % (cite.group(0).strip(), operative.get("createdAt"), producer,
           countersigner, head[:12], session,
           PROVENANCE_RE.search(strip_code_fences(
               operative.get("body") or "")).group("run")),
    )
    print(
        "countersign-gate: PASS — operative citation: %s (posted %s); producer "
        "agent '%s' / countersign agent '%s'; head %s pinned; session %s "
        "anchored to run"
        % (cite.group(0).strip(), operative.get("createdAt"), producer,
           countersigner, head, session)
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
        fh.write("#!/usr/bin/env bash\ncase \"$1\" in AID-9006|AID-9007) exit 0 ;; *) exit 1 ;; esac\n")
    os.chmod(stub, 0o755)

    # Stub run registry (AID-4898 §8b): a loopback HTTP server serving
    # /api/heartbeat-runs/<id> fixtures so the session anchor is proven
    # hermetically (no network, same contract as the live board API).
    # AID-5235: records now carry startedAt/finishedAt (§8c window), and the
    # stub also serves /api/issues/<key> + /api/issues/<key>/comments (§9
    # verdict resolution, §10 task↔PR binding) for the cited task threads.
    WSTART, WEND = "2026-09-26T04:00:00Z", "2026-09-26T06:00:00Z"
    registry_runs = {
        "w2800": {"id": "w2800", "status": "succeeded", "exitCode": 0,
                  "startedAt": WSTART, "finishedAt": WEND,
                  "sessionIdBefore": None,
                  "sessionIdAfter": "1e9be0fa-c320-4309-9704-c755c53da7fd",
                  "usageJson": {}},
        "w2801": {"id": "w2801", "status": "succeeded", "exitCode": 0,
                  "startedAt": WSTART, "finishedAt": WEND,
                  "sessionIdBefore": None,
                  "sessionIdAfter": "ca6a3f95-0000-0000-0000-000000000000",
                  "usageJson": {}},
        # the audited V&E countersign run shape (AID-4897 criterion 4)
        "w4898ve": {"id": "w4898ve", "status": "succeeded", "exitCode": 0,
                    "startedAt": WSTART, "finishedAt": WEND,
                    "sessionIdBefore": None,
                    "sessionIdAfter": "ses_ee18e706fffeBmR3tN52V5396h",
                    "usageJson": {"persistedSessionId":
                                  "ses_ee18e706fffeBmR3tN52V5396h"}},
        # mid-run record: not yet succeeded, no session registered
        "w4898run": {"id": "w4898run", "status": "running", "exitCode": None,
                     "startedAt": WSTART, "finishedAt": None,
                     "sessionIdBefore": None, "sessionIdAfter": None,
                     "usageJson": {}},
        # session registered ONLY via usageJson.persistedSessionId
        "w4898ps": {"id": "w4898ps", "status": "succeeded", "exitCode": 0,
                    "startedAt": WSTART, "finishedAt": WEND,
                    "sessionIdBefore": None, "sessionIdAfter": None,
                    "usageJson": {"persistedSessionId":
                                  "ses_persistedonly00000000000000000X"}},
        # AID-5233 incident shape (§8c): a REAL run that closed 82 min BEFORE
        # the cloned citation was posted (01:00→03:38 vs citation 05:00).
        "w5233late": {"id": "w5233late", "status": "succeeded", "exitCode": 0,
                      "startedAt": "2026-09-26T01:00:00Z",
                      "finishedAt": "2026-09-26T03:38:00Z",
                      "sessionIdBefore": None,
                      "sessionIdAfter": "ses_cloned52330000000000000000000A",
                      "usageJson": {}},
        # registry record without timestamps: window unprovable -> fail closed
        "w5233nots": {"id": "w5233nots", "status": "succeeded", "exitCode": 0,
                      "sessionIdBefore": None,
                      "sessionIdAfter": "ses_notimestamps00000000000000000B",
                      "usageJson": {}},
    }
    stub_issues = {
        # the healthy countersign task: names the PR it verifies (§10)
        "AID-9006": {"identifier": "AID-9006",
                     "title": "Countersign QA — PR #4242 (stub)",
                     "description": "verificação independente do PR #4242"},
        # a task bound to ANOTHER PR (incident AID-5233 cross-post target)
        "AID-9007": {"identifier": "AID-9007",
                     "title": "Countersign QA — PR #4700 (stub)",
                     "description": "verificação independente do PR #4700"},
    }
    V = "5235%04d-0000-4000-8000-0000000000%02x"
    stub_issue_comments = {
        "AID-9006": [
            {"id": V % (1, 1), "createdByRunId": "w2801", "deletedAt": None},
            {"id": V % (2, 2), "createdByRunId": "w4898ve", "deletedAt": None},
            {"id": V % (3, 3), "createdByRunId": "w4898ps", "deletedAt": None},
            {"id": V % (4, 4), "createdByRunId": "w2801", "deletedAt": None},
            {"id": V % (5, 5), "createdByRunId": "w5233late", "deletedAt": None},
            {"id": V % (6, 6), "createdByRunId": "w5233nots", "deletedAt": None},
            # §9: a verdict comment deleted after the fact (incident pattern)
            {"id": V % (7, 7), "createdByRunId": "w2801",
             "deletedAt": "2026-09-26T05:05:00Z"},
            # §9: a verdict comment created by the PRODUCER's run
            {"id": V % (8, 8), "createdByRunId": "w2800", "deletedAt": None},
        ],
        "AID-9007": [
            {"id": V % (9, 9), "createdByRunId": "w2801", "deletedAt": None},
        ],
    }

    class _StubHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            m = re.match(r"^/api/heartbeat-runs/([^/?]+)$", self.path)
            if m and m.group(1) in registry_runs:
                blob = json.dumps(registry_runs[m.group(1)]).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(blob)))
                self.end_headers()
                self.wfile.write(blob)
                return
            m = re.match(r"^/api/issues/([^/?]+)/comments$", self.path)
            if m and m.group(1) in stub_issue_comments:
                blob = json.dumps(stub_issue_comments[m.group(1)]).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(blob)))
                self.end_headers()
                self.wfile.write(blob)
                return
            m = re.match(r"^/api/issues/([^/?]+)$", self.path)
            if m and m.group(1) in stub_issues:
                blob = json.dumps(stub_issues[m.group(1)]).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(blob)))
                self.end_headers()
                self.wfile.write(blob)
                return
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.end_headers()

        def log_message(self, *args):
            pass

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), _StubHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    stub_registry = "http://127.0.0.1:%d" % httpd.server_address[1]

    prod_trailer = ("Provenance: agent=platform-ci task=AID-2768 run=w2800 "
                    "session=1e9be0fa-c320-4309-9704-c755c53da7fd")
    qa_trailer = ("Provenance: agent=qa-lead task=AID-9006 run=w2801 "
                  "session=ca6a3f95-0000-0000-0000-000000000000")
    # Canonical verdicts (AID-5235 §9): comment ids RESOLVING on the stub
    # thread of the cited task, each created by the run in its trailer.
    cite_line = ("Countersign: AID-9006 verdict 52350001-0000-4000-8000-"
                 "000000000001 head=" + HEAD)
    cite_line_ve = ("Countersign: AID-9006 verdict 52350002-0000-4000-8000-"
                    "000000000002 head=" + HEAD)
    cite_line_ps = ("Countersign: AID-9006 verdict 52350003-0000-4000-8000-"
                    "000000000003 head=" + HEAD)

    def scenario(name, expected, ctx, timeline=None, head=HEAD, resolver=stub,
                 env_resolver=True, merged_at=None, registry=stub_registry,
                 pr=4242, prior=None, expect_msg=None, absent_msg=None):
        if merged_at is not None:
            ctx = dict(ctx)
            ctx["mergedAt"] = merged_at
        # AID-5235: §10 needs the PR number in-band; §11 takes the prior
        # green citations (live mode collects them from prior run logs).
        ctx = dict(ctx)
        ctx.setdefault("number", pr)
        if prior is not None:
            ctx["priorGatePasses"] = prior
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
        # Run-registry anchor env: point at the loopback stub by default; a
        # scenario may pass registry=None to prove the unconfigured case is
        # fail-closed. Never leak this process's real registry env into a
        # hermetic scenario.
        for var in ("PAPERCLIP_API_URL", "PAPERCLIP_API_TOKEN",
                    "PAPERCLIP_API_KEY"):
            env.pop(var, None)
        if registry:
            env["PAPERCLIP_API_URL"] = registry
            env["PAPERCLIP_API_TOKEN"] = "stub-token"
        proc = subprocess.run(argv, capture_output=True, text=True, env=env)
        ok = proc.returncode == expected
        blob = proc.stdout + proc.stderr
        # AID-3056: expect_msg/absent_msg pin the DIAGNOSTIC text of the
        # violation (fence-swallow hint) without depending on rc alone.
        if ok and expect_msg is not None:
            ok = expect_msg in blob
        if ok and absent_msg is not None:
            ok = absent_msg not in blob
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
    re_cite = ("Countersign: AID-9006 verdict 52350004-0000-4000-8000-"
               "000000000004 head=" + HEAD2)
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
    naked_cite = ("Countersign: AID-9006 verdict 52350001-0000-4000-8000-"
                  "000000000001\nHead verificado: " + HEAD + "\n" + qa_trailer)
    cases.append(scenario(
        "head pinned in comment body passes", 0,
        _ctx("producer body\n" + prod_trailer, [_comment(T, naked_cite)]),
    ))
    # 21. AID-2840: duplicate citation posted AFTER the merge (parallel
    # heartbeat racing the same re-pin) must NOT become operative in audit
    # mode — the pre-merge citation is what gated the merge.
    cases.append(scenario(
        "post-merge duplicate citation ignored (audit, AID-2840)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T06:00:00Z", cite_line + "\n" + qa_trailer)]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 22. AID-2840: citation posted only after the merge -> nothing pre-merge
    # to audit -> fail-closed.
    cases.append(scenario(
        "post-merge-only citation fails (audit, AID-2840)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T06:00:00Z", cite_line + "\n" + qa_trailer)]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 23. AID-2840: VOID posted after the merge still reddens the audit —
    # narrowing the citation pool must not silence retro-voids (§7 whole
    # conversation).
    cases.append(scenario(
        "post-merge VOID still reddens audit (AID-2840)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T06:00:00Z",
                       "GUARD: countersign posteriormente anulado — VOID, merge HELD.")]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 24. AID-2840: laundering attempt — producer self-cite pre-merge (F3),
    # valid independent citation only AFTER the merge: the operative stays
    # the last PRE-merge citation, so the audit stays red.
    cases.append(scenario(
        "pre-merge self-cite stays operative despite post-merge fix", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + prod_trailer),
              _comment("2026-09-26T06:00:00Z", cite_line + "\n" + qa_trailer)]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 25–30. fence-aware citation scan (AID-2824, finding AID-2818): lines
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
    # 25. fenced template AFTER a valid countersign does not supersede it
    cases.append(scenario(
        "fenced template after countersign does not supersede (AID-2818)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T05:03:00Z", fenced_template)]),
    ))
    # 26. fenced template BEFORE the countersign does not become operative
    cases.append(scenario(
        "fenced template before countersign stays inert", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T04:55:00Z", fenced_template),
              _comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 27. citation ONLY inside a fence -> no operative citation -> fail
    cases.append(scenario(
        "citation only inside a fence fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "how to countersign:\n```\n" + cite_line + "\n"
                        + qa_trailer + "\n```")]),
    ))
    # 28. head pinned only inside a fence does not satisfy the pin
    cases.append(scenario(
        "head pinned only inside a fence fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 5843026877\n"
                        + "```\nexample head=" + HEAD + "\n```\n"
                        + qa_trailer)]),
    ))
    # 29. fenced provenance trailer does not attribute the producer
    cases.append(scenario(
        "fenced provenance trailer does not attribute producer", 1,
        _ctx("producer body quoting the format:\n```\n" + prod_trailer + "\n```",
             [_comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 30. unclosed fence swallows the rest — a citation "inside" it fails
    cases.append(scenario(
        "citation after an unclosed fence fails (fail-closed)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "scratchpad:\n```\n" + cite_line + "\n" + qa_trailer)]),
    ))
    # 31–35. CRLF tolerance (AID-3050): citations/provenance pasted from
    # Windows tooling arrive with CR-LF endings. The trailing class accepts
    # a lone CR only immediately before the $ anchor; cases 33–35 prove the
    # CR does NOT weaken token or head= pin anchors.
    crlf_cite = cite_line + "\r"
    crlf_qa = qa_trailer + "\r"
    cases.append(scenario(
        "CRLF-pasted citation and provenance pass (AID-3050)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, crlf_cite + "\n" + crlf_qa + "\n")]),
    ))
    cases.append(scenario(
        "provenance ending in bare CR at EOF passes (AID-3050)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + crlf_qa)]),
    ))
    cases.append(scenario(
        "CR inside verdict token fails (anchor intact)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 5843\r026877 head=" + HEAD
                       + "\n" + qa_trailer)]),
    ))
    cases.append(scenario(
        "CR before head= pin fails (pin anchor intact)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 5843026877\rhead=" + HEAD
                       + "\n" + qa_trailer)]),
    ))
    cases.append(scenario(
        "CR inside producer trailer fails (producer unattributed)", 1,
        _ctx("producer body\n" + prod_trailer.replace("session=", "session\r="),
             [_comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 36–47. session placeholder + run-registry anchor (AID-4898, audit
    # AID-4897 criterion 4): the gate used to accept session=opencode_local
    # because PROVENANCE_RE validates shape only. Now a placeholder session
    # is rejected unless a same-(agent,task,run) ADDENDUM posted after the
    # operative citation (pre-merge in audit mode) anchors the REAL session,
    # and the cited run must exist, have SUCCEEDED, and match it.
    ve_placeholder = ("Provenance: agent=qa-lead task=AID-9006 run=w4898ve "
                      "session=opencode_local")
    ve_real = "ses_ee18e706fffeBmR3tN52V5396h"
    addendum = ("Session addendum (AID-4898 §8a): run w4898ve completed; real "
                "session below.\n"
                "Provenance: agent=qa-lead task=AID-9006 run=w4898ve "
                "session=" + ve_real)
    # 36. THE FINDING: placeholder session, no addendum -> fail
    cases.append(scenario(
        "placeholder session fails without addendum (AID-4897 §4)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ve_placeholder)]),
    ))
    # 37. conformant mid-run path: addendum after the citation anchors it
    cases.append(scenario(
        "addendum anchors placeholder session (AID-4898 §8a)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ve_placeholder),
              _comment("2026-09-26T05:05:00Z", addendum)]),
    ))
    # 38. addendum whose session does not match the registry -> fail
    cases.append(scenario(
        "addendum with registry-mismatched session fails", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ve_placeholder),
              _comment("2026-09-26T05:05:00Z",
                       addendum.replace(ve_real,
                                        "ses_notherunsession00000000000000A"))]),
    ))
    # 39. addendum for a DIFFERENT run does not anchor the citation
    cases.append(scenario(
        "addendum citing a different run does not anchor", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ve_placeholder),
              _comment("2026-09-26T05:05:00Z",
                       "Provenance: agent=qa-lead task=AID-9006 run=w2801 "
                       "session=" + ve_real)]),
    ))
    # 40. citation cites a run that does not exist in the registry -> fail
    ghost_run = ("Provenance: agent=qa-lead task=AID-9006 run=w4898ghost "
                 "session=" + ve_real)
    cases.append(scenario(
        "citation citing a nonexistent run fails (§8b)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ghost_run)]),
    ))
    # 41. citation cites a run that has not SUCCEEDED (still running)
    live_run = ("Provenance: agent=qa-lead task=AID-9006 run=w4898run "
                "session=ses_runstillactive0000000000000000000")
    cases.append(scenario(
        "citation citing a non-succeeded run fails (§8b)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + live_run)]),
    ))
    # 42. registry not configured -> fail-closed
    ve_direct = ("Provenance: agent=qa-lead task=AID-9006 run=w4898ve "
                 "session=" + ve_real)
    cases.append(scenario(
        "registry not configured fails closed (§8b)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ve_direct)]),
        registry=None,
    ))
    # 43. producer trailer with placeholder session -> fail
    prod_placeholder = ("Provenance: agent=platform-ci task=AID-2768 "
                        "run=w2800 session=opencode_local")
    cases.append(scenario(
        "producer placeholder session fails (§4)", 1,
        _ctx("producer body\n" + prod_placeholder,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
    ))
    # 44. direct anchor: citation carries the run's real session -> pass
    cases.append(scenario(
        "real session matching the registry passes (no addendum)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ve_direct)]),
    ))
    # 45. session registered only via usageJson.persistedSessionId -> pass
    ps_trailer = ("Provenance: agent=qa-lead task=AID-9006 run=w4898ps "
                  "session=ses_persistedonly00000000000000000X")
    cases.append(scenario(
        "persistedSessionId anchor passes (sessionIdAfter null)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ps + "\n" + ps_trailer)]),
    ))
    # 46. audit mode: addendum posted AFTER mergedAt cannot anchor
    cases.append(scenario(
        "post-merge addendum does not anchor (audit mode)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + ve_placeholder),
              _comment("2026-09-26T06:00:00Z", addendum)]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 47. addendum-equivalent posted BEFORE the citation does not anchor
    cases.append(scenario(
        "pre-citation trailer does not anchor placeholder", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T04:59:00Z", addendum),
              _comment("2026-09-26T05:02:00Z", cite_line + "\n" + ve_placeholder)]),
    ))
    # 48–49. transcription-typo session (observed 1st hand on the first
    # countersign under this contract: trailer ses_ebbc4d26… vs registry
    # ses_ebbb4d26…). A non-placeholder id that simply does not match the
    # registry fails §8b; the ADDENDUM is the repair path (latest wins,
    # registry-checked) — same mechanism as the placeholder case.
    typo_trailer = ("Provenance: agent=qa-lead task=AID-9006 run=w4898ve "
                    "session=ses_transcribedtypo0000000000000X")
    # 48. mis-transcribed session, no addendum -> fail (§8b mismatch)
    cases.append(scenario(
        "transcription-typo session fails without addendum", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + typo_trailer)]),
    ))
    # 49. mis-transcribed session + later addendum with the registry
    # session -> pass (the observed incident's remediation shape)
    cases.append(scenario(
        "addendum corrects mis-transcribed session (AID-4898 §8a)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line_ve + "\n" + typo_trailer),
              _comment("2026-09-26T05:05:00Z", addendum)]),
    ))
    # 50–64. AID-5235 hardening (incident AID-5233, regressions 1ª mão):
    # §8c run temporal window, §9 verdict resolution, §10 task↔PR binding,
    # §11 deletion alert. The incident: cloned qa-lead citation from the
    # CLOSED run ed9921cc (AID-5061, a task bound to PR #700) greened PR
    # #714's gate with a free-text 'GO' verdict and was deleted ~5 min later.
    late_trailer = ("Provenance: agent=qa-lead task=AID-9006 run=w5233late "
                    "session=ses_cloned52330000000000000000000A")
    nots_trailer = ("Provenance: agent=qa-lead task=AID-9006 run=w5233nots "
                    "session=ses_notimestamps00000000000000000B")
    # 50. §8c THE INCIDENT: citation posted 82 min AFTER the cited run
    # closed — every token real, window violated -> fail
    cases.append(scenario(
        "citation posted after run closed fails (AID-5233, §8c)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 52350005-0000-4000-"
                          "8000-000000000005 head=" + HEAD + "\n" + late_trailer)]),
    ))
    # 51. §8c registry record without startedAt/finishedAt -> fail closed
    cases.append(scenario(
        "run without window timestamps fails closed (§8c)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 52350006-0000-4000-"
                          "8000-000000000006 head=" + HEAD + "\n" + nots_trailer)]),
    ))
    # 52. §8c healthy mid-run citation (inside the window) -> pass
    cases.append(scenario(
        "citation posted inside the run window passes (§8c)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T05:00:00Z",
                       cite_line + "\n" + qa_trailer)]),
    ))
    # 53. §9 THE INCIDENT: free-text verdict 'GO' -> fail
    cases.append(scenario(
        "free-text verdict 'GO' fails (AID-5233, §9)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict GO head=" + HEAD
                        + "\n" + qa_trailer)]),
    ))
    # 54. §9 verdict comment that does not exist on the cited thread -> fail
    cases.append(scenario(
        "nonexistent verdict comment fails (§9)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 5235dead-0000-4000-"
                          "8000-00000000beef head=" + HEAD + "\n" + qa_trailer)]),
    ))
    # 55. §9 verdict comment created by ANOTHER run (the producer's) -> fail
    cases.append(scenario(
        "verdict comment from another run fails (§9)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 52350008-0000-4000-"
                          "8000-000000000008 head=" + HEAD + "\n" + qa_trailer)]),
    ))
    # 56. §9 verdict comment deleted on the board -> fail (deletion pattern)
    cases.append(scenario(
        "deleted verdict comment fails (§9)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9006 verdict 52350007-0000-4000-"
                          "8000-000000000007 head=" + HEAD + "\n" + qa_trailer)]),
    ))
    # 57. §10 THE INCIDENT: cited task bound to ANOTHER PR (#4700 stub, PR
    # under gate is #4242) — cross-PR identity clone -> fail
    foreign_trailer = ("Provenance: agent=qa-lead task=AID-9007 run=w2801 "
                       "session=ca6a3f95-0000-0000-0000-000000000000")
    cases.append(scenario(
        "citation for a task bound to another PR fails (AID-5233, §10)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9007 verdict 52350009-0000-4000-"
                          "8000-000000000009 head=" + HEAD + "\n"
                          + foreign_trailer)]),
    ))
    # 58. §10 same citation, but gating the PR the task names (#4700) -> pass
    cases.append(scenario(
        "task naming the gated PR passes (§10)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, "Countersign: AID-9007 verdict 52350009-0000-4000-"
                          "8000-000000000009 head=" + HEAD + "\n"
                          + foreign_trailer)]),
        pr=4700,
    ))
    # 59. §11 prior green citation still present -> pass
    cases.append(scenario(
        "prior green citation still present passes (§11)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer)]),
        prior=[{"citation": cite_line, "postedAt": T}],
    ))
    # 60. §11 THE INCIDENT: the citation that greened this head is GONE
    # (PR left with 0 comments, stale green check) -> DELETION ALERT -> fail
    cases.append(scenario(
        "deleted green citation alerts (AID-5233, §11)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T04:59:00Z", "LGTM so far")]),
        prior=[{"citation": cite_line, "postedAt": T}],
    ))
    # 61. §11 a NEWER valid citation cannot launder the deletion (the old
    # pair (citation, postedAt) is gone; a repost under a new timestamp is a
    # NEW citation, not the old one) -> fail
    cases.append(scenario(
        "newer citation does not launder deletion (§11)", 1,
        _ctx("producer body\n" + prod_trailer,
             [_comment("2026-09-26T05:10:00Z", re_cite + "\n" + qa_trailer)]),
        head=HEAD2,
        prior=[{"citation": re_cite, "postedAt": "2026-09-26T05:00:00Z"}],
    ))
    # 62. §9/§10/§8c all healthy at once (the full hardened contract) -> pass
    cases.append(scenario(
        "hardened full contract passes (§8c+§9+§10)", 0,
        _ctx("producer body\n" + prod_trailer,
             [_comment(T, cite_line + "\n" + qa_trailer),
              _comment("2026-09-26T05:05:00Z", addendum)]),
        merged_at="2026-09-26T05:30:00Z",
    ))
    # 65–67. AID-3056 (follow-up PR #585/AID-3055): an unbalanced fence —
    # the PR #585 shape had the closing fence GLUED to the following text
    # ("```Prova de mutação…" on one line), which strip_code_fences rightly
    # treats as an opening fence — swallows the canonical trailer. The gate
    # already reddens (fail-closed), but the §5 message pointed at agent
    # identity and cost a debug cycle; the violation must now NAME the
    # fence (diagnostic only, no acceptance change).
    glued_body = ("producer body\n"
                  "```\nbuild log\n```Prova de mutação colada no fence\n"
                  + prod_trailer + "\n")
    # 65. THE INCIDENT: producer trailer swallowed by the glued fence ->
    # earliest VISIBLE trailer flips to the QA comment -> misleading §5 red;
    # the message now carries the fence-swallow hint.
    cases.append(scenario(
        "glued fence swallowing trailer names the fence (AID-3056)", 1,
        _ctx(glued_body, [_comment(T, cite_line + "\n" + qa_trailer)]),
        expect_msg="fences swallow trailers",
    ))
    # 66. same swallow with no other trailer anywhere -> the unattributed
    # red also names the fence (actionable instead of generic).
    cases.append(scenario(
        "swallowed-trailer unattributed red names the fence (AID-3056)", 1,
        _ctx(glued_body, [_comment(T, "looking good")]),
        expect_msg="fences swallow trailers",
    ))
    # 67. message hygiene: the same red WITHOUT any swallow must not
    # mention fences (no false pointers to chase).
    cases.append(scenario(
        "no-swallow red does not mention fences (AID-3056)", 1,
        _ctx("producer body\n" + prod_trailer, [_comment(T, "looking good")]),
        absent_msg="fences swallow trailers",
    ))

    passed = sum(cases)
    total = len(cases)
    print("countersign-gate self-test: %d/%d passed" % (passed, total))
    httpd.shutdown()
    httpd.server_close()
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
