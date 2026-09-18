'use strict';
// C4: the QuestLang resolver must fall back to the pt-BR field when an `_en` variant is missing,
// and never render a raw key, "undefined", or drop content that exists. Explicit lang argument; no DOM.
const test=require('node:test'),a=require('node:assert/strict');
const L=require('../src/lang.js');
test('fallback renders pt-BR when _en is missing',()=>{
 const record={label:'Promessa absoluta',why:'Sem evidência.'};          // no label_en / why_en
 a.equal(L.field(record,'label','en'),'Promessa absoluta');
 a.equal(L.field(record,'why','en'),'Sem evidência.');
 a.equal(L.field(record,'label','pt'),'Promessa absoluta');             // explicit pt unchanged
 const partial={label:'Escopo',label_en:'Scope',why:'Limite do trabalho.'}; // mixed: only one _en present
 a.equal(L.field(partial,'label','en'),'Scope');
 a.equal(L.field(partial,'why','en'),'Limite do trabalho.');
 const nested={stage:'Estação 1',stage_en:'Station 1'};
 a.equal(L.field(nested,'stage','en'),'Station 1');
});
test('resolver never returns a raw key or leaks absence as text',()=>{
 a.equal(L.field({}, 'label','en'),'');                                // absent field: esc-safe empty string, never the key or "undefined"
 a.notEqual(L.field({label:'x'},'label','en'),'label');                 // no key leakage
 a.equal(L.t({pt:{k:'valor'},en:{}},'k','en'),'valor');                 // t() falls back to the pt table
 a.equal(L.t({pt:{k:'valor'},en:{}},'k','pt'),'valor');
 a.equal(L.t({pt:{},en:{}},'missing','en'),'');                         // absent key: empty string, not undefined
});

// C6/C7: anti-drift parity walker. Every displayable PT field in data.js and tlc-data.js must
// carry an _en sibling; every [id,label] tuple gains its EN label as a 3rd element; glossary
// entries are [term,def,term_en,def_en]. The exclusion list is the Landing literal plus the
// mechanical keys (code/axis/skill/source) that are identical in both languages; sources[].name
// is a proper noun and is scope-skipped, not globally excluded.
const questData=require("../src/data.js");
const tlcData=require("../src/tlc-data.js");
const EXCLUDE=new Set(["id","url","color","glyph","artifact","answer","type","boss","lines","budget","tag","version","checkedAt","install","flow","license","code","axis","skill","source"]);
const PROPER_NOUNS={sources:["name"]};
function needEn(node,where,id,field,out){const en=node[field];if(typeof en!=="string"||!en.length)out.push({where,id,field});}
function walkRecord(node,where,out,ctx={}){
 const id=typeof node.id==="string"&&node.id?node.id:(ctx.id||null);
 for(const key of Object.keys(node)){
  if(key==="_en"||key.endsWith("_en")||EXCLUDE.has(key))continue;
  if(ctx.skip&&ctx.skip.includes(key))continue;
  const value=node[key];
  if(typeof value==="string"){if(value.length)needEn(node,`${where}.${key}`,id,`${key}_en`,out);continue;}
  if(Array.isArray(value)){
   if(!value.length)continue;
   if(value.every(x=>Array.isArray(x))){
    value.forEach((tuple,index)=>{
     if(tuple.length<2||typeof tuple[1]!=="string")return;
     const en=tuple[2];
     if(typeof en!=="string"||!en.length)out.push({where:`${where}.${key}[${index}]`,id:typeof tuple[0]==="string"?tuple[0]:null,field:"label_en"});
    });continue;
   }
   if(value.every(x=>x!==null&&typeof x==="object"))value.forEach((rec,index)=>walkRecord(rec,`${where}.${key}[${index}]`,out,{}));
   continue;
  }
  if(value!==null&&typeof value==="object")walkRecord(value,`${where}.${key}`,out,{});
 }
}
function walkTuples(list,where,out){
 list.forEach((entry,index)=>{
  const [term,def,termEn,defEn]=entry;
  if(typeof term==="string"&&term.length&&!(typeof termEn==="string"&&termEn.length))out.push({where:`${where}[${index}]`,id:term,field:"term_en"});
  if(typeof def==="string"&&def.length&&!(typeof defEn==="string"&&defEn.length))out.push({where:`${where}[${index}]`,id:term,field:"text_en"});
 });
}
function parityReport(data){
 const out=[];
 (data.missions||[]).forEach((m,i)=>walkRecord(m,`missions[${i}]`,out));
 if(Array.isArray(data.glossary))walkTuples(data.glossary,"glossary",out);
 (data.sources||[]).forEach((s,i)=>walkRecord(s,`sources[${i}]`,out,{skip:PROPER_NOUNS.sources}));
 Object.entries(data.primers||{}).forEach(([k,p])=>walkRecord(p,`primers.${k}`,out,{id:k}));
 if(Array.isArray(data.modules))data.modules.forEach((m,i)=>walkRecord(m,`modules[${i}]`,out));
 if(typeof data.notice==="string"&&data.notice.length)needEn(data,"tlc.notice",null,"notice_en",out);
 return out;
}
const fmt=f=>f.where+(f.id?` #${f.id}`:"")+": "+f.field;
test("walker reports record id and missing field",()=>{
 const data=structuredClone(questData);
 delete data.missions[0].brief_en;
 const report=parityReport(data);
 a.equal(report.length,1);
 const text=report.map(fmt).join("\n");
 a.ok(text.includes("plan"),"names the record id");
 a.ok(text.includes("brief_en"),"names the missing field");
});
test("walker covers missions/tasks/options/primers/glossary/sources and tlc modules",()=>{
 const data=structuredClone(questData);
 delete data.missions[5].tasks[2].steps[4].text_en;          // order-task step text
 delete data.missions[0].tasks[0].options[4].label_en;       // option label (promise)
 data.missions[0].tasks[1].groups[2].pop();                  // classify tuple 3rd element
 delete data.primers.redgreen.concept_en;                    // primer concept
 data.glossary[1]=data.glossary[1].slice(0,2);               // glossary term_en AND text_en
 data.glossary[14].pop();                                    // glossary text_en only
 delete data.sources[0].topic_en;                            // source topic
 const report=parityReport(data);
 a.equal(report.length,8,`expected 8 planted findings, got ${report.map(fmt).join("; ")}`);
 const text=report.map(fmt).join("\n");
 a.ok(text.includes("#promise")&&text.includes("label_en"));
 a.ok(text.includes("#redgreen")&&text.includes("concept_en"));
 a.ok(text.includes("#Intenção")&&text.includes("term_en")&&text.includes("text_en"));
 a.ok(text.includes("sources[0]")&&text.includes("topic_en"));
 a.ok(text.includes("groups[2]")&&text.includes("label_en"));
 const tlc=structuredClone(tlcData);
 delete tlc.modules[3].tasks[0].options[1].why_en;           // why_en where PT why is non-empty
 delete tlc.modules[1].name_en;                              // module name
 tlc.modules[0].tasks[1].groups[0].pop();                    // classify tuple
 delete tlc.notice_en;
 const tlcReport=parityReport(tlc);
 a.equal(tlcReport.length,4,`expected 4 planted tlc findings, got ${tlcReport.map(fmt).join("; ")}`);
 const tlcText=tlcReport.map(fmt).join("\n");
 a.ok(tlcText.includes("#F2")&&tlcText.includes("why_en"));
 a.ok(tlcText.includes("modules[1]")&&tlcText.includes("name_en"));
 a.ok(tlcText.includes("groups[0]")&&tlcText.includes("label_en"));
 a.ok(tlcText.includes("notice_en"));
});
test("walker green on real data",()=>{
 a.deepEqual(parityReport(questData),[]);
 a.deepEqual(parityReport(tlcData),[]);
});
