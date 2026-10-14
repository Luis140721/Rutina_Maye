// Gráfico de progreso (una serie): línea de 2 px, marcadores con anillo,
// cuadrícula hairline, crosshair + tooltip y vista de tabla equivalente.

const NS = 'http://www.w3.org/2000/svg';
const el = (t, a = {}) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };

/**
 * puntos: [{ x: Date, y: number, etiqueta: string, detalle: string }]
 * opts: { unidad: 'kg', titulo }
 */
export function renderLineChart(container, puntos, opts = {}) {
  container.innerHTML = '';
  container.classList.add('viz-root');
  if (!puntos.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Todavía no hay registros de este ejercicio. Cuando guardes una sesión, aquí verás tu progreso.';
    container.append(p);
    return;
  }
  // El viewBox se ajusta al ancho real para que el texto se lea en el celular.
  const W = Math.max(300, Math.min(720, container.clientWidth || 360)), H = Math.round(W * 0.6);
  const m = { t: 20, r: 64, b: 36, l: 44 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz', role: 'img', 'aria-label': opts.titulo || 'Progreso' });
  const xs = puntos.map((p) => p.x.getTime());
  const ys = puntos.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const span = Math.max(x1 - x0, 86400000 * 7);
  const yMin = 0;
  const yMaxRaw = Math.max(...ys) * 1.15 || 10;
  const step = niceStep(yMaxRaw / 4);
  const yMax = Math.ceil(yMaxRaw / step) * step;
  const X = (t) => m.l + ((t - x0) / span) * (W - m.l - m.r);
  const Y = (v) => H - m.b - ((v - yMin) / (yMax - yMin)) * (H - m.t - m.b);

  // cuadrícula + eje y
  const grid = el('g', { class: 'viz-grid' });
  for (let v = yMin; v <= yMax + 1e-9; v += step) {
    grid.append(el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
    const t = el('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'viz-tick' });
    t.textContent = fmt(v);
    grid.append(t);
  }
  svg.append(grid);
  svg.append(el('line', { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), class: 'viz-axis' }));

  // eje x: primera, media y última fecha
  const idx = [0, Math.floor((puntos.length - 1) / 2), puntos.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  for (const i of idx) {
    const t = el('text', { x: X(xs[i]), y: H - m.b + 18, 'text-anchor': i === 0 ? 'start' : i === puntos.length - 1 ? 'end' : 'middle', class: 'viz-tick' });
    t.textContent = fmtFecha(puntos[i].x);
    svg.append(t);
  }

  // línea
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${X(p.x.getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  svg.append(el('path', { d, class: 'viz-line' }));
  // marcadores con anillo de superficie
  const marks = el('g');
  puntos.forEach((p) => {
    marks.append(el('circle', { cx: X(p.x.getTime()), cy: Y(p.y), r: 6, class: 'viz-ring' }));
    marks.append(el('circle', { cx: X(p.x.getTime()), cy: Y(p.y), r: 4, class: 'viz-dot' }));
  });
  svg.append(marks);
  // etiqueta directa en el último punto
  const last = puntos[puntos.length - 1];
  const lbl = el('text', { x: X(last.x.getTime()) + 10, y: Y(last.y) + 4, class: 'viz-label' });
  lbl.textContent = `${fmt(last.y)} ${opts.unidad || ''}`.trim();
  svg.append(lbl);

  // crosshair + tooltip
  const cross = el('line', { y1: m.t, y2: H - m.b, class: 'viz-cross', visibility: 'hidden' });
  svg.append(cross);
  const hit = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' });
  svg.append(hit);
  const tip = document.createElement('div');
  tip.className = 'viz-tip';
  tip.hidden = true;
  const tipVal = document.createElement('strong');
  const tipLbl = document.createElement('span');
  tip.append(tipVal, tipLbl);
  const wrap = document.createElement('div');
  wrap.className = 'viz-wrap';
  wrap.append(svg, tip);
  container.append(wrap);

  const show = (i) => {
    const p = puntos[i];
    const px = X(p.x.getTime());
    cross.setAttribute('x1', px); cross.setAttribute('x2', px);
    cross.setAttribute('visibility', 'visible');
    tipVal.textContent = `${fmt(p.y)} ${opts.unidad || ''}`.trim();
    tipLbl.textContent = `${fmtFecha(p.x)} · ${p.detalle}`;
    tip.hidden = false;
    const rect = svg.getBoundingClientRect();
    const left = (px / W) * rect.width;
    tip.style.left = `${Math.min(Math.max(left, 70), rect.width - 70)}px`;
    tip.style.top = `${(Y(p.y) / H) * rect.height - 10}px`;
  };
  const hide = () => { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  hit.addEventListener('pointermove', (ev) => {
    const rect = svg.getBoundingClientRect();
    const vx = ((ev.clientX - rect.left) / rect.width) * W;
    let best = 0, bd = Infinity;
    puntos.forEach((p, i) => { const dd = Math.abs(X(p.x.getTime()) - vx); if (dd < bd) { bd = dd; best = i; } });
    show(best);
  });
  hit.addEventListener('pointerleave', hide);
  hit.setAttribute('tabindex', '0');
  let focusIdx = puntos.length - 1;
  hit.addEventListener('focus', () => show(focusIdx));
  hit.addEventListener('blur', hide);
  hit.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { focusIdx = Math.max(0, focusIdx - 1); show(focusIdx); ev.preventDefault(); }
    if (ev.key === 'ArrowRight') { focusIdx = Math.min(puntos.length - 1, focusIdx + 1); show(focusIdx); ev.preventDefault(); }
  });

  // vista de tabla (gemela accesible)
  const det = document.createElement('details');
  det.className = 'viz-table';
  const sum = document.createElement('summary');
  sum.textContent = 'Ver como tabla';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['Fecha', opts.unidad ? `Valor (${opts.unidad})` : 'Valor', 'Detalle'].forEach((h) => { const th = document.createElement('th'); th.textContent = h; trh.append(th); });
  thead.append(trh);
  const tbody = document.createElement('tbody');
  [...puntos].reverse().forEach((p) => {
    const tr = document.createElement('tr');
    [fmtFecha(p.x), fmt(p.y), p.detalle].forEach((c) => { const td = document.createElement('td'); td.textContent = c; tr.append(td); });
    tbody.append(tr);
  });
  table.append(thead, tbody);
  det.append(sum, table);
  container.append(det);
}

function niceStep(x) {
  const p = Math.pow(10, Math.floor(Math.log10(x || 1)));
  const f = x / p;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return n * p;
}
function fmt(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }
function fmtFecha(d) { return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }); }
