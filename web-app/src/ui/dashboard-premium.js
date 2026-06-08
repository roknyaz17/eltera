/**
 * Eltera Dashboard Premium — Executive Dashboard
 * Design: dark navy bg, blue-cyan accents, Manrope, glass/liquid cards
 * Brand: #1E5BFF (blue), #00E5D4 (cyan), #0B1020 (navy), #111A33 (deep)
 * All data derived from state.sessions / state.employees / state.vacancies / state.departments / state.company
 */

import { getFitStatus, getRiskStatus, getConversionStatus } from "./dashboard-components.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(value, max) {
  if (!max) return 0;
  return Math.round((value / max) * 100);
}

function statusClass(status) {
  return ({ good: "status-good", medium: "status-medium", bad: "status-bad", neutral: "status-neutral" })[status] || "status-neutral";
}

function icon(name) {
  const icons = {
    balance:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4" opacity=".6"/><path d="M9 5v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    candidates:`<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    employees: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="6.5" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 14c0-2.76 2.24-5 5-5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="12.5" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M11.5 9c2.76 0 5 2.24 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    vacancies: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="4.5" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 4.5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.3"/><line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    fit:       `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    risk:      `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><line x1="9" y1="7" x2="9" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="13" r=".8" fill="currentColor"/></svg>`,
    responses: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6l-3 2V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4"/></svg>`,
    completed: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M6 9l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  };
  return icons[name] || icons.balance;
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function kpiCard({ label, value, caption, status = "neutral", target = "", trend = "", iconName = "" }) {
  const sc = statusClass(status);
  return `
    <article class="elt-kpi ${sc} ${target ? "clickable" : ""}" ${target ? `data-open-list="${target}"` : ""}>
      <div class="elt-kpi-top">
        <div class="elt-kpi-icon">${icon(iconName || "balance")}</div>
        <i class="elt-kpi-dot"></i>
      </div>
      <strong class="elt-kpi-value">${value}</strong>
      <div class="elt-kpi-footer">
        <span class="elt-kpi-label">${label}</span>
        ${trend ? `<span class="elt-kpi-trend">${trend}</span>` : ""}
      </div>
      <p class="elt-kpi-caption">${caption}</p>
    </article>
  `;
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

function funnelChart(items) {
  const first = Number(items[0]?.value ?? 1) || 1;
  return `
    <div class="elt-funnel">
      ${items.map((item, idx) => {
        const pctVal = Math.max(6, Math.min(100, Math.round((Number(item.value) / first) * 100)));
        const status = getConversionStatus(pctVal);
        const isLast = idx === items.length - 1;
        return `
          <button class="elt-funnel-step ${statusClass(status)} ${isLast ? "elt-funnel-last" : ""}" data-open-list="${item.target || `Кандидаты:${item.label}`}">
            <div class="elt-funnel-row">
              <span class="elt-funnel-label">${item.label}</span>
              <b class="elt-funnel-count">${item.value}</b>
            </div>
            <div class="elt-funnel-bar">
              <div class="elt-funnel-fill" style="width:${pctVal}%"></div>
            </div>
            <span class="elt-funnel-pct">${pctVal}%</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function barChart(items) {
  const max = Math.max(...items.map((item) => Number(item.value ?? item[1]) || 1), 1);
  return `
    <div class="elt-bar-chart">
      ${items.map((item) => {
        const label = item.label ?? item[0];
        const value = item.value ?? item[1];
        const w = Math.max(6, Math.round((Number(value) / max) * 100));
        const status = item.status || "neutral";
        return `
          <div class="elt-bar-row ${statusClass(status)}">
            <span class="elt-bar-label">${label}</span>
            <div class="elt-bar-track">
              <div class="elt-bar-fill" style="width:${w}%"></div>
            </div>
            <strong class="elt-bar-value">${value}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ─── Radar Chart ─────────────────────────────────────────────────────────────

function radarChart(competencies) {
  const cx = 110, cy = 110, r = 80;
  const n = competencies.length;
  const values = competencies.map((c) => c.value);

  function pts(scale) {
    return values.map((v, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const rv = r * (v / 100) * scale;
      return `${cx + rv * Math.cos(angle)},${cy + rv * Math.sin(angle)}`;
    }).join(" ");
  }

  const rings = [20, 40, 60, 80, 100].map((p) => {
    const rpts = Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const rv = r * (p / 100);
      return `${cx + rv * Math.cos(angle)},${cy + rv * Math.sin(angle)}`;
    }).join(" ");
    return `<polygon points="${rpts}" class="elt-radar-ring"/>`;
  }).join("");

  const axes = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(angle)}" y2="${cy + r * Math.sin(angle)}" class="elt-radar-axis"/>`;
  }).join("");

  const labels = competencies.map((c, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const lx = cx + (r + 22) * Math.cos(angle);
    const ly = cy + (r + 22) * Math.sin(angle);
    const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle";
    return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle" class="elt-radar-label">${c.label}</text>`;
  }).join("");

  const dots = competencies.map((c, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const rv = r * (c.value / 100);
    return `<circle cx="${cx + rv * Math.cos(angle)}" cy="${cy + rv * Math.sin(angle)}" r="4" class="elt-radar-dot"/>`;
  }).join("");

  return `
    <svg viewBox="0 0 220 220" class="elt-radar-svg" aria-label="Radar компетенций">
      <defs>
        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E5BFF" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#00E5D4" stop-opacity="0.15"/>
        </linearGradient>
      </defs>
      ${rings}
      ${axes}
      <polygon points="${pts(1)}" class="elt-radar-data"/>
      ${dots}
      ${labels}
    </svg>
  `;
}

// ─── 9-Box Matrix ─────────────────────────────────────────────────────────────

function nineBoxMatrix(employees) {
  const cells = [[0,0,0],[0,0,0],[0,0,0]];
  const names = [[[],[],[]],[[],[],[]],[[],[],[]]];

  employees.forEach((emp) => {
    const perf = emp.fit >= 80 ? 2 : emp.fit >= 65 ? 1 : 0;
    const potScore = emp.turnoverRisk === "низкий" ? 2 : emp.turnoverRisk === "средний" ? 1 : 0;
    cells[2 - potScore][perf]++;
    names[2 - potScore][perf].push(emp.fullName.split(" ")[0]);
  });

  const cellLabels = [
    ["Вопрос", "Высокий потенциал", "Звезда"],
    ["Наблюдение", "Стабильный", "Лидер"],
    ["Риск", "Рабочая лошадка", "Надёжный"]
  ];
  const cellColors = [
    ["bad", "medium", "good"],
    ["bad", "neutral", "good"],
    ["bad", "neutral", "good"]
  ];
  const yLabels = ["Высокий", "Средний", "Низкий"];
  const xLabels = ["Низкая", "Средняя", "Высокая"];

  return `
    <div class="elt-9box">
      <div class="elt-9box-ylabels">
        <span class="elt-9box-axis-title">↑ Потенциал</span>
        ${yLabels.map((l) => `<span>${l}</span>`).join("")}
      </div>
      <div class="elt-9box-main">
        <div class="elt-9box-grid">
          ${cells.map((row, ri) => row.map((count, ci) => `
            <div class="elt-9box-cell ${statusClass(cellColors[ri][ci])}">
              <span class="elt-9box-cell-label">${cellLabels[ri][ci]}</span>
              <strong class="elt-9box-cell-count">${count}</strong>
              ${names[ri][ci].length ? `<span class="elt-9box-names">${names[ri][ci].slice(0, 2).join(", ")}</span>` : ""}
            </div>
          `).join("")).join("")}
        </div>
        <div class="elt-9box-xlabels">
          <span class="elt-9box-axis-title">Результативность →</span>
          ${xLabels.map((l) => `<span>${l}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function heatmapTable(map) {
  return `
    <div class="elt-heatmap-wrap">
      <div class="elt-heatmap" style="--heat-cols:${map.columns.length}">
        <div class="elt-heatmap-head">
          <span></span>
          ${map.columns.map((col) => `<b>${col}</b>`).join("")}
        </div>
        ${map.rows.map((row) => `
          <div class="elt-heatmap-row">
            <b class="elt-heatmap-row-label">${row.label}</b>
            ${row.cells.map((cell) => `
              <button class="elt-heat-cell ${statusClass(cell.status)}" data-open-list="${cell.target || "Кандидаты:тепловая карта"}">
                <strong>${cell.value}</strong>
                <span>${cell.caption}</span>
              </button>
            `).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ─── Attention Panel ──────────────────────────────────────────────────────────

function attentionPanel(items) {
  if (!items.length) return "";
  return `
    <article class="elt-panel elt-attention">
      <div class="elt-panel-head">
        <div class="elt-panel-head-left">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="#F59E0B" stroke-width="1.4" stroke-linejoin="round"/><line x1="8" y1="6" x2="8" y2="9.5" stroke="#F59E0B" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.5" r=".8" fill="#F59E0B"/></svg>
          <h2>Требует внимания</h2>
        </div>
        <span class="elt-panel-badge">${items.length} сигналов</span>
      </div>
      <div class="elt-attention-list">
        ${items.map((item) => `
          <button class="elt-attention-item ${statusClass(item.status)}" data-open-list="${item.target}">
            <div class="elt-attention-icon">
              ${item.status === "bad" ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><line x1="7" y1="4.5" x2="7" y2="7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="7" cy="9.5" r=".7" fill="currentColor"/></svg>` : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L13 12H1L7 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><line x1="7" y1="5.5" x2="7" y2="8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`}
            </div>
            <div class="elt-attention-text">
              <b>${item.title}</b>
              <span>${item.text}</span>
            </div>
            <svg class="elt-attention-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

// ─── Table ────────────────────────────────────────────────────────────────────

function dataTable(table) {
  if (!table) return "";
  return `
    <article class="elt-panel elt-table-panel">
      <div class="elt-panel-head">
        <div class="elt-panel-head-left">
          <h2>${table.title}</h2>
        </div>
        <span class="elt-panel-caption">${table.caption || ""}</span>
      </div>
      <div class="elt-table-wrap">
        <table class="elt-table">
          <thead><tr>${table.columns.map((col) => `<th>${col}</th>`).join("")}</tr></thead>
          <tbody>
            ${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${table.columns.length}" class="elt-table-empty">Нет данных</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

// ─── AI Note ─────────────────────────────────────────────────────────────────

function aiNote(title, text, access) {
  return `
    <div class="elt-ai-note">
      <div class="elt-ai-note-head">
        <span class="elt-ai-badge">AI</span>
        <b>${title}</b>
        <span class="elt-ai-access">${access}</span>
      </div>
      <p>${text}</p>
    </div>
  `;
}

// ─── Stat Mini ────────────────────────────────────────────────────────────────

function statMini(label, value, status = "neutral") {
  return `<div class="elt-stat-mini ${statusClass(status)}"><span>${label}</span><b>${value}</b></div>`;
}

// ─── Department Row ───────────────────────────────────────────────────────────

function deptRow(dept) {
  const riskStatus = dept.risk >= 5 ? "bad" : dept.risk >= 2 ? "medium" : "good";
  return `
    <div class="elt-dept-row">
      <div class="elt-dept-info">
        <b>${dept.name}</b>
        <span>${dept.head}</span>
      </div>
      <div class="elt-dept-stats">
        <span class="elt-dept-emp">${dept.employees} чел.</span>
        <span class="elt-dept-risk ${statusClass(riskStatus)}">${dept.risk} в риске</span>
      </div>
      <button class="elt-dept-btn" data-view="employees">Открыть</button>
    </div>
  `;
}

// ─── Main Dashboard Renderer ──────────────────────────────────────────────────

export function renderPremiumDashboard(state, dashboardData, candidateHeatmapFn, attentionItemsFn, peopleTableConfigFn, aiAccessFn, statusForLabelFn, pageFilterConfig) {
  const data = dashboardData(state, state.dashboardFilter);

  // ── Derived metrics from state ──
  const candidates = state.sessions.filter((s) => s.person.assessmentType === "Кандидат");
  const employees = state.employees;
  const completedCandidates = candidates.filter((s) => s.status === "completed");
  const fitCandidates = completedCandidates.filter((s) => s.result.percent >= 68);
  const riskCandidates = completedCandidates.filter((s) => s.result.percent < 55);
  const riskEmployees = employees.filter((e) => e.fit < 70 || e.turnoverRisk !== "низкий");
  const burnoutEmployees = employees.filter((e) => e.burnout && e.burnout !== "нет" && e.burnout !== "не оценен");
  const totalVacancies = state.vacancies.length;
  const activeVacancies = state.vacancies.filter((v) => v.status === "Активна").length;
  const totalResponses = state.vacancies.reduce((sum, v) => sum + (v.responses || 0), 0);
  const totalFit = state.vacancies.reduce((sum, v) => sum + (v.fit || 0), 0);
  const balanceLow = state.company.balance < 20;
  const avgFit = completedCandidates.length
    ? Math.round(completedCandidates.reduce((s, c) => s + c.result.percent, 0) / completedCandidates.length)
    : 0;
  const avgEmpFit = employees.length
    ? Math.round(employees.reduce((s, e) => s + e.fit, 0) / employees.length)
    : 0;
  const conversionPct = state.links.length + completedCandidates.length > 0
    ? pct(completedCandidates.length, state.links.length + completedCandidates.length)
    : 0;

  // ── Competency radar ──
  const competencyKeys = ["Ответственность", "Коммуникация", "Профессиональные навыки", "Достоверность"];
  const radarData = competencyKeys.map((key) => {
    const scores = completedCandidates.map((s) => s.result.competencyScores?.[key]?.score || 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { label: key.split(" ")[0], value: avg };
  });

  // ── KPI cards ──
  const kpiCards = [
    {
      label: "Баланс оценок",
      value: state.company.balance,
      caption: balanceLow ? "Рекомендуется пополнить" : "Доступно для отправки",
      status: balanceLow ? "medium" : "good",
      target: "Кандидаты:Оценка отправлена",
      iconName: "balance",
      trend: balanceLow ? "⚠ ниже порога" : ""
    },
    {
      label: "Кандидатов",
      value: candidates.length,
      caption: `${completedCandidates.length} прошли оценку`,
      status: "neutral",
      target: "Кандидаты:Кандидатов всего",
      iconName: "candidates"
    },
    {
      label: "Подходят",
      value: fitCandidates.length,
      caption: `${avgFit}% средний балл`,
      status: fitCandidates.length > 0 ? "good" : "medium",
      target: "Кандидаты:Подходят",
      iconName: "fit",
      trend: fitCandidates.length > 0 ? `${pct(fitCandidates.length, completedCandidates.length)}% fit` : ""
    },
    {
      label: "Не подходят",
      value: riskCandidates.length,
      caption: "балл ниже 55%",
      status: riskCandidates.length > 0 ? "bad" : "good",
      target: "Кандидаты:Не подходит",
      iconName: "risk"
    },
    {
      label: "Сотрудников",
      value: employees.length,
      caption: `${avgEmpFit}% средний fit`,
      status: "neutral",
      target: "Сотрудники:Сотрудников всего",
      iconName: "employees"
    },
    {
      label: "В зоне риска",
      value: riskEmployees.length,
      caption: burnoutEmployees.length > 0 ? `${burnoutEmployees.length} с выгоранием` : "требуют внимания",
      status: riskEmployees.length > 0 ? "bad" : "good",
      target: "Сотрудники:В зоне риска",
      iconName: "risk"
    },
    {
      label: "Вакансий",
      value: totalVacancies,
      caption: `${activeVacancies} активных`,
      status: "neutral",
      target: "Вакансии:Активные",
      iconName: "vacancies"
    },
    {
      label: "Откликов",
      value: totalResponses,
      caption: `${totalFit} подходящих`,
      status: "neutral",
      target: "Вакансии:Отклики",
      iconName: "responses"
    }
  ];

  // ── Funnel ──
  const funnelItems = data.funnel.map(([label, value]) => ({
    label,
    value,
    target: `${state.dashboardFilter}:${label}`
  }));

  // ── Heatmap ──
  const heatmap = candidateHeatmapFn(state);

  // ── Attention ──
  const attention = attentionItemsFn(state);

  // ── Table ──
  const table = peopleTableConfigFn(data.people, state.dashboardFilter);

  // ── AI ──
  const aiAccess = aiAccessFn(state.company.tariff);

  // ── Period pills ──
  const periods = ["7 дней", "14 дней", "30 дней", "90 дней", "Весь период"];
  const filters = ["Кандидаты", "Сотрудники", "Групповые оценки", "Адаптация", "Performance Review", "Все данные"];

  return `
    <section class="elt-dashboard">

      <!-- ── Header ── -->
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Executive Dashboard · ${state.company.tariff} · ${state.period}</span>
          <h1 class="elt-dash-title">HR-аналитика компании</h1>
          <p class="elt-dash-subtitle">Что происходит в HR-системе прямо сейчас и где нужно вмешаться.</p>
        </div>
        <div class="elt-dash-header-actions">
          <button class="elt-btn-ghost" data-open-tariff-picker>Изменить тариф</button>
          <button class="elt-btn-ghost" data-action="top-up">Пополнить</button>
          <button class="elt-btn-primary" data-action="create-link">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            Создать оценку
          </button>
        </div>
      </header>

      <!-- ── Filter bar ── -->
      <section class="elt-filter-bar">
        <div class="elt-period-pills">
          ${periods.map((p) => `<button class="elt-pill ${p === state.period ? "active" : ""}" data-period="${p}">${p}</button>`).join("")}
        </div>
        <div class="elt-filter-pills">
          ${filters.map((f) => `<button class="elt-pill ${f === state.dashboardFilter ? "active" : ""}" data-dashboard-filter="${f}">${f}</button>`).join("")}
        </div>
      </section>

      <!-- ── KPI Grid ── -->
      <section class="elt-kpi-grid">
        ${kpiCards.map(kpiCard).join("")}
      </section>

      <!-- ── Analytics Grid ── -->
      <section class="elt-analytics-grid">

        <!-- Воронка подбора -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <div class="elt-panel-head-left">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2h11l-4 5v5l-3-2V7L2 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
              <h2>Воронка подбора</h2>
            </div>
            <span class="elt-panel-caption">${state.dashboardFilter}</span>
          </div>
          ${funnelChart(funnelItems)}
        </article>

        <!-- Radar компетенций -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <div class="elt-panel-head-left">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><polygon points="7.5,1.5 13.5,5.5 13.5,9.5 7.5,13.5 1.5,9.5 1.5,5.5" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>
              <h2>Radar компетенций</h2>
            </div>
            <span class="elt-panel-caption">средний балл</span>
          </div>
          <div class="elt-radar-wrap">
            ${radarChart(radarData)}
            <div class="elt-radar-legend">
              ${radarData.map((c) => `
                <div class="elt-radar-legend-item">
                  <span>${c.label}</span>
                  <b>${c.value}%</b>
                </div>
              `).join("")}
            </div>
          </div>
        </article>

        <!-- 9-Box Performance × Potential -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <div class="elt-panel-head-left">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="5.5" y="1.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="9.5" y="1.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="1.5" y="5.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="5.5" y="5.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="9.5" y="5.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="1.5" y="9.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="5.5" y="9.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="9.5" y="9.5" width="4" height="4" rx=".8" stroke="currentColor" stroke-width="1.2"/></svg>
              <h2>9-Box: Performance × Potential</h2>
            </div>
            <span class="elt-panel-caption">сотрудники</span>
          </div>
          ${nineBoxMatrix(employees)}
        </article>

        <!-- Вакансии: fit по профилю -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <div class="elt-panel-head-left">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4" width="12" height="9" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.2"/></svg>
              <h2>Вакансии: подходящие</h2>
            </div>
            <span class="elt-panel-caption">fit по профилю</span>
          </div>
          ${barChart(state.vacancies.map((v) => ({
            label: v.title,
            value: v.fit,
            status: getFitStatus(v.fit * 8)
          })))}
          ${aiNote(data.aiTitle, data.aiText, aiAccess)}
        </article>

        <!-- Отделы компании -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <div class="elt-panel-head-left">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5.5" y="1.5" width="4" height="3" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="1.5" y="10.5" width="4" height="3" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="5.5" y="10.5" width="4" height="3" rx=".8" stroke="currentColor" stroke-width="1.2"/><rect x="9.5" y="10.5" width="4" height="3" rx=".8" stroke="currentColor" stroke-width="1.2"/><line x1="7.5" y1="4.5" x2="7.5" y2="7.5" stroke="currentColor" stroke-width="1.2"/><line x1="3.5" y1="7.5" x2="11.5" y2="7.5" stroke="currentColor" stroke-width="1.2"/><line x1="3.5" y1="7.5" x2="3.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/><line x1="7.5" y1="7.5" x2="7.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/><line x1="11.5" y1="7.5" x2="11.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/></svg>
              <h2>Структура компании</h2>
            </div>
            <span class="elt-panel-caption">${state.departments.length} отделов</span>
          </div>
          <div class="elt-dept-list">
            ${state.departments.map(deptRow).join("")}
          </div>
        </article>

        <!-- Тепловая карта — full width -->
        <article class="elt-panel elt-chart-panel elt-wide">
          <div class="elt-panel-head">
            <div class="elt-panel-head-left">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="1.5" y1="5.5" x2="13.5" y2="5.5" stroke="currentColor" stroke-width="1"/><line x1="1.5" y1="9.5" x2="13.5" y2="9.5" stroke="currentColor" stroke-width="1"/><line x1="5.5" y1="1.5" x2="5.5" y2="13.5" stroke="currentColor" stroke-width="1"/><line x1="9.5" y1="1.5" x2="9.5" y2="13.5" stroke="currentColor" stroke-width="1"/></svg>
              <h2>${heatmap.title}</h2>
            </div>
            <span class="elt-panel-caption">тепловая карта компании</span>
          </div>
          ${heatmapTable(heatmap)}
        </article>

      </section>

      <!-- ── Attention ── -->
      ${attentionPanel(attention)}

      <!-- ── Table ── -->
      ${dataTable(table)}

    </section>
  `;
}
