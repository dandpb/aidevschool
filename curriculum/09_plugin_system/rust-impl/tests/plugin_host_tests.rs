use plugin_system_rust::*;

fn manifest(id: &str) -> PluginManifest {
    PluginManifest {
        id: id.to_string(),
        name: "Audit plugin".to_string(),
        version: "1.0.0".to_string(),
        api_version_range: ">=1.0.0 <2.0.0".to_string(),
        entrypoint: "memory:audit".to_string(),
        runtime: RuntimeKind::NativeModule,
        hooks: vec![HookSubscription {
            hook_name: "event.received".to_string(),
            priority: 10,
            handler_name: "events".to_string(),
            required_capabilities: vec![],
        }],
        capabilities: vec![CapabilityDeclaration {
            name: "logging".to_string(),
            scope: serde_json::json!({"level":"info"}),
            reason: "diagnostics".to_string(),
        }],
        metadata: serde_json::json!({}),
    }
}

#[test]
fn rejects_invalid_manifest_and_unsupported_api_without_runtime() {
    let mut host = PluginHost::new("1.2.0");
    assert!(host
        .register(
            PluginManifest {
                id: "bad id".to_string(),
                ..manifest("plugin.bad")
            },
            Box::new(ScriptedPlugin::default())
        )
        .is_err());
    let mut future = manifest("plugin.future");
    future.api_version_range = ">=2.0.0 <3.0.0".to_string();
    assert!(host
        .register(future, Box::new(ScriptedPlugin::default()))
        .is_err());
    assert_eq!(host.list().items.len(), 0);
}

#[test]
fn lifecycle_transitions_and_capability_denial_are_explicit() {
    let mut host = PluginHost::new("1.2.0");
    host.register(
        manifest("plugin.audit"),
        Box::new(ScriptedPlugin::default()),
    )
    .unwrap();
    assert!(host
        .transition("plugin.audit", LifecycleTransition::Start)
        .is_err());
    for transition in [
        LifecycleTransition::Load,
        LifecycleTransition::Init,
        LifecycleTransition::Start,
        LifecycleTransition::Stop,
        LifecycleTransition::Unload,
    ] {
        host.transition("plugin.audit", transition).unwrap();
    }
    assert_eq!(
        host.get("plugin.audit").unwrap().state,
        PluginState::Unloaded
    );
    assert!(host
        .use_capability("plugin.audit", "filesystem.read")
        .is_err());
    assert_eq!(host.audit_events().len(), 1);
}

#[test]
fn hooks_are_ordered_and_can_transform_payload() {
    let mut host = PluginHost::new("1.2.0");
    let mut later_b = manifest("plugin.b");
    later_b.hooks[0].priority = 20;
    let mut later_a = manifest("plugin.a");
    later_a.hooks[0].priority = 20;
    let mut first = manifest("plugin.priority");
    first.hooks[0].priority = 1;
    host.register(
        later_b,
        Box::new(ScriptedPlugin::with_output(
            serde_json::json!({"order":"b"}),
        )),
    )
    .unwrap();
    host.register(
        later_a,
        Box::new(ScriptedPlugin::with_output(
            serde_json::json!({"order":"a"}),
        )),
    )
    .unwrap();
    host.register(
        first,
        Box::new(ScriptedPlugin::with_output(
            serde_json::json!({"order":"first"}),
        )),
    )
    .unwrap();
    for id in ["plugin.b", "plugin.a", "plugin.priority"] {
        for transition in [
            LifecycleTransition::Load,
            LifecycleTransition::Init,
            LifecycleTransition::Start,
        ] {
            host.transition(id, transition).unwrap();
        }
    }
    let result = host
        .dispatch_hook(HookInvocation {
            hook_name: "event.received".to_string(),
            correlation_id: "req-1".to_string(),
            payload: serde_json::json!({"input": true}),
            host_api_version: "1.2.0".to_string(),
        })
        .unwrap();
    let ids: Vec<_> = result
        .results
        .iter()
        .map(|r| r.plugin_id.as_str())
        .collect();
    assert_eq!(ids, vec!["plugin.priority", "plugin.a", "plugin.b"]);
    assert_eq!(result.decision, DispatchDecision::Accepted);
}

#[test]
fn plugin_panic_is_caught_and_host_stays_healthy() {
    let mut host = PluginHost::new("1.2.0");
    host.register(
        manifest("plugin.crashy"),
        Box::new(ScriptedPlugin::panic_on_start()),
    )
    .unwrap();
    host.transition("plugin.crashy", LifecycleTransition::Load)
        .unwrap();
    host.transition("plugin.crashy", LifecycleTransition::Init)
        .unwrap();
    assert!(host
        .transition("plugin.crashy", LifecycleTransition::Start)
        .is_err());
    let plugin = host.get("plugin.crashy").unwrap();
    assert_eq!(plugin.state, PluginState::Failed);
    assert_eq!(
        plugin.last_error.as_ref().unwrap().code,
        PluginErrorCode::Crash
    );
    assert!(host.health().healthy);
}

#[test]
fn disabled_plugin_cannot_start_or_receive_hooks() {
    let mut host = PluginHost::new("1.2.0");
    host.register(
        manifest("plugin.disabled"),
        Box::new(ScriptedPlugin::default()),
    )
    .unwrap();
    host.update_settings("plugin.disabled", false).unwrap();
    host.transition("plugin.disabled", LifecycleTransition::Load)
        .unwrap();
    host.transition("plugin.disabled", LifecycleTransition::Init)
        .unwrap();
    assert!(host
        .transition("plugin.disabled", LifecycleTransition::Start)
        .is_err());
    let result = host
        .dispatch_hook(HookInvocation {
            hook_name: "event.received".to_string(),
            correlation_id: "req-2".to_string(),
            payload: serde_json::json!({}),
            host_api_version: "1.2.0".to_string(),
        })
        .unwrap();
    assert!(result.results.is_empty());
}
