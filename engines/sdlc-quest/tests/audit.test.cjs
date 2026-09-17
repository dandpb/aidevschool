'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const src=process.env.QUEST_SRC||require('node:path').resolve(__dirname,'../src');
const C=require(src+'/core.js'),D=require(src+'/data.js');
const tasks=D.missions.flatMap(m=>m.tasks);
for(const t of tasks.filter(t=>t.type!=='incident')) {
 test(`F03 ${t.id}: empty submission is not a learning attempt`,()=>a.equal(C.hasAnswer(t,(['select','diff','order'].includes(t.type)?[]:['classify','gate'].includes(t.type)?{}:'')),false));
}
test('F03 partial genuine answer remains evaluable',()=>{a.equal(C.hasAnswer(tasks[0],['pain']),true);a.equal(C.hasAnswer(tasks[1],{copy:'fast'}),true);});
test('F06 incident roundtrip preserves one-action budget and history',()=>{const s=C.empty();let x=C.freshIncident();for(const act of ['diagnose','pause'])x=C.stepIncident(x,act).state;s.drafts.incident=x;const n=C.normalize(JSON.parse(JSON.stringify(s)),D);a.equal(n.drafts.incident.phase,'mitigated');a.equal(n.drafts.incident.actions,1);a.equal(C.stepIncident(n.drafts.incident,'pause').ok,false);a.equal(n.drafts.incident.log.length,3);});
test('F06 imported incident rebuilds history, never trusts supplied log or burn',()=>{const s=C.empty();s.drafts.incident={phase:'verified',actions:1,log:['<img onerror=alert(1)>'],burn:0};const n=C.normalize(s,D);a.equal(n.drafts.incident.burn,4);a.ok(n.drafts.incident.log.some(x=>x.includes('NÃO demonstrada')));a.ok(!JSON.stringify(n).includes('<img'));});
test('F06 invalid incident phase safely resets',()=>a.equal(C.restoreIncident({phase:'magic',actions:0}).phase,'alert'));
test('F07 portable backup preserves legitimate progress',()=>{const s=C.empty();C.complete(s,D,tasks[0],tasks[0].answer);s.transfer={intent:'Uma feature minha'};const restored=C.importBackup(JSON.stringify(C.makeBackup(s,D)),D);a.equal(restored.done.intent.score,100);a.equal(restored.transfer.intent,'Uma feature minha');});
for(const v of ['{broken','null','[]','{"format":"other"}','{"format":"sdlc-quest-backup","backupVersion":99}']) test(`F07 rejects malformed backup ${v}`,()=>a.throws(()=>C.importBackup(v,D),/JSON válido|Formato ou versão/));
test('F07 oversized backup rejected',()=>a.throws(()=>C.importBackup(' '.repeat(262145),D),/Backup muito grande/));
test('F07 completion flags outside contiguous progress are still rejected',()=>{const s=C.empty();s.done.patch={score:100};const n=C.importBackup(JSON.stringify(C.makeBackup(s,D)),D);a.equal(n.done.patch,undefined);});
test('F09 reflection fields bounded and unknown fields stripped',()=>{const s=C.empty();s.transfer={intent:'a'.repeat(5000),evidence:123,evil:'x'};const n=C.normalize(s,D);a.equal(n.transfer.intent.length,1600);a.equal(n.transfer.evidence,'');a.equal(n.transfer.evil,undefined);});
test('F05 every task has free concept and concrete example',()=>{for(const t of tasks){a.ok(D.primers[t.id]?.concept.length>50,t.id);a.ok(D.primers[t.id]?.example.length>30,t.id);}});
test('F08 distractor feedback explains selected error',()=>{const t=tasks[0];const r=C.validate(t,['pain','outcome','scope','promise']);a.equal(r.ok,false);a.match(r.message,/Promessa absoluta/);a.match(r.message,/garant|control/i);});
