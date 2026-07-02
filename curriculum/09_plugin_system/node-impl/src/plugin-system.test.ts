import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import {
  HookInvocation,
  LifecycleTransition,
  PluginHost,
  PluginManifest,
  ScriptedPlugin
} from './plugin-system.js';

function manifest(id: string): PluginManifest {
  return {
    id,
    name: 'Audit plugin',
    version: '1.0.0',
    apiVersionRange: '>=1.0.0 <2.0.0',
    entrypoint: 'memory:audit',
    runtime: 'native_module',
    hooks: [{ hookName: 'event.received', priority: 10, handlerName: 'events', requiredCapabilities: [] }],
    capabilities: [{ name: 'logging', scope: { level: 'info' }, reason: 'diagnostics' }],
    metadata: {}
  };
}

describe('PluginHost', () => {
  it('rejects invalid manifests and unsupported API ranges before runtime execution', async () => {
    const host = new PluginHost('1.2.0');
    await expect(host.register({ ...manifest('plugin.bad'), id: 'bad id' }, new ScriptedPlugin())).rejects.toThrow('invalid plugin id');
    await expect(host.register({ ...manifest('plugin.future'), apiVersionRange: '>=2.0.0 <3.0.0' }, new ScriptedPlugin())).rejects.toThrow('incompatible_api');
    expect(host.list().items).toHaveLength(0);
  });

  it('enforces lifecycle transitions and audits capability denial', async () => {
    const host = new PluginHost('1.2.0');
    await host.register(manifest('plugin.audit'), new ScriptedPlugin());
    await expect(host.transition('plugin.audit', 'start')).rejects.toThrow('invalid transition');
    for (const transition of ['load', 'init', 'start', 'stop', 'unload'] satisfies LifecycleTransition[]) {
      await host.transition('plugin.audit', transition);
    }
    expect(host.get('plugin.audit')?.state).toBe('unloaded');
    await expect(host.useCapability('plugin.audit', 'filesystem.read')).rejects.toThrow('capability_denied');
    expect(host.auditEvents()).toHaveLength(1);
  });

  it('orders hook subscribers by priority then plugin id', async () => {
    const host = new PluginHost('1.2.0');
    const laterB = manifest('plugin.b');
    laterB.hooks[0].priority = 20;
    const laterA = manifest('plugin.a');
    laterA.hooks[0].priority = 20;
    const first = manifest('plugin.priority');
    first.hooks[0].priority = 1;
    await host.register(laterB, new ScriptedPlugin({ hookOutput: { order: 'b' } }));
    await host.register(laterA, new ScriptedPlugin({ hookOutput: { order: 'a' } }));
    await host.register(first, new ScriptedPlugin({ hookOutput: { order: 'first' } }));
    for (const id of ['plugin.b', 'plugin.a', 'plugin.priority']) {
      for (const transition of ['load', 'init', 'start'] satisfies LifecycleTransition[]) {
        await host.transition(id, transition);
      }
    }
    const result = await host.dispatchHook({ hookName: 'event.received', correlationId: 'req-1', payload: { input: true }, hostApiVersion: '1.2.0' });
    expect(result.results.map((item) => item.pluginId)).toEqual(['plugin.priority', 'plugin.a', 'plugin.b']);
    expect(result.decision).toBe('accepted');
  });

  it('isolates thrown plugin errors and keeps host healthy', async () => {
    const host = new PluginHost('1.2.0');
    await host.register(manifest('plugin.crashy'), new ScriptedPlugin({ throwOnStart: true }));
    await host.transition('plugin.crashy', 'load');
    await host.transition('plugin.crashy', 'init');
    await expect(host.transition('plugin.crashy', 'start')).rejects.toThrow('plugin crash');
    const plugin = host.get('plugin.crashy');
    expect(plugin?.state).toBe('failed');
    expect(plugin?.lastError?.code).toBe('crash');
    expect(host.health().healthy).toBe(true);
  });

  it('supports dynamic import registration through a manifest entrypoint', async () => {
    const host = new PluginHost('1.2.0');
    const dynamicManifest = { ...manifest('plugin.dynamic'), entrypoint: new URL('../fixtures/dynamic-plugin.mjs', import.meta.url).href };
    await host.registerFromManifest(dynamicManifest);
    await host.transition('plugin.dynamic', 'load');
    await host.transition('plugin.dynamic', 'init');
    await host.transition('plugin.dynamic', 'start');
    const invocation: HookInvocation = { hookName: 'event.received', correlationId: 'req-2', payload: {}, hostApiVersion: '1.2.0' };
    const result = await host.dispatchHook(invocation);
    expect(result.finalPayload).toEqual({ dynamic: true });
  });

  it('rejects incompatible dynamic manifests before importing their entrypoint', async () => {
    const host = new PluginHost('1.2.0');
    const probeKey = 'pluginImportProbe';
    Reflect.deleteProperty(globalThis, probeKey);
    const source = 'Reflect.set(globalThis,"pluginImportProbe","loaded"); export default { load(){}, init(){}, start(){}, stop(){}, unload(){}, handleHook(){ return {}; } };';
    const dynamicManifest = { ...manifest('plugin.future'), apiVersionRange: '>=2.0.0 <3.0.0', entrypoint: `data:text/javascript,${encodeURIComponent(source)}` };

    await expect(host.registerFromManifest(dynamicManifest)).rejects.toThrow('incompatible_api');

    expect(Reflect.get(globalThis, probeKey)).toBeUndefined();
  });

  it('prevents disabled plugins from starting or receiving hooks', async () => {
    const host = new PluginHost('1.2.0');
    await host.register(manifest('plugin.disabled'), new ScriptedPlugin());
    host.updateSettings('plugin.disabled', false);
    await host.transition('plugin.disabled', 'load');
    await host.transition('plugin.disabled', 'init');
    await expect(host.transition('plugin.disabled', 'start')).rejects.toThrow('disabled plugin');
    const result = await host.dispatchHook({ hookName: 'event.received', correlationId: 'req-3', payload: {}, hostApiVersion: '1.2.0' });
    expect(result.results).toHaveLength(0);
  });
});

describe('HTTP API', () => {
  it('registers, lists, runs lifecycle, dispatches hooks, and reports health', async () => {
    const host = new PluginHost('1.2.0');
    host.registerRuntime('memory:audit', new ScriptedPlugin());
    const app = createApp(host);
    await request(app).post('/plugins').send(manifest('plugin.http')).expect(201);
    await request(app).post('/plugins/plugin.http/lifecycle/load').expect(200);
    await request(app).post('/plugins/plugin.http/lifecycle/init').expect(200);
    await request(app).post('/plugins/plugin.http/lifecycle/start').expect(200);
    const list = await request(app).get('/plugins').expect(200);
    expect(list.body.items).toHaveLength(1);
    const hook = await request(app).post('/hooks/event.received/dispatch').send({ correlationId: 'req-http', payload: {} }).expect(200);
    expect(hook.body.results).toHaveLength(1);
    const health = await request(app).get('/health').expect(200);
    expect(health.body.healthy).toBe(true);
  });
});
