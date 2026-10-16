"""Independent evaluator for the STACKS teaching game (U18 search engine).

The verifier replays the player's bounded trace against the deterministic
inverted index and TF-IDF ranking over the level corpus — it never trusts the
producer's metrics or ``pass`` claim.

Observation contract (closed per level):

- L1 ``{"kind": "stacks-L1", "predictions": [<term str> x 4]}``
- L2 ``{"kind": "stacks-L2", "predictedTop": <docId str>}``
- L3 ``{"kind": "stacks-L3", "predictedTop": <docId str>}``
- L4 ``{"kind": "stacks-L4", "predictedOrder": [<docId str> x 3]}``
"""

from __future__ import annotations

import math
import re
from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, round2

METRIC_KIND = "voxeldoj-stacks"
L1_CARDS: tuple[str, ...] = ("FOX", "Quick-Brown", "  sleeps  ", "DOG!")

CORPUS: tuple[tuple[str, str], ...] = (
    ("doc-a", "the quick brown fox jumps"),
    ("doc-b", "the lazy dog sleeps quietly"),
    ("doc-c", "the quick dog and the lazy fox"),
    ("doc-d", "fox fox den under the hill"),
    ("doc-e", "quiet streams and lazy fish"),
)

CORPUS_LARGE: tuple[tuple[str, str], ...] = (
    ("p1", "search engine inverted index ranking"),
    ("p2", "the search engine ranks documents by relevance"),
    ("p3", "an inverted index maps terms to posting lists"),
    ("p4", "ranking uses tf idf weighting of query terms"),
    ("p5", "document retrieval returns the top ranked matches"),
    ("p6", "query parsing splits the query into terms"),
    ("p7", "postings store document ids and term frequency"),
)

LEVELS: dict[str, dict[str, Any]] = {
    "L1": {"docs": CORPUS, "terms": ()},
    "L2": {"docs": CORPUS, "terms": ("fox",)},
    "L3": {"docs": CORPUS, "terms": ("dog", "fox")},
    "L4": {"docs": CORPUS_LARGE, "terms": ("search", "ranking", "inverted", "terms")},
}


def _tokenize(text: str) -> list[str]:
    return [tok for tok in re.split(r"[^a-z0-9]+", text.lower()) if tok]


def _shelves_for(docs: tuple[tuple[str, str], ...]) -> frozenset[str]:
    return frozenset(tok for _, text in docs for tok in _tokenize(text))


def _search(
    docs: tuple[tuple[str, str], ...], terms: tuple[str, ...]
) -> list[tuple[str, float]]:
    inverted: dict[str, list[tuple[str, int]]] = {}
    for doc_id, text in docs:
        counts: dict[str, int] = {}
        for tok in _tokenize(text):
            counts[tok] = counts.get(tok, 0) + 1
        for term, tf in counts.items():
            inverted.setdefault(term, []).append((doc_id, tf))
    n = len(docs)
    scores: dict[str, float] = {}
    for term in terms:
        postings = inverted.get(term, [])
        if not postings:
            continue
        weight = math.log(n / len(postings))
        if weight == 0.0:
            continue
        for doc_id, tf in postings:
            scores[doc_id] = scores.get(doc_id, 0.0) + tf * weight
    return sorted(scores.items(), key=lambda item: (-item[1], item[0]))


def _reject(errors: list[str], level: str) -> None:
    errors.append(f"observations do not match the closed {level} scenario trace")


def _valid_str_list(items: Any, length: int, allowed: frozenset[str]) -> bool:
    return (
        isinstance(items, list)
        and len(items) == length
        and all(isinstance(x, str) and x in allowed for x in items)
    )


def _stacks_l1(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictions"}):
        _reject(errors, "L1")
        return None
    preds = observations["predictions"]
    shelves = _shelves_for(cfg["docs"])
    if observations["kind"] != "stacks-L1" or not _valid_str_list(
        preds, len(L1_CARDS), shelves
    ):
        _reject(errors, "L1")
        return None
    correct = sum(
        1 for card, pred in zip(L1_CARDS, preds) if _tokenize(card)[0] == pred
    )
    total = len(L1_CARDS)
    accuracy = correct / total
    metrics = {
        "kind": METRIC_KIND,
        "cards_total": total,
        "cards_correct": correct,
        "filing_accuracy": round2(accuracy),
    }
    return correct >= 3 and accuracy >= 0.75, metrics


def _stacks_l2(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedTop"}):
        _reject(errors, "L2")
        return None
    pred_top = observations["predictedTop"]
    valid_docs = frozenset(doc_id for doc_id, _ in cfg["docs"])
    if observations["kind"] != "stacks-L2" or pred_top not in valid_docs:
        _reject(errors, "L2")
        return None
    ranked = _search(cfg["docs"], cfg["terms"])
    top_id, top_score = ranked[0]
    ok = pred_top == top_id
    metrics = {
        "kind": METRIC_KIND,
        "top_prediction_ok": ok,
        "predicted_top": pred_top,
        "actual_top": top_id,
        "query": " ".join(cfg["terms"]),
        "top_score": round2(top_score),
        "matches_returned": len(ranked),
    }
    return ok, metrics


def _stacks_l3(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedTop"}):
        _reject(errors, "L3")
        return None
    pred_top = observations["predictedTop"]
    docs_map = dict(cfg["docs"])
    if observations["kind"] != "stacks-L3" or pred_top not in docs_map:
        _reject(errors, "L3")
        return None
    ranked = _search(cfg["docs"], cfg["terms"])
    top_id, top_score = ranked[0]
    ok = pred_top == top_id
    top_tokens = frozenset(_tokenize(docs_map[top_id]))
    both_terms = all(t in top_tokens for t in cfg["terms"])
    metrics = {
        "kind": METRIC_KIND,
        "top_prediction_ok": ok,
        "predicted_top": pred_top,
        "actual_top": top_id,
        "query": " ".join(cfg["terms"]),
        "top_has_both_terms": both_terms,
        "top_score": round2(top_score),
        "matches_returned": len(ranked),
    }
    return ok and both_terms, metrics


def _valid_order(items: Any, length: int, allowed: frozenset[str]) -> bool:
    return (
        _valid_str_list(items, length, allowed) and len(set(items)) == length
    )


def _stacks_l4(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedOrder"}):
        _reject(errors, "L4")
        return None
    predicted = observations["predictedOrder"]
    valid_docs = frozenset(doc_id for doc_id, _ in cfg["docs"])
    top_k = 3
    if observations["kind"] != "stacks-L4" or not _valid_order(
        predicted, top_k, valid_docs
    ):
        _reject(errors, "L4")
        return None
    ranked = _search(cfg["docs"], cfg["terms"])
    truth = [doc_id for doc_id, _ in ranked[:top_k]]
    position_matches = sum(1 for p, t in zip(predicted, truth) if p == t)
    ok = position_matches == top_k
    metrics = {
        "kind": METRIC_KIND,
        "rank_order_ok": ok,
        "query": " ".join(cfg["terms"]),
        "position_matches": position_matches,
        "top_k": top_k,
        "predicted_order": ",".join(predicted),
        "actual_order": ",".join(truth),
        "top_score": round2(ranked[0][1]),
    }
    return ok, metrics


_LEVEL_HANDLERS = {
    "L1": _stacks_l1,
    "L2": _stacks_l2,
    "L3": _stacks_l3,
    "L4": _stacks_l4,
}


def evaluate_stacks(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported STACKS level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    outcome = _LEVEL_HANDLERS[level](LEVELS[level], observations, errors)
    if outcome is None:
        return False
    passed, expected = outcome
    if not metrics_match(producer_metrics, expected):
        errors.append(
            "producer metrics disagree with independently recomputed observations"
        )
        return False
    return passed
