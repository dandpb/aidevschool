#!/usr/bin/env python3
"""Verificador do kit de downloads em etapas pg-e01-evals-offline (AID-3667).

Prova, com saidas reais:
  1. --check-source  : fonte vendored confere com manifests/pin-hashes.json
                       (pin PR645@b028652d; drift = falha).
  2. --check-zips    : cada ZIP zips/ tem o inventario cumulativo exato da
                       etapa (faltando/extra = falha), bytes internos identicos
                       ao pin, e as fronteiras pedagogicas:
                         etapa 1: sem saidas_* do PrismaDesk, sem heldout de
                                   insumos, sem guia-de-correcao, sem C;
                         etapa 2: sem heldout de insumos, sem guia-de-correcao;
                         etapas 1-3: sem guia-de-correcao (exceto etapa 4+);
                         etapa 4: guia-de-correcao SO com proposta-referencia.md.
  3. --check-run     : extrai a etapa 3 (cumulativa) em workspace limpo e roda
                       o scorer de verdade, conferindo os numeros-alvo:
                         base A vs B:    GERAL 17/24 -> 18/24, pagamento 5/6 -> 2/6;
                         heldout A vs B: GERAL 8/12 -> 8/12, pagamento 2/3 -> 0/3;
                         heldout B vs C: GERAL 8/12 -> 11/12, pagamento 0/3 -> 3/3.
                       Extrai a etapa 5 e roda guia-de-correcao/testes.py
                       (9 checks).
  4. --check-repro   : duas reconstrucoes independentes (packager.py) produzem
                       ZIPs byte-identicos entre si e aos ZIPs commitados em zips/.

Uso:
  python3 verify_kit.py            # todos os checks
  python3 verify_kit.py --check-zips
Saída: uma linha `ok ...`/`FALHA ...` por verificacao; exit != 0 se algo falhar.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SYS_PY = sys.executable or "python3"


def load_json(path: Path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class Report:
    def __init__(self):
        self.failures = 0
        self.lines = []

    def ok(self, msg):
        self.lines.append("ok %s" % msg)

    def fail(self, msg):
        self.failures += 1
        self.lines.append("FALHA %s" % msg)

    def check(self, cond, ok_msg, fail_msg):
        if cond:
            self.ok(ok_msg)
        else:
            self.fail(fail_msg)


def check_source(report, manifests):
    pin = load_json(manifests / "pin-hashes.json")
    source_dir = HERE / "source" / "pg-e01-evals-offline"
    total, drift = 0, []
    for rel, meta in sorted(pin["files"].items()):
        fp = HERE / "source" / rel
        if not fp.is_file():
            drift.append("%s ausente" % rel)
            continue
        total += 1
        data = fp.read_bytes()
        if sha256_bytes(data) != meta["sha256"] or len(data) != meta["bytes"]:
            drift.append(rel)
    report.check(not drift,
                 "check-source: %d/%d arquivos byte-identicos ao pin %s"
                 % (total - len(drift), total, pin["sourcePin"]["commit"][:12]),
                 "check-source: drift/ausencia vs pin: %s" % drift)


def expected_cumulative(stages, index):
    files = set()
    for stage in stages[: index + 1]:
        files.update(stage["adds"])
    return files


def zip_entries(zip_path: Path):
    with zipfile.ZipFile(zip_path) as zf:
        return {i.filename: zf.read(i.filename) for i in zf.infolist()
                if not i.filename.endswith("/")}


def check_boundaries(report, stages, index, names):
    stage_id = stages[index]["id"]
    problems = []
    for name in names:
        if index == 0 and name.startswith("pg-e01/insumos/fixture/saidas_"):
            problems.append("saida do PrismaDesk na %s: %s" % (stage_id, name))
        if index <= 1 and name.startswith("pg-e01/insumos/fixture/heldout/"):
            problems.append("heldout de insumos na %s: %s" % (stage_id, name))
        if index <= 1 and name.startswith("pg-e01/guia-de-correcao/"):
            problems.append("guia-de-correcao na %s: %s" % (stage_id, name))
        if index <= 2 and name.startswith("pg-e01/guia-de-correcao/"):
            problems.append("guia-de-correcao na %s: %s" % (stage_id, name))
        if index == 3 and name.startswith("pg-e01/guia-de-correcao/"):
            if name != "pg-e01/guia-de-correcao/proposta-referencia.md":
                problems.append("guia além da referencia minima na %s: %s"
                                % (stage_id, name))
    return problems


def check_zips(report, manifests, dist):
    doc = load_json(manifests / "stages.json")
    stages = doc["stages"]
    pin = load_json(manifests / "pin-hashes.json")["files"]
    for index, stage in enumerate(stages):
        zip_path = dist / stage["zip"]
        if not zip_path.is_file():
            report.fail("check-zips: %s ausente em zips/" % stage["zip"])
            continue
        entries = zip_entries(zip_path)
        names = set(entries)
        kit_names = {"pg-e01/%s" % f for f in expected_cumulative(stages, index)}
        expected_names = kit_names | {"pg-e01/ETAPA.md", "pg-e01/INVENTARIO.txt"}
        missing = sorted(expected_names - names)
        extra = sorted(names - expected_names)
        report.check(not missing and not extra,
                     "check-zips: %s inventario exato (%d arquivos do kit + 2 gerados)"
                     % (stage["zip"], len(kit_names)),
                     "check-zips: %s faltando=%s extra=%s"
                     % (stage["zip"], missing, extra))
        drift = [n for n in sorted(kit_names & names)
                 if sha256_bytes(entries[n])
                 != pin["pg-e01-evals-offline/%s" % n[len("pg-e01/"):]]["sha256"]]
        report.check(not drift,
                     "check-zips: %s bytes internos identicos ao pin" % stage["zip"],
                     "check-zips: %s drift interno vs pin: %s" % (stage["zip"], drift))
        problems = check_boundaries(report, stages, index, names)
        report.check(not problems,
                     "check-zips: %s fronteiras pedagogicas ok" % stage["zip"],
                     "check-zips: %s fronteiras violadas: %s" % (stage["zip"], problems))


def run_scorer(workdir: Path, casos, a, b):
    cmd = [SYS_PY, "insumos/fixture/metricas.py", "comparar", "--json",
           "--casos", casos, "--A", a, "--B", b]
    proc = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError("scorer falhou (%s): %s" % (casos, proc.stderr))
    return json.loads(proc.stdout)["resultado"]


def assert_slice(report, res, fatia, n, ok_a, ok_b, label):
    v = res[fatia]
    got = (v["n"], v["ok_a"], v["ok_b"])
    report.check(got == (n, ok_a, ok_b),
                 "%s: %s %d/%d -> %d/%d" % (label, fatia, ok_a, n, ok_b, n),
                 "%s: %s esperado %d/%d -> %d/%d, obtido %s"
                 % (label, fatia, ok_a, n, ok_b, n, got))


def check_run(report, dist):
    with tempfile.TemporaryDirectory(prefix="pg-e01-run-") as tmp:
        workdir = Path(tmp) / "limpo"
        with zipfile.ZipFile(dist / "pg-e01-etapa-3-heldout.zip") as zf:
            zf.extractall(workdir)
        root = workdir / "pg-e01"
        base = run_scorer(root, "insumos/fixture/casos_base.json",
                          "insumos/fixture/saidas_A_base.json",
                          "insumos/fixture/saidas_B_base.json")
        assert_slice(report, base, "GERAL", 24, 17, 18, "check-run base A vs B")
        assert_slice(report, base, "pagamento", 6, 5, 2, "check-run base A vs B")
        held = "insumos/fixture/heldout"
        hv1 = run_scorer(root, "%s/casos_heldout.json" % held,
                         "%s/saidas_A_heldout.json" % held,
                         "%s/saidas_B_heldout.json" % held)
        assert_slice(report, hv1, "GERAL", 12, 8, 8, "check-run heldout A vs B")
        assert_slice(report, hv1, "pagamento", 3, 2, 0, "check-run heldout A vs B")
        hv2 = run_scorer(root, "%s/casos_heldout.json" % held,
                         "%s/saidas_B_heldout.json" % held,
                         "%s/saidas_C_heldout.json" % held)
        assert_slice(report, hv2, "GERAL", 12, 8, 11, "check-run heldout B vs C")
        assert_slice(report, hv2, "pagamento", 3, 0, 3, "check-run heldout B vs C")

        docdir = Path(tmp) / "docente"
        with zipfile.ZipFile(dist / "pg-e01-etapa-5-docente.zip") as zf:
            zf.extractall(docdir)
        proc = subprocess.run(
            [SYS_PY, "guia-de-correcao/testes.py"],
            cwd=docdir / "pg-e01", capture_output=True, text=True)
        report.check(proc.returncode == 0 and "9 testes passaram" in proc.stdout,
                     "check-run: guia-de-correcao/testes.py = 9 checks ok",
                     "check-run: testes.py rc=%d saida=%r stderr=%r"
                     % (proc.returncode, proc.stdout[-200:], proc.stderr[-200:]))


def check_repro(report, dist):
    sys.path.insert(0, str(HERE))
    import packager
    doc = load_json(HERE / "manifests" / "stages.json")
    stages = doc["stages"]
    outs = []
    with tempfile.TemporaryDirectory(prefix="pg-e01-repro-") as tmp:
        for build in ("build1", "build2"):
            out_dir = Path(tmp) / build
            out_dir.mkdir()
            for index in range(len(stages)):
                packager.build_zip(out_dir, stages, index,
                                   HERE / "source" / "pg-e01-evals-offline",
                                   load_json(HERE / "manifests" / "pin-hashes.json")["sourcePin"])
            outs.append({p.name: sha256_bytes(p.read_bytes())
                         for p in sorted(out_dir.iterdir())})
    committed = {p.name: sha256_bytes(p.read_bytes())
                 for p in sorted(dist.iterdir()) if p.suffix == ".zip"}
    same = outs[0] == outs[1]
    match = outs[0] == committed
    report.check(same and match,
                 "check-repro: 2 construcoes independentes identicas entre si "
                 "e aos ZIPs commitados (%d zips)" % len(committed),
                 "check-repro: builds iguais=%s, iguais ao commit=%s; b1=%s b2=%s dist=%s"
                 % (same, match, outs[0], outs[1], committed))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("check-source", "check-zips", "check-run", "check-repro"):
        parser.add_argument("--%s" % flag, action="store_true")
    parser.add_argument("--report", help="grava o relatorio em markdown neste caminho")
    args = parser.parse_args(argv)
    any_flag = any([args.check_source, args.check_zips, args.check_run,
                    args.check_repro])

    report = Report()
    manifests = HERE / "manifests"
    dist = HERE / "zips"
    if not any_flag or args.check_source:
        check_source(report, manifests)
    if not any_flag or args.check_zips:
        check_zips(report, manifests, dist)
    if not any_flag or args.check_run:
        check_run(report, dist)
    if not any_flag or args.check_repro:
        check_repro(report, dist)

    print("\n".join(report.lines))
    total_ok = sum(1 for l in report.lines if l.startswith("ok "))
    print("resumo: %d ok, %d falha(s)" % (total_ok, report.failures))
    if args.report:
        write_report(args.report, report, total_ok)
    return 1 if report.failures else 0


def write_report(path, report, total_ok):
    lines = [
        "# RELATORIO DE VERIFICACAO — kit pg-e01-evals-offline (AID-3667)",
        "",
        "Gerado por `verify_kit.py` (execucao real, stdlib, sem rede).",
        "",
        "```",
        *report.lines,
        "resumo: %d ok, %d falha(s)" % (total_ok, report.failures),
        "```",
        "",
    ]
    Path(path).write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
