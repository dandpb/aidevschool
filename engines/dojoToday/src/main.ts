/**
 * dojoToday — a "lição de hoje" do programador.
 *
 * Superfície só-leitura que consome o read model gerado pelo substrato
 * (FSRS + streak + gate). Ela NÃO agenda, NÃO avalia e NÃO marca mastery:
 * mostra o que o scheduler único já calculou a partir dos gates executáveis.
 * Regra de ouro: produtor ≠ verificador.
 */
import "./styles.css";
import {
  askSocrates,
  clearConfig,
  deterministicNudge,
  isConfigured,
  loadConfig,
  saveConfig,
} from "./assistant";
import { today } from "./data/today";
import { escapeHtml } from "./escape";
import type { DueReview, TodaySnapshot, TrackNode } from "./types";

const REASON_LABEL: Record<DueReview["reason"], string> = {
  overdue: "Atrasada",
  due: "Devida hoje",
  deepening: "Aprofundamento",
  interleaving: "Intercalação",
  "recurring-trap": "Pegadinha recorrente",
};

function voxelCore(): string {
  // Herói voxel: torre de cubos com sombra isométrica (estilo da casa).
  return `
    <div class="voxel-hero" aria-hidden="true">
      <span class="cube cube-base"></span>
      <span class="cube cube-mid"></span>
      <span class="cube cube-top"></span>
      <span class="cube cube-float"></span>
      <span class="spark spark-a"></span>
      <span class="spark spark-b"></span>
    </div>`;
}

function streakCard(s: TodaySnapshot["streak"]): string {
  const flames = "🔥";
  const freezes = "❄️".repeat(s.freezesEquipped);
  const frozen = "·".repeat(Math.max(0, s.freezesMax - s.freezesEquipped));
  const headline =
    s.current > 0
      ? `${escapeHtml(s.current)} ${s.current === 1 ? "dia" : "dias"} de sequência`
      : "Quebre o gelo hoje";
  const sub =
    s.current > 0
      ? `Recorde: ${escapeHtml(s.longest)}. Passe um gate para manter o fogo.`
      : "Passe um gate executável para acender a sequência.";
  return `
    <section class="card streak-card" aria-label="Sequência">
      <div class="streak-flame ${s.current > 0 ? "is-lit" : "is-out"}">${flames}</div>
      <div class="streak-body">
        <p class="streak-current">${headline}</p>
        <p class="streak-sub">${sub}</p>
        <p class="streak-freezes" title="Streak freezes absorvem dias perdidos (cap ${escapeHtml(s.freezesMax)})">
          Freezes <span class="freeze-pips">${freezes}<span class="freeze-empty">${frozen}</span></span>
        </p>
      </div>
    </section>`;
}

function playDetails(gameDir: string | null): string {
  if (!gameDir) return "";
  const rel = gameDir.replace(/^engines\//, "");
  return `
    <details class="play-how">
      <summary>Como jogar</summary>
      <code>cd ${escapeHtml(gameDir)} &amp;&amp; pnpm install &amp;&amp; pnpm run dev</code>
      <p class="muted">O jogo emite evidência bruta; um verificador independente decide o gate. (${escapeHtml(rel)})</p>
    </details>`;
}

function reviewCard(r: DueReview, index: number): string {
  const tone =
    r.reason === "overdue"
      ? "tone-danger"
      : r.reason === "recurring-trap"
        ? "tone-trap"
        : "tone-success";
  return `
    <article class="card lesson-card ${tone}" style="--i:${index}">
      <div class="lesson-head">
        <span class="chip">${escapeHtml(REASON_LABEL[r.reason])}</span>
        <span class="due-in">${escapeHtml(r.dueIn)}</span>
      </div>
      <h3 class="lesson-title">${escapeHtml(r.title)}</h3>
      ${r.project ? `<p class="lesson-project">${escapeHtml(r.project)}</p>` : ""}
      ${playDetails(r.gameDir)}
    </article>`;
}

function missionCard(a: TodaySnapshot["activeUnit"]): string {
  if (!a.id) return "";
  const challenge = a.diagnosticFile
    ? `Comece pelo desafio em <code class="inline-path">${escapeHtml(a.diagnosticFile)}</code>.`
    : "";
  return `
    <section class="card mission-card" aria-label="Missão do dia">
      <div class="mentor" aria-hidden="true">
        <span class="mentor-antenna"></span>
        <span class="mentor-face"><span class="mentor-eyes"></span></span>
        <span class="mentor-body"></span>
      </div>
      <div class="mentor-copy">
        <p class="eyebrow">Sócrates · seu tutor</p>
        <p class="mentor-line">Sua próxima missão é <strong>${escapeHtml(a.title ?? a.id)}</strong>.</p>
        <p class="muted">${challenge} Primeiro você tenta — quem avalia a evidência é o <strong>verificador independente</strong>, não eu.</p>
        ${playDetails(a.gameDir)}
        ${
          a.num
            ? `<div class="play-inline-row"><button id="play-inline-btn" type="button" class="link-btn" data-game="${escapeHtml(a.num)}">▶ Jogar aqui (inline)</button></div>
               <div id="play-inline-wrap" class="play-inline-wrap" hidden><iframe id="play-inline-frame" class="play-inline-frame" title="Jogo da missão"></iframe></div>`
            : ""
        }
        <div class="socrates" data-socrates>
          <div class="socrates-talk">
            <input
              id="soc-q"
              type="text"
              class="socrates-input"
              placeholder="Pergunte ao Sócrates sobre esta missão…"
              aria-label="Pergunta para o Sócrates"
            />
            <button id="soc-send" type="button" class="btn btn-primary socrates-send">Perguntar</button>
          </div>
          <button id="soc-config-btn" type="button" class="link-btn">⚙️ Configurar assistente (opcional)</button>
          <div id="soc-config" class="socrates-config" hidden>
            <p class="muted socrates-privacy">
              Experimental. Sua chave fica só neste navegador e vai apenas para o endpoint
              configurado. Conversas não são salvas. Opcional e off por padrão.
            </p>
            <label>Endpoint base (compatível com OpenAI)
              <input id="soc-baseurl" type="text" placeholder="https://api.openai.com/v1" />
            </label>
            <label>Chave API
              <input id="soc-apikey" type="password" placeholder="sk-…" />
            </label>
            <label>Modelo
              <input id="soc-model" type="text" placeholder="gpt-4o-mini" />
            </label>
            <div class="socrates-config-actions">
              <button id="soc-save" type="button" class="btn btn-primary">Salvar</button>
              <button id="soc-clear" type="button" class="link-btn">Limpar</button>
            </div>
          </div>
          <div id="soc-reply" class="socrates-reply" aria-live="polite"></div>
        </div>
      </div>
    </section>`;
}

function progressCard(s: TodaySnapshot): string {
  const pct = s.totalUnits > 0 ? Math.round((s.masteredCount / s.totalUnits) * 100) : 0;
  return `
    <section class="card progress-card" aria-label="Progresso verificado">
      <div class="progress-row">
        <span><strong>${escapeHtml(s.masteredCount)}</strong>/${escapeHtml(s.totalUnits)} dominadas</span>
        <span class="muted">verificadas por gate</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </section>`;
}

function statusGlyph(status: TrackNode["status"]): string {
  return status === "mastered" ? "✅" : status === "active" ? "▶" : "○";
}

function trackSection(nodes: readonly TrackNode[], nextNum: string | null): string {
  const rows = nodes
    .map((n) => {
      const isNext = n.num === nextNum && n.status === "active";
      const cls = `track-node is-${escapeHtml(n.status)}${isNext ? " is-next" : ""}`;
      const play =
        isNext && n.gameDir
          ? `<details class="play-how track-play"><summary>Jogar agora</summary><code>cd ${escapeHtml(n.gameDir)} &amp;&amp; pnpm install &amp;&amp; pnpm run dev</code></details>`
          : "";
      return `
        <li class="${escapeHtml(cls)}">
          <span class="track-glyph" aria-hidden="true">${statusGlyph(n.status)}</span>
          <span class="track-num">${escapeHtml(n.num)}</span>
          <span class="track-title">${escapeHtml(n.title)}</span>
          ${play}
        </li>`;
    })
    .join("");
  return `
    <section class="card track-card" aria-labelledby="track-h">
      <h2 id="track-h">Sua trilha</h2>
      <p class="muted">18 conceitos, um por jogo. A próxima lição fica destacada.</p>
      <ol class="track-list">${rows}</ol>
    </section>`;
}

function render(s: TodaySnapshot): string {
  const overdue = [...s.reviews].sort((a, b) =>
    a.reason === "overdue" ? -1 : b.reason === "overdue" ? 1 : 0,
  );
  const dateLabel = new Date(s.asOf).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `
    <header class="hero">
      ${voxelCore()}
      <p class="eyebrow">DevSchool · programadores</p>
      <h1>Sua lição de hoje</h1>
      <p class="hero-date">${dateLabel}</p>
    </header>

    ${streakCard(s.streak)}

    ${trackSection(s.track, s.nextProjectNum)}

    <section class="lessons" aria-labelledby="lessons-h">
      <h2 id="lessons-h">${overdue.length > 0 ? "Retome por aqui" : "Tudo em dia"}</h2>
      ${overdue.length > 0 ? overdue.map((r, i) => reviewCard(r, i)).join("") : '<p class="muted">Nenhuma revisão vencida. Bom trabalho.</p>'}
    </section>

    ${missionCard(s.activeUnit)}
    ${progressCard(s)}

    <footer class="note">
      <p>Agendado por <strong>FSRS</strong> a partir dos seus gates executáveis. Esta página
      apenas mostra o scheduler — não marca <em>mastered</em>. O verificador independente decide.</p>
    </footer>`;
}

/**
 * Wirea o Sócrates opcional (IA). Off por padrão: sem chave configurada, o
 * "Perguntar" abre a configuração e mostra o nudge determinístico. Com chave,
 * chama o endpoint compatível com OpenAI e mostra a resposta socrática.
 * Tudo fica no navegador; o caminho de evidência não passa por aqui.
 */
function wireInteractions(a: TodaySnapshot["activeUnit"]): void {
  const mission = { title: a.title, project: a.project, state: a.state };
  const q = document.getElementById("soc-q") as HTMLInputElement | null;
  const send = document.getElementById("soc-send") as HTMLButtonElement | null;
  const configBtn = document.getElementById("soc-config-btn") as HTMLButtonElement | null;
  const configPanel = document.getElementById("soc-config") as HTMLElement | null;
  const baseInput = document.getElementById("soc-baseurl") as HTMLInputElement | null;
  const keyInput = document.getElementById("soc-apikey") as HTMLInputElement | null;
  const modelInput = document.getElementById("soc-model") as HTMLInputElement | null;
  const saveBtn = document.getElementById("soc-save") as HTMLButtonElement | null;
  const clearBtn = document.getElementById("soc-clear") as HTMLButtonElement | null;
  const reply = document.getElementById("soc-reply") as HTMLElement | null;
  if (!q || !send || !configBtn || !configPanel || !reply) return;

  const fill = () => {
    const cfg = loadConfig();
    if (baseInput) baseInput.value = cfg.baseUrl;
    if (keyInput) keyInput.value = cfg.apiKey;
    if (modelInput) modelInput.value = cfg.model;
  };
  fill();
  const setReply = (text: string) => {
    reply.textContent = text;
  };

  configBtn.addEventListener("click", () => {
    configPanel.hidden = !configPanel.hidden;
    fill();
  });
  saveBtn?.addEventListener("click", () => {
    saveConfig({
      baseUrl: baseInput?.value.trim() || "https://api.openai.com/v1",
      apiKey: keyInput?.value.trim() || "",
      model: modelInput?.value.trim() || "gpt-4o-mini",
    });
    configPanel.hidden = true;
    setReply(
      isConfigured(loadConfig())
        ? "Assistente configurado. Pergunte acima."
        : "Salvo sem chave — Sócrates segue determinístico.",
    );
  });
  clearBtn?.addEventListener("click", () => {
    clearConfig();
    fill();
    setReply("Assistente limpo. Sócrates voltou ao modo determinístico.");
  });

  // Jogar inline: carrega o jogo estático (build relativo) só ao abrir; descarrega ao recolher.
  const playBtn = document.getElementById("play-inline-btn") as HTMLButtonElement | null;
  const playWrap = document.getElementById("play-inline-wrap") as HTMLElement | null;
  const playFrame = document.getElementById("play-inline-frame") as HTMLIFrameElement | null;
  if (playBtn && playWrap && playFrame) {
    playBtn.addEventListener("click", () => {
      if (playWrap.hidden) {
        if (!playFrame.getAttribute("src")) {
          playFrame.setAttribute("src", `/games/${playBtn.dataset.game}/index.html`);
        }
        playWrap.hidden = false;
        playBtn.textContent = "▽ Recolher jogo";
      } else {
        playWrap.hidden = true;
        playFrame.setAttribute("src", "about:blank");
        playBtn.textContent = "▶ Jogar aqui (inline)";
      }
    });
  }

  const ask = async () => {
    const question = q.value.trim();
    if (!question) return;
    const cfg = loadConfig();
    send.disabled = true;
    if (!isConfigured(cfg)) {
      configPanel.hidden = false;
      fill();
      setReply(deterministicNudge(mission));
      send.disabled = false;
      return;
    }
    setReply("Sócrates está pensando…");
    const result = await askSocrates(cfg, mission, question);
    setReply(result.ok ? result.text : `${result.error}\n\n${deterministicNudge(mission)}`);
    send.disabled = false;
  };
  send.addEventListener("click", () => void ask());
  q.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void ask();
    }
  });
}

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");
root.innerHTML = render(today);
wireInteractions(today.activeUnit);
