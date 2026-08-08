const launchable = Array.from({length: 1000}, (_, i) => i);
const status = {};
for(let i=0; i<1000; i++) status[i] = i % 2 === 0 ? 'completed' : 'started';

console.time('old');
for(let i=0; i<10000; i++) {
  const completedMission = [...launchable].reverse().find(id => status[id] === 'completed');
  const completedInTrack = launchable.filter(id => status[id] === 'completed').length;
}
console.timeEnd('old');

console.time('new');
for(let i=0; i<10000; i++) {
  let completedMission = undefined;
  let completedInTrack = 0;
  for(let j=0; j<launchable.length; j++) {
    if (status[launchable[j]] === 'completed') {
      completedInTrack++;
      completedMission = launchable[j];
    }
  }
}
console.timeEnd('new');
