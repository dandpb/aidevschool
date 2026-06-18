package main

import "time"

type PluginState string
type RuntimeKind string
type LifecycleTransition string
type ErrorCode string
type ErrorPhase string
type HookStatus string
type DispatchDecision string

const (
	StateRegistered  PluginState = "registered"
	StateLoaded      PluginState = "loaded"
	StateInitialized PluginState = "initialized"
	StateRunning     PluginState = "running"
	StateStopped     PluginState = "stopped"
	StateUnloaded    PluginState = "unloaded"
	StateFailed      PluginState = "failed"

	RuntimeNativeModule RuntimeKind = "native_module"

	TransitionLoad   LifecycleTransition = "load"
	TransitionInit   LifecycleTransition = "init"
	TransitionStart  LifecycleTransition = "start"
	TransitionStop   LifecycleTransition = "stop"
	TransitionUnload LifecycleTransition = "unload"

	ErrorInvalidManifest  ErrorCode = "invalid_manifest"
	ErrorIncompatibleAPI  ErrorCode = "incompatible_api"
	ErrorCapabilityDenied ErrorCode = "capability_denied"
	ErrorCrash            ErrorCode = "crash"
	ErrorInternal         ErrorCode = "internal_error"

	PhaseRegistration ErrorPhase = "registration"
	PhaseLoad         ErrorPhase = "load"
	PhaseInit         ErrorPhase = "init"
	PhaseStart        ErrorPhase = "start"
	PhaseStop         ErrorPhase = "stop"
	PhaseUnload       ErrorPhase = "unload"
	PhaseHook         ErrorPhase = "hook"

	HookSuccess HookStatus = "success"
	HookFailed  HookStatus = "failed"

	DecisionAccepted  DispatchDecision = "accepted"
	DecisionUnchanged DispatchDecision = "unchanged"
)

type PluginManifest struct {
	ID              string                  `json:"id"`
	Name            string                  `json:"name"`
	Version         string                  `json:"version"`
	APIVersionRange string                  `json:"apiVersionRange"`
	Entrypoint      string                  `json:"entrypoint"`
	Runtime         RuntimeKind             `json:"runtime"`
	Hooks           []HookSubscription      `json:"hooks"`
	Capabilities    []CapabilityDeclaration `json:"capabilities"`
	Metadata        map[string]any          `json:"metadata,omitempty"`
}

type HookSubscription struct {
	HookName             string   `json:"hookName"`
	Priority             int      `json:"priority"`
	HandlerName          string   `json:"handlerName"`
	RequiredCapabilities []string `json:"requiredCapabilities,omitempty"`
}

type CapabilityDeclaration struct {
	Name   string `json:"name"`
	Scope  any    `json:"scope"`
	Reason string `json:"reason"`
}
type CapabilityGrant struct {
	Name      string    `json:"name"`
	Scope     any       `json:"scope"`
	GrantedAt time.Time `json:"grantedAt"`
}
type SandboxDescriptor struct {
	Type             string `json:"type"`
	MemoryLimitBytes int64  `json:"memoryLimitBytes"`
	NetworkPolicy    string `json:"networkPolicy"`
	FilesystemPolicy string `json:"filesystemPolicy"`
}
type PluginMetrics struct {
	LifecycleCalls int   `json:"lifecycleCalls"`
	HookCalls      int   `json:"hookCalls"`
	HookFailures   int   `json:"hookFailures"`
	TimeoutCount   int   `json:"timeoutCount"`
	CrashCount     int   `json:"crashCount"`
	LastDurationMs int64 `json:"lastDurationMs"`
}
type ApiCompatibility struct {
	HostAPIVersion        string `json:"hostApiVersion"`
	PluginAPIVersionRange string `json:"pluginApiVersionRange"`
	Compatible            bool   `json:"compatible"`
	Reason                string `json:"reason,omitempty"`
}
type PluginError struct {
	Code       ErrorCode  `json:"code"`
	Message    string     `json:"message"`
	Phase      ErrorPhase `json:"phase"`
	Retryable  bool       `json:"retryable"`
	OccurredAt time.Time  `json:"occurredAt"`
}

func (e *PluginError) Error() string { return string(e.Code) + ": " + e.Message }

type AuditEvent struct {
	PluginID   string    `json:"pluginId"`
	Capability string    `json:"capability"`
	Decision   string    `json:"decision"`
	Reason     string    `json:"reason"`
	At         time.Time `json:"at"`
}

type PluginRecord struct {
	ID                  string             `json:"id"`
	Manifest            PluginManifest     `json:"manifest"`
	State               PluginState        `json:"state"`
	Enabled             bool               `json:"enabled"`
	ApiCompatibility    ApiCompatibility   `json:"apiCompatibility"`
	GrantedCapabilities []CapabilityGrant  `json:"grantedCapabilities"`
	RegisteredHooks     []HookSubscription `json:"registeredHooks"`
	Sandbox             SandboxDescriptor  `json:"sandbox"`
	LastError           *PluginError       `json:"lastError,omitempty"`
	Metrics             PluginMetrics      `json:"metrics"`
	CreatedAt           time.Time          `json:"createdAt"`
	UpdatedAt           time.Time          `json:"updatedAt"`
}

type HookInvocation struct {
	HookName       string         `json:"hookName"`
	CorrelationID  string         `json:"correlationId"`
	Payload        map[string]any `json:"payload"`
	Deadline       time.Time      `json:"deadline"`
	HostAPIVersion string         `json:"hostApiVersion"`
}
type HookResult struct {
	PluginID   string         `json:"pluginId"`
	Status     HookStatus     `json:"status"`
	Output     map[string]any `json:"output,omitempty"`
	Error      *PluginError   `json:"error,omitempty"`
	DurationMs int64          `json:"durationMs"`
}
type HookDispatchResult struct {
	HookName      string           `json:"hookName"`
	CorrelationID string           `json:"correlationId"`
	Mode          string           `json:"mode"`
	Results       []HookResult     `json:"results"`
	FinalPayload  map[string]any   `json:"finalPayload,omitempty"`
	Decision      DispatchDecision `json:"decision"`
}
type PluginList struct {
	Items      []PluginRecord `json:"items"`
	NextCursor *string        `json:"nextCursor"`
}
type HealthReport struct {
	Healthy    bool `json:"healthy"`
	Registered int  `json:"registered"`
	Running    int  `json:"running"`
}
