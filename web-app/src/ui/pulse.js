// Виджет «Пульс компании» — портирован 1-в-1 из Claude Design (dashboard.dc.html).
// Кольцо «индекс здоровья» (count-up + заливка дуги), клик по кольцу разворачивает
// раскладку вклада в индекс, лента событий крутится по кругу каждые 3.5с.
//
// Разметка панели и карточки факторов рендерятся на стороне render.js
// (pulsePanel). Здесь — только анимируемое кольцо и тикер, которые вставляются
// в пустые контейнеры #pulseRingWrap / #pulseTicker после отрисовки экрана.
// initPulse() вызывается из app.js после каждой перерисовки «Главной».

let tickTimer = null;

export function initPulse() {
  const wrap = document.getElementById("pulseRingWrap");
  if (!wrap) return;
  if (wrap.__pulseDone) return; // кольцо уже нарисовано (morphdom не трогает панель)
  wrap.__pulseDone = true;
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }

  // Индекс здоровья и лента событий приходят с бэкенда через data-атрибуты
  // панели (render.js → pulsePanel). Никаких моков — только ov.pulse.
  const panel = document.getElementById("pulsePanel");
  let idx = parseInt(panel && panel.dataset.pulseIndex, 10);
  if (!Number.isFinite(idx)) idx = 0;
  idx = Math.max(0, Math.min(100, idx));
  let EVENTS = [];
  try { EVENTS = JSON.parse((panel && panel.dataset.pulseTicker) || "[]"); } catch { EVENTS = []; }

  const r = 62, c = 2 * Math.PI * r;

  wrap.innerHTML =
    '<div class="ov-pulse-glow"></div>' +
    '<svg viewBox="0 0 150 150">' +
    '<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#00E5D4"/>' +
    '</linearGradient></defs>' +
    '<circle class="ov-pulse-track" cx="75" cy="75" r="62" fill="none" stroke-width="9"/>' +
    '<circle id="pulseArc" cx="75" cy="75" r="62" fill="none" stroke="url(#pg)" stroke-width="9" ' +
    'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" transform="rotate(-90 75 75)"/>' +
    '<text class="ov-pulse-num" id="pulseNum" x="75" y="72" text-anchor="middle" font-family="Manrope" font-size="34" font-weight="800">0</text>' +
    '<text class="ov-pulse-cap" x="75" y="94" text-anchor="middle" font-family="Manrope" font-size="11">индекс здоровья</text>' +
    '</svg>';

  const arc = document.getElementById("pulseArc");
  arc.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.22,.61,.36,1)";
  setTimeout(() => arc.setAttribute("stroke-dashoffset", c * (1 - idx / 100)), 150);

  const num = document.getElementById("pulseNum");
  const t0 = performance.now();
  (function countUp(now) {
    const p = Math.min(1, (now - t0) / 1300);
    num.textContent = Math.round(idx * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(countUp);
  })(performance.now());
  // Подстраховка: если rAF придушен (фоновая вкладка/headless), гарантируем
  // финальное значение по таймеру, чтобы кольцо не залипло на нуле.
  setTimeout(() => { if (num.textContent !== String(idx)) num.textContent = idx; }, 1400);

  wrap.style.cursor = "pointer";
  wrap.onclick = () => {
    const b = document.getElementById("pulseBreak");
    if (b) b.style.display = b.style.display === "none" ? "block" : "none";
  };

  const tick = document.getElementById("pulseTicker");
  if (tick && !EVENTS.length) {
    // Событий пока нет — показываем спокойную заглушку без ротации.
    tick.innerHTML =
      '<span class="ov-pulse-ticker-dot"></span>' +
      '<span class="ov-pulse-ticker-text">Пока нет свежих событий</span>';
    return;
  }
  let ti = 0;
  function rotate() {
    const el = document.getElementById("pulseTicker");
    if (!el) { clearInterval(tickTimer); tickTimer = null; return; }
    el.style.opacity = "0";
    setTimeout(() => {
      el.innerHTML =
        '<span class="ov-pulse-ticker-dot"></span>' +
        '<span class="ov-pulse-ticker-text">' + EVENTS[ti % EVENTS.length] + "</span>" +
        '<span class="ov-pulse-ticker-time">только что</span>';
      el.style.opacity = "1";
      ti++;
    }, 300);
  }
  rotate();
  tickTimer = setInterval(rotate, 3500);
}
