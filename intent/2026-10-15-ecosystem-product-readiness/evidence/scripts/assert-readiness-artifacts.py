#!/usr/bin/env python3
"""Read-only evidence audit for C14–16/C31–34; it never grants a tier.

Exit 0: the selected obligation is evidenced; 1: contradiction/observed failure;
2: a prerequisite or proof is missing. JSON shape is reported separately.
Optional delivery receipts live in this task's evidence/ directory. They must
retain the raw outputs they cite; booleans and an author's PASS are insufficient.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / "intent/2026-10-15-ecosystem-product-readiness"
PACKET = ROOT / "docs/product-readiness/evidence/observations/2026-10-15-ecosystem-beta-readiness/engine-qualification.json"
ENGINES = ("aiDevschoolMvp", "codexDojo", "codexdojo-os-prototype", "dojoToday", "literacyDojo", "miniMaxEvolutionEngine", "miniTown", "minimaxDojo", "openclaw", "pixelDojo", "school-entry", "sdlc-quest", "voxelDojo", "zai-duolingo-like")
STALE = {"dojotoday-daily-guidance", "literacy-standalone-corridor-mod01-03", "literacy-standalone-first-lesson", "os-literacy-guided-mission", "os-returning-learner", "os-voxel-guided-missions"}
FIELDS = {"engineId", "declaredUse", "entry", "runtime", "sourceCommit", "sourceFingerprint", "observedAt", "producerContext", "verifierContext", "cases", "evidenceRefs", "limitations", "linkedUseCases", "status"}
MODES = ("delivery-heads", "merge-records", "engine-packets", "canonical-assessments", "authority-separation", "main-claims", "pilot-offer")


class Audit:
    def __init__(self, mode):
        self.mode, self.findings, self.shape, self.observed = mode, [], True, {}
        self.hashes = {}

    def add(self, code, message, location, missing=False, shape=False):
        self.findings.append({"id": code, "kind": "missing-proof" if missing else "failure", "location": str(location), "message": message})
        if shape:
            self.shape = False

    def require(self, condition, code, message, location, missing=False, shape=False):
        if not condition:
            self.add(code, message, location, missing, shape)
        return bool(condition)

    def read(self, path, optional=False):
        path = Path(path)
        try:
            value = json.loads(path.read_text())
        except FileNotFoundError:
            self.add("proof-absent", "Required artifact has not been retained.", path, missing=True)
            return None
        except (OSError, ValueError) as error:
            self.add("proof-invalid", str(error), path, shape=True)
            return None
        if not isinstance(value, dict):
            self.add("proof-shape", "Expected a JSON object.", path, shape=True)
            return None
        return value

    def digest(self, path):
        path = Path(path)
        if path not in self.hashes:
            digest = hashlib.sha256()
            with path.open("rb") as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(block)
            self.hashes[path] = digest.hexdigest()
        return self.hashes[path]

    def ref(self, ref, location):
        if not isinstance(ref, dict) or not isinstance(ref.get("path"), str) or not re.fullmatch(r"[0-9a-f]{64}", str(ref.get("sha256", ""))):
            self.add("reference-shape", "Evidence needs a retained path and SHA-256.", location, shape=True)
            return False
        path = Path(ref["path"])
        path = path if path.is_absolute() else ROOT / path
        if not path.is_file():
            self.add("evidence-absent", "Retained artifact is unavailable; a URL alone is not a digest check.", path, missing=True)
            return False
        return self.require(self.digest(path) == ref["sha256"], "evidence-digest", "Retained bytes differ from the recorded digest.", path)

    def refs(self, refs, location, required=True):
        if not isinstance(refs, list) or (required and not refs):
            self.add("evidence-refs", "Nonempty evidenceRefs required." if required else "Expected evidenceRefs list.", location, missing=True)
            return False
        valid = True
        for index, ref in enumerate(refs):
            valid = self.ref(ref, f"{location}[{index}]") and valid
        return valid

    def receipt(self, name):
        return self.read(TASK / "evidence" / f"{name}.json")

    def finish(self):
        code = 1 if any(item["kind"] == "failure" for item in self.findings) else 2 if self.findings else 0
        return {"schemaVersion": 1, "mode": self.mode, "task": str(TASK.relative_to(ROOT) / "plan.md"), "checkedAt": datetime.now(timezone.utc).isoformat(), "validatedShape": self.shape, "obligationProven": code == 0, "status": {0: "pass", 1: "blocked", 2: "unverified"}[code], "exitCode": code, "observed": self.observed, "findings": self.findings, "authority": "informational audit; no ReadinessTier or mastery grant"}


def git(*args):
    result = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else None


def valid_context(audit, item, producer, location):
    if not isinstance(item, dict):
        audit.add("independent-review-pending", "A distinct review context with retained evidence is required.", location, missing=True)
        return False
    context = item.get("contextId")
    okay = audit.require(bool(context) and context != producer, "context-separation", "Verifier must identify a context distinct from the producer.", location)
    okay = audit.require(item.get("status") == "pass", "independent-review-result", "Independent review has no PASS result.", location, missing=item.get("status") in {None, "pending", "unverified"}) and okay
    return audit.refs(item.get("evidenceRefs"), location) and okay


def engine_packets(audit):
    packet = audit.read(PACKET)
    if packet is None:
        return None
    audit.require(packet.get("schemaVersion") == 1 and packet.get("scope") == "declared-use-beta", "packet-schema", "Wrong qualification schema/scope.", PACKET, shape=True)
    rows = packet.get("engines")
    if not audit.require(isinstance(rows, list), "engines-shape", "engines must be a list.", PACKET, shape=True):
        return packet
    ids = [item.get("engineId") for item in rows if isinstance(item, dict)]
    audit.require(len(rows) == 14 and len(ids) == 14 and set(ids) == set(ENGINES) and len(set(ids)) == 14, "engine-universe", "Exactly the 14 Journey engineIds are required, without duplicates.", PACKET, shape=True)
    counts = {status: sum(isinstance(row, dict) and row.get("status") == status for row in rows) for status in ("pass", "blocked", "unverified")}
    audit.observed["engines"] = counts
    for row in rows:
        if not isinstance(row, dict):
            audit.add("engine-shape", "Engine must be an object.", PACKET, shape=True)
            continue
        label = f"{PACKET.name}#{row.get('engineId')}"
        audit.require(FIELDS <= row.keys(), "engine-fields", f"Missing fields: {sorted(FIELDS-row.keys())}", label, shape=True)
        audit.require(row.get("status") in counts, "engine-status", "Invalid engine status.", label, shape=True)
        for field in ("declaredUse", "entry", "producerContext"):
            audit.require(bool(row.get(field)), "engine-metadata", f"{field} must be identified.", label, shape=True)
        audit.require(isinstance(row.get("runtime"), dict) and bool(row["runtime"]), "runtime-shape", "Runtime or its missing prerequisite must be identified.", label, shape=True)
        for field in ("limitations", "linkedUseCases"):
            audit.require(isinstance(row.get(field), list), "engine-list-shape", f"{field} must be a list.", label, shape=True)
        audit.require(bool(re.fullmatch(r"[0-9a-f]{40}", str(row.get("sourceCommit", "")))), "source-commit", "Expected full base commit SHA; dirty source is bound separately.", label, shape=True)
        audit.require(bool(re.fullmatch(r"[0-9a-f]{64}", str(row.get("sourceFingerprint", "")))), "source-fingerprint", "Expected SHA-256 source fingerprint.", label, shape=True)
        try:
            stamp = datetime.fromisoformat(str(row.get("observedAt")).replace("Z", "+00:00"))
            audit.require(stamp.tzinfo is not None, "observed-time", "observedAt needs a timezone.", label, shape=True)
        except ValueError:
            audit.add("observation-pending", "No runtime observation timestamp has been supplied.", label, missing=True)
        manifest = row.get("sourceManifest")
        if manifest is not None and audit.ref(manifest, label):
            data = audit.read(ROOT / manifest["path"])
            if data:
                source_hash = hashlib.sha256()
                for ref in data.get("files", []):
                    if audit.ref(ref, label):
                        name, content = ref["path"].encode(), (ROOT / ref["path"]).read_bytes()
                        source_hash.update(len(name).to_bytes(8, "big") + name + len(content).to_bytes(8, "big") + content)
                audit.require(source_hash.hexdigest() == row.get("sourceFingerprint"), "source-drift", "Source content no longer matches the packet candidate fingerprint.", label)
        else:
            audit.add("source-manifest-pending", "Fingerprint needs retained source membership and file digests.", label, missing=True)
        audit.refs(row.get("evidenceRefs"), label)
        cases = row.get("cases")
        if not audit.require(isinstance(cases, list) and bool(cases), "cases-pending", "Required cases/variants are not enumerated.", label, missing=True):
            continue
        seen, blocked, pending = set(), False, False
        for case in cases:
            case_id = case.get("caseId") if isinstance(case, dict) else None
            loc = f"{label}/{case_id}"
            if not audit.require(bool(case_id) and case_id not in seen, "case-identity", "Case IDs must be nonempty and unique.", loc, shape=True):
                continue
            seen.add(case_id)
            audit.require(case.get("status") in {"pass", "fail", "blocked", "unverified", "not-applicable"}, "case-status", "Invalid case status.", loc, shape=True)
            audit.require(isinstance(case.get("mandatory", True), bool), "case-mandatory", "mandatory must be boolean.", loc, shape=True)
            audit.require(bool(case.get("result")), "case-result", "Case needs the observed result or precise missing prerequisite.", loc, shape=True)
            audit.ref(case.get("promiseSource"), loc)
            refs_ok = audit.refs(case.get("evidenceRefs"), loc, required=case.get("status") not in {"unverified", "not-applicable"})
            if case.get("status") == "not-applicable":
                audit.require(bool(case.get("justification")), "inapplicability", "Inapplicability requires a sourced justification.", loc)
            elif case.get("mandatory", True) and case.get("status") in {"fail", "blocked"}:
                blocked = True
                audit.add("observed-case-failure", case["result"], loc)
            elif case.get("mandatory", True) and (case.get("status") != "pass" or not refs_ok):
                pending = True
                audit.add("case-pending", case["result"], loc, missing=True)
        independent = valid_context(audit, row.get("verifierContext"), row.get("producerContext"), label)
        expected = "blocked" if blocked else "unverified" if pending or not independent else "pass"
        audit.require(row.get("status") == expected, "engine-status-coherence", f"Recorded {row.get('status')} contradicts evidenced status {expected}.", label)
    return packet


def delivery_heads(audit):
    data = audit.receipt("delivery-heads")
    if not data:
        return
    rows = data.get("pullRequests", [])
    audit.require({row.get("number") for row in rows} == {656, 657}, "delivery-prs", "Both repairs require current delivery records.", "delivery-heads", shape=True)
    for row in rows:
        loc, head = f"PR#{row.get('number')}", row.get("headSha")
        audit.require(bool(re.fullmatch(r"[0-9a-f]{40}", str(head))), "delivery-head", "Full final head SHA required.", loc, shape=True)
        audit.require(row.get("mainSha") == data.get("mainSha") and row.get("baseContainsMain") is True, "delivery-main", "PR must be synchronized to the identified main tip.", loc)
        audit.refs(row.get("rawSnapshotRefs"), loc)
        for name in ("diffReview", "functionalProof", "independentReview", "bodyReview"):
            proof = row.get(name)
            if not proof:
                audit.add("delivery-proof-pending", f"Missing {name} bound to final head.", loc, missing=True)
                continue
            audit.require(proof.get("headSha") == head, "delivery-proof-head", f"{name} is not pinned to final head.", loc)
            valid_context(audit, proof, row.get("producerContext"), f"{loc}/{name}") if name == "independentReview" else audit.refs(proof.get("evidenceRefs"), loc)
        checks = row.get("requiredChecks", [])
        audit.require(bool(checks), "required-checks-pending", "Required check set has not been retained.", loc, missing=True)
        for check in checks:
            audit.require(check.get("conclusion") == "success" and check.get("sha") in {head, row.get("mergeRefSha")}, "required-check-not-success", "Required check is not success on this head/merge-ref.", f"{loc}/{check.get('name')}")
        if row.get("number") == 657:
            reruns = row.get("replacedCancelledChecks", [])
            audit.require(len(reruns) == 3 and all(item.get("conclusion") == "success" for item in reruns), "cancelled-checks", "All three cancelled checks need new successful runs.", loc, missing=not reruns)
        else:
            audit.require(bool(row.get("producerContext")), "real-producer", "Identify actual code producer before countersign.", loc, missing=True)
            audit.ref(row.get("protectedTestApproval"), loc)


def canonical_assessments(audit):
    executable = ROOT / ".scratch/gh-375/venv/bin/python"
    command = [str(executable if executable.exists() else Path(sys.executable)), "docs/product-readiness/tools/cli.py", "check", "--require-current"]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    audit.observed["canonicalCheck"] = {"argv": command, "exitCode": result.returncode, "stdout": result.stdout, "stderr": result.stderr}
    audit.require(result.returncode == 0, "claims-not-current", "Canonical current-claims check failed; producer tests cannot renew claims.", "docs/product-readiness/tools/cli.py", missing="ModuleNotFoundError" in result.stderr)
    freeze = audit.read(ROOT / ".checks/product-readiness-20261015.freeze.json")
    if freeze:
        base = freeze.get("buildBase")
        names = git("ls-tree", "-r", "--name-only", str(base), "--", "docs/product-readiness/assessments")
        for name in (names or "").splitlines():
            old = subprocess.run(["git", "show", f"{base}:{name}"], cwd=ROOT, capture_output=True, check=False)
            path = ROOT / name
            audit.require(path.is_file() and path.read_bytes() == old.stdout, "historical-assessment-rewritten", "Existing assessment bytes must remain immutable; append a new assessment.", name)
        name = "docs/product-readiness/evidence/results.ndjson"
        old = subprocess.run(["git", "show", f"{base}:{name}"], cwd=ROOT, capture_output=True, check=False)
        audit.require((ROOT / name).read_bytes().startswith(old.stdout), "historical-results-rewritten", "Promoted result history must retain its exact original prefix.", name)
    record = audit.receipt("canonical-assessments")
    if not record:
        return
    audit.require(STALE <= set(record.get("useCases", [])), "six-stale-assessments", "The six discovery claims need fresh assessments, plus newly invalidated cases.", "canonical-assessments")
    audit.refs(record.get("assessmentRefs"), "canonical-assessments")
    audit.refs(record.get("independentObservationRefs"), "canonical-assessments")
    audit.require(record.get("sourceCommit") == git("rev-parse", "HEAD"), "assessment-head", "Assessment must apply to this checkout and source fingerprint.", "canonical-assessments")
    audit.require(record.get("historyPreserved") is True, "assessment-history", "Historical dates and digests must remain immutable.", "canonical-assessments", missing=True)


def authority_separation(audit):
    packet = audit.read(PACKET)
    if not packet:
        return
    audit.require(packet.get("informational") is True and packet.get("grantsReadinessTier") is False, "informational-boundary", "Packet must explicitly grant no readiness tier.", PACKET)
    def walk(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in {"grantedTier", "readinessTier", "ReadinessTier", "assessmentContext", "observerContext"}:
                    audit.add("authority-in-packet", f"Informative packet contains canonical authority field {key}.", PACKET)
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)
    walk(packet)
    flow = audit.receipt("claims-flow")
    if not flow:
        return
    argv = flow.get("argv", [])
    audit.require("--observations" in argv and flow.get("exitCode") == 0, "claims-flow-pending", "Retain a successful actual canonical aggregate invocation with observations.", "claims-flow", missing=True)
    if "--observations" in argv and "--output" in argv:
        directories = argv[argv.index("--observations") + 1:argv.index("--output")]
        audit.require(bool(directories), "observation-directory", "No dedicated canonical observation directory.", "claims-flow")
        for directory in directories:
            path = Path(directory)
            path = path if path.is_absolute() else ROOT / path
            audit.require(path.name == "claims" and path != PACKET.parent, "qualification-is-not-bundle", "Use the dedicated claims/ directory, never the informative packet folder.", path)
            for candidate in path.glob("*.json"):
                bundle = audit.read(candidate)
                if bundle:
                    audit.require(set(bundle) == {"schemaVersion", "observerContext", "gitSha", "observedAt", "scenarios"} and bundle.get("observerContext") == "independent-readiness-observer", "canonical-observation-shape", "Invalid canonical independent bundle.", candidate, shape=True)
    audit.refs(flow.get("evidenceRefs"), "claims-flow")
    audit.require(set(flow.get("producerUseCases", [])) == set(flow.get("observedUseCases", [])), "claims-unrelated-cases", "Aggregate must contain only the revalidated use cases.", "claims-flow")


def main_claims(audit):
    record = audit.receipt("main-claims")
    if not record:
        return
    for lane in ("predictedMerge", "mainPush"):
        proof = record.get(lane)
        if not proof:
            audit.add("main-lane-pending", f"Missing {lane} evidence.", "main-claims", missing=True)
            continue
        audit.require(proof.get("conclusion") == "success" and proof.get("jobName") == "product readiness (claims)", "main-lane-failed", "Canonical claims lane is not success.", lane)
        audit.refs(proof.get("evidenceRefs"), lane)
    current = git("rev-parse", "origin/main")
    audit.require(record.get("mainPush", {}).get("sha") == current, "main-lane-source", "Push proof is not pinned to observed origin/main.", "main-claims")
    audit.require(record.get("regrantStatus") == "written" and record.get("regrantExitCode") == 0, "pending-is-not-regrant", "Pending-observation/producer CI does not close this obligation.", "main-claims", missing=True)
    canonical_assessments(audit)


def merge_records(audit):
    record = audit.receipt("merge-records")
    if not record:
        return
    audit.refs(record.get("manifestEvidenceRefs"), "merge-records/MANIFEST")
    rows = record.get("merges", [])
    audit.require({row.get("number") for row in rows} == {656, 657}, "merge-set-pending", "Both repairs need authorized merge records.", "merge-records", missing=True)
    for row in rows:
        loc, proof = f"PR#{row.get('number')}", row.get("countersign", {})
        valid_context(audit, proof, row.get("producerContext"), loc)
        audit.require(proof.get("headSha") == row.get("headSha"), "countersign-head", "Countersign must pin final head.", loc)
        argv = row.get("argv", [])
        audit.require(bool(argv) and Path(argv[0]).as_posix().endswith("scripts/merge_pr.sh") and row.get("exitCode") == 0, "single-merge-door", "Retain successful execution through scripts/merge_pr.sh.", loc)
        audit.refs(row.get("authorizationRefs"), loc)
        audit.refs(row.get("evidenceRefs"), loc)
    main_claims(audit)


def pilot_offer(audit):
    packet = engine_packets(audit)
    if not packet:
        return
    audit.require(all(item.get("status") == "pass" for item in packet.get("engines", [])), "global-readiness-pending", "Global offer requires 14/14 independently proven pass; any blocked/unverified keeps it pending.", PACKET, missing=True)
    findings = packet.get("openFindings")
    audit.require(isinstance(findings, list), "finding-register-pending", "A scoped open-finding register is required.", PACKET, missing=True)
    if isinstance(findings, list):
        for finding in findings:
            audit.require(finding.get("severity") not in {"critical", "high"}, "open-severe-blocker", finding.get("summary", "Open critical/high blocker."), finding.get("id"))
    main_claims(audit)
    acceptance = audit.receipt("pilot-acceptance")
    if acceptance:
        audit.require(acceptance.get("accepted") is True and acceptance.get("actor") == "Daniel" and acceptance.get("scope") == "observed-pilot-offer", "human-pilot-acceptance", "Need Daniel's pilot acceptance, separate from code/merge approval.", "pilot-acceptance", missing=True)
        audit.refs(acceptance.get("evidenceRefs"), "pilot-acceptance")


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in MODES:
        print(json.dumps({"usage": f"{Path(__file__).name} {'|'.join(MODES)}", "exitCode": 2}))
        return 2
    audit = Audit(sys.argv[1])
    globals()[sys.argv[1].replace("-", "_")](audit)
    result = audit.finish()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result["exitCode"]


if __name__ == "__main__":
    raise SystemExit(main())
