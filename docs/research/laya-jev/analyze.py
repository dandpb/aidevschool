"""Summarize only successful, schema-valid live answers, preserving missing coverage."""
import argparse
import json
import math
import statistics
from pathlib import Path
from paths import ROOT, OUTPUT_ROOT
from validation import load_corpus, validate_records


def quantile(values,p):
    if not values: return None
    values=sorted(values);pos=(len(values)-1)*p;lo=int(pos);hi=math.ceil(pos)
    return values[lo]+(values[hi]-values[lo])*(pos-lo)

def wilson(k,n):
    if not n:return None
    z=1.96;p=k/n;denom=1+z*z/n
    center=(p+z*z/(2*n))/denom
    half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom
    return [center-half,center+half]

def score_answer(question,answer,expected):
    kind=question['type']
    if kind=='choice':return answer['choice']==expected
    if kind=='noul':return (answer['noul']>=0.5)==expected
    probs=answer.get('probabilities',{})
    # Ordinal exact accuracy uses MAP, not rounding the expected-value score.
    if not probs:return None
    return int(max(probs,key=probs.get))==expected

def main():
    p=argparse.ArgumentParser();p.add_argument('--files',nargs='+');p.add_argument('--output',default=str(OUTPUT_ROOT/'summary.json'));args=p.parse_args()
    cases, corpus_digest = load_corpus()
    target=Path(args.output)
    if target.exists(): raise SystemExit(f'Refusing to overwrite evidence: {target}')
    files=[Path(f) for f in args.files] if args.files else sorted((ROOT/'evidence').glob('*-*.jsonl'))
    reports={};paired={}
    for path in files:
        records=[json.loads(s) for s in path.read_text().splitlines() if s.strip()]
        validate_records(records, cases, corpus_digest)
        successful=[r for r in records if r['status']=='ok'];details=[];groups={};score_errors=[];top_engine=[]
        for record in successful:
            c=cases[record['id']];answers=record['result']['answers']
            for qid,expected in c['expected'].items():
                q=c['questions'][qid];a=answers[qid];correct=score_answer(q,a,expected)
                row={'case':c['id'],'question':qid,'suite':c['suite'],'language':c['language'],'kind':q['type'],'expected':expected,'answer':a,'correct':correct};details.append(row)
                if correct is not None:
                    for label in ['all',f'kind:{q["type"]}',f'language:{c["language"]}',f'suite:{c["suite"]}']:
                        groups.setdefault(label,[]).append(correct)
                    paired.setdefault((c['id'],qid),set()).add(record['backend'])
                if q['type']=='score':score_errors.append(abs(a['score']-expected))
            if 'expected_top_engine' in c:
                engine_scores={e['id']:answers[f'e{i}']['score'] for i,e in enumerate(c['state']['engines'])}
                ranked=sorted(engine_scores,key=lambda k:(-engine_scores[k],k))
                top_engine.append({'case':c['id'],'expected':c['expected_top_engine'],'ranked':ranked,'top1_correct':ranked[0]==c['expected_top_engine'],'top3_correct':c['expected_top_engine'] in ranked[:3]})
        latency=[r['elapsed_ms'] for r in successful]
        reports[path.stem]={'attempted_requests':len(records),'successful_requests':len(successful),'planned_requests':len(cases),'coverage':len(successful)/len(cases),'quality_measured':bool(successful),
            'validation_scope':'v2_input_schema_checkpoint_timing' if successful and all(r.get('format_version') == 2 for r in successful) else 'legacy_input_and_schema_only',
            'accuracy':{k:{'n':len(v),'correct':sum(v),'accuracy':sum(v)/len(v),'wilson95':wilson(sum(v),len(v))} for k,v in groups.items()},
            'score_mae':statistics.mean(score_errors) if score_errors else None,'elapsed_ms':{'p50':quantile(latency,.5),'p95':quantile(latency,.95)},
            'timing':{field:{'n':len(values),'p50':quantile(values,.5),'p95':quantile(values,.95)} for field in ['load_ms','warmup_ms','warm_inference_ms','http_roundtrip_ms'] for values in [[r[field] for r in successful if r.get(field) is not None]]},
            'responded_models':sorted({r['result']['model'] for r in successful}),
            'selected_checkpoints':sorted({r['checkpoint'] for r in successful if r.get('checkpoint')}),
            'truncated_cases':[r['id'] for r in successful if r['result'].get('usage',{}).get('truncated')],
            'errors':[{'id':r['id'],'error_class':r['error_class'],'error':r['error']} for r in records if r['status']!='ok'], 'details':details,'engine_rankings':top_engine}
    paired_count=sum(v == {'laya', 'jev'} for v in paired.values())
    summary={'corpus_sha256':corpus_digest,'evidence_validated':True,'planned_requests':len(cases),'planned_questions':sum(len(c['questions']) for c in cases.values()),'labelled_answers':sum(len(c['expected']) for c in cases.values()),'paired_labelled_answers':paired_count,'results':reports,
        'limitations':['Hand-authored diagnostic corpus; labels were not independently adjudicated.','Translated pairs are correlated; per-answer Wilson intervals are descriptive, not population claims.','HTTP roundtrip includes provider inference and transport; they cannot be decomposed without provider telemetry. Legacy elapsed-only records do not establish warm inference timing.','No result means missing measurement; zero coverage is not zero model accuracy.']}
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('x') as handle: handle.write(json.dumps(summary,ensure_ascii=False,indent=2))
    print(json.dumps({'paired_labelled_answers':paired_count,'successful_requests':{k:v['successful_requests'] for k,v in reports.items()}},indent=2))

if __name__=='__main__':main()
