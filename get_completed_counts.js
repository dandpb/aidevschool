const array = Array(1000).fill('completed');
array.push(...Array(1000).fill('started'));

console.time('filter.length');
for(let i=0; i<10000; i++) {
  array.filter(s => s === 'completed').length;
}
console.timeEnd('filter.length');

console.time('loop');
for(let i=0; i<10000; i++) {
  let count = 0;
  for(let j=0; j<array.length; j++) {
    if(array[j] === 'completed') count++;
  }
}
console.timeEnd('loop');

console.time('reduce');
for(let i=0; i<10000; i++) {
  array.reduce((acc, s) => s === 'completed' ? acc + 1 : acc, 0);
}
console.timeEnd('reduce');
