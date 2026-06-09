import http from 'k6/http';
import { check, sleep } from 'k6';

// Read target port from environment variable, default to 8080 (Go)
const PORT = __ENV.TARGET_PORT || '8080';
const URL = `http://localhost:${PORT}/`;

export const options = {
  stages: [
    { duration: '5s', target: 50 },  // Ramp up to 50 virtual users
    { duration: '15s', target: 100 }, // Ramp up to 100 VUs and hold
    { duration: '5s', target: 0 },   // Ramp down to 0 VUs
  ],
};

export default function () {
  const response = http.get(URL);
  
  // Verify that HTTP responses are either 200 (OK) or 429 (Too Many Requests)
  check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  // Small delay to simulate rapid request patterns
  sleep(0.05); 
}
