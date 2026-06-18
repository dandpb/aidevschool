import { Gateway } from './server';
import { defaultConfig } from './config';

const config = defaultConfig();
const gateway = new Gateway(config);
const app = gateway.buildApp();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : config.port;
app.listen(port, () => {
  console.log(`Gateway listening on port ${port}`);
});
