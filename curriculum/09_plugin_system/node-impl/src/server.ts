import express, { Request, Response } from 'express';
import { HookInvocation, LifecycleTransition, PluginHost, PluginManifest } from './plugin-system.js';

export function createApp(host = new PluginHost('1.2.0')): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_request, response) => response.json(host.health()));
  app.post('/plugins', async (request: Request<object, object, PluginManifest>, response: Response) => {
    try { response.status(201).json(await host.registerFromManifest(request.body)); } catch (error) { response.status(400).json(errorBody(error)); }
  });
  app.get('/plugins', (_request, response) => response.json(host.list()));
  app.get('/plugins/:pluginId', (request, response) => {
    const plugin = host.get(request.params.pluginId);
    if (!plugin) { response.sendStatus(404); return; }
    response.json(plugin);
  });
  app.patch('/plugins/:pluginId', (request: Request<{ pluginId: string }, object, { enabled?: boolean }>, response) => {
    try { response.json(host.updateSettings(request.params.pluginId, request.body.enabled ?? true)); } catch (error) { response.status(404).json(errorBody(error)); }
  });
  app.post('/plugins/:pluginId/lifecycle/:transition', async (request: Request<{ pluginId: string; transition: LifecycleTransition }>, response) => {
    try { response.json(await host.transition(request.params.pluginId, request.params.transition)); } catch (error) { response.status(409).json(errorBody(error)); }
  });
  app.post('/hooks/:hookName/dispatch', async (request: Request<{ hookName: string }, object, { correlationId: string; payload: Record<string, unknown> }>, response) => {
    try {
      const invocation: HookInvocation = { hookName: request.params.hookName, correlationId: request.body.correlationId, payload: request.body.payload, hostApiVersion: '1.2.0' };
      response.json(await host.dispatchHook(invocation));
    } catch (error) { response.status(400).json(errorBody(error)); }
  });
  return app;
}

function errorBody(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : String(error) };
}
