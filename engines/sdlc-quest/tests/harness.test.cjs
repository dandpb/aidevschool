'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('../src/harness-core.js'),C=require('../src/core.js'),D=require('../src/data.js');
const fixed={intent:'complete',plan:'traceable',patch:'scoped',suite:'contract',runner:'normal',review:'current'};
const ids=['discover','plan','implement','verify','judge','package'];
function prepared(inputs={}){let s=H.create(null,'test-run');for(const [k,v] of Object.entries({...fixed,...inputs}))s=H.change(s,k,v);return s;}
function until(stage='package',inputs={}){let s=prepared(inputs);for(const id of ids.slice(0,ids.indexOf(stage)+1))s=H.execute(s,id);return s;}

test('harness: initial state has no current receipts or authorization',()=>{
 const s=H.create();assert.equal(s.log.length,0);assert.equal(H.status(s,'discover'),'ready');assert.equal(H.status(s,'package'),'blocked');
 assert.equal(H.report(s).summary.currentSteps,0);assert.equal(H.report(s).summary.productionAuthorized,false);
});
for(const id of ids.slice(1))test(`harness: ${id} cannot skip its predecessors`,()=>{
 const s=H.execute(prepared(),id);assert.equal(H.valid(s,id),false);assert.equal(s.log.at(-1).outcome,'blocked');assert.equal(s.failures[id],undefined);assert.equal(s.goals.order,true);
});
for(const action of ['declare','production','made-up'])test(`harness: ${action} does not create a successful receipt`,()=>{
 const s=H.execute(prepared(),action);assert.equal(Object.keys(s.receipts).length,0);assert.equal(H.report(s).summary.localPackageReady,false);
});
test('harness: declaring done cannot overwrite a failed result',()=>{
 let s=H.execute(H.create(),'discover');s=H.execute(s,'declare');assert.equal(s.receipts.discover.status,'failed');assert.equal(s.goals.claim,true);
});
test('harness: correct pipeline creates six current step-bound receipts',()=>{
 const s=until();assert.equal(H.report(s).summary.currentSteps,6);
 for(const id of ids){assert.equal(H.valid(s,id),true);assert.equal(s.receipts[id].step,id);assert.equal(s.receipts[id].runId,'test-run');assert.equal(s.receipts[id].toolkitExecuted,false);}
 assert.equal(s.receipts.judge.evidence.verifierEvent,s.receipts.verify.event);
});
test('harness: input handlers and execution do not mutate previous state',()=>{
 const s=prepared(),before=JSON.stringify(s);H.change(s,'intent','incomplete');H.execute(s,'discover');assert.equal(JSON.stringify(s),before);
});
test('harness: done=true fixture does not satisfy discovery content',()=>{
 const s=H.execute(H.create(),'discover');assert.equal(s.receipts.discover.checks.filter(c=>c.pass).length,0);assert.equal(s.failures.discover,1);
});
test('harness: plan omitting negative tests fails independently of file existence',()=>{
 const s=until('plan',{plan:'happy'});assert.equal(s.receipts.plan.status,'failed');assert.deepEqual(s.receipts.plan.checks.filter(c=>!c.pass).map(c=>c.id),['cross-a','cross-b','missing']);
});
for(const patch of ['original','scoped','denyAll'])test(`harness: materializing ${patch} is not verification`,()=>{
 const s=until('implement',{patch});assert.equal(H.valid(s,'implement'),true);assert.equal(H.valid(s,'verify'),false);assert.equal(s.lastTests,null);
});
test('harness: full contract executes 15 actual assertions across three versions',()=>{
 const s=until('verify');assert.equal(s.receipts.verify.checks.length,15);
 assert.deepEqual(s.lastTests.versions.map(v=>v.exitCode),[1,0,1]);
 assert.deepEqual(s.lastTests.versions.map(v=>v.checks.filter(c=>!c.pass).length),[2,0,2]);
 assert.equal(s.receipts.verify.status,'passed');
});
for(const patch of ['original','denyAll'])test(`harness: candidate ${patch} cannot pass the complete verifier`,()=>{
 const s=until('verify',{patch});assert.equal(H.valid(s,'verify'),false);assert.equal(H.valid(H.execute(s,'judge'),'judge'),false);assert.equal(s.goals.bug,true);
});
for(const suite of ['happy','placebo'])test(`harness: all-green insufficient suite ${suite} rejected`,()=>{
 const s=until('verify',{suite});assert.equal(s.receipts.verify.status,'failed');assert.ok(s.lastTests.versions[0].checks.every(c=>c.pass));assert.equal(s.lastTests.versions[1].exitCode,0);
});
for(const runner of ['crash','unavailable'])test(`harness: ${runner} cannot turn zero results into success`,()=>{
 const s=until('verify',{runner});assert.equal(s.receipts.verify.status,'failed');assert.equal(s.receipts.verify.checks.length,0);assert.equal(H.valid(s,'verify'),false);assert.equal(s.receipts.verify.evidence.injected,true);
});
for(const review of ['self','stale','blocker'])test(`harness: rejects ${review} review`,()=>{
 const s=until('judge',{review});assert.equal(s.receipts.judge.status,'failed');assert.equal(H.valid(H.execute(s,'package'),'package'),false);
});
test('harness: accepted review is explicitly a simulation, not an independent agent',()=>{
 const s=until('judge');assert.equal(s.receipts.judge.independentReview,false);assert.equal(s.receipts.judge.evidence.simulatedReviewer,true);
});
for(const [key,newValue,from] of [['intent','incomplete',0],['plan','happy',1],['patch','original',2],['suite','happy',3],['runner','crash',3],['review','self',4]])test(`harness: changing ${key} invalidates only dependent steps`,()=>{
 const s=H.change(until(),key,newValue);
 for(let i=0;i<6;i++){assert.equal(H.valid(s,ids[i]),i<from);if(i>=from)assert.equal(H.status(s,ids[i]),'stale');}
 assert.equal(H.report(s).summary.localPackageReady,false);assert.equal(s.goals.stale,true);
});
test('harness: reverting code still requires new receipts for a new revision',()=>{
 let s=until();const before=s.revisions[2];s=H.change(s,'patch','original');s=H.change(s,'patch','scoped');
 assert.equal(s.revisions[2],before+2);assert.equal(H.valid(s,'verify'),false);for(const id of ids.slice(2))s=H.execute(s,id);assert.equal(H.valid(s,'package'),true);
});
test('harness: editing a field to its current value retains valid receipts',()=>{
 const s=until();assert.deepEqual(H.change(s,'patch','scoped'),s);
});
for(const id of ids.slice(0,5))test(`harness: reexecuting ${id} supersedes downstream receipts`,()=>{
 const s=H.execute(until(),id),index=ids.indexOf(id);
 assert.equal(H.valid(s,id),true);for(const next of ids.slice(index+1))assert.equal(H.valid(s,next),false);
});
test('harness: three failed executions halt; editing cannot bypass budget',()=>{
 let s=until('verify',{patch:'original'});s=H.execute(s,'verify');s=H.execute(s,'verify');
 assert.equal(s.failures.verify,3);assert.equal(s.halted,true);assert.equal(s.goals.budget,true);
 s=H.change(s,'patch','scoped');s=H.execute(s,'implement');assert.equal(s.log.at(-1).outcome,'blocked');assert.equal(s.halted,true);
});
test('harness: new run retains inputs but no passed receipts, budgets or goals',()=>{
 const old=until(),s=H.create(H.draft(old),'new-run');assert.deepEqual(s.inputs,old.inputs);assert.equal(Object.keys(s.receipts).length,0);assert.equal(s.halted,false);assert.deepEqual(s.goals,{});
});
test('harness: exported report is untrusted local diagnostics, not a release approval',()=>{
 const r=H.report(until());assert.equal(r.format,'quest-harness-demo');assert.equal(r.summary.localPackageReady,true);assert.equal(r.summary.productionAuthorized,false);assert.equal(r.summary.toolkitExecuted,false);assert.equal(r.summary.independentReviewerExecuted,false);
 assert.equal(r.sourceRepository.status,'not-inspected');assert.equal(r.sourceRepository.integration,'pending-source-access');
});
test('harness: production still denied after six passes',()=>{
 const s=H.execute(until(),'production');assert.equal(s.log.at(-1).outcome,'denied');assert.equal(H.report(s).summary.productionAuthorized,false);
});
test('harness: runtime timeline has monotonic sequence and records denied actions',()=>{
 let s=prepared();s=H.execute(s,'package');s=H.execute(s,'declare');for(const id of ids)s=H.execute(s,id);
 assert.ok(s.log.every((e,i)=>!i||e.seq>s.log[i-1].seq));assert.ok(s.log.some(e=>e.outcome==='blocked'));assert.ok(s.log.some(e=>e.outcome==='rejected'));
});
test('harness: journal bounded without reusing sequence IDs',()=>{
 let s=prepared();for(let i=0;i<210;i++)s=H.execute(s,'declare');assert.equal(s.log.length,160);assert.ok(s.log[0].seq>1);assert.equal(s.log.at(-1).seq,s.sequence);
});
for(const raw of [null,[],{},'x',{version:0,inputs:fixed},{version:1,inputs:{patch:'<img src=x onerror=alert(1)>'}}])test(`harness: draft parser rejects unsupported content ${JSON.stringify(raw).slice(0,60)}`,()=>{
 const s=H.create(raw);assert.equal(s.inputs.patch,'original');assert.equal(Object.keys(s.receipts).length,0);
});
for(const [k,v] of [['__proto__','polluted'],['patch','<script>'],['review','official-approved'],['runner',null]])test(`harness: ignores injected input ${k}=${v}`,()=>{
 const s=H.change(prepared(),k,v);assert.deepEqual(s.inputs,fixed);assert.equal(s.log.at(-1).outcome,'rejected');
});
test('harness: draft import never restores fabricated receipts or production authority',()=>{
 const s=H.create({version:1,inputs:fixed,receipts:until().receipts,productionAuthorized:true,halted:false,goals:{package:true}});
 assert.equal(H.report(s).summary.currentSteps,0);assert.equal(H.report(s).summary.productionAuthorized,false);
});
test('harness: combined backup carries old progress and harness inputs, not receipts',()=>{
 const s=C.empty();s.harness=H.draft(until());s.tlc.done['tlc-situation']={score:100,at:'fixture'};
 const backup=C.makeBackup(s,D),loaded=C.importBackup(JSON.stringify(backup),D);
 assert.equal(backup.appVersion,'1.3.0');assert.equal(loaded.harness.inputs.patch,'scoped');assert.equal(loaded.tlc.done['tlc-situation'].score,100);
 assert.equal(H.report(H.create(loaded.harness)).summary.currentSteps,0);assert.equal(has(loaded.harness,'receipts'),false);
});
function has(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
test('harness: v1.2 and v1.1 backups start new lab without loss of their formats',()=>{
 for(const v of ['1.1.0','1.2.0']){
  const old={format:'sdlc-quest-backup',backupVersion:1,appVersion:v,state:{version:1,done:{},transfer:{intent:'Uma feature existente'}}};
  const state=C.importBackup(JSON.stringify(old),D);assert.equal(state.transfer.intent,'Uma feature existente');assert.deepEqual(state.harness,H.emptyDraft());
 }
});
test('harness: report has no references to actual external runs',()=>{
 const report=H.report(until());for(const r of Object.values(report.receipts)){assert.equal(r.execution,'quest-local-teaching');assert.equal(r.toolkitExecuted,false);}
});
