/**
 * Eltera — AI Assistant Controller
 * Handles AI chat: sending messages, mock responses, typing effect.
 * Depends on: getState, setState, saveState
 */

const AI_MOCK_RESPONSES = {
  "кто в зоне риска": (s) => {
    const r = s.employees.filter(e => e.fit < 70 || e.turnoverRisk !== "низкий");
    if (!r.length) return "Сотрудников в зоне риска нет. Отличный результат!";
    return `В зоне риска <b>${r.length} сотрудника</b>:<br>${r.map(e => `• <b>${e.fullName}</b> — fit ${e.fit}%, риск увольнения: ${e.turnoverRisk}`).join("<br>")}.<br><br>Рекомендую провести 1-on-1 и обновить ИПР.`;
  },
  "топ кандидаты": (s) => {
    const c = s.sessions.filter(x => x.person.assessmentType === "Кандидат" && x.result.percent >= 68)
      .sort((a, b) => b.result.percent - a.result.percent);
    if (!c.length) return "Подходящих кандидатов пока нет. Отправьте оценочные ссылки.";
    return `Топ кандидаты по fit:<br>${c.map(x => `• <b>${x.person.fullName}</b> — ${x.result.percent}% (${x.vacancy})`).join("<br>")}.<br><br>Рекомендую начать с кандидатов выше 80%.`;
  },
  "риски адаптации": (s) => {
    const newEmps = s.employees.filter(e => {
      const d = new Date(e.startDate);
      return (Date.now() - d) < 90 * 24 * 3600 * 1000;
    });
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
  const riskCount = state.employees.filter(e => e.fit < 70 || e.turnoverRisk !== "низкий").length;
  const fitCount = state.sessions.filter(s => s.person.assessmentType === "Кандидат" && s.result.percent >= 68).length;
  return `По вашему запросу: в компании <b>${state.employees.length} сотрудников</b>, <b>${riskCount} в зоне риска</b>, <b>${fitCount} подходящих кандидатов</b>.<br><br>Попробуйте быстрые вопросы ниже или уточните запрос — я отвечу на основе ваших данных.`;
}

function aiTypingEffect(el, text, onDone) {
  let i = 0;
  el.innerHTML = "";
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

export function initAiController({ getState, setState, saveState }) {

  function aiSendMessage(question) {
    if (!question.trim()) return;
    const state = getState();
    if (!state.aiChat) setState(s => ({ ...s, aiChat: [] }));

    setState(s => ({ ...s, aiChat: [...(s.aiChat || []), { role: "user", text: question }] }));
    saveState();

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
      const responseText = getAiMockResponse(question, getState());
      const typing = document.getElementById("elt-ai-typing");
      if (typing) {
        const bubble = typing.querySelector(".elt-ai-msg-bubble");
        if (bubble) {
          aiTypingEffect(bubble, responseText, () => {
            setState(s => ({ ...s, aiChat: [...(s.aiChat || []), { role: "bot", text: responseText }] }));
            saveState();
          });
        }
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 900);

    // Clear input
    const inp = document.getElementById("elt-ai-input");
    if (inp) { inp.value = ""; inp.style.height = "auto"; }
  }

  // ── Click handler ──────────────────────────────────────────────────────────
  document.addEventListener("click", (event) => {
    if (event.target.closest("#elt-ai-send")) {
      const inp = document.getElementById("elt-ai-input");
      if (inp) aiSendMessage(inp.value);
      return;
    }
    const quick = event.target.closest("[data-ai-quick]")?.dataset.aiQuick;
    if (quick) {
      aiSendMessage(quick);
      return;
    }
  });

  // ── Keydown handler ────────────────────────────────────────────────────────
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && event.target.matches("#elt-ai-input")) {
      event.preventDefault();
      aiSendMessage(event.target.value);
    }
  });

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  document.addEventListener("input", (event) => {
    if (event.target.matches("#elt-ai-input")) {
      event.target.style.height = "auto";
      event.target.style.height = Math.min(event.target.scrollHeight, 100) + "px";
    }
  });
}
