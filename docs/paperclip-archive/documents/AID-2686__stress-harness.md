<!-- issue: AID-2686 | key: stress-harness | doc_id: aa0c5d40-a9a2-4f61-a47c-a2b98d5a5230 | updated: 2026-09-26 02:30:25.108+00 -->

# Stress harness AID-2686 (prove) — fonte + resultados

(AID-2686)

# Stress harness — AID-2686 (estação PROVE)

Fonte íntegra do harness executado em worktree novo na base `2d9928f2` (merge PR #527), 2026-09-26.
Runtime state somente em `.scratch/factory/stress-*` (gitignored). Reexecução:

```
git worktree add <dir> 2d9928f2 && cd <dir>
python3 stress_prove.py   #FACTORY_HOME por cenário sob .scratch/factory/
```

## Resultados (JSON oficial da execução)

```json
[
 {
  "sid": "S1-p3-same-context",
  "desc": "autor==verificador no prove (P3)",
  "expected": "block c/ motivo P3",
  "observed": "block ['P3: author and verifier are the same context (ctx-dup) — producer never verifies its own work']",
  "verdict": "ROBUSTO",
  "extra": "chain_ok=True author=ctx-dup verifier=ctx-dup"
 },
 {
  "sid": "S2-proof-without-output",
  "desc": "prova sem output (arquivo apagado)",
  "expected": "block c/ proof output file missing",
  "observed": "block ['C1: proof output file missing']",
  "verdict": "ROBUSTO",
  "extra": "chain_ok=True"
 },
 {
  "sid": "S3-tampered-output",
  "desc": "output tampered pós-fato (append)",
  "expected": "block c/ digest mismatch",
  "observed": "block ['C1: proof output digest mismatch']",
  "verdict": "ROBUSTO",
  "extra": "chain_ok=True"
 },
 {
  "sid": "S4-fabricated-proof",
  "desc": "prova fabricada (proofs.json+output reescritos c/ digest consistente)",
  "expected": "block (prova não ancorada em nada independente)",
  "observed": "promote []",
  "verdict": "FURADO (defeito D1)",
  "extra": "chain_ok=True — ledger intacto pós fraude: recibos 'verified' só carregam proof_refs (IDs), nunca os digests"
 },
 {
  "sid": "S5-dirty-tracked-invisible",
  "desc": "commit quebra sha256 + restore SUJO (sem commit): checks rodam na árvore consertada",
  "expected": "block (árvore no SHA promovido nunca foi validada)",
  "observed": "promote []",
  "verdict": "FURADO (defeito D2)",
  "extra": "chain_ok=True; status--porcelain no worktree pós-gate: 'M factory/model.py'; commit promovido contém digest quebrado: True (git show 508fe49bcbb9279162648a4385bfc3d6733487e4:factory/model.py)"
 },
 {
  "sid": "S6-vacuous-check",
  "desc": "contrato com checks vacuos (`true` / `:`) congela e promove",
  "expected": "block ou aviso (evidência insuficiente)",
  "observed": "promote []",
  "verdict": "FURADO (defeito D3 — suficiência não validada)",
  "extra": "chain_ok=True"
 },
 {
  "sid": "S7-cli-false-negative",
  "desc": "syntax error em factory/__main__.py commitado; C1-C3 todos exit 0",
  "expected": "ao menos um check deveria falhar",
  "observed": "exits={'C1': 0, 'C2': 0, 'C3': 0} gate=promote []",
  "verdict": "FURADO (defeito D4 — falso negativo C1-C3)",
  "extra": "chain_ok=True; __main__.py quebrado no commit promovido: True"
 },
 {
  "sid": "S9-state-tamper-p3-bypass",
  "desc": "mesmo contexto (S1) + tamper em state.json trocando author_context",
  "expected": "block (P3 com contexto real do ledger)",
  "observed": "promote []",
  "verdict": "FURADO (defeito D5 — gate confia em state.json mutável, ignora recibos do ledger)",
  "extra": "chain_ok=True — recibos do ledger carregam context_id=ctx-dup para author E verifier, mas o gate não cruza"
 }
]
```

## stress_prove.py (verbatim)

```python
#!/usr/bin/env python3
"""AID-2686 FACTORY-STRESS — stress da estação PROVE (Verifier & Evidence).

Ataques ao pipeline factory/ (base 2d9928f2, PR #527 merge):
  S1  P3 mesmo contexto autor==verificador (deve BLOQUEAR)
  S2  prova sem output (arquivo apagado) (deve BLOQUEAR)
  S3  output tampered pós-fato (deve BLOQUEAR)
  S4  prova FABRICADA: proofs.json + output reescritos consistentemente
  S5  arquivo tracked sujo (commit quebra + restore sujo) invisível ao drift
  S6  check vacuo (`true`) congela e promove sem evidência real
  S7  falso-negativo C1-C3: __main__.py quebrado passa nos 3 checks
  S9  state.json tampered: burla P3 trocando author_context pós-fato

Runtime state SOMENTE em .scratch/factory/stress-<sid>/ (gitignored).
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path("/tmp/opencode/w2686/repo")
BASE_SHA = subprocess.run(
    ["git", "-C", str(REPO), "rev-parse", "HEAD"], capture_output=True, text=True
).stdout.strip()
REAL_REGISTRY = REPO / "intent"

sys.path.insert(0, str(REPO))

from factory.coordinator import Coordinator  # noqa: E402
from factory.model import WorkEvent, sha256_text  # noqa: E402

RESULTS: list[dict] = []


def new_coord(sid: str, registry: Path | None = None) -> Coordinator:
    home = REPO / ".scratch/factory" / f"stress-{sid}"
    os.environ["FACTORY_HOME"] = str(home)
    return Coordinator(repo=REPO, home=home, registry=registry or REAL_REGISTRY)


def author_cmd_commit(msg: str) -> str:
    return (
        "git config user.email stress@local && git config user.name stress-author && "
        f"echo '{msg}' > STRESS.md && git add -A && git commit -qm 'stress: {msg}'"
    )


CHANGE_ID = "AID-2676-agentic-factory-poc"


def pipeline(c: Coordinator, sid: str, author: str, verifier: str,
             author_cmd: str | None = None, change_id: str = CHANGE_ID) -> dict:
    ev = WorkEvent(id=f"E-{sid}", origin="AID-2686", scope=f"stress {sid}")
    c.intake(ev)
    c.claim(ev.id, author)
    run_id = f"run-E-{sid}"
    c.freeze(run_id, change_id=change_id, context_id=author, base_sha=BASE_SHA)
    c.build(run_id, author_context=author,
            author_cmd=author_cmd or author_cmd_commit(sid))
    c.prove(run_id, verifier_context=verifier)
    return c._load_state(run_id)


def gate_of(c: Coordinator, sid: str) -> tuple[str, list[str], bool]:
    run_id = f"run-E-{sid}"
    d = c.gate(run_id, context_id="coordinator")
    chain = c._ledger(run_id).verify_chain()
    return d.verdict, d.reasons, chain


def record(sid: str, desc: str, expected: str, observed: str, verdict: str,
           extra: str = "") -> None:
    RESULTS.append(dict(sid=sid, desc=desc, expected=expected, observed=observed,
                        verdict=verdict, extra=extra))
    print(f"[{sid}] {desc}
  expected={expected}
  observed={observed}
  verdict={verdict}
  {extra}
")


def temp_registry(sid: str, checks_body: str | None = None) -> tuple[Path, str]:
    """Registry temp com checks do corpo dado; None = copia C1-C3 reais."""
    root = REPO / ".scratch/factory/stress-registries" / sid
    if root.exists():
        shutil.rmtree(root)
    change_id = f"STRESS-{sid}"
    d = root / change_id
    d.mkdir(parents=True)
    if checks_body is None:
        src = REAL_REGISTRY / "AID-2676-agentic-factory-poc"
        for name in ("intent.md", "spec.md", "plan.md", "checks.md"):
            shutil.copyfile(src / name, d / name)
        # F1 (friction): plan.md real nao casa PLAN_APPROVED; append de linha
        # standalone para o congelamento funcionar no cenario.
        with (d / "plan.md").open("a") as fh:
            fh.write("
Status: approved
")
    else:
        (d / "intent.md").write_text(f"# intent stress {sid}
AID-2686 stress test.
")
        (d / "spec.md").write_text("# spec stress
Sem escopo de produção.
")
        (d / "plan.md").write_text("# Plan stress

Status: approved
Plano mínimo de stress.
")
        (d / "checks.md").write_text(checks_body)
    return root, change_id


# ---------------------------------------------------------------- S1
def s1() -> None:
    sid = "S1-p3-same-context"
    reg, cid = temp_registry("S1")
    c = new_coord(sid, registry=reg)
    state = pipeline(c, sid, author="ctx-dup", verifier="ctx-dup", change_id=cid)
    verdict, reasons, chain = gate_of(c, sid)
    ok = verdict == "block" and any("P3" in r for r in reasons)
    record(sid, "autor==verificador no prove (P3)", "block c/ motivo P3",
           f"{verdict} {reasons}", "ROBUSTO" if ok else "FURADO",
           f"chain_ok={chain} author={state['author_context']} verifier={state['verifier_context']}")


# ---------------------------------------------------------------- S2
def s2() -> None:
    sid = "S2-proof-without-output"
    reg, cid = temp_registry("S2")
    c = new_coord(sid, registry=reg)
    pipeline(c, sid, author="ctx-author", verifier="ctx-verifier", change_id=cid)
    out = REPO / ".scratch/factory" / f"stress-{sid}" / "runs" / f"run-E-{sid}" / "proofs" / "C1.output.txt"
    out.unlink()
    verdict, reasons, chain = gate_of(c, sid)
    ok = verdict == "block" and any("missing" in r for r in reasons)
    record(sid, "prova sem output (arquivo apagado)", "block c/ proof output file missing",
           f"{verdict} {reasons}", "ROBUSTO" if ok else "FURADO", f"chain_ok={chain}")


# ---------------------------------------------------------------- S3
def s3() -> None:
    sid = "S3-tampered-output"
    reg, cid = temp_registry("S2")
    c = new_coord(sid, registry=reg)
    pipeline(c, sid, author="ctx-author", verifier="ctx-verifier", change_id=cid)
    out = REPO / ".scratch/factory" / f"stress-{sid}" / "runs" / f"run-E-{sid}" / "proofs" / "C1.output.txt"
    with out.open("a") as fh:
        fh.write("TAMPERED
")
    verdict, reasons, chain = gate_of(c, sid)
    ok = verdict == "block" and any("digest mismatch" in r for r in reasons)
    record(sid, "output tampered pós-fato (append)", "block c/ digest mismatch",
           f"{verdict} {reasons}", "ROBUSTO" if ok else "FURADO", f"chain_ok={chain}")


# ---------------------------------------------------------------- S4
def s4() -> None:
    sid = "S4-fabricated-proof"
    reg, cid = temp_registry("S4", "# checks

```
C1 | profile=cheap | python3 -c \"import sys; sys.exit(3)\"
```
")
    c = new_coord(sid, registry=reg)
    run_id = f"run-E-{sid}"
    pipeline(c, sid, author="ctx-author", verifier="ctx-verifier", change_id=cid)
    proofs_dir = REPO / ".scratch/factory" / f"stress-{sid}" / "runs" / run_id / "proofs"
    # ataque: reescrever prova FALHA como PASS (arquivo + digest consistentes)
    fake = "exit=0
--- stdout ---
(fabricated by attacker)
--- stderr ---
"
    (proofs_dir / "C1.output.txt").write_text(fake)
    meta = json.loads((proofs_dir / "proofs.json").read_text())
    meta[0]["exit_code"] = 0
    meta[0]["output_sha256"] = sha256_text(fake)
    (proofs_dir / "proofs.json").write_text(json.dumps(meta, indent=2) + "
")
    verdict, reasons, chain = gate_of(c, sid)
    furado = verdict == "promote"
    record(sid, "prova fabricada (proofs.json+output reescritos c/ digest consistente)",
           "block (prova não ancorada em nada independente)",
           f"{verdict} {reasons}",
           "FURADO (defeito D1)" if furado else "ROBUSTO",
           f"chain_ok={chain} — ledger intacto pós fraude: recibos 'verified' só carregam proof_refs (IDs), nunca os digests")


# ---------------------------------------------------------------- S5
def s5() -> None:
    sid = "S5-dirty-tracked-invisible"
    reg, cid = temp_registry("S5")
    c = new_coord(sid, registry=reg)
    break_digests = (
        "git config user.email stress@local && git config user.name stress-author
"
        "python3 - <<'PYEOF'
"
        "from pathlib import Path
"
        "p = Path('factory/model.py'); t = p.read_text()
"
        "p.write_text(t.replace('return hashlib.sha256(data).hexdigest()', 'return \"0\"*64', 1))
"
        "PYEOF
"
        "git add -A && git commit -qm 'S5: commit quebra sha256 (provavel)'
"
        "python3 - <<'PYEOF'
"
        "from pathlib import Path
"
        "p = Path('factory/model.py'); t = p.read_text()
"
        "p.write_text(t.replace('return \"0\"*64', 'return hashlib.sha256(data).hexdigest()', 1))
"
        "PYEOF
"
    )
    state = pipeline(c, sid, author="ctx-author", verifier="ctx-verifier",
                     author_cmd=break_digests, change_id=cid)
    verdict, reasons, chain = gate_of(c, sid)
    wt = Path(state["worktree"])
    dirty = subprocess.run(["git", "-C", str(wt), "status", "--porcelain"],
                           capture_output=True, text=True).stdout.strip()
    broken_in_commit = subprocess.run(
        ["git", "-C", str(wt), "show", f"{state['build_sha']}:factory/model.py"],
        capture_output=True, text=True).stdout.find('"0"*64') >= 0
    furado = verdict == "promote" and broken_in_commit and dirty != ""
    record(sid, "commit quebra sha256 + restore SUJO (sem commit): checks rodam na árvore consertada",
           "block (árvore no SHA promovido nunca foi validada)",
           f"{verdict} {reasons}",
           "FURADO (defeito D2)" if furado else "ROBUSTO",
           f"chain_ok={chain}; status--porcelain no worktree pós-gate: {dirty!r}; "
           f"commit promovido contém digest quebrado: {broken_in_commit} "
           f"(git show {state['build_sha']}:factory/model.py)")


# ---------------------------------------------------------------- S6
def s6() -> None:
    sid = "S6-vacuous-check"
    reg, cid = temp_registry("S6", "# checks

```
C1 | profile=cheap | true
C2 | profile=standard | :
```
")
    c = new_coord(sid, registry=reg)
    pipeline(c, sid, author="ctx-author", verifier="ctx-verifier", change_id=cid)
    verdict, reasons, chain = gate_of(c, sid)
    furado = verdict == "promote"
    record(sid, "contrato com checks vacuos (`true` / `:`) congela e promove",
           "block ou aviso (evidência insuficiente)",
           f"{verdict} {reasons}",
           "FURADO (defeito D3 — suficiência não validada)" if furado else "ROBUSTO",
           f"chain_ok={chain}")


# ---------------------------------------------------------------- S7
def s7() -> None:
    sid = "S7-cli-false-negative"
    reg, cid = temp_registry("S7")
    c = new_coord(sid, registry=reg)
    cmd = (
        "git config user.email stress@local && git config user.name stress-author && "
        "echo 'def broken(' >> factory/__main__.py && "
        "printf 'echo \"git show HEAD:factory/__main__.py tem syntax error\"
' > STRESS.md && "
        "git add -A && git commit -qm 'S7: quebra CLI entrypoint'"
    )
    state = pipeline(c, sid, author="ctx-author", verifier="ctx-verifier", author_cmd=cmd, change_id=cid)
    wt = Path(state["worktree"])
    exits = {}
    for cid, ccmd in [
        ("C1", "python3 -m pytest factory/tests/ -q"),
        ("C2", 'python3 -c "import factory.coordinator, factory.gate, factory.verify, factory.queue, factory.ledger, factory.contract, factory.gitwork, factory.model"'),
        ("C3", 'python3 -m pytest factory/tests/ -q -k "e2e or negative or ledger"'),
    ]:
        exits[cid] = subprocess.run(["bash", "-c", ccmd], cwd=str(wt),
                                    capture_output=True, text=True).returncode
    verdict, reasons, chain = gate_of(c, sid)
    syntax_broken = subprocess.run(
        ["git", "-C", str(wt), "show", f"{state['build_sha']}:factory/__main__.py"],
        capture_output=True, text=True).stdout.find("def broken(") >= 0
    furado = verdict == "promote" and all(rc == 0 for rc in exits.values()) and syntax_broken
    record(sid, "syntax error em factory/__main__.py commitado; C1-C3 todos exit 0",
           "ao menos um check deveria falhar",
           f"exits={exits} gate={verdict} {reasons}",
           "FURADO (defeito D4 — falso negativo C1-C3)" if furado else "ROBUSTO",
           f"chain_ok={chain}; __main__.py quebrado no commit promovido: {syntax_broken}")


# ---------------------------------------------------------------- S9
def s9() -> None:
    sid = "S9-state-tamper-p3-bypass"
    reg, cid = temp_registry("S9")
    c = new_coord(sid, registry=reg)
    pipeline(c, sid, author="ctx-dup", verifier="ctx-dup", change_id=cid)
    sp = REPO / ".scratch/factory" / f"stress-{sid}" / "runs" / f"run-E-{sid}" / "state.json"
    state = json.loads(sp.read_text())
    state["author_context"] = "ctx-fake-outro"
    sp.write_text(json.dumps(state, indent=2, sort_keys=True) + "
")
    verdict, reasons, chain = gate_of(c, sid)
    furado = verdict == "promote"
    record(sid, "mesmo contexto (S1) + tamper em state.json trocando author_context",
           "block (P3 com contexto real do ledger)",
           f"{verdict} {reasons}",
           "FURADO (defeito D5 — gate confia em state.json mutável, ignora recibos do ledger)" if furado else "ROBUSTO",
           f"chain_ok={chain} — recibos do ledger carregam context_id=ctx-dup para author E verifier, mas o gate não cruza")


def main() -> None:
    for stale in (REPO / ".scratch/factory").glob("stress-*"):
        shutil.rmtree(stale, ignore_errors=True)
    print(f"base={BASE_SHA}")
    for fn in (s1, s2, s3, s4, s5, s6, s7, s9):
        try:
            fn()
        except Exception as exc:  # noqa: BLE001
            record(fn.__name__, "cenario CRASHOU", "execucao", f"EXCEPTION {exc!r}", "ERRO")
    out = REPO / ".scratch/factory/stress-AID-2686-results.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(RESULTS, indent=2, ensure_ascii=False) + "
")
    print(f"results -> {out}")
    n_furado = sum(1 for r in RESULTS if r["verdict"].startswith("FURADO"))
    print(f"TOTAL: {len(RESULTS)} cenarios, {n_furado} FURADOS, "
          f"{sum(1 for r in RESULTS if r['verdict']=='ROBUSTO')} ROBUSTOS")


if __name__ == "__main__":
    main()

```
