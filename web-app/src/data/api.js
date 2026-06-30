// Клиент бэкенда Eltera (FastAPI).
// База API настраивается через window.ELTERA_API_BASE, иначе localhost:8000.

export const API_BASE =
  (typeof window !== "undefined" && window.ELTERA_API_BASE) ||
  "http://localhost:8000/api";

// ── Токены (localStorage) ───────────────────────────────────────────────────
const TOKENS_KEY = "eltera_tokens";
export function getTokens() {
  try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || "null"); } catch { return null; }
}
export function setTokens(t) {
  if (t && t.access_token) localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
  else localStorage.removeItem(TOKENS_KEY);
}
export function clearTokens() { localStorage.removeItem(TOKENS_KEY); }

let _refreshing = null;
function doRefresh() {
  const t = getTokens();
  if (!t || !t.refresh_token) return Promise.resolve(false);
  if (!_refreshing) {
    _refreshing = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: t.refresh_token }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setTokens({ access_token: d.access_token, refresh_token: d.refresh_token }); return true; } clearTokens(); return false; })
      .catch(() => { clearTokens(); return false; })
      .finally(() => { _refreshing = null; });
  }
  return _refreshing;
}

function onAuthFail() {
  clearTokens();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("eltera-logout"));
}

// Базовый запрос: подставляет Bearer, при 401 — один refresh и повтор.
async function rawFetch(path, opts = {}, isRetry = false) {
  const t = getTokens();
  const headers = { ...(opts.headers || {}) };
  if (t && t.access_token) headers.Authorization = `Bearer ${t.access_token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401 && !isRetry && !path.startsWith("/auth/")) {
    const ok = await doRefresh();
    if (ok) return rawFetch(path, opts, true);
    onAuthFail();
  }
  return res;
}

async function getJSON(path) {
  const res = await rawFetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function postJSON(path, body) {
  const res = await rawFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function patchJSON(path, body) {
  const res = await rawFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// ── Аутентификация ──────────────────────────────────────────────────────────
async function authRequest(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* 204 */ }
  if (!res.ok) {
    const msg = (data && data.detail) || `Ошибка ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Ошибка авторизации");
  }
  return data;
}
export function authLogin(email, password) { return authRequest("/auth/login", { email, password }); }
export function authRegister(payload) { return authRequest("/auth/register", payload); }
export function authVerifyLogin(payload) { return authRequest("/auth/login/verify", payload); }
export function authVerifyRegister(payload) { return authRequest("/auth/register/verify", payload); }
export function authResendLogin(payload) { return authRequest("/auth/login/resend", payload); }
export function authResendRegister(payload) { return authRequest("/auth/register/resend", payload); }
export function authForgotPassword(email) { return authRequest("/auth/password/forgot", { email }); }
export function authVerifyReset(payload) { return authRequest("/auth/password/verify", payload); }
export function authResetPassword(payload) { return authRequest("/auth/password/reset", payload); }
export async function authLogout() {
  const t = getTokens();
  if (t && t.refresh_token) {
    try { await authRequest("/auth/logout", { refresh_token: t.refresh_token }); } catch { /* ignore */ }
  }
  clearTokens();
}
export function authMe() { return getJSON("/auth/me"); }

// Публичный GET без токена (каталог тарифов, статус регистрационного платежа).
async function getPublic(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  let data = null;
  try { data = await res.json(); } catch { /* пусто */ }
  if (!res.ok) {
    const msg = (data && data.detail) || `Ошибка ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Ошибка запроса");
  }
  return data;
}

// ── Регистрация: шаг 3 — выбор тарифа и оплата ───────────────────────────────
// Каталог тарифов (публичный): цены и состав берём с сервера.
export function fetchTariffs() { return getPublic("/auth/tariffs"); }
// Создать платёж за тариф по registration-токену (выданному на шаге verify).
export function registerCheckout(payload) { return authRequest("/auth/register/checkout", payload); }
// Демо/тест: подтвердить оплату тарифа без провайдера.
export function registerCheckoutSimulate(paymentId) {
  return authRequest(`/auth/register/checkout/${paymentId}/simulate`, {});
}
// Поллинг статуса оплаты тарифа; после оплаты вернёт { paid, tokens: {...} }.
export function registerCheckoutStatus(paymentId) {
  return getPublic(`/auth/register/checkout/${paymentId}/status`);
}

// ── Профиль организации (вкладка «Настройки») ────────────────────────────────
export function fetchOrganization() { return getJSON("/organization"); }
export function updateOrganization(payload) { return patchJSON("/organization", payload); }

// Частичное обновление кандидата (например, смена этапа воронки).
export function updateCandidate(personId, payload) {
  return patchJSON(`/candidates/${personId}`, payload);
}

// Создать кандидата (Person + candidate_profile).
export function createCandidate(payload) {
  return postJSON(`/candidates`, payload);
}

// Перевести кандидата в сотрудники (создаёт employee_profile, удаляет candidate_profile).
export function convertCandidateToEmployee(personId, payload) {
  return postJSON(`/candidates/${personId}/convert`, payload);
}

// Записать результат прохождения теста кандидатом.
export function recordCandidateResult(personId, payload) {
  return postJSON(`/candidates/${personId}/result`, payload);
}

// Зарегистрировать ссылку-приглашение (для метрики «Оценка отправлена»).
export function createLink(payload) {
  return postJSON(`/links`, payload);
}

// Список оценочных ссылок (для вкладки «Оценки»).
export function fetchLinks() {
  return getJSON(`/links`);
}

// Реестр отчётов — все завершённые сессии оценки (вкладка «Отчёты»).
export function fetchReports() {
  return getJSON(`/reports`);
}

// Форма теста по токену ссылки (вопросы конкретного теста — без баллов/red flags).
export function fetchAssessmentForm(token) {
  return getJSON(`/assess/${token}`);
}

// Отправить ответы по токену; бэкенд считает баллы и закрывает воронку.
export function submitAssessment(token, payload) {
  return postJSON(`/assess/${token}/submit`, payload);
}

// URL Excel-шаблона импорта кандидатов (генерируется бэкендом).
export function candidateImportTemplateUrl() {
  return `${API_BASE}/candidates/import/template`;
}

// Импорт кандидатов из Excel (multipart). Возвращает сводку created/skipped/errors.
export async function importCandidates(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await rawFetch(`/candidates/import`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = `API /candidates/import → ${res.status}`;
    try { const j = await res.json(); if (j.detail) detail = j.detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

// Список кандидатов (по умолчанию — по убыванию процента, до 100 шт.).
export function fetchCandidates(params = {}) {
  const query = new URLSearchParams({
    size: "100",
    sort_by: "percent",
    order: "desc",
    ...params
  }).toString();
  return getJSON(`/candidates?${query}`);
}

// KPI и распределения для верхней части вкладки.
export function fetchCandidateStats() {
  return getJSON(`/candidates/stats`);
}

// Тепловая карта: вакансии × источники.
export function fetchCandidateHeatmap() {
  return getJSON(`/candidates/heatmap`);
}

// PDF-отчёт по кандидату: тянем blob с Bearer-токеном и открываем во вкладке.
// Нельзя просто window.open(url) — новая вкладка не отправит Authorization → 401.
export async function openCandidatePdf(personId) {
  const res = await rawFetch(`/candidates/${personId}/report`, {
    headers: { Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`API /candidates/${personId}/report → ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank");
  // Отдаём память чуть позже, чтобы вкладка успела загрузить blob.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Ответы кандидата (вопросы + выбранные варианты + баллы).
export function fetchCandidateAnswers(personId) {
  return getJSON(`/candidates/${personId}/answers`);
}

// Карточка кандидата (детали + результат оценки).
export function fetchCandidate(personId) {
  return getJSON(`/candidates/${personId}`);
}

// --- Сотрудники и структура ---

export function fetchEmployees(params = {}) {
  const query = new URLSearchParams({ size: "100", ...params }).toString();
  return getJSON(`/employees?${query}`);
}

// URL Excel-шаблона импорта (генерируется бэкендом — единый источник колонок).
export function employeeImportTemplateUrl() {
  return `${API_BASE}/employees/import/template`;
}

// Импорт сотрудников из Excel (multipart). Возвращает сводку: created/skipped/errors.
export async function importEmployees(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await rawFetch(`/employees/import`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = `API /employees/import → ${res.status}`;
    try { const j = await res.json(); if (j.detail) detail = j.detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

export function fetchEmployeeStats() {
  return getJSON(`/employees/stats`);
}

export function fetchEmployee(personId) {
  return getJSON(`/employees/${personId}`);
}

// Создать сотрудника (Person + employee_profile). Отдел/руководитель — по имени.
export function createEmployee(payload) {
  return postJSON(`/employees`, payload);
}

// ИИ-ассистент: отправить историю сообщений, получить {reply, action}.
export function assistantChat(messages) {
  return postJSON(`/assistant/chat`, { messages });
}


// Все оценки сотрудника по каждому тесту + средний балл.
export function fetchEmployeeAssessments(personId) {
  return getJSON(`/employees/${personId}/assessments`);
}

// Ответы сотрудника по конкретной оценке (сессии).
export function fetchEmployeeSessionAnswers(personId, sessionId) {
  return getJSON(`/employees/${personId}/answers/${sessionId}`);
}

// Сводный отчёт 360 по сотруднику (самооценка vs внешняя).
export function fetchEmployee360(personId) {
  return getJSON(`/employees/${personId}/360`);
}

// Адаптация: таймлайн циклов и ручной запуск рассылки дозревших опросов.
export function fetchAdaptationCycles() {
  return getJSON(`/adaptation/cycles`);
}
export function runAdaptationDue() {
  return postJSON(`/adaptation/run-due`, {});
}
export function fetchAdaptationAlerts() {
  return getJSON(`/adaptation/alerts`);
}
export function startAdaptation(personIds) {
  return postJSON(`/adaptation/start`, { person_ids: personIds });
}

// Поддержка: отправить обращение в Telegram (сообщение зависит от типа).
export function sendSupportTicket(payload) {
  return postJSON(`/support/ticket`, payload);
}

// Главная: агрегированная сводка (KPI + лента внимания + события + ближайшие чек-ины).
export function fetchOverview() {
  return getJSON(`/overview`);
}

// HeadHunter: статус подключения, старт OAuth, вакансии, отключение.
export function fetchHhStatus() {
  return getJSON(`/hh/status`);
}
// Старт OAuth: авторизованный запрос (Bearer уходит в заголовке через getJSON),
// возвращает authorize URL hh.ru — браузер редиректим на него уже из JS.
export function startHhConnect() {
  return getJSON(`/hh/connect`);
}
export function fetchHhVacancies() {
  return getJSON(`/hh/vacancies`);
}
export function hhDisconnect() {
  return postJSON(`/hh/disconnect`, {});
}

// Вкладка «Вакансии»: реальные метрики/KPI из локальной БД (наполняется HH),
// импорт и синхронизация. period — '7d' | '14d' | '30d'.
export function fetchVacancyKpi(period = "7d") {
  return getJSON(`/vacancies/kpi?period=${encodeURIComponent(period)}`);
}
export function fetchVacancyDrill(card, period = "7d") {
  return getJSON(`/vacancies/kpi/${encodeURIComponent(card)}?period=${encodeURIComponent(period)}`);
}
export function importHhVacancies(externalIds) {
  return postJSON(`/vacancies/import/hh`, { external_ids: externalIds });
}
export function syncHhVacancies() {
  return postJSON(`/vacancies/sync/hh`, {});
}
export function fetchVacancyResponses(vacancyId, period = "7d") {
  return getJSON(`/vacancies/${vacancyId}/responses?period=${encodeURIComponent(period)}`);
}
export function fetchVacancyCandidates(vacancyId, fitOnly = false) {
  return getJSON(`/vacancies/${vacancyId}/candidates?fit=${fitOnly ? "true" : "false"}`);
}
export function fetchVacancyFunnel(vacancyId, period = "7d") {
  return getJSON(`/vacancies/${vacancyId}/funnel?period=${encodeURIComponent(period)}`);
}
// Тесты для назначения, дефолтный тест вакансии и конвертация отклика в кандидата.
export function fetchAssessmentTests() {
  return getJSON(`/vacancies/tests`);
}
export function setVacancyDefaultTest(vacancyId, testId) {
  return patchJSON(`/vacancies/${vacancyId}/default-test`, { test_id: testId || null });
}
export function convertResponse(vacancyId, eventId, testId) {
  return postJSON(`/vacancies/${vacancyId}/responses/${eventId}/convert`, { test_id: testId || null });
}

// Центр уведомлений: список + счётчик непрочитанных.
export function fetchNotifications() {
  return getJSON(`/notifications`);
}
// Отметить уведомления прочитанными (все или по списку id).
export function markNotificationsRead({ ids = [], all = false } = {}) {
  return postJSON(`/notifications/read`, { ids, all });
}

// ── Реферальная программа ─────────────────────────────────────────────────────
// Сводка: код ссылки, баланс бонусов, приглашённые компании, операции, заявки.
export function fetchReferrals() {
  return getJSON(`/referrals`);
}
// Потратить бонусы на докупку `count` оценок.
export function spendReferralBonuses(count) {
  return postJSON(`/referrals/spend`, { count });
}
// Создать заявку на вывод бонусов на карту.
export function createReferralWithdrawal(payload) {
  return postJSON(`/referrals/withdraw`, payload);
}
// Уведомить о собственной оплате — начисляет бонус пригласившему реферу.
export function recordReferralPayment(amount) {
  return postJSON(`/referrals/payment`, { amount });
}

// ── Биллинг: пополнение баланса оценок через провайдера Монета ────────────────
// Сводка: текущий баланс, каталог пакетов, флаги конфигурации, история платежей.
export function fetchBilling() {
  return getJSON(`/billing`);
}
// Создать платёж на пополнение выбранным пакетом (+ опциональный промокод).
// Возвращает { payment_id, redirect_url, configured, ... }.
export function createTopup(pack, promoCode) {
  return postJSON(`/billing/topup`, { pack, promo_code: promoCode || null });
}
// Статус платежа (для поллинга после возврата с формы Монеты).
export function fetchPaymentStatus(paymentId) {
  return getJSON(`/billing/payments/${paymentId}`);
}
// Отменить ожидающий платёж (пользователь закрыл окно оплаты).
export function cancelPayment(paymentId) {
  return postJSON(`/billing/payments/${paymentId}/cancel`, {});
}
// Демо/тест: подтвердить оплату без реального провайдера (доступно только когда
// провайдер не настроен или включён тестовый режим — гард на сервере).
export function simulatePayment(paymentId) {
  return postJSON(`/billing/payments/${paymentId}/simulate`, {});
}
// Списать оценки с баланса при отправке приглашения (бэкенд — источник истины).
export function debitBalance(count = 1, reason = "Отправка оценки") {
  return postJSON(`/billing/debit`, { count, reason });
}

// Записать результат оценки сотрудника (обновляет fit).
export function recordEmployeeResult(personId, payload) {
  return postJSON(`/employees/${personId}/result`, payload);
}

export function fetchOrgTree() {
  return getJSON(`/structure`);
}

// Список тестов/профилей (для мастера, конструктора и библиотеки).
// params: { q?, limit?, target_type?, category?: string|string[], level?: string|string[] }.
export function fetchTests(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.target_type) qs.set("target_type", params.target_type);
  const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  arr(params.category).forEach((c) => qs.append("category", c));
  arr(params.level).forEach((l) => qs.append("level", l));
  const suffix = qs.toString();
  return getJSON(`/tests${suffix ? `?${suffix}` : ""}`);
}

// Таксономия библиотеки: { directions[], universal[], levels[] }.
export function fetchTaxonomy() {
  return getJSON(`/tests/taxonomy`);
}

// --- Конструктор тестов ---

export function fetchTest(testId) {
  return getJSON(`/tests/${testId}`);
}

export function createTest(payload) {
  return postJSON(`/tests`, payload);
}

// Импорт базы компетенций/вопросов/профилей из Excel.
export function libraryImportTemplateUrl() {
  return `${API_BASE}/tests/library/template`;
}
export async function importLibrary(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await rawFetch(`/tests/library/import`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = `API /tests/library/import → ${res.status}`;
    try { const j = await res.json(); if (j.detail) detail = j.detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

export function addQuestion(testId, payload) {
  return postJSON(`/tests/${testId}/questions`, payload);
}

// --- Библиотека компетенций ---
export function fetchCompetencies() {
  return getJSON(`/competencies`);
}
export function fetchCompetency(id) {
  return getJSON(`/competencies/${id}`);
}
export function createCompetency(payload) {
  return postJSON(`/competencies`, payload);
}
export function updateCompetency(id, payload) {
  return patchJSON(`/competencies/${id}`, payload);
}
export function deleteCompetency(id) {
  return deleteJSON(`/competencies/${id}`);
}
export function addCompetencyQuestion(id, payload) {
  return postJSON(`/competencies/${id}/questions`, payload);
}
export function deleteCompetencyQuestion(id, qvId) {
  return deleteJSON(`/competencies/${id}/questions/${qvId}`);
}
// Профиль ↔ компетенции
export function addProfileCompetency(testId, competencyId, weight = 1) {
  return postJSON(`/tests/${testId}/competencies`, { competency_id: competencyId, weight });
}
export function removeProfileCompetency(testId, competencyId) {
  return deleteJSON(`/tests/${testId}/competencies/${competencyId}`);
}

async function deleteJSON(path) {
  const res = await rawFetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export function deleteQuestion(testId, questionVersionId) {
  return deleteJSON(`/tests/${testId}/questions/${questionVersionId}`);
}

export function deleteTest(testId) {
  return deleteJSON(`/tests/${testId}`);
}

// Добавить сотрудника/руководителя в структуру.
export function addStructureMember(payload) {
  return postJSON(`/structure/members`, payload);
}
