import { metricThresholds, navConfig, periodOptions } from "../config/dashboard-config.js";

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
  return ({ good: "#22C55E", medium: "#D97706", bad: "#94A3B8", neutral: "#1E5BFF", noData: "#94A3B8" })[status] || "#1E5BFF";
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

export function DashboardPageLayout(config) {
  return `
    <section class="dashboardPage">
      ${DashboardHeader(config)}
      ${FilterBar(config.filters || [], config.period)}
      ${KpiGrid(config.kpiCards || [])}
      <section class="analyticsGrid">
        ${(config.charts || []).map(ChartCard).join("")}
        ${config.heatmap ? Heatmap(config.heatmap) : ""}
      </section>
      ${AttentionPanel(config.attentionItems || [])}
      ${config.table ? DataTable(config.table) : EmptyState("Нет данных", "Для выбранного периода пока нет записей.")}
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
  return `<article class="panel kpi status-${status} ${card.target ? "clickable" : ""}" ${card.target ? `data-open-list="${card.target}"` : ""}><span>${card.label}</span><strong>${card.value}</strong><p>${card.caption || ""}</p><i class="statusDot"></i></article>`;
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
  return `<div class="top-fit-list">${items.map(([name, score]) => {
    const initials = name.split(" ").slice(0,2).map((w) => w[0]).join("");
    const status = getFitStatus(Number(score));
    return `<div class="top-fit-card">
      <div class="top-fit-avatar status-${status}">${initials}</div>
      <div class="top-fit-info"><b>${name}</b><span class="statusBadge status-${status}">${score}%</span></div>
      <button class="action-pill">Карточка</button>
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
    return `<div class="mini-bar-row status-${status}"><span class="mini-bar-label">${label}</span><i class="mini-bar-track"><b class="mini-bar-fill" style="width:${Math.max(6, num / max * 100)}%"></b></i><strong class="mini-bar-value">${value}</strong><em class="mini-bar-pct">${pct}%</em></div>`;
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
