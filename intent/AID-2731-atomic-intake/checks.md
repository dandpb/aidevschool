# Checks — AID-2731-atomic-intake

```
C1 | profile=standard | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_p1_atomic_intake.py -q
C3 | profile=cheap | python3 -m py_compile factory/queue.py
```
