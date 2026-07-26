
from __future__ import annotations

import hashlib
import random
import re
from typing import Any




CONNECTIVES = {"and", "then", "e", "y", "ou", "or"}


def parse_list(reply: str | None) -> list[str] | None:
    if reply is None:
        return None
    s = reply.strip().lower().rstrip(".!?")
    if not s:
        return None
    toks = [t for t in re.split(r"[,;\s]+", s) if t]
    toks = [t for t in toks if t not in CONNECTIVES]
    return toks or None


def parse_int_set(reply: str | None) -> set[int] | None:
    toks = parse_list(reply)
    if toks is None:
        return None
    out: set[int] = set()
    for t in toks:
        t = t.strip().rstrip(".")
        if re.fullmatch(r"\d+", t):
            out.add(int(t))
        else:
            return None
    return out or None


def parse_letters(reply: str | None, allowed: str = "abc") -> list[str] | None:
    toks = parse_list(reply)
    if toks is None:
        return None
    out: list[str] = []
    for t in toks:
        t = t.strip().rstrip(".)")
        if len(t) == 1 and t in allowed:
            out.append(t.upper())
        else:
            return None
    return out or None





def score_g1(reply: str, key: dict[str, Any]) -> dict[str, Any]:
    planted = key["items"]["planted"]
    flags = parse_int_set(reply)
    if flags is None:
        return {"verdict": "parse_error", "scores": None}
    P, F = set(planted), flags
    hit = len(P & F)
    recall = hit / len(P) if P else 1.0
    precision = hit / len(F) if F else 0.0
    passed = (recall == 1.0) and (precision >= 0.8)
    return {
        "verdict": "pass" if passed else "fail",
        "scores": {
            "recall": round(recall, 3), "precision": round(precision, 3),
            "flagged": sorted(F), "planted": sorted(P),
        },
    }





def score_g2_redaction(reply: str, key: dict[str, Any]) -> dict[str, Any]:
    items = key["items"]
    seeded = items["seeded_items"]
    token = items.get("redaction_token", "[REDACTED]")
    expected = len(seeded)
    surviving = [s for s in seeded if s in reply]
    covered = expected - len(surviving)
    found = reply.count(token)
    extra = found - covered
    recall = covered / expected if expected else 1.0
    precision = covered / found if found > 0 else 0.0
    passed = (precision == 1.0) and (recall == 1.0)
    return {
        "verdict": "pass" if passed else "fail",
        "scores": {
            "expected_redactions": expected, "found_redactions": found,
            "extra_redactions": extra, "precision": round(precision, 3),
            "recall": round(recall, 3),
        },
    }


def score_g2_scenario(reply: str, key: dict[str, Any]) -> dict[str, Any]:
    items = key["items"]
    letters = parse_letters(reply)
    if letters is None or len(letters) != 1:
        return {"verdict": "parse_error", "scores": None}
    chosen = letters[0]
    keyed = items["keyed_option"]

    low = reply.lower()
    misconceptions = [m for m in items.get("misconception_strings", []) if m.lower() in low]
    passed = (chosen == keyed) and not misconceptions
    return {
        "verdict": "pass" if passed else "fail",
        "scores": {
            "chosen": chosen, "keyed": keyed,
            "misconception_hits": misconceptions,
        },
    }



















def _draw_seed(attempt_id: str) -> int:
    return int.from_bytes(hashlib.sha256(attempt_id.encode()).digest()[:8], "big")


def draw_g3(attempt_id: str, bank_item_ids: list[str], asked_item_ids: list[str], k: int = 3) -> list[str]:
    rng = random.Random(_draw_seed(attempt_id))
    unasked = [i for i in bank_item_ids if i not in asked_item_ids]
    asked = [i for i in bank_item_ids if i in asked_item_ids]
    rng.shuffle(unasked)
    rng.shuffle(asked)
    return (unasked + asked)[:k]


def score_g3(reply: str, key: dict[str, Any], drawn_ids: list[str], gate_progress: dict[str, Any]) -> dict[str, Any]:
    bank = {item["item_id"]: item["keyed"] for item in key["items"]["bank"]}
    letters = parse_letters(reply)
    if letters is None or len(letters) != len(drawn_ids):
        return {"verdict": "parse_error", "scores": None}
    per_item = []
    correct = 0
    for item_id, given in zip(drawn_ids, letters):
        keyed = bank[item_id]
        ok = given == keyed
        correct += 1 if ok else 0
        per_item.append({"item_id": item_id, "given": given, "keyed": keyed, "correct": ok})
    passed = correct == len(drawn_ids)
    return {
        "verdict": "pass" if passed else "fail",
        "scores": {"items": per_item, "correct": correct, "of": len(drawn_ids)},
    }


def score_g4(
    reply: str,
    rubric: dict[str, Any],
    judgments: dict[str, bool],
) -> dict[str, Any]:
    items = rubric["items"]
    misconception_hits: list[str] = []
    if rubric["task"] == "teach_back":
        low = reply.lower()
        misconception_hits = [
            m for m in rubric.get("misconception_strings", []) if m.lower() in low
        ]
    per_item = []
    required_true = 0
    required_total = 0
    for it in items:
        ok = bool(judgments.get(it["item_id"], False))
        entry: dict[str, Any] = {"item_id": it["item_id"], "pass": ok}
        if not ok:
            entry["feedback"] = it["feedback_fail"]
        per_item.append(entry)
        if it["required"]:
            required_total += 1
            required_true += 1 if ok else 0
    passed = (required_true == required_total) and not misconception_hits
    return {
        "verdict": "pass" if passed else "fail",
        "scores": {
            "rubric_id": rubric["rubric_id"],
            "items": per_item,
            "items_true": required_true,
            "items_required": required_total,
            "misconception_screen": {"result": "clean" if not misconception_hits else "hit",
                                     "hits": misconception_hits},
        },
    }
