"""Deterministic state machine for Ágora Continuum learning units.

Reference: engines/minimaxDojo/docs/02_state_machine.md
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from ..config import max_retries as _config_max_retries


class DeterminismError(Exception):
    """Raised when an invalid state transition is attempted."""


STATES = frozenset({
    "APRESENTANDO", "PRATICANDO", "AVALIANDO", "DOMINADO", "FALHA_BLOQUEIO",
})

SUB_STATES = frozenset({"PRODUCING", "VERIFYING", "DONE"})

# Sourced from the config seam (retries.max_por_unidade in learner.yaml); falls
# back to 3 when the config file or PyYAML is unavailable (D8).
MAX_RETRIES = _config_max_retries()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class UnitStateMachine:
    unit_id: str
    state: str = "APRESENTANDO"
    sub_state: str | None = None
    retries: int = 0
    max_retries: int = MAX_RETRIES
    _events: list[dict[str, Any]] = field(default_factory=list)

    def transition(self, event: str, payload: dict[str, Any] | None = None) -> str:
        # DOMINADO is terminal
        if self.state == "DOMINADO":
            raise DeterminismError(
                f"DOMINADO is terminal; cannot process event '{event}'"
            )

        # Handle prometor.FAIL in AVALIANDO
        if event == "prometor.FAIL" and self.state == "AVALIANDO":
            self.retries += 1
            self._log(event, payload, "APRESENTANDO" if self.retries < self.max_retries else "FALHA_BLOQUEIO")
            if self.retries >= self.max_retries:
                self.state = "FALHA_BLOQUEIO"
                self.sub_state = None
            else:
                self.state = "APRESENTANDO"
                self.sub_state = "PRODUCING"
            return self.state

        # Handle prometor.PASS in AVALIANDO → DOMINADO + sub_state=DONE
        if event == "prometor.PASS":
            if self.state != "AVALIANDO":
                raise DeterminismError(
                    f"prometor.PASS requires AVALIANDO state, got {self.state}"
                )
            self.sub_state = "DONE"
            self._log(event, payload, "DOMINADO")
            self.state = "DOMINADO"
            return "DOMINADO"

        # Handle seneca.PASS from FALHA_BLOQUEIO
        if event == "seneca.PASS" and self.state == "FALHA_BLOQUEIO":
            self._log(event, payload, "APRESENTANDO")
            self.state = "APRESENTANDO"
            self.retries = 0
            self.sub_state = None
            return "APRESENTANDO"

        # Handle critico.OK — ONLY valid when sub_state=DONE (meaning prometor.PASS already happened)
        if event == "critico.OK":
            if self.state != "AVALIANDO":
                raise DeterminismError(
                    f"critico.OK requires AVALIANDO state, got {self.state}"
                )
            if self.sub_state != "DONE":
                raise DeterminismError(
                    f"critico.OK requires sub_state=DONE (prometor.PASS must come first), got {self.sub_state}"
                )
            # Already DOMINADO via prometor.PASS; this is just the critic's confirmation
            self._log(event, payload, self.state)
            return self.state

        # Handle mestre.done — advances sub-machine from PRODUCING to VERIFYING
        if event == "mestre.done":
            if self.state != "AVALIANDO":
                raise DeterminismError(
                    f"mestre.done requires AVALIANDO state, got {self.state}"
                )
            self.sub_state = "VERIFYING"
            self._log(event, payload, self.state)
            return self.state

        # Standard transition lookup
        transitions = {
            ("APRESENTANDO", "aluno.aceita"): "PRATICANDO",
            ("APRESENTANDO", "aluno.recusa"): "APRESENTANDO",
            ("PRATICANDO", "aluno.submete"): "AVALIANDO",
            ("PRATICANDO", "timeout"): "AVALIANDO",
        }

        key = (self.state, event)
        if key not in transitions:
            raise DeterminismError(
                f"invalid transition ({self.state}, {event})"
            )

        new_state = transitions[key]

        # Enter AVALIANDO: initialize sub-machine to PRODUCING
        if new_state == "AVALIANDO" and self.state != "AVALIANDO":
            self.sub_state = "PRODUCING"

        self._log(event, payload, new_state)
        self.state = new_state
        return new_state

    def _log(self, event: str, payload: dict[str, Any] | None, new_state: str) -> None:
        self._events.append({
            "ts": _now_iso(),
            "unit": self.unit_id,
            "ev": event,
            "from": self.state,
            "to": new_state,
            "payload": payload or {},
        })

    def get_events(self) -> list[dict[str, Any]]:
        return list(self._events)
