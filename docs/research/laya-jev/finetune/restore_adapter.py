"""Reconstruct the trained checkpoint from the verified official base and a head-only package."""
import argparse
import json
import shutil
from pathlib import Path
from train_adapter import sha

def main():
 p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--adapter',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 base=Path(a.base);adapter=Path(a.adapter);out=Path(a.output)
 if out.exists():raise SystemExit('Refusing existing reconstructed checkpoint')
 metadata=json.loads((adapter/'adapter-manifest.json').read_text())
 if sha(base/'model.safetensors')!=metadata['base_sha256']:raise ValueError('Wrong official base weights')
 for name,digest in metadata['files'].items():
  path=(adapter/name).resolve()
  if not path.is_relative_to(adapter.resolve()) or sha(path)!=digest:raise ValueError('Adapter package integrity mismatch')
 from safetensors.torch import load_file,save_file
 weights=load_file(str(base/'model.safetensors'))
 head=load_file(str(adapter/'head.safetensors'))
 if any(k.startswith('encoder.') or k not in weights for k in head):raise ValueError('Invalid adapter keys')
 weights.update(head)
 out.mkdir(parents=True)
 save_file(weights,str(out/'model.safetensors'))
 if sha(out/'model.safetensors')!=metadata['trained_sha256']:raise ValueError('Reconstructed weights differ from trained artifact')
 for name in ['rl_agent_config.json','encoder','tokenizer','training-report.json']:
  source=adapter/name
  if source.is_dir():shutil.copytree(source,out/name)
  else:shutil.copy2(source,out/name)
 print('Verified reconstructed checkpoint:',out)
if __name__=='__main__':main()
