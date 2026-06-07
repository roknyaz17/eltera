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
      <div><span class="miniLabel">${meta.join(" · ") || "Analytics"}</span><h1>${title}</h1><p>${subtitle}</p></div>
      <div class="headerActions">${actions.map((action) => `<button class="${action.primary ? "blueButton" : "button subtle"}" ${action.attrs || ""}>${action.label}</button>`).join("")}</div>
    </section>
  `;
}

export function PeriodFilter(activePeriod = "30 дней") {
  return `<div class="periodFilter">${periodOptions.map((period) => `<button class="${period === activePeriod ? "active" : ""}" data-period="${period}">${period}</button>`).join("")}</div>`;
}

export function FilterBar(filters, activePeriod = "30 дней") {
  if (!filters.length) return "";
  return `
    <section class="filterPanel">
      ${PeriodFilter(activePeriod)}
      <div class="filterBar compact">${filters.filter((filter) => filter !== "Период").map((filter) => `<button>${filter}</button>`).join("")}<button>Применить</button><button>Сбросить фильтры</button></div>
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
  return `
    <article class="panel chartPanel ${chart.wide ? "widePanel" : ""}">
      <div class="panelHead"><h2>${chart.title}</h2><span>${chart.caption || ""}</span></div>
      ${chart.type === "funnel" ? funnel(chart.items || []) : barChart(chart.items || [])}
      ${chart.note ? `<p class="aiNoteInline">${chart.note}</p>` : ""}
    </article>
  `;
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
  return `<div class="rowActions">${actions.map((action) => `<button class="button subtle" ${action.attrs || ""}>${action.label}</button>`).join("")}</div>`;
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
  return `<div class="miniChart">${items.map((item) => {
    const label = item.label ?? item[0];
    const value = item.value ?? item[1];
    const status = item.status || "neutral";
    return `<div class="status-${status}"><span>${label}</span><i><b style="width:${Math.max(8, (Number(value) || 1) / max * 100)}%"></b></i><strong>${value}</strong></div>`;
  }).join("")}</div>`;
}

function funnel(items) {
  const first = Number(items[0]?.value ?? items[0]?.[1] ?? 1) || 1;
  return `<div class="funnelSteps">${items.map((item) => {
    const label = item.label ?? item[0];
    const value = item.value ?? item[1];
    const status = item.status || getConversionStatus((Number(value) / first) * 100);
    return `<button class="funnelStep status-${status}" data-open-list="${item.target || `Кандидаты:${label}`}"><div><span>${label}</span><b>${value}</b></div><i><em style="width:${Math.max(8, Math.min(100, (Number(value) / first) * 100))}%"></em></i></button>`;
  }).join("")}</div>`;
}
