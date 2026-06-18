"""Tests for the centralised threshold seam and collapsed agent index.

The new module interface is `engines/minimaxDojo/config/learner.yaml`:
- Prompts and docs reference thresholds via `⟨config: path⟩`.
- `agents/<id>/README.md` is a thin index; the canonical system prompt lives in
  `prompts/per_agent/<name>.md`.
"""

import re
import unittest
from pathlib import Path

import yaml

ENGINE_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ENGINE_ROOT / "config" / "learner.yaml"
PROMPT_DIR = ENGINE_ROOT / "prompts" / "per_agent"
AGENTS_DIR = ENGINE_ROOT / "agents"
EMPIRICAL_GATES_PATH = ENGINE_ROOT / "docs" / "04_empirical_gates.md"

CONFIG_REF_RE = re.compile(r"⟨config:\s*([^⟩]+)⟩")
PROMPT_LINK_RE = re.compile(r"prompts/per_agent/([a-z_]+)\.md")

# Placeholders used in documentation examples, not real config paths.
CONFIG_REF_PLACEHOLDERS = {"path", "caminho", "..."}


def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        for doc in yaml.safe_load_all(f):
            if doc is not None:
                return doc
        raise ValueError("no YAML document found")


def resolve_path(data, dotted_path):
    current = data
    for part in dotted_path.split("."):
        current = current[part]
    return current


class TestConfigSeam(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_config()

    def test_config_loads_with_known_gates(self):
        self.assertIn("gates", self.config)
        self.assertEqual(self.config["gates"]["mutation_score_min"], 0.65)

    def _assert_config_references_resolve(self, text, label):
        for match in CONFIG_REF_RE.finditer(text):
            path = match.group(1).strip()
            if path in CONFIG_REF_PLACEHOLDERS:
                continue
            with self.subTest(source=label, ref=path):
                try:
                    resolve_path(self.config, path)
                except Exception as exc:  # pragma: no cover
                    self.fail(f"could not resolve ⟨config: {path}⟩: {exc}")

    def test_per_agent_prompts_only_use_valid_config_refs(self):
        for prompt_path in sorted(PROMPT_DIR.glob("*.md")):
            text = prompt_path.read_text(encoding="utf-8")
            self._assert_config_references_resolve(text, prompt_path.name)

    def test_empirical_gates_doc_only_uses_valid_config_refs(self):
        text = EMPIRICAL_GATES_PATH.read_text(encoding="utf-8")
        self._assert_config_references_resolve(text, EMPIRICAL_GATES_PATH.name)

    def test_agent_directories_are_thin_indexes(self):
        """The collapse removes agent.md and PERSONA.md, leaving only README.md."""
        for agent_dir in sorted(AGENTS_DIR.iterdir()):
            if not agent_dir.is_dir():
                continue
            files = {f.name for f in agent_dir.iterdir() if f.is_file()}
            with self.subTest(dir=agent_dir.name):
                self.assertIn("README.md", files)
                self.assertNotIn(
                    "agent.md",
                    files,
                    "agent.md must be collapsed into prompts/per_agent/<name>.md",
                )
                self.assertNotIn(
                    "PERSONA.md",
                    files,
                    "PERSONA.md must be collapsed into prompts/per_agent/<name>.md",
                )

    def test_readme_points_to_canonical_prompt(self):
        """Each thin README links to the matching per_agent system prompt."""
        for agent_dir in sorted(AGENTS_DIR.iterdir()):
            if not agent_dir.is_dir():
                continue
            readme = agent_dir / "README.md"
            text = readme.read_text(encoding="utf-8")
            match = PROMPT_LINK_RE.search(text)
            with self.subTest(dir=agent_dir.name):
                self.assertIsNotNone(
                    match,
                    "README must link to the canonical prompt in prompts/per_agent/",
                )
                prompt_file = PROMPT_DIR / f"{match.group(1)}.md"
                self.assertTrue(
                    prompt_file.exists(),
                    f"canonical prompt not found: {prompt_file}",
                )


if __name__ == "__main__":
    unittest.main()
