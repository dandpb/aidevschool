#!/usr/bin/env python3
"""receipt_canon_check.py — validador/gerador OFFLINE de rascunhos de recibos
canônicos (Provenance/Countersign) — AID-3585.

Motivação: erros repetidos de formatação de Provenance/Countersign (campo
ausente, placeholder `_default`, agent ID colado no lugar de session, head
ausente/stale/divergente, produtor=revisor, prosa no fim da linha canônica).
Este helper é pequeno, puro e offline: valida a FORMA do rascunho antes da
postagem e emite texto RASCUNHO canônico a partir de fatos fornecidos
explicitamente. Ele reutiliza CITATION_RE/PROVENANCE_RE/strip_code_fences de
scripts/countersign_gate_check.py (contratos existentes) e NÃO altera o gate,
suas regras, permissões, CI ou a merge door.

FRONTEIRA (o que este tool NÃO faz): não usa API/credencial/rede, não posta no
GitHub, não reexecuta checks, não autoriza operação. Sucesso aqui significa
apenas "formato canônico válido (rascunho)" — jamais 'review válida',
'countersign válido' ou 'merge autorizado'. Limites offline explícitos:
resolvabilidade do AID citado, atualidade real do head e identidades reais
NÃO são verificáveis aqui.

Uso:
  receipt_canon_check.py --render --facts FACTS.json
  receipt_canon_check.py --check   --facts FACTS.json --draft DRAFT.txt
  receipt_canon_check.py --check   --facts FACTS.json --draft-stdin < DRAFT.txt

FATOS (JSON; tudo explícito, nada é adivinhado/defaultado):
  {
    "expected_head": "<40-hex completo que o recibo deve pinar>",
    "producer": {"agent": "<slug>", "task": "AID-1234", "run": "...", "session": "..."},
    "reviewer": {"agent": "<slug>", "task": "AID-5678", "run": "...", "session": "..."},
    "citation": {"task": "AID-5678", "verdict_ref": "<ref>"},
    "captured_actor_ids": ["<uuid de agent capturado>", ...]
  }

Saída: linhas canônicas completas e isoladas (uma por linha, sem prosa);
explicações/relatório em linhas separadas. Exit: 0 forma do rascunho OK,
1 rascunho rejeitado, 2 erro de uso.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import uuid as uuidmod
from pathlib import Path

# ---------------------------------------------------------------------------
# Reuso dos contratos do gate (AID-2768): mesmas regexes, mesma semântica de
# fence. Nenhuma cópia/divergência é permitida aqui — importa do módulo irmão.
# ---------------------------------------------------------------------------
_GATE_PATH = Path(__file__).with_name("countersign_gate_check.py")
_spec = importlib.util.spec_from_file_location("countersign_gate_check", _GATE_PATH)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

CITATION_RE = gate.CITATION_RE
PROVENANCE_RE = gate.PROVENANCE_RE
SHA40_RE = gate.SHA40_RE
FENCE_LINE_RE = gate._FENCE_LINE_RE
strip_code_fences = gate.strip_code_fences

# Placeholders conhecidos (AID-3585: rejeitar placeholder, incluindo `_default`
# — valor de fingerprint/origin seen em payloads reais). Comparação
# case-insensitive; qualquer valor embrulhado em <...> também é template.
KNOWN_PLACEHOLDERS = {
    "_default", "default", "tbd", "todo", "fixme", "xxx", "xxxx", "xxxxx",
    "placeholder", "unknown", "n/a", "none", "null", "?", "??", "...", "-",
    "changeme", "change-me", "your-agent", "your-run", "your-session",
    "seu-agent", "sua-session", "agent", "run", "session", "task", "verdict",
}
TEMPLATE_VALUE_RE = re.compile(r"^<[^>]*>$")

TASK_RE = re.compile(r"^(AID|GH)-[1-9][0-9]*$")
AGENT_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._-]*$")
# Classes de token idênticas às do gate (run: {3,}; session: qualquer len>=1).
RUN_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._:-]{3,}$")
SESSION_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._:-]*$")
VERDICT_REF_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]*$")
HEAD40_RE = re.compile(r"^[0-9a-fA-F]{40}$")

PRODUCER_FIELDS = ("agent", "task", "run", "session")
REVIEWER_FIELDS = ("agent", "task", "run", "session")

DISCLAIMER = (
    "RASCUNHO (forma apenas) — não é countersign, não é review, não autoriza "
    "merge nem qualquer operação; validação offline não verifica "
    "resolvabilidade do AID citado, atualidade real do head nem identidades "
    "reais (AID-3585)."
)


class Problems(list):
    """Lista de achados (severity, code, message)."""

    def add(self, severity, code, message):
        self.append((severity, code, message))

    @property
    def rejects(self):
        return [p for p in self if p[0] == "REJECT"]

    @property
    def warns(self):
        return [p for p in self if p[0] == "WARN"]


def is_placeholder(value):
    v = (value or "").strip()
    return v.lower() in KNOWN_PLACEHOLDERS or bool(TEMPLATE_VALUE_RE.match(v))


def is_uuid(value):
    try:
        uuidmod.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _norm(value):
    return (value or "").strip().lower()


# ---------------------------------------------------------------------------
# 1. Checagem dos FATOS (explícitos; nada é adivinhado ou defaultado).
# ---------------------------------------------------------------------------

def check_facts(facts):
    p = Problems()
    if not isinstance(facts, dict):
        p.add("REJECT", "F0001",
              "fatos não são um objeto JSON (tipo %s)" % type(facts).__name__)
        return p, {}

    def need(container, key, label):
        val = (container or {}).get(key) if isinstance(container, dict) else None
        if val is None or not str(val).strip():
            p.add("REJECT", "F0002",
                  "campo ausente: %s (o tool nunca adivinha/defaulta valores)" % label)
            return None
        return str(val).strip()

    head = need(facts, "expected_head", "expected_head")
    if head is not None and not HEAD40_RE.match(head):
        p.add("REJECT", "F0003",
              "expected_head não é um 40-hex completo (got %r)" % head[:50])

    producer = facts.get("producer")
    reviewer = facts.get("reviewer")
    citation = facts.get("citation")
    actor_ids = facts.get("captured_actor_ids") or []
    if not isinstance(actor_ids, list):
        p.add("REJECT", "F0004", "captured_actor_ids deve ser uma lista")
        actor_ids = []
    actor_norm = {_norm(a) for a in actor_ids if isinstance(a, str) and a.strip()}

    parsed = {"producer": {}, "reviewer": {}, "citation": {}, "head": head}
    for role, container in (("producer", producer), ("reviewer", reviewer)):
        if not isinstance(container, dict):
            p.add("REJECT", "F0002", "campo ausente: bloco %s" % role)
            continue
        for field in (PRODUCER_FIELDS if role == "producer" else REVIEWER_FIELDS):
            val = need(container, field, "%s.%s" % (role, field))
            if val is None:
                continue
            parsed[role][field] = val
            if is_placeholder(val):
                p.add("REJECT", "F0005",
                      "%s.%s é placeholder conhecido (%r)" % (role, field, val))
        # Formas de token — mesmas classes do gate (round-trip garantido).
        shape = {"agent": AGENT_RE, "task": TASK_RE, "run": RUN_RE,
                 "session": SESSION_RE}
        for field, rx in shape.items():
            val = parsed[role].get(field)
            if val is not None and not rx.match(val):
                p.add("REJECT", "F0006",
                      "%s.%s fora da classe canônica (got %r)" % (role, field, val))
        # Agent ID usado como session (troca actor/session): comparar com os
        # actor IDs capturados. UUID em session NÃO é inválido por si — só se
        # for um dos actor IDs (formatos legados legítimos são preservados).
        sess = parsed[role].get("session")
        if sess is not None:
            if _norm(sess) in actor_norm:
                p.add("REJECT", "F0007",
                      "%s.session é um agent ID capturado (actor/session "
                      "trocados: %r)" % (role, sess))
            elif is_uuid(sess):
                p.add("OK", "F0008",
                      "%s.session é UUID fora dos actor IDs capturados — "
                      "formato legítimo, preservado (AID-3585)" % role)

    cite_task = need(citation, "task", "citation.task")
    cite_ref = need(citation, "verdict_ref", "citation.verdict_ref")
    if cite_task is not None:
        parsed["citation"]["task"] = cite_task
        if not TASK_RE.match(cite_task):
            p.add("REJECT", "F0006",
                  "citation.task fora da classe canônica (got %r)" % cite_task)
    if cite_ref is not None:
        parsed["citation"]["verdict_ref"] = cite_ref
        if not VERDICT_REF_RE.match(cite_ref):
            p.add("REJECT", "F0006",
                  "citation.verdict_ref fora da classe canônica (got %r)" % cite_ref)
        if is_placeholder(cite_ref):
            p.add("REJECT", "F0005",
                  "citation.verdict_ref é placeholder conhecido (%r)" % cite_ref)

    # Revisor distinto do produtor e alinhamento da citação com o revisor.
    p_agent = parsed["producer"].get("agent")
    r_agent = parsed["reviewer"].get("agent")
    if p_agent and r_agent and _norm(p_agent) == _norm(r_agent):
        p.add("REJECT", "F0009",
              "produtor=revisor (%r): independência é por agent, não por run "
              "(AID-2763)" % r_agent)
    r_task = parsed["reviewer"].get("task")
    if cite_task and r_task and _norm(cite_task) != _norm(r_task):
        p.add("REJECT", "F0010",
              "citation.task (%s) difere de reviewer.task (%s) — alinhamento "
              "canônico violado" % (cite_task, r_task))
    return p, parsed


# ---------------------------------------------------------------------------
# 2. Render do rascunho canônico a partir dos fatos.
# ---------------------------------------------------------------------------

def render_draft(parsed):
    head = parsed["head"]
    pr, rv, ct = parsed["producer"], parsed["reviewer"], parsed["citation"]
    lines = [
        "# RASCUNHO canônico (AID-3585) — texto de recibo, NÃO publicar como está:",
        "",
        "Provenance: agent=%(agent)s task=%(task)s run=%(run)s session=%(session)s"
        % pr,
        "Countersign: %(task)s verdict %(verdict_ref)s head=%(head)s"
        % dict(ct, head=head),
        "Provenance: agent=%(agent)s task=%(task)s run=%(run)s session=%(session)s"
        % rv,
        "",
        "# Instruções (linhas separadas das canônicas):",
        "# - linha 1 (Provenance do produtor) vai no corpo/comentário de registro",
        "#   do produtor, ANTES da revisão;",
        "# - linha 2 (Countersign) + linha 3 (Provenance do revisor) vão no MESMO",
        "#   comentário do revisor distinto, pré-merge;",
        "# - poste como comentário de PR (linhas fora de code fence), sem prosa",
        "#   no fim das linhas canônicas.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 3. Checagem do RASCUNHO (texto) contra os fatos.
# ---------------------------------------------------------------------------

def fenced_line_indices(text):
    """Índices das linhas dentro de code fences (mesma máquina do gate)."""
    inside = set()
    fence_char = None
    for i, line in enumerate(text.split("\n")):
        m = FENCE_LINE_RE.match(line)
        if fence_char is None:
            if m:
                fence_char = m.group(1)[0]
        elif m and m.group(1)[0] == fence_char and not m.group(2).strip():
            fence_char = None
        else:
            inside.add(i)
    return inside


def _diag_provenance(line):
    """Diagnóstico amigável de uma linha 'Provenance:' que falhou a regex."""
    problems = []
    body = line[len("Provenance:"):].strip()
    tokens = body.split()
    seen = {}
    extras = []
    for tok in tokens:
        key, sep, val = tok.partition("=")
        if sep and key in PRODUCER_FIELDS and key not in seen:
            seen[key] = val
        else:
            extras.append(tok)
    for field in PRODUCER_FIELDS:
        if field not in seen:
            problems.append("campo ausente: %s=" % field)
    if extras:
        problems.append("prosa/tokens extras ao fim da linha (%s)"
                        % " ".join(extras[:3]))
    for field, rx in (("agent", AGENT_RE), ("task", TASK_RE), ("run", RUN_RE),
                      ("session", SESSION_RE)):
        if field in seen and seen[field] and not rx.match(seen[field]):
            problems.append("%s=%r fora da classe canônica" % (field, seen[field]))
    return problems or ["linha não casa a gramática canônica (AID-2493)"], seen


def _diag_citation(line):
    problems = []
    body = line[len("Countersign:"):].strip()
    tokens = body.split()
    m = re.match(r"^((?:AID|GH)-[1-9][0-9]*)$", tokens[0]) if tokens else None
    if not tokens:
        problems.append("citação vazia")
        return problems, {}
    fields = {}
    rest = tokens[1:]
    idx = 0
    if m:
        fields["task"] = tokens[0]
    else:
        problems.append("primeiro token %r não é (AID|GH)-<n>" % tokens[0])
    if idx < len(rest) and rest[idx] == "verdict":
        idx += 1
        if idx < len(rest) and "=" not in rest[idx]:
            fields["verdict_ref"] = rest[idx]
            idx += 1
        else:
            problems.append("verdict sem <ref>")
    else:
        problems.append("palavra-chave 'verdict' ausente")
    if idx < len(rest) and rest[idx].startswith("head="):
        fields["head"] = rest[idx][len("head="):]
        idx += 1
    extras = rest[idx:]
    if extras:
        problems.append("prosa/tokens extras ao fim da linha (%s)"
                        % " ".join(extras[:3]))
    if "head" in fields and not HEAD40_RE.match(fields["head"]):
        problems.append("head=%r não é 40-hex completo" % fields["head"])
    return problems, fields


# Linha "parece canônica" mas com typo no prefixo (ex.: 'Countersign :').
LOOKALIKE_RE = re.compile(r"^(Provenance|Countersign)\s*:")


def check_draft(text, facts):
    p = Problems()  # achados de escopo rascunho (fatos são reportados à parte)
    if not isinstance(facts, dict):  # F0001 já reportado no escopo fatos
        facts = {}
    _, parsed = check_facts(facts)
    expected_head = parsed.get("head") or ""
    actor_norm = {_norm(a) for a in (facts.get("captured_actor_ids") or [])
                  if isinstance(a, str)}
    fences = fenced_line_indices(text or "")
    lines = (text or "").split("\n")

    prov_lines, cite_lines = [], []
    for i, raw in enumerate(lines):
        stripped = raw.rstrip("\r")
        s = stripped.strip()
        in_fence = i in fences
        if s.startswith("Provenance:") or s.startswith("Countersign:"):
            kind = "Provenance" if s.startswith("Provenance:") else "Countersign"
            if in_fence:
                p.add("WARN", "D0001",
                      "linha %d (%s) dentro de code fence — documentação, "
                      "não operativa (AID-2824)" % (i + 1, kind))
                continue
            rx = PROVENANCE_RE if kind == "Provenance" else CITATION_RE
            if rx.match(stripped):
                if kind == "Provenance":
                    prov_lines.append((i + 1, PROVENANCE_RE.match(stripped)))
                else:
                    cite_lines.append((i + 1, CITATION_RE.match(stripped)))
            else:
                diag, _ = (_diag_provenance(stripped) if kind == "Provenance"
                           else _diag_citation(stripped))
                for d in diag:
                    p.add("REJECT", "D0002",
                          "linha %d inválida (%s): %s" % (i + 1, kind, d))
        elif not in_fence and LOOKALIKE_RE.match(s) and not s.startswith(
                ("Provenance:", "Countersign:")):
            p.add("REJECT", "D0015",
                  "linha %d: prefixo canônico com typo/espaço antes de ':' "
                  "(gate casa apenas 'Provenance:'/'Countersign:' exatos)"
                  % (i + 1))
        # Nota: linha canônica INDENTADA cai no primeiro branch acima e falha
        # a regex (âncora line-start do gate) → REJECT D0002; prosa indentada
        # comum não é sinal de erro e não gera achado.

    if not cite_lines and not prov_lines:
        p.add("REJECT", "D0004",
              "nenhuma linha canônica Provenance/Countersign fora de fence no "
              "rascunho")

    # Head pin: contrato é a nível de comentário (head= OU token 40-hex nu em
    # qualquer linha fora de fence — gate §3, AID-2768).
    stripped_text = strip_code_fences(text or "")
    pinned = [m.group(0).lower() for m in SHA40_RE.finditer(stripped_text)]
    for ln, m in cite_lines:
        head_tok = m.group(3)
        if head_tok:
            if expected_head and head_tok.lower() != expected_head.lower():
                p.add("REJECT", "D0005",
                      "linha %d pin head divergente/stale (%s != esperado %s)"
                      % (ln, head_tok, expected_head))
            else:
                p.add("OK", "D0006", "linha %d pin head= confere com o esperado" % ln)
        elif expected_head and expected_head.lower() in pinned:
            p.add("OK", "D0007",
                  "linha %d sem head=, mas o 40-hex esperado aparece no "
                  "comentário (contrato gate §3)" % ln)
        else:
            p.add("REJECT", "D0008",
                  "linha %d sem head= e sem 40-hex esperado no comentário — "
                  "head ausente" % ln)

    # Classificação produtor/revisor por identidade EXPLÍCITA dos fatos
    # (nunca inferir autoria pelo formato).
    trailers = []
    for ln, m in prov_lines:
        agent = m.group("agent")
        fields = {f: m.group(f) for f in PRODUCER_FIELDS}
        role = None
        if parsed["producer"].get("agent") and \
                _norm(agent) == _norm(parsed["producer"]["agent"]):
            role = "producer"
        elif parsed["reviewer"].get("agent") and \
                _norm(agent) == _norm(parsed["reviewer"]["agent"]):
            role = "reviewer"
        if role is None:
            p.add("REJECT", "D0009",
                  "linha %d: agent=%s não bate com produtor (%s) nem revisor "
                  "(%s) dos fatos" % (ln, agent, parsed["producer"].get("agent"),
                                      parsed["reviewer"].get("agent")))
        else:
            trailers.append((ln, role, fields))
            for field, val in fields.items():
                if is_placeholder(val):
                    p.add("REJECT", "D0010",
                          "linha %d: %s=%r é placeholder conhecido" % (ln, field, val))
            sess = fields.get("session")
            if sess and _norm(sess) in actor_norm:
                p.add("REJECT", "D0011",
                      "linha %d: session=%r é um agent ID capturado "
                      "(actor/session trocados)" % (ln, sess))
            elif sess and is_uuid(sess):
                p.add("OK", "D0012",
                      "linha %d: session UUID fora dos actor IDs capturados — "
                      "legítimo" % ln)

    roles_seen = {r for _, r, _ in trailers}
    if cite_lines and "reviewer" not in roles_seen:
        p.add("REJECT", "D0013",
              "comentário de countersign sem Provenance do revisor (%s) fora "
              "de fence (gate §4)" % parsed["reviewer"].get("agent"))
    if prov_lines and roles_seen == {"reviewer"}:
        p.add("WARN", "D0014",
              "rascunho traz apenas o trailer do revisor — registre também o "
              "Provenance do produtor no PR (gate §5)")
    return p


# ---------------------------------------------------------------------------
# 4. Relatório.
# ---------------------------------------------------------------------------

def format_report(problems, scope):
    out = ["", "--- relatório de validação (%s) ---" % scope]
    for sev, code, msg in problems:
        out.append("%s %s: %s" % (sev, code, msg))
    rejects = [x for x in problems if x[0] == "REJECT"]
    if rejects:
        verdict = ("FATOS REJEITADOS" if scope == "fatos"
                   else "RASCUNHO REJEITADO")
        out.append("VEREDITO: %s — %d rejeições (forma; nada publicado)"
                   % (verdict, len(rejects)))
    else:
        verdict = ("FATOS OK" if scope == "fatos"
                   else "forma canônica do RASCUNHO OK")
        out.append("VEREDITO: %s (%d avisos) — %s"
                   % (verdict, len([x for x in problems if x[0] == "WARN"]),
                      DISCLAIMER))
    return out


def main():
    ap = argparse.ArgumentParser(
        description="Validador/gerador OFFLINE de rascunhos de recibos canônicos "
                    "Provenance/Countersign (AID-3585).")
    ap.add_argument("--render", action="store_true",
                    help="emite rascunho canônico a partir dos fatos")
    ap.add_argument("--check", action="store_true",
                    help="valida o rascunho contra os fatos")
    ap.add_argument("--facts", required=True, help="JSON de fatos explícitos")
    ap.add_argument("--draft", help="arquivo de rascunho a validar (--check)")
    ap.add_argument("--draft-stdin", action="store_true",
                    help="lê o rascunho do stdin (--check)")
    args = ap.parse_args()
    if not args.render and not args.check:
        ap.print_usage()
        print("erro: informe --render ou --check", file=sys.stderr)
        return 2
    if args.render and args.check:
        ap.print_usage()
        print("erro: --render e --check são exclusivos", file=sys.stderr)
        return 2
    try:
        with open(args.facts, "r", encoding="utf-8") as fh:
            facts = json.load(fh)
    except (OSError, ValueError) as exc:
        print("erro: não consegui ler --facts (%s)" % exc, file=sys.stderr)
        return 2

    fact_problems, parsed = check_facts(facts)
    if args.render:
        if fact_problems.rejects:
            print("\n".join(format_report(fact_problems, "fatos")))
            print("erro: fatos rejeitados — nada renderizado (nunca adivinhar "
                  "run/session/veredito)", file=sys.stderr)
            return 1
        draft = render_draft(parsed)
        print(draft)
        # Self-check: o rascunho emitido deve casar as regexes do gate.
        own = Problems(x for x in check_draft(draft, facts)
                       if x[0] in ("OK", "REJECT"))
        print("\n".join(format_report(own, "render (self-check)")))
        return 0 if not own.rejects else 1

    if args.draft_stdin and args.draft:
        print("erro: --draft e --draft-stdin são exclusivos", file=sys.stderr)
        return 2
    if args.draft:
        try:
            with open(args.draft, "r", encoding="utf-8") as fh:
                text = fh.read()
        except OSError as exc:
            print("erro: não consegui ler --draft (%s)" % exc, file=sys.stderr)
            return 2
    elif args.draft_stdin:
        text = sys.stdin.read()
    else:
        print("erro: --check requer --draft ou --draft-stdin", file=sys.stderr)
        return 2

    print("\n".join(format_report(fact_problems, "fatos")))
    draft_problems = check_draft(text, facts)
    print("\n".join(format_report(draft_problems, "rascunho")))
    all_rejects = fact_problems.rejects + draft_problems.rejects
    return 1 if all_rejects else 0


if __name__ == "__main__":
    sys.exit(main())
