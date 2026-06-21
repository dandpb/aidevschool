import type { LearnerSnapshot } from "../domain"
import { getLearnerSnapshot } from "../progress"

const AIDI_HISTORY_POINTS = 30

function aidiSignalClass(value: number, amber: number, red: number): string {
  if (value >= red) return "aidi-signal aidi-red"
  if (value >= amber) return "aidi-signal aidi-amber"
  return "aidi-signal aidi-green"
}

function aidiSparklinePath(snapshot: LearnerSnapshot): string {
  const trend = snapshot.aidi.trend
  if (trend.length === 0) return ""
  const max = 1
  const width = 100
  const stepX = trend.length === 1 ? width : width / (trend.length - 1)
  return trend
    .map((point, index) => {
      const x = index * stepX
      const y = (1 - point.value / max) * 24
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}

function renderUnitState(snapshot: LearnerSnapshot): string {
  const gate = snapshot.gate
  const gateClass = gate.implementationBlocked ? "gate-pill gate-blocked" : "gate-pill gate-open"
  const gateLabel = gate.implementationBlocked ? "Bloqueado" : "Liberado"

  return `
    <div class="learner-unit">
      <p class="eyebrow">Unidade ativa</p>
      <h3>${snapshot.activeUnit.title}</h3>
      <div class="learner-unit-meta">
        <span class="state-pill state-${snapshot.activeUnit.state}">${snapshot.activeUnit.state}</span>
        <span class="gate-pill ${gateClass}">${gateLabel}</span>
        <span class="retry-pill">${snapshot.activeUnit.retryCount}/${snapshot.activeUnit.retryLimit} retries</span>
      </div>
      <p class="learner-unit-unblock">Desbloqueio: <code>${gate.unblockCondition}</code></p>
    </div>
  `
}

function renderProfile(snapshot: LearnerSnapshot): string {
  return `
    <div class="learner-profile">
      <p class="eyebrow">Perfil</p>
      <dl class="profile-grid">
        <div><dt>Dreyfus</dt><dd>${snapshot.profile.dreyfus}</dd></div>
        <div><dt>Bloom</dt><dd>${snapshot.profile.bloom}</dd></div>
        <div><dt>Linguagem ativa</dt><dd>${snapshot.profile.activeLanguage}</dd></div>
        <div><dt>Tempo semanal</dt><dd>${snapshot.profile.weeklyTimeHours}h</dd></div>
      </dl>
    </div>
  `
}

function renderAidi(snapshot: LearnerSnapshot): string {
  const aidi = snapshot.aidi
  const path = aidiSparklinePath(snapshot)
  const signalClass = aidiSignalClass(aidi.current, aidi.thresholdAmber, aidi.thresholdRed)

  return `
    <div class="learner-aidi">
      <p class="eyebrow">AI Dependency Index (AIDI)</p>
      <div class="aidi-row">
        <div class="${signalClass}">
          <strong>${aidi.current.toFixed(2)}</strong>
          <small>alerta amarelo em ${aidi.thresholdAmber.toFixed(2)} · vermelho em ${aidi.thresholdRed.toFixed(2)}</small>
        </div>
        <svg viewBox="0 0 100 24" class="aidi-spark" aria-label="AIDI trendline">
          <rect x="0" y="0" width="100" height="24" class="aidi-bg" rx="2" />
          ${path ? `<path d="${path}" class="aidi-line" />` : ""}
        </svg>
      </div>
      <small class="aidi-source">Últimos ${aidi.trend.length} pontos — atualize rodando <code>python3 -m learner.substrate</code></small>
    </div>
  `
}

function renderPitfalls(snapshot: LearnerSnapshot): string {
  if (snapshot.topPitfalls.length === 0) {
    return `<div class="learner-pitfalls"><p class="eyebrow">Pegadinhas</p><p class="empty">Nenhuma pegadinha registrada ainda.</p></div>`
  }

  return `
    <div class="learner-pitfalls">
      <p class="eyebrow">Top pegadinhas</p>
      <ol class="pitfall-list">
        ${snapshot.topPitfalls
          .map(
            (pitfall) => `
              <li>
                <span class="pitfall-id">${pitfall.id}</span>
                <span class="pitfall-desc">${pitfall.description}</span>
                <span class="pitfall-occ">${pitfall.occurrences}× · ${pitfall.lastSeen}</span>
              </li>
            `,
          )
          .join("")}
      </ol>
    </div>
  `
}

function renderNextReviews(snapshot: LearnerSnapshot): string {
  if (snapshot.nextReviews.length === 0) {
    return `<div class="learner-reviews"><p class="eyebrow">Próximas revisões</p><p class="empty">Sem revisões pendentes.</p></div>`
  }

  return `
    <div class="learner-reviews">
      <p class="eyebrow">Próximas revisões (Mneme)</p>
      <ul class="review-list">
        ${snapshot.nextReviews
          .map(
            (review) => `
              <li class="review-row review-${review.reason}">
                <span class="review-due">${review.dueIn}</span>
                <span class="review-unit">${review.unitId}</span>
                <span class="review-title">${review.title}</span>
                <span class="review-reason">${review.reason}</span>
              </li>
            `,
          )
          .join("")}
      </ul>
    </div>
  `
}

function renderCoverage(snapshot: LearnerSnapshot): string {
  return `
    <div class="learner-coverage">
      <p class="eyebrow">Cobertura do catálogo</p>
      <div class="coverage-grid">
        <div class="coverage-cell coverage-mastered">
          <strong>${snapshot.masteredCount}</strong>
          <span>dominado</span>
        </div>
        <div class="coverage-cell coverage-scaffolded">
          <strong>${snapshot.scaffoldedCount}</strong>
          <span>com scaffold</span>
        </div>
        <p class="coverage-hint">A cat. <code>curriculum/catalog.md</code> mantém 18 projetos; o dashboard reflete <code>learner/learning_state.yaml</code>.</p>
      </div>
    </div>
  `
}

function renderStreak(snapshot: LearnerSnapshot): string {
  const s = snapshot.streak
  const filled = "❄".repeat(s.freezesEquipped)
  const empty = "·".repeat(Math.max(0, s.freezesMax - s.freezesEquipped))
  const lastLabel = s.lastGateDate
    ? `último portão em ${s.lastGateDate}`
    : "nenhum portão passado ainda"

  return `
    <div class="learner-streak">
      <p class="eyebrow">Sequência</p>
      <div class="streak-row">
        <strong class="streak-current">🔥 ${s.current}</strong>
        <small class="streak-longest">recorde ${s.longest}</small>
        <span class="streak-freezes" title="Streak freezes (cap 2)">freezes: ${filled}${empty}</span>
      </div>
      <p class="streak-hint">${lastLabel} · cresce só ao passar o portão executável; dia perdido consome um freeze.</p>
    </div>
  `
}

function renderCurr(snapshot: LearnerSnapshot): string {
  return `
    <div class="learner-curr">
      <p class="eyebrow">CURR <small class="curr-proxy-tag">(proxy não validado)</small></p>
      <strong class="curr-value">${snapshot.curr.toFixed(2)}</strong>
      <p class="curr-hint">
        Retenção aproximada (unidades com revisão de portão nos últimos 7 dias ÷ unidades com portão).
        <strong>Não validado</strong> — não orienta nenhuma decisão automática.
      </p>
    </div>
  `
}

export function renderLearnerDashboard(): string {
  const snapshot = getLearnerSnapshot()
  const points = `${snapshot.aidi.trend.length}/${AIDI_HISTORY_POINTS}`

  return `
    <section class="learner-dashboard" aria-label="Painel do aprendiz">
      <div class="section-heading">
        <p class="eyebrow">Aprendiz ao vivo</p>
        <h2>Estado real do learning gate</h2>
        <p>
          Estes dados vêm de <code>learner/</code>; re-deriva após qualquer mudança com
          <code>python3 -m learner.substrate</code>. <span class="trend-points">${points} pontos de AIDI</span>.
        </p>
      </div>

      <div class="learner-grid">
        ${renderUnitState(snapshot)}
        ${renderProfile(snapshot)}
        ${renderAidi(snapshot)}
        ${renderPitfalls(snapshot)}
        ${renderNextReviews(snapshot)}
        ${renderStreak(snapshot)}
        ${renderCurr(snapshot)}
        ${renderCoverage(snapshot)}
      </div>
    </section>
  `
}
