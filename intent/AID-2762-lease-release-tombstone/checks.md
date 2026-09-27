# Checks — AID-2762-lease-release-tombstone

```
C1 | profile=standard | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_release_tombstone.py -q
C3 | profile=cheap | python3 -m py_compile factory/model.py factory/queue.py
```
