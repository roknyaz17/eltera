// Клиент бэкенда Eltera (FastAPI).
// База API настраивается через window.ELTERA_API_BASE, иначе localhost:8000.

export const API_BASE =
  (typeof window !== "undefined" && window.ELTERA_API_BASE) ||
  "http://localhost:8000/api";

async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function patchJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// Частичное обновление кандидата (например, смена этапа воронки).
export function updateCandidate(personId, payload) {
  return patchJSON(`/candidates/${personId}`, payload);
}

// Создать кандидата (Person + candidate_profile).
export function createCandidate(payload) {
  return postJSON(`/candidates`, payload);
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
  const res = await fetch(`${API_BASE}/candidates/import`, { method: "POST", body: form });
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

// URL PDF-отчёта по кандидату (открывается в новой вкладке).
export function candidatePdfUrl(personId) {
  return `${API_BASE}/candidates/${personId}/report`;
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
  const res = await fetch(`${API_BASE}/employees/import`, { method: "POST", body: form });
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
export function hhConnectUrl() {
  return `${API_BASE}/hh/connect`;
}
export function fetchHhVacancies() {
  return getJSON(`/hh/vacancies`);
}
export function hhDisconnect() {
  return postJSON(`/hh/disconnect`, {});
}

// Центр уведомлений: список + счётчик непрочитанных.
export function fetchNotifications() {
  return getJSON(`/notifications`);
}
// Отметить уведомления прочитанными (все или по списку id).
export function markNotificationsRead({ ids = [], all = false } = {}) {
  return postJSON(`/notifications/read`, { ids, all });
}

// Записать результат оценки сотрудника (обновляет fit).
export function recordEmployeeResult(personId, payload) {
  return postJSON(`/employees/${personId}/result`, payload);
}

export function fetchOrgTree() {
  return getJSON(`/structure`);
}

// Список тестов/профилей (для мастера «Создать оценку» и конструктора).
// params: { q?: строка поиска по названию, limit?: число, target_type?: строка }.
export function fetchTests(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.target_type) qs.set("target_type", params.target_type);
  const suffix = qs.toString();
  return getJSON(`/tests${suffix ? `?${suffix}` : ""}`);
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
  const res = await fetch(`${API_BASE}/tests/library/import`, { method: "POST", body: form });
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
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
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
