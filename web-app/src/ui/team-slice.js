// Виджет «Срез команды» — портирован 1-в-1 из Claude Design (employees.dc.html).
// Ротация плитки отдела (5с), плитки «В зоне риска» / «Лучшие», клик по плиткам и
// по KPI-карточкам открывает правый drawer со списком сотрудников.
//
// Данные (отделы + списки) строятся из реальных employeesApi в renderEmployees и
// передаются сюда через setTeamData(); initTeamSlice() вызывается из app.js после
// каждой перерисовки экрана «Сотрудники».

let TD = null;          // { D, RISK, BEST, MID, LOW, BURN, ALL }
let idx = 0, tile = null, dots = null, timer = null, clickBound = false;

export function setTeamData(data) { TD = data; }

function fc(v) { return v >= 80 ? "#4ADE80" : v >= 65 ? "#FACC15" : "#F87171"; }
function inits(n) { return n.split(" ").slice(0, 2).map((w) => w[0] || "").join(""); }

function paint() {
  if (!tile || !TD || !TD.D.length) return;
  const d = TD.D[idx % TD.D.length];
  tile.className = "elt-kpi status-" + d.s;
  tile.style.cursor = "pointer";
  tile.querySelector("#deptIcon").textContent = d.n[0] || "?";
  tile.querySelector("#deptVal").textContent = d.c;
  tile.querySelector("#deptName").textContent = d.n;
  const fe = tile.querySelector("#deptFit");
  fe.textContent = "fit " + d.f + "%"; fe.style.color = fc(d.f);
  tile.querySelector("#deptCap").textContent = d.r > 0 ? (d.r + " в зоне риска ›") : "без риска";
  tile.style.animation = "none"; void tile.offsetWidth;
  tile.style.animation = "deptFade .5s cubic-bezier(.22,.61,.36,1)";
  if (dots) {
    const ch = dots.children;
    for (let i = 0; i < ch.length; i++) {
      ch[i].style.background = i === (idx % TD.D.length) ? "#7C5CFF" : "rgba(255,255,255,.18)";
      ch[i].style.width = i === (idx % TD.D.length) ? "16px" : "5px";
    }
  }
}

function openList(eyebrow, title, subtitle, items) {
  ["eltDrawer", "eltScrim"].forEach((id) => { const e = document.getElementById(id); if (e) e.remove(); });
  const FF = "font-family:Manrope,system-ui,sans-serif";
  const sc = document.createElement("div");
  sc.id = "eltScrim";
  sc.style.cssText = "position:fixed;inset:0;z-index:9000;background:rgba(5,8,16,.55);backdrop-filter:blur(3px)";
  const close = () => { drw.remove(); sc.remove(); };
  sc.onclick = close;
  document.body.appendChild(sc);
  const drw = document.createElement("aside");
  drw.id = "eltDrawer";
  drw.style.cssText = "position:fixed;z-index:9100;top:0;right:0;height:100vh;width:404px;max-width:94vw;display:flex;flex-direction:column;background:linear-gradient(180deg, rgba(20,30,58,.55), rgba(11,16,32,.62));backdrop-filter:blur(34px) saturate(1.4);-webkit-backdrop-filter:blur(34px) saturate(1.4);border-left:1px solid rgba(255,255,255,.12);box-shadow:-30px 0 90px rgba(0,0,0,.5), inset 1px 0 0 rgba(255,255,255,.06);animation:eltDrIn .3s cubic-bezier(.22,.61,.36,1);" + FF;
  document.body.appendChild(drw);
  drw.addEventListener("click", (e) => e.stopPropagation());
  const rows = items.length ? items.map((p) => {
    const col = fc(p[2]);
    const v = p[2] === 0 ? "не оценён" : "fit " + p[2] + "%";
    return `<div style="display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)"><span style="width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:12px;font-weight:800;color:#02121a;background:linear-gradient(135deg,#1E5BFF,#00E5D4)">${inits(p[0])}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:13px;color:rgba(230,242,255,.82);font-weight:600">${p[0]}</b><span style="font-size:11.5px;color:rgba(230,242,255,.45)">${p[1]}</span></span><span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:${col}"><span style="width:7px;height:7px;border-radius:50%;background:${col}"></span>${v}</span></div>`;
  }).join("") : `<div style="padding:24px;text-align:center;color:rgba(230,242,255,.4);font-size:13px">Список пуст.</div>`;
  drw.innerHTML = `<div style="padding:22px 22px 14px;border-bottom:1px solid rgba(255,255,255,.08);flex:none"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#9B6BF2;margin-bottom:6px">${eyebrow}</div><h2 style="margin:0;color:#fff;font-size:18px;font-weight:800">${title}</h2></div><button id="eltDX" style="flex:none;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#cdd9ee;cursor:pointer;font-size:14px">✕</button></div><p style="margin:10px 0 0;color:rgba(230,242,255,.5);font-size:12.5px">${subtitle}</p></div><div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px">${rows}</div><div style="padding:14px 18px;border-top:1px solid rgba(255,255,255,.08);flex:none"><button id="eltBack" style="width:100%;padding:11px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#E6F2FF;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer">← Назад</button></div>`;
  drw.querySelector("#eltDX").onclick = close;
  drw.querySelector("#eltBack").onclick = close;
}

// Клик по KPI-карточкам открывает соответствующий список (навешивается один раз).
function bindKpiClicks() {
  if (clickBound) return;
  clickBound = true;
  document.addEventListener("click", (e) => {
    if (!TD) return;
    const kpi = e.target.closest(".elt-kpi-grid .elt-kpi");
    if (!kpi || kpi.id === "deptTile") return;
    const lbl = (kpi.querySelector(".elt-kpi-label") || {}).textContent || "";
    if (/средний балл|удовлетвор/i.test(lbl)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    const map = [
      [/всего сотрудник/i, () => openList("База", "Все сотрудники", TD.ALL.length + " сотрудников в базе оценки", TD.ALL)],
      [/высокий результат/i, () => openList("Результат", "Высокий результат", "fit 80%+ · " + TD.BEST.length + " сотрудников", TD.BEST)],
      [/средний результат/i, () => openList("Результат", "Средний результат", "fit 60–79% · " + TD.MID.length + " сотрудников", TD.MID)],
      [/низкий результат/i, () => openList("Результат", "Низкий результат", "fit ниже 60% · " + TD.LOW.length + " сотрудников", TD.LOW)],
      [/зоне риска/i, () => openList("Приоритет", "В зоне риска", TD.RISK.length + " сотрудников требуют внимания", TD.RISK)],
      [/выгорание/i, () => openList("Внимание", "Признаки выгорания", TD.BURN.length + " сотрудника · нужен разговор 1:1", TD.BURN)],
    ];
    for (const [re, fn] of map) {
      if (re.test(lbl)) { e.preventDefault(); e.stopImmediatePropagation(); fn(); return; }
    }
  }, true);
}

export function initTeamSlice() {
  if (timer) { clearInterval(timer); timer = null; }
  tile = document.getElementById("deptTile");
  dots = document.getElementById("deptDots");
  if (!tile || !TD) return;
  // Точки-индикаторы по числу отделов.
  if (dots) {
    dots.innerHTML = "";
    TD.D.forEach(() => {
      const sp = document.createElement("span");
      sp.style.cssText = "height:5px;width:5px;border-radius:999px;background:rgba(255,255,255,.18);transition:all .3s";
      dots.appendChild(sp);
    });
  }
  idx = 0;
  tile.onclick = (e) => {
    e.stopPropagation();
    const d = TD.D[idx % TD.D.length];
    openList("Зона риска", d.n, (d.r || "нет") + " сотрудников требуют внимания", TD.RISK.filter((x) => x[1].indexOf(d.n) === 0));
  };
  const rt = document.getElementById("riskTile");
  if (rt) rt.onclick = (e) => { e.stopPropagation(); openList("Приоритет", "В зоне риска", TD.RISK.length + " сотрудников по компании · нужен ИПР", TD.RISK); };
  const bt = document.getElementById("bestTile");
  if (bt) bt.onclick = (e) => { e.stopPropagation(); openList("Топ", "Лучшие сотрудники", "Высокий результат · кадровый резерв", TD.BEST); };
  paint();
  timer = setInterval(() => { idx = (idx + 1) % TD.D.length; paint(); }, 5000);
  bindKpiClicks();
}
