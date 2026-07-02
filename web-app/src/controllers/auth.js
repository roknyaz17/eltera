/**
 * Eltera — Auth & Dev Portal Controller
 * Handles login, registration, dev portal authentication and library management.
 * Depends on: getState, setState, render, saveState, setHash
 */
import {
  authForgotPassword,
  authLogin,
  authRegister,
  authResendLogin,
  authResendRegister,
  authResetPassword,
  authVerifyLogin,
  authVerifyRegister,
  authVerifyReset,
  registerCheckout,
  registerCheckoutSimulate,
  registerCheckoutStatus,
  setTokens,
} from "../data/api.js";

// Обновляет объект сброса пароля в состоянии (без записи в localStorage —
// флоу transient, токены не должны переживать перезагрузку).
function patchReset(setState, render, patch) {
  setState((s) => ({
    ...s,
    passwordReset: s.passwordReset ? { ...s.passwordReset, ...patch } : s.passwordReset,
  }));
  render();
}

// Показывает текст ошибки под формой входа/регистрации.
function authError(form, message) {
  let box = form.querySelector(".authError");
  if (!box) {
    box = document.createElement("div");
    box.className = "authError";
    form.appendChild(box);
  }
  box.textContent = message;
}

const DEV_PASSWORD = "eltera-dev-2026";
const DEV_LIB_KEY = "eltera-dev-library-v1";

function toAuthChallenge(resp) {
  return {
    mode: resp.purpose === "registration" ? "register" : "login",
    email: resp.email,
    challengeToken: resp.challenge_token,
    purpose: resp.purpose,
    expiresIn: resp.expires_in,
    status: "idle",
    error: null,
  };
}

function setAuthChallenge(setState, render, saveState, resp) {
  setState((s) => ({ ...s, authChallenge: toAuthChallenge(resp) }));
  saveState();
  render();
}

// Завершает регистрацию после подтверждённой оплаты: кладёт токены и ведёт в кабинет.
function finishRegistration({ setState, saveState, setHash }, tokens) {
  setTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
  try { localStorage.removeItem("eltera_ref"); } catch { /* ignore */ }
  setState((s) => ({
    ...s,
    authenticated: true,
    user: tokens.user,
    authChallenge: null,
    refCode: null,
  }));
  saveState();
  setHash("#/app/dashboard");
}

// Поллинг статуса оплаты тарифа. Останавливается, когда оплата подтверждена и
// получены токены, либо когда пользователь ушёл с шага оплаты.
function pollRegistrationStatus(ctx, paymentId) {
  const { getState, setState, render } = ctx;
  let attempts = 0;
  const tick = () => {
    const ch = getState().authChallenge;
    // Пользователь закрыл экран или платёж сменился — прекращаем поллинг.
    if (!ch || ch.step !== "paying" || !ch.payment || ch.payment.paymentId !== paymentId) return;
    attempts += 1;
    registerCheckoutStatus(paymentId)
      .then((resp) => {
        if (resp && resp.paid && resp.tokens) {
          finishRegistration(ctx, resp.tokens);
          return;
        }
        // 5 минут поллинга максимум (150 × 2с).
        if (attempts < 150) setTimeout(tick, 2000);
        else {
          setState((s) => ({
            ...s,
            authChallenge: s.authChallenge
              ? { ...s.authChallenge, status: "idle", error: "Оплата не подтверждена. Попробуйте ещё раз." }
              : s.authChallenge,
          }));
          render();
        }
      })
      .catch(() => { if (attempts < 150) setTimeout(tick, 3000); });
  };
  setTimeout(tick, 1500);
}

export function getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies) {
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

export function saveDevLibrary(lib) {
  localStorage.setItem(DEV_LIB_KEY, JSON.stringify(lib));
}

export function initAuthController({ getState, setState, render, saveState, setHash, devLibraryDeps }) {
  const { professions, questions, commonCompetencies, professionalCompetencies } = devLibraryDeps;

  // Возобновление поллинга оплаты после возврата с формы Монеты (перезагрузка
  // страницы на #/register). Состояние authChallenge переживает редирект в
  // localStorage — подхватываем платёж и продолжаем ждать подтверждение.
  const ctx = { getState, setState, render, saveState, setHash };
  const resumeRegistrationPayment = () => {
    const ch = getState().authChallenge;
    if (ch && ch.mode === "register" && ch.step === "paying" && ch.payment && ch.payment.paymentId) {
      pollRegistrationStatus(ctx, ch.payment.paymentId);
    }
  };
  window.addEventListener("eltera-resume-registration", resumeRegistrationPayment);

  // ── Submit handlers ────────────────────────────────────────────────────────
  document.addEventListener("submit", (event) => {
    // Login
    if (event.target.matches("[data-login-form]")) {
      event.preventDefault();
      const form = event.target;
      const fd = new FormData(form);
      const email = String(fd.get("email") || "").trim();
      const password = String(fd.get("password") || "");
      const btn = form.querySelector('button[type="submit"], button:not([type])');
      if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = "Вход…"; }
      authLogin(email, password)
        .then((resp) => {
          setAuthChallenge(setState, render, saveState, resp);
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Войти"; }
        })
        .catch((e) => {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Войти"; }
          authError(form, e.message || "Не удалось войти");
        });
      return;
    }

    // Register (создаёт новую компанию + админа)
    if (event.target.matches("[data-register-form]")) {
      event.preventDefault();
      const form = event.target;
      const fd = new FormData(form);
      const firstName = String(fd.get("firstName") || "").trim();
      const lastName = String(fd.get("lastName") || "").trim();
      const company = String(fd.get("company") || "").trim();
      const contact = String(fd.get("contact") || "").trim();
      const inn = String(fd.get("inn") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const position = String(fd.get("position") || "").trim();
      const companySize = String(fd.get("companySize") || "").trim();
      const password = String(fd.get("password") || "");
      const fullName = `${lastName} ${firstName}`.trim() || firstName || lastName;
      if (!contact || !password || !company || !fullName) {
        authError(form, "Заполните имя, компанию, email и пароль");
        return;
      }
      const btn = form.querySelector('button[type="submit"], button:not([type])');
      if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = "Создаём…"; }
      authRegister({
        email: contact, password, full_name: fullName, company,
        ref_code: getState().refCode || null,
        inn: inn || null, phone: phone || null,
        position: position || null, company_size: companySize || null,
      })
        .then((resp) => {
          setState((s) => ({
            ...s,
            authChallenge: toAuthChallenge(resp),
            company: {
              ...s.company, name: company, contactName: fullName, contactEmail: contact,
              contactPosition: position, contactPhone: phone, inn, size: companySize,
            },
          }));
          saveState();
          render();
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Создать аккаунт"; }
        })
        .catch((e) => {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Создать аккаунт"; }
          authError(form, e.message || "Не удалось зарегистрироваться");
        });
      return;
    }

    if (event.target.matches("[data-auth-challenge-form]")) {
      event.preventDefault();
      const form = event.target;
      const challenge = getState().authChallenge;
      if (!challenge) {
        authError(form, "Код подтверждения не найден. Запросите его ещё раз.");
        return;
      }
      const fd = new FormData(form);
      const code = String(fd.get("code") || "").trim();
      if (!code) {
        authError(form, "Введите код из письма.");
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = "Проверяем…"; }
      setState((s) => ({
        ...s,
        authChallenge: s.authChallenge ? { ...s.authChallenge, status: "verifying", error: null } : s.authChallenge,
      }));
      render();
      if (challenge.mode === "register") {
        // Шаг 2 → 3: код подтверждён, аккаунт ещё не создан. Получаем registration-токен
        // и каталог тарифов, переходим к выбору тарифа и оплате.
        authVerifyRegister({ email: challenge.email, challenge_token: challenge.challengeToken, code })
          .then((resp) => {
            setState((s) => ({
              ...s,
              authChallenge: {
                ...s.authChallenge,
                step: "tariff",
                status: "idle",
                error: null,
                registrationToken: resp.registration_token,
                tariffs: resp.tariffs || [],
                selectedTariff: (resp.tariffs && resp.tariffs[0] && resp.tariffs[0].key) || null,
                payment: null,
              },
            }));
            saveState();
            render();
          })
          .catch((e) => {
            setState((s) => ({
              ...s,
              authChallenge: s.authChallenge ? { ...s.authChallenge, status: "idle" } : s.authChallenge,
            }));
            if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Подтвердить"; }
            authError(form, e.message || "Не удалось подтвердить код");
          });
        return;
      }
      authVerifyLogin({ email: challenge.email, challenge_token: challenge.challengeToken, code })
        .then((resp) => {
          setTokens({ access_token: resp.access_token, refresh_token: resp.refresh_token });
          // Реферальный код использован при регистрации — больше не нужен.
          try { localStorage.removeItem("eltera_ref"); } catch { /* ignore */ }
          setState((s) => ({
            ...s,
            authenticated: true,
            user: resp.user,
            authChallenge: null,
            refCode: null,
          }));
          saveState();
          setHash("#/app/dashboard");
        })
        .catch((e) => {
          setState((s) => ({
            ...s,
            authChallenge: s.authChallenge ? { ...s.authChallenge, status: "idle" } : s.authChallenge,
          }));
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Подтвердить"; }
          authError(form, e.message || "Не удалось подтвердить код");
        });
      return;
    }

    // Сброс пароля, шаг 1 — запрос кода по email
    if (event.target.matches("[data-reset-request-form]")) {
      event.preventDefault();
      const form = event.target;
      const email = String(new FormData(form).get("email") || "").trim();
      if (!email) { authError(form, "Введите email."); return; }
      patchReset(setState, render, { email, status: "sending", error: null });
      authForgotPassword(email)
        .then((resp) => {
          patchReset(setState, render, {
            step: "code",
            email: resp.email || email,
            challengeToken: resp.challenge_token,
            status: "idle",
            error: null,
          });
        })
        .catch((e) => {
          patchReset(setState, render, { status: "idle" });
          authError(form, e.message || "Не удалось отправить код");
        });
      return;
    }

    // Сброс пароля, шаг 2 — подтверждение кода → reset-токен
    if (event.target.matches("[data-reset-code-form]")) {
      event.preventDefault();
      const form = event.target;
      const pr = getState().passwordReset;
      if (!pr) return;
      const code = String(new FormData(form).get("code") || "").trim();
      if (!code) { authError(form, "Введите код из письма."); return; }
      patchReset(setState, render, { status: "verifying", error: null });
      authVerifyReset({ email: pr.email, challenge_token: pr.challengeToken, code })
        .then((resp) => {
          patchReset(setState, render, {
            step: "newpass",
            resetToken: resp.reset_token,
            status: "idle",
            error: null,
          });
        })
        .catch((e) => {
          patchReset(setState, render, { status: "idle" });
          authError(form, e.message || "Неверный код подтверждения");
        });
      return;
    }

    // Сброс пароля, шаг 3 — установка нового пароля + автологин
    if (event.target.matches("[data-reset-newpass-form]")) {
      event.preventDefault();
      const form = event.target;
      const pr = getState().passwordReset;
      if (!pr) return;
      const fd = new FormData(form);
      const password = String(fd.get("password") || "");
      const passwordConfirm = String(fd.get("password_confirm") || "");
      if (password.length < 6) { authError(form, "Пароль должен быть не короче 6 символов."); return; }
      if (password !== passwordConfirm) { authError(form, "Пароли не совпадают."); return; }
      patchReset(setState, render, { status: "saving", error: null });
      authResetPassword({
        email: pr.email,
        reset_token: pr.resetToken,
        password,
        password_confirm: passwordConfirm,
      })
        .then((resp) => {
          setTokens({ access_token: resp.access_token, refresh_token: resp.refresh_token });
          setState((s) => ({
            ...s,
            authenticated: true,
            user: resp.user,
            passwordReset: null,
            authChallenge: null,
          }));
          saveState();
          setHash("#/app/dashboard");
        })
        .catch((e) => {
          patchReset(setState, render, { status: "idle" });
          authError(form, e.message || "Не удалось сменить пароль");
        });
      return;
    }
  });

  // ── Click handlers ─────────────────────────────────────────────────────────
  document.addEventListener("click", (event) => {
    // Auth pill switching
    const authTab = event.target.closest("[data-auth-tab]")?.dataset.authTab;
    if (authTab) {
      document.querySelectorAll(".authPillBtn").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".authFormWrap").forEach(p => p.classList.remove("open"));
      event.target.closest("[data-auth-tab]").classList.add("active");
      document.querySelector(`[data-auth-panel="${authTab}"]`)?.classList.add("open");
      return;
    }

    // Switch tab via link
    const switchTab = event.target.closest("[data-switch-tab]")?.dataset.switchTab;
    if (switchTab) {
      event.preventDefault();
      document.querySelectorAll(".authPillBtn").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".authFormWrap").forEach(p => p.classList.remove("open"));
      document.querySelector(`[data-auth-tab="${switchTab}"]`)?.classList.add("active");
      document.querySelector(`[data-auth-panel="${switchTab}"]`)?.classList.add("open");
      return;
    }

    if (event.target.closest("[data-auth-challenge-close]")) {
      event.preventDefault();
      setState((s) => ({ ...s, authChallenge: null }));
      saveState();
      render();
      return;
    }

    if (event.target.closest("[data-auth-challenge-resend]")) {
      event.preventDefault();
      const challenge = getState().authChallenge;
      if (!challenge) return;
      const form = event.target.closest("form");
      const btn = event.target.closest("button");
      if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = "Отправляем…"; }
      const resend = challenge.mode === "register" ? authResendRegister : authResendLogin;
      setState((s) => ({
        ...s,
        authChallenge: s.authChallenge ? { ...s.authChallenge, status: "resending", error: null } : s.authChallenge,
      }));
      render();
      resend({ email: challenge.email, challenge_token: challenge.challengeToken })
        .then((resp) => {
          setState((s) => ({ ...s, authChallenge: { ...toAuthChallenge(resp), status: "idle", error: null } }));
          saveState();
          render();
        })
        .catch((e) => {
          setState((s) => ({
            ...s,
            authChallenge: s.authChallenge ? { ...s.authChallenge, status: "idle" } : s.authChallenge,
          }));
          if (form) authError(form, e.message || "Не удалось отправить код повторно");
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Отправить код ещё раз"; }
        });
      return;
    }

    // Выбор тарифа на 3-м шаге регистрации
    const pickTariff = event.target.closest("[data-pick-tariff]")?.dataset.pickTariff;
    if (pickTariff) {
      event.preventDefault();
      setState((s) => ({
        ...s,
        authChallenge: s.authChallenge ? { ...s.authChallenge, selectedTariff: pickTariff } : s.authChallenge,
      }));
      render();
      return;
    }

    // Оплатить выбранный тариф → создать платёж, увести на Монету или simulate
    if (event.target.closest("[data-register-pay]")) {
      event.preventDefault();
      const challenge = getState().authChallenge;
      if (!challenge || !challenge.registrationToken || !challenge.selectedTariff) return;
      const btn = event.target.closest("button");
      if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = "Создаём платёж…"; }
      setState((s) => ({
        ...s,
        authChallenge: s.authChallenge ? { ...s.authChallenge, status: "paying", error: null } : s.authChallenge,
      }));
      render();
      registerCheckout({
        email: challenge.email,
        registration_token: challenge.registrationToken,
        tariff: challenge.selectedTariff,
      })
        .then((resp) => {
          setState((s) => ({
            ...s,
            authChallenge: s.authChallenge
              ? { ...s.authChallenge, step: "paying", status: "idle", error: null,
                  payment: { paymentId: resp.payment_id, amount: resp.amount, tariff: resp.tariff,
                             configured: resp.configured, testMode: resp.test_mode } }
              : s.authChallenge,
          }));
          saveState();
          render();
          const ctx = { getState, setState, render, saveState, setHash };
          if (resp.redirect_url) {
            // Реальная Монета: уводим на платёжную форму, при возврате — поллинг.
            pollRegistrationStatus(ctx, resp.payment_id);
            window.location.href = resp.redirect_url;
          } else {
            // Demo-режим: подтверждаем оплату через simulate, затем забираем токены.
            registerCheckoutSimulate(resp.payment_id)
              .then((st) => {
                if (st && st.paid && st.tokens) finishRegistration(ctx, st.tokens);
                else pollRegistrationStatus(ctx, resp.payment_id);
              })
              .catch(() => pollRegistrationStatus(ctx, resp.payment_id));
          }
        })
        .catch((e) => {
          setState((s) => ({
            ...s,
            authChallenge: s.authChallenge ? { ...s.authChallenge, status: "idle" } : s.authChallenge,
          }));
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || "Оплатить"; }
          const form = event.target.closest(".authChallengeModal") || event.target.closest("form");
          if (form) authError(form, e.message || "Не удалось создать платёж");
        });
      return;
    }

    // Forgot password — открыть флоу сброса
    if (event.target.closest("[data-forgot-password]")) {
      event.preventDefault();
      const prefill = String(
        document.querySelector('[data-login-form] input[name="email"]')?.value || ""
      ).trim();
      setState((s) => ({
        ...s,
        passwordReset: { step: "request", email: prefill, status: "idle", error: null },
      }));
      render();
      return;
    }

    // Закрыть модалку сброса пароля
    if (event.target.closest("[data-reset-close]")) {
      event.preventDefault();
      setState((s) => ({ ...s, passwordReset: null }));
      render();
      return;
    }

    // Повторно отправить код сброса (создаёт новый challenge)
    if (event.target.closest("[data-reset-resend]")) {
      event.preventDefault();
      const pr = getState().passwordReset;
      if (!pr || !pr.email) return;
      const form = event.target.closest("form");
      patchReset(setState, render, { status: "resending", error: null });
      authForgotPassword(pr.email)
        .then((resp) => {
          patchReset(setState, render, {
            challengeToken: resp.challenge_token,
            status: "idle",
            error: null,
          });
        })
        .catch((e) => {
          patchReset(setState, render, { status: "idle" });
          if (form) authError(form, e.message || "Не удалось отправить код повторно");
        });
      return;
    }

    // ── Dev Portal ─────────────────────────────────────────────────────────
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
      const lib = getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies);
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
      const lib = getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies);
      const competencies = compsRaw ? compsRaw.split(",").map(s => ({ id: s.trim(), weight: 1 })) : [];
      lib.professions.push({ id, title, category: category || "Другое", summary: summary || "", competencies });
      saveDevLibrary(lib);
      render();
      return;
    }

    const delProf = event.target.closest("[data-del-prof]")?.dataset.delProf;
    if (delProf) {
      if (confirm(`Удалить профессию "${delProf}"?`)) {
        const lib = getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies);
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
      const lib = getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies);
      lib.questions.push({ id: `${scope}-${competencyId}-${Date.now()}`, scope, competencyId, text, answers });
      saveDevLibrary(lib);
      render();
      return;
    }

    const delQ = event.target.closest("[data-del-q]")?.dataset.delQ;
    if (delQ !== undefined && event.target.closest("[data-del-q]")) {
      const lib = getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies);
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
      const lib = getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies);
      lib.professionalCompetencies[id] = title;
      saveDevLibrary(lib);
      render();
      return;
    }

    const delComp = event.target.closest("[data-del-comp]")?.dataset.delComp;
    if (delComp) {
      if (confirm(`Удалить компетенцию "${delComp}"?`)) {
        const lib = getDevLibrary(professions, questions, commonCompetencies, professionalCompetencies);
        delete lib.professionalCompetencies[delComp];
        saveDevLibrary(lib);
        render();
      }
      return;
    }
  });

  // ── Change handlers ────────────────────────────────────────────────────────
  document.addEventListener("change", (event) => {
    if (event.target.matches("#devImportInput")) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const lib = JSON.parse(e.target.result);
          if (!lib.professions || !lib.questions) {
            alert("Неверный формат файла. Нужны поля professions и questions.");
            return;
          }
          saveDevLibrary(lib);
          render();
        } catch { alert("Ошибка чтения файла JSON"); }
      };
      reader.readAsText(file);
    }
  });

  // ── Keydown handlers ───────────────────────────────────────────────────────
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("#devPasswordInput")) {
      document.querySelector("#devPasswordSubmit")?.click();
    }
  });
}
