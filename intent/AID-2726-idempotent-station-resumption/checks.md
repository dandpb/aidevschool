# Checks — AID-2726-idempotent-station-resumption

```
C1 | profile=standard | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_s1_resumption.py -q
C3 | profile=cheap | python3 -m py_compile factory/model.py factory/gitwork.py factory/coordinator.py
```
