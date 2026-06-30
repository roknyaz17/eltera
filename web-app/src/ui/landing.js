// Eltera landing page — imported from Claude Design project "Крутой лендинг"
// (file: Eltera Landing.dc.html). Generated markup + behaviours; DS base
// classes live in styles.css, landing-specific CSS is appended there too.

export function renderLanding() {
  return `
<div class="landing landingBody">

  <header class="landingHeader">
    <a class="landingLogo"><img src="/public/assets/eltera_logo_horizontal_on_dark.svg?v=20" alt="Eltera" style="width:150px;"></a>
    <nav class="landingNav">
      <a href="#features" style="font-weight: 500">Платформа</a>
      <a href="#how" style="font-weight: 500">Как это работает</a>
      <a href="#pricing" style="font-weight: 500">Тарифы</a>
      <a href="#referral" style="font-weight: 500">Партнёрам</a>
      <a href="#faq" style="font-weight: 500">FAQ</a>
    </nav>
    <div class="landingActions">
      <a class="ghostOnDark" data-route="login">Войти</a>
      
    </div>
  </header>

  <section class="hero eltHero" style="position: relative">
    <div class="heroBg" style="position:absolute; inset:0; z-index:0; will-change:transform;">
      <canvas class="heroMatrix matrixCanvas"></canvas>
      <div class="heroScrim"></div>
      <div class="eltOrb" style="width:420px; height:420px; left:-120px; top:-60px; background:rgba(30,91,255,.32); animation:eltDrift 14s ease-in-out infinite;"></div>
      <div class="eltOrb" style="width:360px; height:360px; right:-80px; top:120px; background:rgba(124,58,237,.22); animation:eltDrift 18s ease-in-out infinite reverse;"></div>
    </div>
    <div class="heroCopy" style="position:relative; z-index:1;">
      <span class="pillEy" style="color: #9F46F1; font-weight: 700; border-color: #6745f14d"><span class="heroPulseDot" style="color: #6d5df6">●</span> AI-платформа оценки персонала</span>
      <h1 style="margin:18px 0 18px; font-size:clamp(40px,4.6vw,58px); line-height:1.08; font-weight:900;">Оценивайте людей <span class="authGradientText">объективно</span> — за минуты</h1>
      <p style="font-weight: 300"></p><p class="p1"><b style="font-weight: 200">Платформа для быстрой оценки кандидатов и сотрудников: компетенции, fit-профиль, 360°, вовлечённость и Performance Review — с готовыми AI-рекомендациями.</b></p><p></p>
      <div class="heroButtons" style="margin-top:26px;">
        <a class="blueButton large" data-route="login">Попробовать за 990 руб.</a>
        <a class="ghostOnDark large">Пройти демо-оценку</a>
      </div>
      <span class="underCta" style="font-weight: 300"><br></span>
      <div class="heroStats">
        <div class="heroStat"><b style="color: var(--white)">160+</b><span style="font-weight: 300">профессий в библиотеке</span></div>
        <div class="heroStat"><b style="color: var(--white)">639</b><span style="font-weight: 300">выверенных вопросов</span></div>
        <div class="heroStat"><b style="color: var(--white)">92%</b><span style="font-weight: 300">точность fit-прогноза</span></div>
      </div>
    </div>

    <div class="heroPanel" style="z-index:1;">
      <div class="panelGlow"></div>
      <div class="glass" style="position:relative; border-radius:16px; padding:18px; min-height:500px; overflow:hidden; display:flex; flex-direction:column;">
        <svg width="0" height="0" style="position:absolute;"><defs><linearGradient id="eltArc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C3AED"></stop><stop offset="1" stop-color="#1E5BFF"></stop></linearGradient></defs></svg>
        <div class="cardLine" style="margin-bottom:14px;">
          <span style="display:flex; align-items:center; gap:9px; color:#fff; font-weight:800; font-size:14px;"><span class="livePulse" style="width:9px; height:9px; border-radius:50%; background:#22C55E; display:inline-block;"></span>Eltera · Dashboard</span>
          <span class="statusBadge status-neutral" data-elt-view-name style="font-size:11px;">Воронка оценки кандидатов</span>
        </div>

        <div style="position:relative; flex:1;">

          <div class="liveView" data-elt-view="0" style="position:absolute; inset:0; transition:opacity .7s ease; opacity:1; pointer-events:auto; display:grid; gap:13px; align-content:start;">
            <div class="eltKpiMini">
              <div><b class="kpiBig kpiResp">249</b><span>отклики</span></div>
              <div><b class="kpiBig kpiFit">92%</b><span>средний fit</span></div>
              <div><b class="kpiBig kpiOff">24</b><span>офферов</span></div>
            </div>
            <svg viewBox="0 0 320 88" preserveAspectRatio="none" style="width:100%; height:54px;">
              <defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00E5D4" stop-opacity=".32"></stop><stop offset="1" stop-color="#00E5D4" stop-opacity="0"></stop></linearGradient></defs>
              <path d="M0 64 L40 56 L80 60 L120 40 L160 46 L200 26 L240 34 L280 16 L320 22 L320 88 L0 88 Z" fill="url(#sparkFill)"></path>
              <path class="sparkPath" d="M0 64 L40 56 L80 60 L120 40 L160 46 L200 26 L240 34 L280 16 L320 22" fill="none" stroke="#00E5D4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
            <div class="liveFunnel" style="display:grid; gap:7px;">
              <div class="funnel fnl1"><div><b>Отклики</b><span>249</span></div><i><em style="width:100%"></em></i></div>
              <div class="funnel fnl2"><div><b>Прошли скрининг</b><span>142</span></div><i><em style="width:57.0%"></em></i></div>
              <div class="funnel fnl3"><div><b>Интервью</b><span>68</span></div><i><em style="width:27.3%"></em></i></div>
              <div class="funnel fnl4"><div><b>Офферы</b><span>24</span></div><i><em style="width:9.6%"></em></i></div>
              <div class="funnel fnl5"><div><b>Вышли на работу</b><span>19</span></div><i><em style="width:7.6%"></em></i></div>
              <div class="funnel fnl6"><div><b>Прошли адаптацию</b><span>16</span></div><i><em style="width:6.4%"></em></i></div>
            </div>
          </div>

          <div class="liveView" data-elt-view="1" style="position:absolute; inset:0; transition:opacity .7s ease; opacity:0; pointer-events:none;">
            
            <div data-elt-cand="0" style="position:absolute; inset:0; transition:opacity .55s ease; opacity:1; display:grid; gap:16px; align-content:start;">
              <div style="display:flex; align-items:center; gap:13px;">
                <img src="/public/assets/org/anna.jpg" alt="Анна Ковалёва" style="width:58px; height:58px; border-radius:50%; object-fit:cover; display:block;">
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:800; font-size:16px;">Анна Ковалёва</div><div style="color:#8FA3C2; font-size:13px;">Product Lead · сотрудник</div></div>
                <span class="statusBadge status-good">Fit 92%</span>
              </div>
              <div class="donutWrap">
                <svg viewBox="0 0 120 120" style="width:104px; height:104px; flex:none;"><circle cx="60" cy="60" r="46" fill="none" stroke="rgba(148,163,184,.16)" stroke-width="13"></circle><circle cx="60" cy="60" r="46" fill="none" stroke="url(#eltArc)" stroke-width="13" stroke-linecap="round" stroke-dasharray="266 289" transform="rotate(-90 60 60)"></circle><text x="60" y="56" text-anchor="middle" fill="#fff" font-size="23" font-weight="900">92%</text><text x="60" y="74" text-anchor="middle" fill="#8FA3C2" font-size="9" font-weight="700">fit</text></svg>
                <div style="flex:1; display:grid; gap:12px;">
                  <div class="compBar barGood"><div><span>Лидерство</span><b>88</b></div><i><em style="width:88%"></em></i></div>
                  <div class="compBar barGood"><div><span>Аналитика</span><b>94</b></div><i><em style="width:94%"></em></i></div>
                </div>
              </div>
              <div class="aiNote noteGood" style="font-weight:400;">AI-вывод: все компетенции выше нормы, лидерство 88 и аналитика 94. <b class="recGood">Рекомендация: кадровый резерв.</b></div>
            </div>
            <div data-elt-cand="1" style="position:absolute; inset:0; transition:opacity .55s ease; opacity:0; display:grid; gap:16px; align-content:start;">
              <div style="display:flex; align-items:center; gap:13px;">
                <img src="/public/assets/org/dmitry.jpg" alt="Дмитрий Ковалев" style="width:58px; height:58px; border-radius:50%; object-fit:cover; display:block;">
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:800; font-size:16px;">Дмитрий Ковалев</div><div style="color:#8FA3C2; font-size:13px;">Data Analyst · сотрудник</div></div>
                <span class="statusBadge status-good">Fit 87%</span>
              </div>
              <div class="donutWrap">
                <svg viewBox="0 0 120 120" style="width:104px; height:104px; flex:none;"><circle cx="60" cy="60" r="46" fill="none" stroke="rgba(148,163,184,.16)" stroke-width="13"></circle><circle cx="60" cy="60" r="46" fill="none" stroke="url(#eltArc)" stroke-width="13" stroke-linecap="round" stroke-dasharray="252 289" transform="rotate(-90 60 60)"></circle><text x="60" y="56" text-anchor="middle" fill="#fff" font-size="23" font-weight="900">87%</text><text x="60" y="74" text-anchor="middle" fill="#8FA3C2" font-size="9" font-weight="700">fit</text></svg>
                <div style="flex:1; display:grid; gap:12px;">
                  <div class="compBar barGood"><div><span>Аналитика</span><b>95</b></div><i><em style="width:95%"></em></i></div>
                  <div class="compBar barWarn"><div><span>Внимательность</span><b>84</b></div><i><em style="width:84%"></em></i></div>
                </div>
              </div>
              <div class="aiNote noteWarn" style="font-weight:400;">AI-вывод: аналитика 95 — сильная сторона, но внимательность к деталям 84 ниже нормы. <b class="recWarn">Зона роста: план развития.</b></div>
            </div>
            <div data-elt-cand="2" style="position:absolute; inset:0; transition:opacity .55s ease; opacity:0; display:grid; gap:16px; align-content:start;">
              <div style="display:flex; align-items:center; gap:13px;">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231b2440'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%235b6b8c'/%3E%3Cpath d='M13 55c0-11 8-17 19-17s19 6 19 17z' fill='%235b6b8c'/%3E%3C/svg%3E" alt="" style="width:58px; height:58px; border-radius:50%; object-fit:cover; display:block;">
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:800; font-size:16px;">Мария Орлова</div><div style="color:#8FA3C2; font-size:13px;">UX Researcher · сотрудник</div></div>
                <span class="statusBadge status-good">Fit 90%</span>
              </div>
              <div class="donutWrap">
                <svg viewBox="0 0 120 120" style="width:104px; height:104px; flex:none;"><circle cx="60" cy="60" r="46" fill="none" stroke="rgba(148,163,184,.16)" stroke-width="13"></circle><circle cx="60" cy="60" r="46" fill="none" stroke="url(#eltArc)" stroke-width="13" stroke-linecap="round" stroke-dasharray="260 289" transform="rotate(-90 60 60)"></circle><text x="60" y="56" text-anchor="middle" fill="#fff" font-size="23" font-weight="900">90%</text><text x="60" y="74" text-anchor="middle" fill="#8FA3C2" font-size="9" font-weight="700">fit</text></svg>
                <div style="flex:1; display:grid; gap:12px;">
                  <div class="compBar barGood"><div><span>Эмпатия</span><b>93</b></div><i><em style="width:93%"></em></i></div>
                  <div class="compBar barGood"><div><span>Коммуникация</span><b>88</b></div><i><em style="width:88%"></em></i></div>
                </div>
              </div>
              <div class="aiNote noteGood" style="font-weight:400;">AI-вывод: сильные soft skills — эмпатия 93 и коммуникация 88. <b class="recGood">Рекомендация: повышение.</b></div>
            </div>
          </div>

          <div class="liveView" data-elt-view="2" style="position:absolute; inset:0; transition:opacity .7s ease; opacity:0; pointer-events:none; display:grid; gap:9px; align-content:start;">
            <div class="liveRow" style="border-color: #05e5d494">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231b2440'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%235b6b8c'/%3E%3Cpath d='M13 55c0-11 8-17 19-17s19 6 19 17z' fill='%235b6b8c'/%3E%3C/svg%3E" alt="" style="width:40px; height:40px; border-radius:50%; object-fit:cover; display:block;">
              <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:700; font-size:13.5px;">Екатерина Власова</div><div style="color:#8FA3C2; font-size:11.5px;">Frontend Lead</div></div>
              <div style="width:64px;"><div class="compBar barGood"><i><em style="width:91%"></em></i></div></div>
              <span class="statusBadge status-good" style="font-size:11px;">91</span>
            </div>
            <div class="liveRow">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231b2440'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%235b6b8c'/%3E%3Cpath d='M13 55c0-11 8-17 19-17s19 6 19 17z' fill='%235b6b8c'/%3E%3C/svg%3E" alt="" style="width:40px; height:40px; border-radius:50%; object-fit:cover; display:block;">
              <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:700; font-size:13.5px;">Павел Гусев</div><div style="color:#8FA3C2; font-size:11.5px;">Sales Manager</div></div>
              <div style="width:64px;"><div class="compBar barWarn"><i><em style="width:73%"></em></i></div></div>
              <span class="statusBadge status-medium" style="font-size:11px;">73</span>
            </div>
            <div class="liveRow">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231b2440'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%235b6b8c'/%3E%3Cpath d='M13 55c0-11 8-17 19-17s19 6 19 17z' fill='%235b6b8c'/%3E%3C/svg%3E" alt="" style="width:40px; height:40px; border-radius:50%; object-fit:cover; display:block;">
              <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:700; font-size:13.5px;">Ирина Лебедева</div><div style="color:#8FA3C2; font-size:11.5px;">HR Partner</div></div>
              <div style="width:64px;"><div class="compBar barGood"><i><em style="width:88%"></em></i></div></div>
              <span class="statusBadge status-good" style="font-size:11px;">88</span>
            </div>
            
            <div class="liveRow riskRow" style="position: static">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23301622'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%238c5b6b'/%3E%3Cpath d='M13 55c0-11 8-17 19-17s19 6 19 17z' fill='%238c5b6b'/%3E%3C/svg%3E" alt="" style="width:40px; height:40px; box-shadow:none !important; border-radius:50%; object-fit:cover; display:block;">
              <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:700; font-size:13.5px;">Олег Туров</div><div style="color:#8FA3C2; font-size:11.5px;">Support Specialist</div></div>
              <div style="width:64px;"><div class="compBar barRisk"><i><em style="width:54%"></em></i></div></div>
              <span class="statusBadge status-bad" style="font-size:11px;">54</span>
            </div><div class="aiNote" style="font-weight: 300; margin-top: 2px; border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.08)">Олег Туров в зоне риска — Eltera рекомендует план развития и встречу 1:1.</div>
          </div>

        </div>

        <div style="display:flex; gap:7px; justify-content:center; margin-top:14px;">
          <span style="height:6px; width:26px; border-radius:3px; background:#00E5D4; transition:background .4s, width .4s; cursor:pointer;" data-elt-view-dot="0" title="Воронка оценки кандидатов"></span>
          <span style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" data-elt-view-dot="1" title="Профиль сотрудника"></span>
          <span style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" data-elt-view-dot="2" title="Команда"></span>
        </div>
      </div>
      
      
    </div>
  </section>

  <div class="heroTicker">
    <div class="heroTickerInner">
      <span class="logoChip">NORDA</span><span class="logoChip">CFC</span><span class="logoChip">ОРБИТА</span><span class="logoChip">FINMARK</span><span class="logoChip">VEGA HR</span><span class="logoChip">ТЕХНОПАРК</span><span class="logoChip">NORDA</span><span class="logoChip">SKYLINK</span><span class="logoChip">ОРБИТА</span><span class="logoChip">FINMARK</span><span class="logoChip">VEGA HR</span><span class="logoChip">ТЕХНОПАРК</span>
    </div>
  </div>

  <section class="landingSection featDark" id="features">
    <div class="sectionIntro" style="max-width:640px; margin:0 auto 28px; text-align:center;">
      <span class="pill" style="color: var(--white)">Платформа</span>
      <h2 style="margin-top:10px;">Все оценки в одном окне</h2>
      <p style="font-weight: 300">От первого отклика до развития сотрудника — без таблиц и головной боли.</p>
    </div>
    <div class="bento">
      <div class="bentoCard bentoFeat">
        <div class="bentoIcon" style="color:#1E5BFF; background:rgba(30,91,255,.14); border-color:rgba(30,91,255,.32);">◎</div>
        <h3>Fit-скоринг</h3>
        <p style="font-weight: 300">Соответствие кандидата профилю должности по 40+ компетенциям и soft skills.</p>
        <div style="margin-top:auto; display:flex; align-items:center; gap:20px; padding-top:20px;">
          <svg viewBox="0 0 120 120" style="width:140px; height:140px; flex:none;">
            <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(148,163,184,.16)" stroke-width="14"></circle>
            <g transform="rotate(-90 60 60)" fill="none" stroke-width="14">
              <circle class="fitArc" data-len="73" cx="60" cy="60" r="46" stroke="#1E5BFF" stroke-dasharray="0 289" stroke-dashoffset="0"></circle>
              <circle class="fitArc" data-len="78" cx="60" cy="60" r="46" stroke="#00E5D4" stroke-dasharray="0 289" stroke-dashoffset="-75"></circle>
              <circle class="fitArc" data-len="63" cx="60" cy="60" r="46" stroke="#7C3AED" stroke-dasharray="0 289" stroke-dashoffset="-155"></circle>
              <circle class="fitArc" data-len="67" cx="60" cy="60" r="46" stroke="#16D7FF" stroke-dasharray="0 289" stroke-dashoffset="-220"></circle>
            </g>
            <text x="60" y="56" text-anchor="middle" fill="#fff" font-size="24" font-weight="900" data-count="92" data-suffix="%">92%</text>
            <text x="60" y="74" text-anchor="middle" fill="#8FA3C2" font-size="9.5" font-weight="700">средний fit</text>
          </svg>
          <div style="flex:1; display:grid; gap:11px; align-content:center;">
            <div style="display:flex; align-items:center; gap:9px;"><span style="width:10px; height:10px; border-radius:3px; background:#1E5BFF; flex:none;"></span><span style="flex:1; color:#C7D3E8; font-size:13px; font-weight:700;">Лидерство</span><b style="color:#fff; font-size:13px;" data-count="88">88</b></div>
            <div style="display:flex; align-items:center; gap:9px;"><span style="width:10px; height:10px; border-radius:3px; background:#00E5D4; flex:none;"></span><span style="flex:1; color:#C7D3E8; font-size:13px; font-weight:700;">Аналитика</span><b style="color:#fff; font-size:13px;" data-count="94">94</b></div>
            <div style="display:flex; align-items:center; gap:9px;"><span style="width:10px; height:10px; border-radius:3px; background:#7C3AED; flex:none;"></span><span style="flex:1; color:#C7D3E8; font-size:13px; font-weight:700;">Коммуникация</span><b style="color:#fff; font-size:13px;" data-count="76">76</b></div>
            <div style="display:flex; align-items:center; gap:9px;"><span style="width:10px; height:10px; border-radius:3px; background:#16D7FF; flex:none;"></span><span style="flex:1; color:#C7D3E8; font-size:13px; font-weight:700;">Стрессоустойчивость</span><b style="color:#fff; font-size:13px;" data-count="81">81</b></div>
          </div>
        </div>
      </div>
      <div class="bentoCard" style="grid-area:b;">
        <div class="bentoIcon" style="color:#9F46F1; background:rgba(159,70,241,.14); border-color:rgba(159,70,241,.32);">✦</div>
        <h3>AI-отчёты</h3>
        <p style="font-weight: 300">Готовое решение&nbsp; одну за минуту.</p>
      </div>
      <div class="bentoCard" style="grid-area:c;">
        <div class="bentoIcon" style="color:#00E5D4; background:rgba(0,229,212,.14); border-color:rgba(0,229,212,.32);">▽</div>
        <h3>Воронка найма</h3>
        <p style="font-weight: 300">Конверсия по этапам отбора и источникам откликов.</p>
      </div>
      <div class="bentoCard" style="grid-area:d;">
        <div class="bentoIcon" style="color:#22C55E; background:rgba(34,197,94,.14); border-color:rgba(34,197,94,.32); font-size:22px; line-height:1;">↻</div>
        <h3>360° и вовлечённость</h3>
        <p style="font-weight: 300">Оценка коллегами, eNPS и Performance Review по команде.</p>
      </div>
      <div class="bentoCard" style="grid-area:e;">
        <div class="bentoIcon" style="color:#E7A93C; background:rgba(231,169,60,.14); border-color:rgba(231,169,60,.32);">▤</div>
        <h3>Библиотека оценок</h3>
        <p style="font-weight: 300">120+ профессий и более 3000&nbsp; выверенных вопросов для оценки кандидатов и сотрудников.</p>
      </div>
    </div>
  </section>

  <section class="landingSection featDark" id="how">
    <div class="sectionIntro" style="max-width:640px; margin:0 auto 32px; text-align:center;">
      <span class="pill" style="color: var(--cyan)">Как это работает</span>
      <h2 style="margin-top:10px;">Быстрый старт</h2>
      <p style="font-weight: 300">Без долгого внедрения и обучения.</p>
    </div>
    <div class="stepper">
      <div class="stepCard"><div class="stepNum">1</div><h3>Выберите</h3><p style="font-weight: 300">Выберите должность или создайте свою.</p></div>
      <div class="stepCard"><div class="stepNum">2</div><h3>Пригласите</h3><p style="font-weight: 300">Отправьте оценку за 1 минуту. Кандидат пройдет ее с любого устройства.</p></div>
      <div class="stepCard"><div class="stepNum">3</div><h3>Получите AI-отчёт</h3><p style="font-weight: 300">Сравнивайте кандидатов и сотрудников, работайте только с лучшими.&nbsp;</p></div>
      <div class="stepCard"><div class="stepNum">4</div><h3>Решайте</h3><p style="font-weight: 300">AI поможет принять правильное решение и оптимизировать процессы, даже если ав не знаете как.&nbsp;</p></div>
    </div>
  </section>

  <div class="metricBand">
    <div class="metricBandInner">
      <div class="metricCell"><b data-count="5" data-suffix=" мин">5 мин</b><span style="font-weight: 300">до первой оценки</span></div>
      <div class="metricCell"><b data-count="-68" data-suffix="%">−68%</b><span style="font-weight: 300">времени на отбор</span></div>
      <div class="metricCell"><b data-count="120" data-suffix="K+">120K+</b><span style="font-weight: 300">проведённых оценок</span></div>
      <div class="metricCell"><b data-count="2400" data-group="1">2 400</b><span style="font-weight: 300">HR-команд</span></div>
    </div>
  </div>

  <section class="landingSection" id="referral">
    <div class="cryptoWrap pulseBg" style="position:relative; overflow:hidden;">
      <div class="eltOrb" style="width:300px; height:300px; right:-60px; bottom:-80px; background:rgba(0,229,212,.18);"></div>
      <div style="position:relative; z-index:1;">
        <span class="pillEy" style="color: √; background-color: #6d5df612; border-color: #6d5df64d">Реферальная программа</span>
        <h2 style="margin:14px 0 12px; color:#fff; font-size:34px; line-height:1.14; font-weight:900;">Приглашайте компании и зарабатывайте вместе с нами</h2>
        <p style="color: #D6E2F5; font-size: 16px; margin: 0 0 20px; max-width: 560px; font-weight: 300">Делитесь реферальной ссылкой, получайте до 10% с подписок и выводите&nbsp; через крипто-кошелёк.</p>
        <div style="display:grid; gap:12px; max-width:560px;">
          <div class="featRow"><span class="featTick">✓</span><p style="margin:0; color:#E2EAF6;"><b style="color: rgb(255, 255, 255);">10% с первой оплаты</b>&nbsp;и со всех продлений.</p></div>
          <div class="featRow"><span class="featTick">✓</span><p style="margin:0; color:#E2EAF6;"><b style="color: rgb(255, 255, 255);">Вывод в USDT</b> — сеть ERC-20, зачисление за минуты.</p></div>
          <div class="featRow"><span class="featTick">✓</span><p style="margin:0; color:#E2EAF6;"><b style="color:#fff;">Кабинет партнёра</b> со статистикой переходов и выплат, от 10 USDT.</p></div>
        </div>
        <div class="heroButtons" style="margin-top:24px;"><a class="blueButton large">Стать партнёром</a></div>
      </div>
      <div style="position:relative; z-index:1; align-self:center; width:100%;">
        <div class="refSlider" style="position:relative;">
          <div class="walletCard" data-elt-ref="0" style="position:relative; opacity:1; transition:opacity .6s ease; pointer-events:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#8FA3C2; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em;">Баланс партнёра</span>
              <span class="statusBadge status-good" style="color: #22c55e">+12% за месяц</span>
            </div>
            <div style="font-size:40px; font-weight:900; color:#fff; line-height:1;">1 248 <span style="color:var(--cyan); font-size:22px;">ELT</span></div>
            <div style="border-top:1px solid rgba(255,255,255,.1); padding-top:14px; display:grid; gap:10px;">
              <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:#9FB0CC;">Приглашено</span><b style="color:#fff;">38 команд</b></div>
              <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:#9FB0CC;">Сеть вывода</span><b style="color:#fff;">ERC-20</b></div>
            </div>
            <a class="blueButton wide">Вывести на кошелёк</a>
          </div>
          <div data-elt-ref="1" style="position:absolute; inset:0; opacity:0; transition:opacity .6s ease; pointer-events:none;">
            <div style="width:100%; height:100%; border-radius:20px; display:grid; place-items:center; text-align:center; background:linear-gradient(135deg, rgba(0,229,212,.18), rgba(30,91,255,.18)); color:#8FA3C2; font-size:11px; font-weight:600; padding:6px; box-sizing:border-box;">Перетащите фото</div>
          </div>
          <div data-elt-ref="2" style="position:absolute; inset:0; opacity:0; transition:opacity .6s ease; pointer-events:none;">
            <div style="width:100%; height:100%; border-radius:20px; display:grid; place-items:center; text-align:center; background:linear-gradient(135deg, rgba(0,229,212,.18), rgba(30,91,255,.18)); color:#8FA3C2; font-size:11px; font-weight:600; padding:6px; box-sizing:border-box;">Перетащите фото</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; justify-content:center; margin-top:16px;">
          <span data-elt-ref-dot="0" style="height:6px; width:26px; border-radius:3px; background:#00E5D4; transition:background .4s, width .4s; cursor:pointer;" title="Баланс партнёра"></span>
          <span data-elt-ref-dot="1" style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" title="Фото 1"></span>
          <span data-elt-ref-dot="2" style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" title="Фото 2"></span>
        </div>
      </div>
    </div>
  </section>

  <section class="landingSection" id="pricing" style="padding-top:8px;">
    <div class="sectionIntro" style="max-width:640px; margin:0 auto 28px; text-align:center;">
      <span class="pill" style="color: var(--cyan)">Тарифы</span>
      <h2 style="margin-top:10px;">Прозрачная подписка</h2>
      <p style="font-weight: 300">Оплата за один клик. Меняйте тариф в любой момент.</p>
    </div>
    <div class="tariffGrid" style="grid-template-columns:repeat(3,1fr); align-items:stretch; gap:18px;">

      <div class="tariffCard" style="position:relative; gap:0; display:flex; flex-direction:column;">
        <h3 style="font-size:22px; margin:0 0 4px;">TalentCheck</h3>
        <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:8px;">
          <span style="font-size:32px; font-weight:900; color:#fff; text-transform:none; letter-spacing:-.01em;">7 500&nbsp;₽</span>
          <span style="color:#8FA3C2; font-size:14px; font-weight:700; text-transform:none;">/ мес</span>
        </div>
        <p style="color:#93A4BE; font-size:13px; line-height:1.5; margin:0 0 16px;">Для малого бизнеса и небольших команд.</p>
        <span style="margin-bottom:10px;">Включено</span>
        <ul style="list-style:none; margin:0 0 18px; padding:0; display:grid; gap:9px;">
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>25 оценок в месяц</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Оценка кандидатов и сотрудников</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Готовые профили компетенций</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>AI-рекомендации по каждому человеку</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Краткий отчёт для принятия решения</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Базовая воронка оценки</li>
        </ul>
        <a class="ghostOnDark" style="width:100%; box-sizing:border-box; text-align:center; margin-top:auto;">Купить подписку</a>
      </div>

      <div class="tariffCard highlight" style="position:relative; gap:0; z-index:2; display:flex; flex-direction:column;">
        <div style="position:absolute; top:-13px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,var(--cyan),var(--blue)); color:#02121a; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.07em; padding:5px 15px; border-radius:999px; white-space:nowrap; box-shadow:0 6px 20px rgba(0,229,212,.35);">Популярный</div>
        <h3 style="font-size:22px; margin:0 0 4px;">TalentPro</h3>
        <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:8px;">
          <span style="font-size:32px; font-weight:900; color:#fff; text-transform:none; letter-spacing:-.01em;">24 000&nbsp;₽</span>
          <span style="color:#8FA3C2; font-size:14px; font-weight:700; text-transform:none;">/ мес</span>
        </div>
        <p style="color:#93A4BE; font-size:13px; line-height:1.5; margin:0 0 16px;">Для рекрутинговых агентств и HR-отделов.</p>
        <span style="margin-bottom:10px;">Всё из TalentCheck, плюс</span>
        <ul style="list-style:none; margin:0 0 18px; padding:0; display:grid; gap:9px;">
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>80 оценок в месяц</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Сравнение кандидатов между собой</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Расширенные AI-отчёты</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>История результатов</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Групповые оценки</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Брендинг отчётов</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Воронка найма и аналитика</li>
        </ul>
        <a class="blueButton wide" style="margin-top:auto;">Купить подписку</a>
      </div>

      <div class="tariffCard" style="position:relative; gap:0; display:flex; flex-direction:column;">
        <h3 style="font-size:22px; margin:0 0 4px;">Talent Studio</h3>
        <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:8px;">
          <span style="font-size:32px; font-weight:900; color:#fff; text-transform:none; letter-spacing:-.01em;">75 000&nbsp;₽</span>
          <span style="color:#8FA3C2; font-size:14px; font-weight:700; text-transform:none;">/ мес</span>
        </div>
        <p style="color:#93A4BE; font-size:13px; line-height:1.5; margin:0 0 16px;">Для компаний, которым нужна не просто оценка, а настройка системы под свои HR-процессы.</p>
        <span style="margin-bottom:10px;">Всё из TalentPro, плюс</span>
        <ul style="list-style:none; margin:0 0 16px; padding:0; display:grid; gap:9px;">
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>250 оценок в месяц</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Конструктор компетенций</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>360-оценка</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Собственные вопросы и шкалы</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Корпоративные шаблоны оценки</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Групповые отчёты по командам и отделам</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Performance Review</li>
          <li style="display:flex; gap:9px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:#C3D0E4;"><span style="font-size:12px; flex:0 0 auto; margin-top:2px;">✓</span>Расширенная аналитика</li>
        </ul>
        <a class="ghostOnDark" style="width:100%; box-sizing:border-box; text-align:center; margin-top:auto;">Купить подписку</a>
      </div>

    </div>
  </section>

  <section class="landingSection" style="padding-top:0;">
    <div class="sectionIntro" style="max-width:640px; margin:0 auto 28px; text-align:center;">
      <span class="pill" style="color: #01b9f2;">Отзывы</span>
      <h2 style="margin-top:10px;">HR-команды о работе с Eltera</h2>
    </div>
    <div class="testGrid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px;">
      <div class="testCard">
        <p style="font-weight: 200">«Сократили скрининг почти в три раза. AI-отчёты заменили нам два этапа собеседований.»</p>
        <div class="testWho"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5D4'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='41' font-family='Manrope,Arial,sans-serif' font-size='24' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%9C%D0%9A%3C/text%3E%3C/svg%3E" alt="" style="width:44px; height:44px; flex:none; border-radius:50%; object-fit:cover; display:block;"><div><b style="color:#fff;">Мария Климова</b><div style="color:#8FA3C2; font-size:13px;">HRD, Skylink</div></div></div>
      </div>
      <div class="testCard">
        <p style="font-weight: 200">«Наконец-то объективные данные вместо ощущений. Воронка стала прозрачной для всей команды.»</p>
        <div class="testWho"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5D4'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='41' font-family='Manrope,Arial,sans-serif' font-size='24' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%90%D0%9F%3C/text%3E%3C/svg%3E" alt="" style="width:44px; height:44px; flex:none; border-radius:50%; object-fit:cover; display:block;"><div><b style="color:#fff;">Антон Петров</b><div style="color:#8FA3C2; font-size:13px;">Head of Talent, NORDA</div></div></div>
      </div>
      <div class="testCard">
        <p style="font-weight: 200">«Реферальная программа окупила подписку за первый месяц. Вывод в USDT — приятный бонус.»</p>
        <div class="testWho"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5D4'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='41' font-family='Manrope,Arial,sans-serif' font-size='24' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%95%D0%A1%3C/text%3E%3C/svg%3E" alt="" style="width:44px; height:44px; flex:none; border-radius:50%; object-fit:cover; display:block;"><div><b style="color:#fff;">Елена Соколова</b><div style="color:#8FA3C2; font-size:13px;">Recruiting Lead, VEGA HR</div></div></div>
      </div>
    </div>
  </section>

  <section class="landingSection" id="faq" style="padding-top:0;">
    <div class="sectionIntro" style="max-width:660px; margin:0 auto 24px; text-align:center;">
      <span class="pill">FAQ</span>
      <h2 style="margin-top:10px;">Частые вопросы</h2>
      <p style="font-weight:300">Собрали ответы на вопросы, которые чаще всего возникают перед запуском оценки кандидатов и сотрудников.</p>
    </div>
    <div style="display:grid; gap:10px; max-width:820px; margin:0 auto;">
      <details class="faqItem" open=""><summary style="font-weight:500;">Чем Eltera отличается от обычных тестов?</summary><p style="font-weight:300;">Мы не просто даём тест и баллы. Eltera сопоставляет ответы с профилем должности, показывает fit кандидата или сотрудника, риски, сильные стороны и выдаёт готовую AI-рекомендацию для HR или руководителя.</p></details>
      <details class="faqItem"><summary style="font-weight:500;">Откуда взяты тесты и вопросы?</summary><p style="font-weight:300;">В основе — модели компетенций, поведенческие индикаторы, HR-практика оценки и прикладные подходы к анализу кандидатов и сотрудников. Eltera не ставит диагнозы и не заменяет решение человека, а помогает быстрее увидеть соответствие роли, риски и зоны развития.</p></details>
      <details class="faqItem"><summary style="font-weight:500;">Насколько можно доверять результатам?</summary><p style="font-weight:300;">Оценка не должна быть единственным основанием для решения. Это инструмент поддержки HR и руководителя: он помогает структурировать данные, сравнить людей по единым критериям и снизить влияние субъективного впечатления.</p></details>
      <details class="faqItem"><summary style="font-weight:500;">Можно ли оценить целый отдел?</summary><p style="font-weight:300;">Да. В Eltera можно оценить команду или отдел целиком и получить сводный отчёт: средний профиль компетенций, сильные стороны, зоны риска, вовлечённость, адаптацию и рекомендации для руководителя.</p></details>
      <details class="faqItem"><summary style="font-weight:500;">Есть ли групповые оценки и опросы?</summary><p style="font-weight:300;">Да. Можно запускать групповые оценки для команды, отдела, проекта или конкретной роли — когда нужно увидеть не одного человека, а общую картину по группе.</p></details>
      <details class="faqItem"><summary style="font-weight:500;">Как провести оценку 360, если у нас нет готовой методологии?</summary><p style="font-weight:300;">Eltera помогает собрать 360-оценку без сложной подготовки. Вы выбираете сотрудника, добавляете оценщиков — руководителя, коллег, подчинённых или самого сотрудника, — а система собирает ответы и формирует итоговый AI-отчёт.</p></details>
      <details class="faqItem"><summary style="font-weight:500;">Можно ли создать свои компетенции и вопросы?</summary><p style="font-weight:300;">Да. В расширенных тарифах можно создавать собственные компетенции, вопросы, шкалы и профили должностей. Это подходит компаниям, у которых уже есть своя модель компетенций или специфические роли.</p></details>
      <details class="faqItem"><summary style="font-weight:500;">Насколько безопасно хранить данные в Eltera?</summary><p style="font-weight:300;">Данные доступны только авторизованным пользователям компании. Можно настраивать роли, уровни доступа и правила работы с результатами оценки. Мы не передаём данные третьим лицам для самостоятельного использования.</p></details>

      <div data-elt-faq-more style="display:none; gap:10px;">
        <details class="faqItem"><summary style="font-weight:500;">Есть ли интеграция с HeadHunter и другими платформами?</summary><p style="font-weight:300;">Да. В Eltera предусмотрена интеграция с HeadHunter через API — она доступна начиная с тарифа TalentPro и входит в него без дополнительной платы. Интеграция позволяет передавать кандидатов из HeadHunter в Eltera, запускать оценку и видеть результаты в единой воронке, не перенося данные вручную. Интеграции с другими платформами также в дорожной карте и планируются в ближайшие 6 месяцев.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Сколько времени занимает внедрение?</summary><p style="font-weight:300;">Первую оценку можно запустить за несколько минут: создать профиль, отправить ссылку кандидату или сотруднику и получить отчёт. Для командных сценариев, 360 и кастомных компетенций может понадобиться дополнительная настройка.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Можно ли использовать Eltera только для кандидатов, без оценки сотрудников?</summary><p style="font-weight:300;">Да. Можно начать только с оценки кандидатов: входящий отбор, fit-профиль, красные флаги, сравнение кандидатов и рекомендации по найму. Оценку сотрудников, 360 и Performance Review можно подключить позже.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Нужно ли обучать сотрудников работе с сервисом?</summary><p style="font-weight:300;">Нет, для прохождения оценки обучение не требуется. Кандидат или сотрудник получает ссылку и проходит оценку в понятном интерфейсе, а HR и руководитель получают готовый отчёт с выводами и рекомендациями.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Что видит кандидат после прохождения оценки?</summary><p style="font-weight:300;">Это зависит от настроек компании: можно показывать только факт прохождения, краткую обратную связь или расширенный отчёт. Уровень прозрачности определяет HR-команда.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Заменяет ли Eltera HR-специалиста или руководителя?</summary><p style="font-weight:300;">Нет. Eltera не принимает решение вместо человека. Платформа помогает быстрее собрать данные, увидеть риски, сравнить кандидатов и подготовить рекомендацию. Финальное решение остаётся за HR и руководителем.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Почему нет бесплатного демо-доступа?</summary><p style="font-weight:300;">Каждая оценка использует AI-обработку, готовые профили и формирование отчёта. Вместо бесплатного демо есть доступный стартовый тариф, чтобы проверить сервис на реальных кандидатах или сотрудниках без долгого внедрения.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Можно ли платить криптовалютой?</summary><p style="font-weight:300;">Подписку можно оплатить банковской картой. Криптовалюта — не способ оплаты тарифа, а часть бонусной механики: токены можно получать в реферальной программе и внутренних активностях.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Как быстро происходит вывод токенов?</summary><p style="font-weight:300;">Если у пользователя доступен вывод, он выполняется по правилам программы; минимальная сумма и сроки отображаются внутри приложения. Токены не являются инвестиционным продуктом — это бонусная механика Eltera.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Получают ли кандидаты бонусы за прохождение оценки?</summary><p style="font-weight:300;">Бонусы могут начисляться не за сам факт прохождения теста, а за результат: если кандидат прошёл оценку, стал сотрудником и завершил период адаптации — например, после 3 месяцев работы.</p></details>
        <details class="faqItem"><summary style="font-weight:500;">Когда будет мобильное приложение?</summary><p style="font-weight:300;">Мобильное приложение в дорожной карте продукта. Уже сейчас оценку можно проходить по ссылке с телефона, а в следующих версиях появится полноценное приложение для кандидатов, сотрудников и HR-команд.</p></details>
      </div>

      <div style="display:flex; justify-content:center; margin-top:6px;">
        <a class="ghostOnDark" data-elt-faq-toggle style="cursor:pointer;">Показать ещё 11 вопросов</a>
      </div>
    </div>
  </section>

  <div class="ctaBand">
    
    <span class="pillEy">Готовы начать?</span><h2 style="margin:16px 0 12px; color:#fff; font-size:42px; line-height:1.1; font-weight:900;">Перестаньте гадать. Начните оценивать.</h2>
    <p style="color: #D6E2F5; max-width: 560px; margin: 0 auto 24px; font-size: 17px; font-weight: 200">Купите подписку Eltera и оцените первого кандидата или сотрдника.</p>
    <div class="heroButtons" style="justify-content:center;">
      <a class="blueButton large" data-route="login">Попробовать за 990 руб.</a>
      
    </div>
  </div>

  <section class="landingSection" id="ideas" style="padding-top:0;">
    <div class="sectionIntro" style="max-width:720px; margin:0 auto 30px; text-align:center;">
      <span class="pill" style="color:var(--cyan)">Eltera Pulse</span>
      <h2 style="margin-top:10px;">Идеи, оценки и благодарности — с реальным поощрением</h2>
      <p style="font-weight:300">Eltera помогает сделать вклад сотрудников видимым: пользователи проходят оценки, получают благодарности, предлагают идеи и зарабатывают бонусы внутри единой HR-экосистемы.</p>
    </div>

    <div class="pulseMetrics" style="display:grid; grid-template-columns:repeat(5,1fr); gap:14px; max-width:1040px; margin:0 auto 38px;">
      <div style="text-align:center; padding:20px 12px; border:1px solid var(--lineDark); border-radius:16px; background:rgba(30,41,59,.42);"><b style="display:block; font-size:30px; font-weight:900; color:#00E5D4;" data-count="248">248</b><span style="color:#8FA3C2; font-size:12.5px; font-weight:600;">идей предложено</span></div>
      <div style="text-align:center; padding:20px 12px; border:1px solid var(--lineDark); border-radius:16px; background:rgba(30,41,59,.42);"><b style="display:block; font-size:30px; font-weight:900; color:#9F46F1;" data-count="73">73</b><span style="color:#8FA3C2; font-size:12.5px; font-weight:600;">благодарности отправлено</span></div>
      <div style="text-align:center; padding:20px 12px; border:1px solid var(--lineDark); border-radius:16px; background:rgba(30,41,59,.42);"><b style="display:block; font-size:30px; font-weight:900; color:#22C55E;" data-count="18">18</b><span style="color:#8FA3C2; font-size:12.5px; font-weight:600;">идей месяца отмечено</span></div>
      <div style="text-align:center; padding:20px 12px; border:1px solid var(--lineDark); border-radius:16px; background:rgba(30,41,59,.42);"><b style="display:block; font-size:30px; font-weight:900; color:#16D7FF;" data-count="42500" data-group="1">42 500</b><span style="color:#8FA3C2; font-size:12.5px; font-weight:600;">токенов начислено</span></div>
      <div style="text-align:center; padding:20px 12px; border:1px solid var(--lineDark); border-radius:16px; background:rgba(30,41,59,.42);"><b style="display:block; font-size:30px; font-weight:900; color:#E7A93C;" data-count="12">12</b><span style="color:#8FA3C2; font-size:12.5px; font-weight:600;">участников получили льготы</span></div>
    </div>

    <div class="pulseBg" style="position:relative; border:1px solid var(--lineDark); border-radius:22px; background:radial-gradient(ellipse at 80% 0%, rgba(124,58,237,.14), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(0,229,212,.1), transparent 55%), rgba(15,23,42,.55); padding:34px 38px; overflow:hidden;">
      <div class="pulseStage">

        <div class="pulseSlide" data-elt-pulse="1" style="opacity:0; pointer-events:none;">
          <div class="pulseGrid">
            <div>
              <span class="pill" style="color:var(--cyan)">Бонусы за оценки</span>
              <h3 style="color:#fff; font-size:27px; font-weight:900; margin:12px 0 12px; line-height:1.18;">Оценка становится полезной для сотрудника</h3>
              <p style="color:#B8C5DA; font-size:15px; line-height:1.6; margin:0;">Пользователи могут получать бонусы за прохождение оценок. Это делает процесс оценки не формальностью, а частью системы развития и мотивации.</p>
            </div>
            <div class="walletCard" style="gap:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="statusBadge status-good" style="font-size:11px;">Оценка завершена</span>
                <span style="color:#9FB0CC; font-size:12.5px; font-weight:700;">360° · 24 компетенции</span>
              </div>
              <div style="display:flex; align-items:center; gap:11px;">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5D4'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='Manrope,Arial,sans-serif' font-size='26' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%94%D0%A1%3C/text%3E%3C/svg%3E" alt="" style="width:42px; height:42px; flex:none; border-radius:50%; object-fit:cover; display:block;">
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:700; font-size:15px;">Дмитрий Соколов</div><div style="color:#8FA3C2; font-size:12.5px;">Менеджер · компания «Орбита»</div></div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div style="border:1px solid var(--lineDark); border-radius:12px; background:rgba(15,23,42,.5); padding:12px 14px;"><div style="color:#fff; font-size:24px; font-weight:900; line-height:1;">88%</div><div style="color:#8FA3C2; font-size:11.5px; margin-top:4px;">соответствие роли</div></div>
                <div style="border:1px solid var(--lineDark); border-radius:12px; background:rgba(15,23,42,.5); padding:12px 14px;"><div style="color:#22C55E; font-size:24px; font-weight:900; line-height:1;">Готов</div><div style="color:#8FA3C2; font-size:11.5px; margin-top:4px;">к развитию в роли</div></div>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,.1); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#8FA3C2; font-size:13px;">Бонус за прохождение</span>
                <span style="display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border-radius:999px; background:rgba(0,229,212,.12); border:1px solid rgba(0,229,212,.28);"><span class="eltTok" style="width:16px; height:16px; font-size:9px;">E</span><b style="color:var(--cyan); font-size:12.5px; font-weight:800;">+120 ELT</b></span>
              </div>
            </div>
          </div>
        </div>

        <div class="pulseSlide" data-elt-pulse="0" style="opacity:1; pointer-events:auto;">
          <div class="pulseGrid">
            <div>
              <span class="pill" style="color:var(--cyan)">Благодарности</span>
              <h3 style="color:#fff; font-size:27px; font-weight:900; margin:12px 0 12px; line-height:1.18;">Признание становится видимым</h3>
              <p style="color:#B8C5DA; font-size:15px; line-height:1.6; margin:0;">Благодарности больше не теряются в чатах. Сотрудники из разных компаний могут получать признание за реальные действия, помощь, инициативу и вклад в команду.</p>
            </div>
            <div style="display:grid; gap:12px;">
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:14px 16px; display:flex; align-items:center; gap:13px;">
                <span style="display:flex; flex:none;"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5D4'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='Manrope,Arial,sans-serif' font-size='26' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%90%D0%9A%3C/text%3E%3C/svg%3E" alt="" style="width:34px; height:34px; flex:none; border-radius:50%; object-fit:cover; display:block;"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%239F46F1'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='Manrope,Arial,sans-serif' font-size='26' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%94%D0%A1%3C/text%3E%3C/svg%3E" alt="" style="width:34px; height:34px; flex:none; margin-left:-10px; box-shadow:0 0 0 2px #0f1a2e; border-radius:50%; object-fit:cover; display:block;"></span>
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-size:14px; font-weight:600;">«Спасибо за помощь в адаптации»</div><div style="color:#8FA3C2; font-size:12px;">Анна, «Скайлинк» → Дмитрий, «Орбита»</div></div>
                <span style="display:inline-flex; align-items:center; gap:5px; color:var(--cyan); font-size:12.5px; font-weight:800; flex:none;"><span class="eltTok" style="width:14px; height:14px; font-size:8px;">E</span>+50</span>
              </div>
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:14px 16px; display:flex; align-items:center; gap:13px;">
                <span style="display:flex; flex:none;"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2322C55E'/%3E%3Cstop offset='1' stop-color='%2300E5D4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='Manrope,Arial,sans-serif' font-size='26' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%9C%D0%9E%3C/text%3E%3C/svg%3E" alt="" style="width:34px; height:34px; flex:none; border-radius:50%; object-fit:cover; display:block;"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2316D7FF'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='Manrope,Arial,sans-serif' font-size='26' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%9F%D0%93%3C/text%3E%3C/svg%3E" alt="" style="width:34px; height:34px; flex:none; margin-left:-10px; box-shadow:0 0 0 2px #0f1a2e; border-radius:50%; object-fit:cover; display:block;"></span>
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-size:14px; font-weight:600;">«Закрыл сложную задачу»</div><div style="color:#8FA3C2; font-size:12px;">Мария, «Норда» → Павел, «Вега HR»</div></div>
                <span style="display:inline-flex; align-items:center; gap:5px; color:var(--cyan); font-size:12.5px; font-weight:800; flex:none;"><span class="eltTok" style="width:14px; height:14px; font-size:8px;">E</span>+80</span>
              </div>
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:14px 16px; display:flex; align-items:center; gap:13px;">
                <span style="display:flex; flex:none;"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%237C3AED'/%3E%3Cstop offset='1' stop-color='%2300E5D4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='Manrope,Arial,sans-serif' font-size='26' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%95%D0%92%3C/text%3E%3C/svg%3E" alt="" style="width:34px; height:34px; flex:none; border-radius:50%; object-fit:cover; display:block;"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5D4'/%3E%3Cstop offset='1' stop-color='%2322C55E'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='Manrope,Arial,sans-serif' font-size='26' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%98%D0%9B%3C/text%3E%3C/svg%3E" alt="" style="width:34px; height:34px; flex:none; margin-left:-10px; box-shadow:0 0 0 2px #0f1a2e; border-radius:50%; object-fit:cover; display:block;"></span>
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-size:14px; font-weight:600;">«Поддержал команду на запуске»</div><div style="color:#8FA3C2; font-size:12px;">Екатерина, «Орбита» → Ирина, «Скайлинк»</div></div>
                <span style="display:inline-flex; align-items:center; gap:5px; color:var(--cyan); font-size:12.5px; font-weight:800; flex:none;"><span class="eltTok" style="width:14px; height:14px; font-size:8px;">E</span>+60</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pulseSlide" data-elt-pulse="4" style="opacity:0; pointer-events:none;">
          <div class="pulseGrid">
            <div>
              <span class="pill" style="color:var(--cyan)">Личный баланс</span>
              <h3 style="color:#fff; font-size:27px; font-weight:900; margin:12px 0 12px; line-height:1.18;">Баланс токенов и история начислений</h3>
              <p style="color:#B8C5DA; font-size:15px; line-height:1.6; margin:0;">Токены — внутренняя бонусная механика Eltera за оценки, идеи, благодарности и активность. Это не инвестиция, а способ поощрять вклад участников внутри проекта.</p>
            </div>
            <div class="walletCard" style="gap:15px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#8FA3C2; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em;">Баланс токенов</span>
                <span class="statusBadge status-good" style="font-size:11px;">+820 за месяц</span>
              </div>
              <div style="display:flex; align-items:center; gap:12px;">
                <span class="eltTok" style="width:40px; height:40px; font-size:18px;">E</span>
                <div style="font-size:36px; font-weight:900; color:#fff; line-height:1;">2 480 <span style="color:var(--cyan); font-size:19px;">ELT</span></div>
              </div>
              <div style="display:flex; align-items:flex-end; gap:6px; height:46px;">
                <span style="flex:1; height:38%; border-radius:4px; background:linear-gradient(180deg,#00E5D4,#1E5BFF);"></span>
                <span style="flex:1; height:54%; border-radius:4px; background:linear-gradient(180deg,#00E5D4,#1E5BFF);"></span>
                <span style="flex:1; height:46%; border-radius:4px; background:linear-gradient(180deg,#00E5D4,#1E5BFF);"></span>
                <span style="flex:1; height:72%; border-radius:4px; background:linear-gradient(180deg,#00E5D4,#1E5BFF);"></span>
                <span style="flex:1; height:60%; border-radius:4px; background:linear-gradient(180deg,#00E5D4,#1E5BFF);"></span>
                <span style="flex:1; height:88%; border-radius:4px; background:linear-gradient(180deg,#00E5D4,#1E5BFF);"></span>
                <span style="flex:1; height:100%; border-radius:4px; background:linear-gradient(180deg,#00E5D4,#1E5BFF);"></span>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,.1); padding-top:12px; display:grid; gap:8px;">
                <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:#9FB0CC;">Идея принята</span><b style="color:var(--cyan);">+250</b></div>
                <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:#9FB0CC;">Благодарность от коллеги</span><b style="color:var(--cyan);">+50</b></div>
                <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:#9FB0CC;">Участие в оценке 360°</span><b style="color:var(--cyan);">+30</b></div>
              </div>
              <div style="display:flex; gap:10px;">
                <a class="blueButton" style="flex:1; text-align:center;">Потратить в приложении</a>
                <a class="ghostOnDark" style="flex:1; text-align:center; box-sizing:border-box;">Вывести на кошелёк</a>
              </div>
            </div>
          </div>
        </div>

        <div class="pulseSlide" data-elt-pulse="3" style="opacity:0; pointer-events:none;">
          <div class="pulseGrid">
            <div>
              <span class="pill" style="color:var(--cyan)">Кафетерий льгот</span>
              <h3 style="color:#fff; font-size:27px; font-weight:900; margin:12px 0 12px; line-height:1.18;">Кафетерий льгот внутри Eltera</h3>
              <p style="color:#B8C5DA; font-size:15px; line-height:1.6; margin:0;">Накопленные токены можно использовать внутри проекта Eltera на доступные льготы и бонусы — это превращает оценку, идеи и благодарности в понятную систему поощрения.</p>
            </div>
            <div class="cafeGrid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px;">
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:15px; display:grid; gap:8px; align-content:start;"><div class="bentoIcon" style="width:36px; height:36px; font-size:17px; color:#1E5BFF; background:rgba(30,91,255,.14); border-color:rgba(30,91,255,.3);">◳</div><b style="color:#fff; font-size:14px;">Обучение</b><span style="color:#8FA3C2; font-size:12px;">от 500 ELT</span></div>
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:15px; display:grid; gap:8px; align-content:start;"><div class="bentoIcon" style="width:36px; height:36px; font-size:17px; color:#9F46F1; background:rgba(159,70,241,.14); border-color:rgba(159,70,241,.3);">◎</div><b style="color:#fff; font-size:14px;">Консультации</b><span style="color:#8FA3C2; font-size:12px;">от 300 ELT</span></div>
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:15px; display:grid; gap:8px; align-content:start;"><div class="bentoIcon" style="width:36px; height:36px; font-size:17px; color:#00E5D4; background:rgba(0,229,212,.14); border-color:rgba(0,229,212,.3);">▣</div><b style="color:#fff; font-size:14px;">Мерч</b><span style="color:#8FA3C2; font-size:12px;">от 200 ELT</span></div>
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:15px; display:grid; gap:8px; align-content:start;"><div class="bentoIcon" style="width:36px; height:36px; font-size:17px; color:#22C55E; background:rgba(34,197,94,.14); border-color:rgba(34,197,94,.3);">❖</div><b style="color:#fff; font-size:14px;">Доп. выходные</b><span style="color:#8FA3C2; font-size:12px;">от 1 200 ELT</span></div>
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:15px; display:grid; gap:8px; align-content:start;"><div class="bentoIcon" style="width:36px; height:36px; font-size:17px; color:#16D7FF; background:rgba(22,215,255,.14); border-color:rgba(22,215,255,.3);">▤</div><b style="color:#fff; font-size:14px;">Сертификаты</b><span style="color:#8FA3C2; font-size:12px;">от 800 ELT</span></div>
              <div style="border:1px solid var(--lineDark); border-radius:14px; background:rgba(30,41,59,.5); padding:15px; display:grid; gap:8px; align-content:start;"><div class="bentoIcon" style="width:36px; height:36px; font-size:17px; color:#E7A93C; background:rgba(231,169,60,.14); border-color:rgba(231,169,60,.3);">✦</div><b style="color:#fff; font-size:14px;">Привилегии</b><span style="color:#8FA3C2; font-size:12px;">от 1 500 ELT</span></div>
            </div>
          </div>
        </div>

        <div class="pulseSlide" data-elt-pulse="2" style="opacity:0; pointer-events:none;">
          <div class="pulseGrid">
            <div>
              <span class="pill" style="color:var(--cyan)">Идеи месяца</span>
              <h3 style="color:#fff; font-size:27px; font-weight:900; margin:12px 0 12px; line-height:1.18;">Лучшие идеи месяца получают поддержку</h3>
              <p style="color:#B8C5DA; font-size:15px; line-height:1.6; margin:0; font-weight:300">Руководители и команды разных компаний могут предлагать идеи. Самые сильные инициативы месяца получают поощрение внутри Eltera: льготы, бонусы и дополнительную видимость.</p>
            </div>
            <div style="display:grid; gap:11px;">
              <div style="position:relative; border:1px solid rgba(0,229,212,.5); border-radius:15px; background:rgba(0,229,212,.07); box-shadow:0 0 40px rgba(0,229,212,.12); padding:15px 16px; display:flex; align-items:center; gap:14px;">
                <span style="position:absolute; top:-11px; left:16px; background:linear-gradient(135deg,var(--cyan),var(--blue)); color:#021018; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.05em; padding:4px 11px; border-radius:999px;">Идея месяца</span>
                <span style="width:34px; height:34px; border-radius:10px; display:grid; place-items:center; font-weight:900; font-size:15px; color:#021018; background:linear-gradient(135deg,#FFD66B,#E7A93C); flex:none;">1</span>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5D4'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='43' font-family='Manrope,Arial,sans-serif' font-size='24' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%98%D0%9A%3C/text%3E%3C/svg%3E" alt="" style="width:36px; height:36px; flex:none; border-radius:50%; object-fit:cover; display:block;">
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:800; font-size:14.5px;">Единый профиль адаптации новичка</div><div style="color:#8FA3C2; font-size:12px;">Игорь Климов · Аналитик · «Орбита»</div></div>
                <span style="display:inline-flex; align-items:center; gap:5px; color:var(--cyan); font-size:13px; font-weight:800; flex:none;"><span class="eltTok" style="width:15px; height:15px; font-size:8px;">E</span>+1 500</span>
              </div>
              <div style="border:1px solid var(--lineDark); border-radius:15px; background:rgba(30,41,59,.5); padding:13px 16px; display:flex; align-items:center; gap:14px;">
                <span style="width:34px; height:34px; border-radius:10px; display:grid; place-items:center; font-weight:900; font-size:15px; color:#fff; background:rgba(148,163,184,.25); flex:none;">2</span>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%239F46F1'/%3E%3Cstop offset='1' stop-color='%2300E5D4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='43' font-family='Manrope,Arial,sans-serif' font-size='24' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%9C%D0%9E%3C/text%3E%3C/svg%3E" alt="" style="width:36px; height:36px; flex:none; border-radius:50%; object-fit:cover; display:block;">
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:700; font-size:14px;">Голосование за приоритеты найма</div><div style="color:#8FA3C2; font-size:12px;">Мария Орлова · UX Researcher · «Скайлинк»</div></div>
                <span style="display:inline-flex; align-items:center; gap:5px; color:var(--cyan); font-size:12.5px; font-weight:800; flex:none;"><span class="eltTok" style="width:14px; height:14px; font-size:8px;">E</span>+900</span>
              </div>
              <div style="border:1px solid var(--lineDark); border-radius:15px; background:rgba(30,41,59,.5); padding:13px 16px; display:flex; align-items:center; gap:14px;">
                <span style="width:34px; height:34px; border-radius:10px; display:grid; place-items:center; font-weight:900; font-size:15px; color:#fff; background:rgba(180,120,70,.3); flex:none;">3</span>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2316D7FF'/%3E%3Cstop offset='1' stop-color='%231E5BFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Ctext x='32' y='43' font-family='Manrope,Arial,sans-serif' font-size='24' font-weight='800' fill='%23021018' text-anchor='middle'%3E%D0%9F%D0%93%3C/text%3E%3C/svg%3E" alt="" style="width:36px; height:36px; flex:none; border-radius:50%; object-fit:cover; display:block;">
                <div style="flex:1; min-width:0;"><div style="color:#fff; font-weight:700; font-size:14px;">Чек-лист онбординга в один экран</div><div style="color:#8FA3C2; font-size:12px;">Павел Гусев · Sales Manager · «Норда»</div></div>
                <span style="display:inline-flex; align-items:center; gap:5px; color:var(--cyan); font-size:12.5px; font-weight:800; flex:none;"><span class="eltTok" style="width:14px; height:14px; font-size:8px;">E</span>+600</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      <div style="display:flex; gap:8px; justify-content:center; margin-top:22px;">
        <span style="height:6px; width:26px; border-radius:3px; background:#00E5D4; transition:background .4s, width .4s; cursor:pointer;" data-elt-pulse-dot="0" title="Благодарности"></span>
        <span style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" data-elt-pulse-dot="1" title="Бонусы за оценки"></span>
        <span style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" data-elt-pulse-dot="2" title="Идеи месяца"></span>
        <span style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" data-elt-pulse-dot="3" title="Кафетерий льгот"></span>
        <span style="height:6px; width:22px; border-radius:3px; background:rgba(255,255,255,.18); transition:background .4s, width .4s; cursor:pointer;" data-elt-pulse-dot="4" title="Баланс и история"></span>
      </div>
    </div>

    <div style="max-width:1040px; margin:18px auto 0; border:2px solid transparent; border-radius:18px; background:radial-gradient(ellipse at 0% 50%, rgba(34,197,94,.1), transparent 60%) padding-box, linear-gradient(rgba(15,23,42,.55), rgba(15,23,42,.55)) padding-box, linear-gradient(120deg,#00E5D4,#1E5BFF,#9F46F1,#16D7FF,#00E5D4) border-box; background-size:auto,auto,300% 300%; animation:adaptShimmer 6s linear infinite, adaptGlow 3.6s ease-in-out infinite; padding:22px 26px; display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
      <div class="bentoIcon" style="width:46px; height:46px; font-size:22px; color:#22C55E; background:rgba(34,197,94,.14); border-color:rgba(34,197,94,.32); flex:none;">◈</div>
      <div style="flex:1; min-width:240px;">
        <b style="color:#fff; font-size:18px;">Бонус за успешную адаптацию</b>
        <p style="color:#B8C5DA; font-size:14px; line-height:1.55; margin:6px 0 0;">Если кандидат прошёл оценку, стал сотрудником и успешно отработал период адаптации, компания может начислить ему приветственные токены — мотивация дойти до результата, а не просто пройти тест.</p>
      </div>
      <span style="display:inline-flex; align-items:center; gap:7px; padding:9px 14px; border-radius:999px; background:rgba(34,197,94,.12); border:1px solid rgba(34,197,94,.3); flex:none;"><span class="eltTok" style="width:18px; height:18px; font-size:10px;">E</span><b style="color:#22C55E; font-size:14px; font-weight:800;">+1 000 ELT</b></span>
    </div>
  </section>

  <section class="launchSection">
    <div class="starfield"></div>
    <div class="deepGlow"></div>
    <canvas class="launchMatrix matrixCanvas"></canvas>
    <div class="orbitWrap">
      <div class="orbitRing r1"></div>
      <div class="orbitRing r2"></div>
      <div class="orbitRing r3"></div>
      <div class="orbit o1"><span class="sat"></span></div>
      <div class="orbit o2"><span class="sat"></span></div>
      <div class="orbit o3"><span class="sat"></span></div>
    </div>
    <div class="earth"></div>
    <div class="earthRim"></div>
    <div class="launchInner">
      <span class="pillEy" style="color:var(--cyan); border-color:rgba(0,229,212,.3); background:rgba(0,229,212,.07);">Скоро запуск</span>
      <h2 style="margin: 18px 0 14px; color: var(--white); font-size: clamp(34px,4.4vw,52px); font-weight: 900; line-height: 1.1">До запуска ELT осталось</h2>
      <p style="color: #AFC4E4; font-size: 17px; line-height: 1.6; max-width: 600px; margin: 0 auto; font-weight: 200">Токен Eltera станет частью экосистемы идей, благодарностей, оценок и бонусов. Запуск уже близко — следите за обратным отсчётом.</p>
      <div class="cdRow">
        <div class="cdTile"><div class="cdNum" data-elt-cd="days">—</div><div class="cdLbl">дней</div></div>
        <div class="cdTile"><div class="cdNum" data-elt-cd="hours">—</div><div class="cdLbl">часов</div></div>
        <div class="cdTile"><div class="cdNum" data-elt-cd="mins">—</div><div class="cdLbl">минут</div></div>
        <div class="cdTile sec"><div class="cdNum" data-elt-cd="secs">—</div><div class="cdLbl">секунд</div></div>
      </div>
      <div class="heroButtons" style="justify-content:center;">
        <a class="blueButton large">Получить ранний доступ</a>
      </div>
      <div class="launchNote">Запуск ELT: 20.10.2026 · 12:00 МСК</div>
    </div>
  </section>

  <section class="landingSection" id="roadmap" style="padding-top:8px;">
    <div class="roadmapGrid">
      <div class="rmText">
        <span class="pill" style="color:var(--cyan)">Roadmap · Coming soon</span>
        <h2 style="margin:12px 0 16px; line-height:1.16;">Планы реализации продукта:&nbsp;</h2>
        <p style="color: #B8C5DA; font-size: 15.5px; line-height: 1.65; margin: 0 0 14px; font-weight: 200">Мы развиваем Eltera в сторону понятной платформы, где сотрудники смогут не только проходить оценку, но и получать короткие обучающие материалы для развития своих компетенций.</p>
        <div style="display:grid; gap:10px; max-width:460px; margin:0 0 22px;">
          <div class="rmChip"><span style="width:8px; height:8px; border-radius:50%; background:#00E5D4; box-shadow:0 0 10px #00E5D4; flex:none;"></span><span style="color:#D6E2F5; font-size:14px;">Мобильное приложение в <b style="color:#fff;">App Store</b> и <b style="color:#fff;">Google Play</b></span></div>
          <div class="rmChip"><span style="width:8px; height:8px; border-radius:50%; background:#9F46F1; box-shadow:0 0 10px #9F46F1; flex:none;"></span><span style="color:#D6E2F5; font-size:14px;">Обучение, бонусы и новости компании — в одном месте</span></div>
          <div class="rmChip"><span style="width:8px; height:8px; border-radius:50%; background:#1E5BFF; box-shadow:0 0 10px #1E5BFF; flex:none;"></span><span style="color:#D6E2F5; font-size:14px;">LMS&nbsp; —&nbsp; система обучения, курсы и уроки.</span></div>
        </div>
        <div class="heroButtons"><a class="blueButton large">Следить за обновлениями</a></div>
      </div>
      <div class="phoneWrap">
        <div class="phoneGlow"></div>
        <div class="phoneCore">
          <div class="phoneNotch"></div>
          <div class="phoneScreen2">
            <div class="logoRing"></div>
            <div class="logoRing r2"></div>
            <img class="logoPulse" src="/public/assets/eltera_logo_horizontal_on_dark.svg?v=20" alt="Eltera">
          </div>
        </div>
        <div class="orbitField">
          <div class="orbitItem" style="transform:rotate(0deg) translateX(198px);"><div class="orbitCounter" style="transform:rotate(0deg);"><div class="orbitInner"><div class="roadCard"><span class="rcIcon" style="background:rgba(0,229,212,.16); color:#00E5D4;">◳</span><b>Обучение</b></div></div></div></div>
          <div class="orbitItem" style="transform:rotate(72deg) translateX(198px);"><div class="orbitCounter" style="transform:rotate(-72deg);"><div class="orbitInner"><div class="roadCard"><span class="rcIcon" style="background:rgba(30,91,255,.18); color:#5b8cff;">▣</span><b>App Store · Google Play</b></div></div></div></div>
          <div class="orbitItem" style="transform:rotate(144deg) translateX(198px);"><div class="orbitCounter" style="transform:rotate(-144deg);"><div class="orbitInner"><div class="roadCard"><span class="rcIcon" style="background:rgba(159,70,241,.18); color:#bb8cf5;">E</span><b>Запуск токена ELT</b></div></div></div></div>
          <div class="orbitItem" style="transform:rotate(216deg) translateX(198px);"><div class="orbitCounter" style="transform:rotate(-216deg);"><div class="orbitInner"><div class="roadCard"><span class="rcIcon" style="background:rgba(0,229,212,.16); color:#00E5D4;">✦</span><b>Улучшение сервиса</b></div></div></div></div>
          <div class="orbitItem" style="transform:rotate(288deg) translateX(198px);"><div class="orbitCounter" style="transform:rotate(-288deg);"><div class="orbitInner"><div class="roadCard"><span class="rcIcon" style="background:rgba(34,197,94,.18); color:#3ddc84;">↗</span><b>Рост с пользователями</b></div></div></div></div>
        </div>
      </div>
    </div>
  </section>

  <footer class="eltFooter">
    <div class="footInner" style="background-color: #04060B; border-color: var(--blue)">
      <div class="footGrid">
        <div class="footBrand">
          <img src="/public/assets/eltera_logo_horizontal_on_dark.svg?v=20" alt="Eltera">
          <div class="footDesc"><b>Платформа оценки&nbsp;</b><span>AI-сервис для оценки кандидатов, сотрудников, команд, 360, Performance Review и развития компетенций.</span></div>
          <div class="footCopy">© 2026 Eltera. Все права защищены.</div>
        </div>
        <div class="footCol">
          <h4>Продукт</h4>
          <a href="#how">Как работает платформа</a>
          <a href="#pricing">Тарифы</a>
          <a href="#faq">FAQ</a>
          <a>Руководство пользователя</a>
        </div>
        <div class="footCol">
          <h4>Компания</h4>
          <a>Читать наш Telegram</a>
          <a>Новости</a>
          <a href="#referral">Партнёрам</a>
          <a>Написать в поддержку</a>
        </div>
        <div class="footCol">
          <h4>Документы</h4>
          <a>Политика конфиденциальности</a>
          <a>Пользовательское соглашение</a>
          <a>Оферта</a>
          <a>Обработка персональных данных</a>
        </div>
      </div>
      <div class="footBottom">
        <span class="footTagline">ООО "Эльтера" · объективная оценка людей&nbsp;</span>
        <div class="footActions">
          
          
        </div>
      </div>
    </div>
  </footer>

</div>
`;
}

// ---- runtime behaviours (vanilla port of the design's DCLogic component) ----
let _timers = [];
let _rafs = [];
let _observers = [];
let _listeners = [];

function _on(target, evt, fn, opts) {
  target.addEventListener(evt, fn, opts);
  _listeners.push([target, evt, fn]);
}

function teardownLanding() {
  _timers.forEach(clearInterval); _timers = [];
  _rafs.forEach(cancelAnimationFrame); _rafs = [];
  _observers.forEach((o) => o.disconnect()); _observers = [];
  _listeners.forEach(([t, e, f]) => t.removeEventListener(e, f)); _listeners = [];
}

function setDot(el, on) {
  el.style.width = on ? "26px" : "22px";
  el.style.background = on ? "#00E5D4" : "rgba(255,255,255,.18)";
}

export function initLanding() {
  teardownLanding();
  const root = document.querySelector(".landing.landingBody");
  if (!root) return;

  setupCountdown(root);
  setupDashboardViews(root);
  setupRefSlider(root);
  setupPulseSlider(root);
  setupFaq(root);
  setupFunnel(root);
  setupCounters();
  setupBentoFit();
  setupMatrix();
  setupReveal();
  setupParallax();
}

function setupCountdown(root) {
  const cells = [...root.querySelectorAll("[data-elt-cd]")];
  if (!cells.length) return;
  const target = new Date("2026-10-20T12:00:00+03:00").getTime();
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const day = Math.floor(diff / 86400000); diff -= day * 86400000;
    const hr = Math.floor(diff / 3600000); diff -= hr * 3600000;
    const mn = Math.floor(diff / 60000); diff -= mn * 60000;
    const sc = Math.floor(diff / 1000);
    const map = { days: String(day), hours: pad(hr), mins: pad(mn), secs: pad(sc) };
    cells.forEach((el) => { el.textContent = map[el.dataset.eltCd]; });
  };
  tick();
  _timers.push(setInterval(tick, 1000));
}

function setupDashboardViews(root) {
  const views = [...root.querySelectorAll("[data-elt-view]")];
  if (!views.length) return;
  const dots = [...root.querySelectorAll("[data-elt-view-dot]")];
  const cands = [...root.querySelectorAll("[data-elt-cand]")];
  const nameEl = root.querySelector("[data-elt-view-name]");
  const names = ["Воронка оценки кандидатов", "Профиль сотрудника", "Команда"];
  let view = 0, cand = 0;
  const applyView = () => {
    views.forEach((v) => {
      const on = +v.dataset.eltView === view;
      v.style.opacity = on ? 1 : 0;
      v.style.pointerEvents = on ? "auto" : "none";
    });
    dots.forEach((d) => setDot(d, +d.dataset.eltViewDot === view));
    if (nameEl) nameEl.textContent = names[view];
  };
  const applyCand = () => {
    cands.forEach((c) => { c.style.opacity = +c.dataset.eltCand === cand ? 1 : 0; });
  };
  dots.forEach((d) => _on(d, "click", () => { view = +d.dataset.eltViewDot; applyView(); }));
  applyView(); applyCand();
  _timers.push(setInterval(() => {
    view = (view + 1) % 3;
    if (view === 1) cand = (cand + 1) % 3;
    applyView(); applyCand();
  }, 5200));
}

function setupRefSlider(root) {
  const slides = [...root.querySelectorAll("[data-elt-ref]")];
  if (!slides.length) return;
  const dots = [...root.querySelectorAll("[data-elt-ref-dot]")];
  let ref = 0;
  const apply = () => {
    slides.forEach((s) => {
      const on = +s.dataset.eltRef === ref;
      s.style.opacity = on ? 1 : 0;
      s.style.pointerEvents = on ? "auto" : "none";
    });
    dots.forEach((d) => setDot(d, +d.dataset.eltRefDot === ref));
  };
  dots.forEach((d) => _on(d, "click", () => { ref = +d.dataset.eltRefDot; apply(); }));
  apply();
  _timers.push(setInterval(() => { ref = (ref + 1) % slides.length; apply(); }, 5000));
}

function setupPulseSlider(root) {
  const slides = [...root.querySelectorAll("[data-elt-pulse]")];
  if (!slides.length) return;
  const dots = [...root.querySelectorAll("[data-elt-pulse-dot]")];
  let pulse = 0;
  const apply = () => {
    slides.forEach((s) => {
      const on = +s.dataset.eltPulse === pulse;
      s.style.opacity = on ? 1 : 0;
      s.style.pointerEvents = on ? "auto" : "none";
    });
    dots.forEach((d) => setDot(d, +d.dataset.eltPulseDot === pulse));
  };
  dots.forEach((d) => _on(d, "click", () => { pulse = +d.dataset.eltPulseDot; apply(); }));
  apply();
  _timers.push(setInterval(() => { pulse = (pulse + 1) % slides.length; apply(); }, 6000));
}

function setupFaq(root) {
  const more = root.querySelector("[data-elt-faq-more]");
  const btn = root.querySelector("[data-elt-faq-toggle]");
  if (!more || !btn) return;
  let open = false;
  _on(btn, "click", () => {
    open = !open;
    more.style.display = open ? "grid" : "none";
    btn.textContent = open ? "Свернуть" : "Показать ещё 11 вопросов";
  });
}

function setupFunnel(root) {
  const panel = root.querySelector(".heroPanel");
  if (!panel) return;
  const makeFunnel = () => {
    const base = [249, 142, 68, 24, 19, 16];
    const jitter = [6, 5, 3, 2, 2, 1];
    const vals = base.map((v, i) => v + Math.round((Math.random() * 2 - 1) * jitter[i]));
    for (let i = 1; i < vals.length; i++) if (vals[i] >= vals[i - 1]) vals[i] = vals[i - 1] - 1;
    return { vals, fit: 91 + Math.round(Math.random() * 2) };
  };
  const apply = (f) => {
    const b = f.vals[0];
    for (let i = 0; i < 6; i++) {
      const row = panel.querySelector(".liveFunnel .fnl" + (i + 1));
      if (!row) continue;
      const em = row.querySelector("em");
      const span = row.querySelector("span");
      if (em) em.style.width = (i === 0 ? 100 : f.vals[i] / b * 100).toFixed(1) + "%";
      if (span) span.textContent = f.vals[i];
    }
    const set = (sel, val) => { const el = panel.querySelector(sel); if (el) el.textContent = val; };
    set(".kpiResp", f.vals[0]); set(".kpiFit", f.fit + "%"); set(".kpiOff", f.vals[3]);
  };
  _timers.push(setInterval(() => apply(makeFunnel()), 3200));
}

function setupParallax() {
  const bg = document.querySelector(".heroBg");
  const hero = document.querySelector(".eltHero");
  if (!bg || !hero) return;
  let ticking = false;
  const apply = () => {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const y = Math.max(0, -rect.top);
    bg.style.transform = "translate3d(0," + (y * 0.42).toFixed(1) + "px,0)";
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
  _on(window, "scroll", onScroll, { passive: true });
  apply();
}

function setupReveal() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = [];
  const push = (sel, variant, stagger) => {
    [...document.querySelectorAll(sel)].forEach((el, i) => {
      if (el.classList.contains("rv")) return;
      const v = variant === "alt" ? (i % 2 ? "right" : "left") : variant;
      el.classList.add("rv", "rv-" + v);
      if (stagger !== false) el.style.transitionDelay = Math.min(i, 6) * 75 + "ms";
      items.push(el);
    });
  };
  push(".heroCopy", "left", false);
  push(".heroPanel", "right", false);
  push(".sectionIntro", "up", false);
  push(".bentoCard", "alt");
  push(".stepCard", "up");
  push(".metricBand .metricCell", "scale");
  push(".cryptoWrap", "up", false);
  push(".testCard", "up");
  push(".pulseMetrics > div", "scale");
  push("#ideas .pulseBg", "blur", false);
  push(".tariffCard", "scale");
  push(".faqItem", "up");
  push("#roadmap .rmText", "left", false);
  push("#roadmap .phoneWrap", "right", false);
  push(".ctaBand", "scale", false);
  push(".eltFooter", "up", false);

  if (reduce) { items.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((ents, ob) => {
    ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); ob.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
  items.forEach((el) => io.observe(el));
  _observers.push(io);
}

function setupMatrix() {
  const canvases = [...document.querySelectorAll(".matrixCanvas")];
  if (!canvases.length) return;
  const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾋﾌﾍﾎ0123456789ELTERA<>/{}".split("");
  const fontSize = 16;
  canvases.forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    const host = canvas.parentElement;
    let cols, drops, w, h;
    const resize = () => {
      w = host.clientWidth; h = host.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.random() * -40);
    };
    resize();
    _on(window, "resize", resize);
    let last = 0;
    const draw = (t) => {
      const id = requestAnimationFrame(draw);
      _rafs[_rafs.length - 1] = id;
      if (t - last < 55) return;
      last = t;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.font = fontSize + "px 'Courier New', monospace";
      for (let i = 0; i < cols; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        if (y > 0) {
          ctx.fillStyle = "rgba(190,245,255,0.95)";
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y);
          ctx.fillStyle = "rgba(0,210,200,0.5)";
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y - fontSize);
        }
        if (y > h && Math.random() > 0.975) drops[i] = Math.random() * -20;
        drops[i] += 1;
      }
    };
    _rafs.push(requestAnimationFrame(draw));
  });
}

function setupBentoFit() {
  const card = document.querySelector(".bentoFeat");
  if (!card) return;
  const nums = [...card.querySelectorAll("[data-count]")];
  const arcs = [...card.querySelectorAll("circle.fitArc")];
  const fmt = (n, el) => (el.dataset.prefix || "") + Math.abs(Math.round(n)) + (el.dataset.suffix || "");
  const run = () => {
    const dur = 1600, start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      nums.forEach((el) => { el.textContent = fmt(parseFloat(el.dataset.count) * e, el); });
      arcs.forEach((c) => { c.setAttribute("stroke-dasharray", parseFloat(c.dataset.len) * e + " 289"); });
      if (p < 1) requestAnimationFrame(step);
      else {
        nums.forEach((el) => el.textContent = fmt(parseFloat(el.dataset.count), el));
        arcs.forEach((c) => c.setAttribute("stroke-dasharray", c.dataset.len + " 289"));
      }
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((en) => { if (en.isIntersecting) { run(); obs.disconnect(); } });
  }, { threshold: 0.35 });
  io.observe(card);
  _observers.push(io);
}

function setupCounters() {
  const fmt = (n, el) => {
    const r = Math.round(n);
    const sign = r < 0 ? "−" : "";
    const body = el.dataset.group ? Math.abs(r).toLocaleString("ru-RU").replace(/ /g, " ") : String(Math.abs(r));
    return sign + (el.dataset.prefix || "") + body + (el.dataset.suffix || "");
  };
  const bands = [...document.querySelectorAll(".metricBand, .pulseMetrics")];
  bands.forEach((band) => {
    const els = [...band.querySelectorAll("b[data-count]")];
    if (!els.length) return;
    const run = () => {
      els.forEach((el) => {
        const targetVal = parseFloat(el.dataset.count);
        const dur = 1500, start = performance.now();
        el.textContent = fmt(0, el);
        const step = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(targetVal * e, el);
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = fmt(targetVal, el);
        };
        requestAnimationFrame(step);
      });
    };
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(); obs.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(band);
    _observers.push(io);
  });
}
