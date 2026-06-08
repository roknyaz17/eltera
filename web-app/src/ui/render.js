import { pageFilterConfig } from "../config/dashboard-config.js";
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
  getVacancyHealthStatus
} from "./dashboard-components.js";
import { renderPremiumDashboard } from "./dashboard-premium.js";

export function renderLanding(tariffs) {
  return `
    <div class="landing">
      <header class="landingHeader">
        <a class="landingLogo" href="#/"><img src="/assets/eltera_logo_horizontal_on_dark.svg" alt="Eltera Assessment Intelligence"></a>
        <nav class="landingNav"><a href="#how">Как работает</a><a href="#products">Продукты</a><a href="#reports">Отчеты</a><a href="#tariffs">Тарифы</a></nav>
        <div class="landingActions"><button class="ghostOnDark" data-route="login">Войти</button><button class="blueButton" data-route="login">Попробовать за 990 ₽</button></div>
      </header>
      <main>
        <section class="hero">
          <div class="heroCopy">
            <div class="pill">AI assessment platform</div>
            <h1>AI-платформа для оценки кандидатов и сотрудников</h1>
            <p>Эльтера помогает быстрее принимать кадровые решения: готовые профили ролей, оценочные ссылки, HR-отчеты, красные флаги и рекомендации для интервью или развития.</p>
            <div class="heroButtons"><button class="blueButton large" data-route="login">Попробовать за 990 ₽</button><button class="ghostOnDark large" data-demo-assessment>Пройти демо-оценку</button></div>
            <span class="underCta">1 месяц доступа · 20 оценок · кандидаты и сотрудники в одном тарифе</span>
          </div>
          <div class="heroPanel">
            <div class="panelGlow"></div>
            <div class="heroCard glass">
              <div class="cardLine"><span>Потенциал эффекта</span><b>AI-анализ</b></div>
              ${metric("Снизить ошибки найма", "до 40%", 82)}
              ${metric("Меньше ручной работы с опросами", "до x10", 91)}
              ${metric("Сократить текучесть", "до 20%", 64)}
              ${metric("Готовность к роли", "76%", 76)}
              <div class="aiNote">Рекомендация: приглашать дальше, но проверить обработку возражений и дисциплину ведения воронки.</div>
            </div>
          </div>
        </section>
        <section class="trusted"><span>Для точечного подбора, офисных и IT-ролей</span><div>HRD · рекрутеры · руководители · собственники · кадровые агентства · команды продаж · back office · IT</div></section>
        <section class="landingSection" id="products">
          <div class="sectionIntro dark"><span>Продукты</span><h2>Оценка людей в одной системе</h2><p>Не делим кандидатов и сотрудников: все люди проходят оценку через понятный flow, а компания получает отчет для решения.</p></div>
          <div class="productGrid">
            ${product("Оценка кандидатов и сотрудников", "Готовые профили профессий, вопросы, кейсы, красные флаги и итоговая рекомендация.")}
            ${product("Оценка 360", "Только TalentStudio: самооценка, руководитель, коллеги, подчиненные.")}
            ${product("Пульс-опросы и вовлеченность", "Диагностика настроения, удержания, выгорания и рисков команд.")}
            ${product("Performance review", "Оценка результативности, потенциала, развития и управленческих решений.")}
          </div>
        </section>
        <section class="landingSection twoCols" id="how">
          <div class="sectionIntro dark"><span>Как работает</span><h2>От ссылки до управленческого решения</h2><p>HR выбирает профиль, отправляет ссылку, кандидат или сотрудник проходит оценку, отчет появляется в кабинете и скачивается в PDF.</p></div>
          <div class="stepsGlass">${step("01", "Выбрать профиль", "Офисные, IT, руководители, массовый и точечный подбор.")}${step("02", "Отправить ссылку", "Оценка открывается без регистрации, внутренний отчет скрыт от участника.")}${step("03", "Получить отчет", "HR видит проценты, компетенции, риски, ответы, историю и PDF.")}</div>
        </section>
        <section class="landingSection" id="reports">
          <div class="reportPreview glass"><div><span class="miniLabel">HR-отчет</span><h2>Понятно для HRD, руководителя и собственника</h2><p>Отчет показывает итоговое решение, профиль компетенций, красные флаги, сильные стороны, риски и рекомендации для следующего интервью.</p></div><div class="reportMini"><strong>76%</strong><span>приглашать дальше</span><div class="miniBars"><i style="width:86%"></i><i style="width:72%"></i><i style="width:58%"></i></div></div></div>
        </section>
        <section class="landingSection" id="tariffs"><div class="sectionIntro dark"><span>Тарифы</span><h2>AI-рекомендации, отчеты и аналитика по тарифам</h2></div><div class="tariffGrid landingTariffs">${tariffs.map(renderTariffCard).join("")}</div></section>
      </main>
      <footer class="landingFooter"><img src="/assets/eltera_logo_horizontal_on_dark.svg" alt="Eltera"><div><a href="#/login">Войти</a><a href="#tariffs">Тарифы</a><a href="#reports">Отчеты</a><a href="#/app/referrals">Реферальная программа</a></div></footer>
    </div>
  `;
}

export function renderLogin() {
  return `
    <div class="authPage">
      <section class="authBrand"><img src="/assets/eltera_logo_horizontal_on_dark.svg" alt="Eltera"><h1>Интеллект в оценке. Уверенность в решениях.</h1><p>Войдите в демо-кабинет, чтобы увидеть дашборды, ссылки, вакансии, отчеты, тарифы и реферальную программу.</p></section>
      <form class="authCard glass" data-login-form><span class="miniLabel">Демо-вход</span><h2>Личный кабинет</h2><label>Email<input name="email" value="hr@eltera.ai" autocomplete="email"></label><label>Пароль<input name="password" value="demo" type="password" autocomplete="current-password"></label><button class="blueButton wide" type="submit">Войти</button><p>На MVP это локальная авторизация. Backend, OTP и роли подключаются следующим этапом.</p></form>
    </div>
  `;
}

export function renderAppShell(state, content) {
  const counts = navCounts(state);
  const navGroups = buildNavGroups(state, counts);
  const isDark = state.theme !== "light";
  return `
    <div class="appShell ${isDark ? "darkTheme" : "lightTheme"}">
      <aside class="elt-sidebar">
        <div class="elt-sidebar-logo">
          <img src="${isDark ? "/assets/eltera_logo_horizontal_on_dark.svg?v=3" : "/assets/eltera_logo_horizontal_on_light.svg?v=2"}" alt="Eltera" class="elt-logo-img">
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
          <button class="elt-nav-item elt-tariff-nav" data-route="/app/tariffs">
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
            <div class="elt-search-wrap">
              <svg class="elt-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"/><line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              <input class="elt-search" placeholder="Поиск по людям, вакансиям и отчетам">
            </div>
          </div>
          <div class="elt-topbar-right">
            <div class="elt-balance-pill">
              <span class="elt-balance-label">Баланс оценок</span>
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
            <button class="elt-icon-btn elt-notif-btn" title="Уведомления">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a4 4 0 0 1 4 4v2.5l1 1.5H2l1-1.5V5.5a4 4 0 0 1 4-4z" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".85"/><path d="M5.5 11.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".7"/></svg>
              <span class="elt-notif-dot"></span>
            </button>
            <button class="elt-avatar-btn" title="Профиль">РК</button>
          </div>
        </header>
        <main class="appContent">${content}${renderModal(state)}</main>
      </div>
    </div>
  `;
}

function eltNavItem(item, activeView) {
  const isActive = activeView === item.id;
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
      <article class="panel chartPanel widePanel"><div class="panelHead"><h2>Структура компании</h2><span>отдел → руководитель → сотрудники</span></div><div class="orgTree">${state.departments.map((dept) => `<div class="orgNode"><b>${dept.name}</b><span>${dept.employees} сотрудников · руководитель: ${dept.head}</span><em>${dept.risk} в зоне риска</em><div><button class="button subtle">Открыть</button><button class="button subtle">Запустить оценку</button><button class="button subtle">360</button></div></div>`).join("")}</div></article>
    </section>
  `;
}

export function renderCandidates(state) {
  const candidates = state.sessions.filter((item) => item.person.assessmentType === "Кандидат");
  const fit = candidates.filter((item) => item.result.percent >= 68);
  const risky = candidates.filter((item) => item.result.percent < 55);
  return DashboardPageLayout({
    title: "Кандидаты",
    subtitle: "",
    meta: ["точечный подбор", "офис", "IT"],
    period: state.period,
    actions: [
      { label: "Добавить кандидата" },
      { label: "Импорт" },
      { label: "Создать ссылку", primary: true, attrs: "data-action=\"create-link\"" }
    ],
    filters: pageFilterConfig.candidates,
    kpiCards: [
      { label: "Всего кандидатов", value: candidates.length + 128, caption: "+24 за период", status: "neutral", target: "Кандидаты:Кандидатов всего", iconName: "candidates" },
      { label: "Оценка отправлена", value: state.links.filter((x) => x.recipientType === "Кандидат").length, caption: "активные ссылки", status: "medium", target: "Кандидаты:Оценка отправлена", iconName: "link" },
      { label: "Оценку прошли", value: candidates.length, caption: "готовы отчеты", status: getConversionStatus(72), target: "Кандидаты:Оценка пройдена", iconName: "completed" },
      { label: "Подходят", value: fit.length + 24, caption: "под профиль", status: "good", target: "Кандидаты:Подходят", iconName: "fit" },
      { label: "Условно подходят", value: 11, caption: "нужна проверка", status: "medium", target: "Кандидаты:Условно подходят", iconName: "balance" },
      { label: "Не подходят", value: risky.length + 9, caption: "низкий балл", status: "bad", target: "Кандидаты:Не подходит", iconName: "risk" },
      { label: "На интервью", value: 21, caption: "следующий этап", status: "good", target: "Кандидаты:Интервью", iconName: "interview" },
      { label: "Приняты", value: 4, caption: "выход", status: "neutral", target: "Кандидаты:Принят", iconName: "completed" },
      { label: "Зависли", value: 12, caption: "нет движения", status: "bad", target: "Кандидаты:Зависли", iconName: "active" }
    ],
    charts: [
      { title: "Воронка кандидатов", caption: "конверсия этапов", type: "funnel", items: dashboardData(state, "Кандидаты").funnel.map(([label, value]) => ({ label, value, target: `Кандидаты:${label}` })) },
      { title: "Кандидаты по источникам", caption: "качество входа", items: [["HeadHunter", 44], ["SuperJob", 24], ["Ручная", 18], ["API", 12], ["Telegram", 9]] },
      { title: "Распределение по вакансиям", caption: "подходящие", items: state.vacancies.map((item) => [item.title, item.fit]) },
      { title: "Кого взять в работу сейчас", caption: "top fit", wide: true, items: fit.map((item) => [item.person.fullName, item.result.percent]), note: state.company.tariff === "TalentStudio" ? "AI рекомендует сначала брать кандидатов с высоким fit и низкими красными флагами." : "AI-рекомендации доступны на тарифе TalentStudio." }
    ],
    heatmap: candidateHeatmap(state),
    attentionItems: [
      { title: "12 кандидатов зависли", text: "Не прошли оценку после отправки ссылки.", status: "medium", target: "Кандидаты:Зависли" },
      { title: "Оператор call-центра", text: "Только 28% кандидатов подходят под профиль.", status: "bad", target: "Кандидаты:Оператор call-центра" }
    ],
    table: candidatesTableConfig(candidates)
  });
}

export function renderEmployees(state) {
  const employees = state.employees;
  const risky = employees.filter((item) => item.fit < 70 || item.turnoverRisk !== "низкий");
  return DashboardPageLayout({
    title: "Сотрудники",
    subtitle: "Что происходит с действующими сотрудниками и кто требует внимания.",
    meta: ["оценка", "риски", "развитие"],
    period: state.period,
    actions: [{ label: "Оценить сотрудника", primary: true, attrs: "data-action=\"create-link\"" }],
    filters: pageFilterConfig.employees,
    kpiCards: [
      { label: "Всего сотрудников", value: 70, caption: "в базе", status: "neutral", target: "Сотрудники:Сотрудников всего", iconName: "employees" },
      { label: "В оценке", value: 16, caption: "активные", status: "neutral", target: "Сотрудники:В оценке", iconName: "active" },
      { label: "Высокий результат", value: 28, caption: "выше 80%", status: "good", target: "Сотрудники:Высокий результат", iconName: "fit" },
      { label: "Средний результат", value: 34, caption: "60-79%", status: "medium", target: "Сотрудники:Средний результат", iconName: "chart" },
      { label: "Низкий результат", value: 8, caption: "ниже 60%", status: "bad", target: "Сотрудники:Низкий результат", iconName: "risk" },
      { label: "В зоне риска", value: risky.length + 4, caption: "требуют внимания", status: "bad", target: "Сотрудники:В зоне риска", iconName: "risk" },
      { label: "Выгорание", value: 5, caption: "признаки", status: "medium", target: "Сотрудники:Выгорание", iconName: "balance" },
      { label: "Удовлетворенность", value: "74%", caption: "средняя", status: "medium", target: "Сотрудники:Удовлетворенность", iconName: "completed" }
    ],
    charts: [
      { title: "Распределение по отделам", caption: "срез базы", items: state.departments.map((item) => [item.name, item.employees]) },
      { title: "Риски сотрудников", caption: "приоритет", items: [["Выгорание", 5], ["Увольнение", 8], ["Низкая вовлеченность", 7], ["Адаптация", 3]], note: "В первую очередь стоит смотреть сотрудников с высоким риском увольнения и низкой понятностью задач." },
      { title: "Performance / Potential", caption: "9-box", items: [["HiPo", 6], ["Стабильные", 18], ["Зона развития", 9], ["Зона риска", 4]] }
    ],
    heatmap: employeeHeatmap(state),
    attentionItems: [
      { title: "6 сотрудников в зоне риска", text: "Нужны разговоры с руководителями и ИПР.", status: "bad", target: "Сотрудники:В зоне риска" },
      { title: "3 сотрудника указали зарплату", text: "Риск удержания на адаптации.", status: "medium", target: "Адаптация:Зарплата" }
    ],
    table: employeesTableConfig(employees)
  });
}

export function renderStructure(state) {
  return `
    <section class="pageHead"><div><span class="miniLabel">Структура компании</span><h1>Компания → отделы → руководители → сотрудники</h1><p>Сотрудники попадают в дерево после добавления в компанию. Кандидаты остаются в подборе до статуса “Принят”.</p></div><button class="blueButton" data-action="create-link">Добавить сотрудника</button></section>
    <section class="panel orgPanel">
      <div class="orgRoot"><b>${state.company.name}</b><span>70 сотрудников · ${state.departments.length} отдела</span></div>
      <div class="orgTree">${state.departments.map((dept) => `<div class="orgNode"><b>${dept.name}</b><span>Руководитель: ${dept.head}</span><em>${dept.employees} сотрудников · ${dept.risk} в зоне риска</em><div><button class="button subtle" data-open-card="${dept.name}">Открыть отдел</button><button class="button subtle" data-action="create-link">Оценить отдел</button><button class="button subtle" data-open-locked="Оценка 360 доступна на тарифе TalentStudio.">360 по руководителю</button></div></div>`).join("")}</div>
    </section>
  `;
}

export function renderConstructor(state, professions) {
  const competencies = {
    corporate: ["Ориентация на результат", "Ответственность", "Клиентский фокус", "Командность", "Этичность", "Инициативность", "Гибкость", "Соблюдение стандартов"],
    psychological: ["Стрессоустойчивость", "Обучаемость", "Саморегуляция", "Мотивация достижения", "Эмоциональная устойчивость", "Внимательность", "Достоверность", "Лояльность"],
    professional: ["Подбор персонала", "Продажи", "Работа с CRM", "Аналитика данных", "Управление командой", "Планирование", "Переговоры", "Контроль качества", "Работа с документами", "Техническая экспертиза"]
  };
  const compTag = (name) => `<button class="elt-comp-tag">${name}</button>`;
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Конструктор</span>
          <h1 class="elt-page-title">Конструктор профилей и компетенций</h1>
          <p class="elt-page-subtitle">Опишите роль, AI предложит карту компетенций: корпоративные, психологические и профессиональные блоки.</p>
        </div>
        <div class="elt-page-actions">
          <button class="elt-btn-primary">Сохранить профиль</button>
        </div>
      </div>
      <div class="elt-constructor-grid">
        <div class="elt-constructor-main">
          <div class="elt-card">
            <div class="elt-card-head"><h2>Профиль роли</h2><span class="elt-card-caption">основные параметры</span></div>
            <div class="elt-form-grid">
              <label class="elt-label">Название роли<input class="elt-input" value="Руководитель отдела продаж"></label>
              <label class="elt-label">Тип оценки<select class="elt-select"><option>Кандидат</option><option>Сотрудник</option><option>Группа</option><option>Ассессмент</option></select></label>
              <label class="elt-label">Шкала ответов<select class="elt-select"><option>3 варианта</option><option>5-балльная</option><option>Да / нет</option></select></label>
              <label class="elt-label">Вес достоверности<select class="elt-select"><option>15%</option><option>10%</option><option>20%</option></select></label>
            </div>
            <button class="elt-btn-secondary">Собрать профиль</button>
          </div>
          <div class="elt-card">
            <div class="elt-card-head"><h2>Библиотека компетенций</h2><span class="elt-card-caption">все блоки</span></div>
            <div class="elt-comp-section">
              <div class="elt-comp-section-head"><span class="elt-comp-dot" style="background:#1E5BFF"></span><b>Корпоративные</b><small>25%</small></div>
              <div class="elt-comp-tags">${competencies.corporate.map(compTag).join('')}</div>
            </div>
            <div class="elt-comp-section">
              <div class="elt-comp-section-head"><span class="elt-comp-dot" style="background:#00E5D4"></span><b>Психологические</b><small>25%</small></div>
              <div class="elt-comp-tags">${competencies.psychological.map(compTag).join('')}</div>
            </div>
            <div class="elt-comp-section">
              <div class="elt-comp-section-head"><span class="elt-comp-dot" style="background:#22C55E"></span><b>Профессиональные</b><small>35%</small></div>
              <div class="elt-comp-tags">${competencies.professional.map(compTag).join('')}</div>
            </div>
          </div>
          <div class="elt-card">
            <div class="elt-card-head"><h2>Добавить свои компетенции через Excel</h2><span class="elt-card-caption">на рассмотрение</span></div>
            <div class="elt-import-flow">
              <div class="elt-import-step"><span class="elt-import-num">1</span><div><b>Скачать шаблон</b><p>PDF объясняет поля: название, категория, описание, индикаторы, шкала.</p><button class="elt-btn-ghost">Скачать PDF-шаблон</button></div></div>
              <div class="elt-import-step"><span class="elt-import-num">2</span><div><b>Заполнить Excel</b><p>Добавьте корпоративные, психологические или профессиональные компетенции.</p><label class="elt-file-label">Excel-файл<input type="file" accept=".xlsx,.xls"></label></div></div>
              <div class="elt-import-step"><span class="elt-import-num">3</span><div><b>Отправить на рассмотрение</b><p>Заявка уйдет в отдел разработки. Срок: 1–30 рабочих дней.</p><button class="elt-btn-primary">Отправить компетенции</button></div></div>
            </div>
          </div>
        </div>
        <div class="elt-constructor-sidebar">
          <div class="elt-card elt-ai-panel">
            <div class="elt-card-head"><span class="elt-ai-badge">AI</span><h2>AI-конструктор</h2></div>
            <label class="elt-label">Чем занимается сотрудник
              <textarea class="elt-textarea">Руководит отделом продаж, ставит планы, контролирует CRM, проводит планерки, обучает менеджеров.</textarea>
            </label>
            <button class="elt-btn-primary elt-btn-wide">Сгенерировать компетенции</button>
            <div class="elt-ai-suggest">
              <span class="elt-ai-suggest-label">AI предложит</span>
              <div class="elt-comp-tags">
                <button class="elt-comp-tag elt-comp-tag-ai">Управление результатом</button>
                <button class="elt-comp-tag elt-comp-tag-ai">Планирование и контроль</button>
                <button class="elt-comp-tag elt-comp-tag-ai">Лидерство</button>
                <button class="elt-comp-tag elt-comp-tag-ai">Коммуникация</button>
                <button class="elt-comp-tag elt-comp-tag-ai">Аналитика CRM</button>
                <button class="elt-comp-tag elt-comp-tag-ai">Мотивация команды</button>
              </div>
            </div>
          </div>
          <div class="elt-card">
            <div class="elt-card-head"><h2>Готовые профили</h2><span class="elt-card-caption">${professions.length}</span></div>
            <div class="elt-profile-rows">
              ${professions.slice(0, 7).map((item) => `<button class="elt-profile-row" data-open-competency="${item.id}"><b>${item.title}</b><span>${item.category}</span></button>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderVacancies(state) {
  const low = state.vacancies.filter((vacancy) => getVacancyHealthStatus(vacancy) === "bad");
  return DashboardPageLayout({
    title: "Вакансии",
    subtitle: "Дашборд эффективности подбора по источникам, конверсии и подходящим кандидатам.",
    meta: ["HeadHunter", "API", "ручные вакансии", "импорт"],
    period: state.period,
    actions: [
      { label: "Подключить hh.ru" },
      { label: "JSON API" },
      { label: "Импорт" },
      { label: "Добавить вакансию", primary: true }
    ],
    filters: pageFilterConfig.vacancies,
    kpiCards: [
      { label: "Активные вакансии", value: state.vacancies.filter((x) => x.status === "Активна").length, caption: "в работе", status: "neutral", target: "Вакансии:Активные", iconName: "vacancies" },
      { label: "Без откликов", value: 1, caption: "больше 7 дней", status: "bad", target: "Вакансии:Без откликов", iconName: "risk" },
      { label: "Низкая конверсия", value: low.length, caption: "нужна правка", status: "bad", target: "Вакансии:Низкая конверсия", iconName: "chart" },
      { label: "Хорошая конверсия", value: 2, caption: "работают", status: "good", target: "Вакансии:Хорошая конверсия", iconName: "fit" },
      { label: "Всего откликов", value: state.vacancies.reduce((sum, item) => sum + item.responses, 0), caption: "по вакансиям", status: "neutral", target: "Вакансии:Отклики", iconName: "candidates" },
      { label: "Всего оценок", value: state.vacancies.reduce((sum, item) => sum + item.assessments, 0), caption: "отправлено", status: "neutral", target: "Вакансии:Оценки", iconName: "link" },
      { label: "Подходят", value: state.vacancies.reduce((sum, item) => sum + item.fit, 0), caption: "под профиль", status: "good", target: "Кандидаты:Подходят", iconName: "fit" },
      { label: "Закрытые", value: 4, caption: "за период", status: "neutral", target: "Вакансии:Закрытые", iconName: "completed" }
    ],
    charts: [
      { title: "Отклики по вакансиям", caption: "входящий поток", items: state.vacancies.map((item) => [item.title, item.responses]) },
      { title: "Подходящие кандидаты", caption: "качество", items: state.vacancies.map((item) => ({ label: item.title, value: item.fit, status: getFitStatus(item.fit * 8) })) }
    ],
    heatmap: vacancyHeatmap(state),
    attentionItems: [
      { title: "Frontend-разработчик", text: "Мало оценок и нет устойчивой воронки.", status: "medium", target: "Вакансии:Frontend-разработчик" },
      { title: "Менеджер по продажам", text: "Много откликов, но конверсия 39%. Нужно уточнить профиль.", status: "bad", target: "Вакансии:Менеджер по продажам" }
    ],
    table: vacanciesTableConfig(state.vacancies)
  });
}

export function renderAssessments(state, professions) {
  const catIcon = { recruiter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`, sales_manager: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`, call_center: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>`, coordinator: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`, warehouse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` };
  const defaultIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`;
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Профили</span>
          <h1 class="elt-page-title">Профили оценки профессий</h1>
          <p class="elt-page-subtitle">Готовые профили ролей: компетенции, длительность, вопросы и рекомендации по интерпретации.</p>
        </div>
        <div class="elt-page-actions">
          <button class="elt-btn-primary" data-action="create-link">+ Создать ссылку</button>
        </div>
      </div>
      <div class="elt-filter-bar">
        <button class="elt-pill active">Все</button>
        <button class="elt-pill">Кандидат</button>
        <button class="elt-pill">Сотрудник</button>
        <button class="elt-pill">Группа</button>
        <button class="elt-pill elt-pill-muted">Ассессмент · в разработке</button>
        <span class="elt-filter-sep"></span>
        <button class="elt-pill">Офисные</button>
        <button class="elt-pill">IT</button>
        <button class="elt-pill">Руководители</button>
        <button class="elt-pill">Линейный персонал</button>
      </div>
      <div class="elt-profiles-grid">
        ${professions.map((profession) => `
          <article class="elt-profile-card">
            <div class="elt-profile-card-top">
              <div class="elt-profile-icon-wrap">${catIcon[profession.id] || defaultIcon}</div>
              <span class="elt-profile-category">${profession.category}</span>
            </div>
            <h3 class="elt-profile-title">${profession.title}</h3>
            <p class="elt-profile-summary">${profession.summary}</p>
            <div class="elt-profile-meta">
              <span>12–15 мин</span>
              <span>${profession.competencies.length + 4} вопросов</span>
              <span>${profession.competencies.slice(0, 2).join(' · ')}</span>
            </div>
            <div class="elt-profile-actions">
              <button class="elt-btn-secondary" data-action="create-link" data-profession="${profession.id}">Создать ссылку</button>
              <button class="elt-btn-ghost" data-open-competency="${profession.id}">Компетенции</button>
            </div>
          </article>`).join('')}
      </div>
    </div>
  `;
}

export function renderAdaptation(state) {
  return DashboardPageLayout({
    title: "Адаптация",
    subtitle: "Новые сотрудники, этапы 1/3/7/14/30/60/90 дней и причины риска.",
    meta: ["онбординг", "пульс-опросы", "риски"],
    period: state.period,
    actions: [{ label: "Запустить опрос адаптации", primary: true, attrs: "data-action=\"create-link\"" }],
    filters: pageFilterConfig.adaptation,
    kpiCards: [
      { label: "Новые сотрудники", value: 14, caption: "до 90 дней", status: "neutral", target: "Адаптация:Новые сотрудники" },
      { label: "Прошли адаптацию", value: 4, caption: "успешно", status: "good", target: "Адаптация:Прошли" },
      { label: "В процессе", value: 9, caption: "этапы активны", status: "neutral", target: "Адаптация:В процессе" },
      { label: "Не прошли", value: 1, caption: "нужен разбор", status: "bad", target: "Адаптация:Не прошли" },
      { label: "В зоне риска", value: 3, caption: "срочно смотреть", status: "bad", target: "Адаптация:В зоне риска" },
      { label: "Проблема зарплаты", value: 2, caption: "ожидания", status: "medium", target: "Адаптация:Зарплата" },
      { label: "Руководитель", value: 2, caption: "коммуникация", status: "medium", target: "Адаптация:Руководитель" },
      { label: "Низкая вовлеченность", value: 3, caption: "опросы", status: "bad", target: "Адаптация:Вовлеченность" }
    ],
    charts: [
      { title: "Этапы адаптации", caption: "воронка 90 дней", type: "funnel", items: [["1 день", 14], ["3 день", 13], ["7 день", 12], ["14 день", 9], ["30 день", 5], ["60 день", 4], ["90 день", 4]] },
      { title: "Причины риска", caption: "пульс-опросы", items: [["Задачи", 3], ["Зарплата", 2], ["График", 1], ["Руководитель", 2], ["Коллектив", 1], ["Условия", 1]] }
    ],
    heatmap: employeeHeatmap(state),
    attentionItems: [{ title: "Анна Иванова", text: "Несоответствие зарплаты и низкая понятность задач на 7-й день.", status: "bad", target: "Адаптация:Анна Иванова" }],
    table: employeesTableConfig(state.employees)
  });
}

export function renderThreeSixty(state) {
  const locked = state.company.tariff !== "TalentStudio";
  const content = DashboardPageLayout({
    title: "Оценка 360",
    subtitle: "Самооценка, руководитель, коллеги, подчиненные и расхождения восприятия.",
    meta: ["TalentStudio", "1 раз в год", "обратная связь"],
    period: state.period,
    actions: [{ label: "Запустить 360", primary: true, attrs: locked ? "data-open-locked=\"Оценка 360 доступна на тарифе TalentStudio.\"" : "data-action=\"create-link\"" }],
    filters: pageFilterConfig["360"],
    kpiCards: [
      { label: "Активные 360", value: 5, caption: "циклов", status: locked ? "noData" : "neutral", target: "Оценка 360:Активные" },
      { label: "Завершены", value: 2, caption: "цикла", status: "medium", target: "Оценка 360:Завершены" },
      { label: "Средний балл", value: "4.1", caption: "из 5", status: "good", target: "Оценка 360:Средний балл" },
      { label: "Расхождение", value: "0.8", caption: "самооценка", status: "medium", target: "Оценка 360:Расхождение" },
      { label: "Зоны развития", value: 4, caption: "компетенции", status: "medium", target: "Оценка 360:Зоны развития" }
    ],
    charts: [
      { title: "Структура оценок", caption: "участники", items: [["Самооценка", 5], ["Руководитель", 3], ["Коллеги", 4], ["Подчиненные", 2]] },
      { title: "Расхождения", caption: "самооценка vs внешняя", items: [["Коммуникация", 0.8], ["Лидерство", 1.1], ["Ответственность", 0.4], ["Развитие", 0.9]], note: "Оценку 360 рекомендуется проводить не чаще одного раза в год, чтобы избежать усталости участников." }
    ],
    heatmap: employeeHeatmap(state),
    attentionItems: [{ title: "Сильное расхождение", text: "У руководителя продаж самооценка выше внешней оценки на 1.1 балла.", status: "medium", target: "Оценка 360:Расхождение" }],
    table: employeesTableConfig(state.employees)
  });
  return locked ? `<div class="guardedFeature">${content}<div class="lockedOverlay"><b>Оценка 360 доступна на TalentStudio</b><p>Раздел виден как будущий модуль, но запуск оценок пока заблокирован.</p><button class="blueButton" data-open-tariff-picker>Изменить тариф</button></div></div>` : content;
}

export function renderPerformance(state) {
  return DashboardPageLayout({
    title: "Performance Review",
    subtitle: "Циклы review, performance/potential, 9-box и рекомендации по развитию.",
    meta: ["performance", "potential", "кадровый резерв"],
    period: state.period,
    actions: [{ label: "Запустить review", primary: true, attrs: "data-action=\"create-link\"" }],
    filters: pageFilterConfig.performance,
    kpiCards: [
      { label: "В цикле", value: 42, caption: "сотрудника", status: "neutral", target: "Performance Review:В цикле" },
      { label: "Завершили", value: 28, caption: "review", status: "medium", target: "Performance Review:Завершили" },
      { label: "Высокий performance", value: 12, caption: "результат", status: "good", target: "Performance Review:Высокий performance" },
      { label: "Низкий performance", value: 4, caption: "риск", status: "bad", target: "Performance Review:Низкий performance" },
      { label: "Высокий потенциал", value: 9, caption: "HiPo", status: "good", target: "Performance Review:HiPo" },
      { label: "Кадровый резерв", value: 6, caption: "готовить", status: "good", target: "Performance Review:Кадровый резерв" }
    ],
    charts: [
      { title: "9-box matrix", caption: "сегменты", items: [["HiPo / High", 6], ["HiPo / Medium", 5], ["Стабильные", 18], ["Зона развития", 9], ["Зона риска", 4]] },
      { title: "Performance / Potential", caption: "распределение", items: [["Результативность", 78], ["Потенциал", 71], ["ИПР", 19], ["Резерв", 6]] }
    ],
    heatmap: employeeHeatmap(state),
    attentionItems: [{ title: "Калибровка оценок", text: "Нужно сравнять шкалы продаж и операционного блока.", status: "medium", target: "Performance Review:Калибровка" }],
    table: employeesTableConfig(state.employees)
  });
}

export function renderLinks(state, professions) {
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Оценки</span>
          <h1 class="elt-page-title">Оценки кандидатов и сотрудников</h1>
          <p class="elt-page-subtitle">Создайте оценку, отправьте ссылку участнику, отслеживайте статус и результат прохождения.</p>
        </div>
        <div class="elt-page-actions">
          <button class="elt-btn-ghost">Импорт Excel</button>
          <button class="elt-btn-primary" data-action="create-link">+ Создать оценку</button>
        </div>
      </div>
      <div class="elt-links-grid">
        <div class="elt-card">
          <div class="elt-card-head"><h2>Загрузка сотрудников через Excel</h2><span class="elt-card-caption">массовое создание оценок</span></div>
          <div class="elt-import-flow">
            <div class="elt-import-step"><span class="elt-import-num">1</span><div><b>Скачать Excel-шаблон</b><p>ФИО, телефон, email, должность, отдел, руководитель, проект, тип и профиль оценки.</p><a class="elt-btn-ghost" href="/assets/eltera-employees-import-template.xlsx" download>Скачать шаблон</a></div></div>
            <div class="elt-import-step"><span class="elt-import-num">2</span><div><b>Загрузить сотрудников</b><p>После загрузки сотрудники будут доступны для оценки.</p><label class="elt-file-label">Excel-файл<input type="file" accept=".xlsx,.xls"></label></div></div>
            <div class="elt-import-step"><span class="elt-import-num">3</span><div><b>Создать оценки</b><p>Выберите профиль и отправьте оценки всем сотрудникам из файла или отдельным отделам.</p><button class="elt-btn-primary">Создать оценки по списку</button></div></div>
          </div>
        </div>
        <div class="elt-card">
          <div class="elt-card-head"><h2>Создать оценку</h2><span class="elt-card-caption">единичная оценка</span></div>
          <form class="elt-form-grid elt-form-grid-3" data-create-link-form>
            <label class="elt-label elt-label-full">Тип получателя<select class="elt-select" name="recipientType"><option>Кандидат</option><option>Сотрудник</option></select></label>
            <label class="elt-label elt-label-full">Профиль оценки<select class="elt-select" name="professionId">${professions.map((profession) => `<option value="${profession.id}">${profession.title}</option>`).join('')}</select></label>
            <label class="elt-label">Фамилия<input class="elt-input" name="lastName" placeholder="Иванов"></label>
            <label class="elt-label">Имя<input class="elt-input" name="firstName" placeholder="Иван"></label>
            <label class="elt-label">Отчество<input class="elt-input" name="patronymic" placeholder="Иванович"></label>
            <label class="elt-label">Телефон<input class="elt-input" name="phone" placeholder="+7..."></label>
            <label class="elt-label">Email<input class="elt-input" name="email" placeholder="candidate@example.com"></label>
            <label class="elt-label">Должность<input class="elt-input" name="position" placeholder="Менеджер"></label>
            <label class="elt-label">Компания<input class="elt-input" name="company" value="${state.company.name}"></label>
            <label class="elt-label">Отдел<input class="elt-input" name="department" placeholder="Отдел продаж"></label>
            <label class="elt-label">Вакансия<input class="elt-input" name="vacancy" placeholder="Менеджер по продажам"></label>
            <label class="elt-label">Проект<input class="elt-input" name="project" placeholder="Проект A"></label>
            <div class="elt-form-warning elt-label-full">Если не указан email или телефон, ссылка будет создана, но не будет автоматически отправлена.</div>
            <div class="elt-label-full"><button class="elt-btn-primary" type="submit">Создать ссылку</button></div>
          </form>
        </div>
        <div class="elt-table-panel">
          <div class="elt-table-head"><h2>Оценочные ссылки</h2><span class="elt-card-caption">${state.links.length} ссылок</span></div>
          <div class="elt-table-wrap">
            <table class="elt-table"><thead><tr><th>Получатель</th><th>Профиль</th><th>Контакт</th><th>Ссылка</th><th>Статус</th><th></th></tr></thead><tbody>
              ${state.links.map((link) => `<tr><td>${link.fullName || link.recipientType}</td><td>${link.professionTitle}</td><td>${link.email || link.phone || "<span class='elt-warn-text'>нет контакта</span>"}</td><td><code class="elt-code">${location.origin}${location.pathname}#/assess/${link.token}</code>${link.warning ? `<small class="elt-warn-text">${link.warning}</small>` : ''}</td><td><span class="elt-status-badge elt-status-${link.status}">${statusText(link.status)}</span></td><td><div class="elt-row-actions"><button class="elt-btn-ghost" data-open-assess="${link.token}">Открыть</button><button class="elt-btn-ghost">Скопировать</button>${canCancel(link) ? `<button class="elt-btn-danger" data-cancel-link="${link.token}">Отменить</button>` : ''}</div></td></tr>`).join('')}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderReports(state) {
  const completed = state.sessions.filter((item) => item.status === "completed");
  return DashboardPageLayout({
    title: "Отчеты",
    subtitle: "HR-отчеты, ответы, PDF и история результатов по всем типам оценок.",
    meta: ["кандидаты", "сотрудники", "группы", "360", "review"],
    period: state.period,
    actions: [{ label: "Экспорт PDF" }, { label: "Создать оценку", primary: true, attrs: "data-action=\"create-link\"" }],
    filters: pageFilterConfig.reports,
    kpiCards: [
      { label: "Готовые отчеты", value: completed.length, caption: "за период", status: "neutral", target: "Отчеты:Готовые" },
      { label: "Кандидаты", value: completed.filter((item) => item.person.assessmentType === "Кандидат").length, caption: "отчеты", status: "neutral", target: "Отчеты:Кандидаты" },
      { label: "Сотрудники", value: completed.filter((item) => item.person.assessmentType === "Сотрудник").length, caption: "отчеты", status: "neutral", target: "Отчеты:Сотрудники" },
      { label: "PDF скачаны", value: 18, caption: "действия HR", status: "good", target: "Отчеты:PDF" },
      { label: "Нужна проверка", value: 6, caption: "спорные результаты", status: "bad", target: "Отчеты:Проверка" },
      { label: "Ответы открыты", value: 22, caption: "просмотры", status: "neutral", target: "Отчеты:Ответы" }
    ],
    charts: [
      { title: "Отчеты по типам", caption: "структура", items: [["Кандидаты", 24], ["Сотрудники", 12], ["Групповые", 4], ["360", 2], ["Адаптация", 7], ["Review", 5]] },
      { title: "Динамика отчетов", caption: "по дням", items: [["Пн", 4], ["Вт", 7], ["Ср", 5], ["Чт", 8], ["Пт", 6], ["Сб", 2], ["Вс", 1]] }
    ],
    heatmap: reportsHeatmap(state),
    attentionItems: [
      { title: "6 отчетов требуют проверки", text: "Есть спорные результаты и низкая достоверность ответов.", status: "bad", target: "Отчеты:Проверка" },
      { title: "2 отчета без PDF", text: "Нужно сформировать экспорт для руководителя.", status: "neutral", target: "Отчеты:PDF" }
    ],
    table: reportsTableConfig(state)
  });
}

export function renderSupport() {
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Поддержка</span>
          <h1 class="elt-page-title">Помощь и заявки</h1>
          <p class="elt-page-subtitle">Срочные заявки рассматриваются быстрее, предложения по улучшению попадают в продуктовый backlog.</p>
        </div>
      </div>
      <div class="elt-support-grid">
        <div class="elt-support-cards">
          <div class="elt-card elt-support-card elt-support-urgent">
            <div class="elt-support-badge">Срочная заявка</div>
            <h2>Критичная проблема</h2>
            <p>Если не открывается оценка, не формируется отчет, списались оценки или не работает доступ.</p>
            <div class="elt-support-sla">Срок: в течение суток</div>
            <button class="elt-btn-primary">Оставить срочную заявку</button>
          </div>
          <div class="elt-card elt-support-card">
            <div class="elt-support-badge elt-support-badge-neutral">Обычная заявка</div>
            <h2>Вопрос по сервису</h2>
            <p>Настройки, тарифы, ссылки, отчеты, личный кабинет, работа с кандидатами и сотрудниками.</p>
            <div class="elt-support-sla">Срок: в рабочем порядке</div>
            <button class="elt-btn-secondary">Оставить заявку</button>
          </div>
          <div class="elt-card elt-support-card">
            <div class="elt-support-badge elt-support-badge-idea">Предложение</div>
            <h2>Улучшение сервиса</h2>
            <p>Идеи по новым отчетам, профилям, графикам, интеграциям или логике оценки.</p>
            <div class="elt-support-sla">Срок: 1–30 рабочих дней</div>
            <button class="elt-btn-ghost">Предложить улучшение</button>
          </div>
        </div>
        <div class="elt-card elt-support-form">
          <div class="elt-card-head"><h2>Форма обращения</h2></div>
          <div class="elt-form-grid">
            <label class="elt-label">Тип обращения<select class="elt-select"><option>Срочная заявка</option><option>Обычная заявка</option><option>Предложение по улучшению</option></select></label>
            <label class="elt-label">Тема<input class="elt-input" placeholder="Коротко опишите вопрос"></label>
            <label class="elt-label elt-label-full">Описание<textarea class="elt-textarea" placeholder="Что произошло, кого касается, какой ожидаемый результат"></textarea></label>
            <div><button class="elt-btn-primary">Отправить обращение</button></div>
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
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Благодарности</span>
          <h1 class="elt-page-title">Люди и компании, которые помогают развивать Эльтеру</h1>
          <p class="elt-page-subtitle">Идеи клиентов, HR-экспертов и собственников, которые стали частью продукта или находятся в разработке.</p>
        </div>
        <div class="elt-page-actions">
          <button class="elt-btn-primary">Предложить улучшение</button>
        </div>
      </div>
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

export function renderTariffs(state, tariffs) {
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Тарифы</span>
          <h1 class="elt-page-title">Функции по тарифам</h1>
          <p class="elt-page-subtitle">Start — текущий базовый доступ за 990 ₽ / 20 оценок. Для смены доступны TalentCheck, TalentPro и TalentStudio.</p>
        </div>
      </div>
      <div class="elt-tariff-grid">${tariffs.map((tariff) => renderTariffCard(tariff, true)).join('')}</div>
    </div>
  `;
}

export function renderReferrals(state) {
  const maxAssessments = Math.floor(state.referrals.available / state.company.assessmentPrice);
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Реферальная программа</span>
          <h1 class="elt-page-title">10% от каждой оплаты приглашенной компании</h1>
          <p class="elt-page-subtitle">1 бонус = 1 ₽. Бонусы можно потратить внутри платформы или вывести на карту через заявку.</p>
        </div>
      </div>
      <div class="elt-referral-top">
        <div class="elt-card elt-referral-link-card">
          <div class="elt-card-head"><h2>Моя реферальная ссылка</h2></div>
          <code class="elt-code elt-code-block">${location.origin}${location.pathname}#/ref/roman123</code>
          <div class="elt-row-actions">
            <button class="elt-btn-secondary" data-action="copy-ref">Скопировать</button>
            <button class="elt-btn-ghost">Поделиться</button>
            <button class="elt-btn-ghost" data-action="open-bonus-modal">Потратить бонусы</button>
            <button class="elt-btn-ghost" data-action="open-withdraw-modal">Вывести на карту</button>
          </div>
        </div>
        <div class="elt-kpi-row">
          <div class="elt-kpi"><div class="elt-kpi-val">${state.referrals.available.toLocaleString('ru-RU')} ₽</div><div class="elt-kpi-label">Доступно бонусов</div><div class="elt-kpi-caption">${maxAssessments} оценок</div></div>
          <div class="elt-kpi"><div class="elt-kpi-val">${state.referrals.accrued.toLocaleString('ru-RU')} ₽</div><div class="elt-kpi-label">Начислено всего</div><div class="elt-kpi-caption">10% от оплат</div></div>
          <div class="elt-kpi"><div class="elt-kpi-val">${state.referrals.spent.toLocaleString('ru-RU')} ₽</div><div class="elt-kpi-label">Потрачено</div><div class="elt-kpi-caption">на оценки</div></div>
          <div class="elt-kpi"><div class="elt-kpi-val">${state.referrals.withdrawn.toLocaleString('ru-RU')} ₽</div><div class="elt-kpi-label">Выведено</div><div class="elt-kpi-caption">на карту</div></div>
          <div class="elt-kpi"><div class="elt-kpi-val">${state.referrals.invited}</div><div class="elt-kpi-label">Приглашено</div><div class="elt-kpi-caption">компании</div></div>
          <div class="elt-kpi"><div class="elt-kpi-val">${state.referrals.paid}</div><div class="elt-kpi-label">Оплачивают</div><div class="elt-kpi-caption">компании</div></div>
        </div>
      </div>
      <div class="elt-referral-tables">
        <div class="elt-table-panel">
          <div class="elt-table-head"><h2>Приглашенные компании</h2><span class="elt-card-caption">начисление с каждой оплаты</span></div>
          <div class="elt-table-wrap"><table class="elt-table"><thead><tr><th>Компания</th><th>Дата</th><th>Сумма оплат</th><th>Бонусы</th><th>Статус</th></tr></thead><tbody>${[['Север IT','02.06.2026','89 700 ₽','8 970 ₽','платит'],['ХР Project','30.05.2026','38 700 ₽','3 870 ₽','платит'],['Альфа Ритейл','28.05.2026','12 900 ₽','1 290 ₽','новая']].map((row) => `<tr>${row.map((cell, i) => `<td>${i === 4 ? `<span class="elt-status-badge elt-status-completed">${cell}</span>` : cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        </div>
        <div class="elt-table-panel">
          <div class="elt-table-head"><h2>История операций</h2><span class="elt-card-caption">бонусы</span></div>
          <div class="elt-table-wrap"><table class="elt-table"><thead><tr><th>Дата</th><th>Операция</th><th>Основание</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>${state.referrals.operations.map((row, index) => `<tr><td>${new Date(Date.now() - index * 86400000).toLocaleDateString('ru-RU')}</td>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        </div>
        <div class="elt-table-panel">
          <div class="elt-table-head"><h2>Заявки на вывод</h2><span class="elt-card-caption">резерв бонусов</span></div>
          <div class="elt-table-wrap"><table class="elt-table"><thead><tr><th>Сумма</th><th>Карта</th><th>Получатель</th><th>Статус</th></tr></thead><tbody>${state.referrals.withdrawals.map((item) => `<tr><td>${item.amount.toLocaleString('ru-RU')} ₽</td><td>${item.card}</td><td>${item.name}</td><td><span class="elt-status-badge elt-status-pending">${item.status}</span></td></tr>`).join('') || `<tr><td colspan="4" style="color:#8899BB">Заявок пока нет.</td></tr>`}</tbody></table></div>
        </div>
      </div>
    </div>
  `;
}

export function renderApiKeys(state) {
  const apiKeyId = `elt_live_${state.company.inn || 'demo'}_01`;
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Интеграции</span>
          <h1 class="elt-page-title">API-ключи, webhooks и JSON-файлы</h1>
          <p class="elt-page-subtitle">Подключение сайта, CRM, ATS, HRM и внешних форм оценки. В MVP показана структура для backend-интеграции.</p>
        </div>
        <div class="elt-page-actions">
          <button class="elt-btn-primary">Создать API-ключ</button>
        </div>
      </div>
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
  const studioLocked = state.company.tariff !== 'TalentStudio';
  const lockAttr = studioLocked ? `data-open-locked="Настройки интерфейса и уведомлений доступны на тарифе TalentStudio."` : '';
  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Настройки</span>
          <h1 class="elt-page-title">Настройки компании</h1>
          <p class="elt-page-subtitle">Юридические данные, контактное лицо, логотип, уведомления и часовой пояс. Подготовлено для backend-интеграции.</p>
        </div>
      </div>
      <div class="elt-settings-grid">
        <div class="elt-card">
          <div class="elt-card-head"><h2>Компания</h2></div>
          <div class="elt-form-grid">
            <label class="elt-label">Название<input class="elt-input" value="${state.company.name}"></label>
            <label class="elt-label">ИНН<input class="elt-input" value="${state.company.inn}"></label>
            <label class="elt-label">КПП<input class="elt-input" value="${state.company.kpp}"></label>
            <label class="elt-label">Официальный сайт<input class="elt-input" value="${state.company.site}"></label>
            <label class="elt-label">Email для отчетов<input class="elt-input" value="${state.company.reportEmail}"></label>
            <label class="elt-label">Телефон<input class="elt-input" value="${state.company.phone}"></label>
            <label class="elt-label elt-label-full">Юридический адрес<input class="elt-input" value="${state.company.legalAddress}"></label>
            <label class="elt-label elt-label-full">Фактический адрес<input class="elt-input" value="${state.company.actualAddress}"></label>
            <div><button class="elt-btn-primary">Сохранить</button></div>
          </div>
        </div>
        <div class="elt-card">
          <div class="elt-card-head"><h2>Контактное лицо</h2></div>
          <div class="elt-form-grid">
            <label class="elt-label">Фамилия<input class="elt-input" value="${state.company.contactLastName}"></label>
            <label class="elt-label">Имя<input class="elt-input" value="${state.company.contactFirstName}"></label>
            <label class="elt-label">Отчество<input class="elt-input" value="${state.company.contactPatronymic}"></label>
            <label class="elt-label">Телефон<input class="elt-input" value="${state.company.contactPhone}"></label>
            <label class="elt-label">Email<input class="elt-input" value="${state.company.contactEmail}"></label>
            <div><button class="elt-btn-primary">Сохранить</button></div>
          </div>
        </div>
        <div class="elt-card ${studioLocked ? 'elt-card-locked' : ''}" ${lockAttr}>
          <div class="elt-card-head"><h2>Интерфейс</h2>${studioLocked ? '<span class="elt-lock-badge">TalentStudio</span>' : ''}</div>
          <div class="elt-form-grid">
            <label class="elt-label">Логотип компании<input class="elt-input" type="file"></label>
            <label class="elt-label">Часовой пояс<select class="elt-select"><option>Europe/Moscow</option></select></label>
            <label class="elt-label">Язык интерфейса<select class="elt-select"><option>Русский</option></select></label>
            <div><button class="elt-btn-ghost">Загрузить логотип</button></div>
          </div>
        </div>
        <div class="elt-card ${studioLocked ? 'elt-card-locked' : ''}" ${lockAttr}>
          <div class="elt-card-head"><h2>Уведомления</h2>${studioLocked ? '<span class="elt-lock-badge">TalentStudio</span>' : ''}</div>
          <div class="elt-form-grid">
            <label class="elt-label">Email-уведомления<select class="elt-select"><option>Включены</option></select></label>
            <label class="elt-label">Telegram<select class="elt-select"><option>Отправлять отчет после заполнения</option></select></label>
            <label class="elt-label">Webhook<select class="elt-select"><option>Позже</option></select></label>
            <div><button class="elt-btn-primary">Сохранить</button></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderCandidateAssessment(link, profession, questions, answers, competencyTitleById) {
  if (!link) return `<div class="candidatePage"><div class="candidateCard"><h1>Ссылка недействительна</h1><p>Ссылка отменена, истекла или не найдена.</p><a class="blueButton" href="#/">На главную</a></div></div>`;
  return `
    <div class="candidatePage"><header class="candidateHeader"><img src="/assets/eltera_logo_horizontal_on_light.svg" alt="Eltera"></header><main class="candidateCard"><span class="miniLabel">${link.recipientType}</span><h1>${profession.title}</h1><p>Заполните данные и ответьте на вопросы. Компания получит отчет после завершения оценки.</p><form class="candidateForm" data-candidate-form><label>ФИО<input name="fullName" required value="${link.fullName || ""}" placeholder="Иванов Иван"></label><label>Телефон<input name="phone" value="${link.phone || ""}" placeholder="+7..."></label><label>Email<input name="email" value="${link.email || ""}" placeholder="name@example.com"></label><label>Город<input name="city" placeholder="Москва"></label><label class="checkboxLine"><input type="checkbox" required><span>Согласен на обработку персональных данных</span></label><div class="questionList compact">${questions.map((question, index) => `<article class="questionCard"><div class="questionHead"><span>${competencyTitleById[question.competencyId] || question.competencyId}</span><b>${index + 1}/${questions.length}</b></div><h3>${question.text}</h3><div class="answers">${question.answers.map((answer, answerIndex) => `<label class="answer"><input type="radio" required name="${question.id}" value="${answerIndex}" ${answers[question.id] === answerIndex ? "checked" : ""}><span>${answer.text}</span></label>`).join("")}</div></article>`).join("")}</div><button class="blueButton wide" type="submit">Завершить оценку</button></form></main></div>
  `;
}

export function renderCandidateThanks() {
  return `<div class="candidatePage"><main class="candidateCard thanks"><img src="/assets/eltera_app_icon_4bars_glow.png" alt=""><h1>Спасибо, оценка завершена</h1><p>Результаты переданы компании. Внутренний отчет, рекомендации и красные флаги доступны только ответственному HR или руководителю.</p><a class="blueButton" href="#/">На сайт Eltera</a></main></div>`;
}

function renderModal(state) {
  const mHead = (title, icon = '') => `<div class="modal-head"><div class="modal-head-left">${icon ? `<span class="modal-head-icon">${icon}</span>` : ''}<h2 class="modal-head-title">${title}</h2></div><button class="modal-close-btn" data-action="close-modal" title="Закрыть"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`;

  if (state.modal?.type === "list") {
    const [scope, metricName] = state.modal.target.split(":");
    const people = peopleForModal(state, scope, metricName);
    const icons = { 'Кандидаты': '👤', 'Сотрудники': '🏢', 'Вакансии': '📋', 'Отчеты': '📊' };
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead(`${scope}: ${metricName}`, icons[scope] || '📊')}<div class="modal-inner">${renderPeopleTable(people, scope)}</div></div></div>`;
  }
  if (state.modal?.type === "card") {
    const item = findPerson(state, state.modal.id);
    return `<div class="modalBackdrop"><div class="modal">${mHead('Карточка участника', '👤')}<div class="modal-inner">${personCard(item)}</div></div></div>`;
  }
  if (state.modal?.type === "answers") {
    const item = findPerson(state, state.modal.id);
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead('Ответы участника', '📝')}<div class="modal-inner"><p class="modal-subtitle">${personName(item)} · ${item?.professionTitle || item?.position || 'оценка'}</p><div class="answersPreview">${["Берет ответственность за результат", "Уточняет ожидания руководителя", "Фиксирует договоренности", "Просит обратную связь", "Видит риски до дедлайна"].map((text, index) => `<div><span>${index + 1}</span><b>${text}</b><em>${index % 2 ? 'Средний уровень проявления' : 'Сильное проявление'}</em></div>`).join('')}</div></div></div></div>`;
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
  if (state.modal === "spendBonuses") {
    const max = Math.floor(state.referrals.available / state.company.assessmentPrice);
    return `<div class="modalBackdrop"><div class="modal">${mHead('Потратить бонусы', '🎁')}<div class="modal-inner"><p class="modal-subtitle">Доступно: ${state.referrals.available.toLocaleString('ru-RU')} бонусов. 1 оценка = ${state.company.assessmentPrice} ₽.</p><div class="bonusOptions"><button class="blueButton" data-buy-bonus-assessments="${max}">Докупить ${max} оценок</button><button class="button subtle">Компенсировать часть тарифа</button><button class="button subtle">Оплатить тариф бонусами</button></div></div></div></div>`;
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
  const stageColor = (s) => {
    if (!s) return '';
    const sl = s.toLowerCase();
    if (sl.includes('подход') || sl.includes('интервью') || sl.includes('оффер') || sl.includes('норма')) return 'modal-badge-good';
    if (sl.includes('не подход') || sl.includes('риск') || sl.includes('отказ')) return 'modal-badge-bad';
    return 'modal-badge-neutral';
  };
  const scoreColor = (v) => {
    const n = Number(v);
    if (n >= 75) return 'modal-score-good';
    if (n >= 55) return 'modal-score-medium';
    return 'modal-score-bad';
  };
  return `<table><thead><tr><th>ФИО</th><th>Вакансия / должность</th><th>Балл</th><th>Соответствие</th><th>Дата</th><th>Действия</th></tr></thead><tbody>${people.map((item) => {
    const score = item.result?.percent || item.fit || 0;
    const stage = item.stage || item.recommendation || '';
    const date = item.completedAt ? new Date(item.completedAt).toLocaleDateString('ru-RU') : (item.startDate || '—');
    const isEmp = item.id?.startsWith('emp-');
    return `<tr><td class="modal-td-name">${personName(item)}</td><td class="modal-td-role">${item.vacancy || item.position || item.professionTitle || '—'}</td><td><span class="modal-score ${scoreColor(score)}">${score}%</span></td><td><span class="modal-badge ${stageColor(stage)}">${stage}</span></td><td class="modal-td-date">${date}</td><td><div class="rowActions">${!isEmp ? `<button class="button subtle" data-report-id="${item.id}">PDF</button>` : `<button class="button subtle" data-open-card="${item.id}">PDF</button>`}<button class="button subtle" data-open-card="${item.id}">Карточка</button><button class="button subtle" data-open-answers="${item.id}">Ответы</button></div></td></tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:rgba(230,242,255,.35)">Нет данных для выбранного фильтра.</td></tr>`}</tbody></table>`;
}

function renderEmployeeTable(employees) {
  return `<table><thead><tr><th>ФИО</th><th>Должность</th><th>Отдел</th><th>Риск</th><th>Удовлетворенность</th><th>Действия</th></tr></thead><tbody>${employees.map((item) => `<tr><td>${item.fullName}</td><td>${item.position}</td><td>${item.department}</td><td>${item.turnoverRisk}</td><td>${item.satisfaction}%</td><td><div class="rowActions"><button class="button subtle" data-open-card="${item.id}">Карточка</button><button class="button subtle" data-open-answers="${item.id}">Ответы</button></div></td></tr>`).join("")}</tbody></table>`;
}

function renderReportTable(state) {
  const completed = state.sessions.filter((item) => item.status === "completed");
  return `<table><thead><tr><th>Дата</th><th>Тип</th><th>ФИО / группа</th><th>Вакансия / отдел</th><th>Статус</th><th>Доступ</th></tr></thead><tbody>${completed.map((session) => `<tr><td>${new Date(session.completedAt).toLocaleDateString("ru-RU")}</td><td>${session.person.assessmentType}</td><td>${session.person.fullName}</td><td>${session.vacancy || session.professionTitle}</td><td><span class="status completed">${session.result.recommendation}</span></td><td><div class="rowActions"><button class="button subtle" data-report-id="${session.id}">PDF</button><button class="button subtle" data-open-answers="${session.id}">Ответы</button><button class="button subtle" data-open-card="${session.id}">Открыть</button></div></td></tr>`).join("") || `<tr><td colspan="6">Готовых отчетов пока нет.</td></tr>`}</tbody></table>`;
}

function renderTariffCard(tariff, inApp = false) {
  const accentColor = tariff.highlight ? '#00E5D4' : '#1E5BFF';
  const borderStyle = tariff.highlight ? 'border-color:rgba(0,229,212,.4);' : '';
  return `
    <div class="elt-card elt-tariff-card" style="${borderStyle}">
      <div class="elt-tariff-tag" style="color:${accentColor}">${tariff.tag}</div>
      <div class="elt-tariff-name">${tariff.name}</div>
      <div class="elt-tariff-price">${tariff.price}</div>
      <p class="elt-tariff-desc">${tariff.description}</p>
      <ul class="elt-tariff-features">${tariff.features.map((f) => `<li>${f}</li>`).join('')}</ul>
      ${tariff.locked?.length ? `<div class="elt-tariff-locked"><span>Не входит:</span><div class="elt-tariff-locked-tags">${tariff.locked.map((item) => `<em>${item}</em>`).join('')}</div></div>` : ''}
      <button class="elt-btn-primary elt-btn-wide" ${inApp ? `data-select-tariff="${tariff.name}"` : `data-route="login"`}>${tariff.cta}</button>
    </div>
  `;
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
  return {
    title: "Состояние отделов",
    columns,
    rows: state.departments.map((dept, rowIndex) => ({
      label: dept.name,
      cells: columns.map((column, index) => {
        const riskMetric = /Выгорание|Риск/.test(column);
        const value = riskMetric ? Math.max(18, dept.risk * 12 + index * 3) : Math.max(52, 88 - dept.risk * 7 - rowIndex * 3 + index);
        return {
          value: `${value}%`,
          caption: riskMetric ? "риск" : "уровень",
          status: riskMetric ? getRiskStatus(value) : getFitStatus(value),
          target: `Сотрудники:${dept.name} ${column}`
        };
      })
    }))
  };
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
      `${item.status === "completed" ? "пройдена" : "отправлена"} · ${item.result.percent}`,
      StatusBadge(`${item.result.percent}%`, getFitStatus(item.result.percent)),
      StatusBadge(item.result.redFlags ? "средний" : "низкий", item.result.redFlags ? "medium" : "good"),
      new Date(item.completedAt).toLocaleDateString("ru-RU"),
      "Рекрутер",
      ActionButtonGroup([
        { label: "Карточка", attrs: `data-open-card="${item.id}"` },
        { label: "PDF", attrs: `data-report-id="${item.id}"` },
        { label: "Ответы", attrs: `data-open-answers="${item.id}"` },
        { label: "Интервью", attrs: `data-open-card="${item.id}"` }
      ])
    ])
  };
}

function employeesTableConfig(employees) {
  return {
    title: "Таблица сотрудников",
    caption: "риски, оценка, ответы и рекомендации",
    columns: ["Сотрудник", "Отдел", "Руководитель", "Тип", "Соответствие", "Риск", "Рекомендация", "Действия"],
    rows: employees.map((item) => [
      EmployeePreview(item),
      item.department,
      item.manager,
      item.position.includes("Руководитель") ? "руководитель" : item.startDate > "2026-03-01" ? "новый" : "офисный",
      StatusBadge(`${item.fit}%`, getFitStatus(item.fit)),
      StatusBadge(item.turnoverRisk, item.turnoverRisk === "низкий" ? "good" : item.turnoverRisk === "средний" ? "medium" : "bad"),
      item.recommendation,
      ActionButtonGroup([
        { label: "Карточка", attrs: `data-open-card="${item.id}"` },
        { label: "PDF", attrs: `data-open-card="${item.id}"` },
        { label: "Ответы", attrs: `data-open-answers="${item.id}"` }
      ])
    ])
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

function reportsTableConfig(state) {
  const completed = state.sessions.filter((item) => item.status === "completed");
  return {
    title: "Реестр отчетов",
    caption: "PDF, ответы и карточка доступны из строки",
    columns: ["Дата", "Тип", "ФИО / группа", "Вакансия / отдел", "Статус", "Действия"],
    rows: completed.map((session) => [
      new Date(session.completedAt).toLocaleDateString("ru-RU"),
      session.person.assessmentType,
      session.person.fullName,
      session.vacancy || session.professionTitle,
      StatusBadge(session.result.recommendation, session.result.percent >= 80 ? "good" : session.result.percent >= 60 ? "medium" : "bad"),
      ActionButtonGroup([
        { label: "PDF", attrs: `data-report-id="${session.id}"` },
        { label: "Ответы", attrs: `data-open-answers="${session.id}"` },
        { label: "Открыть", attrs: `data-open-card="${session.id}"` }
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
  if (scope === "Сотрудники" || scope === "Адаптация" || scope === "Оценка 360" || scope === "Performance Review") {
    const people = employeesToPeople(state.employees);
    if (metricName.includes("риск") || metricName.includes("Выгорание") || metricName.includes("В зоне")) return people.filter((item) => item.fit < 72);
    return people;
  }
  const candidates = state.sessions.filter((x) => x.person.assessmentType === "Кандидат");
  if (metricName.includes("Подход")) return candidates.filter((item) => item.result.percent >= 68);
  if (metricName.includes("Не подход")) return candidates.filter((item) => item.result.percent < 55);
  if (metricName.includes("Интервью")) return candidates.filter((item) => item.stage === "Интервью" || item.result.percent >= 68);
  return candidates;
}

function findPerson(state, id) {
  return state.sessions.find((item) => item.id === id) || employeesToPeople(state.employees).find((item) => item.id === id) || { id, fullName: id, position: "Отдел", recommendation: "Открыть подробную карточку после подключения backend." };
}

function personName(item) {
  return item?.person?.fullName || item?.fullName || "Участник";
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
      <button class="elt-upgrade-btn${isTop ? ' elt-upgrade-btn-teal' : ' elt-upgrade-btn-blue'}" data-select-tariff="${t.id}">Перейти на ${t.name}</button>
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
