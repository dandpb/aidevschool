import { LoadBalancer, defaultConfig } from './load-balancer';

const rawBackends = process.env.BACKENDS ?? 'http://127.0.0.1:9001,http://127.0.0.1:9002';
const backends = rawBackends.split(',').map((url, index) => ({ id: `backend-${index + 1}`, url }));
const balancer = new LoadBalancer({ ...defaultConfig(backends), routingAlgorithm: (process.env.ROUTING_ALGORITHM as 'round_robin' | 'least_connections') ?? 'round_robin' });
const port = Number(process.env.PORT ?? '8080');
balancer.listen(port);
process.on('SIGTERM', () => { void balancer.shutdown().then(() => process.exit(0)); });
process.on('SIGINT', () => { void balancer.shutdown().then(() => process.exit(0)); });
