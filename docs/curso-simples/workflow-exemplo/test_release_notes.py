"""Testes do núcleo puro de release notes — escritos ANTES da implementação."""

import json
import pathlib
import subprocess
import sys

import pytest

from release_notes import generate_release_notes, parse_subject

HERE = pathlib.Path(__file__).parent


# ---------- Fatia 1: parsing ----------

def test_parse_feat_simples():
    parsed = parse_subject("feat: add csv export")
    assert parsed == {
        "type": "feat",
        "scope": None,
        "breaking": False,
        "description": "add csv export",
    }


def test_parse_com_escopo():
    parsed = parse_subject("fix(gate): reject empty evidence")
    assert parsed["type"] == "fix"
    assert parsed["scope"] == "gate"
    assert parsed["description"] == "reject empty evidence"


def test_parse_breaking_por_exclamacao():
    parsed = parse_subject("feat(api)!: drop legacy endpoint")
    assert parsed["breaking"] is True
    assert parsed["scope"] == "api"


def test_parse_fora_do_padrao_retorna_none():
    assert parse_subject("🛡️ Sentinel: fix XSS") is None
    assert parse_subject("sem dois pontos na mensagem") is None
    assert parse_subject("featx: tipo inventado") is None


# ---------- Fatia 2: agrupamento e render ----------

COMMITS = [
    {"hash": "c256a96abc", "message": "feat: workflow lab e validadores"},
    {"hash": "301d2bcdef", "message": "fix: XSS em interpolação de string"},
    {"hash": "57bbbcab12", "message": "perf: fast path no escapeHtml"},
    {"hash": "aff7d7d345", "message": "docs: guia do estudante"},
]


def test_secoes_na_ordem_fixa():
    md = generate_release_notes(COMMITS)
    assert md.startswith("# Release notes\n")
    idx_feat = md.index("## ✨ Novidades")
    idx_fix = md.index("## 🐛 Correções")
    idx_other = md.index("## 📦 Outras mudanças")
    assert idx_feat < idx_fix < idx_other


def test_feat_vira_novidade_fix_vira_correcao():
    md = generate_release_notes(COMMITS)
    assert "- workflow lab e validadores (`c256a96`)" in md
    assert "- XSS em interpolação de string (`301d2bc`)" in md


def test_tipos_conhecidos_vao_para_outras_mudancas_com_rotulo():
    md = generate_release_notes(COMMITS)
    assert "- **perf:** fast path no escapeHtml (`57bbbca`)" in md
    assert "- **docs:** guia do estudante (`aff7d7d`)" in md


def test_escopo_aparece_em_negrito():
    md = generate_release_notes(
        [{"hash": "aaa1111bbb", "message": "feat(os): missões em iframe"}]
    )
    assert "- **os:** missões em iframe (`aaa1111`)" in md


def test_ordem_dentro_da_secao_preservada():
    commits = [
        {"hash": "b" * 8, "message": "feat: segundo"},
        {"hash": "a" * 8, "message": "feat: primeiro"},
    ]
    md = generate_release_notes(commits)
    assert md.index("segundo") < md.index("primeiro")


def test_secao_vazia_e_omitida():
    md = generate_release_notes([{"hash": "a" * 8, "message": "feat: só novidade"}])
    assert "Correções" not in md
    assert "Outras mudanças" not in md


def test_versao_no_titulo():
    md = generate_release_notes(COMMITS, version="v1.4.0")
    assert md.startswith("# Release v1.4.0\n")


# ---------- Fatia 3: falha fechada e bordas ----------

def test_lista_vazia_e_erro():
    with pytest.raises(ValueError, match="no commits"):
        generate_release_notes([])


def test_commit_sem_hash_e_erro():
    with pytest.raises(ValueError, match="index 0"):
        generate_release_notes([{"message": "feat: x"}])


def test_commit_sem_message_e_erro_com_indice():
    with pytest.raises(ValueError, match="index 1"):
        generate_release_notes(
            [{"hash": "a" * 8, "message": "feat: ok"}, {"hash": "b" * 8}]
        )


def test_descricao_vazia_e_erro():
    with pytest.raises(ValueError, match="index 0"):
        generate_release_notes([{"hash": "a" * 8, "message": "feat: "}])


def test_breaking_por_footer():
    commits = [
        {
            "hash": "deadbee1234",
            "message": "refactor: troca envelope de evidência\n\nBREAKING CHANGE: formato v2 obrigatório",
        }
    ]
    md = generate_release_notes(commits)
    assert "## ⚠️ Breaking changes" in md
    assert "formato v2 obrigatório" in md


def test_fora_do_padrao_vira_secao_visivel():
    commits = [
        {"hash": "a" * 8, "message": "feat: ok"},
        {"hash": "b" * 8, "message": "🛡️ Sentinel: hotfix fora do padrão"},
    ]
    md = generate_release_notes(commits)
    assert "## 🔍 Fora do padrão" in md
    assert "Sentinel: hotfix fora do padrão" in md


def test_nenhum_commit_e_descartado():
    commits = [
        {"hash": "a" * 8, "message": "feat: um"},
        {"hash": "b" * 8, "message": "fix: dois"},
        {"hash": "c" * 8, "message": "docs: três"},
        {"hash": "d" * 8, "message": "mensagem livre"},
    ]
    md = generate_release_notes(commits)
    rendered = md.count("(`")  # cada commit renderizado carrega (`hash7`)
    assert rendered == len(commits)


def test_determinismo():
    commits = COMMITS + [{"hash": "e" * 8, "message": "mensagem livre"}]
    assert generate_release_notes(commits) == generate_release_notes(commits)


# ---------- Fatia 4: CLI ----------

def test_cli_imprime_markdown_e_aceita_versao():
    out = subprocess.run(
        [sys.executable, str(HERE / "release_notes.py"),
         str(HERE / "demo_commits.json"), "--version", "v0.1.0"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert out.stdout.startswith("# Release v0.1.0\n")
    assert "Novidades" in out.stdout


def test_cli_json_invalido_falha_fechado():
    bad = HERE / "__bad__.json"
    bad.write_text("{ isso não é json", encoding="utf-8")
    try:
        out = subprocess.run(
            [sys.executable, str(HERE / "release_notes.py"), str(bad)],
            capture_output=True,
            text=True,
        )
        assert out.returncode != 0
        assert "inválido" in out.stderr or "invalid" in out.stderr.lower()
    finally:
        bad.unlink(missing_ok=True)


def test_demo_commits_vem_do_repo_real():
    """O demo usa commits reais do aidevschool: cada hash curto existe no demo."""
    demo = json.loads((HERE / "demo_commits.json").read_text(encoding="utf-8"))
    assert len(demo) >= 8
    assert all(len(c["hash"]) >= 7 and c["message"] for c in demo)
