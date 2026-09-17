'use strict';
// Explicit review baseline, not taken from QuestData.answer at runtime.
const test=require('node:test'),a=require('node:assert/strict');
const C=require('../src/core.js'),D=require('../src/data.js');
const golden=require('./fixtures/accepted-decisions.json');
const tasks=D.missions.flatMap(m=>m.tasks);
for(const [id,answer] of Object.entries(golden))test(`fixed acceptance: ${id}`,()=>{const t=tasks.find(t=>t.id===id);a.ok(t,id);a.equal(C.validate(t,answer).ok,true);});
test('fixed acceptance covers all campaign tasks',()=>a.deepEqual(tasks.map(t=>t.id),Object.keys(golden)));
test('fixed answers complete a 1800 XP campaign',()=>{const s=C.empty();for(const t of tasks)a.equal(C.complete(s,D,t,golden[t.id]).ok,true);a.equal(C.stats(s,D).xp,1800);});
test('oracle catches an intentionally weakened intent answer',()=>{const altered=structuredClone(tasks[0]);altered.answer=['pain','outcome','scope','promise'];a.equal(C.validate(altered,golden.intent).ok,false);});
test('oracle catches an intentionally self-authorizing gate answer',()=>{const altered=structuredClone(tasks.find(t=>t.id==='gate'));altered.answer.approval='self';a.equal(C.validate(altered,golden.gate).ok,false);});
