"""Checks for the judgment-verified prompt_builder path (see
.checks/literacy-free-text-verification.md).

Hermetic: canned judgment clients injected, tmp queues/receipts, the real
l18 canonical lesson from the repo. The one exception is the live paraphrase
proof (C5), skipped unless TYPESAFE_API_KEY is set.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import pytest

from learner.gate.evidence_validator import validate_literacy_evidence_structure
from learner.gate.literacy_evaluator import recompute_literacy_evidence
from learner.gate.literacy_verifier import (
    ESCALATIONS_PATH,
    resolve_escalation,
    verify_literacy_evidence,
)

REPO = Path(__file__).resolve().parents[3]

L18_ATTEMPT = "l18-a1"
L18_FIELDS = ("tarefa", "contexto", "publico", "formato")

#: Paraphrased good answer: satisfies every field's intent while sharing ZERO
#: mustIncludeAny substrings with the canonical rubric (the C5 thesis).
PARAPHRASED_VALUES = {
    "tarefa": "Solicitar à assistente que sintetize o quadro de desempenho",
    "contexto": "Os indicadores colhidos na rotina, vendas e atendimento do período",
    "publico": "Quem comanda a empresa, em linguagem executiva",
    "formato": "Documento breve de alto nível com destaques em lista",
}


class FakeClient:
    """Canned judgment client: fixed noul per (activity, field) question id."""

    def __init__(self, noul: float):
        self.noul = noul
        self.calls: list[dict[str, Any]] = []

    def __call__(self, state: dict[str, Any], questions: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(questions)
        return {qid: {"type": "noul", "noul": self.noul} for qid in questions}


def make_evidence(values: dict[str, str], *, pass_claim: bool = True) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "source": "literacydojo",
        "attemptId": L18_ATTEMPT,
        "lessonId": "l18",
        "lessonVersion": 2,
        "activityId": L18_ATTEMPT,
        "activityType": "prompt_builder",
        "skillIds": ["pedir", "aplicar"],
        "deterministicChecks": {"tarefa": True},
        "score": 0.8,
        "pass": pass_claim,
        "verifierRequired": True,
        "answer": {"values": values},
        "timestamp": "2026-09-18T12:00:00Z",
    }


# --- S1: answer transport ------------------------------------------------------


def test_values_answer_transport() -> None:
    """C1: the values variant validates; wrong shapes and undeclared ids reject."""
    evidence = make_evidence(dict.fromkeys(L18_FIELDS, "texto válido do campo"))
    assert validate_literacy_evidence_structure(evidence) == []

    bad_shapes = [
        {**evidence, "answer": {"values": {"tarefa": ""}}},  # empty
        {**evidence, "answer": {"values": {"tarefa": 3}}},  # non-string
        {**evidence, "answer": {"values": {"tarefa": "x" * 2001}}},  # oversized
        {**evidence, "answer": {"values": {}}},  # no fields
        {**evidence, "answer": {"optionIds": ["a"], "values": {"tarefa": "x"}}},  # mixed
    ]
    for bad in bad_shapes[:4]:
        assert validate_literacy_evidence_structure(bad) != []
    mixed = validate_literacy_evidence_structure(bad_shapes[4])
    assert any("cannot combine" in e for e in mixed)

    # undeclared field ids fail at recomputation (activity binding)
    with_undeclared = make_evidence({**PARAPHRASED_VALUES, "campo_inexistente": "x"})
    _, errors = recompute_literacy_evidence(
        with_undeclared, REPO, judgment_client=FakeClient(0.9)
    )
    assert any("undeclared field ids" in e for e in errors)


# --- S2: judgment verification path --------------------------------------------


def test_judgment_pass_path(tmp_path: Path) -> None:
    """C3: all fields >= 0.75 -> pass with a judgment block."""
    evidence = make_evidence(PARAPHRASED_VALUES)
    recomputed, errors = recompute_literacy_evidence(
        evidence, REPO, judgment_client=FakeClient(0.9),
        judgment_receipts_root=tmp_path / "receipts",
    )
    assert errors == []
    assert recomputed is not None and recomputed["pass"] is True
    assert recomputed["score"] == pytest.approx(0.9)
    assert set(recomputed["judgment"]["field_scores"]) == set(L18_FIELDS)
    assert len(recomputed["judgment"]["receipt_digest"]) == 16


def test_judgment_bands(tmp_path: Path) -> None:
    """C4: mean < 0.4 fails without escalation; 0.4-0.75 escalates."""
    low = make_evidence(PARAPHRASED_VALUES)
    recomputed_low = recompute_literacy_evidence(
        low, REPO, judgment_client=FakeClient(0.2),
        judgment_receipts_root=tmp_path / "receipts",
    )[0]
    assert recomputed_low["pass"] is False and not recomputed_low["escalate"]

    mid = make_evidence(PARAPHRASED_VALUES)
    recomputed_mid = recompute_literacy_evidence(
        mid, REPO, judgment_client=FakeClient(0.6),
        judgment_receipts_root=tmp_path / "receipts",
    )[0]
    assert recomputed_mid["pass"] is False and recomputed_mid["escalate"] is True


@pytest.mark.skipif(
    not os.environ.get("TYPESAFE_API_KEY"),
    reason="live paraphrase proof requires TYPESAFE_API_KEY",
)
def test_live_paraphrase_semantics(tmp_path: Path) -> None:
    """C5 (live): paraphrased text with zero rubric substring hits scores >= 0.75."""
    from learner.substrate.judgments import http_client

    evidence = make_evidence(PARAPHRASED_VALUES)
    # sanity: no mustIncludeAny keyword appears in the paraphrase
    rubric = " ".join(PARAPHRASED_VALUES.values()).lower()
    for keyword in ("resumir", "sumari", "relat", "semana", "números", "numeros",
                    "dados", "resultado", "diretoria", "diretor", "gestor", "equipe",
                    "resumo", "uma página", "uma pagina", "tópicos", "topicos", "curto"):
        assert keyword not in rubric, keyword

    client = http_client(os.environ["TYPESAFE_API_KEY"])
    recomputed, errors = recompute_literacy_evidence(
        evidence, REPO, judgment_client=client,
        judgment_receipts_root=tmp_path / "receipts",
    )
    assert errors == []
    assert recomputed is not None and recomputed["score"] >= 0.75


def test_fail_closed_without_key() -> None:
    """C6: no client -> FAIL naming the variable; deterministic types offline."""
    evidence = make_evidence(PARAPHRASED_VALUES)
    verdict = verify_literacy_evidence(evidence, root=REPO, judgment_client=None)
    assert verdict.verdict == "FAIL"
    assert any("TYPESAFE_API_KEY" in e for e in verdict.errors)
    assert verdict.mastery_eligible is False


# --- S3: verdict wiring ---------------------------------------------------------


def test_cli_exit_codes(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """C7: CLI exits 0/3/1 for PASS/ESCALATE/FAIL."""
    import learner.gate.literacy_verifier as lv

    queue = tmp_path / "escalations.ndjson"
    monkeypatch.setattr(lv, "ESCALATIONS_PATH", queue)

    passing = verify_literacy_evidence(
        make_evidence(PARAPHRASED_VALUES),
        root=REPO,
        judgment_client=FakeClient(0.9),
        judgment_receipts_root=tmp_path / "receipts",
        escalations_path=queue,
    )
    assert (passing.verdict, passing.mastery_eligible) == ("PASS", True)
    assert _cli_exit(tmp_path, PARAPHRASED_VALUES, 0.9, queue) == 0

    assert _cli_exit(tmp_path, PARAPHRASED_VALUES, 0.6, queue) == 3
    assert _cli_exit(tmp_path, PARAPHRASED_VALUES, 0.2, queue) == 1


def _cli_exit(
    tmp_path: Path, values: dict[str, str], noul: float, queue: Path
) -> int:
    import learner.gate.literacy_verifier as lv
    import learner.substrate

    evidence_path = tmp_path / f"ev-{noul}.json"
    evidence_path.write_text(
        json.dumps(make_evidence(values, pass_claim=True)), encoding="utf-8"
    )
    receipts = tmp_path / f"receipts-{noul}"
    queue_dir = queue.parent
    queue_dir.mkdir(parents=True, exist_ok=True)
    real_default = learner.substrate.default_judgment_client

    def fake_default():
        return lambda state, questions: FakeClient(noul)(state, questions)

    learner.substrate.default_judgment_client = fake_default
    lv.ESCALATIONS_PATH = queue
    try:
        return lv.main(["--evidence", str(evidence_path), "--root", str(REPO)])
    finally:
        learner.substrate.default_judgment_client = real_default


def test_producer_claim_advisory(tmp_path: Path) -> None:
    """C8: producer pass=true + independent FAIL -> no mismatch error."""
    evidence = make_evidence(PARAPHRASED_VALUES, pass_claim=True)
    verdict = verify_literacy_evidence(
        evidence,
        root=REPO,
        judgment_client=FakeClient(0.2),
        judgment_receipts_root=tmp_path / "receipts",
        escalations_path=tmp_path / "escalations.ndjson",
    )
    assert verdict.verdict == "FAIL"
    assert verdict.producer_pass_claim is True
    assert not any("does not match" in e for e in verdict.errors)


# --- S4: escalation queue and resolution ---------------------------------------


def test_escalation_appends_queue(tmp_path: Path) -> None:
    """C9: ESCALATE appends one entry; the judgment receipt exists."""
    queue = tmp_path / "escalations.ndjson"
    verdict = verify_literacy_evidence(
        make_evidence(PARAPHRASED_VALUES),
        root=REPO,
        judgment_client=FakeClient(0.6),
        judgment_receipts_root=tmp_path / "receipts",
        escalations_path=queue,
    )
    assert verdict.verdict == "ESCALATE"
    entries = [json.loads(l) for l in queue.read_text().splitlines()]
    assert len(entries) == 1
    entry = entries[0]
    assert entry["status"] == "open" and entry["attempt_id"] == L18_ATTEMPT
    assert entry["evidence_digest"] == verdict.evidence_digest
    assert set(entry["field_scores"]) == set(L18_FIELDS)
    receipts = list((tmp_path / "receipts").glob("literacy-*.ndjson"))
    assert any(
        verdict.judgment_receipt_digest in r.name for r in receipts
    ), "digest-named judgment receipt must exist"


def test_resolve_cli(tmp_path: Path) -> None:
    """C10: --resolve rewrites with provenance; unknown/non-open exit 1."""
    queue = tmp_path / "escalations.ndjson"
    queue.write_text(
        json.dumps({"attempt_id": "a1", "evidence_digest": "d", "status": "open"})
        + "\n",
        encoding="utf-8",
    )
    code, message = resolve_escalation("a1", approve=True, path=queue)
    assert code == 0
    entry = json.loads(queue.read_text().splitlines()[0])
    assert entry["status"] == "resolved" and entry["resolution"] == "approve"
    assert entry["resolved_by"] == "owner" and entry["resolved_at"]

    assert resolve_escalation("a1", approve=True, path=queue)[0] == 1  # not open
    assert resolve_escalation("nope", approve=True, path=queue)[0] == 1  # unknown


def test_approved_escalation_passes(tmp_path: Path) -> None:
    """C11: approved digest re-verifies as PASS with resolution manual —
    through the real production sequence: ESCALATE band (0.6) queues an open
    entry, the owner resolves it approve, re-verification returns PASS with
    manual provenance and queues no duplicate entry."""
    queue = tmp_path / "escalations.ndjson"
    evidence = make_evidence(PARAPHRASED_VALUES)

    escalated = verify_literacy_evidence(
        evidence, root=REPO, judgment_client=FakeClient(0.6), escalations_path=queue
    )
    assert escalated.verdict == "ESCALATE"
    assert len(queue.read_text().splitlines()) == 1

    import learner.gate.literacy_verifier as lv

    code, _ = lv.resolve_escalation(L18_ATTEMPT, approve=True, path=queue)
    assert code == 0

    after = verify_literacy_evidence(
        evidence, root=REPO, judgment_client=FakeClient(0.6), escalations_path=queue
    )
    assert after.verdict == "PASS" and after.mastery_eligible is True
    assert after.resolution == "manual"
    # resolved digests queue no further entries
    assert len(queue.read_text().splitlines()) == 1

    # the FAIL band follows the same approved-resolution path (regression
    # guard for the original unrepresentative-proof gap)
    fail_evidence = make_evidence(
        {k: v + " diferente" for k, v in PARAPHRASED_VALUES.items()}
    )
    queue.write_text(
        json.dumps(
            {
                "attempt_id": L18_ATTEMPT,
                "evidence_digest": literacy_evidence_digest_of(fail_evidence, tmp_path),
                "status": "resolved",
                "resolution": "approve",
            }
        )
        + "\n",
        encoding="utf-8",
    )
    recovered = verify_literacy_evidence(
        fail_evidence, root=REPO, judgment_client=FakeClient(0.2), escalations_path=queue
    )
    assert recovered.verdict == "PASS" and recovered.resolution == "manual"


def literacy_evidence_digest_of(evidence: dict, tmp_path: Path) -> str:
    from learner.gate.literacy_verifier import verify_literacy_evidence

    verdict = verify_literacy_evidence(
        evidence, root=REPO, judgment_client=FakeClient(0.2), escalations_path=None,
        judgment_receipts_root=tmp_path / "digest-helper-receipts",
    )
    return verdict.evidence_digest


# --- S5: replay determinism -----------------------------------------------------


def test_replay_determinism(tmp_path: Path) -> None:
    """C12: same evidence twice -> identical receipts, one judgment receipt."""
    queue = tmp_path / "escalations.ndjson"
    evidence = make_evidence(PARAPHRASED_VALUES)
    first = verify_literacy_evidence(
        evidence, root=REPO, judgment_client=FakeClient(0.9), escalations_path=queue
    )
    second = verify_literacy_evidence(
        evidence, root=REPO, judgment_client=FakeClient(0.9), escalations_path=queue
    )
    assert first.to_receipt_dict() == second.to_receipt_dict()


def test_changed_answer_rejudges(tmp_path: Path) -> None:
    """C13: one field changed -> fresh judgment (different digest)."""
    changed = dict(PARAPHRASED_VALUES)
    changed["formato"] = "Outra coisa completamente diferente e curta"
    evidence = make_evidence(changed)
    first = recompute_literacy_evidence(evidence, REPO, judgment_client=FakeClient(0.5), judgment_receipts_root=tmp_path / "receipts")[0]
    other = make_evidence(PARAPHRASED_VALUES)
    second = recompute_literacy_evidence(other, REPO, judgment_client=FakeClient(0.5), judgment_receipts_root=tmp_path / "receipts")[0]
    assert first["judgment"]["receipt_digest"] != second["judgment"]["receipt_digest"]
