"""Contract tests for the Ágora Continuum state machine.

These tests define the REQUIRED behavior of the deterministic state machine
that governs learning units. The implementation lives in
`engines/minimaxDojo/core/state_machine/`.

States: APRESENTANDO → PRATICANDO → AVALIANDO → DOMINADO (+ FALHA_BLOQUEIO)
Sub-machine (AVALIANDO): PRODUCING → VERIFYING → DONE

Reference: engines/minimaxDojo/docs/02_state_machine.md
"""

import unittest


class TestUnitStateMachine(unittest.TestCase):
    """Tests for the main unit state machine transitions."""

    def setUp(self):
        from engines.minimaxDojo.core.state_machine import UnitStateMachine
        self.sm_class = UnitStateMachine

    def test_new_unit_starts_in_apresentando(self):
        sm = self.sm_class(unit_id="U-001")
        self.assertEqual(sm.state, "APRESENTANDO")

    def test_apresentando_to_praticando_on_accept(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        self.assertEqual(sm.state, "PRATICANDO")

    def test_praticando_to_avaliando_on_submit(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        self.assertEqual(sm.state, "AVALIANDO")

    def test_avaliando_to_dominado_on_pass(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.PASS", payload={
            "mutation_score": 0.72,
            "coverage_core": 0.86,
        })
        self.assertEqual(sm.state, "DOMINADO")

    def test_avaliando_to_apresentando_on_fail_with_retries_left(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.FAIL", payload={"reason": "mutation too low"})
        self.assertEqual(sm.state, "APRESENTANDO")
        self.assertEqual(sm.retries, 1)

    def test_fail_after_three_retries_goes_to_falha_bloqueio(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.FAIL")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.FAIL")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.FAIL")
        self.assertEqual(sm.state, "FALHA_BLOQUEIO")
        self.assertEqual(sm.retries, 3)

    def test_falha_bloqueio_to_apresentando_on_seneca_pass(self):
        sm = self.sm_class(unit_id="U-001")
        # Burn through 3 retries
        for _ in range(3):
            sm.transition("aluno.aceita")
            sm.transition("aluno.submete")
            sm.transition("prometor.FAIL")
        self.assertEqual(sm.state, "FALHA_BLOQUEIO")
        sm.transition("seneca.PASS")
        self.assertEqual(sm.state, "APRESENTANDO")
        self.assertEqual(sm.retries, 0)  # reset for new approach

    def test_invalid_transition_raises_error(self):
        from engines.minimaxDojo.core.state_machine import DeterminismError
        sm = self.sm_class(unit_id="U-001")
        with self.assertRaises(DeterminismError):
            sm.transition("prometor.PASS")  # can't verify before practicing

    def test_max_retries_is_configurable(self):
        """max_retries is injectable (sourced from the config seam by default, D8)."""
        sm = self.sm_class(unit_id="U-001", max_retries=1)
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.FAIL")  # first failure already hits the cap of 1
        self.assertEqual(sm.state, "FALHA_BLOQUEIO")

    def test_transition_logs_event(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        events = sm.get_events()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["ev"], "aluno.aceita")
        self.assertEqual(events[0]["unit"], "U-001")
        self.assertIn("ts", events[0])

    def test_praticando_timeout_submits_partial(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("timeout")
        self.assertEqual(sm.state, "AVALIANDO")

    def test_dominado_is_terminal(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.PASS", payload={
            "mutation_score": 0.72,
            "coverage_core": 0.86,
        })
        from engines.minimaxDojo.core.state_machine import DeterminismError
        with self.assertRaises(DeterminismError):
            sm.transition("aluno.aceita")  # can't leave DOMINADO


class TestEvaluationSubMachine(unittest.TestCase):
    """Tests for the AVALIANDO sub-machine: PRODUCING → VERIFYING → DONE."""

    def setUp(self):
        from engines.minimaxDojo.core.state_machine import UnitStateMachine
        self.sm_class = UnitStateMachine

    def test_entering_avaliando_starts_producing(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        self.assertEqual(sm.sub_state, "PRODUCING")

    def test_producing_to_verifying(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("mestre.done")
        self.assertEqual(sm.sub_state, "VERIFYING")

    def test_verifying_pass_goes_to_done(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("mestre.done")
        sm.transition("prometor.PASS", payload={
            "mutation_score": 0.70,
            "coverage_core": 0.85,
        })
        self.assertEqual(sm.sub_state, "DONE")

    def test_verifying_fail_returns_to_producing(self):
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("mestre.done")
        sm.transition("prometor.FAIL")
        self.assertEqual(sm.sub_state, "PRODUCING")


class TestStateMachineInvariants(unittest.TestCase):
    """Tests for the formal invariants (I1-I5) from the spec."""

    def setUp(self):
        from engines.minimaxDojo.core.state_machine import UnitStateMachine
        self.sm_class = UnitStateMachine

    def test_I1_dominado_requires_verifier_pass(self):
        """I1: Transition to DOMINADO REQUIRES positive verdict from PROMĘTOR."""
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        # Cannot reach DOMINADO without prometor.PASS
        from engines.minimaxDojo.core.state_machine import DeterminismError
        with self.assertRaises(DeterminismError):
            sm.transition("critico.OK")  # critic alone can't promote

    def test_critico_ok_after_prometor_pass_while_dominado(self):
        """critico.OK confirms after prometor.PASS (state is already DOMINADO, sub_state DONE)."""
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("mestre.done")
        sm.transition(
            "prometor.PASS",
            payload={"mutation_score": 0.72, "coverage_core": 0.86},
        )
        self.assertEqual(sm.state, "DOMINADO")
        self.assertEqual(sm.sub_state, "DONE")
        # Must not raise: critic confirmation arrives after terminal promotion.
        self.assertEqual(sm.transition("critico.OK"), "DOMINADO")
        self.assertEqual(sm.state, "DOMINADO")

    def test_I3_retries_capped_at_three(self):
        """I3: retries ≤ 3 per unit; at exhaustion, SÊNECA decides."""
        sm = self.sm_class(unit_id="U-001")
        for _ in range(3):
            sm.transition("aluno.aceita")
            sm.transition("aluno.submete")
            sm.transition("prometor.FAIL")
        # After 3rd failure, must be in FALHA_BLOQUEIO
        self.assertEqual(sm.state, "FALHA_BLOQUEIO")
        self.assertEqual(sm.retries, 3)

    def test_I5_all_decisions_logged(self):
        """I5: Every decision is logged in event_log."""
        sm = self.sm_class(unit_id="U-001")
        sm.transition("aluno.aceita")
        sm.transition("aluno.submete")
        sm.transition("prometor.PASS", payload={
            "mutation_score": 0.72,
            "coverage_core": 0.86,
        })
        events = sm.get_events()
        self.assertEqual(len(events), 3)
        for event in events:
            self.assertIn("ts", event)
            self.assertIn("ev", event)
            self.assertIn("unit", event)


if __name__ == "__main__":
    unittest.main()
