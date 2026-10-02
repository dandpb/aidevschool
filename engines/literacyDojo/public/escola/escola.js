/* AID-3453 static entry — ported from engines/school-entry/public/app.js
   @ 80c7addc (PR #615 candidate). Deltas (directive 17:14Z, proposal aa5bcb5a):
   no api client, no fetch, no launch endpoint, no recommender; the SCHOOL_ENTRY
   contract is imported inline from ./entry-contract.js; CTAs are direct
   same-origin links ("/") — no operator gate or Chromium probe exists on this
   public variant (the Node surface keeps those controls). Canvas map, help
   dialog and focus wiring are verbatim. No storage access of any kind. */
import { SCHOOL_ENTRY } from "./entry-contract.js";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function ctaLink(href, label, className) {
  const link = element("a", className, null);
  link.href = href;
  const arrow = element("span", null, "→");
  arrow.setAttribute("aria-hidden", "true");
  link.append(document.createTextNode(label + " "), arrow);
  return link;
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
  const button = ctaLink("/", fundamentals.cta, "primary");
  button.id = "start-fundamentals";
  panel.append(button, element("p", "mission-note", fundamentals.note));
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
    card.append(ctaLink("/", journey.cta, "secondary"));
    section.append(card);
  }
}

function renderEntry() {
  renderMission(SCHOOL_ENTRY.fundamentals);
  renderJourneys(SCHOOL_ENTRY.journeys);
}
renderEntry();

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
      // AID-3532: tabindex="-1" stays on the card — Chromium drops focus to
      // BODY when the attribute is removed from the focused element. Same
      // pattern as the static skip-link target #etapa-atual (index.html).
      target.setAttribute("tabindex", "-1");
      target.focus();
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
  // Single scheduled RAF handle (FSE review 2026-09-30: draw() used to
  // self-schedule and the resize handler called draw() directly, so every
  // resize with animation on added one permanent RAF chain — 1 resize → 2
  // loops, 2 → 3… Now draw() renders exactly one frame and only frame()
  // reschedules, guarded by scheduleFrame(); pausing cancels the handle.)
  let rafHandle = 0;
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
      // P4 (prototype #614 @ 7c72a4a1, revisão 6ff54dd9): legible sub with
      // contrast + shrink-to-fit so it never clips at 320px.
      let subFont = 11;
      ctx.font = subFont + 'px "SFMono-Regular",Consolas,monospace';
      while (
        subFont > 9 &&
        ctx.measureText(sub).width > canvas.width * 0.42
      ) {
        subFont--;
        ctx.font = subFont + 'px "SFMono-Regular",Consolas,monospace';
      }
      ctx.fillStyle = "#3f5348";
      ctx.fillText(sub, x, y + 17);
    }
  }
  function bob(base, amp) {
    return animating ? base + Math.sin(t / 42 + base) * amp : base;
  }
  /* Landmark primitives — 1:1 copy of the APPROVED prototype #614 art
     (C2: copied from engines/sdlc-quest/src/world.js l.11–27, station
     silhouettes l.91–103; pixel review 3a21f96a / FSE finding 6: port the
     accepted art, no redesign, ≥1 landmark per island, animated robot). */
  function polygon(points, fill) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function circle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function ellipse(x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function line(points, color, width) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  function box(x, y, w, d, h, top, left, right) {
    const p = [
      [x, y - h - d / 2],
      [x + w / 2, y - h],
      [x, y - h + d / 2],
      [x - w / 2, y - h],
    ];
    polygon([p[3], p[2], [x, y + d / 2], [x - w / 2, y]], left);
    polygon([p[2], p[1], [x + w / 2, y], [x, y + d / 2]], right);
    polygon(p, top);
  }
  function plant(x, y, scale) {
    scale = scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    rect(-2, -13, 4, 16, "#314b3c");
    polygon(
      [
        [-1, -4],
        [-13, -13],
        [-14, -24],
        [-3, -20],
        [2, -9],
      ],
      "#77a680",
    );
    polygon(
      [
        [0, -9],
        [10, -29],
        [20, -32],
        [18, -20],
        [6, -7],
      ],
      "#a2c290",
    );
    polygon(
      [
        [-1, -14],
        [-7, -28],
        [0, -40],
        [7, -26],
        [4, -9],
      ],
      "#b0c99b",
    );
    ctx.restore();
  }
  function crystal(x, y, color) {
    polygon(
      [
        [x, y - 25],
        [x + 9, y - 10],
        [x + 6, y + 2],
        [x - 6, y + 4],
        [x - 9, y - 8],
      ],
      "#324f53",
    );
    polygon(
      [
        [x, y - 25],
        [x + 9, y - 10],
        [x, y + 1],
      ],
      color,
    );
    polygon(
      [
        [x, y - 25],
        [x, y + 1],
        [x - 9, y - 8],
      ],
      "#5a8a7f",
    );
  }
  function robot(x, y, scale, body, eye) {
    scale = scale || 1;
    body = body || "#dcdcc4";
    eye = eye || "#a0eccd";
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ellipse(0, 18, 19, 6, "#060f1744");
    rect(-11, 0, 22, 19, "#79958b");
    rect(-15, -27, 30, 28, body);
    rect(-18, -20, 4, 14, "#8caaa2");
    rect(15, -20, 4, 14, "#8caaa2");
    rect(-11, -19, 22, 11, "#1b3541");
    rect(-7, -16, 4, 4, eye);
    rect(4, -16, 4, 4, eye);
    rect(-7, -29, 3, -8, "#d3d9b9");
    rect(-9, -39, 7, 4, eye);
    rect(-7, 4, 14, 7, body);
    rect(-10, 17, 7, 5, "#cfddc5");
    rect(4, 17, 7, 5, "#cfddc5");
    rect(-17, 4, 6, 11, body);
    rect(11, 4, 6, 11, body);
    ctx.restore();
  }
  /* Station silhouettes — compact copies of world.js station cases 0 and 1,
     anchored at (0,0), exactly as approved in prototype #614. */
  function houseStation() {
    box(0, -21, 86, 43, 42, "#baa987", "#687b60", "#8a946b");
    rect(-30, -98, 60, 37, "#d7ceb0");
    ctx.fillStyle = "#d8cfae";
    ctx.beginPath();
    ctx.arc(0, -98, 30, Math.PI, Math.PI * 2);
    ctx.fill();
    rect(-5, -124, 10, 45, "#789085");
    rect(-32, -73, 64, 7, "#9ba785");
    ctx.save();
    ctx.translate(20, -104);
    ctx.rotate(-0.48);
    rect(-3, -7, 47, 15, "#dde0c1");
    rect(31, -10, 14, 21, "#8caf9c");
    rect(43, -8, 4, 17, "#254d4c");
    ctx.restore();
    box(-28, -3, 23, 13, 16, "#c7c7a0", "#5e725b", "#819776");
    rect(9, -43, 9, 14, "#d4e3b0");
  }
  function towerStation(color) {
    box(0, -16, 77, 40, 60, "#8aa5a0", "#51616b", "#74777c");
    box(0, -76, 84, 44, 10, color, "#617182", "#838a9b");
    for (let i = 0; i < 3; i++)
      box(
        -9 + i * 6,
        -78 - i * 12,
        74,
        37,
        5,
        i === 2 ? "#cdd5ea" : "#9cadd4",
        "#66778a",
        "#8194b0",
      );
    line(
      [
        [32, -46],
        [32, -78],
      ],
      "#d2e3cd",
      2,
    );
    circle(32, -46, 4, "#becbe8");
  }
  function lm(x, y, k, fn) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    fn();
    ctx.restore();
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
    /* Approved landmarks (prototype #614 C2): ≥1 per island, above the
       label, no collision; scale follows the canvas with floor 0.5
       (recognizable at 320px) and ceiling from the free canvas height. */
    const k = Math.max(s, 0.5);
    const houseK = Math.min(k * 0.9, (cY - 18) / 165);
    const towerK = Math.min(k * 0.85, (dY - cY - 60) / 160);
    lm(W * 0.24, fY - 16, k, () => {
      crystal(-50, 2, "#f2d78f");
      plant(52, 8, 0.8);
    });
    lm(W * 0.78, cY - 16, houseK, houseStation);
    lm(W * 0.78, dY - 20, towerK, () => towerStation("#5fbd9b"));
    robot(
      W * 0.5,
      (fY + cY) / 2 + 30 + (animating ? Math.sin(t / 30) * 2 : 0),
      Math.max(k * 0.45, 0.3),
      "#dce4c8",
      "#b9f7d4",
    );
    arrow(W * 0.35, fY - 14, W * 0.66, cY + 26, "rgba(232,200,136,0.85)");
    arrow(W * 0.35, fY + 18, W * 0.66, dY - 20, "rgba(167,230,205,0.8)");
    label("Fundamentos", W * 0.24, fY + 8, "#0f231c", "F1–F4 · COMECE AQUI");
    label("IA no cotidiano", W * 0.78, cY + 8, "#231a09", "JORNADA 1");
    label("IA para Dev", W * 0.78, dY + 8, "#081712", "JORNADA 2 · PRÉVIA");
  }
  function frame() {
    rafHandle = 0;
    draw();
    if (animating) rafHandle = requestAnimationFrame(frame);
  }
  function scheduleFrame() {
    if (!rafHandle) rafHandle = requestAnimationFrame(frame);
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
    if (animating) scheduleFrame();
    else {
      if (rafHandle) cancelAnimationFrame(rafHandle);
      rafHandle = 0;
      draw();
    }
  });
  window.addEventListener("resize", () => {
    if (animating) scheduleFrame();
    else draw();
  });
  syncMotionButton();
  if (animating) scheduleFrame();
  else draw();
}
