"""Run live inference only; failures never become synthetic model answers."""
import argparse
import hashlib
import json
import math
import os
import sys
import time
import urllib.request
from pathlib import Path
from paths import ROOT, REPO_ROOT, OUTPUT_ROOT, LAYA_ROOT

os.environ.setdefault('HF_HUB_DOWNLOAD_TIMEOUT','30')
os.environ.setdefault('HF_HUB_ETAG_TIMEOUT','15')
os.environ.setdefault('HF_HUB_DISABLE_XET','1')

def validate(case,result):
    answers=result.get('answers')
    if not isinstance(answers,dict) or set(answers)!=set(case['questions']):
        raise ValueError('Answer keys differ from question keys')
    for qid,q in case['questions'].items():
        a=answers[qid]
        if not isinstance(a,dict) or a.get('type')!=q['type']:
            raise ValueError(f'{qid}: incorrect answer type')
        kind=q['type']
        if kind=='choice' and a.get('choice') not in q['criteria']:
            raise ValueError(f'{qid}: invalid choice')
        if kind in ('score','noul'):
            v=a.get(kind);maximum=len(q['criteria'])-1 if kind=='score' else 1
            if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<=v<=maximum:
                raise ValueError(f'{qid}: invalid numerical answer')
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--backend',choices=['jev','laya'],required=True)
    p.add_argument('--model');p.add_argument('--limit',type=int);p.add_argument('--suite');p.add_argument('--output')
    args=p.parse_args()
    cases=[json.loads(line) for line in (ROOT/'dataset.jsonl').read_text().splitlines()]
    if args.suite: cases=[c for c in cases if c['suite']==args.suite]
    if args.limit is not None: cases=cases[:args.limit]
    model=args.model or ('jev-latest' if args.backend=='jev' else 'auto')
    output=Path(args.output) if args.output else OUTPUT_ROOT/f'{args.backend}-{model}.jsonl'
    output.parent.mkdir(parents=True,exist_ok=True)
    if output.exists(): raise SystemExit(f'Refusing to overwrite evidence: {output}')
    if args.backend=='jev':
        from dotenv import load_dotenv
        load_dotenv(REPO_ROOT/'.env')
        key=os.getenv('TYPESAFE_API_KEY')
        if not key: raise SystemExit('TYPESAFE_API_KEY is missing')
        def predict(c):
            payload=json.dumps({'model':model,'state':c['state'],'questions':c['questions']},ensure_ascii=False).encode()
            req=urllib.request.Request('https://api.typesafe.ai/v1/systemone',data=payload,headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'})
            with urllib.request.urlopen(req,timeout=30) as response: return json.load(response)
    else:
        os.environ['HF_HUB_OFFLINE']='1'
        os.environ['TRANSFORMERS_OFFLINE']='1'
        import torch
        from laya import Router
        torch.set_num_threads(4)
        manifest=json.loads((ROOT/'checkpoint-manifest.json').read_text())
        models={e['name']:str(LAYA_ROOT/'models'/Path(e['path']).parent) for e in manifest['checkpoints']}
        router=Router(models=models,device='cpu',sha256_digests={e['name']:{'model.safetensors':e['sha256']} for e in manifest['checkpoints']})
        def predict(c):
            # Explicit language hints: the catalog mixes Portuguese descriptions and English schema.
            return router.predict(c['state'],c['questions'],model=None if model=='auto' else model,lang=c['language'],max_len=8192)
    with output.open('x') as f:
        for c in cases:
            start=time.perf_counter();record={'id':c['id'],'backend':args.backend,'requested_model':model,'input_sha256':hashlib.sha256(json.dumps({'state':c['state'],'questions':c['questions']},sort_keys=True,ensure_ascii=False).encode()).hexdigest()}
            try:
                result=validate(c,predict(c));record.update(status='ok',result=result)
            except Exception as exc:
                msg=str(exc)
                if args.backend=='jev': msg=msg.replace(key,'[REDACTED]')
                record.update(status='error',error_class=type(exc).__name__,error=msg[:1500])
            record['elapsed_ms']=(time.perf_counter()-start)*1000
            f.write(json.dumps(record,ensure_ascii=False,default=str)+'\n');f.flush()
            print(c['id'],record['status'],round(record['elapsed_ms'],1),flush=True)
            if record['status']=='error':
                print('Stopped on error; no fabricated or fallback predictions recorded.',flush=True);break
    if cases and record['status']=='error':
        sys.exit(2)

if __name__=='__main__': main()
