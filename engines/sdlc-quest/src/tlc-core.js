/* Pure rules for the TLC teaching expansion. Browser checks are simulations, not a security boundary. */
(function(root){
'use strict';
const D=typeof module==='object'&&module.exports?require('./tlc-data.js'):root.QuestTLCData;
const tasks=D.modules.flatMap(m=>m.tasks),byId=new Map(tasks.map(t=>[t.id,t]));
const isRecord=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const empty=()=>({version:1,done:{},attempts:{},drafts:{},selected:0});
const score=n=>Math.max(40,100-15*Math.max(0,n||0));
const equalSet=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const fixtures=Object.freeze([{id:'evt-A',tenant:'A'},{id:'evt-B',tenant:'B'}].map(Object.freeze));
const cases=Object.freeze([
 {id:'own-a',label:'A encontra sua entrega',idArg:'evt-A',tenant:'A',expected:'A'},
 {id:'own-b',label:'B encontra sua entrega',idArg:'evt-B',tenant:'B',expected:'B'},
 {id:'cross-a',label:'A não encontra entrega B',idArg:'evt-B',tenant:'A',expected:null},
 {id:'cross-b',label:'B não encontra entrega A',idArg:'evt-A',tenant:'B',expected:null},
 {id:'missing',label:'ID ausente retorna null',idArg:'missing',tenant:'A',expected:null}
].map(Object.freeze));
const implementations=Object.freeze({
 original:(id,tenant)=>fixtures.find(row=>row.id===id)??null,
 scoped:(id,tenant)=>fixtures.find(row=>row.id===id&&row.tenant===tenant)??null,
 denyAll:()=>null
});
function runLab(suite,patch){
 if(!['happy','contract','placebo'].includes(suite)||!Object.hasOwn(implementations,patch))return {ok:false,error:'Escolha uma suíte e uma implementação válidas.',versions:[]};
 const subset=suite==='happy'?cases.slice(0,2):suite==='placebo'?[{id:'placebo',label:'As fixtures contêm duas entregas',expected:2}]:cases;
 const versions=[['before','Antes do patch','original'],['candidate','Sua candidata',patch],['mutant','Mutante: nega tudo','denyAll']].map(([id,label,implementation])=>{
  const checks=subset.map(c=>{const actual=suite==='placebo'?fixtures.length:implementations[implementation](c.idArg,c.tenant)?.tenant??null;return {id:c.id,label:c.label,actual,expected:c.expected,pass:actual===c.expected};});
  return {id,label,implementation,checks,exitCode:checks.every(c=>c.pass)?0:1};
 });
 const ok=versions[0].exitCode===1&&versions[1].exitCode===0&&versions[2].exitCode===1;
 return {ok,suite,patch,versions,message:ok?'Regressão detecta o bug anterior; candidata passa; mutante defeituoso é rejeitado.':'A prova ainda é insuficiente. O bug anterior deve ser detectado, a candidata correta deve passar e o mutante que nega tudo deve falhar.'};
}
function verdict({blocker=0,shouldFix=0}={}){return blocker>0?'REQUEST_CHANGES':shouldFix>0?'COMMENT':'APPROVE';}
function cleanAnswer(t,v){
 if(!t)return undefined;
 if(t.type==='choice')return typeof v==='string'&&t.options.some(o=>o.id===v)?v:'';
 if(t.type==='select')return Array.isArray(v)?[...new Set(v.filter(id=>t.options.some(o=>o.id===id)))]:[];
 if(t.type==='classify')return Object.fromEntries(t.items.filter(i=>isRecord(v)&&t.groups.some(g=>g[0]===v[i.id])).map(i=>[i.id,v[i.id]]));
 if(t.type==='prooflab')return {suite:['happy','contract','placebo'].includes(v?.suite)?v.suite:'',patch:['original','scoped','denyAll'].includes(v?.patch)?v.patch:''};
 if(t.type==='reviewlab')return {findings:Array.isArray(v?.findings)?[...new Set(v.findings.filter(id=>t.options.some(o=>o.id===id)))]:[],verdict:['APPROVE','COMMENT','REQUEST_CHANGES'].includes(v?.verdict)?v.verdict:''};
 return undefined;
}
function hasAnswer(t,v){
 if(t.type==='choice')return typeof v==='string'&&v.length>0;
 if(t.type==='select')return Array.isArray(v)&&v.length>0;
 if(t.type==='classify')return isRecord(v)&&Object.keys(v).length>0;
 if(t.type==='prooflab')return !!v?.suite&&!!v?.patch;
 if(t.type==='reviewlab')return Array.isArray(v?.findings)&&v.findings.length>0&&!!v.verdict;
 return false;
}
function validate(t,v){
 if(!t)return {ok:false,message:'Desafio desconhecido.'};
 if(!hasAnswer(t,v))return {ok:false,empty:true,message:'Faça sua escolha antes de verificar. Estudar ou deixar em branco não consome XP.'};
 let ok=false,message='';
 if(t.type==='choice'){ok=v===t.answer;message=t.options.find(o=>o.id===v)?.why||'Reveja o contexto e a decisão pedida.';}
 if(t.type==='select'){ok=equalSet(v,t.answer);message=t.options.filter(o=>v.includes(o.id)&&!t.answer.includes(o.id)).map(o=>o.why).join(' ')||'Faltam registros necessários. Compare cada cartão com a fronteira do trabalho.';}
 if(t.type==='classify'){const errors=t.items.filter(i=>v[i.id]!==i.answer);ok=errors.length===0;message='Reveja: '+errors.map(i=>i.text).join(' ');}
 if(t.type==='prooflab'){const r=runLab(v.suite,v.patch);ok=r.ok;message=r.error||r.message;}
 if(t.type==='reviewlab'){ok=equalSet(v.findings,t.answer)&&v.verdict==='REQUEST_CHANGES';message=!equalSet(v.findings,t.answer)?'Publique somente o achado novo com evidência: F1. Tooling, preexistentes e alegações sem fonte têm destinos diferentes.':'F1 é um blocker confirmado. O veredito correspondente é REQUEST_CHANGES, não COMMENT ou APPROVE.';}
 return {ok,message:ok?t.success:message};
}
function canOpen(s,id){const m=D.modules.find(m=>m.tasks.some(t=>t.id===id));if(!m)return false;const index=m.tasks.findIndex(t=>t.id===id);return m.tasks.slice(0,index).every(t=>s.done[t.id]);}
function submit(s,id,v){
 const t=byId.get(id);if(!t||!canOpen(s,id))return {ok:false,locked:true,message:'Conclua o desafio anterior deste especialista.'};
 const result=validate(t,v);s.drafts[id]=cleanAnswer(t,v);
 if(result.ok&&!s.done[id])s.done[id]={score:score(s.attempts[id]),at:new Date().toISOString()};
 else if(!result.ok&&!result.empty&&!s.done[id])s.attempts[id]=Math.min(10000,(s.attempts[id]||0)+1);
 return result;
}
function normalize(raw){
 const s=empty();if(!isRecord(raw)||raw.version!==1)return s;
 s.selected=Number.isInteger(raw.selected)?Math.max(0,Math.min(3,raw.selected)):0;
 for(const t of tasks){
  s.attempts[t.id]=Number.isInteger(raw.attempts?.[t.id])?Math.max(0,Math.min(10000,raw.attempts[t.id])):0;
  if(isRecord(raw.done?.[t.id]))s.done[t.id]={score:score(s.attempts[t.id]),at:typeof raw.done[t.id].at==='string'?raw.done[t.id].at.slice(0,80):'restored'};
  if(raw.drafts?.[t.id]!==undefined)s.drafts[t.id]=cleanAnswer(t,raw.drafts[t.id]);
 }
 for(const m of D.modules){let gap=false;for(const t of m.tasks){if(gap)delete s.done[t.id];else if(!s.done[t.id])gap=true;}}
 return s;
}
function stats(s){const done=tasks.filter(t=>s.done[t.id]);return {done:done.length,total:tasks.length,xp:done.reduce((n,t)=>n+s.done[t.id].score,0),modules:D.modules.filter(m=>m.tasks.every(t=>s.done[t.id])).length};}
function reviewArtifact(){return {simulation:true,source:'SDLC Quest — tribunal didático; não é saída do script oficial',round:1,language:'pt-BR',verdict:'REQUEST_CHANGES',carryover:{blocker:0,shouldFix:0},summary:'F1 expõe token sintético no novo log. Não autorizar merge enquanto o achado permanecer aberto.',findings:[{id:'F1',severity:'blocker',path:'src/retry.ts',line:4,evidence:[{type:'internal',ref:'src/retry.ts:4 (fixture fictícia)'},{type:'repro',ref:'Cenário fornecido: cabeçalho sintético aparece no log capturado.'}]}],publication:'Nenhuma review publicada. Nenhum acesso ao GitHub.'};}
const api={empty,normalize,score,cleanAnswer,hasAnswer,runLab,verdict,validate,submit,canOpen,stats,reviewArtifact};
if(typeof module==='object'&&module.exports)module.exports=api;else root.QuestTLC=api;
})(typeof globalThis!=='undefined'?globalThis:this);
