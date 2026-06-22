import tempfile
import unittest
from pathlib import Path


class TestLearningUnitE2EContract(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.store_path = Path(self.tmpdir.name) / "events.ndjson"

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_verifier_pass_is_the_only_path_to_dominado_and_is_audited(self):
        from engines.minimaxDojo.core.gates import EmpiricalGate
        from engines.minimaxDojo.core.memory import EventStore
        from engines.minimaxDojo.core.state_machine import UnitStateMachine

        unit_id = "U0-sonda-rate-limiter-robustness"
        machine = UnitStateMachine(unit_id=unit_id)
        gate = EmpiricalGate()
        store = EventStore(self.store_path)

        machine.transition("aluno.aceita")
        machine.transition("aluno.submete")
        machine.transition("mestre.done")

        verdict = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertEqual(verdict.verdict, "PASS")

        machine.transition(
            "prometor.PASS",
            payload={
                "mutation_score": verdict.mutation_score,
                "coverage_core": verdict.coverage_core,
                "tests_pass": verdict.tests_pass,
                "lint_clean": verdict.lint_clean,
            },
        )

        for event in machine.get_events():
            store.append(event)
        store.append(
            {
                "ts": "T-verdict",
                "agente": "prometor",
                "ev": "verdict",
                "unit": unit_id,
                "verdict": verdict.verdict,
                "gaps": verdict.gaps,
            }
        )

        self.assertEqual(machine.state, "DOMINADO")
        self.assertEqual(machine.sub_state, "DONE")

        events = store.read_by_unit(unit_id)
        self.assertEqual([event["ev"] for event in events[:4]], [
            "aluno.aceita",
            "aluno.submete",
            "mestre.done",
            "prometor.PASS",
        ])
        self.assertEqual(events[-1]["agente"], "prometor")
        self.assertEqual(events[-1]["verdict"], "PASS")

    def test_failed_gate_retries_then_blocks_without_mastery(self):
        from engines.minimaxDojo.core.gates import EmpiricalGate
        from engines.minimaxDojo.core.memory import EventStore
        from engines.minimaxDojo.core.state_machine import UnitStateMachine

        unit_id = "U0-sonda-rate-limiter-robustness"
        machine = UnitStateMachine(unit_id=unit_id)
        gate = EmpiricalGate()
        store = EventStore(self.store_path)

        for attempt in range(3):
            machine.transition("aluno.aceita")
            machine.transition("aluno.submete")
            machine.transition("mestre.done")
            verdict = gate.evaluate(
                mutation_score=0.42,
                coverage_core=0.86,
                tests_pass=True,
                lint_clean=True,
                anti_patterns=[],
            )
            self.assertEqual(verdict.verdict, "FAIL")
            machine.transition(
                "prometor.FAIL",
                payload={"attempt": attempt + 1, "gaps": verdict.gaps},
            )

        for event in machine.get_events():
            store.append(event)

        self.assertEqual(machine.state, "FALHA_BLOQUEIO")
        self.assertEqual(machine.retries, 3)
        self.assertNotEqual(machine.state, "DOMINADO")

        fail_events = store.read_by_event("prometor.FAIL")
        self.assertEqual(len(fail_events), 3)
        self.assertTrue(all(event["payload"]["gaps"] for event in fail_events))


if __name__ == "__main__":
    unittest.main()
