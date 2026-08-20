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
    "passo-a-passo",
}


class CourseParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.external_resources = []
        self.text_parts = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.add(attributes["id"])
        if tag == "a" and "href" in attributes:
            self.links.append(attributes["href"])
        if tag in {"script", "img", "iframe", "video", "audio"} and "src" in attributes:
            self.external_resources.append(attributes["src"])
        if tag == "link" and attributes.get("rel") == "stylesheet":
            self.external_resources.append(attributes.get("href", ""))

    def handle_data(self, data):
        self.text_parts.append(data)


def main():
    errors = []
    if not HTML_PATH.is_file():
        errors.append(f"missing {HTML_PATH}")
    if not CSS_PATH.is_file():
        errors.append(f"missing {CSS_PATH}")
    if errors:
        raise SystemExit("\n".join(errors))

    html = HTML_PATH.read_text(encoding="utf-8")
    parser = CourseParser()
    parser.feed(html)

    missing_ids = REQUIRED_IDS - parser.ids
    if missing_ids:
        errors.append(f"missing anchors: {', '.join(sorted(missing_ids))}")

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

    if parser.external_resources != ["styles.css"]:
        errors.append(f"unexpected external resources: {parser.external_resources}")

    for required_text in (
        "Fundamentos de LLMs",
        "Prompt Engineering",
        "Context Engineering",
        "MCP, ACP e Skills",
        "Workflow permanente: exportar tarefas em CSV",
    ):
        if required_text not in parser.text_parts:
            errors.append(f"missing course text: {required_text}")

    if "<script" in html.lower():
        errors.append("course must not require JavaScript")

    if errors:
        raise SystemExit("\n".join(errors))

    print("course validation: PASS")
    print(f"anchors: {len(parser.ids)}")
    print(f"local links: {sum(not urlparse(link).scheme and not link.startswith('#') for link in parser.links)}")
    print("external resources: 0")
    print("javascript required: no")


if __name__ == "__main__":
    main()
