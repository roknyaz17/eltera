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

export function renderLanding(tariffs) {
  return `
    <div class="landing landing--v3">
      <!-- NAVBAR -->
      <header class="lv3-nav" id="lv3Nav">
        <a class="lv3-logo" href="#/">
          <img src="/public/assets/eltera_logo_main.png?v=1" alt="Eltera" style="height:52px;width:auto;object-fit:contain;display:block;mix-blend-mode:screen;filter:brightness(1.1);">
        </a>
        <nav class="lv3-navlinks">
          <a href="#lv3-how">Как работает</a>
          <div class="lv3-dropdown">
            <button class="lv3-dropbtn">Продукты <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></button>
            <div class="lv3-dropmenu">
              <a href="#lv3-assess">Оценка кандидатов и сотрудников</a>
              <a href="#lv3-360">Оценка 360</a>
              <a href="#lv3-engage">Оценка вовлечённости</a>
              <a href="#lv3-pulse">Пульс-опросы</a>
              <a href="#lv3-perf">Performance review</a>
            </div>
          </div>
          <a href="#lv3-cases">Кейсы</a>
          <a href="#lv3-reports">Отчёты</a>
          <a href="#lv3-pricing">Тарифы</a>
          <a href="#lv3-implement">Внедрение</a>
        </nav>
        <div class="lv3-navactions">
          <button class="lv3-btn-ghost" data-route="login">Войти</button>
        </div>
        <button class="lv3-burger" id="lv3Burger" aria-label="Меню">
          <span></span><span></span><span></span>
        </button>
      </header>
      <!-- MOBILE NAV -->
      <nav class="lv3-mobile-nav" id="lv3MobileNav">
        <a href="#lv3-how" class="lv3-mobile-link">Как работает</a>
        <a href="#lv3-assess" class="lv3-mobile-link">Оценка кандидатов и сотрудников</a>
        <a href="#lv3-360" class="lv3-mobile-link">Оценка 360</a>
        <a href="#lv3-engage" class="lv3-mobile-link">Оценка вовлечённости</a>
        <a href="#lv3-pulse" class="lv3-mobile-link">Пульс-опросы</a>
        <a href="#lv3-perf" class="lv3-mobile-link">Performance review</a>
        <div class="lv3-mobile-divider"></div>
        <a href="#lv3-cases" class="lv3-mobile-link">Кейсы</a>
        <a href="#lv3-reports" class="lv3-mobile-link">Отчёты</a>
        <a href="#lv3-pricing" class="lv3-mobile-link">Тарифы</a>
        <a href="#lv3-implement" class="lv3-mobile-link">Внедрение</a>
        <div class="lv3-mobile-divider"></div>
        <button class="lv3-mobile-cta" data-route="login">Попробовать за 990 ₽</button>
      </nav>

      <!-- HERO -->
      <section class="lv3-hero" id="lv3-hero">
        <div class="lv3-hero-bg">
          <canvas class="lv3-particles" id="lv3Particles"></canvas>
          <div class="lv3-hero-orb lv3-hero-orb--1"></div>
          <div class="lv3-hero-orb lv3-hero-orb--2"></div>
          <div class="lv3-hero-orb lv3-hero-orb--3"></div>
          <div class="lv3-hero-grid"></div>
        </div>
        <div class="lv3-hero-content">
          <div class="lv3-hero-left">
            <div class="lv3-pill lv3-fade" style="--d:.05s">❖ AI-платформа для оценки кандидатов и сотрудников</div>
            <h1 class="lv3-fade" style="--d:.12s">
              <span class="lv3-grad-purple">AI-оценка</span><br>
              <span class="lv3-grad-white">кандидатов и сотрудников</span><br>
              <span class="lv3-grad">за 5 минут</span>
            </h1>
            <p class="lv3-fade" style="--d:.22s">Понимайте, кого брать, кого развивать
и где есть риски — без сложных тестов
и бесплатных демо-доступов.</p>
            <div class="lv3-hero-btns lv3-fade" style="--d:.32s">
              <button class="lv3-btn-primary lv3-btn-lg" data-route="login">Попробовать за 990 ₽ →</button>
              <button class="lv3-btn-ghost lv3-btn-lg" data-demo-assessment>Пройти демо-оценку</button>
            </div>
            <div class="lv3-hero-meta lv3-fade" style="--d:.42s">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="rgba(230,242,255,0.3)" stroke-width="1"/><path d="M7 4v3.5l2 1.5" stroke="rgba(230,242,255,0.4)" stroke-width="1.2" stroke-linecap="round"/></svg>
              Первая оценка — за 5 минут
            </div>
          </div>
          <div class="lv3-hero-right lv3-fade" style="--d:.18s">
            <!-- HERO CARD SLIDER -->
            <div class="lv3-hslider" id="lv3HSlider">
              <!-- Slide 1: Оценка кандидата -->
              <div class="lv3-hslide lv3-hslide--active" data-slide="0">
                <div class="lv3-hcard">
                  <div class="lv3-hcard-header">
                    <div class="lv3-hcard-title">Оценка кандидата</div>
                    <span class="lv3-live-dot"><span class="lv3-pulse"></span>Live</span>
                  </div>
                  <div class="lv3-hcard-person">
                    <div class="lv3-hcard-avatar lv3-hcard-avatar--photo">
                      <img src="/public/assets/org/candidate_f.jpg" alt="Екатерина Лебедева" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(30,91,255,0.5);">
                    </div>
                    <div>
                      <div class="lv3-hcard-name">Екатерина Лебедева</div>
                      <div class="lv3-hcard-sub">Менеджер по подбору · ID: 7a-4fi-21</div>
                    </div>
                  </div>
                  <div class="lv3-hcard-metrics">
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Соответствие профилю</span><b>84%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:84%;background:linear-gradient(90deg,#1E5BFF,#00E5D4)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Ответственность</span><b>91%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:91%;background:linear-gradient(90deg,#7B61FF,#1E5BFF)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Коммуникация</span><b>78%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:78%;background:linear-gradient(90deg,#00E5D4,#1E5BFF)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Риск выгорания</span><b class="lv3-status-good">— низкий</b></div>
                    </div>
                  </div>
                  <div class="lv3-hcard-ai">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00E5D4" stroke-width="1.2"/><path d="M5 7l1.5 1.5L9 5" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>AI: Кандидат подходит для следующего этапа</span>
                  </div>
                </div>
              </div>
              <!-- Slide 2: Оценка сотрудника -->
              <div class="lv3-hslide" data-slide="1">
                <div class="lv3-hcard">
                  <div class="lv3-hcard-header">
                    <div class="lv3-hcard-title">Оценка сотрудника</div>
                    <span class="lv3-live-dot"><span class="lv3-pulse"></span>Live</span>
                  </div>
                  <div class="lv3-hcard-person">
                    <div class="lv3-hcard-avatar lv3-hcard-avatar--photo">
                      <img src="/public/assets/org/anna.jpg" alt="Анна Козлова" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(30,91,255,0.5);">
                    </div>
                    <div>
                      <div class="lv3-hcard-name">Анна Козлова</div>
                      <div class="lv3-hcard-sub">Руководитель группы · Отдел продаж</div>
                    </div>
                  </div>
                  <div class="lv3-hcard-metrics">
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Результативность</span><b>88%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:88%;background:linear-gradient(90deg,#1E5BFF,#00E5D4)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Вовлечённость</span><b>74%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:74%;background:linear-gradient(90deg,#7B61FF,#1E5BFF)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Потенциал роста</span><b class="lv3-status-good">высокий</b></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Риск увольнения</span><b class="lv3-status-warn">средний</b></div>
                    </div>
                  </div>
                  <div class="lv3-hcard-ai">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00E5D4" stroke-width="1.2"/><path d="M5 7l1.5 1.5L9 5" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>AI: Нужен план развития и контроль нагрузки</span>
                  </div>
                </div>
              </div>
              <!-- Slide 3: 9-box -->
              <div class="lv3-hslide" data-slide="2">
                <div class="lv3-hcard">
                  <div class="lv3-hcard-header">
                    <div class="lv3-hcard-title">9-box · Матрица потенциала</div>
                    <span class="lv3-live-dot"><span class="lv3-pulse"></span>Live</span>
                  </div>
                  <div class="lv3-9box-wrap">
                    <div class="lv3-9box-y-label">Потенциал</div>
                    <div class="lv3-9box-main">
                      <div class="lv3-9box-grid">
                        <!-- Row 3 (high potential) -->
                        <div class="lv3-9box-cell lv3-9box-cell--low" title="Знак" ><span>Знак</span></div>
                        <div class="lv3-9box-cell lv3-9box-cell--mid" title="Перспективный"><span>Перспективный</span></div>
                        <div class="lv3-9box-cell lv3-9box-cell--star" title="Звезда"><span>★ Звезда</span></div>
                        <!-- Row 2 (mid potential) -->
                        <div class="lv3-9box-cell lv3-9box-cell--risk" title="Риск"><span>Риск</span></div>
                        <div class="lv3-9box-cell lv3-9box-cell--mid lv3-9box-cell--active" title="Стабильный"><span>● Стабильный</span></div>
                        <div class="lv3-9box-cell lv3-9box-cell--high" title="Высокий"><span>Высокий</span></div>
                        <!-- Row 1 (low potential) -->
                        <div class="lv3-9box-cell lv3-9box-cell--danger" title="Увольнение"><span>Увольнение</span></div>
                        <div class="lv3-9box-cell lv3-9box-cell--low" title="Исполнитель"><span>Исполнитель</span></div>
                        <div class="lv3-9box-cell lv3-9box-cell--mid" title="Сильный"><span>Сильный</span></div>
                      </div>
                      <div class="lv3-9box-x-label">Результативность</div>
                    </div>
                  </div>
                  <div class="lv3-9box-legend">
                    <div class="lv3-9box-legend-item"><span class="lv3-9box-dot lv3-9box-dot--star"></span>Звезды (3)</div>
                    <div class="lv3-9box-legend-item"><span class="lv3-9box-dot lv3-9box-dot--high"></span>Высокие (5)</div>
                    <div class="lv3-9box-legend-item"><span class="lv3-9box-dot lv3-9box-dot--risk"></span>Риск (2)</div>
                  </div>
                  <div class="lv3-hcard-ai">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00E5D4" stroke-width="1.2"/><path d="M5 7l1.5 1.5L9 5" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>AI: 3 сотрудника готовы к росту, 2 требуют внимания</span>
                  </div>
                </div>
              </div>
              <!-- Slide 4: Сотрудник с потенциалом -->
              <div class="lv3-hslide" data-slide="3">
                <div class="lv3-hcard">
                  <div class="lv3-hcard-header">
                    <div class="lv3-hcard-title">Анализ сотрудника</div>
                    <span class="lv3-live-dot"><span class="lv3-pulse"></span>Live</span>
                  </div>
                  <div class="lv3-hcard-person">
                    <div class="lv3-hcard-avatar lv3-hcard-avatar--photo">
                      <img src="/public/assets/org/dmitry.jpg" alt="Дмитрий Волков" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,229,212,0.5);">
                    </div>
                    <div>
                      <div class="lv3-hcard-name">Дмитрий Волков</div>
                      <div class="lv3-hcard-sub">Аналитик по данным · Отдел аналитики</div>
                    </div>
                  </div>
                  <div class="lv3-hcard-metrics">
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Результативность</span><b>79%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:79%;background:linear-gradient(90deg,#1E5BFF,#00E5D4)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Вовлечённость</span><b>61%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:61%;background:linear-gradient(90deg,#7B61FF,#1E5BFF)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Потенциал роста</span><b class="lv3-status-good">высокий</b></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Риск ухода</span><b class="lv3-status-warn">средний</b></div>
                    </div>
                  </div>
                  <div class="lv3-hcard-ai">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00E5D4" stroke-width="1.2"/><path d="M5 7l1.5 1.5L9 5" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>AI: Предложить повышение — высокий потенциал, риск ухода снизится</span>
                  </div>
                </div>
              </div>
              <!-- Slide 5: Групповая оценка -->
              <div class="lv3-hslide" data-slide="4">
                <div class="lv3-hcard">
                  <div class="lv3-hcard-header">
                    <div class="lv3-hcard-title">Групповая оценка</div>
                    <span class="lv3-live-dot"><span class="lv3-pulse"></span>Live</span>
                  </div>
                  <div class="lv3-hcard-person">
                    <div class="lv3-hcard-avatar lv3-hcard-avatar--group">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div>
                      <div class="lv3-hcard-name">Отдел продаж</div>
                      <div class="lv3-hcard-sub">12 сотрудников</div>
                    </div>
                  </div>
                  <div class="lv3-hcard-metrics">
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Ср. соответствие профилю</span><b>76%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:76%;background:linear-gradient(90deg,#1E5BFF,#00E5D4)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Риск текучести</span><b class="lv3-status-warn">31%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:31%;background:linear-gradient(90deg,#E8A55A,#C28A3A)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Сильные зоны</span><b>коммуникация</b></div>
                    </div>
                  </div>
                  <div class="lv3-hcard-ai">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00E5D4" stroke-width="1.2"/><path d="M5 7l1.5 1.5L9 5" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>AI: Работать над ответственностью и стабильностью</span>
                  </div>
                </div>
              </div>
              <!-- Slide 6: Оценка 360 -->
              <div class="lv3-hslide" data-slide="5">
                <div class="lv3-hcard">
                  <div class="lv3-hcard-header">
                    <div class="lv3-hcard-title">Оценка 360°</div>
                    <span class="lv3-live-dot"><span class="lv3-pulse"></span>Live</span>
                  </div>
                  <div class="lv3-hcard-person">
                    <div class="lv3-hcard-avatar lv3-hcard-avatar--photo">
                      <img src="/public/assets/org/manager_m.jpg" alt="Роман Петров" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(123,97,255,0.5);">
                    </div>
                    <div>
                      <div class="lv3-hcard-name">Роман Петров</div>
                      <div class="lv3-hcard-sub">Руководитель отдела · 360°</div>
                    </div>
                  </div>
                  <div class="lv3-hcard-metrics">
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Лидерство</span><b>82%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:82%;background:linear-gradient(90deg,#7B61FF,#1E5BFF)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Коммуникация</span><b>79%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:79%;background:linear-gradient(90deg,#1E5BFF,#00E5D4)"></div></div>
                    </div>
                    <div class="lv3-hcard-metric">
                      <div class="lv3-hcard-metric-row"><span>Доверие команды</span><b>86%</b></div>
                      <div class="lv3-hbar"><div class="lv3-hbar-fill" style="--w:86%;background:linear-gradient(90deg,#00E5D4,#7B61FF)"></div></div>
                    </div>
                  </div>
                  <div class="lv3-hcard-ai">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00E5D4" stroke-width="1.2"/><path d="M5 7l1.5 1.5L9 5" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>AI: Сильный профиль, зона роста — делегирование</span>
                  </div>
                </div>
              </div>
              <!-- Slide dots -->
              <div class="lv3-hslider-dots" id="lv3HSliderDots">
                ${[0,1,2,3,4,5].map(i=>`<button class="lv3-hsdot${i===0?' lv3-hsdot--active':''}" data-hsdot="${i}"></button>`).join('')}
              </div>
            </div>
            <!-- Stats below slider -->
            <div class="lv3-hero-stats">
              <div class="lv3-hstat">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#00E5D4" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.4"/><path d="M14 8v6l4 2" stroke="#00E5D4" stroke-width="1.5" stroke-linecap="round"/></svg>
                <div><b data-count-to="40" data-count-prefix="до " data-count-suffix="%">до 40%</b><span>меньше ошибок найма</span></div>
              </div>
              <div class="lv3-hstat">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#1E5BFF" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.4"/><path d="M8 14l4 4 8-8" stroke="#1E5BFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <div><b data-count-to="5" data-count-prefix="" data-count-suffix=" минут">5 минут</b><span>на первую оценку</span></div>
              </div>
              <div class="lv3-hstat">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#7B61FF" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.4"/><path d="M9 14h10M9 10h6M9 18h8" stroke="#7B61FF" stroke-width="1.5" stroke-linecap="round"/></svg>
                <div><b data-count-to="3000" data-count-prefix="" data-count-suffix="+">3000+</b><span>профилей профессий</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TICKER -->
      <div class="lv3-ticker">
        <div class="lv3-ticker-label">ДЛЯ КОМАНД ИЗ СФЕР</div>
        <div class="lv3-ticker-track">
          <div class="lv3-ticker-inner">
            ${["Ритейл","IT","Банки","Производство","Логистика","Сервис","Контакт-центры","Девелопмент","Страхование","Фармацевтика","Агропром","Телеком"].map(s=>`<span>${s}</span>`).join("")}
            ${["Ритейл","IT","Банки","Производство","Логистика","Сервис","Контакт-центры","Девелопмент","Страхование","Фармацевтика","Агропром","Телеком"].map(s=>`<span>${s}</span>`).join("")}
          </div>
        </div>
      </div>

      <!-- FOR WHOM -->
      <!-- SHARED DUAL-BG: wraps both the tabs card and the AI card -->
      <div class="lv3-dual-bg">
        <div class="lv3-dual-bg-orbs">
          <div class="lv3-dual-orb lv3-dual-orb--1"></div>
          <div class="lv3-dual-orb lv3-dual-orb--2"></div>
          <div class="lv3-dual-orb lv3-dual-orb--3"></div>
        </div>
      <!-- FEATURES FOLDER TABS (scroll-driven sticky) -->
      <div class="lv3-scroll-features" id="lv3ScrollFeatures">
        <!-- Background: same as hero -->
        <div class="lv3-feat-bg">
          <canvas class="lv3-feat-particles" id="lv3FeatParticles"></canvas>
          <div class="lv3-feat-orb lv3-feat-orb--1"></div>
          <div class="lv3-feat-orb lv3-feat-orb--2"></div>
          <div class="lv3-feat-orb lv3-feat-orb--3"></div>
          <div class="lv3-feat-grid"></div>
        </div>
        <!-- Sticky panel -->
        <div class="lv3-scroll-sticky" id="lv3ScrollSticky">
          <section class="lv3-section lv3-features-section" id="lv3-for-whom">
            <div class="lv3-section-head">
              <h2>Оценка никогда не была <span class="lv3-grad-teal">настолько удобной</span></h2>
              <p>Пять причин, которые делают её простой и эффективной</p>
            </div>
        <div class="lv3-folders" id="lv3Folders">
          <!-- Folder tabs - horizontal row at top -->
          <div class="lv3-folder-tabs">
            <button class="lv3-folder-tab active" data-folder="0">
              <span class="lv3-folder-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
              </span>
              <span>Аналитика</span>
            </button>
            <button class="lv3-folder-tab" data-folder="1">
              <span class="lv3-folder-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l-.7 4H9l-.7-4A7 7 0 0 1 12 2z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="9.5" y1="9" x2="9.5" y2="13"/><line x1="14.5" y1="7" x2="14.5" y2="13"/></svg>
              </span>
              <span>AI-помощник</span>
            </button>
            <button class="lv3-folder-tab" data-folder="2">
              <span class="lv3-folder-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
              </span>
              <span>Простота</span>
            </button>
            <button class="lv3-folder-tab" data-folder="3">
              <span class="lv3-folder-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="6" height="14" rx="1.5"/><rect x="9" y="3" width="6" height="18" rx="1.5"/><rect x="16" y="10" width="6" height="11" rx="1.5"/></svg>
              </span>
              <span>Структура</span>
            </button>
            <button class="lv3-folder-tab" data-folder="4">
              <span class="lv3-folder-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
              </span>
              <span>Реферальная</span>
            </button>
          </div>

          <!-- Folder panels -->
          <div class="lv3-folder-panels">

            <!-- Slide 1: Analytics Dashboard -->
            <div class="lv3-folder-panel active" data-folder-panel="0">
              <div class="lv3-folder-content">
                <div class="lv3-folder-text">
                  <div class="lv3-folder-tag">Аналитика</div>
                  <h3>Вся аналитика,<br>как на ладони</h3>
                  <p>Видите полную картину компании: KPI, воронку найма, риски, вовлечённость и потенциал каждого сотрудника — всё в одном визуальном дашборде.</p>
                  <ul class="lv3-folder-list">
                    <li>Дашборд HR-директора и собственника</li>
                    <li>Радар компетенций и 9-box матрица</li>
                    <li>Тепловая карта рисков команды</li>
                    <li>Воронка подбора в реальном времени</li>
                  </ul>
                </div>
                <div class="lv3-folder-visual">
                  <div class="lv3-dash-preview">
                    <div class="lv3-dash-header">
                      <span class="lv3-dash-title">HR Dashboard</span>
                      <span class="lv3-live-dot"><span class="lv3-live-green-dot"></span>Live</span>
                    </div>
                    <div class="lv3-dash-kpis">
                      <div class="lv3-dash-kpi">
                        <span class="lv3-dash-kpi-val" style="color:#00E5D4">47</span>
                        <span class="lv3-dash-kpi-label">оценок</span>
                      </div>
                      <div class="lv3-dash-kpi">
                        <span class="lv3-dash-kpi-val" style="color:#00E5D4">81%</span>
                        <span class="lv3-dash-kpi-label">конверсия</span>
                      </div>
                      <div class="lv3-dash-kpi">
                        <span class="lv3-dash-kpi-val" style="color:#F59E0B">3</span>
                        <span class="lv3-dash-kpi-label">риска</span>
                      </div>
                    </div>
                    <div class="lv3-dash-bars">
                      <div class="lv3-dash-bar-row">
                        <span class="lv3-dash-bar-label">Коммуникация</span>
                        <div class="lv3-dash-bar"><div class="lv3-dash-bar-fill" data-w="87"></div></div>
                        <span class="lv3-dash-bar-pct">87%</span>
                      </div>
                      <div class="lv3-dash-bar-row">
                        <span class="lv3-dash-bar-label">Лидерство</span>
                        <div class="lv3-dash-bar"><div class="lv3-dash-bar-fill" data-w="72"></div></div>
                        <span class="lv3-dash-bar-pct">72%</span>
                      </div>
                      <div class="lv3-dash-bar-row">
                        <span class="lv3-dash-bar-label">Стрессоустойчивость</span>
                        <div class="lv3-dash-bar"><div class="lv3-dash-bar-fill lv3-bar-amber" data-w="54"></div></div>
                        <span class="lv3-dash-bar-pct">54%</span>
                      </div>
                      <div class="lv3-dash-bar-row">
                        <span class="lv3-dash-bar-label">Обучаемость</span>
                        <div class="lv3-dash-bar"><div class="lv3-dash-bar-fill" data-w="91"></div></div>
                        <span class="lv3-dash-bar-pct">91%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Slide 2: AI Assistant -->
            <div class="lv3-folder-panel" data-folder-panel="1">
              <div class="lv3-folder-content">
                <div class="lv3-folder-text">
                  <div class="lv3-folder-tag">AI-помощник</div>
                  <h3>Спроси AI, если не знаешь<br>как действовать</h3>
                  <p>Не знаете как провести оценку 360, на кого из кандидатов обратить внимание или как интерпретировать результаты? AI ответит на любой HR-вопрос за секунды.</p>
                  <ul class="lv3-folder-list">
                    <li>Рекомендации по кандидатам</li>
                    <li>Помощь в настройке оценки 360</li>
                    <li>Анализ рисков и красных флагов</li>
                    <li>Советы по развитию сотрудников</li>
                  </ul>
                </div>
                <div class="lv3-folder-visual">
                  <div class="lv3-ai-chat" id="lv3AiChat">
                    <div class="lv3-ai-chat-header">
                      <span class="lv3-ai-star-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="#1E5BFF" stroke="#1E5BFF" stroke-width="1"/></svg>
                      </span>
                      <span class="lv3-ai-chat-name">Eltera AI</span>
                      <span class="lv3-ai-online"><span class="lv3-ai-online-dot"></span>Online</span>
                    </div>
                    <div class="lv3-ai-chat-messages" id="lv3AiMessages">
                      <div class="lv3-ai-msg lv3-ai-msg-user lv3-ai-msg-visible">На кого из кандидатов обратить внимание?</div>
                      <div class="lv3-ai-msg lv3-ai-msg-bot lv3-ai-msg-visible">Рекомендую Анну К. — fit к роли 94%, высокая обучаемость. Красных флагов нет. ✅</div>
                    </div>
                    <div class="lv3-ai-chat-input">
                      <input type="text" placeholder="Задайте вопрос AI..." readonly>
                      <button class="lv3-ai-send-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Slide 3: Simple Interface -->
            <div class="lv3-folder-panel" data-folder-panel="2">
              <div class="lv3-folder-content">
                <div class="lv3-folder-text">
                  <div class="lv3-folder-tag">Простота</div>
                  <h3>HR без воды — интуитивно понятный интерфейс</h3>
                  <p>Создайте и отправьте оценку за 1 минуту. Никаких инструкций, долгого обучения и технических сложностей. Просто выберите профиль и отправьте ссылку.</p>
                  <ul class="lv3-folder-list">
                    <li>Создание оценки за 3 клика</li>
                    <li>Готовые профили для 120+ должностей</li>
                    <li>Автоматическая отправка ссылок</li>
                    <li>Результат сразу после прохождения</li>
                  </ul>
                </div>
                <div class="lv3-folder-visual">
                  <div class="lv3-send-preview">
                    <div class="lv3-send-step" id="lv3SendStep">
                      <div class="lv3-send-stage" data-stage="0">
                        <div class="lv3-send-form">
                          <div class="lv3-send-label">Должность</div>
                          <div class="lv3-send-field lv3-typing" id="lv3TypeField">Менеджер по продажам</div>
                          <div class="lv3-send-label">Кандидат</div>
                          <div class="lv3-send-field">Иванов Алексей</div>
                          <div class="lv3-send-label">Email</div>
                          <div class="lv3-send-field">ivanov@company.ru</div>
                        </div>
                      </div>
                      <div class="lv3-send-stage" data-stage="1" style="display:none">
                        <div class="lv3-send-sending">
                          <div class="lv3-send-icon">📤</div>
                          <div class="lv3-send-text">Отправляем оценку...</div>
                          <div class="lv3-send-progress"><div class="lv3-send-progress-bar" id="lv3SendBar"></div></div>
                        </div>
                      </div>
                      <div class="lv3-send-stage" data-stage="2" style="display:none">
                        <div class="lv3-send-done">
                          <div class="lv3-send-check">✓</div>
                          <div class="lv3-send-text lv3-green">Оценка отправлена!</div>
                          <div class="lv3-send-link">eltera.ai/a/xK9mP2</div>
                        </div>
                      </div>
                    </div>
                    <button class="lv3-send-btn" id="lv3SendBtn">Отправить оценку →</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Slide 4: Company Structure -->
            <div class="lv3-folder-panel" data-folder-panel="3">
              <div class="lv3-folder-content lv3-folder-content--org">
                <!-- Left: text -->
                <div class="lv3-folder-text">
                  <div class="lv3-folder-tag">Структура</div>
                  <h3>Вся структура компании<br>и данные о каждом</h3>
                  <p>Видите полную оргструктуру: отделы, руководителей, сотрудников. Кликните на любого — получите его профиль, оценки, риски и ИПР.</p>
                  <ul class="lv3-folder-list">
                    <li>Оргструктура с drill-down</li>
                    <li>Профиль каждого сотрудника</li>
                    <li>История оценок и динамика</li>
                    <li>Риски и рекомендации по каждому</li>
                  </ul>
                </div>
                <!-- Right: org chart -->
                <div class="lv3-folder-visual lv3-folder-visual--org">
                  <!-- Aurora orbs -->
                  <div class="lv3-org2-aurora" aria-hidden="true">
                    <div class="lv3-org2-orb lv3-org2-orb--1"></div>
                    <div class="lv3-org2-orb lv3-org2-orb--2"></div>
                    <div class="lv3-org2-orb lv3-org2-orb--3"></div>
                  </div>
                  <div class="lv3-org2">
                    <!-- Level 0: CEO -->
                    <div class="lv3-org2-level lv3-org2-level--ceo">
                      <div class="lv3-org2-card lv3-org2-card--ceo">
                        <img class="lv3-org2-photo" src="/public/assets/org/ceo.jpg" alt="CEO" loading="lazy">
                        <div class="lv3-org2-info">
                          <div class="lv3-org2-name">Генеральный<br>директор</div>
                          <div class="lv3-org2-score lv3-org2-score--green">94%</div>
                        </div>
                      </div>
                    </div>
                    <!-- SVG connector: CEO → 3 depts -->
                    <div class="lv3-org2-connectors lv3-org2-connectors--l1">
                      <svg viewBox="0 0 600 48" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- vertical from CEO -->
                        <line x1="300" y1="0" x2="300" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <!-- horizontal bar -->
                        <line x1="100" y1="24" x2="500" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <!-- drops to each dept -->
                        <line x1="100" y1="24" x2="100" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="300" y1="24" x2="300" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="500" y1="24" x2="500" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                      </svg>
                    </div>
                    <!-- Level 1: Departments -->
                    <div class="lv3-org2-level lv3-org2-level--depts">
                      <!-- HR -->
                      <div class="lv3-org2-dept lv3-org2-dept--blue">
                        <svg class="lv3-org2-dept-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="3" stroke="#7AA8FF" stroke-width="1.5"/><circle cx="13" cy="7" r="3" stroke="#7AA8FF" stroke-width="1.5"/><path d="M1 17c0-3 2.5-5 6-5M19 17c0-3-2.5-5-6-5M7 12c1 3 5 3 6 0" stroke="#7AA8FF" stroke-width="1.5" stroke-linecap="round"/></svg>
                        <span>HR-отдел</span>
                      </div>
                      <!-- IT -->
                      <div class="lv3-org2-dept lv3-org2-dept--purple">
                        <svg class="lv3-org2-dept-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l-4 2 4 2M14 8l4 2-4 2M11 6l-2 8" stroke="#A78BFA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span>IT-отдел</span>
                      </div>
                      <!-- Sales -->
                      <div class="lv3-org2-dept lv3-org2-dept--teal">
                        <svg class="lv3-org2-dept-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="2,14 7,9 11,12 18,5" stroke="#00E5D4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14,5 18,5 18,9" stroke="#00E5D4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span>Продажи</span>
                      </div>
                    </div>
                    <!-- SVG connector: depts → employees -->
                    <div class="lv3-org2-connectors lv3-org2-connectors--l2">
                      <svg viewBox="0 0 600 48" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- HR branch -->
                        <line x1="100" y1="0" x2="100" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="50" y1="24" x2="150" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="50" y1="24" x2="50" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="150" y1="24" x2="150" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <!-- IT branch -->
                        <line x1="300" y1="0" x2="300" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="250" y1="24" x2="350" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="250" y1="24" x2="250" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="350" y1="24" x2="350" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <!-- Sales branch -->
                        <line x1="500" y1="0" x2="500" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="450" y1="24" x2="550" y2="24" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="450" y1="24" x2="450" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                        <line x1="550" y1="24" x2="550" y2="48" stroke="#1E5BFF" stroke-width="1.5" opacity="0.6"/>
                      </svg>
                    </div>
                    <!-- Level 2: Employees -->
                    <div class="lv3-org2-level lv3-org2-level--employees">
                      <!-- HR employees -->
                      <div class="lv3-org2-emp">
                        <img class="lv3-org2-emp-photo" src="/public/assets/org/anna.jpg" alt="Анна К." loading="lazy">
                        <div class="lv3-org2-emp-name">Анна К.</div>
                        <div class="lv3-org2-score lv3-org2-score--green">94%</div>
                      </div>
                      <div class="lv3-org2-emp">
                        <img class="lv3-org2-emp-photo" src="/public/assets/org/maria.jpg" alt="Мария С." loading="lazy">
                        <div class="lv3-org2-emp-name">Мария С.</div>
                        <div class="lv3-org2-score lv3-org2-score--green">88%</div>
                      </div>
                      <!-- IT employees -->
                      <div class="lv3-org2-emp">
                        <img class="lv3-org2-emp-photo" src="/public/assets/org/dmitry.jpg" alt="Дмитрий В." loading="lazy">
                        <div class="lv3-org2-emp-name">Дмитрий В.</div>
                        <div class="lv3-org2-score lv3-org2-score--green">91%</div>
                      </div>
                      <div class="lv3-org2-emp">
                        <img class="lv3-org2-emp-photo" src="/public/assets/org/pavel.jpg" alt="Павел Н." loading="lazy">
                        <div class="lv3-org2-emp-name">Павел Н.</div>
                        <div class="lv3-org2-score lv3-org2-score--amber">67%</div>
                      </div>
                      <!-- Sales employees -->
                      <div class="lv3-org2-emp">
                        <img class="lv3-org2-emp-photo" src="/public/assets/org/alexey.jpg" alt="Алексей И." loading="lazy">
                        <div class="lv3-org2-emp-name">Алексей И.</div>
                        <div class="lv3-org2-score lv3-org2-score--green">89%</div>
                      </div>
                      <div class="lv3-org2-emp">
                        <img class="lv3-org2-emp-photo" src="/public/assets/org/sergey.jpg" alt="Сергей М." loading="lazy">
                        <div class="lv3-org2-emp-name">Сергей М.</div>
                        <div class="lv3-org2-score lv3-org2-score--red">45%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Slide 5: Referral -->
            <div class="lv3-folder-panel" data-folder-panel="4">
              <div class="lv3-folder-content">
                <!-- Left text -->
                <div class="lv3-folder-text">
                  <div class="lv3-folder-tag lv3-tag-ref">Реферальная программа</div>
                  <h3>Зарабатывай токены<br>и выводи рублями</h3>
                  <p>Приглашайте компании в Eltera и получайте 10% от каждой их оплаты. Бонусы начисляются в Merit — криптовалюте платформы — и выводятся на российскую карту в рублях.</p>
                  <ul class="lv3-folder-list">
                    <li>10% от оплаты каждой приглашённой компании</li>
                    <li>Начисление в Merit</li>
                    <li>Вывод на карту РФ в рублях</li>
                    <li>Реальные выплаты без ограничений</li>
                  </ul>
                </div>
                <!-- Right panel -->
                <div class="lv3-folder-visual">
                  <div class="lv3-ref2">

                    <!-- Balance card -->
                    <div class="lv3-ref2-balance">
                      <div class="lv3-ref2-bal-left">
                        <div class="lv3-ref2-bal-label">Ваш баланс</div>
                        <div class="lv3-ref2-bal-val">
                          <span class="lv3-ref2-bal-num">142.50</span>
                          <span class="lv3-ref2-bal-cur">MRT</span>
                          <span class="lv3-ref2-bal-rub">≈ 13 200 ₽</span>
                        </div>
                      </div>
                      <div class="lv3-ref2-bal-icon">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <circle cx="14" cy="14" r="13" stroke="#8B5CF6" stroke-width="1.5" fill="rgba(139,92,246,0.12)"/>
                          <text x="14" y="19" text-anchor="middle" font-size="13" font-weight="700" fill="#8B5CF6">M</text>
                        </svg>
                      </div>
                    </div>

                    <!-- Ref link -->
                    <div class="lv3-ref2-link-block">
                      <div class="lv3-ref2-link-label">Ваша реферальная ссылка</div>
                      <div class="lv3-ref2-link-row">
                        <span class="lv3-ref2-link-url">eltera.ai/ref/xK9mP2qR</span>
                        <button class="lv3-ref2-copy-btn" id="lv3RefCopyBtn">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="2" stroke="#E6F2FF" stroke-width="1.3"/><path d="M3 11V3h8" stroke="#E6F2FF" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                          Скопировать
                        </button>
                      </div>
                    </div>

                    <!-- Stats row -->
                    <div class="lv3-ref2-stats">
                      <div class="lv3-ref2-stat">
                        <span class="lv3-ref2-stat-val" style="color:#00E5D4">7</span>
                        <span class="lv3-ref2-stat-label">Компаний</span>
                      </div>
                      <div class="lv3-ref2-stat">
                        <span class="lv3-ref2-stat-val" style="color:#00E5D4">$142</span>
                        <span class="lv3-ref2-stat-label">Заработано</span>
                      </div>
                      <div class="lv3-ref2-stat">
                        <span class="lv3-ref2-stat-val" style="color:#FFB347">$38</span>
                        <span class="lv3-ref2-stat-label">Ожидает</span>
                      </div>
                    </div>

                    <!-- History -->
                    <div class="lv3-ref2-history">
                      <div class="lv3-ref2-hist-row">
                        <span class="lv3-ref2-hist-name">ООО «Ритейл Групп»</span>
                        <span class="lv3-ref2-hist-amt">+$18.00</span>
                      </div>
                      <div class="lv3-ref2-hist-row">
                        <span class="lv3-ref2-hist-name">IT-компания «Devs»</span>
                        <span class="lv3-ref2-hist-amt">+$24.50</span>
                      </div>
                      <div class="lv3-ref2-hist-row">
                        <span class="lv3-ref2-hist-name">Контакт-центр «Плюс»</span>
                        <span class="lv3-ref2-hist-amt">+$12.00</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div><!-- /lv3-folder-panels -->
        </div><!-- /lv3-folders -->
          </section>
        </div><!-- /lv3-scroll-sticky -->
      </div><!-- /lv3-scroll-features -->

      <!-- AI SECTION -->
      <section class="lv3-section lv3-ai-section" id="lv3-ai" data-reveal>
        <!-- Aurora background -->
        <div class="lv3-ai-bg">
          <div class="lv3-ai-orb lv3-ai-orb--1"></div>
          <div class="lv3-ai-orb lv3-ai-orb--2"></div>
          <canvas class="lv3-ai-particles" id="lv3AiParticles"></canvas>
        </div>
        <!-- Glassmorphism wrapper -->
        <div class="lv3-ai-glass">
          <div class="lv3-ai-inner">
            <!-- Left column -->
            <div class="lv3-ai-left">
              <div class="lv3-section-tag lv3-tag-teal">AI-ОЦЕНКА</div>
              <h2 class="lv3-ai-heading">AI анализирует,<br>вы <span class="lv3-grad-teal">принимаете<br>решение</span></h2>
              <p class="lv3-ai-desc">AI анализирует ответы, компетенции, кейсы и поведенческие маркеры, а затем формирует понятный отчёт: сильные стороны, зоны риска, красные флаги, рекомендацию и индивидуальный план развития.</p>
              <div class="lv3-ai-note">
                <div class="lv3-ai-note-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="#00E5D4" stroke-width="1.4"/><path d="M9 8v5" stroke="#00E5D4" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="5.5" r="1" fill="#00E5D4"/></svg>
                </div>
                <p>Важно! AI помогает структурировать оценку и подсветить риски, но финальное решение остаётся за человеком.</p>
              </div>
            </div>
            <!-- Right column: accordion -->
            <div class="lv3-ai-right">
              <div class="lv3-accordion2" id="lv3Accordion">

                <!-- Item 1: active -->
                <div class="lv3-acc2-item lv3-acc2-item--active" data-acc="0">
                  <div class="lv3-acc2-head">
                    <div class="lv3-acc2-icon lv3-acc2-icon--teal">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke="#00E5D4" stroke-width="1.5" fill="none"/>
                        <circle cx="12" cy="12" r="3" stroke="#00E5D4" stroke-width="1.3" fill="rgba(0,229,212,0.15)"/>
                        <path d="M12 2v3M12 19v3M2 8l2.5 1.5M19.5 14.5L22 16M2 16l2.5-1.5M19.5 9.5L22 8" stroke="#00E5D4" stroke-width="1.1" stroke-linecap="round"/>
                      </svg>
                    </div>
                    <span class="lv3-acc2-title">Профиль компетенций</span>
                    <svg class="lv3-acc2-arrow lv3-acc2-arrow--open" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 11l4-4 4 4" stroke="#00E5D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <div class="lv3-acc2-divider"></div>
                  <div class="lv3-acc2-body">Визуальный radar с процентами по каждой компетенции.<br>Сразу видно сильные стороны и зоны развития.</div>
                </div>

                <!-- Item 2 -->
                <div class="lv3-acc2-item" data-acc="1">
                  <div class="lv3-acc2-head">
                    <div class="lv3-acc2-icon lv3-acc2-icon--red">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3L3 20h18L12 3z" stroke="#E05555" stroke-width="1.5" fill="rgba(224,85,85,0.12)" stroke-linejoin="round"/>
                        <path d="M12 9v5" stroke="#E05555" stroke-width="1.6" stroke-linecap="round"/>
                        <circle cx="12" cy="16.5" r="1.1" fill="#E05555"/>
                      </svg>
                    </div>
                    <span class="lv3-acc2-title">Красные флаги и риски</span>
                    <svg class="lv3-acc2-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 7l4 4 4-4" stroke="rgba(230,242,255,0.5)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <div class="lv3-acc2-body">AI выделяет тревожные сигналы и зоны внимания. Вы видите риски до принятия решения.</div>
                </div>

                <!-- Item 3 -->
                <div class="lv3-acc2-item" data-acc="2">
                  <div class="lv3-acc2-head">
                    <div class="lv3-acc2-icon lv3-acc2-icon--teal">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="#00E5D4" stroke-width="1.5" fill="rgba(0,229,212,0.08)"/>
                        <path d="M7.5 12l3 3 6-6" stroke="#00E5D4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <span class="lv3-acc2-title">Рекомендация по кандидату</span>
                    <svg class="lv3-acc2-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 7l4 4 4-4" stroke="rgba(230,242,255,0.5)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <div class="lv3-acc2-body">Приглашать / наблюдать / не рекомендовать — с обоснованием и конкретными аргументами.</div>
                </div>

                <!-- Item 4 -->
                <div class="lv3-acc2-item" data-acc="3">
                  <div class="lv3-acc2-head">
                    <div class="lv3-acc2-icon lv3-acc2-icon--blue">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M4 17l5-5 4 4 7-9" stroke="#1E5BFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="20" cy="5" r="2" fill="#1E5BFF" fill-opacity="0.3" stroke="#1E5BFF" stroke-width="1.2"/>
                      </svg>
                    </div>
                    <span class="lv3-acc2-title">ИПР — план развития</span>
                    <svg class="lv3-acc2-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 7l4 4 4-4" stroke="rgba(230,242,255,0.5)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <div class="lv3-acc2-body">Индивидуальный план развития с конкретными шагами, целями и сроками для каждого сотрудника.</div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>
      </div><!-- /lv3-dual-bg -->

      <!-- WHAT CAN BE ASSESSED -->
      <section class="lv3-section" id="lv3-assess" data-reveal>
        <div class="lv3-section-head">
          <h2>Комплексная оценка людей: <span class="lv3-grad">от найма до развития</span></h2>
          <p>Все инструменты для работы с кандидатами и сотрудниками в одной платформе</p>
        </div>
        <div class="lv3-assess-grid">
          <div class="lv3-assess-card">
            <div class="lv3-assess-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3" stroke="#00E5D4" stroke-width="1.4"/><circle cx="15" cy="7" r="3" stroke="#1E5BFF" stroke-width="1.4"/><path d="M3 20c0-3.314 2.686-6 6-6h6c3.314 0 6 2.686 6 6" stroke="#00E5D4" stroke-width="1.4" stroke-linecap="round"/></svg></div>
            <h4>Корпоративная культура и вовлечённость</h4>
            <ul>
              <li>Групповые опросы</li>
              <li>Опросы вовлечённости</li>
              <li>Пульс-опросы</li>
              <li>Оценка ценностей</li>
              <li>Оценка факторов удержания</li>
              <li>Оценка удовлетворённости и лояльности</li>
            </ul>
          </div>
          <div class="lv3-assess-card">
            <div class="lv3-assess-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L2 20h20L12 3z" stroke="#FFB347" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 10v5" stroke="#FFB347" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="#FFB347"/></svg></div>
            <h4>Риски текучести и увольнения</h4>
            <ul>
              <li>Exit-интервью</li>
              <li>Оценка репутационных рисков</li>
              <li>Отчёт по рискам текучести</li>
              <li>Факторы ухода</li>
              <li>Зоны выгорания</li>
            </ul>
          </div>
          <div class="lv3-assess-card">
            <div class="lv3-assess-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="12" width="4" height="9" rx="1" fill="#1E5BFF" fill-opacity="0.3" stroke="#1E5BFF" stroke-width="1.2"/><rect x="10" y="7" width="4" height="14" rx="1" fill="#1E5BFF" fill-opacity="0.5" stroke="#1E5BFF" stroke-width="1.2"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#00E5D4" fill-opacity="0.5" stroke="#00E5D4" stroke-width="1.2"/></svg></div>
            <h4>Оценка и развитие персонала</h4>
            <ul>
              <li>Индивидуальная оценка руководителя</li>
              <li>Оценка 360</li>
              <li>Оценка потенциала</li>
              <li>Performance review</li>
              <li>Индивидуальный план развития (ИПР)</li>
              <li>Автоматические мониторинги</li>
            </ul>
          </div>
          <div class="lv3-assess-card">
            <div class="lv3-assess-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#00E5D4" stroke-width="1.4"/><path d="M16.5 16.5l4 4" stroke="#00E5D4" stroke-width="1.4" stroke-linecap="round"/><path d="M8 11h6M11 8v6" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round"/></svg></div>
            <h4>Поиск и подбор</h4>
            <ul>
              <li>Оценка кандидатов</li>
              <li>Сравнение кандидатов</li>
              <li>Готовые профили должностей</li>
              <li>Оценка soft skills</li>
              <li>Оценка мотивации</li>
              <li>Контроль рисков найма</li>
            </ul>
          </div>
        </div>
        <div class="lv3-assess-stats">
          <div class="lv3-astat"><b data-count-to="120" data-count-suffix="+">120+</b><span>готовых профилей должностей</span></div>
          <div class="lv3-astat"><b data-count-to="1000" data-count-suffix="+">1000+</b><span>методик оценки</span></div>
          <div class="lv3-astat"><b>∞</b><span>Гибкий конструктор компетенций</span></div>
        </div>
      </section>

      <!-- CTA BLOCK -->
      <section class="lv3-cta-block">
        <div class="lv3-cta-inner">
          <div class="lv3-section-tag">Стартовый доступ</div>
          <h2>Попробуйте всего за 990 ₽</h2>
          <p>Получите 1 месяц доступа к оценке кандидатов и сотрудников.<br>Мы не делим людей на кандидатов и сотрудников — в одном доступе можно оценивать всех.</p>
          <div class="lv3-cta-btns">
            <button class="lv3-btn-primary lv3-btn-lg" data-route="login">Попробовать за 990 ₽</button>
          </div>
          <div class="lv3-cta-meta">20 оценок на 1 месяц в стартовом доступе</div>
        </div>
      </section>

      <!-- HOW IT WORKS -->
      <section class="lv3-section" id="lv3-how" data-reveal>
        <div class="lv3-section-head">
          <h2>Как это работает</h2>
          <p>Пять шагов от задачи до решения</p>
        </div>
        <div class="lv3-steps">
          <div class="lv3-step" data-reveal data-reveal-delay="1"><div class="lv3-step-num">01</div><div><h4>Расскажите задачу</h4><p>Вы выбираете, что нужно оценить: кандидатов, сотрудников, вовлечённость, руководителей, команду или риски текучести.</p></div></div>
          <div class="lv3-step" data-reveal data-reveal-delay="2"><div class="lv3-step-num">02</div><div><h4>Мы помогаем подобрать инструмент</h4><p>Поддержка помогает выбрать готовую методику или собрать оценку под вашу задачу.</p></div></div>
          <div class="lv3-step" data-reveal data-reveal-delay="3"><div class="lv3-step-num">03</div><div><h4>Отправьте оценку</h4><p>Вы отправляете ссылку кандидатам или сотрудникам. Они проходят оценку онлайн в удобное время.</p></div></div>
          <div class="lv3-step" data-reveal data-reveal-delay="4"><div class="lv3-step-num">04</div><div><h4>Получите результат</h4><p>После прохождения результат сразу появляется в личном кабинете: профиль компетенций, риски, рекомендации и отчёт.</p></div></div>
          <div class="lv3-step" data-reveal data-reveal-delay="5"><div class="lv3-step-num">05</div><div><h4>Примите решение</h4><p>Используйте отчёт для найма, развития, ротации, удержания или performance review.</p></div></div>
        </div>
      </section>

      <!-- REPORTS -->
      <section class="lv3-section" id="lv3-reports" data-reveal>
        <div class="lv3-section-head">
          <h2>Познакомьтесь с примерами отчётов</h2>
          <p>Готовые отчёты для каждого сценария оценки</p>
        </div>
        <div class="lv3-reports-grid">
          ${[
            {t:"Отчёт по оценке кандидата",d:"Профиль компетенций, красные флаги, рекомендация по найму",c:"#00E5D4"},
            {t:"Отчёт по оценке сотрудника",d:"Сильные стороны, зоны развития, ИПР",c:"#1E5BFF"},
            {t:"Групповой отчёт",d:"Сравнение команды по компетенциям и рискам",c:"#7B61FF"},
            {t:"Оценка 360",d:"Обратная связь от коллег, руководителя и подчинённых",c:"#00E5D4"},
            {t:"Оценка вовлечённости",d:"eNPS, удовлетворённость, факторы удержания",c:"#1E5BFF"},
            {t:"Пульс-опрос",d:"Быстрый срез настроения и вовлечённости команды",c:"#00E5D4"},
            {t:"Отчёт по рискам текучести",d:"Зоны выгорания, факторы ухода, рекомендации",c:"#FFB347"},
            {t:"ИПР сотрудника",d:"Индивидуальный план развития с целями и сроками",c:"#1E5BFF"}
          ].map(r=>{
            const heights = [60,80,45,70,55,90,40,75];
            const barHtml = heights.map((h,i)=>`<span style="height:${h}%;background:${r.c};opacity:${0.5+i*0.06};animation-delay:${i*0.1}s"></span>`).join('');
            return `<div class="lv3-report-card">
              <div class="lv3-rc-preview" style="background:${r.c}10;border:1px solid ${r.c}22">
                <div class="lv3-rc-preview-bar">${barHtml}</div>
                <div style="position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;color:${r.c};opacity:0.7">PDF</div>
              </div>
              <div class="lv3-rc-top">
                <div class="lv3-rc-icon" style="color:${r.c};background:${r.c}18"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 3h8l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/><path d="M13 3v5h4" stroke="currentColor" stroke-width="1.3"/><path d="M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></div>
                <div><h4>${r.t}</h4><p>${r.d}</p></div>
              </div>
              <button class="lv3-btn-ghost lv3-btn-sm" data-route="login">Смотреть пример</button>
            </div>`;
          }).join('')}
        </div>
      </section>

      <!-- IMPLEMENT -->
      <section class="lv3-section" id="lv3-implement" data-reveal>
        <div class="lv3-section-head">
          <h2>Как внедрить платформу</h2>
          <p>Внедрение не требует сложного проекта. Вы оплачиваете доступ, выбираете оценку, отправляете ссылку и получаете результаты.</p>
        </div>
        <div class="lv3-impl-steps">
          <div class="lv3-impl-step" data-reveal data-reveal-delay="1"><div class="lv3-impl-num">1</div><h4>Оплатите доступ</h4><p>Выберите стартовый доступ за 990 ₽ или один из основных тарифов.</p></div>
          <div class="lv3-impl-step" data-reveal data-reveal-delay="2"><div class="lv3-impl-num">2</div><h4>Выберите задачу оценки</h4><p>Оценка кандидатов, сотрудников, 360, вовлечённость или риски текучести.</p></div>
          <div class="lv3-impl-step" data-reveal data-reveal-delay="3"><div class="lv3-impl-num">3</div><h4>Запустите оценку</h4><p>Отправьте ссылку кандидатам или сотрудникам — они проходят онлайн.</p></div>
          <div class="lv3-impl-step" data-reveal data-reveal-delay="4"><div class="lv3-impl-num">4</div><h4>Получите отчёт</h4><p>Результат появляется в личном кабинете сразу после прохождения.</p></div>
          <div class="lv3-impl-step" data-reveal data-reveal-delay="5"><div class="lv3-impl-num">5</div><h4>Используйте результаты</h4><p>Принимайте решения по найму, развитию, ротации или удержанию.</p></div>
        </div>
      </section>

      <!-- PRICING -->
      <section class="lv3-section" id="lv3-pricing" data-reveal>
        <div class="lv3-section-head">
          <h2>Тарифы</h2>
          <p>Выберите подходящий план для вашей команды</p>
        </div>
        <div class="lv3-billing-toggle">
          <button class="lv3-billing-btn active" data-billing="month">1 месяц</button>
          <button class="lv3-billing-btn" data-billing="3month">3 месяца <span class="lv3-discount">−12%</span></button>
          <button class="lv3-billing-btn" data-billing="year">1 год <span class="lv3-discount">−17%</span></button>
        </div>
        <div class="tariffGrid landingTariffs">${tariffs.map(renderTariffCard).join("")}</div>
        <p class="lv3-tariff-note">Все тарифы включают оценку кандидатов и сотрудников. Отмена в любой момент.</p>

        <!-- COMPARISON TABLE -->
        <div class="lv3-compare-wrap" data-reveal>
          <div class="lv3-compare-toggle">
            <button class="lv3-compare-btn active" id="lv3CompareToggle">Сравнить тарифы ↓</button>
          </div>
          <div class="lv3-compare-table" id="lv3CompareTable">
            <table>
              <thead>
                <tr>
                  <th>Функция</th>
                  <th><span class="lv3-plan-name">Start</span></th>
                  <th><span class="lv3-plan-name">TalentCheck</span></th>
                  <th><span class="lv3-plan-name lv3-plan-popular">TalentPro</span></th>
                  <th><span class="lv3-plan-name">TalentStudio</span></th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Оценка кандидатов</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Оценка сотрудников</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>PDF-отчёты</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Готовые профили должностей</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Конструктор оценок</td><td class="lv3-no">—</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Групповые отчёты</td><td class="lv3-no">—</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Адаптация 7/14/30/60/90 дней</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Performance Review + 9-box</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-yes">✓</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Оценка 360</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-yes">✓</td></tr>
                <tr><td>API-интеграция</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-yes">✓</td></tr>
                <tr><td>Брендированные отчёты</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-no">—</td><td class="lv3-yes">✓</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SOCIAL PROOF -->
      <section class="lv3-section lv3-social-proof" id="lv3-social" data-reveal>
        <div class="lv3-section-head">
          <h2>Нам доверяют HR-команды</h2>
          <p>Компании разных отраслей используют Eltera для оценки людей</p>
        </div>
        <div class="lv3-logos-row">
          <div class="lv3-logo-pill">Ритейл</div>
          <div class="lv3-logo-pill">IT-компании</div>
          <div class="lv3-logo-pill">Банки</div>
          <div class="lv3-logo-pill">Производство</div>
          <div class="lv3-logo-pill">Логистика</div>
          <div class="lv3-logo-pill">Контакт-центры</div>
          <div class="lv3-logo-pill">Девелопмент</div>
          <div class="lv3-logo-pill">Страхование</div>
        </div>
        <div class="lv3-testimonials">
          <div class="lv3-testimonial">
            <div class="lv3-test-text">"Раньше оценка кандидата занимала 2-3 дня. Теперь результат готов через 30 минут после прохождения. Экономим около 60% времени HR-отдела."</div>
            <div class="lv3-test-author">
              <div class="lv3-test-avatar">ЕК</div>
              <div><b>Елена К.</b><span>HR-директор, ритейл-сеть</span></div>
            </div>
          </div>
          <div class="lv3-testimonial">
            <div class="lv3-test-text">"Оценка 360 помогла нам честно поговорить с командой о точках роста. Отчёты понятные, без лишней воды — сразу видно что делать."</div>
            <div class="lv3-test-author">
              <div class="lv3-test-avatar">АМ</div>
              <div><b>Андрей М.</b><span>Руководитель отдела, IT-компания</span></div>
            </div>
          </div>
          <div class="lv3-testimonial">
            <div class="lv3-test-text">"Собственник наконец увидел реальную картину по команде. Тепловая карта рисков и 9-box матрица — именно то, что нужно для управленческих решений."</div>
            <div class="lv3-test-author">
              <div class="lv3-test-avatar">НВ</div>
              <div><b>Наталья В.</b><span>HRD, производственная компания</span></div>
            </div>
          </div>
        </div>
        <div class="lv3-proof-stats">
          <div class="lv3-proof-stat"><b data-count-to="3000" data-count-prefix="" data-count-suffix=" 000+">3 000+</b><span>профессий в базе</span></div>
          <div class="lv3-proof-stat"><b data-count-to="639" data-count-prefix="" data-count-suffix="">639</b><span>вопросов по компетенциям</span></div>
          <div class="lv3-proof-stat"><b data-count-to="60" data-count-prefix="" data-count-suffix="+">60+</b><span>готовых должностей</span></div>
          <div class="lv3-proof-stat"><b data-count-to="100" data-count-prefix="" data-count-suffix="+">100+</b><span>методик оценки</span></div>
        </div>
      </section>

      <!-- CASES -->
      <section class="lv3-section" id="lv3-cases" data-reveal>
        <div class="lv3-section-head">
          <h2>Кейсы</h2>
          <p>Станьте компанией, которая оценивает людей с помощью Eltera</p>
        </div>
        <div class="lv3-cases-grid">
          <div class="lv3-case-card">
            <div class="lv3-case-tag">Ритейл</div>
            <h4>Ритейл-сеть</h4>
            <p>Снизили текучесть кассиров на 18% за счёт оценки мотивации при найме</p>
          </div>
          <div class="lv3-case-card">
            <div class="lv3-case-tag">IT</div>
            <h4>IT-компания</h4>
            <p>Ускорили закрытие вакансий разработчиков с 45 до 28 дней</p>
          </div>
          <div class="lv3-case-card">
            <div class="lv3-case-tag">Сервис</div>
            <h4>Контакт-центр</h4>
            <p>Сократили ошибки найма операторов на 35% с помощью оценки компетенций</p>
          </div>
        </div>
        <p class="lv3-cases-note">* Данные приведены в качестве иллюстрации потенциального эффекта платформы</p>
      </section>

      <!-- FOOTER -->
      <footer class="lv3-footer">
        <div class="lv3-footer-top">
          <div class="lv3-footer-brand">
            <img src="/public/assets/eltera_logo_main.png?v=1" alt="Eltera" style="height:48px;width:auto;object-fit:contain;mix-blend-mode:screen;filter:brightness(1.1);">
            <p>AI-платформа для оценки кандидатов и сотрудников. Компетенции, 360, вовлечённость, пульс-опросы и готовые отчёты.</p>
            <button class="lv3-btn-ghost" data-route="login">Войти в личный кабинет</button>
          </div>
          <div class="lv3-footer-cols">
            <div class="lv3-footer-col">
              <div class="lv3-footer-col-title">ПРОДУКТЫ</div>
              <a href="#lv3-assess">Оценка кандидатов и сотрудников</a>
              <a href="#lv3-360">Оценка 360</a>
              <a href="#lv3-engage">Оценка вовлечённости</a>
              <a href="#lv3-pulse">Пульс-опросы</a>
              <a href="#lv3-perf">Performance review</a>
            </div>
            <div class="lv3-footer-col">
              <div class="lv3-footer-col-title">КОМПАНИЯ</div>
              <a href="#lv3-cases">Кейсы</a>
              <a href="#lv3-reports">Отчёты</a>
              <a href="#lv3-pricing">Тарифы</a>
              <a href="#lv3-implement">Внедрение</a>
              <a href="#/app/referrals">Реферальная программа</a>
            </div>
            <div class="lv3-footer-col">
              <div class="lv3-footer-col-title">РЕСУРСЫ</div>
              <a href="#">Глоссарий</a>
              <a href="#">Контакты</a>
              <a href="#">Политика конфиденциальности</a>
              <a href="#">Политика обработки ПД</a>
            </div>
          </div>
        </div>
        <div class="lv3-footer-bottom">
          <span>© 2026 Eltera. Все права защищены.</span>
          <div><a href="#">Политика конфиденциальности</a><a href="#">Пользовательское соглашение</a></div>
        </div>
      </footer>
    </div>
  `;
}

export function renderLogin() {
  return `
    <div class="authPage">
      <section class="authBrand">
        <img src="/public/assets/eltera_logo_horizontal_on_dark.png?v=5" alt="Eltera">
        <h1><span class="authGradientText">Интеллект в оценке.</span><br><span class="authWhiteText">Уверенность в решениях.</span></h1>
        <p>Разберётесь за 5 минут. Первая оценка — за 1 минуту. Без инструкций и долгого обучения.</p>
      </section>
      <div class="authCard glass">
        <div class="authPill">
          <div class="authPillInner">
            <button class="authPillBtn active" data-auth-tab="login">Войти</button>
            <button class="authPillBtn" data-auth-tab="register">Зарегистрироваться</button>
          </div>
        </div>

        <!-- Форма входа -->
        <div class="authFormWrap open" data-auth-panel="login">
        <form data-login-form>
          <div class="authInputGroup">
            <label class="authLabel">Email или телефон</label>
            <input name="email" type="text" value="hr@eltera.ai" placeholder="name@company.ru или +7..." autocomplete="email" class="authInput">
          </div>
          <div class="authInputGroup">
            <label class="authLabel">Пароль</label>
            <input name="password" type="password" value="demo" placeholder="Введите пароль" autocomplete="current-password" class="authInput">
            <a href="#" class="authForgot" data-forgot-password>Забыли пароль?</a>
          </div>
          <button class="authSubmitBtn" type="submit">Войти в кабинет</button>
          <p class="authHint">Нет аккаунта? <a href="#" class="authLink" data-switch-tab="register">Зарегистрироваться</a></p>
        </form>
        </div>

        <!-- Форма регистрации -->
        <div class="authFormWrap" data-auth-panel="register">
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
          <div class="authInputGroup">
            <label class="authLabel">Название компании</label>
            <input name="company" type="text" placeholder="ООО Ромашка" class="authInput" required>
          </div>
          <div class="authInputGroup authContactToggle">
            <label class="authLabel">Контакт для входа</label>
            <div class="authContactSwitch">
              <button type="button" class="authContactBtn active" data-contact-type="email">Email</button>
              <button type="button" class="authContactBtn" data-contact-type="phone">Телефон</button>
            </div>
            <input name="contact" type="text" placeholder="name@company.ru" class="authInput" required>
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
          <img src="${isDark ? "/public/assets/eltera_logo_horizontal_on_dark.png?v=10" : "/public/assets/eltera_logo_horizontal_on_light.png?v=10"}" alt="Eltera" class="elt-logo-img">
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
          <button class="elt-nav-item" data-action="logout" title="Выйти из аккаунта">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="opacity:.6"><path d="M6 2H3v12h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Выйти${state.user && state.user.email ? ` · ${escapeHtml(state.user.email)}` : ""}</span>
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
            <button class="elt-avatar-btn" title="Профиль" data-oc-avatar="ceo" style="padding:0;overflow:hidden">
              ${(state.employeePhotos || {})['ceo'] ? `<img class="oc-avatar-img" src="${(state.employeePhotos || {})['ceo']}" alt="Профиль" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : 'РК'}
            </button>
          </div>
        </header>
        <main class="appContent">${content}${renderModal(state)}${renderKebabPopover(state)}${renderAssistant(state)}</main>
      </div>
    </div>
  `;
}

// ─── ИИ-ассистент (виджет в правом нижнем углу) ──────────────────────────────
export const ASSISTANT_GREETING = "Добрый день! Что я могу для вас сделать?";
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
  employee: { head: "Добавить сотрудника", fields: { full_name: "ФИО", position: "Должность", department_name: "Отдел", manager_name: "Руководитель", project: "Проект", start_date: "Дата выхода" } },
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

function renderAssistant(state) {
  const a = state.assistant || {};
  const open = a.open;
  const fab = `<button class="elt-asst-fab${open ? " open" : ""}" data-assistant-toggle aria-label="ИИ-ассистент">${open ? "✕" : ASST_BOT_SVG}</button>`;
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
    <div class="elt-asst-panel">
      <div class="elt-asst-head">
        <span class="elt-asst-head-icon">${ASST_BOT_SVG}</span>
        <div class="elt-asst-head-title"><b>Ассистент Eltera</b><span>ИИ-помощник</span></div>
        <button class="elt-asst-x" data-assistant-toggle aria-label="Закрыть">✕</button>
      </div>
      <div class="elt-asst-body" id="elt-asst-body">${greet}${bubbles}${dots}</div>
      ${chips}
      <form class="elt-asst-input" data-assistant-form>
        <input name="msg" placeholder="Спросите что-нибудь…" autocomplete="off" ${a.busy ? "disabled" : ""}>
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
  // Демо-сид показываем ТОЛЬКО при явной ошибке API. Пока идёт загрузка —
  // показываем API-режим с нулями, чтобы не мелькали демо-числа (133 и т.п.).
  const EMPTY_STATS = {
    total: 0, assessment_sent: 0, assessment_passed: 0, fit: 0, conditional: 0,
    not_fit: 0, interview: 0, accepted: 0, stuck: 0, avg_percent: 0,
    by_source: [], by_stage: [], by_vacancy: [], attention: []
  };
  const ready = Boolean(state.candidateStats && state.candidatesApi);
  const failed = state.candidatesStatus === "error";
  const usingApi = !failed; // API-режим, пока API не упал
  const stats = ready ? state.candidateStats : EMPTY_STATS;
  const candidates = ready
    ? state.candidatesApi
    : failed
      ? state.sessions.filter((item) => item.person.assessmentType === "Кандидат")
      : [];
  const fit = candidates
    .filter((item) => item.result.percent >= 68)
    .sort((a, b) => b.result.percent - a.result.percent);
  const risky = candidates.filter((item) => item.result.percent < 55);

  const subtitle = failed
    ? "API недоступен — показаны демо-данные"
    : ready
      ? `Данные из API · ${stats.total} кандидатов`
      : "Загрузка данных из API…";

  const kpiCards = usingApi
    ? [
        { label: "Всего кандидатов", value: stats.total, caption: "в базе", status: "neutral", target: "Кандидаты:Кандидатов всего", iconName: "candidates" },
        { label: "Оценка отправлена", value: stats.assessment_sent, caption: "сгенерировано ссылок", status: "medium", target: "Кандидаты:Оценка отправлена", iconName: "link" },
        { label: "Оценку прошли", value: stats.assessment_passed, caption: "готовы отчеты", status: getConversionStatus(72), target: "Кандидаты:Оценка пройдена", iconName: "completed" },
        { label: "Подходят", value: stats.fit, caption: "под профиль", status: "good", target: "Кандидаты:Подходят", iconName: "fit" },
        { label: "Условно подходят", value: stats.conditional, caption: "нужна проверка", status: "medium", target: "Кандидаты:Условно подходят", iconName: "balance" },
        { label: "Не подходят", value: stats.not_fit, caption: "низкий балл", status: "bad", target: "Кандидаты:Не подходит", iconName: "risk" },
        { label: "На интервью", value: stats.interview, caption: "следующий этап", status: "good", target: "Кандидаты:Интервью", iconName: "interview" },
        { label: "Приняты", value: stats.accepted, caption: "выход", status: "neutral", target: "Кандидаты:Принят", iconName: "completed" },
        { label: "Зависли", value: stats.stuck, caption: "нет движения", status: "bad", target: "Кандидаты:Зависли", iconName: "active" }
      ]
    : [
        { label: "Всего кандидатов", value: candidates.length + 128, caption: "+24 за период", status: "neutral", target: "Кандидаты:Кандидатов всего", iconName: "candidates" },
        { label: "Оценка отправлена", value: state.links.filter((x) => x.recipientType === "Кандидат").length, caption: "активные ссылки", status: "medium", target: "Кандидаты:Оценка отправлена", iconName: "link" },
        { label: "Оценку прошли", value: candidates.length, caption: "готовы отчеты", status: getConversionStatus(72), target: "Кандидаты:Оценка пройдена", iconName: "completed" },
        { label: "Подходят", value: fit.length + 24, caption: "под профиль", status: "good", target: "Кандидаты:Подходят", iconName: "fit" },
        { label: "Условно подходят", value: 11, caption: "нужна проверка", status: "medium", target: "Кандидаты:Условно подходят", iconName: "balance" },
        { label: "Не подходят", value: risky.length + 9, caption: "низкий балл", status: "bad", target: "Кандидаты:Не подходит", iconName: "risk" },
        { label: "На интервью", value: 21, caption: "следующий этап", status: "good", target: "Кандидаты:Интервью", iconName: "interview" },
        { label: "Приняты", value: 4, caption: "выход", status: "neutral", target: "Кандидаты:Принят", iconName: "completed" },
        { label: "Зависли", value: 12, caption: "нет движения", status: "bad", target: "Кандидаты:Зависли", iconName: "active" }
      ];

  const sourceItems = usingApi
    ? stats.by_source.map((s) => [s.source, s.count])
    : [["HeadHunter", 44], ["SuperJob", 24], ["Ручная", 18], ["API", 12], ["Telegram", 9]];

  const funnelItems = usingApi
    ? [
        ["Всего", stats.total],
        ["Оценку прошли", stats.assessment_passed],
        ["Подходят", stats.fit],
        ["Интервью", stats.interview],
        ["Приняты", stats.accepted]
      ].map(([label, value]) => ({ label, value, target: `Кандидаты:${label}` }))
    : dashboardData(state, "Кандидаты").funnel.map(([label, value]) => ({ label, value, target: `Кандидаты:${label}` }));

  const vacancyItems = usingApi && Array.isArray(stats.by_vacancy)
    ? stats.by_vacancy.map((v) => [v.vacancy, v.fit])
    : state.vacancies.map((item) => [item.title, item.fit]);

  const attentionItems = usingApi && Array.isArray(stats.attention) && stats.attention.length
    ? stats.attention
    : [
        { title: "12 кандидатов зависли", text: "Не прошли оценку после отправки ссылки.", status: "medium", target: "Кандидаты:Зависли" },
        { title: "Оператор call-центра", text: "Только 28% кандидатов подходят под профиль.", status: "bad", target: "Кандидаты:Оператор call-центра" }
      ];

  return DashboardPageLayout({
    title: "Кандидаты",
    subtitle,
    meta: ["точечный подбор", "офис", "IT"],
    period: state.period,
    actions: [
      { label: "Добавить кандидата", attrs: "data-action=\"add-candidate\"" },
      { label: "Импорт" },
      { label: "Создать ссылку", primary: true, attrs: "data-action=\"create-link\"" }
    ],
    filters: pageFilterConfig.candidates,
    activeFiltersMap: (state.activeFilters && state.activeFilters.candidates) || {},
    kpiCards,
    charts: [
      { title: "Воронка кандидатов", caption: "конверсия этапов", type: "funnel", items: funnelItems },
      { title: "Кандидаты по источникам", caption: "качество входа", items: sourceItems },
      { title: "Распределение по вакансиям", caption: "подходящие", items: vacancyItems },
      { title: "Кого взять в работу сейчас", caption: "top fit", wide: true, items: fit.map((item) => [item.person.fullName, item.result.percent, item.id, item.status]), note: state.company.tariff === "TalentStudio" ? "AI рекомендует сначала брать кандидатов с высоким fit и низкими красными флагами." : "AI-рекомендации доступны на тарифе TalentStudio." }
    ],
    heatmap: candidateHeatmap(state),
    attentionItems,
    table: candidatesTableConfig(candidates)
  });
}

const EMPTY_EMP_STATS = {
  total: 0, high_result: 0, medium_result: 0, low_result: 0, at_risk: 0,
  burnout: 0, avg_satisfaction: 0, avg_fit: 0, by_department: [], by_risk: []
};
const RISK_LABELS_RU = { low: "Низкий риск", medium: "Средний риск", high: "Высокий риск" };

export function renderEmployees(state) {
  const ready = Boolean(state.employeeStats && state.employeesApi);
  const failed = state.employeesStatus === "error";
  const s = ready ? state.employeeStats : EMPTY_EMP_STATS;
  const employees = ready ? state.employeesApi : [];
  const risky = employees.filter((item) => item.fit < 70 || item.turnoverRisk !== "низкий");

  const subtitle = failed
    ? "API недоступен — данные не загружены"
    : ready
      ? `Данные из API · ${s.total} сотрудников`
      : "Загрузка данных из API…";

  return DashboardPageLayout({
    title: "Сотрудники",
    subtitle,
    meta: ["оценка", "риски", "развитие"],
    period: state.period,
    actions: [
      { label: "Импорт", attrs: "data-action=\"import-employees\"" },
      { label: "Добавить сотрудника", attrs: "data-action=\"add-structure-member\"" },
      { label: "Создать оценку", primary: true, attrs: "data-action=\"open-assess-wizard\"" }
    ],
    filters: pageFilterConfig.employees,
    activeFiltersMap: (state.activeFilters && state.activeFilters.employees) || {},
    kpiCards: [
      { label: "Всего сотрудников", value: s.total, caption: "в базе", status: "neutral", target: "Сотрудники:Сотрудников всего", iconName: "employees" },
      { label: "Высокий результат", value: s.high_result, caption: "80%+", status: "good", target: "Сотрудники:Высокий результат", iconName: "fit" },
      { label: "Средний результат", value: s.medium_result, caption: "60–79%", status: "medium", target: "Сотрудники:Средний результат", iconName: "chart" },
      { label: "Низкий результат", value: s.low_result, caption: "ниже 60%", status: "bad", target: "Сотрудники:Низкий результат", iconName: "risk" },
      { label: "В зоне риска", value: s.at_risk, caption: "требуют внимания", status: "bad", target: "Сотрудники:В зоне риска", iconName: "risk" },
      { label: "Выгорание", value: s.burnout, caption: "признаки", status: "medium", target: "Сотрудники:Выгорание", iconName: "balance" },
      { label: "Средний балл", value: `${s.avg_fit}%`, caption: "соответствие", status: getFitStatus(s.avg_fit), target: "Сотрудники:Сотрудников всего", iconName: "completed" },
      { label: "Удовлетворенность", value: `${s.avg_satisfaction}%`, caption: "средняя", status: "medium", target: "Сотрудники:Удовлетворенность", iconName: "completed" }
    ],
    charts: [
      { title: "Распределение по отделам", caption: "срез базы", items: s.by_department.map((d) => [d.department, d.count]) },
      { title: "Риски сотрудников", caption: "приоритет", items: s.by_risk.map((r) => [RISK_LABELS_RU[r.level] || r.level, r.count]), note: "В первую очередь смотрим сотрудников с высоким риском увольнения." }
    ],
    attentionItems: risky.length
      ? [{ title: `${risky.length} сотрудников в зоне риска`, text: "Нужны разговоры с руководителями и ИПР.", status: "bad", target: "Сотрудники:В зоне риска" }]
      : [],
    table: employeesTableConfig(employees)
  });
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

  const ceoChildren = heads;
  const empsByHead = {};
  heads.forEach(h => {
    empsByHead[h.id] = emps.filter(e => e.managerId === h.id);
  });

  const totalPeople = allNodes.length;
  const totalDepts = state.orgTree ? state.orgTree.total_departments : state.departments.length;

  return `
    <div class="elt-dashboard">
      <header class="elt-dash-header">
        <div class="elt-dash-header-left">
          <span class="elt-mini-label">СТРУКТУРА КОМПАНИИ</span>
          <h1 class="elt-dash-title">Организационная структура</h1>
          <p class="elt-dash-subtitle">${totalPeople} сотрудников · ${totalDepts} отдела · 1 уровень управления</p>
        </div>
        <div class="elt-dash-header-actions">
          <div class="oc-view-toggle">
            <button class="oc-view-btn active" data-oc-view="list">Список</button>
            <button class="oc-view-btn" data-oc-view="chart">Org Chart</button>
          </div>
          <button class="elt-btn-primary" data-action="add-structure-member">+ Добавить</button>
        </div>
      </header>

      <div class="oc-layout">
        <!-- Left: hierarchical list -->
        <div class="oc-list-panel">
          <div class="oc-list-head">Иерархия</div>
          <div class="oc-list-body" id="ocListBody">
            ${renderListNode(ceo, 0)}
          </div>
          <div class="oc-selected-card" id="ocSelectedCard">
            <!-- Avatar upload area -->
            <div class="oc-sel-avatar-wrap">
              <div class="oc-sel-avatar" id="ocSelAvatar" data-oc-avatar="${ceo.id}">
                ${empPhoto(ceo.id) ? `<img class="oc-avatar-img" src="${empPhoto(ceo.id)}" alt="${ceo.fullName}">` : initials(ceo.fullName)}
                <div class="oc-avatar-upload-hint">📷</div>
              </div>
              <div class="oc-sel-avatar-info">
                <div class="oc-sel-name">${ceo.fullName}</div>
                <div class="oc-sel-pos">${ceo.position || "Генеральный директор"}</div>
                <label class="oc-upload-label" for="ocAvatarInput">Загрузить фото</label>
                <div class="oc-upload-hint">JPG, PNG, WebP · до 2 МБ · 400×400 px</div>
              </div>
            </div>
            <input type="file" id="ocAvatarInput" accept="image/jpeg,image/png,image/webp" style="display:none" data-avatar-upload="${ceo.id}">
            <div class="oc-upload-error" id="ocAvatarError" style="display:none"></div>
            <div class="oc-sel-row"><span>Отдел</span><b>${ceo.department || "Управление"}</b></div>
            <div class="oc-sel-row"><span>Подчинённых</span><b>${heads.length} руководителя</b></div>
            <div class="oc-sel-row"><span>Всего в команде</span><b>${totalPeople} чел.</b></div>
          </div>
        </div>

        <!-- Right: visual org chart -->
        <div class="oc-chart-panel" id="ocChartPanel">
          <!-- CEO row -->
          <div class="oc-chart-row oc-chart-row-ceo">
            ${renderChartCard(ceo)}
          </div>
          <!-- Connector -->
          <div class="oc-chart-connector-v"></div>
          <div class="oc-chart-connector-h" style="width:${Math.max(1, ceoChildren.length - 1) * 180}px"></div>
          <!-- Heads row -->
          <div class="oc-chart-row">
            ${ceoChildren.map(h => renderChartCard(h)).join("")}
          </div>
          <!-- Connector -->
          <div class="oc-chart-connector-v"></div>
          <!-- Employees row -->
          <div class="oc-chart-row">
            ${emps.map(e => renderChartCard(e)).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderConstructor(state) {
  const tests = state.constructorTests || [];
  const sel = state.constructorTest;
  const loading = state.constructorStatus === "loading" && !tests.length;
  const typeLabel = { single_choice: "Один вариант", multiple_choice: "Несколько вариантов", open: "Открытый", scale: "Шкала" };

  const testList = tests.length
    ? tests.map((t) => `<button class="elt-profile-row${sel && sel.id === t.id ? " selected" : ""}" data-select-test="${t.id}"><b>${t.title}</b><span>${t.category || t.target_type} · ${t.questions_count} вопр.</span></button>`).join("")
    : `<p class="elt-card-caption" style="padding:8px">${loading ? "Загрузка…" : "Тестов пока нет — создайте первый."}</p>`;

  const questionCard = (q) => {
    let detail = "";
    if (q.type === "single_choice" || q.type === "multiple_choice") {
      detail = `<ul class="ctr-opts">${q.options.map((o) => `<li><span>${o.text}</span><em>${o.score} б.${o.is_correct ? " ✓" : ""}${o.is_red_flag ? " ⚑" : ""}</em></li>`).join("")}</ul>`;
    } else if (q.type === "scale") {
      detail = `<p class="elt-card-caption">Шкала ${q.scale_min}–${q.scale_max}</p>`;
    } else if (q.type === "open") {
      detail = `<p class="elt-card-caption">Открытый · AI-оценка${q.ai_reference ? ` · эталон: ${q.ai_reference}` : ""}</p>`;
    }
    return `<div class="ctr-question">
      <div class="ctr-q-head">
        <span class="ctr-q-type">${typeLabel[q.type] || q.type}</span>
        ${q.competency ? `<span class="ctr-q-comp">${q.competency}</span>` : ""}
        <span class="ctr-q-max">макс ${q.max_score}</span>
        <button class="ctr-q-del" data-test-id="${sel.id}" data-delete-question="${q.id}">✕</button>
      </div>
      <h4>${q.text}</h4>
      ${detail}
    </div>`;
  };

  const right = sel ? `
    <div class="elt-card">
      <div class="elt-card-head">
        <div><h2>${sel.title}</h2><span class="elt-card-caption">${sel.category || sel.target_type} · ${sel.questions_count} вопросов · макс ${sel.max_score} б.</span></div>
        <button class="elt-btn-danger" data-delete-test="${sel.id}">Удалить тест</button>
      </div>
      <div class="ctr-questions">
        ${sel.questions.length ? sel.questions.map(questionCard).join("") : '<p class="elt-card-caption" style="padding:8px">Вопросов нет. Добавьте первый ниже.</p>'}
      </div>
    </div>
    <div class="elt-card">
      <div class="elt-card-head"><h2>Добавить вопрос</h2><span class="elt-card-caption">динамически</span></div>
      <form class="elt-form-grid" data-add-question-form data-test-id="${sel.id}">
        <label class="elt-label elt-label-full">Текст вопроса<input class="elt-input" name="text" placeholder="Сформулируйте вопрос" required></label>
        <label class="elt-label">Тип<select class="elt-select" name="type">
          <option value="single_choice">Один вариант</option>
          <option value="multiple_choice">Несколько вариантов</option>
          <option value="scale">Шкала (1–5)</option>
          <option value="open">Открытый (AI)</option>
        </select></label>
        <label class="elt-label">Компетенция<input class="elt-input" name="competency_name" placeholder="напр. Коммуникация"></label>
        <div class="elt-label-full ctr-hint">Варианты — текст · балл · верный · red flag. Шкала — границы. Открытый — эталон/критерии для AI.</div>
        ${[1, 2, 3, 4].map((i) => `<div class="elt-label-full ctr-opt-row">
          <input class="elt-input" name="opt${i}" placeholder="Вариант ${i}">
          <input class="elt-input ctr-score" name="score${i}" type="number" value="0" title="Балл">
          <label class="ctr-chk"><input type="checkbox" name="correct${i}"> верный</label>
          <label class="ctr-chk"><input type="checkbox" name="flag${i}"> red&nbsp;flag</label>
        </div>`).join("")}
        <label class="elt-label">Шкала: мин<input class="elt-input" name="scale_min" type="number" value="1"></label>
        <label class="elt-label">Шкала: макс<input class="elt-input" name="scale_max" type="number" value="5"></label>
        <label class="elt-label">Открытый: макс. балл<input class="elt-input" name="max_score" type="number" value="5"></label>
        <label class="elt-label elt-label-full">Открытый: эталонный ответ<input class="elt-input" name="ai_reference" placeholder="Что считается хорошим ответом"></label>
        <label class="elt-label elt-label-full">Открытый: критерии для AI<input class="elt-input" name="ai_criteria" placeholder="Критерии оценки"></label>
        <div class="elt-label-full"><button class="elt-btn-primary" type="submit">+ Добавить вопрос</button></div>
      </form>
    </div>
  ` : `<div class="elt-card"><p class="elt-card-caption" style="padding:24px">Выберите тест слева или создайте новый, чтобы добавлять вопросы.</p></div>`;

  return `
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Конструктор</span>
          <h1 class="elt-page-title">Конструктор тестов</h1>
          <p class="elt-page-subtitle">Создавайте тесты и добавляйте вопросы (один/несколько вариантов, шкала, открытый). Всё хранится в API.</p>
        </div>
      </div>
      <div class="elt-constructor-grid">
        <div class="elt-constructor-sidebar">
          <div class="elt-card">
            <div class="elt-card-head"><h2>Тесты</h2><span class="elt-card-caption">${tests.length}</span></div>
            <div class="elt-profile-rows">${testList}</div>
          </div>
          <div class="elt-card">
            <div class="elt-card-head"><h2>Создать тест</h2></div>
            <form class="elt-form-grid" data-create-test-form>
              <label class="elt-label elt-label-full">Название<input class="elt-input" name="title" placeholder="напр. Оценка менеджера" required></label>
              <label class="elt-label">Категория<input class="elt-input" name="category" placeholder="Коммерция"></label>
              <label class="elt-label">Для кого<select class="elt-select" name="target_type"><option value="candidate">Кандидат</option><option value="employee">Сотрудник</option><option value="group">Группа</option></select></label>
              <div class="elt-label-full"><button class="elt-btn-primary" type="submit">+ Создать тест</button></div>
            </form>
          </div>
        </div>
        <div class="elt-constructor-main">${right}</div>
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
    activeFiltersMap: (state.activeFilters && state.activeFilters.vacancies) || {},
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

// Таблица живых вакансий из hh.ru.
function hhVacanciesTableConfig(items, loading) {
  return {
    title: "Вакансии hh.ru",
    caption: "активные вакансии работодателя",
    columns: ["Вакансия", "Регион", "Отклики", "Новые", "Действия"],
    rows: items.length
      ? items.map((v) => [
          escapeHtml(v.title),
          escapeHtml(v.area || "—"),
          v.responses,
          v.new_responses ? `<b style="color:#F59E0B">${v.new_responses}</b>` : "0",
          v.url ? `<a class="elt-action-pill" href="${v.url}" target="_blank" rel="noopener">Открыть на hh.ru ↗</a>` : "—",
        ])
      : [[loading ? "Загрузка из hh.ru…" : "Активных вакансий не найдено", "", "", "", ""]],
  };
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
    <div class="elt-page-wrap">
      <div class="elt-page-header">
        <div class="elt-page-header-left">
          <span class="elt-mini-label">Библиотека тестов</span>
          <h1 class="elt-page-title">Профили и тесты</h1>
          <p class="elt-page-subtitle">Единая структура: секции, профнаправления, универсальные черты и уровни должностей.</p>
        </div>
        <div class="elt-page-actions">
          <button class="elt-btn-primary" data-action="create-link">+ Создать ссылку</button>
        </div>
      </div>
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
  return DashboardPageLayout({
    title: "Адаптация",
    subtitle: "Новые сотрудники, этапы 1/3/7/14/30/60/90 дней и причины риска.",
    meta: ["онбординг", "пульс-опросы", "риски"],
    period: state.period,
    actions: [{ label: "Запустить опрос адаптации", primary: true, attrs: "data-action=\"create-link\"" }],
    filters: pageFilterConfig.adaptation,
    activeFiltersMap: (state.activeFilters && state.activeFilters.adaptation) || {},
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
    activeFiltersMap: (state.activeFilters && state.activeFilters["360"]) || {},
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
  const ready = Boolean(state.employeesApi);
  const failed = state.employeesStatus === "error";
  const employees = ready ? state.employeesApi : [];

  // ��������� ������ ��������� ����������� (fit != null). ��������� � ��� �������.
  const assessed = employees.filter((e) => e.fit !== null && e.fit !== undefined);
  const notAssessed = employees.length - assessed.length;

  // ���������������� = ������������ ��������� (fit); ��������� � ��
  // ���������������� � ����� ����� (�������� ���� ����������).
  const perf = (e) => e.fit;
  const pot = (e) => {
    let p = e.satisfaction || 0;
    if (e.turnoverRisk === "����������") p -= 15;
    else if (e.turnoverRisk === "�������") p -= 7;
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

  // ���� Performance Review � �� �������� ��������� ������ �� ����� �����.
  const prLinks = (state.linksApi || []).filter(
    (l) => l.professionTitle === "Performance Review" && l.recipientType === "���������"
  );
  const inCycle = prLinks.length;
  const completed = prLinks.filter((l) => l.status === "completed").length;

  const subtitle = failed
    ? "API ���������� � ������ �� ���������"
    : ready
      ? `������ �� API � ������� ${assessed.length} �� ${employees.length} � ${inCycle} � ����� review`
      : "�������� ������ �� API�";

  const attentionItems = [];
  if (lowPerf > 0) attentionItems.push({ title: `${lowPerf} � ������ �����������������`, text: "����� ������ ������ � ���� ���������.", status: "bad", target: "Performance Review:������ performance" });
  if (hipo > 0) attentionItems.push({ title: `${hipo} HiPo-�����������`, text: "������� performance � ��������� � ����������� �������� � ���������.", status: "good", target: "Performance Review:HiPo" });
  if (inCycle > completed) attentionItems.push({ title: `${inCycle - completed} review �� ���������`, text: "������ ����������, �� ������ ��� �� ��������.", status: "medium", target: "Performance Review:���������" });

  return DashboardPageLayout({
    title: "Performance Review",
    subtitle,
    meta: ["performance", "potential", "�������� ������"],
    period: state.period,
    actions: [{ label: "��������� review", primary: true, attrs: "data-action=\"open-assess-wizard\"" }],
    filters: pageFilterConfig.performance,
    activeFiltersMap: (state.activeFilters && state.activeFilters.performance) || {},
    kpiCards: [
      { label: "� �����", value: inCycle, caption: "review ����������", status: "neutral", target: "Performance Review:� �����" },
      { label: "���������", value: completed, caption: "review ��������", status: "medium", target: "Performance Review:���������" },
      { label: "������� performance", value: highPerf, caption: "80%+", status: "good", target: "Performance Review:������� performance" },
      { label: "������ performance", value: lowPerf, caption: "���� 60%", status: "bad", target: "Performance Review:������ performance" },
      { label: "������� ���������", value: hipo, caption: "HiPo", status: "good", target: "Performance Review:HiPo" },
      { label: "�������� ������", value: reserve, caption: "��������", status: "good", target: "Performance Review:�������� ������" },
      { label: "�� ������", value: notAssessed, caption: "��� ���������� ������", status: "neutral", target: "Performance Review:�� ������" }
    ],
    matrixHtml: assessed.length
      ? `<article class="elt-panel elt-chart-panel elt-wide">
          <div class="elt-panel-head"><div class="elt-panel-head-left"><h2>9-box: Performance ? Potential</h2></div><span class="elt-panel-caption">�� ${assessed.length} ���������</span></div>
          ${nineBoxGrid(assessed, perf, pot)}
        </article>`
      : "",
    charts: [
      { title: "Performance / Potential", caption: "������� � ��������", items: [["��. ����������������", avgPerf], ["��. ���������", avgPot], ["HiPo", hipo], ["������", reserve]] }
    ],
    heatmap: employeeHeatmap(state),
    attentionItems,
    table: employeesTableConfig(employees)
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
        <div class="elt-table-panel">
          ${(() => {
            const apiReady = state.linksStatus === "ready" && Array.isArray(state.linksApi);
            const allRows = apiReady ? state.linksApi : state.links;
            const loading = state.linksStatus === "loading" && !state.linksApi;
            const filter = state.linksFilter || "all";
            // Тип получателя нормализуем: API отдаёт «Сотрудник/Кандидат», локальные
            // ссылки мастера могут использовать английский "employee".
            const typeOf = (link) => (link.recipientType === "Сотрудник" || link.recipientType === "employee") ? "Сотрудник" : "Кандидат";
            const rows = filter === "all" ? allRows : allRows.filter((link) => typeOf(link) === filter);
            const caption = loading ? "загрузка…" : `${rows.length} ссылок`;
            const filterBtn = (value, label) => `<button class="${filter === value ? "active" : ""}" data-links-filter="${value}">${label}</button>`;
            const filterBar = `<div class="filterBar compact" style="padding-top:12px;padding-left:16px">${filterBtn("all", "Все")}${filterBtn("Кандидат", "Только кандидаты")}${filterBtn("Сотрудник", "Только сотрудники")}</div>`;
            const body = rows.length
              ? rows.map((link) => `<tr><td>${link.fullName || typeOf(link)}</td><td><span class="elt-status-badge ${typeOf(link) === "Сотрудник" ? "status-medium" : "status-neutral"}">${typeOf(link)}</span></td><td>${link.professionTitle}${link.percent != null ? ` · <b>${link.percent}%</b>` : ""}</td><td>${link.email || link.phone || "<span class='elt-warn-text'>нет контакта</span>"}</td><td><code class="elt-code">${location.origin}${location.pathname}#/assess/${link.token}</code>${link.warning ? `<small class="elt-warn-text">${link.warning}</small>` : ''}</td><td><span class="elt-status-badge elt-status-${link.status}">${statusText(link.status)}</span></td><td><div class="elt-row-actions">${link.status === "completed" ? "" : `<button class="elt-btn-ghost" data-open-assess="${link.token}">Открыть</button>`}<button class="elt-btn-ghost">Скопировать</button>${!link.fromApi && canCancel(link) ? `<button class="elt-btn-danger" data-cancel-link="${link.token}">Отменить</button>` : ''}</div></td></tr>`).join('')
              : `<tr><td colspan="7" style="text-align:center;color:#94A3B8;padding:24px">${loading ? "Загрузка оценок…" : allRows.length ? "Нет оценок для выбранного фильтра." : "Оценок пока нет. Создайте оценку кнопкой «Создать оценку»."}</td></tr>`;
            return `<div class="elt-table-head"><h2>Оценочные ссылки</h2><span class="elt-card-caption">${caption}</span></div>
          ${filterBar}
          <div class="elt-table-wrap">
            <table class="elt-table"><thead><tr><th>Получатель</th><th>Тип</th><th>Профиль</th><th>Контакт</th><th>Ссылка</th><th>Статус</th><th></th></tr></thead><tbody>
              ${body}
            </tbody></table>
          </div>`;
          })()}
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
    activeFiltersMap: (state.activeFilters && state.activeFilters.reports) || {},
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
        <header class="reportHeader"><img src="/public/assets/eltera_logo_horizontal_on_light.png" alt="Eltera"><div><b>${new Date(session.completedAt).toLocaleDateString("ru-RU")} · конфиденциально</b><span>Отчет оценки ${session.person.assessmentType.toLowerCase()}</span></div></header>
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
            <label class="elt-label elt-label-full">Логотип компании
              <label class="elt-file-upload-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span id="elt-file-name">Выбрать файл</span>
                <input type="file" accept="image/*" style="display:none" onchange="document.getElementById('elt-file-name').textContent=this.files[0]?.name||'Выбрать файл'">
              </label>
            </label>
            <label class="elt-label">Часовой пояс<select class="elt-select"><option>Europe/Moscow</option><option>Europe/Kaliningrad</option><option>Asia/Yekaterinburg</option><option>Asia/Novosibirsk</option><option>Asia/Vladivostok</option></select></label>
            <label class="elt-label">Язык интерфейса<select class="elt-select"><option>Русский</option><option>English</option></select></label>
            <div><button class="elt-btn-primary">Сохранить</button></div>
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

function renderAssessQuestionApi(question, index, total) {
  const head = `<div class="questionHead"><span>${question.competency || "Компетенция"}</span><b>${index + 1}/${total}</b></div>`;
  const qid = question.question_version_id;
  let body = "";
  if (question.type === "single_choice") {
    body = `<div class="answers">${question.options.map((o) => `<label class="answer"><input type="radio" required name="${qid}" value="${o.id}"><span>${o.text}</span></label>`).join("")}</div>`;
  } else if (question.type === "multiple_choice") {
    body = `<div class="answers"><p class="answersHint">Выберите все подходящие варианты</p>${question.options.map((o) => `<label class="answer"><input type="checkbox" name="m_${qid}" value="${o.id}"><span>${o.text}</span></label>`).join("")}</div>`;
  } else if (question.type === "scale") {
    const min = question.scale_min ?? 1;
    const max = question.scale_max ?? 5;
    const cells = [];
    for (let v = min; v <= max; v++) {
      cells.push(`<label class="scaleCell"><input type="radio" required name="${qid}" value="${v}"><span>${v}</span></label>`);
    }
    body = `<div class="scaleRow">${cells.join("")}</div>`;
  } else {
    body = `<textarea class="openAnswer" name="o_${qid}" rows="4" placeholder="Ваш ответ"></textarea>`;
  }
  return `<article class="questionCard"><div>${head}</div><h3>${question.text}</h3>${body}</article>`;
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

  // Тест с бэка: отрисовываем реальные вопросы конкретного теста (все типы).
  if (apiForm !== undefined) {
    const title = (apiForm && apiForm.title) || link.professionTitle || "Оценка";
    const header = `<header class="candidateHeader"><img src="/public/assets/eltera_logo_horizontal_on_light.png" alt="Eltera"></header>`;
    if (formError) {
      return `<div class="candidatePage">${header}<main class="candidateCard"><h1>${title}</h1><p>${formError}</p><a class="blueButton" href="#/">На главную</a></main></div>`;
    }
    if (!apiForm) {
      return `<div class="candidatePage">${header}<main class="candidateCard"><h1>${title}</h1><p>Загружаем тест…</p></main></div>`;
    }
    const total = apiForm.questions.length;
    return `<div class="candidatePage">${header}<main class="candidateCard"><span class="miniLabel">${link.recipientType || link.assessmentType || "Кандидат"} · ${apiForm.title}</span><h1>${apiForm.title}</h1><p>${apiForm.summary || "Заполните данные и ответьте на вопросы. Компания получит отчет после завершения оценки."}</p><form class="candidateForm" data-candidate-form><label>ФИО<input name="fullName" required value="${apiForm.full_name || link.fullName || ""}" placeholder="Иванов Иван"></label><label>Телефон<input name="phone" value="${apiForm.phone || link.phone || ""}" placeholder="+7..."></label><label>Email<input name="email" value="${apiForm.email || link.email || ""}" placeholder="name@example.com"></label><label>Город<input name="city" placeholder="Москва"></label><label class="checkboxLine"><input type="checkbox" required><span>Согласен на обработку персональных данных</span></label><div class="questionList compact">${apiForm.questions.map((q, i) => renderAssessQuestionApi(q, i, total)).join("")}</div><button class="blueButton wide" type="submit">Завершить оценку</button></form></main></div>`;
  }

  return `
    <div class="candidatePage"><header class="candidateHeader"><img src="/public/assets/eltera_logo_horizontal_on_light.png" alt="Eltera"></header><main class="candidateCard"><span class="miniLabel">${link.recipientType} · ${link.professionTitle || profession.title}</span><h1>${link.professionTitle || profession.title}</h1><p>Заполните данные и ответьте на вопросы. Компания получит отчет после завершения оценки.</p><form class="candidateForm" data-candidate-form><label>ФИО<input name="fullName" required value="${link.fullName || ""}" placeholder="Иванов Иван"></label><label>Телефон<input name="phone" value="${link.phone || ""}" placeholder="+7..."></label><label>Email<input name="email" value="${link.email || ""}" placeholder="name@example.com"></label><label>Город<input name="city" placeholder="Москва"></label><label class="checkboxLine"><input type="checkbox" required><span>Согласен на обработку персональных данных</span></label><div class="questionList compact">${questions.map((question, index) => `<article class="questionCard"><div class="questionHead"><span>${competencyTitleById[question.competencyId] || question.competencyId}</span><b>${index + 1}/${questions.length}</b></div><h3>${question.text}</h3><div class="answers">${question.answers.map((answer, answerIndex) => `<label class="answer"><input type="radio" required name="${question.id}" value="${answerIndex}" ${answers[question.id] === answerIndex ? "checked" : ""}><span>${answer.text}</span></label>`).join("")}</div></article>`).join("")}</div><button class="blueButton wide" type="submit">Завершить оценку</button></form></main></div>
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

function renderModal(state) {
  const mHead = (title, icon = '') => `<div class="modal-head"><div class="modal-head-left">${icon ? `<span class="modal-head-icon">${icon}</span>` : ''}<h2 class="modal-head-title">${title}</h2></div><button class="modal-close-btn" data-action="close-modal" title="Закрыть"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`;

  if (state.modal?.type === "list") {
    const [scope, metricName] = state.modal.target.split(":");
    // Этап адаптации (клик по воронке) — отдельная модалка с чек-инами этапа.
    // Отдельный scope, чтобы не пересекаться с дрилл-дауном KPI-карточек («Адаптация»).
    if (scope === "Этап адаптации") {
      return `<div class="modalBackdrop"><div class="modal modalWide">${mHead(`Этап адаптации: ${metricName}`, '🧭')}<div class="modal-inner">${renderAdaptationStageList(state, metricName)}</div></div></div>`;
    }
    // «Оценка отправлена / Отправлено ссылок» — это метрика по числу ССЫЛОК,
    // поэтому показываем список ссылок, а не кандидатов.
    if (scope === "Кандидаты" && /отправлен|ссыл/i.test(metricName || "")) {
      const links = (state.linksApi || []).filter((l) => l.recipientType === "Кандидат");
      const loading = state.linksApi == null;
      const body = loading ? `<p class="elt-card-caption" style="padding:12px">Загрузка ссылок…</p>` : renderLinksTable(links);
      return `<div class="modalBackdrop"><div class="modal modalWide">${mHead(`${scope}: ${metricName}`, '🔗')}<div class="modal-inner">${body}</div></div></div>`;
    }
    // Адаптация «Опросы отправлены/пройдены» — это число опросов (ссылок), а не
    // людей: показываем список пульс-опросов адаптации (вкл. ADAPT-DAY).
    if (scope === "Адаптация" && /опрос/i.test(metricName || "")) {
      const done = /пройд/i.test(metricName || "");
      const links = (state.linksApi || []).filter((l) =>
        (l.professionTitle || "").startsWith("Адаптация") && l.recipientType === "Сотрудник" && (!done || l.status === "completed"));
      const loading = state.linksApi == null;
      const body = loading ? `<p class="elt-card-caption" style="padding:12px">Загрузка опросов…</p>` : renderLinksTable(links);
      return `<div class="modalBackdrop"><div class="modal modalWide">${mHead(`${scope}: ${metricName}`, '🔗')}<div class="modal-inner">${body}</div></div></div>`;
    }
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
  if (metricName.includes("пройден")) return candidates.filter(passed);
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

function employeeCardApi(d) {
  const riskRu = { low: "низкий", medium: "средний", high: "повышенный" };
  const fitColor = (d.fit ?? 0) >= 80 ? "#16A34A" : (d.fit ?? 0) >= 60 ? "#F59E0B" : "#DC2626";
  return `<div class="personCard">
    <b>${d.full_name}</b>
    <span>${d.position || "Сотрудник"}${d.department ? " · " + d.department : ""}</span>
    <dl>
      <dt>Соответствие</dt><dd style="color:${fitColor};font-weight:600">${d.fit ?? 0}%</dd>
      <dt>Руководитель</dt><dd>${d.manager || "—"}</dd>
      <dt>Проект</dt><dd>${d.project || "—"}</dd>
      <dt>Риск увольнения</dt><dd>${riskRu[d.turnover_risk] || d.turnover_risk || "—"}</dd>
      <dt>Выгорание</dt><dd>${d.burnout || "—"}</dd>
      <dt>Удовлетворённость</dt><dd>${d.satisfaction != null ? d.satisfaction + "%" : "—"}</dd>
      <dt>Рекомендация</dt><dd>${d.recommendation || "—"}</dd>
    </dl>
  </div>`;
}

function candidateCard(d) {
  const a = d.assessment;
  const percent = a ? a.percent : 0;
  const risk = Math.max(0, 100 - percent);
  const passed = a && (a.status === "scored" || a.status === "reviewed" || a.status === "submitted");
  const recommend = passed ? percent >= 55 : null;
  const recColor = recommend === null ? "#64748B" : recommend ? "#16A34A" : "#DC2626";
  const recText = recommend === null
    ? "Тест ещё не пройден"
    : recommend ? "Рекомендуем рассмотреть" : "Не рекомендуем рассмотреть";
  const fitColor = percent >= 68 ? "#16A34A" : percent >= 55 ? "#F59E0B" : "#DC2626";
  return `<div class="personCard">
    <b>${d.full_name}</b>
    <span>${d.vacancy_title || "Кандидат"}</span>
    <dl>
      <dt>Соответствие</dt><dd style="color:${fitColor};font-weight:600">${percent}%</dd>
      <dt>Риск (не справится)</dt><dd>${risk}%</dd>
      <dt>Город</dt><dd>${d.city || "—"}</dd>
      <dt>Источник</dt><dd>${d.source || "—"}</dd>
      <dt>Рекомендация</dt><dd style="color:${recColor};font-weight:600">${recText}</dd>
    </dl>
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
          <img src="/public/assets/eltera_logo_horizontal_on_dark.png?v=5" alt="Eltera" height="28">
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
  const professions = (state.testsApi || []).map((t) => ({ id: t.id, title: t.title, category: t.category || "тест" }));
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
        { id: "potential", icon: svgPotential,  title: "Оценка потенциала",    desc: "Анализ потенциала роста и карьерных перспектив сотрудника.",                 soon: true  },
        { id: "ipr",       icon: svgCompetency, title: "ИПР / план развития",  desc: "Индивидуальный план развития на основе результатов оценки.",                 soon: true  },
        { id: "risk",      icon: svgRisk,       title: "Оценка рисков",        desc: "Выявление рисков удержания, выгорания и снижения эффективности.",            soon: true  },
      ],
      group: [
        { id: "review",    icon: svgReview,     title: "Групповой Performance Review", desc: "Оценка результативности группы. Отчёты по каждому + сравнение.",  soon: false },
        { id: "standard",  icon: svgCompetency, title: "Оценка компетенций группы",    desc: "Массовый запуск оценки компетенций для выбранных сотрудников.",   soon: false },
        { id: "360",       icon: svg360,        title: "Массовый запуск 360°",         desc: "Индивидуальные 360 для каждого. Отчёты формируются отдельно.",     soon: false },
        { id: "ninebox",   icon: svgNineBox,    title: "9-Box группы",                 desc: "Расстановка группы по матрице Performance × Potential.",           soon: true  },
        { id: "assessment",icon: svgGroup,      title: "Ассессмент группы",            desc: "Структурированная оценка для кадрового резерва.",                  soon: true  },
        { id: "rating",    icon: svgRating,     title: "Сравнительный рейтинг",        desc: "Ранжирование сотрудников по компетенциям и результатам.",           soon: true  },
      ],
      dept: [
        { id: "review",    icon: svgReview,     title: "Performance Review отдела",       desc: "Оценка результативности всех сотрудников отдела.",                    soon: false },
        { id: "standard",  icon: svgCompetency, title: "Оценка эффективности отдела",     desc: "Массовый запуск оценки компетенций по всему отделу.",                 soon: false },
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

    // ── 3a: Performance Review ────────────────────────────────────────────────────────────────
    if (assessType === 'review') {
      const prVals = w.prValues || {};
      const prScales = [
        { key: 'performance', label: 'Результативность', desc: 'Насколько сотрудник достигает целей и KPI', opts: ['Низкая','Ниже ожиданий','Соответствует','Выше ожиданий','Исключительная'] },
        { key: 'potential',   label: 'Потенциал',        desc: 'Способность к росту и развитию',        opts: ['Низкий','Ограниченный','Умеренный','Высокий','Исключительный'] }
      ];
      const pi = prVals.performance ?? -1;
      const po = prVals.potential ?? -1;
      const nineBoxMap = {
        '00':'Зона риска','01':'Зона риска','10':'Зона риска','11':'Зона развития',
        '02':'Стабильный','20':'Стабильный','12':'Стабильный','21':'Стабильный','22':'Стабильный',
        '03':'Стабильный','30':'Стабильный','13':'Перспективный','31':'Перспективный',
        '04':'HiPo','40':'HiPo','14':'HiPo','41':'HiPo','23':'Перспективный','32':'Перспективный',
        '24':'HiPo','42':'HiPo','33':'Перспективный','34':'HiPo','43':'HiPo','44':'HiPo'
      };
      const nbLabel = pi >= 0 && po >= 0 ? (nineBoxMap[`${pi}${po}`] || 'Стабильный') : null;
      const nbColor = nbLabel === 'HiPo' ? '#00E5D4' : nbLabel === 'Перспективный' ? '#1E5BFF' : nbLabel === 'Зона риска' ? '#e07070' : '#6b7a99';
      const sendCount = scope === 'dept' ? (departments.find(d=>d.name===deptSelected)?.employees||0) : selected.length;
      const canSend = (scope === 'dept' ? !!deptSelected : selected.length > 0) && pi >= 0 && po >= 0 && !!deadline;
      bodyHtml = `
        <div class="aw-step3-layout">
          <div class="aw-step3-left">
            <span class="aw-field-label">${scope==='dept'?'Отдел':scope==='group'?'Сотрудники (мультивыбор)':'Сотрудник'}</span>
            ${empSelectHtml('Поиск по имени, должности...', 'Выбрано')}
          </div>
          <div class="aw-step3-right">
            <div class="aw-pr-scales">
              ${prScales.map(s => `
                <div class="aw-pr-scale">
                  <span class="aw-field-label">${s.label}</span>
                  <span class="aw-pr-scale-desc">${s.desc}</span>
                  <div class="aw-pr-opts">
                    ${s.opts.map((opt,idx) => `<button class="aw-pr-opt ${prVals[s.key]===idx?'selected':''}" data-aw-pr-key="${s.key}" data-aw-pr-val="${idx}">${opt}</button>`).join('')}
                  </div>
                </div>`).join('')}
            </div>
            ${nbLabel ? `<div class="aw-ninebox-preview">
              <span class="aw-field-label">9-Box категория</span>
              <div class="aw-ninebox-badge" style="background:${nbColor}20;border:1px solid ${nbColor}40;color:${nbColor}">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="5.3" y="1" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="9.5" y="1" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="5.3" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="5.3" y="5.3" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="9.5" y="5.3" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="9.5" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="5.3" y="9.5" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/><rect x="9.5" y="9.5" width="3.5" height="3.5" rx=".7" stroke="currentColor" stroke-width="1.2"/></svg>
                ${nbLabel}
              </div></div>` : ''}
            ${deadlineHtml}
            ${canSend ? `<div class="aw-send-preview"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" stroke="currentColor" stroke-width="1.3"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>Будет запущено <strong>${sendCount}</strong> ревью</div>` : ''}
          </div>
        </div>
        <div class="aw-footer">
          <button class="elt-btn-ghost" data-aw-back="2">← Назад</button>
          <button class="blueButton" data-aw-send-review ${!canSend?'disabled':''}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5L11.5 1.5l-5 10-1-4.5-4.5-0.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Запустить ревью${sendCount>1?` (${sendCount})`:''}
          </button>
        </div>`;

    // ── 3b: Оценка 360 ────────────────────────────────────────────────────────────────
    } else if (assessType === '360') {
      const roles360 = w.roles360 || { self: true, manager: false, peers: 0, reports: 0 };
      const totalRaters = (roles360.self?1:0) + (roles360.manager?1:0) + roles360.peers + roles360.reports;
      const canSend = selected.length > 0 && totalRaters >= 2 && !!deadline;
      bodyHtml = `
        <div class="aw-step3-layout">
          <div class="aw-step3-left">
            <span class="aw-field-label">Кого оцениваем</span>
            ${empSelectHtml('Кого оцениваем? Поиск по имени...', 'Оцениваемых')}
          </div>
          <div class="aw-step3-right">
            <div class="aw-360-roles">
              <span class="aw-field-label">Роли оценщиков</span>
              <span class="aw-pr-scale-desc">Минимум 2 роли. Каждая роль получает отдельную ссылку.</span>
              <div class="aw-role-list">
                <div class="aw-role-row ${roles360.self?'':'off'}">
                  <div class="aw-role-info">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                    <div><strong>Самооценка</strong><span>Сотрудник оценивает себя сам</span></div>
                  </div>
                  <button class="aw-role-toggle ${roles360.self?'on':''}" data-aw-role="self" data-aw-role-val="toggle">${roles360.self?'Вкл':'Выкл'}</button>
                </div>
                <div class="aw-role-row ${roles360.manager?'':'off'}">
                  <div class="aw-role-info">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.6 3.5L8 10l-3.1 1.5.6-3.5L3 5.5 6.5 5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
                    <div><strong>Руководитель</strong><span>Прямой руководитель</span></div>
                  </div>
                  <button class="aw-role-toggle ${roles360.manager?'on':''}" data-aw-role="manager" data-aw-role-val="toggle">${roles360.manager?'Вкл':'Выкл'}</button>
                </div>
                <div class="aw-role-row ${roles360.peers>0?'':'off'}">
                  <div class="aw-role-info">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="11" cy="5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M1 14c0-2.21 1.79-4 4-4M15 14c0-2.21-1.79-4-4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                    <div><strong>Коллеги</strong><span>Сотрудники одного уровня</span></div>
                  </div>
                  <div class="aw-role-counter">
                    <button class="aw-cnt-btn" data-aw-role="peers" data-aw-role-val="dec">−</button>
                    <span class="aw-cnt-val">${roles360.peers}</span>
                    <button class="aw-cnt-btn" data-aw-role="peers" data-aw-role-val="inc">+</button>
                  </div>
                </div>
                <div class="aw-role-row ${roles360.reports>0?'':'off'}">
                  <div class="aw-role-info">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 9v5M5.5 11.5l2.5-2.5 2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <div><strong>Подчинённые</strong><span>Сотрудники в подчинении</span></div>
                  </div>
                  <div class="aw-role-counter">
                    <button class="aw-cnt-btn" data-aw-role="reports" data-aw-role-val="dec">−</button>
                    <span class="aw-cnt-val">${roles360.reports}</span>
                    <button class="aw-cnt-btn" data-aw-role="reports" data-aw-role-val="inc">+</button>
                  </div>
                </div>
              </div>
              ${totalRaters >= 2
                ? `<div class="aw-360-summary">Всего оценщиков на 1 чел.: <strong>${totalRaters}</strong> · Ссылок: <strong>${selected.length * totalRaters}</strong></div>`
                : `<div class="aw-360-warn">Выберите минимум 2 роли</div>`}
            </div>
            ${deadlineHtml}
            ${canSend ? `<div class="aw-send-preview"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" stroke="currentColor" stroke-width="1.3"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>Будет отправлено <strong>${selected.length * totalRaters}</strong> ссылок</div>` : ''}
          </div>
        </div>
        <div class="aw-footer">
          <button class="elt-btn-ghost" data-aw-back="2">← Назад</button>
          <button class="blueButton" data-aw-send-360 ${!canSend?'disabled':''}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5L11.5 1.5l-5 10-1-4.5-4.5-0.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${scope==='dept'?'Запустить 360° по отделу':scope==='group'?'Запустить массовый 360°':'Запустить 360°'}${selected.length>0?` (${selected.length})`:''}
          </button>
        </div>`;

    // ── 3c: Стандартная оценка ────────────────────────────────────────────────────────────────
    } else {
      const profListHtml = `<div class="aw-prof-select">
        <span class="aw-field-label">Профиль оценки</span>
        <div class="aw-prof-grid">
          ${professions.slice(0,6).map(p=>`<button class="aw-prof-btn ${profId===p.id?'selected':''}" data-aw-prof="${p.id}"><strong>${p.title}</strong><span>${p.category}</span></button>`).join('')}
        </div></div>`;
      const canSend = (scope==='dept'?!!deptSelected:selected.length>0) && !!profId && !!deadline;
      const sendCount = scope==='dept'?(departments.find(d=>d.name===deptSelected)?.employees||0):selected.length;
      bodyHtml = `
        <div class="aw-step3-layout">
          <div class="aw-step3-left">
            <span class="aw-field-label">${scope==='dept'?'Отдел':scope==='group'?'Сотрудники (мультивыбор)':'Сотрудник'}</span>
            ${empSelectHtml('Поиск по имени, должности, отделу...', 'Выбрано')}
          </div>
          <div class="aw-step3-right">
            ${profListHtml}
            ${deadlineHtml}
            ${canSend?`<div class="aw-send-preview"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" stroke="currentColor" stroke-width="1.3"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>Будет отправлено <strong>${sendCount}</strong> ссылок</div>`:''}
          </div>
        </div>
        <div class="aw-footer">
          <button class="elt-btn-ghost" data-aw-back="2">← Назад</button>
          <button class="blueButton" data-aw-send ${!canSend?'disabled':''}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5L11.5 1.5l-5 10-1-4.5-4.5-0.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${assessType==='review'?(scope==='one'?'Запустить ревью':(scope==='group'?'Запустить групповой ревью':'Запустить ревью отдела')):'Отправить оценку'}${sendCount>1?` (${sendCount})`:''}
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
