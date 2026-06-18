// Executable evidence: the token-bucket math the game is built on.
// Proves a full bucket absorbs a burst of up to C, then admit rate throttles to R.
import assert from 'node:assert';
const C = 6, R = 1.5;
function simulate(T, dt = 1/60) {
  let tokens = C; const admits = [];
  for (let t = 0; t < T; t += dt) {
    tokens = Math.min(C, tokens + R * dt);            // lazy refill (same formula as curriculum/01)
    if (tokens >= 1) { tokens -= 1; admits.push(t); } // greedy admit
  }
  return admits;
}
function maxWin(times, w) { let m=0; for(let i=0;i<times.length;i++){let c=0;for(let j=i;j<times.length;j++)if(times[j]-times[i]<=w)c++;if(c>m)m=c;} return m; }
const T = 60, a = simulate(T), expected = C + R*T, burst = maxWin(a, 1.0);
// total admits over T = initial burst (C) + sustained refill (R*T)
assert(Math.abs(a.length - expected) <= 2, `admit count ${a.length} ~= C + R*T = ${expected}`);
// steady-state (after the initial burst is spent) converges to exactly R
const steady = a.filter(t => t >= 1).length / (T - 1);
assert(steady >= R*0.92 && steady <= R*1.08, `steady-state rate ${steady.toFixed(2)} ~= R=${R}`);
// a 1s window absorbs at most ~C then throttles — the whole point of the bucket
assert(burst >= C && burst <= C + Math.ceil(R) + 1, `1s burst ${burst} absorbs ~C then throttles`);
console.log("TOKEN_BUCKET_OK " + JSON.stringify({ admits:a.length, expected:+expected.toFixed(1), steady_rate:+steady.toFixed(2), max_burst_1s:burst, C, R }));
