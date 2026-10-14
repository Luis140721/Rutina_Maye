// Recorrido guiado (coach marks): resalta un elemento de la pantalla y muestra
// una tarjeta flotante corta. Un paso = { sel, titulo, texto }.

let active = null;
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Inicia un recorrido. Devuelve false si ningún paso tiene elemento en pantalla. */
export function startTour(steps, opts = {}) {
  endTour();
  const valid = steps.filter((s) => document.querySelector(s.sel));
  if (!valid.length) return false;

  const spot = el('div', 'tour-spot');
  const card = el('div', 'tour-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-live', 'polite');
  document.body.append(spot, card);
  document.body.classList.add('tour-on');

  let i = 0, raf = 0;
  const place = () => {
    const t = document.querySelector(valid[i].sel);
    if (!t) return;
    const r = t.getBoundingClientRect();
    const pad = 6;
    spot.style.top = `${r.top - pad}px`;
    spot.style.left = `${r.left - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const tabs = 80; // barra inferior
    let top = r.bottom + pad + 12;
    if (top + ch > vh - tabs) top = r.top - pad - 12 - ch;
    if (top < 8) top = Math.max(8, vh - tabs - ch - 8);
    let left = r.left + r.width / 2 - cw / 2;
    left = Math.max(8, Math.min(vw - cw - 8, left));
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  };
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };

  const show = (idx) => {
    i = idx;
    const s = valid[i];
    const t = document.querySelector(s.sel);
    if (!t) return i < valid.length - 1 ? show(i + 1) : endTour();
    card.innerHTML = '';
    card.append(el('div', 'tour-title', s.titulo), el('div', 'tour-text', s.texto));
    const dots = el('div', 'tour-dots');
    valid.forEach((_, k) => dots.append(el('span', k === i ? 'on' : '')));
    const foot = el('div', 'tour-foot');
    const skip = el('button', 'tour-btn tour-skip', 'Saltar');
    skip.type = 'button';
    skip.addEventListener('click', () => endTour());
    const nav = el('div', 'tour-nav');
    if (i > 0) {
      const back = el('button', 'tour-btn', 'Atrás');
      back.type = 'button';
      back.addEventListener('click', () => show(i - 1));
      nav.append(back);
    }
    const next = el('button', 'tour-btn tour-next', i === valid.length - 1 ? 'Entendido' : 'Siguiente');
    next.type = 'button';
    next.addEventListener('click', () => (i === valid.length - 1 ? endTour() : show(i + 1)));
    nav.append(next);
    foot.append(skip, dots, nav);
    card.append(foot);
    card.classList.remove('tour-in');
    void card.offsetWidth; // reinicia la animación
    card.classList.add('tour-in');
    t.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' });
    schedule();
    setTimeout(schedule, reduce() ? 0 : 350);
    setTimeout(schedule, 700);
    next.focus({ preventScroll: true });
  };

  const onKey = (e) => { if (e.key === 'Escape') endTour(); };
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);
  document.addEventListener('keydown', onKey);

  active = {
    destroy() {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      spot.remove(); card.remove();
      document.body.classList.remove('tour-on');
      opts.onEnd?.();
    },
  };
  show(0);
  return true;
}

export function endTour() {
  if (!active) return;
  const a = active;
  active = null;
  a.destroy();
}

export const tourActivo = () => !!active;
