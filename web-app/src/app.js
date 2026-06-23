import { runPageAnimations } from "./ui/animations.js";
import { initWizardController } from "./controllers/wizard.js";
import { initFiltersController } from "./controllers/filters.js";
import { initAuthController, getDevLibrary } from "./controllers/auth.js";
import { initAiController } from "./controllers/ai.js";
import {
  commonCompetencies,
  professionalCompetencies,
  professions,
  questions
} from "./data/assessment-library.js";
import { buildAssessment, calculateResult } from "./domain/scoring.js";
import {
  fetchCandidates,
  fetchCandidateStats,
  fetchCandidateHeatmap,
  createCandidate,
  convertCandidateToEmployee,
  createEmployee,
  startAdaptation,
  assistantChat,
  fetchTaxonomy,
  getTokens,
  authLogout,
  recordCandidateResult,
  createLink,
  fetchLinks,
  fetchReports,
  fetchAssessmentForm,
  submitAssessment,
  updateCandidate,
  candidatePdfUrl,
  fetchCandidateAnswers,
  fetchCandidate,
  fetchEmployees,
  fetchEmployeeStats,
  fetchEmployee,
  fetchEmployeeAssessments,
  fetchEmployeeSessionAnswers,
  fetchEmployee360,
  fetchAdaptationCycles,
  fetchAdaptationAlerts,
  runAdaptationDue,
  sendSupportTicket,
  importEmployees,
  importCandidates,
  fetchOverview,
  fetchNotifications,
  markNotificationsRead,
  importLibrary,
  fetchHhStatus,
  fetchHhVacancies,
  hhDisconnect,
  hhConnectUrl,
  recordEmployeeResult,
  fetchOrgTree,
  addStructureMember,
  fetchTests,
  fetchTest,
  createTest,
  addQuestion,
  deleteQuestion,
  deleteTest,
  fetchCompetencies,
  fetchCompetency,
  createCompetency,
  updateCompetency,
  deleteCompetency,
  addCompetencyQuestion,
  deleteCompetencyQuestion,
  addProfileCompetency,
  removeProfileCompetency
} from "./data/api.js";
import {
  renderAppShell,
  renderAdaptation,
  renderApiKeys,
  renderAssessments,
  renderCandidateAssessment,
  renderCandidateThanks,
  renderCandidates,
  renderConstructor,
  renderDashboard,
  renderOverview,
  renderEmployees,
  renderGratitude,
  renderLanding,
  renderLinks,
  renderLogin,
  renderPeople,
  renderReferrals,
  renderReport,
  renderReports,
  renderSettings,
  renderSupport,
  renderDevPortalLock,
  renderDevPortal,
  renderTariffs,
  renderThreeSixty,
  renderPerformance,
  renderStructure,
  renderVacancies,
  ASSISTANT_GREETING
} from "./ui/render.js";

const app = document.querySelector("#app");
const storageKey = "eltera-mvp-state-v3";

const tariffs = [
  {
    tag: "Base",
    name: "TalentCheck",
    price: "4 900 ₽ / месяц",
    description: "Базовый тариф для индивидуальной проверки кандидатов и сотрудников.",
    cta: "Выбрать тариф",
    features: ["Индивидуальные оценки", "Базовые отчеты", "PDF-отчет", "AI-рекомендация: VPR / ePR"],
    locked: ["Сравнение кандидатов", "Групповые оценки", "360", "API"]
  },
  {
    tag: "Pro",
    name: "TalentPro",
    price: "12 900 ₽ / месяц",
    description: "Расширенные отчеты, сравнение кандидатов и командная аналитика.",
    cta: "Подключить",
    features: ["Все из TalentCheck", "Сравнение кандидатов", "Расширенные отчеты", "Групповые оценки", "Больше профилей"],
    locked: ["360", "Assessment", "Полный AI-ассистент", "API-интеграции"],
    highlight: true
  },
  {
    tag: "Studio",
    name: "TalentStudio",
    price: "29 900 ₽ / месяц",
    description: "Максимальный тариф для командной оценки, 360, AI и интеграций.",
    cta: "Выбрать Studio",
    features: ["Все из TalentPro", "Оценка 360", "Assessment в разработке", "AI-ассистент", "API и webhooks", "Брендинг"],
    locked: []
  }
];

const dashboardFilters = ["Кандидаты", "Сотрудники", "Групповые оценки", "Оценка 360", "Адаптация", "Performance Review", "Все данные"];

const competencyTitleById = {
  ...Object.fromEntries(commonCompetencies.map((competency) => [competency.id, competency.title])),
  ...professionalCompetencies
};

let state = loadState();
// Аутентификация — источник истины это наличие токенов в localStorage.
state.authenticated = !!getTokens();
// Данные кандидатов всегда загружаем заново с бэкенда (не из localStorage).
state.candidatesStatus = "idle";
state.candidatesApi = null;
state.candidateStats = null;
state.candidateHeatmap = null;
state.kebabMenu = null;
state.answersData = null;
state.answersList = null;
state.cardData = null;
state.employeesStatus = "idle";
state.employeesApi = null;
state.employeeStats = null;
state.structureStatus = "idle";
state.orgTree = null;
state.testsApi = null;
state.constructorStatus = "idle";
state.constructorTests = null;
state.constructorTest = null;
state.linksStatus = "idle";
state.linksApi = null;
state.assistant = { open: false, messages: [], busy: false, greetingAnimated: false };
// Библиотека тестов (Инструменты → Профили): серверные фильтры по секции/категории/уровню.
state.taxonomy = null;
state.taxonomyLoading = false;
state.library = { section: "candidate", category: null, level: null, q: "", items: null, loading: false };
state.reportsStatus = "idle";
state.reportsApi = null;
if (!state.linksFilter) state.linksFilter = "all"; // all | Кандидат | Сотрудник
if (!state.company.planPrice || !state.company.planLimit) {
  state.company.tariff = "Start";
  state.company.planPrice = 990;
  state.company.planLimit = 20;
  state.company.assessmentPrice = 49.5;
  saveState();
}
if (!state.period) {
  state.period = "30 дней";
  saveState();
}

function defaultState() {
  const firstLink = createLinkObject({ professionId: "recruiter", recipientType: "Кандидат", email: "demo@eltera.ai", forcedToken: "demo-link" });
  return {
    authenticated: false,
    route: "landing",
    view: "dashboard",
    theme: "dark",
    period: "30 дней",
    dashboardFilter: "Кандидаты",
    drilldownStage: "",
    reportId: "",
    modal: null,
    company: {
      name: "Eltera Demo Company",
      tariff: "Start",
      tariffUntil: "30.07.2026",
      planPrice: 990,
      planLimit: 20,
      balance: 20,
      assessmentPrice: 49.5,
      reportEmail: "hr@eltera.ai",
      inn: "7700000000",
      kpp: "770001001",
      site: "https://eltera.ai",
      phone: "+7 495 000-00-00",
      contactLastName: "Князев",
      contactFirstName: "Роман",
      contactPatronymic: "",
      contactPhone: "+7 900 000-00-00",
      contactEmail: "roman@eltera.ai",
      legalAddress: "Москва, ул. Примерная, 1",
      actualAddress: "Москва, офис 12"
    },
    referrals: {
      invited: 8,
      paid: 5,
      totalPayments: 238400,
      accrued: 23840,
      available: 4950,
      spent: 6000,
      withdrawn: 8400,
      operations: [
        ["Север IT", "29 900 ₽", "+2 990 ₽", "начислен"],
        ["HR Project", "12 900 ₽", "+1 290 ₽", "начислен"],
        ["Оценки за бонусы", "100 оценок", "-4 950 ₽", "списано"]
      ],
      withdrawals: []
    },
    links: [firstLink],
    sessions: seedSessions(),
    vacancies: seedVacancies(),
    employees: seedEmployees(),
    departments: seedDepartments(),
    candidate: {
      token: "",
      answers: {}
    },
    employeePhotos: {},
    aiChat: []
  };
}

function seedSessions() {
  return [
    demoSession("Анна Соколова", "Кандидат", "sales_manager", 88, "completed", "Интервью", "hh.ru", "Менеджер по продажам", "Точечный подбор"),
    demoSession("Игорь Петров", "Кандидат", "recruiter", 76, "completed", "Подходит", "SuperJob", "Менеджер по подбору персонала", "Офисные позиции"),
    demoSession("Мария Кузнецова", "Сотрудник", "coordinator", 64, "completed", "В зоне риска", "Внутренняя оценка", "Офис-менеджер", "Офисные позиции"),
    demoSession("Дмитрий Орлов", "Кандидат", "call_center", 49, "completed", "Не подходит", "hh.ru", "Оператор call-центра", "Массовый подбор")
  ];
}

function demoSession(fullName, assessmentType, professionId, percent, status, stage, source, vacancy, selectionType) {
  const profession = professions.find((item) => item.id === professionId) || professions[0];
  const maxScore = 100;
  const score = percent;
  const redFlags = percent < 55 ? 2 : percent < 70 ? 1 : 0;
  return {
    id: `demo-${fullName.replace(/\s+/g, "-").toLowerCase()}`,
    linkId: "",
    token: "",
    professionId,
    professionTitle: profession.title,
    vacancy,
    source,
    selectionType,
    stage,
    person: {
      fullName,
      phone: "+7 900 000-00-00",
      email: `${fullName.split(" ")[0].toLowerCase()}@example.com`,
      city: "Москва",
      assessmentType
    },
    answers: {},
    result: {
      score,
      maxScore,
      percent,
      redFlags,
      unanswered: [],
      recommendation: percent >= 82 ? "Рекомендован" : percent >= 68 ? "Можно приглашать, нужна проверка" : percent >= 52 ? "Резерв / нужна стажировка" : "Не рекомендован",
      competencyScores: {
        "Ответственность": { score: Math.round(percent * .9), maxScore },
        "Коммуникация": { score: percent, maxScore },
        "Профессиональные навыки": { score: Math.min(100, percent + 8), maxScore },
        "Достоверность": { score: Math.max(45, 96 - redFlags * 12), maxScore }
      }
    },
    status,
    completedAt: new Date(Date.now() - Math.round(Math.random() * 9) * 86400000).toISOString()
  };
}

function seedVacancies() {
  return [
    {
      id: "vac-hh-349012",
      title: "Менеджер по продажам",
      externalId: "hh_349012",
      source: "hh.ru",
      url: "https://hh.ru/vacancy/349012",
      employer: "Eltera Demo Company",
      city: "Москва",
      salary: "120 000 - 180 000 ₽",
      selectionType: "Точечный подбор",
      status: "Активна",
      responses: 86,
      assessments: 31,
      fit: 12,
      conversion: "39%",
      profile: "Менеджер по продажам",
      recommendation: "Сократить первичный скрининг и отправлять оценку в первые 15 минут после отклика.",
      publishedAt: "2026-06-04"
    },
    {
      id: "vac-manual-01",
      title: "HR-рекрутер",
      externalId: "manual_001",
      source: "ручная",
      url: "",
      employer: "Eltera Demo Company",
      city: "Санкт-Петербург",
      salary: "90 000 - 130 000 ₽",
      selectionType: "Офисные позиции",
      status: "Активна",
      responses: 42,
      assessments: 18,
      fit: 9,
      conversion: "50%",
      profile: "Менеджер по подбору персонала",
      recommendation: "Добавить кейс по продаже вакансии и контролю выхода.",
      publishedAt: "2026-06-02"
    },
    {
      id: "vac-api-77",
      title: "Frontend-разработчик",
      externalId: "api_77",
      source: "JSON API",
      url: "",
      employer: "Eltera Demo Company",
      city: "Удаленно",
      salary: "180 000 - 260 000 ₽",
      selectionType: "IT",
      status: "Черновик",
      responses: 19,
      assessments: 6,
      fit: 3,
      conversion: "50%",
      profile: "IT-специалист",
      recommendation: "Подключить профиль с практическим кейсом и шкалой самостоятельности.",
      publishedAt: "2026-06-05"
    }
  ];
}

function seedEmployees() {
  return [
    ["Олег Власов", "Руководитель отдела продаж", "Отдел продаж", "Проект A", "Иван Петров", "2024-09-14", 72, "средний", "есть признаки"],
    ["Мария Кузнецова", "Координатор", "Операционный отдел", "Back office", "Анна Сергеева", "2025-11-10", 64, "повышенный", "выгорание"],
    ["Сергей Никитин", "Оператор call-центра", "Контакт-центр", "Линия 1", "Ольга Смирнова", "2026-05-20", 81, "низкий", "нет"],
    ["Елена Морозова", "Бухгалтер", "Финансы", "Главный офис", "Наталья Орлова", "2023-04-03", 78, "низкий", "нет"]
  ].map(([fullName, position, department, project, manager, startDate, fit, turnoverRisk, burnout]) => ({
    id: `emp-${fullName.replace(/\s+/g, "-").toLowerCase()}`,
    fullName,
    position,
    department,
    project,
    manager,
    startDate,
    fit,
    turnoverRisk,
    burnout,
    satisfaction: Math.max(52, fit - 6),
    recommendation: fit < 70 ? "Нужен ИПР и разговор с руководителем" : "Поддерживать текущий план развития"
  }));
}

function seedDepartments() {
  return [
    { name: "Отдел продаж", head: "Иван Петров", employees: 18, risk: 3 },
    { name: "Операционный отдел", head: "Анна Сергеева", employees: 12, risk: 2 },
    { name: "Контакт-центр", head: "Ольга Смирнова", employees: 34, risk: 7 },
    { name: "Финансы", head: "Наталья Орлова", employees: 6, risk: 1 }
  ];
}

function createLinkObject({ professionId, recipientType, email = "", forcedToken, firstName = "", lastName = "", patronymic = "", phone = "", position = "", company = "", department = "", vacancy = "", project = "" }) {
  const profession = professions.find((item) => item.id === professionId) || professions[0];
  return {
    id: `link-${Date.now()}-${Math.round(Math.random() * 9999)}`,
    token: forcedToken || Math.random().toString(36).slice(2, 10),
    professionId,
    professionTitle: profession.title,
    recipientType,
    assessmentType: recipientType,
    firstName,
    lastName,
    patronymic,
    fullName: [lastName, firstName, patronymic].filter(Boolean).join(" "),
    phone,
    email,
    position,
    company,
    department,
    vacancy,
    project,
    status: "pending",
    history: [["создана", new Date().toISOString()]],
    warning: !email && !phone ? "Не указан email или телефон. Ссылка создана, но не будет автоматически отправлена." : "",
    createdAt: new Date().toISOString()
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    return saved ? mergeState(defaultState(), saved) : defaultState();
  } catch {
    return defaultState();
  }
}

function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    company: { ...base.company, ...saved.company },
    referrals: { ...base.referrals, ...saved.referrals },
    employeePhotos: { ...(base.employeePhotos || {}), ...(saved.employeePhotos || {}) }
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function currentRoute() {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/app/report/")) return { route: "app", view: "report", reportId: hash.replace("#/app/report/", "") };
  if (hash.startsWith("#/app/")) {
    let rest = hash.replace("#/app/", "") || "dashboard";
    let query = "";
    const qi = rest.indexOf("?");
    if (qi >= 0) { query = rest.slice(qi + 1); rest = rest.slice(0, qi); }
    return { route: "app", view: rest || "dashboard", query };
  }
  if (hash.startsWith("#/assess/")) return { route: "assess", token: hash.replace("#/assess/", "") };
  if (hash === "#/login") return { route: "login" };
  if (hash === "#/thanks") return { route: "thanks" };
  if (hash === "#/dev") return { route: "dev" };
  return { route: "landing" };
}

function setHash(hash) {
  location.hash = hash;
}

function professionById(id) {
  return professions.find((profession) => profession.id === id) || professions[0];
}

function questionsForProfession(professionId) {
  return buildAssessment(professionById(professionId), questions);
}

// --- Загрузка кандидатов с бэкенда ---

const STAGE_LABELS = {
  new: "Новый",
  assessment_sent: "Оценка отправлена",
  in_progress: "Проходит оценку",
  interview: "Интервью",
  fit: "Подходит",
  conditional: "Условно подходит",
  not_fit: "Не подходит",
  accepted: "Принят",
  stuck: "Завис"
};

// Приводим кандидата из API к форме, которую ожидает рендер таблицы/карточек.
function mapApiCandidate(item) {
  const a = item.assessment;
  const passed = a && ["submitted", "scored", "reviewed"].includes(a.status);
  return {
    id: item.id,
    assessed: Boolean(passed), // есть завершённая оценка → показываем %/риск, иначе «Не оценён»
    vacancy: item.vacancy_title || "—",
    source: item.source || "—",
    selectionType: item.selection_type || "",
    stage: STAGE_LABELS[item.stage] || item.stage,
    status: passed ? "completed" : "sent",
    // Оценка реально отправлена, если есть привязанная сессия оценки
    // или кандидат уже сошёл с этапа «Новый» (ему создали ссылку-приглашение).
    assessmentSent: Boolean(a) || (Boolean(item.stage) && item.stage !== "new"),
    person: {
      fullName: item.full_name,
      assessmentType: "Кандидат",
      city: item.city || "",
      email: item.email || "",
      phone: item.phone || ""
    },
    result: {
      percent: a ? a.percent : 0,
      redFlags: a ? a.red_flags : 0,
      recommendation: a ? a.recommendation_text || "" : ""
    },
    completedAt: (a && (a.submitted_at || a.scored_at)) || item.created_at
  };
}

async function loadCandidatesFromApi() {
  state.candidatesStatus = "loading";
  try {
    // Список и статистика — обязательны для вкладки.
    const [list, stats] = await Promise.all([fetchCandidates(), fetchCandidateStats()]);
    state.candidatesApi = (list.items || []).map(mapApiCandidate);
    state.candidateStats = stats;
    state.candidatesStatus = "ready";
    // Тепловая карта — необязательна: её сбой не ломает вкладку.
    try {
      state.candidateHeatmap = await fetchCandidateHeatmap();
    } catch (heatmapError) {
      console.warn("Тепловая карта недоступна:", heatmapError);
      state.candidateHeatmap = null;
    }
  } catch (error) {
    console.error("Не удалось загрузить кандидатов с бэкенда:", error);
    state.candidatesApi = null;
    state.candidateStats = null;
    state.candidateHeatmap = null;
    state.candidatesStatus = "error";
  }
  // Данные изменились — разрешаем красивую анимацию на этом рендере.
  state._animateOnce = true;
  render();
}

// --- Сотрудники и структура ---

const RISK_LABELS = { low: "низкий", medium: "средний", high: "повышенный" };

function mapApiEmployee(e) {
  return {
    id: e.id,
    fullName: e.full_name,
    position: e.position || "—",
    department: e.department || "—",
    project: e.project || "—",
    manager: e.manager || "—",
    startDate: e.start_date || "",
    fit: e.fit ?? null, // null = «не оценён» (нет профильной оценки)
    // «none»/пусто = риск ещё не оценивался → показываем «—», не «низкий».
    turnoverRisk: (!e.turnover_risk || e.turnover_risk === "none") ? "—" : (RISK_LABELS[e.turnover_risk] || e.turnover_risk),
    burnout: e.burnout || "—",
    satisfaction: e.satisfaction ?? 0,
    recommendation: e.recommendation || ""
  };
}

async function loadEmployeesFromApi() {
  state.employeesStatus = "loading";
  try {
    const [list, stats] = await Promise.all([fetchEmployees(), fetchEmployeeStats()]);
    state.employeesApi = (list.items || []).map(mapApiEmployee);
    state.employeeStats = stats;
    state.employeesStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить сотрудников:", error);
    state.employeesApi = null;
    state.employeeStats = null;
    state.employeesStatus = "error";
  }
  state._animateOnce = true;
  render();
}

async function loadNotifications() {
  if (state.notifStatus === "loading") return;
  state.notifStatus = "loading";
  try {
    const data = await fetchNotifications();
    state.notifications = data.items || [];
    state.notifUnread = data.unread || 0;
    state.notifStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить уведомления:", error);
    state.notifStatus = "error";
  }
  render();
}

async function loadHhStatus() {
  if (state.hhStatusLoading) return;
  state.hhStatusLoading = true;
  try {
    state.hhStatus = await fetchHhStatus();
    if (state.hhStatus.connected && !state.hhVacancies && state.hhVacanciesStatus !== "loading") {
      loadHhVacancies();
    }
  } catch (error) {
    console.warn("Не удалось получить статус hh.ru:", error);
    state.hhStatus = { configured: false, connected: false };
  }
  state.hhStatusLoading = false;
  render();
}

async function loadHhVacancies() {
  state.hhVacanciesStatus = "loading";
  try {
    const data = await fetchHhVacancies();
    state.hhVacancies = data.items || [];
    state.hhVacanciesStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить вакансии hh.ru:", error);
    state.hhVacancies = [];
    state.hhVacanciesStatus = "error";
  }
  render();
}

async function loadOverview() {
  state.overviewStatus = "loading";
  try {
    state.overview = await fetchOverview();
    state.overviewStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить сводку Главной:", error);
    state.overview = null;
    state.overviewStatus = "error";
  }
  render();
}

async function loadStructureFromApi() {
  state.structureStatus = "loading";
  try {
    state.orgTree = await fetchOrgTree();
    state.structureStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить структуру:", error);
    state.orgTree = null;
    state.structureStatus = "error";
  }
  render();
}

// Импорт базы компетенций/вопросов/профилей из Excel.
async function runLibraryImport() {
  const fileInput = document.querySelector("[data-import-file]");
  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    state.modal = { type: "import-library", status: "idle", error: "Сначала выберите Excel-файл." };
    render();
    return;
  }
  const file = fileInput.files[0];
  state.modal = { type: "import-library", status: "importing", error: null };
  render();
  try {
    const result = await importLibrary(file);
    state.modal = { type: "import-library", status: "done", result };
    // Сбрасываем кэш конструктора и тестов — новые профили сразу видны.
    state.constructorStatus = "idle";
    state.testsApi = null;
    render();
  } catch (error) {
    console.warn("Импорт базы не удался:", error);
    state.modal = { type: "import-library", status: "idle", error: error.message || "Не удалось импортировать файл." };
    render();
  }
}

// Импорт из Excel (сотрудники/кандидаты): файл → сводка → обновление списка.
async function runImport(kind) {
  const modalType = kind === "candidates" ? "import-candidates" : "import-employees";
  const importFn = kind === "candidates" ? importCandidates : importEmployees;
  const fileInput = document.querySelector("[data-import-file]");
  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    state.modal = { type: modalType, status: "idle", error: "Сначала выберите Excel-файл." };
    render();
    return;
  }
  const file = fileInput.files[0];
  state.modal = { type: modalType, status: "importing", error: null };
  render();
  try {
    const result = await importFn(file);
    state.modal = { type: modalType, status: "done", result };
    // Сбрасываем кэш, чтобы новые записи сразу появились в списке.
    if (kind === "candidates") {
      state.candidatesStatus = "idle";
      loadCandidatesFromApi();
    } else {
      state.employeesStatus = "idle";
      state.structureStatus = "idle";
      loadEmployeesFromApi();
    }
    render();
  } catch (error) {
    console.warn("Импорт не удался:", error);
    state.modal = { type: modalType, status: "idle", error: error.message || "Не удалось импортировать файл." };
    render();
  }
}

async function loadTests() {
  try {
    state.testsApi = await fetchTests();
    render();
  } catch (error) {
    console.warn("Не удалось загрузить тесты:", error);
  }
}

// --- Библиотека тестов (серверные фильтры) ---
async function loadTaxonomy() {
  state.taxonomyLoading = true;
  try {
    state.taxonomy = await fetchTaxonomy();
  } catch (error) {
    console.warn("Не удалось загрузить таксономию:", error);
    state.taxonomy = { directions: [], universal: [], levels: [] };
  }
  state.taxonomyLoading = false;
  render();
}

async function loadLibrary() {
  const lib = state.library;
  lib.loading = true;
  try {
    lib.items = await fetchTests({
      target_type: lib.section,
      q: lib.q || undefined,
      category: lib.category || undefined,
      level: lib.level || undefined,
      limit: 60,
    });
  } catch (error) {
    console.warn("Не удалось загрузить библиотеку:", error);
    lib.items = [];
  }
  lib.loading = false;
  render();
}

// --- Оценочные ссылки (вкладка «Оценки») ---

const linkStatusMap = {
  pending: "pending", sent: "sent", opened: "opened",
  in_progress: "started", completed: "completed",
  cancelled: "cancelled", expired: "expired"
};

function mapApiLink(row) {
  const recipient = row.recipient_type === "employee" ? "Сотрудник" : "Кандидат";
  return {
    token: row.token,
    apiToken: row.token,
    fullName: row.full_name || "",
    recipientType: recipient,
    professionTitle: row.test_title || "Оценка",
    email: row.email || "",
    phone: row.phone || "",
    status: linkStatusMap[row.status] || row.status,
    percent: row.percent,
    createdAt: row.created_at,
    subjectPersonId: row.subject_person_id || null,
    raterRole: row.rater_role || null,
    fromApi: true
  };
}

async function loadLinksFromApi() {
  state.linksStatus = "loading";
  try {
    const rows = await fetchLinks();
    state.linksApi = rows.map(mapApiLink);
    state.linksStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить оценки:", error);
    state.linksApi = null;
    state.linksStatus = "error";
  }
  render();
}

async function loadAdaptationCycles() {
  state.adaptationStatus = "loading";
  try {
    const [cycles, alerts] = await Promise.all([fetchAdaptationCycles(), fetchAdaptationAlerts()]);
    state.adaptationCycles = cycles.items || [];
    state.adaptationStandalone = cycles.standalone || [];
    state.adaptationAlerts = alerts.items || [];
    state.adaptationStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить циклы адаптации:", error);
    state.adaptationCycles = null;
    state.adaptationAlerts = null;
    state.adaptationStatus = "error";
  }
  render();
}

async function runAdaptationTick() {
  try {
    await runAdaptationDue();
  } catch (error) {
    console.warn("Не удалось обработать рассылку адаптации:", error);
  }
  state.adaptationStatus = "idle";
  await loadAdaptationCycles();
}

async function load360Report(personId) {
  state.threeSixtySubject = personId;
  state.threeSixtyReport = null;
  render();
  try {
    const data = await fetchEmployee360(personId);
    if (state.threeSixtySubject === personId) state.threeSixtyReport = data;
  } catch (error) {
    console.warn("Не удалось загрузить 360-отчёт:", error);
    state.threeSixtyReport = { error: true };
  }
  render();
}

async function loadReportsFromApi() {
  state.reportsStatus = "loading";
  try {
    const data = await fetchReports();
    state.reportsApi = data.items || [];
    state.reportsStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить отчёты:", error);
    state.reportsApi = null;
    state.reportsStatus = "error";
  }
  render();
}

// --- Конструктор тестов ---

const CONSTRUCTOR_PROFILES_LIMIT = 50;

async function loadConstructorTests(q) {
  const query = q !== undefined ? q : (state.constructorProfileQuery || "");
  state.constructorProfileQuery = query;
  state.constructorStatus = "loading";
  try {
    state.constructorTests = await fetchTests({ q: query, limit: CONSTRUCTOR_PROFILES_LIMIT });
    state.constructorStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить тесты:", error);
    state.constructorTests = null;
    state.constructorStatus = "error";
  }
  render();
}

// Поиск кандидатских профилей для модалки «Добавить кандидата» (серверный, лимит 50).
async function loadCandProfiles(q) {
  state.candProfileQuery = q || "";
  try {
    state.candProfileResults = await fetchTests({ q: state.candProfileQuery, target_type: "candidate", limit: 50 });
  } catch (error) {
    console.warn("Не удалось загрузить профили:", error);
    state.candProfileResults = [];
  }
  render();
}

async function selectConstructorTest(testId) {
  try {
    state.constructorTest = await fetchTest(testId);
  } catch (error) {
    console.warn("Не удалось загрузить тест:", error);
    state.constructorTest = null;
  }
  render();
}

async function createConstructorTest(payload) {
  try {
    const test = await createTest(payload);
    state.constructorTest = test;
    state.modal = null;
    await loadConstructorTests();
  } catch (error) {
    console.warn("Не удалось создать тест:", error);
  }
}

async function addConstructorQuestion(testId, payload) {
  try {
    state.constructorTest = await addQuestion(testId, payload);
    state.testsApi = null; // счётчики/список тестов обновим
    state.modal = null;
    await loadConstructorTests();
  } catch (error) {
    console.warn("Не удалось добавить вопрос:", error);
  }
}

async function deleteConstructorQuestion(testId, qvId) {
  try {
    state.constructorTest = await deleteQuestion(testId, qvId);
    await loadConstructorTests();
  } catch (error) {
    console.warn("Не удалось удалить вопрос:", error);
  }
}

async function deleteConstructorTest(testId) {
  try {
    await deleteTest(testId);
    if (state.constructorTest && state.constructorTest.id === testId) state.constructorTest = null;
    await loadConstructorTests();
  } catch (error) {
    console.warn("Не удалось удалить тест:", error);
  }
}

// ── Конструктор: библиотека компетенций ──
async function loadConstructorCompetencies() {
  state.constructorCompsStatus = "loading";
  try {
    state.constructorComps = await fetchCompetencies();
    state.constructorCompsStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить компетенции:", error);
    state.constructorComps = null;
    state.constructorCompsStatus = "error";
  }
  render();
}

async function selectConstructorCompetency(compId) {
  try {
    state.constructorComp = await fetchCompetency(compId);
  } catch (error) {
    console.warn("Не удалось загрузить компетенцию:", error);
    state.constructorComp = null;
  }
  render();
}

async function createConstructorCompetency(payload) {
  try {
    state.constructorComp = await createCompetency(payload);
    state.modal = null;
    await loadConstructorCompetencies();
  } catch (error) {
    console.warn("Не удалось создать компетенцию:", error);
  }
}

async function addConstructorCompQuestion(compId, payload) {
  try {
    state.constructorComp = await addCompetencyQuestion(compId, payload);
    state.modal = null;
    state.testsApi = null;
    await loadConstructorCompetencies();
  } catch (error) {
    console.warn("Не удалось добавить вопрос в компетенцию:", error);
  }
}

async function deleteConstructorCompQuestion(compId, qvId) {
  try {
    state.constructorComp = await deleteCompetencyQuestion(compId, qvId);
    await loadConstructorCompetencies();
  } catch (error) {
    console.warn("Не удалось удалить вопрос:", error);
  }
}

async function deleteConstructorCompetency(compId) {
  try {
    await deleteCompetency(compId);
    if (state.constructorComp && state.constructorComp.id === compId) state.constructorComp = null;
    await loadConstructorCompetencies();
  } catch (error) {
    console.warn("Не удалось удалить компетенцию:", error);
  }
}

async function addProfileCompetencyFlow(testId, compId) {
  try {
    state.constructorTest = await addProfileCompetency(testId, compId);
    state.modal = null;
    state.testsApi = null;
    await loadConstructorTests();
  } catch (error) {
    console.warn("Не удалось добавить компетенцию в профиль:", error);
  }
}

async function removeProfileCompetencyFlow(testId, compId) {
  try {
    state.constructorTest = await removeProfileCompetency(testId, compId);
    state.testsApi = null;
    await loadConstructorTests();
  } catch (error) {
    console.warn("Не удалось убрать компетенцию из профиля:", error);
  }
}

function render() {
  const route = currentRoute();
  state.route = route.route;
  if (route.view && route.view !== state.view) {
    // Закрываем любое открытое модальное окно при переходе между страницами —
    // иначе оно «переезжает» на новую вкладку и всплывает при входе.
    if (state.modal) state.modal = null;
    // При входе на «Адаптацию» перезапрашиваем циклы — бэкенд при чтении сам
    // подтягивает свежие прохождения, поэтому данные всегда актуальны.
    if (route.view === "adaptation") state.adaptationStatus = "idle";
    // На Главной показываем самое свежее: сводка пересчитывается при каждом входе.
    if (route.view === "dashboard") state.overviewStatus = "idle";
    state.view = route.view;
  } else if (route.view) {
    state.view = route.view;
  }
  if (route.reportId) state.reportId = route.reportId;

  if (route.route === "dev") {
    document.body.className = "devBody";
    const devAuth = sessionStorage.getItem("eltera_dev_auth");
    if (!devAuth) {
      app.innerHTML = renderDevPortalLock();
    } else {
      app.innerHTML = renderDevPortal(getDevLibrary());
    }
    return;
  }

  if (route.route === "landing") {
    document.body.className = "landingBody";
    app.innerHTML = renderLanding(tariffs);
    return;
  }

  if (route.route === "login") {
    document.body.className = "landingBody";
    app.innerHTML = renderLogin();
    return;
  }

  if (route.route === "thanks") {
    document.body.className = "candidateBody";
    app.innerHTML = renderCandidateThanks();
    return;
  }

  if (route.route === "assess") {
    document.body.className = "candidateBody";
    const link = state.links.find((item) => item.token === route.token && item.status !== "cancelled" && item.status !== "expired");
    state.candidate.token = route.token;
    // Токен бэка: либо apiToken локальной ссылки, либо сам token (ссылка из вкладки «Оценки»).
    const apiToken = (link && link.apiToken) || (link ? null : route.token);
    const isMockLink = link && !link.apiToken && link.professionId;
    if (apiToken && !isMockLink) {
      state.candidate.apiToken = apiToken;
      if (state.candidate.formToken !== apiToken) {
        // Новый тест — сбрасываем прогресс прохождения.
        state.candidate.formToken = apiToken;
        state.candidate.form = null;
        state.candidate.formError = null;
        state.candidate.answers = {};
        state.candidate.stage = "intro";
        state.candidate.qIndex = 0;
        state.candidate.deadlineTs = 0;
        state.candidate.name = null;
        state.candidate.email = null;
        loadAssessmentForm(apiToken);
      }
      if (!state.candidate.stage) state.candidate.stage = "intro";
      if (!state.candidate.answers) state.candidate.answers = {};
      if (link && link.status === "pending") link.status = "opened";
      const headLink = link || { recipientType: "Кандидат", token: route.token, apiToken, fullName: "", history: [] };
      app.innerHTML = renderCandidateAssessment(headLink, null, null, null, competencyTitleById, state.candidate.form, state.candidate.formError, state.candidate);
      // Таймер обратного отсчёта работает только на этапе вопросов.
      if (state.candidate.stage === "questions") ensureAssessTimer();
      else stopAssessTimer();
      saveState();
      return;
    }
    // Fallback: локальные mock-вопросы (демо-ссылка, офлайн).
    state.candidate.apiToken = null;
    const profession = link ? professionById(link.professionId) : professions[0];
    const assessmentQuestions = link ? questionsForProfession(link.professionId) : [];
    if (link && link.status === "pending") link.status = "opened";
    app.innerHTML = renderCandidateAssessment(link, profession, assessmentQuestions, state.candidate.answers, competencyTitleById);
    saveState();
    return;
  }

  if (!state.authenticated) {
    setHash("#/login");
    return;
  }

  document.body.className = state.theme === "light" ? "appBody light" : "appBody dark";
  let content = "";

  // Возврат из OAuth hh.ru: показываем тост и обновляем статус (одноразово).
  if (route.query && (route.query.includes("hh=connected") || route.query.includes("hh=error"))) {
    const ok = route.query.includes("hh=connected");
    state.hhStatus = null; state.hhVacancies = null; state.hhVacanciesStatus = null;
    const t = document.createElement("div");
    t.className = `elt-toast elt-toast-${ok ? "success" : "error"}`;
    t.textContent = ok ? "hh.ru подключён ✓" : "Не удалось подключить hh.ru";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
    history.replaceState(null, "", "#/app/vacancies");
  }

  // Уведомления — подгружаем один раз при входе в приложение.
  // (loadNotifications сам выставит notifStatus="loading"; не делаем это здесь,
  // иначе сработает его же guard от повторных загрузок.)
  if (!state.notifStatus) loadNotifications();

  if (state.view === "dashboard") {
    if (!state.overviewStatus || state.overviewStatus === "idle") {
      state.overviewStatus = "idle";
      loadOverview();
    }
    content = renderOverview(state);
  }
  if (state.view === "candidates") {
    // Подтягиваем данные с бэкенда при первом открытии вкладки.
    if (!state.candidatesStatus || state.candidatesStatus === "idle") {
      state.candidatesStatus = "idle";
      loadCandidatesFromApi();
    }
    content = renderCandidates(state);
  }
  if (state.view === "employees") {
    if (!state.employeesStatus || state.employeesStatus === "idle") {
      state.employeesStatus = "idle";
      loadEmployeesFromApi();
    }
    content = renderEmployees(state);
  }
  if (state.view === "structure") {
    if (!state.structureStatus || state.structureStatus === "idle") {
      state.structureStatus = "idle";
      loadStructureFromApi();
    }
    // Подтягиваем сотрудников — для статусов «Активен / Новый» в списке структуры.
    if (!state.employeesStatus || state.employeesStatus === "idle") {
      state.employeesStatus = "idle";
      loadEmployeesFromApi();
    }
    content = renderStructure(state);
  }
  if (state.view === "constructor") {
    if (!state.constructorStatus || state.constructorStatus === "idle") {
      state.constructorStatus = "idle";
      loadConstructorTests();
    }
    // Библиотека компетенций — грузим один раз (нужна в обоих режимах).
    if (!state.constructorComps && state.constructorCompsStatus !== "loading") {
      loadConstructorCompetencies();
    }
    content = renderConstructor(state);
  }
  if (state.view === "people") content = renderPeople(state);
  if (state.view === "vacancies") {
    if (!state.hhStatus && !state.hhStatusLoading) loadHhStatus();
    content = renderVacancies(state);
  }
  if (state.view === "assessments") {
    if (!state.taxonomy && !state.taxonomyLoading) loadTaxonomy();
    if (state.library.items === null && !state.library.loading) loadLibrary();
    content = renderAssessments(state);
  }
  if (state.view === "adaptation" || state.view === "360") {
    if (!state.employeesStatus || state.employeesStatus === "idle") {
      state.employeesStatus = "idle";
      loadEmployeesFromApi();
    }
    if (!state.linksStatus || state.linksStatus === "idle") {
      state.linksStatus = "idle";
      loadLinksFromApi();
    }
    if (state.view === "adaptation" && (!state.adaptationStatus || state.adaptationStatus === "idle")) {
      state.adaptationStatus = "idle";
      loadAdaptationCycles();
    }
    content = state.view === "adaptation" ? renderAdaptation(state) : renderThreeSixty(state);
  }
  if (state.view === "performance") {
    if (!state.employeesStatus || state.employeesStatus === "idle") {
      state.employeesStatus = "idle";
      loadEmployeesFromApi();
    }
    if (!state.linksStatus || state.linksStatus === "idle") {
      state.linksStatus = "idle";
      loadLinksFromApi();
    }
    content = renderPerformance(state);
  }
  if (state.view === "links") {
    if (!state.linksStatus || state.linksStatus === "idle") {
      state.linksStatus = "idle";
      loadLinksFromApi();
    }
    if (!state.testsApi) loadTests();
    content = renderLinks(state, professions);
  }
  if (state.view === "reports") {
    if (!state.reportsStatus || state.reportsStatus === "idle") {
      state.reportsStatus = "idle";
      loadReportsFromApi();
    }
    content = renderReports(state);
  }
  if (state.view === "report") content = renderReport(state, state.sessions.find((item) => item.id === state.reportId));
  if (state.view === "tariffs") content = renderTariffs(state, tariffs);
  if (state.view === "referrals") content = renderReferrals(state);
  if (state.view === "api") content = renderApiKeys(state);
  if (state.view === "support") content = renderSupport(state);
  if (state.view === "gratitude") content = renderGratitude(state);
  if (state.view === "settings") content = renderSettings(state);

  const newHTML = renderAppShell(state, content || renderDashboard(state, dashboardFilters));

  // Анимации (count-up, полосы) запускаем только при смене вкладки или когда
  // данные реально изменились (флаг _animateOnce). Обычные перерисовки
  // (открытие модалок, меню и т.п.) DOM не «прыгает».
  const viewChanged = state._prevView !== state.view;
  const shouldAnimate = viewChanged || state._animateOnce === true;

  // Функция обновления DOM через morphdom или innerHTML
  function applyDOM() {
    if (typeof morphdom !== 'undefined') {
      const tmp = document.createElement('div');
      tmp.innerHTML = newHTML;
      morphdom(app, tmp, {
        childrenOnly: true,
        // Не трогаем текстовое поле, которое пользователь редактирует прямо
        // сейчас, — иначе сбрасывается значение и курсор прыгает в начало.
        onBeforeElUpdated(fromEl, toEl) {
          if (
            fromEl === document.activeElement &&
            (fromEl.tagName === "INPUT" || fromEl.tagName === "TEXTAREA") &&
            fromEl.type !== "checkbox" &&
            fromEl.type !== "radio"
          ) {
            return false;
          }
          return true;
        },
      });
    } else {
      app.innerHTML = newHTML;
    }
    if (shouldAnimate) {
      requestAnimationFrame(() => runPageAnimations(app));
    }
  }

  state._prevView = state.view;
  state._animateOnce = false;

  // View Transitions API — плавная смена страниц только при смене вкладки
  if (document.startViewTransition && viewChanged) {
    document.startViewTransition(applyDOM);
  } else {
    applyDOM();
  }
}

function createLinkFromForm(form) {
  const data = new FormData(form);
  const testId = String(data.get("professionId") || "");
  const link = createLinkObject({
    professionId: testId || "recruiter",
    recipientType: String(data.get("recipientType") || "Кандидат"),
    email: String(data.get("email") || ""),
    phone: String(data.get("phone") || ""),
    firstName: String(data.get("firstName") || ""),
    lastName: String(data.get("lastName") || ""),
    patronymic: String(data.get("patronymic") || ""),
    position: String(data.get("position") || ""),
    company: String(data.get("company") || state.company.name),
    department: String(data.get("department") || ""),
    vacancy: String(data.get("vacancy") || ""),
    project: String(data.get("project") || "")
  });
  // «Профиль оценки» — это реальный тест с бэкенда: ссылка пойдёт по его вопросам.
  const test = (state.testsApi || []).find((t) => t.id === testId);
  if (test) {
    link.apiTestId = test.id;
    link.professionTitle = test.title;
  }
  state.links.unshift(link);
  // Для кандидата заводим запись в бэкенде (появится во вкладке «Кандидаты»
  // как «оценка отправлена»), id сохраняем на ссылке для последующего результата.
  if (link.recipientType === "Кандидат" && (link.fullName || link.email)) {
    syncCreateCandidate(link);
  }
  if (link.recipientType === "Сотрудник" && link.fullName) {
    state.employees.unshift({
      id: `emp-${Date.now()}`,
      fullName: link.fullName,
      position: link.position || link.professionTitle,
      department: link.department || "Без отдела",
      project: link.project || "Общий контур",
      manager: "Не назначен",
      startDate: new Date().toISOString().slice(0, 10),
      fit: 0,
      turnoverRisk: "не оценен",
      burnout: "не оценен",
      satisfaction: 0,
      recommendation: "Оценка создана, результаты появятся после прохождения."
    });
  }
  if (state.company.balance > 0) state.company.balance -= 1;
  saveState();
  if (location.hash === "#/app/links") render();
  else setHash("#/app/links");
}

// Создаёт кандидата в бэкенде по данным ссылки, регистрирует ссылку-приглашение
// (для метрики «Оценка отправлена») и сохраняет id на ссылке.
// Кнопка «Добавить кандидата»: заводим кандидата и — если включён тумблер и есть
// профиль + email — сразу создаём ссылку-приглашение (письмо уходит кандидату).
async function addCandidateFromForm(formEl) {
  const fd = new FormData(formEl);
  const lastName = String(fd.get("lastName") || "").trim();
  const firstName = String(fd.get("firstName") || "").trim();
  const patronymic = String(fd.get("patronymic") || "").trim();
  const fullName = [lastName, firstName, patronymic].filter(Boolean).join(" ");
  const email = String(fd.get("email") || "").trim();
  const testId = String(fd.get("professionId") || "").trim();
  const sendNow = fd.get("sendNow") != null;
  if (!fullName) {
    alert("Укажите хотя бы фамилию или имя кандидата.");
    return;
  }
  // Отправляем оценку сразу только если включён тумблер, выбран профиль и есть email.
  const willSend = sendNow && Boolean(testId) && Boolean(email);
  if (sendNow && !willSend) {
    alert("Чтобы сразу отправить оценку, укажите профиль и email. Иначе снимите галочку — кандидат добавится без оценки.");
    return;
  }
  try {
    const created = await createCandidate({
      last_name: lastName || null,
      first_name: firstName || null,
      patronymic: patronymic || null,
      full_name: fullName,
      email: email || null,
      phone: String(fd.get("phone") || "").trim() || null,
      vacancy_title: String(fd.get("vacancy") || "").trim() || null,
      source: "Добавлен вручную",
      selection_type: "Точечный подбор",
      stage: willSend ? "assessment_sent" : "new"
    });
    if (willSend) {
      await createLink({ test_id: testId, person_id: created.id, recipient_type: "candidate" });
    }
    state.modal = null;
    state.candidatesStatus = "idle";
    await loadCandidatesFromApi();
    showToast(willSend ? "Кандидат добавлен, оценка отправлена" : "Кандидат добавлен");
  } catch (error) {
    console.warn("Не удалось добавить кандидата в бэкенде:", error);
    alert("Не удалось добавить кандидата. Попробуйте позже.");
  }
}

// Простое тост-уведомление (визуально совпадает с тостами мастера оценки).
// ─── ИИ-ассистент ─────────────────────────────────────────────────────────────
const ASSISTANT_VIEWS = new Set([
  "dashboard", "candidates", "employees", "structure", "constructor",
  "adaptation", "performance", "reports", "settings", "support"
]);

function scrollAssistant() {
  requestAnimationFrame(() => {
    const b = document.getElementById("elt-asst-body");
    if (b) b.scrollTop = b.scrollHeight;
  });
}

function toggleAssistant() {
  const a = state.assistant;
  a.open = !a.open;
  render();
  if (a.open) {
    scrollAssistant();
    if (!a.greetingAnimated) typeAssistantGreeting();
  }
}

// Печатающее приветствие (пишем прямо в DOM, без перерисовки — морфдом не мешает).
function typeAssistantGreeting() {
  const el = document.getElementById("elt-asst-greeting");
  if (!el || state.assistant.greetingAnimated) return;
  el.textContent = "";
  let i = 0;
  const tick = () => {
    if (!state.assistant.open) return;
    el.textContent = ASSISTANT_GREETING.slice(0, ++i);
    if (i < ASSISTANT_GREETING.length) setTimeout(tick, 28);
    else state.assistant.greetingAnimated = true;
  };
  setTimeout(tick, 250);
}

async function sendAssistant(text) {
  const a = state.assistant;
  const content = String(text || "").trim();
  if (!content || a.busy) return;
  a.greetingAnimated = true; // больше не анимируем приветствие
  a.messages.push({ role: "user", content });
  a.busy = true;
  render();
  scrollAssistant();
  try {
    const payload = a.messages.map((m) => ({ role: m.role, content: m.content }));
    const res = await assistantChat(payload);
    a.busy = false;
    const act = res.action || {};
    if (act.type === "add_candidate" || act.type === "add_employee") {
      a.messages.push({
        role: "assistant",
        content: res.reply || "Подтвердите добавление:",
        proposal: { entity: act.type === "add_candidate" ? "candidate" : "employee", params: act.params || {}, status: "pending" },
      });
    } else {
      a.messages.push({ role: "assistant", content: res.reply || "…" });
    }
    render();
    scrollAssistant();
    if (act.type === "navigate" && act.params && ASSISTANT_VIEWS.has(act.params.view)) {
      setHash(`#/app/${act.params.view}`);
    }
  } catch (error) {
    console.warn("Ассистент недоступен:", error);
    a.busy = false;
    a.messages.push({ role: "assistant", content: "Не удалось связаться с ассистентом. Попробуйте ещё раз." });
    render();
    scrollAssistant();
  }
}

// Разбивает «Фамилия Имя Отчество» на части (как в формах добавления).
function splitFullName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  return { last_name: parts[0] || null, first_name: parts[1] || null, patronymic: parts[2] || null };
}

async function confirmAssistantProposal(idx) {
  const m = (state.assistant.messages || [])[idx];
  if (!m || !m.proposal || !["pending", "error"].includes(m.proposal.status)) return;
  const p = m.proposal;
  const fn = splitFullName(p.params.full_name);
  p.status = "busy";
  render();
  try {
    if (p.entity === "candidate") {
      await createCandidate({
        last_name: fn.last_name, first_name: fn.first_name, patronymic: fn.patronymic,
        full_name: p.params.full_name, email: p.params.email || null, phone: p.params.phone || null,
        vacancy_title: p.params.vacancy_title || null, source: "ИИ-ассистент",
        selection_type: "Точечный подбор", stage: "new",
      });
      state.candidatesStatus = "idle";
    } else {
      await createEmployee({
        last_name: fn.last_name, first_name: fn.first_name, patronymic: fn.patronymic,
        full_name: p.params.full_name, position: p.params.position || null,
        department_name: p.params.department_name || null, manager_name: p.params.manager_name || null,
        project: p.params.project || null, start_date: p.params.start_date || null,
      });
      state.employeesStatus = "idle";
    }
    p.status = "done";
    const view = p.entity === "candidate" ? "candidates" : "employees";
    state.assistant.messages.push({
      role: "assistant",
      content: (p.entity === "candidate" ? "Кандидат" : "Сотрудник") + ` «${p.params.full_name}» добавлен ✓`,
    });
    render();
    scrollAssistant();
  } catch (error) {
    console.warn("Не удалось добавить через ассистента:", error);
    p.status = "error";
    render();
    scrollAssistant();
  }
}

function cancelAssistantProposal(idx) {
  const m = (state.assistant.messages || [])[idx];
  if (m && m.proposal && m.proposal.status === "pending") {
    m.proposal.status = "cancelled";
    render();
  }
}

function showToast(text, type = "success") {
  const t = document.createElement("div");
  t.className = `elt-toast elt-toast-${type}`;
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// «Отправить оценку» существующему кандидату из меню «три точки»: создаём
// ссылку-приглашение в бэкенде, помечаем кандидата как «Оценка отправлена»
// (если он ещё «Новый») и обновляем список — без ухода с вкладки.
async function sendAssessmentToCandidate(personId, testId) {
  if (!personId) return;
  const cand = (state.candidatesApi || []).find((c) => c.id === personId);
  const isNew = cand && cand.stage === STAGE_LABELS.new;
  try {
    await createLink({
      test_id: testId || null,
      person_id: personId,
      recipient_type: "candidate"
    });
    if (isNew) {
      try {
        await updateCandidate(personId, { stage: "assessment_sent" });
      } catch (stageError) {
        console.warn("Не удалось обновить этап кандидата:", stageError);
      }
    }
    state.modal = null;
    state.candidatesStatus = "idle";
    await loadCandidatesFromApi();
    showToast("Оценка отправлена");
  } catch (error) {
    console.warn("Не удалось отправить оценку:", error);
    state.modal = null;
    render();
    showToast("Не удалось отправить оценку", "info");
  }
}

// «Добавить сотрудника»: создаём в бэкенде (Person + employee_profile); если
// включён тумблер — сразу запускаем цикл адаптации (отправляется первый опрос).
async function addEmployeeFromForm(formEl) {
  const fd = new FormData(formEl);
  const firstName = String(fd.get("firstName") || "").trim();
  const lastName = String(fd.get("lastName") || "").trim();
  const fullName = [lastName, firstName].filter(Boolean).join(" ");
  if (!fullName) {
    alert("Укажите имя и фамилию сотрудника.");
    return;
  }
  const startDate = String(fd.get("start_date") || "").trim();
  const sendAdaptation = fd.get("sendAdaptation") != null;
  try {
    const created = await createEmployee({
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName,
      position: String(fd.get("position") || "").trim() || null,
      department_name: String(fd.get("department") || "").trim() || null,
      manager_name: String(fd.get("manager") || "").trim() || null,
      project: String(fd.get("project") || "").trim() || null,
      start_date: startDate || null
    });
    if (sendAdaptation && created?.id) {
      // Цикл стартует от даты выхода (или сегодня) и сразу шлёт первый опрос.
      await startAdaptation([created.id]);
    }
    state.modal = null;
    state.employeesStatus = "idle";
    state.adaptationStatus = "idle";
    state.linksApi = null; // появится новая ссылка-опрос
    await loadEmployeesFromApi();
    showToast(sendAdaptation ? "Сотрудник добавлен, адаптация запущена" : "Сотрудник добавлен");
  } catch (error) {
    console.warn("Не удалось добавить сотрудника:", error);
    showToast("Не удалось добавить сотрудника", "info");
  }
}

// «Перевести в сотрудники» из меню «три точки»: транзакция на бэке (создаёт
// сотрудника, удаляет кандидата), затем обновляем обе вкладки.
async function convertCandidateFromForm(formEl) {
  const personId = state.modal?.personId;
  if (!personId) return;
  const fd = new FormData(formEl);
  const position = String(fd.get("position") || "").trim();
  const startDate = String(fd.get("start_date") || "").trim();
  if (!position || !startDate) {
    alert("Укажите должность и дату выхода.");
    return;
  }
  try {
    await convertCandidateToEmployee(personId, {
      position,
      start_date: startDate,
      department_name: String(fd.get("department_name") || "").trim() || null,
      manager_name: String(fd.get("manager_name") || "").trim() || null,
      project: String(fd.get("project") || "").trim() || null,
      employment_type: String(fd.get("employment_type") || "").trim() || null,
      carry_fit: true
    });
    state.modal = null;
    state.candidatesStatus = "idle";
    state.employeesStatus = "idle";
    await loadCandidatesFromApi();
    showToast("Кандидат переведён в сотрудники");
  } catch (error) {
    console.warn("Не удалось перевести кандидата:", error);
    showToast("Не удалось перевести кандидата", "info");
  }
}

async function syncCreateCandidate(link) {
  try {
    const created = await createCandidate({
      last_name: link.lastName || null,
      first_name: link.firstName || null,
      patronymic: link.patronymic || null,
      full_name: link.fullName || null,
      email: link.email || null,
      phone: link.phone || null,
      source: "Оценочная ссылка",
      selection_type: "Точечный подбор",
      stage: "assessment_sent",
      vacancy_title: link.vacancy || link.professionTitle || null
    });
    link.apiPersonId = created.id;
    // Регистрируем ссылку-приглашение в бэкенде (считается в «Оценка отправлена»)
    // и сохраняем токен — прохождение пойдёт по вопросам теста с бэка.
    try {
      const resp = await createLink({
        test_id: link.apiTestId || null,
        person_id: created.id,
        recipient_type: "candidate"
      });
      link.apiToken = resp.token;
      link.apiTestId = resp.test_id;
    } catch (linkError) {
      console.warn("Не удалось зарегистрировать ссылку в бэкенде:", linkError);
    }
    state.candidatesStatus = "idle";
    state.linksStatus = "idle";
    saveState();
    if (state.view === "links") render();
  } catch (error) {
    console.warn("Не удалось создать кандидата в бэкенде:", error);
  }
}

// Отправляет результат прохождения в бэкенд (создаёт кандидата, если его ещё нет).
async function syncCandidateResult(link, person, result, answers = []) {
  const payload = {
    percent: result.percent,
    score: result.score,
    max_score: result.maxScore,
    red_flags: result.redFlags,
    recommendation_text: result.recommendation || null,
    competencies: Object.entries(result.competencyScores || {}).map(([name, v]) => ({
      name,
      score: v.score,
      max_score: v.maxScore
    })),
    answers
  };
  try {
    let personId = link.apiPersonId;
    if (!personId) {
      const created = await createCandidate({
        full_name: person.fullName || "Без имени",
        email: person.email || null,
        phone: person.phone || null,
        city: person.city || null,
        source: "Оценочная ссылка",
        selection_type: "Точечный подбор",
        stage: "assessment_sent",
        vacancy_title: link.vacancy || link.professionTitle || null
      });
      personId = created.id;
      link.apiPersonId = personId;
    }
    await recordCandidateResult(personId, payload);
    // Сбросим кэш вкладки, чтобы при следующем заходе подтянулись свежие данные.
    state.candidatesStatus = "idle";
    saveState();
  } catch (error) {
    console.warn("Не удалось отправить результат в бэкенд:", error);
  }
}

// Загрузка карточки с бэкенда: пробуем кандидата, затем сотрудника.
async function loadCandidateCard(personId) {
  let data = null;
  try {
    data = { ...(await fetchCandidate(personId)), _kind: "candidate" };
  } catch (candidateError) {
    try {
      data = { ...(await fetchEmployee(personId)), _kind: "employee" };
      // Все оценки сотрудника по каждому тесту + средний балл.
      try { data.assessments = await fetchEmployeeAssessments(personId); }
      catch (e) { console.warn("Не удалось загрузить оценки сотрудника:", e); }
    } catch (employeeError) {
      console.warn("Не удалось загрузить карточку:", employeeError);
      data = { error: true };
    }
  }
  if (state.modal && state.modal.type === "card" && state.modal.id === personId) {
    state.cardData = data;
  }
  render();
}

// Поддержка: собрать форму и отправить обращение в Telegram (через бэкенд).
// Сообщение в Telegram различается по типу обращения (срочное/обычное/идея).
async function sendSupport() {
  const typeEl = document.querySelector("[data-support-type]");
  const subjEl = document.querySelector("[data-support-subject]");
  const descEl = document.querySelector("[data-support-description]");
  const nameEl = document.querySelector("[data-support-name]");
  const emailEl = document.querySelector("[data-support-email]");
  const statusEl = document.querySelector("[data-support-status]");
  const btn = document.querySelector('[data-action="support-send"]');
  const setStatus = (text, color) => { if (statusEl) { statusEl.textContent = text; statusEl.style.color = color || ""; } };

  const type = typeEl ? typeEl.value : "normal";
  const subject = subjEl ? subjEl.value.trim() : "";
  const description = descEl ? descEl.value.trim() : "";
  if (!subject && !description) {
    setStatus("Заполните тему или описание", "#E5484D");
    return;
  }
  if (btn) btn.disabled = true;
  setStatus("Отправляем…", "");
  try {
    const res = await sendSupportTicket({
      type, subject, description,
      from_name: nameEl ? nameEl.value || null : null,
      from_email: emailEl ? emailEl.value || null : null
    });
    if (res.sent) {
      setStatus("✓ Отправлено в Telegram", "#22C55E");
      if (subjEl) subjEl.value = "";
      if (descEl) descEl.value = "";
    } else if (res.ok) {
      // Принято на сервере, но бот не настроен (нет токена/chat_id).
      setStatus(res.detail || "Принято, но Telegram-бот не настроен", "#D9A441");
      if (subjEl) subjEl.value = "";
      if (descEl) descEl.value = "";
    } else {
      setStatus(res.detail || "Не удалось отправить", "#E5484D");
    }
  } catch (error) {
    console.warn("Не удалось отправить обращение:", error);
    setStatus("Ошибка сети — попробуйте позже", "#E5484D");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Модалка «Ответы»: сначала тянем список оценок человека (по тестам).
// Один тест — открываем сразу; несколько — показываем выбор; ноль — пусто.
async function loadAnswersFlow(personId) {
  let list = null;
  try {
    list = await fetchEmployeeAssessments(personId);
  } catch (error) {
    console.warn("Не удалось загрузить список оценок:", error);
  }
  if (!(state.modal && state.modal.type === "answers" && state.modal.id === personId)) return;
  state.answersList = list;
  if (list && list.count === 1) {
    selectAnswerSession(personId, list.items[0].session_id);
  } else {
    render();
  }
}

// Открыть ответы по конкретному этапу адаптации (прямой переход к сессии).
function openStageAnswers(personId, sessionId) {
  state.modal = { type: "answers", id: personId, sessionId };
  state.answersData = null;
  state.answersList = null; // без выбора теста — сразу нужная сессия
  render();
  selectAnswerSession(personId, sessionId);
}

// Загрузка ответов по выбранной оценке (сессии).
async function selectAnswerSession(personId, sessionId) {
  if (!(state.modal && state.modal.type === "answers")) return;
  state.modal = { ...state.modal, id: personId, sessionId };
  state.answersData = null;
  render();
  try {
    const data = await fetchEmployeeSessionAnswers(personId, sessionId);
    if (state.modal && state.modal.type === "answers" && state.modal.sessionId === sessionId) {
      state.answersData = data;
    }
  } catch (error) {
    console.warn("Не удалось загрузить ответы:", error);
    state.answersData = { error: true };
  }
  render();
}

// Смена этапа воронки кандидата через меню «три точки».
async function changeCandidateStage(personId, stage) {
  state.kebabMenu = null; // закрываем меню сразу
  render();
  if (!personId || !stage) return;
  try {
    await updateCandidate(personId, { stage });
    await loadCandidatesFromApi(); // перечитываем список + KPI и перерисовываем
  } catch (error) {
    console.warn("Не удалось изменить этап кандидата:", error);
  }
}

// Отправляет результат оценки сотрудника в бэкенд (обновляет fit на вкладке).
async function syncEmployeeResult(link, result, answers = []) {
  const payload = {
    percent: result.percent,
    score: result.score,
    max_score: result.maxScore,
    red_flags: result.redFlags,
    recommendation_text: result.recommendation || null,
    competencies: Object.entries(result.competencyScores || {}).map(([name, v]) => ({
      name, score: v.score, max_score: v.maxScore
    })),
    answers
  };
  try {
    await recordEmployeeResult(link.apiPersonId, payload);
    state.employeesStatus = "idle"; // перечитать список сотрудников
    saveState();
  } catch (error) {
    console.warn("Не удалось отправить результат сотрудника:", error);
  }
}

function quickCreateLink(professionId = "recruiter") {
  const link = createLinkObject({ professionId, recipientType: "Кандидат", email: "" });
  state.links.unshift(link);
  if (state.company.balance > 0) state.company.balance -= 1;
  saveState();
  if (location.hash === "#/app/links") render();
  else setHash("#/app/links");
}

// Загружает форму теста с бэка по токену ссылки (вопросы конкретного теста).
async function loadAssessmentForm(apiToken) {
  try {
    state.candidate.form = await fetchAssessmentForm(apiToken);
    state.candidate.formError = null;
  } catch (error) {
    console.warn("Не удалось загрузить тест с бэкенда:", error);
    state.candidate.form = null;
    state.candidate.formError = "Не удалось загрузить тест. Обновите страницу или попробуйте позже.";
  }
  render();
}

// ─── Таймер прохождения (обратный отсчёт) ────────────────────────────────────
let assessTimerId = null;
function ensureAssessTimer() {
  if (assessTimerId) return;
  assessTimerId = setInterval(() => {
    const remaining = Math.max(0, Math.floor(((state.candidate.deadlineTs || 0) - Date.now()) / 1000));
    const el = document.getElementById("assessTimer");
    if (el) {
      const m = String(Math.floor(remaining / 60)).padStart(2, "0");
      const s = String(remaining % 60).padStart(2, "0");
      const span = el.querySelector("span");
      if (span) span.textContent = `${m}:${s}`;
      el.classList.toggle("urgent", remaining <= 60);
    }
    if (remaining <= 0) {
      stopAssessTimer();
      finishAssessment(); // время вышло — отправляем что есть
    }
  }, 1000);
}
function stopAssessTimer() {
  if (assessTimerId) { clearInterval(assessTimerId); assessTimerId = null; }
}

// Завершение прохождения: отправляем накопленные ответы на бэк.
function finishAssessment() {
  stopAssessTimer();
  const link = state.links.find((item) => item.token === state.candidate.token) || null;
  submitBackendAssessment(link);
}

// Прохождение теста, заданного на бэке: собираем ответы из состояния и отправляем.
async function submitBackendAssessment(link) {
  const form = state.candidate.form;
  if (!form) return;
  const stored = state.candidate.answers || {};
  const answers = form.questions.map((q) => {
    const qid = q.question_version_id;
    const v = stored[qid];
    if (q.type === "single_choice") {
      return { question_version_id: qid, selected_option_ids: v ? [v] : [] };
    }
    if (q.type === "multiple_choice") {
      return { question_version_id: qid, selected_option_ids: Array.isArray(v) ? v : [] };
    }
    if (q.type === "scale") {
      return { question_version_id: qid, scale_value: (v !== undefined && v !== null && v !== "") ? Number(v) : null };
    }
    return { question_version_id: qid, answer_text: (typeof v === "string" && v.trim()) ? v : null };
  });
  const apiToken = state.candidate.apiToken || (link && link.apiToken);
  if (!apiToken) return;
  try {
    await submitAssessment(apiToken, { answers });
    if (link) {
      link.status = "completed";
      if (Array.isArray(link.history)) link.history.push(["завершена", new Date().toISOString()]);
    }
    // Бэк уже записал сессию и продвинул кандидата — обновим вкладки.
    state.candidatesStatus = "idle";
    state.employeesStatus = "idle";
    state.linksStatus = "idle";
  } catch (error) {
    console.warn("Не удалось отправить ответы на бэкенд:", error);
    alert("Не удалось отправить ответы. Попробуйте снова.");
    return;
  }
  state.candidate = { token: "", answers: {}, form: null, formToken: null, formError: null, apiToken: null, stage: "intro", qIndex: 0, deadlineTs: 0 };
  saveState();
  setHash("#/thanks");
}

function completeCandidateAssessment(form) {
  const token = state.candidate.token;
  const link = state.links.find((item) => item.token === token) || null;

  // Тест с бэка — отправляем ответы на сервер (он считает баллы и закрывает воронку).
  if (state.candidate.apiToken && state.candidate.form) {
    submitBackendAssessment(link);
    return;
  }
  if (!link) return;

  const data = new FormData(form);
  const person = {
    fullName: String(data.get("fullName") || link.fullName || ""),
    phone: String(data.get("phone") || link.phone || ""),
    email: String(data.get("email") || link.email || ""),
    city: String(data.get("city") || ""),
    assessmentType: link.recipientType || link.assessmentType
  };

  const assessmentQuestions = questionsForProfession(link.professionId);
  const result = calculateResult(assessmentQuestions, state.candidate.answers, competencyTitleById);
  // Снимок ответов кандидата (вопрос + выбранный вариант + балл) для вкладки «Ответы».
  const answersSnapshot = assessmentQuestions.map((q) => {
    const idx = state.candidate.answers[q.id];
    const opt = q.answers[idx];
    const maxScore = Math.max(...q.answers.map((a) => a.score));
    return {
      question: q.text,
      answer: opt ? opt.text : "— нет ответа —",
      score: opt ? opt.score : 0,
      max_score: maxScore,
      correct: opt ? opt.score === maxScore : false,
      red_flag: opt ? Boolean(opt.redFlag) : false
    };
  });
  const session = {
    id: `session-${Date.now()}`,
    linkId: link.id,
    token: link.token,
    professionId: link.professionId,
    professionTitle: link.professionTitle,
    vacancy: link.vacancy || link.professionTitle,
    source: "Оценочная ссылка",
    selectionType: link.recipientType === "Сотрудник" ? "Офисные позиции" : "Точечный подбор",
    stage: result.percent >= 82 ? "Подходит" : result.percent >= 68 ? "Интервью" : result.percent >= 52 ? "Резерв" : "Не подходит",
    person,
    answers: { ...state.candidate.answers },
    result,
    status: "completed",
    completedAt: new Date().toISOString()
  };

  link.status = "completed";
  link.history.push(["завершена", new Date().toISOString()]);
  state.sessions.unshift(session);
  // Синхронизируем результат с бэкендом по типу получателя.
  const recipient = link.recipientType || link.assessmentType;
  if (recipient === "Кандидат") {
    syncCandidateResult(link, person, result, answersSnapshot);
  } else if (recipient === "Сотрудник" && link.apiPersonId) {
    syncEmployeeResult(link, result, answersSnapshot);
  }
  state.candidate = { token: "", answers: {} };
  saveState();
  setHash("#/thanks");
}

function cancelLink(token) {
  const link = state.links.find((item) => item.token === token);
  if (!link || link.status === "completed" || link.status === "started") return;
  link.status = "cancelled";
  link.history.push(["отменена", new Date().toISOString()]);
  state.company.balance += 1;
  saveState();
  render();
}

function buyAssessments(count) {
  state.company.balance += count;
  saveState();
  render();
}

function spendBonuses(count) {
  const amount = Math.round(count * state.company.assessmentPrice);
  if (amount > state.referrals.available) return;
  state.referrals.available -= amount;
  state.referrals.spent += amount;
  state.company.balance += count;
  state.referrals.operations.unshift(["Докупить оценки", `${count} оценок`, `-${amount.toLocaleString("ru-RU")} ₽`, "списано"]);
  state.modal = null;
  saveState();
  render();
}

function createWithdrawal(form) {
  const data = new FormData(form);
  const amount = Number(data.get("amount") || 0);
  if (!amount || amount > state.referrals.available) return;
  state.referrals.available -= amount;
  state.referrals.withdrawals.unshift({
    amount,
    card: String(data.get("card") || ""),
    name: String(data.get("name") || ""),
    bank: String(data.get("bank") || ""),
    phone: String(data.get("phone") || ""),
    comment: String(data.get("comment") || ""),
    status: "на проверке"
  });
  state.referrals.operations.unshift(["Заявка на вывод", "карта", `-${amount.toLocaleString("ru-RU")} ₽`, "на проверке"]);
  state.modal = null;
  saveState();
  render();
}

document.addEventListener("click", (event) => {
  // ИИ-ассистент: открыть/закрыть и быстрые действия (чипы).
  if (event.target.closest("[data-assistant-toggle]")) { toggleAssistant(); return; }
  const chip = event.target.closest("[data-assistant-chip]");
  if (chip) { sendAssistant(chip.dataset.assistantChip); return; }

  // Выход из аккаунта.
  if (event.target.closest('[data-action="logout"]')) {
    authLogout().finally(() => {
      state.authenticated = false;
      state.user = null;
      setHash("#/login");
      render();
    });
    return;
  }

  // Библиотека тестов: секция / категория / уровень.
  const libSection = event.target.closest("[data-library-section]");
  if (libSection) {
    state.library.section = libSection.dataset.librarySection;
    state.library.category = null; state.library.level = null; state.library.q = "";
    state.library.items = null; render(); loadLibrary(); return;
  }
  const libCat = event.target.closest("[data-library-category]");
  if (libCat) {
    const v = libCat.dataset.libraryCategory || "";
    state.library.category = (!v || state.library.category === v) ? null : v;
    state.library.items = null; render(); loadLibrary(); return;
  }
  const libLvl = event.target.closest("[data-library-level]");
  if (libLvl) {
    const v = libLvl.dataset.libraryLevel || "";
    state.library.level = (!v || state.library.level === v) ? null : v;
    state.library.items = null; render(); loadLibrary(); return;
  }
  const confirmProp = event.target.closest("[data-assistant-confirm]");
  if (confirmProp) { confirmAssistantProposal(Number(confirmProp.dataset.assistantConfirm)); return; }
  const cancelProp = event.target.closest("[data-assistant-cancel]");
  if (cancelProp) { cancelAssistantProposal(Number(cancelProp.dataset.assistantCancel)); return; }

  const route = event.target.closest("[data-route]")?.dataset.route;
  if (route === "login") setHash("#/login");

  // Auth interactions handled by authController

  const view = event.target.closest("[data-view]")?.dataset.view;
  if (view) {
    window.scrollTo(0, 0);
    setHash(`#/app/${view}`);
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "toggle-theme") {
    state.theme = state.theme === "light" ? "dark" : "light";
    saveState();
    render();
  }

  // ── Центр уведомлений ──
  if (action === "toggle-notifications") {
    state.notifPanelOpen = !state.notifPanelOpen;
    render();
    if (state.notifPanelOpen) loadNotifications(); // обновляем при открытии
    return;
  }
  if (action === "close-notifications") {
    state.notifPanelOpen = false;
    render();
    return;
  }
  if (action === "notif-mark-all") {
    markNotificationsRead({ all: true })
      .then((data) => { state.notifications = data.items || []; state.notifUnread = data.unread || 0; render(); })
      .catch((e) => console.warn("mark-all failed", e));
    return;
  }
  const notifOpen = event.target.closest("[data-notif-open]");
  if (notifOpen) {
    const id = notifOpen.dataset.notifOpen;
    const view = notifOpen.dataset.notifView;
    state.notifPanelOpen = false;
    // Отмечаем прочитанным и переходим в нужный раздел.
    markNotificationsRead({ ids: [id] })
      .then((data) => { state.notifications = data.items || []; state.notifUnread = data.unread || 0; if (!view) render(); })
      .catch((e) => console.warn("mark-read failed", e));
    if (view) setHash(`#/app/${view}`);
    else render();
    return;
  }
  if (action === "create-link") {
    const professionId = event.target.closest("[data-profession]")?.dataset.profession || "recruiter";
    quickCreateLink(professionId);
  }
  if (action === "open-assess-wizard") {
    if (!state.testsApi) loadTests();
    if (!state.employeesApi && state.employeesStatus !== "loading") loadEmployeesFromApi();
    state.modal = { type: "assess-wizard", step: 1, scope: null, assessType: null, selected: [], dept: null, profId: null, deadline: "", searchQ: "" };
    render();
    return;
  }
  if (action === "add-candidate") {
    state.candProfileQuery = "";
    state.candProfileResults = null;
    state.candProfileSelId = null;
    state.candProfileSelTitle = null;
    state.modal = { type: "add-candidate" };
    render();
    loadCandProfiles("");
    return;
  }
  if (action === "open-create-test") {
    state.modal = { type: "create-test" };
    render();
    return;
  }
  if (action === "adapt-run-due") {
    runAdaptationTick();
    return;
  }
  if (action === "open-add-question") {
    if (!state.constructorTest) return;
    state.modal = { type: "add-question", testId: state.constructorTest.id };
    render();
    return;
  }

  // ── Конструктор: режимы и компетенции ──
  const ctrMode = event.target.closest("[data-constructor-mode]")?.dataset.constructorMode;
  if (ctrMode) {
    state.constructorMode = ctrMode;
    render();
    return;
  }
  // Профили (Инструменты → Профили): запустить оценку по готовому профилю.
  const launchProfile = event.target.closest("[data-launch-profile]")?.dataset.launchProfile;
  if (launchProfile) {
    state.modal = { type: "assess-wizard", step: 1, scope: null, assessType: "standard", selected: [], dept: null, profId: launchProfile, deadline: "", searchQ: "" };
    render();
    return;
  }
  // Профили: открыть профиль в Конструкторе для правки.
  const openProfCtr = event.target.closest("[data-open-profile-constructor]")?.dataset.openProfileConstructor;
  if (openProfCtr) {
    state.constructorMode = "profiles";
    selectConstructorTest(openProfCtr);
    setHash("#/app/constructor");
    return;
  }
  if (action === "open-create-competency") {
    state.modal = { type: "create-competency" };
    render();
    return;
  }
  if (action === "open-add-comp-question") {
    if (!state.constructorComp) return;
    state.modal = { type: "add-question", competencyId: state.constructorComp.id };
    render();
    return;
  }
  if (action === "open-add-profile-comp") {
    if (!state.constructorTest) return;
    state.modal = { type: "pick-competency", testId: state.constructorTest.id };
    render();
    return;
  }
  const selComp = event.target.closest("[data-select-competency]")?.dataset.selectCompetency;
  if (selComp) { selectConstructorCompetency(selComp); return; }
  const delComp = event.target.closest("[data-delete-competency]")?.dataset.deleteCompetency;
  if (delComp) { if (confirm("Удалить компетенцию со всеми вопросами? Она исчезнет из профилей.")) deleteConstructorCompetency(delComp); return; }
  const delCompQ = event.target.closest("[data-delete-comp-question]")?.dataset.deleteCompQuestion;
  if (delCompQ) { const [cid, qv] = delCompQ.split("|"); deleteConstructorCompQuestion(cid, qv); return; }
  const addProfComp = event.target.closest("[data-add-profile-comp]")?.dataset.addProfileComp;
  if (addProfComp) { const tid = event.target.closest("[data-add-profile-comp]").dataset.testId; addProfileCompetencyFlow(tid, addProfComp); return; }
  const rmProfComp = event.target.closest("[data-remove-profile-comp]")?.dataset.removeProfileComp;
  if (rmProfComp) { const tid = event.target.closest("[data-remove-profile-comp]").dataset.testId; removeProfileCompetencyFlow(tid, rmProfComp); return; }
  if (action === "top-up") {
    state.modal = { type: "sbp-payment", mode: "topup", pack: 20 };
    render();
  }
  if (action === "print-report") window.print();
  if (action === "add-structure-member") {
    // На вкладке «Сотрудники» оргструктура может быть ещё не загружена —
    // подтягиваем, чтобы в модалке были руководители и отделы.
    if (!state.orgTree) loadStructureFromApi();
    state.modal = { type: "add-structure-member" };
    render();
  }
  if (action === "import-employees") {
    state.modal = { type: "import-employees" };
    render();
  }
  if (action === "import-candidates") {
    state.modal = { type: "import-candidates" };
    render();
  }
  if (action === "run-employee-import") runImport("employees");
  if (action === "run-candidate-import") runImport("candidates");
  if (action === "open-import-library") {
    state.modal = { type: "import-library" };
    render();
  }
  if (action === "run-library-import") runLibraryImport();

  // ── HeadHunter ──
  if (action === "hh-connect") {
    // Переходим на backend, он редиректит на hh.ru OAuth.
    window.location.href = hhConnectUrl();
    return;
  }
  if (action === "hh-refresh") {
    state.hhVacancies = null;
    loadHhVacancies();
    return;
  }
  if (action === "hh-disconnect") {
    hhDisconnect()
      .then(() => { state.hhStatus = null; state.hhVacancies = null; state.hhVacanciesStatus = null; loadHhStatus(); })
      .catch((e) => console.warn("hh disconnect failed", e));
    return;
  }

  // Click on avatar circle — trigger hidden file input
  const avatarNodeId = event.target.closest("[data-oc-avatar]")?.dataset.ocAvatar;
  if (avatarNodeId) {
    // Find or create hidden input for this node
    let inp = document.querySelector(`[data-avatar-upload="${avatarNodeId}"]`);
    if (!inp) {
      inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/jpeg,image/png,image/webp";
      inp.style.display = "none";
      inp.dataset.avatarUpload = avatarNodeId;
      document.body.appendChild(inp);
      inp.addEventListener("change", handleAvatarUpload);
    }
    inp.click();
    return; // клик по аватарке — только загрузка фото, карточку не открываем
  }

  // Клик по карточке/строке в оргструктуре (но не по аватарке) — открыть карточку сотрудника.
  const ocSelectId = event.target.closest("[data-oc-select]")?.dataset.ocSelect;
  if (ocSelectId) {
    state.modal = { type: "card", id: ocSelectId };
    state.cardData = null;
    render();
    loadCandidateCard(ocSelectId);
    return;
  }

  // Структура: масштаб графа.
  const ocZoom = event.target.closest("[data-oc-zoom]")?.dataset.ocZoom;
  if (ocZoom) {
    const cur = state.structureZoom || 80;
    state.structureZoom = Math.max(50, Math.min(120, cur + (ocZoom === "in" ? 10 : -10)));
    render();
    return;
  }

  // Структура: развернуть/свернуть список сотрудников отдела.
  const ocDept = event.target.closest("[data-oc-dept-toggle]")?.dataset.ocDeptToggle;
  if (ocDept) {
    const set = new Set(state.structureExpandedDepts || []);
    if (set.has(ocDept)) set.delete(ocDept); else set.add(ocDept);
    state.structureExpandedDepts = [...set];
    render();
    return;
  }

  // Структура: показать все отделы / свернуть.
  if (action === "oc-show-all-depts") {
    state.structureAllDepts = !state.structureAllDepts;
    render();
    return;
  }

  // Поддержка: карточка-«быстрый выбор» проставляет тип обращения и фокусирует форму.
  const supportPick = event.target.closest("[data-support-pick]")?.dataset.supportPick;
  if (supportPick) {
    const sel = document.querySelector("[data-support-type]");
    if (sel) sel.value = supportPick;
    document.querySelector(".elt-support-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelector("[data-support-subject]")?.focus();
    return;
  }

  if (action === "support-send") { sendSupport(); return; }

  if (action === "copy-ref") navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/ref/roman123`);
  if (action === "open-bonus-modal") {
    state.modal = "spendBonuses";
    render();
  }
  if (action === "open-withdraw-modal") {
    state.modal = "withdraw";
    render();
  }
  if (action === "close-modal") {
    state.modal = null;
    render();
  }

  const stageAction = event.target.closest("[data-stage-action]");
  if (stageAction) {
    changeCandidateStage(stageAction.dataset.stageId, stageAction.dataset.stageAction);
    return;
  }

  // Закрытие поповера действий по клику на фон.
  if (event.target.closest("[data-kebab-close]")) {
    state.kebabMenu = null;
    render();
    return;
  }

  // «Отправить оценку» из меню «три точки» — открываем модалку выбора профиля.
  const sendAssessBtn = event.target.closest("[data-send-assessment-id]");
  if (sendAssessBtn) {
    const id = sendAssessBtn.dataset.sendAssessmentId;
    const cand = (state.candidatesApi || []).find((c) => c.id === id);
    state.kebabMenu = null;
    state.candProfileQuery = "";
    state.candProfileResults = null;
    state.candProfileSelId = null;
    state.candProfileSelTitle = null;
    state.modal = { type: "send-assessment", personId: id, fullName: cand ? (cand.person?.fullName || cand.full_name) : "" };
    render();
    loadCandProfiles("");
    return;
  }

  // «Перевести в сотрудники» из меню «три точки».
  const convertBtn = event.target.closest("[data-convert-id]");
  if (convertBtn) {
    const id = convertBtn.dataset.convertId;
    const cand = (state.candidatesApi || []).find((c) => c.id === id);
    state.kebabMenu = null;
    state.modal = { type: "convert-employee", personId: id, fullName: cand ? (cand.person?.fullName || cand.full_name) : "" };
    render();
    return;
  }

  // Открытие/закрытие меню «три точки» у кандидата.
  const kebabBtn = event.target.closest("[data-kebab-id]");
  if (kebabBtn) {
    const id = kebabBtn.dataset.kebabId;
    if (state.kebabMenu && state.kebabMenu.id === id) {
      state.kebabMenu = null;
    } else {
      const rect = kebabBtn.getBoundingClientRect();
      // y — верх кнопки: меню раскрывается вверх (см. transform в .elt-kebab-pop).
      state.kebabMenu = { id, x: rect.right, y: rect.top - 4 };
    }
    render();
    return;
  }

  // Конструктор тестов
  // Выбор/сброс кандидатского профиля в модалке «Добавить кандидата».
  const cpPick = event.target.closest("[data-candprofile-pick]");
  if (cpPick) {
    state.candProfileSelId = cpPick.dataset.candprofilePick;
    state.candProfileSelTitle = cpPick.dataset.candprofileTitle || "";
    render();
    return;
  }
  if (event.target.closest("[data-candprofile-clear]")) {
    state.candProfileSelId = null;
    state.candProfileSelTitle = null;
    render();
    return;
  }

  const selectTest = event.target.closest("[data-select-test]")?.dataset.selectTest;
  if (selectTest) { selectConstructorTest(selectTest); return; }
  const delTest = event.target.closest("[data-delete-test]")?.dataset.deleteTest;
  if (delTest) { deleteConstructorTest(delTest); return; }
  const delQ = event.target.closest("[data-delete-question]");
  if (delQ) { deleteConstructorQuestion(delQ.dataset.testId, delQ.dataset.deleteQuestion); return; }

  // PDF-отчёт по кандидату — открываем в новой вкладке (генерит бэкенд).
  const pdfBtn = event.target.closest("[data-pdf-id]");
  if (pdfBtn) {
    window.open(candidatePdfUrl(pdfBtn.dataset.pdfId), "_blank");
    return;
  }

  const openList = event.target.closest("[data-open-list]")?.dataset.openList;
  if (openList) {
    state.modal = { type: "list", target: openList };
    // Метрики про отправленные оценки/ссылки и опросы адаптации показывают
    // список ссылок-опросов — подгрузим их.
    if (/отправлен|ссыл|опрос/i.test(openList) && !state.linksApi) loadLinksFromApi();
    // «Активные циклы» адаптации — нужен список циклов (на Главной не загружен).
    if (/цикл/i.test(openList) && !state.adaptationCycles) loadAdaptationCycles();
    render();
  }

  const openCard = event.target.closest("[data-open-card]")?.dataset.openCard;
  if (openCard) {
    state.modal = { type: "card", id: openCard };
    state.cardData = null;
    render();
    // Кандидат (API) — грузим карточку с бэка; сотрудник (emp-) — из локального стейта.
    if (!openCard.startsWith("emp-")) loadCandidateCard(openCard);
  }

  const openAnswers = event.target.closest("[data-open-answers]")?.dataset.openAnswers;
  if (openAnswers) {
    state.modal = { type: "answers", id: openAnswers };
    state.answersData = null;
    state.answersList = null;
    render();
    loadAnswersFlow(openAnswers);
    return;
  }

  // Выбрать сотрудника для сводного 360-отчёта.
  // ВАЖНО: атрибут data-open360 без дефиса перед цифрой — иначе dataset-ключ
  // получается «open-360» (дефис перед цифрой не камелкейсится).
  const open360 = event.target.closest("[data-open360]")?.dataset.open360;
  if (open360) {
    load360Report(open360);
    return;
  }

  // Выбор конкретной оценки в модалке «Ответы»: data-answer-session="personId|sessionId"
  const answerSession = event.target.closest("[data-answer-session]")?.dataset.answerSession;
  if (answerSession) {
    const [pid, sid] = answerSession.split("|");
    selectAnswerSession(pid, sid);
    return;
  }

  // Ответы по этапу адаптации: data-open-stage-answers="personId|sessionId"
  const stageAnswers = event.target.closest("[data-open-stage-answers]")?.dataset.openStageAnswers;
  if (stageAnswers) {
    const [pid, sid] = stageAnswers.split("|");
    openStageAnswers(pid, sid);
    return;
  }

  // Назад к списку тестов в модалке «Ответы».
  if (event.target.closest("[data-answer-back]")) {
    state.modal = { ...state.modal, sessionId: null };
    state.answersData = null;
    render();
    return;
  }

  const openCompetency = event.target.closest("[data-open-competency]")?.dataset.openCompetency;
  if (openCompetency) {
    state.modal = { type: "competency", id: openCompetency };
    render();
  }

  // Фильтр профилей по типу (Кандидат / Сотрудник / Группа)
  const profileFilter = event.target.closest("[data-profile-filter]")?.dataset.profileFilter;
  if (profileFilter) {
    state.profileTypeFilter = profileFilter === 'all' ? null : profileFilter;
    render();
  }

  const openLocked = event.target.closest("[data-open-locked]")?.dataset.openLocked;
  if (openLocked) {
    state.modal = { type: "locked", message: openLocked };
    render();
  }

  if (event.target.closest("[data-open-tariff-picker]")) {
    state.modal = { type: "tariffs" };
    render();
  }

  // Открыть модальное окно СБП для тарифа
  const openSbpTariff = event.target.closest("[data-open-sbp]")?.dataset.openSbp;
  if (openSbpTariff) {
    const TARIFF_PRICES = { TalentCheck: 4900, TalentPro: 12900, TalentStudio: 29900 };
    const price = TARIFF_PRICES[openSbpTariff] || 990;
    state.modal = { type: "sbp-payment", tariffId: openSbpTariff, tariffName: openSbpTariff, price };
    render();
  }

  // Открыть модальное окно СБП для пополнения оценок
  const topupSbp = event.target.closest("[data-topup-sbp]")?.dataset.topupSbp;
  if (topupSbp) {
    const TOPUP_PRICES = { '20': 990, '100': 3900, '500': 14900 };
    const count = parseInt(topupSbp);
    const price = TOPUP_PRICES[topupSbp] || count * 49.5;
    state.modal = { type: "sbp-payment", assessments: count, price };
    render();
  }

  // Мок-подтверждение оплаты СБП
  const sbpAction = event.target.closest("[data-action]")?.dataset.action;
  if (sbpAction === "sbp-confirm") {
    const btn = event.target.closest("[data-action='sbp-confirm']");
    const tariffId = btn?.dataset.tariffId;
    const assessments = parseInt(btn?.dataset.assessments || 0);
    const statusEl = document.querySelector("[data-sbp-status]");
    if (statusEl) statusEl.textContent = "⏳ Обработка платежа...";
    setTimeout(() => {
      if (tariffId) {
        state.company.tariff = tariffId;
        const TARIFF_LIMITS = { TalentCheck: 100, TalentPro: 500, TalentStudio: 2000 };
        state.company.planLimit = TARIFF_LIMITS[tariffId] || 20;
      }
      if (assessments > 0) {
        state.company.assessmentsLeft = (state.company.assessmentsLeft || 0) + assessments;
      }
      state.modal = null;
      saveState();
      render();
      // Показываем toast-уведомление
      const toast = document.createElement("div");
      toast.className = "sbp-toast";
      toast.textContent = tariffId ? `✓ Тариф ${tariffId} активирован` : `✓ +${assessments} оценок добавлено`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    }, 1800);
  }

  if (sbpAction === "sbp-select-pack") {
    const pack = parseInt(event.target.closest("[data-pack]")?.dataset.pack || 20);
    state.modal = { ...state.modal, pack, mode: 'topup' };
    render();
  }

  if (sbpAction === "apply-sbp-promo") {
    const input = document.querySelector("[data-sbp-promo-input]");
    const code = input?.value.trim().toUpperCase();
    if (code === "ELTERA10" || code === "DEMO") {
      state.modal = { ...state.modal, promoApplied: true };
      render();
    } else if (input) {
      input.style.borderColor = "#FF6B6B";
      input.placeholder = "Неверный промокод";
    }
  }

  if (sbpAction === "sbp-deeplink") {
    window.open("https://qr.nspk.ru/", "_blank");
  }

  const vacancyFit = event.target.closest("[data-open-vacancy-fit]")?.dataset.openVacancyFit;
  if (vacancyFit) {
    const vacancy = state.vacancies.find((item) => item.id === vacancyFit);
    state.modal = { type: "list", target: `Кандидаты:Подходят ${vacancy?.title || ""}` };
    render();
  }

  const filter = event.target.closest("[data-dashboard-filter]")?.dataset.dashboardFilter;
  if (filter) {
    state.dashboardFilter = filter;
    state.drilldownStage = "";
    saveState();
    render();
  }

  const period = event.target.closest("[data-period]")?.dataset.period;
  if (period) {
    state.period = period;
    saveState();
    render();
  }

  const stage = event.target.closest("[data-stage]")?.dataset.stage;
  if (stage) {
    state.drilldownStage = stage;
    saveState();
    render();
  }

  const reportId = event.target.closest("[data-report-id]")?.dataset.reportId;
  if (reportId) setHash(`#/app/report/${reportId}`);

  const openAssess = event.target.closest("[data-open-assess]")?.dataset.openAssess;
  if (openAssess) setHash(`#/assess/${openAssess}`);

  // ── Прохождение теста: стартовый экран и навигация по вопросам ──
  if (event.target.closest("[data-assess-start]")) {
    const nameEl = document.getElementById("assessName");
    const emailEl = document.getElementById("assessEmail");
    state.candidate.name = nameEl ? nameEl.value.trim() : "";
    state.candidate.email = emailEl ? emailEl.value.trim() : "";
    state.candidate.stage = "questions";
    state.candidate.qIndex = 0;
    const mins = (state.candidate.form && state.candidate.form.duration_min) || 25;
    state.candidate.deadlineTs = Date.now() + mins * 60 * 1000;
    saveState();
    render();
    return;
  }
  if (event.target.closest("[data-assess-prev]")) {
    if ((state.candidate.qIndex || 0) > 0) state.candidate.qIndex = (state.candidate.qIndex || 0) - 1;
    saveState();
    render();
    return;
  }
  if (event.target.closest("[data-assess-next]")) {
    const form = state.candidate.form;
    const total = form ? form.questions.length : 0;
    if ((state.candidate.qIndex || 0) < total - 1) {
      state.candidate.qIndex = (state.candidate.qIndex || 0) + 1;
      saveState();
      render();
    } else {
      finishAssessment();
    }
    return;
  }

  const cancelToken = event.target.closest("[data-cancel-link]")?.dataset.cancelLink;
  if (cancelToken) cancelLink(cancelToken);

  const linksFilter = event.target.closest("[data-links-filter]")?.dataset.linksFilter;
  if (linksFilter) {
    state.linksFilter = linksFilter;
    saveState();
    render();
    return;
  }

  const bonusCount = Number(event.target.closest("[data-buy-bonus-assessments]")?.dataset.buyBonusAssessments || 0);
  if (bonusCount) spendBonuses(bonusCount);

  if (event.target.closest("[data-demo-assessment]")) {
    const demo = state.links.find((item) => item.token === "demo-link") || createLinkObject({ professionId: "recruiter", recipientType: "Кандидат", email: "demo@eltera.ai", forcedToken: "demo-link" });
    if (!state.links.some((item) => item.token === demo.token)) state.links.unshift(demo);
    saveState();
    setHash("#/assess/demo-link");
  }
});

document.addEventListener("submit", (event) => {
  // Login/register handled by authController

  if (event.target.matches("[data-assistant-form]")) {
    event.preventDefault();
    const input = event.target.querySelector('input[name="msg"]');
    const text = input ? input.value : "";
    if (input) input.value = "";
    sendAssistant(text);
    return;
  }

  if (event.target.matches("[data-create-link-form]")) {
    event.preventDefault();
    createLinkFromForm(event.target);
  }

  if (event.target.matches("[data-add-candidate-form]")) {
    event.preventDefault();
    addCandidateFromForm(event.target);
  }

  if (event.target.matches("[data-send-assessment-form]")) {
    event.preventDefault();
    const fd = new FormData(event.target);
    sendAssessmentToCandidate(event.target.dataset.personId, String(fd.get("professionId") || ""));
  }

  if (event.target.matches("[data-convert-employee-form]")) {
    event.preventDefault();
    convertCandidateFromForm(event.target);
  }

  if (event.target.matches("[data-candidate-form]")) {
    event.preventDefault();
    const activeLink = state.links.find((item) => item.token === state.candidate.token);
    // Тест с бэка: обязательные вопросы (radio) проверяет браузер через required.
    if (state.candidate.apiToken && state.candidate.form) {
      completeCandidateAssessment(event.target);
      return;
    }
    const requiredQuestions = questionsForProfession(activeLink?.professionId || "recruiter");
    const answered = requiredQuestions.every((question) => state.candidate.answers[question.id] !== undefined);
    if (!answered) {
      alert("Ответьте на все вопросы перед завершением оценки.");
      return;
    }
    completeCandidateAssessment(event.target);
  }

  if (event.target.matches("[data-withdraw-form]")) {
    event.preventDefault();
    createWithdrawal(event.target);
  }

  if (event.target.matches("[data-add-employee-form]")) {
    event.preventDefault();
    addEmployeeFromForm(event.target);
  }
  // Конструктор: создать тест.
  if (event.target.matches("[data-create-test-form]")) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    createConstructorTest({
      title,
      category: String(fd.get("category") || "").trim() || null,
      target_type: String(fd.get("target_type") || "candidate")
    });
    event.target.reset();
    return;
  }
  // Конструктор: добавить вопрос.
  if (event.target.matches("[data-add-question-form]")) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const testId = event.target.dataset.testId || "";
    const competencyId = event.target.dataset.competencyId || "";
    const text = String(fd.get("text") || "").trim();
    if (!text || (!testId && !competencyId)) return;
    const type = String(fd.get("type") || "single_choice");
    const payload = {
      text,
      type,
      competency_name: String(fd.get("competency_name") || "").trim() || null
    };
    if (type === "single_choice" || type === "multiple_choice") {
      const options = [];
      for (let i = 1; i <= 4; i++) {
        const ot = String(fd.get(`opt${i}`) || "").trim();
        if (!ot) continue;
        options.push({
          text: ot,
          score: Number(fd.get(`score${i}`) || 0),
          is_correct: fd.get(`correct${i}`) === "on",
          is_red_flag: fd.get(`flag${i}`) === "on"
        });
      }
      payload.options = options;
    } else if (type === "scale") {
      payload.scale_min = Number(fd.get("scale_min") || 1);
      payload.scale_max = Number(fd.get("scale_max") || 5);
    } else if (type === "open") {
      payload.max_score = Number(fd.get("max_score") || 5);
      payload.ai_reference = String(fd.get("ai_reference") || "").trim() || null;
      payload.ai_criteria = String(fd.get("ai_criteria") || "").trim() || null;
    }
    if (competencyId) addConstructorCompQuestion(competencyId, payload);
    else addConstructorQuestion(testId, payload);
    event.target.reset();
    return;
  }
  // Конструктор: создать компетенцию.
  if (event.target.matches("[data-create-competency-form]")) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    createConstructorCompetency({
      title,
      kind: String(fd.get("kind") || "professional"),
      description: String(fd.get("description") || "").trim() || null,
    });
    event.target.reset();
    return;
  }
  // Добавление в оргструктуру через бэкенд.
  if (event.target.matches("[data-add-structure-form]")) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const fullName = String(fd.get("full_name") || "").trim();
    if (!fullName) return;
    const payload = {
      full_name: fullName,
      position: String(fd.get("position") || "").trim() || null,
      role: String(fd.get("role") || "employee"),
      department_name: String(fd.get("department_name") || "").trim() || null,
      manager_id: String(fd.get("manager_id") || "") || null,
      project: String(fd.get("project") || "").trim() || null
    };
    state.modal = null;
    render();
    (async () => {
      try {
        await addStructureMember(payload);
        state.structureStatus = "idle";  // перезагрузить дерево
        state.employeesStatus = "idle";  // и список сотрудников
        render();
      } catch (error) {
        console.warn("Не удалось добавить в структуру:", error);
      }
    })();
  }
});

// ─── Avatar Upload Handler ───────────────────────────────────────────────────
function handleAvatarUpload(event) {
  const nodeId = event.target.dataset.avatarUpload;
  if (!nodeId) return;
  const file = event.target.files[0];
  if (!file) return;

  // Show error helper
  const showError = (msg) => {
    const errEl = document.getElementById("ocAvatarError");
    if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; }
  };
  const clearError = () => {
    const errEl = document.getElementById("ocAvatarError");
    if (errEl) errEl.style.display = "none";
  };

  // Validate type
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    showError("Ошибка: недопустимый формат. Используйте JPG, PNG или WebP.");
    event.target.value = "";
    return;
  }
  // Validate size (2 MB)
  if (file.size > 2 * 1024 * 1024) {
    showError("Ошибка: файл слишком большой. Максимальный размер — 2 МБ.");
    event.target.value = "";
    return;
  }

  clearError();
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    // Check image dimensions
    const img = new Image();
    img.onload = () => {
      if (!state.employeePhotos) state.employeePhotos = {};
      state.employeePhotos[nodeId] = base64;
      saveState();
      render();
    };
    img.onerror = () => {
      showError("Ошибка: не удалось загрузить изображение. Попробуйте другой файл.");
    };
    img.src = base64;
  };
  reader.onerror = () => {
    showError("Ошибка чтения файла. Попробуйте ещё раз.");
  };
  reader.readAsDataURL(file);
}

let _ctrProfileSearchTimer = null;
let _candProfTimer = null;
let _libSearchTimer = null;
document.addEventListener("input", (event) => {
  // Поиск по библиотеке тестов (серверный, debounce).
  const libInput = event.target.closest("[data-library-search]");
  if (libInput) {
    state.library.q = libInput.value;
    clearTimeout(_libSearchTimer);
    _libSearchTimer = setTimeout(() => { state.library.items = null; loadLibrary(); }, 280);
    return;
  }
  // Поиск кандидатского профиля в модалке «Добавить кандидата» (серверный, debounce).
  const cpInput = event.target.closest("[data-candprofile-search]");
  if (cpInput) {
    state.candProfileQuery = cpInput.value;
    clearTimeout(_candProfTimer);
    _candProfTimer = setTimeout(() => loadCandProfiles(state.candProfileQuery), 250);
    return;
  }
  // Поиск по профилям в конструкторе — серверный, с debounce (БД фильтрует
  // по подстроке мгновенно даже на тысячах профилей).
  const pInput = event.target.closest("[data-profile-search]");
  if (pInput) {
    state.constructorProfileQuery = pInput.value;
    clearTimeout(_ctrProfileSearchTimer);
    _ctrProfileSearchTimer = setTimeout(() => {
      loadConstructorTests(state.constructorProfileQuery);
    }, 250);
    return;
  }
  // Поиск по структуре (левый список / тулбар графа) — фильтрует список.
  const sInput = event.target.closest("[data-structure-search]");
  if (sInput) {
    const which = sInput.dataset.structureSearch;
    const caret = sInput.selectionStart;
    state.structureSearch = sInput.value;
    render();
    const again = document.querySelector(`[data-structure-search="${which}"]`);
    if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch (e) { /* noop */ } }
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-avatar-upload]")) {
    handleAvatarUpload(event);
    return;
  }
  // Конструктор: переключение типа вопроса показывает нужную секцию полей
  // (без перерисовки — уже введённые значения сохраняются).
  if (event.target.matches("[data-question-type]")) {
    const form = event.target.closest("form");
    if (form) form.dataset.qtype = event.target.value;
    return;
  }
  if (event.target.matches(".answer input")) {
    state.candidate.answers[event.target.name] = Number(event.target.value);
    const link = state.links.find((item) => item.token === state.candidate.token);
    if (link && link.status === "opened") {
      link.status = "started";
      link.history.push(["начата", new Date().toISOString()]);
    }
    saveState();
  }
  // Ответ на вопрос в новом мастере прохождения (API-тест).
  const assessInput = event.target.closest("[data-assess-input]");
  if (assessInput) {
    state.candidate.answers = state.candidate.answers || {};
    const qid = assessInput.dataset.qid;
    const qtype = assessInput.dataset.qtype;
    if (qtype === "single_choice") {
      state.candidate.answers[qid] = assessInput.value;
    } else if (qtype === "scale") {
      state.candidate.answers[qid] = Number(assessInput.value);
    } else if (qtype === "multiple_choice") {
      const checked = Array.from(document.querySelectorAll(`[data-assess-input][data-qid="${qid}"]`))
        .filter((el) => el.checked)
        .map((el) => el.value);
      state.candidate.answers[qid] = checked;
    } else {
      state.candidate.answers[qid] = assessInput.value;
    }
    const link = state.links.find((item) => item.token === state.candidate.token);
    if (link && link.status === "opened") {
      link.status = "started";
      if (Array.isArray(link.history)) link.history.push(["начата", new Date().toISOString()]);
    }
    saveState();
    // Перерисовываем, чтобы обновить выбор, точки и доступность кнопки «Далее».
    // Для открытого ответа событие change приходит на blur — фокус уже снят.
    render();
  }
});


// ─── Controller Initialization ───────────────────────────────────────────────
// Each controller registers its own event listeners and receives
// accessor functions to read/write state without holding a stale reference.

const getState = () => state;
const setState = (updater) => { state = updater(state); };

initWizardController({ getState, setState, render, saveState });
initFiltersController({ getState, setState, render, saveState });
initAuthController({
  getState,
  setState,
  render,
  saveState,
  setHash,
  devLibraryDeps: { professions, questions, commonCompetencies, professionalCompetencies }
});
initAiController({ getState, setState, saveState });

window.addEventListener("hashchange", render);

// Авто-логаут: токены протухли и refresh не удался (из api.js).
window.addEventListener("eltera-logout", () => {
  state.authenticated = false;
  state.user = null;
  setHash("#/login");
  render();
});

render();

// Лёгкий поллинг уведомлений (раз в 60с), пока пользователь в приложении и
// панель закрыта (чтобы не дёргать список под рукой у пользователя).
setInterval(() => {
  if (state.authenticated && !state.notifPanelOpen) loadNotifications();
}, 60000);
