const launchable = [1, 2, 3, 4, 5];
const status = { 1: 'completed', 2: 'completed', 3: 'started', 4: 'completed', 5: 'not-started' };

// Old way
const completedMissionOld = [...launchable].reverse().find(id => status[id] === 'completed');
const completedInTrackOld = launchable.filter(id => status[id] === 'completed').length;
console.log('Old:', { completedMissionOld, completedInTrackOld });

// New way
let completedMissionNew = undefined;
let completedInTrackNew = 0;
for (let i = launchable.length - 1; i >= 0; i--) {
  if (status[launchable[i]] === 'completed') {
    completedInTrackNew++;
    if (completedMissionNew === undefined) completedMissionNew = launchable[i];
  }
}
console.log('New:', { completedMissionNew, completedInTrackNew });
