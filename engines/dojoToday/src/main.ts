/**
 * dojoToday — a "lição de hoje" do programador.
 *
 * Superfície só-leitura que consome o read model gerado pelo substrato
 * (FSRS + streak + gate). Ela NÃO agenda, NÃO avalia e NÃO marca mastery:
 * mostra o que o scheduler único já calculou a partir dos gates executáveis.
 * Regra de ouro: produtor ≠ verificador.
 */
import "./styles.css";
import { emitFunnelEvent } from "@aidevschool/evidence/funnel-telemetry";
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
import { loadHostLocalToday, renderLocalSuggestion } from "./localProjection";
import type { DueReview, TodaySnapshot, TrackNode } from "./types";

const REASON_LABEL: Record<DueReview["reason"], string> = {
  overdue: "Atrasada",
  due: "Devida hoje",
  deepening: "Aprofundamento",
  interleaving: "Intercalação",
  "recurring-trap": "Pegadinha recorrente",
};

/**
 * W7 AID-5190 (contrato §7.2 — papel ReviewDue): o substrato emite `dueIn`
 * em formato de máquina ("overdue 43d", "today", "in 5d"); a apresentação
 * pt-BR legível ("atrasada 43 dias" / "devida hoje") é papel da HUD, não do
 * agendador — o read model canônico permanece intacto.
 */
function dueInPtBr(raw: string): string {
  const overdue = raw.match(/^overdue (\d+)d$/);
  if (overdue) {
    const days = Number(overdue[1]);
    return `atrasada ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (raw === "today") return "devida hoje";
  if (raw === "tomorrow") return "devida amanhã";
  const upcoming = raw.match(/^in (\d+)d$/);
  if (upcoming) {
    const days = Number(upcoming[1]);
    return `em ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  return raw;
}

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
  const freezes = "❄️".repeat(Number(s.freezesEquipped) || 0);
  const frozen = "·".repeat(
    Math.max(0, (Number(s.freezesMax) || 0) - (Number(s.freezesEquipped) || 0)),
  );
  const headline =
    s.current > 0
      ? `${escapeHtml(s.current)} ${s.current === 1 ? "dia" : "dias"} de sequência`
      : "Quebre o gelo hoje";
  const sub =
    s.current > 0
      ? `Recorde: ${escapeHtml(s.longest)}. Passe um gate para manter o fogo.`
      : "Passe um gate executável para acender a sequência.";
  return `
    <section class="card streak-card" data-testid="hud-streak" aria-label="Sequência">
      <div class="streak-flame ${s.current > 0 ? "is-lit" : "is-out"}" aria-hidden="true">${flames}</div>
      <div class="streak-body">
        <p class="streak-current">${headline}</p>
        <p class="streak-sub">${sub}</p>
        <p class="streak-freezes" role="group" aria-label="Freezes: ${escapeHtml(s.freezesEquipped)} equipados de um máximo de ${escapeHtml(s.freezesMax)}" title="Streak freezes absorvem dias perdidos (cap ${escapeHtml(s.freezesMax)})">
          <span aria-hidden="true">Freezes</span> <span class="freeze-pips" aria-hidden="true">${freezes}<span class="freeze-empty">${frozen}</span></span>
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
    <article class="card lesson-card ${tone}" data-testid="hud-review-due" style="--i:${index}">
      <div class="lesson-head">
        <span class="chip">${REASON_LABEL[r.reason]}</span>
        <span class="due-in">${escapeHtml(dueInPtBr(r.dueIn))}</span>
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
            ? `<div class="play-inline-row"><button id="play-inline-btn" type="button" class="link-btn" data-game="${escapeHtml(a.num)}" aria-expanded="false" aria-controls="play-inline-wrap" aria-label="Jogar aqui (inline)"><span aria-hidden="true">▶</span> Jogar aqui (inline)</button></div>
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
            <button id="soc-send" type="button" class="btn btn-primary socrates-send" data-testid="submit-attempt">Perguntar</button>
          </div>
          <button id="soc-config-btn" type="button" class="link-btn" aria-expanded="false" aria-controls="soc-config" aria-label="Configurar assistente (opcional)"><span aria-hidden="true">⚙️</span> Configurar assistente (opcional)</button>
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
          <!-- W3 §4.3-4 (AID-1096): testid canônico do papel feedback-panel do loop
               (docs/design/design-foundations.md §3.4 — mapeamento dojoToday). -->
          <div
            id="soc-reply"
            class="socrates-reply"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="feedback-panel"
          ></div>
        </div>
      </div>
    </section>`;
}

function progressCard(s: TodaySnapshot): string {
  const pct =
    s.totalUnits > 0 ? Math.round((Number(s.masteredCount) / Number(s.totalUnits)) * 100) : 0;
  return `
    <section class="card progress-card" aria-label="Progresso verificado">
      <div class="progress-row" data-testid="hud-mastery-badge">
        <span><strong>${escapeHtml(s.masteredCount)}</strong>/${escapeHtml(s.totalUnits)} dominadas <span class="hud-glyph" aria-hidden="true">✅</span></span>
        <span class="muted">verificadas por gate</span>
      </div>
      <div class="progress-track" role="progressbar" data-testid="hud-progress" aria-valuenow="${escapeHtml(pct)}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="${escapeHtml(pct)}% concluído"><div class="progress-fill" style="width:${escapeHtml(pct)}%"></div></div>
    </section>`;
}

function statusGlyph(status: TrackNode["status"]): string {
  return status === "mastered" ? "✅" : status === "active" ? "▶" : "○";
}

function trackSection(nodes: readonly TrackNode[], nextNum: string | null): string {
  const rows = nodes
    .map((n) => {
      const isNext = n.num === nextNum && n.status === "active";
      const cls = `track-node is-${n.status}${isNext ? " is-next" : ""}`;
      // W7 AID-5190 (contrato §7.2 — vocabulário canônico do MasteryBadge):
      // a trilha do dojoToday é a projeção canônica do substrate, então o
      // estado verificado lê "dominada" — "concluída" fica reservado ao
      // progresso local das engines (completed ≠ mastered).
      const stateText =
        n.status === "mastered" ? "dominada" : n.status === "active" ? "ativa" : "disponível";
      const ariaLabel = `Lição ${n.num}: ${n.title} (${stateText})`;
      const play =
        isNext && n.gameDir
          ? `<details class="play-how track-play"><summary>Jogar agora</summary><code>cd ${escapeHtml(n.gameDir)} &amp;&amp; pnpm install &amp;&amp; pnpm run dev</code></details>`
          : "";
      return `
        <li class="${cls}" aria-label="${escapeHtml(ariaLabel)}">
          <span class="track-glyph" aria-hidden="true">${statusGlyph(n.status)}</span>
          <span class="track-num" aria-hidden="true">${escapeHtml(n.num)}</span>
          <span class="track-title" aria-hidden="true">${escapeHtml(n.title)}</span>
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

function demoNoticeEnabled(): boolean {
  // Literal member chain on import.meta.env so the bundler's define replaces
  // it statically in production builds (bare import.meta.env objects are not
  // replaced); the try/catch keeps runtime contexts without Vite env inert.
  try {
    const value: unknown = (
      import.meta as unknown as {
        env: { VITE_DOJOTODAY_DEMO_NOTICE?: string };
      }
    ).env.VITE_DOJOTODAY_DEMO_NOTICE;
    return value === "1";
  } catch {
    return false;
  }
}

/** R2 da spec AID-981: copy honesta no build público de demonstração (D2-A). */
function demoNotice(): string {
  if (!demoNoticeEnabled()) return "";
  return `
    <aside class="card demo-note" aria-label="Projeção de demonstração">
      <p><strong>Projeção de demonstração.</strong> Esta rota pública mostra o
      read model de demonstração do projeto; a sua jornada real vive no seu
      dispositivo e no seu repositório, agendada pelo seu próprio substrato.</p>
    </aside>`;
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

    <p id="hud-live" class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="hud-live-region"></p>

    ${demoNotice()}

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
  const setReply = (text: string, isError = false) => {
    // W2 §2.3 (AID-1089): feedback por cor + borda + texto — nunca só cor.
    reply.textContent = text;
    reply.classList.toggle("is-error", isError && text.length > 0);
  };

  configBtn.addEventListener("click", () => {
    configPanel.hidden = !configPanel.hidden;
    configBtn.setAttribute("aria-expanded", String(!configPanel.hidden));
    if (!configPanel.hidden) {
      configBtn.innerHTML = `<span aria-hidden="true">⚙️</span> Ocultar configuração do assistente`;
      configBtn.setAttribute("aria-label", "Ocultar configuração do assistente");
    } else {
      configBtn.innerHTML = `<span aria-hidden="true">⚙️</span> Configurar assistente (opcional)`;
      configBtn.setAttribute("aria-label", "Configurar assistente (opcional)");
    }
    fill();
  });
  saveBtn?.addEventListener("click", () => {
    saveConfig({
      baseUrl: baseInput?.value.trim() || "https://api.openai.com/v1",
      apiKey: keyInput?.value.trim() || "",
      model: modelInput?.value.trim() || "gpt-4o-mini",
    });
    configPanel.hidden = true;
    configBtn.setAttribute("aria-expanded", "false");
    configBtn.innerHTML = `<span aria-hidden="true">⚙️</span> Configurar assistente (opcional)`;
    configBtn.setAttribute("aria-label", "Configurar assistente (opcional)");
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
        // AID-3530: fechar define src="about:blank" (truthy); sem tratar esse
        // sentinela como "sem jogo", a guarda antiga nunca recarregava na reabertura.
        const currentSrc = playFrame.getAttribute("src");
        if (!currentSrc || currentSrc === "about:blank") {
          playFrame.setAttribute("src", `/games/${playBtn.dataset.game}/index.html`);
        }
        playWrap.hidden = false;
        playBtn.innerHTML = '<span aria-hidden="true">▽</span> Recolher jogo';
        playBtn.setAttribute("aria-label", "Recolher jogo");
        playBtn.setAttribute("aria-expanded", "true");
      } else {
        playWrap.hidden = true;
        playFrame.setAttribute("src", "about:blank");
        playBtn.innerHTML = '<span aria-hidden="true">▶</span> Jogar aqui (inline)';
        playBtn.setAttribute("aria-label", "Jogar aqui (inline)");
        playBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  const ask = async () => {
    const question = q.value.trim();
    if (!question) {
      setReply("Por favor, escreva uma pergunta antes de enviar.", true);
      q.focus();
      return;
    }
    const cfg = loadConfig();
    send.disabled = true;
    // W2 §2.3-6 (AID-1089): ação assíncrona — controle desabilita + aria-busy;
    // a região role=status (#soc-reply, aria-live polite) anuncia o andamento.
    send.setAttribute("aria-busy", "true");
    const originalText = send.innerHTML;
    send.innerHTML = `<span aria-hidden="true">⏳</span> Pensando…`;
    try {
      if (!isConfigured(cfg)) {
        configPanel.hidden = false;
        configBtn.setAttribute("aria-expanded", "true");
        configBtn.innerHTML = `<span aria-hidden="true">⚙️</span> Ocultar configuração do assistente`;
        configBtn.setAttribute("aria-label", "Ocultar configuração do assistente");
        fill();
        setReply(deterministicNudge(mission));
        return;
      }
      setReply("Sócrates está pensando…");
      const result = await askSocrates(cfg, mission, question);
      setReply(
        result.ok ? result.text : `${result.error}\n\n${deterministicNudge(mission)}`,
        !result.ok,
      );
    } finally {
      send.disabled = false;
      send.removeAttribute("aria-busy");
      send.innerHTML = originalText;
    }
  };
  send.addEventListener("click", () => void ask());
  q.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void ask();
    }
  });
}

/**
 * W7 AID-5190 (contrato §7.2 — anúncio de mudança): a HUD anuncia, 1× por
 * abertura diária, o estado de sequência e as revisões devidas na live
 * region #hud-live. O texto é inserido DEPOIS do render inicial, então
 * leitores de tela o anunciam como mudança (conteúdo presente no load
 * silencioso não é anunciado).
 */
function announceHud(s: TodaySnapshot): void {
  const live = document.getElementById("hud-live");
  if (!live) return;
  const streak =
    s.streak.current > 0
      ? `Sequência de ${s.streak.current} ${s.streak.current === 1 ? "dia" : "dias"}.`
      : "Sequência apagada. Passe um gate executável para acender.";
  const reviews = s.reviews.length;
  const reviewNote =
    reviews === 0
      ? " Nenhuma revisão devida."
      : ` ${reviews} ${reviews === 1 ? "revisão devida" : "revisões devidas"}.`;
  window.requestAnimationFrame(() => {
    live.textContent = `${streak}${reviewNote}`;
  });
}

async function boot(): Promise<void> {
  const root = document.getElementById("root");
  if (!root) throw new Error("Elemento #root não encontrado");
  const hosted = new URLSearchParams(window.location.search).get("host") === "os";
  if (hosted) {
    root.innerHTML = renderLocalSuggestion(await loadHostLocalToday());
    return;
  }
  // AID-987/T1b (padrão AID-913): evento anônimo de funil da abertura da view
  // diária — conta aberturas, não identifica ninguém e não persiste nada; é
  // no-op sem o endpoint same-origin ativado no deploy. O modo hospedado do OS
  // fica de fora para não duplo-contar o funil do host.
  emitFunnelEvent("dojotoday", "daily-view-open");
  root.innerHTML = render(today);
  announceHud(today);
  wireInteractions(today.activeUnit);
}

void boot();
