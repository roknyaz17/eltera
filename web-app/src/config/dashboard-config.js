export const periodOptions = ["Сегодня", "7 дней", "14 дней", "30 дней", "90 дней", "Весь период", "Произвольный период"];

const svg = {
  dashboard: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9"/><rect x="8" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9"/><rect x="1" y="8" width="5" height="5" rx="1.2" fill="currentColor" opacity=".5"/><rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" opacity=".5"/></svg>`,
  candidates: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" fill="currentColor" opacity=".9"/><path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".7"/></svg>`,
  employees: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2" fill="currentColor" opacity=".9"/><circle cx="10" cy="4" r="2" fill="currentColor" opacity=".6"/><path d="M1 12c0-2.2 1.79-4 4-4s4 1.8 4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".8"/><path d="M10 8c1.66 0 3 1.34 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".5"/></svg>`,
  vacancies: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3" width="11" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".8"/><path d="M5 3V2a2 2 0 0 1 4 0v1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".7"/><line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></svg>`,
  assessments: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".8"/><line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".7"/><line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".5"/><line x1="4.5" y1="10" x2="7.5" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".4"/></svg>`,
  constructor: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L8.5 5H12L9.2 7.3l1 3.7L7 9l-3.2 2 1-3.7L2 5h3.5L7 1.5z" fill="currentColor" opacity=".85"/></svg>`,
  links: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 8.5L8.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/><path d="M8.5 5.5l1.5-1.5a2.12 2.12 0 0 1 3 3L11.5 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".8"/><path d="M5.5 8.5L4 10a2.12 2.12 0 0 1-3-3L2.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".6"/></svg>`,
  reports: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".8"/><path d="M5 9.5V7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/><path d="M7 9.5V5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".7"/><path d="M9 9.5V6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".5"/></svg>`,
  adaptation: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".7"/><path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".9"/></svg>`,
  "360": `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" fill="currentColor" opacity=".9"/><circle cx="7" cy="2" r="1.2" fill="currentColor" opacity=".7"/><circle cx="7" cy="12" r="1.2" fill="currentColor" opacity=".7"/><circle cx="2" cy="7" r="1.2" fill="currentColor" opacity=".7"/><circle cx="12" cy="7" r="1.2" fill="currentColor" opacity=".7"/></svg>`,
  performance: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,10 5,6 8,8 12,3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".9"/><circle cx="12" cy="3" r="1.5" fill="currentColor" opacity=".8"/></svg>`,
  tariffs: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".8"/><line x1="1.5" y1="5.5" x2="12.5" y2="5.5" stroke="currentColor" stroke-width="1.2" opacity=".6"/><circle cx="4.5" cy="9" r="1" fill="currentColor" opacity=".7"/></svg>`,
  referrals: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="3" cy="7" r="1.8" fill="currentColor" opacity=".7"/><circle cx="11" cy="3.5" r="1.8" fill="currentColor" opacity=".9"/><circle cx="11" cy="10.5" r="1.8" fill="currentColor" opacity=".6"/><line x1="4.7" y1="6.2" x2="9.4" y2="4.2" stroke="currentColor" stroke-width="1.2" opacity=".6"/><line x1="4.7" y1="7.8" x2="9.4" y2="9.8" stroke="currentColor" stroke-width="1.2" opacity=".5"/></svg>`,
  api: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 5L2 7l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".8"/><path d="M10 5l2 2-2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".8"/><line x1="8.5" y1="3" x2="5.5" y2="11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></svg>`,
  support: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".8"/><path d="M5.5 5.5a1.5 1.5 0 0 1 3 .5c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".9"/><circle cx="7" cy="10" r=".8" fill="currentColor" opacity=".9"/></svg>`,
  gratitude: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12S2 8.5 2 5.5a2.5 2.5 0 0 1 5-0c0-1.38 1.12-2.5 2.5-2.5S12 4.12 12 5.5C12 8.5 7 12 7 12z" fill="currentColor" opacity=".8"/></svg>`,
  settings: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".9"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".7"/></svg>`,
  structure: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="5" y="1" width="4" height="3" rx="1" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".9"/><rect x="1" y="10" width="4" height="3" rx="1" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".7"/><rect x="9" y="10" width="4" height="3" rx="1" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".7"/><line x1="7" y1="4" x2="7" y2="7" stroke="currentColor" stroke-width="1.2" opacity=".6"/><line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.2" opacity=".5"/><line x1="3" y1="7" x2="3" y2="10" stroke="currentColor" stroke-width="1.2" opacity=".6"/><line x1="11" y1="7" x2="11" y2="10" stroke="currentColor" stroke-width="1.2" opacity=".6"/></svg>`
};

export const navConfig = [
  { id: "dashboard", label: "Главная", icon: svg.dashboard, countKey: "", alertKey: "", group: "main" },
  { id: "candidates", label: "Кандидаты", icon: svg.candidates, countKey: "", alertKey: "", group: "main" },
  { id: "employees", label: "Сотрудники", icon: svg.employees, countKey: "", alertKey: "", group: "main" },
  { id: "vacancies", label: "Вакансии", icon: svg.vacancies, countKey: "", alertKey: "", group: "main" },
  { id: "structure", label: "Структура", icon: svg.structure, countKey: "", alertKey: "", group: "main" },
  { id: "assessments", label: "Профили", icon: svg.assessments, countKey: "", alertKey: "", group: "tools" },
  { id: "constructor", label: "Конструктор", icon: svg.constructor, countKey: "", alertKey: "", group: "tools" },
  { id: "links", label: "Оценки", icon: svg.links, countKey: "", alertKey: "", group: "tools" },
  { id: "reports", label: "Отчеты", icon: svg.reports, countKey: "", alertKey: "", group: "tools" },
  { id: "adaptation", label: "Адаптация", icon: svg.adaptation, countKey: "", alertKey: "", group: "analytics" },
  { id: "360", label: "Оценка 360", icon: svg["360"], countKey: "", alertKey: "", lockedOn: ["Start", "TalentCheck", "TalentPro"], group: "analytics" },
  { id: "performance", label: "Performance Review", icon: svg.performance, countKey: "", alertKey: "", group: "analytics" },
  { id: "tariffs", label: "Тарифы", icon: svg.tariffs, countKey: "", alertKey: "", group: "account" },
  { id: "referrals", label: "Реферальная", icon: svg.referrals, countKey: "", alertKey: "", group: "account" },
  { id: "api", label: "API-ключи", icon: svg.api, countKey: "", alertKey: "", group: "account", wip: true },
  { id: "support", label: "Поддержка", icon: svg.support, countKey: "", alertKey: "", group: "account" },
  { id: "gratitude", label: "Благодарности", icon: svg.gratitude, countKey: "", alertKey: "", group: "account" },
  { id: "settings", label: "Настройки", icon: svg.settings, countKey: "", alertKey: "", group: "account" }
];

export const metricThresholds = {
  conversion: { good: 75, medium: 45 },
  fit: { good: 80, medium: 60 },
  risk: { good: 30, medium: 60, inverse: true },
  vacancyHealth: { good: 70, medium: 40 }
};

export const pageFilterConfig = {
  dashboard: ["Период", "Все направления", "Статус", "Ответственный"],
  candidates: ["Период", "Вакансия", "Источник", "Статус", "Результат оценки", "Тип подбора", "Ответственный", "Город", "Соответствие", "Риск"],
  employees: ["Период", "Отдел", "Должность", "Руководитель", "Проект", "Тип сотрудника", "Риск", "Адаптация", "Performance Review", "360"],
  vacancies: ["Период", "Источник", "Статус", "Тип подбора", "Ответственный", "Город", "Конверсия", "Подходящие"],
  adaptation: ["Период", "Отдел", "Руководитель", "Этап адаптации", "Причина риска", "Статус"],
  "360": ["Период", "Руководитель", "Отдел", "Статус", "Расхождение", "Компетенция"],
  performance: ["Период", "Отдел", "Руководитель", "Сегмент 9-box", "Потенциал", "Результативность"],
  reports: ["Период", "Тип", "Статус", "Вакансия / отдел", "Ответственный"]
};
