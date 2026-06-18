/**
 * Eltera — Assessment Wizard Controller
 * Handles all interactions for the multi-step assessment creation wizard.
 * Depends on: state (ref), render (fn), saveState (fn)
 */
import { createLink, startAdaptation } from "../data/api.js";

export function initWizardController({ getState, setState, render, saveState }) {

  function showToast(text, type = "success") {
    const t = document.createElement("div");
    t.className = `elt-toast elt-toast-${type}`;
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // 360: оцениваемый получает самооценку, оценщики — тест по своей роли,
  // на каждой ссылке проставляется subject (кого оценивают) и роль.
  async function handleSend360Roles(w, state) {
    const employees = state.employeesApi || [];
    const subject = employees.find(e => e.id === w.subject);
    const raters = w.raters || {};
    if (!subject || !Object.keys(raters).length) {
      showToast("Выберите оцениваемого и хотя бы одного оценщика", "info");
      return;
    }
    const TITLE_BY_ROLE = {
      self: "Оценка 360° · Самооценка",
      manager: "Оценка 360° · Руководитель",
      peer: "Оценка 360° · Коллеги",
      report: "Оценка 360° · Подчинённые",
    };
    const byTitle = {};
    (state.testsApi || []).forEach(t => { byTitle[t.title] = t; });

    const jobs = [{ person: subject, role: "self" }];
    Object.entries(raters).forEach(([id, role]) => {
      const e = employees.find(x => x.id === id);
      if (e) jobs.push({ person: e, role });
    });

    const now = new Date();
    const localLinks = [];
    await Promise.all(jobs.map(async (j, i) => {
      const test = byTitle[TITLE_BY_ROLE[j.role]];
      if (!test) return;
      const local = {
        id: `link-${Date.now()}-${i}`,
        token: Math.random().toString(36).slice(2, 10),
        professionId: test.key || "360",
        professionTitle: test.title,
        recipientType: "Сотрудник",
        assessmentType: "Сотрудник",
        fullName: j.person.fullName,
        email: j.person.email || "",
        status: "pending",
        history: [["создана", now.toISOString()]],
        createdAt: now.toISOString(),
        apiPersonId: j.person.id,
      };
      try {
        const resp = await createLink({
          test_id: test.id, person_id: j.person.id, recipient_type: "employee",
          subject_person_id: subject.id, rater_role: j.role,
        });
        local.apiToken = resp.token;
        local.apiTestId = resp.test_id;
      } catch (error) {
        console.warn("Не удалось создать 360-ссылку:", error);
      }
      localLinks.push(local);
    }));

    setState(s => ({ ...s, links: [...localLinks, ...(s.links || [])], linksStatus: "idle", modal: null }));
    saveState();
    if (location.hash === "#/app/links") render();
    else location.hash = "#/app/links";
    showToast(`360° запущена для ${subject.fullName}: самооценка + ${Object.keys(raters).length} оценщик(ов).`);
  }

  // Адаптация: «Создать оценку → Адаптация» запускает полноценный цикл
  // (этапы 1/3/7/…/180 дней), первый опрос уходит сразу.
  async function handleStartAdaptation(w, state) {
    const employees = state.employeesApi || [];
    const targets = w.scope === "dept"
      ? employees.filter(e => e.department === w.dept)
      : employees.filter(e => w.selected.includes(e.id));
    if (!targets.length) {
      showToast("Выберите сотрудников", "info");
      return;
    }
    try {
      await startAdaptation(targets.map(t => t.id));
    } catch (error) {
      console.warn("Не удалось запустить адаптацию:", error);
      showToast("Не удалось запустить адаптацию", "info");
      return;
    }
    setState(s => ({ ...s, modal: null, adaptationStatus: "idle" }));
    saveState();
    if (location.hash === "#/app/adaptation") render();
    else location.hash = "#/app/adaptation";
    showToast(`Адаптация запущена для ${targets.length} сотрудник(ов). Первый опрос отправлен.`);
  }

  async function handleSendStandard(w, state) {
    const employees = state.employeesApi || [];
    const targets = w.scope === "dept"
      ? employees.filter(e => e.department === w.dept)
      : employees.filter(e => w.selected.includes(e.id));
    // Для Адаптации/360/Performance Review тест фиксирован, для «Оценки
    // компетенций» — берётся выбранный профиль.
    const TYPE_TEST_TITLE = { "360": "Оценка 360°", review: "Performance Review", adaptation: "Адаптация сотрудника" };
    let test = null;
    if (w.assessType && TYPE_TEST_TITLE[w.assessType]) {
      test = (state.testsApi || []).find(t => t.title === TYPE_TEST_TITLE[w.assessType] && t.target_type === "employee");
    } else if (w.profId) {
      test = (state.testsApi || []).find(t => t.id === w.profId);
    }
    if (!targets.length || !test) {
      showToast("Выберите сотрудников и тест оценки", "info");
      return;
    }
    const professionId = test.key || "recruiter";
    const now = new Date();
    // Локальные ссылки — чтобы сотрудник прошёл тест; apiPersonId связывает с бэком.
    const localLinks = targets.map((emp, i) => ({
      id: `link-${Date.now()}-${i}`,
      token: Math.random().toString(36).slice(2, 10),
      professionId,
      professionTitle: (test && test.title) || "Оценка",
      recipientType: "Сотрудник",
      assessmentType: "Сотрудник",
      fullName: emp.full_name,
      email: emp.email || "",
      status: "pending",
      history: [["создана", now.toISOString()]],
      createdAt: now.toISOString(),
      apiPersonId: emp.id
    }));
    // Регистрируем оценку (ссылку-приглашение) в бэкенде и связываем токен с
    // локальной ссылкой — чтобы прохождение шло по вопросам именно этого теста.
    await Promise.all(targets.map(async (emp, i) => {
      try {
        const resp = await createLink({
          test_id: test.id, person_id: emp.id, recipient_type: "employee"
        });
        localLinks[i].apiToken = resp.token;
        localLinks[i].apiTestId = resp.test_id;
      } catch (error) {
        console.warn("Не удалось создать ссылку в бэкенде:", error);
      }
    }));
    setState(s => ({ ...s, links: [...localLinks, ...(s.links || [])], linksStatus: "idle", modal: null }));
    saveState();
    // Переходим в «Оценки», где можно открыть ссылку и пройти тест.
    if (location.hash === "#/app/links") render();
    else location.hash = "#/app/links";
    showToast(`Оценка создана для ${targets.length} сотрудник(ов). Ссылки — в разделе «Оценки».`);
  }

  // ── Click handler ──────────────────────────────────────────────────────────
  document.addEventListener("click", (event) => {
    const state = getState();

    // Step navigation: next
    const awNext = event.target.closest("[data-aw-next]")?.dataset.awNext;
    if (awNext) {
      setState(s => ({ ...s, modal: { ...s.modal, step: parseInt(awNext) } }));
      render();
      return;
    }

    // Step navigation: back
    const awBack = event.target.closest("[data-aw-back]")?.dataset.awBack;
    if (awBack) {
      setState(s => ({ ...s, modal: { ...s.modal, step: parseInt(awBack) } }));
      render();
      return;
    }

    // Select scope (one / group / dept) — сброс assessType при смене объекта
    const awScope = event.target.closest("[data-aw-scope]")?.dataset.awScope;
    if (awScope) {
      setState(s => ({ ...s, modal: { ...s.modal, scope: awScope, selected: [], dept: null, assessType: null } }));
      render();
      return;
    }

    // Coming-soon type — показываем toast, не переходим
    if (event.target.closest("[data-aw-type-soon]")) {
      showToast("Этот тип оценки появится в следующем обновлении", "info");
      return;
    }

    // Select assessment type
    const awTypeEl = event.target.closest("[data-aw-type]");
    if (awTypeEl && !awTypeEl.hasAttribute("data-aw-locked") && !awTypeEl.hasAttribute("data-aw-type-soon")) {
      setState(s => ({ ...s, modal: { ...s.modal, assessType: awTypeEl.dataset.awType } }));
      render();
      return;
    }

    // Select employee (toggle)
    const awEmp = event.target.closest("[data-aw-emp]")?.dataset.awEmp;
    if (awEmp) {
      setState(s => {
        const sel = s.modal.selected || [];
        const isOne = s.modal.scope === "one";
        const idx = sel.indexOf(awEmp);
        const newSel = isOne
          ? (idx >= 0 ? [] : [awEmp])
          : (idx >= 0 ? sel.filter(id => id !== awEmp) : [...sel, awEmp]);
        return { ...s, modal: { ...s.modal, selected: newSel } };
      });
      render();
      return;
    }

    // Select department
    const awDept = event.target.closest("[data-aw-dept]")?.dataset.awDept;
    if (awDept) {
      setState(s => ({ ...s, modal: { ...s.modal, dept: awDept } }));
      render();
      return;
    }

    // Select profile
    const awProf = event.target.closest("[data-aw-prof]")?.dataset.awProf;
    if (awProf) {
      setState(s => ({ ...s, modal: { ...s.modal, profId: awProf } }));
      render();
      return;
    }

    // Select deadline
    const awDeadline = event.target.closest("[data-aw-deadline]")?.dataset.awDeadline;
    if (awDeadline) {
      setState(s => ({ ...s, modal: { ...s.modal, deadline: awDeadline } }));
      render();
      return;
    }

    // 360: выбрать оцениваемого (single)
    const awSubject = event.target.closest("[data-aw-subject]")?.dataset.awSubject;
    if (awSubject) {
      setState(s => {
        const raters = { ...(s.modal.raters || {}) };
        delete raters[awSubject]; // оцениваемый не может быть оценщиком
        return { ...s, modal: { ...s.modal, subject: awSubject, raters } };
      });
      render();
      return;
    }

    // 360: назначить/снять роль оценщику ("personId|role")
    const awRaterRole = event.target.closest("[data-aw-rater-role]")?.dataset.awRaterRole;
    if (awRaterRole) {
      const [pid, role] = awRaterRole.split("|");
      setState(s => {
        const raters = { ...(s.modal.raters || {}) };
        if (raters[pid] === role) delete raters[pid]; // повторный клик — снять
        else raters[pid] = role;
        return { ...s, modal: { ...s.modal, raters } };
      });
      render();
      return;
    }

    // 360: запустить (самооценка + оценщики по ролям)
    if (event.target.closest("[data-aw-send-360r]")) {
      handleSend360Roles(getState().modal, getState());
      return;
    }

    // Send assessment (единый отправитель для всех типов оценки сотрудников)
    if (event.target.closest("[data-aw-send]")) {
      const w = getState().modal;
      if (w.assessType === "adaptation") handleStartAdaptation(w, getState());
      else handleSendStandard(w, getState());
      return;
    }
  });

  // ── Input handler (search in wizard) ──────────────────────────────────────
  document.addEventListener("input", (event) => {
    const awSearch = event.target.closest(".aw-emp-search");
    if (awSearch && getState().modal?.type === "assess-wizard") {
      setState(s => ({ ...s, modal: { ...s.modal, searchQ: awSearch.value } }));
      render();
    }
  });
}
