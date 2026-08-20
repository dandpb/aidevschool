import importlib.util
import runpy
import subprocess
from pathlib import Path

import pytest


COURSE_DIR = Path(__file__).parent
VALIDATOR_PATH = COURSE_DIR / "validate_course.py"
EXPECTED_REAL_COURSE_OUTPUT = [
    "course validation: PASS",
    "anchors: 34",
    "local links: 45",
    "external resources: 0",
    "javascript required: no",
]


class FakeHtmlPath:
    def __init__(self, html):
        self.html = html
        self.parent = COURSE_DIR

    def is_file(self):
        return True

    def read_text(self, encoding):
        assert encoding == "utf-8"
        return self.html

    def __str__(self):
        return str(COURSE_DIR / "index.html")


def load_validator():
    spec = importlib.util.spec_from_file_location("validate_course", VALIDATOR_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_course_files(monkeypatch, tmp_path, html, css=True):
    validator = load_validator()
    html_path = tmp_path / "index.html"
    css_path = tmp_path / "styles.css"
    if html is not None:
        html_path.write_text(html, encoding="utf-8")
    if css:
        css_path.write_text("body {}", encoding="utf-8")
    monkeypatch.setattr(validator, "HTML_PATH", html_path)
    monkeypatch.setattr(validator, "CSS_PATH", css_path)
    return validator


def test_parser_collects_source_ordered_course_data():
    parser = load_validator().CourseParser()

    parser.feed(
        '<div id="one" data-workflow="cycle-01" data-skill="workflow-lab-build">'
        '<a href="local.html">course</a><a>missing</a><script src="app.js"></script>'
        '<img><link rel="stylesheet" href="styles.css"><link rel="alternate" href="feed">'
        "course text</div>"
    )

    assert parser.ids == {"one"}
    assert parser.links == ["local.html"]
    assert parser.external_resources == ["app.js", "styles.css"]
    assert parser.text_parts == ["course", "missing", "course text"]
    assert parser.workflows == ["cycle-01"]
    assert parser.skills == ["workflow-lab-build"]


def test_missing_html_and_css_are_reported_together(monkeypatch, tmp_path):
    validator = write_course_files(monkeypatch, tmp_path, None, css=False)

    with pytest.raises(SystemExit) as error:
        validator.main()

    assert str(error.value) == f"missing {validator.HTML_PATH}\nmissing {validator.CSS_PATH}"


def test_multi_error_order_is_preserved(monkeypatch):
    source = (COURSE_DIR / "index.html").read_text(encoding="utf-8")
    html = source.replace('id="fundamentos"', 'id="missing-fundamentos"', 1)
    html = html.replace('data-workflow="cycle-01"', 'data-workflow="incorrect"', 1)
    html = html.replace('data-skill="workflow-lab-build"', 'data-skill="incorrect"', 1)
    html = html.replace("workflow_lab/evidence/full-run-final/learning.ndjson", "missing-evidence", 1)
    html = html.replace("Fundamentos de LLMs", "", 1)
    html = html.replace(
        "</body>",
        '<a href="#missing-anchor">broken anchor</a><a href="missing-file">broken file</a>'
        '<a href="https://example.test">external</a><a href="mailto:course@example.test">mail</a>'
        '<img src="image.png"><script src="app.js"></script></body>',
        1,
    )
    validator = load_validator()
    monkeypatch.setattr(validator, "HTML_PATH", FakeHtmlPath(html))
    monkeypatch.setattr(validator, "CSS_PATH", COURSE_DIR / "styles.css")

    with pytest.raises(SystemExit) as error:
        validator.main()

    assert str(error.value) == "\n".join(
        [
            "missing anchors: fundamentos",
            "expected workflows ['cycle-01', 'cycle-02', 'cycle-03', 'cycle-04', 'cycle-05', "
            "'cycle-06', 'cycle-07', 'cycle-08', 'cycle-09', 'cycle-10'], found ['incorrect', "
            "'cycle-02', 'cycle-03', 'cycle-04', 'cycle-05', 'cycle-06', 'cycle-07', 'cycle-08', "
            "'cycle-09', 'cycle-10']",
            "expected skills ['workflow-lab-build', 'workflow-lab-verify', 'workflow-lab-maintain'], "
            "found ['incorrect', 'workflow-lab-verify', 'workflow-lab-maintain']",
            "missing evidence links: workflow_lab/evidence/full-run-final/learning.ndjson",
            "broken anchor: #fundamentos",
            "broken anchor: #fundamentos",
            "broken local link: missing-evidence",
            "broken anchor: #missing-anchor",
            "broken local link: missing-file",
            "external link not allowed in offline course: https://example.test",
            "unexpected external resources: ['styles.css', 'image.png', 'app.js']",
            "missing course text: Fundamentos de LLMs",
            "course must not require JavaScript",
        ]
    )


def test_real_course_main_prints_exact_five_lines(monkeypatch, capsys):
    validator = load_validator()
    monkeypatch.setattr(validator, "HTML_PATH", COURSE_DIR / "index.html")
    monkeypatch.setattr(validator, "CSS_PATH", COURSE_DIR / "styles.css")

    validator.main()

    assert capsys.readouterr().out.splitlines() == EXPECTED_REAL_COURSE_OUTPUT


def test_script_entrypoint_prints_exact_five_lines():
    result = subprocess.run(
        ["python3", str(VALIDATOR_PATH)], capture_output=True, check=False, text=True
    )

    assert result.returncode == 0
    assert result.stderr == ""
    assert result.stdout.splitlines() == EXPECTED_REAL_COURSE_OUTPUT


def test_main_module_path_prints_exact_five_lines(capsys):
    runpy.run_path(str(VALIDATOR_PATH), run_name="__main__")

    assert capsys.readouterr().out.splitlines() == EXPECTED_REAL_COURSE_OUTPUT
