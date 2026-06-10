/**
 * Eltera — Assessment Wizard Controller
 * Handles all interactions for the multi-step assessment creation wizard.
 * Depends on: state (ref), render (fn), saveState (fn)
 */
import { createLink } from "../data/api.js";

export function initWizardController({ getState, setState, render, saveState }) {

  function showToast(text, type = "success") {
    const t = document.createElement("div");
    t.className = `elt-toast elt-toast-${type}`;
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function handleSend360(w, state) {
    const emps = state.employeesApi || [];
    const targets = emps.filter(e => w.selected.includes(e.id));
    const r360 = w.roles360 || { self: true, manager: false, peers: 0, reports: 0 };
    const roleNames = [];
    if (r360.self) roleNames.push("Самооценка");
    if (r360.manager) roleNames.push("Руководитель");
    for (let i = 0; i < r360.peers; i++) roleNames.push(`Коллега ${i + 1}`);
    for (let i = 0; i < r360.reports; i++) roleNames.push(`Подчинённый ${i + 1}`);
    const now = new Date();
    const newLinks = [];
    targets.forEach(emp =>
      roleNames.forEach(role =>
        newLinks.push({
          token: Math.random().toString(36).slice(2, 10),
          fullName: emp.fullName,
          email: emp.email || "",
          professionTitle: `360° — ${role}`,
          recipientType: "employee",
          assessType: "360",
          role360: role,
          status: "sent",
          createdAt: now.toISOString(),
          deadline: w.deadline,
          employeeId: emp.id
        })
      )
    );
    setState(s => ({
      ...s,
      links: [...(s.links || []), ...newLinks],
      company: { ...s.company, assessmentBalance: Math.max(0, (s.company.assessmentBalance || 0) - newLinks.length) },
      modal: null
    }));
    saveState();
    render();
    showToast(`Оценка 360° запущена: ${targets.length} чел., ${newLinks.length} ссылок`);
  }

  function handleSendReview(w, state) {
    const emps = state.employeesApi || [];
    const targets = w.scope === "dept"
      ? emps.filter(e => e.department === w.dept)
      : emps.filter(e => w.selected.includes(e.id));
    const prVals = w.prValues || {};
    const nineBoxMap = {
      "00": "Зона риска", "01": "Зона риска", "10": "Зона риска",
      "11": "Зона развития", "02": "Стабильный", "20": "Стабильный",
      "12": "Стабильный", "21": "Стабильный", "22": "Стабильный",
      "03": "Стабильный", "30": "Стабильный", "13": "Перспективный",
      "31": "Перспективный", "04": "HiPo", "40": "HiPo",
      "14": "HiPo", "41": "HiPo", "23": "Перспективный",
      "32": "Перспективный", "24": "HiPo", "42": "HiPo",
      "33": "Перспективный", "34": "HiPo", "43": "HiPo", "44": "HiPo"
    };
    const pi = prVals.performance ?? 2;
    const po = prVals.potential ?? 2;
    const nineBox = nineBoxMap[`${pi}${po}`] || "Стабильный";
    const now = new Date();
    const newLinks = targets.map(emp => ({
      token: Math.random().toString(36).slice(2, 10),
      fullName: emp.fullName,
      email: emp.email || "",
      professionTitle: "Performance Review",
      recipientType: "employee",
      assessType: "review",
      status: "sent",
      createdAt: now.toISOString(),
      deadline: w.deadline,
      employeeId: emp.id,
      prValues: prVals,
      nineBox
    }));
    setState(s => ({
      ...s,
      links: [...(s.links || []), ...newLinks],
      company: { ...s.company, assessmentBalance: Math.max(0, (s.company.assessmentBalance || 0) - newLinks.length) },
      modal: null
    }));
    saveState();
    render();
    showToast(`Performance Review запущен: ${newLinks.length} чел.`);
  }

  async function handleSendStandard(w, state) {
    const employees = state.employeesApi || [];
    const targets = w.scope === "dept"
      ? employees.filter(e => e.department === w.dept)
      : employees.filter(e => w.selected.includes(e.id));
    if (!targets.length || !w.profId) {
      showToast("Выберите сотрудников и профиль оценки", "info");
      return;
    }
    const test = (state.testsApi || []).find(t => t.id === w.profId);
    const professionId = (test && test.key) || "recruiter";
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
          test_id: w.profId, person_id: emp.id, recipient_type: "employee"
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

    // PR scale selection
    const prKeyEl = event.target.closest("[data-aw-pr-key]");
    if (prKeyEl) {
      const key = prKeyEl.dataset.awPrKey;
      const val = parseInt(prKeyEl.dataset.awPrVal, 10);
      setState(s => ({ ...s, modal: { ...s.modal, prValues: { ...(s.modal.prValues || {}), [key]: val } } }));
      render();
      return;
    }

    // 360 role toggle / counter
    const roleEl = event.target.closest("[data-aw-role]");
    if (roleEl) {
      const role = roleEl.dataset.awRole;
      const val = roleEl.dataset.awRoleVal;
      setState(s => {
        const r360 = { ...(s.modal.roles360 || { self: true, manager: false, peers: 0, reports: 0 }) };
        if (val === "toggle") r360[role] = !r360[role];
        else if (val === "inc") r360[role] = Math.min((r360[role] || 0) + 1, 10);
        else if (val === "dec") r360[role] = Math.max((r360[role] || 0) - 1, 0);
        return { ...s, modal: { ...s.modal, roles360: r360 } };
      });
      render();
      return;
    }

    // Send Performance Review
    if (event.target.closest("[data-aw-send-review]")) {
      handleSendReview(getState().modal, getState());
      return;
    }

    // Send 360
    if (event.target.closest("[data-aw-send-360]")) {
      handleSend360(getState().modal, getState());
      return;
    }

    // Send standard assessment
    if (event.target.closest("[data-aw-send]")) {
      handleSendStandard(getState().modal, getState());
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
