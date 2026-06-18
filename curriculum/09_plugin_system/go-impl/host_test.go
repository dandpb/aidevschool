package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func validManifest(id string) PluginManifest {
	return PluginManifest{
		ID:              id,
		Name:            "Audit plugin",
		Version:         "1.0.0",
		APIVersionRange: ">=1.0.0 <2.0.0",
		Entrypoint:      "memory:audit",
		Runtime:         RuntimeNativeModule,
		Hooks:           []HookSubscription{{HookName: "event.received", Priority: 10, HandlerName: "events"}},
		Capabilities:    []CapabilityDeclaration{{Name: "logging", Scope: map[string]string{"level": "info"}, Reason: "structured plugin diagnostics"}},
	}
}

func TestRegisterRejectsInvalidManifestBeforeRuntimeExecution(t *testing.T) {
	host := NewHost("1.2.0")
	if _, err := host.Register(context.Background(), PluginManifest{ID: "bad id"}, nil); err == nil {
		t.Fatal("expected invalid manifest error")
	}
	if _, exists := host.Get("bad id"); exists {
		t.Fatal("invalid plugin should not be registered")
	}
}

func TestLifecycleTransitionsAndCapabilityDenial(t *testing.T) {
	host := NewHost("1.2.0")
	runtime := &ScriptedPlugin{}
	plugin, err := host.Register(context.Background(), validManifest("plugin.audit"), runtime)
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if plugin.State != StateRegistered {
		t.Fatalf("state = %s", plugin.State)
	}
	if _, err := host.Transition(context.Background(), plugin.ID, TransitionStart); err == nil {
		t.Fatal("start before init should be rejected")
	}
	for _, transition := range []LifecycleTransition{TransitionLoad, TransitionInit, TransitionStart, TransitionStop, TransitionUnload} {
		if _, err := host.Transition(context.Background(), plugin.ID, transition); err != nil {
			t.Fatalf("%s: %v", transition, err)
		}
	}
	plugin, _ = host.Get(plugin.ID)
	if plugin.State != StateUnloaded {
		t.Fatalf("final state = %s", plugin.State)
	}
	if _, err := host.UseCapability(plugin.ID, "filesystem.read"); err == nil {
		t.Fatal("undeclared capability should be denied")
	}
	if len(host.AuditEvents()) == 0 {
		t.Fatal("capability denial should be audited")
	}
}

func TestHooksRunInPriorityOrderAndTransformPayload(t *testing.T) {
	host := NewHost("1.2.0")
	first := &ScriptedPlugin{HookOutput: map[string]any{"order": "first"}}
	second := &ScriptedPlugin{HookOutput: map[string]any{"order": "second"}}
	manifestA := validManifest("plugin.b")
	manifestA.Hooks[0].Priority = 20
	manifestB := validManifest("plugin.a")
	manifestB.Hooks[0].Priority = 20
	manifestC := validManifest("plugin.priority")
	manifestC.Hooks[0].Priority = 1
	if _, err := host.Register(context.Background(), manifestA, second); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Register(context.Background(), manifestB, second); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Register(context.Background(), manifestC, first); err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{"plugin.b", "plugin.a", "plugin.priority"} {
		for _, tr := range []LifecycleTransition{TransitionLoad, TransitionInit, TransitionStart} {
			if _, err := host.Transition(context.Background(), id, tr); err != nil {
				t.Fatalf("%s %s: %v", id, tr, err)
			}
		}
	}
	result, err := host.DispatchHook(context.Background(), HookInvocation{HookName: "event.received", CorrelationID: "req-1", Payload: map[string]any{"input": true}})
	if err != nil {
		t.Fatal(err)
	}
	got := []string{result.Results[0].PluginID, result.Results[1].PluginID, result.Results[2].PluginID}
	want := []string{"plugin.priority", "plugin.a", "plugin.b"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("order = %v, want %v", got, want)
		}
	}
	if result.Decision != DecisionAccepted {
		t.Fatalf("decision = %s", result.Decision)
	}
}

func TestPanicIsolationKeepsHostHealthy(t *testing.T) {
	host := NewHost("1.2.0")
	if _, err := host.Register(context.Background(), validManifest("plugin.crashy"), &ScriptedPlugin{PanicOnStart: true}); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Transition(context.Background(), "plugin.crashy", TransitionLoad); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Transition(context.Background(), "plugin.crashy", TransitionInit); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Transition(context.Background(), "plugin.crashy", TransitionStart); err == nil {
		t.Fatal("panic should become plugin error")
	}
	plugin, ok := host.Get("plugin.crashy")
	if !ok || plugin.State != StateFailed || plugin.LastError == nil || plugin.LastError.Code != ErrorCrash {
		t.Fatalf("plugin after panic = %+v", plugin)
	}
	if !host.Health().Healthy {
		t.Fatal("host should remain healthy")
	}
}

func TestHTTPRegistersListsLifecycleAndHealth(t *testing.T) {
	host := NewHost("1.2.0")
	host.RegisterRuntime("memory:audit", &ScriptedPlugin{})
	server := httptest.NewServer(NewHTTPHandler(host))
	defer server.Close()

	body, _ := json.Marshal(validManifest("plugin.http"))
	resp, err := http.Post(server.URL+"/plugins", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("register status = %d", resp.StatusCode)
	}
	resp, err = http.Post(server.URL+"/plugins/plugin.http/lifecycle/load", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("load status = %d", resp.StatusCode)
	}
	resp, err = http.Get(server.URL + "/plugins")
	if err != nil {
		t.Fatal(err)
	}
	var list PluginList
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatal(err)
	}
	if len(list.Items) != 1 {
		t.Fatalf("items = %d", len(list.Items))
	}
	resp, err = http.Get(server.URL + "/health")
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("health status = %d", resp.StatusCode)
	}
}

func TestDisabledPluginCannotStartOrReceiveHooks(t *testing.T) {
	host := NewHost("1.2.0")
	runtime := &ScriptedPlugin{}
	if _, err := host.Register(context.Background(), validManifest("plugin.disabled"), runtime); err != nil {
		t.Fatal(err)
	}
	if _, err := host.UpdateSettings("plugin.disabled", false, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Transition(context.Background(), "plugin.disabled", TransitionLoad); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Transition(context.Background(), "plugin.disabled", TransitionInit); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Transition(context.Background(), "plugin.disabled", TransitionStart); err == nil {
		t.Fatal("disabled plugin should not start")
	}
	result, err := host.DispatchHook(context.Background(), HookInvocation{HookName: "event.received", CorrelationID: "req-2", Payload: map[string]any{}})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Results) != 0 {
		t.Fatalf("disabled hook invocations = %d", len(result.Results))
	}
}

func TestUnsupportedAPIRangeAndHookPanicAreIsolated(t *testing.T) {
	host := NewHost("1.2.0")
	incompatible := validManifest("plugin.future")
	incompatible.APIVersionRange = ">=2.0.0 <3.0.0"
	if _, err := host.Register(context.Background(), incompatible, &ScriptedPlugin{}); err == nil {
		t.Fatal("unsupported API range should be rejected")
	}
	panicHook := validManifest("plugin.hookpanic")
	if _, err := host.Register(context.Background(), panicHook, &ScriptedPlugin{PanicOnHook: true}); err != nil {
		t.Fatal(err)
	}
	for _, tr := range []LifecycleTransition{TransitionLoad, TransitionInit, TransitionStart} {
		if _, err := host.Transition(context.Background(), "plugin.hookpanic", tr); err != nil {
			t.Fatalf("%s: %v", tr, err)
		}
	}
	result, err := host.DispatchHook(context.Background(), HookInvocation{HookName: "event.received", CorrelationID: "req-3", Payload: map[string]any{}})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Results) != 1 || result.Results[0].Status != HookFailed {
		t.Fatalf("hook result = %+v", result.Results)
	}
	plugin, _ := host.Get("plugin.hookpanic")
	if plugin.Metrics.HookFailures != 1 || plugin.LastError == nil {
		t.Fatalf("plugin metrics/error = %+v", plugin)
	}
}
