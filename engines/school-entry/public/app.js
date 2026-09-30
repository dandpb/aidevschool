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
        await launch(engine.id);
      } catch (error) {
        if (error.status === 409) {
          await load("/api/engines");
          status.textContent =
            "Essa experiência ficou indisponível. Consulte as opções atuais.";
          return;
        }
        feedback.textContent = error.message;
        button.disabled = false;
      }
    });
    card.append(button, feedback);
    cards.append(card);
  }
}

async function launch(engineId) {
  const { url } = await api(`/api/launch/${encodeURIComponent(engineId)}`, {
    method: "POST",
    body: {},
  });
  const destination = new URL(url);
  if (!["https:", "http:"].includes(destination.protocol))
    throw Error("Destino indisponível.");
  window.location.assign(destination.href);
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

/* School entry surface (AID-3484): renders the verified entry contract
   from GET /api/entry and wires the fundamentals CTA through the same
   launch flow (operator release + Chromium recheck). No local progress,
   no cross-engine sync — the panel only recommends. */

function launchButton(engineId, label, className) {
  const button = element("button", className, null);
  button.type = "button";
  button.dataset.engineId = engineId;
  button.append(
    document.createTextNode(label + " "),
    (() => {
      const arrow = document.createElement("span");
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      return arrow;
    })(),
  );
  const feedback = element("p", "card-feedback");
  feedback.setAttribute("role", "status");
  button.addEventListener("click", async () => {
    button.disabled = true;
    feedback.textContent = "Confirmando disponibilidade…";
    try {
      await launch(engineId);
    } catch (error) {
      feedback.textContent =
        error.status === 409
          ? "Os fundamentos não estão disponíveis agora (liberação ou checagem pendente). Tente novamente mais tarde."
          : error.message;
      button.disabled = false;
    }
  });
  return { button, feedback };
}

function renderMission(fundamentals) {
  const panel = document.querySelector("#etapa-atual");
  panel.replaceChildren();
  const kicker = element("div", "mission-kicker");
  kicker.append(
    element("span", "", fundamentals.kicker),
    element("span", "mission-number", fundamentals.number),
  );
  panel.append(kicker);
  const icon = element("div", "mission-icon", "🧭");
  icon.setAttribute("aria-hidden", "true");
  panel.append(icon, element("h2", "", fundamentals.title));
  panel.append(element("p", "", fundamentals.description));
  const meta = element("div", "mission-meta");
  for (const tag of fundamentals.tags)
    meta.append(element("span", "tag", tag));
  panel.append(meta);
  const tasks = element("ul", "task-preview");
  fundamentals.tasks.forEach((task, index) => {
    const li = element("li");
    li.append(
      element("span", "", String(index + 1)),
      document.createTextNode(" " + task),
    );
    tasks.append(li);
  });
  panel.append(tasks);
  const { button, feedback } = launchButton(
    fundamentals.engineId,
    fundamentals.cta,
    "primary",
  );
  button.id = "start-fundamentals";
  panel.append(button, feedback, element("p", "mission-note", fundamentals.note));
}

function renderJourneys(journeys) {
  const section = document.querySelector("#jornadas");
  section.replaceChildren();
  for (const journey of journeys) {
    const card = element("article", "journey-card");
    card.id = "jornada-" + journey.id;
    const kicker = element(
      "span",
      "kicker " + (journey.id === "cotidiano" ? "kicker-gold" : "kicker-dev"),
      journey.audience,
    );
    card.append(kicker, element("h3", "", journey.title));
    card.append(element("p", "", journey.description));
    if (journey.bridge) {
      const details = element("details", "bridge");
      details.append(element("summary", "", journey.bridge.label));
      const list = element("ol", "bridge-list");
      for (const [id, title] of journey.bridge.lessons) {
        const li = element("li");
        li.append(
          element("span", "lesson-id", id),
          document.createTextNode(" " + title),
        );
        list.append(li);
      }
      details.append(list, element("p", "bridge-note", journey.bridge.note));
      card.append(details);
    }
    const { button, feedback } = launchButton(
      journey.engineId,
      journey.cta,
      "secondary",
    );
    card.append(button, feedback);
    section.append(card);
  }
}

async function renderEntry() {
  try {
    const entry = await api("/api/entry");
    renderMission(entry.fundamentals);
    renderJourneys(entry.journeys);
  } catch {
    const panel = document.querySelector("#etapa-atual");
    panel.replaceChildren(
      element(
        "p",
        "",
        "Não foi possível carregar a entrada agora. Recarregue a página.",
      ),
    );
  }
}
void renderEntry();

/* Help dialog */
const help = document.querySelector("#help");
document
  .querySelector("#help-btn")
  .addEventListener("click", () => help.showModal());
document
  .querySelector("#help-close")
  .addEventListener("click", () => help.close());

/* Journey focus from the textual map alternative */
for (const selector of ["#jornada-cotidiano", "#jornada-dev"]) {
  document
    .querySelector('.map-alt a[href="' + selector + '"]')
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(selector);
      if (!target) return;
      target.setAttribute("tabindex", "-1");
      target.focus();
      target.removeAttribute("tabindex");
    });
}

/* School map — Canvas 2D in the SDLCQuest identity (paper/mint islands),
   drawn in code; no external assets. Animation honors reduced motion. */
const canvas = document.querySelector("#world");
const motionButton = document.querySelector("#motion-btn");
if (canvas?.getContext) {
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
  let animating = !reduceMotion;
  let t = 0;
  function iso(x, y, w, h, top, left, right) {
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w * 0.5, y - h * 0.5);
    ctx.lineTo(x + w * 0.5, y + h * 0.5);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w * 0.5, y + h * 0.5);
    ctx.lineTo(x - w * 0.5, y - h * 0.5);
    ctx.closePath();
    ctx.fillStyle = top;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.5, y + h * 0.5);
    ctx.lineTo(x + w * 0.5, y - h * 0.5);
    ctx.lineTo(x, y - h);
    ctx.fillStyle = right;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x - w * 0.5, y + h * 0.5);
    ctx.lineTo(x - w * 0.5, y - h * 0.5);
    ctx.lineTo(x, y - h);
    ctx.fillStyle = left;
    ctx.fill();
  }
  function arrow(x1, y1, x2, y2, color) {
    const dx = x2 - x1,
      dy = y2 - y1,
      a = Math.atan2(dy, dx),
      hs = 13;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * 16, y2 - Math.sin(a) * 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * hs, y2 - Math.sin(a - 0.45) * hs);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * hs, y2 - Math.sin(a + 0.45) * hs);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function label(text, x, y, color, sub) {
    ctx.textAlign = "center";
    ctx.font = '650 15px "Avenir Next","Segoe UI",Arial,sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    if (sub) {
      ctx.font = '11px "SFMono-Regular",Consolas,monospace';
      ctx.fillStyle = "#8ba09e";
      ctx.fillText(sub, x, y + 17);
    }
  }
  function bob(base, amp) {
    return animating ? base + Math.sin(t / 42 + base) * amp : base;
  }
  function draw() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    t++;
    const W = canvas.width,
      H = canvas.height,
      s = W / 1040;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#101d28";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(167,230,205,0.05)";
    ctx.lineWidth = 1;
    for (let gy = 0; gy < H; gy += 26) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
    const fY = bob(H * 0.52, 3),
      cY = bob(H * 0.25, 4),
      dY = bob(H * 0.8, 4);
    iso(W * 0.24, fY, 190 * s + 90, 46 * s + 22, "#a7e6cd", "#6fc3a3", "#57ad8d");
    iso(W * 0.78, cY, 170 * s + 80, 42 * s + 20, "#e8c888", "#cfa969", "#b98f52");
    iso(W * 0.78, dY, 170 * s + 80, 42 * s + 20, "#5fbd9b", "#3f9a7c", "#2e7a61");
    arrow(W * 0.35, fY - 14, W * 0.66, cY + 26, "rgba(232,200,136,0.85)");
    arrow(W * 0.35, fY + 18, W * 0.66, dY - 20, "rgba(167,230,205,0.8)");
    label("Fundamentos", W * 0.24, fY + 8, "#0f231c", "L01–L14 · COMECE AQUI");
    label("IA no cotidiano", W * 0.78, cY + 8, "#231a09", "JORNADA 1");
    label("IA para Dev", W * 0.78, dY + 8, "#081712", "JORNADA 2 · PRÉVIA");
    if (animating) requestAnimationFrame(draw);
  }
  function syncMotionButton() {
    motionButton?.setAttribute("aria-pressed", String(!animating));
    if (motionButton)
      motionButton.textContent = animating
        ? "Ⅱ Pausar cenário"
        : "▶ Retomar cenário";
  }
  motionButton?.addEventListener("click", () => {
    animating = !animating;
    syncMotionButton();
    if (animating) requestAnimationFrame(draw);
    else draw();
  });
  window.addEventListener("resize", draw);
  syncMotionButton();
  draw();
}
