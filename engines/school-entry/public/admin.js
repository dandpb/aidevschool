import { api, element } from "./api.js";

const status = document.querySelector("#admin-status");
const login = document.querySelector("#login-section");
const panel = document.querySelector("#admin-section");
const list = document.querySelector("#admin-engines");
let csrfToken;

function signedOut() {
  csrfToken = undefined;
  list.replaceChildren();
  panel.hidden = true;
  login.hidden = false;
}

function healthLabel(engine) {
  if (!engine.targetConfigured) return "Destino não configurado";
  const health = engine.health;
  if (health?.status === "healthy" || health?.healthy === true)
    return "Última checagem: entrada utilizável";
  if (health?.status === "unhealthy" || health?.healthy === false)
    return "Última checagem: indisponível";
  return "Destino configurado · checagem na consulta do aluno";
}

function row(engine) {
  let current = engine;
  const item = element("article", "admin-row");
  item.dataset.adminEngine = engine.id;
  const detail = element("div", "admin-engine-detail");
  detail.append(
    element("h2", "", engine.name),
    element("p", "", engine.description),
    element("p", "target-status", healthLabel(engine)),
  );
  const controls = element("div", "release-control");
  const label = element("label", "switch-label");
  const toggle = element("input");
  toggle.type = "checkbox";
  toggle.checked = Boolean(current.enabled);
  toggle.setAttribute("aria-label", `Liberar ${engine.name}`);
  const text = element("span", "", toggle.checked ? "Liberada" : "Bloqueada");
  label.append(toggle, text);
  const feedback = element("p", "save-status");
  feedback.setAttribute("role", "status");
  toggle.addEventListener("change", async () => {
    const enabled = toggle.checked;
    toggle.disabled = true;
    feedback.textContent = "Salvando…";
    try {
      const response = await api(
        `/api/admin/engines/${encodeURIComponent(engine.id)}`,
        {
          method: "PUT",
          csrfToken,
          body: { enabled, version: current.version },
        },
      );
      current = response.engine || response;
      toggle.checked = Boolean(current.enabled);
      text.textContent = current.enabled ? "Liberada" : "Bloqueada";
      feedback.textContent = "Alteração salva.";
    } catch (error) {
      toggle.checked = Boolean(current.enabled);
      feedback.textContent =
        error.status === 409
          ? "A configuração mudou. Atualize a página antes de tentar novamente."
          : error.message;
      if (error.status === 401) {
        signedOut();
        status.textContent = "Sua sessão expirou. Entre novamente.";
      }
    } finally {
      toggle.disabled = false;
    }
  });
  controls.append(label, feedback);
  item.append(detail, controls);
  return item;
}

async function showEngines() {
  status.textContent = "Consultando engines…";
  const { engines } = await api("/api/admin/engines");
  list.replaceChildren(...engines.map(row));
  login.hidden = true;
  panel.hidden = false;
  status.textContent = engines.length ? "" : "Nenhuma engine cadastrada.";
}

document
  .querySelector("#login-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    const field = document.querySelector("#password");
    button.disabled = true;
    status.textContent = "Entrando…";
    try {
      const session = await api("/api/session", {
        method: "POST",
        body: { password: field.value },
      });
      field.value = "";
      csrfToken = session.csrfToken;
      await showEngines();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
document.querySelector("#logout").addEventListener("click", async () => {
  try {
    await api("/api/session", { method: "DELETE", csrfToken, body: {} });
    signedOut();
    status.textContent = "Sessão encerrada.";
  } catch (error) {
    status.textContent = error.message;
  }
});

try {
  const session = await api("/api/session");
  if (session.authenticated) {
    csrfToken = session.csrfToken;
    await showEngines();
  } else signedOut();
} catch (error) {
  signedOut();
  status.textContent = error.message;
}
