# Checks — AID-2730-clean-room-verify

```
C1 | profile=standard | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_p4_cleanroom.py -q
C3 | profile=cheap | python3 -m py_compile factory/verify.py factory/gitwork.py factory/coordinator.py
```
