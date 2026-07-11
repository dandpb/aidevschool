from __future__ import annotations

import unittest
from pathlib import Path

import yaml


ENGINE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ENGINE_ROOT.parents[1]
PROMPT_DIR = ENGINE_ROOT / "prompts" / "per_agent"
ROSTER_CONTRACT = ENGINE_ROOT / "config" / "agent_roster_contract.yaml"
MME_AGENT_DIR = (
    REPO_ROOT / "engines" / "miniMaxEvolutionEngine" / ".claude" / "agents"
)


class TestAgentRosterDrift(unittest.TestCase):
    def test_mme_roster_matches_canonical_agents_plus_platform_extensions(self) -> None:
        canonical_agents = {path.stem for path in PROMPT_DIR.glob("*.md")}
        runnable_agents = {path.stem for path in MME_AGENT_DIR.glob("*.md")}
        contract = yaml.safe_load(ROSTER_CONTRACT.read_text(encoding="utf-8"))
        canonical_agent_aliases = contract["canonical_agent_aliases"]
        platform_only_agents = contract["platform_only_agents"]
        expected_canonical_agents = {
            canonical_agent_aliases.get(agent, agent) for agent in canonical_agents
        }

        self.assertEqual(
            set(canonical_agent_aliases) - canonical_agents,
            set(),
            "canonical_agent_aliases contains unknown minimaxDojo tutors",
        )
        self.assertEqual(
            platform_only_agents,
            sorted(set(platform_only_agents)),
            "platform_only_agents must be unique and sorted for reviewable drift",
        )
        self.assertEqual(
            canonical_agents & set(platform_only_agents),
            set(),
            "canonical tutors must not be relabelled as platform-only agents",
        )
        self.assertEqual(
            expected_canonical_agents - runnable_agents,
            set(),
            "MME is missing canonical minimaxDojo tutors",
        )
        self.assertEqual(
            runnable_agents
            - expected_canonical_agents
            - set(platform_only_agents),
            set(),
            "MME has undocumented platform-only agents; update the reviewed contract",
        )
        self.assertEqual(
            set(platform_only_agents) - runnable_agents,
            set(),
            "the contract lists platform-only agents that are no longer runnable",
        )


if __name__ == "__main__":
    unittest.main()
