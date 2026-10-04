"""Negative regressions for importing live evidence; no model or network calls."""
import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CASE = json.loads((ROOT / 'dataset.jsonl').read_text().splitlines()[0])
RESULT = {'model': 'fixture', 'answers': {
    'department': {'type': 'choice', 'choice': 'billing', 'probabilities': {'billing': 1.0, 'technical': 0.0, 'other': 0.0}},
    'urgency': {'type': 'score', 'score': 0.0, 'probabilities': {'0': 1.0, '1': 0.0, '2': 0.0}},
    'churn_risk': {'type': 'noul', 'noul': 0.0}}}
RECORD = {'id': CASE['id'], 'backend': 'jev', 'requested_model': 'fixture', 'status': 'ok',
          'elapsed_ms': 1.0, 'input_sha256': hashlib.sha256(json.dumps(
              {'state': CASE['state'], 'questions': CASE['questions']}, sort_keys=True,
              ensure_ascii=False).encode()).hexdigest(), 'result': RESULT}

class EvidenceValidation(unittest.TestCase):
    def analyze(self, rows):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'records.jsonl'
            path.write_text(''.join(json.dumps(r) + '\n' for r in rows))
            output = Path(temp) / 'summary.json'
            process = subprocess.run([sys.executable, str(ROOT / 'analyze.py'), '--files', str(path),
                                      '--output', str(output)], capture_output=True, text=True)
            return process.returncode, output.exists()

    def test_valid(self):
        self.assertEqual(self.analyze([RECORD]), (0, True))

    def test_reject_tampered_digest(self):
        row = copy.deepcopy(RECORD); row['input_sha256'] = '0' * 64
        self.assertEqual(self.analyze([row])[1], False)

    def test_reject_duplicate_id(self):
        self.assertNotEqual(self.analyze([RECORD, RECORD])[0], 0)

    def test_reject_nonfinite_answer(self):
        row = copy.deepcopy(RECORD); row['result']['answers']['churn_risk']['noul'] = float('nan')
        self.assertEqual(self.analyze([row])[1], False)

    def test_reject_wrong_distribution(self):
        row = copy.deepcopy(RECORD); row['result']['answers']['urgency']['probabilities'] = {'9': 1.0}
        self.assertEqual(self.analyze([row])[1], False)

    def test_reject_wrong_choice(self):
        row = copy.deepcopy(RECORD); row['result']['answers']['department']['choice'] = 'unknown'
        self.assertEqual(self.analyze([row])[1], False)

    def test_reject_wrong_type(self):
        row = copy.deepcopy(RECORD); row['result']['answers']['churn_risk']['type'] = 'score'
        self.assertEqual(self.analyze([row])[1], False)

    def test_reject_nonfinite_timing(self):
        row = copy.deepcopy(RECORD); row['elapsed_ms'] = float('inf')
        self.assertNotEqual(self.analyze([row])[0], 0)

if __name__ == '__main__':
    unittest.main()
