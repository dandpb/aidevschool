# AI DevSchool — common developer tasks.
# Run from the repo root.

.PHONY: help install test test-core test-substrate

help:
	@echo "make install        — install Python deps (pyyaml + pytest)"
	@echo "make test           — run all Python suites (tutor core + learner substrate)"
	@echo "make test-core      — run only the minimaxDojo tutor-core suite"
	@echo "make test-substrate — run only the learner substrate suite"

install:
	python3 -m pip install -e ".[dev]"

test:
	python3 -m pytest

test-core:
	python3 -m pytest engines/minimaxDojo/tests

test-substrate:
	python3 -m pytest learner/substrate/tests
