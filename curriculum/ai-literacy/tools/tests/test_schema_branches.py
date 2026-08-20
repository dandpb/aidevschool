from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from .. import schema


class TestSchemaBranches(unittest.TestCase):
    def test_resolver_cache_reference_forms_and_errors(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "root.json").write_text(
                json.dumps({"definitions": {"a/b": {"~key": {"const": 1}}}}),
                encoding="utf-8",
            )
            resolver = schema.SchemaResolver(root)
            loaded = resolver.load("root.json")
            self.assertIs(loaded, resolver.load("root.json"))
            self.assertEqual((loaded, "root.json"), resolver.resolve("root.json", "other.json"))
            self.assertEqual(({"const": 1}, "root.json"), resolver.resolve("root.json#/definitions/a~1b/~0key", "other.json"))
            self.assertEqual(({"const": 1}, "root.json"), resolver.resolve("#/definitions/a~1b/~0key", "root.json"))
            with self.assertRaisesRegex(ValueError, "schema referenciado não existe: missing.json"):
                resolver.load("missing.json")
            with self.assertRaisesRegex(ValueError, r"\$ref inválida"):
                resolver.resolve("root.json#/missing", "other.json")
            with self.assertRaisesRegex(ValueError, r"\$ref inválida"):
                resolver.resolve("root.json#/definitions/a~1b/~0key/child", "other.json")

    def test_scalar_types_and_contract_failures(self):
        matches = {
            "object": {},
            "array": [],
            "string": "x",
            "integer": 1,
            "number": 1.5,
            "boolean": True,
            "null": None,
        }
        for expected, instance in matches.items():
            self.assertTrue(schema._type_matches(instance, expected))
        self.assertFalse(schema._type_matches(True, "integer"))
        self.assertFalse(schema._type_matches(True, "number"))
        self.assertFalse(schema._type_matches("x", "unknown"))
        self.assertFalse(schema._type_matches("x", []))
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            documents = {
                "const.json": {"const": 1},
                "enum.json": {"enum": ["a"]},
                "type.json": {"type": "integer"},
                "invalid.json": [],
            }
            for name, document in documents.items():
                (root / name).write_text(json.dumps(document), encoding="utf-8")
            resolver = schema.SchemaResolver(root)
            self.assertEqual([], schema.validate_against_schema(1, "const.json", resolver))
            self.assertIn("deve ser 1", schema.validate_against_schema(2, "const.json", resolver)[0])
            self.assertEqual([], schema.validate_against_schema("a", "enum.json", resolver))
            self.assertIn("deve ser um de", schema.validate_against_schema("b", "enum.json", resolver)[0])
            self.assertIn("deve ser um de", schema.validate_against_schema(["a"], "enum.json", resolver)[0])
            self.assertIn("deve ser do tipo integer", schema.validate_against_schema(True, "type.json", resolver)[0])
            self.assertIn("schema inválido", schema.validate_against_schema(1, "invalid.json", resolver)[0])

    def test_combinators_and_collection_constraints_preserve_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            document = {
                "allOf": [{"minimum": 2}, {"maximum": 4}],
                "oneOf": [{"type": "integer"}, {"minimum": 0}],
                "anyOf": [{"const": 7}, {"const": 8}],
            }
            (root / "combined.json").write_text(json.dumps(document), encoding="utf-8")
            (root / "empty-any.json").write_text(json.dumps({"anyOf": []}), encoding="utf-8")
            resolver = schema.SchemaResolver(root)
            errors = schema.validate_against_schema(5, "combined.json", resolver)
            self.assertEqual(
                [
                    "combined.json: $(allOf[1]) deve ser <= 4 (encontrado 5)",
                    "combined.json: $ deve corresponder a exatamente uma variante (oneOf); 2 corresponderam",
                    "combined.json: $ não corresponde a nenhuma variante (anyOf): combined.json: $ deve ser 7 (encontrado 5)",
                ],
                errors,
            )
            self.assertIn("nenhuma variante correspondeu", schema.validate_against_schema(1, "empty-any.json", resolver)[0])

            constraints = {
                "type": "object",
                "required": ["required"],
                "properties": {"required": {"type": "string"}},
                "additionalProperties": {"type": "integer"},
                "minProperties": 3,
            }
            (root / "object.json").write_text(json.dumps(constraints), encoding="utf-8")
            object_errors = schema.validate_against_schema({"extra": "bad"}, "object.json", resolver)
            self.assertEqual(3, len(object_errors))
            (root / "closed.json").write_text(json.dumps({"type": "object", "additionalProperties": False}), encoding="utf-8")
            self.assertIn("não é uma propriedade permitida", schema.validate_against_schema({"extra": 1}, "closed.json", resolver)[0])

    def test_array_string_and_numeric_boundaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            documents = {
                "array.json": {"type": "array", "minItems": 2, "maxItems": 3, "items": {"type": "integer"}},
                "plain-array.json": {"type": "array"},
                "string.json": {"type": "string", "minLength": 2, "maxLength": 3, "pattern": "^a"},
                "number.json": {"type": "number", "minimum": 2, "maximum": 4},
            }
            for name, document in documents.items():
                (root / name).write_text(json.dumps(document), encoding="utf-8")
            resolver = schema.SchemaResolver(root)
            self.assertEqual([], schema.validate_against_schema([], "plain-array.json", resolver))
            self.assertEqual(2, len(schema.validate_against_schema(["x"], "array.json", resolver)))
            self.assertIn("ao menos 2", schema.validate_against_schema([], "array.json", resolver)[0])
            self.assertIn("no máximo 3", schema.validate_against_schema([1, 2, 3, 4], "array.json", resolver)[0])
            self.assertEqual(2, len(schema.validate_against_schema("b", "string.json", resolver)))
            self.assertIn("no máximo 3", schema.validate_against_schema("aaaa", "string.json", resolver)[0])
            self.assertIn("deve ser >= 2", schema.validate_against_schema(1, "number.json", resolver)[0])
            self.assertIn("deve ser <= 4", schema.validate_against_schema(5, "number.json", resolver)[0])
