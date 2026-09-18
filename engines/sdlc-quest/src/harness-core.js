/* SDLC Quest's own teaching runtime. NOT dandpb/harness-toolkit code or API.
 * This state machine controls the in-memory exercise, not a hostile user,
 * a real agent, CI, a filesystem, cloud credentials or production.
 * User-facing messages are bilingual: optional lang argument, default pt-BR. */
(function(root){
'use strict';
const TLC=typeof module==='object'&&module.exports?require('./tlc-core.js'):root.QuestTLC;
const L=typeof module==='object'&&module.exports?require('./lang.js'):root.QuestLang;
const REPO='https://github.com/dandpb/harness-toolkit';
const POLICY='quest-local-contract-v1';
const LIMIT=3;
const STRINGS={
pt:{
 inputRejected:'Entrada desconhecida; nada foi executado.',
 inputChanged:'Entrada alterada. Recibos dependentes precisam de nova execução.',
 declareRejected:'“Terminei” é uma declaração. Nenhum recibo de execução foi criado.',
 productionDenied:'Sem executor externo configurado e sem autorização autenticada. Produção não foi acionada.',
 unknownStep:'Etapa desconhecida.',
 budgetHalted:'Orçamento esgotado. Esta execução está encerrada para novos passos.',
 budgetEscalated:'Três falhas nesta etapa. Execução interrompida: revise o problema antes de iniciar outra execução.',
 preconditions:'Pré-condições não satisfeitas: ',
 planCheckLabel:id=>'Critério ligado ao check '+id,
 discoverOk:'Intenção do exercício contém problema, resultado, escopo e pergunta aberta.',
 discoverFail:'Um campo done:true não substitui os quatro conteúdos exigidos.',
 planOk:'Os cinco comportamentos estão ligados a checks conhecidos.',
 planFail:'A matriz omite casos negativos de tenant ou de ID ausente.',
 implementLabel:'Candidata conhecida selecionada em memória',
 implementOk:r=>'Candidata r'+r+' materializada. Implementar não significa que os testes passaram.',
 verifyUnavailable:'Verificador indisponível (falha injetada). Zero checks não equivale a sucesso.',
 verifyCrash:'Exceção injetada no verificador',
 verifyError:m=>'Erro de execução não vira aprovação: '+m+'.',
 verifyOk:'15 asserções executadas: baseline defeituosa reprovada, candidata aprovada e mutante “nega tudo” reprovado.',
 verifyFail:'O verificador executou, mas a prova foi reprovada. Inspecione resultados, cobertura e mutante.',
 judgeRole:'Parecer não é autodeclaração do autor',
 judgeRevision:'Parecer ligado à candidata e à verificação atuais',
 judgeBlockers:'Sem bloqueador aberto na fixture de revisão',
 judgeOk:'Parecer didático confere com esta revisão. Nenhum the-judge real ou revisor independente foi executado.',
 judgeFail:'Parecer recusado: autodeclaração, revisão antiga ou bloqueador aberto.',
 packageLabel:title=>'Recibo atual de '+title,
 packageOk:'Pacote local pronto. A autorização de produção permanece AUSENTE.'
},
en:{
 inputRejected:'Unknown input; nothing was executed.',
 inputChanged:'Input changed. Dependent receipts need a new execution.',
 declareRejected:'“Done” is a claim. No execution receipt was created.',
 productionDenied:'No external executor configured and no authenticated authorization. Production was not triggered.',
 unknownStep:'Unknown step.',
 budgetHalted:'Budget spent. This run is closed to new steps.',
 budgetEscalated:'Three failures in this step. Execution halted: review the problem before starting another run.',
 preconditions:'Preconditions not satisfied: ',
 planCheckLabel:id=>'Criterion bound to check '+id,
 discoverOk:'The exercise intent contains problem, outcome, scope and an open question.',
 discoverFail:'A done:true field does not replace the four required contents.',
 planOk:'The five behaviors are bound to known checks.',
 planFail:'The matrix omits negative tenant or missing-ID cases.',
 implementLabel:'Known candidate selected in memory',
 implementOk:r=>'Candidate r'+r+' materialized. Implementing does not mean the tests passed.',
 verifyUnavailable:'Verifier unavailable (injected failure). Zero checks is not success.',
 verifyCrash:'Exception injected in the verifier',
 verifyError:m=>'An execution error does not become an approval: '+m+'.',
 verifyOk:'15 assertions executed: faulty baseline rejected, candidate approved, “deny everything” mutant rejected.',
 verifyFail:'The verifier ran, but the proof was rejected. Inspect results, coverage and the mutant.',
 judgeRole:'A review is not the author’s self-claim',
 judgeRevision:'Review bound to the current candidate and verification',
 judgeBlockers:'No open blocker in the review fixture',
 judgeOk:'The teaching review matches this revision. No real the-judge or independent reviewer was executed.',
 judgeFail:'Review refused: self-claim, stale review or open blocker.',
 packageLabel:title=>'Current receipt for '+title,
 packageOk:'Local package ready. Production authorization remains ABSENT.'
}};
const M=(lang,k,...args)=>{const v=(lang==='en'?STRINGS.en[k]:undefined)??STRINGS.pt[k];return typeof v==='function'?v(...args):v;};
const STEPS=Object.freeze([
 {id:'discover',title:'Descobrir',title_en:'Discover',skill:'tlc-discover',artifact:'intenção do exercício',artifact_en:'exercise intent',subtitle:'Problema antes da solução.',subtitle_en:'Problem before solution.'},
 {id:'plan',title:'Planejar',title_en:'Plan',skill:'tlc-plan',artifact:'matriz de aceitação',artifact_en:'acceptance matrix',subtitle:'Cada contrato precisa de uma prova.',subtitle_en:'Every contract needs a proof.'},
 {id:'implement',title:'Implementar',title_en:'Implement',skill:'tlc-implement',artifact:'candidata em memória',artifact_en:'candidate in memory',subtitle:'Uma revisão identificável.',subtitle_en:'One identifiable revision.'},
 {id:'verify',title:'Verificar',title_en:'Verify',skill:'verificador local',artifact:'15 asserções JavaScript',artifact_en:'15 JavaScript assertions',subtitle:'Execute. Não apenas declare.',subtitle_en:'Execute. Do not just declare.'},
 {id:'judge',title:'Revisar',title_en:'Review',skill:'the-judge · simulado',artifact:'revisão da candidata',artifact_en:'candidate review',subtitle:'O parecer precisa ser atual.',subtitle_en:'The review must be current.'},
 {id:'package',title:'Empacotar',title_en:'Package',skill:'gate local do Quest',artifact:'recibos + timeline',artifact_en:'receipts + timeline',subtitle:'Pronto localmente não é deploy.',subtitle_en:'Locally ready is not a deploy.'}
].map(Object.freeze));
const OPTIONS=Object.freeze({intent:['incomplete','complete'],plan:['happy','traceable'],patch:['original','scoped','denyAll'],suite:['happy','contract','placebo'],runner:['normal','unavailable','crash'],review:['self','stale','blocker','current']});
const DEFAULTS=Object.freeze({intent:'incomplete',plan:'happy',patch:'original',suite:'happy',runner:'normal',review:'self'});
const DEPTH=Object.freeze({intent:0,plan:1,patch:2,suite:3,runner:3,review:4});
const clone=x=>JSON.parse(JSON.stringify(x));
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const known=id=>STEPS.some(s=>s.id===id);
const now=()=>new Date().toISOString();
function emptyDraft(){return {version:1,inputs:{...DEFAULTS},selected:0};}
function normalizeDraft(raw){
 const d=emptyDraft();if(!obj(raw)||raw.version!==1)return d;
 for(const key of Object.keys(OPTIONS))if(OPTIONS[key].includes(raw.inputs?.[key]))d.inputs[key]=raw.inputs[key];
 if(Number.isInteger(raw.selected))d.selected=Math.max(0,Math.min(5,raw.selected));return d;
}
function create(raw,runId){
 const d=normalizeDraft(raw);
 return {version:1,runId:runId||('quest-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)),inputs:d.inputs,selected:d.selected,revisions:[1,1,1,1,1,1],receipts:{},failures:{},halted:false,log:[],sequence:0,goals:{},lastTests:null,restored:!!raw};
}
function draft(s){return normalizeDraft({version:1,inputs:s.inputs,selected:s.selected});}
function binding(s,index){
 // Exact data/revision comparison, not a digital signature or cryptographic proof.
 return JSON.stringify({policy:POLICY,revisions:s.revisions.slice(0,index+1),inputs:Object.fromEntries(Object.keys(OPTIONS).filter(k=>DEPTH[k]<=index).map(k=>[k,s.inputs[k]]))});
}
function valid(s,id){
 const i=STEPS.findIndex(t=>t.id===id);if(i<0)return false;
 const r=s.receipts[id];return !!r&&r.status==='passed'&&r.binding===binding(s,i)&&STEPS.slice(0,i).every(t=>valid(s,t.id));
}
function status(s,id){
 const i=STEPS.findIndex(t=>t.id===id);if(i<0)return 'unknown';
 const r=s.receipts[id];if(r&&(r.status==='stale'||r.binding!==binding(s,i)))return 'stale';
 if(valid(s,id))return 'passed';if(r?.status==='failed')return 'failed';
 return s.halted||!STEPS.slice(0,i).every(t=>valid(s,t.id))?'blocked':'ready';
}
function log(s,action,outcome,message,extra={}){
 const e={seq:++s.sequence,at:now(),runId:s.runId,action,outcome,message,...extra};
 s.log.push(e);if(s.log.length>160)s.log.shift();return e;
}
function invalidate(s,index){
 for(const step of STEPS.slice(index)){const r=s.receipts[step.id];if(r)r.status='stale';}
 if(index<=3&&s.lastTests)s.lastTests.stale=true;
}
function change(current,key,value,lang='pt'){
 const s=clone(current);
 if(!has(OPTIONS,key)||!OPTIONS[key].includes(value)){log(s,'input','rejected',M(lang,'inputRejected'));return s;}
 if(s.inputs[key]===value)return s;
 const index=DEPTH[key],hadProof=STEPS.slice(index).some(t=>valid(s,t.id));
 s.inputs[key]=value;s.revisions[index]++;invalidate(s,index);
 if(hadProof)s.goals.stale=true;
 log(s,'input:'+key,'changed',M(lang,'inputChanged'),{value,codeRevision:s.revisions[2]});return s;
}
const intentArtifacts={
 incomplete:{title:'Adicionar retry',done:true},
 complete:{problem:'Suporte depende da engenharia para reenviar webhooks.',outcome:'Administrador solicita retry e acompanha o resultado.',scope:'Apenas entregas do próprio tenant; sem reenvio em massa.',question:'Como tratar resposta perdida e possível duplicação no destino?'}
};
const criteria=Object.freeze(['own-a','own-b','cross-a','cross-b','missing']);
const code={
 original:'(id, tenant) => rows.find(row => row.id === id) ?? null',
 scoped:'(id, tenant) => rows.find(row => row.id === id && row.tenant === tenant) ?? null',
 denyAll:'(id, tenant) => null'
};
function checksDiscover(s){const a=intentArtifacts[s.inputs.intent];return ['problem','outcome','scope','question'].map(id=>({id,label:id,pass:typeof a[id]==='string'&&a[id].trim().length>0}));}
function checksPlan(s,lang){const covered=s.inputs.plan==='traceable'?criteria:criteria.slice(0,2);return criteria.map(id=>({id,label:M(lang,'planCheckLabel',id),pass:covered.includes(id)}));}
function result(s,id,ok,checks,message,evidence={},lang='pt'){
 const i=STEPS.findIndex(t=>t.id===id);
 // A new execution receipt supersedes downstream reviews, even for unchanged inputs.
 invalidate(s,i+1);
 const event=log(s,id,ok?'passed':'failed',message);
 s.receipts[id]={step:id,status:ok?'passed':'failed',binding:binding(s,i),runId:s.runId,event: event.seq,at:event.at,codeRevision:s.revisions[2],policy:POLICY,checks,evidence,execution:'quest-local-teaching',toolkitExecuted:false,independentReview:false};
 if(!ok){
  s.failures[id]=(s.failures[id]||0)+1;invalidate(s,i+1);
  if(s.failures[id]>=LIMIT){s.halted=true;log(s,'budget','escalated',M(lang,'budgetEscalated'));s.goals.budget=true;}
 }
 return s;
}
function execute(current,id,lang='pt'){
 const s=clone(current);
 if(id==='declare'){s.goals.claim=true;log(s,'declare','rejected',M(lang,'declareRejected'));return s;}
 if(id==='production'){s.goals.authority=true;log(s,'production','denied',M(lang,'productionDenied'));return s;}
 if(!known(id)){log(s,'unknown','rejected',M(lang,'unknownStep'));return s;}
 const index=STEPS.findIndex(t=>t.id===id);s.selected=index;
 if(s.halted){log(s,id,'blocked',M(lang,'budgetHalted'));return s;}
 const missing=STEPS.slice(0,index).filter(t=>!valid(s,t.id)).map(t=>L.field(t,'title',lang));
 if(missing.length){s.goals.order=true;log(s,id,'blocked',M(lang,'preconditions')+missing.join(', ')+'.');return s;}
 if(id==='discover'){
  const checks=checksDiscover(s);return result(s,id,checks.every(c=>c.pass),checks,checks.every(c=>c.pass)?M(lang,'discoverOk'):M(lang,'discoverFail'),{artifact:clone(intentArtifacts[s.inputs.intent]),scope:'Validação estrutural de uma fixture didática, não aprovação do produto.'},lang);
 }
 if(id==='plan'){
  const checks=checksPlan(s,lang);return result(s,id,checks.every(c=>c.pass),checks,checks.every(c=>c.pass)?M(lang,'planOk'):M(lang,'planFail'),{criteria:criteria.map(id=>({id,check:s.inputs.plan==='traceable'||id.startsWith('own-')?id:null}))},lang);
 }
 if(id==='implement')return result(s,id,true,[{id:'materialized',label:M(lang,'implementLabel'),pass:has(code,s.inputs.patch)}],M(lang,'implementOk',s.revisions[2]),{source:code[s.inputs.patch],patch:s.inputs.patch,scope:'Seleção de função predefinida; não é execução de uma skill ou edição de repositório.'},lang);
 if(id==='verify'){
  try{
   if(s.inputs.runner==='unavailable')return result(s,id,false,[],M(lang,'verifyUnavailable'),{error:'unavailable',injected:true},lang);
   if(s.inputs.runner==='crash')throw new Error(M(lang,'verifyCrash'));
   const r=TLC.runLab(s.inputs.suite,s.inputs.patch,lang);
   s.lastTests={...r,codeRevision:s.revisions[2],policy:POLICY,stale:false};
   const checks=r.versions.flatMap(v=>v.checks.map(c=>({...c,id:v.id+':'+c.id,version:v.id})));
   const ok=r.ok&&checks.length===15;
   if(ok)s.goals.executed=true;else if(r.versions[1]?.exitCode===1)s.goals.bug=true;
   return result(s,id,ok,checks,ok?M(lang,'verifyOk'):M(lang,'verifyFail'),{suite:s.inputs.suite,verdicts:r.versions.map(v=>({version:v.id,exitCode:v.exitCode})),scope:'Consultas em memória. Não testa HTTP, autenticação, concorrência ou infra.'},lang);
  }catch(e){return result(s,id,false,[],M(lang,'verifyError',e.message),{error:'injected-crash',injected:true},lang);}
 }
 if(id==='judge'){
  const variant=s.inputs.review;
  const checks=[{id:'role',label:M(lang,'judgeRole'),pass:variant!=='self'},{id:'revision',label:M(lang,'judgeRevision'),pass:variant!=='stale'},{id:'blockers',label:M(lang,'judgeBlockers'),pass:variant!=='blocker'}];
  const ok=checks.every(c=>c.pass);
  return result(s,id,ok,checks,ok?M(lang,'judgeOk'):M(lang,'judgeFail'),{simulatedReviewer:true,verifierEvent:s.receipts.verify.event,reviewedRevision:variant==='stale'?Math.max(0,s.revisions[2]-1):s.revisions[2],verdict:ok?'APPROVE_SIMULATED':'REQUEST_CHANGES_SIMULATED'},lang);
 }
 const checks=STEPS.slice(0,5).map(t=>({id:t.id,label:M(lang,'packageLabel',L.field(t,'title',lang)),pass:valid(s,t.id)}));
 s.goals.package=true;
 return result(s,id,checks.every(c=>c.pass),checks,M(lang,'packageOk'),{productionAuthorized:false,realToolkitExecuted:false,independentReview:false},lang);
}
function report(s){
 return {format:'quest-harness-demo',schemaVersion:1,appVersion:'1.3.0',mode:'educational-local',exportedAt:now(),runId:s.runId,policy:POLICY,sourceRepository:{url:REPO,status:'not-inspected',integration:'pending-source-access'},summary:{currentSteps:STEPS.filter(t=>valid(s,t.id)).length,totalSteps:6,localPackageReady:valid(s,'package'),productionAuthorized:false,toolkitExecuted:false,independentReviewerExecuted:false,halted:s.halted},inputs:clone(s.inputs),codeRevision:s.revisions[2],receipts:clone(s.receipts),timeline:clone(s.log),limits:['Não é saída do harness-toolkit nem de uma skill real.','Recibos locais não são assinados; podem ser alterados fora da UI.','Checks cobrem apenas funções reduzidas em memória.','Um backup restaura entradas, não comprova execuções.']};
}
const api={REPO,POLICY,LIMIT,STEPS,OPTIONS,DEFAULTS,emptyDraft,normalizeDraft,create,draft,binding,valid,status,change,execute,report,code};
if(typeof module==='object'&&module.exports)module.exports=api;else root.QuestHarness=api;
})(typeof globalThis!=='undefined'?globalThis:this);
