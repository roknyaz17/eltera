/**
 * Eltera — Auth & Dev Portal Controller
 * Handles login, registration, dev portal authentication and library management.
 * Depends on: getState, setState, render, saveState, setHash
 */

const DEV_PASSWORD = "eltera-dev-2026";
const DEV_LIB_KEY = "eltera-dev-library-v1";

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

  // ── Submit handlers ────────────────────────────────────────────────────────
  document.addEventListener("submit", (event) => {
    // Login
    if (event.target.matches("[data-login-form]")) {
      event.preventDefault();
      setState(s => ({ ...s, authenticated: true }));
      saveState();
      setHash("#/app/dashboard");
      render();
      return;
    }

    // Register
    if (event.target.matches("[data-register-form]")) {
      event.preventDefault();
      const fd = new FormData(event.target);
      const firstName = fd.get("firstName") || "";
      const lastName = fd.get("lastName") || "";
      const company = fd.get("company") || "";
      const contact = fd.get("contact") || "";
      setState(s => ({
        ...s,
        authenticated: true,
        company: {
          ...s.company,
          ...(company ? { name: company } : {}),
          ...(firstName || lastName ? { contactName: `${firstName} ${lastName}`.trim() } : {}),
          ...(contact ? { contactEmail: contact } : {})
        }
      }));
      saveState();
      setHash("#/app/dashboard");
      render();
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
      return;
    }

    // Forgot password mock
    if (event.target.closest("[data-forgot-password]")) {
      event.preventDefault();
      alert("Сброс пароля будет доступен после подключения backend. Напишите на hello@eltera.ai");
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
