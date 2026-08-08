const progress = {
  missionStatusByKey: {},
  missionEngagementByKey: {},
};
for(let i=0; i<1000; i++) {
  progress.missionStatusByKey[`ai-pratica:mission-${i}`] = i % 2 === 0 ? 'completed' : 'started';
  progress.missionStatusByKey[`dev:mission-${i}`] = i % 2 === 0 ? 'completed' : 'started';
  progress.missionEngagementByKey[`mission-${i}`] = { practiceCompleted: i % 2 === 0 };
}

console.time('old');
for(let i=0; i<10000; i++) {
  const completedMissions = Object.values(progress.missionStatusByKey).filter(
    (status) => status === 'completed',
  ).length
  const engagements = Object.values(progress.missionEngagementByKey)

  const candidates = []
  if (completedMissions >= 1) candidates.push('first-mission')
  if (engagements.some((engagement) => engagement.practiceCompleted)) candidates.push('first-practice')
  if (
    Object.entries(progress.missionStatusByKey).some(
      ([key, status]) => key.startsWith('ai-pratica:') && status === 'completed',
    )
  ) candidates.push('ai-pratica-started')
  if (
    Object.entries(progress.missionStatusByKey).some(
      ([key, status]) => key.startsWith('dev:') && status === 'completed',
    )
  ) candidates.push('dev-started')
  if (completedMissions >= 3) candidates.push('three-missions')
}
console.timeEnd('old');

console.time('new');
for(let i=0; i<10000; i++) {
  let completedMissions = 0
  let hasAiPratica = false
  let hasDev = false
  for (const key in progress.missionStatusByKey) {
    if (progress.missionStatusByKey[key] === 'completed') {
      completedMissions++
      if (!hasAiPratica && key.startsWith('ai-pratica:')) hasAiPratica = true
      if (!hasDev && key.startsWith('dev:')) hasDev = true
    }
  }

  let hasPractice = false
  for (const key in progress.missionEngagementByKey) {
    if (progress.missionEngagementByKey[key].practiceCompleted) {
      hasPractice = true
      break
    }
  }

  const candidates = []
  if (completedMissions >= 1) candidates.push('first-mission')
  if (hasPractice) candidates.push('first-practice')
  if (hasAiPratica) candidates.push('ai-pratica-started')
  if (hasDev) candidates.push('dev-started')
  if (completedMissions >= 3) candidates.push('three-missions')
}
console.timeEnd('new');
