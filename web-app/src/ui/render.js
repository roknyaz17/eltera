import { pageFilterConfig, navConfig } from "../config/dashboard-config.js";
import { filterModel, applyFilters } from "../domain/filtering.js";
import {
  ActionButtonGroup,
  CandidatePreview,
  DashboardPageLayout,
  EmployeePreview,
  StatusBadge,
  VacancyPreview,
  buildNavGroups,
  buildNavItems,
  getConversionStatus,
  getFitStatus,
  getRiskStatus,
  getVacancyHealthStatus,
  employeeAtRisk,
  PremiumDataTable
} from "./dashboard-components.js";
import { setTeamData } from "./team-slice.js";
import { renderPremiumDashboard, kpiCard, funnelChart, barChart, nineBoxGrid } from "./dashboard-premium.js";
import { professionalCompetencies, commonCompetencies } from "../data/assessment-library.js";
import { employeeImportTemplateUrl, candidateImportTemplateUrl, libraryImportTemplateUrl } from "../data/api.js";

// Конфиг модалок импорта (сотрудники / кандидаты) — общий рендер, разные тексты.
const IMPORT_MODALS = {
  "import-employees": {
    title: "Импорт сотрудников",
    columns: "ФИО, Email, Телефон, Должность, Отдел, Руководитель, Проект, Дата выхода, Тип занятости, Город",
    hint: "ФИО — обязательное поле; «Дата выхода» запускает цикл адаптации.",
    templateUrl: employeeImportTemplateUrl,
    runAction: "run-employee-import",
    fileNoun: "сотрудников",
  },
  "import-candidates": {
    title: "Импорт кандидатов",
    columns: "ФИО, Email, Телефон, Вакансия, Источник, Тип подбора, Дата отклика, Город, Комментарий",
    hint: "ФИО — обязательное поле; вакансия создаётся автоматически по названию.",
    templateUrl: candidateImportTemplateUrl,
    runAction: "run-candidate-import",
    fileNoun: "кандидатов",
  },
};

// Слаг компетенции → человекочитаемое название (общие + профессиональные).
const COMPETENCY_LABELS = {
  ...professionalCompetencies,
  ...Object.fromEntries(commonCompetencies.map((c) => [c.id, c.title]))
};
const competencyLabel = (slug) => COMPETENCY_LABELS[slug] || slug;

// Экранирование пользовательского текста (имена/ошибки импорта) перед вставкой в HTML.
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// renderLanding lives in ./landing.js (imported from the Claude Design project
// "Eltera Landing"). Re-exported so existing imports keep working.
export { renderLanding } from "./landing.js";

function renderTariffStep(challenge) {
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
  const tariffs = challenge.tariffs || [];
  const selected = challenge.selectedTariff;
  const cards = tariffs.map((t) => {
    const active = t.key === selected;
    return `
      <button type="button" class="regTariffCard${active ? " active" : ""}" data-pick-tariff="${escapeHtml(t.key)}">
        <div class="regTariffHead">
          <span class="regTariffName">${escapeHtml(t.name)}</span>
          <span class="regTariffPrice">${fmt(t.price)} ₽</span>
        </div>
        <div class="regTariffAudience">${escapeHtml(t.audience)}</div>
        <div class="regTariffMeta">
          <span>${fmt(t.assessments)} оценок</span>
          <span>${fmt(t.tokens)} токенов</span>
        </div>
      </button>`;
  }).join("");
  const sel = tariffs.find((t) => t.key === selected);
  const payLabel = challenge.status === "paying"
    ? "Готовим оплату…"
    : (sel ? `Оплатить ${fmt(sel.price)} ₽` : "Выберите тариф");
  const disabled = !sel || challenge.status === "paying" ? "disabled" : "";
  return `
    <div class="modalBackdrop">
      <div class="modal authChallengeModal regTariffModal">
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-head-icon">💳</span>
            <h2 class="modal-head-title">Выберите тариф</h2>
          </div>
          <button type="button" class="modal-close-btn" data-auth-challenge-close title="Закрыть">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-inner">
          <p class="modal-subtitle">Почта подтверждена. Выберите тариф — после оплаты создадим аккаунт и зачислим токены.</p>
          <div class="regTariffGrid">${cards}</div>
          <button class="authSubmitBtn" type="button" data-register-pay ${disabled}>${payLabel}</button>
          ${challenge.error ? `<div class="authError">${escapeHtml(challenge.error)}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderPayingStep(challenge) {
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
  const pay = challenge.payment || {};
  const waiting = !challenge.error;
  return `
    <div class="modalBackdrop">
      <div class="modal authChallengeModal regPayingModal">
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-head-icon">⏳</span>
            <h2 class="modal-head-title">Ожидаем подтверждение оплаты</h2>
          </div>
          <button type="button" class="modal-close-btn" data-auth-challenge-close title="Закрыть">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-inner">
          <p class="modal-subtitle">
            ${waiting
              ? `Тариф <b>${escapeHtml(pay.tariff || "")}</b> · ${fmt(pay.amount)} ₽. Как только оплата подтвердится, мы создадим аккаунт и откроем кабинет.`
              : "Оплата не подтверждена."}
          </p>
          ${waiting ? `<div class="regPayingSpinner" aria-hidden="true"></div>` : ""}
          ${challenge.error
            ? `<div class="authError">${escapeHtml(challenge.error)}</div>
               <button class="authSubmitBtn" type="button" data-register-pay>Повторить оплату</button>`
            : ""}
          <button type="button" class="authLink authChallengeClose" data-auth-challenge-close>Отменить</button>
        </div>
      </div>
    </div>
  `;
}

function renderAuthChallenge(challenge) {
  if (!challenge) return "";
  const isRegister = challenge.mode === "register";
  // Шаги регистрации после кода: выбор тарифа и ожидание оплаты.
  if (isRegister && challenge.step === "tariff") return renderTariffStep(challenge);
  if (isRegister && challenge.step === "paying") return renderPayingStep(challenge);
  const title = isRegister ? "Подтвердите email" : "Введите код из письма";
  const emailPill = `<span class="authChallengeEmail">${escapeHtml(challenge.email)}</span>`;
  const subtitle = isRegister
    ? `Мы отправили 6-значный код на ${emailPill} — введите его, чтобы завершить регистрацию.`
    : `Мы отправили 6-значный код на ${emailPill} — введите его, чтобы войти в кабинет.`;
  const resendLabel = challenge.status === "resending" ? "Отправляем…" : "Отправить код ещё раз";
  const submitLabel = challenge.status === "verifying" ? "Проверяем…" : "Подтвердить";
  return `
    <div class="modalBackdrop">
      <form class="modal authChallengeModal" data-auth-challenge-form>
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-head-icon">✉️</span>
            <h2 class="modal-head-title">${title}</h2>
          </div>
          <button type="button" class="modal-close-btn" data-auth-challenge-close title="Закрыть">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-inner">
          <p class="modal-subtitle">${subtitle}</p>
          <div class="authChallengeField">
            <label class="authLabel">Код из письма</label>
            <input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="authInput authChallengeInput" placeholder="123456" required>
          </div>
          <div class="authChallengeActions">
            <button type="button" class="button subtle" data-auth-challenge-resend>${resendLabel}</button>
            <button class="authSubmitBtn" type="submit">${submitLabel}</button>
          </div>
          <button type="button" class="authLink authChallengeClose" data-auth-challenge-close>Вернуться к форме</button>
          ${challenge.error ? `<div class="authError">${escapeHtml(challenge.error)}</div>` : ""}
        </div>
      </form>
    </div>
  `;
}

function renderPasswordReset(pr) {
  if (!pr) return "";
  const emailPill = pr.email ? `<span class="authChallengeEmail">${escapeHtml(pr.email)}</span>` : "вашу почту";
  const errorBox = pr.error ? `<div class="authError">${escapeHtml(pr.error)}</div>` : "";

  let title = "Сброс пароля";
  let inner = "";

  if (pr.step === "request") {
    const submitLabel = pr.status === "sending" ? "Отправляем…" : "Получить код";
    inner = `
      <form class="modal authChallengeModal" data-reset-request-form>
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-head-icon">🔑</span>
            <h2 class="modal-head-title">${title}</h2>
          </div>
          <button type="button" class="modal-close-btn" data-reset-close title="Закрыть">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-inner">
          <p class="modal-subtitle">Укажите email аккаунта — мы отправим 6-значный код для смены пароля.</p>
          <div class="authChallengeField">
            <label class="authLabel">Email</label>
            <input name="email" type="email" value="${escapeHtml(pr.email || "")}" placeholder="name@company.ru" autocomplete="email" class="authInput" required>
          </div>
          <div class="authChallengeActions">
            <button class="authSubmitBtn" type="submit">${submitLabel}</button>
          </div>
          <button type="button" class="authLink authChallengeClose" data-reset-close>Вернуться ко входу</button>
          ${errorBox}
        </div>
      </form>`;
  } else if (pr.step === "code") {
    const resendLabel = pr.status === "resending" ? "Отправляем…" : "Отправить код ещё раз";
    const submitLabel = pr.status === "verifying" ? "Проверяем…" : "Подтвердить код";
    inner = `
      <form class="modal authChallengeModal" data-reset-code-form>
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-head-icon">✉️</span>
            <h2 class="modal-head-title">Введите код из письма</h2>
          </div>
          <button type="button" class="modal-close-btn" data-reset-close title="Закрыть">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-inner">
          <p class="modal-subtitle">Если аккаунт с адресом ${emailPill} существует, мы отправили на него 6-значный код.</p>
          <div class="authChallengeField">
            <label class="authLabel">Код из письма</label>
            <input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="authInput authChallengeInput" placeholder="123456" required>
          </div>
          <div class="authChallengeActions">
            <button type="button" class="button subtle" data-reset-resend>${resendLabel}</button>
            <button class="authSubmitBtn" type="submit">${submitLabel}</button>
          </div>
          <button type="button" class="authLink authChallengeClose" data-reset-close>Вернуться ко входу</button>
          ${errorBox}
        </div>
      </form>`;
  } else {
    const submitLabel = pr.status === "saving" ? "Сохраняем…" : "Сохранить пароль";
    inner = `
      <form class="modal authChallengeModal" data-reset-newpass-form>
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-head-icon">🔒</span>
            <h2 class="modal-head-title">Новый пароль</h2>
          </div>
          <button type="button" class="modal-close-btn" data-reset-close title="Закрыть">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-inner">
          <p class="modal-subtitle">Код подтверждён. Задайте новый пароль для ${emailPill}.</p>
          <div class="authChallengeField">
            <label class="authLabel">Новый пароль</label>
            <input name="password" type="password" placeholder="Минимум 6 символов" autocomplete="new-password" class="authInput" required minlength="6">
          </div>
          <div class="authChallengeField">
            <label class="authLabel">Повторите пароль</label>
            <input name="password_confirm" type="password" placeholder="Ещё раз" autocomplete="new-password" class="authInput" required minlength="6">
          </div>
          <div class="authChallengeActions">
            <button class="authSubmitBtn" type="submit">${submitLabel}</button>
          </div>
          ${errorBox}
        </div>
      </form>`;
  }

  return `<div class="modalBackdrop">${inner}</div>`;
}

export function renderLogin(state = {}, opts = {}) {
  const invited = Boolean(state.refCode);
  // Вкладка регистрации открыта по умолчанию, если пришли по приглашению
  // или явно с экрана «Попробовать».
  const registerDefault = invited || Boolean(opts.register);
  return `
    <div class="authPage">
      <div class="authBg" aria-hidden="true"><canvas class="matrixCanvas loginMatrix"></canvas></div>
      <section class="authBrand">
        <img src="/assets/eltera_logo_horizontal_on_dark.svg?v=5" alt="Eltera">
        <h1><span class="authGradientText">Интеллект в оценке.</span><br><span class="authWhiteText">Уверенность в решениях.</span></h1>
        <p>Разберётесь за 5 минут. Первая оценка — за 1 минуту. Без инструкций и долгого обучения.</p>
      </section>
      <div class="authCard glass">
        ${invited ? `<div class="authRefBanner">🎁 Вы регистрируетесь по приглашению. Создайте аккаунт, чтобы начать.</div>` : ``}
        <div class="authPill">
          <div class="authPillInner">
            <button class="authPillBtn ${registerDefault ? '' : 'active'}" data-auth-tab="login">Войти</button>
            <button class="authPillBtn ${registerDefault ? 'active' : ''}" data-auth-tab="register">Зарегистрироваться</button>
          </div>
        </div>

        <!-- Форма входа -->
        <div class="authFormWrap ${registerDefault ? '' : 'open'}" data-auth-panel="login">
        <form data-login-form>
          <div class="authInputGroup">
            <label class="authLabel">Email или телефон</label>
            <input name="email" type="text" placeholder="name@company.ru или +7..." autocomplete="username" class="authInput">
          </div>
          <div class="authInputGroup">
            <label class="authLabel">Пароль</label>
            <input name="password" type="password" placeholder="Введите пароль" autocomplete="current-password" class="authInput">
            <a href="#" class="authForgot" data-forgot-password>Забыли пароль?</a>
          </div>
          <button class="authSubmitBtn" type="submit">Войти в кабинет</button>
          <p class="authHint">Нет аккаунта? <a href="#" class="authLink" data-switch-tab="register">Зарегистрироваться</a></p>
        </form>
        </div>

        <!-- Форма регистрации -->
        <div class="authFormWrap ${registerDefault ? 'open' : ''}" data-auth-panel="register">
        <form data-register-form>
          <div class="authInputRow">
            <div class="authInputGroup">
              <label class="authLabel">Имя</label>
              <input name="firstName" type="text" placeholder="Иван" class="authInput" required>
            </div>
            <div class="authInputGroup">
              <label class="authLabel">Фамилия</label>
              <input name="lastName" type="text" placeholder="Петров" class="authInput" required>
            </div>
          </div>
          <div class="authInputRow">
            <div class="authInputGroup">
              <label class="authLabel">Название компании</label>
              <input name="company" type="text" placeholder="ООО Ромашка" class="authInput" required>
            </div>
            <div class="authInputGroup">
              <label class="authLabel">ИНН компании</label>
              <input name="inn" type="text" inputmode="numeric" placeholder="10 или 12 цифр" class="authInput">
            </div>
          </div>
          <div class="authInputRow">
            <div class="authInputGroup">
              <label class="authLabel">Телефон</label>
              <input name="phone" type="tel" inputmode="tel" placeholder="+7 900 000-00-00" autocomplete="tel" class="authInput">
            </div>
            <div class="authInputGroup">
              <label class="authLabel">Email</label>
              <input name="contact" type="email" placeholder="name@company.ru" autocomplete="email" class="authInput" required>
            </div>
          </div>
          <div class="authInputRow">
            <div class="authInputGroup">
              <label class="authLabel">Должность</label>
              <input name="position" type="text" placeholder="HR-менеджер" class="authInput">
            </div>
            <div class="authInputGroup">
              <label class="authLabel">Размер компании</label>
              <div class="authSelectWrap">
                <select name="companySize" class="authInput authSelect">
                  <option value="" disabled selected>Выберите размер</option>
                  <option value="1–10">1–10 человек</option>
                  <option value="10–50">10–50 человек</option>
                  <option value="50–100">50–100 человек</option>
                  <option value="от 100">от 100 человек</option>
                </select>
                <svg class="authSelectChevron" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
          </div>
          <div class="authInputGroup">
            <label class="authLabel">Пароль</label>
            <input name="password" type="password" placeholder="Минимум 8 символов" class="authInput" required minlength="6">
          </div>
          <label class="authCheckbox">
            <input type="checkbox" name="agree" required>
            <span>Согласен на <a href="#" class="authLink">обработку персональных данных</a></span>
          </label>
          <button class="authSubmitBtn" type="submit">Создать аккаунт</button>
          <p class="authHint">Уже есть аккаунт? <a href="#" class="authLink" data-switch-tab="login">Войти</a></p>
        </form>
        </div>
      </div>
      ${renderAuthChallenge(state.authChallenge)}
      ${renderPasswordReset(state.passwordReset)}
    </div>
  `;
}

// ─── Глобальный поиск (топбар) ───────────────────────────────────────────────
// Клиентский поиск по уже загруженным сотрудникам, кандидатам и разделам.
// Данные подгружаются лениво контроллером в app.js при первом вводе.
export function computeSearchResults(state, rawQ) {
  const q = (rawQ || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const employees = [];
  const candidates = [];
  const sections = [];
  (state.employeesApi || []).forEach((e) => {
    const hay = [e.fullName, e.position, e.department, e.project].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) {
      employees.push({
        kind: "employee", id: e.id, title: e.fullName || "Без имени",
        subtitle: [e.position, e.department].filter((x) => x && x !== "—").join(" · ")
      });
    }
  });
  (state.candidatesApi || []).forEach((c) => {
    const p = c.person || {};
    const hay = [p.fullName, c.vacancy, p.email, p.city].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) {
      candidates.push({
        kind: "candidate", id: c.id, title: p.fullName || "Без имени",
        subtitle: ["Кандидат", c.vacancy].filter((x) => x && x !== "—").join(" · ")
      });
    }
  });
  navConfig.forEach((item) => {
    if (item.wip) return;
    if ((item.label || "").toLowerCase().includes(q)) {
      sections.push({ kind: "nav", id: item.id, title: item.label, subtitle: "Перейти в раздел" });
    }
  });
  return [...employees.slice(0, 6), ...candidates.slice(0, 6), ...sections.slice(0, 4)];
}

function searchKindIcon(kind) {
  if (kind === "nav") return `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 3h8v8H3z" stroke="currentColor" stroke-width="1.2" opacity=".7"/><path d="M5.5 7h3M7 5.5v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  if (kind === "candidate") return `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.2" stroke="currentColor" stroke-width="1.2"/><path d="M3 11.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  return `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="10" cy="5" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 11.5c0-1.9 1.5-3.4 3.5-3.4M9 8.1c2 0 3.5 1.5 3.5 3.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}

function renderGlobalSearch(state) {
  const s = state.search || { q: "", open: false };
  const q = s.q || "";
  const hasQuery = q.trim().length >= 2;
  const results = hasQuery ? computeSearchResults(state, q) : [];
  const showDrop = Boolean(s.open && hasQuery);
  let drop = "";
  if (showDrop) {
    drop = results.length
      ? `<div class="elt-search-drop">${results.map((r) => `
          <button class="elt-search-item" data-search-go="${escapeHtml(r.id)}" data-search-kind="${r.kind}">
            <span class="elt-search-item-ic">${searchKindIcon(r.kind)}</span>
            <span class="elt-search-item-text">
              <span class="elt-search-item-title">${escapeHtml(r.title || "")}</span>
              ${r.subtitle ? `<span class="elt-search-item-sub">${escapeHtml(r.subtitle)}</span>` : ""}
            </span>
          </button>`).join("")}</div>`
      : `<div class="elt-search-drop"><div class="elt-search-empty">Ничего не найдено</div></div>`;
  }
  return `
    <div class="elt-search-wrap${showDrop ? " open" : ""}">
      <svg class="elt-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"/><line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      <input class="elt-search" data-global-search autocomplete="off" placeholder="Поиск по людям, вакансиям и отчетам" value="${escapeHtml(q)}">
      ${q ? `<button class="elt-search-clear" data-search-clear aria-label="Очистить">×</button>` : ""}
      ${drop}
    </div>`;
}

export function renderAppShell(state, content) {
  const counts = navCounts(state);
  const navGroups = buildNavGroups(state, counts);
  const isDark = state.theme !== "light";
  return `
    <div class="appShell ${isDark ? "darkTheme" : "lightTheme"}">
      <aside class="elt-sidebar">
        <div class="elt-sidebar-logo">
          <img src="${isDark ? "/assets/eltera_logo_horizontal_mono_white.svg?v=1" : "/assets/eltera_logo_horizontal_mono_dark.svg?v=1"}" alt="Eltera" class="elt-logo-img">
        </div>
        <nav class="elt-sidenav">
          ${navGroups.map((group) => `
            <div class="elt-nav-group">
              <span class="elt-nav-group-label">${group.label}</span>
              ${group.items.map((item) => eltNavItem(item, state.view)).join("")}
            </div>
          `).join("")}
        </nav>
        <div class="elt-sidebar-footer">
          <button class="elt-nav-item elt-tariff-nav" data-open-tariff-picker>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="opacity:.5"><rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M5 8h6M5 5h6M5 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            <span class="elt-tariff-nav-label">Тариф</span>
            <span class="elt-tariff-nav-name">${state.company.tariff}</span>
          </button>
        </div>
      </aside>
      <div class="appMain">
        <header class="elt-topbar">
          <div class="elt-topbar-left">
          </div>
          <div class="elt-topbar-center">
            ${renderGlobalSearch(state)}
          </div>
          <div class="elt-topbar-right">
            <div class="elt-balance-pill">
              <span class="elt-balance-label">Баланс токенов</span>
              <strong class="elt-balance-value">${state.company.balance}</strong>
            </div>
            <button class="elt-btn-topbar" data-action="top-up">Пополнить</button>
            <button class="elt-btn-topbar elt-btn-topbar-primary" data-action="create-link">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              Создать оценку
            </button>
            <button class="elt-icon-btn" title="Переключить тему" data-action="toggle-theme">
              ${isDark
                ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 8.5A5.5 5.5 0 0 1 5.5 2a5.5 5.5 0 1 0 6.5 6.5z" fill="currentColor" opacity=".8"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" fill="currentColor"/><line x1="7" y1="1" x2="7" y2="2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="7" y1="11.5" x2="7" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="1" y1="7" x2="2.5" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="11.5" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`
              }
            </button>
            <div class="elt-notif-wrap">
              <button class="elt-icon-btn elt-notif-btn${state.notifPanelOpen ? " active" : ""}" title="Уведомления" data-action="toggle-notifications">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a4 4 0 0 1 4 4v2.5l1 1.5H2l1-1.5V5.5a4 4 0 0 1 4-4z" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".85"/><path d="M5.5 11.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".7"/></svg>
                ${state.notifUnread > 0 ? `<span class="elt-notif-badge">${state.notifUnread > 99 ? "99+" : state.notifUnread}</span>` : ""}
              </button>
              ${state.notifPanelOpen ? renderNotifPanel(state) : ""}
            </div>
            <div class="elt-account elt-account-top">
              <button class="elt-avatar-btn" title="Профиль" data-oc-avatar="ceo" style="padding:0;overflow:hidden">
                ${(state.employeePhotos || {})['ceo'] ? `<img class="oc-avatar-img" src="${(state.employeePhotos || {})['ceo']}" alt="Профиль" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : 'РК'}
              </button>
              ${state.user && state.user.email ? `<span class="elt-account-email" title="${escapeHtml(state.user.email)}">${escapeHtml(state.user.email)}</span>` : ""}
              <button class="elt-account-logout" data-action="logout" title="Выйти из аккаунта" aria-label="Выйти из аккаунта">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 2H3v12h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
        </header>
        <main class="appContent">${content}${renderModal(state)}${renderKebabPopover(state)}${renderAssistant(state)}</main>
      </div>
    </div>
  `;
}

// ─── ИИ-ассистент (виджет в правом нижнем углу) ──────────────────────────────
export const ASSISTANT_GREETING = "eltera-ai v1.0 — ассистент по людям и оценкам\nготов. спросите, например: кто в зоне риска?";
const ASST_BOT_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M2 13v2M22 13v2"/></svg>`;
const ASST_SEND_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
const ASST_CHIPS = [
  "Консультация по сотруднику",
  "Подобрать компетенции",
  "Как пользоваться платформой?",
  "Открой раздел кандидатов",
];

const ASST_PROP_LABELS = {
  candidate: { head: "Добавить кандидата", fields: { full_name: "ФИО", email: "Email", phone: "Телефон", vacancy_title: "Вакансия" } },
  employee: { head: "Добавить сотрудника", fields: { full_name: "ФИО", email: "Email", position: "Должность", department_name: "Отдел", manager_name: "Руководитель", project: "Проект", start_date: "Дата выхода" } },
};

function renderAssistantProposal(m, i) {
  const p = m.proposal;
  const cfg = ASST_PROP_LABELS[p.entity] || ASST_PROP_LABELS.candidate;
  const rows = Object.entries(cfg.fields)
    .filter(([k]) => (p.params[k] || "").toString().trim())
    .map(([k, lab]) => `<div class="elt-asst-prop-row"><span>${lab}</span><b>${escapeHtml(p.params[k])}</b></div>`)
    .join("");
  let footer;
  if (p.status === "busy") footer = `<div class="elt-asst-prop-status">Добавляю…</div>`;
  else if (p.status === "done") footer = `<div class="elt-asst-prop-status ok">✓ Добавлено</div>`;
  else if (p.status === "cancelled") footer = `<div class="elt-asst-prop-status">Отменено</div>`;
  else footer = `<div class="elt-asst-prop-actions">
      ${p.status === "error" ? `<span class="elt-asst-prop-status err">Ошибка, попробуйте ещё раз</span>` : ""}
      <button type="button" data-assistant-confirm="${i}">Подтвердить</button>
      <button type="button" class="ghost" data-assistant-cancel="${i}">Отмена</button>
    </div>`;
  return `<div class="elt-asst-msg bot">
    ${m.content ? escapeHtml(m.content) : ""}
    <div class="elt-asst-prop-card">
      <div class="elt-asst-prop-head">${cfg.head}</div>
      ${rows || `<div class="elt-asst-prop-row"><span>—</span></div>`}
      ${footer}
    </div>
  </div>`;
}

const ELT_AI_LOGO = `<img class="elt-asst-fab-logo" src="/assets/eltera_symbol_on_dark.svg" alt="AI" width="30" height="30">`;

function renderAssistant(state) {
  const a = state.assistant || {};
  const open = a.open;
  const fab = `<button class="elt-asst-fab${open ? " open" : ""}" data-assistant-toggle aria-label="AI-ассистент">${open ? "✕" : ELT_AI_LOGO}</button>`;
  if (!open) return `<div class="elt-asst">${fab}</div>`;

  const msgs = a.messages || [];
  const greetDone = a.greetingAnimated;
  const greet = `<div class="elt-asst-msg bot" id="elt-asst-greeting">${greetDone ? escapeHtml(ASSISTANT_GREETING) : ""}</div>`;
  const bubbles = msgs.map((m, i) =>
    m.proposal
      ? renderAssistantProposal(m, i)
      : `<div class="elt-asst-msg ${m.role === "user" ? "user" : "bot"}">${escapeHtml(m.content)}</div>`
  ).join("");
  const dots = a.busy ? `<div class="elt-asst-msg bot elt-asst-dots"><span></span><span></span><span></span></div>` : "";
  const showChips = !msgs.some((m) => m.role === "user");
  const chips = showChips
    ? `<div class="elt-asst-chips">${ASST_CHIPS.map((c) => `<button type="button" class="elt-asst-chip" data-assistant-chip="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div>`
    : "";

  return `<div class="elt-asst open">
    ${fab}
    <div class="elt-asst-panel elt-asst-term">
      <div class="elt-asst-head">
        <span class="elt-asst-term-title">eltera-ai — терминал</span>
        <button class="elt-asst-x" data-assistant-toggle aria-label="Закрыть">✕</button>
      </div>
      <div class="elt-asst-body" id="elt-asst-body">${greet}${bubbles}${dots}</div>
      ${chips}
      <form class="elt-asst-input" data-assistant-form>
        <span class="elt-asst-prompt">&gt;</span>
        <input name="msg" placeholder="Спросите AI…" autocomplete="off" ${a.busy ? "disabled" : ""}>
        <span class="elt-asst-cur"></span>
        <button type="submit" aria-label="Отправить" ${a.busy ? "disabled" : ""}>${ASST_SEND_SVG}</button>
      </form>
    </div>
  </div>`;
}

const NOTIF_ICON = {
  assessment_completed: "✓",
  adaptation_risk: "⚠",
  adaptation_missed: "✕",
  new_employee: "+",
  new_candidate: "+",
  adaptation_started: "▶",
};

function renderNotifPanel(state) {
  const items = state.notifications || [];
  const loading = state.notifStatus === "loading" && !items.length;
  const body = loading
    ? `<div class="elt-notif-empty">Загрузка…</div>`
    : items.length
      ? items.map((n) => `
        <button class="elt-notif-item${n.read ? "" : " unread"}" data-notif-open="${n.id}"${n.target_view ? ` data-notif-view="${n.target_view}"` : ""}${n.target_id ? ` data-notif-target="${n.target_id}"` : ""}>
          <span class="elt-notif-sev sev-${n.severity}">${NOTIF_ICON[n.kind] || "•"}</span>
          <span class="elt-notif-item-body">
            <span class="elt-notif-item-title">${escapeHtml(n.title)}</span>
            ${n.subtitle ? `<span class="elt-notif-item-sub">${escapeHtml(n.subtitle)}</span>` : ""}
            <span class="elt-notif-item-time">${_formatRelTime(n.event_at)}</span>
          </span>
          ${n.read ? "" : `<span class="elt-notif-unread-dot"></span>`}
        </button>`).join("")
      : `<div class="elt-notif-empty">Новых уведомлений нет 👌</div>`;

  return `
    <div class="elt-notif-backdrop" data-action="close-notifications"></div>
    <div class="elt-notif-panel">
      <div class="elt-notif-panel-head">
        <h3>Уведомления${state.notifUnread > 0 ? ` <span class="elt-notif-count">${state.notifUnread}</span>` : ""}</h3>
        ${state.notifUnread > 0 ? `<button class="elt-notif-readall" data-action="notif-mark-all">Прочитать все</button>` : ""}
      </div>
      <div class="elt-notif-list">${body}</div>
    </div>`;
}

function eltNavItem(item, activeView) {
  const isActive = activeView === item.id;
  if (item.wip) {
    return `<button
      class="elt-nav-item elt-nav-wip"
      disabled
      aria-disabled="true"
      title="${item.label} — в разработке"
    >
      <span class="elt-nav-icon">${item.icon}</span>
      <span class="elt-nav-label">${item.label}</span>
      <span class="elt-wip-badge">В разработке</span>
    </button>`;
  }
  return `<button
    class="elt-nav-item${isActive ? " active" : ""}${item.locked ? " locked" : ""}"
    data-view="${item.id}"
    title="${item.label}"
  >
    <span class="elt-nav-icon">${item.icon}</span>
    <span class="elt-nav-label">${item.label}</span>
    ${item.count !== null && item.count !== undefined ? `<span class="elt-nav-count">${item.count}</span>` : ""}
    ${item.alertCount ? `<span class="elt-nav-alert">${item.alertCount}</span>` : ""}
    ${item.locked ? `<span class="elt-nav-lock"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2" y="4.5" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.1" fill="none" opacity=".6"/><path d="M3.5 4.5V3a1.5 1.5 0 0 1 3 0v1.5" stroke="currentColor" stroke-width="1.1" fill="none" opacity=".6"/></svg></span>` : ""}
  </button>`;
}

export function renderDashboard(state, filters) {
  return renderPremiumDashboard(
    state,
    dashboardData,
    candidateHeatmap,
    attentionItems,
    peopleTableConfig,
    aiAccess,
    statusForLabel,
    pageFilterConfig
  );
}

// ────────────────────────────── ГЛАВНАЯ (Overview) ──────────────────────────
// Единая сводка по всем разделам платформы. Данные приходят одним запросом
// GET /overview (см. app/services/overview.py).

const OVERVIEW_EVENT_ICON = {
  assessment_completed: "✓",
  new_employee: "+",
  new_candidate: "+",
  adaptation_started: "▶",
  cycle_completed: "★",
};
const OVERVIEW_EVENT_COLOR = {
  assessment_completed: "#22C55E",
  new_employee: "#5B8CFF",
  new_candidate: "#5B8CFF",
  adaptation_started: "#7C5CFF",
  cycle_completed: "#F59E0B",
};
const OVERVIEW_ATTENTION_COLOR = { high: "#F87171", medium: "#F59E0B", low: "#5B8CFF" };

function _formatRelTime(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Math.floor((Date.now() - t) / 60000);
  if (diff < 1) return "только что";
  if (diff < 60) return `${diff} мин назад`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} д назад`;
  return new Date(t).toLocaleDateString("ru-RU");
}

function _formatDueDate(iso, daysUntil) {
  if (daysUntil < 0) return `просрочено · ${Math.abs(daysUntil)} дн`;
  if (daysUntil === 0) return "сегодня";
  if (daysUntil === 1) return "завтра";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// Иконка-заголовок панели (как в премиум-дашборде).
function _ovPanelIcon(path) {
  return `<svg width="15" height="15" viewBox="0 0 15 15" fill="none">${path}</svg>`;
}

// Мини-спарклайн для карточек факторов «Пульса» (порт из dashboard.dc.html).
function _ovSpark(color, pts) {
  const w = 72, h = 22;
  const mx = Math.max(...pts), mn = Math.min(...pts), rg = (mx - mn) || 1;
  const d = pts.map((v, i) => `${(i / (pts.length - 1) * w).toFixed(1)},${(h - ((v - mn) / rg) * h).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" style="flex:none"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// «Пульс компании» — полноширинная панель наверху аналитики «Главной».
// Порт 1-в-1 из Claude Design (dashboard.dc.html): кольцо индекса здоровья +
// 4 фактора со спарклайнами + разворачиваемый вклад в индекс + живая лента.
// Индекс, факторы, спарклайны и лента приходят с бэкенда (ov.pulse) — кольцо и
// тикер оживляет initPulse в pulse.js, читая данные из data-атрибутов панели.
function pulsePanel(pulse) {
  const factors = Array.isArray(pulse.factors) ? pulse.factors : [];

  // Пусто = данных для пульса ещё нет (нет пройденных оценок / циклов адаптации):
  // все факторы по нулям и индекс 0. Тогда вместо «сломанного» кольца с нулём и
  // пустой колонки факторов показываем спокойную заглушку.
  const hasData = factors.some(
    (f) => Number(f.value) || (Array.isArray(f.spark) && f.spark.some((v) => v))
  ) || Number(pulse.index) > 0;

  const panelHeadHtml = `
      <div class="elt-panel-head">
        <div class="elt-panel-head-left">${_ovPanelIcon('<path d="M1.5 7.5h2.5l1.5-4 2.5 8 1.5-4h2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>')}<h2>Пульс компании</h2></div>
        <span class="elt-panel-caption ov-pulse-live">● в реальном времени</span>
      </div>`;

  if (!hasData) {
    return `
    <article class="elt-panel elt-wide ov-pulse ov-pulse-empty" id="pulsePanel">
      ${panelHeadHtml}
      <div class="ov-empty">Пульс появится, когда накопятся данные — после первых пройденных оценок и запущенных циклов адаптации.</div>
    </article>`;
  }

  const factorsHtml = factors.map((f) => {
    const pts = Array.isArray(f.spark) && f.spark.length ? f.spark : [0, 0];
    const val = Number.isInteger(f.value) ? f.value : Math.round(f.value);
    return `
    <div class="ov-pulse-factor">
      <div class="ov-pulse-factor-head">
        <span class="ov-pulse-factor-label">${escapeHtml(f.label)}</span>
        <span class="ov-pulse-factor-delta" style="color:${escapeHtml(f.color)}">${escapeHtml(f.delta)}</span>
      </div>
      <div class="ov-pulse-factor-main">
        <b class="ov-pulse-factor-val">${val}${escapeHtml(f.unit || "")}</b>
        ${_ovSpark(f.color, pts)}
      </div>
    </div>`;
  }).join("");

  const tickerJson = escapeHtml(JSON.stringify(pulse.ticker || []));
  return `
    <article class="elt-panel elt-wide ov-pulse" id="pulsePanel"
      data-pulse-index="${Number(pulse.index) || 0}" data-pulse-ticker="${tickerJson}">
      ${panelHeadHtml}
      <div class="ov-pulse-body">
        <div class="ov-pulse-ring" id="pulseRingWrap"></div>
        <div class="ov-pulse-factors">${factorsHtml}</div>
      </div>
      <div class="ov-pulse-break" id="pulseBreak" style="display:none">${escapeHtml(pulse.breakdown || "")}</div>
      <div class="ov-pulse-ticker" id="pulseTicker"></div>
    </article>`;
}

export function renderOverview(state) {
  const status = state.overviewStatus || "idle";
  const ov = state.overview;

  if (!ov) {
    const message = status === "error"
      ? "Не удалось загрузить сводку — API не отвечает. Откройте другие разделы или попробуйте позже."
      : "Загружаем сводку…";
    return `<section class="elt-dashboard ov">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Главная</span>
          <h1 class="elt-dash-title">Обзор HR-платформы</h1>
          <p class="elt-dash-subtitle">${message}</p>
        </div>
      </header>
    </section>`;
  }

  const { candidates: c, employees: e, adaptation: a, attention, events, upcoming_adaptation: upcoming } = ov;

  // ── KPI-плитки (премиум-вид с иконками) ──
  const kpiCards = [
    { label: "Кандидатов всего", value: c.total, caption: `${c.assessment_sent} оценок отправлено`, status: "neutral", iconName: "candidates", target: "Кандидаты:Кандидатов всего" },
    { label: "Подходят", value: c.fit, caption: c.avg_percent ? `${Math.round(c.avg_percent)}% средний балл` : "под профиль", status: c.fit > 0 ? "good" : "neutral", iconName: "fit", target: "Кандидаты:Подходят", trend: c.assessment_passed ? `из ${c.assessment_passed} оценок` : "" },
    { label: "Зависли", value: c.stuck, caption: "кандидаты без движения", status: c.stuck > 0 ? "bad" : "good", iconName: "active", target: "Кандидаты:Зависли" },
    { label: "Сотрудников", value: e.total, caption: `${e.not_assessed} ещё не оценены`, status: "neutral", iconName: "employees", target: "Сотрудники:Сотрудников всего" },
    { label: "Средний балл", value: `${Math.round(e.avg_fit)}%`, caption: "соответствие должности", status: e.avg_fit >= 70 ? "good" : e.avg_fit >= 50 ? "medium" : "bad", iconName: "completed", target: "Сотрудники:Сотрудников всего" },
    { label: "В зоне риска", value: e.at_risk, caption: "сотрудники · нужен ИПР", status: e.at_risk > 0 ? "bad" : "good", iconName: "risk", target: "Сотрудники:В зоне риска" },
    { label: "Циклов адаптации", value: a.active_cycles, caption: `${a.completed_cycles} завершено`, status: "neutral", iconName: "chart", target: "Адаптация:Активные циклы" },
    { label: "Алерты адаптации", value: a.at_risk, caption: a.due_now ? `${a.due_now} опросов дозрели` : "риски и пропуски", status: a.at_risk > 0 ? "bad" : a.due_now > 0 ? "medium" : "good", iconName: "balance", target: "Адаптация:В зоне риска" },
  ];

  // ── Воронка подбора (реальные данные) ──
  const funnelItems = [
    { label: "Кандидаты", value: c.total, target: "Кандидаты:Кандидатов всего" },
    { label: "Оценку прошли", value: c.assessment_passed, target: "Кандидаты:Оценка пройдена" },
    { label: "Подходят", value: c.fit, target: "Кандидаты:Подходят" },
  ];

  // ── Состояние адаптации (бары) ──
  const adaptationBars = [
    { label: "Активные циклы", value: a.active_cycles, status: "neutral" },
    { label: "Готовы к рассылке", value: a.due_now, status: a.due_now > 0 ? "medium" : "good" },
    { label: "Ждут прохождения", value: a.sent_pending, status: "neutral" },
    { label: "Алерты", value: a.at_risk, status: a.at_risk > 0 ? "bad" : "good" },
  ];

  // ── Сотрудники: оценка (бары) ──
  const employeeBars = [
    { label: "Оценены", value: e.assessed, status: "good" },
    { label: "Не оценены", value: e.not_assessed, status: "medium" },
    { label: "В зоне риска", value: e.at_risk, status: "bad" },
  ];

  // ── Лента «Требует внимания» ──
  const attentionHtml = attention.length
    ? attention.map((it) => {
        const color = OVERVIEW_ATTENTION_COLOR[it.severity] || "#5B8CFF";
        const tgt = it.target_filter
          ? `data-open-list="${escapeHtml(it.target_filter)}"`
          : it.target_view ? `data-view="${escapeHtml(it.target_view)}"` : "";
        return `<button class="ov-att" ${tgt}>
          <span class="ov-att-dot" style="background:${color}"></span>
          <div class="ov-att-body">
            <div class="ov-att-title">${escapeHtml(it.title)}</div>
            ${it.subtitle ? `<div class="ov-att-sub">${escapeHtml(it.subtitle)}</div>` : ""}
          </div>
          <span class="ov-att-arrow">→</span>
        </button>`;
      }).join("")
    : `<div class="ov-empty">Ничего срочного 👌</div>`;

  // ── Лента «Последние события» ──
  const eventsHtml = events.length
    ? events.map((ev) => {
        const color = OVERVIEW_EVENT_COLOR[ev.kind] || "#8C9BB5";
        const ic = OVERVIEW_EVENT_ICON[ev.kind] || "•";
        const tgt = ev.target_view ? `data-view="${escapeHtml(ev.target_view)}"` : "";
        return `<button class="ov-event" ${tgt}>
          <span class="ov-event-icon" style="background:${color}22;color:${color}">${ic}</span>
          <div class="ov-event-body">
            <div class="ov-event-title">${escapeHtml(ev.title)}</div>
            ${ev.subtitle ? `<div class="ov-event-sub">${escapeHtml(ev.subtitle)}</div>` : ""}
          </div>
          <span class="ov-event-time">${_formatRelTime(ev.at)}</span>
        </button>`;
      }).join("")
    : `<div class="ov-empty">Событий пока не было.</div>`;

  // ── Ближайшие чек-ины адаптации ──
  const upcomingHtml = upcoming.length
    ? upcoming.slice(0, 8).map((u) => {
        const overdue = u.days_until < 0;
        const today = u.days_until === 0;
        const stageShort = (u.stage || "").replace("Адаптация · ", "");
        return `<button class="ov-up ${overdue ? "overdue" : today ? "today" : ""}" data-open-card="${u.person_id}">
          <div class="ov-up-day">${u.offset_days}д</div>
          <div class="ov-up-body">
            <div class="ov-up-name">${escapeHtml(u.full_name)}</div>
            <div class="ov-up-stage">${escapeHtml(stageShort)} · ${escapeHtml(u.status === "sent" ? "отправлен" : "запланирован")}</div>
          </div>
          <div class="ov-up-due">${_formatDueDate(u.due_date, u.days_until)}</div>
        </button>`;
      }).join("")
    : `<div class="ov-empty">Ближайших опросов нет.</div>`;

  const panelHead = (iconPath, title, caption) => `
    <div class="elt-panel-head">
      <div class="elt-panel-head-left">${_ovPanelIcon(iconPath)}<h2>${title}</h2></div>
      ${caption ? `<span class="elt-panel-caption">${caption}</span>` : ""}
    </div>`;

  return `<section class="elt-dashboard ov">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">HR-аналитика · ${state.company.tariff}</span>
        <h1 class="elt-dash-title">Что происходит сегодня</h1>
        <p class="elt-dash-subtitle">${c.total + e.total} человек в системе · ${a.active_cycles} активных цикла адаптации · ${attention.length} требует внимания</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-ghost" data-action="add-candidate">+ Кандидат</button>
        <button class="elt-btn-ghost" data-action="add-structure-member">+ Сотрудник</button>
        <button class="elt-btn-ghost" data-action="import-employees">Импорт</button>
        <button class="elt-btn-primary" data-action="open-assess-wizard">Создать оценку</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      ${pulsePanel(ov.pulse || {})}

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<path d="M2 2h11l-4 5v5l-3-2V7L2 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>', "Воронка подбора", "кандидаты")}
        ${funnelChart(funnelItems)}
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<rect x="1.5" y="4" width="12" height="9" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.2"/>', "Сотрудники: оценка", "срез базы")}
        ${barChart(employeeBars)}
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 4v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', "Состояние адаптации", "циклы и опросы")}
        ${barChart(adaptationBars)}
      </article>

      <article class="elt-panel elt-chart-panel">
        <div class="elt-panel-head">
          <div class="elt-panel-head-left">${_ovPanelIcon('<path d="M7.5 1.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.7 5.8l4-.6z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>')}<h2>Требует внимания</h2></div>
          <span class="elt-panel-badge">${attention.length}</span>
        </div>
        <div class="ov-att-list">${attentionHtml}</div>
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 4.5v3l2 1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', "Последние события", "")}
        <div class="ov-events-list">${eventsHtml}</div>
      </article>

      <article class="elt-panel elt-chart-panel elt-wide">
        ${panelHead('<rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="1.5" y1="5.5" x2="13.5" y2="5.5" stroke="currentColor" stroke-width="1"/><line x1="4.5" y1="1" x2="4.5" y2="4" stroke="currentColor" stroke-width="1.2"/><line x1="10.5" y1="1" x2="10.5" y2="4" stroke="currentColor" stroke-width="1.2"/>', "Ближайшие опросы адаптации", "ближайшие 14 дней")}
        <div class="ov-up-list">${upcomingHtml}</div>
      </article>
    </section>
  </section>`;
}

export function renderPeople(state) {
  const candidates = state.sessions.filter((item) => item.person.assessmentType === "Кандидат");
  const employees = state.employees;
  return `
    <section class="pageHead"><div><span class="miniLabel">Кандидаты и сотрудники</span><h1>Отдельная HR-аналитика по людям</h1><p>Кандидаты — как мини ATS-дэшборд. Сотрудники — риски, удовлетворенность, соответствие должности и развитие.</p></div><button class="blueButton" data-action="create-link">Добавить оценку</button></section>
    <div class="filterBar compact"><button class="active">Период: 30 дней</button><button>Вакансия</button><button>Источник</button><button>Статус</button><button>Тип подбора</button><button>Ответственный</button><button>Результат оценки</button></div>
    <section class="kpiGrid smart">${kpi("Кандидатов всего", candidates.length + 128, "+24 за период")}${kpi("Прошли оценку", candidates.length, "готовы отчеты")}${kpi("Подходят", candidates.filter((x) => x.result.percent >= 68).length + 24, "под профиль")}${kpi("Интервью", 21, "дошли до этапа")}${kpi("Оффер", 7, "получили оффер")}${kpi("Сотрудники в риске", employees.filter((x) => x.fit < 70).length, "нужен ИПР")}</section>
    <section class="dashboardGrid">
      <article class="panel chartPanel"><div class="panelHead"><h2>Кандидаты</h2><span>источники и вакансии</span></div>${renderPeopleTable(candidates)}</article>
      <article class="panel chartPanel"><div class="panelHead"><h2>Сотрудники</h2><span>риски и развитие</span></div>${renderEmployeeTable(employees)}</article>
      <article class="panel chartPanel widePanel"><div class="panelHead"><h2>Структура компании</h2><span>отдел → руководитель → сотрудники</span></div><div class="orgTree">${state.departments.map((dept) => `<div class="orgNode"><b>${dept.name}</b><span>${dept.employees} сотрудников · руководитель: ${dept.head}</span><em>${dept.risk} в зоне риска</em><div><button class="button subtle">Открыть</button><button class="button subtle">Запустить оценку</button><button class="button subtle">360</button></div></div>`).join("") || `<div class="emptyState"><b>Нет данных</b><span>Отделы пока не добавлены.</span></div>`}</div></article>
    </section>
  `;
}

export function renderCandidates(state) {
  // Только данные из API. Пока идёт загрузка или при ошибке — нули, без демо-чисел.
  const EMPTY_STATS = {
    total: 0, assessment_sent: 0, assessment_passed: 0, fit: 0, conditional: 0,
    not_fit: 0, interview: 0, accepted: 0, stuck: 0, avg_percent: 0,
    by_source: [], by_stage: [], by_vacancy: [], attention: []
  };
  const ready = Boolean(state.candidateStats && state.candidatesApi);
  const failed = state.candidatesStatus === "error";
  const stats = ready ? state.candidateStats : EMPTY_STATS;
  const candidates = ready ? state.candidatesApi : [];
  const fit = candidates
    .filter((item) => item.assessed && item.result.percent >= 68)
    .sort((a, b) => b.result.percent - a.result.percent);

  const subtitle = failed
    ? "API недоступен — данные не загружены"
    : ready
      ? `Данные из API · ${stats.total} кандидатов`
      : "Загрузка данных из API…";

  const conversion = stats.assessment_sent
    ? Math.round((stats.assessment_passed / stats.assessment_sent) * 100)
    : 0;

  const kpiCards = [
    { label: "Всего кандидатов", value: stats.total, caption: "в базе", status: "neutral", target: "Кандидаты:Кандидатов всего", iconName: "candidates" },
    { label: "Оценка отправлена", value: stats.assessment_sent, caption: "сгенерировано ссылок", status: "medium", target: "Кандидаты:Оценка отправлена", iconName: "link" },
    { label: "Оценку прошли", value: stats.assessment_passed, caption: "готовы отчеты", status: getConversionStatus(conversion), target: "Кандидаты:Оценка пройдена", iconName: "completed" },
    { label: "Подходят", value: stats.fit, caption: "под профиль", status: "good", target: "Кандидаты:Подходят", iconName: "fit" },
    { label: "Условно подходят", value: stats.conditional, caption: "нужна проверка", status: "medium", target: "Кандидаты:Условно подходят", iconName: "balance" },
    { label: "Не подходят", value: stats.not_fit, caption: "низкий балл", status: "bad", target: "Кандидаты:Не подходит", iconName: "risk" },
    { label: "На интервью", value: stats.interview, caption: "следующий этап", status: "good", target: "Кандидаты:Интервью", iconName: "interview" },
    { label: "Приняты", value: stats.accepted, caption: "выход", status: "neutral", target: "Кандидаты:Принят", iconName: "completed" },
    { label: "Зависли", value: stats.stuck, caption: "нет движения", status: "bad", target: "Кандидаты:Зависли", iconName: "active" }
  ];

  const sourceItems = stats.by_source.map((s) => [s.source, s.count]);

  const funnelItems = [
    ["Всего", stats.total],
    ["Оценку прошли", stats.assessment_passed],
    ["Подходят", stats.fit],
    ["Интервью", stats.interview],
    ["Приняты", stats.accepted]
  ].map(([label, value]) => ({ label, value, target: `Кандидаты:${label}` }));

  // ── Разметка премиум (портирована из Claude Design — candidates.dc.html) ──
  const panelHead = (svg, title, caption) => `
    <div class="elt-panel-head">
      <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none">${svg}</svg><h2>${title}</h2></div>
      ${caption ? `<span class="elt-panel-caption">${caption}</span>` : ""}
    </div>`;
  const fitBadge = (pct) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:11.5px;font-weight:800;color:#4ADE80;"><span style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#166534,#4ADE80);"></span>fit ${pct}%</span>`;

  const bestHtml = fit.length
    ? fit.slice(0, 6).map((item) => {
        const name = item.person.fullName;
        const role = (item.person && item.person.position) || item.vacancyTitle || "кандидат";
        return `<button class="gp-row" data-open-card="${item.id}">
          <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(name)}</b><br><span>${escapeHtml(role)}</span></div>
          ${fitBadge(item.result.percent)}
        </button>`;
      }).join("")
    : `<div class="ov-empty">${ready ? "Сильных кандидатов пока нет." : "Загрузка кандидатов…"}</div>`;

  // Воронка/источники — barChart со статусами по строкам (как в макете).
  const FUNNEL_STATUS = ["neutral", "medium", "good", "good", "good"];
  const funnelBars = funnelItems.map((f, i) => ({ label: f.label, value: f.value, status: FUNNEL_STATUS[i] || "good", target: f.target }));
  const sourceBars = sourceItems
    .slice()
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, status: i === 0 ? "good" : "neutral" }));

  const kpiCards8 = kpiCards.filter((k) => k.label !== "Приняты");

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Подбор</span>
        <h1 class="elt-dash-title">Кандидаты</h1>
        <p class="elt-dash-subtitle">${escapeHtml(failed ? subtitle : "Воронка подбора, источники и результаты оценки")}</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-ghost" data-action="add-candidate">+ Кандидат</button>
        <button class="elt-btn-ghost" data-action="import-candidates">Импорт</button>
        <button class="elt-btn-ghost" data-open-filters="candidates">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards8.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel">
        ${panelHead('<path d="M2 2h11l-4 5v5l-3-2V7L2 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>', "Воронка кандидатов", "конверсия")}
        ${barChart(funnelBars)}
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<rect x="1.5" y="4" width="12" height="9" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.2"/>', "Источники откликов", "30 дней")}
        ${barChart(sourceBars)}
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<path d="M7.5 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6L1.3 5.3l3.6-.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>', "Лучшие кандидаты", "по fit-профилю")}
        <div class="gp-list">${bestHtml}</div>
      </article>
    </section>

    <article class="elt-panel" id="caPanel" style="margin-top:16px">
      <div class="elt-panel-head">
        <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 4.3v6.4M6 6c0-.8.7-1.2 1.5-1.2S9 5.3 9 6c0 .9-1.5 1-1.5 1.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg><h2>Стоимость привлечения</h2></div>
        <div id="caPeriods" style="display:flex;gap:8px"></div>
      </div>
      <div id="caBanner"></div>
      <div id="caHero"></div>
    </article>
  </section>`;
}

const EMPTY_EMP_STATS = {
  total: 0, high_result: 0, medium_result: 0, low_result: 0, at_risk: 0,
  burnout: 0, avg_satisfaction: 0, avg_fit: 0, by_department: [], by_risk: []
};

export function renderEmployees(state) {
  const ready = Boolean(state.employeeStats && state.employeesApi);
  const failed = state.employeesStatus === "error";
  const s = ready ? state.employeeStats : EMPTY_EMP_STATS;
  const employees = ready ? state.employeesApi : [];
  const risky = employees.filter(employeeAtRisk);

  const subtitle = failed
    ? "API недоступен — данные не загружены"
    : ready
      ? `Данные из API · ${s.total} сотрудников`
      : "Загрузка данных из API…";

  const kpiCards = [
    { label: "Всего сотрудников", value: s.total, caption: "в базе", status: "neutral", target: "Сотрудники:Сотрудников всего", iconName: "employees" },
    { label: "Высокий результат", value: s.high_result, caption: "80%+", status: "good", target: "Сотрудники:Высокий результат", iconName: "fit" },
    { label: "Средний результат", value: s.medium_result, caption: "60–79%", status: "medium", target: "Сотрудники:Средний результат", iconName: "chart" },
    { label: "Низкий результат", value: s.low_result, caption: "ниже 60%", status: "bad", target: "Сотрудники:Низкий результат", iconName: "risk" },
    { label: "В зоне риска", value: s.at_risk, caption: "требуют внимания", status: "bad", target: "Сотрудники:В зоне риска", iconName: "risk" },
    { label: "Выгорание", value: s.burnout, caption: "признаки", status: "medium", target: "Сотрудники:Выгорание", iconName: "balance" },
    { label: "Средний балл", value: `${s.avg_fit}%`, caption: "соответствие", status: getFitStatus(s.avg_fit), target: "Сотрудники:Сотрудников всего", iconName: "completed" },
    { label: "Удовлетворённость", value: `${s.avg_satisfaction}%`, caption: "средняя", status: "medium", target: "Сотрудники:Удовлетворенность", iconName: "completed" }
  ];

  // ── Данные виджета «Срез команды» (отделы + списки) из реальных сотрудников ──
  const tup = (e, sub) => [e.fullName, sub !== undefined ? sub : (e.department || ""), e.fit == null ? 0 : e.fit, e.id];
  const assessed = employees.filter((e) => e.fit != null);
  const byDept = {};
  employees.forEach((e) => { const d = e.department || "Без отдела"; (byDept[d] = byDept[d] || []).push(e); });
  const D = Object.entries(byDept).map(([n, list]) => {
    const fits = list.map((e) => e.fit).filter((v) => v != null);
    const f = fits.length ? Math.round(fits.reduce((a, b) => a + b, 0) / fits.length) : 0;
    const r = list.filter(employeeAtRisk).length;
    return { n, c: list.length, f, r, s: f >= 80 ? "good" : f >= 65 ? "medium" : "bad" };
  }).sort((a, b) => b.c - a.c);
  const teamData = {
    D,
    RISK: risky.map((e) => tup(e, e.department || "")),
    BEST: assessed.filter((e) => e.fit >= 80).sort((a, b) => b.fit - a.fit).map((e) => tup(e)),
    MID: assessed.filter((e) => e.fit >= 65 && e.fit < 80).map((e) => tup(e)),
    LOW: assessed.filter((e) => e.fit < 65).map((e) => tup(e)),
    BURN: employees.filter((e) => e.satisfaction > 0 && e.satisfaction < 50).map((e) => tup(e, `${e.department || ""} · признаки выгорания`)),
    ALL: employees.map((e) => tup(e))
  };
  setTeamData(teamData);

  const bestName = teamData.BEST[0] ? teamData.BEST[0][0] : "—";
  const riskName = teamData.RISK[0] ? teamData.RISK[0][0] : "—";

  // «Срез команды» — три плитки. deptTile заполняет виджет (ротация), risk/best — статикой.
  const deptTile = `<article id="deptTile" class="elt-kpi status-medium" style="padding:14px;cursor:pointer">
    <div class="elt-kpi-top"><div class="elt-kpi-icon" id="deptIcon"></div><i class="elt-kpi-dot"></i></div>
    <strong class="elt-kpi-value" id="deptVal">—</strong>
    <div class="elt-kpi-footer"><span class="elt-kpi-label" id="deptName">Отдел</span><span class="elt-kpi-trend" id="deptFit" style="font-weight:800"></span></div>
    <p class="elt-kpi-caption" id="deptCap"></p>
    <div id="deptDots" style="display:flex;gap:5px;margin-top:10px"></div>
  </article>`;
  const riskTile = `<article id="riskTile" class="elt-kpi status-bad" style="padding:14px;cursor:pointer">
    <div class="elt-kpi-top"><div class="elt-kpi-icon">⚠</div><i class="elt-kpi-dot"></i></div>
    <strong class="elt-kpi-value">${s.at_risk}</strong>
    <div class="elt-kpi-footer"><span class="elt-kpi-label">В зоне риска</span><span class="elt-kpi-trend" style="color:#F87171;font-weight:800">срочно</span></div>
    <p class="elt-kpi-caption">${escapeHtml(riskName)}${teamData.RISK.length > 1 ? ` и ещё ${teamData.RISK.length - 1}` : ""} ›</p>
  </article>`;
  const bestTile = `<article id="bestTile" class="elt-kpi status-good" style="padding:14px;cursor:pointer">
    <div class="elt-kpi-top"><div class="elt-kpi-icon">★</div><i class="elt-kpi-dot"></i></div>
    <strong class="elt-kpi-value">${s.high_result}</strong>
    <div class="elt-kpi-footer"><span class="elt-kpi-label">Лучшие сотрудники</span><span class="elt-kpi-trend" style="color:#4ADE80;font-weight:800">80%+</span></div>
    <p class="elt-kpi-caption">${escapeHtml(bestName)}${teamData.BEST.length > 1 ? ` и ещё ${teamData.BEST.length - 1}` : ""} ›</p>
  </article>`;

  // «Риски сотрудников» — AI-вывод + список сотрудников в зоне риска.
  const aiText = riskName !== "—"
    ? `В первую очередь смотрим сотрудников с высоким риском увольнения — ${escapeHtml(riskName)} и зону риска в отделах.`
    : "Сотрудников в зоне риска не выявлено.";
  const riskRows = risky.slice(0, 6).map((e, i) => {
    const hi = e.turnoverRisk === "повышенный" || (e.fit != null && e.fit < 60);
    const dot = hi
      ? `<span class="risk-dot hi" style="width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,#7F1D1D,#F87171)"></span>`
      : `<span class="risk-dot" style="width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,#9A3412,#FACC15)"></span>`;
    return `<button class="risk-row gp-row" data-open-card="${e.id}" style="width:100%;text-align:left;cursor:pointer;animation-delay:${(i * 0.09).toFixed(2)}s">
      ${dot}
      <div style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:12.5px;color:#E6F2FF;font-weight:600">${escapeHtml(e.fullName)}</b><span style="font-size:11px;color:rgba(230,242,255,.5)">${escapeHtml(e.department || "—")} · fit ${fitLabel(e.fit)} · риск увольнения</span></div>
      <span style="color:rgba(230,242,255,.4);font-size:15px;flex:0 0 auto">→</span>
    </button>`;
  }).join("") || `<div class="ov-empty">Рисков не выявлено 👌</div>`;

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Оценка · Риски · Развитие</span>
        <h1 class="elt-dash-title">Сотрудники</h1>
        <p class="elt-dash-subtitle">${escapeHtml(failed ? subtitle : `Оценка, риски и развитие команды · ${s.total} сотрудников`)}</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-ghost" data-action="add-structure-member">+ Сотрудник</button>
        <button class="elt-btn-ghost" data-action="import-employees">Импорт</button>
        <button class="elt-btn-ghost" data-open-filters="employees">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel">
        <div class="elt-panel-head">
          <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4" width="12" height="9" rx="1.3" stroke="currentColor" stroke-width="1.3"/></svg><h2>Срез команды</h2></div>
          <span class="elt-panel-caption">отделы · риск · топ</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">${deptTile}${riskTile}${bestTile}</div>
      </article>

      <article class="elt-panel elt-chart-panel">
        <div class="elt-panel-head">
          <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L14 13.5H1L7.5 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg><h2>Риски сотрудников</h2></div>
          <span class="elt-panel-caption">приоритет</span>
        </div>
        <div style="margin-bottom:10px;padding:13px;border-radius:13px;border:1px solid rgba(124,58,237,.28);background:linear-gradient(150deg, rgba(124,58,237,.14), rgba(0,229,212,.05))">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:10px;font-weight:800;padding:3px 7px;border-radius:6px;background:linear-gradient(135deg,#7C5CFF,#00E5D4);color:#02121A">AI</span><b style="font-size:12.5px;color:#fff">AI-вывод</b></div>
          <p style="margin:0;font-size:12.5px;line-height:1.55;color:#AFC4E4">${aiText}</p>
        </div>
        <div class="gp-list">${riskRows}</div>
      </article>
    </section>

    ${PremiumDataTable(employeesTableConfig(applyFilters("employees", employees, state.activeFilters?.employees)))}
  </section>`;
}

export function renderArchive(state) {
  const status = state.archiveStatus;
  const data = state.archive;
  const items = (data && data.items) || [];

  let listHtml;
  if (status === "loading" || (status !== "error" && !data)) {
    listHtml = `<div class="ov-empty">Загрузка архива…</div>`;
  } else if (status === "error") {
    listHtml = `<div class="ov-empty">Не удалось загрузить архив (бэкенд недоступен).</div>`;
  } else if (!items.length) {
    listHtml = `<div class="ov-empty">Архив пуст — никто не удалён.</div>`;
  } else {
    listHtml = items.map((it) => {
      const kindRu = it.kind === "candidate" ? "Кандидат" : "Сотрудник";
      let when = "";
      if (it.archived_at) { try { when = new Date(it.archived_at).toLocaleDateString("ru-RU"); } catch { when = ""; } }
      return `<div class="gp-row" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)">
        <div style="flex:1 1 0%;min-width:0">
          <b style="display:block;font-size:13px;color:#E6F2FF;font-weight:600">${escapeHtml(it.full_name || "—")}</b>
          <span style="font-size:11px;color:rgba(230,242,255,.5)">${escapeHtml(kindRu)}${it.subtitle ? " · " + escapeHtml(it.subtitle) : ""}${when ? " · в архиве с " + when : ""}</span>
        </div>
        <button class="elt-btn-ghost" data-action="restore-person" data-person-id="${it.id}" data-person-kind="${it.kind}" data-person-name="${escapeHtml(it.full_name || "")}" style="flex:0 0 auto">Восстановить</button>
      </div>`;
    }).join("");
  }

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Мягко удалённые</span>
        <h1 class="elt-dash-title">Архив</h1>
        <p class="elt-dash-subtitle">Скрытые из списков сотрудники и кандидаты. Отчёты и история сохранены — можно восстановить${data && data.total ? ` · ${data.total} в архиве` : ""}.</p>
      </div>
    </header>
    <section class="elt-analytics-grid" style="grid-template-columns:1fr">
      <article class="elt-panel">
        <div class="elt-panel-head">
          <div class="elt-panel-head-left"><h2>В архиве</h2></div>
          <span class="elt-panel-caption">восстановление возвращает во все списки и аналитику</span>
        </div>
        <div class="gp-list" style="display:flex;flex-direction:column;gap:8px;margin-top:6px">${listHtml}</div>
      </article>
    </section>
  </section>`;
}

export function renderStructure(state) {
  // Build org tree from employees + departments
  // CEO is always first, then heads, then employees
  const deptColors = {
    "Отдел продаж": "#1E5BFF",
    "Операционный отдел": "#00E5D4",
    "Контакт-центр": "#F59E0B",
    "Финансы": "#10B981"
  };
  const deptShort = {
    "Отдел продаж": "Продажи",
    "Операционный отдел": "Операции",
    "Контакт-центр": "Контакт-центр",
    "Финансы": "Финансы"
  };

  // Узлы структуры строятся только из API (state.orgTree).
  const allNodes = [];
  if (state.orgTree && Array.isArray(state.orgTree.nodes)) {
    const roleMap = { ceo: "CEO", head: "Head", employee: "Emp" };
    const walk = (n) => {
      allNodes.push({
        id: n.id, fullName: n.full_name, position: n.position || "",
        department: n.department || "", role: roleMap[n.role] || "Emp",
        managerId: n.manager_id || null, fit: n.fit
      });
      (n.children || []).forEach(walk);
    };
    state.orgTree.nodes.forEach(walk);
  }

  // Пустое состояние / загрузка — без мок-данных.
  if (!allNodes.length) {
    const msg = state.structureStatus === "error"
      ? "Структура недоступна — бэкенд не отвечает."
      : state.structureStatus === "ready"
        ? "В структуре пока нет сотрудников. Нажмите «+ Добавить», чтобы создать первого."
        : "Загрузка структуры…";
    return `
      <div class="elt-dashboard">
        <header class="elt-dash-header">
          <div class="elt-dash-header-left">
            <span class="elt-mini-label">СТРУКТУРА КОМПАНИИ</span>
            <h1 class="elt-dash-title">Организационная структура</h1>
            <p class="elt-dash-subtitle">${msg}</p>
          </div>
          <div class="elt-dash-header-actions">
            <button class="elt-btn-primary" data-action="add-structure-member">+ Добавить</button>
          </div>
        </header>
      </div>`;
  }

  const ceo = allNodes.find(n => n.role === "CEO") || allNodes[0];
  const heads = allNodes.filter(n => n.role === "Head");
  const emps = allNodes.filter(n => n.role === "Emp");

  function initials(name) {
    return name.split(" ").slice(0, 2).map(w => w[0]).join("");
  }
  function avatarColor(role) {
    if (role === "CEO") return "linear-gradient(135deg,#1E5BFF,#00E5D4)";
    if (role === "Head") return "linear-gradient(135deg,#00E5D4,#0B8A7E)";
    return "linear-gradient(135deg,#1E3A6E,#2A4A8A)";
  }
  function deptColor(dept) { return deptColors[dept] || "#1E5BFF"; }

  // Get photo from state.employeePhotos map
  function empPhoto(nodeId) {
    return (state.employeePhotos || {})[nodeId] || null;
  }

  // Render avatar: photo if exists, else initials
  function renderAvatar(node, cls) {
    const photo = empPhoto(node.id);
    const bg = avatarColor(node.role);
    if (photo) {
      return `<div class="${cls}" style="background:${bg}" data-oc-avatar="${node.id}"><img class="oc-avatar-img" src="${photo}" alt="${node.fullName}"><div class="oc-avatar-upload-hint">📷</div></div>`;
    }
    return `<div class="${cls}" style="background:${bg}" data-oc-avatar="${node.id}">${initials(node.fullName)}<div class="oc-avatar-upload-hint">📷</div></div>`;
  }

  // Hierarchical list
  function renderListNode(node, depth) {
    const children = allNodes.filter(n => n.managerId === node.id);
    const indent = depth * 28;
    const roleLabel = node.role === "CEO" ? "CEO" : node.role === "Head" ? "Head" : "Emp";
    const roleCls = node.role === "CEO" ? "oc-role-ceo" : node.role === "Head" ? "oc-role-head" : "oc-role-emp";
    return `
      <div class="oc-list-node" style="padding-left:${indent}px" data-oc-select="${node.id}">
        ${depth > 0 ? `<span class="oc-list-connector">└</span>` : ""}
        ${renderAvatar(node, "oc-list-avatar")}
        <div class="oc-list-info">
          <span class="oc-list-name">${node.fullName}</span>
          <span class="oc-list-pos">${node.position}</span>
        </div>
        <span class="oc-role-badge ${roleCls}">${roleLabel}</span>
      </div>
      ${children.map(c => renderListNode(c, depth + 1)).join("")}
    `;
  }

  // Visual org chart card
  function renderChartCard(node) {
    const color = deptColor(node.department);
    const deptLabel = deptShort[node.department] || node.department;
    return `
      <div class="oc-card" data-oc-select="${node.id}">
        ${renderAvatar(node, "oc-card-avatar")}
        <div class="oc-card-name">${node.fullName}</div>
        <div class="oc-card-pos">${node.position}</div>
        <div class="oc-card-dept" style="background:${color}22;color:${color}">${deptLabel}</div>
      </div>
    `;
  }

  const totalPeople = allNodes.length;
  const totalDepts = state.orgTree ? state.orgTree.total_departments : (state.departments || []).length;

  // ── Палитра и иконка отдела ──
  const DEPT_PALETTE = ["#1E5BFF", "#00B8D4", "#7C5CFF", "#10B981", "#F59E0B", "#EC4899", "#0EA5E9", "#84CC16"];
  const deptColorFor = (name) =>
    deptColors[name] || DEPT_PALETTE[[...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % DEPT_PALETTE.length];
  const deptLetter = (name) => (name || "?").trim().charAt(0).toUpperCase();

  // ── Статусы сотрудников (по дате выхода, если есть в employeesApi) ──
  const empById = {};
  (state.employeesApi || []).forEach((e) => { empById[e.id] = e; });
  const daysSince = (d) => { if (!d) return null; const t = Date.parse(d); return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000); };
  const statusOf = (node) => {
    const d = daysSince(empById[node.id]?.startDate);
    return d !== null && d <= 60 ? { label: "Новый сотрудник", cls: "new" } : { label: "Активен", cls: "active" };
  };

  // ── Левый список ──
  const search = (state.structureSearch || "").trim().toLowerCase();
  const listSource = allNodes.filter((n) =>
    !search || `${n.fullName} ${n.position} ${n.department}`.toLowerCase().includes(search)
  );
  const listItems = listSource.map((n) => {
    const st = statusOf(n);
    const color = deptColorFor(n.department);
    return `<button class="oc2-li" data-oc-select="${n.id}">
      ${renderAvatar(n, "oc2-li-av")}
      <div class="oc2-li-main">
        <div class="oc2-li-name">${n.fullName}</div>
        <div class="oc2-li-pos">${n.position || "—"}</div>
        ${n.department ? `<span class="oc2-li-dept" style="background:${color}1a;color:${color}">${n.department}</span>` : ""}
      </div>
      <span class="oc2-li-status ${st.cls}">${st.label}</span>
    </button>`;
  }).join("") || `<div class="oc2-empty">Никого не найдено</div>`;

  // ── Отделы для графа ──
  // Сначала засеиваем реальными отделами из API (чтобы показывались и пустые,
  // и те, где пока только руководитель) — затем раскладываем сотрудников.
  const byDept = {};
  (state.departmentsApi || []).forEach((d) => { byDept[d.name] = []; });
  allNodes.filter((n) => n.id !== ceo.id).forEach((n) => {
    const d = n.department || "Без отдела";
    (byDept[d] = byDept[d] || []).push(n);
  });
  const deptEntries = Object.entries(byDept).sort((a, b) => b[1].length - a[1].length);
  const showAll = Boolean(state.structureAllDepts);
  const VISIBLE_DEPTS = 5;
  const visibleDepts = showAll ? deptEntries : deptEntries.slice(0, VISIBLE_DEPTS);
  const hiddenDepts = deptEntries.length - visibleDepts.length;
  const expanded = state.structureExpandedDepts || [];
  const SHOWN = 3;

  const memberRow = (n) => `
    <button class="oc2-member" data-oc-select="${n.id}">
      ${renderAvatar(n, "oc2-member-av")}
      <div class="oc2-member-main">
        <div class="oc2-member-name">${n.fullName}</div>
        <div class="oc2-member-role">${n.position || "—"}</div>
      </div>
    </button>`;

  const deptCols = visibleDepts.map(([name, nodes]) => {
    const ordered = nodes.slice().sort((a, b) => (a.role === "Head" ? 0 : 1) - (b.role === "Head" ? 0 : 1));
    const isOpen = expanded.includes(name);
    const shown = isOpen ? ordered : ordered.slice(0, SHOWN);
    const extra = ordered.length - shown.length;
    const color = deptColorFor(name);
    return `<div class="oc2-dept">
      <div class="oc2-dept-head">
        <div class="oc2-dept-icon" style="background:${color}">${deptLetter(name)}</div>
        <div><div class="oc2-dept-name">${name}</div><div class="oc2-dept-count">${nodes.length} сотрудников</div></div>
      </div>
      <div class="oc2-dept-members">${shown.map(memberRow).join("")}</div>
      ${extra > 0
        ? `<button class="oc2-dept-more" data-oc-dept-toggle="${name}">Ещё ${extra} сотрудников ▾</button>`
        : isOpen && ordered.length > SHOWN
          ? `<button class="oc2-dept-more" data-oc-dept-toggle="${name}">Свернуть ▴</button>`
          : ""}
    </div>`;
  }).join("");

  const zoom = Math.max(50, Math.min(120, state.structureZoom || 80));
  const ceoStatus = statusOf(ceo);

  const searchIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;

  // ── Разметка премиум-оргчарта (портирована из Claude Design — structure.dc.html) ──
  const initG = "linear-gradient(135deg,#1E5BFF,#00E5D4)";
  const empRow = (n) => `<div class="org-emp" data-oc-select="${n.id}" style="display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:10px;cursor:pointer;transition:background .15s">
      <span style="width:30px;height:30px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-size:11px;font-weight:800;color:#02121A;background:${initG}">${initials(n.fullName)}</span>
      <span style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:12.5px;color:#E6F2FF;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(n.fullName)}</b><span style="font-size:11px;color:rgba(230,242,255,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${escapeHtml(n.position || "—")}</span></span>
      <button type="button" class="org-emp-detach" data-action="detach-employee" data-person-id="${n.id}" data-person-name="${escapeHtml(n.fullName)}" title="Убрать из отдела" style="flex:0 0 auto;width:22px;height:22px;border-radius:6px;border:1px solid rgba(248,113,113,.3);background:transparent;color:#F87171;font-size:14px;line-height:1;cursor:pointer;padding:0">×</button>
    </div>`;
  const deptCol = ([name, nodes]) => {
    const color = deptColorFor(name);
    return `<div class="org-node" style="width:220px;flex:0 0 auto">
      <article class="elt-panel" style="padding:14px;height:100%">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="width:32px;height:32px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center;background:${color}22;color:${color};font-weight:800">${deptLetter(name)}</span>
          <div style="flex:1 1 0%;min-width:0"><b style="font-size:13.5px;font-weight:800;color:#fff;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(name)}</b><span style="font-size:11px;color:rgba(230,242,255,.45)">${nodes.length} сотрудников</span></div>
          ${name !== "Без отдела" ? `<button type="button" class="org-dept-edit" data-action="manage-departments" title="Переименовать / изменить отдел" style="flex:0 0 auto;width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#E6F2FF;cursor:pointer;font-size:12px;padding:0">✎</button>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;gap:2px">${nodes.map(empRow).join("")}</div>
        <button class="org-add" data-action="add-structure-member"${name !== "Без отдела" ? ` data-dept-name="${escapeHtml(name)}"` : ""} style="width:100%;margin-top:8px;padding:8px;border-radius:9px;border:1px dashed rgba(0,229,212,.4);background:transparent;color:#00E5D4;font-family:inherit;font-weight:700;font-size:11.5px;cursor:pointer">+ Добавить сотрудника</button>
      </article>
    </div>`;
  };

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Организация</span>
        <h1 class="elt-dash-title">Структура</h1>
        <p class="elt-dash-subtitle">Древовидная структура компании · отделы и подчинённость</p>
      </div>
    </header>

    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto;width:200px;max-width:100%;height:32px;box-sizing:border-box;padding:0 12px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05)">
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style="flex-shrink:0"><circle cx="6.5" cy="6.5" r="4.5" stroke="rgba(230,242,255,.4)" stroke-width="1.3"/><line x1="10" y1="10" x2="13" y2="13" stroke="rgba(230,242,255,.4)" stroke-width="1.3" stroke-linecap="round"/></svg>
        <input id="orgSearch" placeholder="Поиск в структуре…" style="flex:1;min-width:0;border:none;background:transparent;color:#E6F2FF;font-family:inherit;font-size:12.5px;outline:none">
      </div>
      <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)">
        <button id="orgZoomOut" style="width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#E6F2FF;cursor:pointer;font-size:15px">−</button>
        <span id="orgZLbl" style="font-size:12px;color:rgba(230,242,255,.6);min-width:42px;text-align:center">100%</span>
        <button id="orgZoomIn" style="width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#E6F2FF;cursor:pointer;font-size:15px">+</button>
      </div>
    </div>

    <div id="orgCanvas" style="transform-origin:center top;transform:scale(1);transition:transform .2s">
      <div style="display:flex;justify-content:center">
        <article class="elt-panel" style="width:380px;max-width:100%;text-align:center;padding:18px">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px">
            <span style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(30,91,255,.18);color:#7CA0FF"><svg width="17" height="17" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.4"/><line x1="6" y1="6" x2="8" y2="6" stroke="currentColor" stroke-width="1.3"/><line x1="10" y1="6" x2="12" y2="6" stroke="currentColor" stroke-width="1.3"/><line x1="6" y1="9" x2="8" y2="9" stroke="currentColor" stroke-width="1.3"/><line x1="10" y1="9" x2="12" y2="9" stroke="currentColor" stroke-width="1.3"/></svg></span>
            <div style="text-align:left"><b style="font-size:16px;font-weight:800;color:#fff;display:block">${escapeHtml((state.company && state.company.name) || "Компания")}</b><span style="font-size:12px;color:rgba(230,242,255,.5)">Головной офис · ${totalPeople} сотрудников · ${totalDepts} отд.</span></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:4px 0;margin:6px 0">
            <span style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:#02121A;background:${initG}">${initials(ceo.fullName)}</span>
            <div style="text-align:left"><b style="font-size:13.5px;color:#E6F2FF;font-weight:700;display:block">${escapeHtml(ceo.fullName)}</b><span style="font-size:11.5px;color:rgba(230,242,255,.45)">${escapeHtml(ceo.position || "Генеральный директор")}</span></div>
          </div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="elt-btn-primary" data-action="manage-departments" style="font-size:12px;padding:8px 13px">+ Добавить отдел</button>
            <button data-action="add-structure-member" style="display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;border:1px solid rgba(0,229,212,.4);background:rgba(0,229,212,.1);color:#00E5D4;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer">+ Добавить сотрудника</button>
          </div>
        </article>
      </div>
      <svg id="orgConnSvg" height="46" style="display:block;width:100%;overflow:visible">
        <defs><linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00E5D4" stop-opacity="0"/><stop offset="50%" stop-color="#8CF7EF" stop-opacity="1"/><stop offset="100%" stop-color="#00E5D4" stop-opacity="0"/></linearGradient></defs>
        <path id="orgBaseP" d="" fill="none" stroke="rgba(0,229,212,.22)" stroke-width="1.5"/>
        <path id="orgGlowP" d="" fill="none" stroke="url(#orgGrad)" stroke-width="2"/>
      </svg>
      <div class="org-cols" style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;align-items:stretch">
        ${deptEntries.length ? deptEntries.map(deptCol).join("") : `<div class="ov-empty">Отделов пока нет.</div>`}
      </div>
    </div>
  </section>`;
}

const CTR_TYPE_LABEL = { single_choice: "Один вариант", multiple_choice: "Несколько вариантов", open: "Открытый", scale: "Шкала" };
const CTR_SERVICE_CATEGORIES = ["360", "Адаптация", "Performance"];
const ctrIsService = (t) => t && CTR_SERVICE_CATEGORIES.includes(t.category);

// Карточка вопроса. delAttr — data-атрибуты кнопки удаления (или null = read-only).
function ctrQuestionCard(q, delAttr) {
  let detail = "";
  if (q.type === "single_choice" || q.type === "multiple_choice") {
    detail = `<ul class="ctr-opts">${q.options.map((o) => `<li><span>${escapeHtml(o.text)}</span><em>${o.score} б.${o.is_correct ? " ✓" : ""}${o.is_red_flag ? " ⚑" : ""}</em></li>`).join("")}</ul>`;
  } else if (q.type === "scale") {
    detail = `<p class="elt-card-caption">Шкала ${q.scale_min}–${q.scale_max}</p>`;
  } else if (q.type === "open") {
    detail = `<p class="elt-card-caption">Открытый · AI-оценка${q.ai_reference ? ` · эталон: ${escapeHtml(q.ai_reference)}` : ""}</p>`;
  }
  return `<div class="ctr-question">
    <div class="ctr-q-head">
      <span class="ctr-q-type">${CTR_TYPE_LABEL[q.type] || q.type}</span>
      ${q.competency ? `<span class="ctr-q-comp">${escapeHtml(q.competency)}</span>` : ""}
      <span class="ctr-q-max">макс ${q.max_score}</span>
      ${delAttr ? `<button class="ctr-q-del" ${delAttr}>✕</button>` : ""}
    </div>
    <h4>${escapeHtml(q.text)}</h4>
    ${detail}
  </div>`;
}

const CTR_KIND_LABEL = { common: "общая", professional: "проф" };

function renderConstructorCompetencies(state) {
  const comps = state.constructorComps || [];
  const sel = state.constructorComp;
  const loading = state.constructorCompsStatus === "loading" && !comps.length;

  const list = comps.length
    ? comps.map((c) => `<button class="elt-profile-row${sel && sel.id === c.id ? " selected" : ""}" data-select-competency="${c.id}">
        <b>${escapeHtml(c.title)} <span class="ctr-kind-badge ${c.kind}">${CTR_KIND_LABEL[c.kind] || c.kind}</span></b>
        <span>${c.questions_count} вопр.</span>
      </button>`).join("")
    : `<p class="elt-card-caption" style="padding:8px">${loading ? "Загрузка…" : "Компетенций пока нет — создайте или импортируйте базу."}</p>`;

  const right = sel ? `
    <div class="elt-card">
      <div class="elt-card-head">
        <div><h2>${escapeHtml(sel.title)} <span class="ctr-kind-badge ${sel.kind}">${CTR_KIND_LABEL[sel.kind] || sel.kind}</span></h2>
          <span class="elt-card-caption">${sel.questions_count} вопросов · макс ${sel.max_score} б.${sel.description ? " · " + escapeHtml(sel.description) : ""}</span></div>
        <div class="elt-row-actions">
          <button class="elt-btn-primary" data-action="open-add-comp-question">+ Добавить вопрос</button>
          <button class="elt-btn-danger" data-delete-competency="${sel.id}">Удалить</button>
        </div>
      </div>
      <div class="ctr-questions">
        ${sel.questions.length
          ? sel.questions.map((q) => ctrQuestionCard(q, `data-delete-comp-question="${sel.id}|${q.id}"`)).join("")
          : '<div class="ctr-empty"><p>Вопросов пока нет.</p><button class="elt-btn-primary" data-action="open-add-comp-question">+ Добавить первый вопрос</button></div>'}
      </div>
    </div>
  ` : `<div class="elt-card ctr-empty-card"><div class="ctr-empty"><p>Выберите компетенцию слева или создайте новую. Вопросы компетенции переиспользуются во всех профилях.</p><button class="elt-btn-primary" data-action="open-create-competency">+ Создать компетенцию</button></div></div>`;

  return { list, right, count: comps.length };
}

function renderConstructorProfiles(state) {
  const tests = state.constructorTests || [];
  const sel = state.constructorTest;
  const loading = state.constructorStatus === "loading" && !tests.length;
  const query = state.constructorProfileQuery || "";

  const emptyMsg = query
    ? `Ничего не найдено по запросу «${escapeHtml(query)}».`
    : "Профилей пока нет — создайте первый.";
  const list = tests.length
    ? tests.map((t) => `<button class="elt-profile-row${sel && sel.id === t.id ? " selected" : ""}" data-select-test="${t.id}"><b>${escapeHtml(t.title)}${ctrIsService(t) ? ' <span class="ctr-service-badge">сервисный</span>' : ''}</b><span>${escapeHtml(t.category || t.target_type)} · ${t.questions_count} вопр.</span></button>`).join("")
    : `<p class="elt-card-caption" style="padding:8px">${loading ? "Загрузка…" : emptyMsg}</p>`;

  const selIsService = ctrIsService(sel);
  const comps = (sel && sel.competencies) || [];
  const compChips = comps.length
    ? comps.map((c) => `<div class="ctr-comp-chip">
        <span class="ctr-comp-chip-name">${escapeHtml(c.title)}</span>
        <span class="ctr-comp-chip-count">${c.questions_count} вопр.</span>
        <button class="ctr-comp-chip-x" title="Убрать из профиля" data-remove-profile-comp="${c.competency_id}" data-test-id="${sel.id}">✕</button>
      </div>`).join("")
    : `<span class="elt-card-caption">Компетенций пока нет — добавьте, и вопросы подтянутся автоматически.</span>`;

  const right = sel ? `
    <div class="elt-card">
      <div class="elt-card-head">
        <div><h2>${escapeHtml(sel.title)}${selIsService ? ' <span class="ctr-service-badge">сервисный</span>' : ''}</h2><span class="elt-card-caption">${escapeHtml(sel.category || sel.target_type)} · ${sel.questions_count} вопросов · макс ${sel.max_score} б.</span></div>
        ${selIsService
          ? '<span class="ctr-service-lock" title="Сервисный профиль используется в 360 / Performance / Адаптации">🔒 Защищён от удаления</span>'
          : `<button class="elt-btn-danger" data-delete-test="${sel.id}">Удалить профиль</button>`}
      </div>
      <div class="ctr-comp-section">
        <div class="ctr-section-head">Компетенции профиля<button class="elt-btn-ghost ctr-add-comp-btn" data-action="open-add-profile-comp">+ Добавить компетенцию</button></div>
        <div class="ctr-comp-chips">${compChips}</div>
      </div>
      <div class="ctr-derived-head">Вопросы профиля <span>(из компетенций · редактируются в разделе «Компетенции»)</span></div>
      <div class="ctr-questions">
        ${sel.questions.length
          ? sel.questions.map((q) => ctrQuestionCard(q, null)).join("")
          : '<div class="ctr-empty"><p>Вопросов нет — добавьте компетенции в профиль.</p></div>'}
      </div>
    </div>
  ` : `<div class="elt-card ctr-empty-card"><div class="ctr-empty"><p>Выберите профиль слева или создайте новый. Профиль = набор компетенций, вопросы берутся из них.</p><button class="elt-btn-primary" data-action="open-create-test">+ Создать профиль</button></div></div>`;

  const limited = tests.length >= 50;
  const hint = limited
    ? `<p class="ctr-search-hint">Показаны первые 50 — уточните поиск по названию.</p>`
    : "";
  const search = search0(query) + hint;

  return { list, right, search, count: tests.length };
}

function search0(query) {
  return `<div class="ctr-profile-search">
    <input type="search" class="elt-input" data-profile-search placeholder="Поиск профиля по названию…" value="${escapeHtml(query)}" autocomplete="off">
  </div>`;
}

export function renderConstructor(state) {
  const mode = state.constructorMode || "profiles";
  const isComp = mode === "competencies";
  const view = isComp ? renderConstructorCompetencies(state) : renderConstructorProfiles(state);
  const sideTitle = isComp ? "Компетенции" : "Профили";
  const createAction = isComp ? "open-create-competency" : "open-create-test";
  const createLabel = isComp ? "+ Создать компетенцию" : "+ Создать профиль";

  return `
    <div class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Инструмент</span>
          <h1 class="elt-dash-title">Конструктор оценок</h1>
          <p class="elt-dash-subtitle">Соберите оценку из компетенций и вопросов</p>
        </div>
        <div class="elt-dash-header-actions">
          <button class="elt-btn-ghost" data-action="open-import-library">Импорт базы</button>
          <button class="elt-btn-primary" data-action="${createAction}">${createLabel}</button>
        </div>
      </header>
      <div class="ctr-mode-toggle">
        <button class="ctr-mode-btn${!isComp ? " active" : ""}" data-constructor-mode="profiles">Профили</button>
        <button class="ctr-mode-btn${isComp ? " active" : ""}" data-constructor-mode="competencies">Компетенции</button>
      </div>
      <div class="elt-constructor-grid">
        <div class="elt-constructor-sidebar">
          <div class="elt-card">
            <div class="elt-card-head"><h2>${sideTitle}</h2><span class="elt-card-caption">${view.count}</span></div>
            ${view.search || ""}
            <div class="elt-profile-rows">${view.list}</div>
          </div>
        </div>
        <div class="elt-constructor-main">${view.right}</div>
      </div>
    </div>
  `;
}

// Период вкладки «Вакансии»: 7 / 14 / 30 дней (управляет всеми расчётами).
const VACANCY_PERIODS = [["7d", "7 дней"], ["14d", "14 дней"], ["30d", "30 дней"]];

function vacancyPeriodSwitcher(active) {
  return `<section class="elt-filter-bar elt-filter-bar-v3"><div class="elt-fb-period">
    ${VACANCY_PERIODS.map(([v, l]) => `<button class="elt-fb-period-btn ${active === v ? "active" : ""}" data-vacancy-period="${v}">${l}</button>`).join("")}
  </div></section>`;
}

// Кликабельная KPI-карточка вакансий (drill-down по data-vac-card).
function vacancyKpiCard({ card, label, value, caption, status }) {
  return `<article class="elt-kpi status-${status || "neutral"} clickable" data-vac-card="${card}">
    <div class="elt-kpi-top"><i class="elt-kpi-dot"></i></div>
    <strong class="elt-kpi-value">${value}</strong>
    <div class="elt-kpi-footer"><span class="elt-kpi-label">${label}</span></div>
    <p class="elt-kpi-caption">${caption || ""}</p>
  </article>`;
}

// Опции <select> тестов.
function testOptionsHtml(tests, selectedId) {
  return (tests || []).map((t) =>
    `<option value="${t.id}" ${t.id === selectedId ? "selected" : ""}>${escapeHtml(t.title)}</option>`
  ).join("");
}

// Таблица эффективности вакансий из реальных метрик за период.
// Компактная воронка подбора внутри карточки вакансии. Данные приходят в составе
// /vacancies/kpi (поле funnel) — отдельных запросов на карточку нет.
function vacFunnelMini(steps) {
  if (!steps || !steps.length) return `<div class="vac-funnel-empty">Нет данных воронки за период.</div>`;
  const top = Number(steps[0].count) || 0;
  return `<div class="vac-funnel">${steps.map((s, i) => {
    const count = Number(s.count) || 0;
    const fromTop = top > 0 ? Math.round((count / top) * 100) : 0;
    const prev = i > 0 ? Number(steps[i - 1].count) || 0 : count;
    const fromPrev = i === 0 ? null : (prev > 0 ? Math.round((count / prev) * 100) : 0);
    const width = Math.max(3, Math.min(100, fromTop));
    const st = i === 0 ? "neutral" : fromPrev >= 60 ? "good" : fromPrev < 25 ? "bad" : "medium";
    return `<div class="vac-funnel-row">
      <span class="vac-funnel-label">${escapeHtml(s.label)}</span>
      <span class="vac-funnel-track"><span class="vac-funnel-fill status-${st}" style="width:${width}%"></span></span>
      <span class="vac-funnel-count">${count}${fromPrev === null ? "" : `<em>${fromPrev}%</em>`}</span>
    </div>`;
  }).join("")}</div>`;
}

function vacancyCards(items, tests) {
  const convClass = (c) => (c >= 30 ? "good" : c < 10 ? "bad" : "medium");
  const statusBadge = (st) =>
    st === "closed" ? `<span class="elt-status-badge status-neutral">закрыта</span>` : `<span class="elt-status-badge status-good">активна</span>`;
  return `<div class="vac-grid">${items.map((v) => `
    <article class="vac-card">
      <header class="vac-card-head">
        <div class="vac-card-titlewrap">
          <h3 class="vac-card-title">${escapeHtml(v.title)}</h3>
          <span class="vac-card-meta">${v.city ? escapeHtml(v.city) + " · " : ""}синхр. ${v.last_synced_on || "—"}</span>
        </div>
        ${statusBadge(v.status)}
      </header>
      <div class="vac-card-metrics">
        <div class="vac-metric"><b>${v.responses_period}</b><span>откликов</span></div>
        <div class="vac-metric"><b class="conv-${convClass(v.conversion)}">${v.conversion}%</b><span>конверсия</span></div>
        <div class="vac-metric"><b>${v.assessments_sent}</b><span>оценок</span></div>
        <div class="vac-metric"><b>${v.suitable}</b><span>подходящих</span></div>
      </div>
      <div class="vac-card-funnel">
        <div class="vac-funnel-head">Воронка подбора<span>за период</span></div>
        ${vacFunnelMini(v.funnel)}
      </div>
      <footer class="vac-card-foot">
        <label class="vac-card-test" title="Этот тест автоматически подставляется при переводе отклика в кандидата">
          <span class="vac-card-test-cap">Тест по умолчанию
            <svg class="vac-card-test-info" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M8 7v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="4.6" r=".9" fill="currentColor"/></svg>
          </span>
          <select class="elt-search vac-card-test-select" data-vac-default-test="${v.vacancy_id}"><option value="">— не выбран —</option>${testOptionsHtml(tests, v.default_test_id)}</select>
        </label>
        <div class="vac-card-actions">
          <button class="elt-action-pill" data-vac-responses="${v.vacancy_id}">Отклики${v.responses_period ? " " + v.responses_period : ""}</button>
          ${v.url ? `<a class="elt-action-pill" href="${v.url}" target="_blank" rel="noopener">hh.ru ↗</a>` : ""}
        </div>
      </footer>
    </article>`).join("")}</div>`;
}

export function renderVacancies(state) {
  const hh = state.hhStatus || null;
  const connected = Boolean(hh && hh.connected);

  const kpi = state.vacancyKpi;
  const loading = state.vacancyKpiStatus === "loading" && !kpi;
  const cards = (kpi && kpi.cards) || {};
  const items = (kpi && kpi.items) || [];
  const dash = (v) => (loading ? "…" : (v ?? 0));

  // ── 4 KPI как в макете (из доступных HH-метрик; без данных — нули) ──
  const kpiCards = [
    { label: "Открытых вакансий", value: dash(items.length), caption: "в подборе", status: "neutral", iconName: "vacancy" },
    { label: "Откликов", value: dash(cards.total_responses), caption: "за период", status: "neutral", iconName: "candidates" },
    { label: "Подходящих", value: dash(cards.fit_profile), caption: "из HH", status: "good", iconName: "fit" },
    { label: "Закрыто", value: dash(cards.closed_in_period), caption: "за месяц", status: "good", iconName: "completed" }
  ];

  // ── Интеграции · источники вакансий ──
  const intCard = ({ name, desc, bg, logo, mode, attrs, label }) => `
    <div class="vac-int" style="display:flex;flex-direction:column;gap:10px;padding:15px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)">
      <div style="display:flex;align-items:center;gap:11px">
        <span style="width:38px;height:38px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;font-size:13px;font-weight:800;color:#fff;background:${bg}">${logo}</span>
        <div style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:13.5px;color:#fff;font-weight:700">${name}</b><span style="font-size:11px;color:rgba(230,242,255,.45)">${desc}</span></div>
      </div>
      <button class="vac-conn" ${attrs || ""}${mode === "soon" ? " disabled" : ""} style="width:100%;padding:9px;border-radius:9px;border:1px solid ${mode === "on" ? "rgba(74,222,128,.4)" : mode === "soon" ? "rgba(255,255,255,.12)" : "rgba(30,91,255,.4)"};background:${mode === "on" ? "rgba(74,222,128,.12)" : mode === "soon" ? "rgba(255,255,255,.04)" : "rgba(30,91,255,.12)"};color:${mode === "on" ? "#4ADE80" : mode === "soon" ? "rgba(230,242,255,.4)" : "#7CA0FF"};font-family:inherit;font-weight:700;font-size:12px;cursor:${mode === "soon" ? "default" : "pointer"}">${label}</button>
    </div>`;
  const integrations = [
    intCard({ name: "HeadHunter", desc: "hh.ru · вакансии и отклики", bg: "#D6001C", logo: "He", mode: connected ? "on" : "off", attrs: connected ? 'data-action="hh-disconnect"' : 'data-action="hh-connect"', label: connected ? "Подключено ✓" : "Подключить" }),
    intCard({ name: "SuperJob", desc: "superjob.ru · скоро", bg: "#2A9D3F", logo: "SJ", mode: "soon", label: "Скоро" }),
    intCard({ name: "Avito Работа", desc: "avito.ru · скоро", bg: "#00AAFF", logo: "Av", mode: "soon", label: "Скоро" })
  ].join("");

  // ── Конверсия по вакансиям (fit% из items) ──
  const convBars = items.slice(0, 8).map((v) => {
    const fit = v.fit != null ? v.fit : (v.fit_percent != null ? v.fit_percent : (v.conversion != null ? v.conversion : 0));
    return { label: v.title, value: fit, status: fit >= 75 ? "good" : fit >= 55 ? "medium" : "bad" };
  });

  const panelHead = (svg, title, caption) => `
    <div class="elt-panel-head">
      <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none">${svg}</svg><h2>${title}</h2></div>
      ${caption ? `<span class="elt-panel-caption">${caption}</span>` : ""}
    </div>`;

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Найм</span>
        <h1 class="elt-dash-title">Вакансии</h1>
        <p class="elt-dash-subtitle">Открытые позиции, отклики и конверсия${connected ? ` · hh.ru: ${escapeHtml(hh.employer_name || "работодатель")}` : ""}</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-primary" data-action="${connected ? "hh-import-open" : "hh-connect"}">${connected ? "+ Вакансия" : "Подключить hh.ru"}</button>
        <button class="elt-btn-ghost" data-open-filters="vacancies">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">${kpiCards.map(kpiCard).join("")}</section>

    <article class="elt-panel elt-wide" style="margin-bottom:16px">
      ${panelHead('<path d="M5.5 9.5L9.5 5.5M9 4.5l1-1a2.1 2.1 0 0 1 3 3l-1 1M6 10.5l-1 1a2.1 2.1 0 0 1-3-3l1-1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', "Интеграции · источники вакансий", "подключите площадки к Eltera")}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px">${integrations}</div>
    </article>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel elt-wide">
        ${panelHead('<path d="M2 12l3-4 3 2 5-6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>', "Конверсия по вакансиям", "fit профиля")}
        ${convBars.length ? barChart(convBars) : `<div class="ov-empty" style="margin:12px">${connected ? "Импортируйте вакансии из HeadHunter." : "Подключите hh.ru, чтобы увидеть конверсию по вакансиям."}</div>`}
      </article>
    </section>
  </section>`;
}

const LIB_SECTIONS = [
  ["candidate", "Кандидаты"],
  ["employee", "Сотрудники"],
  ["group", "Группа"],
  ["universal", "Универсальные"],
];

export function renderAssessments(state) {
  const defaultIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`;
  const TARGET_LABEL = { candidate: "Кандидаты", employee: "Сотрудники", group: "Группа", universal: "Универсальные" };
  const SERVICE = ["360", "Адаптация", "Performance"];
  const lib = state.library;
  const tax = state.taxonomy || { directions: [], universal: [], levels: [] };
  const items = lib.items;

  // Категории секции: для «универсальных» — черты, иначе — профнаправления.
  const cats = lib.section === "universal" ? tax.universal : tax.directions;

  const sectionTabs = LIB_SECTIONS.map(([val, label]) =>
    `<button class="ctr-mode-btn${lib.section === val ? " active" : ""}" data-library-section="${val}">${label}</button>`
  ).join("");

  const catChip = (slug, title) =>
    `<button class="elt-pill${lib.category === slug ? " active" : ""}" data-library-category="${slug}">${escapeHtml(title)}</button>`;
  const catBar = `<div class="elt-filter-bar lib-cats">
    <button class="elt-pill${!lib.category ? " active" : ""}" data-library-category="">Все направления</button>
    ${cats.map((c) => catChip(c.slug, c.title)).join("")}
  </div>`;

  const lvlChip = (code, title) =>
    `<button class="elt-pill${lib.level === code ? " active" : ""}" data-library-level="${code}">${escapeHtml(title)}</button>`;
  const lvlBar = `<div class="elt-filter-bar lib-levels">
    <span class="lib-levels-label">Уровень:</span>
    <button class="elt-pill${!lib.level ? " active" : ""}" data-library-level="">Любой</button>
    ${tax.levels.map((l) => lvlChip(l.code, l.title)).join("")}
  </div>`;

  let grid;
  if (items === null || lib.loading) {
    grid = `<p class="elt-card-caption" style="padding:16px">Загрузка профилей…</p>`;
  } else if (!items.length) {
    grid = `<div class="elt-card ctr-empty-card"><div class="ctr-empty"><p>Ничего не найдено по выбранным фильтрам.</p><button class="elt-btn-primary" data-view="constructor">Открыть Конструктор</button></div></div>`;
  } else {
    grid = `<div class="elt-profiles-grid">${items.map((t) => {
      const isService = SERVICE.includes(t.category);
      const tags = (t.categories || []).slice(0, 3).map((c) => `<span class="lib-tag">${escapeHtml(c.title)}</span>`).join("");
      const lvlNames = (t.levels || []).map((code) => (tax.levels.find((l) => l.code === code) || {}).title).filter(Boolean);
      const lvls = lvlNames.length ? `<span class="lib-tag lib-tag-lvl">${escapeHtml(lvlNames.join(" · "))}</span>` : "";
      return `<article class="elt-profile-card">
        <div class="elt-profile-card-top">
          <div class="elt-profile-icon-wrap">${defaultIcon}</div>
          <span class="elt-profile-category">${escapeHtml((t.categories && t.categories[0] && t.categories[0].title) || t.category || TARGET_LABEL[t.target_type] || t.target_type)}</span>
        </div>
        <h3 class="elt-profile-title">${escapeHtml(t.title)}${isService ? ' <span class="ctr-service-badge">сервисный</span>' : ''}</h3>
        <p class="elt-profile-summary">${escapeHtml(t.summary || "Готовый профиль оценки.")}</p>
        ${(tags || lvls) ? `<div class="lib-tags">${tags}${lvls}</div>` : ""}
        <div class="elt-profile-meta">
          <span>${t.questions_count} вопросов</span>
          <span>${TARGET_LABEL[t.target_type] || t.target_type}</span>
        </div>
        <div class="elt-profile-actions">
          <button class="elt-btn-secondary" data-launch-profile="${t.id}">Запустить оценку</button>
          <button class="elt-btn-ghost" data-open-profile-constructor="${t.id}">В конструкторе</button>
        </div>
      </article>`;
    }).join('')}${items.length >= 60 ? `<p class="elt-card-caption" style="grid-column:1/-1;padding:8px">Показаны первые 60 — уточните поиск или фильтры.</p>` : ""}</div>`;
  }

  const fitnessNote = lib.section === "employee"
    ? `<p class="elt-page-subtitle" style="margin:-4px 0 10px">Профпригодность: тесты по должностям для действующих сотрудников (внутренняя оценка).</p>`
    : "";

  return `
    <div class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Библиотека</span>
          <h1 class="elt-dash-title">Профили компетенций</h1>
          <p class="elt-dash-subtitle">Единая структура: направления, уровни должностей и наборы компетенций</p>
        </div>
        <div class="elt-dash-header-actions">
          <button class="elt-btn-ghost" data-view="constructor">Конструктор</button>
          <button class="elt-btn-primary" data-action="open-assess-wizard">+ Создать оценку</button>
        </div>
      </header>
      <div class="ctr-mode-toggle">${sectionTabs}</div>
      ${fitnessNote}
      <div class="lib-search"><input type="search" class="elt-input" data-library-search placeholder="Поиск теста по названию…" value="${escapeHtml(lib.q || "")}" autocomplete="off"></div>
      ${catBar}
      ${lvlBar}
      ${grid}
    </div>
  `;
}

export function renderAdaptation(state) {
  const ready = Boolean(state.employeesApi);
  const failed = state.employeesStatus === "error";
  const employees = ready ? state.employeesApi : [];

  const daysSince = (d) => {
    if (!d) return null;
    const t = Date.parse(d);
    if (Number.isNaN(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
  };
  const withTenure = employees
    .map((e) => ({ ...e, days: daysSince(e.startDate) }))
    .filter((e) => e.days !== null);
  const newEmps = withTenure.filter((e) => e.days <= 90).sort((a, b) => a.days - b.days);

  // Пульс-опросы адаптации — все ссылки по опросам адаптации (одиночный «Адаптация
  // сотрудника» и этапные «Адаптация · …»).
  const links = (state.linksApi || []).filter(
    (l) => (l.professionTitle || "").startsWith("Адаптация") && l.recipientType === "Сотрудник"
  );
  const surveysSent = links.length;
  const surveysDone = links.filter((l) => l.status === "completed").length;

  const atRisk = newEmps.filter((e) => e.turnoverRisk === "средний" || e.turnoverRisk === "повышенный" || (e.satisfaction > 0 && e.satisfaction < 60));
  const passed = withTenure.filter((e) => e.days > 90 && e.fit >= 70).length;
  const satVals = withTenure.map((e) => e.satisfaction).filter((v) => v > 0);
  const avgSat = satVals.length ? Math.round(satVals.reduce((s, v) => s + v, 0) / satVals.length) : 0;

  // «Этапы адаптации» — реальная воронка по чек-инам циклов: сколько опросов
  // пройдено (completed) на каждом этапе 1/3/7/…/180 дней.
  const STAGE_CADENCE = [[1, "1 день"], [3, "3 дня"], [7, "7 дней"], [14, "14 дней"], [30, "30 дней"], [60, "60 дней"], [90, "90 дней"], [180, "180 дней"]];
  const allCheckins = (state.adaptationCycles || []).flatMap((c) => c.checkins || []);
  // Клик по этапу открывает модалку с чек-инами этого этапа (target = «Адаптация:<этап>»).
  const funnel = STAGE_CADENCE.map(([off, label]) => ({
    label,
    value: allCheckins.filter((x) => x.offset_days === off && x.status === "completed").length,
    target: `Этап адаптации:${label}`
  }));
  const funnelHasData = allCheckins.length > 0;

  const subtitle = failed
    ? "API недоступен — данные не загружены"
    : ready
      ? `Данные из API · ${newEmps.length} новых сотрудников (до 90 дней) · ${surveysSent} опросов`
      : "Загрузка данных из API…";

  // ── KPI-плитки (премиум-вид, как на «Обзоре») ──
  const kpiCards = [
    { label: "Новые сотрудники", value: newEmps.length, caption: "до 90 дней", status: "neutral", iconName: "employees", target: "Адаптация:Новые сотрудники" },
    { label: "Первые 30 дней", value: newEmps.filter((e) => e.days <= 30).length, caption: "критичный период", status: "medium", iconName: "active", target: "Адаптация:В процессе" },
    { label: "Опросы отправлены", value: surveysSent, caption: "пульс-опрос", status: "neutral", iconName: "chart", target: "Адаптация:Опросы отправлены" },
    { label: "Опросы пройдены", value: surveysDone, caption: "ответили", status: "good", iconName: "completed", target: "Адаптация:Опросы пройдены" },
    { label: "Прошли адаптацию", value: passed, caption: "90+ дней, fit≥70", status: "good", iconName: "fit", target: "Адаптация:Прошли" },
    { label: "В зоне риска", value: atRisk.length, caption: "срочно смотреть", status: atRisk.length ? "bad" : "good", iconName: "risk", target: "Адаптация:В зоне риска" },
    { label: "Удовлетворённость", value: `${avgSat}%`, caption: "средняя", status: getFitStatus(avgSat), iconName: "balance", target: "Адаптация:Вовлеченность" }
  ];

  // ── Этапы адаптации (бары по пройденным опросам) ──
  const stageBars = (funnelHasData ? funnel : [{ label: "Циклов пока нет", value: 0 }])
    .map((f) => ({ label: f.label, value: f.value, status: "neutral" }));

  // ── Ближайшие чек-ины (отправленные и запланированные опросы циклов) ──
  const upcoming = (state.adaptationCycles || [])
    .flatMap((c) => (c.checkins || [])
      .filter((x) => x.status === "sent" || x.status === "scheduled")
      .map((x) => ({ name: c.full_name, personId: c.person_id, offset: x.offset_days, status: x.status })))
    .sort((a, b) => a.offset - b.offset)
    .slice(0, 6);

  // ── «Рекомендуем взять» — сильные кандидаты (если раздел «Оценка» уже загружен) ──
  const strongCands = (state.candidatesApi || [])
    .filter((c) => c.assessed && c.result && c.result.percent >= 68)
    .sort((a, b) => b.result.percent - a.result.percent)
    .slice(0, 5);

  // ── Хелперы разметки (портированы 1-в-1 из Claude Design) ──
  const initials = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  const avatar = (n) => `<span style="width:30px;height:30px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-size:11px;font-weight:800;color:#02121A;background:linear-gradient(135deg,#1E5BFF,#00E5D4);">${initials(n)}</span>`;
  const fitBadge = (pct) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:11.5px;font-weight:800;color:#4ADE80;"><span style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#166534,#4ADE80);"></span>fit ${pct}%</span>`;
  const riskBadge = (label) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:11.5px;font-weight:800;color:#F87171;"><span style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#7F1D1D,#F87171);"></span>${label}</span>`;
  const timeChip = (label, from, to) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:11px;font-weight:600;color:#CDD9EE;"><span style="width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,${from},${to});"></span>${label}</span>`;
  const panelHead = (svg, title, caption) => `
    <div class="elt-panel-head">
      <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none">${svg}</svg><h2>${title}</h2></div>
      ${caption ? `<span class="elt-panel-caption">${caption}</span>` : ""}
    </div>`;
  const gpEmpty = (t) => `<div class="ov-empty">${t}</div>`;

  const candName = (c) => c.fullName || (c.person && c.person.fullName) || "Кандидат";
  const candRole = (c) => c.vacancyTitle || c.profession || c.position || "кандидат";

  const upcomingHtml = upcoming.length
    ? upcoming.map((u) => `<button class="gp-row" data-open-card="${u.personId}">
        <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(u.name)}</b><br><span>${u.offset}д · ${u.status === "sent" ? "отправлен" : "запланирован"}</span></div>
        ${u.status === "sent" ? timeChip("отправлен", "#9A3412", "#FACC15") : timeChip("ждёт", "#1E3A8A", "#60A5FA")}
      </button>`).join("")
    : gpEmpty("Ближайших чек-инов нет.");

  const strongHtml = strongCands.length
    ? strongCands.map((c) => `<button class="gp-row" data-open-card="${c.id || ""}">
        ${avatar(candName(c))}
        <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(candName(c))}</b><br><span>${escapeHtml(candRole(c))} · сильный кандидат</span></div>
        ${fitBadge(Math.round(c.result.percent))}
      </button>`).join("")
    : gpEmpty(state.candidatesApi ? "Сильных кандидатов пока нет." : "Кандидаты подгрузятся в разделе «Оценка».");

  const dropHtml = atRisk.length
    ? atRisk.slice(0, 6).map((e) => `<button class="gp-row" data-open-card="${e.id || ""}">
        ${avatar(e.fullName)}
        <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(e.fullName)}</b><br><span>${e.days} дн · риск ${escapeHtml(e.turnoverRisk || "—")}${e.satisfaction > 0 ? ` · ${e.satisfaction}%` : ""}</span></div>
        ${riskBadge(e.satisfaction > 0 ? `${e.satisfaction}%` : "риск")}
      </button>`).join("")
    : gpEmpty("Рисков ухода не выявлено 👌");

  const content = `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Onboarding</span>
        <h1 class="elt-dash-title">Адаптация</h1>
        <p class="elt-dash-subtitle">${escapeHtml(failed ? subtitle : "Циклы адаптации, чек-ины и риски")}</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-primary" data-action="open-assess-wizard">Новый цикл</button>
        <button class="elt-btn-ghost" data-open-filters="adaptation">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel">
        ${panelHead('<circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 4v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', "Этапы адаптации", funnelHasData ? "пройдено опросов" : "циклов пока нет")}
        ${barChart(stageBars)}
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="1.5" y1="5.5" x2="13.5" y2="5.5" stroke="currentColor" stroke-width="1"/><line x1="4.5" y1="1" x2="4.5" y2="4" stroke="currentColor" stroke-width="1.2"/><line x1="10.5" y1="1" x2="10.5" y2="4" stroke="currentColor" stroke-width="1.2"/>', "Ближайшие чек-ины", "опросы циклов")}
        <div class="gp-list">${upcomingHtml}</div>
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<circle cx="7.5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 2.5v3M9.5 4h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', "Рекомендуем взять", "AI · подбор")}
        <div class="gp-list">${strongHtml}</div>
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<path d="M7.5 1.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.7 5.8l4-.6z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>', "Возможно расстаться", "зона риска")}
        <div class="gp-list">${dropHtml}</div>
      </article>
    </section>
  </section>`;

  return content + renderAdaptationTimeline(state);
}

// Таймлайн циклов адаптации (этапы 1/3/7/…/180 со статусами).
function renderAdaptationTimeline(state) {
  const cycles = state.adaptationCycles || [];
  const statusLabel = {
    completed: "пройден", sent: "отправлен", scheduled: "ожидается",
    missed: "просрочен", skipped: "пропущен",
  };
  const stageShort = (s) => (s || "").replace("Адаптация · ", "");

  let body;
  if (state.adaptationStatus === "error") {
    body = `<p class="elt-card-caption" style="padding:8px">API недоступен — таймлайн не загружен.</p>`;
  } else if (!state.adaptationCycles) {
    body = `<p class="elt-card-caption" style="padding:8px">Загрузка…</p>`;
  } else if (!cycles.length) {
    body = `<p class="elt-card-caption" style="padding:8px">Циклов адаптации пока нет. Они создаются автоматически по дате выхода сотрудника.</p>`;
  } else {
    // Активные/в процессе — сверху.
    const ordered = cycles.slice().sort((a, b) => (a.status === "active" ? -1 : 1) - (b.status === "active" ? -1 : 1));
    body = `<div class="adapt-rows">${ordered.map((c) => `
      <div class="adapt-row ${c.risk ? "risk" : ""}">
        <div class="adapt-row-head">
          <div class="adapt-row-who"><b>${c.full_name}</b><span>выход ${new Date(c.start_date).toLocaleDateString("ru-RU")} · ${c.completed}/${c.total} пройдено</span></div>
          ${c.risk ? `<span class="adapt-badge risk">зона риска</span>` : c.status === "completed" ? `<span class="adapt-badge done">завершён</span>` : `<span class="adapt-badge active">в процессе</span>`}
        </div>
        <div class="adapt-stages">
          ${c.checkins.map((x) => {
            const cls = `st-${x.status}${x.risk_flag ? " risk" : ""}`;
            const val = x.result_percent != null ? ` ${x.result_percent}%` : "";
            const rem = (x.status === "sent" && x.reminders_sent) ? ` ↻${x.reminders_sent}` : "";
            // Пройденный этап → клик открывает ответы; отправленный → открывает опрос.
            const open = (x.status === "completed" && x.session_id)
              ? ` data-open-stage-answers="${c.person_id}|${x.session_id}"`
              : (x.status === "sent" && x.token ? ` data-open-assess="${x.token}"` : "");
            const hint = x.status === "completed" ? " · смотреть ответы" : "";
            return `<button type="button" class="adapt-stage ${cls}"${open} title="${stageShort(x.stage)} · ${statusLabel[x.status] || x.status}${val}${rem ? ` · напоминаний: ${x.reminders_sent}` : ""}${hint}">
              <span class="adapt-stage-day">${x.offset_days}д</span>
              <span class="adapt-stage-st">${statusLabel[x.status] || x.status}${val}${rem}</span>
            </button>`;
          }).join("")}
        </div>
      </div>`).join("")}</div>`;
  }

  // Панель сигналов руководителю (риск/пропуск).
  const alerts = state.adaptationAlerts || [];
  const kindLabel = { risk: "низкий балл", missed: "пропустил опрос" };
  const alertsPanel = alerts.length ? `<article class="elt-panel adapt-panel adapt-alerts">
    <div class="elt-panel-head"><div class="elt-panel-head-left"><h2>Сигналы руководителю</h2></div><span class="elt-panel-badge">${alerts.length}</span></div>
    <div class="adapt-alert-list">${alerts.map((a) => `
      <div class="adapt-alert ${a.kind}">
        <span class="adapt-alert-dot"></span>
        <div class="adapt-alert-text">
          <b>${a.full_name}</b> — ${kindLabel[a.kind] || a.kind} на этапе «${a.stage}» (день ${a.offset_days})${a.result_percent != null ? ` · ${a.result_percent}%` : ""}
          <span>руководитель: ${a.manager_name || "—"}</span>
        </div>
      </div>`).join("")}</div>
  </article>` : "";

  // Разовые опросы адаптации (запущены вручную, вне цикла).
  const standalone = state.adaptationStandalone || [];
  const sLabel = { completed: "пройден", sent: "отправлен" };
  const standalonePanel = standalone.length ? `<article class="elt-panel adapt-panel adapt-standalone-panel">
    <div class="elt-panel-head"><div class="elt-panel-head-left"><h2>Разовые опросы адаптации</h2></div><span class="elt-panel-badge">${standalone.length}</span></div>
    <div class="adapt-standalone-list">${standalone.map((s) => {
      const cls = `st-${s.status}${s.risk_flag ? " risk" : ""}`;
      const open = (s.status === "completed" && s.session_id)
        ? ` data-open-stage-answers="${s.person_id}|${s.session_id}"`
        : (s.status === "sent" && s.token ? ` data-open-assess="${s.token}"` : "");
      return `<button type="button" class="adapt-standalone ${cls}"${open}>
        <span class="adapt-standalone-name">${s.full_name}</span>
        <span class="adapt-standalone-survey">${s.stage}</span>
        <span class="adapt-standalone-st">${sLabel[s.status] || s.status}${s.result_percent != null ? ` · ${s.result_percent}%` : ""}${s.status === "completed" && s.session_id ? " · смотреть ответы" : ""}</span>
      </button>`;
    }).join("")}</div>
  </article>` : "";

  return `<section class="elt-dashboard adapt-section">
    ${alertsPanel}
    <article class="elt-panel adapt-panel">
      <div class="elt-panel-head">
        <div class="elt-panel-head-left"><h2>Таймлайн адаптации</h2></div>
        <button class="elt-btn-ghost" data-action="adapt-run-due">Обработать дозревшие</button>
      </div>
      ${body}
    </article>
    ${standalonePanel}
  </section>`;
}

// Модалка «Этап адаптации»: чек-ины всех циклов на этом этапе (кто прошёл,
// результат, ссылка на ответы / опрос). Вызывается из воронки «Этапы адаптации».
function renderAdaptationStageList(state, metricName) {
  const offset = parseInt(metricName, 10);
  const statusLabel = {
    completed: "пройден", sent: "отправлен", scheduled: "ожидается",
    missed: "просрочен", skipped: "пропущен",
  };
  const cycles = state.adaptationCycles || [];
  // Собираем чек-ины этого этапа из всех циклов + их владельцев.
  const rows = [];
  cycles.forEach((c) => {
    (c.checkins || []).forEach((x) => {
      if (x.offset_days === offset) {
        rows.push({ name: c.full_name, person_id: c.person_id, ...x });
      }
    });
  });
  if (!rows.length) {
    return `<p class="elt-card-caption" style="padding:12px">На этом этапе пока нет данных — ни один цикл адаптации до него не дошёл.</p>`;
  }
  // Сводка по статусам.
  const done = rows.filter((r) => r.status === "completed");
  const avg = done.length
    ? Math.round(done.reduce((s, r) => s + (r.result_percent || 0), 0) / done.length)
    : null;
  const order = { completed: 0, sent: 1, missed: 2, scheduled: 3, skipped: 4 };
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  const summary = `<div class="adapt-stage-summary">
    <span><b>${rows.length}</b> сотрудник(ов) на этапе</span>
    <span><b>${done.length}</b> прошли</span>
    ${avg != null ? `<span>средний балл <b>${avg}%</b></span>` : ""}
  </div>`;

  const stColor = { completed: "#4ADE80", sent: "#7CA0FF", missed: "#F87171", scheduled: "#CDD9EE", skipped: "#CDD9EE" };
  const stGrad = { completed: "#166534,#4ADE80", sent: "#1E3A8A,#7CA0FF", missed: "#7F1D1D,#F87171", scheduled: "#1E3A8A,#60A5FA", skipped: "#334155,#94A3B8" };
  const list = rows.map((r) => {
    const open = r.person_id
      ? ` data-open-card="${r.person_id}"`
      : ((r.status === "completed" && r.session_id)
        ? ` data-open-stage-answers="${r.person_id}|${r.session_id}"`
        : (r.status === "sent" && r.token ? ` data-open-assess="${r.token}"` : ""));
    const c = stColor[r.status] || "#CDD9EE";
    const gr = stGrad[r.status] || stGrad.skipped;
    const right = r.result_percent != null
      ? `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto;font-size:11.5px;font-weight:800;color:${c}"><span style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,${gr})"></span>${r.result_percent}%</span>`
      : `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto;font-size:11px;font-weight:600;color:#CDD9EE"><span style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,${gr})"></span>${statusLabel[r.status] || r.status}${r.risk_flag ? " ⚠" : ""}</span>`;
    return `<button class="gp-row"${open}>
      <span style="width:34px;height:34px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-size:12px;font-weight:800;color:#02121a;background:linear-gradient(135deg,#1E5BFF,#00E5D4)">${cardInitials(r.name)}</span>
      <span style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:13px;color:#E6F2FF;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</b><span style="font-size:11.5px;color:rgba(230,242,255,.45)">${statusLabel[r.status] || r.status}</span></span>
      ${right}
    </button>`;
  }).join("");

  return `${summary}<div class="gp-list">${list}</div>`;
}

export function renderThreeSixty(state) {
  const locked = state.company.tariff !== "TalentStudio";
  const ready = Boolean(state.employeesApi);
  const failed = state.employeesStatus === "error";
  const employees = ready ? state.employeesApi : [];

  // Реальные оценочные ссылки по тестам 360 (включая ролевые «… · Коллеги» и т.д.).
  const links = (state.linksApi || []).filter(
    (l) => (l.professionTitle || "").startsWith("Оценка 360°") && l.recipientType === "Сотрудник"
  );
  const completedLinks = links.filter((l) => l.status === "completed");
  const active = links.length - completedLinks.length;
  const participants = new Set(links.map((l) => l.fullName)).size;

  const pcts = completedLinks.map((l) => l.percent).filter((p) => typeof p === "number");
  const avgPct = pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0;
  const avgScore5 = pcts.length ? (avgPct / 20).toFixed(1) : "—";

  // Зоны развития — оценённые сотрудники с низким соответствием.
  const devZones = employees.filter((e) => e.fit != null && e.fit < 70).length;

  // Соответствие по отделам (средний fit только по оценённым).
  const deptAgg = {};
  employees.forEach((e) => {
    const d = e.department || "Без отдела";
    if (!deptAgg[d]) deptAgg[d] = { sum: 0, n: 0 };
    if (e.fit != null) { deptAgg[d].sum += e.fit; deptAgg[d].n += 1; }
  });
  const deptItems = Object.entries(deptAgg)
    .filter(([, v]) => v.n > 0)
    .map(([d, v]) => [d, Math.round(v.sum / v.n)]);

  // Статусы 360-ссылок (реальная воронка прохождения).
  const statusItems = [
    ["Отправлено", links.length],
    ["Открыто", links.filter((l) => l.status === "opened" || l.status === "started").length],
    ["Завершено", completedLinks.length]
  ];

  const subtitle = failed
    ? "API недоступен — данные не загружены"
    : ready
      ? `Данные из API · ${links.length} циклов 360 · ${participants} участников`
      : "Загрузка данных из API…";

  const attentionItems = [];
  if (active > 0) attentionItems.push({ title: `${active} активных 360`, text: "Оценки отправлены, ждём прохождения участниками.", status: "medium", target: "Оценка 360:Активные" });
  if (devZones > 0) attentionItems.push({ title: `${devZones} сотрудников с зонами развития`, text: "Соответствие ниже 70% — сформируйте планы развития.", status: "medium", target: "Оценка 360:Зоны развития" });

  // ── Разметка премиум (портирована из Claude Design — review-360.dc.html) ──
  const ov = state.threeSixtyOverview;
  const gapBars = ov && ov.competencies && ov.competencies.length
    ? ov.competencies.slice(0, 8).map((c, i) => ({ label: c.competency, value: c.gap, status: i === 0 ? "bad" : i === 1 ? "medium" : "good" }))
    : null;
  const avgGap = ov && ov.avg_gap != null ? `${ov.avg_gap}%` : "—";
  const startAttr = locked ? 'data-open-locked="Оценка 360 доступна на тарифе TalentStudio."' : 'data-action="open-assess-wizard"';

  const kpiCards = [
    { label: "Активные 360", value: active, caption: "в процессе", status: "neutral", target: "Оценка 360:Активные" },
    { label: "Завершены", value: completedLinks.length, caption: "пройдено", status: "good", target: "Оценка 360:Завершены" },
    { label: "Средний разрыв", value: avgGap, caption: "само vs команда", status: "medium", target: "Оценка 360:Средний разрыв" }
  ];

  const content = `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Круговая оценка</span>
        <h1 class="elt-dash-title">Оценка 360</h1>
        <p class="elt-dash-subtitle">${escapeHtml(failed ? "API недоступен — данные не загружены" : "Опросы по команде и расхождения самооценки")}</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-primary" ${startAttr}>Запустить 360</button>
        <button class="elt-btn-ghost" data-open-filters="360">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel">
        <div class="elt-panel-head">
          <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4" width="12" height="9" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.2"/></svg><h2>Расхождение по компетенциям</h2></div>
          <span class="elt-panel-caption">само-/внешняя</span>
        </div>
        ${gapBars ? barChart(gapBars) : `<div class="ov-empty">Пока нет завершённых 360 с самооценкой и внешней оценкой.</div>`}
      </article>
    </section>
  </section>`;

  return content;
}

export function renderPerformance(state) {
  const ready = Boolean(state.employeesApi);
  const failed = state.employeesStatus === "error";
  const employees = ready ? state.employeesApi : [];

  // Учитываем только оценённых сотрудников (fit != null). Остальные — «не оценён».
  const assessed = employees.filter((e) => e.fit !== null && e.fit !== undefined);
  const notAssessed = employees.length - assessed.length;

  // Результативность = соответствие должности (fit); потенциал — по
  // удовлетворённости и риску ухода (реальные поля сотрудника).
  const perf = (e) => e.fit;
  const pot = (e) => {
    let p = e.satisfaction || 0;
    if (e.turnoverRisk === "повышенный") p -= 15;
    else if (e.turnoverRisk === "средний") p -= 7;
    return Math.max(0, Math.min(100, p));
  };
  const hi = (v) => v >= 80;
  const lo = (v) => v < 60;

  const highPerf = assessed.filter((e) => hi(perf(e))).length;
  const lowPerf = assessed.filter((e) => lo(perf(e))).length;
  const hipo = assessed.filter((e) => hi(perf(e)) && hi(pot(e))).length;
  const reserve = assessed.filter((e) => hi(pot(e)) && !lo(perf(e))).length;

  const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : 0);
  const avgPerf = avg(assessed.map(perf));
  const avgPot = avg(assessed.map(pot));

  // Цикл Performance Review — из реальных оценочных ссылок по этому тесту.
  const prLinks = (state.linksApi || []).filter(
    (l) => l.professionTitle === "Performance Review" && l.recipientType === "Сотрудник"
  );
  const inCycle = prLinks.length;
  const completed = prLinks.filter((l) => l.status === "completed").length;

  const subtitle = failed
    ? "API недоступен — данные не загружены"
    : ready
      ? `Данные из API · оценено ${assessed.length} из ${employees.length} · ${inCycle} в цикле review`
      : "Загрузка данных из API…";

  // ── Сегменты 9-box (Звёзды / Ядро / Перспективные / Зона риска) ──
  const stars = hipo;                                   // hi perf & hi pot
  const risk = lowPerf;                                 // lo perf
  const perspective = assessed.filter((e) => hi(pot(e)) && !hi(perf(e)) && !lo(perf(e))).length;
  const core = Math.max(0, assessed.length - stars - risk - perspective);
  const segBars = [
    { label: "Звёзды", value: stars, status: "good" },
    { label: "Ядро команды", value: core, status: "neutral" },
    { label: "Перспективные", value: perspective, status: "medium" },
    { label: "Зона риска", value: risk, status: "bad" }
  ];

  const kpiCards = [
    { label: "В цикле", value: inCycle, caption: "review отправлено", status: "neutral", target: "Performance Review:В цикле" },
    { label: "Завершили", value: completed, caption: "review пройдено", status: "good", target: "Performance Review:Завершили" },
    { label: "Звёзды", value: stars, caption: "high perf / high pot", status: "good", target: "Performance Review:HiPo" },
    { label: "Зона риска", value: risk, caption: "требуют решения", status: "bad", target: "Performance Review:Низкий performance" }
  ];

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Цикл оценки</span>
        <h1 class="elt-dash-title">Performance Review</h1>
        <p class="elt-dash-subtitle">${escapeHtml(failed ? "API недоступен — данные не загружены" : "9-box, цели и обратная связь")}</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-primary" data-action="open-assess-wizard">Новый цикл</button>
        <button class="elt-btn-ghost" data-open-filters="performance">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel">
        <div class="elt-panel-head">
          <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4" width="12" height="9" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.2"/></svg><h2>Сегменты 9-box</h2></div>
          <span class="elt-panel-caption">распределение</span>
        </div>
        ${barChart(segBars)}
      </article>
    </section>
  </section>`;
}

export function renderLinks(state, professions) {
  // ── Разметка премиум (портирована из Claude Design — links.dc.html) ──
  const apiReady = state.linksStatus === "ready" && Array.isArray(state.linksApi);
  const links = apiReady ? state.linksApi : (state.links || []);
  const isDone = (l) => l.status === "completed";
  const isExpired = (l) => l.status === "expired" || l.status === "cancelled";
  const isActive = (l) => !isDone(l) && !isExpired(l);
  const passed = links.filter(isDone);
  const active = links.filter(isActive).length;
  const expired = links.filter(isExpired).length;
  const conversion = links.length ? Math.round((passed.length / links.length) * 100) : 0;

  const kpiCards = [
    { label: "Активные ссылки", value: active, caption: "ожидают", status: "medium", iconName: "link" },
    { label: "Пройдено", value: passed.length, caption: "завершено", status: "good", iconName: "completed" },
    { label: "Истекли", value: expired, caption: "не открыли", status: "bad", iconName: "risk" },
    { label: "Конверсия", value: `${conversion}%`, caption: "прошли / всего", status: getConversionStatus(conversion), iconName: "chart" }
  ];

  const initials = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  const avatar = (n) => `<span style="width:30px;height:30px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-size:11px;font-weight:800;color:#02121A;background:linear-gradient(135deg,#1E5BFF,#00E5D4)">${initials(n)}</span>`;
  const pctBadge = (pct, good) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:12px;font-weight:800;color:${good ? "#4ADE80" : "#F87171"}"><span style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,${good ? "#166534,#4ADE80" : "#7F1D1D,#F87171"})"></span>${pct}%</span>`;
  const statusPill = (l) => {
    const [label, from, to] = isDone(l) ? ["пройдено", "#0E7490", "#00E5D4"]
      : isExpired(l) ? ["истекла", "#7F1D1D", "#F87171"]
        : (l.status === "opened" || l.status === "started") ? ["открыта", "#1E3A8A", "#7CA0FF"]
          : ["ожидает", "#1E3A8A", "#60A5FA"];
    return `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:11px;font-weight:600;color:#CDD9EE"><span style="width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,${from},${to})"></span>${label}</span>`;
  };

  const lastHtml = links.length
    ? links.slice(0, 7).map((l) => `<button class="gp-row" ${l.token ? `data-open-assess="${l.token}"` : ""}>
        <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(l.fullName || "Участник")}</b><br><span>${escapeHtml(l.professionTitle || "оценка")}</span></div>
        ${statusPill(l)}
      </button>`).join("")
    : `<div class="ov-empty">Ссылок пока нет.</div>`;

  const scored = passed.filter((l) => typeof l.percent === "number");
  const bestList = scored.slice().sort((a, b) => b.percent - a.percent).slice(0, 5);
  const worstList = scored.slice().sort((a, b) => a.percent - b.percent).slice(0, 5);
  const scoreRow = (l, good) => `<button class="gp-row" data-open-card="${l.subjectPersonId || l.personId || ""}">
      ${avatar(l.fullName)}
      <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(l.fullName || "Участник")}</b><br><span>${escapeHtml(l.professionTitle || "")} · fit</span></div>
      ${pctBadge(l.percent, good)}
    </button>`;
  const bestHtml = bestList.length ? bestList.map((l) => scoreRow(l, true)).join("") : `<div class="ov-empty">Нет пройденных оценок.</div>`;
  const worstHtml = worstList.length ? worstList.map((l) => scoreRow(l, false)).join("") : `<div class="ov-empty">Нет пройденных оценок.</div>`;

  const panelHead = (svg, title, caption) => `
    <div class="elt-panel-head">
      <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none">${svg}</svg><h2>${title}</h2></div>
      ${caption ? `<span class="elt-panel-caption">${caption}</span>` : ""}
    </div>`;

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Рассылка</span>
        <h1 class="elt-dash-title">Оценки</h1>
        <p class="elt-dash-subtitle">Отправленные ссылки и их статусы</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-primary" data-action="create-link">+ Ссылка</button>
        <button class="elt-btn-ghost" data-open-filters="links">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel elt-wide">
        ${panelHead('<path d="M5.5 9.5L9.5 5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M9.5 5.5l1.5-1.5a2.1 2.1 0 0 1 3 3L12.5 8.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M5.5 9.5L4 11a2.1 2.1 0 0 1-3-3L2.5 6.5" stroke="currentColor" stroke-width="1.3" fill="none"/>', "Последние ссылки", `${links.length} всего`)}
        <div class="gp-list">${lastHtml}</div>
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<path d="M7.5 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6L1.3 5.3l3.6-.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>', "Лучшие оценки", "топ fit")}
        <div class="gp-list">${bestHtml}</div>
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<path d="M7.5 13.5L14 1.5H1L7.5 13.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>', "Худшие оценки", "зона внимания")}
        <div class="gp-list">${worstHtml}</div>
      </article>
    </section>
  </section>`;
}

export function renderReports(state) {
  const ready = Boolean(state.reportsApi);
  const failed = state.reportsStatus === "error";
  const reports = ready ? state.reportsApi : [];

  const candidates = reports.filter((r) => r.respondent_type === "candidate");
  const employees = reports.filter((r) => r.respondent_type === "employee");

  const subtitle = failed
    ? "API недоступен — отчёты не загружены"
    : "Готовые отчёты по оценкам и команде";

  const kpiCards = [
    { label: "Готовых отчётов", value: reports.length, caption: "завершённые оценки", status: "neutral", iconName: "chart" },
    { label: "Кандидаты", value: candidates.length, caption: "отчётов", status: "good", iconName: "candidates" },
    { label: "Сотрудники", value: employees.length, caption: "отчётов", status: "neutral", iconName: "employees" }
  ];

  // «Последние отчёты» — список готовых отчётов (имя — тест / балл · дата / PDF).
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "—";
  const pdfBadge = `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:11px;font-weight:600;color:#CDD9EE"><span style="width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,#1E3A8A,#7CA0FF)"></span>PDF</span>`;
  const reportRows = reports.length
    ? reports.slice(0, 12).map((r) => {
        const test = r.test_title || r.category || "оценка";
        const openAttr = r.respondent_type === "candidate" && r.person_id
          ? `data-pdf-id="${r.person_id}"`
          : `data-open-card="${r.person_id}"`;
        return `<button class="gp-row" ${openAttr}>
          <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(r.full_name || "—")} — ${escapeHtml(test)}</b><br><span>${r.percent}% · ${fmtDate(r.submitted_at)}</span></div>
          ${pdfBadge}
        </button>`;
      }).join("")
    : `<div class="ov-empty">${ready ? "Готовых отчётов пока нет." : "Загрузка отчётов…"}</div>`;

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Аналитика</span>
        <h1 class="elt-dash-title">Отчёты</h1>
        <p class="elt-dash-subtitle">${escapeHtml(subtitle)}</p>
      </div>
      <div class="elt-dash-header-actions">
        <button class="elt-btn-ghost" data-action="import-reports">Экспорт</button>
        <button class="elt-btn-ghost" data-open-filters="reports">⚲ Фильтры</button>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel elt-wide">
        <div class="elt-panel-head">
          <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="9" x2="11" y2="9" stroke="currentColor" stroke-width="1.2"/></svg><h2>Последние отчёты</h2></div>
          <span class="elt-panel-caption">готовы к выгрузке</span>
        </div>
        <div class="gp-list" id="repList">${reportRows}</div>
      </article>
    </section>
  </section>`;
}

export function renderSupport(state = {}) {
  const company = state.company || {};
  const contactName = company.contactName || "";
  // Отправитель — email из регистрации (аккаунт пользователя), с фолбэком на контакт компании.
  const contactEmail = (state.user && state.user.email) || company.contactEmail || "";
  return `
    <div class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Поддержка</span>
          <h1 class="elt-dash-title">Помощь и заявки</h1>
          <p class="elt-dash-subtitle">Срочные заявки рассматриваются быстрее, предложения по улучшению попадают в продуктовый backlog. Обращение уходит в Telegram команде поддержки.</p>
        </div>
      </header>
      <div class="elt-support-grid">
        <div class="elt-support-cards">
          <div class="elt-card elt-support-card elt-support-urgent">
            <div class="elt-support-badge">Срочная заявка</div>
            <h2>Критичная проблема</h2>
            <p>Если не открывается оценка, не формируется отчет, списались оценки или не работает доступ.</p>
            <div class="elt-support-sla">Срок: в течение суток</div>
            <button class="elt-btn-primary" data-support-pick="urgent">Оставить срочную заявку</button>
          </div>
          <div class="elt-card elt-support-card">
            <div class="elt-support-badge elt-support-badge-neutral">Обычная заявка</div>
            <h2>Вопрос по сервису</h2>
            <p>Настройки, тарифы, ссылки, отчеты, личный кабинет, работа с кандидатами и сотрудниками.</p>
            <div class="elt-support-sla">Срок: в рабочем порядке</div>
            <button class="elt-btn-secondary" data-support-pick="normal">Оставить заявку</button>
          </div>
          <div class="elt-card elt-support-card">
            <div class="elt-support-badge elt-support-badge-idea">Предложение</div>
            <h2>Улучшение сервиса</h2>
            <p>Идеи по новым отчетам, профилям, графикам, интеграциям или логике оценки.</p>
            <div class="elt-support-sla">Срок: 1–30 рабочих дней</div>
            <button class="elt-btn-ghost" data-support-pick="idea">Предложить улучшение</button>
          </div>
        </div>
        <div class="elt-card elt-support-form">
          <div class="elt-card-head"><h2>Форма обращения</h2></div>
          <div class="elt-form-grid">
            <label class="elt-label">Тип обращения<select class="elt-select" data-support-type>
              <option value="urgent">Срочная заявка</option>
              <option value="normal" selected>Обычная заявка</option>
              <option value="idea">Предложение по улучшению</option>
            </select></label>
            <label class="elt-label">Тема<input class="elt-input" data-support-subject placeholder="Коротко опишите вопрос"></label>
            <label class="elt-label elt-label-full">Описание<textarea class="elt-textarea" data-support-description placeholder="Что произошло, кого касается, какой ожидаемый результат"></textarea></label>
            <input type="hidden" data-support-name value="${contactName}">
            <input type="hidden" data-support-email value="${contactEmail}">
            <div class="elt-support-actions">
              <button class="elt-btn-primary" data-action="support-send">Отправить обращение</button>
              <span class="elt-support-status" data-support-status></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderGratitude() {
  const gratitudeItems = [
    {
      name: "Иванов Иван",
      role: "директор по персоналу",
      company: "ООО «Исток»",
      idea: "предложил добавить оценку личностного роста и расширить карту компетенций для внутренних сотрудников.",
      result: "Добавлены компетенции: саморефлексия, обучаемость, готовность к изменениям.",
      status: "в работе"
    },
    {
      name: "Мария Соколова",
      role: "HRD",
      company: "«Север IT»",
      idea: "попросила разделить отчеты для HRD и нанимающего руководителя.",
      result: "В отчетах появилась логика: краткое решение, риски, интервью и ИПР.",
      status: "внедрено"
    },
    {
      name: "Алексей Власов",
      role: "собственник бизнеса",
      company: "ГК «Практика»",
      idea: "предложил показывать вклад оценки в скорость закрытия вакансий и снижение текучести.",
      result: "В дашбордах добавлены графики эффективности и тепловые карты по ролям.",
      status: "внедрено"
    }
  ];
  const news = [
    ["07.06.2026", "Обновили раздел «Конструктор»: AI предлагает корпоративные, психологические и профессиональные компетенции по описанию роли."],
    ["06.06.2026", "Добавили загрузку сотрудников через Excel и шаблон для быстрого старта оценки по отделам."],
    ["05.06.2026", "Смягчили цветовую систему статусов: фокус теперь на хорошем результате и спокойной аналитике."]
  ];
  const statusColor = { 'в работе': '#D9A441', 'внедрено': '#22C55E' };
  return `
    <div class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Команда</span>
          <h1 class="elt-dash-title">Благодарности</h1>
          <p class="elt-dash-subtitle">Отмечайте коллег за помощь и результат</p>
        </div>
        <div class="elt-dash-header-actions">
          <button class="elt-btn-primary" data-view="support">Предложить улучшение</button>
        </div>
      </header>
      <div class="elt-card elt-gratitude-hero">
        <div>
          <span class="elt-mini-label">Product community</span>
          <h2>Мы дорабатываем платформу вместе с рынком</h2>
          <p>Если клиент предлагает решение, которое делает оценку полезнее для компаний, мы фиксируем вклад, показываем статус и благодарим публично.</p>
        </div>
        <div class="elt-gratitude-stats">
          <div><strong>3</strong><span>идеи в MVP</span></div>
          <div><strong>1–30</strong><span>дней на рассмотрение</span></div>
        </div>
      </div>
      <div class="elt-gratitude-grid">
        ${gratitudeItems.map((item) => `
          <div class="elt-card elt-gratitude-card">
            <div class="elt-gratitude-card-top">
              <div>
                <div class="elt-gratitude-name">${item.name}</div>
                <div class="elt-gratitude-role">${item.role} · ${item.company}</div>
              </div>
              <span class="elt-status-pill" style="color:${statusColor[item.status] || '#8899BB'}">${item.status}</span>
            </div>
            <p class="elt-gratitude-idea">${item.idea}</p>
            <div class="elt-gratitude-result">
              <span class="elt-gratitude-result-label">Что улучшили</span>
              <p>${item.result}</p>
            </div>
          </div>`).join('')}
      </div>
      <div class="elt-card">
        <div class="elt-card-head"><h2>Новости продукта</h2><span class="elt-card-caption">обновления MVP</span></div>
        <div class="elt-news-list">
          ${news.map(([date, text]) => `<div class="elt-news-item"><time class="elt-news-date">${date}</time><p>${text}</p></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

export function renderReport(state, session) {
  if (!session) return `<section class="pageHead"><h1>Отчет не найден</h1><button class="button" data-view="reports">Назад</button></section>`;
  const result = session.result;
  const statusClass = result.percent >= 82 && result.redFlags < 2 ? "good" : result.percent < 52 ? "bad" : "middle";
  return `
    <section class="reportPage">
      <div class="reportToolbar noPrint"><button class="button subtle" data-view="reports">Назад</button><div><button class="button subtle">Ответы</button><button class="button subtle">Интерпретация</button><button class="button subtle">${aiAccess(state.company.tariff)}</button><button class="blueButton" data-action="print-report">Скачать PDF</button></div></div>
      <article class="reportSheet">
        <header class="reportHeader"><img src="/assets/eltera_logo_horizontal_on_light.svg" alt="Eltera"><div><b>${new Date(session.completedAt).toLocaleDateString("ru-RU")} · конфиденциально</b><span>Отчет оценки ${session.person.assessmentType.toLowerCase()}</span></div></header>
        <h1>${session.person.fullName || "Участник"}: рекомендация для HRD, руководителя и собственника</h1><p class="reportLead">${session.professionTitle}. Решение: ${result.recommendation.toLowerCase()}.</p>
        <section class="decisionBox ${statusClass}"><div class="decisionScore">${result.percent}%<span>соответствие роли</span></div><div><h2>Итоговое решение: ${result.recommendation}</h2><p>${decisionText(result)}</p></div></section>
        <section class="reportStats">${stat("Готовность", readiness(result))}${stat("Риск ошибки найма", `${Math.max(8, 100 - result.percent)}%`)}${stat("Достоверность", `${Math.max(55, 96 - result.redFlags * 12)}%`)}${stat("Следующий этап", "45 мин")}</section>
        <section class="reportTwo"><div><h2>Что важно для HRD</h2><ul><li>Проверить соответствие профилю роли и риски по красным флагам.</li><li>Сравнить результат с другими кандидатами или сотрудниками.</li><li>Использовать рекомендации как основу для интервью или ИПР.</li></ul></div><div><h2>Что важно для руководителя</h2><ul><li>Сфокусироваться на слабых компетенциях в практическом кейсе.</li><li>Проверить дисциплину, коммуникацию и самостоятельность.</li><li>Не принимать решение только по проценту: отчет структурирует интервью.</li></ul></div></section>
        <section class="competencyReport"><h2>Профиль компетенций</h2>${Object.entries(result.competencyScores).map(([title, item]) => { const percent = item.maxScore ? Math.round((item.score / item.maxScore) * 100) : 0; return `<div class="reportCompetency"><span>${title}</span><i><b style="width:${percent}%"></b></i><strong>${percent}%</strong></div>`; }).join("")}</section>
        <section class="reportTwo"><div><h2>Красные флаги</h2><p>${result.redFlags ? `Обнаружено: ${result.redFlags}. Нужна дополнительная проверка.` : "Критичных красных флагов по ответам не выявлено."}</p></div><div><h2>AI-рекомендация</h2><p>${state.company.tariff === "TalentStudio" ? "Полное объяснение результата, сценарий интервью и рекомендации по команде доступны в AI-ассистенте." : "Для текущего тарифа доступна краткая VPR / ePR-рекомендация и рекомендации по следующему шагу."}</p></div></section>
        <footer class="reportFooter">Кандидат/сотрудник не видит внутренние выводы, риски и рекомендации. Отчет предназначен для принятия управленческого решения.</footer>
      </article>
    </section>
  `;
}

// Тарифы — портированы 1-в-1 из офлайн-референса tariffs.dc.html.
// key — ключ тарифа на бэкенде (services/tariffs.py): кнопка «Купить подписку»
// уходит в startTariffPayment(key) → purchaseTariff(key) → оплата через Монету.
const TARIFF_PLANS = [
  {
    key: "TalentCheck",
    name: "TalentCheck",
    price: "7 500 ₽",
    desc: "Для малого бизнеса и небольших команд.",
    included: "Включено",
    popular: false,
    features: [
      "25 токенов в месяц",
      "Оценка кандидатов и сотрудников",
      "Готовые профили компетенций",
      "AI-рекомендации по каждому человеку",
      "Краткий отчёт для принятия решения",
      "Базовая воронка оценки",
    ],
  },
  {
    key: "TalentPro",
    name: "TalentPro",
    price: "24 000 ₽",
    desc: "Для рекрутинговых агентств и HR-отделов.",
    included: "Всё из TalentCheck, плюс",
    popular: true,
    features: [
      "100 токенов в месяц",
      "Сравнение кандидатов между собой",
      "Расширенные AI-отчёты",
      "История результатов",
      "Групповые оценки",
      "Брендинг отчётов",
      "Воронка найма и аналитика",
    ],
  },
  {
    key: "TalentStudio",
    name: "Talent Studio",
    price: "75 000 ₽",
    desc: "Для компаний, которым нужна не просто оценка, а настройка системы под свои HR-процессы.",
    included: "Всё из TalentPro, плюс",
    popular: false,
    features: [
      "400 токенов в месяц",
      "Конструктор компетенций",
      "360-оценка",
      "Собственные вопросы и шкалы",
      "Корпоративные шаблоны оценки",
      "Групповые отчёты по командам и отделам",
      "Performance Review",
      "Расширенная аналитика",
    ],
  },
];

// Нормализуем текущий тариф организации к ключу карточки (Start/Starter — не показываются).
function normalizeTariffKey(t) {
  const v = String(t || "").replace(/\s+/g, "").toLowerCase();
  if (v === "talentcheck") return "TalentCheck";
  if (v === "talentpro") return "TalentPro";
  if (v === "talentstudio") return "TalentStudio";
  return null;
}

function tariffFeatureRow(text) {
  return `<div style="display:flex;align-items:flex-start;gap:9px"><span style="color:#00E5D4;font-size:13px;flex:none;line-height:1.3">✓</span><span style="font-size:13px;color:rgba(230,242,255,.82);line-height:1.4">${text}</span></div>`;
}

function tariffPlanCard(plan, currentKey) {
  const isCurrent = plan.key === currentKey;
  const badge = plan.popular
    ? `<span style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:5;padding:5px 16px;border-radius:999px;background:linear-gradient(135deg,#1E5BFF,#00E5D4);color:#02121a;font-size:11px;font-weight:800;letter-spacing:.08em;white-space:nowrap;box-shadow:0 6px 18px rgba(0,229,212,.4)">ПОПУЛЯРНЫЙ</span>`
    : "";
  // Кнопка: текущий тариф → «✓ Ваш тариф» (бирюзовая, без покупки), иначе «Купить подписку».
  let button;
  if (isCurrent) {
    button = `<button class="tariff-buy tariff-current" title="Ваш текущий тариф" style="margin-top:auto;width:100%;padding:13px;border:1px solid rgba(0,229,212,.45);border-radius:11px;background:rgba(0,229,212,.1);color:#00E5D4;font-family:inherit;font-weight:800;font-size:13px;cursor:default">✓ Ваш тариф</button>`;
  } else if (plan.popular) {
    button = `<button class="tariff-buy" data-open-sbp="${plan.key}" data-price="${plan.price}" style="margin-top:auto;width:100%;padding:13px;border:none;border-radius:11px;background:linear-gradient(135deg,#1E5BFF,#00E5D4);color:#02121a;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer">Купить подписку</button>`;
  } else {
    button = `<button class="tariff-buy elt-btn-ghost" data-open-sbp="${plan.key}" data-price="${plan.price}" style="margin-top:auto;width:100%;padding:13px">Купить подписку</button>`;
  }
  return `
    <article class="elt-panel${plan.popular ? " tariff-pop" : ""}" style="${plan.popular ? "position:relative;" : ""}padding:26px 24px;display:flex;flex-direction:column">
      ${badge}
      <h2 style="margin:0;font-size:21px;font-weight:800;color:#fff">${plan.name}</h2>
      <div style="display:flex;align-items:baseline;gap:6px;margin:6px 0 14px">
        <span style="font-size:34px;font-weight:800;color:#fff;letter-spacing:-.02em">${plan.price}</span>
        <span style="font-size:14px;color:rgba(230,242,255,.5)">/ мес</span>
      </div>
      <p style="margin:0;font-size:13px;color:rgba(230,242,255,.55);line-height:1.5">${plan.desc}</p>
      <div style="font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#00E5D4;margin:18px 0 12px">${plan.included}</div>
      <div style="display:flex;flex-direction:column;gap:11px">${plan.features.map(tariffFeatureRow).join("")}</div>
      ${button}
    </article>`;
}

export function renderTariffs(state) {
  const currentKey = normalizeTariffKey(state.company && state.company.tariff);
  return `
    <section class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Биллинг</span>
          <h1 class="elt-dash-title">Тарифы</h1>
          <p class="elt-dash-subtitle">Текущий план и пакеты токенов · 1 оценка = 1 токен</p>
        </div>
        <div class="elt-dash-header-actions"></div>
      </header>
      <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch;margin-top:22px;overflow:visible">
        ${TARIFF_PLANS.map((plan) => tariffPlanCard(plan, currentKey)).join("")}
      </section>
    </section>
  `;
}

export function renderReferrals(state) {
  const maxAssessments = Math.floor(state.referrals.available / state.company.assessmentPrice);
  const fmt = (n) => Number(n || 0).toLocaleString('ru-RU');
  const opDate = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '');
  // Знак суммы операции: + начисление, − списание/вывод.
  const opAmount = (amount) => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${fmt(Math.abs(amount))} ₽`;
  const inviteStatus = (s) => (s === 'paying'
    ? '<span class="elt-status-badge elt-status-completed">платит</span>'
    : '<span class="elt-status-badge elt-status-pending">новая</span>');
  const invites = state.referrals.invites || [];
  const paying = invites.filter((i) => i.status === "paying");
  const waiting = invites.filter((i) => i.status !== "paying");
  const refUrl = `${location.origin}${location.pathname}#/ref/${state.referrals.code || "…"}`;

  const kpiCards = [
    { label: "Приглашено", value: state.referrals.invited, caption: "компаний", status: "neutral", iconName: "referral" },
    { label: "Активны", value: state.referrals.paid, caption: "оплачивают", status: "good", iconName: "fit" },
    { label: "Начислено токенов", value: fmt(state.referrals.accrued), caption: "ELT", status: "good", iconName: "balance" }
  ];

  const inviteRow = (i, good) => `<div class="gp-row">
      <span style="width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,${good ? "#166534,#4ADE80" : "#9A3412,#FACC15"})"></span>
      <div style="flex:1 1 0%;min-width:0"><b>${escapeHtml(i.company_name || "Компания")}</b><br><span>${good ? `оплаты · ${fmt(i.total_payments)} ₽` : "ожидаем первую оплату"}</span></div>
      <span style="flex:0 0 auto;font-size:11.5px;font-weight:700;color:rgba(230,242,255,.62)">${i.accrued_bonus ? `+${fmt(i.accrued_bonus)} ELT` : "—"}</span>
    </div>`;
  const payHtml = paying.length ? paying.map((i) => inviteRow(i, true)).join("") : `<div class="ov-empty">Пока никто не платит.</div>`;
  const waitHtml = waiting.length ? waiting.map((i) => inviteRow(i, false)).join("") : `<div class="ov-empty">Нет приглашённых в ожидании.</div>`;

  const cd = [["Дней", "128"], ["Часов", "14"], ["Минут", "37"], ["Секунд", "52"]];
  const cdBox = ([label, val]) => `<div style="flex:1 1 0%;min-width:64px;text-align:center;padding:14px 8px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)"><div style="font-size:24px;font-weight:800;color:#06D7F5;letter-spacing:-.02em">${val}</div><div style="font-size:10.5px;color:rgba(230,242,255,.45);text-transform:uppercase;letter-spacing:.08em;margin-top:4px">${label}</div></div>`;

  const panelHead = (svg, title, caption) => `
    <div class="elt-panel-head">
      <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none">${svg}</svg><h2>${title}</h2></div>
      ${caption ? `<span class="elt-panel-caption">${caption}</span>` : ""}
    </div>`;

  return `<section class="elt-dashboard">
    <header class="elt-dash-header">
      <div class="elt-dash-header-left">
        <span class="elt-mini-label">Программа</span>
        <h1 class="elt-dash-title">Реферальная программа</h1>
        <p class="elt-dash-subtitle">Приглашайте коллег и получайте токены</p>
      </div>
    </header>

    <section class="elt-kpi-grid">
      ${kpiCards.map(kpiCard).join("")}
    </section>

    <article class="elt-panel elt-wide" style="margin-bottom:16px">
      ${panelHead('<path d="M6 9.5L3.8 11.7a2.1 2.1 0 0 1-3-3L3 6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M9 5.5l2.2-2.2a2.1 2.1 0 0 1 3 3L12 8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="5.6" y1="9.4" x2="9.4" y2="5.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', "Ваша реферальная ссылка", "поделитесь с коллегой")}
      <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;background:rgba(6,16,22,.66);border:1px solid rgba(6,215,245,.32);border-radius:12px;padding:14px 16px;margin:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="color:#06D7F5;font-weight:700">&gt;</span>
        <span id="refLink" style="color:#8BEAF7;font-size:13.5px;flex:1 1 0%;min-width:0;overflow:hidden;text-overflow:ellipsis">${escapeHtml(refUrl)}</span>
        <span style="width:8px;height:15px;background:#E3D29B;animation:caBlink 1s step-end infinite;flex:0 0 auto"></span>
        <button class="elt-btn-ghost" data-action="copy-ref" style="flex:0 0 auto">Скопировать</button>
      </div>
    </article>

    <section class="elt-analytics-grid">
      <article class="elt-panel elt-chart-panel">
        ${panelHead('<circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M5 7.5l1.8 1.8L10 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>', "На оплате", "активные рефералы")}
        <div class="gp-list">${payHtml}</div>
      </article>

      <article class="elt-panel elt-chart-panel">
        ${panelHead('<circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 4v3.5l2.4 1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>', "Ожидаем оплату", "приглашены")}
        <div class="gp-list">${waitHtml}</div>
      </article>
    </section>

    <article class="elt-panel elt-wide" style="margin-top:16px;text-align:center">
      <div class="elt-panel-head" style="justify-content:center">
        <div class="elt-panel-head-left"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 4v3.5l2.4 1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><h2>До запуска токена ELT</h2></div>
      </div>
      <p style="margin:2px 16px 16px;font-size:12.5px;color:rgba(230,242,255,.5)">Накопленные реферальные токены будут конвертированы в криптовалюту <b style="color:#06D7F5">ELT</b> в момент листинга</p>
      <div style="display:flex;gap:10px;max-width:460px;margin:0 auto 20px;padding:0 16px">${cd.map(cdBox).join("")}</div>
    </article>
  </section>`;
}

export function renderApiKeys(state) {
  const apiKeyId = `elt_live_${state.company.inn || 'demo'}_01`;
  return `
    <div class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Интеграции</span>
          <h1 class="elt-dash-title">API-ключи</h1>
          <p class="elt-dash-subtitle">Доступ к платформе по API · раздел в разработке</p>
        </div>
        <div class="elt-dash-header-actions">
          <button class="elt-btn-primary">Создать API-ключ</button>
        </div>
      </header>
      <div class="elt-api-grid">
        <div class="elt-card elt-api-card elt-api-primary">
          <span class="elt-api-label">ID ключа</span>
          <h2 class="elt-api-key-id">${apiKeyId}</h2>
          <p>Используется для запросов к API компании ${state.company.name}.</p>
          <div class="elt-api-secret"><code class="elt-code">sk_live_••••••••••••••••••••••••</code><button class="elt-btn-ghost">Показать</button></div>
        </div>
        <div class="elt-card elt-api-card">
          <span class="elt-api-label">Base API</span>
          <h2>/api/v1</h2>
          <p>Создание оценок, загрузка сотрудников, получение отчетов, статусов и PDF.</p>
          <code class="elt-code">https://api.eltera.ai/api/v1</code>
        </div>
        <div class="elt-card elt-api-card">
          <span class="elt-api-label">Входящий webhook</span>
          <h2>incoming</h2>
          <p>Принимает сотрудников, кандидатов, вакансии и команды из внешних систем.</p>
          <code class="elt-code">POST /webhooks/incoming/${apiKeyId}</code>
        </div>
        <div class="elt-card elt-api-card">
          <span class="elt-api-label">Исходящий webhook</span>
          <h2>outgoing</h2>
          <p>Отправляет события: оценка создана, пройдена, отчет готов, PDF сформирован.</p>
          <code class="elt-code">POST https://your-company.ru/eltera/webhook</code>
        </div>
      </div>
      <div class="elt-card">
        <div class="elt-card-head"><h2>JSON-файлы и примеры</h2><span class="elt-card-caption">для разработчика</span></div>
        <div class="elt-api-doc-actions">
          <a class="elt-btn-ghost" href="/assets/eltera-api-create-assessment-example.json" download>Скачать JSON создания оценки</a>
          <a class="elt-btn-ghost" href="/assets/eltera-incoming-webhook-example.json" download>Скачать JSON входящего webhook</a>
          <a class="elt-btn-ghost" href="/assets/eltera-outgoing-webhook-example.json" download>Скачать JSON исходящего webhook</a>
        </div>
        <pre class="elt-pre"><code>{
  "api_key_id": "${apiKeyId}",
  "event": "assessment.completed",
  "person_type": "employee",
  "report_url": "https://app.eltera.ai/reports/report_653757",
  "pdf_url": "https://app.eltera.ai/reports/report_653757.pdf"
}</code></pre>
      </div>
    </div>
  `;
}

export function renderSettings(state) {
  const c = state.company || {};
  const s = state.settings || {};
  // Реальные значения аккаунта: почта из сессии, ФИО/роль из контактного лица.
  const accEmail = (state.user && state.user.email) || c.contactEmail || "";
  const accName = `${c.contactFirstName || ""} ${c.contactLastName || ""}`.trim() || "Администратор";
  const accInits = ((c.contactFirstName || "Р")[0] + (c.contactLastName || "К")[0]).toUpperCase();
  const photo = (state.employeePhotos || {}).ceo;
  const on = (key, dflt) => (s[key] === undefined ? dflt : s[key] === true);
  // Переключатель-«тумблер» — визуально совпадает с референсом; состояние в aria-pressed.
  const sw = (key, isOn) => `<button class="set-sw" data-settings-toggle="${key}" aria-pressed="${isOn ? "true" : "false"}" style="position:relative;width:40px;height:22px;border-radius:999px;border:1px solid transparent;flex:none;cursor:pointer;padding:0;transition:background .15s"><span style="position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s"></span></button>`;
  const row = (title, sub, right) => `<div class="gp-row"><div style="flex:1;min-width:0"><b>${title}</b><br><span>${sub}</span></div>${right || ""}</div>`;
  const statusPill = (label, grad) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:11px;font-weight:600;color:#cdd9ee"><span style="width:8px;height:8px;border-radius:50%;flex:none;background:linear-gradient(135deg,${grad})"></span>${label}</span>`;
  const SVG = {
    company: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="9" x2="11" y2="9" stroke="currentColor" stroke-width="1.2"/></svg>`,
    profile: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="2.6" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    sound: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 6v3h2.5L8 12V3L4.5 6H2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M10.5 5.5a3 3 0 0 1 0 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    theme: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8 1.5A5.5 5.5 0 1 0 13.5 8 4.3 4.3 0 0 1 8 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
    access: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="6.5" width="10" height="7" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 6.5V4.5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.3"/></svg>`
  };
  const panelHead = (icon, title, caption) => `<div class="elt-panel-head"><div class="elt-panel-head-left">${icon}<h2>${title}</h2></div><span class="elt-panel-caption">${caption}</span></div>`;
  const avatarInner = photo
    ? `<img class="oc-avatar-img" src="${photo}" alt="${escapeHtml(accName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : escapeHtml(accInits);
  return `
    <div class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">Аккаунт</span>
          <h1 class="elt-dash-title">Настройки</h1>
          <p class="elt-dash-subtitle">Компания, уведомления и доступы</p>
        </div>
        <div class="elt-dash-header-actions"></div>
      </header>
      <section class="elt-analytics-grid">
        <article class="elt-panel elt-chart-panel">
          ${panelHead(SVG.company, "Компания", "основное")}
          <div class="gp-list">
            ${row("Название", escapeHtml(c.name || "Компания"))}
            ${row("Тариф", escapeHtml(c.tariff || "—"))}
            ${row("Часовой пояс", "GMT+3 · Москва")}
          </div>
        </article>
        <article class="elt-panel elt-chart-panel">
          ${panelHead(SVG.company, "Уведомления", "каналы")}
          <div class="gp-list">
            ${row("E-mail", "новые отчёты и алерты", statusPill("вкл", "#0E7490,#00E5D4"))}
            ${row("Telegram-бот", "срочные сигналы", statusPill("выкл", "#475569,#8C9BB5"))}
          </div>
        </article>
      </section>
      <section class="elt-analytics-grid" style="margin-top:16px">
        <article class="elt-panel elt-chart-panel">
          ${panelHead(SVG.profile, "Профиль и аватар", "аккаунт")}
          <div style="display:flex;align-items:center;gap:14px;padding:6px 2px">
            <span id="setAv" data-oc-avatar="ceo" style="width:52px;height:52px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:16px;font-weight:800;color:#02121a;background:linear-gradient(135deg,#1E5BFF,#00E5D4);overflow:hidden;cursor:pointer">${avatarInner}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#E6F2FF;font-weight:700">${escapeHtml(accEmail)}</div>
              <div style="font-size:11.5px;color:rgba(230,242,255,.5)">${escapeHtml(accName)} · Администратор</div>
            </div>
            <button data-oc-avatar="ceo" style="flex:none;padding:8px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#E6F2FF;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer">Сменить фото</button>
          </div>
        </article>
        <article class="elt-panel elt-chart-panel">
          ${panelHead(SVG.sound, "Звуки интерфейса", "аудио")}
          <div class="gp-list">
            ${row("Звуки интерфейса", "клики, уведомления, AI-терминал", sw("sfx", on("sfx", true)))}
            <div class="gp-row"><div style="flex:1;min-width:0"><b>Свой звук клика</b><br><span id="setSndName">${escapeHtml(s.sndName || "Стандартный звук")}</span></div><div style="display:flex;gap:6px;flex:none"><button data-settings-sound="play" title="Прослушать" style="width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#cdd9ee;cursor:pointer;font-size:12px">▶</button><button data-settings-sound="upload" style="padding:7px 11px;border-radius:9px;border:1px solid rgba(0,229,212,.4);background:rgba(0,229,212,.1);color:#00E5D4;font-family:inherit;font-weight:700;font-size:11.5px;cursor:pointer">Загрузить</button><button data-settings-sound="reset" title="Сбросить" style="width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#cdd9ee;cursor:pointer;font-size:12px">↺</button></div></div>
          </div>
        </article>
        <article class="elt-panel elt-chart-panel">
          ${panelHead(SVG.theme, "Оформление", "тема")}
          <div class="gp-list">
            ${row("Тёмная тема", "тёмное оформление интерфейса", sw("theme", state.theme !== "light"))}
          </div>
        </article>
        <article class="elt-panel elt-chart-panel">
          ${panelHead(SVG.access, "Права доступа", "роль: администратор")}
          <div class="gp-list">
            ${row("Просмотр аналитики", "дашборды, отчёты, срезы", sw("analytics", on("analytics", true)))}
            ${row("Управление сотрудниками", "добавление, редактирование, структура", sw("employees", on("employees", true)))}
            ${row("Запуск оценок", "создание и отправка оценок", sw("assess", on("assess", true)))}
            ${row("Тарифы и биллинг", "оплата, пополнение токенов", sw("tariffs", on("tariffs", false)))}
          </div>
        </article>
      </section>
    </div>
  `;
}

// ─── Прохождение теста с бэка: стартовый экран + пошаговый мастер ──────────────
function assessIsAnswered(q, answers) {
  const v = answers[q.question_version_id];
  if (q.type === "multiple_choice") return Array.isArray(v) && v.length > 0;
  if (q.type === "open") return typeof v === "string" && v.trim().length > 0;
  return v !== undefined && v !== null && v !== "";
}

function assessFmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const ASSESS_CLOCK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const ASSESS_BARS_SVG = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>`;

function renderAssessOptions(q, answers) {
  const qid = q.question_version_id;
  const cur = answers[qid];
  if (q.type === "single_choice") {
    return `<div class="assessOpts">${q.options.map((o) => `<label class="assessOpt${cur === o.id ? " selected" : ""}"><input type="radio" name="q_${qid}" value="${o.id}" data-assess-input data-qid="${qid}" data-qtype="single_choice" ${cur === o.id ? "checked" : ""}><span class="assessOptMark"></span><span class="assessOptText">${o.text}</span></label>`).join("")}</div>`;
  }
  if (q.type === "multiple_choice") {
    const arr = Array.isArray(cur) ? cur : [];
    return `<p class="assessHint">Выберите все подходящие варианты</p><div class="assessOpts">${q.options.map((o) => `<label class="assessOpt${arr.includes(o.id) ? " selected" : ""}"><input type="checkbox" value="${o.id}" data-assess-input data-qid="${qid}" data-qtype="multiple_choice" ${arr.includes(o.id) ? "checked" : ""}><span class="assessOptMark square"></span><span class="assessOptText">${o.text}</span></label>`).join("")}</div>`;
  }
  if (q.type === "scale") {
    const min = q.scale_min ?? 1;
    const max = q.scale_max ?? 5;
    let cells = "";
    for (let v = min; v <= max; v++) {
      cells += `<label class="assessScaleCell${Number(cur) === v ? " selected" : ""}"><input type="radio" name="q_${qid}" value="${v}" data-assess-input data-qid="${qid}" data-qtype="scale" ${Number(cur) === v ? "checked" : ""}><span>${v}</span></label>`;
    }
    return `<div class="assessScale">${cells}</div>`;
  }
  return `<textarea class="assessOpen" data-assess-input data-qid="${qid}" data-qtype="open" rows="5" placeholder="Ваш ответ">${typeof cur === "string" ? cur : ""}</textarea>`;
}

function renderAssessFlow(link, apiForm, cand) {
  const total = apiForm.questions.length;
  const answers = cand.answers || {};
  const title = apiForm.title || link.professionTitle || "Оценка";
  const minutes = apiForm.duration_min || 25;

  // 360: кого оценивает респондент (для оценщиков, не для самооценки).
  const roleRu = { manager: "как руководитель", peer: "как коллега", report: "как подчинённый" };
  const subjectBanner = apiForm.subject_name
    ? `<div class="assessSubject"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>Вы оцениваете: <b>${apiForm.subject_name}</b>${apiForm.rater_role && roleRu[apiForm.rater_role] ? ` · ${roleRu[apiForm.rater_role]}` : ""}</div>`
    : "";

  // ── Стартовый экран (первый этап): имя, e-mail, инфо о тесте ──
  if (cand.stage !== "questions") {
    const name = cand.name != null ? cand.name : (apiForm.full_name || link.fullName || "");
    const email = cand.email != null ? cand.email : (apiForm.email || link.email || "");
    return `<div class="candidatePage assessPage"><main class="assessIntro">
      <div class="assessIntroIcon">${ASSESS_BARS_SVG}</div>
      <h1 class="assessIntroTitle">${title}</h1>
      <p class="assessIntroSub">Оценка компетенций</p>
      ${subjectBanner}
      <div class="assessInfoBox"><ul>
        <li>Время на прохождение: <b>${minutes} минут</b></li>
        <li>Вопросов: <b>${total}</b></li>
        <li>Ваши ответы конфиденциальны</li>
        <li>Баллы не отображаются во время оценки</li>
      </ul></div>
      <label class="assessField"><span>Ваше имя</span><input id="assessName" value="${name}" placeholder="Иванов Иван Иванович"></label>
      <label class="assessField"><span>Email (необязательно)</span><input id="assessEmail" type="email" value="${email}" placeholder="ivanov@example.com"></label>
      <button class="assessStartBtn" data-assess-start>Начать оценку →</button>
    </main></div>`;
  }

  // ── Пошаговый мастер: один вопрос на экран ──
  const idx = Math.min(cand.qIndex || 0, total - 1);
  const q = apiForm.questions[idx];
  const pct = Math.round(((idx + 1) / total) * 100);
  const answered = assessIsAnswered(q, answers);
  const isLast = idx === total - 1;
  const remaining = Math.max(0, Math.floor(((cand.deadlineTs || 0) - Date.now()) / 1000));
  // Точки-индикаторы показываем только при небольшом числе вопросов — иначе
  // (тесты на 100+ вопросов) ряд точек переполняет строку и «уносит» страницу.
  // При большом числе достаточно прогресс-бара и счётчика «Вопрос N из M».
  const dots = total <= 24
    ? apiForm.questions.map((qq, i) => `<span class="assessDot${i === idx ? " active" : ""}${assessIsAnswered(qq, answers) ? " done" : ""}"></span>`).join("")
    : "";
  const nextDisabled = q.type !== "open" && !answered;
  return `<div class="candidatePage assessPage"><main class="assessWizard">
    <div class="assessTopbar">
      <div class="assessTopLeft"><h1>${title}</h1><span class="assessQCount">Вопрос ${idx + 1} из ${total}</span></div>
      <div class="assessTimer" id="assessTimer">${ASSESS_CLOCK_SVG}<span>${assessFmtClock(remaining)}</span></div>
    </div>
    <div class="assessProgress"><div class="assessProgressFill" style="width:${pct}%"></div></div>
    ${subjectBanner}
    <article class="assessQCard">
      <h2>${q.text}</h2>
      ${renderAssessOptions(q, answers)}
    </article>
    <div class="assessNav">
      <button class="assessNavBtn" data-assess-prev ${idx === 0 ? "disabled" : ""}>‹ Назад</button>
      <div class="assessDots">${dots}</div>
      <button class="assessNavBtn primary" data-assess-next ${nextDisabled ? "disabled" : ""}>${isLast ? "Завершить" : "Далее ›"}</button>
    </div>
    <div class="assessNote">Все ваши ответы конфиденциальны и будут использованы только для оценки компетенций.</div>
  </main></div>`;
}

export function renderCandidateAssessment(link, profession, questions, answers, competencyTitleById, apiForm, formError, cand) {
  if (!link) return `<div class="candidatePage"><div class="candidateCard"><h1>Ссылка недействительна</h1><p>Ссылка отменена, истекла или не найдена.</p><a class="blueButton" href="#/">На главную</a></div></div>`;

  // Тест с бэка: стартовый экран + пошаговый мастер.
  if (apiForm !== undefined) {
    const title = (apiForm && apiForm.title) || link.professionTitle || "Оценка";
    if (formError) {
      return `<div class="candidatePage"><main class="candidateCard"><h1>${title}</h1><p>${formError}</p><a class="blueButton" href="#/">На главную</a></main></div>`;
    }
    if (!apiForm) {
      return `<div class="candidatePage"><main class="candidateCard"><h1>${title}</h1><p>Загружаем тест…</p></main></div>`;
    }
    return renderAssessFlow(link, apiForm, cand || {});
  }

  return `
    <div class="candidatePage"><header class="candidateHeader"><img src="/assets/eltera_logo_horizontal_on_light.svg" alt="Eltera"></header><main class="candidateCard"><span class="miniLabel">${link.recipientType} · ${link.professionTitle || profession.title}</span><h1>${link.professionTitle || profession.title}</h1><p>Заполните данные и ответьте на вопросы. Компания получит отчет после завершения оценки.</p><form class="candidateForm" data-candidate-form><label>ФИО<input name="fullName" required value="${link.fullName || ""}" placeholder="Иванов Иван"></label><label>Телефон<input name="phone" value="${link.phone || ""}" placeholder="+7..."></label><label>Email<input name="email" value="${link.email || ""}" placeholder="name@example.com"></label><label>Город<input name="city" placeholder="Москва"></label><label class="checkboxLine"><input type="checkbox" required><span>Согласен на обработку персональных данных</span></label><div class="questionList compact">${questions.map((question, index) => `<article class="questionCard"><div class="questionHead"><span>${competencyTitleById[question.competencyId] || question.competencyId}</span><b>${index + 1}/${questions.length}</b></div><h3>${question.text}</h3><div class="answers">${question.answers.map((answer, answerIndex) => `<label class="answer"><input type="radio" required name="${question.id}" value="${answerIndex}" ${answers[question.id] === answerIndex ? "checked" : ""}><span>${answer.text}</span></label>`).join("")}</div></article>`).join("")}</div><button class="blueButton wide" type="submit">Завершить оценку</button></form></main></div>
  `;
}

export function renderCandidateThanks() {
  return `<div class="candidatePage"><main class="candidateCard thanks"><img src="/assets/eltera_app_icon_4bars_glow.png" alt=""><h1>Спасибо, оценка завершена</h1><p>Результаты переданы компании. Внутренний отчет, рекомендации и красные флаги доступны только ответственному HR или руководителю.</p><a class="blueButton" href="#/">На сайт Eltera</a></main></div>`;
}

// Поисковый селектор кандидатского профиля (серверный поиск, лимит 50).
// Хранит выбор в скрытом поле professionId (читает addCandidateFromForm).
function candProfilePicker(state) {
  const q = state.candProfileQuery || "";
  const results = state.candProfileResults;
  const selId = state.candProfileSelId || "";
  const selTitle = state.candProfileSelTitle || "";
  const selected = selId
    ? `<div class="cand-prof-selected">Выбран: <b>${escapeHtml(selTitle)}</b><button type="button" class="cand-prof-clear" data-candprofile-clear title="Сбросить">✕</button></div>`
    : "";
  let list = "";
  if (!selId) {
    if (results == null) {
      list = `<div class="cand-prof-hint">Загрузка…</div>`;
    } else if (!results.length) {
      list = `<div class="cand-prof-hint">${q ? "Ничего не найдено" : "Начните вводить название профиля"}</div>`;
    } else {
      list = `<div class="cand-prof-list">${results.map((t) =>
        `<button type="button" class="cand-prof-opt" data-candprofile-pick="${t.id}" data-candprofile-title="${escapeHtml(t.title)}">${escapeHtml(t.title)}${t.category ? ` <span>· ${escapeHtml(t.category)}</span>` : ""}</button>`
      ).join("")}${results.length >= 50 ? `<div class="cand-prof-hint">Показаны первые 50 — уточните поиск</div>` : ""}</div>`;
    }
  }
  return `
    <input type="hidden" name="professionId" value="${escapeHtml(selId)}">
    <div class="cand-prof-picker">
      <input class="elt-input" data-candprofile-search placeholder="Поиск профиля по названию…" value="${escapeHtml(q)}" autocomplete="off" onkeydown="if(event.key==='Enter')event.preventDefault()">
      ${selected}
      ${list}
    </div>`;
}

// Пополнение баланса оценок через провайдера Монета. Мультишаговая модалка:
// select → processing/redirecting → waiting → success | error | timeout.
const TOPUP_FALLBACK_PACKS = [
  { pack: 20, amount: 990, per_assessment: 49.5, best_value: false },
  { pack: 100, amount: 3900, per_assessment: 39, best_value: false },
  { pack: 500, amount: 14900, per_assessment: 29.8, best_value: true }
];

function renderTopupModal(state, mHead) {
  const rub = (n) => Number(n).toLocaleString("ru-RU");
  const m = state.modal;
  const b = state.billing || {};
  const packs = (b.packs && b.packs.length) ? b.packs : TOPUP_FALLBACK_PACKS;
  const balance = (typeof b.balance === "number") ? b.balance : (state.company.balance || 0);
  const configured = b.configured !== false;          // по умолчанию считаем настроенным
  const step = m.step || "select";
  const selected = packs.find((p) => p.pack === m.pack) || packs[0];
  const discount = m.promoApplied ? 0.10 : 0;
  const amount = selected ? Math.round(selected.amount * (1 - discount) * 100) / 100 : 0;

  const isTariff = m.purpose === "tariff";
  const head = mHead(isTariff ? `Оплата тарифа ${m.tariffName || ""}`.trim() : "Пополнение баланса", "💳");
  const wrap = (inner, cls = "") => `<div class="modalBackdrop"><div class="modal topup-modal ${cls}">${head}<div class="modal-inner topup-inner">${inner}</div></div></div>`;

  // ── Промежуточные/финальные состояния ──
  const spinner = `<div class="topup-spinner" aria-hidden="true"></div>`;

  if (step === "processing" || step === "redirecting") {
    const text = step === "redirecting" ? "Открываем защищённую форму оплаты Монеты…" : "Создаём платёж…";
    return wrap(`<div class="topup-state">${spinner}<div class="topup-state-title">${text}</div><div class="topup-state-sub">Это займёт пару секунд</div></div>`);
  }

  if (step === "waiting") {
    const demo = m.demo ? `<div class="topup-state-sub">Демо-режим: имитируем подтверждение оплаты…</div>` : `<div class="topup-state-sub">Подтвердите оплату в открывшемся окне Монеты. Зачисление произойдёт автоматически.</div>`;
    return wrap(`<div class="topup-state">${spinner}<div class="topup-state-title">Ожидаем подтверждение оплаты…</div>${demo}
      <div class="topup-state-actions">
        <button class="elt-btn-ghost" data-action="topup-check">Проверить статус</button>
        <button class="elt-btn-ghost" data-action="topup-cancel">Отменить</button>
      </div></div>`);
  }

  if (step === "success") {
    const credited = m.creditedPack || selected?.pack || 0;
    const title = isTariff ? `Тариф ${m.tariffName || ""} подключён`.trim() : "Баланс пополнен";
    return wrap(`<div class="topup-state topup-state-success">
      <div class="topup-badge-ok" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="topup-state-title">${title}</div>
      <div class="topup-state-sub">Зачислено <strong>+${credited} токенов</strong>. Текущий баланс: <strong>${balance}</strong>.</div>
      <div class="topup-state-actions"><button class="elt-btn-primary" data-action="topup-done">Готово</button></div>
    </div>`, "topup-modal-narrow");
  }

  if (step === "error") {
    return wrap(`<div class="topup-state topup-state-error">
      <div class="topup-badge-err" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 7v6M12 16.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/></svg></div>
      <div class="topup-state-title">Оплата не прошла</div>
      <div class="topup-state-sub">${escapeHtml(m.error || "Не удалось завершить платёж.")}</div>
      <div class="topup-state-actions">
        <button class="elt-btn-ghost" data-action="topup-done">Закрыть</button>
        <button class="elt-btn-primary" data-action="topup-retry">Попробовать снова</button>
      </div></div>`, "topup-modal-narrow");
  }

  if (step === "timeout") {
    return wrap(`<div class="topup-state">
      <div class="topup-state-title">Платёж ещё обрабатывается</div>
      <div class="topup-state-sub">Если вы завершили оплату, баланс обновится в течение нескольких минут.</div>
      <div class="topup-state-actions">
        <button class="elt-btn-ghost" data-action="topup-done">Закрыть</button>
        <button class="elt-btn-primary" data-action="topup-check">Проверить статус</button>
      </div></div>`, "topup-modal-narrow");
  }

  // ── Шаг выбора пакета ──
  const packCards = packs.map((p) => {
    const sel = p.pack === selected?.pack;
    const badge = p.best_value ? `<span class="topup-pack-badge">выгодно</span>` : "";
    return `<button class="topup-pack${sel ? " topup-pack-selected" : ""}" data-action="topup-select-pack" data-pack="${p.pack}">
      ${badge}
      <span class="topup-pack-count">+${p.pack}</span>
      <span class="topup-pack-unit">оценок</span>
      <span class="topup-pack-price">${rub(p.amount)} ₽</span>
      <span class="topup-pack-per">${rub(p.per_assessment)} ₽ / оценка</span>
    </button>`;
  }).join("");

  const promoBlock = m.promoApplied
    ? `<div class="topup-promo-applied"><span>✓ Промокод ${escapeHtml(m.promoCode || "")} — скидка 10%</span><button class="topup-promo-clear" data-action="topup-clear-promo">Убрать</button></div>`
    : `<div class="topup-promo-row">
         <input class="elt-input topup-promo-input" placeholder="Промокод" data-topup-promo-input value="${escapeHtml(m.promoCode || "")}">
         <button class="elt-btn-ghost" data-action="topup-apply-promo">Применить</button>
       </div>${m.error ? `<div class="topup-error-inline">${escapeHtml(m.error)}</div>` : ""}`;

  const demoNote = !configured
    ? `<div class="topup-demo-note">Демо-режим: провайдер Монета не настроен — оплата будет имитирована.</div>`
    : "";

  const inner = `
    <div class="topup-balance-now">
      <span class="topup-balance-label">Сейчас на балансе</span>
      <span class="topup-balance-value">${balance} <em>оценок</em></span>
    </div>
    <div class="topup-section-label">Выберите пакет</div>
    <div class="topup-packs">${packCards}</div>
    <div class="topup-section-label">Промокод</div>
    ${promoBlock}
    <div class="topup-summary">
      <div class="topup-summary-row"><span>Пакет</span><span>+${selected?.pack || 0} оценок</span></div>
      ${discount ? `<div class="topup-summary-row topup-summary-muted"><span>Скидка по промокоду</span><span>−10%</span></div>` : ""}
      <div class="topup-summary-row topup-summary-total"><span>К оплате</span><strong>${rub(amount)} ₽</strong></div>
    </div>
    ${demoNote}
    <button class="elt-btn-primary topup-cta" data-action="topup-pay"${m.busy ? " disabled" : ""}>Оплатить ${rub(amount)} ₽</button>
    <div class="topup-trust">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      Оплата через MONETA.RU · защищённое соединение · карты и СБП
    </div>`;
  return wrap(inner);
}

function renderModal(state) {
  const mHead = (title, icon = '') => `<div class="modal-head"><div class="modal-head-left">${icon ? `<span class="modal-head-icon">${icon}</span>` : ''}<h2 class="modal-head-title">${title}</h2></div><button class="modal-close-btn" data-action="close-modal" title="Закрыть"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`;

  // ── Drill-down по KPI-карточке вакансий ──
  if (state.modal?.type === "vacancy-list") {
    const titles = {
      active_no_responses: "Активные вакансии без откликов",
      low_conversion: "Низкая конверсия",
      good_conversion: "Хорошая конверсия",
      total_responses: "Отклики по вакансиям",
      assessments_sent: "Отправленные оценки",
      fit_profile: "Подходящие под профиль",
      closed_in_period: "Закрытые за период",
    };
    const drill = state.vacancyDrill;
    let body;
    if (state.vacancyDrillStatus === "loading" || !drill) {
      body = `<p class="modal-subtitle">Загрузка…</p>`;
    } else if (!drill.items.length) {
      body = `<p class="modal-subtitle">Нет вакансий по этому условию за выбранный период.</p>`;
    } else {
      body = `<div class="elt-table-wrap"><table class="elt-table">
        <thead><tr><th>Вакансия</th><th>Отклики</th><th>Подходящие</th><th>Конверсия</th><th>Оценок</th><th>Статус</th><th></th></tr></thead>
        <tbody>${drill.items.map((v) => `<tr>
          <td>${escapeHtml(v.title)}${v.city ? `<small style="display:block;color:#6E7C97">${escapeHtml(v.city)}</small>` : ""}</td>
          <td>${v.responses_period}</td><td>${v.suitable}</td><td>${v.conversion}%</td><td>${v.assessments_sent}</td>
          <td>${v.status === "closed" ? "закрыта" : "активна"}</td>
          <td><div class="row-actions-inline" style="display:flex;gap:6px;justify-content:flex-end">
            <button class="elt-action-pill" data-vac-responses="${v.vacancy_id}">Отклики${v.responses_period ? " " + v.responses_period : ""}</button>
            ${v.url ? `<a class="elt-action-pill" href="${v.url}" target="_blank" rel="noopener">hh.ru ↗</a>` : ""}
          </div></td>
        </tr>`).join("")}</tbody>
      </table></div>`;
    }
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead(titles[state.modal.card] || "Вакансии", '📊')}<div class="modal-inner">${body}</div></div></div>`;
  }

  // ── Отклики по вакансии ──
  if (state.modal?.type === "vacancy-responses") {
    // Стадия воронки HH → подпись + цвет бейджа.
    const stageMap = {
      response: ["Отклик", "neutral"],
      consider: ["Подумать", "neutral"],
      phone_interview: ["Телефонное интервью", "medium"],
      assessment: ["Тестирование", "medium"],
      interview: ["Собеседование", "medium"],
      offer: ["Оффер", "good"],
      hired: ["Принят", "good"],
      discard_by_employer: ["Отказ работодателя", "bad"],
      discard_by_applicant: ["Отозван кандидатом", "bad"],
      discard_no_interaction: ["Без ответа", "bad"],
      discard_vacancy_closed: ["Вакансия закрыта", "bad"],
      discard_to_other_vacancy: ["Переведён на другую", "neutral"],
    };
    const stageBadge = (st) => {
      const [label, cls] = stageMap[st] || [st || "—", "neutral"];
      return `<span class="elt-status-badge status-${cls}">${escapeHtml(label)}</span>`;
    };
    const r = state.vacancyResponses;
    let body;
    if (state.vacancyResponsesStatus === "loading" || !r) {
      body = `<p class="modal-subtitle">Загрузка откликов…</p>`;
    } else if (state.vacancyResponsesStatus === "error") {
      body = `<p class="modal-subtitle">Не удалось загрузить отклики. Попробуйте «Обновить из hh.ru».</p>`;
    } else if (!r.items.length) {
      body = `<p class="modal-subtitle">За выбранный период (${r.period}) откликов нет. Переключите период на 30 дней или нажмите «Обновить из hh.ru».</p>`;
    } else {
      const tests = state.assessmentTests || [];
      const testPicker = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span class="modal-subtitle" style="margin:0">Тест для перевода в кандидаты:</span>
        <select class="elt-search" data-convert-test style="max-width:280px">
          ${tests.length ? "" : `<option value="">— нет тестов —</option>`}
          ${testOptionsHtml(tests, state.modal.defaultTestId)}
        </select>
      </div>`;
      body = `<p class="modal-subtitle">${r.total} откликов за период ${r.period}.</p>
      ${testPicker}
      <div class="elt-table-wrap"><table class="elt-table">
        <thead><tr><th>Кандидат</th><th>Статус</th><th>Дата</th><th></th></tr></thead>
        <tbody>${r.items.map((e) => `<tr>
          <td>${escapeHtml(e.candidate_name || "—")}</td>
          <td>${e.converted ? `<span class="elt-status-badge status-good">Переведён в кандидаты</span>` : stageBadge(e.state)}</td>
          <td>${e.occurred_at ? new Date(e.occurred_at).toLocaleDateString("ru-RU") : "—"}</td>
          <td><div class="row-actions-inline" style="display:flex;gap:6px;justify-content:flex-end">
            ${e.converted
              ? `<span class="elt-action-pill" style="opacity:.6">✓ В кандидатах</span>`
              : `<button class="elt-action-pill" data-convert-response="${e.id}">В кандидаты</button>`}
            <button class="elt-action-pill" data-resp-to-employee="${e.id}">В сотрудники</button>
            ${e.candidate_url ? `<a class="elt-action-pill" href="${e.candidate_url}" target="_blank" rel="noopener">Резюме ↗</a>` : ""}
          </div></td>
        </tr>`).join("")}</tbody>
      </table></div>`;
    }
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead("Отклики по вакансии", '📨')}<div class="modal-inner">${body}</div></div></div>`;
  }

  // ── Модалка подключения hh.ru ──
  if (state.modal?.type === "hh-connect") {
    const connecting = state.hhConnectStatus === "connecting";
    return `<div class="modalBackdrop"><div class="modal hh-connect-modal">
      ${mHead("Подключение hh.ru", '🔗')}
      <div class="modal-inner">
        <p class="modal-subtitle">Авторизуйте кабинет работодателя HeadHunter — вакансии и отклики подтянутся автоматически. Вы перейдёте на сайт hh.ru для входа.</p>
        <ul class="hh-connect-steps">
          <li>Войдите в свой аккаунт работодателя на hh.ru</li>
          <li>Разрешите доступ к вакансиям и откликам</li>
          <li>Вернётесь сюда — данные появятся автоматически</li>
        </ul>
        ${state.hhConnectStatus === "error" ? `<p class="hh-import-error">Не удалось начать подключение. Попробуйте ещё раз.</p>` : ""}
        <div class="modal-actions" style="margin-top:4px;display:flex;gap:10px;justify-content:flex-end">
          <button class="elt-btn-ghost" data-action="close-modal">Отмена</button>
          <button class="elt-btn-primary" data-action="hh-connect-start" ${connecting ? "disabled" : ""}>${connecting ? "Подключение…" : "Перейти на hh.ru"}</button>
        </div>
      </div>
    </div></div>`;
  }

  // ── Модалка «Добавить из HeadHunter» ──
  if (state.modal?.type === "hh-import") {
    const all = state.hhVacancies || [];
    const q = (state.hhImportSearch || "").trim().toLowerCase();
    const filtered = q ? all.filter((v) => (v.title || "").toLowerCase().includes(q)) : all;
    const importing = state.hhImportStatus === "loading";
    let listBody;
    if (state.hhVacanciesStatus === "loading" && !state.hhVacancies) {
      listBody = `<div class="hh-import-state"><span class="hh-import-spinner"></span>Загрузка вакансий из hh.ru…</div>`;
    } else if (state.hhVacanciesStatus === "error") {
      listBody = `<div class="hh-import-state hh-import-state--error">Не удалось загрузить вакансии из hh.ru. Попробуйте «Обновить из hh.ru».</div>`;
    } else if (!all.length) {
      listBody = `<div class="hh-import-state">В кабинете hh.ru нет активных вакансий.</div>`;
    } else if (!filtered.length) {
      listBody = `<div class="hh-import-state">Ничего не найдено по запросу «${escapeHtml(state.hhImportSearch || "")}».</div>`;
    } else {
      listBody = `<div class="hh-import-list">
        ${filtered.map((v) => `<label class="hh-import-row${v.imported ? " is-imported" : ""}"${v.imported ? ' style="opacity:.55;cursor:default"' : ""}>
          <input type="checkbox" class="hh-import-check" data-hh-pick="${escapeHtml(String(v.id))}"${v.imported ? " disabled" : ""}>
          <span class="hh-import-box" aria-hidden="true"></span>
          <span class="hh-import-info">
            <span class="hh-import-name">${escapeHtml(v.title)}</span>
            <span class="hh-import-meta">
              <span class="hh-import-area">${escapeHtml(v.area || "—")}</span>
              <span class="hh-import-resp">${v.responses || 0} откл.</span>
              ${v.imported ? `<span class="hh-import-resp" style="background:rgba(110,124,151,.18);color:#6E7C97">уже добавлена</span>` : ""}
            </span>
          </span>
        </label>`).join("")}
      </div>`;
    }
    const totalCount = all.length;
    const shownCount = filtered.length;
    const pluralVac = (n) => {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return "вакансия";
      if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "вакансии";
      return "вакансий";
    };
    return `<div class="modalBackdrop"><div class="modal modalWide hh-import-modal">
      ${mHead("Добавить из HeadHunter", '➕')}
      <div class="modal-inner">
        <p class="modal-subtitle">Выберите вакансии из подключённого кабинета — они появятся на вкладке с реальными метриками. Повторный импорт не создаёт дублей.</p>
        <div class="hh-import-toolbar">
          <div class="elt-search-wrap hh-import-search">
            <svg class="elt-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input class="elt-search" data-hh-search placeholder="Поиск по названию…" value="${escapeHtml(state.hhImportSearch || "")}">
          </div>
          ${totalCount ? `<span class="hh-import-count">${q ? `${shownCount} из ${totalCount}` : `${totalCount} ${pluralVac(totalCount)}`}</span>` : ""}
        </div>
        ${listBody}
        ${state.hhImportStatus === "error" ? `<p class="hh-import-error">Импорт не удался. Проверьте подключение и повторите.</p>` : ""}
        <div class="modal-actions" style="margin-top:4px;display:flex;gap:10px;justify-content:flex-end">
          <button class="elt-btn-ghost" data-action="close-modal">Отмена</button>
          <button class="elt-btn-primary" data-action="hh-import-confirm" ${importing ? "disabled" : ""}>${importing ? "Импорт…" : "Добавить выбранные"}</button>
        </div>
      </div>
    </div></div>`;
  }

  if (state.modal?.type === "list") {
    const [scope, metricName] = state.modal.target.split(":");
    // Этап адаптации (клик по воронке) — отдельная модалка с чек-инами этапа.
    // Отдельный scope, чтобы не пересекаться с дрилл-дауном KPI-карточек («Адаптация»).
    if (scope === "Этап адаптации") {
      return `<div class="modalBackdrop"><div class="modal">${mHead(`Этап адаптации: ${metricName}`, '🧭')}<div class="modal-inner">${renderAdaptationStageList(state, metricName)}</div></div></div>`;
    }
    // «Оценка отправлена / Отправлено ссылок» — это метрика по числу ССЫЛОК,
    // поэтому показываем список ссылок, а не кандидатов.
    if (scope === "Кандидаты" && /отправлен|ссыл/i.test(metricName || "")) {
      const links = (state.linksApi || []).filter((l) => l.recipientType === "Кандидат");
      const loading = state.linksApi == null;
      const body = loading ? `<p class="elt-card-caption" style="padding:12px">Загрузка ссылок…</p>` : renderLinksTable(links);
      return `<div class="modalBackdrop"><div class="modal">${mHead(`${scope}: ${metricName}`, '🔗')}<div class="modal-inner">${body}</div></div></div>`;
    }
    // Адаптация «Опросы отправлены/пройдены» — это число опросов (ссылок), а не
    // людей: показываем список пульс-опросов адаптации (вкл. ADAPT-DAY).
    if (scope === "Адаптация" && /опрос/i.test(metricName || "")) {
      const done = /пройд/i.test(metricName || "");
      const links = (state.linksApi || []).filter((l) =>
        (l.professionTitle || "").startsWith("Адаптация") && l.recipientType === "Сотрудник" && (!done || l.status === "completed"));
      const loading = state.linksApi == null;
      const body = loading ? `<p class="elt-card-caption" style="padding:12px">Загрузка опросов…</p>` : renderLinksTable(links);
      return `<div class="modalBackdrop"><div class="modal">${mHead(`${scope}: ${metricName}`, '🔗')}<div class="modal-inner">${body}</div></div></div>`;
    }
    const people = peopleForModal(state, scope, metricName);
    const icons = { 'Кандидаты': '👤', 'Сотрудники': '🏢', 'Вакансии': '📋', 'Отчеты': '📊' };
    return `<div class="modalBackdrop"><div class="modal">${mHead(`${scope}: ${metricName}`, icons[scope] || '📊')}<div class="modal-inner">${renderPeopleTable(people, scope)}</div></div></div>`;
  }
  if (state.modal?.type === "add-structure-member") {
    const people = [];
    const treeDepts = new Set();
    if (state.orgTree && Array.isArray(state.orgTree.nodes)) {
      const walk = (n) => {
        people.push({ id: n.id, name: n.full_name });
        if (n.department) treeDepts.add(n.department);
        (n.children || []).forEach(walk);
      };
      state.orgTree.nodes.forEach(walk);
    }
    // Черновик формы сохраняется при переходе в «Управление отделами» и обратно.
    const draft = state.modal.draft || {};
    const managerOptions = ['<option value="">— не назначен —</option>',
      ...people.map((p) => `<option value="${p.id}"${draft.manager_id === p.id ? " selected" : ""}>${escapeHtml(p.name)}</option>`)].join("");
    // Реальные отделы из API; если их ещё нет — берём названия из дерева.
    const realDepts = Array.isArray(state.departmentsApi) ? state.departmentsApi : [];
    const deptOptions = realDepts.length
      ? ['<option value="">— без отдела —</option>',
         ...realDepts.map((d) => `<option value="${d.id}"${draft.department_id === d.id ? " selected" : ""}>${escapeHtml(d.name)}${d.employees_count ? ` · ${d.employees_count}` : ""}</option>`)].join("")
      : ['<option value="">— без отдела —</option>',
         ...[...treeDepts].map((d) => `<option value="name:${escapeHtml(d)}"${draft.department_id === `name:${d}` ? " selected" : ""}>${escapeHtml(d)}</option>`)].join("");
    const roleSel = (v) => draft.role === v ? " selected" : "";
    // Если открыли из карточки отдела — подсказываем, в какой отдел добавляем.
    const ctxDept = state.modal.contextDeptName;
    return `<div class="modalBackdrop"><form class="modal add-member-panel" data-add-structure-form>
      ${mHead('Добавить в структуру', '👤')}
      <div class="modal-inner">
        <p class="modal-subtitle">Новый сотрудник или руководитель будет добавлен в оргструктуру${ctxDept ? ` — в отдел «<b>${escapeHtml(ctxDept)}</b>»` : ""}.</p>
        <div class="elt-form-grid">
          <label class="elt-label">ФИО<input class="elt-input" name="full_name" value="${escapeHtml(draft.full_name || "")}" placeholder="Иван Иванов" required></label>
          <label class="elt-label">Должность<input class="elt-input" name="position" value="${escapeHtml(draft.position || "")}" placeholder="Менеджер по продажам"></label>
          <label class="elt-label">Роль<select class="elt-select" name="role"><option value="employee"${roleSel("employee")}>Сотрудник</option><option value="head"${roleSel("head")}>Руководитель отдела</option></select></label>
          <label class="elt-label">Отдел
            <div class="am-dept-row">
              <select class="elt-select" name="department_id">${deptOptions}</select>
              <button type="button" class="elt-btn-ghost am-dept-cog" data-action="open-manage-departments" title="Создать или изменить отделы">⚙ Отделы</button>
            </div>
          </label>
          <label class="elt-label">Руководитель<select class="elt-select" name="manager_id">${managerOptions}</select></label>
          <label class="elt-label">Проект<input class="elt-input" name="project" value="${escapeHtml(draft.project || "")}" placeholder="Общий контур"></label>
        </div>
        <label class="elt-checkbox-card">
          <input type="checkbox" name="send_adaptation"${draft.send_adaptation ? " checked" : ""}>
          <span class="elt-checkbox-box" aria-hidden="true"></span>
          <span class="elt-checkbox-text">
            <b>Выслать адаптационный тест</b>
            <small>Запустить цикл онбординга и сразу отправить сотруднику первый опрос.</small>
          </span>
        </label>
        <div class="am-footer">
          <button class="blueButton" type="submit">Добавить</button>
        </div>
      </div>
    </form></div>`;
  }
  if (state.modal?.type === "manage-departments") {
    const m = state.modal;
    const realDepts = Array.isArray(state.departmentsApi) ? state.departmentsApi : [];
    // Люди для выбора руководителя отдела.
    const people = [];
    if (state.orgTree && Array.isArray(state.orgTree.nodes)) {
      const walk = (n) => { people.push({ id: n.id, name: n.full_name }); (n.children || []).forEach(walk); };
      state.orgTree.nodes.forEach(walk);
    }
    const headOptions = (selectedId) => ['<option value="">— не назначен —</option>',
      ...people.map((p) => `<option value="${p.id}"${selectedId === p.id ? " selected" : ""}>${escapeHtml(p.name)}</option>`)].join("");
    const parentOptions = (deptId, selectedId) => ['<option value="">— верхний уровень —</option>',
      ...realDepts.filter((d) => d.id !== deptId).map((d) => `<option value="${d.id}"${selectedId === d.id ? " selected" : ""}>${escapeHtml(d.name)}</option>`)].join("");
    const busy = m.busy ? "disabled" : "";
    const deptRows = realDepts.length ? realDepts.map((d) => `
      <form data-edit-department-form data-dept-id="${d.id}" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;margin-bottom:8px">
        <label class="elt-label" style="flex:2 1 150px;margin:0">Название<input class="elt-input" name="name" value="${escapeHtml(d.name)}" required></label>
        <label class="elt-label" style="flex:2 1 150px;margin:0">Руководитель<select class="elt-select" name="head_person_id">${headOptions(d.head_person_id)}</select></label>
        <label class="elt-label" style="flex:2 1 150px;margin:0">Входит в<select class="elt-select" name="parent_department_id">${parentOptions(d.id, d.parent_department_id)}</select></label>
        <span style="flex:0 0 auto;font-size:11px;color:rgba(230,242,255,.45);align-self:center">${d.employees_count || 0} чел.</span>
        <button class="elt-btn-ghost" type="submit" ${busy} style="flex:0 0 auto">Сохранить</button>
        <button type="button" class="elt-btn-ghost" data-action="delete-department" data-dept-id="${d.id}" data-dept-name="${escapeHtml(d.name)}" data-dept-count="${d.employees_count || 0}" ${busy} title="Удалить отдел" style="flex:0 0 auto;color:#F87171;border-color:rgba(248,113,113,.4)">Удалить</button>
      </form>`).join("")
      : `<div class="elt-table-empty" style="padding:14px">Отделов пока нет — создайте первый выше.</div>`;
    return `<div class="modalBackdrop"><div class="modal" style="max-width:660px">
      ${mHead('Управление отделами', '🏢')}
      <div class="modal-inner">
        ${m.error ? `<div class="elt-import-error-box">${escapeHtml(m.error)}</div>` : ""}
        <p class="modal-subtitle">Создавайте новые отделы и меняйте существующие — название, руководителя и вложенность.</p>
        <form data-create-department-form style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;padding:12px;border:1px dashed rgba(0,229,212,.4);border-radius:10px;margin-bottom:16px">
          <label class="elt-label" style="flex:2 1 150px;margin:0">Новый отдел<input class="elt-input" name="name" placeholder="Например, Маркетинг" required></label>
          <label class="elt-label" style="flex:2 1 150px;margin:0">Руководитель<select class="elt-select" name="head_person_id">${headOptions(null)}</select></label>
          <label class="elt-label" style="flex:2 1 150px;margin:0">Входит в<select class="elt-select" name="parent_department_id">${parentOptions(null, null)}</select></label>
          <button class="blueButton" type="submit" ${busy} style="flex:0 0 auto">＋ Создать</button>
        </form>
        <div class="elt-panel-caption" style="margin-bottom:8px">Существующие отделы (${realDepts.length})</div>
        ${deptRows}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          ${m.returnTo === "add-structure-member"
            ? `<button class="elt-btn-primary" data-action="back-to-structure-member">← К сотруднику</button>`
            : `<button class="elt-btn-primary" data-action="close-modal">Готово</button>`}
        </div>
      </div>
    </div></div>`;
  }
  if (state.modal?.type === "edit-employee") {
    const emp = state.modal.emp || {};
    const realDepts = Array.isArray(state.departmentsApi) ? state.departmentsApi : [];
    // Люди для выбора руководителя (кроме самого сотрудника).
    const people = [];
    if (state.orgTree && Array.isArray(state.orgTree.nodes)) {
      const walk = (n) => { if (n.id !== emp.id) people.push({ id: n.id, name: n.full_name }); (n.children || []).forEach(walk); };
      state.orgTree.nodes.forEach(walk);
    }
    const deptOpts = ['<option value="">— без отдела —</option>',
      ...realDepts.map((d) => `<option value="${d.id}"${emp.department_id === d.id ? " selected" : ""}>${escapeHtml(d.name)}</option>`)].join("");
    const mgrOpts = ['<option value="">— не назначен —</option>',
      ...people.map((p) => `<option value="${p.id}"${emp.manager_id === p.id ? " selected" : ""}>${escapeHtml(p.name)}</option>`)].join("");
    const busy = state.modal.busy ? "disabled" : "";
    return `<div class="modalBackdrop"><form class="modal" data-edit-employee-form data-person-id="${emp.id}">
      ${mHead('Редактировать сотрудника', '✎')}
      <div class="modal-inner">
        ${state.modal.error ? `<div class="elt-import-error-box">${escapeHtml(state.modal.error)}</div>` : ""}
        <div class="elt-form-grid">
          <label class="elt-label">ФИО<input class="elt-input" name="full_name" value="${escapeHtml(emp.full_name || "")}" required></label>
          <label class="elt-label">Должность<input class="elt-input" name="position" value="${escapeHtml(emp.position || "")}" placeholder="Менеджер по продажам"></label>
          <label class="elt-label">Email<input class="elt-input" name="email" type="email" value="${escapeHtml(emp.email || "")}" placeholder="name@company.ru"></label>
          <label class="elt-label">Телефон<input class="elt-input" name="phone" value="${escapeHtml(emp.phone || "")}" placeholder="+7…"></label>
          <label class="elt-label">Отдел<select class="elt-select" name="department_id">${deptOpts}</select></label>
          <label class="elt-label">Руководитель<select class="elt-select" name="manager_id">${mgrOpts}</select></label>
          <label class="elt-label">Проект<input class="elt-input" name="project" value="${escapeHtml(emp.project || "")}" placeholder="Общий контур"></label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button type="button" class="elt-btn-ghost" data-action="close-modal">Отмена</button>
          <button class="blueButton" type="submit" ${busy}>Сохранить</button>
        </div>
      </div>
    </form></div>`;
  }
  if (state.modal?.type === "import-employees" || state.modal?.type === "import-candidates") {
    const m = state.modal;
    const cfg = IMPORT_MODALS[m.type];
    let inner;
    if (m.status === "done" && m.result) {
      const r = m.result;
      const errs = r.errors || [];
      inner = `
        <div class="elt-import-result">
          <div class="elt-import-summary">
            <div class="elt-import-stat ok"><b>${r.created}</b><span>добавлено</span></div>
            <div class="elt-import-stat"><b>${r.skipped}</b><span>пропущено</span></div>
            <div class="elt-import-stat ${errs.length ? 'warn' : ''}"><b>${errs.length}</b><span>с ошибками</span></div>
          </div>
          ${r.created_names && r.created_names.length
            ? `<p class="elt-card-caption">Новые: ${r.created_names.slice(0, 8).map(n => escapeHtml(n)).join(', ')}${r.created_names.length > 8 ? ` и ещё ${r.created_names.length - 8}` : ''}</p>`
            : ''}
          ${errs.length
            ? `<div class="elt-import-errors">${errs.map(e => `<div class="elt-import-err"><span>строка ${e.row}</span>${escapeHtml(e.reason)}</div>`).join('')}</div>`
            : '<p class="elt-import-allok">Все строки обработаны без ошибок.</p>'}
          <div class="elt-import-actions">
            <button class="elt-btn-ghost" data-action="${m.type}">Импортировать ещё</button>
            <button class="elt-btn-primary" data-action="close-modal">Готово</button>
          </div>
        </div>`;
    } else {
      const importing = m.status === "importing";
      inner = `
        <p class="modal-subtitle">Массовое добавление из Excel. Колонки: ${cfg.columns}.</p>
        ${m.error ? `<div class="elt-import-error-box">${escapeHtml(m.error)}</div>` : ''}
        <div class="elt-import-flow">
          <div class="elt-import-step"><span class="elt-import-num">1</span><div><b>Скачать Excel-шаблон</b><p>Заполните по примеру. ${cfg.hint}</p><a class="elt-btn-ghost" href="${cfg.templateUrl()}" download>Скачать шаблон</a></div></div>
          <div class="elt-import-step"><span class="elt-import-num">2</span><div><b>Заполнить и загрузить</b><p>Выберите заполненный файл со списком ${cfg.fileNoun}.</p><label class="elt-file-label">Excel-файл<input type="file" accept=".xlsx,.xlsm" data-import-file></label></div></div>
          <div class="elt-import-step"><span class="elt-import-num">3</span><div><b>Импортировать</b><p>Записи появятся в списке и станут доступны для оценки.</p><button class="elt-btn-primary" data-action="${cfg.runAction}" ${importing ? 'disabled' : ''}>${importing ? 'Импортируем…' : 'Импортировать'}</button></div></div>
        </div>`;
    }
    return `<div class="modalBackdrop"><div class="modal modalWide">
      ${mHead(cfg.title, '📥')}
      <div class="modal-inner">${inner}</div>
    </div></div>`;
  }
  if (state.modal?.type === "import-library") {
    const m = state.modal;
    let inner;
    if (m.status === "done" && m.result) {
      const r = m.result;
      const errs = r.errors || [];
      const stat = (n, label) => `<div class="elt-import-stat"><b>${n}</b><span>${label}</span></div>`;
      inner = `
        <div class="elt-import-result">
          <div class="elt-import-summary">
            ${stat(r.competencies_created + r.competencies_updated, "компетенций")}
            ${stat(r.questions_created, "вопросов добавлено")}
            ${stat(r.profiles_created + r.profiles_updated, "профилей")}
          </div>
          <p class="elt-card-caption">Компетенции: +${r.competencies_created} новых, ${r.competencies_updated} обновлено · Вопросы: +${r.questions_created}, ${r.questions_skipped} уже были · Профили: +${r.profiles_created}, ${r.profiles_updated} обновлено</p>
          ${errs.length
            ? `<div class="elt-import-errors">${errs.slice(0, 30).map(e => `<div class="elt-import-err">${escapeHtml(e)}</div>`).join("")}</div>`
            : '<p class="elt-import-allok">Загружено без ошибок.</p>'}
          <div class="elt-import-actions">
            <button class="elt-btn-ghost" data-action="open-import-library">Импортировать ещё</button>
            <button class="elt-btn-primary" data-action="close-modal">Готово</button>
          </div>
        </div>`;
    } else {
      const importing = m.status === "importing";
      inner = `
        <p class="modal-subtitle">Массовая загрузка базы оценки из одного Excel: 5 листов — profiles, competencies, questions, profile_comp_questions, answer_options. Повторная загрузка обновляет, а не дублирует.</p>
        ${m.error ? `<div class="elt-import-error-box">${escapeHtml(m.error)}</div>` : ''}
        <div class="elt-import-flow">
          <div class="elt-import-step"><span class="elt-import-num">1</span><div><b>Скачать шаблон (5 листов)</b><p>Профили, компетенции, вопросы, связки «профиль-компетенция-вопрос» и варианты ответов. На листе «instructions» — как связывать по profile_id / comp_code / quest_id.</p><a class="elt-btn-ghost" href="${libraryImportTemplateUrl()}" download>Скачать шаблон</a></div></div>
          <div class="elt-import-step"><span class="elt-import-num">2</span><div><b>Загрузить файл</b><p>Выберите заполненный .xlsx.</p><label class="elt-file-label">Excel-файл<input type="file" accept=".xlsx,.xlsm" data-import-file></label></div></div>
          <div class="elt-import-step"><span class="elt-import-num">3</span><div><b>Импортировать</b><p>Профили появятся в Конструкторе и в мастере «Создать оценку».</p><button class="elt-btn-primary" data-action="run-library-import" ${importing ? 'disabled' : ''}>${importing ? 'Импортируем…' : 'Импортировать'}</button></div></div>
        </div>`;
    }
    return `<div class="modalBackdrop"><div class="modal modalWide">
      ${mHead('Импорт базы компетенций и профилей', '📚')}
      <div class="modal-inner">${inner}</div>
    </div></div>`;
  }
  if (state.modal?.type === "card") {
    // Сотрудник (emp-) — старая локальная карточка; кандидат — карточка из API.
    if (state.modal.id?.startsWith("emp-")) {
      const item = findPerson(state, state.modal.id);
      return `<div class="modalBackdrop"><div class="modal">${mHead('Карточка участника', '👤')}<div class="modal-inner">${personCard(item)}</div></div></div>`;
    }
    let body;
    let cardTitle = "Карточка кандидата";
    if (!state.cardData) body = `<p class="modal-subtitle">Загрузка карточки…</p>`;
    else if (state.cardData.error) body = `<p class="modal-subtitle">Не удалось загрузить карточку (бэкенд недоступен).</p>`;
    else if (state.cardData._kind === "employee") { body = employeeCardApi(state.cardData, state.employeePhotos, state.departmentsApi); cardTitle = state.cardData.full_name || "Карточка сотрудника"; }
    else { body = candidateCard(state.cardData, state.employeePhotos); cardTitle = state.cardData.full_name || "Карточка кандидата"; }
    return `<div class="modalBackdrop"><div class="modal">${mHead(cardTitle, '👤')}<div class="modal-inner">${body}</div></div></div>`;
  }
  if (state.modal?.type === "answers") {
    const data = state.answersData;
    const list = state.answersList;
    const personId = state.modal.id;
    const multiple = list && list.count > 1;
    let body;

    if (list && !list.count) {
      body = `<p class="modal-subtitle">${(list.full_name || "")}</p>
        <p class="modal-subtitle">Пройденных тестов нет — ответов пока нет.</p>`;
    } else if (multiple && !state.modal.sessionId) {
      // Несколько тестов — предлагаем выбрать, по какому смотреть ответы.
      body = `<p class="modal-subtitle">${list.full_name || ""} · выберите тест:</p>
        <div class="answersTestPick">
          ${list.items.map((it) => `<button class="answersTestPickItem" data-answer-session="${personId}|${it.session_id}">
            <span class="answersTestPickName">${it.test_title || it.category || "Тест"}</span>
            <span class="answersTestPickPct">${StatusBadge(`${it.percent}%`, getFitStatus(it.percent))}</span>
          </button>`).join("")}
        </div>`;
    } else if (!data) {
      body = `<p class="modal-subtitle">Загрузка ответов…</p>`;
    } else if (data.error) {
      body = `<p class="modal-subtitle">Не удалось загрузить ответы (бэкенд недоступен).</p>`;
    } else if (!data.answers || !data.answers.length) {
      body = `${multiple ? `<button class="button subtle" data-answer-back>← к списку тестов</button>` : ""}
        <p class="modal-subtitle">${data.candidate || ""}${data.test_title ? " · " + data.test_title : ""}</p>
        <p class="modal-subtitle">Ответы по этому тесту не сохранены.</p>`;
    } else {
      body = `${multiple ? `<button class="button subtle" data-answer-back>← к списку тестов</button>` : ""}
        <p class="modal-subtitle">${data.candidate || ""}${data.test_title ? " · " + data.test_title : ""} · ${data.percent}%</p>
        <div class="answersPreview">${data.answers.map((a, i) => {
          const color = a.red_flag ? "#DC2626" : a.correct === true ? "#16A34A" : a.correct === false ? "#DC2626" : "";
          const score = a.max_score ? ` · ${a.score}/${a.max_score}` : "";
          return `<div><span>${i + 1}</span><b>${a.question}</b><em style="${color ? `color:${color}` : ""}">${a.answer || "—"}${score}</em></div>`;
        }).join("")}</div>`;
    }
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead('Ответы по оценке', '📝')}<div class="modal-inner">${body}</div></div></div>`;
  }
  if (state.modal?.type === "competency") {
    const profile = assessmentProfile(state.modal.id);
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead(profile.title, '🎯')}<div class="modal-inner"><p class="modal-subtitle">${profile.description}</p><div class="competencyModalGrid"><article>${miniBars(profile.professional.map((item) => [item, 24]))}</article><article>${miniBars(profile.personal.map((item) => [item, 18]))}</article></div><div class="profileExplain"><b>Шкала достоверности</b><p>Проверяет противоречивые ответы, социальную желательность и попытку выглядеть лучше. Вес достоверности: 15%.</p><b>Интерпретация</b><p>Итоговая рекомендация не заменяет интервью, а показывает зоны для проверки, красные флаги и вопросы для нанимающего менеджера.</p></div></div></div></div>`;
  }
  if (state.modal?.type === "tariffs") {
    return renderTariffUpgradeModal(state);
  }
  if (state.modal?.type === "locked") {
    return `<div class="modalBackdrop"><div class="modal">${mHead('Функция недоступна', '🔒')}<div class="modal-inner"><p class="modal-subtitle">${state.modal.message}</p><button class="blueButton" data-open-tariff-picker>Изменить тариф</button></div></div></div>`;
  }
  if (state.modal?.type === "add-employee") {
    const depts = (state.departments || []).map(d => d.name);
    const managers = (state.employees || []).map(e => e.fullName);
    const managerOptions = [
      `<option value="">— не назначен —</option>`,
      ...managers.map(m => `<option value="${m}">${m}</option>`)
    ].join("");
    const deptOptions = [
      `<option value="">— выберите отдел —</option>`,
      ...depts.map(d => `<option value="${d}">${d}</option>`)
    ].join("");
    return `<div class="modalBackdrop"><form class="modal" data-add-employee-form>
      ${mHead('Добавить сотрудника', '👤')}
      <div class="modal-inner">
        <p class="modal-subtitle">Новый сотрудник будет добавлен в структуру компании.</p>
        <div class="elt-form-grid">
          <label class="elt-label">Имя<input class="elt-input" name="firstName" placeholder="Иван" required></label>
          <label class="elt-label">Фамилия<input class="elt-input" name="lastName" placeholder="Иванов" required></label>
          <label class="elt-label">Email<input class="elt-input" type="email" name="email" placeholder="ivan@company.ru" required></label>
          <label class="elt-label">Должность<input class="elt-input" name="position" placeholder="Менеджер по продажам" required></label>
          <label class="elt-label">Отдел<select class="elt-select" name="department">${deptOptions}</select></label>
          <label class="elt-label">Руководитель<select class="elt-select" name="manager">${managerOptions}</select></label>
          <label class="elt-label">Проект<input class="elt-input" name="project" placeholder="Общий контур"></label>
          <label class="elt-label">Дата выхода<input class="elt-input" type="date" name="start_date"></label>
        </div>
        <label class="elt-checkbox-card">
          <input type="checkbox" name="sendAdaptation" checked>
          <span class="elt-checkbox-box" aria-hidden="true"></span>
          <span class="elt-checkbox-text">
            <b>Выслать адаптационный тест</b>
            <small>Запустить цикл онбординга и сразу отправить сотруднику первый опрос.</small>
          </span>
        </label>
        <button class="blueButton" type="submit" style="margin-top:8px;width:100%">Добавить сотрудника</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "add-candidate") {
    return `<div class="modalBackdrop"><form class="modal modalWide" data-add-candidate-form>
      ${mHead('Добавить кандидата', '👤')}
      <div class="modal-inner">
        <p class="modal-subtitle">При включённой отправке кандидату сразу уйдёт письмо со ссылкой на оценку (нужны профиль и email).</p>

        <div class="cand-field-group">
          <span class="cand-group-label">Профиль оценки</span>
          ${candProfilePicker(state)}
        </div>

        <div class="cand-field-group">
          <span class="cand-group-label">ФИО кандидата</span>
          <div class="elt-form-grid elt-form-grid-3">
            <label class="elt-label">Фамилия<input class="elt-input" name="lastName" placeholder="Иванов"></label>
            <label class="elt-label">Имя<input class="elt-input" name="firstName" placeholder="Иван"></label>
            <label class="elt-label">Отчество<input class="elt-input" name="patronymic" placeholder="Иванович"></label>
          </div>
        </div>

        <div class="cand-field-group">
          <span class="cand-group-label">Контакты и вакансия</span>
          <div class="elt-form-grid elt-form-grid-3">
            <label class="elt-label">Телефон<input class="elt-input" name="phone" placeholder="+7..."></label>
            <label class="elt-label">Email<input class="elt-input" name="email" placeholder="candidate@example.com"></label>
            <label class="elt-label">Вакансия<input class="elt-input" name="vacancy" placeholder="Менеджер по продажам"></label>
          </div>
        </div>

        <label class="elt-checkbox-card">
          <input type="checkbox" name="sendNow" checked>
          <span class="elt-checkbox-box" aria-hidden="true"></span>
          <span class="elt-checkbox-text">
            <b>Сразу отправить оценку кандидату</b>
            <small>Кандидат получит письмо со ссылкой на прохождение оценки.</small>
          </span>
        </label>

        <button class="elt-btn-primary" type="submit" style="width:100%">Добавить кандидата</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "convert-employee") {
    const fullName = state.modal.fullName || "Кандидат";
    const mgrList = (state.employeesApi || []).filter((e) => e.fullName);
    const managerOptions = mgrList.length
      ? `<select class="elt-select" name="manager_name">
          <option value="">— Без руководителя —</option>
          ${mgrList.map((e) => `<option value="${escapeHtml(e.fullName)}">${escapeHtml(e.fullName)}${e.position && e.position !== "—" ? ` · ${escapeHtml(e.position)}` : ""}</option>`).join("")}
        </select>`
      : `<input class="elt-input" name="manager_name" placeholder="Иванов Иван">`;
    return `<div class="modalBackdrop"><form class="modal" data-convert-employee-form>
      ${mHead('Перевести в сотрудники', '🔁')}
      <div class="modal-inner">
        <p class="modal-subtitle"><b>${escapeHtml(fullName)}</b> станет сотрудником: создастся карточка сотрудника, запись кандидата удалится. Оценки, ответы и история сохранятся (тот же человек). Результат оценки перенесётся в «соответствие».</p>
        <div class="elt-form-grid">
          <label class="elt-label">Должность *<input class="elt-input" name="position" placeholder="Менеджер по продажам" required></label>
          <label class="elt-label">Дата выхода *<input class="elt-input" type="date" name="start_date" required></label>
          <label class="elt-label">Отдел<input class="elt-input" name="department_name" placeholder="Отдел продаж"></label>
          <label class="elt-label">Руководитель${managerOptions}</label>
          <label class="elt-label">Проект<input class="elt-input" name="project" placeholder="Общий контур"></label>
          <label class="elt-label">Тип занятости<select class="elt-select" name="employment_type"><option value="">—</option><option>Штат</option><option>ГПХ</option><option>Стажировка</option><option>Удалённо</option></select></label>
        </div>
        <button class="elt-btn-primary" type="submit" style="margin-top:8px;width:100%">Перевести в сотрудники</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "send-assessment") {
    const { personId, fullName } = state.modal;
    const ready = Boolean(state.candProfileSelId);
    return `<div class="modalBackdrop"><form class="modal" data-send-assessment-form data-person-id="${personId}">
      ${mHead('Отправить оценку', '📨')}
      <div class="modal-inner">
        <p class="modal-subtitle">Кандидату <b>${escapeHtml(fullName || "—")}</b> будет создана оценочная ссылка по выбранному профилю.</p>
        <div class="elt-form-grid">
          <label class="elt-label elt-label-full">Профиль оценки${candProfilePicker(state)}</label>
        </div>
        <button class="elt-btn-primary" type="submit" style="margin-top:8px;width:100%" ${ready ? "" : "disabled"}>Отправить оценку</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "create-test") {
    return `<div class="modalBackdrop"><form class="modal" data-create-test-form>
      ${mHead('Создать тест', '🧩')}
      <div class="modal-inner">
        <p class="modal-subtitle">Тест появится в списке слева — затем добавьте в него вопросы.</p>
        <div class="elt-form-grid">
          <label class="elt-label elt-label-full">Название<input class="elt-input" name="title" placeholder="напр. Оценка менеджера" required></label>
          <label class="elt-label">Категория<input class="elt-input" name="category" placeholder="Коммерция"></label>
          <label class="elt-label">Для кого<select class="elt-select" name="target_type"><option value="candidate">Кандидат</option><option value="employee">Сотрудник</option><option value="group">Группа</option></select></label>
        </div>
        <button class="elt-btn-primary" type="submit" style="margin-top:8px;width:100%">+ Создать профиль</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "create-competency") {
    return `<div class="modalBackdrop"><form class="modal" data-create-competency-form>
      ${mHead('Создать компетенцию', '🧠')}
      <div class="modal-inner">
        <p class="modal-subtitle">Компетенция появится в библиотеке — затем добавьте в неё вопросы и включите в профили.</p>
        <div class="elt-form-grid">
          <label class="elt-label elt-label-full">Название<input class="elt-input" name="title" placeholder="напр. Работа с возражениями" required></label>
          <label class="elt-label">Тип<select class="elt-select" name="kind"><option value="professional">Профессиональная</option><option value="common">Общая</option></select></label>
          <label class="elt-label elt-label-full">Описание<input class="elt-input" name="description" placeholder="Коротко, что измеряет"></label>
        </div>
        <button class="elt-btn-primary" type="submit" style="margin-top:8px;width:100%">+ Создать компетенцию</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "pick-competency") {
    const all = state.constructorComps || [];
    const test = state.constructorTest;
    const usedIds = new Set(((test && test.competencies) || []).map((c) => c.competency_id));
    const available = all.filter((c) => !usedIds.has(c.id));
    const rows = available.length
      ? available.map((c) => `<button class="ctr-pick-row" data-add-profile-comp="${c.id}" data-test-id="${state.modal.testId}">
          <span class="ctr-pick-name">${escapeHtml(c.title)} <span class="ctr-kind-badge ${c.kind}">${CTR_KIND_LABEL[c.kind] || c.kind}</span></span>
          <span class="ctr-pick-count">${c.questions_count} вопр. →</span>
        </button>`).join("")
      : `<div class="ctr-empty"><p>Все компетенции уже добавлены или библиотека пуста.</p><button class="elt-btn-ghost" data-action="open-create-competency">+ Создать компетенцию</button></div>`;
    return `<div class="modalBackdrop"><div class="modal modalWide">
      ${mHead('Добавить компетенцию в профиль', '➕')}
      <div class="modal-inner">
        <p class="modal-subtitle">Выберите компетенцию — её вопросы попадут в профиль автоматически.</p>
        <div class="ctr-pick-list">${rows}</div>
      </div>
    </div></div>`;
  }

  if (state.modal?.type === "add-question") {
    const forComp = Boolean(state.modal.competencyId);
    return `<div class="modalBackdrop"><form class="modal modalWide ctr-q-form" data-qtype="single_choice" data-add-question-form data-test-id="${state.modal.testId || ''}" data-competency-id="${state.modal.competencyId || ''}">
      ${mHead(forComp ? 'Добавить вопрос в компетенцию' : 'Добавить вопрос', '➕')}
      <div class="modal-inner">
        <div class="elt-form-grid">
          <label class="elt-label elt-label-full">Текст вопроса<input class="elt-input" name="text" placeholder="Сформулируйте вопрос" required></label>
          <label class="elt-label${forComp ? ' elt-label-full' : ''}">Тип<select class="elt-select" name="type" data-question-type>
            <option value="single_choice">Один вариант</option>
            <option value="multiple_choice">Несколько вариантов</option>
            <option value="scale">Шкала (1–5)</option>
            <option value="open">Открытый (AI)</option>
          </select></label>
          ${forComp ? '' : '<label class="elt-label">Компетенция<input class="elt-input" name="competency_name" placeholder="напр. Коммуникация"></label>'}
        </div>

        <div class="ctr-section" data-for="choice">
          <div class="ctr-section-head">Варианты ответа<span>текст · балл · верный · red flag</span></div>
          ${[1, 2, 3, 4].map((i) => `<div class="ctr-opt-row">
            <input class="elt-input" name="opt${i}" placeholder="Вариант ${i}">
            <input class="elt-input ctr-score" name="score${i}" type="number" value="0" title="Балл">
            <label class="ctr-chk"><input type="checkbox" name="correct${i}"> верный</label>
            <label class="ctr-chk"><input type="checkbox" name="flag${i}"> red&nbsp;flag</label>
          </div>`).join("")}
        </div>

        <div class="ctr-section" data-for="scale">
          <div class="ctr-section-head">Шкала</div>
          <div class="elt-form-grid">
            <label class="elt-label">Минимум<input class="elt-input" name="scale_min" type="number" value="1"></label>
            <label class="elt-label">Максимум<input class="elt-input" name="scale_max" type="number" value="5"></label>
          </div>
        </div>

        <div class="ctr-section" data-for="open">
          <div class="ctr-section-head">Открытый ответ · AI-оценка</div>
          <div class="elt-form-grid">
            <label class="elt-label">Макс. балл<input class="elt-input" name="max_score" type="number" value="5"></label>
            <label class="elt-label elt-label-full">Эталонный ответ<input class="elt-input" name="ai_reference" placeholder="Что считается хорошим ответом"></label>
            <label class="elt-label elt-label-full">Критерии для AI<input class="elt-input" name="ai_criteria" placeholder="Критерии оценки"></label>
          </div>
        </div>

        <button class="elt-btn-primary" type="submit" style="margin-top:12px;width:100%">+ Добавить вопрос</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "topup") {
    return renderTopupModal(state, mHead);
  }

  if (state.modal === "spendBonuses") {
    const max = Math.floor(state.referrals.available / state.company.assessmentPrice);
    return `<div class="modalBackdrop"><div class="modal">${mHead('Потратить бонусы', '🎁')}<div class="modal-inner"><p class="modal-subtitle">Доступно: ${state.referrals.available.toLocaleString('ru-RU')} бонусов. 1 оценка = ${state.company.assessmentPrice} ₽.</p><div class="bonusOptions"><button class="blueButton" data-buy-bonus-assessments="${max}">Докупить ${max} оценок</button><button class="button subtle">Компенсировать часть тарифа</button><button class="button subtle">Оплатить тариф бонусами</button></div></div></div></div>`;
  }

  if (state.modal?.type === "filters") {
    const active = state.modal.active || {};
    // Варианты строятся по реальным данным текущей страницы (см. domain/filtering).
    const { keys, options } = filterModel(state, state.view);
    const rows = keys.length
      ? keys.map((f) => {
          const opts = options[f] || [];
          const cur = active[f] || "";
          return '<div class="elt-fp-row">' +
            '<span class="elt-fp-label">' + escapeHtml(f) + '</span>' +
            '<div class="elt-fp-opts">' +
              '<button class="elt-fp-opt ' + (!cur ? 'active' : '') + '" data-fp-key="' + escapeHtml(f) + '" data-fp-val="">Все</button>' +
              opts.map((o) => '<button class="elt-fp-opt ' + (cur === o ? 'active' : '') + '" data-fp-key="' + escapeHtml(f) + '" data-fp-val="' + escapeHtml(o) + '">' + escapeHtml(o) + '</button>').join('') +
            '</div>' +
          '</div>';
        }).join('')
      : '<p class="elt-fp-empty">Для этой страницы пока нет данных для фильтрации.</p>';
    const activeCount = Object.keys(options).reduce((n, k) => n + (active[k] ? 1 : 0), 0);
    return '<div class="modalBackdrop"><div class="modal elt-filters-modal">' +
      mHead('Фильтры', '⧦') +
      '<div class="modal-inner elt-fp-inner">' + rows + '</div>' +
      '<div class="elt-fp-footer">' +
        '<button class="elt-btn-ghost" data-action="clear-filters-modal">Сбросить все' + (activeCount ? ' (' + activeCount + ')' : '') + '</button>' +
        '<button class="blueButton" data-action="apply-filters-modal">Применить</button>' +
      '</div></div></div>';
  }
  if (state.modal?.type === "assess-wizard") {
    return renderAssessmentWizard(state);
  }
  if (state.modal === "withdraw") {
    return `<div class="modalBackdrop"><form class="modal" data-withdraw-form>${mHead('Вывести бонусы на карту', '💳')}<div class="modal-inner"><label>Сумма вывода<input name="amount" type="number" max="${state.referrals.available}" value="${Math.min(3000, state.referrals.available)}"></label><label>Номер карты<input name="card" placeholder="0000 0000 0000 0000"></label><label>ФИО получателя<input name="name" placeholder="Иванов Иван"></label><label>Банк<input name="bank" placeholder="Сбербанк"></label><label>Телефон<input name="phone" placeholder="+7..."></label><label>Комментарий<input name="comment" placeholder="Комментарий"></label><button class="blueButton" type="submit">Создать заявку на вывод</button></div></form></div>`;
  }
  return "";
}

function dashboardData(state, filter) {
  const candidates = state.sessions.filter((x) => x.person.assessmentType === "Кандидат");
  const employees = state.employees;
  const people = state.drilldownStage ? candidates.filter((x) => stageMatch(x, state.drilldownStage)) : candidates;
  const datasets = {
    "Кандидаты": {
      kpis: [["Кандидатов всего", 132, "+24"], ["Новых", 18, "за период"], ["Оценка отправлена", state.links.length, "активные"], ["Оценка пройдена", candidates.length, "готовы отчеты"], ["Подходят", 26, "под профиль"], ["Не подходят", 9, "низкий балл"], ["Интервью", 21, "этап"], ["Оффер", 7, "получили"]],
      funnel: [["Откликнулся", 132], ["Оценка отправлена", 64], ["Оценка пройдена", candidates.length], ["Подходит", 26], ["Интервью", 21], ["Оффер", 7], ["Выход", 4]],
      people,
      aiTitle: "Где теряются кандидаты",
      aiText: "Основная потеря между откликом и прохождением оценки. Рекомендация: отправлять ссылку быстрее и добавить напоминание через email/SMS."
    },
    "Сотрудники": {
      kpis: [["Сотрудников всего", 70, "в базе"], ["В оценке", 16, "активные"], ["В зоне риска", 6, "требуют внимания"], ["Риск увольнения", "18%", "средний"], ["Выгорание", 5, "признаки"], ["Удовлетворенность", "74%", "средняя"], ["Соответствие", "78%", "должности"], ["ИПР", 9, "рекомендации"]],
      funnel: [["Оценка назначена", 24], ["Начали", 21], ["Завершили", 16], ["Норма", 10], ["Зона риска", 6]],
      people: employeesToPeople(employees),
      aiTitle: "Сотрудники в зоне риска",
      aiText: "У Марии Кузнецовой и двух сотрудников контакт-центра повышен риск выгорания. Нужен разговор с руководителем и проверка нагрузки."
    },
    "Групповые оценки": { kpis: [["Участников всего", 86, "4 группы"], ["Прошли", 74, "86%"], ["Уровень команды", "77%", "средний"], ["Удовлетворенность", "72%", "команда"], ["Сильные стороны", 4, "кластера"], ["Зоны риска", 3, "кластера"], ["Соответствие", "81%", "профилю"], ["Вовлеченность", "69%", "индекс"]], funnel: [["Приглашены", 86], ["Начали", 80], ["Завершили", 74], ["Норма", 59], ["Риск", 15]], people: candidates, aiTitle: "Командная аналитика", aiText: "Сильная сторона команды — ответственность. Риски — коммуникация между отделами и усталость линейных сотрудников." },
    "Оценка 360": { kpis: [["Активные 360", 5, "циклов"], ["Завершены", 2, "цикла"], ["Средний балл", "4.1", "из 5"], ["Расхождение", "0.8", "самооценка"], ["Сильные стороны", 6, "компетенций"], ["Зоны развития", 4, "компетенции"]], funnel: [["Запущены", 5], ["Самооценка", 5], ["Коллеги", 4], ["Руководитель", 3], ["Завершены", 2]], people: employeesToPeople(employees), aiTitle: "360 только TalentStudio", aiText: "Функция доступна в TalentStudio. В MVP показан UX и будущая структура данных." },
    "Адаптация": { kpis: [["Новые сотрудники", 14, "90 дней"], ["7 дней", 12, "прошли"], ["14 дней", 9, "прошли"], ["30 дней", 5, "прошли"], ["В зоне риска", 3, "адаптация"], ["Зарплата", 2, "проблемы"], ["Руководитель", 2, "проблемы"], ["Условия", 1, "проблема"]], funnel: [["Вышли", 14], ["7 дней", 12], ["14 дней", 9], ["30 дней", 5], ["Остались", 4]], people: employeesToPeople(employees), aiTitle: "Адаптация", aiText: "Два риска связаны с ожиданиями по зарплате и коммуникацией с руководителем." },
    "Performance Review": { kpis: [["В цикле", 42, "сотрудника"], ["Завершили", 28, "review"], ["Результативность", "78%", "средняя"], ["Потенциал", "71%", "средний"], ["HiPo", 6, "резерв"], ["Low performance", 4, "риск"]], funnel: [["Назначены", 42], ["Самооценка", 35], ["Руководитель", 31], ["Калибровка", 28], ["ИПР", 19]], people: employeesToPeople(employees), aiTitle: "Performance", aiText: "Нужно калибровать оценки между отделами продаж и операционным блоком." }
  };
  if (filter === "Все данные") {
    return { ...datasets["Кандидаты"], kpis: [...datasets["Кандидаты"].kpis.slice(0, 4), ...datasets["Сотрудники"].kpis.slice(0, 4)], aiTitle: "Общий контур HR-аналитики", aiText: "Кандидаты теряются до оценки, сотрудники с риском концентрируются в контакт-центре. Следующий шаг — настроить напоминания и ИПР." };
  }
  return datasets[filter] || datasets["Кандидаты"];
}

function renderPeopleTable(people, scope = "Кандидаты") {
  // Единая категория статуса для строки: и балл, и бейдж соответствия
  // всегда красятся в один цвет, зависящий от статуса кандидата.
  const stageStatus = (s) => {
    if (!s) return 'neutral';
    const sl = s.toLowerCase();
    if (sl.includes('не подход') || sl.includes('риск') || sl.includes('отказ') || sl.includes('низк')) return 'bad';
    if (sl.includes('условно')) return 'medium';
    if (sl.includes('принят') || sl.includes('оффер') || sl.includes('подход') || sl.includes('норма')) return 'good';
    if (sl.includes('интервью') || sl.includes('отправлен') || sl.includes('работе')) return 'neutral';
    return 'neutral';
  };
  const grad = { good: "#166534,#4ADE80", medium: "#9A3412,#FACC15", bad: "#7F1D1D,#F87171", neutral: "#1E3A8A,#7CA0FF" };
  const col = { good: "#4ADE80", medium: "#FACC15", bad: "#F87171", neutral: "#CDD9EE" };
  if (!people.length) return `<div class="ov-empty">Нет данных для выбранного фильтра.</div>`;
  return `<div class="gp-list">${people.map((item) => {
    const scoreRaw = item.result?.percent ?? item.fit;
    const score = (scoreRaw === null || scoreRaw === undefined) ? null : scoreRaw;
    const stage = item.stage || item.recommendation || "";
    const cat = stageStatus(stage);
    const role = item.vacancy || item.position || item.professionTitle || "";
    const sub = [role, stage].filter(Boolean).join(" · ");
    const badge = score != null
      ? `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto;font-size:11.5px;font-weight:800;color:${col[cat] || "#CDD9EE"}"><span style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,${grad[cat] || grad.neutral})"></span>${score}%</span>`
      : (stage ? `<span style="margin-left:auto;flex:0 0 auto;font-size:11px;font-weight:700;color:${col[cat] || "#CDD9EE"}">${escapeHtml(stage)}</span>` : "");
    return `<button class="gp-row" data-open-card="${item.id}">
      <span style="width:34px;height:34px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-size:12px;font-weight:800;color:#02121a;background:linear-gradient(135deg,#1E5BFF,#00E5D4)">${cardInitials(personName(item))}</span>
      <span style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:13px;color:#E6F2FF;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(personName(item))}</b><span style="font-size:11.5px;color:rgba(230,242,255,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${escapeHtml(sub || "—")}</span></span>
      ${badge}
    </button>`;
  }).join("")}</div>`;
}

// Таблица оценочных ссылок (для дрилл-дауна «Оценка отправлена / Отправлено ссылок»).
function renderLinksTable(links) {
  const fmtDate = (d) => {
    if (!d) return "—";
    const t = Date.parse(d);
    return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString("ru-RU");
  };
  if (!(links && links.length)) return `<div class="ov-empty">Ссылок пока нет.</div>`;
  const stLabel = { sent: "отправлена", opened: "открыта", started: "в процессе", completed: "пройдено", expired: "истекла", cancelled: "отменена", pending: "ожидает" };
  return `<div class="gp-list">${links.map((l) => {
    const done = (l.status || "").toLowerCase().includes("пройд") || l.status === "completed";
    const c = done ? "#4ADE80" : "#7CA0FF";
    const gr = done ? "#166534,#4ADE80" : "#1E3A8A,#7CA0FF";
    const name = l.fullName || l.email || "—";
    const sub = [l.professionTitle || "", fmtDate(l.createdAt)].filter(Boolean).join(" · ");
    const right = l.percent != null
      ? `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto;font-size:11.5px;font-weight:800;color:${c}"><span style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,${gr})"></span>${l.percent}%</span>`
      : `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto;font-size:11px;font-weight:600;color:#CDD9EE"><span style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,${gr})"></span>${escapeHtml(stLabel[l.status] || l.status || "—")}</span>`;
    return `<button class="gp-row" ${l.token ? `data-open-assess="${l.token}"` : ""}>
      <span style="width:34px;height:34px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-size:12px;font-weight:800;color:#02121a;background:linear-gradient(135deg,#1E5BFF,#00E5D4)">${cardInitials(name)}</span>
      <span style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:13px;color:#E6F2FF;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(name)}</b><span style="font-size:11.5px;color:rgba(230,242,255,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${escapeHtml(sub || "—")}</span></span>
      ${right}
    </button>`;
  }).join("")}</div>`;
}

function renderEmployeeTable(employees) {
  return `<table><thead><tr><th>ФИО</th><th>Должность</th><th>Отдел</th><th>Риск</th><th>Удовлетворенность</th><th>Действия</th></tr></thead><tbody>${employees.map((item) => `<tr><td>${item.fullName}</td><td>${item.position}</td><td>${item.department}</td><td>${item.turnoverRisk}</td><td>${item.satisfaction}%</td><td><div class="rowActions"><button class="button subtle" data-open-card="${item.id}">Карточка</button><button class="button subtle" data-open-answers="${item.id}">Ответы</button></div></td></tr>`).join("") || `<tr><td colspan="6" style="text-align:center;padding:24px;color:rgba(230,242,255,.35)">Нет данных</td></tr>`}</tbody></table>`;
}

function renderReportTable(state) {
  const completed = state.sessions.filter((item) => item.status === "completed");
  return `<table><thead><tr><th>Дата</th><th>Тип</th><th>ФИО / группа</th><th>Вакансия / отдел</th><th>Статус</th><th>Доступ</th></tr></thead><tbody>${completed.map((session) => `<tr><td>${new Date(session.completedAt).toLocaleDateString("ru-RU")}</td><td>${session.person.assessmentType}</td><td>${session.person.fullName}</td><td>${session.vacancy || session.professionTitle}</td><td><span class="status completed">${session.result.recommendation}</span></td><td><div class="rowActions"><button class="button subtle" data-report-id="${session.id}">PDF</button><button class="button subtle" data-open-answers="${session.id}">Ответы</button><button class="button subtle" data-open-card="${session.id}">Открыть</button></div></td></tr>`).join("") || `<tr><td colspan="6">Готовых отчетов пока нет.</td></tr>`}</tbody></table>`;
}


function metric(title, value, width) { return `<div class="metric"><div><span>${title}</span><b>${value}</b></div><i><em style="width:${width}%"></em></i></div>`; }
function product(title, text) { return `<article class="productCard glass"><h3>${title}</h3><p>${text}</p></article>`; }
function step(number, title, text) { return `<div class="step"><b>${number}</b><div><h3>${title}</h3><p>${text}</p></div></div>`; }
function navItem(item, activeView) {
  return `<button class="${activeView === item.id ? "active" : ""} ${item.locked ? "lockedNav" : ""}" data-view="${item.id}"><span class="navIcon">${item.icon}</span><span>${item.label}</span>${item.count !== null && item.count !== undefined ? `<b>${item.count}</b>` : ""}${item.alertCount ? `<em>${item.alertCount}</em>` : ""}</button>`;
}
function kpi(title, value, caption, target = "") { return `<article class="panel kpi ${target ? "clickable" : ""}" ${target ? `data-open-list="${target}"` : ""}><span>${title}</span><strong>${value}</strong><p>${caption}</p></article>`; }
function smallStat(title, value) { return `<div><span>${title}</span><b>${value}</b></div>`; }
function featureBadge(title, text) { return `<span><b>${title}</b>${text}</span>`; }
function funnelStep(item, active) { const [title, value] = item; const width = Math.max(10, Math.min(100, Number(value) * 2)); return `<button class="funnelStep ${active === title ? "active" : ""}" data-stage="${title}"><div><span>${title}</span><b>${value}</b></div><i><em style="width:${width}%"></em></i></button>`; }
function competencyGroup(title, items) { return `<div class="competencyGroup"><h3>${title}</h3><div>${items.map((item) => `<button>${item}</button>`).join("")}</div></div>`; }
function employeesToPeople(employees) { return employees.map((item) => ({ ...item, person: { fullName: item.fullName }, result: { percent: item.fit }, vacancy: item.position, stage: item.turnoverRisk, completedAt: item.startDate })); }
function stageMatch(item, stage) { if (stage === "Оценка пройдена") return item.status === "completed"; if (stage === "Подходит") return item.result.percent >= 68; if (stage === "Не подходит") return item.result.percent < 52; if (stage === "Интервью") return item.stage === "Интервью" || item.result.percent >= 68; return true; }
function canCancel(link) { return ["pending", "opened", "sent"].includes(link.status); }
function statusText(status) { return ({ pending: "создана", sent: "отправлена", opened: "открыта", started: "начата", completed: "завершена", cancelled: "отменена", expired: "истекла" })[status] || status; }
function aiAccess(tariff) { if (tariff === "TalentStudio") return "Полный AI"; if (tariff === "TalentPro") return "AI-подсказки"; return "VPR / ePR"; }
function readiness(result) { if (result.percent >= 82 && result.redFlags < 2) return "A"; if (result.percent >= 68) return "B+"; if (result.percent >= 52) return "B-"; return "C"; }
function stat(title, value) { return `<div class="reportStat"><span>${title}</span><b>${value}</b></div>`; }
function decisionText(result) { if (result.percent >= 82 && result.redFlags < 2) return "Участник хорошо соответствует профилю роли. Можно переходить к следующему этапу и проверять практическим кейсом."; if (result.percent >= 52) return "Есть рабочий потенциал, но требуется дополнительная проверка слабых зон и красных флагов перед решением."; return "Результат ниже целевого уровня. Рекомендуется рассмотреть альтернативных кандидатов или не использовать сотрудника в этой роли без развития."; }

function navCounts(state) {
  const candidates = state.sessions.filter((item) => item.person.assessmentType === "Кандидат");
  return {
    candidates: candidates.length + 128,
    candidateRisks: candidates.filter((item) => item.result.percent < 60).length + 9,
    employees: 70,
    employeeRisks: state.employees.filter((item) => item.fit < 70).length + 4,
    vacancies: state.vacancies.length + 15,
    vacancyRisks: state.vacancies.filter((item) => getVacancyHealthStatus(item) === "bad").length + 2,
    profiles: 50,
    links: state.links.length,
    reports: state.sessions.filter((item) => item.status === "completed").length,
    newEmployees: 14,
    adaptationRisks: 3,
    reviews360: 5,
    reviews360Risks: 2,
    performance: 42,
    performanceRisks: 4,
    referrals: state.referrals.invited
  };
}

function statusForLabel(label, value) {
  if (/риск|выгорание|не подходят|низк/i.test(label)) return getRiskStatus(value);
  if (/соответ|подход|готов|уровень|удовлетвор/i.test(label)) return getFitStatus(value);
  if (/конверс|прош/i.test(label)) return getConversionStatus(value);
  return "neutral";
}

function attentionItems(state) {
  return [
    { title: "12 кандидатов не прошли оценку", text: "Ссылки отправлены, но оценка не завершена.", status: "medium", target: "Кандидаты:Оценка отправлена" },
    { title: "4 вакансии без движения", text: "Нет откликов или нет подходящих больше 7 дней.", status: "bad", target: "Вакансии:Низкая конверсия" },
    { title: "6 сотрудников в зоне риска", text: "Есть признаки выгорания или риска увольнения.", status: "bad", target: "Сотрудники:В зоне риска" },
    { title: "Баланс ниже 20", text: `${state.company.balance} оценок доступно. Рекомендуется пополнить.`, status: state.company.balance < 20 ? "medium" : "good", target: "Кандидаты:Оценка отправлена" }
  ];
}

function candidateHeatmap(state) {
  // Данные с бэкенда: вакансии × источники (средний балл прошедших тест).
  if (state.candidateHeatmap && state.candidateHeatmap.columns) {
    const hm = state.candidateHeatmap;
    return {
      title: "Качество кандидатов по вакансиям и источникам",
      columns: hm.columns,
      rows: hm.rows.map((row) => ({
        label: row.vacancy,
        cells: row.cells.map((cell) => ({
          value: cell.scored ? `${cell.avg_percent}%` : "—",
          caption: cell.scored
            ? `${cell.scored} из ${cell.count} прошли`
            : `${cell.count} кандидатов`,
          status: cell.scored ? getFitStatus(cell.avg_percent) : "neutral",
          target: `Кандидаты:${row.vacancy} ${cell.source}`
        }))
      }))
    };
  }

  const sources = ["HeadHunter", "Avito", "Telegram", "API", "Ручная", "Импорт"];
  return {
    title: "Качество кандидатов по вакансиям и источникам",
    columns: sources,
    rows: state.vacancies.map((vacancy, rowIndex) => ({
      label: vacancy.title,
      cells: sources.map((source, index) => {
        const fit = Math.max(24, Math.min(92, vacancy.fit * 6 + index * 5 - rowIndex * 7));
        return {
          value: `${fit}%`,
          caption: `${Math.max(3, vacancy.fit + index * 2)} кандидатов`,
          status: getFitStatus(fit),
          target: `Кандидаты:${vacancy.title} ${source}`
        };
      })
    }))
  };
}

function employeeHeatmap(state) {
  const columns = ["Удовлетворенность", "Выгорание", "Риск увольнения", "Соответствие", "Адаптация", "Performance"];
  const employees = state.employeesApi || [];

  // Группируем реальных сотрудников по отделам (раньше тут был seedDepartments()
  // с выдуманными значениями — теперь всё считается из state.employeesApi).
  const byDept = new Map();
  employees.forEach((e) => {
    const name = e.department && e.department !== "—" ? e.department : "Без отдела";
    if (!byDept.has(name)) byDept.set(name, []);
    byDept.get(name).push(e);
  });

  // Данные ещё не загрузились / отделов нет — рисуем пустую карту, без моков.
  if (!byDept.size) return { title: "Состояние отделов", columns, rows: [] };

  const daysSince = (d) => {
    if (!d) return null;
    const t = Date.parse(d);
    return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
  };
  // «Признаки выгорания» — тот же критерий, что и на бэке (crud/employee.py).
  const hasBurnout = (e) => e.burnout && !["нет", "—", ""].includes(String(e.burnout).toLowerCase());
  const elevatedRisk = (e) => ["средний", "повышенный", "высокий"].includes(String(e.turnoverRisk || "").toLowerCase());
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null);
  const share = (arr, n) => (n ? Math.round((arr.length / n) * 100) : null);

  // Реальные метрики по одному отделу. value=null → «нет данных».
  const metricsFor = (emps) => {
    const fits = emps.map((e) => e.fit).filter((v) => v != null);
    const tenured = emps.filter((e) => { const d = daysSince(e.startDate); return d != null && d > 90; });
    return {
      "Удовлетворенность": { value: avg(emps.map((e) => e.satisfaction).filter((v) => v > 0)), kind: "level" },
      "Выгорание": { value: share(emps.filter(hasBurnout), emps.length), kind: "risk" },
      "Риск увольнения": { value: share(emps.filter(elevatedRisk), emps.length), kind: "risk" },
      "Соответствие": { value: avg(fits), kind: "level" },
      // Адаптация: доля «осевших» (90+ дней) сотрудников, успешно прошедших онбординг (fit≥70).
      "Адаптация": { value: share(tenured.filter((e) => e.fit != null && e.fit >= 70), tenured.length), kind: "level" },
      // Performance: доля высокой результативности (fit≥80) среди оценённых.
      "Performance": { value: share(fits.filter((v) => v >= 80), fits.length), kind: "level" }
    };
  };

  // Отделы — по убыванию численности.
  const rows = [...byDept.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, emps]) => {
      const m = metricsFor(emps);
      return {
        label: `${name} · ${emps.length} чел.`,
        cells: columns.map((column) => {
          const { value, kind } = m[column];
          const target = `Сотрудники:${name} ${column}`;
          if (value == null) return { value: "—", caption: "нет данных", status: "neutral", target };
          const isRisk = kind === "risk";
          return {
            value: `${value}%`,
            caption: isRisk ? "риск" : "уровень",
            status: isRisk ? getRiskStatus(value) : getFitStatus(value),
            target
          };
        })
      };
    });

  return { title: "Состояние отделов", columns, rows };
}

function vacancyHeatmap(state) {
  const columns = ["Отклики", "Отправлено", "Пройдено", "Подходят", "Интервью", "Офферы", "Выходы", "Конверсия"];
  return {
    title: "Эффективность вакансий",
    columns,
    rows: state.vacancies.map((vacancy) => ({
      label: vacancy.title,
      cells: columns.map((column) => {
        const valueMap = {
          "Отклики": vacancy.responses,
          "Отправлено": vacancy.assessments,
          "Пройдено": Math.max(3, Math.round(vacancy.assessments * .72)),
          "Подходят": vacancy.fit,
          "Интервью": Math.max(1, Math.round(vacancy.fit * .72)),
          "Офферы": Math.max(0, Math.round(vacancy.fit * .25)),
          "Выходы": Math.max(0, Math.round(vacancy.fit * .16)),
          "Конверсия": vacancy.conversion
        };
        const numeric = Number(String(valueMap[column]).replace("%", ""));
        const status = column === "Конверсия" ? getConversionStatus(numeric) : column === "Подходят" ? getFitStatus(numeric * 8) : getVacancyHealthStatus(vacancy);
        return { value: valueMap[column], caption: column, status, target: `Вакансии:${vacancy.title} ${column}` };
      })
    }))
  };
}

function peopleTableConfig(people, scope) {
  return {
    title: "Детализация",
    caption: scope,
    columns: ["ФИО", "Вакансия / должность", "Балл", "Соответствие", "Дата", "Действия"],
    rows: people.map((item) => [
      personName(item),
      item.vacancy || item.position || item.professionTitle,
      `${item.result?.percent || item.fit}%`,
      StatusBadge(item.stage || item.recommendation || "в работе", statusForLabel(item.stage || "", item.result?.percent || item.fit)),
      item.completedAt ? new Date(item.completedAt).toLocaleDateString("ru-RU") : item.startDate,
      ActionButtonGroup([
        { label: "Карточка", attrs: `data-open-card="${item.id}"` },
        { label: "PDF", attrs: item.id?.startsWith("emp-") ? `data-open-card="${item.id}"` : `data-report-id="${item.id}"` },
        { label: "Ответы", attrs: `data-open-answers="${item.id}"` }
      ])
    ])
  };
}

function candidatesTableConfig(candidates) {
  return {
    title: "Таблица кандидатов",
    caption: "карточка, PDF, ответы и следующий шаг",
    columns: ["Кандидат", "Вакансия", "Источник", "Статус", "Оценка", "Соответствие", "Риск", "Дата", "Ответственный", "Действия"],
    rows: candidates.map((item) => [
      CandidatePreview(item),
      item.vacancy,
      StatusBadge(sourceTag(item.source), "neutral"),
      StatusBadge(item.stage, statusForLabel(item.stage, item.result.percent)),
      item.status === "completed"
        ? `пройдена · ${item.result.percent}%`
        : item.assessmentSent
          ? "отправлена"
          : "не отправлена",
      (item.assessed ?? (item.status === "completed"))
        ? StatusBadge(`${item.result.percent}%`, getFitStatus(item.result.percent))
        : StatusBadge("Не оценён", "neutral"),
      (item.assessed ?? (item.status === "completed"))
        ? StatusBadge(item.result.redFlags ? "средний" : "низкий", item.result.redFlags ? "medium" : "good")
        : StatusBadge("—", "neutral"),
      new Date(item.completedAt).toLocaleDateString("ru-RU"),
      "Рекрутер",
      `<div class="rowActionsWrap">${ActionButtonGroup([
        { label: "Карточка", attrs: `data-open-card="${item.id}"` },
        ...(item.status === "completed" ? [{ label: "PDF", attrs: `data-pdf-id="${item.id}"` }] : []),
        { label: "Ответы", attrs: `data-open-answers="${item.id}"` }
      ])}${CandidateKebab(item.id)}</div>`
    ])
  };
}

// Кнопка «три точки» у кандидата — открывает поповер с быстрыми действиями.
function CandidateKebab(id) {
  return `<button class="elt-kebab-btn" type="button" data-kebab-id="${id}" aria-label="Действия">⋮</button>`;
}

// Поповер быстрых действий (рендерится на уровне приложения, чтобы не обрезался
// таблицей). Координаты берутся из позиции кнопки при клике.
function renderKebabPopover(state) {
  if (!state.kebabMenu) return "";
  const { id, x, y } = state.kebabMenu;
  const act = (stage, label) =>
    `<button type="button" data-stage-id="${id}" data-stage-action="${stage}">${label}</button>`;
  return `<div class="elt-kebab-backdrop" data-kebab-close></div>
    <div class="elt-kebab-pop" style="left:${x}px;top:${y}px">
      <button type="button" data-send-assessment-id="${id}">Отправить оценку</button>
      <button type="button" data-convert-id="${id}">Перевести в сотрудники</button>
      <div class="elt-kebab-sep"></div>
      ${act("interview", "На интервью")}
      ${act("accepted", "Принять")}
      ${act("not_fit", "Отклонить")}
    </div>`;
}

function employeesTableConfig(employees) {
  return {
    title: "Таблица сотрудников",
    caption: "риски, оценка, ответы и рекомендации",
    columns: ["Сотрудник", "Отдел", "Руководитель", "Тип", "Соответствие", "Риск", "Рекомендация", "Действия"],
    rows: employees.map((item) => ({
      // Клик по строке открывает карточку сотрудника (кнопки «Карточка» больше нет).
      attrs: `data-open-card="${item.id}" class="elt-row-clickable"`,
      cells: [
        EmployeePreview(item),
        item.department,
        item.manager,
        item.position.includes("Руководитель") ? "руководитель" : item.startDate > "2026-03-01" ? "новый" : "офисный",
        StatusBadge(fitLabel(item.fit), getFitStatus(item.fit)),
        StatusBadge(item.turnoverRisk, item.turnoverRisk === "низкий" ? "good" : item.turnoverRisk === "средний" ? "medium" : item.turnoverRisk === "—" ? "neutral" : "bad"),
        item.recommendation,
        // «Ответы» — только если сотрудник прошёл оценку (есть результат fit).
        item.fit != null
          ? ActionButtonGroup([{ label: "Ответы", attrs: `data-open-answers="${item.id}"` }])
          : "—"
      ]
    }))
  };
}

function vacanciesTableConfig(vacancies) {
  return {
    title: "Компактная таблица вакансий",
    caption: "эффективность и действия",
    columns: ["Вакансия", "Источник", "Статус", "Отклики", "Оценки", "Прошли", "Подходят", "Конверсия", "Ответственный", "Действия"],
    rows: vacancies.map((vacancy) => [
      VacancyPreview(vacancy),
      StatusBadge(sourceTag(vacancy.source), "neutral"),
      StatusBadge(vacancy.status, vacancy.status === "Активна" ? "good" : "medium"),
      vacancy.responses,
      vacancy.assessments,
      Math.max(3, Math.round(vacancy.assessments * .72)),
      `<button class="linkButton" data-open-vacancy-fit="${vacancy.id}">${vacancy.fit}</button>`,
      StatusBadge(vacancy.conversion, getConversionStatus(vacancy.conversion)),
      "Рекрутер",
      ActionButtonGroup([
        { label: "Кандидаты", attrs: `data-open-vacancy-fit="${vacancy.id}"` },
        { label: "Профиль", attrs: `data-open-competency="${professionIdByTitle(vacancy.profile)}"` },
        { label: "Карточка", attrs: `data-open-list="Вакансии:${vacancy.title}"` }
      ])
    ])
  };
}

function reportsHeatmap() {
  const columns = ["Кандидаты", "Сотрудники", "Группы", "360", "Адаптация", "Review"];
  const rows = ["PDF", "Ответы", "Нужна проверка", "Достоверность", "Рекомендации"];
  return {
    title: "Состояние отчетов по типам оценки",
    columns,
    rows: rows.map((label, rowIndex) => ({
      label,
      cells: columns.map((column, index) => {
        const value = Math.max(1, 18 - rowIndex * 3 + index);
        const status = label === "Нужна проверка" ? "bad" : label === "Достоверность" && index > 3 ? "medium" : "neutral";
        return { value, caption: column, status, target: `Отчеты:${label} ${column}` };
      })
    }))
  };
}

function reportsTableConfig(reports) {
  const typeRu = (t) => (t === "employee" ? "Сотрудник" : "Кандидат");
  return {
    title: "Реестр отчётов",
    caption: "ответы и карточка доступны из строки",
    columns: ["Дата", "Тип", "ФИО", "Тест", "Балл", "Действия"],
    rows: reports.map((r) => [
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("ru-RU") : "—",
      typeRu(r.respondent_type),
      r.full_name,
      r.test_title || r.category || "—",
      StatusBadge(`${r.percent}%`, getFitStatus(r.percent)),
      ActionButtonGroup([
        // PDF-отчёт есть только для кандидатов (эндпоинт /candidates/{id}/report).
        ...(r.respondent_type === "candidate" && r.person_id ? [{ label: "PDF", attrs: `data-pdf-id="${r.person_id}"` }] : []),
        { label: "Ответы", attrs: `data-open-answers="${r.person_id}"` },
        { label: "Карточка", attrs: `data-open-card="${r.person_id}"` }
      ])
    ])
  };
}

function moduleCard(title, data, tariff) {
  const locked360 = title === "Оценка 360" && tariff !== "TalentStudio";
  const aiText = locked360 ? "Оценка 360 доступна на тарифе TalentStudio." : data.aiText;
  return `<article class="panel moduleCard ${locked360 ? "isLocked" : ""}" ${locked360 ? `data-open-locked="${aiText}"` : `data-dashboard-filter="${title}"`}>
    <div class="panelHead"><h2>${title}</h2><span>${data.kpis[0]?.[1] || ""}</span></div>
    ${miniBars(data.funnel.slice(0, 4))}
    <p>${aiText}</p>
  </article>`;
}

function miniBars(items) {
  const max = Math.max(...items.map((item) => Number(item[1]) || 1), 1);
  return `<div class="miniChart">${items.map(([title, value]) => `<div><span>${title}</span><i><b style="width:${Math.max(8, (Number(value) || 1) / max * 100)}%"></b></i><strong>${value}</strong></div>`).join("")}</div>`;
}

function peopleForModal(state, scope, metricName) {
  const employeeScopes = ["Сотрудники", "Адаптация", "Оценка 360", "Performance Review"];
  if (employeeScopes.includes(scope)) {
    const emps = state.employeesApi || [];
    const links = state.linksApi || [];
    const m = (metricName || "");
    const has = (s) => m.toLowerCase().includes(s.toLowerCase());

    // Сотрудники — участники ссылок конкретного теста (опц. фильтр по статусу).
    const linkPeople = (title, statusFn) => {
      const names = new Set(
        links
          .filter((l) => l.professionTitle === title && l.recipientType === "Сотрудник" && (!statusFn || statusFn(l)))
          .map((l) => l.fullName)
      );
      return emps.filter((e) => names.has(e.fullName));
    };
    const pot = (e) => {
      let p = e.satisfaction || 0;
      if (e.turnoverRisk === "повышенный") p -= 15;
      else if (e.turnoverRisk === "средний") p -= 7;
      return Math.max(0, Math.min(100, p));
    };
    const daysSince = (d) => {
      if (!d) return null;
      const t = Date.parse(d);
      return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
    };

    if (scope === "Performance Review") {
      if (has("не оцен")) return emps.filter((e) => e.fit == null);
      if (has("цикл")) return linkPeople("Performance Review");
      if (has("Завершил")) return linkPeople("Performance Review", (l) => l.status === "completed");
      if (has("HiPo") || has("потенциал")) return emps.filter((e) => e.fit >= 80 && pot(e) >= 80);
      if (has("резерв")) return emps.filter((e) => pot(e) >= 80 && e.fit >= 60);
      if (has("Высок")) return emps.filter((e) => e.fit >= 80);
      if (has("Низк")) return emps.filter((e) => e.fit != null && e.fit < 60);
      return emps;
    }

    if (scope === "Оценка 360") {
      if (has("Активн")) return linkPeople("Оценка 360°", (l) => l.status !== "completed");
      if (has("Завершен")) return linkPeople("Оценка 360°", (l) => l.status === "completed");
      if (has("Участник") || has("балл")) return linkPeople("Оценка 360°");
      if (has("разв")) return emps.filter((e) => e.fit != null && e.fit < 70);
      return emps;
    }

    if (scope === "Адаптация") {
      const newEmps = emps.filter((e) => { const d = daysSince(e.startDate); return d !== null && d <= 90; });
      // «Активные циклы» — строго люди с активным циклом адаптации (а не «новые до 90 дней»).
      if (has("цикл")) {
        const activeIds = new Set((state.adaptationCycles || []).filter((c) => c.status === "active").map((c) => c.person_id));
        return emps.filter((e) => activeIds.has(e.id));
      }
      if (has("Новые")) return newEmps;
      if (has("процесс") || has("30")) return emps.filter((e) => { const d = daysSince(e.startDate); return d !== null && d <= 30; });
      if (has("Опрос")) return linkPeople("Адаптация сотрудника", has("пройден") ? (l) => l.status === "completed" : null);
      if (has("Прошл")) return emps.filter((e) => { const d = daysSince(e.startDate); return d !== null && d > 90 && e.fit >= 70; });
      if (has("риск") || has("зоне")) return newEmps.filter((e) => e.turnoverRisk === "средний" || e.turnoverRisk === "повышенный" || (e.satisfaction > 0 && e.satisfaction < 60));
      if (has("Вовлеч") || has("удовлет")) return emps.filter((e) => e.satisfaction > 0);
      return newEmps.length ? newEmps : emps;
    }

    // scope === "Сотрудники" — в т.ч. дрилл-даун из «Состояния отделов»
    // (metricName вида «Отдел продаж Риск увольнения»).
    const deptNames = [...new Set([
      ...(state.departments || []).map((d) => d.name),
      ...emps.map((e) => e.department),
    ])].filter(Boolean);
    const dept = deptNames.find((name) => m.includes(name));
    const pool = dept ? emps.filter((e) => e.department === dept) : emps;
    if (has("Высок")) return pool.filter((e) => e.fit != null && e.fit >= 80);
    if (has("Средн")) return pool.filter((e) => e.fit != null && e.fit >= 60 && e.fit < 80);
    if (has("Низк")) return pool.filter((e) => e.fit != null && e.fit < 60);
    if (has("Выгорание")) return pool.filter((e) => e.burnout && !["—", "нет", ""].includes(String(e.burnout).toLowerCase()));
    // «В зоне риска» на бэке = только повышенный риск увольнения (без учёта fit),
    // поэтому здесь тот же критерий, а не employeeAtRisk (он шире).
    if (has("риск") || has("зоне")) {
      return pool.filter((e) => ["средний", "повышенный", "высокий"].includes(String(e.turnoverRisk || "").toLowerCase()));
    }
    if (has("удовлет")) return pool.filter((e) => e.satisfaction > 0);
    return pool;
  }
  // Вакансии — метрики о состоянии вакансий (активные/закрытые/отклики), а не о
  // людях: не подменяем их списком кандидатов (раньше так и было). Пустой список
  // с понятным состоянием честнее, чем нерелевантные данные.
  if (scope === "Вакансии") return [];

  // Кандидаты: при наличии данных из API фильтруем их, иначе — демо-сид.
  const usingApi = Boolean(state.candidateStats && state.candidatesApi);
  const candidates = usingApi
    ? state.candidatesApi
    : state.sessions.filter((x) => x.person.assessmentType === "Кандидат");
  const passed = (x) => x.status === "completed";
  const pct = (x) => (x.result ? x.result.percent : 0);

  // Категории совпадают с определениями KPI-карточек (см. renderCandidates).
  if (metricName.includes("всего") || metricName.includes("Всего")) return candidates;
  // «Оценка отправлена» = всем кандидатам отправлена оценка (по числу ссылок).
  if (metricName.includes("отправлен")) return candidates;
  if (metricName.includes("пройден") || metricName.includes("прошл")) return candidates.filter(passed);
  if (metricName.includes("Условно")) return candidates.filter((x) => passed(x) && pct(x) >= 55 && pct(x) < 68);
  if (metricName.includes("Не подход")) return candidates.filter((x) => passed(x) && pct(x) < 55);
  if (metricName.includes("Подход")) return candidates.filter((x) => passed(x) && pct(x) >= 68);
  if (metricName.includes("Интервью")) return candidates.filter((x) => x.stage === "Интервью");
  if (metricName.includes("Принят")) return candidates.filter((x) => x.stage === "Принят");
  // «Зависли» = кандидаты без завершённой оценки (не прошли тест).
  if (metricName.includes("Завис")) return candidates.filter((x) => !passed(x));
  return candidates;
}

function findPerson(state, id) {
  return state.sessions.find((item) => item.id === id) || employeesToPeople(state.employees).find((item) => item.id === id) || { id, fullName: id, position: "Отдел", recommendation: "Открыть подробную карточку после подключения backend." };
}

function personName(item) {
  return item?.person?.fullName || item?.fullName || "Участник";
}

// «Не оценён», если профильной оценки не было (fit = null/undefined).
function fitLabel(fit) {
  return (fit === null || fit === undefined) ? "не оценён" : `${fit}%`;
}

// ── Карточка человека в стиле Claude Design: hero + тесты + детали ──
const CARD_FC = (v) => v == null ? "#6E7C97" : v >= 80 ? "#4ADE80" : v >= 60 ? "#FACC15" : "#F87171";
const cardInitials = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
const cardSecLabel = (t) => `<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9B6BF2;margin:20px 0 10px">${t}</div>`;
function cardHero(name, role, fit, id, photos) {
  const c = CARD_FC(fit);
  const photo = id ? (photos || {})[id] : null;
  const avatarInner = photo
    ? `<img class="oc-avatar-img" src="${photo}" alt="${escapeHtml(name || "")}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : cardInitials(name);
  const avatar = id
    ? `<span class="card-hero-avatar" data-oc-avatar="${id}" title="Нажмите, чтобы загрузить фото" style="position:relative;width:46px;height:46px;border-radius:50%;flex:none;overflow:hidden;display:grid;place-items:center;font-size:16px;font-weight:800;color:#02121a;background:linear-gradient(135deg,#1E5BFF,#00E5D4);cursor:pointer">${avatarInner}<span class="oc-avatar-upload-hint">📷</span></span>`
    : `<span style="width:46px;height:46px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:16px;font-weight:800;color:#02121a;background:linear-gradient(135deg,#1E5BFF,#00E5D4)">${avatarInner}</span>`;
  return `<div style="display:flex;align-items:center;gap:14px;padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04)">
    ${avatar}
    <div style="flex:1 1 0%;min-width:0"><div style="font-size:12px;color:rgba(230,242,255,.5)">Соответствие профилю</div><div style="font-size:13px;color:#E6F2FF;font-weight:600">${escapeHtml(role || "—")}</div></div>
    <div style="font-size:30px;font-weight:800;color:${c};letter-spacing:-.02em">${fit == null ? "—" : fit + "%"}</div>
  </div>`;
}
function cardDetails(rows) {
  return `<div>${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="font-size:12.5px;color:rgba(230,242,255,.5)">${k}</span><b style="font-size:12.5px;color:#E6F2FF;font-weight:600;text-align:right">${escapeHtml(String(v))}</b></div>`).join("")}</div>`;
}

// Инлайн-селект отдела в карточке — смена отдела сотрудника (в т.ч. из «без отдела»)
// без отдельной модалки. Меняет department_id через PATCH /employees/{id} (app.js).
function cardDeptSelect(d, departments) {
  const depts = Array.isArray(departments) ? departments : [];
  const options = [
    `<option value=""${!d.department_id ? " selected" : ""}>— без отдела —</option>`,
    ...depts.map((x) => `<option value="${x.id}"${d.department_id === x.id ? " selected" : ""}>${escapeHtml(x.name)}</option>`),
  ].join("");
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">
    <span style="font-size:12.5px;color:rgba(230,242,255,.5);flex:none">Отдел</span>
    <select class="elt-select" data-emp-dept="${d.id}" style="flex:1;max-width:200px;font-size:12.5px;padding:6px 8px">${options}</select>
  </div>`;
}

function employeeCardApi(d, photos, departments) {
  const riskRu = { none: "—", low: "низкий", medium: "средний", high: "повышенный" };
  const role = `${d.position || "Сотрудник"}${d.department ? " · " + d.department : ""}`;
  const a = d.assessments;
  const testRows = (a === undefined)
    ? `<p class="modal-subtitle">Загрузка оценок…</p>`
    : (a && a.count)
      ? a.items.map((it) => { const c = CARD_FC(it.percent); return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)"><span style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:13px;color:#E6F2FF;font-weight:600">${escapeHtml(it.test_title || it.category || "Тест")}</b></span><span style="font-size:12px;font-weight:800;padding:3px 9px;border-radius:999px;background:${c}22;color:${c}">${it.percent}%</span></div>`; }).join("")
      : `<div class="ov-empty">Сотрудник пока не проходил тесты.</div>`;
  return `<div>
    ${cardHero(d.full_name, role, d.fit, d.id, photos)}
    ${cardSecLabel("Тесты и оценки")}
    <div style="display:flex;flex-direction:column;gap:8px">${testRows}</div>
    ${a && a.count ? `<button class="elt-btn-ghost" data-open-answers="${d.id}" style="margin-top:12px;width:100%">Посмотреть ответы по тесту →</button>` : ""}
    ${cardSecLabel("Детали")}
    ${cardDeptSelect(d, departments)}
    ${cardDetails([
      ["Руководитель", d.manager || "—"],
      ["Риск увольнения", riskRu[d.turnover_risk] || d.turnover_risk || "—"],
      ["Выгорание", d.burnout || "—"],
      ["Удовлетворённость", d.satisfaction != null ? d.satisfaction + "%" : "—"],
      ["Рекомендация", d.recommendation || "—"]
    ])}
    ${d.id ? `<button class="elt-btn-ghost" data-action="edit-employee" data-person-id="${d.id}" style="margin-top:16px;width:100%">✎ Редактировать данные</button>` : ""}
    ${cardArchiveBtn(d, "employee")}
  </div>`;
}

// Кнопка мягкого удаления в подвале карточки. Действие + подтверждение — в app.js
// (data-action="archive-person"): отчёты сохраняются, действие обратимо.
function cardArchiveBtn(d, kind) {
  if (!d.id) return "";
  const label = kind === "candidate" ? "Убрать кандидата в архив" : "Убрать сотрудника в архив";
  return `<button class="elt-btn-ghost" data-action="archive-person" data-person-id="${d.id}"
    data-person-kind="${kind}" data-person-name="${escapeHtml(d.full_name || "")}"
    style="margin-top:16px;width:100%;color:#F87171;border-color:rgba(248,113,113,.4)">${label}</button>`;
}

function candidateCard(d, photos) {
  const a = d.assessment;
  const percent = a ? a.percent : null;
  const passed = a && (a.status === "scored" || a.status === "reviewed" || a.status === "submitted");
  const recText = !passed ? "Тест ещё не пройден" : percent >= 55 ? "Рекомендуем рассмотреть" : "Не рекомендуем рассмотреть";
  const testRows = passed
    ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)"><span style="flex:1 1 0%;min-width:0"><b style="display:block;font-size:13px;color:#E6F2FF;font-weight:600">${escapeHtml(a.test_title || a.category || "Оценка")}</b></span><span style="font-size:12px;font-weight:800;padding:3px 9px;border-radius:999px;background:${CARD_FC(percent)}22;color:${CARD_FC(percent)}">${percent}%</span></div>`
    : `<div class="ov-empty">Тест ещё не пройден.</div>`;
  // Решение по кандидату: смена статуса (этапа воронки) и перевод в сотрудники.
  // Кнопки переиспользуют существующие обработчики data-stage-action / data-convert-id.
  const stageBtns = [
    ["interview", "На интервью"],
    ["fit", "Подходит"],
    ["conditional", "Условно"],
    ["not_fit", "Отклонить"],
  ].map(([val, label]) =>
    `<button type="button" class="cardStageBtn${d.stage === val ? " active" : ""}" data-stage-id="${d.id}" data-stage-action="${val}">${label}</button>`
  ).join("");
  return `<div>
    ${cardHero(d.full_name, d.vacancy_title || "Кандидат", percent, d.id, photos)}
    ${cardSecLabel("Решение по кандидату")}
    <div class="cardStageRow">${stageBtns}</div>
    <button class="elt-btn-primary" data-convert-id="${d.id}" style="margin-top:10px;width:100%">Перевести в сотрудники →</button>
    ${cardSecLabel("Тесты и оценки")}
    <div style="display:flex;flex-direction:column;gap:8px">${testRows}</div>
    ${passed ? `<button class="elt-btn-ghost" data-open-answers="${d.id}" style="margin-top:12px;width:100%">Посмотреть ответы →</button>` : ""}
    ${d.id ? `<button class="elt-btn-ghost" data-pdf-id="${d.id}" style="margin-top:8px;width:100%">Скачать PDF-отчёт ⤓</button>` : ""}
    ${cardSecLabel("Детали")}
    ${cardDetails([
      ["Риск (не справится)", percent != null ? Math.max(0, 100 - percent) + "%" : "—"],
      ["Город", d.city || "—"],
      ["Источник", d.source || "—"],
      ["Рекомендация", recText]
    ])}
    ${cardArchiveBtn(d, "candidate")}
  </div>`;
}

function personCard(item) {
  return `<div class="personCard"><b>${personName(item)}</b><span>${item?.vacancy || item?.position || item?.professionTitle || "Профиль оценки"}</span><dl><dt>Отдел / проект</dt><dd>${item?.department || item?.project || "Подбор"}</dd><dt>Руководитель</dt><dd>${item?.manager || "Ответственный HR"}</dd><dt>Результат</dt><dd>${item?.result?.percent || item?.fit || 76}%</dd><dt>Риск увольнения</dt><dd>${item?.turnoverRisk || "не применимо"}</dd><dt>Выгорание</dt><dd>${item?.burnout || "не выявлено"}</dd><dt>Рекомендация</dt><dd>${item?.recommendation || item?.result?.recommendation || "Проверить на интервью и сохранить PDF-отчет."}</dd></dl></div>`;
}

function assessmentProfile(id) {
  const titles = {
    recruiter: "Менеджер по подбору персонала",
    sales_manager: "Менеджер по продажам",
    call_center: "Оператор call-центра",
    coordinator: "Офисный координатор",
    warehouse: "Склад / линейный персонал"
  };
  return {
    title: titles[id] || "Профиль компетенций",
    description: "Карта показывает профессиональные и личностные компетенции, веса и рекомендации для интерпретации результата.",
    professional: ["Профиль роли", "Ситуационные кейсы", "Работа с данными", "Коммуникация", "Контроль результата"],
    personal: ["Ответственность", "Дисциплина", "Обучаемость", "Стрессоустойчивость", "Достоверность"]
  };
}

function renderTariffUpgradeModal(state) {
  const TARIFFS = [
    {
      id: 'Start',
      tier: 'FREE',
      name: 'Start',
      price: '990 ₽',
      features: ['До 20 оценок', 'Базовые отчёты', 'PDF-отчёт', 'AI-рекомендация']
    },
    {
      id: 'TalentCheck',
      tier: 'BASE',
      name: 'TalentCheck',
      price: '4 900 ₽',
      features: ['Индивидуальные оценки', 'Базовые отчёты', 'PDF-отчёт', 'AI-рекомендация: VPR / ePR']
    },
    {
      id: 'TalentPro',
      tier: 'PRO',
      name: 'TalentPro',
      price: '12 900 ₽',
      features: ['Всё из TalentCheck', 'Сравнение кандидатов', 'Расширенные отчёты', 'Групповые оценки', 'Больше профилей']
    },
    {
      id: 'TalentStudio',
      tier: 'STUDIO',
      name: 'TalentStudio',
      price: '29 900 ₽',
      features: ['Всё из TalentPro', 'Оценка 360°', 'Полный AI-ассистент', 'API-интеграции', 'Белый лейбл', 'Приоритетная поддержка']
    }
  ];

  const order = ['Start', 'TalentCheck', 'TalentPro', 'TalentStudio'];
  const current = state.company.tariff || 'Start';
  const currentIdx = order.indexOf(current);
  const available = TARIFFS.filter((t, i) => i > currentIdx);

  // Самый дорогой из доступных — рекомендуемый
  const topId = available.length > 0 ? available[available.length - 1].id : null;

  const closeBtn = `<button class="modal-close-btn" data-action="close-modal" title="Закрыть"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>`;

  // Максимальный тариф — Enterprise-предложение
  if (available.length === 0) {
    return `<div class="modalBackdrop">
      <div class="modal elt-upgrade-modal">
        <div class="elt-upgrade-header">
          <div>
            <div class="elt-upgrade-eyebrow">Ваш тариф</div>
            <div class="elt-upgrade-title">У вас максимальный тариф</div>
            <div class="elt-upgrade-subtitle">TalentStudio открывает все возможности платформы</div>
          </div>
          ${closeBtn}
        </div>
        <div class="elt-upgrade-current-badge">Текущий тариф: ${current}</div>
        <div class="elt-upgrade-max-block">
          <div class="elt-upgrade-max-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#00E5D4" opacity=".9"/></svg>
          </div>
          <div class="elt-upgrade-max-text">
            <h3>Вы используете TalentStudio</h3>
            <p>Нужны индивидуальные условия для крупной компании? Свяжитесь с нами — обсудим Enterprise-план.</p>
          </div>
          <a href="mailto:hello@eltera.ai" class="elt-upgrade-contact-btn">Написать нам</a>
        </div>
      </div>
    </div>`;
  }

  // Есть доступные тарифы — показываем сетку
  const cols = available.length === 1 ? 'elt-upgrade-grid-1' : available.length === 2 ? 'elt-upgrade-grid-2' : 'elt-upgrade-grid-3';
  const cards = available.map((t) => {
    const isTop = t.id === topId;
    return `<div class="elt-upgrade-card${isTop ? ' elt-upgrade-card-top' : ''}">
      ${isTop ? `<div class="elt-upgrade-rec-label">Рекомендуем</div>` : ''}
      <div class="elt-upgrade-tier">${t.tier}</div>
      <div class="elt-upgrade-name">${t.name}</div>
      <div class="elt-upgrade-price"><strong>${t.price}</strong> / месяц</div>
      <ul class="elt-upgrade-features">${t.features.map((f) => `<li>${f}</li>`).join('')}</ul>
      <button class="elt-upgrade-btn${isTop ? ' elt-upgrade-btn-teal' : ' elt-upgrade-btn-blue'}" data-open-sbp="${t.id}">Перейти на ${t.name}</button>
    </div>`;
  }).join('');

  return `<div class="modalBackdrop">
    <div class="modal elt-upgrade-modal">
      <div class="elt-upgrade-header">
        <div>
          <div class="elt-upgrade-eyebrow">Улучшить тариф</div>
          <div class="elt-upgrade-title">Выберите следующий шаг</div>
          <div class="elt-upgrade-subtitle">Доступны тарифы выше вашего текущего</div>
        </div>
        ${closeBtn}
      </div>
      <div class="elt-upgrade-current-badge">Текущий тариф: ${current}</div>
      <div class="elt-upgrade-grid ${cols}">${cards}</div>
    </div>
  </div>`;
}

function tariffDescription(name) {
  return ({ TalentCheck: "Индивидуальные оценки, PDF, базовый отчет, VPR/ePR.", TalentPro: "Сравнение, групповые оценки, конструктор, командная аналитика.", TalentStudio: "360, Assessment, полный AI, API, webhooks, брендирование." })[name];
}

function sourceTag(source) {
  if (/hh/i.test(source)) return "HeadHunter";
  if (/api/i.test(source)) return "API";
  if (/импорт/i.test(source)) return "Импорт";
  return "Ручная";
}

function professionIdByTitle(title) {
  if (/продаж/i.test(title)) return "sales_manager";
  if (/подбор|рекрутер/i.test(title)) return "recruiter";
  if (/оператор|call/i.test(title)) return "call_center";
  if (/координатор|офис/i.test(title)) return "coordinator";
  return "recruiter";
}

export function renderDevPortalLock() {
  return `
    <div class="devLockPage">
      <div class="devLockCard">
        <div class="devLockIcon">⚙️</div>
        <div class="devLockTitle">Dev Portal</div>
        <div class="devLockSub">Eltera Assessment Intelligence · Управление библиотекой тестов</div>
        <div class="devLockForm">
          <label class="devLockLabel">Пароль разработчика</label>
          <input id="devPasswordInput" type="password" class="devLockInput" placeholder="Введите пароль..." autocomplete="off">
          <div id="devPasswordError" class="devLockError" style="display:none">Неверный пароль</div>
          <button id="devPasswordSubmit" class="devLockBtn">Войти в Dev Portal</button>
        </div>
        <div class="devLockFooter">Эта страница не видна обычным пользователям</div>
      </div>
    </div>
  `;
}

export function renderDevPortal(library) {
  const { professions: profs, questions: qs, commonCompetencies: cc, professionalCompetencies: pc } = library;
  const profOptions = profs.map(p => `<option value="${p.id}">${p.title} (${p.category})</option>`).join("");
  const compOptions = Object.entries(pc).map(([id, title]) => `<option value="${id}">${title}</option>`).join("");

  return `
    <div class="devPortal">
      <div class="devPortalHeader">
        <div class="devPortalLogo">
          <img src="/assets/eltera_logo_horizontal_on_dark.svg?v=5" alt="Eltera" height="28">
          <span class="devPortalBadge">Dev Portal</span>
        </div>
        <div class="devPortalActions">
          <button class="devBtn devBtnSecondary" id="devExportBtn">⬇ Экспорт JSON</button>
          <button class="devBtn devBtnSecondary" id="devImportTrigger">⬆ Импорт JSON</button>
          <input type="file" id="devImportInput" accept=".json" style="display:none">
          <button class="devBtn devBtnDanger" id="devResetBtn">↺ Сброс к дефолту</button>
          <button class="devBtn devBtnSecondary" data-route="login">✕ Выйти</button>
        </div>
      </div>

      <div class="devPortalBody">

        <!-- Статистика -->
        <div class="devStats">
          <div class="devStat"><span class="devStatNum">${profs.length}</span><span class="devStatLabel">Профессий</span></div>
          <div class="devStat"><span class="devStatNum">${qs.length}</span><span class="devStatLabel">Вопросов</span></div>
          <div class="devStat"><span class="devStatNum">${Object.keys(pc).length}</span><span class="devStatLabel">Проф. компетенций</span></div>
          <div class="devStat"><span class="devStatNum">${cc.length}</span><span class="devStatLabel">Общих компетенций</span></div>
        </div>

        <div class="devPortalGrid">

          <!-- Левая колонка: профессии и вопросы -->
          <div class="devCol">

            <!-- Профессии -->
            <div class="devSection">
              <div class="devSectionHead">
                <h2>Профессии / Профили</h2>
                <button class="devBtn devBtnPrimary" id="devAddProfBtn">+ Добавить профессию</button>
              </div>
              <div class="devProfList">
                ${profs.map(p => `
                  <div class="devProfItem" data-prof-id="${p.id}">
                    <div class="devProfInfo">
                      <strong>${p.title}</strong>
                      <span class="devProfCat">${p.category}</span>
                      <span class="devProfComps">${p.competencies.length} компетенций</span>
                    </div>
                    <div class="devProfActions">
                      <button class="devBtnIcon devBtnEdit" data-edit-prof="${p.id}" title="Редактировать">✎</button>
                      <button class="devBtnIcon devBtnDel" data-del-prof="${p.id}" title="Удалить">✕</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Форма добавления профессии -->
            <div class="devSection devFormSection" id="devAddProfForm" style="display:none">
              <div class="devSectionHead"><h2>Новая профессия</h2></div>
              <div class="devFormGrid">
                <div class="devField"><label>ID (латиница, без пробелов)</label><input type="text" id="newProfId" placeholder="sales_manager" class="devInput"></div>
                <div class="devField"><label>Название</label><input type="text" id="newProfTitle" placeholder="Менеджер по продажам" class="devInput"></div>
                <div class="devField"><label>Категория</label><input type="text" id="newProfCategory" placeholder="Коммерция" class="devInput"></div>
                <div class="devField devFieldFull"><label>Описание (summary)</label><input type="text" id="newProfSummary" placeholder="Краткое описание роли" class="devInput"></div>
                <div class="devField devFieldFull"><label>Компетенции (через запятую, ID из списка)</label><input type="text" id="newProfComps" placeholder="needs_discovery, presentation, objections" class="devInput"></div>
              </div>
              <div class="devFormActions">
                <button class="devBtn devBtnPrimary" id="devSaveProfBtn">Сохранить профессию</button>
                <button class="devBtn devBtnSecondary" id="devCancelProfBtn">Отмена</button>
              </div>
            </div>

          </div>

          <!-- Правая колонка: вопросы -->
          <div class="devCol">

            <!-- Вопросы -->
            <div class="devSection">
              <div class="devSectionHead">
                <h2>Вопросы</h2>
                <div style="display:flex;gap:8px;align-items:center">
                  <select id="devFilterProf" class="devSelect">
                    <option value="">Все профессии</option>
                    ${profOptions}
                  </select>
                  <button class="devBtn devBtnPrimary" id="devAddQBtn">+ Добавить вопрос</button>
                </div>
              </div>
              <div class="devQList" id="devQList">
                ${qs.map((q, i) => `
                  <div class="devQItem" data-q-scope="${q.scope}">
                    <div class="devQMeta">
                      <span class="devQScope">${q.scope}</span>
                      <span class="devQComp">${pc[q.competencyId] || q.competencyId}</span>
                    </div>
                    <div class="devQText">${q.text}</div>
                    <div class="devQAnswers">
                      ${q.answers.map(a => `<span class="devQAnswer ${a.redFlag ? 'devQRedFlag' : ''}">${a.text} <b>[${a.score}]</b>${a.redFlag ? ' 🚩' : ''}</span>`).join("")}
                    </div>
                    <div class="devQActions">
                      <button class="devBtnIcon devBtnDel" data-del-q="${i}" title="Удалить">✕</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Форма добавления вопроса -->
            <div class="devSection devFormSection" id="devAddQForm" style="display:none">
              <div class="devSectionHead"><h2>Новый вопрос</h2></div>
              <div class="devFormGrid">
                <div class="devField">
                  <label>Профессия (scope)</label>
                  <select id="newQScope" class="devSelect devInput">${profOptions}</select>
                </div>
                <div class="devField">
                  <label>Компетенция</label>
                  <select id="newQComp" class="devSelect devInput">${compOptions}</select>
                </div>
                <div class="devField devFieldFull"><label>Текст вопроса</label><textarea id="newQText" class="devInput devTextarea" placeholder="Введите вопрос..."></textarea></div>
                <div class="devField devFieldFull">
                  <label>Ответы (каждый с новой строки, формат: <code>текст | балл | red_flag</code>)</label>
                  <textarea id="newQAnswers" class="devInput devTextarea" rows="4" placeholder="Правильный ответ | 5&#10;Средний ответ | 2&#10;Неверный ответ | 0 | red_flag"></textarea>
                </div>
              </div>
              <div class="devFormActions">
                <button class="devBtn devBtnPrimary" id="devSaveQBtn">Сохранить вопрос</button>
                <button class="devBtn devBtnSecondary" id="devCancelQBtn">Отмена</button>
              </div>
            </div>

          </div>
        </div>

        <!-- Компетенции -->
        <div class="devSection devCompSection">
          <div class="devSectionHead">
            <h2>Профессиональные компетенции</h2>
            <button class="devBtn devBtnPrimary" id="devAddCompBtn">+ Добавить компетенцию</button>
          </div>
          <div class="devCompGrid">
            ${Object.entries(pc).map(([id, title]) => `
              <div class="devCompItem">
                <span class="devCompId">${id}</span>
                <span class="devCompTitle">${title}</span>
                <button class="devBtnIcon devBtnDel" data-del-comp="${id}" title="Удалить">✕</button>
              </div>
            `).join("")}
          </div>
          <div class="devAddCompRow" id="devAddCompRow" style="display:none">
            <input type="text" id="newCompId" class="devInput" placeholder="comp_id (латиница)">
            <input type="text" id="newCompTitle" class="devInput" placeholder="Название компетенции">
            <button class="devBtn devBtnPrimary" id="devSaveCompBtn">Добавить</button>
            <button class="devBtn devBtnSecondary" id="devCancelCompBtn">Отмена</button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ─── Assessment Wizard ────────────────────────────────────────────────────────
function renderAssessmentWizard(state) {
  const w = state.modal;
  const step = w.step || 1;
  const scope = w.scope || null;       // "one" | "group" | "dept"
  const assessType = w.assessType || null; // "standard" | "360" | "review"
  const selected = w.selected || [];   // ids of selected employees
  const deptSelected = w.dept || null;
  const profId = w.profId || null;
  const deadline = w.deadline || "";
  const searchQ = w.searchQ || "";

  // Данные мастера — из API: сотрудники, отделы (срез по сотрудникам), тесты-профили.
  const employees = state.employeesApi || [];
  const deptCounts = {};
  employees.forEach((e) => {
    const d = e.department || "Без отдела";
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });
  const departments = Object.entries(deptCounts).map(([name, count]) => ({ name, employees: count }));
  // Мастер оценивает сотрудников — показываем только тесты для сотрудников.
  const professions = (state.testsApi || [])
    .filter((t) => t.target_type === "employee")
    .map((t) => ({ id: t.id, title: t.title, category: t.category || "тест" }));
  // Сопоставление типов оценки с готовыми тестами для сотрудников.
  const TYPE_TEST_TITLE = { "360": "Оценка 360°", review: "Performance Review", adaptation: "Адаптация сотрудника" };
  const isTalentStudio = state.company?.tariff === "TalentStudio";

  // ── Step indicator ──────────────────────────────────────────────────────────
  const stepLabels = ["Масштаб", "Тип оценки", "Настройка"];
  const stepsHtml = `
    <div class="aw-steps">
      ${stepLabels.map((label, i) => {
        const n = i + 1;
        const cls = n < step ? "aw-step done" : n === step ? "aw-step active" : "aw-step";
        const icon = n < step
          ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : `<span>${n}</span>`;
        return `<div class="${cls}">${icon}<span class="aw-step-label">${label}</span></div>`;
      }).join('<div class="aw-step-line"></div>')}
    </div>`;

  // ── Step 1: Объект оценки ───────────────────────────────────────────────────
  let bodyHtml = "";
  if (step === 1) {
    const opts = [
      { id: "one", icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, title: "Сотрудник", desc: "Индивидуальная оценка одного сотрудника. Подходит для Performance Review, 360, оценки компетенций и потенциала." },
      { id: "group", icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M1 17c0-2.761 2.686-5 6-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M19 17c0-2.761-2.686-5-6-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 12c0-2.761 2.686-5 6-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, title: "Группа сотрудников", desc: "Ручной выбор нескольких сотрудников для сравнения, ассессмента, 9-Box или массового запуска индивидуальных оценок." },
      { id: "dept", icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="11" width="4" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="8" y="7" width="4" height="11" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="4" height="15" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>`, title: "Отдел", desc: "Оценка всех сотрудников отдела из оргструктуры. Состав отдела определяется автоматически." }
    ];
    bodyHtml = `
      <div class="aw-scope-grid">
        ${opts.map(o => `
          <button class="aw-scope-card ${scope === o.id ? "selected" : ""}" data-aw-scope="${o.id}">
            <div class="aw-scope-icon">${o.icon}</div>
            <div class="aw-scope-text">
              <strong>${o.title}</strong>
              <span>${o.desc}</span>
            </div>
            <div class="aw-scope-check"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          </button>
        `).join("")}
      </div>
      <div class="aw-footer">
        <button class="elt-btn-ghost" data-action="close-modal">Отмена</button>
        <button class="blueButton" data-aw-next="2" ${!scope ? "disabled" : ""}>Далее →</button>
      </div>`;
  }

  // ── Step 2: Тип оценки (динамически по объекту) ──────────────────────────────
  if (step === 2) {
    // SVG иконки
    const svgCompetency = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 11h8M7 7.5h8M7 14.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    const svg360 = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="11" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    const svgReview = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 18V8l7-5 7 5v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="13" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M11 10v1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    const svgPotential = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l2 5h5l-4 3 1.5 5L11 13l-4.5 3L8 11 4 8h5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
    const svgNineBox = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8.8" y="3" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="14.5" y="3" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="3" y="8.8" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8.8" y="8.8" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="14.5" y="8.8" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="3" y="14.5" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8.8" y="14.5" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="14.5" y="14.5" width="4.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>`;
    const svgRisk = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L20 19H2L11 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11 9v4M11 15.5v.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    const svgGroup = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><circle cx="15" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 19c0-3.314 2.686-6 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M20 19c0-3.314-2.686-6-6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    const svgRating = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 17V13M8 17V9M12 17V11M16 17V7M20 17V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    const svgClimate = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="10" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M11 3v1M11 16v1M4 10H3M19 10h-1M6.2 5.2l-.7-.7M16.5 15.5l-.7-.7M6.2 14.8l-.7.7M16.5 4.5l-.7.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5 19c0-1.5 2.7-3 6-3s6 1.5 6 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    const svgEngage = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4C7.13 4 4 7.13 4 11s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z" stroke="currentColor" stroke-width="1.4"/><path d="M8 11.5c.5 1.5 5 1.5 6 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8.5" cy="9" r=".8" fill="currentColor"/><circle cx="13.5" cy="9" r=".8" fill="currentColor"/></svg>`;

    // Типы по объекту
    const typesByScope = {
      one: [
        { id: "review",    icon: svgReview,     title: "Performance Review",   desc: "Оценка результативности и потенциала. Формирует 9-box и кадровый резерв.",  soon: false },
        { id: "360",       icon: svg360,        title: "Оценка 360°",          desc: "Самооценка + руководитель + коллеги + подчинённые. Разные роли, разные веса.", soon: false },
        { id: "standard",  icon: svgCompetency, title: "Оценка компетенций",   desc: "Профиль компетенций, психологические и профессиональные блоки.",            soon: false },
        { id: "adaptation",icon: svgEngage,     title: "Адаптация",            desc: "Пульс-опрос адаптации: понятность задач, поддержка, ресурсы, ожидания.",     soon: false },
        { id: "potential", icon: svgPotential,  title: "Оценка потенциала",    desc: "Анализ потенциала роста и карьерных перспектив сотрудника.",                 soon: true  },
        { id: "ipr",       icon: svgCompetency, title: "ИПР / план развития",  desc: "Индивидуальный план развития на основе результатов оценки.",                 soon: true  },
        { id: "risk",      icon: svgRisk,       title: "Оценка рисков",        desc: "Выявление рисков удержания, выгорания и снижения эффективности.",            soon: true  },
      ],
      group: [
        { id: "review",    icon: svgReview,     title: "Групповой Performance Review", desc: "Оценка результативности группы. Отчёты по каждому + сравнение.",  soon: false },
        { id: "standard",  icon: svgCompetency, title: "Оценка компетенций группы",    desc: "Массовый запуск оценки компетенций для выбранных сотрудников.",   soon: false },
        { id: "adaptation",icon: svgEngage,     title: "Адаптация группы",             desc: "Пульс-опрос адаптации для выбранных новых сотрудников.",          soon: false },
        { id: "360",       icon: svg360,        title: "Массовый запуск 360°",         desc: "Индивидуальные 360 для каждого. Отчёты формируются отдельно.",     soon: false },
        { id: "ninebox",   icon: svgNineBox,    title: "9-Box группы",                 desc: "Расстановка группы по матрице Performance × Potential.",           soon: true  },
        { id: "assessment",icon: svgGroup,      title: "Ассессмент группы",            desc: "Структурированная оценка для кадрового резерва.",                  soon: true  },
        { id: "rating",    icon: svgRating,     title: "Сравнительный рейтинг",        desc: "Ранжирование сотрудников по компетенциям и результатам.",           soon: true  },
      ],
      dept: [
        { id: "review",    icon: svgReview,     title: "Performance Review отдела",       desc: "Оценка результативности всех сотрудников отдела.",                    soon: false },
        { id: "standard",  icon: svgCompetency, title: "Оценка эффективности отдела",     desc: "Массовый запуск оценки компетенций по всему отделу.",                 soon: false },
        { id: "adaptation",icon: svgEngage,     title: "Адаптация отдела",                desc: "Пульс-опрос адаптации по новым сотрудникам отдела.",                  soon: false },
        { id: "360",       icon: svg360,        title: "Массовый запуск 360° по отделу",  desc: "Индивидуальные 360 для каждого сотрудника отдела.",                   soon: false },
        { id: "climate",   icon: svgClimate,    title: "Оценка климата",                  desc: "Анонимный опрос удовлетворённости и психологического климата.",        soon: true  },
        { id: "engagement",icon: svgEngage,     title: "Оценка вовлечённости",            desc: "Измерение вовлечённости и мотивации сотрудников отдела.",              soon: true  },
        { id: "ninebox",   icon: svgNineBox,    title: "9-Box отдела",                    desc: "Матрица Performance × Potential для всего отдела.",                   soon: true  },
        { id: "risks",     icon: svgRisk,       title: "Риски отдела",                    desc: "Анализ рисков удержания, выгорания и текучести по отделу.",            soon: true  },
      ]
    };
    const types = typesByScope[scope] || typesByScope.one;
    bodyHtml = `
      <div class="aw-type-grid">
        ${types.map(t => `
          <button class="aw-type-card ${assessType === t.id ? "selected" : ""} ${t.soon ? "soon" : ""}" data-aw-type="${t.id}" ${t.soon ? "data-aw-type-soon" : ""}>
            <div class="aw-type-icon">${t.icon}</div>
            <div class="aw-type-text">
              <div class="aw-type-title-row">
                <strong>${t.title}</strong>
                ${t.soon ? `<span class="aw-badge-soon">Скоро</span>` : ""}
              </div>
              <span>${t.desc}</span>
            </div>
            <div class="aw-scope-check"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          </button>
        `).join("")}
      </div>
      <div class="aw-footer">
        <button class="elt-btn-ghost" data-aw-back="1">← Назад</button>
        <button class="blueButton" data-aw-next="3" ${!assessType ? "disabled" : ""}>Далее →</button>
      </div>`;
  }

    // ── Step 3: Настройка (зависит от типа) ──────────────────────────────────────────────────
  if (step === 3) {
    // Общий список сотрудников для выбора
    const filtered = employees.filter(e =>
      !searchQ || e.fullName.toLowerCase().includes(searchQ.toLowerCase()) ||
      e.position.toLowerCase().includes(searchQ.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQ.toLowerCase())
    );
    const empSelectHtml = (labelText, multiHint) => {
      if (scope === 'dept') {
        return `<div class="aw-dept-select">
          <span class="aw-field-label">Выберите отдел</span>
          <div class="aw-dept-grid">
            ${departments.map(d => `<button class="aw-dept-btn ${deptSelected===d.name?'selected':''}" data-aw-dept="${d.name}"><strong>${d.name}</strong><span>${d.employees} чел.</span></button>`).join('')}
          </div></div>`;
      }
      return `<div class="aw-emp-select">
        <div class="aw-emp-search-wrap">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.4"/><line x1="8.5" y1="8.5" x2="11.5" y2="11.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <input class="aw-emp-search" placeholder="${labelText}" data-aw-search value="${searchQ}">
        </div>
        <div class="aw-emp-list">
          ${filtered.length === 0 ? '<div class="aw-emp-empty">Сотрудники не найдены</div>' :
            filtered.map(e => {
              const isSel = selected.includes(e.id);
              const ini = e.fullName.split(' ').slice(0,2).map(x=>x[0]).join('');
              return `<button class="aw-emp-row ${isSel?'selected':''}" data-aw-emp="${e.id}">
                <div class="aw-emp-avatar">${ini}</div>
                <div class="aw-emp-info"><strong>${e.fullName}</strong><span>${e.position} · ${e.department}</span></div>
                <div class="aw-emp-check"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3.5 3.5 5.5-5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              </button>`;
            }).join('')
          }
        </div>
        ${selected.length > 0 ? `<div class="aw-selected-count">${multiHint}: <strong>${selected.length}</strong></div>` : ''}
      </div>`;
    };
    const deadlineHtml = `<div class="aw-deadline">
      <span class="aw-field-label">Срок прохождения</span>
      <div class="aw-deadline-opts">
        ${['3 дня','7 дней','14 дней','30 дней'].map(d=>`<button class="aw-deadline-btn ${deadline===d?'selected':''}" data-aw-deadline="${d}">${d}</button>`).join('')}
      </div></div>`;

    // ── 360: выбор оцениваемого + оценщиков по ролям ──
    if (assessType === '360') {
      const subject = w.subject || null;
      const raters = w.raters || {};
      const roleLabels = { manager: 'Рук.', peer: 'Коллега', report: 'Подч.' };
      const ini = (e) => e.fullName.split(' ').slice(0, 2).map((x) => x[0]).join('');
      const subjEmp = employees.find((e) => e.id === subject);
      const raterCount = Object.keys(raters).length;
      const canSend = !!subject && raterCount > 0 && !!deadline;

      const assessedHtml = `<div class="aw-emp-select">
        <span class="aw-field-label">Кого оцениваем</span>
        <div class="aw-emp-list">
          ${employees.length ? employees.map((e) => `<button class="aw-emp-row ${subject === e.id ? 'selected' : ''}" data-aw-subject="${e.id}">
            <div class="aw-emp-avatar">${ini(e)}</div>
            <div class="aw-emp-info"><strong>${e.fullName}</strong><span>${e.position} · ${e.department}</span></div>
            <div class="aw-emp-check"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3.5 3.5 5.5-5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          </button>`).join('') : '<div class="aw-emp-empty">Нет сотрудников</div>'}
        </div></div>`;

      const ratersHtml = `<div class="aw-emp-select">
        <span class="aw-field-label">Оценщики и роли ${raterCount ? `· выбрано ${raterCount}` : ''}</span>
        <span class="aw-pr-scale-desc">Выберите роль для каждого оценщика. Самооценка добавляется автоматически.</span>
        <div class="aw-emp-list">
          ${employees.filter((e) => e.id !== subject).map((e) => {
            const role = raters[e.id];
            return `<div class="aw-rater-row ${role ? 'selected' : ''}">
              <div class="aw-emp-avatar">${ini(e)}</div>
              <div class="aw-emp-info"><strong>${e.fullName}</strong><span>${e.position}</span></div>
              <div class="aw-rater-roles">
                ${['manager', 'peer', 'report'].map((r) => `<button class="aw-role-pill ${role === r ? 'on' : ''}" data-aw-rater-role="${e.id}|${r}">${roleLabels[r]}</button>`).join('')}
              </div>
            </div>`;
          }).join('')}
        </div></div>`;

      bodyHtml = `
        <div class="aw-step3-layout">
          <div class="aw-step3-left">${assessedHtml}</div>
          <div class="aw-step3-right">
            ${ratersHtml}
            ${deadlineHtml}
            ${canSend ? `<div class="aw-send-preview"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" stroke="currentColor" stroke-width="1.3"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>Будет отправлено <strong>${raterCount + 1}</strong> ссылок (самооценка + ${raterCount})</div>` : ''}
          </div>
        </div>
        <div class="aw-footer">
          <button class="elt-btn-ghost" data-aw-back="2">← Назад</button>
          <button class="blueButton" data-aw-send-360r ${!canSend ? 'disabled' : ''}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5L11.5 1.5l-5 10-1-4.5-4.5-0.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Запустить 360°${subjEmp ? ` · ${subjEmp.fullName}` : ''}
          </button>
        </div>`;
    } else {
    // ── Единый шаг настройки для всех типов оценки сотрудников ──
    // Тест берётся: для «Оценки компетенций» — выбранный профиль; для
    // Адаптации/Performance Review — соответствующий готовый тест.
    const isStandard = assessType === 'standard';
    const isAdapt = assessType === 'adaptation';
    const presetTitle = TYPE_TEST_TITLE[assessType] || null;
    const profListHtml = isStandard
      ? `<div class="aw-prof-select">
          <span class="aw-field-label">Профиль оценки (тест для сотрудника)</span>
          <div class="aw-prof-grid">
            ${professions.length
              ? professions.map(p => `<button class="aw-prof-btn ${profId===p.id?'selected':''}" data-aw-prof="${p.id}"><strong>${p.title}</strong><span>${p.category}</span></button>`).join('')
              : '<div class="aw-360-warn">Нет тестов для сотрудников. Создайте тест в Конструкторе.</div>'}
          </div></div>`
      : isAdapt
        ? `<div class="aw-prof-select">
            <span class="aw-field-label">Цикл адаптации</span>
            <div class="aw-fixed-test"><strong>Онбординг-пульс</strong><span>этапы 1 / 3 / 7 / 14 / 30 / 60 / 90 / 180 дней · первый опрос уходит сразу</span></div>
          </div>`
        : `<div class="aw-prof-select">
            <span class="aw-field-label">Тест</span>
            <div class="aw-fixed-test"><strong>${presetTitle || 'Тест'}</strong><span>готовый тест для сотрудников · 5 вопросов</span></div>
          </div>`;
    const canSend = (scope==='dept'?!!deptSelected:selected.length>0) && (!isStandard || !!profId) && (isAdapt || !!deadline);
    const sendCount = scope==='dept'?(departments.find(d=>d.name===deptSelected)?.employees||0):selected.length;
    const sendLabel = isAdapt ? 'Запустить адаптацию' : scope==='dept' ? 'Запустить по отделу' : scope==='group' ? 'Запустить массово' : 'Отправить оценку';
    bodyHtml = `
      <div class="aw-step3-layout">
        <div class="aw-step3-left">
          <span class="aw-field-label">${scope==='dept'?'Отдел':scope==='group'?'Сотрудники (мультивыбор)':'Сотрудник'}</span>
          ${empSelectHtml('Поиск по имени, должности, отделу...', 'Выбрано')}
        </div>
        <div class="aw-step3-right">
          ${profListHtml}
          ${isAdapt ? '' : deadlineHtml}
          ${canSend?`<div class="aw-send-preview"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" stroke="currentColor" stroke-width="1.3"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>${isAdapt ? `Будет запущена адаптация для <strong>${sendCount}</strong> сотрудник(ов)` : `Будет отправлено <strong>${sendCount}</strong> ссылок`}</div>`:''}
        </div>
      </div>
      <div class="aw-footer">
        <button class="elt-btn-ghost" data-aw-back="2">← Назад</button>
        <button class="blueButton" data-aw-send ${!canSend?'disabled':''}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5L11.5 1.5l-5 10-1-4.5-4.5-0.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${sendLabel}${sendCount>1?` (${sendCount})`:''}
        </button>
      </div>`;
    }
  }

  return `
    <div class="modalBackdrop">
      <div class="modal aw-modal">
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-head-icon">📋</span>
            <h2 class="modal-head-title">${scope === 'group' ? 'Групповая оценка' : scope === 'dept' ? 'Оценка отдела' : scope === 'one' ? 'Оценка сотрудника' : 'Создать оценку'}</h2>
          </div>
          <button class="modal-close-btn" data-action="close-modal">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        ${stepsHtml}
        <div class="modal-inner aw-body">
          ${bodyHtml}
        </div>
      </div>
    </div>`;
}
