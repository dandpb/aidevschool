"""Run live inference with verified inputs and separate warm-local/HTTP timings."""
import argparse
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

from paths import ROOT, REPO_ROOT, OUTPUT_ROOT, LAYA_ROOT
from validation import input_digest, load_corpus, validate_result

# Compatibility for callers of the original research helper.
validate = validate_result


def milliseconds(start):
    return (time.perf_counter() - start) * 1000


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--backend', choices=['jev', 'laya'], required=True)
    parser.add_argument('--model')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--suite')
    parser.add_argument('--language', choices=['en', 'pt'])
    parser.add_argument('--output')
    args = parser.parse_args()
    all_cases, corpus_digest = load_corpus()
    cases = list(all_cases.values())
    if args.suite:
        cases = [c for c in cases if c['suite'] == args.suite]
    if args.language:
        cases = [c for c in cases if c['language'] == args.language]
    if args.limit is not None:
        if args.limit < 1:
            parser.error('--limit must be positive')
        cases = cases[:args.limit]
    if not cases:
        parser.error('No cases selected')
    model = args.model or ('jev-latest' if args.backend == 'jev' else 'auto')
    output = Path(args.output) if args.output else OUTPUT_ROOT / f'{args.backend}-{model}.jsonl'
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise SystemExit(f'Refusing to overwrite evidence: {output}')
    key = None
    router = None
    warmed = set()
    entries = {}
    if args.backend == 'jev':
        from dotenv import load_dotenv
        load_dotenv(Path(os.environ.get('LAYA_JEV_ENV_FILE', REPO_ROOT / '.env')))
        key = os.getenv('TYPESAFE_API_KEY')
        if not key:
            raise SystemExit('TYPESAFE_API_KEY is missing')
    else:
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['TRANSFORMERS_OFFLINE'] = '1'
        import torch
        from laya import Router
        torch.set_num_threads(4)
        manifest = json.loads((ROOT / 'checkpoint-manifest.json').read_text())
        upstream = json.loads((LAYA_ROOT / 'verify/checkpoints.json').read_text())
        if upstream != manifest:
            raise SystemExit('Local upstream checkpoint manifest differs from pinned research manifest')
        commit = subprocess.check_output(['git', '-C', str(LAYA_ROOT), 'rev-parse', 'HEAD'], text=True).strip()
        if commit != '8a6e1328cce2460a0e5aa348ad465bb1b5821cd2':
            raise SystemExit('Local Laya checkout differs from pinned source commit')
        entries = {e['name']: e for e in manifest['checkpoints']}
        models = {name: str(LAYA_ROOT / 'models' / Path(e['path']).parent) for name, e in entries.items()}
        digests = {name: {'model.safetensors': e['sha256']} for name, e in entries.items()}
        router = Router(models=models, device='cpu', sha256_digests=digests)
    failed = False
    with output.open('x') as handle:
        for case in cases:
            record = {'format_version': 2, 'id': case['id'], 'backend': args.backend,
                      'requested_model': model, 'input_sha256': input_digest(case),
                      'corpus_sha256': corpus_digest, 'load_ms': None, 'warmup_ms': None,
                      'warm_inference_ms': None, 'http_roundtrip_ms': None}
            total_start = time.perf_counter()
            try:
                if router is not None:
                    overrides = {'model': None if model == 'auto' else model, 'lang': case['language']}
                    decision = router.route(case['state'], case['questions'], **overrides)
                    checkpoint = decision['model']
                    entry = entries[checkpoint]
                    record.update(checkpoint=checkpoint, weights_sha256=entry['sha256'],
                                  weights_revision=manifest['revision'], source_commit=commit,
                                  device='cpu', offline=True, max_len=8192)
                    if checkpoint not in warmed:
                        start = time.perf_counter()
                        router.load(checkpoint)  # Includes mandatory weights digest verification.
                        record['load_ms'] = milliseconds(start)
                        start = time.perf_counter()
                        validate_result(case, router.predict(case['state'], case['questions'],
                                                            max_len=8192, **overrides))
                        record['warmup_ms'] = milliseconds(start)
                        warmed.add(checkpoint)
                    start = time.perf_counter()
                    result = router.predict(case['state'], case['questions'], max_len=8192, **overrides)
                    record['warm_inference_ms'] = milliseconds(start)
                else:
                    payload = json.dumps({'model': model, 'state': case['state'],
                                          'questions': case['questions']}, ensure_ascii=False).encode()
                    request = urllib.request.Request('https://api.typesafe.ai/v1/systemone', data=payload,
                              headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
                    start = time.perf_counter()
                    with urllib.request.urlopen(request, timeout=30) as response:
                        result = json.load(response)
                    record['http_roundtrip_ms'] = milliseconds(start)
                record.update(status='ok', result=validate_result(case, result))
            except Exception as exc:
                message = str(exc)
                if key:
                    message = message.replace(key, '[REDACTED]')
                record.update(status='error', error_class=type(exc).__name__, error=message[:1500])
                failed = True
            record['elapsed_ms'] = milliseconds(total_start)
            handle.write(json.dumps(record, ensure_ascii=False) + '\n')
            handle.flush()
            print(case['id'], record['status'], round(record['elapsed_ms'], 1), flush=True)
            if failed:
                print('Stopped on error; no fabricated or fallback predictions recorded.', flush=True)
                break
    if failed:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
