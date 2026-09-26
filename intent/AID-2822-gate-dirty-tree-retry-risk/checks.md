# Checks — AID-2822-gate-dirty-tree-retry-risk

```
C1 | profile=standard | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_p4_tree_integrity_2822.py -q
C3 | profile=cheap | python3 -m py_compile factory/gitwork.py factory/coordinator.py
```
