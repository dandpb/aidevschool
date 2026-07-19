import { createLogger, type Logger } from './logger';
import { Worker } from 'worker_threads';

export type PluginState = 'registered' | 'loaded' | 'initialized' | 'running' | 'stopped' | 'unloaded' | 'failed';
export type RuntimeKind = 'wasm' | 'dynamic_library' | 'subprocess' | 'javascript_vm' | 'native_module';
export type LifecycleTransition = 'load' | 'init' | 'start' | 'stop' | 'unload';
export type PluginErrorCode = 'invalid_manifest' | 'incompatible_api' | 'capability_denied' | 'crash' | 'internal_error';
export type ErrorPhase = 'registration' | 'load' | 'init' | 'start' | 'stop' | 'unload' | 'hook';
export type HookStatus = 'success' | 'failed';
export type DispatchDecision = 'accepted' | 'unchanged';
export type JsonObject = Record<string, unknown>;

export interface HookSubscription { hookName: string; priority: number; handlerName: string; requiredCapabilities: string[]; }
export interface CapabilityDeclaration { name: string; scope: unknown; reason: string; }
export interface CapabilityGrant { name: string; scope: unknown; grantedAt: string; }
export interface PluginManifest { id: string; name: string; version: string; apiVersionRange: string; entrypoint: string; runtime: RuntimeKind; hooks: HookSubscription[]; capabilities: CapabilityDeclaration[]; metadata?: JsonObject; }
export interface SandboxDescriptor { type: string; memoryLimitBytes: number; networkPolicy: string; filesystemPolicy: string; workerThreadsAvailable: boolean; }
export interface PluginError { code: PluginErrorCode; message: string; phase: ErrorPhase; retryable: boolean; occurredAt: string; }
export interface PluginMetrics { lifecycleCalls: number; hookCalls: number; hookFailures: number; crashCount: number; timeoutCount: number; lastDurationMs: number; }
export interface ApiCompatibility { hostApiVersion: string; pluginApiVersionRange: string; compatible: boolean; reason?: string; }
export interface PluginRecord { id: string; manifest: PluginManifest; state: PluginState; enabled: boolean; apiCompatibility: ApiCompatibility; grantedCapabilities: CapabilityGrant[]; registeredHooks: HookSubscription[]; sandbox: SandboxDescriptor; lastError?: PluginError; metrics: PluginMetrics; createdAt: string; updatedAt: string; }
export interface HookInvocation { hookName: string; correlationId: string; payload: JsonObject; hostApiVersion: string; }
export interface HookResult { pluginId: string; status: HookStatus; output?: JsonObject; error?: PluginError; durationMs: number; }
export interface HookDispatchResult { hookName: string; correlationId: string; mode: 'sequential'; results: HookResult[]; finalPayload: JsonObject; decision: DispatchDecision; }
export interface PluginList { items: PluginRecord[]; nextCursor: string | null; }
export interface HealthReport { healthy: boolean; registered: number; running: number; }
export interface AuditEvent { pluginId: string; capability: string; decision: 'granted' | 'denied'; reason: string; at: string; }
export interface HostContext { hostApiVersion: string; pluginId: string; logger: Logger; capabilityClient: { use: (name: string) => Promise<CapabilityGrant> }; }

export interface PluginRuntime {
  load(manifest: PluginManifest, context: HostContext): Promise<void> | void;
  init(config: JsonObject, grantedCapabilities: CapabilityGrant[]): Promise<void> | void;
  start(): Promise<void> | void;
  stop(reason: string): Promise<void> | void;
  unload(): Promise<void> | void;
  handleHook(invocation: HookInvocation): Promise<JsonObject> | JsonObject;
}

export class PluginHost {
  private readonly plugins = new Map<string, PluginRecord>();
  private readonly runtimes = new Map<string, PluginRuntime>();
  private readonly entrypointRuntimes = new Map<string, PluginRuntime>();
  private readonly audit: AuditEvent[] = [];
  private readonly logger = createLogger('silent' );

  constructor(private readonly hostApiVersion: string) {}

  registerRuntime(entrypoint: string, runtime: PluginRuntime): void {
    this.entrypointRuntimes.set(entrypoint, runtime);
  }

  async registerFromManifest(manifest: PluginManifest): Promise<PluginRecord> {
    validateManifest(manifest);
    const apiCompatibility = negotiate(this.hostApiVersion, manifest.apiVersionRange);
    if (!apiCompatibility.compatible) throw makeError('incompatible_api', 'registration', apiCompatibility.reason ?? 'unsupported API range');
    if (this.plugins.has(manifest.id)) throw makeError('invalid_manifest', 'registration', 'duplicate plugin id');
    const runtime = this.entrypointRuntimes.get(manifest.entrypoint) ?? await loadRuntimeFromEntrypoint(manifest.entrypoint);
    return this.register(manifest, runtime);
  }

  async register(manifest: PluginManifest, runtime: PluginRuntime): Promise<PluginRecord> {
    validateManifest(manifest);
    const apiCompatibility = negotiate(this.hostApiVersion, manifest.apiVersionRange);
    if (!apiCompatibility.compatible) throw makeError('incompatible_api', 'registration', apiCompatibility.reason ?? 'unsupported API range');
    if (this.plugins.has(manifest.id)) throw makeError('invalid_manifest', 'registration', 'duplicate plugin id');
    const now = new Date().toISOString();
    const grantedCapabilities = manifest.capabilities.map((capability) => ({ name: capability.name, scope: capability.scope, grantedAt: now }));
    const record: PluginRecord = {
      id: manifest.id,
      manifest,
      state: 'registered',
      enabled: true,
      apiCompatibility,
      grantedCapabilities,
      registeredHooks: [...manifest.hooks],
      sandbox: { type: 'dynamic_import_try_catch_boundary', memoryLimitBytes: 64 * 1024 * 1024, networkPolicy: 'declared_only', filesystemPolicy: 'declared_paths', workerThreadsAvailable: typeof Worker === 'function' },
      metrics: { lifecycleCalls: 0, hookCalls: 0, hookFailures: 0, crashCount: 0, timeoutCount: 0, lastDurationMs: 0 },
      createdAt: now,
      updatedAt: now
    };
    this.plugins.set(manifest.id, record);
    this.runtimes.set(manifest.id, runtime);
    return cloneRecord(record);
  }

  async transition(pluginId: string, transition: LifecycleTransition): Promise<PluginRecord> {
    const record = this.requirePlugin(pluginId);
    if (transition === 'start' && !record.enabled) throw makeError('internal_error', 'start', 'disabled plugin cannot start');
    assertTransition(record.state, transition);
    const runtime = this.runtimes.get(pluginId);
    if (!runtime) throw makeError('internal_error', 'registration', 'runtime not loaded');
    const phase = phaseFor(transition);
    record.metrics.lifecycleCalls += 1;
    const started = Date.now();
    try {
      if (transition === 'load') await runtime.load(record.manifest, this.contextFor(record));
      if (transition === 'init') await runtime.init({}, record.grantedCapabilities);
      if (transition === 'start') await runtime.start();
      if (transition === 'stop') await runtime.stop('requested');
      if (transition === 'unload') await runtime.unload();
      record.lastError = undefined;
      record.state = nextState(transition);
      if (transition === 'unload') record.registeredHooks = [];
    } catch (error) {
      record.lastError = makeError('crash', phase, `plugin crash: ${messageFrom(error)}`);
      record.metrics.crashCount += 1;
      record.state = 'failed';
      throw new Error(record.lastError.message);
    } finally {
      record.metrics.lastDurationMs = Date.now() - started;
      record.updatedAt = new Date().toISOString();
    }
    return cloneRecord(record);
  }

  async dispatchHook(invocation: HookInvocation): Promise<HookDispatchResult> {
    const subscribers = [...this.plugins.values()]
      .flatMap((plugin) => plugin.enabled && plugin.state === 'running' ? plugin.registeredHooks.filter((hook) => hook.hookName === invocation.hookName).map((hook) => ({ plugin, hook })) : [])
      .sort((left, right) => left.hook.priority - right.hook.priority || left.plugin.id.localeCompare(right.plugin.id));
    const dispatch: HookDispatchResult = { hookName: invocation.hookName, correlationId: invocation.correlationId, mode: 'sequential', results: [], finalPayload: invocation.payload, decision: 'unchanged' };
    for (const { plugin } of subscribers) {
      const runtime = this.runtimes.get(plugin.id);
      if (!runtime) continue;
      const started = Date.now();
      plugin.metrics.hookCalls += 1;
      try {
        const output = await runtime.handleHook(invocation);
        plugin.metrics.lastDurationMs = Date.now() - started;
        dispatch.finalPayload = output;
        dispatch.decision = 'accepted';
        dispatch.results.push({ pluginId: plugin.id, status: 'success', output, durationMs: plugin.metrics.lastDurationMs });
      } catch (error) {
        const pluginError = makeError('crash', 'hook', `plugin crash: ${messageFrom(error)}`);
        plugin.lastError = pluginError;
        plugin.metrics.hookFailures += 1;
        plugin.metrics.lastDurationMs = Date.now() - started;
        dispatch.results.push({ pluginId: plugin.id, status: 'failed', error: pluginError, durationMs: plugin.metrics.lastDurationMs });
      }
    }
    return dispatch;
  }

  updateSettings(pluginId: string, enabled: boolean): PluginRecord {
    const record = this.requirePlugin(pluginId);
    record.enabled = enabled;
    record.updatedAt = new Date().toISOString();
    return cloneRecord(record);
  }

  get(pluginId: string): PluginRecord | undefined {
    const record = this.plugins.get(pluginId);
    return record ? cloneRecord(record) : undefined;
  }

  list(): PluginList {
    return { items: [...this.plugins.values()].sort((a, b) => a.id.localeCompare(b.id)).map(cloneRecord), nextCursor: null };
  }

  health(): HealthReport {
    return { healthy: true, registered: this.plugins.size, running: [...this.plugins.values()].filter((plugin) => plugin.state === 'running').length };
  }

  auditEvents(): AuditEvent[] {
    return [...this.audit];
  }

  async useCapability(pluginId: string, capability: string): Promise<CapabilityGrant> {
    const record = this.requirePlugin(pluginId);
    const grant = record.grantedCapabilities.find((item) => item.name === capability);
    if (grant) {
      this.audit.push({ pluginId, capability, decision: 'granted', reason: 'declared', at: new Date().toISOString() });
      return grant;
    }
    this.audit.push({ pluginId, capability, decision: 'denied', reason: 'not declared', at: new Date().toISOString() });
    throw makeError('capability_denied', 'init', `capability not declared: ${capability}`);
  }

  private contextFor(record: PluginRecord): HostContext {
    return { hostApiVersion: this.hostApiVersion, pluginId: record.id, logger: this.logger.child({ pluginId: record.id }), capabilityClient: { use: (name) => this.useCapability(record.id, name) } };
  }

  private requirePlugin(pluginId: string): PluginRecord {
    const record = this.plugins.get(pluginId);
    if (!record) throw makeError('internal_error', 'registration', 'plugin not found');
    return record;
  }
}

export class ScriptedPlugin implements PluginRuntime {
  constructor(private readonly options: { throwOnStart?: boolean; hookOutput?: JsonObject } = {}) {}
  load(): void {}
  init(): void {}
  start(): void { if (this.options.throwOnStart) throw new Error('boom'); }
  stop(): void {}
  unload(): void {}
  handleHook(): JsonObject { return this.options.hookOutput ?? { handled: true }; }
}

function validateManifest(manifest: PluginManifest): void {
  if (!manifest.id || !manifest.name || !manifest.version || !manifest.apiVersionRange || !manifest.entrypoint || !manifest.runtime) throw makeError('invalid_manifest', 'registration', 'missing required manifest field');
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(manifest.id) || manifest.id.includes('..')) throw makeError('invalid_manifest', 'registration', 'invalid plugin id');
}

function negotiate(hostApiVersion: string, range: string): ApiCompatibility {
  const compatible = range.includes('>=1.0.0') && range.includes('<2.0.0');
  return { hostApiVersion, pluginApiVersionRange: range, compatible, reason: compatible ? undefined : `host api ${hostApiVersion} outside range ${range}` };
}

function assertTransition(state: PluginState, transition: LifecycleTransition): void {
  const allowed = (state === 'registered' && transition === 'load') || (state === 'loaded' && transition === 'init') || (state === 'initialized' && transition === 'start') || (state === 'running' && transition === 'stop') || (state === 'stopped' && (transition === 'stop' || transition === 'unload'));
  if (!allowed) throw makeError('internal_error', phaseFor(transition), `invalid transition ${transition} from ${state}`);
}

function nextState(transition: LifecycleTransition): PluginState {
  return { load: 'loaded', init: 'initialized', start: 'running', stop: 'stopped', unload: 'unloaded' }[transition] as PluginState;
}

function phaseFor(transition: LifecycleTransition): ErrorPhase {
  return transition;
}

function makeError(code: PluginErrorCode, phase: ErrorPhase, message: string): PluginError & Error {
  const error = new Error(`${code}: ${message}`) as PluginError & Error;
  error.code = code;
  error.message = `${code}: ${message}`;
  error.phase = phase;
  error.retryable = false;
  error.occurredAt = new Date().toISOString();
  return error;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function cloneRecord(record: PluginRecord): PluginRecord {
  return JSON.parse(JSON.stringify(record)) as PluginRecord;
}

async function loadRuntimeFromEntrypoint(entrypoint: string): Promise<PluginRuntime> {
  const moduleValue: unknown = await import(entrypoint);
  if (!isRuntimeModule(moduleValue)) throw makeError('invalid_manifest', 'load', 'entrypoint does not export a plugin runtime');
  return moduleValue.default;
}

function isRuntimeModule(value: unknown): value is { default: PluginRuntime } {
  if (typeof value !== 'object' || value === null || !('default' in value)) return false;
  const candidate = value.default;
  if (typeof candidate !== 'object' || candidate === null) return false;
  const runtime = candidate as Partial<Record<keyof PluginRuntime, unknown>>;
  return ['load', 'init', 'start', 'stop', 'unload', 'handleHook'].every((method) => typeof runtime[method as keyof PluginRuntime] === 'function');
}
