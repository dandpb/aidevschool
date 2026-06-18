use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::time::Instant;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginState {
    Registered,
    Loaded,
    Initialized,
    Running,
    Stopped,
    Unloaded,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeKind {
    NativeModule,
    Wasm,
    Subprocess,
}

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum LifecycleTransition {
    Load,
    Init,
    Start,
    Stop,
    Unload,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginErrorCode {
    InvalidManifest,
    IncompatibleApi,
    CapabilityDenied,
    Crash,
    InternalError,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorPhase {
    Registration,
    Load,
    Init,
    Start,
    Stop,
    Unload,
    Hook,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HookStatus {
    Success,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DispatchDecision {
    Accepted,
    Unchanged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub api_version_range: String,
    pub entrypoint: String,
    pub runtime: RuntimeKind,
    pub hooks: Vec<HookSubscription>,
    pub capabilities: Vec<CapabilityDeclaration>,
    pub metadata: Value,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookSubscription {
    pub hook_name: String,
    pub priority: i32,
    pub handler_name: String,
    pub required_capabilities: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityDeclaration {
    pub name: String,
    pub scope: Value,
    pub reason: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityGrant {
    pub name: String,
    pub scope: Value,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxDescriptor {
    pub sandbox_type: String,
    pub memory_limit_bytes: u64,
    pub network_policy: String,
    pub filesystem_policy: String,
}
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PluginMetrics {
    pub lifecycle_calls: u64,
    pub hook_calls: u64,
    pub hook_failures: u64,
    pub crash_count: u64,
    pub last_duration_ms: u128,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiCompatibility {
    pub host_api_version: String,
    pub plugin_api_version_range: String,
    pub compatible: bool,
    pub reason: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PluginError {
    pub code: PluginErrorCode,
    pub message: String,
    pub phase: ErrorPhase,
    pub retryable: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub plugin_id: String,
    pub capability: String,
    pub decision: String,
    pub reason: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginRecord {
    pub id: String,
    pub manifest: PluginManifest,
    pub state: PluginState,
    pub enabled: bool,
    pub api_compatibility: ApiCompatibility,
    pub granted_capabilities: Vec<CapabilityGrant>,
    pub registered_hooks: Vec<HookSubscription>,
    pub sandbox: SandboxDescriptor,
    pub last_error: Option<PluginError>,
    pub metrics: PluginMetrics,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookInvocation {
    pub hook_name: String,
    pub correlation_id: String,
    pub payload: Value,
    pub host_api_version: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookResult {
    pub plugin_id: String,
    pub status: HookStatus,
    pub output: Option<Value>,
    pub error: Option<PluginError>,
    pub duration_ms: u128,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookDispatchResult {
    pub hook_name: String,
    pub correlation_id: String,
    pub mode: String,
    pub results: Vec<HookResult>,
    pub final_payload: Value,
    pub decision: DispatchDecision,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginList {
    pub items: Vec<PluginRecord>,
    pub next_cursor: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthReport {
    pub healthy: bool,
    pub registered: usize,
    pub running: usize,
}

pub trait PluginRuntime: Send {
    fn load(&mut self, manifest: &PluginManifest, context: &HostContext) -> Result<(), String>;
    fn init(&mut self, granted_capabilities: &[CapabilityGrant]) -> Result<(), String>;
    fn start(&mut self) -> Result<(), String>;
    fn stop(&mut self, reason: &str) -> Result<(), String>;
    fn unload(&mut self) -> Result<(), String>;
    fn handle_hook(&mut self, invocation: &HookInvocation) -> Result<Value, String>;
}

#[derive(Debug, Clone)]
pub struct HostContext {
    pub host_api_version: String,
    pub plugin_id: String,
}

pub struct PluginHost {
    host_api_version: String,
    plugins: HashMap<String, PluginRecord>,
    runtimes: HashMap<String, Box<dyn PluginRuntime>>,
    audit: Vec<AuditEvent>,
}

impl PluginHost {
    pub fn new(host_api_version: &str) -> Self {
        Self {
            host_api_version: host_api_version.to_string(),
            plugins: HashMap::new(),
            runtimes: HashMap::new(),
            audit: vec![],
        }
    }

    pub fn register(
        &mut self,
        manifest: PluginManifest,
        runtime: Box<dyn PluginRuntime>,
    ) -> Result<PluginRecord, PluginError> {
        validate_manifest(&manifest)?;
        let api_compatibility = negotiate(&self.host_api_version, &manifest.api_version_range);
        if !api_compatibility.compatible {
            return Err(plugin_error(
                PluginErrorCode::IncompatibleApi,
                ErrorPhase::Registration,
                api_compatibility.reason.clone().unwrap_or_default(),
            ));
        }
        if self.plugins.contains_key(&manifest.id) {
            return Err(plugin_error(
                PluginErrorCode::InvalidManifest,
                ErrorPhase::Registration,
                "duplicate plugin id",
            ));
        }
        let grants = manifest
            .capabilities
            .iter()
            .map(|c| CapabilityGrant {
                name: c.name.clone(),
                scope: c.scope.clone(),
            })
            .collect::<Vec<_>>();
        let record = PluginRecord {
            id: manifest.id.clone(),
            registered_hooks: manifest.hooks.clone(),
            manifest: manifest.clone(),
            state: PluginState::Registered,
            enabled: true,
            api_compatibility,
            granted_capabilities: grants,
            sandbox: SandboxDescriptor {
                sandbox_type: "trait_object_catch_unwind_boundary".to_string(),
                memory_limit_bytes: 64 * 1024 * 1024,
                network_policy: "declared_only".to_string(),
                filesystem_policy: "declared_paths".to_string(),
            },
            last_error: None,
            metrics: PluginMetrics::default(),
        };
        self.runtimes.insert(manifest.id.clone(), runtime);
        self.plugins.insert(manifest.id.clone(), record.clone());
        Ok(record)
    }

    pub fn transition(
        &mut self,
        id: &str,
        transition: LifecycleTransition,
    ) -> Result<PluginRecord, PluginError> {
        let state = self
            .plugins
            .get(id)
            .ok_or_else(|| {
                plugin_error(
                    PluginErrorCode::InternalError,
                    ErrorPhase::Registration,
                    "plugin not found",
                )
            })?
            .state
            .clone();
        if transition == LifecycleTransition::Start && !self.plugins.get(id).unwrap().enabled {
            return Err(plugin_error(
                PluginErrorCode::InternalError,
                ErrorPhase::Start,
                "disabled plugin cannot start",
            ));
        }
        allowed(&state, transition)?;
        let phase = phase_for(transition);
        let (manifest, grants) = {
            let record = self.plugins.get_mut(id).unwrap();
            record.metrics.lifecycle_calls += 1;
            (record.manifest.clone(), record.granted_capabilities.clone())
        };
        let runtime = self.runtimes.get_mut(id).unwrap();
        let start = Instant::now();
        let call = catch_unwind(AssertUnwindSafe(|| match transition {
            LifecycleTransition::Load => runtime.load(
                &manifest,
                &HostContext {
                    host_api_version: self.host_api_version.clone(),
                    plugin_id: id.to_string(),
                },
            ),
            LifecycleTransition::Init => runtime.init(&grants),
            LifecycleTransition::Start => runtime.start(),
            LifecycleTransition::Stop => runtime.stop("requested"),
            LifecycleTransition::Unload => runtime.unload(),
        }));
        let record = self.plugins.get_mut(id).unwrap();
        record.metrics.last_duration_ms = start.elapsed().as_millis();
        let call_result = match call {
            Ok(result) => result,
            Err(_) => Err("plugin panic".to_string()),
        };
        if let Err(message) = call_result {
            let err = plugin_error(PluginErrorCode::Crash, phase, message);
            record.last_error = Some(err.clone());
            record.metrics.crash_count += 1;
            record.state = PluginState::Failed;
            return Err(err);
        }
        record.last_error = None;
        match transition {
            LifecycleTransition::Load => record.state = PluginState::Loaded,
            LifecycleTransition::Init => record.state = PluginState::Initialized,
            LifecycleTransition::Start => record.state = PluginState::Running,
            LifecycleTransition::Stop => record.state = PluginState::Stopped,
            LifecycleTransition::Unload => {
                record.state = PluginState::Unloaded;
                record.registered_hooks.clear();
            }
        }
        Ok(record.clone())
    }

    pub fn dispatch_hook(
        &mut self,
        invocation: HookInvocation,
    ) -> Result<HookDispatchResult, PluginError> {
        let mut subscribers = self
            .plugins
            .iter()
            .filter_map(|(id, p)| {
                if p.enabled && p.state == PluginState::Running {
                    p.registered_hooks
                        .iter()
                        .find(|s| s.hook_name == invocation.hook_name)
                        .map(|s| (id.clone(), s.clone()))
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();
        subscribers.sort_by(|a, b| a.1.priority.cmp(&b.1.priority).then_with(|| a.0.cmp(&b.0)));
        let mut result = HookDispatchResult {
            hook_name: invocation.hook_name.clone(),
            correlation_id: invocation.correlation_id.clone(),
            mode: "sequential".to_string(),
            results: vec![],
            final_payload: invocation.payload.clone(),
            decision: DispatchDecision::Unchanged,
        };
        for (id, _) in subscribers {
            let runtime = self.runtimes.get_mut(&id).unwrap();
            let start = Instant::now();
            let call = catch_unwind(AssertUnwindSafe(|| runtime.handle_hook(&invocation)));
            let record = self.plugins.get_mut(&id).unwrap();
            record.metrics.hook_calls += 1;
            record.metrics.last_duration_ms = start.elapsed().as_millis();
            match call {
                Ok(Ok(output)) => {
                    result.final_payload = output.clone();
                    result.decision = DispatchDecision::Accepted;
                    result.results.push(HookResult {
                        plugin_id: id,
                        status: HookStatus::Success,
                        output: Some(output),
                        error: None,
                        duration_ms: record.metrics.last_duration_ms,
                    });
                }
                Ok(Err(message)) => {
                    let err = plugin_error(PluginErrorCode::Crash, ErrorPhase::Hook, message);
                    record.last_error = Some(err.clone());
                    record.metrics.hook_failures += 1;
                    result.results.push(HookResult {
                        plugin_id: id,
                        status: HookStatus::Failed,
                        output: None,
                        error: Some(err),
                        duration_ms: record.metrics.last_duration_ms,
                    });
                }
                Err(_) => {
                    let err =
                        plugin_error(PluginErrorCode::Crash, ErrorPhase::Hook, "plugin panic");
                    record.last_error = Some(err.clone());
                    record.metrics.hook_failures += 1;
                    result.results.push(HookResult {
                        plugin_id: id,
                        status: HookStatus::Failed,
                        output: None,
                        error: Some(err),
                        duration_ms: record.metrics.last_duration_ms,
                    });
                }
            }
        }
        Ok(result)
    }

    pub fn update_settings(
        &mut self,
        id: &str,
        enabled: bool,
    ) -> Result<PluginRecord, PluginError> {
        let record = self.plugins.get_mut(id).ok_or_else(|| {
            plugin_error(
                PluginErrorCode::InternalError,
                ErrorPhase::Registration,
                "plugin not found",
            )
        })?;
        record.enabled = enabled;
        Ok(record.clone())
    }
    pub fn get(&self, id: &str) -> Option<PluginRecord> {
        self.plugins.get(id).cloned()
    }
    pub fn list(&self) -> PluginList {
        let mut items = self.plugins.values().cloned().collect::<Vec<_>>();
        items.sort_by(|a, b| a.id.cmp(&b.id));
        PluginList {
            items,
            next_cursor: None,
        }
    }
    pub fn health(&self) -> HealthReport {
        HealthReport {
            healthy: true,
            registered: self.plugins.len(),
            running: self
                .plugins
                .values()
                .filter(|p| p.state == PluginState::Running)
                .count(),
        }
    }
    pub fn audit_events(&self) -> Vec<AuditEvent> {
        self.audit.clone()
    }
    pub fn use_capability(
        &mut self,
        id: &str,
        capability: &str,
    ) -> Result<CapabilityGrant, PluginError> {
        let record = self.plugins.get(id).ok_or_else(|| {
            plugin_error(
                PluginErrorCode::InternalError,
                ErrorPhase::Registration,
                "plugin not found",
            )
        })?;
        if let Some(grant) = record
            .granted_capabilities
            .iter()
            .find(|g| g.name == capability)
        {
            self.audit.push(AuditEvent {
                plugin_id: id.to_string(),
                capability: capability.to_string(),
                decision: "granted".to_string(),
                reason: "declared".to_string(),
            });
            return Ok(grant.clone());
        }
        self.audit.push(AuditEvent {
            plugin_id: id.to_string(),
            capability: capability.to_string(),
            decision: "denied".to_string(),
            reason: "not declared".to_string(),
        });
        Err(plugin_error(
            PluginErrorCode::CapabilityDenied,
            ErrorPhase::Init,
            format!("capability not declared: {capability}"),
        ))
    }
}

fn validate_manifest(manifest: &PluginManifest) -> Result<(), PluginError> {
    let required = [
        &manifest.id,
        &manifest.name,
        &manifest.version,
        &manifest.api_version_range,
        &manifest.entrypoint,
    ];
    if required.iter().any(|v| v.is_empty()) {
        return Err(plugin_error(
            PluginErrorCode::InvalidManifest,
            ErrorPhase::Registration,
            "missing required manifest field",
        ));
    }
    if !manifest
        .id
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '.' || c == '-')
        || manifest.id.contains(' ')
        || manifest.id.contains("..")
    {
        return Err(plugin_error(
            PluginErrorCode::InvalidManifest,
            ErrorPhase::Registration,
            "invalid plugin id",
        ));
    }
    Ok(())
}
fn negotiate(host: &str, range: &str) -> ApiCompatibility {
    let compatible = range.contains(">=1.0.0") && range.contains("<2.0.0");
    ApiCompatibility {
        host_api_version: host.to_string(),
        plugin_api_version_range: range.to_string(),
        compatible,
        reason: (!compatible).then(|| format!("host api {host} outside range {range}")),
    }
}
fn allowed(state: &PluginState, transition: LifecycleTransition) -> Result<(), PluginError> {
    let ok = matches!(
        (state, transition),
        (PluginState::Registered, LifecycleTransition::Load)
            | (PluginState::Loaded, LifecycleTransition::Init)
            | (PluginState::Initialized, LifecycleTransition::Start)
            | (PluginState::Running, LifecycleTransition::Stop)
            | (PluginState::Stopped, LifecycleTransition::Stop)
            | (PluginState::Stopped, LifecycleTransition::Unload)
    );
    if ok {
        Ok(())
    } else {
        Err(plugin_error(
            PluginErrorCode::InternalError,
            phase_for(transition),
            format!("invalid transition from {state:?}"),
        ))
    }
}
fn phase_for(transition: LifecycleTransition) -> ErrorPhase {
    match transition {
        LifecycleTransition::Load => ErrorPhase::Load,
        LifecycleTransition::Init => ErrorPhase::Init,
        LifecycleTransition::Start => ErrorPhase::Start,
        LifecycleTransition::Stop => ErrorPhase::Stop,
        LifecycleTransition::Unload => ErrorPhase::Unload,
    }
}
fn plugin_error(
    code: PluginErrorCode,
    phase: ErrorPhase,
    message: impl Into<String>,
) -> PluginError {
    PluginError {
        code,
        message: message.into(),
        phase,
        retryable: false,
    }
}

#[derive(Default)]
pub struct ScriptedPlugin {
    pub panic_on_start: bool,
    pub panic_on_hook: bool,
    output: Option<Value>,
}
impl ScriptedPlugin {
    pub fn with_output(output: Value) -> Self {
        Self {
            output: Some(output),
            ..Default::default()
        }
    }

    pub fn panic_on_start() -> Self {
        Self {
            panic_on_start: true,
            ..Default::default()
        }
    }
}
impl PluginRuntime for ScriptedPlugin {
    fn load(&mut self, _: &PluginManifest, _: &HostContext) -> Result<(), String> {
        Ok(())
    }
    fn init(&mut self, _: &[CapabilityGrant]) -> Result<(), String> {
        Ok(())
    }
    fn start(&mut self) -> Result<(), String> {
        if self.panic_on_start {
            panic!("boom")
        } else {
            Ok(())
        }
    }
    fn stop(&mut self, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn unload(&mut self) -> Result<(), String> {
        Ok(())
    }
    fn handle_hook(&mut self, _: &HookInvocation) -> Result<Value, String> {
        if self.panic_on_hook {
            panic!("hook boom")
        } else {
            Ok(self
                .output
                .clone()
                .unwrap_or_else(|| json!({"handled": true})))
        }
    }
}
