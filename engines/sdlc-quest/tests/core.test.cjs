'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js'),D=require('../src/data.js');
const tasks=D.missions.flatMap(m=>m.tasks);
const solution=t=>t.type==='classify'?Object.fromEntries(t.items.map(i=>[i.id,i.answer])):t.type==='incident'?{phase:'complete',actions:1}:t.answer;
test('six missions, eighteen unique tasks, five bosses, six artifacts',()=>{assert.equal(D.missions.length,6);assert.equal(tasks.length,18);assert.equal(new Set(tasks.map(t=>t.id)).size,18);assert.equal(tasks.filter(t=>t.boss).length,5);assert.equal(Object.keys(D.artifacts).length,6);});
for(const task of tasks){
 test(`${task.id}: intended solution accepted`,()=>assert.equal(C.validate(task,solution(task)).ok,true));
 test(`${task.id}: empty answer rejected`,()=>assert.equal(C.validate(task,null).ok,false));
}
for(const task of tasks.filter(t=>['select','diff'].includes(t.type))){
 test(`${task.id}: duplicate selection rejected`,()=>assert.equal(C.validate(task,[...task.answer,task.answer[0]]).ok,false));
 test(`${task.id}: missing required card rejected`,()=>assert.equal(C.validate(task,task.answer.slice(1)).ok,false));
 test(`${task.id}: selecting all cards rejected`,()=>assert.equal(C.validate(task,task.options.map(o=>o.id)).ok,false));
}
for(const t of tasks.filter(t=>t.type==='choice'))for(const o of t.options.filter(o=>o.id!==t.answer))test(`${t.id}: distractor ${o.id} rejected`,()=>assert.equal(C.validate(t,o.id).ok,false));
for(const t of tasks.filter(t=>t.type==='order'))test(`${t.id}: reverse ordering rejected`,()=>assert.equal(C.validate(t,[...t.answer].reverse()).ok,false));
test('scoped patch passes four immutable fixture checks',()=>assert.equal(C.runPatch('scoped').filter(r=>r.pass).length,4));
for(const patch of ['original','skip','expect','unrecognized'])test(`${patch}: cannot conceal cross-tenant defect`,()=>{const r=C.runPatch(patch);assert.equal(r[1].pass,false);assert.equal(C.validate(tasks.find(t=>t.id==='patch'),patch).ok,false);});
for(const field of ['evidence','approval','identity','policy'])test(`release gate: incorrect ${field} blocks`,()=>{const t=tasks.find(t=>t.id==='gate');assert.equal(C.validate(t,{...t.answer,[field]:'unsafe'}).ok,false);});
test('initial state only allows first station',()=>{const s=C.empty();assert.equal(C.canOpen(s,D,0),true);for(let i=1;i<6;i++)assert.equal(C.canOpen(s,D,i),false);});
test('cannot complete a future station',()=>{const s=C.empty(),t=D.missions[2].tasks[0];assert.equal(C.complete(s,D,t,solution(t)).ok,false);assert.equal(Object.keys(s.done).length,0);});
test('cannot jump past earlier tasks in current station',()=>{const s=C.empty(),t=D.missions[0].tasks[2];assert.equal(C.complete(s,D,t,solution(t)).ok,false);});
test('normal full progression awards 1800 XP and five bosses',()=>{const s=C.empty();for(const t of tasks)assert.equal(C.complete(s,D,t,solution(t)).ok,true);assert.deepEqual({...C.stats(s,D),axes:undefined},{completed:6,done:18,total:18,xp:1800,axes:undefined,bosses:['secret','monster','weakener','editor','outage']});});
test('replay never farms XP',()=>{const s=C.empty(),t=tasks[0];C.complete(s,D,t,solution(t));const first=JSON.stringify(s.done);C.complete(s,D,t,solution(t));assert.equal(JSON.stringify(s.done),first);assert.equal(C.stats(s,D).xp,100);});
test('score deducts 15 per error and 20 once for hint, floor 40',()=>{assert.equal(C.score(0,0),100);assert.equal(C.score(1,1),65);assert.equal(C.score(100,10),40);assert.equal(C.score(-1,-1),100);});
test('normalization rejects malformed version and bounds settings',()=>{assert.equal(C.normalize('bad',D).selected,0);assert.equal(C.normalize({version:2,selected:4},D).selected,0);assert.equal(C.normalize({version:1,selected:100,sound:1,motion:false},D).selected,5);assert.equal(C.normalize({version:1,sound:1},D).sound,false);});
test('normalization strips unknown and noncontiguous completion',()=>{const s=C.normalize({version:1,done:{intent:{score:100},risk:{score:100},patch:{score:100},evil:{score:1e12}}},D);assert.equal(Object.keys(s.done).length,2);assert.equal(s.done.patch,undefined);assert.equal(s.done.evil,undefined);});
test('save restores legal drafts only',()=>{const s=C.normalize({version:1,drafts:{intent:['pain','pain','<script>bad</script>'],risk:{copy:'fast',list:'nonexistent'},gate:{evidence:'current',identity:'evil'},patch:'scoped'}},D);assert.deepEqual(s.drafts.intent,['pain']);assert.deepEqual(s.drafts.risk,{copy:'fast'});assert.deepEqual(s.drafts.gate,{evidence:'current'});assert.equal(s.drafts.patch,'scoped');});
test('save roundtrip retains progression and penalty',()=>{const s=C.empty();s.attempts.intent=1;s.hints.intent=1;C.complete(s,D,tasks[0],solution(tasks[0]));const restored=C.normalize(JSON.parse(JSON.stringify(s)),D);assert.equal(restored.done.intent.score,65);assert.equal(C.stats(restored,D).done,1);});
test('shuffle is deterministic, preserves every option and does not mutate original',()=>{const a=[1,2,3,4,5],before=[...a];assert.deepEqual(C.shuffled(a,'seed'),C.shuffled(a,'seed'));assert.deepEqual(C.shuffled(a,'seed').sort(),a);assert.deepEqual(a,before);});
test('incident rollback never authorized by bare alert',()=>{const s=C.freshIncident(),r=C.stepIncident(s,'rollback');assert.equal(r.ok,false);assert.equal(r.state.phase,'alert');assert.equal(r.state.actions,0);assert.equal(s.log.length,1);});
test('incident requires diagnosis before mitigation',()=>{const r=C.stepIncident(C.freshIncident(),'pause');assert.equal(r.ok,false);assert.equal(r.state.actions,0);});
test('incident allows one mitigation and rejects repetition',()=>{let s=C.stepIncident(C.freshIncident(),'diagnose').state;s=C.stepIncident(s,'pause').state;assert.equal(s.actions,1);const r=C.stepIncident(s,'pause');assert.equal(r.ok,false);assert.equal(r.state.actions,1);});
test('incident cannot report completion after mitigation alone',()=>{let s=C.stepIncident(C.freshIncident(),'diagnose').state;s=C.stepIncident(s,'pause').state;assert.equal(C.validate(tasks.find(t=>t.id==='incident'),s).ok,false);});
test('full bounded incident ends escalated and recorded, not recovered',()=>{let s=C.freshIncident();for(const action of ['diagnose','pause','verify','escalate','record']){const r=C.stepIncident(s,action);assert.equal(r.ok,true);s=r.state;}assert.equal(s.phase,'complete');assert.equal(s.actions,1);assert.equal(s.burn,4);assert.equal(s.log.length,6);assert.ok(s.log.some(line=>line.includes('NÃO demonstrada')));assert.equal(C.stepIncident(s,'pause').ok,false);});
test('operational artifacts are labeled simulated and unverified',()=>{const e=JSON.parse(D.artifacts['evidence.json']);assert.equal(e.productionVerified,false);assert.equal(e.realCiRun,null);assert.ok(D.artifacts['incident-intent.md'].includes('Recuperação não demonstrada'));});
