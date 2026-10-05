"""Compare identical inputs, showing teacher agreement apart from semantic labels."""
import argparse
import json
import math
import statistics
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent))
from validation import input_digest,validate_result
from analyze import score_answer
from train_adapter import sha

def read_predictions(path,cases,weights=None,config=None):
 records=[json.loads(l) for l in Path(path).read_text().splitlines()]
 if len(records)!=len(cases):raise ValueError('Incomplete evaluation coverage')
 seen={}
 for record in records:
  cid=record['id']
  if cid not in cases or cid in seen or record['input_sha256']!=input_digest(cases[cid]) or record['status']!='ok':raise ValueError('Invalid prediction provenance')
  validate_result(cases[cid],record['result'])
  if weights is not None and record.get('weights_sha256')!=weights:raise ValueError('Unexpected checkpoint hash')
  if config is not None and record.get('config_sha256')!=config:raise ValueError('Unexpected configuration hash')
  seen[cid]=record
 return seen

def probabilities(question,answer):
 if question['type']=='noul':return [1-answer['noul'],answer['noul']]
 keys=list(question['criteria']) if question['type']=='choice' else [str(i) for i in range(len(question['criteria']))]
 values=[answer['probabilities'][k] for k in keys];total=sum(values)
 return [v/total for v in values]

def report(cases,student,teacher):
 groups={};details=[];manual=[];mae=[];kl=[];rank_groups={}
 for cid,case in cases.items():
  result=student[cid]['result']['answers'];target=teacher[cid]['result']['answers']
  for qid,q in case['questions'].items():
   answer=result[qid];reference=target[qid];p=probabilities(q,reference);v=probabilities(q,answer)
   if q['type']=='choice':agree=answer['choice']==reference['choice']
   elif q['type']=='noul':agree=(answer['noul']>=.5)==(reference['noul']>=.5)
   else:agree=max(range(len(v)),key=v.__getitem__)==max(range(len(p)),key=p.__getitem__);mae.append(abs(answer['score']-reference['score']))
   divergence=sum(x*math.log(max(x,1e-8)/max(y,1e-8)) for x,y in zip(p,v) if x>0);kl.append(divergence)
   for label in ['all','suite:'+case['suite'],'language:'+case['language'],'type:'+q['type']]:groups.setdefault(label,[]).append(agree)
   detail={'case':cid,'question':qid,'teacher_agreement':agree,'teacher':reference,'answer':answer,'kl_teacher_to_model':divergence}
   if qid in case.get('expected',{}):
    correct=score_answer(q,answer,case['expected'][qid]);manual.append(correct);detail.update(expected=case['expected'][qid],semantic_correct=correct)
   details.append(detail)
  if case['suite']=='recommendation':
   rank=rank_groups.setdefault(case['goal_group'],{'expected':case['target_engine'],'scores':{}})
   rank['scores'][case['candidate_engine']]=result['match']['score']
  elif 'expected_top_engine' in case:
   rank_groups[cid]={'expected':case['expected_top_engine'],'scores':{e['id']:result[f'e{i}']['score'] for i,e in enumerate(case['state']['engines'])}}
 rankings=[]
 for group,r in rank_groups.items():
  if len(r['scores'])!=13:raise ValueError('Incomplete recommendation candidate coverage')
  order=sorted(r['scores'],key=lambda k:(-r['scores'][k],k))
  rankings.append({'group':group,'expected':r['expected'],'ranked':order,'top1_correct':order[0]==r['expected'],'top3_correct':r['expected'] in order[:3]})
 return {'questions':len(details),'teacher_agreement':{key:{'correct':sum(v),'n':len(v),'rate':sum(v)/len(v)} for key,v in groups.items()},'semantic_labels':{'correct':sum(manual),'n':len(manual),'accuracy':sum(manual)/len(manual) if manual else None},'score_mae_to_teacher':statistics.mean(mae) if mae else None,'mean_kl_teacher_to_model':statistics.mean(kl),'rankings':rankings,'details':details}

def main():
 p=argparse.ArgumentParser();p.add_argument('--corpus',required=True);p.add_argument('--teacher',required=True);p.add_argument('--base',required=True);p.add_argument('--trained',required=True);p.add_argument('--training-report',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 out=Path(a.output)
 if out.exists():raise SystemExit('Refusing existing analysis output')
 rows=[json.loads(l) for l in Path(a.corpus).read_text().splitlines()];cases={r['id']:r for r in rows}
 if len(cases)!=len(rows):raise ValueError('Repeated corpus IDs')
 digest=sha(a.corpus)
 if Path(a.corpus).name=='dataset.jsonl':expected=(ROOT.parent/'dataset.sha256').read_text().split()[0]
 else:expected=json.loads((ROOT/'data-manifest.json').read_text())['splits']['test']['sha256']
 if digest!=expected:raise ValueError('Frozen evaluation corpus mismatch')
 metadata=json.loads(Path(a.training_report).read_text())
 weights=next(e['sha256'] for e in json.loads((ROOT.parent/'checkpoint-manifest.json').read_text())['checkpoints'] if e['name']=='typed-decisions')
 if metadata.get('base_sha256')!=weights or metadata.get('teacher_model')!='jev-1.13.0' or metadata.get('data_manifest')!=json.loads((ROOT/'data-manifest.json').read_text()):raise ValueError('Training lineage differs from pinned experiment')
 if not metadata.get('base_config_sha256'):raise ValueError('Missing baseline configuration provenance')
 teacher=read_predictions(a.teacher,cases)
 if any(r['result']['model']!='jev-1.13.0' for r in teacher.values()):raise ValueError('Unexpected teacher identity')
 base=read_predictions(a.base,cases,weights,metadata['base_config_sha256'])
 trained=read_predictions(a.trained,cases,metadata['output_sha256'],metadata['output_config_sha256'])
 for records in [base,trained]:
  if any(r.get('corpus_sha256')!=digest for r in records.values()):raise ValueError('Recorded corpus hash differs')
 reports={name:report(cases,records,teacher) for name,records in [('base',base),('trained',trained),('teacher',teacher)]}
 summary={'corpus_sha256':digest,'base_sha256':weights,'trained_sha256':metadata['output_sha256'],'teacher_model':'jev-1.13.0','rows':len(rows),'reports':reports,'limitations':['Synthetic correlated examples share intents/components across split wording families.','Teacher agreement is imitation, not independent ground truth.','Head training and separate temperature calibration measured together.','Same-format comparison separates input reformulation from the trained pipeline.']}
 out.parent.mkdir(parents=True,exist_ok=True)
 with out.open('x') as f:json.dump(summary,f,ensure_ascii=False,indent=2)
 print(json.dumps({name:{'agreement':r['teacher_agreement']['all'],'semantic':r['semantic_labels'],'score_mae':r['score_mae_to_teacher'],'top1':sum(x['top1_correct'] for x in r['rankings']),'rankings':len(r['rankings'])} for name,r in reports.items()},indent=2))
if __name__=='__main__':main()
