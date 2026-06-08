import {
  commonCompetencies,
  professionalCompetencies,
  professions,
  questions
} from "./data/assessment-library.js";
import { buildAssessment, calculateResult } from "./domain/scoring.js";
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

function render() {
  const route = currentRoute();
  state.route = route.route;
  if (route.view) state.view = route.view;
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
    const profession = link ? professionById(link.professionId) : professions[0];
    const assessmentQuestions = link ? questionsForProfession(link.professionId) : [];
    if (link && link.status === "pending") link.status = "opened";
    state.candidate.token = route.token;
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
  if (state.view === "candidates") content = renderCandidates(state);
  if (state.view === "employees") content = renderEmployees(state);
  if (state.view === "structure") content = renderStructure(state);
  if (state.view === "constructor") content = renderConstructor(state, professions);
  if (state.view === "people") content = renderPeople(state);
  if (state.view === "vacancies") content = renderVacancies(state);
  if (state.view === "assessments") content = renderAssessments(state, professions);
  if (state.view === "adaptation") content = renderAdaptation(state);
  if (state.view === "360") content = renderThreeSixty(state);
  if (state.view === "performance") content = renderPerformance(state);
  if (state.view === "links") content = renderLinks(state, professions);
  if (state.view === "reports") content = renderReports(state);
  if (state.view === "report") content = renderReport(state, state.sessions.find((item) => item.id === state.reportId));
  if (state.view === "tariffs") content = renderTariffs(state, tariffs);
  if (state.view === "referrals") content = renderReferrals(state);
  if (state.view === "api") content = renderApiKeys(state);
  if (state.view === "support") content = renderSupport(state);
  if (state.view === "gratitude") content = renderGratitude(state);
  if (state.view === "settings") content = renderSettings(state);

  app.innerHTML = renderAppShell(state, content || renderDashboard(state, dashboardFilters));
}

function createLinkFromForm(form) {
  const data = new FormData(form);
  const link = createLinkObject({
    professionId: String(data.get("professionId") || "recruiter"),
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
  state.links.unshift(link);
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

function quickCreateLink(professionId = "recruiter") {
  const link = createLinkObject({ professionId, recipientType: "Кандидат", email: "" });
  state.links.unshift(link);
  if (state.company.balance > 0) state.company.balance -= 1;
  saveState();
  if (location.hash === "#/app/links") render();
  else setHash("#/app/links");
}

function completeCandidateAssessment(form) {
  const token = state.candidate.token;
  const link = state.links.find((item) => item.token === token);
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

  // Auth pill switching
  const authTab = event.target.closest("[data-auth-tab]")?.dataset.authTab;
  if (authTab) {
    document.querySelectorAll(".authPillBtn").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".authFormWrap").forEach(p => p.classList.remove("open"));
    event.target.closest("[data-auth-tab]").classList.add("active");
    document.querySelector(`[data-auth-panel="${authTab}"]`)?.classList.add("open");
  }

  // Switch tab via link
  const switchTab = event.target.closest("[data-switch-tab]")?.dataset.switchTab;
  if (switchTab) {
    event.preventDefault();
    document.querySelectorAll(".authPillBtn").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".authFormWrap").forEach(p => p.classList.remove("open"));
    document.querySelector(`[data-auth-tab="${switchTab}"]`)?.classList.add("active");
    document.querySelector(`[data-auth-panel="${switchTab}"]`)?.classList.add("open");
  }

  // Contact type switch (email / phone)
  const contactType = event.target.closest("[data-contact-type]")?.dataset.contactType;
  if (contactType) {
    const switchEl = event.target.closest(".authContactSwitch");
    switchEl?.querySelectorAll(".authContactBtn").forEach(b => b.classList.remove("active"));
    event.target.closest("[data-contact-type]").classList.add("active");
    const input = event.target.closest(".authContactToggle")?.querySelector(".authInput");
    if (input) {
      input.placeholder = contactType === "email" ? "name@company.ru" : "+7 900 000-00-00";
      input.type = contactType === "email" ? "email" : "tel";
    }
  }

  // Forgot password mock
  if (event.target.closest("[data-forgot-password]")) {
    event.preventDefault();
    alert("Сброс пароля будет доступен после подключения backend. Напишите на hello@eltera.ai");
  }

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
  if (action === "top-up") {
    state.modal = { type: "sbp-payment", mode: "topup", pack: 20 };
    render();
  }
  if (action === "print-report") window.print();
  if (action === "add-structure-member") {
    state.modal = { type: "add-employee" };
    render();
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

  const openList = event.target.closest("[data-open-list]")?.dataset.openList;
  if (openList) {
    state.modal = { type: "list", target: openList };
    render();
  }

  const openCard = event.target.closest("[data-open-card]")?.dataset.openCard;
  if (openCard) {
    state.modal = { type: "card", id: openCard };
    render();
  }

  const openAnswers = event.target.closest("[data-open-answers]")?.dataset.openAnswers;
  if (openAnswers) {
    state.modal = { type: "answers", id: openAnswers };
    render();
  }

  const openCompetency = event.target.closest("[data-open-competency]")?.dataset.openCompetency;
  if (openCompetency) {
    state.modal = { type: "competency", id: openCompetency };
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
  if (event.target.matches("[data-login-form]")) {
    event.preventDefault();
    state.authenticated = true;
    saveState();
    setHash("#/app/dashboard");
  }

  if (event.target.matches("[data-register-form]")) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const firstName = fd.get("firstName") || "";
    const lastName = fd.get("lastName") || "";
    const company = fd.get("company") || "";
    const contact = fd.get("contact") || "";
    // Mock: save to state and authenticate
    if (company) state.company.name = company;
    if (firstName || lastName) state.company.contactName = `${firstName} ${lastName}`.trim();
    if (contact) state.company.contactEmail = contact;
    state.authenticated = true;
    saveState();
    setHash("#/app/dashboard");
  }

  if (event.target.matches("[data-create-link-form]")) {
    event.preventDefault();
    createLinkFromForm(event.target);
  }

  if (event.target.matches("[data-candidate-form]")) {
    event.preventDefault();
    const requiredQuestions = questionsForProfession(
      state.links.find((item) => item.token === state.candidate.token)?.professionId || "recruiter"
    );
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

// ─── Dev Portal ───────────────────────────────────────────────────────────────
const DEV_PASSWORD = "eltera-dev-2026";
const DEV_LIB_KEY = "eltera-dev-library-v1";

function getDevLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEV_LIB_KEY) || "null");
    if (saved) return saved;
  } catch {}
  return {
    professions: professions.map(p => ({ ...p })),
    questions: questions.map(q => ({ ...q })),
    commonCompetencies: commonCompetencies.map(c => ({ ...c })),
    professionalCompetencies: { ...professionalCompetencies }
  };
}

function saveDevLibrary(lib) {
  localStorage.setItem(DEV_LIB_KEY, JSON.stringify(lib));
}

document.addEventListener("click", (event) => {
  if (event.target.matches("#devPasswordSubmit")) {
    const input = document.querySelector("#devPasswordInput");
    if (input && input.value === DEV_PASSWORD) {
      sessionStorage.setItem("eltera_dev_auth", "1");
      render();
    } else {
      const err = document.querySelector("#devPasswordError");
      if (err) err.style.display = "block";
      if (input) input.value = "";
    }
    return;
  }
  if (event.target.matches("#devExportBtn")) {
    const lib = getDevLibrary();
    const blob = new Blob([JSON.stringify(lib, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "eltera-library.json"; a.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (event.target.matches("#devImportTrigger")) {
    document.querySelector("#devImportInput")?.click();
    return;
  }
  if (event.target.matches("#devResetBtn")) {
    if (confirm("Сбросить библиотеку к дефолтным данным? Все изменения будут потеряны.")) {
      localStorage.removeItem(DEV_LIB_KEY);
      render();
    }
    return;
  }
  if (event.target.matches("#devAddProfBtn")) {
    const form = document.querySelector("#devAddProfForm");
    if (form) form.style.display = form.style.display === "none" ? "block" : "none";
    return;
  }
  if (event.target.matches("#devCancelProfBtn")) {
    const form = document.querySelector("#devAddProfForm");
    if (form) form.style.display = "none";
    return;
  }
  if (event.target.matches("#devSaveProfBtn")) {
    const id = document.querySelector("#newProfId")?.value.trim();
    const title = document.querySelector("#newProfTitle")?.value.trim();
    const category = document.querySelector("#newProfCategory")?.value.trim();
    const summary = document.querySelector("#newProfSummary")?.value.trim();
    const compsRaw = document.querySelector("#newProfComps")?.value.trim();
    if (!id || !title) { alert("Заполните ID и название профессии"); return; }
    const lib = getDevLibrary();
    const competencies = compsRaw ? compsRaw.split(",").map(s => ({ id: s.trim(), weight: 1 })) : [];
    lib.professions.push({ id, title, category: category || "Другое", summary: summary || "", competencies });
    saveDevLibrary(lib);
    render();
    return;
  }
  const delProf = event.target.closest("[data-del-prof]")?.dataset.delProf;
  if (delProf) {
    if (confirm(`Удалить профессию "${delProf}"?`)) {
      const lib = getDevLibrary();
      lib.professions = lib.professions.filter(p => p.id !== delProf);
      saveDevLibrary(lib);
      render();
    }
    return;
  }
  if (event.target.matches("#devAddQBtn")) {
    const form = document.querySelector("#devAddQForm");
    if (form) form.style.display = form.style.display === "none" ? "block" : "none";
    return;
  }
  if (event.target.matches("#devCancelQBtn")) {
    const form = document.querySelector("#devAddQForm");
    if (form) form.style.display = "none";
    return;
  }
  if (event.target.matches("#devSaveQBtn")) {
    const scope = document.querySelector("#newQScope")?.value;
    const competencyId = document.querySelector("#newQComp")?.value;
    const text = document.querySelector("#newQText")?.value.trim();
    const answersRaw = document.querySelector("#newQAnswers")?.value.trim();
    if (!text || !answersRaw) { alert("Заполните текст вопроса и ответы"); return; }
    const answers = answersRaw.split("\n").filter(Boolean).map(line => {
      const parts = line.split("|").map(s => s.trim());
      return { text: parts[0], score: Number(parts[1]) || 0, redFlag: parts[2] === "red_flag" };
    });
    const lib = getDevLibrary();
    lib.questions.push({ id: `${scope}-${competencyId}-${Date.now()}`, scope, competencyId, text, answers });
    saveDevLibrary(lib);
    render();
    return;
  }
  const delQ = event.target.closest("[data-del-q]")?.dataset.delQ;
  if (delQ !== undefined && event.target.closest("[data-del-q]")) {
    const lib = getDevLibrary();
    lib.questions.splice(Number(delQ), 1);
    saveDevLibrary(lib);
    render();
    return;
  }
  if (event.target.matches("#devAddCompBtn")) {
    const row = document.querySelector("#devAddCompRow");
    if (row) row.style.display = row.style.display === "none" ? "flex" : "none";
    return;
  }
  if (event.target.matches("#devCancelCompBtn")) {
    const row = document.querySelector("#devAddCompRow");
    if (row) row.style.display = "none";
    return;
  }
  if (event.target.matches("#devSaveCompBtn")) {
    const id = document.querySelector("#newCompId")?.value.trim();
    const title = document.querySelector("#newCompTitle")?.value.trim();
    if (!id || !title) { alert("Заполните ID и название компетенции"); return; }
    const lib = getDevLibrary();
    lib.professionalCompetencies[id] = title;
    saveDevLibrary(lib);
    render();
    return;
  }
  const delComp = event.target.closest("[data-del-comp]")?.dataset.delComp;
  if (delComp) {
    if (confirm(`Удалить компетенцию "${delComp}"?`)) {
      const lib = getDevLibrary();
      delete lib.professionalCompetencies[delComp];
      saveDevLibrary(lib);
      render();
    }
    return;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("#devImportInput")) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const lib = JSON.parse(e.target.result);
        if (!lib.professions || !lib.questions) { alert("Неверный формат файла. Нужны поля professions и questions."); return; }
        saveDevLibrary(lib);
        render();
      } catch { alert("Ошибка чтения файла JSON"); }
    };
    reader.readAsText(file);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("#devPasswordInput")) {
    document.querySelector("#devPasswordSubmit")?.click();
  }
});

window.addEventListener("hashchange", render);
render();

// ─── AI Assistant ─────────────────────────────────────────────────────────────

const AI_MOCK_RESPONSES = {
  "кто в зоне риска": (s) => {
    const r = s.employees.filter(e => e.fit < 70 || e.turnoverRisk !== "низкий");
    if (!r.length) return "Сотрудников в зоне риска нет. Отличный результат!";
    return `В зоне риска <b>${r.length} сотрудника</b>:<br>${r.map(e => `• <b>${e.fullName}</b> — fit ${e.fit}%, риск увольнения: ${e.turnoverRisk}`).join("<br>")}.<br><br>Рекомендую провести 1-on-1 и обновить ИПР.`;
  },
  "топ кандидаты": (s) => {
    const c = s.sessions.filter(x => x.person.assessmentType === "Кандидат" && x.result.percent >= 68).sort((a,b) => b.result.percent - a.result.percent);
    if (!c.length) return "Подходящих кандидатов пока нет. Отправьте оценочные ссылки.";
    return `Топ кандидаты по fit:<br>${c.map(x => `• <b>${x.person.fullName}</b> — ${x.result.percent}% (${x.vacancy})`).join("<br>")}.<br><br>Рекомендую начать с кандидатов выше 80%.`;
  },
  "риски адаптации": (s) => {
    const newEmps = s.employees.filter(e => { const d = new Date(e.startDate); return (Date.now() - d) < 90*24*3600*1000; });
    if (!newEmps.length) return "Новых сотрудников на адаптации нет.";
    return `На адаптации <b>${newEmps.length} сотрудника</b>:<br>${newEmps.map(e => `• <b>${e.fullName}</b> — с ${e.startDate}, fit ${e.fit}%`).join("<br>")}.<br><br>Проверьте 30/60/90-дневные чекпоинты.`;
  },
  "рекомендации по найму": (s) => {
    const vacs = s.vacancies.filter(v => v.status === "Активна");
    return `Активных вакансий: <b>${vacs.length}</b>.<br>${vacs.map(v => `• <b>${v.title}</b> — конверсия ${v.conversion}, fit ${v.fit} кандидатов. ${v.recommendation}`).join("<br><br>")}`;
  }
};

function getAiMockResponse(question, state) {
  const q = question.toLowerCase().trim();
  for (const [key, fn] of Object.entries(AI_MOCK_RESPONSES)) {
    if (q.includes(key)) return fn(state);
  }
  // Generic fallback
  const riskCount = state.employees.filter(e => e.fit < 70 || e.turnoverRisk !== "низкий").length;
  const fitCount = state.sessions.filter(s => s.person.assessmentType === "Кандидат" && s.result.percent >= 68).length;
  return `По вашему запросу: в компании <b>${state.employees.length} сотрудников</b>, <b>${riskCount} в зоне риска</b>, <b>${fitCount} подходящих кандидатов</b>.<br><br>Попробуйте быстрые вопросы ниже или уточните запрос — я отвечу на основе ваших данных.`;
}

function aiTypingEffect(el, text, onDone) {
  let i = 0;
  el.innerHTML = "";
  const cursor = document.createElement("span");
  cursor.className = "elt-ai-typing-cursor";
  el.appendChild(cursor);
  const interval = setInterval(() => {
    if (i < text.length) {
      el.innerHTML = text.slice(0, ++i) + '<span class="elt-ai-typing-cursor"></span>';
    } else {
      el.innerHTML = text;
      clearInterval(interval);
      if (onDone) onDone();
    }
  }, 18);
}

function aiSendMessage(question) {
  if (!question.trim()) return;
  if (!state.aiChat) state.aiChat = [];

  // Add user message
  state.aiChat.push({ role: "user", text: question });
  saveState();

  // Re-render to show user message + typing dots
  const messagesEl = document.getElementById("elt-ai-messages");
  if (!messagesEl) return;

  // Append user bubble
  const userDiv = document.createElement("div");
  userDiv.className = "elt-ai-msg elt-ai-msg-user";
  userDiv.innerHTML = `<div class="elt-ai-msg-avatar">Вы</div><div class="elt-ai-msg-bubble">${question}</div>`;
  messagesEl.appendChild(userDiv);

  // Typing indicator
  const typingDiv = document.createElement("div");
  typingDiv.className = "elt-ai-msg elt-ai-msg-bot";
  typingDiv.id = "elt-ai-typing";
  typingDiv.innerHTML = `<div class="elt-ai-msg-avatar">✦</div><div class="elt-ai-msg-bubble"><div class="elt-ai-typing-dots"><span></span><span></span><span></span></div></div>`;
  messagesEl.appendChild(typingDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Simulate delay then show response
  setTimeout(() => {
    const responseText = getAiMockResponse(question, state);
    const typing = document.getElementById("elt-ai-typing");
    if (typing) {
      const bubble = typing.querySelector(".elt-ai-msg-bubble");
      if (bubble) aiTypingEffect(bubble, responseText, () => {
        state.aiChat.push({ role: "bot", text: responseText });
        saveState();
      });
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, 900);

  // Clear input
  const inp = document.getElementById("elt-ai-input");
  if (inp) { inp.value = ""; inp.style.height = "auto"; }
}

document.addEventListener("click", (event) => {
  // Send button
  if (event.target.closest("#elt-ai-send")) {
    const inp = document.getElementById("elt-ai-input");
    if (inp) aiSendMessage(inp.value);
    return;
  }
  // Quick question buttons
  const quick = event.target.closest("[data-ai-quick]")?.dataset.aiQuick;
  if (quick) {
    aiSendMessage(quick);
    return;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && event.target.matches("#elt-ai-input")) {
    event.preventDefault();
    aiSendMessage(event.target.value);
  }
});

// Auto-resize textarea
document.addEventListener("input", (event) => {
  if (event.target.matches("#elt-ai-input")) {
    event.target.style.height = "auto";
    event.target.style.height = Math.min(event.target.scrollHeight, 100) + "px";
  }
});
