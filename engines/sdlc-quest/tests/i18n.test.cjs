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
