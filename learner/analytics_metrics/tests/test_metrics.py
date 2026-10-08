"""AID-3515 — controles negativos contra dupla contagem e métrica inventada.

Cada teste espelha uma regra NC-1..NC-8 de
learner/analytics_metrics/dictionary.yaml §negative_controls. Rodar:
    python3 -m pytest learner/analytics_metrics/tests/ -q
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

PKG = Path(__file__).resolve().parents[1]
REPO = PKG.parents[1]
FIXTURES = PKG / "fixtures" / "synthetic"

spec = importlib.util.spec_from_file_location("compute", PKG / "compute.py")
compute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compute)


def run_cli(fixtures: Path = FIXTURES) -> dict:
    out = subprocess.run(
        [sys.executable, str(PKG / "compute.py"), "--fixtures", str(fixtures)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


REPORT = run_cli()


# NC-1 — dedup por eventId: a última linha do feed literacy é duplicata exata
# do 1º evento; duplicatas contam no removedor, nunca no funil.
def test_nc1_dedup_eventid():
    p = REPORT["pipeline"]
    assert p["rows_read"] == 32 and p["events_accepted"] == 31
    assert p["duplicates_removed"] == 1


# NC-2 — reload/2ª sessão não vira pessoa: unidade reportada é sessão e o
# relatório jamais emite contagem de "aprendizes/pessoas".
def test_nc2_reload_is_session_not_person():
    lit = REPORT["literacy"]
    assert lit["sessions_total"] == 5  # a1..a5
    blob = json.dumps(REPORT).lower()
    for banned in ("aprendizes", "learners_count", "pessoas", "users"):
        assert banned not in blob, banned


# NC-3 — retry na mesma (sessão, lição) não infla conclusão nem visita:
# S1 tem 2 tentativas em l02 → 3 tentativas no total, 2 conclusões (S1, S3),
# 1 par retry, 5 sessões.
def test_nc3_retry_not_new_completion():
    lit = REPORT["literacy"]
    assert lit["attempts_total"] == 3
    assert lit["funnel_counts"]["licao_concluida"] == 2
    assert lit["retry_sessions"] == 1


# NC-4 — erro é tentativa com veredito, não pessoa nova nem queda de visita.
def test_nc4_error_is_attempt_not_person():
    lit = REPORT["literacy"]
    assert lit["attempts_failed"] == 1
    assert lit["funnel_counts"]["entrada"] == 5  # visitas intactas
    r = lit["attempt_error_rate"]
    assert r["value"] == "suppressed" and r["n"] == 3  # 1/3 < k=5 → suprimida


# NC-5 — célula n<5 é suppressed com n explícito, nunca taxa, nunca zero.
def test_nc5_k_suppression():
    osr = REPORT["os"]
    r = osr["onboarding_completion_rate"]
    assert osr["onboarding_completed"] == 2  # contagem crua publicável
    assert r == {"value": "suppressed", "n": 2, "k": 5}


# NC-6 — termo de competência proibido em TODA saída (ADR-0009).
def test_nc6_no_mastered_anywhere():
    blob = json.dumps(REPORT).lower()
    assert "mastered" not in blob
    # o guard também falha o CLI se o termo vazar via fixture maliciosa
    guard = compute.guard_no_forbidden
    try:
        guard({"x": "mastered"})
        raised = False
    except SystemExit:
        raised = True
    assert raised


# NC-7 — exemplo autorial e desfecho insuficiente nunca viram conclusão/
# transferência: 4 registros → 3 aplicações contáveis, 1 excluído; tp-c01
# 1ª tentativa insuficiente NÃO conta como suficiente.
def test_nc7_transfer_examples_and_failures_do_not_count():
    tr = REPORT["transfer"]
    assert tr["excluded_authorial_examples"] == 1
    assert tr["real_applications"] == 0
    tp_c01 = tr["per_practice"]["tp-c01-cotidiano"]
    assert tp_c01["first_attempt"] == 1
    assert tp_c01["first_attempt_sufficient"] == 0  # SYNTHETIC-A falhou c3
    assert tp_c01["second_attempt_recovered"] == 1
    tp_d01 = tr["per_practice"]["tp-d01-dev"]
    assert tp_d01["first_attempt_sufficient"] == 1


# NC-8 — fonte sem dados é not_measured com motivo, nunca zero: retenção do
# literacy e feedback_shown aparecem como não-medidos, ausentes de numeradores.
def test_nc8_absence_is_not_measured():
    lit = REPORT["literacy"]
    assert lit["retention_cross_day"] == "not_measured"
    assert "G8" in lit["retention_reason"]
    nm = REPORT["not_measured"]
    assert "feedback_shown_rate" in nm and "transfer_real" in nm
    assert "feedback" not in json.dumps(REPORT["literacy"]["funnel_counts"])


# Extra: envelope pré-v4 (sem prop entry) fica FORA do denominador da
# retomada (emenda ADR-0009 F2) — 5 entry_viewed, 4 com prop, 1 pré-v4.
def test_entry_pre_v4_excluded_from_resume_denominator():
    lit = REPORT["literacy"]
    assert lit["entry_pre_v4_without_prop"] == 1
    r = lit["resume_rate"]
    assert r["value"] == "suppressed" and r["n"] == 4


# Extra: proxy de erro do OS é qualificado e nunca confundido com veredito
# determinístico do literacy (1 submitted sem passed em m2-devbridge).
def test_os_error_proxy_qualified():
    osr = REPORT["os"]
    assert osr["attempts_error_proxy"] == 1
    assert "proxy" in osr["attempts_error_proxy_note"]


# Extra: feed sem rótulo synthetic:true é recusado (recusa, não silêncio).
def test_unlabeled_feed_refused(tmp_path):
    bad = tmp_path / "synthetic-literacy-v2.ndjson"
    bad.write_text(json.dumps({"schemaVersion": 2, "source": "literacydojo",
                               "event": "entry_viewed",
                               "eventId": "e1", "sessionId": "s1",
                               "occurredAt": "2026-09-25T10:00:00Z",
                               "contentVersion": "x", "props": {}}) + "\n")
    out = subprocess.run(
        [sys.executable, str(PKG / "compute.py"), "--fixtures", str(tmp_path)],
        capture_output=True, text=True,
    )
    assert out.returncode == 2 and "synthetic:true" in out.stderr


# Extra (revisão r2, AID-3515): lessonVersion nas fixtures literacy é inteiro,
# como o emissor real exige (engines/literacyDojo/src/domain/analytics.ts:
# typeof lessonVersion !== "number" || !Number.isInteger → buildEvent lança).
# Envelope com string "v3" não poderia sair da UI real.
def test_literacy_lesson_version_is_integer():
    lines = (FIXTURES / "synthetic-literacy-v2.ndjson").read_text().splitlines()
    versions = []
    for line in filter(None, map(str.strip, lines)):
        props = json.loads(line).get("props", {})
        if "lessonVersion" in props:
            versions.append(props["lessonVersion"])
    assert versions, "esperava ao menos um lessonVersion na fixture literacy"
    assert all(
        isinstance(v, int) and not isinstance(v, bool) for v in versions
    ), versions
