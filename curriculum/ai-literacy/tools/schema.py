from __future__ import annotations

import json
import re
from pathlib import Path


class SchemaResolver:
    """Carrega e resolve referências locais e relativas a arquivo."""

    def __init__(self, schemas_dir):
        self.schemas_dir = Path(schemas_dir)
        self._cache = {}

    def load(self, name):
        if name not in self._cache:
            path = self.schemas_dir / name
            if not path.is_file():
                raise ValueError("schema referenciado não existe: %s" % name)
            self._cache[name] = json.loads(path.read_text(encoding="utf-8"))
        return self._cache[name]

    def resolve(self, ref, current_file):
        if ref.startswith("#"):
            target_file, pointer = current_file, ref[1:]
        elif "#" in ref:
            target_file, pointer = ref.split("#", 1)
        else:
            target_file, pointer = ref, ""
        schema = self.load(target_file)
        if pointer:
            for raw_part in pointer.strip("/").split("/"):
                part = raw_part.replace("~1", "/").replace("~0", "~")
                if not isinstance(schema, dict) or part not in schema:
                    raise ValueError("$ref inválida %s em %s" % (ref, current_file))
                schema = schema[part]
        return schema, target_file


def _is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _type_matches(instance, expected):
    if expected == "object":
        return isinstance(instance, dict)
    if expected == "array":
        return isinstance(instance, list)
    if expected == "string":
        return isinstance(instance, str)
    if expected == "integer":
        return _is_integer(instance)
    if expected == "number":
        return _is_number(instance)
    if expected == "boolean":
        return isinstance(instance, bool)
    if expected == "null":
        return instance is None
    return False


def _validate_union(instance, schema, current_file, resolver, path, errors, keyword, exactly_one):
    matches = 0
    collected = []
    for sub in schema[keyword]:
        sub_errors = []
        _validate(instance, sub, current_file, resolver, path, sub_errors)
        if sub_errors:
            collected.append(sub_errors)
        else:
            matches += 1
    if exactly_one:
        _report_one_of(matches, collected, current_file, path, keyword, errors)
    else:
        _report_any_of(matches, collected, current_file, path, keyword, errors)


def _report_one_of(matches, collected, current_file, path, keyword, errors):
    if matches != 1:
        errors.append("%s: %s deve corresponder a exatamente uma variante (%s); %d corresponderam" % (current_file, path, keyword, matches))
        if matches == 0 and collected:
            closest = min(collected, key=len)
            errors.append("%s: %s variante mais próxima falhou com: %s" % (current_file, path, "; ".join(closest[:3])))


def _report_any_of(matches, collected, current_file, path, keyword, errors):
    if matches == 0:
        detail = collected[0][0] if collected and collected[0] else "nenhuma variante correspondeu"
        errors.append("%s: %s não corresponde a nenhuma variante (%s): %s" % (current_file, path, keyword, detail))


def _validate_combinators(instance, schema, current_file, resolver, path, errors):
    for index, sub in enumerate(schema.get("allOf", [])):
        _validate(instance, sub, current_file, resolver, "%s(allOf[%d])" % (path, index), errors)
    for keyword, exactly_one in (("oneOf", True), ("anyOf", False)):
        if keyword in schema:
            _validate_union(instance, schema, current_file, resolver, path, errors, keyword, exactly_one)


def _validate_object(instance, schema, current_file, resolver, path, errors):
    for key in schema.get("required", []):
        if key not in instance:
            errors.append("%s: %s.%s é obrigatório e está ausente" % (current_file, path, key))
    properties = schema.get("properties", {})
    additional = schema.get("additionalProperties", True)
    for key, value in instance.items():
        _validate_property(value, key, properties, additional, current_file, resolver, path, errors)
    if "minProperties" in schema and len(instance) < schema["minProperties"]:
        errors.append("%s: %s deve ter ao menos %d propriedade(s)" % (current_file, path, schema["minProperties"]))


def _validate_property(value, key, properties, additional, current_file, resolver, path, errors):
    child_path = "%s.%s" % (path, key)
    if key in properties:
        _validate(value, properties[key], current_file, resolver, child_path, errors)
    elif additional is False:
        errors.append("%s: %s não é uma propriedade permitida" % (current_file, child_path))
    elif isinstance(additional, dict):
        _validate(value, additional, current_file, resolver, child_path, errors)


def _validate_array(instance, schema, current_file, resolver, path, errors):
    if "minItems" in schema and len(instance) < schema["minItems"]:
        errors.append("%s: %s deve ter ao menos %d item(ns)" % (current_file, path, schema["minItems"]))
    if "maxItems" in schema and len(instance) > schema["maxItems"]:
        errors.append("%s: %s deve ter no máximo %d item(ns)" % (current_file, path, schema["maxItems"]))
    if "items" in schema:
        for index, item in enumerate(instance):
            _validate(item, schema["items"], current_file, resolver, "%s[%d]" % (path, index), errors)


def _validate_string(instance, schema, current_file, path, errors):
    if "minLength" in schema and len(instance) < schema["minLength"]:
        errors.append("%s: %s deve ter ao menos %d caractere(s)" % (current_file, path, schema["minLength"]))
    if "maxLength" in schema and len(instance) > schema["maxLength"]:
        errors.append("%s: %s deve ter no máximo %d caractere(s)" % (current_file, path, schema["maxLength"]))
    if "pattern" in schema and not re.search(schema["pattern"], instance):
        errors.append("%s: %s não corresponde ao padrão %s (encontrado %r)" % (current_file, path, schema["pattern"], instance))


def _validate_number(instance, schema, current_file, path, errors):
    if "minimum" in schema and instance < schema["minimum"]:
        errors.append("%s: %s deve ser >= %s (encontrado %s)" % (current_file, path, schema["minimum"], instance))
    if "maximum" in schema and instance > schema["maximum"]:
        errors.append("%s: %s deve ser <= %s (encontrado %s)" % (current_file, path, schema["maximum"], instance))


def _validate_contract(instance, schema, current_file, path, errors):
    if "const" in schema and instance != schema["const"]:
        errors.append("%s: %s deve ser %r (encontrado %r)" % (current_file, path, schema["const"], instance))
        return False
    if "enum" in schema and instance not in schema["enum"]:
        errors.append("%s: %s deve ser um de %r (encontrado %r)" % (current_file, path, schema["enum"], instance))
        return False
    if "type" in schema and not _type_matches(instance, schema["type"]):
        errors.append("%s: %s deve ser do tipo %s (encontrado %s)" % (current_file, path, schema["type"], type(instance).__name__))
        return False
    return True


def _validate_value(instance, schema, current_file, resolver, path, errors):
    _validate_combinators(instance, schema, current_file, resolver, path, errors)
    if isinstance(instance, dict):
        _validate_object(instance, schema, current_file, resolver, path, errors)
    if isinstance(instance, list):
        _validate_array(instance, schema, current_file, resolver, path, errors)
    if isinstance(instance, str):
        _validate_string(instance, schema, current_file, path, errors)
    if _is_number(instance):
        _validate_number(instance, schema, current_file, path, errors)


def _validate(instance, schema, current_file, resolver, path, errors):
    if not isinstance(schema, dict):
        errors.append("%s: schema inválido (não é objeto) em %s" % (current_file, path))
        return
    if "$ref" in schema:
        target, target_file = resolver.resolve(schema["$ref"], current_file)
        _validate(instance, target, target_file, resolver, path, errors)
        return
    if _validate_contract(instance, schema, current_file, path, errors):
        _validate_value(instance, schema, current_file, resolver, path, errors)


def validate_against_schema(instance, schema_name, resolver):
    """Retorna erros de schema para uma instância."""
    errors = []
    _validate(instance, resolver.load(schema_name), schema_name, resolver, "$", errors)
    return errors
