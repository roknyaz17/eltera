/**
 * Eltera Dashboard Premium — Executive Dashboard
 * Design: dark navy bg, blue-cyan accents, Manrope, glass/liquid cards
 * Brand: #1E5BFF (blue), #00E5D4 (cyan), #0B1020 (navy), #111A33 (deep)
 * All data derived from state.sessions / state.employees / state.vacancies / state.departments / state.company
 */

import { getFitStatus, getRiskStatus, getConversionStatus } from "./dashboard-components.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(value, max) { return Math.round((value / max) * 100); }

function statusClass(status) {
  return ({ good: "status-good", medium: "status-medium", bad: "status-bad", neutral: "status-neutral" })[status] || "status-neutral";
}

function radarPoints(values, cx, cy, r) {
  const n = values.length;
  return values.map((v, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const rv = r * (v / 100);
    return `${cx + rv * Math.cos(angle)},${cy + rv * Math.sin(angle)}`;
  }).join(" ");
}

function radarGridPoints(cx, cy, r) {
  const n = 6;
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function kpiCard({ label, value, caption, status = "neutral", target = "", trend = "" }) {
  const sc = statusClass(status);
  return `
    <article class="elt-kpi ${sc} ${target ? "clickable" : ""}" ${target ? `data-open-list="${target}"` : ""}>
      <div class="elt-kpi-top">
        <span class="elt-kpi-label">${label}</span>
        <i class="elt-kpi-dot"></i>
      </div>
      <strong class="elt-kpi-value">${value}</strong>
      <div class="elt-kpi-footer">
        <p class="elt-kpi-caption">${caption}</p>
        ${trend ? `<span class="elt-kpi-trend">${trend}</span>` : ""}
      </div>
    </article>
  `;
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

function funnelChart(items) {
  const first = Number(items[0]?.value ?? 1) || 1;
  return `
    <div class="elt-funnel">
      ${items.map((item) => {
        const pctVal = Math.max(6, Math.min(100, Math.round((Number(item.value) / first) * 100)));
        const status = getConversionStatus(pctVal);
        return `
          <button class="elt-funnel-step ${statusClass(status)}" data-open-list="${item.target || `Кандидаты:${item.label}`}">
            <div class="elt-funnel-row">
              <span>${item.label}</span>
              <b>${item.value}</b>
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
  // competencies: [{label, value (0-100)}]
  const cx = 110, cy = 110, r = 80;
  const n = competencies.length;
  const values = competencies.map((c) => c.value);
  const dataPoints = radarPoints(values, cx, cy, r);

  // grid rings
  const rings = [20, 40, 60, 80, 100].map((pct) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const rv = r * (pct / 100);
      return `${cx + rv * Math.cos(angle)},${cy + rv * Math.sin(angle)}`;
    }).join(" ");
    return `<polygon points="${pts}" class="elt-radar-ring"/>`;
  }).join("");

  // axes
  const axes = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(angle)}" y2="${cy + r * Math.sin(angle)}" class="elt-radar-axis"/>`;
  }).join("");

  // labels
  const labels = competencies.map((c, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const lx = cx + (r + 18) * Math.cos(angle);
    const ly = cy + (r + 18) * Math.sin(angle);
    const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle";
    return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle" class="elt-radar-label">${c.label}</text>`;
  }).join("");

  return `
    <svg viewBox="0 0 220 220" class="elt-radar-svg" aria-label="Radar компетенций">
      ${rings}
      ${axes}
      <polygon points="${dataPoints}" class="elt-radar-data"/>
      ${competencies.map((c, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const rv = r * (c.value / 100);
        return `<circle cx="${cx + rv * Math.cos(angle)}" cy="${cy + rv * Math.sin(angle)}" r="3.5" class="elt-radar-dot"/>`;
      }).join("")}
      ${labels}
    </svg>
  `;
}

// ─── 9-Box Matrix ─────────────────────────────────────────────────────────────

function nineBoxMatrix(employees) {
  // Map employees to 9-box cells
  // x-axis: Performance (fit%), y-axis: Potential (derived from burnout/risk)
  const cells = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  const names = [
    [[], [], []],
    [[], [], []],
    [[], [], []]
  ];

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

  const yLabels = ["Высокий потенциал", "Средний потенциал", "Низкий потенциал"];
  const xLabels = ["Низкая результативность", "Средняя", "Высокая"];

  return `
    <div class="elt-9box">
      <div class="elt-9box-grid">
        <div class="elt-9box-corner"></div>
        ${xLabels.map((l) => `<div class="elt-9box-xlabel">${l}</div>`).join("")}
        ${cells.map((row, ri) => `
          <div class="elt-9box-ylabel">${yLabels[ri]}</div>
          ${row.map((count, ci) => `
            <div class="elt-9box-cell ${statusClass(cellColors[ri][ci])}">
              <span class="elt-9box-cell-label">${cellLabels[ri][ci]}</span>
              <strong class="elt-9box-cell-count">${count}</strong>
              ${names[ri][ci].length ? `<span class="elt-9box-names">${names[ri][ci].slice(0, 2).join(", ")}</span>` : ""}
            </div>
          `).join("")}
        `).join("")}
      </div>
      <div class="elt-9box-legend">
        <div class="elt-9box-axis-label elt-9box-axis-y">↑ Потенциал</div>
        <div class="elt-9box-axis-label elt-9box-axis-x">Результативность →</div>
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
            <b>${row.label}</b>
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
        <h2>Требует внимания</h2>
        <span>${items.length} сигналов</span>
      </div>
      <div class="elt-attention-list">
        ${items.map((item) => `
          <button class="elt-attention-item ${statusClass(item.status)}" data-open-list="${item.target}">
            <b>${item.title}</b>
            <span>${item.text}</span>
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
        <h2>${table.title}</h2>
        <span>${table.caption || ""}</span>
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

// ─── Main Dashboard Renderer ──────────────────────────────────────────────────

export function renderPremiumDashboard(state, dashboardData, candidateHeatmapFn, attentionItemsFn, peopleTableConfigFn, aiAccessFn, statusForLabelFn, pageFilterConfig) {
  const data = dashboardData(state, state.dashboardFilter);
  const candidates = state.sessions.filter((s) => s.person.assessmentType === "Кандидат");
  const employees = state.employees;
  const completedCandidates = candidates.filter((s) => s.status === "completed");
  const fitCandidates = completedCandidates.filter((s) => s.result.percent >= 68);
  const riskEmployees = employees.filter((e) => e.fit < 70 || e.turnoverRisk !== "низкий");
  const totalVacancies = state.vacancies.length;
  const activeVacancies = state.vacancies.filter((v) => v.status === "Активна").length;
  const totalResponses = state.vacancies.reduce((sum, v) => sum + (v.responses || 0), 0);

  // Competency radar — aggregate from completed sessions
  const competencyKeys = ["Ответственность", "Коммуникация", "Профессиональные навыки", "Достоверность"];
  const radarData = competencyKeys.map((key) => {
    const scores = completedCandidates.map((s) => s.result.competencyScores?.[key]?.score || 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { label: key.split(" ")[0], value: avg };
  });

  // KPI cards — top row: company overview
  const kpiTop = [
    { label: "Баланс оценок", value: state.company.balance, caption: state.company.balance < 20 ? "ниже порога" : "доступно", status: state.company.balance < 20 ? "medium" : "good", target: "Кандидаты:Оценка отправлена" },
    { label: "Кандидатов", value: candidates.length, caption: `${candidates.length} в базе`, status: "neutral", target: "Кандидаты:Кандидатов всего" },
    { label: "Оценку прошли", value: completedCandidates.length, caption: `${pct(completedCandidates.length, state.links.length + completedCandidates.length)}% конверсия`, status: getConversionStatus(pct(completedCandidates.length, state.links.length + completedCandidates.length)), target: "Кандидаты:Оценка пройдена" },
    { label: "Подходят", value: fitCandidates.length, caption: "под профиль", status: fitCandidates.length > 0 ? "good" : "medium", target: "Кандидаты:Подходят" },
    { label: "Сотрудников", value: employees.length, caption: "в базе", status: "neutral", target: "Сотрудники:Сотрудников всего" },
    { label: "В зоне риска", value: riskEmployees.length, caption: "требуют внимания", status: riskEmployees.length > 3 ? "bad" : riskEmployees.length > 0 ? "medium" : "good", target: "Сотрудники:В зоне риска" },
    { label: "Вакансий", value: totalVacancies, caption: `${activeVacancies} активных`, status: "neutral", target: "Вакансии:Активные" },
    { label: "Откликов", value: totalResponses, caption: "по всем вакансиям", status: "neutral", target: "Вакансии:Отклики" }
  ];

  // Funnel
  const funnelItems = data.funnel.map(([label, value]) => ({ label, value, target: `${state.dashboardFilter}:${label}` }));

  // Heatmap
  const heatmap = candidateHeatmapFn(state);

  // Attention
  const attention = attentionItemsFn(state);

  // Table
  const table = peopleTableConfigFn(data.people, state.dashboardFilter);

  // AI note
  const aiAccess = aiAccessFn(state.company.tariff);

  return `
    <section class="elt-dashboard">

      <!-- Header -->
      <section class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Executive Dashboard · ${state.company.tariff} · ${state.period}</span>
          <h1 class="elt-dash-title">HR-аналитика компании</h1>
          <p class="elt-dash-subtitle">Что происходит в HR-системе прямо сейчас и где нужно вмешаться.</p>
        </div>
        <div class="elt-dash-header-actions">
          <button class="elt-btn-ghost" data-open-tariff-picker>Изменить тариф</button>
          <button class="elt-btn-ghost" data-action="top-up">Пополнить</button>
          <button class="elt-btn-primary" data-action="create-link">+ Создать оценку</button>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="elt-filter-bar">
        <div class="elt-period-pills">
          ${["7 дней", "14 дней", "30 дней", "90 дней", "Весь период"].map((p) => `<button class="${p === state.period ? "active" : ""}" data-period="${p}">${p}</button>`).join("")}
        </div>
        <div class="elt-filter-pills">
          ${["Все направления", "Кандидаты", "Сотрудники", "Вакансии"].map((f) => `<button class="${f === "Все направления" ? "active" : ""}">${f}</button>`).join("")}
        </div>
      </section>

      <!-- KPI Grid -->
      <section class="elt-kpi-grid">
        ${kpiTop.map(kpiCard).join("")}
      </section>

      <!-- Analytics Grid: 3 columns -->
      <section class="elt-analytics-grid">

        <!-- Funnel -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <h2>Воронка подбора</h2>
            <span>${state.dashboardFilter}</span>
          </div>
          ${funnelChart(funnelItems)}
        </article>

        <!-- Radar компетенций -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <h2>Radar компетенций</h2>
            <span>средний балл по кандидатам</span>
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

        <!-- 9-Box -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <h2>9-Box: Performance × Potential</h2>
            <span>сотрудники</span>
          </div>
          ${nineBoxMatrix(employees)}
        </article>

        <!-- Bar chart: вакансии -->
        <article class="elt-panel elt-chart-panel">
          <div class="elt-panel-head">
            <h2>Вакансии: подходящие кандидаты</h2>
            <span>fit по профилю</span>
          </div>
          ${barChart(state.vacancies.map((v) => ({ label: v.title, value: v.fit, status: getFitStatus(v.fit * 8) })))}
          ${aiNote(data.aiTitle, data.aiText, aiAccess)}
        </article>

        <!-- Heatmap — full width -->
        <article class="elt-panel elt-chart-panel elt-wide">
          <div class="elt-panel-head">
            <h2>${heatmap.title}</h2>
            <span>тепловая карта компании</span>
          </div>
          ${heatmapTable(heatmap)}
        </article>

      </section>

      <!-- Attention -->
      ${attentionPanel(attention)}

      <!-- Table -->
      ${dataTable(table)}

    </section>
  `;
}
