const dict = {};
for(let i=0; i<1000; i++) dict[`ai-pratica:mission-${i}`] = i % 2 === 0 ? 'completed' : 'started';
for(let i=0; i<1000; i++) dict[`dev:mission-${i}`] = i % 2 === 0 ? 'completed' : 'started';

console.time('Object.entries');
for(let i=0; i<10000; i++) {
  Object.entries(dict).some(([key, status]) => key.startsWith('ai-pratica:') && status === 'completed');
  Object.entries(dict).some(([key, status]) => key.startsWith('dev:') && status === 'completed');
}
console.timeEnd('Object.entries');

console.time('for..in');
for(let i=0; i<10000; i++) {
  let hasAiPratica = false;
  let hasDev = false;
  for (const key in dict) {
    if (dict[key] === 'completed') {
      if (key.startsWith('ai-pratica:')) hasAiPratica = true;
      if (key.startsWith('dev:')) hasDev = true;
    }
    if (hasAiPratica && hasDev) break;
  }
}
console.timeEnd('for..in');
