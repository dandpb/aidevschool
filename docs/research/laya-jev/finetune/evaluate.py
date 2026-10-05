"""Record validated predictions for the same frozen new test or historical corpus."""
import argparse
import json
import os
import sys
import time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent))
from validation import input_digest,validate_result
from train_adapter import sha

def main():
 p=argparse.ArgumentParser();p.add_argument('--checkpoint',required=True);p.add_argument('--corpus',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 out=Path(a.output)
 if out.exists():raise SystemExit('Refusing existing evaluation output')
 rows=[json.loads(l) for l in Path(a.corpus).read_text().splitlines()]
 digest=sha(Path(a.checkpoint)/'model.safetensors');cfg_digest=sha(Path(a.checkpoint)/'rl_agent_config.json')
 report=Path(a.checkpoint)/'training-report.json'
 if report.exists():
  metadata=json.loads(report.read_text())
  if digest!=metadata['output_sha256'] or cfg_digest!=metadata['output_config_sha256']:raise ValueError('Trained checkpoint differs from export provenance')
 else:
  manifest=json.loads((ROOT.parent/'checkpoint-manifest.json').read_text())
  expected=next(e['sha256'] for e in manifest['checkpoints'] if e['name']=='typed-decisions')
  if digest!=expected:raise ValueError('Baseline checkpoint differs from pinned typed-decisions')
 os.environ['HF_HUB_OFFLINE']='1';os.environ['TRANSFORMERS_OFFLINE']='1'
 import torch,laya
 torch.set_num_threads(4)
 start=time.perf_counter();agent=laya.load(a.checkpoint,device='cpu',expected_sha256={'model.safetensors':digest});load_ms=(time.perf_counter()-start)*1000
 agent.predict(rows[0]['state'],rows[0]['questions'],max_len=8192 if Path(a.corpus).name=='dataset.jsonl' else 512)
 out.parent.mkdir(parents=True,exist_ok=True)
 with out.open('x') as f:
  for i,row in enumerate(rows):
   start=time.perf_counter();result=validate_result(row,agent.predict(row['state'],row['questions'],max_len=8192 if Path(a.corpus).name=='dataset.jsonl' else 512,lang=row['language']))
   record={'id':row['id'],'input_sha256':input_digest(row),'corpus_sha256':sha(a.corpus),'weights_sha256':digest,'config_sha256':cfg_digest,'status':'ok','result':result,'warm_inference_ms':(time.perf_counter()-start)*1000,'load_ms':load_ms if i==0 else None}
   f.write(json.dumps(record,ensure_ascii=False)+'\n');f.flush()
   if (i+1)%25==0:print(i+1,'/',len(rows),'evaluated',flush=True)
 print(len(rows),'evaluation rows completed',flush=True)

if __name__=='__main__':main()
