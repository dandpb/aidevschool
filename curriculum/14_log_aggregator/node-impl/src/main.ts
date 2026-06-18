import { Server } from './server';

const server = new Server();
const app = server.buildApp();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
app.listen(port, () => {
  console.log(`Log aggregator listening on port ${port}`);
});
