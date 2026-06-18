package main

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

type PluginRuntime interface {
	Load(context.Context, PluginManifest, HostContext) error
	Init(context.Context, map[string]any, []CapabilityGrant) error
	Start(context.Context) error
	Stop(context.Context, string) error
	Unload(context.Context) error
	HandleHook(context.Context, HookInvocation) (map[string]any, error)
}

type HostContext struct {
	HostAPIVersion string
	PluginID       string
	Logger         *slog.Logger
}

type Host struct {
	mu                 sync.RWMutex
	hostAPIVersion     string
	plugins            map[string]*PluginRecord
	runtimes           map[string]PluginRuntime
	entrypointRuntimes map[string]PluginRuntime
	audit              []AuditEvent
	logger             *slog.Logger
}

func NewHost(apiVersion string) *Host {
	return &Host{hostAPIVersion: apiVersion, plugins: map[string]*PluginRecord{}, runtimes: map[string]PluginRuntime{}, entrypointRuntimes: map[string]PluginRuntime{}, logger: slog.Default()}
}

func (h *Host) RegisterRuntime(entrypoint string, runtime PluginRuntime) {
	h.entrypointRuntimes[entrypoint] = runtime
}

func (h *Host) Register(ctx context.Context, manifest PluginManifest, runtime PluginRuntime) (PluginRecord, error) {
	if err := validateManifest(manifest); err != nil {
		return PluginRecord{}, err
	}
	compatibility := negotiate(h.hostAPIVersion, manifest.APIVersionRange)
	if !compatibility.Compatible {
		return PluginRecord{}, pluginErr(ErrorIncompatibleAPI, PhaseRegistration, compatibility.Reason)
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, exists := h.plugins[manifest.ID]; exists {
		return PluginRecord{}, fmt.Errorf("plugin already registered")
	}
	if runtime == nil {
		runtime = h.entrypointRuntimes[manifest.Entrypoint]
	}
	if runtime == nil {
		runtime = &ScriptedPlugin{}
	}
	now := time.Now().UTC()
	grants := make([]CapabilityGrant, 0, len(manifest.Capabilities))
	for _, capability := range manifest.Capabilities {
		grants = append(grants, CapabilityGrant{Name: capability.Name, Scope: capability.Scope, GrantedAt: now})
	}
	record := &PluginRecord{ID: manifest.ID, Manifest: manifest, State: StateRegistered, Enabled: true, ApiCompatibility: compatibility, GrantedCapabilities: grants, RegisteredHooks: append([]HookSubscription(nil), manifest.Hooks...), Sandbox: SandboxDescriptor{Type: "in_process_recover_boundary", MemoryLimitBytes: 64 * 1024 * 1024, NetworkPolicy: "declared_only", FilesystemPolicy: "declared_paths"}, CreatedAt: now, UpdatedAt: now}
	h.plugins[manifest.ID] = record
	h.runtimes[manifest.ID] = runtime
	_ = ctx
	return *record, nil
}

func (h *Host) Transition(ctx context.Context, id string, transition LifecycleTransition) (PluginRecord, error) {
	h.mu.Lock()
	record, ok := h.plugins[id]
	runtime := h.runtimes[id]
	if !ok {
		h.mu.Unlock()
		return PluginRecord{}, fmt.Errorf("plugin not found")
	}
	if transition == TransitionStart && !record.Enabled {
		h.mu.Unlock()
		return *record, fmt.Errorf("disabled plugin cannot start")
	}
	if err := allowed(record.State, transition); err != nil {
		h.mu.Unlock()
		return *record, err
	}
	record.Metrics.LifecycleCalls++
	record.UpdatedAt = time.Now().UTC()
	manifest, grants := record.Manifest, append([]CapabilityGrant(nil), record.GrantedCapabilities...)
	h.mu.Unlock()
	start := time.Now()
	phase := phaseFor(transition)
	err := safeCall(func() error {
		switch transition {
		case TransitionLoad:
			return runtime.Load(ctx, manifest, HostContext{HostAPIVersion: h.hostAPIVersion, PluginID: id, Logger: h.logger.With("pluginId", id)})
		case TransitionInit:
			return runtime.Init(ctx, map[string]any{}, grants)
		case TransitionStart:
			return runtime.Start(ctx)
		case TransitionStop:
			return runtime.Stop(ctx, "requested")
		case TransitionUnload:
			return runtime.Unload(ctx)
		default:
			return fmt.Errorf("unknown transition")
		}
	})
	h.mu.Lock()
	defer h.mu.Unlock()
	record = h.plugins[id]
	record.Metrics.LastDurationMs = time.Since(start).Milliseconds()
	record.UpdatedAt = time.Now().UTC()
	if err != nil {
		record.LastError = pluginErr(ErrorCrash, phase, err.Error())
		record.Metrics.CrashCount++
		record.State = StateFailed
		return *record, err
	}
	record.LastError = nil
	switch transition {
	case TransitionLoad:
		record.State = StateLoaded
	case TransitionInit:
		record.State = StateInitialized
	case TransitionStart:
		record.State = StateRunning
	case TransitionStop:
		record.State = StateStopped
	case TransitionUnload:
		record.State = StateUnloaded
		record.RegisteredHooks = nil
	}
	return *record, nil
}

func (h *Host) DispatchHook(ctx context.Context, invocation HookInvocation) (HookDispatchResult, error) {
	h.mu.RLock()
	ids := make([]string, 0)
	subscriptionByID := map[string]HookSubscription{}
	for id, p := range h.plugins {
		if p.Enabled && p.State == StateRunning {
			for _, s := range p.RegisteredHooks {
				if s.HookName == invocation.HookName {
					ids = append(ids, id)
					subscriptionByID[id] = s
				}
			}
		}
	}
	sort.Slice(ids, func(i, j int) bool {
		a, b := subscriptionByID[ids[i]], subscriptionByID[ids[j]]
		if a.Priority == b.Priority {
			return ids[i] < ids[j]
		}
		return a.Priority < b.Priority
	})
	runtimes := map[string]PluginRuntime{}
	for _, id := range ids {
		runtimes[id] = h.runtimes[id]
	}
	h.mu.RUnlock()
	result := HookDispatchResult{HookName: invocation.HookName, CorrelationID: invocation.CorrelationID, Mode: "sequential", FinalPayload: invocation.Payload, Decision: DecisionUnchanged}
	for _, id := range ids {
		start := time.Now()
		output, err := func() (map[string]any, error) {
			var out map[string]any
			e := safeCall(func() error { var err error; out, err = runtimes[id].HandleHook(ctx, invocation); return err })
			return out, e
		}()
		hookResult := HookResult{PluginID: id, Status: HookSuccess, Output: output, DurationMs: time.Since(start).Milliseconds()}
		h.mu.Lock()
		p := h.plugins[id]
		p.Metrics.HookCalls++
		p.Metrics.LastDurationMs = hookResult.DurationMs
		if err != nil {
			e := pluginErr(ErrorCrash, PhaseHook, err.Error())
			p.LastError = e
			p.Metrics.HookFailures++
			hookResult.Status = HookFailed
			hookResult.Error = e
		}
		h.mu.Unlock()
		if output != nil {
			result.FinalPayload = output
			result.Decision = DecisionAccepted
		}
		result.Results = append(result.Results, hookResult)
	}
	return result, nil
}

func (h *Host) UpdateSettings(id string, enabled bool, configuration map[string]any) (PluginRecord, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	p, ok := h.plugins[id]
	if !ok {
		return PluginRecord{}, fmt.Errorf("plugin not found")
	}
	_ = configuration
	p.Enabled = enabled
	p.UpdatedAt = time.Now().UTC()
	return *p, nil
}
func (h *Host) Get(id string) (PluginRecord, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	p, ok := h.plugins[id]
	if !ok {
		return PluginRecord{}, false
	}
	return *p, true
}
func (h *Host) List() PluginList {
	h.mu.RLock()
	defer h.mu.RUnlock()
	items := make([]PluginRecord, 0, len(h.plugins))
	for _, p := range h.plugins {
		items = append(items, *p)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].ID < items[j].ID })
	return PluginList{Items: items}
}
func (h *Host) Health() HealthReport {
	h.mu.RLock()
	defer h.mu.RUnlock()
	running := 0
	for _, p := range h.plugins {
		if p.State == StateRunning {
			running++
		}
	}
	return HealthReport{Healthy: true, Registered: len(h.plugins), Running: running}
}
func (h *Host) AuditEvents() []AuditEvent {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return append([]AuditEvent(nil), h.audit...)
}
func (h *Host) UseCapability(id, capability string) (CapabilityGrant, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	p, ok := h.plugins[id]
	if !ok {
		return CapabilityGrant{}, fmt.Errorf("plugin not found")
	}
	for _, grant := range p.GrantedCapabilities {
		if grant.Name == capability {
			h.audit = append(h.audit, AuditEvent{PluginID: id, Capability: capability, Decision: "granted", Reason: "declared", At: time.Now().UTC()})
			return grant, nil
		}
	}
	h.audit = append(h.audit, AuditEvent{PluginID: id, Capability: capability, Decision: "denied", Reason: "not declared", At: time.Now().UTC()})
	return CapabilityGrant{}, pluginErr(ErrorCapabilityDenied, PhaseInit, "capability not declared: "+capability)
}

func validateManifest(m PluginManifest) error {
	if m.ID == "" || m.Name == "" || m.Version == "" || m.APIVersionRange == "" || m.Entrypoint == "" || m.Runtime == "" {
		return pluginErr(ErrorInvalidManifest, PhaseRegistration, "missing required manifest field")
	}
	if !regexp.MustCompile(`^[a-z0-9][a-z0-9.-]*$`).MatchString(m.ID) || strings.Contains(m.ID, "..") {
		return pluginErr(ErrorInvalidManifest, PhaseRegistration, "invalid plugin id")
	}
	return nil
}
func negotiate(host, rng string) ApiCompatibility {
	compatible := strings.Contains(rng, ">=1.0.0") && strings.Contains(rng, "<2.0.0")
	reason := ""
	if !compatible {
		reason = "host api " + host + " outside range " + rng
	}
	return ApiCompatibility{HostAPIVersion: host, PluginAPIVersionRange: rng, Compatible: compatible, Reason: reason}
}
func allowed(state PluginState, transition LifecycleTransition) error {
	table := map[LifecycleTransition]PluginState{TransitionLoad: StateRegistered, TransitionInit: StateLoaded, TransitionStart: StateInitialized, TransitionUnload: StateStopped}
	if transition == TransitionStop && (state == StateRunning || state == StateStopped) {
		return nil
	}
	if want, ok := table[transition]; ok && state == want {
		return nil
	}
	return fmt.Errorf("invalid transition %s from %s", transition, state)
}
func phaseFor(t LifecycleTransition) ErrorPhase {
	switch t {
	case TransitionLoad:
		return PhaseLoad
	case TransitionInit:
		return PhaseInit
	case TransitionStart:
		return PhaseStart
	case TransitionStop:
		return PhaseStop
	case TransitionUnload:
		return PhaseUnload
	default:
		return PhaseRegistration
	}
}
func safeCall(fn func() error) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			err = fmt.Errorf("plugin panic: %v", recovered)
		}
	}()
	return fn()
}
func pluginErr(code ErrorCode, phase ErrorPhase, message string) *PluginError {
	return &PluginError{Code: code, Message: message, Phase: phase, Retryable: false, OccurredAt: time.Now().UTC()}
}

type ScriptedPlugin struct {
	PanicOnStart bool
	PanicOnHook  bool
	HookOutput   map[string]any
}

func (s *ScriptedPlugin) Load(context.Context, PluginManifest, HostContext) error       { return nil }
func (s *ScriptedPlugin) Init(context.Context, map[string]any, []CapabilityGrant) error { return nil }
func (s *ScriptedPlugin) Start(context.Context) error {
	if s.PanicOnStart {
		panic("boom")
	}
	return nil
}
func (s *ScriptedPlugin) Stop(context.Context, string) error { return nil }
func (s *ScriptedPlugin) Unload(context.Context) error       { return nil }
func (s *ScriptedPlugin) HandleHook(context.Context, HookInvocation) (map[string]any, error) {
	if s.PanicOnHook {
		panic("hook boom")
	}
	if s.HookOutput != nil {
		return s.HookOutput, nil
	}
	return map[string]any{"handled": true}, nil
}
