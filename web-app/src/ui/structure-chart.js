// Оргчарт «Структура» — SVG-коннекторы + зум + поиск. Портировано из Claude Design
// (structure.dc.html). Разметку рисует renderStructure из реальных данных orgTree;
// здесь — интерактив: рисование связей компания→отделы, зум канваса, поиск-фильтр.
// initStructureChart() вызывается из app.js после каждой перерисовки экрана.

let Z = 1;

// Рисуем «шину» из карточки компании к каждой колонке отдела (скруглённые углы).
function drawConn() {
  const root = document.getElementById("orgCanvas");
  const svg = document.getElementById("orgConnSvg");
  if (!root || !svg) return;
  const cols = root.querySelectorAll(".org-node");
  if (!cols.length) return;
  const sc = Z || 1;
  const sb = svg.getBoundingClientRect();
  const busY = 20, bottom = 46, r = 10;
  const xs = [];
  cols.forEach((c) => { const b = c.getBoundingClientRect(); xs.push((b.left + b.width / 2 - sb.left) / sc); });
  const minX = Math.min(...xs), maxX = Math.max(...xs), cX = (minX + maxX) / 2;
  let d;
  if (xs.length === 1) {
    d = "M " + xs[0].toFixed(1) + " 0 V " + bottom;
  } else {
    d = "M " + cX.toFixed(1) + " 0 V " + busY + " M " + (minX + r).toFixed(1) + " " + busY + " H " + (maxX - r).toFixed(1) + " ";
    xs.forEach((x) => {
      if (Math.abs(x - minX) < 1.5) d += "M " + x.toFixed(1) + " " + bottom + " V " + (busY + r) + " Q " + x.toFixed(1) + " " + busY + " " + (x + r).toFixed(1) + " " + busY + " ";
      else if (Math.abs(x - maxX) < 1.5) d += "M " + x.toFixed(1) + " " + bottom + " V " + (busY + r) + " Q " + x.toFixed(1) + " " + busY + " " + (x - r).toFixed(1) + " " + busY + " ";
      else d += "M " + x.toFixed(1) + " " + busY + " V " + bottom + " ";
    });
  }
  const bp = svg.querySelector("#orgBaseP"), gp = svg.querySelector("#orgGlowP");
  if (bp) bp.setAttribute("d", d);
  if (gp) gp.setAttribute("d", d);
}

function setZoom(z) {
  Z = Math.max(0.5, Math.min(1.2, z));
  const c = document.getElementById("orgCanvas");
  const l = document.getElementById("orgZLbl");
  if (c) c.style.transform = "scale(" + Z + ")";
  if (l) l.textContent = Math.round(Z * 100) + "%";
  setTimeout(drawConn, 40);
}

// Поиск-фильтр: подсвечивает совпадения по сотрудникам/отделам, гасит остальные.
function applySearch(q) {
  const root = document.getElementById("orgCanvas");
  if (!root) return;
  const term = (q || "").trim().toLowerCase();
  root.querySelectorAll(".org-emp").forEach((e) => {
    const hit = !term || e.textContent.toLowerCase().includes(term);
    e.style.opacity = hit ? "1" : "0.25";
  });
}

let bound = false;
export function initStructureChart() {
  Z = 1;
  const canvas = document.getElementById("orgCanvas");
  if (!canvas) return;
  canvas.style.transform = "scale(1)";
  drawConn();
  // Перерисовать связи после подгрузки шрифтов/раскладки и при ресайзе.
  setTimeout(drawConn, 60);
  setTimeout(drawConn, 250);
  if (!bound) {
    bound = true;
    window.addEventListener("resize", () => { if (document.getElementById("orgCanvas")) drawConn(); });
    // Делегирование: зум и поиск переживают перерисовки morphdom.
    document.addEventListener("click", (e) => {
      const zi = e.target.closest("#orgZoomIn"); const zo = e.target.closest("#orgZoomOut");
      if (zi) { e.preventDefault(); setZoom(Z + 0.1); }
      if (zo) { e.preventDefault(); setZoom(Z - 0.1); }
    });
    document.addEventListener("input", (e) => {
      if (e.target && e.target.id === "orgSearch") applySearch(e.target.value);
    });
  }
}
