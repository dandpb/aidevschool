"""Load verified checkpoint directories and run inference with Hub networking disabled."""
import argparse
import gc
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from paths import ROOT, LAYA_ROOT, OUTPUT_ROOT

os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--models-dir',default=str(LAYA_ROOT/'models'))
    parser.add_argument('--model',choices=['all','english','multilingual','typed-decisions'],default='all')
    parser.add_argument('--output',default=str(OUTPUT_ROOT/'local-models.json'))
    args=parser.parse_args()
    target=Path(args.output)
    if target.exists():
        raise SystemExit(f'Refusing to overwrite evidence: {target}')
    manifest=json.loads((ROOT/'checkpoint-manifest.json').read_text())
    entries=[e for e in manifest['checkpoints'] if args.model=='all' or e['name']==args.model]
    missing=[]
    for e in entries:
        path=Path(args.models_dir)/e['path']
        if not path.is_file():missing.append(str(path));continue
        if path.stat().st_size!=e['bytes'] or digest(path)!=e['sha256']:
            raise SystemExit(f'Checkpoint integrity check failed: {e["name"]}')
    if missing:
        print('No neural inference performed: local checkpoint files are missing.',file=sys.stderr)
        for path in missing: print(path,file=sys.stderr)
        raise SystemExit(2)
    import torch
    import laya
    torch.set_num_threads(4)
    q={
        'department':{'type':'choice','instructions':'Which department should handle this request?',
            'criteria':{'billing':'invoices, charges, payments and refunds','technical':'software bugs, crashes and outages','other':'general information'}},
        'cancel':{'type':'noul','instructions':'Does the customer currently threaten to cancel the subscription?',
            'criteria':{'true':'Customer explicitly threatens to cancel','false':'Customer does not threaten to cancel'}},
    }
    texts={'english':'I was charged twice. Refund the duplicate today or I will cancel my subscription.',
           'typed-decisions':'I was charged twice. Refund the duplicate today or I will cancel my subscription.',
           'multilingual':'Fui cobrado duas vezes. Devolva o pagamento duplicado hoje ou vou cancelar minha assinatura.'}
    results=[]
    for entry in entries:
        model_dir=Path(args.models_dir)/Path(entry['path']).parent
        start=time.perf_counter();agent=laya.load(str(model_dir),device='cpu',expected_sha256={'model.safetensors':entry['sha256']})
        load_ms=(time.perf_counter()-start)*1000
        agent.predict(texts[entry['name']],q)  # Warm up; excluded from inference timing.
        start=time.perf_counter();result=agent.predict(texts[entry['name']],q)
        row={'model':entry['name'],'checkpoint_dir':str(model_dir),'revision':manifest['revision'],
            'weights_sha256':entry['sha256'],'device':'cpu','offline':True,'load_ms':load_ms,
            'warm_inference_ms':(time.perf_counter()-start)*1000,'state':texts[entry['name']],'result':result}
        results.append(row);print(json.dumps(row,ensure_ascii=False,default=str),flush=True)
        del agent;gc.collect()
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('x') as handle:
        handle.write(json.dumps(results,ensure_ascii=False,indent=2,default=str))

if __name__=='__main__':main()
