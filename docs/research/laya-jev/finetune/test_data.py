"""Data-contract regressions: split integrity and recommendation candidate coverage."""
import hashlib
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent

class DataContract(unittest.TestCase):
 def test_manifest(self):
  manifest=json.loads((ROOT/'data-manifest.json').read_text())
  for split in ['train','calibration','test']:
   self.assertEqual(hashlib.sha256((ROOT/(split+'.jsonl')).read_bytes()).hexdigest(),manifest['splits'][split]['sha256'])
 def test_no_cross_split_state(self):
  seen={}
  for split in ['train','calibration','test']:
   for row in map(json.loads,(ROOT/(split+'.jsonl')).read_text().splitlines()):
    digest=hashlib.sha256(json.dumps(row['state'],sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    self.assertIn(seen.setdefault(digest,split),[split])
 def test_every_recommendation_group_includes_target(self):
  for split in ['train','calibration','test']:
   groups={}
   for row in map(json.loads,(ROOT/(split+'.jsonl')).read_text().splitlines()):
    if row['suite']=='recommendation':
     group=groups.setdefault(row['goal_group'],{'target':row['target_engine'],'candidates':set()})
     group['candidates'].add(row['candidate_engine'])
   for group in groups.values():self.assertIn(group['target'],group['candidates'])

if __name__=='__main__':unittest.main()
