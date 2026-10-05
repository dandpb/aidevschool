"""Teacher identity/provenance regressions, without network/model calls."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from train_adapter import ROOT,read_gold
from validation import input_digest
ROWS=[json.loads(l) for l in (ROOT/'train.jsonl').read_text().splitlines()]
def record(row):
 answers={}
 for qid,q in row['questions'].items():
  if q['type']=='noul':answers[qid]={'type':'noul','noul':0.5}
  elif q['type']=='score':answers[qid]={'type':'score','score':1.,'probabilities':{str(i):1/len(q['criteria']) for i in range(len(q['criteria']))}}
  else:answers[qid]={'type':'choice','choice':next(iter(q['criteria'])),'probabilities':{key:1/len(q['criteria']) for key in q['criteria']}}
 return {'id':row['id'],'split':'train','input_sha256':input_digest(row),'status':'ok','result':{'model':'jev-1.13.0','answers':answers}}
RECORDS=[record(r) for r in ROWS]
class TeacherContract(unittest.TestCase):
 def load(self,rows):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'teacher.jsonl';p.write_text(''.join(json.dumps(r)+'\n' for r in rows));return read_gold('train',p)
 def test_valid(self):self.assertEqual(len(self.load(RECORDS)),len(ROWS))
 def test_reject_other_teacher(self):
  r=copy.deepcopy(RECORDS);r[0]['result']['model']='other'
  with self.assertRaises(ValueError):self.load(r)
 def test_reject_other_split(self):
  r=copy.deepcopy(RECORDS);r[0]['split']='test'
  with self.assertRaises(ValueError):self.load(r)
 def test_reject_digest(self):
  r=copy.deepcopy(RECORDS);r[0]['input_sha256']='0'*64
  with self.assertRaises(ValueError):self.load(r)
if __name__=='__main__':unittest.main()
