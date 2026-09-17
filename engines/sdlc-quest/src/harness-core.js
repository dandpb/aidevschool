/* SDLC Quest's own teaching runtime. NOT dandpb/harness-toolkit code or API.
 * This state machine controls the in-memory exercise, not a hostile user,
 * a real agent, CI, a filesystem, cloud credentials or production. */
(function(root){
'use strict';
const TLC=typeof module==='object'&&module.exports?require('./tlc-core.js'):root.QuestTLC;
const REPO='https://github.com/dandpb/harness-toolkit';
const POLICY='quest-local-contract-v1';
const LIMIT=3;
const STEPS=Object.freeze([
 {id:'discover',title:'Descobrir',skill:'tlc-discover',artifact:'intenção do exercício',subtitle:'Problema antes da solução.'},
 {id:'plan',title:'Planejar',skill:'tlc-plan',artifact:'matriz de aceitação',subtitle:'Cada contrato precisa de uma prova.'},
 {id:'implement',title:'Implementar',skill:'tlc-implement',artifact:'candidata em memória',subtitle:'Uma revisão identificável.'},
 {id:'verify',title:'Verificar',skill:'verificador local',artifact:'15 asserções JavaScript',subtitle:'Execute. Não apenas declare.'},
 {id:'judge',title:'Revisar',skill:'the-judge · simulado',artifact:'revisão da candidata',subtitle:'O parecer precisa ser atual.'},
 {id:'package',title:'Empacotar',skill:'gate local do Quest',artifact:'recibos + timeline',subtitle:'Pronto localmente não é deploy.'}
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
function change(current,key,value){
 const s=clone(current);
 if(!has(OPTIONS,key)||!OPTIONS[key].includes(value)){log(s,'input','rejected','Entrada desconhecida; nada foi executado.');return s;}
 if(s.inputs[key]===value)return s;
 const index=DEPTH[key],hadProof=STEPS.slice(index).some(t=>valid(s,t.id));
 s.inputs[key]=value;s.revisions[index]++;invalidate(s,index);
 if(hadProof)s.goals.stale=true;
 log(s,'input:'+key,'changed','Entrada alterada. Recibos dependentes precisam de nova execução.',{value,codeRevision:s.revisions[2]});return s;
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
function checksPlan(s){const covered=s.inputs.plan==='traceable'?criteria:criteria.slice(0,2);return criteria.map(id=>({id,label:'Critério ligado ao check '+id,pass:covered.includes(id)}));}
function result(s,id,ok,checks,message,evidence={}){
 const i=STEPS.findIndex(t=>t.id===id);
 // A new execution receipt supersedes downstream reviews, even for unchanged inputs.
 invalidate(s,i+1);
 const event=log(s,id,ok?'passed':'failed',message);
 s.receipts[id]={step:id,status:ok?'passed':'failed',binding:binding(s,i),runId:s.runId,event: event.seq,at:event.at,codeRevision:s.revisions[2],policy:POLICY,checks,evidence,execution:'quest-local-teaching',toolkitExecuted:false,independentReview:false};
 if(!ok){
  s.failures[id]=(s.failures[id]||0)+1;invalidate(s,i+1);
  if(s.failures[id]>=LIMIT){s.halted=true;log(s,'budget','escalated','Três falhas nesta etapa. Execução interrompida: revise o problema antes de iniciar outra execução.');s.goals.budget=true;}
 }
 return s;
}
function execute(current,id){
 const s=clone(current);
 if(id==='declare'){s.goals.claim=true;log(s,'declare','rejected','“Terminei” é uma declaração. Nenhum recibo de execução foi criado.');return s;}
 if(id==='production'){s.goals.authority=true;log(s,'production','denied','Sem executor externo configurado e sem autorização autenticada. Produção não foi acionada.');return s;}
 if(!known(id)){log(s,'unknown','rejected','Etapa desconhecida.');return s;}
 const index=STEPS.findIndex(t=>t.id===id);s.selected=index;
 if(s.halted){log(s,id,'blocked','Orçamento esgotado. Esta execução está encerrada para novos passos.');return s;}
 const missing=STEPS.slice(0,index).filter(t=>!valid(s,t.id)).map(t=>t.title);
 if(missing.length){s.goals.order=true;log(s,id,'blocked','Pré-condições não satisfeitas: '+missing.join(', ')+'.');return s;}
 if(id==='discover'){
  const checks=checksDiscover(s);return result(s,id,checks.every(c=>c.pass),checks,checks.every(c=>c.pass)?'Intenção do exercício contém problema, resultado, escopo e pergunta aberta.':'Um campo done:true não substitui os quatro conteúdos exigidos.',{artifact:clone(intentArtifacts[s.inputs.intent]),scope:'Validação estrutural de uma fixture didática, não aprovação do produto.'});
 }
 if(id==='plan'){
  const checks=checksPlan(s);return result(s,id,checks.every(c=>c.pass),checks,checks.every(c=>c.pass)?'Os cinco comportamentos estão ligados a checks conhecidos.':'A matriz omite casos negativos de tenant ou de ID ausente.',{criteria:criteria.map(id=>({id,check:s.inputs.plan==='traceable'||id.startsWith('own-')?id:null}))});
 }
 if(id==='implement')return result(s,id,true,[{id:'materialized',label:'Candidata conhecida selecionada em memória',pass:has(code,s.inputs.patch)}],'Candidata r'+s.revisions[2]+' materializada. Implementar não significa que os testes passaram.',{source:code[s.inputs.patch],patch:s.inputs.patch,scope:'Seleção de função predefinida; não é execução de uma skill ou edição de repositório.'});
 if(id==='verify'){
  try{
   if(s.inputs.runner==='unavailable')return result(s,id,false,[],'Verificador indisponível (falha injetada). Zero checks não equivale a sucesso.',{error:'unavailable',injected:true});
   if(s.inputs.runner==='crash')throw new Error('Exceção injetada no verificador');
   const r=TLC.runLab(s.inputs.suite,s.inputs.patch);
   s.lastTests={...r,codeRevision:s.revisions[2],policy:POLICY,stale:false};
   const checks=r.versions.flatMap(v=>v.checks.map(c=>({...c,id:v.id+':'+c.id,version:v.id})));
   const ok=r.ok&&checks.length===15;
   if(ok)s.goals.executed=true;else if(r.versions[1]?.exitCode===1)s.goals.bug=true;
   return result(s,id,ok,checks,ok?'15 asserções executadas: baseline defeituosa reprovada, candidata aprovada e mutante “nega tudo” reprovado.':'O verificador executou, mas a prova foi reprovada. Inspecione resultados, cobertura e mutante.',{suite:s.inputs.suite,verdicts:r.versions.map(v=>({version:v.id,exitCode:v.exitCode})),scope:'Consultas em memória. Não testa HTTP, autenticação, concorrência ou infra.'});
  }catch(e){return result(s,id,false,[],'Erro de execução não vira aprovação: '+e.message+'.',{error:'injected-crash',injected:true});}
 }
 if(id==='judge'){
  const variant=s.inputs.review;
  const checks=[{id:'role',label:'Parecer não é autodeclaração do autor',pass:variant!=='self'},{id:'revision',label:'Parecer ligado à candidata e à verificação atuais',pass:variant!=='stale'},{id:'blockers',label:'Sem bloqueador aberto na fixture de revisão',pass:variant!=='blocker'}];
  const ok=checks.every(c=>c.pass);
  return result(s,id,ok,checks,ok?'Parecer didático confere com esta revisão. Nenhum the-judge real ou revisor independente foi executado.':'Parecer recusado: autodeclaração, revisão antiga ou bloqueador aberto.',{simulatedReviewer:true,verifierEvent:s.receipts.verify.event,reviewedRevision:variant==='stale'?Math.max(0,s.revisions[2]-1):s.revisions[2],verdict:ok?'APPROVE_SIMULATED':'REQUEST_CHANGES_SIMULATED'});
 }
 const checks=STEPS.slice(0,5).map(t=>({id:t.id,label:'Recibo atual de '+t.title,pass:valid(s,t.id)}));
 s.goals.package=true;
 return result(s,id,checks.every(c=>c.pass),checks,'Pacote local pronto. A autorização de produção permanece AUSENTE.',{productionAuthorized:false,realToolkitExecuted:false,independentReview:false});
}
function report(s){
 return {format:'quest-harness-demo',schemaVersion:1,appVersion:'1.3.0',mode:'educational-local',exportedAt:now(),runId:s.runId,policy:POLICY,sourceRepository:{url:REPO,status:'not-inspected',integration:'pending-source-access'},summary:{currentSteps:STEPS.filter(t=>valid(s,t.id)).length,totalSteps:6,localPackageReady:valid(s,'package'),productionAuthorized:false,toolkitExecuted:false,independentReviewerExecuted:false,halted:s.halted},inputs:clone(s.inputs),codeRevision:s.revisions[2],receipts:clone(s.receipts),timeline:clone(s.log),limits:['Não é saída do harness-toolkit nem de uma skill real.','Recibos locais não são assinados; podem ser alterados fora da UI.','Checks cobrem apenas funções reduzidas em memória.','Um backup restaura entradas, não comprova execuções.']};
}
const api={REPO,POLICY,LIMIT,STEPS,OPTIONS,DEFAULTS,emptyDraft,normalizeDraft,create,draft,binding,valid,status,change,execute,report,code};
if(typeof module==='object'&&module.exports)module.exports=api;else root.QuestHarness=api;
})(typeof globalThis!=='undefined'?globalThis:this);
