# Checks — AID-2734-plan-status-inline

```
C1 | profile=standard | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_f0_plan_status.py -q
C3 | profile=cheap | python3 -m py_compile factory/contract.py
```
