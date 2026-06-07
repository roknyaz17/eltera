export const periodOptions = ["Сегодня", "7 дней", "14 дней", "30 дней", "90 дней", "Весь период", "Произвольный период"];

export const navConfig = [
  { id: "dashboard", label: "Главная", icon: "⌂", countKey: "", alertKey: "" },
  { id: "candidates", label: "Кандидаты", icon: "◎", countKey: "", alertKey: "" },
  { id: "employees", label: "Сотрудники", icon: "◉", countKey: "", alertKey: "" },
  { id: "vacancies", label: "Вакансии", icon: "▣", countKey: "", alertKey: "" },
  { id: "assessments", label: "Профили", icon: "◫", countKey: "", alertKey: "" },
  { id: "constructor", label: "Конструктор", icon: "✦", countKey: "", alertKey: "" },
  { id: "links", label: "Оценки", icon: "↗", countKey: "", alertKey: "" },
  { id: "reports", label: "Отчеты", icon: "▤", countKey: "", alertKey: "" },
  { id: "adaptation", label: "Адаптация", icon: "◌", countKey: "", alertKey: "" },
  { id: "360", label: "Оценка 360", icon: "◎", countKey: "", alertKey: "", lockedOn: ["Start", "TalentCheck", "TalentPro"] },
  { id: "performance", label: "Performance Review", icon: "◇", countKey: "", alertKey: "" },
  { id: "tariffs", label: "Тарифы", icon: "₽", countKey: "", alertKey: "" },
  { id: "referrals", label: "Реферальная программа", icon: "↔", countKey: "", alertKey: "" },
  { id: "api", label: "API-ключи", icon: "{ }", countKey: "", alertKey: "" },
  { id: "support", label: "Поддержка", icon: "?", countKey: "", alertKey: "" },
  { id: "gratitude", label: "Благодарности", icon: "✧", countKey: "", alertKey: "" },
  { id: "settings", label: "Настройки", icon: "⚙", countKey: "", alertKey: "" }
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
