// Spike — connection churn: rapid open/join/close cycles that stress the
// connection-lifecycle + cleanup path (the project's primary concept).
import ws from 'k6/ws';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8090';
const URL = `ws://localhost:${PORT}/ws?name=churn${__VU}`;

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { target: 50, duration: '10s' },
        { target: 3000, duration: '10s' }, // churn spike
        { target: 50, duration: '10s' },
      ],
    },
  },
};

export default function () {
  const res = ws.connect(URL, {}, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({ type: 'join', room: 'lobby' }));
      socket.setTimeout(function () { socket.close(); }, 500); // short-lived: churn
    });
  });
  check(res, { 'connected (101)': (r) => r && r.status === 101 });
}
