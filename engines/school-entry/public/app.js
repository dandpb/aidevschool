import { api, element } from "./api.js";

const form = document.querySelector("#recommend-form");
const submit = document.querySelector("#recommend-submit");
const status = document.querySelector("#request-status");
const results = document.querySelector("#results");
const cards = document.querySelector("#engine-cards");
let activeRequest = 0;
let controller;

const copy = {
  recommended: [
    "Caminhos para você",
    "Escolha a experiência que mais combina com seu momento.",
  ],
  fallback: [
    "Experiências disponíveis",
    "Não foi possível personalizar agora. Estas experiências estão disponíveis.",
  ],
  "no-match": [
    "Outras experiências disponíveis",
    "Nenhuma experiência disponível combina bem com esse pedido. Veja outras opções disponíveis.",
  ],
  empty: [
    "Nenhuma experiência disponível no momento",
    "Tente novamente mais tarde.",
  ],
  catalog: [
    "Experiências disponíveis",
    "Escolha uma experiência para começar.",
  ],
};

function render(data) {
  const mode = data.mode || (data.engines.length ? "catalog" : "empty");
  const [title, message] = copy[mode] || copy.fallback;
  results.hidden = false;
  results.dataset.resultMode = mode;
  document.querySelector("#results-title").textContent = title;
  document.querySelector("#results-message").textContent = message;
  cards.replaceChildren();
  for (const engine of data.engines) {
    const card = element("article", "engine-card");
    card.dataset.engineCard = "";
    card.dataset.engineId = engine.id;
    card.append(
      element("h3", "", engine.name),
      element("p", "engine-description", engine.description),
    );
    if (mode === "recommended" && engine.reason) {
      const reason = element("div", "engine-reason");
      reason.append(
        element("p", "reason-label", "Por que pode combinar com você"),
        element("p", "", engine.reason),
      );
      card.append(reason);
    }
    const button = element("button", "primary", "Começar");
    button.type = "button";
    const feedback = element("p", "card-feedback");
    feedback.setAttribute("role", "status");
    button.addEventListener("click", async () => {
      button.disabled = true;
      feedback.textContent = "Confirmando disponibilidade…";
      try {
        const { url } = await api(
          `/api/launch/${encodeURIComponent(engine.id)}`,
          { method: "POST", body: {} },
        );
        const destination = new URL(url);
        if (!["https:", "http:"].includes(destination.protocol))
          throw new Error("Destino indisponível.");
        window.location.assign(destination.href);
      } catch (error) {
        feedback.textContent = error.message;
        button.disabled = false;
      }
    });
    card.append(button, feedback);
    cards.append(card);
  }
}

async function load(path, options) {
  const request = ++activeRequest;
  controller?.abort();
  controller = new AbortController();
  submit.disabled = true;
  status.classList.remove("error");
  status.textContent = "Verificando as experiências disponíveis…";
  results.setAttribute("aria-busy", "true");
  try {
    const data = await api(path, { ...options, signal: controller.signal });
    if (request !== activeRequest) return;
    render(data);
    status.textContent = "";
  } catch (error) {
    if (request !== activeRequest || error.name === "AbortError") return;
    results.hidden = true;
    cards.replaceChildren();
    status.classList.add("error");
    status.textContent = error.message;
  } finally {
    if (request === activeRequest) {
      submit.disabled = false;
      results.setAttribute("aria-busy", "false");
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#description");
  const description = input.value.trim();
  if (!description) {
    status.textContent = "Conte um pouco sobre o que você quer aprender.";
    input.focus();
    return;
  }
  void load("/api/recommend", { method: "POST", body: { description } });
});
document
  .querySelector("#show-catalog")
  .addEventListener("click", () => void load("/api/engines"));
