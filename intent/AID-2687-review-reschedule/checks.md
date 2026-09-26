# Checks — AID-2687-review-reschedule

C1 | profile=cheap | python3 -m pytest -p no:cacheprovider -q engines/aiDevschoolMvp/tests/acceptance/test_review_ladder.py
C2 | profile=standard | python3 -m pytest -p no:cacheprovider -q engines/aiDevschoolMvp/tests
C3 | profile=cheap | python3 -m pytest -p no:cacheprovider -q engines/aiDevschoolMvp/tests/acceptance/test_full_ledger_replay.py engines/aiDevschoolMvp/tests/acceptance/test_deterministic.py
