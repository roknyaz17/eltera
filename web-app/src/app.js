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
  recordCandidateResult,
  createLink,
  fetchLinks,
  fetchAssessmentForm,
  submitAssessment,
  updateCandidate,
  candidatePdfUrl,
  fetchCandidateAnswers,
  fetchCandidate,
  fetchEmployees,
  fetchEmployeeStats,
  fetchEmployee,
  recordEmployeeResult,
  fetchOrgTree,
  addStructureMember,
  fetchTests,
  fetchTest,
  createTest,
  addQuestion,
  deleteQuestion,
  deleteTest
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
  renderVacancies
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
// Данные кандидатов всегда загружаем заново с бэкенда (не из localStorage).
state.candidatesStatus = "idle";
state.candidatesApi = null;
state.candidateStats = null;
state.candidateHeatmap = null;
state.kebabMenu = null;
state.answersData = null;
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
  if (hash.startsWith("#/app/")) return { route: "app", view: hash.replace("#/app/", "") || "dashboard" };
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
    fit: e.fit ?? 0,
    turnoverRisk: RISK_LABELS[e.turnover_risk] || e.turnover_risk || "низкий",
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

async function loadTests() {
  try {
    state.testsApi = await fetchTests();
    render();
  } catch (error) {
    console.warn("Не удалось загрузить тесты:", error);
  }
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

// --- Конструктор тестов ---

async function loadConstructorTests() {
  state.constructorStatus = "loading";
  try {
    state.constructorTests = await fetchTests();
    state.constructorStatus = "ready";
  } catch (error) {
    console.warn("Не удалось загрузить тесты:", error);
    state.constructorTests = null;
    state.constructorStatus = "error";
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
    await loadConstructorTests();
  } catch (error) {
    console.warn("Не удалось создать тест:", error);
  }
}

async function addConstructorQuestion(testId, payload) {
  try {
    state.constructorTest = await addQuestion(testId, payload);
    state.testsApi = null; // счётчики/список тестов обновим
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

function render() {
  const route = currentRoute();
  state.route = route.route;
  if (route.view && route.view !== state.view) {
    // Close filters modal on page navigation
    if (state.modal?.type === "filters") state.modal = null;
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
    initHeroLiveCard();
    initLv3Landing();
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
        state.candidate.formToken = apiToken;
        state.candidate.form = null;
        state.candidate.formError = null;
        loadAssessmentForm(apiToken);
      }
      if (link && link.status === "pending") link.status = "opened";
      const headLink = link || { recipientType: "Кандидат", token: route.token, apiToken, fullName: "", history: [] };
      app.innerHTML = renderCandidateAssessment(headLink, null, null, null, competencyTitleById, state.candidate.form, state.candidate.formError);
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

  if (state.view === "dashboard") content = renderDashboard(state, dashboardFilters);
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
    content = renderStructure(state);
  }
  if (state.view === "constructor") {
    if (!state.constructorStatus || state.constructorStatus === "idle") {
      state.constructorStatus = "idle";
      loadConstructorTests();
    }
    content = renderConstructor(state);
  }
  if (state.view === "people") content = renderPeople(state);
  if (state.view === "vacancies") content = renderVacancies(state);
  if (state.view === "assessments") content = renderAssessments(state, professions);
  if (state.view === "adaptation") content = renderAdaptation(state);
  if (state.view === "360") content = renderThreeSixty(state);
  if (state.view === "performance") content = renderPerformance(state);
  if (state.view === "links") {
    if (!state.linksStatus || state.linksStatus === "idle") {
      state.linksStatus = "idle";
      loadLinksFromApi();
    }
    if (!state.testsApi) loadTests();
    content = renderLinks(state, professions);
  }
  if (state.view === "reports") content = renderReports(state);
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
      morphdom(app, tmp, { childrenOnly: true });
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
// Кнопка «Добавить кандидата»: просто заводим кандидата в базе, без оценки.
async function addCandidateFromForm(formEl) {
  const fd = new FormData(formEl);
  const lastName = String(fd.get("lastName") || "").trim();
  const firstName = String(fd.get("firstName") || "").trim();
  const patronymic = String(fd.get("patronymic") || "").trim();
  const fullName = [lastName, firstName, patronymic].filter(Boolean).join(" ");
  if (!fullName) {
    alert("Укажите хотя бы фамилию или имя кандидата.");
    return;
  }
  try {
    await createCandidate({
      last_name: lastName || null,
      first_name: firstName || null,
      patronymic: patronymic || null,
      full_name: fullName,
      email: String(fd.get("email") || "").trim() || null,
      phone: String(fd.get("phone") || "").trim() || null,
      vacancy_title: String(fd.get("vacancy") || "").trim() || null,
      source: "Добавлен вручную",
      selection_type: "Точечный подбор",
      stage: "new"
    });
    state.modal = null;
    state.candidatesStatus = "idle";
    await loadCandidatesFromApi();
  } catch (error) {
    console.warn("Не удалось добавить кандидата в бэкенде:", error);
    alert("Не удалось добавить кандидата. Попробуйте позже.");
  }
}

// Простое тост-уведомление (визуально совпадает с тостами мастера оценки).
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

// Загрузка реальных ответов кандидата с бэкенда для модалки «Ответы».
async function loadCandidateAnswers(personId) {
  try {
    const data = await fetchCandidateAnswers(personId);
    if (state.modal && state.modal.type === "answers" && state.modal.id === personId) {
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

// Прохождение теста, заданного на бэке: собираем ответы по типам и отправляем.
async function submitBackendAssessment(formEl, link) {
  const form = state.candidate.form;
  if (!form) return;
  const data = new FormData(formEl);
  const answers = form.questions.map((q) => {
    const qid = q.question_version_id;
    if (q.type === "single_choice") {
      const v = data.get(qid);
      return { question_version_id: qid, selected_option_ids: v ? [v] : [] };
    }
    if (q.type === "multiple_choice") {
      return { question_version_id: qid, selected_option_ids: data.getAll(`m_${qid}`) };
    }
    if (q.type === "scale") {
      const v = data.get(qid);
      return { question_version_id: qid, scale_value: v ? Number(v) : null };
    }
    return { question_version_id: qid, answer_text: data.get(`o_${qid}`) || null };
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
    alert("Не удалось отправить ответы. Проверьте, что все вопросы заполнены, и попробуйте снова.");
    return;
  }
  state.candidate = { token: "", answers: {}, form: null, formToken: null, formError: null, apiToken: null };
  saveState();
  setHash("#/thanks");
}

function completeCandidateAssessment(form) {
  const token = state.candidate.token;
  const link = state.links.find((item) => item.token === token) || null;

  // Тест с бэка — отправляем ответы на сервер (он считает баллы и закрывает воронку).
  if (state.candidate.apiToken && state.candidate.form) {
    submitBackendAssessment(form, link);
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
    if (!state.testsApi) loadTests();
    state.modal = { type: "add-candidate" };
    render();
    return;
  }
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
  if (action === "run-employee-import") {
    const fileInput = document.querySelector("[data-import-employees-file]");
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
      alert("Выберите Excel-файл со списком сотрудников.");
      return;
    }
    const name = fileInput.files[0].name;
    state.modal = null;
    render();
    const toast = document.createElement("div");
    toast.className = "sbp-toast";
    toast.textContent = `✓ Файл «${name}» получен, импорт обрабатывается`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
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
  }
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
    if (!state.testsApi) loadTests();
    state.modal = { type: "send-assessment", personId: id, fullName: cand ? (cand.person?.fullName || cand.full_name) : "" };
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
    render();
    loadCandidateAnswers(openAnswers);
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
    const fd = new FormData(event.target);
    const firstName = (fd.get("firstName") || "").trim();
    const lastName = (fd.get("lastName") || "").trim();
    const fullName = [lastName, firstName].filter(Boolean).join(" ");
    if (!fullName) return;
    const newEmp = {
      id: `emp-${Date.now()}`,
      fullName,
      position: (fd.get("position") || "").trim(),
      department: (fd.get("department") || "").trim() || "Без отдела",
      project: (fd.get("project") || "").trim() || "Общий контур",
      manager: (fd.get("manager") || "").trim() || "Не назначен",
      startDate: new Date().toISOString().slice(0, 10),
      fit: 0,
      turnoverRisk: "не оценен",
      burnout: "не оценен",
      satisfaction: 0,
      recommendation: "Оценка ещё не проведена."
    };
    state.employees.unshift(newEmp);
    state.modal = null;
    saveState();
    render();
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
    const testId = event.target.dataset.testId;
    const text = String(fd.get("text") || "").trim();
    if (!text || !testId) return;
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
    addConstructorQuestion(testId, payload);
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

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-avatar-upload]")) {
    handleAvatarUpload(event);
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
render();

// ─── Hero Live Card Animation ─────────────────────────────────────────────────
function initHeroLiveCard() {
  const scenarios = [
    {
      label: "Оценка кандидата · Live",
      metrics: [
        { title: "Коммуникация", value: "87%", width: 87 },
        { title: "Стрессоустойчивость", value: "72%", width: 72 },
        { title: "Ответственность", value: "91%", width: 91 },
        { title: "Обучаемость", value: "65%", width: 65 }
      ],
      note: "AI: Высокая ответственность и коммуникация. Рекомендую пригласить на интервью."
    },
    {
      label: "Оценка сотрудника · Live",
      metrics: [
        { title: "Лидерство", value: "78%", width: 78 },
        { title: "Инициативность", value: "84%", width: 84 },
        { title: "Командная работа", value: "69%", width: 69 },
        { title: "Результативность", value: "88%", width: 88 }
      ],
      note: "AI: Сотрудник показывает высокую результативность. Готов к повышению."
    },
    {
      label: "Пульс-опрос команды · Live",
      metrics: [
        { title: "Вовлечённость", value: "73%", width: 73 },
        { title: "Удовлетворённость", value: "61%", width: 61 },
        { title: "Риск выгорания", value: "38%", width: 38 },
        { title: "Лояльность", value: "82%", width: 82 }
      ],
      note: "AI: Риск выгорания в норме. Рекомендую провести 1-on-1 с 2 сотрудниками."
    },
    {
      label: "Performance Review · Live",
      metrics: [
        { title: "Достижение целей", value: "92%", width: 92 },
        { title: "Потенциал роста", value: "76%", width: 76 },
        { title: "Управленческий стиль", value: "68%", width: 68 },
        { title: "Соответствие роли", value: "85%", width: 85 }
      ],
      note: "AI: Высокий потенциал. Включить в кадровый резерв на позицию руководителя."
    }
  ];

  let idx = 0;
  let timer = null;

  function updateCard() {
    const card = document.getElementById('heroLiveCard');
    if (!card) { clearInterval(timer); return; }

    const s = scenarios[idx % scenarios.length];
    idx++;

    const labelEl = document.getElementById('heroCardLabel');
    const metricsEl = document.getElementById('heroMetrics');
    const noteEl = document.getElementById('heroAiNote');

    if (!labelEl || !metricsEl || !noteEl) return;

    // Fade out
    card.style.transition = 'opacity .3s';
    card.style.opacity = '0.4';

    setTimeout(() => {
      labelEl.textContent = s.label;
      metricsEl.innerHTML = s.metrics.map(m =>
        `<div class="metric"><div><span>${m.title}</span><b>${m.value}</b></div><i><em style="width:0%"></em></i></div>`
      ).join('');
      noteEl.textContent = 'AI: ' + s.note.replace('AI: ', '');

      card.style.opacity = '1';

      // Animate bars
      setTimeout(() => {
        const bars = metricsEl.querySelectorAll('.metric em');
        bars.forEach((bar, i) => {
          setTimeout(() => {
            bar.style.transition = 'width .7s cubic-bezier(.22,.68,0,1.1)';
            bar.style.width = s.metrics[i].width + '%';
          }, i * 80);
        });
      }, 50);
    }, 300);
  }

  // Initial bar animation
  setTimeout(() => {
    const bars = document.querySelectorAll('#heroMetrics .metric em');
    const widths = [87, 72, 91, 65];
    bars.forEach((bar, i) => {
      setTimeout(() => {
        bar.style.transition = 'width .7s cubic-bezier(.22,.68,0,1.1)';
        bar.style.width = widths[i] + '%';
      }, 600 + i * 100);
    });
  }, 100);

  // Cycle every 4 seconds
  timer = setInterval(updateCard, 4000);
}

function initLv3Landing() {
  // TABS
  const tabBtns = document.querySelectorAll('.lv3-tab-btn');
  const tabPanels = document.querySelectorAll('.lv3-tab-panel');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.lv3Tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.querySelector(`.lv3-tab-panel[data-lv3-panel="${idx}"]`);
      if (panel) panel.classList.add('active');
    });
  });

  // ACCORDION
  const accItems = document.querySelectorAll('.lv3-acc-item');
  accItems.forEach(item => {
    const head = item.querySelector('.lv3-acc-head');
    if (head) {
      head.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        accItems.forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    }
  });

  // BILLING TOGGLE
  const billingBtns = document.querySelectorAll('.lv3-billing-btn');
  billingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      billingBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // HERO CARD SLIDER
  (function() {
    const slider = document.getElementById('lv3HSlider');
    if (!slider) return;
    const slides = slider.querySelectorAll('.lv3-hslide');
    const dots = slider.querySelectorAll('.lv3-hsdot');
    let current = 0;
    let timer = null;
    const INTERVAL = 4000;

    function animateBars(slide) {
      // Reset all bars to 0, then animate to target width
      const bars = slide.querySelectorAll('.lv3-hbar-fill');
      bars.forEach(bar => {
        const target = bar.style.getPropertyValue('--w') || bar.style.width || '0%';
        bar.style.transition = 'none';
        bar.style.width = '0%';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bar.style.transition = 'width 0.9s cubic-bezier(0.22, 0.68, 0, 1.1)';
            bar.style.width = target;
          });
        });
      });
    }

    function goTo(idx) {
      // Remove active from current (CSS handles fade out via transition)
      slides[current].classList.remove('lv3-hslide--active');
      dots[current].classList.remove('lv3-hsdot--active');
      current = (idx + slides.length) % slides.length;
      // Add active to new (CSS handles fade in via transition)
      slides[current].classList.add('lv3-hslide--active');
      dots[current].classList.add('lv3-hsdot--active');
      // Animate bars after a short delay so they start after slide appears
      setTimeout(() => animateBars(slides[current]), 100);
    }

    function startTimer() {
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), INTERVAL);
    }

    // Dot clicks
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { goTo(i); startTimer(); });
    });

    // Pause on hover
    slider.addEventListener('mouseenter', () => clearInterval(timer));
    slider.addEventListener('mouseleave', () => startTimer());

    // Start
    startTimer();
  })();

  // NAV scroll effect
  const nav = document.getElementById('lv3Nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        nav.classList.add('lv3-nav--scrolled');
      } else {
        nav.classList.remove('lv3-nav--scrolled');
      }
    }, { passive: true });
  }

  // BURGER MENU
  const burger = document.getElementById('lv3Burger');
  const mobileNav = document.getElementById('lv3MobileNav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const isOpen = burger.classList.toggle('open');
      if (isOpen) {
        mobileNav.classList.add('open');
        document.body.style.overflow = 'hidden';
      } else {
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
    // Close on link click
    mobileNav.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => {
        burger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // SCROLL REVEAL ANIMATIONS
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          // Also reveal children with data-reveal-delay
          entry.target.querySelectorAll('[data-reveal-delay]').forEach(child => {
            child.classList.add('revealed');
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: show all immediately
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  // CANVAS PARTICLES
  const canvas = document.getElementById('lv3Particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animFrame;

    function resizeCanvas() {
      const hero = canvas.parentElement.parentElement;
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }

    function createParticles() {
      particles = [];
      const count = Math.floor(canvas.width / 12);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.5 + 0.3,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: Math.random() * 0.5 + 0.1,
          color: Math.random() > 0.5 ? '30,91,255' : '0,229,212'
        });
      }
    }

    function drawParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fill();
      });
      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(30,91,255,${0.08 * (1 - dist/80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animFrame = requestAnimationFrame(drawParticles);
    }

    resizeCanvas();
    createParticles();
    drawParticles();
    window.addEventListener('resize', () => { resizeCanvas(); createParticles(); }, { passive: true });

    // Stop animation when hero not visible
    const heroObs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) { cancelAnimationFrame(animFrame); }
      else { drawParticles(); }
    }, { threshold: 0 });
    heroObs.observe(canvas.parentElement.parentElement);
  }

  // COMPARE TABLE TOGGLE
  const compareToggle = document.getElementById('lv3CompareToggle');
  const compareTable = document.getElementById('lv3CompareTable');
  if (compareToggle && compareTable) {
    compareToggle.addEventListener('click', () => {
      const isOpen = compareTable.classList.toggle('open');
      compareToggle.textContent = isOpen ? 'Скрыть сравнение ↑' : 'Сравнить тарифы ↓';
    });
  }

  // ANIMATED COUNTERS ON SCROLL
  function animateCounter(el, target, suffix, prefix, duration) {
    const start = performance.now();
    const isFloat = String(target).includes('.');
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(eased * target);
      el.textContent = prefix + (isFloat ? current.toFixed(1) : current.toLocaleString('ru-RU')) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function parseCounterEl(el) {
    const raw = el.dataset.countTo || el.textContent.trim();
    // Extract numeric value, prefix and suffix
    const match = raw.match(/^([^\d]*?)([\d\s]+(?:[.,]\d+)?)(.*?)$/);
    if (!match) return null;
    const prefix = match[1];
    const num = parseFloat(match[2].replace(/[\s]/g, '').replace(',', '.'));
    const suffix = match[3];
    return { prefix, num, suffix };
  }

  const counterEls = document.querySelectorAll('.lv3-hstat b[data-count-to], .lv3-proof-stat b[data-count-to]');
  if (counterEls.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (el.dataset.counted === 'true') return;
          el.dataset.counted = 'true';
          const target = parseFloat(el.dataset.countTo);
          const prefix = el.dataset.countPrefix || '';
          const suffix = el.dataset.countSuffix || '';
          if (!isNaN(target)) {
            // Special case: 3000 displays as "3 000+"
            if (el.dataset.countSuffix === ' 000+') {
              el.textContent = prefix + '0 000+';
              const startTime = performance.now();
              const dur = 1600;
              function stepK(now) {
                const p = Math.min((now - startTime) / dur, 1);
                const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                const v = Math.round(e * 3);
                el.textContent = prefix + v + ' 000+';
                if (p < 1) requestAnimationFrame(stepK);
              }
              requestAnimationFrame(stepK);
            } else {
              el.textContent = prefix + '0' + suffix;
              animateCounter(el, target, suffix, prefix, 1400);
            }
          }
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counterEls.forEach(el => counterObserver.observe(el));
  }

  // ── FOLDER TABS + SCROLL-DRIVEN ──
  const folderTabs = document.querySelectorAll('.lv3-folder-tab');
  const folderPanels = document.querySelectorAll('.lv3-folder-panel');
  const scrollDots = document.querySelectorAll('.lv3-scroll-dot');
  let folderTimers = {};
  let currentFolder = 0;

  function stopFolderAnimations() {
    Object.values(folderTimers).forEach(t => clearTimeout(t));
    folderTimers = {};
    aiChatRunning = false;
    sendRunning = false;
  }

  function activateFolder(idx) {
    if (idx === currentFolder && document.querySelector(`.lv3-folder-panel[data-folder-panel="${idx}"]`)?.classList.contains('active')) return;
    stopFolderAnimations();
    currentFolder = idx;
    folderTabs.forEach(t => t.classList.remove('active'));
    folderPanels.forEach(p => p.classList.remove('active'));
    scrollDots.forEach(d => d.classList.remove('active'));
    const tab = document.querySelector(`.lv3-folder-tab[data-folder="${idx}"]`);
    const panel = document.querySelector(`.lv3-folder-panel[data-folder-panel="${idx}"]`);
    const dot = document.querySelector(`.lv3-scroll-dot[data-dot="${idx}"]`);
    if (tab) tab.classList.add('active');
    if (dot) dot.classList.add('active');
    if (panel) {
      panel.classList.add('active');
      if (idx === 0) {
        panel.querySelectorAll('.lv3-dash-bar-fill').forEach((bar, i) => {
          const w = bar.dataset.w ? bar.dataset.w + '%' : bar.style.width;
          bar.style.width = '0';
          folderTimers[`bar${i}`] = setTimeout(() => { bar.style.width = w; }, 150 + i * 150);
        });
      }
      if (idx === 1) startAiChatLoop();
      if (idx === 2) startSendLoop();
      if (idx === 3) startOrgExpand();
    }
  }

  // Click on tabs still works
  folderTabs.forEach(tab => {
    tab.addEventListener('click', () => activateFolder(parseInt(tab.dataset.folder)));
  });
  // Click on dots
  scrollDots.forEach(dot => {
    dot.addEventListener('click', () => activateFolder(parseInt(dot.dataset.dot)));
  });

  // Click-only tab switching (no scroll-driven)

  // Animate bars on initial load (slide 0 is active)
  setTimeout(() => {
    document.querySelectorAll('.lv3-folder-panel[data-folder-panel="0"] .lv3-dash-bar-fill').forEach((bar, i) => {
      const w = bar.dataset.w ? bar.dataset.w + '%' : bar.style.width;
      bar.style.width = '0';
      setTimeout(() => { bar.style.width = w; }, 400 + i * 150);
    });
  }, 600);

  // ── AI CHAT LOOP (Slide 2) ──
  const aiConversations = [
    [
      { type: 'user', text: 'Как провести оценку 360 для руководителя?' },
      { type: 'bot', text: 'Для оценки 360 выберите профиль «Руководитель», добавьте 5–8 оценщиков и установите срок 7 дней. Я сформирую сводный отчёт. 📊' },
    ],
    [
      { type: 'user', text: 'На кого из кандидатов обратить внимание?' },
      { type: 'bot', text: 'Рекомендую Анну К. — fit к роли 94%, высокая обучаемость. Красных флагов нет. ✅' },
    ],
    [
      { type: 'user', text: 'Что значит низкая вовлечённость?' },
      { type: 'bot', text: 'Вовлечённость ниже 60% — риск выгорания. Рекомендую 1-on-1 с сотрудником. 🔥' },
    ],
    [
      { type: 'user', text: 'Как составить ИПР для сотрудника?' },
      { type: 'bot', text: 'На основе оценки AI сформирует ИПР автоматически: зоны роста, рекомендации, сроки. Вы можете отредактировать. 📄' },
    ],
  ];
  let aiConvIdx = 0;
  let aiChatRunning = false;

  function startAiChatLoop() {
    const container = document.getElementById('lv3AiMessages');
    if (!container) return;
    if (aiChatRunning) return;
    aiChatRunning = true;
    runAiConversation();
  }

  function runAiConversation() {
    const container = document.getElementById('lv3AiMessages');
    if (!container) { aiChatRunning = false; return; }
    const conv = aiConversations[aiConvIdx % aiConversations.length];
    aiConvIdx++;
    // Clear messages
    container.querySelectorAll('.lv3-ai-msg').forEach(m => m.remove());
    let delay = 0;
    conv.forEach((msg, i) => {
      delay += i === 0 ? 400 : 1200;
      folderTimers[`aiMsg${i}`] = setTimeout(() => {
        const el = document.createElement('div');
        el.className = `lv3-ai-msg lv3-ai-msg-${msg.type}`;
        el.textContent = msg.text;
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('lv3-ai-msg-visible'));
        container.scrollTop = container.scrollHeight;
      }, delay);
    });
    // Loop
    folderTimers['aiLoop'] = setTimeout(() => {
      if (aiChatRunning) runAiConversation();
    }, delay + 2500);
  }

  // ── SEND ANIMATION LOOP (Slide 3) ──
  let sendRunning = false;

  function startSendLoop() {
    if (sendRunning) return;
    sendRunning = true;
    runSendCycle();
  }

  function runSendCycle() {
    const stage0 = document.querySelector('.lv3-send-stage[data-stage="0"]');
    const stage1 = document.querySelector('.lv3-send-stage[data-stage="1"]');
    const stage2 = document.querySelector('.lv3-send-stage[data-stage="2"]');
    const bar = document.getElementById('lv3SendBar');
    const btn = document.getElementById('lv3SendBtn');
    if (!stage0) { sendRunning = false; return; }
    // Reset to stage 0
    stage0.style.display = '';
    stage1.style.display = 'none';
    stage2.style.display = 'none';
    if (btn) btn.style.display = '';
    // Stage 1: sending
    folderTimers['send1'] = setTimeout(() => {
      stage0.style.display = 'none';
      stage1.style.display = '';
      if (btn) btn.style.display = 'none';
      if (bar) {
        bar.style.width = '0';
        let pct = 0;
        const prog = setInterval(() => {
          pct += 4;
          bar.style.width = pct + '%';
          if (pct >= 100) clearInterval(prog);
        }, 40);
      }
    }, 1800);
    // Stage 2: done
    folderTimers['send2'] = setTimeout(() => {
      stage1.style.display = 'none';
      stage2.style.display = '';
    }, 3600);
    // Loop
    folderTimers['sendLoop'] = setTimeout(() => {
      if (sendRunning) runSendCycle();
    }, 6000);
  }

  // ── ORG EXPAND ANIMATION (Slide 4) ──
  function startOrgExpand() {
    const children = document.querySelectorAll('.lv3-org-children');
    children.forEach(c => c.classList.remove('open'));
    let i = 0;
    function expandNext() {
      if (i < children.length) {
        children[i].classList.add('open');
        i++;
        folderTimers[`org${i}`] = setTimeout(expandNext, 500);
      } else {
        // Collapse and restart
        folderTimers['orgReset'] = setTimeout(() => {
          children.forEach(c => c.classList.remove('open'));
          folderTimers['orgRestart'] = setTimeout(startOrgExpand, 600);
        }, 3000);
      }
    }
    folderTimers['orgStart'] = setTimeout(expandNext, 400);
  }

  // ── REFERRAL COPY BUTTON (Slide 5) ──
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#lv3RefCopyBtn');
    if (!btn) return;
    const url = 'eltera.ai/ref/xK9mP2qR';
    navigator.clipboard?.writeText(url).catch(() => {});
    btn.textContent = 'Скопировано ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Скопировать';
      btn.classList.remove('copied');
    }, 2000);
  });

  // SMOOTH ANCHOR SCROLL
  document.querySelectorAll('a[href^="#lv3-"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const offset = 70;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}
