#!/usr/bin/env python3
"""AID-3515 — cálculo reproduzível das métricas do dicionário analytics_metrics.

Lê fixtures NDJSON (literacy v2, OS v1, transfer outcomes), aplica as regras
do `dictionary.yaml` (dedup por eventId, contagem por sessão, retry por
(sessão, lição/missão), supressão k>=5 para taxas, proibição do termo
`mastered`) e emite relatório JSON + Markdown.

O relatório sobre as fixtures shipped é EXEMPLO SINTÉTICO ROTULADO: nenhum
dado de aprendiz real entra aqui (regra NC-7/N C-8 do dicionário).

Uso:
    python3 learner/analytics_metrics/compute.py \
        --fixtures learner/analytics_metrics/fixtures/synthetic \
        [--out-json caminho.json] [--out-md caminho.md]
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

import yaml

K_THRESHOLD = 5  # AID-463 §3.0 — imutável (ADR-0010)
FORBIDDEN = ("mastered",)  # ADR-0009 — analytics jamais emite competência

LITERACY_EVENTS = {
    "entry_viewed", "mapa_inicial_done", "route_chosen", "lesson_started",
    "activity_attempted", "lesson_completed", "review_started",
    "review_completed", "lesson_brief_viewed", "activity_presented",
}
OS_EVENTS = {
    "onboarding.started", "onboarding.completed", "journey.returned",
    "mission.started", "mission.completed", "structured_attempt.submitted",
    "structured_attempt.passed", "hint.requested", "retry.requested",
    "review.started", "verification.state_changed", "renderer.degraded",
    "mission.brief_viewed", "activity.presented",
}


def die(msg: str) -> None:
    print(f"compute.py: FALHA de controle: {msg}", file=sys.stderr)
    raise SystemExit(2)


def load_feed(path: Path) -> list[dict]:
    rows = []
    with path.open() as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as exc:
                die(f"{path.name}:{lineno} NDJSON ilegível: {exc}")
            if rec.get("synthetic") is not True:
                die(f"{path.name}:{lineno} sem rótulo synthetic:true — recusa (NC-7)")
            rows.append(rec)
    return rows


def dedup(rows: list[dict], feed: str) -> tuple[list[dict], int]:
    seen: set[str] = set()
    kept, dup = [], 0
    for rec in rows:
        eid = rec.get("eventId") or die(f"{feed}: registro sem eventId")
        if eid in seen:
            dup += 1
            continue
        seen.add(eid)
        kept.append(rec)
    return kept, dup


def day_of(iso: str) -> str:
    return iso[:10]


def rate(num: int, den: int) -> dict:
    """Taxa só existe com denominador >= k (AID-463 §3.0). Nunca 0, nunca taxa crua."""
    if den < K_THRESHOLD:
        return {"value": "suppressed", "n": den, "k": K_THRESHOLD}
    return {"value": round(num / den, 4), "n": num, "den": den}


def compute_literacy(events: list[dict]) -> dict:
    by_session: dict[str, dict] = defaultdict(lambda: {
        "days": set(), "events": [], "lessons_attempted": defaultdict(int),
    })
    for ev in events:
        name = ev.get("event")
        if name not in LITERACY_EVENTS:
            die(f"literacy: evento fora do vocabulário: {name}")
        sid = ev["sessionId"]
        s = by_session[sid]
        s["days"].add(day_of(ev["occurredAt"]))
        s["events"].append(ev)
        if name == "activity_attempted":
            s["lessons_attempted"][ev["props"]["lessonId"]] += 1

    def sessions_with(pred) -> int:
        return sum(1 for s in by_session.values() if pred(s))

    has = lambda s, n: any(e["event"] == n for e in s["events"])

    entrada = sessions_with(lambda s: has(s, "entry_viewed"))
    brief = sessions_with(lambda s: has(s, "lesson_brief_viewed"))
    iniciada = sessions_with(lambda s: has(s, "lesson_started"))
    exposta = sessions_with(lambda s: has(s, "activity_presented"))
    tentativa = sessions_with(lambda s: has(s, "activity_attempted"))
    concluida = sessions_with(lambda s: has(s, "lesson_completed"))

    attempts = [e for s in by_session.values() for e in s["events"]
                if e["event"] == "activity_attempted"]
    failed = [a for a in attempts if a["props"].get("passed") is False]

    retry_pairs = {
        (sid, lid)
        for sid, s in by_session.items()
        for lid, n in s["lessons_attempted"].items() if n >= 2
    }

    entry_with_prop = [
        e for s in by_session.values() for e in s["events"]
        if e["event"] == "entry_viewed" and "entry" in e.get("props", {})
    ]
    entry_split = defaultdict(int)
    for e in entry_with_prop:
        entry_split[e["props"]["entry"]] += 1

    return {
        "sessions_total": len(by_session),
        "funnel_counts": {
            "entrada": entrada, "brief": brief, "licao_iniciada": iniciada,
            "primeira_atividade_exposta": exposta, "tentativa": tentativa,
            "licao_concluida": concluida,
        },
        "attempt_error_rate": rate(len(failed), len(attempts)),
        "attempts_total": len(attempts),
        "attempts_failed": len(failed),
        "retry_sessions": len(retry_pairs),
        "entry_split": dict(entry_split),
        "entry_pre_v4_without_prop": sum(
            1 for s in by_session.values() for e in s["events"]
            if e["event"] == "entry_viewed" and "entry" not in e.get("props", {})
        ),
        "resume_rate": rate(
            entry_split.get("lesson-resume", 0), len(entry_with_prop)
        ),
        "retention_cross_day": "not_measured",
        "retention_reason": "G8: sessionId efêmero por page load; sem identificador cross-dia (ADR-0009 emenda AID-913)",
    }


def compute_os(events: list[dict]) -> dict:
    by_install: dict[str, list[dict]] = defaultdict(list)
    for ev in events:
        name = ev.get("name")
        if name not in OS_EVENTS:
            die(f"os: evento fora do vocabulário: {name}")
        by_install[ev["dimensions"]["installationId"]].append(ev)

    installs = len(by_install)
    onb_started = sum(1 for evs in by_install.values()
                      if any(e["name"] == "onboarding.started" for e in evs))
    onb_completed = sum(1 for evs in by_install.values()
                        if any(e["name"] == "onboarding.completed" for e in evs))
    cross_day = sum(
        1 for evs in by_install.values()
        if len({day_of(e["occurredAt"]) for e in evs}) >= 2
    )

    submitted = [e for e in events if e["name"] == "structured_attempt.submitted"]
    passed = [e for e in events if e["name"] == "structured_attempt.passed"]
    # Proxy de erro (limite documentado no dicionário §erro): submitted sem
    # passed subsequente na mesma (instalação, sessão, missão).
    passed_keys = {
        (e["dimensions"]["installationId"], e["dimensions"]["sessionId"],
         e["dimensions"].get("missionId")) for e in passed
    }
    proxy_error = [
        e for e in submitted
        if (e["dimensions"]["installationId"], e["dimensions"]["sessionId"],
            e["dimensions"].get("missionId")) not in passed_keys
    ]
    retries = [e for e in events if e["name"] == "retry.requested"]

    return {
        "installations": installs,
        "onboarding_started": onb_started,
        "onboarding_completed": onb_completed,
        "onboarding_completion_rate": rate(onb_completed, onb_started),
        "attempts_submitted": len(submitted),
        "attempts_passed_observable": len(passed),
        "attempts_error_proxy": len(proxy_error),
        "attempts_error_proxy_note": "proxy: submitted sem passed subsequente na mesma (instalação, sessão, missão); evento de veredito negativo não existe no vocabulário OS v1",
        "retry_requested": len(retries),
        "retention_cross_day_installs": cross_day,
        "retention_cross_day_rate": rate(cross_day, installs),
    }


def compute_transfer(rows: list[dict]) -> dict:
    # NC-7: registros de exemplo autorial ficam FORA de todo numerador.
    applications = [r for r in rows if not r.get("authorial_example")]
    excluded_examples = len(rows) - len(applications)

    by_practice: dict[str, list[dict]] = defaultdict(list)
    for r in applications:
        by_practice[r["practice"]].append(r)

    per_practice = {}
    for practice, recs in sorted(by_practice.items()):
        first = [r for r in recs if r["attempt"] == 1]
        second = [r for r in recs if r["attempt"] == 2]
        first_pass = sum(1 for r in first if r["outcome"] == "suficiente")
        second_recovered = sum(1 for r in second if r.get("recovered"))
        per_practice[practice] = {
            "applications": len(recs),
            "first_attempt": len(first),
            "first_attempt_sufficient": first_pass,
            "first_attempt_pass_rate": rate(first_pass, len(first)),
            "second_attempt": len(second),
            "second_attempt_recovered": second_recovered,
            "note": "registros SINTÉTICOS de calibração; aplicações reais = 0 (práticas PR #619 ainda sem teste com alunos)",
        }
    return {
        "per_practice": per_practice,
        "excluded_authorial_examples": excluded_examples,
        "real_applications": 0,
    }


def build_report(fixtures_dir: Path) -> dict:
    dict_path = Path(__file__).parent / "dictionary.yaml"
    dictionary = yaml.safe_load(dict_path.read_text())

    lit_rows = load_feed(fixtures_dir / "synthetic-literacy-v2.ndjson")
    os_rows = load_feed(fixtures_dir / "synthetic-os-v1.ndjson")
    tr_rows = load_feed(fixtures_dir / "synthetic-transfer-outcomes.ndjson")

    lit, lit_dup = dedup(lit_rows, "literacy")
    os_, os_dup = dedup(os_rows, "os")

    report = {
        "report_version": "aid3515-v1",
        "data_provenance": {
            "synthetic": True,
            "label": "FIXTURES SINTÉTICAS DE CALIBRAÇÃO — nenhum aprendiz real; nenhum dado exportado de produção",
            "fixtures": sorted(p.name for p in fixtures_dir.glob("*.ndjson")),
            "dictionary_version": dictionary["meta"]["dictionary_version"],
            "k_threshold": K_THRESHOLD,
        },
        "pipeline": {
            "rows_read": len(lit_rows) + len(os_rows),
            "events_accepted": len(lit) + len(os_),
            "duplicates_removed": lit_dup + os_dup,
        },
        "literacy": compute_literacy(lit),
        "os": compute_os(os_),
        "transfer": compute_transfer(tr_rows),
        "not_measured": {
            "retention_literacy_standalone": "sem identificador cross-dia (G8)",
            "feedback_shown_rate": "evento feedback_shown fora dos vocabulários (TF-1)",
            "transfer_real": "canal de evidência sem aplicações reais",
            "funil_dev_deep": "dojoToday emite só daily-view-open (G3)",
        },
    }
    guard_no_forbidden(report)
    return report


def guard_no_forbidden(obj) -> None:
    """NC-6: nenhuma saída contém termo proibido (competência/mastery)."""
    blob = json.dumps(obj, ensure_ascii=False).lower()
    for term in FORBIDDEN:
        if term in blob:
            die(f"saída contém termo proibido '{term}' (ADR-0009)")


def emit_md(report: dict) -> str:
    p = report["pipeline"]
    lit = report["literacy"]
    os_r = report["os"]
    tr = report["transfer"]
    lines = [
        "# Relatório de progresso — EXEMPLO SINTÉTICO (AID-3515)",
        "",
        f"> **{report['data_provenance']['label']}**",
        "> Fonte: fixtures `learner/analytics_metrics/fixtures/synthetic/` ·",
        f" dicionário {report['data_provenance']['dictionary_version']} ·",
        " reproduzível via `python3 learner/analytics_metrics/compute.py --fixtures <dir>`.",
        "",
        "## Pipeline",
        "",
        f"- linhas lidas: {p['rows_read']} · aceitas pós-dedup: {p['events_accepted']} · duplicatas removidas: {p['duplicates_removed']}",
        "",
        "## Funil literacy (unidade: sessão/page load — visita ≠ pessoa)",
        "",
        "| estágio | sessões |",
        "| --- | --- |",
    ]
    for stage, n in lit["funnel_counts"].items():
        lines.append(f"| {stage} | {n} |")
    lines += [
        "",
        f"- tentativas: {lit['attempts_total']} · com erro determinístico (passed=false): {lit['attempts_failed']} · taxa de erro: {fmt(lit['attempt_error_rate'])}",
        f"- sessões-com-retry (≥2 tentativas na mesma lição): {lit['retry_sessions']}",
        f"- split de entrada: {lit['entry_split']} · envelopes pré-v4 sem prop entry: {lit['entry_pre_v4_without_prop']} (fora do denominador da retomada)",
        f"- taxa de retomada (entry=lesson-resume): {fmt(lit['resume_rate'])}",
        f"- retenção cross-dia: **não medido** — {lit['retention_reason']}",
        "",
        "## Funil OS (unidade: instalação)",
        "",
        f"- instalações: {os_r['installations']} · onboarding iniciado: {os_r['onboarding_started']} · concluído: {os_r['onboarding_completed']} · taxa: {fmt(os_r['onboarding_completion_rate'])}",
        f"- tentativas submetidas: {os_r['attempts_submitted']} · aprovadas (observável): {os_r['attempts_passed_observable']} · erro (proxy): {os_r['attempts_error_proxy']} — {os_r['attempts_error_proxy_note']}",
        f"- retry.requested: {os_r['retry_requested']} · instalações cross-dia: {os_r['retention_cross_day_installs']} · taxa: {fmt(os_r['retention_cross_day_rate'])}",
        "",
        "## Transferência (canal de evidência — rubricas tp-c01/tp-d01)",
        "",
    ]
    for practice, stats in tr["per_practice"].items():
        lines.append(f"- **{practice}**: aplicações {stats['applications']} (1ª tentativa: {stats['first_attempt']}, suficientes: {stats['first_attempt_sufficient']}, taxa: {fmt(stats['first_attempt_pass_rate'])}) · 2ª tentativa: {stats['second_attempt']} (recuperadas: {stats['second_attempt_recovered']}) — {stats['note']}")
    lines += [
        f"- exemplos autorais de calibração excluídos dos numeradores: {tr['excluded_authorial_examples']} · aplicações REAIS: {tr['real_applications']}",
        "",
        "## Não medido (zeros honestos)",
        "",
    ]
    for key, reason in report["not_measured"].items():
        lines.append(f"- {key}: {reason}")
    lines += [
        "",
        "## Leitura obrigatória",
        "",
        "- Conclusão ≠ mastery: eventos acima medem experiência; competência exige",
        "  evidência independente no gate (learner/AGENTS.md), fora daqui.",
        "- Células `suppressed (n<k)` não são zero nem baixo — são não-publicáveis (k=5).",
        "- Reload = 2 sessões: cruzar com ficha P6 antes de concluir drop-off.",
        "",
    ]
    return "\n".join(lines)


def fmt(r: dict) -> str:
    if r["value"] == "suppressed":
        return f"suppressed (n={r['n']}<k={r['k']})"
    return f"{r['value']} ({r['n']}/{r['den']})"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixtures", required=True, type=Path)
    ap.add_argument("--out-json", type=Path)
    ap.add_argument("--out-md", type=Path)
    args = ap.parse_args()

    report = build_report(args.fixtures)
    blob = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)
    md = emit_md(report)

    if args.out_json:
        args.out_json.write_text(blob + "\n")
    if args.out_md:
        args.out_md.write_text(md)
    if not args.out_json and not args.out_md:
        print(blob)
        print("\n" + md, file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
