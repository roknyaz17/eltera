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

// Форма теста по токену ссылки (вопросы конкретного теста — без баллов/red flags).
export function fetchAssessmentForm(token) {
  return getJSON(`/assess/${token}`);
}

// Отправить ответы по токену; бэкенд считает баллы и закрывает воронку.
export function submitAssessment(token, payload) {
  return postJSON(`/assess/${token}/submit`, payload);
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

export function fetchEmployeeStats() {
  return getJSON(`/employees/stats`);
}

export function fetchEmployee(personId) {
  return getJSON(`/employees/${personId}`);
}

// Записать результат оценки сотрудника (обновляет fit).
export function recordEmployeeResult(personId, payload) {
  return postJSON(`/employees/${personId}/result`, payload);
}

export function fetchOrgTree() {
  return getJSON(`/structure`);
}

// Список тестов/профилей (для мастера «Создать оценку»).
export function fetchTests() {
  return getJSON(`/tests`);
}

// --- Конструктор тестов ---

export function fetchTest(testId) {
  return getJSON(`/tests/${testId}`);
}

export function createTest(payload) {
  return postJSON(`/tests`, payload);
}

export function addQuestion(testId, payload) {
  return postJSON(`/tests/${testId}/questions`, payload);
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
