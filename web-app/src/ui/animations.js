/**
 * Eltera — Premium Animations
 * count-up для цифр, animated bars для прогресс-баров
 */

// ─── Easing ──────────────────────────────────────────────────────────────────
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// ─── Count-up ────────────────────────────────────────────────────────────────
/**
 * Анимирует элемент с data-countup="<число>"
 * Поддерживает суффиксы: data-countup-suffix="%"
 * Поддерживает префиксы: data-countup-prefix="+"
 * Поддерживает дробные: data-countup-decimals="1"
 */
function animateCountUp(el, duration = 900) {
  if (isNaN(parseFloat(el.dataset.countup))) return;

  const suffix = el.dataset.countupSuffix || '';
  const prefix = el.dataset.countupPrefix || '';
  const decimals = parseInt(el.dataset.countupDecimals || '0', 10);
  const start = performance.now();

  // Предотвращаем двойной запуск
  if (el._countupRunning) return;
  el._countupRunning = true;

  const format = (value) =>
    prefix + (decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('ru-RU')) + suffix;

  function tick(now) {
    // Цель перечитываем каждый кадр: если DOM обновили (morphdom при загрузке с API),
    // анимация плавно идёт к новому значению, а не к захваченному в замыкании.
    const target = parseFloat(el.dataset.countup);
    if (isNaN(target)) {
      el._countupRunning = false;
      return;
    }
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutExpo(progress);

    if (progress < 1) {
      el.textContent = format(target * eased);
      requestAnimationFrame(tick);
    } else {
      el.textContent = format(target);
      el._countupRunning = false;
    }
  }

  requestAnimationFrame(tick);
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────
/**
 * Анимирует элемент с data-bar-width="<процент>"
 * Заполняет ширину от 0 до целевого значения
 */
function animateBar(el, duration = 700, delay = 0) {
  if (isNaN(parseFloat(el.dataset.barWidth))) return;
  if (el._barRunning) return;
  el._barRunning = true;

  el.style.width = '0%';

  setTimeout(() => {
    const start = performance.now();

    function tick(now) {
      // Ширину-цель перечитываем каждый кадр (см. комментарий в animateCountUp).
      const targetWidth = parseFloat(el.dataset.barWidth);
      if (isNaN(targetWidth)) {
        el._barRunning = false;
        return;
      }
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      el.style.width = (targetWidth * eased) + '%';

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.style.width = targetWidth + '%';
        el._barRunning = false;
      }
    }

    requestAnimationFrame(tick);
  }, delay);
}

// ─── Главная функция — запускает все анимации на странице ─────────────────────
export function runPageAnimations(container = document) {
  // Count-up: все элементы с data-countup
  const countEls = container.querySelectorAll('[data-countup]');
  countEls.forEach((el, i) => {
    const delay = parseInt(el.dataset.countupDelay || '0', 10) + i * 20;
    if (delay > 0) {
      setTimeout(() => animateCountUp(el), delay);
    } else {
      animateCountUp(el);
    }
  });

  // Animated bars: все элементы с data-bar-width
  const barEls = container.querySelectorAll('[data-bar-width]');
  barEls.forEach((el, i) => {
    const delay = parseInt(el.dataset.barDelay || '0', 10) + i * 40;
    animateBar(el, 700, delay);
  });
}
