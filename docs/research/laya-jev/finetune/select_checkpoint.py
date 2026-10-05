"""Select between the two fixed recipes using calibration data, never test rankings."""
import argparse
import json
import math
import statistics
from pathlib import Path

from analyze_training import probabilities, read_predictions
from train_adapter import sha

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    for name in ('teacher', 'v1', 'v1-report', 'v2', 'v2-report', 'policy', 'output'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists():
        raise SystemExit('Refusing existing selection output')
    manifest = json.loads((ROOT / 'data-manifest.json').read_text())
    corpus = ROOT / 'calibration.jsonl'
    digest = sha(corpus)
    if digest != manifest['splits']['calibration']['sha256']:
        raise ValueError('Frozen calibration corpus changed')
    rows = list(map(json.loads, corpus.read_text().splitlines()))
    cases = {r['id']: r for r in rows}
    if len(cases) != len(rows):
        raise ValueError('Repeated calibration IDs')
    teacher = read_predictions(args.teacher, cases)
    if any(r['result']['model'] != 'jev-1.13.0' for r in teacher.values()):
        raise ValueError('Unexpected calibration teacher')
    base_sha = next(e['sha256'] for e in json.loads((ROOT.parent / 'checkpoint-manifest.json').read_text())['checkpoints'] if e['name'] == 'typed-decisions')
    metrics = {}
    for name in ('v1', 'v2'):
        metadata = json.loads(Path(getattr(args, name + '_report')).read_text())
        if metadata['data_manifest'] != manifest or metadata['base_sha256'] != base_sha or metadata['teacher_model'] != 'jev-1.13.0':
            raise ValueError('Unexpected candidate lineage')
        records = read_predictions(getattr(args, name), cases, metadata['output_sha256'], metadata['output_config_sha256'])
        if any(r['corpus_sha256'] != digest for r in records.values()):
            raise ValueError('Candidate calibration digest changed')
        divergences = []
        correct = 0
        for cid, case in cases.items():
            for qid, question in case['questions'].items():
                p = probabilities(question, teacher[cid]['result']['answers'][qid])
                q = probabilities(question, records[cid]['result']['answers'][qid])
                divergences.append(sum(x * math.log(max(x, 1e-8) / max(y, 1e-8)) for x, y in zip(p, q) if x > 0))
                correct += max(range(len(p)), key=p.__getitem__) == max(range(len(q)), key=q.__getitem__)
        metrics[name] = {'mean_kl_teacher_to_model': statistics.mean(divergences), 'teacher_map_agreement': correct, 'questions': len(divergences), 'weights_sha256': metadata['output_sha256']}
    selected = min(metrics, key=lambda name: metrics[name]['mean_kl_teacher_to_model'])
    result = {'calibration_sha256': digest, 'selected': selected, 'metrics': metrics, 'policy_sha256': sha(args.policy), 'policy': json.loads(Path(args.policy).read_text()), 'limitation': 'Calibration labels also fitted temperatures. This is tuning fit, not independent quality; round2 test was already inspected after round1.'}
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x') as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
