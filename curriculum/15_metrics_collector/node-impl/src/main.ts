import { createServer } from './server';

const app = createServer();
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Metrics collector listening on port ${PORT}`);
});
