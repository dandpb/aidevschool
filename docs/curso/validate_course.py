from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).parent
HTML_PATH = ROOT / "index.html"
CSS_PATH = ROOT / "styles.css"
REQUIRED_IDS = {
    "fundamentos",
    "harness",
    "prompt",
    "contexto",
    "specs",
    "execucao",
    "agentes",
    "mcp",
    "loop",
    "workflow",
    "workflows",
    "resultados-workflow",
    "skills-workflow",
    "passo-a-passo",
}
REQUIRED_LINKS = {
    "workflow_lab/evidence/full-run-final/learning.ndjson",
    "workflow_lab/evidence/full-run-final/report.md",
    "workflow_lab/VALIDACAO.md",
    "../../.agents/skills/workflow-lab-build/SKILL.md",
    "../../.agents/skills/workflow-lab-verify/SKILL.md",
    "../../.agents/skills/workflow-lab-maintain/SKILL.md",
}


class CourseParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.external_resources = []
        self.text_parts = []
        self.workflows = []
        self.skills = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        collectors = {
            "id": self.ids.add,
            "data-workflow": self.workflows.append,
            "data-skill": self.skills.append,
        }
        for name, collect in collectors.items():
            if name in attributes:
                collect(attributes[name])
        if tag == "a" and "href" in attributes:
            self.links.append(attributes["href"])
        self.collect_resource(tag, attributes)

    def collect_resource(self, tag, attributes):
        if tag in {"script", "img", "iframe", "video", "audio"} and "src" in attributes:
            self.external_resources.append(attributes["src"])
        if tag == "link" and attributes.get("rel") == "stylesheet":
            self.external_resources.append(attributes.get("href", ""))

    def handle_data(self, data):
        self.text_parts.append(data)


def check_files(errors):
    if not HTML_PATH.is_file():
        errors.append(f"missing {HTML_PATH}")
    if not CSS_PATH.is_file():
        errors.append(f"missing {CSS_PATH}")
    if not errors:
        return HTML_PATH.read_text(encoding="utf-8")
    return None


def check_structure(parser, errors):
    missing_ids = REQUIRED_IDS - parser.ids
    if missing_ids:
        errors.append(f"missing anchors: {', '.join(sorted(missing_ids))}")

    expected_workflows = [f"cycle-{index:02}" for index in range(1, 11)]
    if parser.workflows != expected_workflows:
        errors.append(f"expected workflows {expected_workflows}, found {parser.workflows}")

    expected_skills = ["workflow-lab-build", "workflow-lab-verify", "workflow-lab-maintain"]
    if parser.skills != expected_skills:
        errors.append(f"expected skills {expected_skills}, found {parser.skills}")

    expected_artifacts = {
        f"workflow_lab/evidence/full-run-final/artifacts/cycle-{index:02}.json"
        for index in range(1, 11)
    }
    missing_links = (REQUIRED_LINKS | expected_artifacts) - set(parser.links)
    if missing_links:
        errors.append(f"missing evidence links: {', '.join(sorted(missing_links))}")


def check_links(parser, errors):
    for href in parser.links:
        parsed = urlparse(href)
        if href.startswith("#") and href[1:] not in parser.ids:
            errors.append(f"broken anchor: {href}")
        elif not parsed.scheme and not href.startswith("#"):
            target = (HTML_PATH.parent / href).resolve()
            if not target.is_file():
                errors.append(f"broken local link: {href}")
        elif parsed.scheme in {"http", "https"}:
            errors.append(f"external link not allowed in offline course: {href}")


def check_content(html, parser, errors):
    if parser.external_resources != ["styles.css"]:
        errors.append(f"unexpected external resources: {parser.external_resources}")

    for required_text in (
        "Fundamentos de LLMs",
        "Claude Code",
        "OpenAI Codex",
        "OpenCode",
        "Prompt Engineering",
        "Context Engineering",
        "MCP, ACP e Skills",
        "Agent Client Protocol",
        "Agent Control Protocol",
        "Workflow permanente: exportar tarefas em CSV",
        "10 workflows reais que deixam a próxima feature melhor",
        "Exercício · falhar, corrigir, provar",
        "Resultados observados",
        "61 testes",
        "12 arquivos duráveis",
        "6 conclusões que atravessam os ciclos",
        "Por que importa",
        "Resultado observado",
        "Skill pack permanente",
        "workflow-lab-build",
        "workflow-lab-verify",
        "workflow-lab-maintain",
        "Deslize para ver todos →",
    ):
        if required_text not in parser.text_parts:
            errors.append(f"missing course text: {required_text}")

    if "<script" in html.lower():
        errors.append("course must not require JavaScript")


def main():
    errors = []
    html = check_files(errors)
    if html is None:
        raise SystemExit("\n".join(errors))

    parser = CourseParser()
    parser.feed(html)
    check_structure(parser, errors)
    check_links(parser, errors)
    check_content(html, parser, errors)

    if errors:
        raise SystemExit("\n".join(errors))

    print("course validation: PASS")
    print(f"anchors: {len(parser.ids)}")
    print(f"local links: {sum(not urlparse(link).scheme and not link.startswith('#') for link in parser.links)}")
    print("external resources: 0")
    print("javascript required: no")


if __name__ == "__main__":
    main()
