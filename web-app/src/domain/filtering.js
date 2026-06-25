/**
 * Eltera — Filtering engine for dashboard pages.
 *
 * Раньше выбор в модалке «Фильтры» сохранялся в state.activeFilters, но НИКАК
 * не влиял на таблицы — фильтры были чисто декоративными, а варианты в модалке
 * были захардкоженным mock'ом, не связанным с реальными данными.
 *
 * Этот модуль связывает фильтры с данными по принципу «один экстрактор —
 * источник истины»: для каждой (страница, фильтр) задаётся функция extract(item),
 * возвращающая отображаемое значение (или null, если у записи его нет).
 *   • Варианты в модалке = уникальные extract(item) по реальным данным.
 *   • Применение фильтра = item проходит, если extract(item) === выбранному.
 * За счёт этого в модалке показываются только те фильтры и значения, которые
 * реально присутствуют в данных, и каждый выбор гарантированно что-то фильтрует.
 */
import { pageFilterConfig } from "../config/dashboard-config.js";

// Нормализация источника — совпадает с sourceTag() в таблицах (render.js).
function sourceLabel(source) {
  const s = String(source || "");
  if (/hh/i.test(s)) return "HeadHunter";
  if (/api/i.test(s)) return "API";
  if (/импорт/i.test(s)) return "Импорт";
  return "Ручная";
}

// Корзины по проценту — те же формулировки, что и варианты в модалке.
const resultBucket = (p) =>
  p == null ? null : p >= 80 ? "Высокий (80%+)" : p >= 60 ? "Средний (60-79%)" : "Низкий (<60%)";
const fitBucket = (p) =>
  p == null ? null : p >= 80 ? "Высокое (80%+)" : p >= 60 ? "Среднее (60-79%)" : "Низкое (<60%)";

const clean = (v) => (v && v !== "—" ? v : null);

// ── Экстракторы по типам записей ─────────────────────────────────────────────

// Кандидат (mapApiCandidate): vacancy, source, stage, assessed, result, person.
const candidateExtractors = {
  "Вакансия": (c) => clean(c.vacancy),
  "Источник": (c) => (c.source ? sourceLabel(c.source) : null),
  "Статус": (c) => clean(c.stage),
  "Результат оценки": (c) => (c.assessed ? resultBucket(c.result?.percent) : null),
  "Тип подбора": (c) => clean(c.selectionType),
  "Город": (c) => clean(c.person?.city),
  "Соответствие": (c) => (c.assessed ? fitBucket(c.result?.percent) : null),
  "Риск": (c) => (c.assessed ? (c.result?.redFlags ? "средний" : "низкий") : null),
};

// Сотрудник (mapApiEmployee): position, department, project, manager, fit, risk.
// «Тип сотрудника» повторяет логику колонки «Тип» в таблице сотрудников.
const employeeExtractors = {
  "Отдел": (e) => clean(e.department),
  "Должность": (e) => clean(e.position),
  "Руководитель": (e) => clean(e.manager),
  "Проект": (e) => clean(e.project),
  "Тип сотрудника": (e) =>
    String(e.position || "").includes("Руководитель")
      ? "руководитель"
      : (e.startDate || "") > "2026-03-01" ? "новый" : "офисный",
  "Риск": (e) => clean(e.turnoverRisk),
};

// Отчёт (reports API): respondent_type, percent, test_title.
const reportExtractors = {
  "Тип": (r) => (r.respondent_type === "employee" ? "Сотрудник" : "Кандидат"),
};

// Страница → набор экстракторов. Адаптация/360/Performance показывают таблицу
// сотрудников, поэтому используют экстракторы сотрудника (по доступным полям).
const PAGE_EXTRACTORS = {
  candidates: candidateExtractors,
  employees: employeeExtractors,
  adaptation: employeeExtractors,
  "360": employeeExtractors,
  performance: employeeExtractors,
  reports: reportExtractors,
};

// Данные, по которым строятся варианты фильтров для страницы.
export function pageItems(state, page) {
  switch (page) {
    case "candidates":
      return state.candidatesApi || [];
    case "employees":
    case "adaptation":
    case "360":
    case "performance":
      return state.employeesApi || [];
    case "reports":
      return state.reportsApi || [];
    default:
      return [];
  }
}

/**
 * Строит модель фильтров для страницы по реальным данным.
 * Возвращает { keys: [...], options: { key: [значения] } } — только те фильтры
 * из pageFilterConfig, для которых в данных есть хотя бы одно значение.
 */
export function filterModel(state, page) {
  const ex = PAGE_EXTRACTORS[page] || {};
  const items = pageItems(state, page);
  const configured = (pageFilterConfig[page] || []).filter((k) => k !== "Период" && ex[k]);
  const options = {};
  const keys = [];
  for (const key of configured) {
    const seen = new Set();
    for (const item of items) {
      const v = ex[key](item);
      if (v) seen.add(v);
    }
    if (seen.size) {
      options[key] = [...seen].sort((a, b) => String(a).localeCompare(String(b), "ru"));
      keys.push(key);
    }
  }
  return { keys, options };
}

/**
 * Применяет активные фильтры к списку записей страницы.
 * Запись проходит, если по каждому активному фильтру extract(item) === значению.
 */
export function applyFilters(page, items, active) {
  const ex = PAGE_EXTRACTORS[page] || {};
  const entries = Object.entries(active || {}).filter(([k, v]) => v && ex[k]);
  if (!entries.length) return items;
  return (items || []).filter((item) => entries.every(([k, v]) => ex[k](item) === v));
}
