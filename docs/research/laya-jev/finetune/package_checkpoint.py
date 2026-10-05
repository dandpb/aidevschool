"""Verify the exported frozen encoder and package the trained decision layers."""
import argparse
import json
import shutil
from pathlib import Path

from train_adapter import sha


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True)
    parser.add_argument('--trained', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    base, trained, output = map(Path, (args.base, args.trained, args.output))
    if output.exists():
        raise SystemExit('Refusing existing adapter output')
    report = json.loads((trained / 'training-report.json').read_text())
    if sha(base / 'model.safetensors') != report['base_sha256']:
        raise ValueError('Base weights differ from training lineage')
    if sha(trained / 'model.safetensors') != report['output_sha256']:
        raise ValueError('Trained weights differ from export lineage')
    if sha(trained / 'rl_agent_config.json') != report['output_config_sha256']:
        raise ValueError('Trained configuration differs from export lineage')

    import torch
    from safetensors import safe_open
    from safetensors.torch import save_file

    torch.set_num_threads(1)
    head = {}
    changed = []
    encoder_count = 0
    with safe_open(str(base / 'model.safetensors'), framework='pt') as original, \
         safe_open(str(trained / 'model.safetensors'), framework='pt') as exported:
        if set(original.keys()) != set(exported.keys()):
            raise ValueError('Exported state dictionary keys changed')
        for key in original.keys():
            before, after = original.get_tensor(key), exported.get_tensor(key)
            if before.dtype != after.dtype or before.shape != after.shape:
                raise ValueError('Exported tensor format changed: ' + key)
            equal = torch.equal(before, after)
            if key.startswith('encoder.'):
                if not equal:
                    raise ValueError('Frozen encoder changed in exported weights: ' + key)
                encoder_count += 1
            else:
                head[key] = after
                if not equal:
                    changed.append(key)
    if not changed:
        raise ValueError('No decision-layer weights changed')
    output.mkdir(parents=True)
    save_file(head, str(output / 'head.safetensors'))
    for name in ('rl_agent_config.json', 'encoder', 'tokenizer', 'training-report.json'):
        source = trained / name
        if source.is_dir():
            shutil.copytree(source, output / name)
        else:
            shutil.copy2(source, output / name)
    manifest = {
        'base_sha256': report['base_sha256'],
        'trained_sha256': report['output_sha256'],
        'encoder_tensors_verified_equal': encoder_count,
        'head_tensors': len(head),
        'head_parameters': sum(t.numel() for t in head.values()),
        'changed_tensors': changed,
        'files': {str(p.relative_to(output)): sha(p) for p in sorted(output.rglob('*')) if p.is_file()},
    }
    (output / 'adapter-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({k: v for k, v in manifest.items() if k != 'files'}, indent=2))


if __name__ == '__main__':
    main()
