import { createApp } from './server.js';

const port = Number(process.env.PORT ?? 8081);
createApp().listen(port, () => {
  console.log(JSON.stringify({ level: 'info', message: 'plugin host listening', port }));
});
