import { metricThresholds, navConfig, periodOptions } from "../config/dashboard-config.js";

function kpiIcon(name) {
  const icons = {
    candidates: `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    employees:  `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="6.5" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 14c0-2.76 2.24-5 5-5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="12.5" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M11.5 9c2.76 0 5 2.24 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    vacancies:  `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="4.5" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 4.5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.3"/><line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    fit:        `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    risk:       `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><line x1="9" y1="7" x2="9" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="13" r=".8" fill="currentColor"/></svg>`,
    completed:  `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M6 9l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    link:       `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M7.5 10.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L8.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.5 7.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    interview:  `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3 4h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6l-3 2V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4"/></svg>`,
    balance:    `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4" opacity=".6"/><path d="M9 5v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    chart:      `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="10" width="3" height="6" rx="1" fill="currentColor" opacity=".5"/><rect x="7.5" y="6" width="3" height="10" rx="1" fill="currentColor" opacity=".7"/><rect x="13" y="2" width="3" height="14" rx="1" fill="currentColor"/></svg>`,
    active:     `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="currentColor"/><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.3" opacity=".4"/></svg>`
  };
  return name ? (icons[name] || icons.balance) : "";
}

export function getMetricStatus(value, thresholds = metricThresholds.fit) {
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(numeric)) return "noData";
  if (thresholds.inverse) {
    if (numeric <= thresholds.good) return "good";
    if (numeric <= thresholds.medium) return "medium";
    return "bad";
  }
  if (numeric >= thresholds.good) return "good";
  if (numeric >= thresholds.medium) return "medium";
  return "bad";
}

export function getStatusColor(status) {
  return ({ good: "#22C55E", medium: "#D9A441", bad: "#F87171", neutral: "#1E5BFF", noData: "#6E7C97" })[status] || "#1E5BFF";
}

export function getConversionStatus(value) {
  return getMetricStatus(value, metricThresholds.conversion);
}

export function getFitStatus(value) {
  return getMetricStatus(value, metricThresholds.fit);
}

export function getRiskStatus(value) {
  return getMetricStatus(value, metricThresholds.risk);
}

// «В зоне риска»: только реально оценённые. Не оценённые (fit = null, риск «—»)
// не считаются рисковыми — иначе аналитика по импортированным сотрудникам врёт.
export function employeeAtRisk(e) {
  const assessed = typeof e.fit === "number";
  const riskElevated = e.turnoverRisk === "средний" || e.turnoverRisk === "повышенный" || e.turnoverRisk === "высокий";
  return riskElevated || (assessed && e.fit < 70);
}

export function getVacancyHealthStatus(vacancy) {
  const conversion = Number(String(vacancy.conversion || 0).replace("%", ""));
  if (!vacancy.responses || !vacancy.fit) return "bad";
  if (vacancy.responses > 40 && vacancy.fit < 5) return "bad";
  return getMetricStatus(conversion, metricThresholds.vacancyHealth);
}

export function buildNavItems(state, counts) {
  return navConfig.map((item) => ({
    ...item,
    count: item.countKey ? counts[item.countKey] : null,
    alertCount: item.alertKey ? counts[item.alertKey] : null,
    locked: item.lockedOn?.includes(state.company.tariff)
  }));
}

export function buildNavGroups(state, counts) {
  const items = buildNavItems(state, counts);
  const groups = [
    { key: "main", label: "Обзор" },
    { key: "tools", label: "Инструменты" },
    { key: "analytics", label: "Аналитика" },
    { key: "account", label: "Аккаунт" }
  ];
  return groups.map((g) => ({ ...g, items: items.filter((i) => i.group === g.key) }));
}

// ─── Premium subcomponents (used by DashboardPageLayout for all sections) ─────

function pStatusClass(status) {
  return ({ good: "status-good", medium: "status-medium", bad: "status-bad", neutral: "status-neutral", noData: "status-neutral" })[status] || "status-neutral";
}

function PremiumHeader({ title, subtitle, actions = [], meta = [] }) {
  return `
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        ${meta.length ? `<span class="elt-mini-label">${meta.join(" · ")}</span>` : ""}
        <h1 class="elt-dash-title">${title}</h1>
        ${subtitle ? `<p class="elt-dash-subtitle">${subtitle}</p>` : ""}
      </div>
      ${actions.length ? `<div class="elt-dash-header-actions">${actions.map((a) => `<button class="${a.primary ? "elt-btn-primary" : "elt-btn-ghost"}" ${a.attrs || ""}>${a.label}</button>`).join("")}</div>` : ""}
    </header>
  `;
}

function PremiumFilterBar(filters, activePeriod = "30 дней", activeFiltersMap = {}) {
  if (!filters || !filters.length) return "";
  const periodBtns = ["7 дней","14 дней","30 дней","90 дней","Весь период"];
  // Only show tags for filters that have been actively selected by user
  const activeFilters = Object.entries(activeFiltersMap)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => k + ": " + v);
  return `
    <section class="elt-filter-bar elt-filter-bar-v3">
      <div class="elt-fb-period">
        ${periodBtns.map((p) => `<button class="elt-fb-period-btn ${p === activePeriod ? "active" : ""}" data-period="${p}">${p === "Весь период" ? "Всё" : p}</button>`).join("")}
      </div>
      <span class="elt-filter-sep"></span>
      <button class="elt-fb-filter-btn" data-action="open-filters">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3.5h10M3.5 6.5h6M5.5 9.5h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Фильтры
        ${activeFilters.length ? `<span class="elt-fb-badge">${activeFilters.length}</span>` : ""}
      </button>
      ${activeFilters.length ? `<span class="elt-filter-sep"></span>${activeFilters.slice(0, 3).map((f) => { const key = f.split(": ")[0]; return `<span class="elt-fb-tag">${f} <span class="elt-fb-tag-x" data-remove-filter="${key}">×</span></span>`; }).join("")}
      ${activeFilters.length > 3 ? `<span class="elt-fb-tag elt-fb-tag-more">+${activeFilters.length - 3}</span>` : ""}
      <button class="elt-fb-clear" data-action="clear-filters">Сбросить</button>` : ""}
    </section>
  `;
}

function PremiumKpiCard(card) {
  const sc = pStatusClass(card.status || "neutral");
  const iconSvg = card.iconName ? `<div class="elt-kpi-icon">${kpiIcon(card.iconName)}</div>` : "";
  return `
    <article class="elt-kpi ${sc} ${card.target ? "clickable" : ""}" ${card.target ? `data-open-list="${card.target}"` : ""}>
      <div class="elt-kpi-top">
        ${iconSvg}
        <i class="elt-kpi-dot"></i>
      </div>
      <strong class="elt-kpi-value" ${/^\d/.test(String(card.value)) ? `data-countup="${parseFloat(String(card.value).replace(/[^\d.]/g,''))}" data-countup-suffix="${String(card.value).replace(/^[\d.,\s]+/,'')}"` : ""}>${card.value}</strong>
      <div class="elt-kpi-footer">
        <span class="elt-kpi-label">${card.label}</span>
        ${card.trend ? `<span class="elt-kpi-trend">${card.trend}</span>` : ""}
      </div>
      <p class="elt-kpi-caption">${card.caption || ""}</p>
    </article>
  `;
}

function premiumBarChart(items) {
  const max = Math.max(...items.map((item) => Number(item.value ?? item[1]) || 1), 1);
  return `
    <div class="elt-bar-chart">
      ${items.map((item) => {
        const label = item.label ?? item[0];
        const value = item.value ?? item[1];
        const w = Math.max(6, Math.round((Number(value) / max) * 100));
        const status = item.status || "neutral";
        return `
          <div class="elt-bar-row ${pStatusClass(status)}">
            <span class="elt-bar-label">${label}</span>
            <div class="elt-bar-track">
              <div class="elt-bar-fill" data-bar-width="${w}" style="width:${w}%"></div>
            </div>
            <strong class="elt-bar-value">${value}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function premiumFunnel(items) {
  const first = Number(items[0]?.value ?? items[0]?.[1] ?? 1) || 1;
  return `
    <div class="elt-funnel">
      ${items.map((item, idx) => {
        const label = item.label ?? item[0];
        const value = item.value ?? item[1];
        const num = Number(value) || 0;
        const pctVal = Math.max(6, Math.min(100, Math.round((num / first) * 100)));
        const status = item.status || getConversionStatus(pctVal);
        const isLast = idx === items.length - 1;
        const prev = idx > 0 ? Number(items[idx-1]?.value ?? items[idx-1]?.[1] ?? 1) || 1 : first;
        const stepPct = idx > 0 ? Math.min(100, Math.round((num / prev) * 100)) : 100;
        const convLabel = idx > 0 ? (num <= prev ? `↓${stepPct}%` : `↑${stepPct}%`) : "";
        return `
          <button class="elt-funnel-step ${pStatusClass(status)} ${isLast ? "elt-funnel-last" : ""}" data-open-list="${item.target || `Кандидаты:${label}`}">
            <div class="elt-funnel-row">
              <span class="elt-funnel-label">${label}</span>
              <b class="elt-funnel-count" ${/^\d/.test(String(value)) ? `data-countup="${parseFloat(String(value).replace(/[^\d.]/g,''))}"` : ""}>${value}</b>
              ${convLabel ? `<em class="elt-funnel-conv">${convLabel}</em>` : ""}
            </div>
            <div class="elt-funnel-bar">
              <div class="elt-funnel-fill" data-bar-width="${pctVal}" data-bar-delay="${idx * 60}" style="width:${pctVal}%"></div>
            </div>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function premiumTopFit(items) {
  return `<div class="elt-top-fit-list">${items.map(([name, score, id, candStatus]) => {
    const initials = name.split(" ").slice(0,2).map((w) => w[0]).join("");
    const fitStatus = getFitStatus(Number(score));
    const passed = candStatus === "completed";
    const actions = id
      ? `<button class="elt-action-pill" data-open-card="${id}">Карточка</button>${passed ? `<button class="elt-action-pill" data-pdf-id="${id}">PDF</button>` : ""}<button class="elt-action-pill" data-open-answers="${id}">Ответы</button>`
      : `<button class="elt-action-pill">Карточка</button>`;
    return `<div class="elt-top-fit-card">
      <div class="elt-top-fit-avatar ${pStatusClass(fitStatus)}">${initials}</div>
      <div class="elt-top-fit-info"><b>${name}</b><span class="elt-status-badge ${pStatusClass(fitStatus)}">${score}%</span></div>
      <div class="elt-top-fit-actions">${actions}</div>
    </div>`;
  }).join("")}</div>`;
}

function PremiumChartCard(chart) {
  const isTopFit = chart.caption === "top fit";
  const isFunnel = chart.type === "funnel";
  const body = isTopFit ? premiumTopFit(chart.items || []) : isFunnel ? premiumFunnel(chart.items || []) : premiumBarChart(chart.items || []);
  return `
    <article class="elt-panel elt-chart-panel ${chart.wide ? "elt-wide" : ""}">
      <div class="elt-panel-head">
        <div class="elt-panel-head-left">
          <h2>${chart.title}</h2>
        </div>
        <span class="elt-panel-caption">${chart.caption || ""}</span>
      </div>
      ${body}
      ${chart.note ? `<div class="elt-ai-note"><span class="elt-ai-badge">AI</span><p>${chart.note}</p></div>` : ""}
    </article>
  `;
}

function PremiumHeatmap(map) {
  return `
    <article class="elt-panel elt-chart-panel elt-wide">
      <div class="elt-panel-head">
        <div class="elt-panel-head-left">
          <h2>${map.title}</h2>
        </div>
        <span class="elt-panel-caption">${map.caption || "тепловая карта"}</span>
      </div>
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
                <button class="elt-heat-cell ${pStatusClass(cell.status)}" data-open-list="${cell.target || map.target || "Кандидаты:тепловая карта"}"><strong>${cell.value}</strong><span>${cell.caption}</span></button>
              `).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    </article>
  `;
}

function PremiumAttentionPanel(items) {
  if (!items.length) return "";
  return `
    <article class="elt-panel elt-attention">
      <div class="elt-panel-head">
        <div class="elt-panel-head-left">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="#D9A441" stroke-width="1.4" stroke-linejoin="round"/><line x1="8" y1="6" x2="8" y2="9.5" stroke="#D9A441" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.5" r=".8" fill="#D9A441"/></svg>
          <h2>Требует внимания</h2>
        </div>
        <span class="elt-panel-badge">${items.length} сигналов</span>
      </div>
      <div class="elt-attention-list">
        ${items.map((item) => `
          <button class="elt-attention-item ${pStatusClass(item.status)}" data-open-list="${item.target}">
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

function PremiumDataTable(table) {
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

export function DashboardPageLayout(config) {
  return `
    <section class="elt-dashboard">
      ${PremiumHeader(config)}
      ${PremiumFilterBar(config.filters || [], config.period, config.activeFiltersMap || {})}
      <section class="elt-kpi-grid">
        ${(config.kpiCards || []).map(PremiumKpiCard).join("")}
      </section>
      <section class="elt-analytics-grid">
        ${(config.charts || []).map(PremiumChartCard).join("")}
        ${config.heatmap ? PremiumHeatmap(config.heatmap) : ""}
      </section>
      ${PremiumAttentionPanel(config.attentionItems || [])}
      ${config.table ? PremiumDataTable(config.table) : ""}
    </section>
  `;
}

export function DashboardHeader({ title, subtitle, actions = [], meta = [] }) {
  return `
    <section class="pageHead dashboardHeader">
      <div class="header-left">
        ${meta.length ? `<span class="miniLabel">${meta.join(" · ")}</span>` : ""}
        <h1>${title}</h1>
      </div>
      ${actions.length ? `<div class="headerActions">${actions.map((action) => `<button class="${action.primary ? "blueButton" : "button subtle"}" ${action.attrs || ""}>${action.label}</button>`).join("")}</div>` : ""}
    </section>
  `;
}

export function PeriodFilter(activePeriod = "30 дней") {
  return `<div class="periodFilter">${periodOptions.map((period) => `<button class="${period === activePeriod ? "active" : ""}" data-period="${period}">${period}</button>`).join("")}</div>`;
}

export function FilterBar(filters, activePeriod = "30 дней") {
  if (!filters.length) return "";
  const activeFilters = filters.filter((f) => f !== "Период");
  return `
    <section class="filterPanel filterPanelRow">
      ${PeriodFilter(activePeriod)}
      ${activeFilters.length ? `<div class="filterDivider"></div><div class="filterBar compact">${activeFilters.map((f) => `<button>${f}</button>`).join("")}<button class="filter-apply">Применить</button><button class="filter-reset">Сбросить</button></div>` : ""}
    </section>
  `;
}

export function KpiGrid(cards) {
  if (!cards.length) return "";
  return `<section class="kpiGrid smart">${cards.map(KpiCard).join("")}</section>`;
}

export function KpiCard(card) {
  const status = card.status || "neutral";
  const iconSvg = card.iconName ? `<div class="kpi-icon-wrap">${kpiIcon(card.iconName)}</div>` : "";
  return `<article class="panel kpi status-${status} ${card.target ? "clickable" : ""}" ${card.target ? `data-open-list="${card.target}"` : ""}>
    <div class="kpi-top-row">${iconSvg}<i class="statusDot"></i></div>
    <strong>${card.value}</strong>
    <span class="kpi-label">${card.label}</span>
    <p>${card.caption || ""}</p>
  </article>`;
}

export function ChartCard(chart) {
  const isTopFit = chart.caption === "top fit";
  const body = isTopFit ? topFitCards(chart.items || []) : chart.type === "funnel" ? funnel(chart.items || []) : barChart(chart.items || []);
  return `
    <article class="panel chartPanel ${chart.wide ? "widePanel" : ""}">
      <div class="panelHead"><h2>${chart.title}</h2><span>${chart.caption || ""}</span></div>
      ${body}
      ${chart.note ? `<p class="aiNoteInline">${chart.note}</p>` : ""}
    </article>
  `;
}

function topFitCards(items) {
  return `<div class="top-fit-list">${items.map(([name, score, id, candStatus]) => {
    const initials = name.split(" ").slice(0,2).map((w) => w[0]).join("");
    const status = getFitStatus(Number(score));
    const passed = candStatus === "completed";
    const actions = id
      ? `<button class="action-pill" data-open-card="${id}">Карточка</button>${passed ? `<button class="action-pill" data-pdf-id="${id}">PDF</button>` : ""}<button class="action-pill" data-open-answers="${id}">Ответы</button>`
      : `<button class="action-pill">Карточка</button>`;
    return `<div class="top-fit-card">
      <div class="top-fit-avatar status-${status}">${initials}</div>
      <div class="top-fit-info"><b>${name}</b><span class="statusBadge status-${status}">${score}%</span></div>
      <div class="top-fit-actions">${actions}</div>
    </div>`;
  }).join("")}</div>`;
}

export function Heatmap(map) {
  return `
    <article class="panel chartPanel heatmapCard widePanel">
      <div class="panelHead"><h2>${map.title}</h2><span>${map.caption || "тепловая карта"}</span></div>
      <div class="heatmap" style="--heat-cols:${map.columns.length}">
        <div class="heatmapHead"><span></span>${map.columns.map((column) => `<b>${column}</b>`).join("")}</div>
        ${map.rows.map((row) => `<div class="heatmapRow"><b>${row.label}</b>${row.cells.map((cell) => `<button class="heatCell status-${cell.status}" data-open-list="${cell.target || map.target || "Кандидаты:тепловая карта"}"><strong>${cell.value}</strong><span>${cell.caption}</span></button>`).join("")}</div>`).join("")}
      </div>
    </article>
  `;
}

export function AttentionPanel(items) {
  if (!items.length) return "";
  return `
    <article class="panel attentionPanel">
      <div class="panelHead"><h2>Требует внимания</h2><span>${items.length} сигналов</span></div>
      <div class="attentionList">${items.map((item) => `<button class="attentionItem status-${item.status || "neutral"}" data-open-list="${item.target}"><b>${item.title}</b><span>${item.text}</span></button>`).join("")}</div>
    </article>
  `;
}

export function DataTable(table) {
  return `
    <article class="panel tablePanel compactTable">
      <div class="panelHead"><h2>${table.title}</h2><span>${table.caption || ""}</span></div>
      <table><thead><tr>${table.columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${table.columns.length}">${EmptyState("Пусто", "Нет строк для выбранного фильтра.")}</td></tr>`}</tbody></table>
    </article>
  `;
}

export function StatusBadge(label, status = "neutral") {
  return `<span class="statusBadge status-${status}">${label}</span>`;
}

export function EmptyState(title, text) {
  return `<div class="emptyState"><b>${title}</b><span>${text}</span></div>`;
}

export function LockedFeature(message) {
  return `<div class="lockedOverlay"><b>🔒 Функция заблокирована</b><p>${message}</p><button class="blueButton" data-open-tariff-picker>Изменить тариф</button></div>`;
}

export function TariffGuard(currentTariff, allowedTariffs, content, message) {
  return allowedTariffs.includes(currentTariff) ? content : `<div class="guardedFeature">${content}${LockedFeature(message)}</div>`;
}

export function ActionButtonGroup(actions) {
  return `<div class="rowActions row-actions-inline">${actions.map((action) => `<button class="action-pill" ${action.attrs || ""}>${action.label}</button>`).join("")}</div>`;
}

export function CandidatePreview(candidate) {
  return `${candidate.person?.fullName || candidate.fullName}<small>${candidate.person?.email || candidate.source || ""}</small>`;
}

export function EmployeePreview(employee) {
  return `${employee.fullName}<small>${employee.department} · ${employee.position}</small>`;
}

export function VacancyPreview(vacancy) {
  return `${vacancy.title}<small>${vacancy.city} · ${vacancy.salary}</small>`;
}

function barChart(items) {
  const max = Math.max(...items.map((item) => Number(item.value ?? item[1]) || 1), 1);
  const total = items.reduce((sum, item) => sum + (Number(item.value ?? item[1]) || 0), 0);
  return `<div class="miniChart">${items.map((item) => {
    const label = item.label ?? item[0];
    const value = item.value ?? item[1];
    const num = Number(value) || 1;
    const pct = total > 0 ? Math.round(num / total * 100) : 0;
    const status = item.status || getFitStatus(pct);
    const barW = Math.max(6, Math.round(num / max * 100));
    return `<div class="mini-bar-row status-${status}"><span class="mini-bar-label">${label}</span><i class="mini-bar-track"><b class="mini-bar-fill" data-bar-width="${barW}" style="width:${barW}%"></b></i><strong class="mini-bar-value" data-countup="${num}">${value}</strong><em class="mini-bar-pct" data-countup="${pct}" data-countup-suffix="%">${pct}%</em></div>`;
  }).join("")}</div>`;
}

function funnel(items) {
  const first = Number(items[0]?.value ?? items[0]?.[1] ?? 1) || 1;
  return `<div class="funnelSteps">${items.map((item, i) => {
    const label = item.label ?? item[0];
    const value = item.value ?? item[1];
    const num = Number(value) || 0;
    const prev = i > 0 ? Number(items[i-1]?.value ?? items[i-1]?.[1] ?? 1) || 1 : first;
    const convPct = Math.round((num / first) * 100);
    const stepPct = i > 0 ? Math.min(100, Math.round((num / prev) * 100)) : 100;
    const status = item.status || getConversionStatus(convPct);
    const convLabel = i > 0 ? (num <= prev ? `↓${stepPct}%` : `↑${stepPct}%`) : "";
    return `<button class="funnelStep status-${status}" data-open-list="${item.target || `Кандидаты:${label}`}">
      <div class="funnel-row"><span class="funnel-label">${label}</span><b class="funnel-val">${value}</b>${i > 0 ? `<em class="funnel-conv">${convLabel}</em>` : ""}</div>
      <i class="funnel-bar"><em style="width:${Math.max(6, Math.min(100, convPct))}%"></em></i>
    </button>`;
  }).join("")}</div>`;
}
