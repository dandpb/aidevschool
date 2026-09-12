from __future__ import annotations

VALID_STATUSES = ("planned", "ready")
VALID_DURATIONS = (3, 4, 5)
VALID_JOURNEYS = ("ia_pratica", "dev")
PUBLIC_JOURNEY = "ia_pratica"


def _check_catalog_shape(catalog, errors):
    if not isinstance(catalog, dict):
        errors.append("catalog.yaml: catálogo deve ser um objeto YAML")
        return None
    for key in ("schemaVersion", "contentVersion", "track", "skills", "modules", "lessons"):
        if key not in catalog:
            errors.append("catalog.yaml: chave obrigatória ausente: %s" % key)
    return None if errors else catalog


def _index_by_id(items, what, errors):
    index = {}
    for item in items or []:
        item_id = item.get("id") if isinstance(item, dict) else None
        if not item_id:
            errors.append("catalog.yaml: %s sem id" % what)
            continue
        if item_id in index:
            errors.append("catalog.yaml: id de %s duplicado: %s" % (what, item_id))
        index[item_id] = item
    return index


def _journey_by_lesson(lesson_index, module_index):
    journey = {}
    for lesson_id, entry in lesson_index.items():
        module = module_index.get(entry.get("moduleId"))
        if module is not None and module.get("journey") in VALID_JOURNEYS:
            journey[lesson_id] = module["journey"]
    return journey


def _check_prereq_journeys(lesson_index, module_index, errors):
    """Lições do percurso público não podem depender de lições da jornada dev.

    O app standalone filtra o read model por journey (content-contract.md);
    um pré-requisito dev nunca desbloquearia no percurso público.
    O caminho inverso (dev → ia_pratica) é permitido: missões hospedadas
    podem construir sobre lições públicas.
    """
    journey = _journey_by_lesson(lesson_index, module_index)
    for lesson_id, entry in lesson_index.items():
        if journey.get(lesson_id) != PUBLIC_JOURNEY:
            continue
        for prereq in entry.get("prerequisites") or []:
            if journey.get(prereq) not in (None, PUBLIC_JOURNEY):
                errors.append(
                    "catalog.yaml: lição %s (jornada %s) referencia pré-requisito "
                    "da jornada %s: %s — o percurso público não projeta lições dev "
                    "e esta lição ficaria bloqueada no app standalone"
                    % (lesson_id, PUBLIC_JOURNEY, journey[prereq], prereq)
                )


def _detect_prereq_cycles(lesson_index, errors):
    white, gray, black = 0, 1, 2
    color = {lesson_id: white for lesson_id in lesson_index}

    def visit(lesson_id, stack):
        color[lesson_id] = gray
        stack.append(lesson_id)
        for prereq in lesson_index[lesson_id].get("prerequisites") or []:
            if prereq not in lesson_index:
                continue
            if color[prereq] == gray:
                cycle = stack[stack.index(prereq) :] + [prereq]
                errors.append(
                    "catalog.yaml: ciclo de pré-requisitos detectado: %s"
                    % " -> ".join(cycle)
                )
            elif color[prereq] == white:
                visit(prereq, stack)
        stack.pop()
        color[lesson_id] = black

    for lesson_id in lesson_index:
        if color[lesson_id] == white:
            visit(lesson_id, [])
