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
    <div class="landing landing--v3">
      <!-- NAVBAR -->
      <header class="lv3-nav" id="lv3Nav">
        <a class="lv3-logo" href="#/">
          <img src="/public/assets/eltera_logo_horizontal_on_dark.png?v=10" alt="Eltera" style="height:44px;width:auto;object-fit:contain;display:block;">
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
          <button class="lv3-btn-demo" data-demo-assessment>Пройти демо-оценку</button>
          <button class="lv3-btn-primary" data-route="login">Попробовать за 990 ₽</button>
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
          <div class="lv3-hero-orb lv3-hero-orb--1"></div>
          <div class="lv3-hero-orb lv3-hero-orb--2"></div>
          <div class="lv3-hero-grid"></div>
        </div>
        <div class="lv3-hero-content">
          <div class="lv3-hero-left">
            <div class="lv3-pill lv3-fade" style="--d:.05s">✦ Одна из первых AI-платформ оценки персонала в России</div>
            <h1 class="lv3-fade" style="--d:.12s">Самая простая <span class="lv3-grad">оценка кандидатов и сотрудников</span></h1>
            <p class="lv3-fade" style="--d:.22s">Гибкая и понятная система оценки: компетенции, кейсы, 360, вовлечённость, пульс-опросы, Performance Review и готовые отчёты для управленческих решений.</p>
            <div class="lv3-hero-btns lv3-fade" style="--d:.32s">
              <button class="lv3-btn-primary lv3-btn-lg" data-route="login">Попробовать за 990 ₽ →</button>
              <button class="lv3-btn-ghost lv3-btn-lg" data-demo-assessment>Пройти демо-оценку</button>
            </div>
            <div class="lv3-hero-meta lv3-fade" style="--d:.40s">1 месяц доступа · 20 оценок · Кандидаты и сотрудники в одном тарифе</div>
          </div>
          <div class="lv3-hero-right lv3-fade" style="--d:.18s">
            <div class="lv3-live-card" id="lv3LiveCard">
              <div class="lv3-live-header">
                <span id="lv3CardLabel">AI-анализ · в реальном времени</span>
                <span class="lv3-live-dot"><span class="lv3-pulse"></span>Live</span>
              </div>
              <div class="lv3-metrics" id="lv3Metrics">
                <div class="lv3-metric">
                  <div class="lv3-metric-top"><span>Коммуникация</span><b id="lv3m1v">87%</b></div>
                  <div class="lv3-bar"><div class="lv3-bar-fill" id="lv3m1b" style="width:87%;background:linear-gradient(90deg,#1E5BFF,#00E5D4)"></div></div>
                </div>
                <div class="lv3-metric">
                  <div class="lv3-metric-top"><span>Стрессоустойчивость</span><b id="lv3m2v">72%</b></div>
                  <div class="lv3-bar"><div class="lv3-bar-fill" id="lv3m2b" style="width:72%;background:linear-gradient(90deg,#7B61FF,#1E5BFF)"></div></div>
                </div>
                <div class="lv3-metric">
                  <div class="lv3-metric-top"><span>Ответственность</span><b id="lv3m3v">91%</b></div>
                  <div class="lv3-bar"><div class="lv3-bar-fill" id="lv3m3b" style="width:91%;background:linear-gradient(90deg,#00E5D4,#1E5BFF)"></div></div>
                </div>
                <div class="lv3-metric">
                  <div class="lv3-metric-top"><span>Обучаемость</span><b id="lv3m4v">65%</b></div>
                  <div class="lv3-bar"><div class="lv3-bar-fill" id="lv3m4b" style="width:65%;background:linear-gradient(90deg,#1E5BFF,#7B61FF)"></div></div>
                </div>
              </div>
              <div class="lv3-chart-wrap">
                <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:70px;">
                  <defs>
                    <linearGradient id="lv3cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#00E5D4" stop-opacity="0.3"/>
                      <stop offset="100%" stop-color="#00E5D4" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,55 C30,50 55,38 80,35 C105,32 130,22 155,18 C180,14 210,25 235,15 L260,10 L260,70 L0,70 Z" fill="url(#lv3cg)"/>
                  <path d="M0,55 C30,50 55,38 80,35 C105,32 130,22 155,18 C180,14 210,25 235,15 L260,10" stroke="#00E5D4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                  <circle cx="260" cy="10" r="3.5" fill="#00E5D4"/>
                  <circle cx="260" cy="10" r="7" fill="#00E5D4" fill-opacity="0.2" class="lv3-chart-pulse"/>
                </svg>
              </div>
              <div class="lv3-ai-note" id="lv3AiNote">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00E5D4" stroke-width="1.2"/><path d="M7 4v3.5l2 1.5" stroke="#00E5D4" stroke-width="1.2" stroke-linecap="round"/></svg>
                <span id="lv3AiNoteText">AI: Высокая ответственность и коммуникация. Рекомендую пригласить на интервью.</span>
              </div>
            </div>
            <div class="lv3-hero-stats">
              <div class="lv3-hstat"><b>↓ до 40%</b><span>ошибок найма</span></div>
              <div class="lv3-hstat"><b>+85%</b><span>точнее оценка</span></div>
              <div class="lv3-hstat"><b>3 000+</b><span>профессий</span></div>
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
      <section class="lv3-section" id="lv3-for-whom" data-reveal>
        <div class="lv3-section-head">
          <h2>Для кого платформа</h2>
          <p>Eltera помогает разным ролям принимать решения на основе данных</p>
        </div>
        <div class="lv3-tabs">
          <div class="lv3-tab-btns">
            <button class="lv3-tab-btn active" data-lv3-tab="0">Собственники бизнеса</button>
            <button class="lv3-tab-btn" data-lv3-tab="1">HR-директора и HR-отделы</button>
            <button class="lv3-tab-btn" data-lv3-tab="2">Руководители подразделений</button>
          </div>
          <div class="lv3-tab-panels">
            <div class="lv3-tab-panel active" data-lv3-panel="0">
              <div class="lv3-tab-content">
                <div class="lv3-tab-text">
                  <h3>Собственники бизнеса</h3>
                  <p>Для собственников, которые хотят понимать реальное состояние команды, оценивать сотрудников, принимать решения о развитии, ротации, удержании или расставании с людьми.</p>
                  <div class="lv3-tasks-label">ЗАДАЧИ</div>
                  <ul class="lv3-tasks">
                    <li>Оценить сотрудников</li>
                    <li>Провести ротацию кадров</li>
                    <li>Снизить текучесть</li>
                    <li>Увидеть риски в команде</li>
                    <li>Принимать решения на данных</li>
                  </ul>
                </div>
                <div class="lv3-tab-visual">
                  <div class="lv3-mini-report">
                    <div class="lv3-mr-head"><span class="lv3-mr-badge">Отчёт собственника</span></div>
                    <div class="lv3-mr-row"><span>Команда в норме</span><b class="lv3-green">12 чел.</b></div>
                    <div class="lv3-mr-row"><span>Зона риска</span><b class="lv3-amber">3 чел.</b></div>
                    <div class="lv3-mr-row"><span>Текучесть (прогноз)</span><b class="lv3-red">↓ 18%</b></div>
                    <div class="lv3-mr-row"><span>Средний fit к роли</span><b class="lv3-teal">79%</b></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="lv3-tab-panel" data-lv3-panel="1">
              <div class="lv3-tab-content">
                <div class="lv3-tab-text">
                  <h3>HR-директора и HR-отделы</h3>
                  <p>Автоматизируете оценку, получаете готовые отчёты, экономите время на ручной работе и принимаете обоснованные кадровые решения.</p>
                  <div class="lv3-tasks-label">ЗАДАЧИ</div>
                  <ul class="lv3-tasks">
                    <li>Автоматизировать оценку</li>
                    <li>Получать PDF-отчёты</li>
                    <li>Сравнивать кандидатов</li>
                    <li>Меньше ручной работы</li>
                    <li>Снизить текучесть персонала</li>
                  </ul>
                </div>
                <div class="lv3-tab-visual">
                  <div class="lv3-mini-report">
                    <div class="lv3-mr-head"><span class="lv3-mr-badge">HR-дашборд</span></div>
                    <div class="lv3-mr-row"><span>Отправлено оценок</span><b class="lv3-teal">47</b></div>
                    <div class="lv3-mr-row"><span>Завершено</span><b class="lv3-green">38</b></div>
                    <div class="lv3-mr-row"><span>Конверсия</span><b class="lv3-teal">81%</b></div>
                    <div class="lv3-mr-row"><span>Экономия времени</span><b class="lv3-green">↑ 60%</b></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="lv3-tab-panel" data-lv3-panel="2">
              <div class="lv3-tab-content">
                <div class="lv3-tab-text">
                  <h3>Руководители подразделений</h3>
                  <p>Понимаете потенциал каждого сотрудника, видите кто готов к росту, а кто в зоне риска. Строите команду осознанно.</p>
                  <div class="lv3-tasks-label">ЗАДАЧИ</div>
                  <ul class="lv3-tasks">
                    <li>Оценить потенциал сотрудников</li>
                    <li>Построить ИПР</li>
                    <li>Выявить лидеров</li>
                    <li>Снизить риски команды</li>
                    <li>Performance Review</li>
                  </ul>
                </div>
                <div class="lv3-tab-visual">
                  <div class="lv3-mini-report">
                    <div class="lv3-mr-head"><span class="lv3-mr-badge">9-box команды</span></div>
                    <div class="lv3-mr-row"><span>Высокий потенциал</span><b class="lv3-green">4 чел.</b></div>
                    <div class="lv3-mr-row"><span>Кадровый резерв</span><b class="lv3-teal">3 чел.</b></div>
                    <div class="lv3-mr-row"><span>Требуют внимания</span><b class="lv3-amber">2 чел.</b></div>
                    <div class="lv3-mr-row"><span>ИПР составлено</span><b class="lv3-teal">7 чел.</b></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- AI SECTION -->
      <section class="lv3-section lv3-ai-section" id="lv3-ai" data-reveal>
        <div class="lv3-ai-inner">
          <div class="lv3-ai-left">
            <div class="lv3-section-tag">AI-оценка</div>
            <h2>AI анализирует, вы <span class="lv3-grad">принимаете решение</span></h2>
            <p>AI анализирует ответы, компетенции, кейсы и поведенческие маркеры, а затем формирует понятный отчёт: сильные стороны, зоны риска, красные флаги, рекомендацию и индивидуальный план развития.</p>
            <div class="lv3-ai-note-box">Важно: AI помогает структурировать оценку и подсветить риски, но финальное решение остаётся за человеком.</div>
          </div>
          <div class="lv3-ai-right">
            <div class="lv3-accordion" id="lv3Accordion">
              <div class="lv3-acc-item active" data-acc="0">
                <div class="lv3-acc-head"><span class="lv3-acc-icon">🎯</span><span>Профиль компетенций</span><svg class="lv3-acc-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div>
                <div class="lv3-acc-body">Визуальный radar с процентами по каждой компетенции. Сразу видно сильные стороны и зоны развития.</div>
              </div>
              <div class="lv3-acc-item" data-acc="1">
                <div class="lv3-acc-head"><span class="lv3-acc-icon">🚩</span><span>Красные флаги и риски</span><svg class="lv3-acc-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div>
                <div class="lv3-acc-body">AI выделяет тревожные сигналы и зоны внимания. Вы видите риски до принятия решения.</div>
              </div>
              <div class="lv3-acc-item" data-acc="2">
                <div class="lv3-acc-head"><span class="lv3-acc-icon">✅</span><span>Рекомендация по кандидату</span><svg class="lv3-acc-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div>
                <div class="lv3-acc-body">Приглашать / наблюдать / не рекомендовать — с обоснованием и конкретными аргументами.</div>
              </div>
              <div class="lv3-acc-item" data-acc="3">
                <div class="lv3-acc-head"><span class="lv3-acc-icon">📈</span><span>ИПР — план развития</span><svg class="lv3-acc-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></div>
                <div class="lv3-acc-body">Индивидуальный план развития с конкретными шагами, целями и сроками для каждого сотрудника.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- WHAT CAN BE ASSESSED -->
      <section class="lv3-section" id="lv3-assess" data-reveal>
        <div class="lv3-section-head">
          <h2>Что можно оценивать на платформе</h2>
          <p>Комплексная система оценки для всех этапов работы с людьми — от найма до развития</p>
        </div>
        <div class="lv3-assess-grid">
          <div class="lv3-assess-card">
            <div class="lv3-assess-icon">🤝</div>
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
            <div class="lv3-assess-icon">⚠️</div>
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
            <div class="lv3-assess-icon">📊</div>
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
            <div class="lv3-assess-icon">🔍</div>
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
          <div class="lv3-astat"><b>50+</b><span>готовых профилей должностей</span></div>
          <div class="lv3-astat"><b>100+</b><span>методик оценки</span></div>
          <div class="lv3-astat"><b>∞</b><span>Конструктор компетенций</span></div>
        </div>
      </section>

      <!-- CTA BLOCK -->
      <section class="lv3-cta-block">
        <div class="lv3-cta-inner">
          <div class="lv3-section-tag">Стартовый доступ</div>
          <h2>Попробуйте всего за 990 ₽</h2>
          <p>Получите 1 месяц доступа к оценке кандидатов и сотрудников.<br>Мы не делим людей на кандидатов и сотрудников — в одном доступе можно оценивать всех.</p>
          <div class="lv3-cta-btns">
            <button class="lv3-btn-primary lv3-btn-lg" data-route="login">Попробовать за 990 ₽ →</button>
            <button class="lv3-btn-ghost lv3-btn-lg" data-route="login">Оплатить доступ</button>
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
          ${["Отчёт по оценке кандидата|Профиль компетенций, красные флаги, рекомендация по найму","Отчёт по оценке сотрудника|Сильные стороны, зоны развития, ИПР","Групповой отчёт|Сравнение команды по компетенциям и рискам","Пульс-опрос|Быстрый срез настроения и вовлечённости команды","Оценка 360|Обратная связь от коллег, руководителя и подчинённых","Оценка вовлечённости|eNPS, удовлетворённость, факторы удержания","Отчёт по рискам текучести|Зоны выгорания, факторы ухода, рекомендации","ИПР сотрудника|Индивидуальный план развития с целями и сроками"].map(r=>{
            const [title,desc]=r.split('|');
            return `<div class="lv3-report-card">
              <div class="lv3-rc-top">
                <div class="lv3-rc-icon">📄</div>
                <div><h4>${title}</h4><p>${desc}</p></div>
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
            <img src="/public/assets/eltera_logo_horizontal_on_dark.png" alt="Eltera" style="height:34px;width:auto;object-fit:contain;">
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
        <main class="appContent">${content}${renderModal(state)}${renderKebabPopover(state)}</main>
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
      { label: "Средний балл", value: `${s.avg_fit}%`, caption: "соответствие", status: getFitStatus(s.avg_fit), target: "Сотрудники:Средний результат", iconName: "completed" },
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
        <button class="elt-pill${!state.profileTypeFilter || state.profileTypeFilter === 'candidate' ? ' active' : ''}" data-profile-filter="candidate">Кандидат</button>
        <button class="elt-pill${state.profileTypeFilter === 'employee' ? ' active' : ''}" data-profile-filter="employee">Сотрудник</button>
        <button class="elt-pill${state.profileTypeFilter === 'group' ? ' active' : ''}" data-profile-filter="group">Группа</button>
      </div>
      <div class="elt-profiles-grid">
        ${professions.filter(p => !state.profileTypeFilter || state.profileTypeFilter === 'candidate' ? p.type === 'candidate' : p.type === state.profileTypeFilter).map((profession) => `
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
  return DashboardPageLayout({
    title: "Performance Review",
    subtitle: "Циклы review, performance/potential, 9-box и рекомендации по развитию.",
    meta: ["performance", "potential", "кадровый резерв"],
    period: state.period,
    actions: [{ label: "Запустить review", primary: true, attrs: "data-action=\"create-link\"" }],
    filters: pageFilterConfig.performance,
    activeFiltersMap: (state.activeFilters && state.activeFilters.performance) || {},
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

export function renderCandidateAssessment(link, profession, questions, answers, competencyTitleById, apiForm, formError) {
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

function renderModal(state) {
  const mHead = (title, icon = '') => `<div class="modal-head"><div class="modal-head-left">${icon ? `<span class="modal-head-icon">${icon}</span>` : ''}<h2 class="modal-head-title">${title}</h2></div><button class="modal-close-btn" data-action="close-modal" title="Закрыть"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`;

  if (state.modal?.type === "list") {
    const [scope, metricName] = state.modal.target.split(":");
    const people = peopleForModal(state, scope, metricName);
    const icons = { 'Кандидаты': '👤', 'Сотрудники': '🏢', 'Вакансии': '📋', 'Отчеты': '📊' };
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead(`${scope}: ${metricName}`, icons[scope] || '📊')}<div class="modal-inner">${renderPeopleTable(people, scope)}</div></div></div>`;
  }
  if (state.modal?.type === "add-structure-member") {
    const people = [];
    const depts = new Set();
    if (state.orgTree && Array.isArray(state.orgTree.nodes)) {
      const walk = (n) => {
        people.push({ id: n.id, name: n.full_name });
        if (n.department) depts.add(n.department);
        (n.children || []).forEach(walk);
      };
      state.orgTree.nodes.forEach(walk);
    }
    const managerOptions = ['<option value="">— не назначен —</option>',
      ...people.map((p) => `<option value="${p.id}">${p.name}</option>`)].join("");
    const deptOptions = [...depts].map((d) => `<option value="${d}">`).join("");
    return `<div class="modalBackdrop"><form class="modal" data-add-structure-form>
      ${mHead('Добавить в структуру', '👤')}
      <div class="modal-inner">
        <p class="modal-subtitle">Новый сотрудник или руководитель будет добавлен в оргструктуру.</p>
        <div class="elt-form-grid">
          <label class="elt-label">ФИО<input class="elt-input" name="full_name" placeholder="Иван Иванов" required></label>
          <label class="elt-label">Должность<input class="elt-input" name="position" placeholder="Менеджер по продажам"></label>
          <label class="elt-label">Роль<select class="elt-select" name="role"><option value="employee">Сотрудник</option><option value="head">Руководитель отдела</option></select></label>
          <label class="elt-label">Отдел<input class="elt-input" name="department_name" list="oc-depts" placeholder="Название отдела"><datalist id="oc-depts">${deptOptions}</datalist></label>
          <label class="elt-label">Руководитель<select class="elt-select" name="manager_id">${managerOptions}</select></label>
          <label class="elt-label">Проект<input class="elt-input" name="project" placeholder="Общий контур"></label>
        </div>
        <button class="blueButton" type="submit" style="margin-top:8px;width:100%">Добавить</button>
      </div>
    </form></div>`;
  }
  if (state.modal?.type === "import-employees") {
    return `<div class="modalBackdrop"><div class="modal modalWide">
      ${mHead('Импорт сотрудников', '📥')}
      <div class="modal-inner">
        <p class="modal-subtitle">Массовое добавление сотрудников из Excel: ФИО, должность, отдел, руководитель, проект.</p>
        <div class="elt-import-flow">
          <div class="elt-import-step"><span class="elt-import-num">1</span><div><b>Скачать Excel-шаблон</b><p>Колонки: ФИО, должность, отдел, руководитель, проект.</p><a class="elt-btn-ghost" href="/assets/eltera-employees-import-template.xlsx" download>Скачать шаблон</a></div></div>
          <div class="elt-import-step"><span class="elt-import-num">2</span><div><b>Заполнить и загрузить</b><p>Выберите заполненный файл со списком сотрудников.</p><label class="elt-file-label">Excel-файл<input type="file" accept=".xlsx,.xls" data-import-employees-file></label></div></div>
          <div class="elt-import-step"><span class="elt-import-num">3</span><div><b>Импортировать</b><p>Сотрудники появятся в списке и станут доступны для оценки.</p><button class="elt-btn-primary" data-action="run-employee-import">Импортировать</button></div></div>
        </div>
      </div>
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
    else if (state.cardData._kind === "employee") { body = employeeCardApi(state.cardData); cardTitle = "Карточка сотрудника"; }
    else body = candidateCard(state.cardData);
    return `<div class="modalBackdrop"><div class="modal">${mHead(cardTitle, '👤')}<div class="modal-inner">${body}</div></div></div>`;
  }
  if (state.modal?.type === "answers") {
    const data = state.answersData;
    let body;
    if (!data) {
      body = `<p class="modal-subtitle">Загрузка ответов…</p>`;
    } else if (data.error) {
      body = `<p class="modal-subtitle">Не удалось загрузить ответы (бэкенд недоступен).</p>`;
    } else if (!data.answers || !data.answers.length) {
      body = `<p class="modal-subtitle">${data.candidate || ""}${data.test_title ? " · " + data.test_title : ""}</p>
        <p class="modal-subtitle">Ответы по этому кандидату не сохранены.</p>`;
    } else {
      body = `<p class="modal-subtitle">${data.candidate || ""}${data.test_title ? " · " + data.test_title : ""} · ${data.percent}%</p>
        <div class="answersPreview">${data.answers.map((a, i) => {
          const color = a.red_flag ? "#DC2626" : a.correct === true ? "#16A34A" : a.correct === false ? "#DC2626" : "";
          const score = a.max_score ? ` · ${a.score}/${a.max_score}` : "";
          return `<div><span>${i + 1}</span><b>${a.question}</b><em style="${color ? `color:${color}` : ""}">${a.answer || "—"}${score}</em></div>`;
        }).join("")}</div>`;
    }
    return `<div class="modalBackdrop"><div class="modal modalWide">${mHead('Ответы кандидата', '📝')}<div class="modal-inner">${body}</div></div></div>`;
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
          <label class="elt-label">Должность<input class="elt-input" name="position" placeholder="Менеджер по продажам" required></label>
          <label class="elt-label">Отдел<select class="elt-select" name="department">${deptOptions}</select></label>
          <label class="elt-label">Руководитель<select class="elt-select" name="manager">${managerOptions}</select></label>
          <label class="elt-label">Проект<input class="elt-input" name="project" placeholder="Общий контур"></label>
        </div>
        <button class="blueButton" type="submit" style="margin-top:8px;width:100%">Добавить сотрудника</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "add-candidate") {
    const profileOptions = Array.isArray(state.testsApi) && state.testsApi.length
      ? state.testsApi.map((t) => `<option value="${t.id}">${t.title}${t.category ? ` · ${t.category}` : ""}</option>`).join('')
      : `<option value="">Загрузка тестов…</option>`;
    return `<div class="modalBackdrop"><form class="modal modalWide" data-add-candidate-form>
      ${mHead('Добавить кандидата', '👤')}
      <div class="modal-inner">
        <p class="modal-subtitle">Кандидат будет добавлен в базу без создания оценки. Оценку можно отправить позже.</p>
        <div class="elt-form-grid elt-form-grid-3">
          <label class="elt-label elt-label-full">Профиль оценки<select class="elt-select" name="professionId">${profileOptions}</select></label>
          <label class="elt-label">Фамилия<input class="elt-input" name="lastName" placeholder="Иванов"></label>
          <label class="elt-label">Имя<input class="elt-input" name="firstName" placeholder="Иван"></label>
          <label class="elt-label">Отчество<input class="elt-input" name="patronymic" placeholder="Иванович"></label>
          <label class="elt-label">Телефон<input class="elt-input" name="phone" placeholder="+7..."></label>
          <label class="elt-label">Email<input class="elt-input" name="email" placeholder="candidate@example.com"></label>
          <label class="elt-label">Вакансия<input class="elt-input" name="vacancy" placeholder="Менеджер по продажам"></label>
        </div>
        <div class="elt-label-full"><button class="elt-btn-primary" type="submit" style="width:100%">Добавить кандидата</button></div>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "send-assessment") {
    const { personId, fullName } = state.modal;
    const profileOptions = Array.isArray(state.testsApi) && state.testsApi.length
      ? state.testsApi.map((t) => `<option value="${t.id}">${t.title}${t.category ? ` · ${t.category}` : ""}</option>`).join('')
      : `<option value="">Загрузка тестов…</option>`;
    const ready = Array.isArray(state.testsApi) && state.testsApi.length;
    return `<div class="modalBackdrop"><form class="modal" data-send-assessment-form data-person-id="${personId}">
      ${mHead('Отправить оценку', '📨')}
      <div class="modal-inner">
        <p class="modal-subtitle">Кандидату <b>${fullName || "—"}</b> будет создана оценочная ссылка по выбранному профилю.</p>
        <div class="elt-form-grid">
          <label class="elt-label elt-label-full">Профиль оценки<select class="elt-select" name="professionId" ${ready ? "" : "disabled"}>${profileOptions}</select></label>
        </div>
        <button class="elt-btn-primary" type="submit" style="margin-top:8px;width:100%" ${ready ? "" : "disabled"}>Отправить оценку</button>
      </div>
    </form></div>`;
  }

  if (state.modal?.type === "sbp-payment") {
    const { tariffId, tariffName, price, assessments, promoApplied, mode, pack } = state.modal;
    const isTopup = mode === 'topup' || !!assessments;
    const selectedPack = pack || assessments || 20;
    const packPrices = { 20: 990, 100: 3900, 500: 14900 };
    const packPrice = packPrices[selectedPack] || 990;
    const basePrice = isTopup ? packPrice : price;
    const amount = promoApplied ? Math.round(basePrice * 0.9) : basePrice;
    const title = isTopup ? `Пополнение оценок` : `Подключение ${tariffName}`;
    const packSelector = isTopup ? `<div class="sbp-pack-selector">
      <div class="sbp-pack-label">Выберите пакет оценок</div>
      <div class="sbp-pack-options">
        ${[20,100,500].map(p => `<button class="sbp-pack-btn${selectedPack===p?' active':''}" data-action="sbp-select-pack" data-pack="${p}">+${p} оценок<span>${packPrices[p].toLocaleString('ru-RU')} ₽</span></button>`).join('')}
      </div>
    </div>` : '';
    const qrSvg = `<svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="140" rx="8" fill="#fff"/><rect x="10" y="10" width="40" height="40" rx="3" fill="#0A0F1E"/><rect x="16" y="16" width="28" height="28" rx="1" fill="#fff"/><rect x="20" y="20" width="20" height="20" rx="1" fill="#0A0F1E"/><rect x="90" y="10" width="40" height="40" rx="3" fill="#0A0F1E"/><rect x="96" y="16" width="28" height="28" rx="1" fill="#fff"/><rect x="100" y="20" width="20" height="20" rx="1" fill="#0A0F1E"/><rect x="10" y="90" width="40" height="40" rx="3" fill="#0A0F1E"/><rect x="16" y="96" width="28" height="28" rx="1" fill="#fff"/><rect x="20" y="100" width="20" height="20" rx="1" fill="#0A0F1E"/><rect x="56" y="10" width="8" height="8" fill="#0A0F1E"/><rect x="68" y="10" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="22" width="8" height="8" fill="#0A0F1E"/><rect x="68" y="22" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="34" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="68" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="80" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="68" width="8" height="8" fill="#0A0F1E"/><rect x="80" y="68" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="68" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="80" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="92" width="8" height="8" fill="#0A0F1E"/><rect x="80" y="92" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="104" width="8" height="8" fill="#0A0F1E"/><rect x="68" y="104" width="8" height="8" fill="#0A0F1E"/><rect x="80" y="104" width="8" height="8" fill="#0A0F1E"/><rect x="56" y="116" width="8" height="8" fill="#0A0F1E"/><rect x="80" y="116" width="8" height="8" fill="#0A0F1E"/><rect x="92" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="104" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="116" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="92" y="68" width="8" height="8" fill="#0A0F1E"/><rect x="116" y="68" width="8" height="8" fill="#0A0F1E"/><rect x="92" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="104" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="116" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="92" y="92" width="8" height="8" fill="#0A0F1E"/><rect x="116" y="92" width="8" height="8" fill="#0A0F1E"/><rect x="92" y="104" width="8" height="8" fill="#0A0F1E"/><rect x="104" y="104" width="8" height="8" fill="#0A0F1E"/><rect x="116" y="104" width="8" height="8" fill="#0A0F1E"/><rect x="92" y="116" width="8" height="8" fill="#0A0F1E"/><rect x="104" y="116" width="8" height="8" fill="#0A0F1E"/><rect x="116" y="116" width="8" height="8" fill="#0A0F1E"/><rect x="10" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="22" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="34" y="56" width="8" height="8" fill="#0A0F1E"/><rect x="10" y="68" width="8" height="8" fill="#0A0F1E"/><rect x="34" y="68" width="8" height="8" fill="#0A0F1E"/><rect x="10" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="22" y="80" width="8" height="8" fill="#0A0F1E"/><rect x="34" y="80" width="8" height="8" fill="#0A0F1E"/></svg>`;
    const promoHtml = promoApplied
      ? `<div class="sbp-promo-applied">✓ Промокод применён — скидка 10%</div>`
      : `<div class="sbp-promo-row"><input class="elt-input sbp-promo-input" placeholder="Промокод" data-sbp-promo-input><button class="elt-btn-ghost" data-action="apply-sbp-promo">Применить</button></div>`;
    return `<div class="modalBackdrop"><div class="modal sbp-modal">
      ${mHead(title, '💳')}
      <div class="modal-inner sbp-modal-inner">
        <div class="sbp-qr-block">
          <div class="sbp-qr-wrap">${qrSvg}</div>
          <div class="sbp-qr-hint">Отсканируйте QR-код в приложении банка</div>
          <button class="sbp-deeplink-btn" data-action="sbp-deeplink">Открыть СБП в приложении</button>
        </div>
        <div class="sbp-details">
          ${packSelector}
          <div class="sbp-detail-row"><span>Сумма</span><strong>${amount.toLocaleString('ru-RU')} ₽</strong></div>
          <div class="sbp-detail-row"><span>Получатель</span><span>ООО «Элтера»</span></div>
          <div class="sbp-detail-row"><span>Назначение</span><span>${isTopup ? `Пополнение +${selectedPack} оценок` : `${tariffName}, 1 мес.`}</span></div>
          <div class="sbp-detail-row sbp-detail-status"><span>Статус</span><span class="sbp-status-waiting" data-sbp-status>⏱ Ожидание оплаты...</span></div>
          <div class="sbp-promo-section">${promoHtml}</div>
          <div class="sbp-actions">
            <button class="elt-btn-ghost" data-action="close-modal">Отмена</button>
            <button class="elt-btn-primary" data-action="sbp-confirm" data-tariff-id="${tariffId || ''}" data-assessments="${isTopup ? selectedPack : 0}">Подтвердить оплату</button>
          </div>
          <div class="sbp-footer">Платёж защищён СБП · ЦБ РФ · ЮKassa</div>
        </div>
      </div>
    </div></div>`;
  }

  if (state.modal === "spendBonuses") {
    const max = Math.floor(state.referrals.available / state.company.assessmentPrice);
    return `<div class="modalBackdrop"><div class="modal">${mHead('Потратить бонусы', '🎁')}<div class="modal-inner"><p class="modal-subtitle">Доступно: ${state.referrals.available.toLocaleString('ru-RU')} бонусов. 1 оценка = ${state.company.assessmentPrice} ₽.</p><div class="bonusOptions"><button class="blueButton" data-buy-bonus-assessments="${max}">Докупить ${max} оценок</button><button class="button subtle">Компенсировать часть тарифа</button><button class="button subtle">Оплатить тариф бонусами</button></div></div></div></div>`;
  }

  if (state.modal?.type === "filters") {
    const filters = state.modal.filters || [];
    const active = state.modal.active || {};
    const filterOptions = {
      "Вакансия": ["Менеджер по продажам", "HR-рекрутер", "Frontend-разработчик"],
      "Источник": ["HeadHunter", "SuperJob", "Avito", "Telegram", "Ручная", "API", "Импорт"],
      "Статус": ["Откликнулся", "Оценка отправлена", "Оценка пройдена", "Подходит", "Интервью", "Оффер", "Не подходит"],
      "Результат оценки": ["Высокий (80%+)", "Средний (60-79%)", "Низкий (<60%)"],
      "Тип подбора": ["Внешний", "Внутренний", "Проектный"],
      "Ответственный": ["Иван Петров", "Анна Сергеева", "Ольга Смирнова"],
      "Город": ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск"],
      "Соответствие": ["Высокое (80%+)", "Среднее (60-79%)", "Низкое (<60%)"],
      "Риск": ["Низкий", "Средний", "Высокий"],
      "Отдел": ["Отдел продаж", "Операционный", "Контакт-центр", "Финансы"],
      "Должность": ["Менеджер", "Специалист", "Руководитель"],
      "Руководитель": ["Иван Петров", "Анна Сергеева", "Ольга Смирнова"],
      "Проект": ["Проект A", "Проект B"],
      "Тип сотрудника": ["Стафф", "Аутсорсинг", "Стажёр"],
      "Адаптация": ["На адаптации", "Завершил", "Риск"],
      "Performance Review": ["Пройден", "Не пройден"],
      "360": ["Пройден", "Не пройден"],
      "Сегмент 9-box": ["HiPo", "Звезда", "Лидер", "Стабильный", "Зона риска"],
      "Потенциал": ["Высокий", "Средний", "Низкий"],
      "Результативность": ["Высокая", "Средняя", "Низкая"],
      "Этап адаптации": ["7 дней", "14 дней", "30 дней", "60 дней", "90 дней"],
      "Причина риска": ["Нагрузка", "Конфликт", "Зарплата", "Неясность задач"],
      "Конверсия": ["Высокая (>30%)", "Средняя (10-30%)", "Низкая (<10%)"],
      "Подходящие": ["Есть", "Нет"],
      "Расхождение": ["Высокое", "Среднее", "Низкое"],
      "Компетенция": ["Ответственность", "Коммуникация", "Лидерство", "Аналитика"],
      "Тип": ["Кандидат", "Сотрудник", "Групповая"],
      "Вакансия / отдел": ["Менеджер по продажам", "HR-рекрутер", "Отдел продаж"],
      "Все направления": ["Кандидаты", "Сотрудники", "Групповые"]
    };
    const rows = filters.map((f) => {
      const opts = filterOptions[f] || [];
      const cur = active[f] || "";
      return '<div class="elt-fp-row">' +
        '<span class="elt-fp-label">' + f + '</span>' +
        '<div class="elt-fp-opts">' +
          '<button class="elt-fp-opt ' + (!cur ? 'active' : '') + '" data-fp-key="' + f + '" data-fp-val="">Все</button>' +
          opts.map((o) => '<button class="elt-fp-opt ' + (cur === o ? 'active' : '') + '" data-fp-key="' + f + '" data-fp-val="' + o + '">' + o + '</button>').join('') +
        '</div>' +
      '</div>';
    }).join('');
    const activeCount = Object.values(active).filter(Boolean).length;
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
  const empScope = ["Сотрудники", "Адаптация", "Оценка 360", "Performance Review"].includes(scope);
  return `<table><thead><tr><th>ФИО</th><th>Вакансия / должность</th><th>Балл</th><th>Соответствие</th><th>Дата</th><th>Действия</th></tr></thead><tbody>${people.map((item) => {
    const score = item.result?.percent || item.fit || 0;
    const stage = item.stage || item.recommendation || '';
    const cat = stageStatus(stage);
    const date = item.completedAt ? new Date(item.completedAt).toLocaleDateString('ru-RU') : (item.startDate || '—');
    const isEmp = item.id?.startsWith('emp-');
    const actions = empScope
      ? `<button class="button subtle" data-open-card="${item.id}">Карточка</button>`
      : `${item.status === "completed" ? `<button class="button subtle" data-pdf-id="${item.id}">PDF</button>` : ""}<button class="button subtle" data-open-card="${item.id}">Карточка</button><button class="button subtle" data-open-answers="${item.id}">Ответы</button>${!isEmp ? CandidateKebab(item.id) : ''}`;
    return `<tr><td class="modal-td-name">${personName(item)}</td><td class="modal-td-role">${item.vacancy || item.position || item.professionTitle || '—'}</td><td><span class="modal-score modal-score-${cat}">${score}%</span></td><td><span class="modal-badge modal-badge-${cat}">${stage}</span></td><td class="modal-td-date">${date}</td><td><div class="rowActions">${actions}</div></td></tr>`;
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
      <button class="elt-btn-primary elt-btn-wide" ${inApp ? `data-open-sbp="${tariff.name}"` : `data-route="login"`}>${tariff.cta}</button>
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
      item.status === "completed"
        ? `пройдена · ${item.result.percent}`
        : item.assessmentSent
          ? `отправлена · ${item.result.percent}`
          : "не отправлена",
      StatusBadge(`${item.result.percent}%`, getFitStatus(item.result.percent)),
      StatusBadge(item.result.redFlags ? "средний" : "низкий", item.result.redFlags ? "medium" : "good"),
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
    rows: employees.map((item) => [
      EmployeePreview(item),
      item.department,
      item.manager,
      item.position.includes("Руководитель") ? "руководитель" : item.startDate > "2026-03-01" ? "новый" : "офисный",
      StatusBadge(`${item.fit}%`, getFitStatus(item.fit)),
      StatusBadge(item.turnoverRisk, item.turnoverRisk === "низкий" ? "good" : item.turnoverRisk === "средний" ? "medium" : "bad"),
      item.recommendation,
      ActionButtonGroup([
        { label: "Карточка", attrs: `data-open-card="${item.id}"` }
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
    const emps = state.employeesApi || [];
    if (metricName.includes("Высокий")) return emps.filter((e) => e.fit >= 80);
    if (metricName.includes("Средний")) return emps.filter((e) => e.fit >= 60 && e.fit < 80);
    if (metricName.includes("Низкий")) return emps.filter((e) => e.fit < 60);
    if (metricName.includes("Выгорание")) return emps.filter((e) => e.burnout && !["—", "нет", ""].includes(String(e.burnout).toLowerCase()));
    if (metricName.includes("риск") || metricName.includes("В зоне")) return emps.filter((e) => e.turnoverRisk !== "низкий" || e.fit < 70);
    return emps;
  }
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
