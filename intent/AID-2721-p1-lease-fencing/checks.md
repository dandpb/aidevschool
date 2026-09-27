# Checks — AID-2721-p1-lease-fencing

```
C1 | profile=standard | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_p1_fencing.py -q
C3 | profile=cheap | python3 -m py_compile factory/model.py factory/queue.py factory/coordinator.py
```
