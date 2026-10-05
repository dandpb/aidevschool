"""Integration regressions for baseline configuration and training lineage validation."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent
RUNTIME=ROOT/'evidence'
class AnalysisContract(unittest.TestCase):
 def analyze(self,wrong_config=False,wrong_lineage=False):
  rows=[json.loads(l) for l in (RUNTIME/'base-test-02.jsonl').read_text().splitlines()]
  config=rows[0]['config_sha256'];weights=rows[0]['weights_sha256']
  metadata={'base_sha256':weights,'base_config_sha256':config,'output_sha256':weights,'output_config_sha256':config,'teacher_model':'jev-1.13.0','data_manifest':json.loads((ROOT/'data-manifest.json').read_text())}
  if wrong_lineage:metadata['base_sha256']='0'*64
  with tempfile.TemporaryDirectory() as t:
   base=Path(t)/'base.jsonl';report=Path(t)/'report.json';output=Path(t)/'analysis.json'
   if wrong_config:
    for row in rows:row['config_sha256']='0'*64
   base.write_text(''.join(json.dumps(r)+'\n' for r in rows));report.write_text(json.dumps(metadata))
   p=subprocess.run([sys.executable,str(ROOT/'analyze_training.py'),'--corpus',str(ROOT/'test.jsonl'),'--teacher',str(RUNTIME/'teacher-test-01.jsonl'),'--base',str(base),'--trained',str(RUNTIME/'base-test-02.jsonl'),'--training-report',str(report),'--output',str(output)],capture_output=True,text=True)
   return p.returncode,output.exists()
 def test_valid(self):self.assertEqual(self.analyze(),(0,True))
 def test_reject_changed_base_config(self):self.assertNotEqual(self.analyze(wrong_config=True)[0],0)
 def test_reject_wrong_lineage(self):self.assertNotEqual(self.analyze(wrong_lineage=True)[0],0)
if __name__=='__main__':unittest.main()
