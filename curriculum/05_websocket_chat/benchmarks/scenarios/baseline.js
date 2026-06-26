// Baseline — moderate concurrent connections that join a room and chat.
import ws from 'k6/ws';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8090';
const URL = `ws://localhost:${PORT}/ws?name=bench${__VU}`;

export const options = {
  scenarios: { baseline: { executor: 'constant-vus', vus: 100, duration: '60s' } },
};

export default function () {
  const res = ws.connect(URL, {}, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({ type: 'join', room: 'general' }));
      socket.setTimeout(function () {
        socket.send(JSON.stringify({ type: 'message', room: 'general', body: 'hi' }));
      }, 500);
      socket.setTimeout(function () { socket.close(); }, 3000);
    });
  });
  check(res, { 'connected (101)': (r) => r && r.status === 101 });
}
