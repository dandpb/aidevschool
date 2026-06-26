// Endurance — long-lived concurrent connections with periodic heartbeats:
// surfaces per-connection memory cost and leak/cleanup behavior over time.
import ws from 'k6/ws';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8090';
const URL = `ws://localhost:${PORT}/ws?name=hold${__VU}`;

export const options = {
  scenarios: { endurance: { executor: 'constant-vus', vus: 1000, duration: '180s' } },
};

export default function () {
  const res = ws.connect(URL, {}, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({ type: 'join', room: 'general' }));
      socket.setInterval(function () {
        socket.send(JSON.stringify({ type: 'ping' }));
      }, 5000);
      socket.setTimeout(function () { socket.close(); }, 175000);
    });
  });
  check(res, { 'connected (101)': (r) => r && r.status === 101 });
}
