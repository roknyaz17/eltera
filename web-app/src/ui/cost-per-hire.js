// Виджет «Стоимость привлечения» (cost-per-hire) — портирован 1-в-1 из Claude Design
// (candidates.dc.html). Данные клиентские: seed + ручная корректировка, хранение в
// localStorage. Реальные затраты вносятся через AI-терминал (как в макете) — здесь
// период, корректировка «нанято» и просмотр помесячной разбивки.
//
// renderCostPanel() вызывается из app.js после каждой перерисовки экрана «Кандидаты»
// (morphdom обнуляет внутренности #caPanel, поэтому перерисовываем виджет заново).

const KEY = "eltera-ca-v1";
const P = {
  week: { l: "Неделя", weeks: 1, hire: 1 },
  month: { l: "Месяц", weeks: 4, hire: 4 },
  quarter: { l: "Квартал", weeks: 13, hire: 11 },
  half: { l: "Полгода", weeks: 26, hire: 23 },
  year: { l: "Год", weeks: 52, hire: 47 },
};
let customWeeks = 8;
let cur = "month";
let store = {};
let loaded = false;

function rub(n) { return Math.round(n).toLocaleString("ru-RU") + " ₽"; }
function load() { try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { store = {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ } }
function seed(k) {
  const w = P[k].weeks, a = new Array(w).fill(null);
  const filled = w <= 1 ? 0 : Math.round(w * 0.65);
  for (let i = 0; i < filled; i++) a[i] = 70000 + Math.round(Math.sin(i) * 9000) + i * 900;
  store[k] = a;
}
function arr() { if (!store[cur] || store[cur].length !== P[cur].weeks) seed(cur); return store[cur]; }
function curIdx() { const a = arr(); for (let i = 0; i < a.length; i++) if (a[i] === null) return i; return -1; }
function stats() {
  const a = arr();
  const filled = a.filter((x) => x !== null);
  const sum = filled.reduce((p, x) => p + x, 0);
  const avg = filled.length ? sum / filled.length : 0;
  const hire = P[cur].hire;
  return { filled: filled.length, total: a.length, sum, avg, proj: avg * a.length, ca: hire ? sum / hire : 0, hire };
}

function openCaFilter() {
  ["caDrawer", "caScrim"].forEach((id) => { const e = document.getElementById(id); if (e) e.remove(); });
  const FF = "font-family:Manrope,system-ui,sans-serif";
  const sc = document.createElement("div");
  sc.id = "caScrim";
  sc.style.cssText = "position:fixed;inset:0;z-index:9200;background:rgba(5,8,16,.55);backdrop-filter:blur(3px)";
  const close = () => { d.remove(); sc.remove(); };
  sc.onclick = close;
  document.body.appendChild(sc);
  const d = document.createElement("aside");
  d.id = "caDrawer";
  d.style.cssText = "position:fixed;z-index:9201;top:0;right:0;height:100vh;width:404px;max-width:94vw;display:flex;flex-direction:column;background:linear-gradient(180deg, rgba(20,30,58,.55), rgba(11,16,32,.62));backdrop-filter:blur(34px) saturate(1.4);-webkit-backdrop-filter:blur(34px) saturate(1.4);border-left:1px solid rgba(255,255,255,.12);box-shadow:-30px 0 90px rgba(0,0,0,.5), inset 1px 0 0 rgba(255,255,255,.06);animation:eltDrIn .3s cubic-bezier(.22,.61,.36,1);" + FF;
  document.body.appendChild(d);
  d.addEventListener("click", (e) => e.stopPropagation());
  let sel = cur, hire = P[cur].hire;

  function gArr(k) {
    if (!P[k]) return null;
    if (!store[k] || store[k].length !== P[k].weeks) {
      const w = P[k].weeks, a = new Array(w).fill(null), fl = w <= 1 ? 0 : Math.round(w * 0.65);
      for (let q = 0; q < fl; q++) a[q] = 70000 + Math.round(Math.sin(q) * 9000) + q * 900;
      store[k] = a;
    }
    return store[k];
  }

  function draw() {
    const chips = ["week", "month", "quarter", "half", "year"].map((k) => {
      const on = k === sel;
      return `<button data-k="${k}" class="cf-chip" style="padding:8px 14px;border-radius:999px;border:1px solid ${on ? "rgba(124,58,237,.5)" : "rgba(255,255,255,.1)"};background:${on ? "rgba(124,58,237,.16)" : "rgba(255,255,255,.04)"};color:${on ? "#fff" : "#C4CBDA"};font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer">${P[k].l}</button>`;
    }).join("") + `<button data-k="custom" class="cf-chip" style="padding:8px 14px;border-radius:999px;border:1px solid ${sel === "custom" ? "rgba(124,58,237,.5)" : "rgba(255,255,255,.1)"};background:${sel === "custom" ? "rgba(124,58,237,.16)" : "rgba(255,255,255,.04)"};color:${sel === "custom" ? "#fff" : "#C4CBDA"};font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer">Произвольно</button>`;
    const sec = (t) => `<div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#9B6BF2;margin:18px 0 10px">${t}</div>`;
    d.innerHTML = `<div style="padding:22px 22px 14px;border-bottom:1px solid rgba(255,255,255,.08);flex:none"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#9B6BF2;margin-bottom:6px">Фильтр и корректировки</div><h2 style="margin:0;color:#fff;font-size:18px;font-weight:800">Стоимость привлечения</h2></div><button id="cfX" style="flex:none;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#cdd9ee;cursor:pointer;font-size:14px">✕</button></div><p style="margin:10px 0 0;color:rgba(230,242,255,.5);font-size:12.5px">Данные вносятся в журнале в реальном времени. Здесь — период и корректировки.</p></div><div style="flex:1;overflow-y:auto;padding:16px">${sec("Период")}<div style="display:flex;gap:8px;flex-wrap:wrap">${chips}</div>${sel === "custom" ? (sec("Недель в периоде") + `<input id="cfWeeks" type="number" min="1" value="${customWeeks}" style="width:100%;padding:10px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25);color:#E6F2FF;font-family:inherit;font-size:14px;outline:none">`) : ""}${sec("Нанято за период (коррекция)")}<input id="cfHire" type="number" value="${hire}" style="width:100%;padding:10px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25);color:#E6F2FF;font-family:inherit;font-size:14px;outline:none"><div id="cfTotal" style="margin-top:14px;padding:13px 14px;border-radius:13px;border:1px solid rgba(124,58,237,.3);background:linear-gradient(150deg, rgba(124,58,237,.14), rgba(0,229,212,.05))"></div>${sec("Затраты по месяцам")}<div id="cfMonths" style="display:flex;flex-direction:column;gap:7px;max-height:220px;overflow:auto;margin-bottom:10px"></div><div style="display:flex;align-items:flex-start;gap:9px;margin-top:4px;padding:11px 12px;border-radius:11px;border:1px solid rgba(6,215,245,.25);background:rgba(6,215,245,.06)"><span style="font-size:13px;color:#06D7F5">⌘</span><span style="font-size:11.5px;line-height:1.5;color:#9fd9e6">Вносить затраты можно только через AI — откройте терминал (кружок снизу) и напишите точную дату и сумму, например «декабрь 15 2025 — 3000 рублей». Здесь — только просмотр и фильтры.</span></div></div><div style="padding:14px 18px;border-top:1px solid rgba(255,255,255,.08);flex:none;display:flex;gap:8px"><button id="cfBack" style="flex:none;padding:11px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#E6F2FF;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer">Назад</button><button id="cfApply" style="flex:1;padding:11px;border-radius:12px;border:1px solid transparent;background:linear-gradient(135deg,#7C3AED,#9B6BF2);color:#fff;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer">Применить</button></div>`;
    d.querySelectorAll(".cf-chip").forEach((b) => { b.onclick = () => { sel = b.getAttribute("data-k"); hire = P[sel] ? P[sel].hire : hire; draw(); }; });
    d.querySelector("#cfHire").oninput = (e) => { hire = Number(e.target.value) || 0; };
    const cw = d.querySelector("#cfWeeks"); if (cw) cw.oninput = (e) => { customWeeks = Math.max(1, Number(e.target.value) || 1); };
    d.querySelector("#cfX").onclick = close;
    d.querySelector("#cfBack").onclick = close;
    d.querySelector("#cfApply").onclick = () => {
      if (sel === "custom") P.custom = { l: "Произвольно · " + customWeeks + " нед.", weeks: customWeeks, hire };
      else P[sel].hire = hire;
      cur = sel; save(); close(); renderCostPanel();
    };
    const jr = d.querySelector("#cfMonths");
    if (jr) {
      const ja = gArr(sel);
      if (ja) {
        const mc = Math.max(1, Math.ceil(ja.length / 4));
        let rows = "";
        for (let mi = 0; mi < mc; mi++) {
          let ms = 0, has = false;
          for (let wi = mi * 4; wi < Math.min(ja.length, mi * 4 + 4); wi++) if (ja[wi] !== null) { ms += ja[wi]; has = true; }
          rows += `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)"><span style="font-size:12.5px;color:rgba(230,242,255,.7)">Месяц ${mi + 1}</span><b style="font-size:12.5px;color:${has ? "#E6F2FF" : "rgba(230,242,255,.35)"}">${has ? rub(ms) : "—"}</b></div>`;
        }
        jr.innerHTML = rows;
      } else {
        jr.innerHTML = `<div style="font-size:12px;color:rgba(230,242,255,.4)">Примените период, чтобы увидеть разбивку.</div>`;
      }
    }
    const _ja = gArr(sel);
    const _tot = _ja ? _ja.reduce((a, x) => a + (x || 0), 0) : 0;
    const _ce = d.querySelector("#cfTotal");
    if (_ce) _ce.innerHTML = `<div style="font-size:11px;color:rgba(230,242,255,.55);margin-bottom:3px">Итого за период · ${P[sel] ? P[sel].l : ""}</div><div style="font-size:22px;font-weight:800;color:#fff">${rub(_tot)}</div>`;
  }
  draw();
}

// Перерисовать содержимое #caPanel (периодный фильтр, баннер-напоминание, hero-метрики).
export function renderCostPanel() {
  const pr = document.getElementById("caPeriods");
  if (!pr) return;
  if (!loaded) { load(); loaded = true; }
  pr.innerHTML = `<button id="caFilter" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;border:1px solid rgba(124,58,237,.4);background:rgba(124,58,237,.12);color:#E6F2FF;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer">⚲ Фильтр <span style="color:rgba(230,242,255,.5);font-weight:600">· ${P[cur].l}</span></button>`;
  document.getElementById("caFilter").onclick = (e) => { e.stopPropagation(); openCaFilter(); };
  const st = stats(), ci = curIdx();
  const now = new Date(), dow = now.getDay(), dom = now.getDate();
  const remind = (ci >= 0) && (dow === 2 || dom <= 3);
  const ban = document.getElementById("caBanner");
  if (ban) {
    if (remind) {
      const msg = dom <= 3 ? "Начало месяца — внесите затраты за прошлый месяц" : "Вторник — пора внести затраты за неделю " + (ci + 1);
      ban.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:11px;margin-bottom:12px;border:1px solid rgba(124,58,237,.32);background:linear-gradient(135deg, rgba(124,58,237,.16), rgba(0,229,212,.05))"><span style="width:8px;height:8px;border-radius:50%;background:#7C3AED;box-shadow:0 0 7px #7C3AED;animation:caBlink 1.3s step-end infinite;flex:none"></span><span style="flex:1;font-size:12px;color:#E6F2FF">${msg}</span></div>`;
    } else {
      ban.innerHTML = "";
    }
  }
  const hero = document.getElementById("caHero");
  if (hero) hero.innerHTML = `<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;border:1px solid rgba(124,58,237,.3);background:linear-gradient(150deg, rgba(124,58,237,.15), rgba(0,229,212,.05))"><div style="flex:none"><div style="font-size:10.5px;color:rgba(230,242,255,.55);margin-bottom:3px">Стоимость привлечения · факт</div><div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1">${rub(st.ca)}</div><div style="display:flex;gap:10px;margin-top:6px"><span style="font-size:11px;font-weight:700;color:#4ADE80">▼ 6% к прошл. месяцу</span><span style="font-size:11px;font-weight:700;color:#4ADE80">▼ 11% к году</span></div></div><div style="flex:1"></div><div style="display:flex;gap:18px;text-align:right;margin-right:64px"><div><div style="font-size:10px;color:rgba(230,242,255,.4)">Итого</div><div style="font-size:14px;font-weight:800;color:#fff">${rub(st.sum)}</div></div><div><div style="font-size:10px;color:rgba(230,242,255,.4)">Нанято</div><div style="font-size:14px;font-weight:800;color:#fff">${st.hire}</div></div><div><div style="font-size:10px;color:rgba(230,242,255,.4)">Недель</div><div style="font-size:14px;font-weight:800;color:#9B6BF2">${st.filled}/${st.total}</div></div></div></div>`;
}
