#!/usr/bin/env python3
"""Testes offline/determinísticos de scripts/receipt_canon_check.py (AID-3585).

Cobre as fixtures sintéticas retidas em scripts/receipt_canon_fixtures/
(positivas e negativas) e unidades puras do helper. Stdlib apenas; roda com
`python3 scripts/test_receipt_canon_check.py` (também colecionável pelo pytest:
`python3 -m pytest scripts/test_receipt_canon_check.py -q`).

Fronteira verificada: o helper é puro/offline (arquivos locais + stdin), só
emite/valida FORMA de rascunho canônico (regexes do gate reutilizadas por
import) e jamais afirma review/countersign/merge válidos.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("receipt_canon_check.py")
FIX = Path(__file__).with_name("receipt_canon_fixtures")

_spec = importlib.util.spec_from_file_location("receipt_canon_check", SCRIPT)
rc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rc)

FACTS = json.loads((FIX / "facts_valid.json").read_text(encoding="utf-8"))
HEAD = FACTS["expected_head"]
HEAD2 = "81afd2a4" + "0" * 32
REV_LINE = ("Provenance: agent=verifier-evidence task=AID-9006 run=w3001 "
            "session=d90c1e44-2f67-4c1e-9a33-64b9e7a0f512")


def run(*args: str, stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True, text=True, input=stdin, timeout=60,
    )


class TestPureUnits(unittest.TestCase):
    def test_placeholder_detection(self):
        for v in ("_default", "DEFAULT", "TBD", "todo", "<agent>", "xxx", "?"):
            self.assertTrue(rc.is_placeholder(v), v)
        for v in ("w2999", "sess-7f3a2b", "platform-ci", "5843026877"):
            self.assertFalse(rc.is_placeholder(v), v)

    def test_uuid_detection(self):
        self.assertTrue(rc.is_uuid("d90c1e44-2f67-4c1e-9a33-64b9e7a0f512"))
        self.assertFalse(rc.is_uuid("sess-7f3a2b"))

    def test_diag_provenance_names_missing_field(self):
        probs, _ = rc._diag_provenance(
            "Provenance: agent=qa task=AID-1 session=x")
        self.assertTrue(any("campo ausente: run=" in p for p in probs), probs)

    def test_diag_provenance_names_trailing_prose(self):
        probs, _ = rc._diag_provenance(
            "Provenance: agent=qa task=AID-1 run=w1 session=x ok conforme")
        self.assertTrue(any("extras" in p for p in probs), probs)

    def test_diag_citation_names_missing_head_and_verdict(self):
        probs, f = rc._diag_citation("Countersign: AID-9 5843026877")
        self.assertTrue(any("verdict" in p for p in probs), probs)
        probs, f = rc._diag_citation("Countersign: AID-9 verdict 5843026877")
        self.assertNotIn("head", f)

    def test_rendered_lines_match_gate_regexes(self):
        _, parsed = rc.check_facts(FACTS)
        draft = rc.render_draft(parsed)
        prov = [l for l in draft.split("\n") if l.startswith("Provenance:")]
        cite = [l for l in draft.split("\n") if l.startswith("Countersign:")]
        self.assertEqual(len(prov), 2)
        self.assertEqual(len(cite), 1)
        for line in prov:
            self.assertRegex(line, rc.PROVENANCE_RE)
        for line in cite:
            self.assertRegex(line, rc.CITATION_RE)
        # Linha canônica isolada: nada além do par chave=valor na linha.
        for line in prov + cite:
            self.assertNotRegex(line.rstrip(), r"\s(ok|conforme|nota)\s*$")


class TestRenderMode(unittest.TestCase):
    def test_render_valid_facts_exit0_and_selfcheck(self):
        proc = run("--render", "--facts", str(FIX / "facts_valid.json"))
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("RASCUNHO", proc.stdout)
        self.assertIn("head=" + HEAD, proc.stdout)
        self.assertIn("VEREDITO: forma canônica do RASCUNHO OK", proc.stdout)
        # Disclaimer de fronteira em linha separada.
        self.assertIn("não é countersign, não é review, não autoriza", proc.stdout)

    def test_render_is_deterministic(self):
        a = run("--render", "--facts", str(FIX / "facts_valid.json"))
        b = run("--render", "--facts", str(FIX / "facts_valid.json"))
        self.assertEqual(a.stdout, b.stdout)

    def test_render_rejects_same_actor_facts(self):
        proc = run("--render", "--facts", str(FIX / "facts_same_actor.json"))
        self.assertEqual(proc.returncode, 1)
        self.assertIn("F0009", proc.stdout)  # produtor=revisor
        self.assertNotIn("Countersign:", proc.stdout.split("---")[0])

    def test_render_never_guesses_missing_session(self):
        proc = run("--render", "--facts", str(FIX / "facts_missing_session.json"))
        self.assertEqual(proc.returncode, 1)
        self.assertIn("F0002", proc.stdout)  # campo ausente, sem default


class TestCheckMode(unittest.TestCase):
    def _check(self, draft: str, facts: str = "facts_valid.json"):
        return run("--check", "--facts", str(FIX / facts), "--draft",
                   str(FIX / draft))

    def test_valid_reviewer_only_receipt_passes_with_warn(self):
        proc = self._check("draft_valid.md")
        self.assertEqual(proc.returncode, 0, proc.stdout)
        self.assertIn("VEREDITO: forma canônica do RASCUNHO OK", proc.stdout)
        self.assertIn("D0014", proc.stdout)  # lembrete: registrar produtor

    def test_full_receipt_producer_plus_reviewer_passes(self):
        proc = self._check("draft_full_receipt.md")
        self.assertEqual(proc.returncode, 0, proc.stdout)
        self.assertNotIn("REJECT", proc.stdout)

    def test_bare_40hex_head_token_satisfies_pin(self):
        proc = self._check("draft_bare_head_token.md")
        self.assertEqual(proc.returncode, 0, proc.stdout)
        self.assertIn("D0007", proc.stdout)  # contrato gate §3

    def test_prose_at_end_of_session_rejected(self):
        proc = self._check("draft_prose_at_session.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0002", proc.stdout)
        self.assertIn("extras", proc.stdout)

    def test_missing_run_field_rejected(self):
        proc = self._check("draft_missing_field.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("campo ausente: run=", proc.stdout)

    def test_placeholder_session_rejected(self):
        proc = self._check("draft_placeholder_session.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0010", proc.stdout)  # placeholder conhecido

    def test_actor_id_used_as_session_rejected(self):
        proc = self._check("draft_actor_as_session.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0011", proc.stdout)  # actor/session trocados

    def test_legit_uuid_session_is_explicitly_ok(self):
        proc = self._check("draft_valid.md")
        self.assertEqual(proc.returncode, 0)
        self.assertIn("D0012", proc.stdout)  # UUID fora dos actor IDs: legítimo

    def test_head_mismatch_rejected(self):
        proc = self._check("draft_head_mismatch.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0005", proc.stdout)  # divergente/stale

    def test_head_missing_rejected(self):
        proc = self._check("draft_head_missing.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0008", proc.stdout)  # head ausente

    def test_same_actor_draft_rejected(self):
        proc = self._check("draft_same_actor.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0013", proc.stdout)  # sem trailer do revisor distinto

    def test_fenced_template_is_not_operative(self):
        proc = self._check("draft_fenced_template.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0001", proc.stdout)  # dentro de fence: documentação
        self.assertIn("D0004", proc.stdout)  # nenhuma linha operativa

    def test_lookalike_prefix_rejected(self):
        proc = self._check("draft_lookalike_prefix.md")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0015", proc.stdout)  # 'Countersign :' typo

    def test_indented_canonical_line_rejected_no_prose_noise(self):
        import tempfile
        body = ("Countersign: AID-9006 verdict 5843026877 head=" + HEAD +
                "\n  " + REV_LINE + "\nprosa indentada comum não é achado:\n"
                "    - bullet markdown qualquer\n")
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as fh:
            fh.write(body)
            path = fh.name
        proc = run("--check", "--facts", str(FIX / "facts_valid.json"),
                   "--draft", path)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("D0002", proc.stdout)      # trailer indentado falha regex
        self.assertNotIn("D0003", proc.stdout)   # prosa indentada não é achado

    def test_stdin_draft(self):
        body = (FIX / "draft_valid.md").read_text(encoding="utf-8")
        proc = run("--check", "--facts", str(FIX / "facts_valid.json"),
                   "--draft-stdin", stdin=body)
        self.assertEqual(proc.returncode, 0, proc.stdout)

    def test_usage_errors_exit2(self):
        self.assertEqual(run("--facts", str(FIX / "facts_valid.json")).returncode, 2)
        self.assertEqual(
            run("--check", "--facts", str(FIX / "facts_valid.json")).returncode, 2)
        self.assertEqual(
            run("--render", "--check", "--facts",
                str(FIX / "facts_valid.json")).returncode, 2)


class TestNonObjectFacts(unittest.TestCase):
    """N1 (parecer V&E 5c74d991): facts não-objeto deve emitir F0001
    documentado e exit 1 — jamais traceback."""

    def test_check_facts_non_object_keeps_tuple_contract(self):
        for bad in ([1, 2, 3], "apenas uma string", 42, None):
            problems, parsed = rc.check_facts(bad)
            self.assertIn(("REJECT", "F0001",
                           "fatos não são um objeto JSON (tipo %s)"
                           % type(bad).__name__), list(problems), bad)
            self.assertEqual(parsed, {}, bad)

    def test_check_draft_non_object_facts_does_not_raise(self):
        p = rc.check_draft("Countersign: AID-9006 verdict 5843026877 "
                           "head=" + HEAD, [1, 2, 3])
        self.assertTrue(p.rejects)

    def test_render_non_object_facts_exit1_f0001_no_traceback(self):
        proc = run("--render", "--facts", str(FIX / "facts_non_object.json"))
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("REJECT F0001", proc.stdout)
        self.assertIn("não são um objeto JSON (tipo list)", proc.stdout)
        self.assertIn("FATOS REJEITADOS", proc.stdout)
        self.assertNotIn("Traceback", proc.stderr)
        self.assertNotIn("Countersign:", proc.stdout.split("---")[0])

    def test_check_non_object_facts_exit1_f0001_no_traceback(self):
        proc = run("--check", "--facts", str(FIX / "facts_non_object.json"),
                   "--draft", str(FIX / "draft_valid.md"))
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("REJECT F0001", proc.stdout)
        self.assertNotIn("Traceback", proc.stderr)


class TestBoundary(unittest.TestCase):
    def test_no_network_apis_in_source(self):
        src = SCRIPT.read_text(encoding="utf-8")
        for banned in ("requests", "urllib", "http.client", "socket",
                       "subprocess.run", "os.environ"):
            self.assertNotIn(banned, src, banned)

    def test_success_output_never_claims_countersign_or_merge(self):
        proc = run("--check", "--facts", str(FIX / "facts_valid.json"),
                   "--draft", str(FIX / "draft_full_receipt.md"))
        self.assertEqual(proc.returncode, 0)
        for line in proc.stdout.splitlines():
            if line.startswith("VEREDITO:"):
                self.assertIn("RASCUNHO", line)
                self.assertNotIn("countersign válido", line.lower())
                self.assertNotIn("merge autorizado", line.lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
