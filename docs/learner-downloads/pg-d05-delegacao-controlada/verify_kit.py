#!/usr/bin/env python3
"""Verificador do kit de downloads em etapas pg-d05-delegacao-controlada (AID-3668).

Prova, com saidas reais:
  1. --check-source  : fonte vendored confere com manifests/pin-hashes.json
                       (pin PR646@f7e3228a; drift = falha).
  2. --check-zips    : cada ZIP zips/ tem o inventario cumulativo exato da
                       etapa (faltando/extra = falha), bytes internos identicos
                       ao pin, e as fronteiras pedagogicas:
                         etapa 1 (pratica): sem guia-de-correcao;
                         ambas as etapas: sem MANIFEST.md (provenance-only).
  3. --check-run     : extrai a etapa 1 em workspace limpo e roda o ciclo do
                       aprendiz de verdade, conforme o enunciado:
                         escopo r1  -> REPROVADO exit 1 (proibido/allowlist/max);
                         escopo r2  -> APROVADO exit 0;
                         fixture V1 -> '6 testes passaram' exit 0.
                       Extrai a etapa 2 POR CIMA (cumulativa) e roda a prova
                       V&E congelada do pacote:
                         selftest -> 'selftest: APROVADO (4 sondas)' exit 0
                       (o selftest precisa dos fixtures docentes: recibo-falso
                       deve REPROVAR, recibo-exemplo deve APROVAR).
  4. --check-repro   : duas reconstrucoes independentes (packager.py) produzem
                       ZIPs byte-identicos entre si e aos ZIPs commitados em zips/.

Uso:
  python3 verify_kit.py            # todos os checks
  python3 verify_kit.py --check-zips
Saida: uma linha `ok ...`/`FALHA ...` por verificacao; exit != 0 se algo falhar.
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
ZIP_ROOT = "pg-d05"
PACKAGE = "pg-d05-delegacao-controlada"


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
    source_dir = HERE / "source" / PACKAGE
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
        if name.startswith("%s/guia-de-correcao/" % ZIP_ROOT) and index == 0:
            problems.append("guia-de-correcao na %s: %s" % (stage_id, name))
        if name == "%s/MANIFEST.md" % ZIP_ROOT:
            problems.append("MANIFEST.md (provenance-only) entregue na %s: %s"
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
        kit_names = {"%s/%s" % (ZIP_ROOT, f) for f in expected_cumulative(stages, index)}
        expected_names = kit_names | {"%s/ETAPA.md" % ZIP_ROOT,
                                      "%s/INVENTARIO.txt" % ZIP_ROOT}
        missing = sorted(expected_names - names)
        extra = sorted(names - expected_names)
        report.check(not missing and not extra,
                     "check-zips: %s inventario exato (%d arquivos do kit + 2 gerados)"
                     % (stage["zip"], len(kit_names)),
                     "check-zips: %s faltando=%s extra=%s"
                     % (stage["zip"], missing, extra))
        drift = [n for n in sorted(kit_names & names)
                 if sha256_bytes(entries[n])
                 != pin["%s/%s" % (PACKAGE, n[len(ZIP_ROOT) + 1:])]["sha256"]]
        report.check(not drift,
                     "check-zips: %s bytes internos identicos ao pin" % stage["zip"],
                     "check-zips: %s drift interno vs pin: %s" % (stage["zip"], drift))
        problems = check_boundaries(report, stages, index, names)
        report.check(not problems,
                     "check-zips: %s fronteiras pedagogicas ok" % stage["zip"],
                     "check-zips: %s fronteiras violadas: %s" % (stage["zip"], problems))


def run_cmd(report, cwd: Path, args, expect_rc, expect_out, label):
    proc = subprocess.run([SYS_PY, *args], cwd=cwd, capture_output=True, text=True)
    ok = proc.returncode == expect_rc and expect_out in proc.stdout
    report.check(ok,
                 "%s: rc=%d com %r" % (label, proc.returncode, expect_out),
                 "%s: esperado rc=%d com %r; obtido rc=%d stdout=%r stderr=%r"
                 % (label, expect_rc, expect_out, proc.returncode,
                    proc.stdout[-200:], proc.stderr[-200:]))
    return proc


def check_run(report, dist):
    with tempfile.TemporaryDirectory(prefix="pg-d05-run-") as tmp:
        workdir = Path(tmp) / "limpo"
        workdir.mkdir()
        with zipfile.ZipFile(dist / "pg-d05-etapa-1-pratica.zip") as zf:
            zf.extractall(workdir)
        root = workdir / ZIP_ROOT
        run_cmd(report, root,
                ["insumos/verifica_delegacao.py", "escopo",
                 "insumos/delegacao-r1/diff-r1.patch"],
                1, "escopo: REPROVADO", "check-run escopo r1 (etapa 1 limpa)")
        run_cmd(report, root,
                ["insumos/verifica_delegacao.py", "escopo",
                 "insumos/delegacao-r2/diff-r2.patch"],
                0, "escopo: APROVADO", "check-run escopo r2 (etapa 1 limpa)")
        run_cmd(report, root,
                ["insumos/fixture/testes.py"],
                0, "6 testes passaram", "check-run V1 fixture baseline")

        with zipfile.ZipFile(dist / "pg-d05-etapa-2-docente.zip") as zf:
            zf.extractall(workdir)
        run_cmd(report, root,
                ["insumos/verifica_delegacao.py", "selftest"],
                0, "selftest: APROVADO (4 sondas)",
                "check-run selftest V&E (etapa 2 sobre etapa 1)")


def check_repro(report, dist):
    sys.path.insert(0, str(HERE))
    import packager
    doc = load_json(HERE / "manifests" / "stages.json")
    stages = doc["stages"]
    outs = []
    with tempfile.TemporaryDirectory(prefix="pg-d05-repro-") as tmp:
        for build in ("build1", "build2"):
            out_dir = Path(tmp) / build
            out_dir.mkdir()
            for index in range(len(stages)):
                packager.build_zip(out_dir, stages, index,
                                   HERE / "source" / PACKAGE,
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
        "# RELATORIO DE VERIFICACAO — kit pg-d05-delegacao-controlada (AID-3668)",
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
