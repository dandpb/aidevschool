"""Version-two evidence must prove its declared checkpoint and timing contract."""
import copy
import json
import unittest
from paths import ROOT
from test_validation import RECORD
from validation import load_corpus, validate_records

CASES, DIGEST = load_corpus()
MANIFEST = json.loads((ROOT / 'checkpoint-manifest.json').read_text())
ENTRY = MANIFEST['checkpoints'][0]
V2 = dict(copy.deepcopy(RECORD), format_version=2, backend='laya', requested_model='auto',
          corpus_sha256=DIGEST, checkpoint='english', weights_sha256=ENTRY['sha256'],
          weights_revision=MANIFEST['revision'], source_commit='8a6e1328cce2460a0e5aa348ad465bb1b5821cd2',
          device='cpu', offline=True, max_len=8192, load_ms=0.1, warmup_ms=0.1,
          warm_inference_ms=0.1, http_roundtrip_ms=None)
V2['result']['routing'] = {'model': 'english'}

class Provenance(unittest.TestCase):
    def rejected(self, row):
        with self.assertRaises(ValueError):
            validate_records([row], CASES, DIGEST)

    def test_valid_v2(self):
        validate_records([V2], CASES, DIGEST)

    def test_requires_corpus_digest(self):
        row = copy.deepcopy(V2); del row['corpus_sha256']; self.rejected(row)

    def test_rejects_wrong_weights(self):
        row = copy.deepcopy(V2); row['weights_sha256'] = '0'*64; self.rejected(row)

    def test_rejects_wrong_source(self):
        row = copy.deepcopy(V2); row['source_commit'] = 'bogus'; self.rejected(row)

    def test_rejects_wrong_revision(self):
        row = copy.deepcopy(V2); row['weights_revision'] = 'bogus'; self.rejected(row)

    def test_rejects_http_timing_on_laya(self):
        row = copy.deepcopy(V2); row['http_roundtrip_ms'] = 0.1; self.rejected(row)

    def test_requires_local_warm_timing(self):
        row = copy.deepcopy(V2); row['warm_inference_ms'] = None; self.rejected(row)

    def test_requires_first_load_and_warmup(self):
        row = copy.deepcopy(V2); row['load_ms'] = None; row['warmup_ms'] = None; self.rejected(row)

    def test_rejects_inconsistent_timing(self):
        row = copy.deepcopy(V2); row['warm_inference_ms'] = 100; self.rejected(row)

    def test_requires_jev_http_timing(self):
        row = copy.deepcopy(V2); row['backend'] = 'jev'; self.rejected(row)

if __name__ == '__main__':
    unittest.main()
