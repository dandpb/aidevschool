"""Collect Jev soft targets on frozen synthetic splits without exposing credentials."""
import argparse
import concurrent.futures
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent))
from validation import input_digest, validate_result

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--split',choices=['train','calibration','test'],required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
 from dotenv import load_dotenv
 load_dotenv(os.environ.get('LAYA_JEV_ENV_FILE',ROOT.parents[3]/'.env'))
 key=os.environ.get('TYPESAFE_API_KEY')
 if not key:raise SystemExit('Missing TypeSafe credential')
 path=Path(args.output)
 if path.exists():raise SystemExit('Refusing existing teacher evidence')
 rows=[json.loads(l) for l in (ROOT/(args.split+'.jsonl')).read_text().splitlines()]
 def ask(row):
  start=time.perf_counter()
  payload=json.dumps({'model':'jev-1.13.0','state':row['state'],'questions':row['questions']},ensure_ascii=False).encode()
  request=urllib.request.Request('https://api.typesafe.ai/v1/systemone',data=payload,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(request,timeout=30) as response:result=validate_result(row,json.load(response))
   if result['model']!='jev-1.13.0':raise ValueError('Teacher model differs from pinned version')
   return {'id':row['id'],'split':args.split,'input_sha256':input_digest(row),'status':'ok','result':result,'http_roundtrip_ms':(time.perf_counter()-start)*1000}
  except Exception as e:
   return {'id':row['id'],'split':args.split,'input_sha256':input_digest(row),'status':'error','error':str(e).replace(key,'[REDACTED]')[:500]}
 path.parent.mkdir(parents=True,exist_ok=True)
 with path.open('x') as out,concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
  for i,record in enumerate(executor.map(ask,rows)):
   out.write(json.dumps(record,ensure_ascii=False)+'\n');out.flush()
   if record['status']!='ok':raise SystemExit('Teacher request failed; preserved error evidence')
   if (i+1)%25==0:print(args.split,i+1,'/',len(rows),flush=True)
 print(args.split,len(rows),'completed',flush=True)

if __name__=='__main__':main()
