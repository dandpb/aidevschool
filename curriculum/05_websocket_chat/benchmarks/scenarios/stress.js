// Stress — many concurrent connections in one room, all chatting: exercises
// broadcast fan-out (each message multiplies across room members).
import ws from 'k6/ws';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8090';
const URL = `ws://localhost:${PORT}/ws?name=load${__VU}`;

export const options = {
  scenarios: { stress: { executor: 'constant-vus', vus: 2000, duration: '60s' } },
};

export default function () {
  const res = ws.connect(URL, {}, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({ type: 'join', room: 'firehose' }));
      socket.setInterval(function () {
        socket.send(JSON.stringify({ type: 'message', room: 'firehose', body: 'x' }));
      }, 1000);
      socket.setTimeout(function () { socket.close(); }, 30000);
    });
  });
  check(res, { 'connected (101)': (r) => r && r.status === 101 });
}
