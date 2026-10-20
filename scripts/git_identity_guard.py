#!/usr/bin/env python3
"""Git identity guard — fail-loud committer identity (AID-5244).

Root cause of finding A1 (AID-5241): the SHARED workspace `_default`
carried a pinned `[user]` section in `.git/config`
(`qa-lead-ca6a3f95 <qa-lead-ca6a3f95@aidevschool.local>`), so any agent
committing/rebasing there WITHOUT an explicit identity silently forged the
QA Lead as COMMITTER — exactly how CEO run 9baf0cd4 produced 29c6e087
(Author ceo-agent / Committer qa-lead) on PR #733, redone as 5e56f29b.
Class: identity cloning/contamination (same family as incident AID-5233).

Norms enforced here (docs/sdlc/README.md §PROVENANCE git, AID-5244):

1. SHARED workspaces must NOT pin `user.*` in any config under their
   gitdir — a commit without explicit identity must FAIL LOUD (git's
   "Committer identity not known"), never silently forge another agent.
2. Agents commit with EXPLICIT identity per operation: export
   GIT_COMMITTER_NAME/EMAIL (+ GIT_AUTHOR_* when author should differ).
   `-c user.name=…` works for the commit itself but is INVISIBLE to this
   guard and to hooks — env vars are the canonical mechanism.
   A DEDICATED per-agent worktree (own clone) may keep its pin.
3. When PAPERCLIP_AGENT_ID is set, the resolved committer identity must
   match the agent's expected identity (built-in roster map, extensible
   via GIT_IDENTITY_MAP_JSON — inline JSON or a file path). Unknown agent
   id fails CLOSED unless the map extension provides it.
4. Documented bypass: GIT_IDENTITY_GUARD_BYPASS=<non-empty reason> —
   prints a loud warning, exits 0. Use only for tooling that legitimately
   commits under a service identity, and cite the reason in the receipt.

Modes:
  --check               validate the identity the NEXT commit in --repo
                        (default: cwd) would use (hook/pre-commit friendly)
  --audit ROOT ...      scan every .git config file under the given roots
                        for pinned user.*; pinned configs under a path
                        containing a --shared-suffix component (default
                        `_default`) are VIOLATIONS (exit 1), pins in
                        dedicated worktrees are reported as info (exit 0)
  --self-test           hermetic fixtures in a tempdir — proves synthetic
                        violations fail (same convention as
                        scripts/sdlc_guard_check.sh --self-test)

Stdlib only; python >= 3.10. No network: the agent map ships in-file and
is extended via env, so the guard stays usable offline and in CI.
"""

from __future__ import annotations

import argparse
import configparser
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Roster snapshot (2026-10-20, company f2527e0b agents) — canonical email
# is <urlKey>@aidevschool.local; `aliases` covers identities observed in
# the main history. Extend via GIT_IDENTITY_MAP_JSON (merged per-agent),
# do NOT weaken the guard when the roster changes — update this map in a PR.
DEFAULT_AGENT_MAP: dict[str, dict] = {
    "501cb456-b786-4d67-b951-6c71e0f0915d": {
        "name": "CEO", "urlKey": "ceo",
        "emails": ["ceo-agent@aidevschool.local"],
    },
    "e761b40c-5cc9-4ab1-ada9-bb9e40e33e7c": {
        "name": "Full-Stack Feature Engineer", "urlKey": "full-stack-feature-engineer",
        "emails": ["full-stack-feature-engineer@aidevschool.local"],
    },
    "ac0ec540-f683-4be0-88de-49430e95eeaa": {
        "name": "Curriculum Platform Engineer", "urlKey": "curriculum-platform-engineer",
        "emails": ["curriculum-platform-engineer@aidevschool.local"],
    },
    "fa8130d5-e24e-4f98-8470-ccfeef17c6d5": {
        "name": "Founding Product Engineer", "urlKey": "founding-product-engineer",
        "emails": ["founding-product-engineer@aidevschool.local"],
    },
    "ce84c27f-07f0-448e-b431-0a1293879fcc": {
        "name": "SDLC Scrum Master", "urlKey": "sdlc-scrum-master",
        "emails": ["sdlc-scrum-master@aidevschool.local"],
    },
    "b106db1d-0d56-4a3b-bea0-39c9ac190721": {
        "name": "Growth & Recruiter", "urlKey": "growth-recruiter",
        "emails": ["growth-recruiter@aidevschool.local"],
    },
    "98ed5775-4ae8-442e-81d0-e4c50c435205": {
        "name": "Learning Engine Engineer", "urlKey": "learning-engine-engineer",
        "emails": ["learning-engine-engineer@aidevschool.local"],
    },
    "ca6a3f95-8572-43f4-822a-6b40b9bdb63b": {
        "name": "QA Lead", "urlKey": "qa-lead",
        "emails": [
            "qa-lead@aidevschool.local",
            "qa-lead-ca6a3f95@aidevschool.local",
        ],
    },
    "9b6acd48-6aa4-45ae-a186-9d40c0a0e621": {
        "name": "Engine Hardening Engineer", "urlKey": "engine-hardening-engineer",
        "emails": ["engine-hardening-engineer@aidevschool.local"],
    },
    "803ca017-7544-444b-b434-4865b8dc5fc7": {
        "name": "Learner Analytics Engineer", "urlKey": "learner-analytics-engineer",
        "emails": ["learner-analytics-engineer@aidevschool.local"],
    },
    "bb7b8143-dc59-440b-b2b1-9b6749811cfb": {
        "name": "System Designer", "urlKey": "system-designer",
        "emails": ["system-designer@aidevschool.local"],
    },
    "5cf7ace9-5f3b-429c-bf1a-50c5b188b1b8": {
        "name": "Growth Web Engineer", "urlKey": "growth-web-engineer",
        "emails": ["growth-web-engineer@aidevschool.local"],
    },
    "ca12fdb7-19ee-4d89-be95-fce692acfdd9": {
        "name": "Learner App & Accessibility Engineer", "urlKey": "learner-app-accessibility-engineer",
        "emails": ["learner-app-accessibility-engineer@aidevschool.local"],
    },
    "1e9be0fa-c320-4309-9704-c755c53da7fd": {
        "name": "Platform & CI Engineer", "urlKey": "platform-ci-engineer",
        "emails": ["platform-ci@aidevschool.local", "platform-ci-engineer@aidevschool.local"],
    },
    "93e26ea9-8f2a-4f6f-9b82-3591ebc4255c": {
        "name": "Curriculum Content Engineer", "urlKey": "curriculum-content-engineer",
        "emails": ["curriculum-content-engineer@aidevschool.local"],
    },
    "8c58cf6e-c48b-4bd0-a2d6-61b32361b98a": {
        "name": "Platform & Release Engineer", "urlKey": "platform-release-engineer",
        "emails": ["platform-release-engineer@aidevschool.local"],
    },
    "92d055bc-e965-4f92-8ef6-06a775fa900e": {
        "name": "Storage Engineer", "urlKey": "storage-engineer",
        "emails": ["storage-engineer@aidevschool.local"],
    },
    "f2b1e95d-bf0f-4beb-b117-533728fabb1e": {
        "name": "Content Designer", "urlKey": "content-designer",
        "emails": ["content-designer@aidevschool.local"],
    },
    "d0dfd2b7-1fbe-42e3-a42c-583059e54444": {
        "name": "Learner App Engineer", "urlKey": "learner-app-engineer",
        "emails": [
            "learner-app-engineer@aidevschool.local",
            "learner-app-eng@aidevschool.local",
        ],
    },
    "ae071215-338c-41ad-8782-2c6ffa04a21a": {
        "name": "Engine Systems Engineer", "urlKey": "engine-systems-engineer",
        "emails": ["engine-systems-engineer@aidevschool.local"],
    },
    "0bfa47c1-099a-42a1-99a5-7d7b0a380ba9": {
        "name": "UX Designer", "urlKey": "ux-designer",
        "emails": ["ux-designer@aidevschool.local"],
    },
    "0944e5c6-152f-466c-a41e-78a44781e1ff": {
        "name": "Product Delivery Engineer", "urlKey": "product-delivery-engineer",
        "emails": ["product-delivery-engineer@aidevschool.local"],
    },
    "616b5f9b-15c8-4ad1-816c-78a7317e0202": {
        "name": "Verifier & Evidence Engineer", "urlKey": "verifier-evidence-engineer",
        "emails": ["verifier-evidence-engineer@aidevschool.local"],
    },
    "7b5e31ea-b7cf-4832-854f-346b13fdeb3f": {
        "name": "Docs & Readiness Engineer", "urlKey": "docs-readiness-engineer",
        "emails": ["docs-readiness-engineer@aidevschool.local"],
    },
}

REMEDIATION = (
    "norm AID-5244 (docs/sdlc/README.md §PROVENANCE git): export "
    "GIT_COMMITTER_NAME/GIT_COMMITTER_EMAIL (and GIT_AUTHOR_* when the "
    "author differs) with the identity of THIS run's agent; never rely on "
    "ambient config identity in a shared workspace"
)


def load_agent_map(env: dict) -> dict:
    """Default roster merged with GIT_IDENTITY_MAP_JSON (inline or file)."""
    raw = env.get("GIT_IDENTITY_MAP_JSON", "").strip()
    if not raw:
        return DEFAULT_AGENT_MAP
    if raw.startswith("{"):
        extra = json.loads(raw)
    else:
        extra = json.loads(Path(raw).read_text(encoding="utf-8"))
    merged = dict(DEFAULT_AGENT_MAP)
    merged.update(extra)
    return merged


def git_env(env: dict) -> dict:
    """Env without any identity git could silently inherit."""
    clean = {
        k: v for k, v in env.items()
        if not k.startswith(("GIT_AUTHOR_", "GIT_COMMITTER_", "GIT_IDENTITY_"))
        and k not in ("EMAIL",)
    }
    return clean


def run_git(repo: str | Path, args: list[str], env: dict,
            strip_identity: bool = True) -> subprocess.CompletedProcess:
    use_env = git_env(env) if strip_identity else dict(env)
    return subprocess.run(
        ["git", "-C", str(repo)] + args,
        capture_output=True, text=True, env=use_env,
    )


def ident_parts(ident_line: str) -> tuple[str, str]:
    """'Name <email> ts tz' -> (name, email)."""
    name = ident_line.split(" <")[0].strip()
    email = ident_line.split(" <")[1].split(">")[0].strip() if " <" in ident_line else ""
    return name, email


def config_origin(repo: str | Path, key: str, env: dict) -> tuple[str, str]:
    """(origin, value) for a config key with ambient env stripped.

    'none' when unset anywhere; origin is the --show-origin prefix
    (file:<path> — relative to the repo — command line:, ...)."""
    proc = run_git(repo, ["config", "--show-origin", "--get", key], env)
    if proc.returncode != 0 or not proc.stdout.strip():
        return "none", ""
    first = proc.stdout.strip().split("\t", 1)
    if len(first) == 1:
        return "unknown", first[0]
    origin = first[0].strip()
    if origin.startswith("file:"):
        p = origin[len("file:"):]
        if not os.path.isabs(p):  # --show-origin prints repo-relative paths
            p = str((Path(repo) / p).resolve())
        origin = "file:" + p
    return origin, first[1].strip()


def is_shared_path(path: str, shared_suffixes: list[str]) -> bool:
    parts = Path(path).resolve().parts
    return any(s in parts for s in shared_suffixes)


def check_repo(repo: str, shared_suffixes: list[str], env: dict,
               strict_author: bool = False) -> tuple[int, list[str]]:
    """Validate the identity the NEXT commit in `repo` would use."""
    msgs: list[str] = []
    bypass = env.get("GIT_IDENTITY_GUARD_BYPASS", "").strip()
    if bypass:
        msgs.append(f"WARNING: git identity guard BYPASSED — reason: {bypass}")
        return 0, msgs

    env_name = env.get("GIT_COMMITTER_NAME", "").strip()
    env_email = env.get("GIT_COMMITTER_EMAIL", "").strip()
    if env_name and env_email:
        source, name, email = "env-explicit", env_name, env_email
    else:
        proc = run_git(repo, ["var", "GIT_COMMITTER_IDENT"], env)
        if proc.returncode != 0:
            msgs.append(
                "FAIL: no committer identity resolves in "
                f"{repo} — git itself would refuse the commit. This is the "
                "fail-loud state the norm WANTS in shared workspaces; fix via\n"
                f"  {REMEDIATION}."
            )
            return 1, msgs
        origin, _ = config_origin(repo, "user.email", env)
        name, email = ident_parts(proc.stdout.strip())
        if origin.startswith("file:"):
            cfg_path = origin[len("file:"):]
            if is_shared_path(cfg_path, shared_suffixes):
                msgs.append(
                    "FAIL: committer identity comes from a PINNED config "
                    f"({cfg_path}: {name} <{email}>) inside a SHARED "
                    "workspace — the A1/AID-5241 contamination shape "
                    "(29c6e087: Author ceo-agent / Committer qa-lead). "
                    f"Remove the pin (audit mode) and use explicit identity:\n"
                    f"  {REMEDIATION}."
                )
                return 1, msgs
            source = "file-dedicated"
        else:
            source = f"ambient({origin or 'unknown'})"
        msgs.append(
            f"INFO: identity resolved from {source} ({name} <{email}>) — "
            "dedicated worktrees may pin; shared workspaces must not."
        )

    agent_id = env.get("PAPERCLIP_AGENT_ID", "").strip()
    if agent_id:
        agent = load_agent_map(env).get(agent_id)
        if not agent:
            msgs.append(
                f"FAIL: PAPERCLIP_AGENT_ID={agent_id} is not in the agent "
                "map — fail-closed. Extend GIT_IDENTITY_MAP_JSON (inline "
                "JSON or file: {\"<agentId>\": {\"name\":…, "
                "\"emails\":[…]}}) or update DEFAULT_AGENT_MAP in a PR."
            )
            return 1, msgs
        if email not in agent["emails"]:
            msgs.append(
                "FAIL: committer identity contamination — agent "
                f"{agent.get('name')} ({agent_id}) would commit as "
                f"{name} <{email}>, expected one of {agent['emails']} "
                "(A1/AID-5241: rebase in a shared workspace forged "
                "committer qa-lead on 29c6e087). Fix via\n  " + REMEDIATION
            )
            return 1, msgs
        if source != "env-explicit":
            msgs.append(
                "WARNING: identity matches the agent but was NOT set via "
                "env for this operation — export GIT_COMMITTER_* so the "
                "attribution survives config changes (norm 2, AID-5244)."
            )
        msgs.append(f"OK: committer matches agent map ({agent.get('name')}).")

    author_proc = run_git(repo, ["var", "GIT_AUTHOR_IDENT"], env,
                          strip_identity=False)
    if author_proc.returncode == 0:
        an, ae = ident_parts(author_proc.stdout.strip())
        if (an, ae) != (name, email):
            line = (
                f"WARNING: author ({an} <{ae}>) != committer "
                f"({name} <{email}>) — the rebase/rewrite shape of "
                "A1/AID-5241; legitimate for trailer commits, suspicious "
                "for content commits."
            )
            if strict_author:
                msgs.append("FAIL: " + line.split(" — ")[0] + f" (--strict-author).\n  {REMEDIATION}")
                return 1, msgs
            msgs.append(line)
    return 0, msgs


def read_pinned_user(config_path: Path) -> list[tuple[str, str]]:
    """[(key, value)] for user.name/user.email pinned in a config file."""
    if not config_path.is_file():
        return []
    parser = configparser.RawConfigParser(
        strict=False, interpolation=None, delimiters=("=",),
        comment_prefixes=("#", ";"),
    )
    try:
        parser.read(config_path, encoding="utf-8")
    except configparser.Error:
        return [("user.<unparseable>", str(config_path))]
    if not parser.has_section("user"):
        return []
    return [
        (f"user.{k}", parser.get("user", k))
        for k in parser.options("user")
        if k in ("name", "email")
    ]


def audit_roots(roots: list[str], shared_suffixes: list[str]) -> tuple[int, list[str]]:
    """Scan .git config files under roots for pinned user.* identities."""
    msgs: list[str] = []
    violations = 0
    seen: set[Path] = set()
    for root in roots:
        for dotgit in Path(root).rglob(".git"):
            if dotgit in seen:
                continue
            seen.add(dotgit)
            if dotgit.is_file():  # linked worktree: only its config.worktree
                gd = dotgit.read_text(encoding="utf-8").strip()
                gd = gd.split("gitdir:", 1)[-1].strip() if gd.startswith("gitdir:") else ""
                candidates = [Path(gd) / "config.worktree"] if gd else []
            else:
                candidates = [dotgit / "config"]
                candidates += sorted(dotgit.glob("worktrees/*/config.worktree"))
            for cfg in candidates:
                pins = read_pinned_user(cfg)
                if not pins:
                    continue
                shared = is_shared_path(str(cfg), shared_suffixes)
                desc = ", ".join(f"{k}={v}" for k, v in pins)
                if shared:
                    violations += 1
                    msgs.append(
                        f"VIOLATION (shared): {cfg} pins {desc} — remove "
                        "the [user] section; commits without explicit "
                        "identity are forging this agent (A1/AID-5241)."
                    )
                else:
                    msgs.append(f"info (dedicated worktree pin allowed): {cfg} pins {desc}")
    if violations:
        msgs.append(f"audit: {violations} shared-workspace pin(s) — run "
                    "scripts/git_identity_guard.py --check before each "
                    "commit batch and flip the shared config (announced).")
        return 1, msgs
    msgs.append("audit: no pinned user.* in shared workspace configs "
                "(dedicated pins above, if any, are allowed by norm 2).")
    return 0, msgs


def self_test() -> int:
    """Hermetic: synthetic violations must fail, legit shapes must pass."""
    passed = 0
    total = 0
    base_env = {
        k: v for k, v in os.environ.items()
        if not k.startswith(("GIT_", "PAPERCLIP_AGENT_ID", "EMAIL"))
    }

    def case(name: str, fn) -> None:
        nonlocal passed, total
        total += 1
        try:
            fn()
            passed += 1
        except AssertionError as exc:
            print(f"self-test FAIL: {name}: {exc}")
        except Exception as exc:  # noqa: BLE001 — surface as test failure
            print(f"self-test ERROR: {name}: {exc!r}")

    def make_repo(parent: Path, name: str, pin: str | None) -> str:
        repo = parent / name
        repo.mkdir(parents=True, exist_ok=True)
        assert run_git(repo, ["init", "-q"], base_env).returncode == 0
        if pin:
            assert run_git(repo, ["config", "user.name", pin.split(" <")[0]], base_env).returncode == 0
            assert run_git(repo, ["config", "user.email", pin.split(" <")[1].rstrip(">")], base_env).returncode == 0
        return str(repo)

    with tempfile.TemporaryDirectory(prefix="git-identity-guard-st-") as td:
        tmp = Path(td)
        shared_root = tmp / "instances" / "default" / "projects" / "p" / "_default"
        shared_root.mkdir(parents=True)
        shared_repo = make_repo(tmp, "shared", None)
        # real shared layout: repo whose config lives under .../_default/.git
        shared_nest = shared_root / "repo"
        shared_nest.mkdir()
        assert run_git(shared_nest, ["init", "-q"], base_env).returncode == 0
        assert run_git(shared_nest, ["config", "user.name", "qa-lead-ca6a3f95"], base_env).returncode == 0
        assert run_git(shared_nest, ["config", "user.email", "qa-lead-ca6a3f95@aidevschool.local"], base_env).returncode == 0
        dedicated = make_repo(tmp, "dedicated-wt", "QA Lead <qa-lead@aidevschool.local>")

        # --- audit mode ---
        def audit_shared_fails():
            code, msgs = audit_roots([str(shared_root)], ["_default"])
            assert code == 1, f"expected exit 1, got {code}: {msgs}"
            assert any("VIOLATION (shared)" in m for m in msgs), msgs
        case("audit flags pinned user.* under shared _default", audit_shared_fails)

        def audit_dedicated_ok():
            code, msgs = audit_roots([dedicated], ["_default"])
            assert code == 0, msgs
            assert any("dedicated worktree pin allowed" in m for m in msgs), msgs
        case("audit allows dedicated worktree pin", audit_dedicated_ok)

        def audit_clean_ok():
            code, msgs = audit_roots([shared_repo], ["_default"])
            assert code == 0, msgs
        case("audit clean repo passes", audit_clean_ok)

        # --- check mode ---
        env_qa = dict(base_env, GIT_COMMITTER_NAME="QA Lead",
                      GIT_COMMITTER_EMAIL="qa-lead@aidevschool.local")
        code, msgs = check_repo(dedicated, ["_default"], env_qa)
        assert_ok = (code == 0 and any("OK" in m or "INFO" in m for m in msgs))

        def explicit_env_ok():
            code, msgs = check_repo(shared_repo, ["_default"], env_qa)
            assert code == 0, msgs
        case("check: explicit env identity passes even in shared repo", explicit_env_ok)

        def shared_pin_fails():
            env = dict(base_env)
            code, msgs = check_repo(str(shared_nest), ["_default"], env)
            assert code == 1, msgs
            assert any("A1/AID-5241" in m for m in msgs), msgs
        case("check: shared pinned config identity FAILS (contamination shape)", shared_pin_fails)

        def no_identity_fails_loud():
            env = dict(base_env)
            code, msgs = check_repo(shared_repo, ["_default"], env)
            assert code == 1, msgs
            assert any("fail-loud" in m for m in msgs), msgs
        case("check: no identity anywhere fails loud with remediation", no_identity_fails_loud)

        def dedicated_pin_ok():
            env = dict(base_env)
            code, msgs = check_repo(dedicated, ["_default"], env)
            assert code == 0, msgs
            assert any("dedicated" in m for m in msgs), msgs
        case("check: dedicated worktree pin passes with info", dedicated_pin_ok)

        def agent_match_ok():
            env = dict(base_env, PAPERCLIP_AGENT_ID="1e9be0fa-c320-4309-9704-c755c53da7fd",
                       GIT_COMMITTER_NAME="Platform & CI Engineer",
                       GIT_COMMITTER_EMAIL="platform-ci@aidevschool.local")
            code, msgs = check_repo(shared_repo, ["_default"], env)
            assert code == 0, msgs
            assert any("matches agent map" in m for m in msgs), msgs
        case("check: PAPERCLIP_AGENT_ID with matching identity passes", agent_match_ok)

        def agent_contamination_fails():
            env = dict(base_env, PAPERCLIP_AGENT_ID="501cb456-b786-4d67-b951-6c71e0f0915d",
                       GIT_COMMITTER_NAME="qa-lead-ca6a3f95",
                       GIT_COMMITTER_EMAIL="qa-lead-ca6a3f95@aidevschool.local")
            code, msgs = check_repo(shared_repo, ["_default"], env)
            assert code == 1, msgs
            assert any("contamination" in m for m in msgs), msgs
        case("check: CEO run committing as qa-lead FAILS (the A1 shape)", agent_contamination_fails)

        def unknown_agent_fails_closed():
            env = dict(base_env, PAPERCLIP_AGENT_ID="00000000-0000-0000-0000-000000000000",
                       GIT_COMMITTER_NAME="X", GIT_COMMITTER_EMAIL="x@aidevschool.local")
            code, msgs = check_repo(shared_repo, ["_default"], env)
            assert code == 1, msgs
            assert any("fail-closed" in m for m in msgs), msgs
        case("check: unknown PAPERCLIP_AGENT_ID fails closed", unknown_agent_fails_closed)

        def map_json_extends():
            ext = tmp / "map.json"
            ext.write_text(json.dumps({
                "00000000-0000-0000-0000-000000000000": {
                    "name": "New Agent", "emails": ["x@aidevschool.local"]}}), encoding="utf-8")
            env = dict(base_env, GIT_IDENTITY_MAP_JSON=str(ext),
                       PAPERCLIP_AGENT_ID="00000000-0000-0000-0000-000000000000",
                       GIT_COMMITTER_NAME="X", GIT_COMMITTER_EMAIL="x@aidevschool.local")
            code, msgs = check_repo(shared_repo, ["_default"], env)
            assert code == 0, msgs
        case("check: GIT_IDENTITY_MAP_JSON extends the roster", map_json_extends)

        def bypass_documented():
            env = dict(base_env, GIT_IDENTITY_GUARD_BYPASS="service bot commits",
                       GIT_COMMITTER_NAME="qa-lead-ca6a3f95",
                       GIT_COMMITTER_EMAIL="qa-lead-ca6a3f95@aidevschool.local",
                       PAPERCLIP_AGENT_ID="501cb456-b786-4d67-b951-6c71e0f0915d")
            code, msgs = check_repo(shared_repo, ["_default"], env)
            assert code == 0 and any("BYPASSED" in m for m in msgs), msgs
        case("check: documented bypass with reason warns and passes", bypass_documented)

        def author_mismatch_warns():
            env = dict(base_env, GIT_COMMITTER_NAME="ceo-agent",
                       GIT_COMMITTER_EMAIL="ceo-agent@aidevschool.local",
                       GIT_AUTHOR_NAME="qa-lead-ca6a3f95",
                       GIT_AUTHOR_EMAIL="qa-lead-ca6a3f95@aidevschool.local")
            code, msgs = check_repo(shared_repo, ["_default"], env)
            assert code == 0 and any("author" in m for m in msgs), msgs
        case("check: author != committer warns (rebase shape)", author_mismatch_warns)

        def strict_author_fails():
            env = dict(base_env, GIT_COMMITTER_NAME="ceo-agent",
                       GIT_COMMITTER_EMAIL="ceo-agent@aidevschool.local",
                       GIT_AUTHOR_NAME="qa-lead-ca6a3f95",
                       GIT_AUTHOR_EMAIL="qa-lead-ca6a3f95@aidevschool.local")
            code, msgs = check_repo(shared_repo, ["_default"], env, strict_author=True)
            assert code == 1, msgs
        case("check: --strict-author reddens author/committer split", strict_author_fails)

        def roster_sane():
            ceo = DEFAULT_AGENT_MAP["501cb456-b786-4d67-b951-6c71e0f0915d"]
            qa = DEFAULT_AGENT_MAP["ca6a3f95-8572-43f4-822a-6b40b9bdb63b"]
            me = DEFAULT_AGENT_MAP["1e9be0fa-c320-4309-9704-c755c53da7fd"]
            assert "ceo-agent@aidevschool.local" in ceo["emails"]
            assert "qa-lead-ca6a3f95@aidevschool.local" in qa["emails"]
            assert "platform-ci@aidevschool.local" in me["emails"]
            assert len(DEFAULT_AGENT_MAP) >= 20
        case("default roster pins the A1/AID-5241 incident identities", roster_sane)

    print(f"git-identity-guard self-test: {passed}/{total} passed")
    return 0 if passed == total else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="validate the identity of the next commit in --repo")
    ap.add_argument("--audit", nargs="+", metavar="ROOT",
                    help="scan roots for pinned user.* in git configs")
    ap.add_argument("--repo", default=os.getcwd(),
                    help="repo to check (default: cwd)")
    ap.add_argument("--shared-suffix", default="_default",
                    help="comma-separated path components marking SHARED "
                         "workspaces (default: _default)")
    ap.add_argument("--strict-author", action="store_true",
                    help="also fail when author != committer")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    suffixes = [s.strip() for s in args.shared_suffix.split(",") if s.strip()]
    if args.self_test:
        return self_test()
    if args.audit:
        code, msgs = audit_roots(args.audit, suffixes)
    elif args.check:
        code, msgs = check_repo(args.repo, suffixes, dict(os.environ),
                                strict_author=args.strict_author)
    else:
        ap.error("choose --check, --audit ROOT ... or --self-test")
        return 2
    for m in msgs:
        print(m)
    return code


if __name__ == "__main__":
    sys.exit(main())
