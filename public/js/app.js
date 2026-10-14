import { EJERCICIOS, byId, PATRONES, MUSCULOS } from './data/ejercicios.js';
import {
  BLOQUES, CICLO_SEMANAS, DIAS_SEMANA, plantillaDeCiclo, semanaDelCiclo, bloqueDeSemana,
  prescripcion, sugerencia, volumenSemanal, toISO, parseISO, fechaFinCiclo, redondear,
} from './data/rutina.js';
import {
  getState, update, subscribe, uid, ultimaSerieDe, historialDe, exportarJSON, importarJSON,
  fotos, comprimirImagen, resetAll,
} from './store.js';
import { mountAnim, destroyAnims } from './anim.js';
import { renderLineChart } from './chart.js';
import { startTour, endTour } from './tour.js';

// ============================================================================
// Utilidades DOM
// ============================================================================
function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
const $ = (sel, root = document) => root.querySelector(sel);
const vista = $('#vista');
const tituloEl = $('#titulo');
const subEl = $('#subtitulo');

function setTitulo(t, s = '') { tituloEl.textContent = t; subEl.textContent = s; }
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._to);
  t._to = setTimeout(() => { t.hidden = true; }, ms);
}
function fmtTiempo(s) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; }
function fmtFecha(iso) { return parseISO(iso).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }); }
function e1rm(peso, reps) { return reps >= 1 ? peso * (1 + reps / 30) : 0; }
function anim(ej, cls = 'ex-thumb') {
  const box = h('div', { class: cls });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.append(svg);
  // se monta en el siguiente frame para que exista en el DOM (IntersectionObserver)
  requestAnimationFrame(() => mountAnim(svg, ej.anim));
  return box;
}
function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

// ============================================================================
// Modal
// ============================================================================
const modal = $('#modal');
function openModal(title, body) {
  $('#modal-title').textContent = title;
  const b = $('#modal-body');
  b.innerHTML = '';
  b.append(body);
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() { modal.hidden = true; document.body.style.overflow = ''; destroyAnims($('#modal-body')); $('#modal-body').innerHTML = ''; }
$('#modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
function confirmar(titulo, texto, okLabel = 'Sí, continuar', danger = false) {
  return new Promise((resolve) => {
    const body = h('div', {},
      h('p', {}, texto),
      h('div', { class: 'row mt' },
        h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'} grow`, onclick: () => { closeModal(); resolve(true); } }, okLabel),
        h('button', { class: 'btn grow', onclick: () => { closeModal(); resolve(false); } }, 'Cancelar'),
      ));
    openModal(titulo, body);
  });
}

// ============================================================================
// Temporizador de descanso
// ============================================================================
const timer = { end: 0, iv: 0, el: $('#timer'), time: $('#timer-time') };
function iniciarDescanso(seg) {
  if (!seg) return;
  clearInterval(timer.iv);
  timer.el.classList.remove('alarm');
  timer.end = Date.now() + seg * 1000;
  timer.el.hidden = false;
  tickTimer();
  timer.iv = setInterval(tickTimer, 250);
}
function tickTimer() {
  const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
  timer.time.textContent = fmtTiempo(left);
  if (left <= 0) {
    clearInterval(timer.iv);
    timer.el.classList.add('alarm');
    timer.time.textContent = '¡Vamos!';
    try { navigator.vibrate?.([250, 120, 250]); } catch { /* sin vibración */ }
    beep();
    setTimeout(() => { if (timer.el.classList.contains('alarm')) timer.el.hidden = true; }, 4000);
  }
}
$('#timer-mas').addEventListener('click', () => { timer.end = Math.max(timer.end, Date.now()) + 30000; timer.el.classList.remove('alarm'); clearInterval(timer.iv); timer.iv = setInterval(tickTimer, 250); tickTimer(); });
$('#timer-skip').addEventListener('click', () => { clearInterval(timer.iv); timer.el.hidden = true; });
let audioCtx;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [0, 0.18, 0.36].forEach((d) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
      o.start(t + d); o.stop(t + d + 0.16);
    });
  } catch { /* sin audio */ }
}
// desbloquear audio en móviles con la primera interacción
document.addEventListener('pointerdown', () => { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch { /* nada */ } }, { once: true });

// ============================================================================
// Contexto del programa
// ============================================================================
function ctx() {
  const st = getState();
  const inicio = st.perfil.inicioCiclo;
  const semanaReal = inicio ? semanaDelCiclo(inicio) : 1;
  const semana = Math.min(Math.max(1, semanaReal), CICLO_SEMANAS);
  const plantilla = plantillaDeCiclo(st.perfil.ciclo);
  return { st, inicio, semanaReal, semana, bloque: bloqueDeSemana(semana), plantilla, vencido: inicio && semanaReal > CICLO_SEMANAS, antes: inicio && semanaReal < 1 };
}
function maquinasPara(ej) {
  return getState().maquinas
    .filter((m) => (m.reemplaza || []).includes(ej.id) || (m.patrones || []).includes(ej.patron))
    .sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0));
}
function opcionesVariante(ej) {
  const ops = [{ value: '', label: `${ej.nombre} (principal)` }];
  for (const v of ej.variantes) ops.push({ value: v.nombre, label: v.nombre, nota: v.nota, ref: v.ref });
  for (const m of maquinasPara(ej)) {
    if (!ops.some((o) => o.value === `maq:${m.id}`)) ops.push({ value: `maq:${m.id}`, label: `${m.nombre} · en tu gym ${stars(m.puntuacion || 0)}`, maq: m });
  }
  return ops;
}
function nombreVariante(ej, val) {
  if (!val) return null;
  if (val.startsWith('maq:')) { const m = getState().maquinas.find((x) => x.id === val.slice(4)); return m ? m.nombre : null; }
  return val;
}

// ============================================================================
// Router
// ============================================================================
const ROUTES = {};
let currentRoute = 'hoy';
function navigate(hash) { location.hash = hash; }
function render() {
  endTour();
  destroyAnims(vista);
  const [route, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const fn = ROUTES[route] || ROUTES.hoy;
  currentRoute = ROUTES[route] ? route : 'hoy';
  vista.innerHTML = '';
  window.scrollTo(0, 0);
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === (TAB_OF[route] || route)));
  fn(decodeURIComponent(arg || ''));
  programarTour(currentRoute);
}
const TAB_OF = { dia: 'rutina', ejercicio: 'rutina', sesion: 'hoy', maquina: 'maquinas', guia: 'ciclo' };
window.addEventListener('hashchange', render);

// ============================================================================
// Vista: HOY
// ============================================================================
ROUTES.hoy = () => {
  const c = ctx();
  const { st } = c;
  if (!c.inicio) { setTitulo(`Hola, ${st.perfil.nombre}`, 'Vamos a configurar tu rutina'); return vista.append(onboarding()); }
  setTitulo(`Hola, ${st.perfil.nombre} 👋`, `Ciclo ${st.perfil.ciclo} · Semana ${c.semana} de ${CICLO_SEMANAS} · ${c.bloque.nombre}`);

  if (c.vencido) {
    vista.append(h('div', { class: 'card card-accent' },
      h('h2', {}, '🎉 ¡Terminaste las 14 semanas!'),
      h('p', {}, 'Cierra el ciclo para que la app te genere la rutina nueva con ejercicios rotados y más volumen.'),
      h('a', { class: 'btn btn-primary btn-block', href: '#ciclo' }, 'Ir a cerrar el ciclo')));
  }
  if (st.enCurso) {
    vista.append(h('div', { class: 'card card-accent' },
      h('h2', {}, '⏱️ Tienes una sesión en curso'),
      h('p', { class: 'muted' }, `${st.enCurso.diaNombre} · empezada ${fmtFecha(st.enCurso.fecha)}`),
      h('a', { class: 'btn btn-primary btn-block', href: '#sesion' }, 'Continuar sesión')));
  }

  const hoyDow = new Date().getDay();
  const diaHoy = c.plantilla.dias.find((d) => d.diaSemana === hoyDow);
  const card = h('div', { class: 'card', 'data-tour': 'hoy-dia' });
  if (diaHoy) {
    const ejs = diaHoy.ejercicios.map((s) => byId[s.ej]);
    card.append(
      h('p', { class: 'small muted' }, `${DIAS_SEMANA[hoyDow]} · hoy toca`),
      h('h2', {}, `${diaHoy.nombre} · ${diaHoy.sub}`),
      h('p', { class: 'muted' }, ejs.map((e) => e.nombre).join(' · ')),
      h('div', { class: 'row mt' },
        h('button', { class: 'btn btn-primary grow', onclick: () => iniciarSesion(diaHoy.id) }, st.enCurso ? 'Empezar otra sesión' : '▶ Empezar sesión'),
        h('a', { class: 'btn', href: `#dia/${diaHoy.id}` }, 'Ver detalle')),
    );
  } else {
    const next = c.plantilla.dias.find((d) => d.diaSemana > hoyDow) || c.plantilla.dias[0];
    card.append(
      h('p', { class: 'small muted' }, `${DIAS_SEMANA[hoyDow]}`),
      h('h2', {}, '😌 Día de descanso'),
      h('p', { class: 'muted' }, `El músculo crece mientras descansas. Próxima sesión: ${next.nombre} (${DIAS_SEMANA[next.diaSemana]}).`),
      h('p', { class: 'small muted' }, 'Si quieres entrenar hoy igual, elige una sesión abajo.'),
    );
  }
  vista.append(card);

  // bloque actual
  vista.append(h('div', { class: 'card card-tight', 'data-tour': 'hoy-bloque' },
    h('div', { class: 'row-between' }, h('strong', {}, `Bloque: ${c.bloque.nombre}`), h('span', { class: 'chip chip-accent' }, `RIR ${c.bloque.rir}`)),
    h('p', { class: 'small muted', style: 'margin:4px 0 0' }, c.bloque.resumen)));

  // adherencia semanal
  const lunes = new Date(); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7)); lunes.setHours(0, 0, 0, 0);
  const semanaIso = toISO(lunes);
  const hechas = st.sesiones.filter((s) => s.fecha >= semanaIso);
  vista.append(h('h3', { class: 'section-title' }, 'Esta semana'));
  vista.append(h('div', { class: 'card', 'data-tour': 'hoy-semana' },
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('div', { class: 'v' }, `${hechas.length}/5`), h('div', { class: 'l' }, 'sesiones')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, String(st.sesiones.length)), h('div', { class: 'l' }, 'en total')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, String(st.maquinas.length)), h('div', { class: 'l' }, 'máquinas'))),
    h('div', { class: 'chips mt' }, c.plantilla.dias.map((d) => {
      const ok = hechas.some((s) => s.diaId === d.id);
      return h('button', { class: `chip chip-btn ${ok ? 'on' : ''}`, onclick: () => iniciarSesion(d.id) }, `${ok ? '✓ ' : ''}${d.nombre}`);
    })),
    h('p', { class: 'small muted mt' }, 'Toca un día para empezar esa sesión aunque no sea el día programado.'),
  ));

  if (!st.ajustes.guiaVista) {
    vista.append(h('div', { class: 'card card-tight' },
      h('strong', {}, '📖 ¿Primera vez aquí?'),
      h('p', { class: 'small muted', style: 'margin:4px 0 8px' }, 'La primera vez que entres a cada pantalla te la explico con ventanas flotantes. Para repetirlo, toca el botón ? de arriba.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-sm btn-primary', onclick: () => tourFor('hoy', true) }, '✨ Muéstrame esta pantalla'),
        h('a', { class: 'btn btn-sm', href: '#guia' }, 'Guía completa'))));
  }
  if (st.maquinas.length === 0) {
    vista.append(h('div', { class: 'card card-tight' },
      h('strong', {}, '📷 Registra las máquinas de tu gym'),
      h('p', { class: 'small muted', style: 'margin:4px 0 8px' }, 'Tómales foto: la IA te dice para qué sirven y qué ejercicio de tu rutina pueden reemplazar.'),
      h('a', { class: 'btn btn-sm', href: '#maquinas' }, 'Ir a máquinas')));
  }
};

function onboarding() {
  const nombre = h('input', { class: 'input', value: getState().perfil.nombre || 'Maye', maxlength: 30 });
  const fecha = h('input', { class: 'input', type: 'date', value: toISO(new Date()) });
  const codigo = h('input', { class: 'input', placeholder: 'Opcional, te lo da quien administra la app', autocomplete: 'off' });
  return h('div', { class: 'card' },
    h('h2', {}, '¡Bienvenida! 💪'),
    h('p', { class: 'muted' }, 'Esta app tiene tu rutina de 5 días por semana (2 de pierna, 2 de tren superior y 1 de abdomen + glúteo + cardio), con animaciones de cada ejercicio, registro de progreso y ciclos de 14 semanas.'),
    h('label', { class: 'field mt' }, h('span', {}, 'Tu nombre'), nombre),
    h('label', { class: 'field' }, h('span', {}, '¿Qué día empiezas el ciclo 1?'), fecha),
    h('label', { class: 'field' }, h('span', {}, 'Código de acceso para analizar fotos con IA'), codigo),
    h('button', { class: 'btn btn-primary btn-block', onclick: () => {
      if (!fecha.value) return toast('Elige una fecha');
      update((s) => { s.perfil.nombre = nombre.value.trim() || 'Maye'; s.perfil.inicioCiclo = fecha.value; s.ajustes.codigo = codigo.value.trim(); });
      toast('¡Lista! Tu ciclo 1 empieza ' + fmtFecha(fecha.value));
      render();
    } }, 'Empezar'),
  );
}

// ============================================================================
// Vista: RUTINA (semana) y DÍA
// ============================================================================
ROUTES.rutina = () => {
  const c = ctx();
  setTitulo('Tu rutina', `${c.plantilla.nombre} · semana ${c.semana} · ${c.bloque.nombre}`);
  vista.append(h('p', { class: 'muted small' }, 'Series y repeticiones cambian según el bloque del ciclo. Toca un día para ver los ejercicios con su animación y variantes.'));
  for (const d of c.plantilla.dias) {
    const nSeries = d.ejercicios.reduce((a, s) => a + prescripcion(s, c.semana).series, 0);
    vista.append(h('a', { class: 'card day-card', href: `#dia/${d.id}` },
      h('div', { class: 'day-num' }, DIAS_SEMANA[d.diaSemana].slice(0, 3)),
      h('div', { class: 'grow' },
        h('strong', {}, `${d.nombre} · ${d.sub}`),
        h('div', { class: 'small muted' }, `${d.ejercicios.length} ejercicios · ${nSeries} series · ${d.ejercicios.map((s) => byId[s.ej].nombre).slice(0, 3).join(', ')}…`)),
      h('span', { class: 'muted' }, '›')));
  }
  vista.append(h('h3', { class: 'section-title' }, 'Series por músculo esta semana'));
  const vol = volumenSemanal(c.plantilla, c.semana);
  vista.append(h('div', { class: 'card', 'data-tour': 'rutina-volumen' },
    h('table', { class: 'tbl' }, h('tbody', {}, vol.map(([m, s]) => h('tr', {}, h('td', {}, m), h('td', { class: 'num' }, `${s} series`))))),
    h('p', { class: 'small muted mt' }, 'Objetivo según la evidencia: 10 o más series semanales por músculo, repartidas en 2 días (Schoenfeld 2016, 2017). Las series de ejercicios donde el músculo ayuda cuentan la mitad.')));
  vista.append(evidenciaCard());
};

function evidenciaCard() {
  return h('details', { class: 'card', 'data-tour': 'rutina-evidencia' },
    h('summary', {}, h('strong', {}, '📚 En qué se basa esta rutina')),
    h('ul', { class: 'steps mt' },
      h('li', {}, 'Cada músculo se entrena 2 veces por semana: produce más hipertrofia que 1 vez (Schoenfeld, Ogborn & Krieger, Sports Medicine 2016).'),
      h('li', {}, '10 o más series semanales por músculo: la relación dosis-respuesta sigue subiendo hasta ahí (Schoenfeld et al., J Sports Sci 2017).'),
      h('li', {}, 'Series a 1–3 repeticiones del fallo (RIR): acercarse al fallo favorece la hipertrofia sin la fatiga de llegar siempre al fallo (Robinson et al., Sports Medicine 2024).'),
      h('li', {}, 'Descansos de 2–3 minutos en compuestos: más fuerza e hipertrofia que descansar 1 minuto (Schoenfeld et al., JSCR 2016).'),
      h('li', {}, 'Progresión doble: subir repeticiones y después carga funciona igual de bien que subir solo carga (Plotkin et al., PeerJ 2022).'),
      h('li', {}, 'Hip thrust y sentadilla hacen crecer el glúteo de forma similar; la sentadilla crece más el muslo, por eso la rutina usa los dos (Plotkin et al., Frontiers in Physiology 2023).'),
      h('li', {}, 'Semana de descarga: no reduce la hipertrofia conseguida y permite recuperar fatiga (Coleman et al., PeerJ 2024).'),
      h('li', {}, 'Cardio combinado con pesas no interfiere con la ganancia muscular ni con la fuerza máxima (Schumann et al., Sports Medicine 2022).'),
      h('li', {}, 'Rango completo y énfasis en la posición estirada del músculo (Wolf et al., 2023).')));
}

ROUTES.dia = (id) => {
  const c = ctx();
  const dia = c.plantilla.dias.find((d) => d.id === id);
  if (!dia) return navigate('#rutina');
  setTitulo(`${dia.nombre} · ${dia.sub}`, `${DIAS_SEMANA[dia.diaSemana]} · semana ${c.semana} · ${c.bloque.nombre} · RIR ${c.bloque.rir}`);
  vista.append(h('button', { class: 'btn btn-primary btn-block', 'data-tour': 'dia-empezar', onclick: () => iniciarSesion(dia.id) }, '▶ Empezar esta sesión'));
  vista.append(h('p', { class: 'small muted mt' }, c.bloque.detalle));
  dia.ejercicios.forEach((slot, i) => {
    const p = prescripcion(slot, c.semana);
    const ej = p.ej;
    const sel = h('select', { class: 'input input-sm mt', style: 'text-align:left', 'data-tour': i === 0 ? 'dia-variante' : null, onchange: (e) => update((s) => { s.variantes[ej.id] = e.target.value || null; }) },
      opcionesVariante(ej).map((o) => h('option', { value: o.value, selected: (c.st.variantes[ej.id] || '') === o.value }, o.label)));
    vista.append(h('div', { class: 'card' },
      h('div', { class: 'ex-row' },
        h('a', { href: `#ejercicio/${ej.id}`, 'data-tour': i === 0 ? 'dia-anim' : null }, anim(ej)),
        h('div', { class: 'grow' },
          h('a', { class: 'ex-name', href: `#ejercicio/${ej.id}` }, `${i + 1}. ${ej.nombre}`),
          h('div', { class: 'presc', 'data-tour': i === 0 ? 'dia-presc' : null }, prescTexto(p)),
          h('div', { class: 'small muted' }, ej.musculos.join(' · ')),
          sel)),
    ));
  });
};

function prescTexto(p) {
  if (p.ej.tipo === 'cardio') return `${p.reps[0]}–${p.reps[1]} min · zona 2`;
  const u = p.unidad === 'seg' ? ' s' : '';
  return `${p.series} × ${p.reps[0]}–${p.reps[1]}${u} · RIR ${p.rir} · descanso ${fmtTiempo(p.descanso)}`;
}

// ============================================================================
// Vista: EJERCICIO (detalle)
// ============================================================================
ROUTES.ejercicio = (id) => {
  const ej = byId[id];
  if (!ej) return navigate('#rutina');
  setTitulo(ej.nombre, ej.musculos.join(' · '));
  vista.append(h('div', { class: 'row', style: 'margin-bottom:10px' }, h('button', { class: 'btn btn-sm', onclick: () => history.back() }, '‹ Volver')));
  vista.append(anim(ej, 'ex-big'));
  vista.append(h('p', { class: 'small muted center', style: 'margin:6px 0 12px' }, 'La figura repite el movimiento completo. Fíjate en la trayectoria y el rango.'));
  vista.append(h('div', { class: 'card' },
    h('p', {}, ej.descripcion),
    h('div', { class: 'chips' }, h('span', { class: 'chip' }, PATRONES[ej.patron]), h('span', { class: 'chip' }, ej.equipo), h('span', { class: 'chip' }, `${ej.reps[0]}–${ej.reps[1]} ${ej.unidad || 'reps'}`), h('span', { class: 'chip' }, `descanso ${fmtTiempo(ej.descanso)}`))));
  vista.append(h('div', { class: 'card', 'data-tour': 'ej-tecnica' }, h('h3', {}, 'Cómo hacerlo'), h('ol', { class: 'steps' }, ej.tecnica.map((t) => h('li', {}, t)))));
  vista.append(h('div', { class: 'card', 'data-tour': 'ej-errores' }, h('h3', {}, 'Errores comunes'), h('ul', { class: 'steps' }, ej.errores.map((t) => h('li', {}, t)))));

  const vcard = h('div', { class: 'card', 'data-tour': 'ej-variantes' }, h('h3', {}, 'Variantes'), h('p', { class: 'small muted' }, 'Si la máquina está ocupada o tu gym no la tiene, usa cualquiera de estas. Mismo patrón, mismo estímulo.'));
  const ul = h('ul', { class: 'list' });
  for (const v of ej.variantes) {
    const ref = v.ref && byId[v.ref];
    ul.append(h('li', {}, h('div', { class: 'ex-row' },
      ref ? h('a', { href: `#ejercicio/${ref.id}` }, anim(ref)) : h('div', { class: 'ex-thumb', style: 'display:flex;align-items:center;justify-content:center;font-size:26px' }, equipoIcono(v.equipo)),
      h('div', {}, h('strong', {}, v.nombre), h('div', { class: 'small muted' }, v.equipo), h('div', { class: 'small' }, v.nota), ref ? h('a', { class: 'small', href: `#ejercicio/${ref.id}` }, 'Ver animación ›') : null))));
  }
  const maqs = maquinasPara(ej);
  for (const m of maqs) {
    const img = h('div', { class: 'ex-thumb' });
    cargarFoto(m.fotoId, img);
    ul.append(h('li', {}, h('div', { class: 'ex-row' },
      h('a', { href: `#maquina/${m.id}` }, img),
      h('div', {}, h('strong', {}, m.nombre), h('div', { class: 'stars' }, stars(m.puntuacion || 0)), h('div', { class: 'small muted' }, 'Máquina de tu gym'), h('div', { class: 'small' }, m.ajustes || m.resumen || '')))));
  }
  vcard.append(ul);
  vista.append(vcard);

  const hist = historialDe(ej.id);
  if (hist.length) {
    const cont = h('div', { class: 'card' }, h('h3', {}, 'Tu progreso'));
    const box = h('div');
    cont.append(box);
    vista.append(cont);
    renderLineChart(box, puntosProgreso(ej, hist), { unidad: unidadProgreso(ej), titulo: ej.nombre });
  }
};
function equipoIcono(eq) { return { 'máquina': '🏋️', 'mancuerna': '💪', 'barra': '🏋️', 'polea': '🪢', 'peso corporal': '🧘', 'banda': '➰', 'cardio': '🏃', 'peso libre': '🏋️' }[eq] || '•'; }

async function cargarFoto(fotoId, box) {
  if (!fotoId) { box.textContent = '🏋️'; box.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:26px'; return; }
  const blob = await fotos.obtener(fotoId);
  if (!blob) return;
  const img = h('img', { alt: '', style: 'width:100%;height:100%;object-fit:cover;display:block' });
  img.src = URL.createObjectURL(blob);
  box.append(img);
}

// ============================================================================
// Sesión de entrenamiento
// ============================================================================
async function iniciarSesion(diaId) {
  const c = ctx();
  const st = c.st;
  if (st.enCurso && st.enCurso.diaId !== diaId) {
    const ok = await confirmar('Ya hay una sesión en curso', `Tienes abierta "${st.enCurso.diaNombre}". ¿Descartarla y empezar otra?`, 'Descartar y empezar', true);
    if (!ok) return;
  } else if (st.enCurso) { return navigate('#sesion'); }
  const dia = c.plantilla.dias.find((d) => d.id === diaId);
  const ejercicios = dia.ejercicios.map((slot) => {
    const p = prescripcion(slot, c.semana);
    const ult = ultimaSerieDe(slot.ej);
    const sug = sugerencia(p.ej, ult?.registro, p);
    let pesoIni = '';
    if (sug) pesoIni = sug.peso;
    else if (ult) pesoIni = Math.max(...ult.registro.series.map((s) => Number(s.peso) || 0));
    if (pesoIni && p.cargaFactor < 1) pesoIni = redondear(pesoIni * p.cargaFactor);
    return {
      ej: slot.ej, variante: st.variantes[slot.ej] || null,
      objetivo: { series: p.series, reps: p.reps, rir: p.rir, unidad: p.unidad, descanso: p.descanso },
      series: Array.from({ length: p.series }, () => ({ peso: pesoIni === 0 ? '' : pesoIni, reps: '', rir: '', hecho: false })),
      nota: '',
    };
  });
  update((s) => {
    s.enCurso = { id: uid(), fecha: toISO(new Date()), diaId, diaNombre: `${dia.nombre} · ${dia.sub}`, ciclo: st.perfil.ciclo, semana: c.semana, bloque: c.bloque.id, inicio: Date.now(), ejercicios };
  });
  navigate('#sesion');
}

ROUTES.sesion = () => {
  const st = getState();
  const ses = st.enCurso;
  if (!ses) return navigate('#hoy');
  setTitulo(ses.diaNombre, `Semana ${ses.semana} · ${bloqueDeSemana(ses.semana).nombre} · ${fmtFecha(ses.fecha)}`);
  const bloque = bloqueDeSemana(ses.semana);
  vista.append(h('p', { class: 'small muted' }, `Objetivo de hoy: terminar cada serie con ${bloque.rir} repeticiones en reserva (RIR ${bloque.rir}). Marca ✓ al terminar cada serie para que arranque el descanso.`));

  ses.ejercicios.forEach((reg, idx) => {
    const ej = byId[reg.ej];
    const ult = ultimaSerieDe(ej.id);
    const presc = { ...reg.objetivo, ej };
    const sug = sugerencia(ej, ult?.registro, presc);
    const card = h('div', { class: 'card' });
    const esCardio = ej.tipo === 'cardio';
    const unidadPeso = esCardio ? 'min' : 'kg';
    const unidadReps = reg.objetivo.unidad === 'seg' ? 'seg' : esCardio ? 'nivel' : 'reps';

    const sel = h('select', { class: 'input input-sm mt', style: 'text-align:left', onchange: (e) => update((s) => { s.enCurso.ejercicios[idx].variante = e.target.value || null; s.variantes[ej.id] = e.target.value || null; }) },
      opcionesVariante(ej).map((o) => h('option', { value: o.value, selected: (reg.variante || '') === o.value }, o.label)));

    card.append(h('div', { class: 'ex-row' },
      h('a', { href: `#ejercicio/${ej.id}` }, anim(ej)),
      h('div', { class: 'grow', 'data-tour': idx === 0 ? 'ses-objetivo' : null },
        h('a', { class: 'ex-name', href: `#ejercicio/${ej.id}` }, `${idx + 1}. ${ej.nombre}`),
        h('div', { class: 'presc' }, prescTexto({ ...presc, series: reg.objetivo.series, reps: reg.objetivo.reps, rir: reg.objetivo.rir, descanso: reg.objetivo.descanso, unidad: reg.objetivo.unidad })),
        ult ? h('div', { class: 'small muted' }, `Última vez (${fmtFecha(ult.sesion.fecha)}): ${resumenSeries(ult.registro, unidadPeso, unidadReps)}`) : h('div', { class: 'small muted' }, 'Primera vez: busca un peso con el que llegues al rango con el RIR indicado.'),
        sel)));
    if (sug) card.append(h('div', { class: `sug sug-${sug.tipo}` }, sug.texto));

    const grid = h('div', { class: 'set-grid' },
      h('div', { class: 'hdr' }, '#'), h('div', { class: 'hdr' }, unidadPeso), h('div', { class: 'hdr' }, unidadReps), h('div', { class: 'hdr' }, 'RIR'), h('div', { class: 'hdr' }, '✓'));
    const renderSets = () => {
      grid.querySelectorAll('.set').forEach((n) => n.remove());
      const cur = getState().enCurso.ejercicios[idx];
      cur.series.forEach((s, si) => {
        const peso = h('input', { class: 'input input-sm num set', type: 'number', inputmode: 'decimal', step: '0.5', min: '0', value: s.peso ?? '', placeholder: unidadPeso, onchange: (e) => update((x) => { x.enCurso.ejercicios[idx].series[si].peso = e.target.value === '' ? '' : Number(e.target.value); }) });
        const reps = h('input', { class: 'input input-sm num set', type: 'number', inputmode: 'numeric', min: '0', value: s.reps ?? '', placeholder: `${reg.objetivo.reps[0]}–${reg.objetivo.reps[1]}`, onchange: (e) => update((x) => { x.enCurso.ejercicios[idx].series[si].reps = e.target.value === '' ? '' : Number(e.target.value); }) });
        const rir = h('select', { class: 'input input-sm set', onchange: (e) => update((x) => { x.enCurso.ejercicios[idx].series[si].rir = e.target.value === '' ? '' : Number(e.target.value); }) },
          h('option', { value: '' }, '–'), [0, 1, 2, 3, 4, 5].map((v) => h('option', { value: v, selected: s.rir === v }, String(v))));
        const chk = h('button', { class: `btn-check set ${s.hecho ? 'done' : ''}`, type: 'button', 'aria-label': 'Serie hecha', onclick: () => {
          update((x) => {
            const ss = x.enCurso.ejercicios[idx].series[si];
            ss.hecho = !ss.hecho;
            if (ss.hecho) {
              if (ss.reps === '' && !esCardio) ss.reps = reg.objetivo.reps[1];
              if (ss.rir === '') ss.rir = reg.objetivo.rir;
              if (ss.peso === '' && peso.value) ss.peso = Number(peso.value);
            }
          });
          const done = getState().enCurso.ejercicios[idx].series[si].hecho;
          if (done && !esCardio) iniciarDescanso(reg.objetivo.descanso);
          renderSets();
        } }, s.hecho ? '✓' : '');
        grid.append(h('div', { class: 'n set' }, String(si + 1)), peso, reps, rir, chk);
      });
    };
    renderSets();
    card.append(grid);
    card.append(h('div', { class: 'row mt', 'data-tour': idx === 0 ? 'ses-mas' : null },
      h('button', { class: 'btn btn-sm', onclick: () => { update((x) => { const ss = x.enCurso.ejercicios[idx].series; ss.push({ peso: ss[ss.length - 1]?.peso ?? '', reps: '', rir: '', hecho: false }); }); renderSets(); } }, '+ serie'),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { update((x) => { const ss = x.enCurso.ejercicios[idx].series; if (ss.length > 1) ss.pop(); }); renderSets(); } }, '− serie'),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => iniciarDescanso(reg.objetivo.descanso) }, `⏱ ${fmtTiempo(reg.objetivo.descanso)}`)));
    card.append(h('input', { class: 'input input-sm mt', style: 'text-align:left', placeholder: 'Nota (asiento, agarre, cómo te sentiste…)', value: reg.nota || '', onchange: (e) => update((x) => { x.enCurso.ejercicios[idx].nota = e.target.value; }) }));
    vista.append(card);
  });

  vista.append(h('div', { class: 'card', 'data-tour': 'ses-terminar' },
    h('button', { class: 'btn btn-primary btn-block', onclick: terminarSesion }, '✅ Terminar y guardar sesión'),
    h('button', { class: 'btn btn-ghost btn-block mt', onclick: async () => { if (await confirmar('Descartar sesión', 'Se perderán los datos de esta sesión.', 'Descartar', true)) { update((s) => { s.enCurso = null; }); navigate('#hoy'); } } }, 'Descartar sesión')));
};

function resumenSeries(reg, up = 'kg', ur = 'reps') {
  const hechas = reg.series.filter((s) => s.reps > 0);
  if (!hechas.length) return '—';
  const pesos = [...new Set(hechas.map((s) => s.peso || 0))];
  const reps = hechas.map((s) => s.reps).join('/');
  return pesos.length === 1 ? `${pesos[0]} ${up} × ${reps} ${ur}` : hechas.map((s) => `${s.peso || 0}×${s.reps}`).join(', ');
}

async function terminarSesion() {
  const st = getState();
  const ses = st.enCurso;
  const conDatos = ses.ejercicios.filter((e) => e.series.some((s) => s.reps > 0 || s.hecho));
  if (!conDatos.length) return toast('Registra al menos una serie antes de guardar');
  const final = {
    id: ses.id, fecha: ses.fecha, diaId: ses.diaId, diaNombre: ses.diaNombre, ciclo: ses.ciclo, semana: ses.semana, bloque: ses.bloque,
    duracionMin: Math.max(1, Math.round((Date.now() - ses.inicio) / 60000)),
    ejercicios: ses.ejercicios.map((e) => ({ ej: e.ej, variante: e.variante, nota: e.nota, series: e.series.filter((s) => s.reps > 0 || s.hecho).map((s) => ({ peso: Number(s.peso) || 0, reps: Number(s.reps) || 0, rir: s.rir === '' ? null : Number(s.rir) })) })).filter((e) => e.series.length),
  };
  // récords
  const prs = [];
  for (const e of final.ejercicios) {
    const ej = byId[e.ej];
    const best = Math.max(...e.series.map((s) => e1rm(s.peso, s.reps)));
    const prev = historialDe(e.ej).flatMap((x) => x.registro.series).map((s) => e1rm(s.peso, s.reps));
    if (best > 0 && prev.length && best > Math.max(...prev) * 1.001) prs.push(ej.nombre);
  }
  update((s) => { s.sesiones.push(final); s.enCurso = null; });
  clearInterval(timer.iv); timer.el.hidden = true;
  navigate('#hoy');
  const body = h('div', {},
    h('p', {}, `${final.ejercicios.length} ejercicios · ${final.ejercicios.reduce((a, e) => a + e.series.length, 0)} series · ${final.duracionMin} min.`),
    prs.length ? h('p', {}, h('strong', {}, '🏆 Nuevo récord en: '), prs.join(', ')) : h('p', { class: 'muted' }, 'Cada sesión registrada es un ladrillo más. ¡Bien hecho!'),
    h('button', { class: 'btn btn-primary btn-block mt', onclick: closeModal }, 'Genial'));
  openModal('Sesión guardada 💪', body);
}

// ============================================================================
// Vista: PROGRESO
// ============================================================================
function unidadProgreso(ej) {
  if (ej.tipo === 'cardio') return 'min';
  if (ej.unidad === 'seg') return 's';
  if (ej.incremento === 0) return 'reps';
  return 'kg (1RM est.)';
}
function puntosProgreso(ej, hist) {
  return hist.map(({ fecha, registro }) => {
    const hechas = registro.series.filter((s) => s.reps > 0);
    let y, detalle;
    if (ej.tipo === 'cardio') { y = Math.max(...hechas.map((s) => s.peso || 0)); detalle = `${y} min`; }
    else if (ej.unidad === 'seg' || ej.incremento === 0 || hechas.every((s) => !s.peso)) {
      const best = hechas.reduce((a, s) => (s.reps > a.reps ? s : a), hechas[0]);
      y = best.reps; detalle = `${hechas.length} series · mejor ${best.reps}${ej.unidad === 'seg' ? ' s' : ' reps'}${best.peso ? ` con ${best.peso} kg` : ''}`;
    } else {
      const best = hechas.reduce((a, s) => (e1rm(s.peso, s.reps) > e1rm(a.peso, a.reps) ? s : a), hechas[0]);
      y = Math.round(e1rm(best.peso, best.reps) * 10) / 10; detalle = `${best.peso} kg × ${best.reps} reps · ${hechas.length} series`;
    }
    return { x: parseISO(fecha), y, detalle };
  });
}

ROUTES.progreso = (sub) => {
  const st = getState();
  setTitulo('Progreso', `${st.sesiones.length} sesiones registradas`);
  const conHist = EJERCICIOS.filter((e) => historialDe(e.id).length);
  const selId = sub || (conHist[0]?.id ?? EJERCICIOS[0].id);
  const sel = h('select', { class: 'input', onchange: (e) => navigate(`#progreso/${e.target.value}`) },
    conHist.length ? h('optgroup', { label: 'Con registros' }, conHist.map((e) => h('option', { value: e.id, selected: e.id === selId }, e.nombre))) : null,
    h('optgroup', { label: 'Todos' }, EJERCICIOS.map((e) => h('option', { value: e.id, selected: e.id === selId && !conHist.some((x) => x.id === selId) }, e.nombre))));
  const ej = byId[selId];
  const box = h('div');
  vista.append(h('div', { class: 'card', 'data-tour': 'prog-chart' }, h('label', { class: 'field' }, h('span', {}, 'Ejercicio'), sel), box, h('p', { class: 'small muted mt' }, '1RM estimado = peso × (1 + reps/30). Sube cuando haces más repeticiones o más peso.')));
  renderLineChart(box, puntosProgreso(ej, historialDe(ej.id)), { unidad: unidadProgreso(ej), titulo: ej.nombre });

  // medidas
  vista.append(h('h3', { class: 'section-title' }, 'Medidas corporales'));
  const f = { peso: h('input', { class: 'input input-sm', type: 'number', step: '0.1', inputmode: 'decimal', placeholder: 'kg' }), cintura: h('input', { class: 'input input-sm', type: 'number', step: '0.5', inputmode: 'decimal', placeholder: 'cm' }), cadera: h('input', { class: 'input input-sm', type: 'number', step: '0.5', inputmode: 'decimal', placeholder: 'cm' }), muslo: h('input', { class: 'input input-sm', type: 'number', step: '0.5', inputmode: 'decimal', placeholder: 'cm' }) };
  const mcard = h('div', { class: 'card', 'data-tour': 'prog-medidas' },
    h('p', { class: 'small muted' }, 'Anota cada 2 semanas, en ayunas y a la misma hora. El glúteo y el muslo creciendo con la cintura estable es la señal de que vas bien.'),
    h('div', { class: 'stat-row', style: 'grid-template-columns:repeat(4,1fr)' },
      h('label', { class: 'field' }, h('span', {}, 'Peso'), f.peso), h('label', { class: 'field' }, h('span', {}, 'Cintura'), f.cintura), h('label', { class: 'field' }, h('span', {}, 'Cadera'), f.cadera), h('label', { class: 'field' }, h('span', {}, 'Muslo'), f.muslo)),
    h('button', { class: 'btn btn-sm', onclick: () => {
      const m = { fecha: toISO(new Date()), peso: Number(f.peso.value) || null, cintura: Number(f.cintura.value) || null, cadera: Number(f.cadera.value) || null, muslo: Number(f.muslo.value) || null };
      if (!m.peso && !m.cintura && !m.cadera && !m.muslo) return toast('Escribe al menos una medida');
      update((s) => { s.medidas.push(m); });
      toast('Medidas guardadas'); render();
    } }, 'Guardar medidas'));
  if (st.medidas.length) {
    mcard.append(h('table', { class: 'tbl mt' }, h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', { class: 'num' }, 'Peso'), h('th', { class: 'num' }, 'Cintura'), h('th', { class: 'num' }, 'Cadera'), h('th', { class: 'num' }, 'Muslo'))),
      h('tbody', {}, [...st.medidas].reverse().slice(0, 8).map((m) => h('tr', {}, h('td', {}, fmtFecha(m.fecha)), h('td', { class: 'num' }, m.peso ?? '–'), h('td', { class: 'num' }, m.cintura ?? '–'), h('td', { class: 'num' }, m.cadera ?? '–'), h('td', { class: 'num' }, m.muslo ?? '–'))))));
  }
  vista.append(mcard);

  // historial
  vista.append(h('h3', { class: 'section-title', 'data-tour': 'prog-sesiones' }, 'Sesiones'));
  if (!st.sesiones.length) vista.append(h('p', { class: 'muted' }, 'Aún no has guardado sesiones.'));
  const ul = h('ul', { class: 'list card' });
  [...st.sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30).forEach((s) => {
    ul.append(h('li', {}, h('div', { class: 'row-between' },
      h('div', {}, h('strong', {}, s.diaNombre), h('div', { class: 'small muted' }, `${fmtFecha(s.fecha)} · ciclo ${s.ciclo} sem ${s.semana} · ${s.ejercicios.length} ej · ${s.ejercicios.reduce((a, e) => a + e.series.length, 0)} series · ${s.duracionMin} min`)),
      h('button', { class: 'btn btn-sm', onclick: () => verSesion(s) }, 'Ver'))));
  });
  if (st.sesiones.length) vista.append(ul);
};

function verSesion(s) {
  const body = h('div', {},
    h('p', { class: 'muted small' }, `${fmtFecha(s.fecha)} · ciclo ${s.ciclo} · semana ${s.semana} · ${s.duracionMin} min`),
    h('table', { class: 'tbl' }, h('tbody', {}, s.ejercicios.map((e) => h('tr', {}, h('td', {}, h('strong', {}, byId[e.ej]?.nombre || e.ej), e.variante ? h('div', { class: 'small muted' }, `Variante: ${nombreVariante(byId[e.ej], e.variante) || e.variante}`) : null, e.nota ? h('div', { class: 'small muted' }, e.nota) : null), h('td', { class: 'num' }, e.series.map((x) => `${x.peso}×${x.reps}${x.rir != null ? ` (RIR ${x.rir})` : ''}`).join(', ')))))),
    h('button', { class: 'btn btn-danger btn-sm mt', onclick: async () => { if (await confirmar('Borrar sesión', 'Esta acción no se puede deshacer.', 'Borrar', true)) { update((x) => { x.sesiones = x.sesiones.filter((y) => y.id !== s.id); }); render(); } } }, 'Borrar sesión'));
  openModal(s.diaNombre, body);
}

// ============================================================================
// Vista: MÁQUINAS
// ============================================================================
let filtroMusculo = '';
ROUTES.maquinas = () => {
  const st = getState();
  setTitulo('Máquinas de tu gym', `${st.maquinas.length} registradas`);
  const file = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: 'display:none', onchange: (e) => { const f = e.target.files[0]; if (f) analizarFoto(f); e.target.value = ''; } });
  const file2 = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: (e) => { const f = e.target.files[0]; if (f) analizarFoto(f); e.target.value = ''; } });
  vista.append(file, file2);
  vista.append(h('div', { class: 'card card-accent', 'data-tour': 'maq-analizar' },
    h('h2', {}, '📷 Analizar una máquina'),
    h('p', { class: 'muted' }, 'Toma una foto y la IA te dice qué es, qué músculos trabaja, cómo ajustarla y qué ejercicio de tu rutina puede reemplazar. Todo se guarda en tu inventario.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary grow', onclick: () => file.click() }, 'Tomar foto'),
      h('button', { class: 'btn', onclick: () => file2.click() }, 'Galería'))));

  if (st.maquinas.length) {
    const musc = [...new Set(st.maquinas.flatMap((m) => m.musculos || []))];
    vista.append(h('div', { class: 'chips', style: 'margin:4px 0 10px' },
      h('button', { class: `chip chip-btn ${!filtroMusculo ? 'on' : ''}`, onclick: () => { filtroMusculo = ''; render(); } }, 'Todas'),
      musc.map((m) => h('button', { class: `chip chip-btn ${filtroMusculo === m ? 'on' : ''}`, onclick: () => { filtroMusculo = m; render(); } }, m))));
    const lista = st.maquinas.filter((m) => !filtroMusculo || (m.musculos || []).includes(filtroMusculo)).sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0));
    const grid = h('div', { class: 'grid-2', 'data-tour': 'maq-lista' });
    for (const m of lista) {
      const img = h('div', { class: 'noimg' }, '🏋️');
      const card = h('a', { class: 'mach', href: `#maquina/${m.id}` }, img, h('div', { class: 'body' }, h('div', { class: 'name' }, m.nombre), h('div', { class: 'stars' }, stars(m.puntuacion || 0)), h('div', { class: 'small muted' }, (m.musculos || []).slice(0, 2).join(', '))));
      grid.append(card);
      if (m.fotoId) fotos.obtener(m.fotoId).then((b) => { if (b) { const i = h('img', { alt: m.nombre }); i.src = URL.createObjectURL(b); img.replaceWith(i); } });
    }
    vista.append(grid);
    vista.append(h('div', { class: 'row mt' },
      h('button', { class: 'btn grow', onclick: compartirInventario }, '📤 Compartir inventario'),
      h('button', { class: 'btn', 'data-tour': 'maq-manual', onclick: () => agregarManual() }, '+ Manual')));
    vista.append(h('p', { class: 'small muted mt' }, 'Comparte el inventario con quien arma tu rutina: así las próximas rutinas usan las máquinas que de verdad hay en tu gym.'));
  } else {
    vista.append(h('p', { class: 'muted center mt', 'data-tour': 'maq-lista' }, 'Todavía no hay máquinas. Empieza por las de pierna: prensa, hack, extensora, femoral, hip thrust, abductora.'));
    vista.append(h('button', { class: 'btn btn-block mt', 'data-tour': 'maq-manual', onclick: () => agregarManual() }, 'Agregar una máquina sin foto'));
  }
};

async function pedirCodigo(msg) {
  return new Promise((resolve) => {
    const inp = h('input', { class: 'input', placeholder: 'Código', autocomplete: 'off', value: getState().ajustes.codigo || '' });
    openModal('Código de acceso', h('div', {}, h('p', { class: 'muted' }, msg || 'Para usar el análisis con IA necesitas el código que te dio quien administra la app.'), inp,
      h('div', { class: 'row mt' }, h('button', { class: 'btn btn-primary grow', onclick: () => { update((s) => { s.ajustes.codigo = inp.value.trim(); }); closeModal(); resolve(true); } }, 'Guardar'), h('button', { class: 'btn', onclick: () => { closeModal(); resolve(false); } }, 'Cancelar'))));
    setTimeout(() => inp.focus(), 50);
  });
}

async function analizarFoto(file) {
  let comp;
  try { comp = await comprimirImagen(file); } catch (e) { console.error(e); return toast('No se pudo leer la imagen'); }
  const url = URL.createObjectURL(comp.blob);
  const nota = h('input', { class: 'input', placeholder: 'Nota opcional (ej. "la del rincón, dice Hoist")' });
  const estado = h('div', { class: 'mt' });
  const btn = h('button', { class: 'btn btn-primary btn-block mt' }, '✨ Analizar con IA');
  const manual = h('button', { class: 'btn btn-ghost btn-block mt', onclick: () => { closeModal(); agregarManual(comp); } }, 'Guardar sin analizar');
  btn.addEventListener('click', async () => {
    btn.disabled = true; manual.disabled = true;
    estado.innerHTML = ''; estado.append(h('span', { class: 'spinner' }), ' Analizando la foto… (10–40 s)');
    try {
      const r = await llamarAPI(comp.base64, comp.mediaType, nota.value);
      closeModal();
      mostrarResultado(r, comp);
    } catch (e) {
      estado.textContent = `⚠️ ${e.message}`;
      btn.disabled = false; manual.disabled = false;
      if (e.status === 401) { const ok = await pedirCodigo(e.message); if (ok) { openModal('Analizar máquina', body); btn.click(); } }
    }
  });
  const body = h('div', {}, h('img', { class: 'preview', src: url, alt: 'Foto de la máquina' }), h('div', { class: 'mt' }, nota), btn, manual, estado);
  openModal('Analizar máquina', body);
}

async function llamarAPI(base64, mediaType, nota) {
  const st = getState();
  if (!navigator.onLine) throw new Error('Sin conexión. El análisis necesita internet; guarda la foto sin analizar y vuelve luego.');
  const res = await fetch('./api/analizar-maquina', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-codigo': st.ajustes.codigo || '' }, body: JSON.stringify({ imagen: base64, mediaType, nota }) });
  if (res.status === 404) throw Object.assign(new Error('El análisis con IA solo funciona en la versión publicada en Vercel. Mientras tanto, guarda la máquina sin analizar.'), { status: 404 });
  const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
  return data.resultado;
}

function resultadoCard(r) {
  return h('div', {},
    h('p', {}, r.resumen),
    h('div', { class: 'stars', style: 'font-size:18px' }, stars(r.puntuacion || 0), ' ', h('span', { class: 'small muted' }, `utilidad para tu rutina${r.confianza != null ? ` · confianza ${Math.round(r.confianza * 100)} %` : ''}`)),
    h('div', { class: 'chips mt' }, (r.musculos || []).map((m) => h('span', { class: 'chip chip-accent' }, m)), (r.patrones || []).map((p) => h('span', { class: 'chip' }, PATRONES[p] || p))),
    (r.reemplaza || []).length ? h('div', { class: 'mt' }, h('strong', {}, 'Puede reemplazar: '), (r.reemplaza || []).map((id) => byId[id]).filter(Boolean).map((e, i, a) => [h('a', { href: `#ejercicio/${e.id}`, onclick: closeModal }, e.nombre), i < a.length - 1 ? ', ' : ''])) : h('p', { class: 'small muted mt' }, 'No reemplaza directamente ningún ejercicio de la rutina.'),
    r.ajustes ? h('div', { class: 'mt' }, h('strong', {}, 'Cómo ajustarla: '), r.ajustes) : null,
    r.precauciones ? h('div', { class: 'mt' }, h('strong', {}, 'Cuidado: '), r.precauciones) : null);
}

function mostrarResultado(r, comp) {
  const nombre = h('input', { class: 'input', value: r.nombre || 'Máquina' });
  const body = h('div', {},
    h('label', { class: 'field' }, h('span', {}, 'Nombre'), nombre),
    resultadoCard(r),
    h('button', { class: 'btn btn-primary btn-block mt', onclick: async () => {
      const id = uid();
      const fotoId = `foto-${id}`;
      try { await fotos.guardar(fotoId, comp.blob); } catch { /* sin foto */ }
      update((s) => { s.maquinas.push({ id, fotoId, fecha: toISO(new Date()), nombre: nombre.value.trim() || r.nombre || 'Máquina', resumen: r.resumen, musculos: r.musculos || [], patrones: r.patrones || [], puntuacion: r.puntuacion || 0, reemplaza: r.reemplaza || [], ajustes: r.ajustes || '', precauciones: r.precauciones || '', confianza: r.confianza, esMaquina: r.es_maquina !== false }); });
      closeModal(); toast('Máquina guardada en tu gym'); render();
    } }, '💾 Guardar en mi gym'),
    h('button', { class: 'btn btn-ghost btn-block mt', onclick: closeModal }, 'Descartar'));
  openModal(r.nombre || 'Resultado', body);
}

function agregarManual(comp = null) {
  const nombre = h('input', { class: 'input', placeholder: 'Ej. Prensa inclinada Hammer' });
  const musc = new Set();
  const chips = h('div', { class: 'chips mt' }, MUSCULOS.filter((m) => m !== 'cardio').map((m) => h('button', { class: 'chip chip-btn', type: 'button', onclick: (e) => { if (musc.has(m)) { musc.delete(m); e.target.classList.remove('on'); } else { musc.add(m); e.target.classList.add('on'); } } }, m)));
  const pat = h('select', { class: 'input mt' }, h('option', { value: '' }, 'Patrón de movimiento (opcional)'), Object.entries(PATRONES).map(([k, v]) => h('option', { value: k }, v)));
  const punt = h('select', { class: 'input mt' }, [5, 4, 3, 2, 1].map((n) => h('option', { value: n, selected: n === 4 }, `${stars(n)} ${n === 5 ? 'excelente' : n === 4 ? 'muy útil' : n === 3 ? 'útil' : n === 2 ? 'poco útil' : 'no sirve'}`)));
  const body = h('div', {},
    comp ? h('img', { class: 'preview', src: URL.createObjectURL(comp.blob), alt: '' }) : null,
    h('label', { class: 'field mt' }, h('span', {}, 'Nombre de la máquina'), nombre),
    h('span', { class: 'small muted' }, 'Músculos que trabaja'), chips, pat, punt,
    h('button', { class: 'btn btn-primary btn-block mt', onclick: async () => {
      if (!nombre.value.trim()) return toast('Ponle un nombre');
      const id = uid(); let fotoId = null;
      if (comp) { fotoId = `foto-${id}`; try { await fotos.guardar(fotoId, comp.blob); } catch { fotoId = null; } }
      const patrones = pat.value ? [pat.value] : [];
      const reemplaza = EJERCICIOS.filter((e) => patrones.includes(e.patron)).map((e) => e.id);
      update((s) => { s.maquinas.push({ id, fotoId, fecha: toISO(new Date()), nombre: nombre.value.trim(), resumen: '', musculos: [...musc], patrones, puntuacion: Number(punt.value), reemplaza, ajustes: '', precauciones: '', manual: true }); });
      closeModal(); toast('Máquina guardada'); render();
    } }, 'Guardar'));
  openModal('Agregar máquina', body);
}

ROUTES.maquina = (id) => {
  const st = getState();
  const m = st.maquinas.find((x) => x.id === id);
  if (!m) return navigate('#maquinas');
  setTitulo(m.nombre, `Registrada ${fmtFecha(m.fecha)}`);
  vista.append(h('div', { class: 'row', style: 'margin-bottom:10px' }, h('a', { class: 'btn btn-sm', href: '#maquinas' }, '‹ Máquinas')));
  const imgBox = h('div', { class: 'card', style: 'padding:0;overflow:hidden' });
  if (m.fotoId) fotos.obtener(m.fotoId).then((b) => { if (b) { const i = h('img', { alt: m.nombre, style: 'width:100%;display:block;max-height:60vh;object-fit:contain;background:var(--surface-2)' }); i.src = URL.createObjectURL(b); imgBox.append(i); } });
  vista.append(imgBox);
  vista.append(h('div', { class: 'card' }, resultadoCard({ ...m, es_maquina: m.esMaquina })));
  vista.append(h('div', { class: 'card' },
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm', onclick: () => {
        const inp = h('input', { class: 'input', value: m.nombre });
        openModal('Renombrar', h('div', {}, inp, h('button', { class: 'btn btn-primary btn-block mt', onclick: () => { update((s) => { s.maquinas.find((x) => x.id === id).nombre = inp.value.trim() || m.nombre; }); closeModal(); render(); } }, 'Guardar')));
      } }, 'Renombrar'),
      h('button', { class: 'btn btn-sm btn-danger', onclick: async () => { if (await confirmar('Borrar máquina', `¿Borrar "${m.nombre}" de tu inventario?`, 'Borrar', true)) { await fotos.borrar(m.fotoId); update((s) => { s.maquinas = s.maquinas.filter((x) => x.id !== id); }); navigate('#maquinas'); } } }, 'Borrar'))));
};

async function compartirInventario() {
  const st = getState();
  const lineas = st.maquinas.map((m) => `• ${m.nombre} — ${(m.musculos || []).join(', ')} — ${stars(m.puntuacion || 0)}${(m.reemplaza || []).length ? ` — reemplaza: ${m.reemplaza.map((id) => byId[id]?.nombre).filter(Boolean).join(', ')}` : ''}`);
  const texto = `Máquinas del gym de ${st.perfil.nombre} (${st.maquinas.length}):\n${lineas.join('\n')}`;
  const json = JSON.stringify(st.maquinas.map(({ fotoId, ...m }) => m), null, 2);
  if (navigator.share) {
    try { await navigator.share({ title: 'Máquinas de mi gym', text: texto }); return; } catch { /* cancelado */ }
  }
  try { await navigator.clipboard.writeText(texto); toast('Lista copiada al portapapeles'); } catch { descargar('maquinas-gym.json', json); }
}
function descargar(nombre, contenido, tipo = 'application/json') {
  const a = h('a', { href: URL.createObjectURL(new Blob([contenido], { type: tipo })), download: nombre });
  document.body.append(a); a.click(); a.remove();
}

// ============================================================================
// Vista: CICLO
// ============================================================================
ROUTES.ciclo = () => {
  const c = ctx();
  const { st } = c;
  setTitulo(`Ciclo ${st.perfil.ciclo}`, c.inicio ? `Semana ${Math.min(c.semanaReal, CICLO_SEMANAS)} de ${CICLO_SEMANAS} · ${c.plantilla.nombre}` : 'Sin iniciar');
  if (!c.inicio) return vista.append(onboarding());

  const track = h('div', { class: 'cycle-track' }, Array.from({ length: CICLO_SEMANAS }, (_, i) => {
    const w = i + 1;
    return h('span', { class: `${w === 14 ? 'deload ' : ''}${w < c.semanaReal ? 'done' : ''} ${w === c.semanaReal ? 'now' : ''}`, title: `Semana ${w}` });
  }));
  vista.append(h('div', { class: 'card', 'data-tour': 'ciclo-semana' },
    h('div', { class: 'row-between' }, h('strong', {}, `Semana ${Math.min(Math.max(c.semanaReal, 0), CICLO_SEMANAS)}: ${c.bloque.nombre}`), h('span', { class: 'chip chip-accent' }, `RIR ${c.bloque.rir}`)),
    h('div', { class: 'mt' }, track),
    h('p', { class: 'small muted mt' }, `Inicio ${fmtFecha(c.inicio)} · fin ${fechaFinCiclo(c.inicio).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`),
    h('p', { class: 'mt' }, c.bloque.detalle)));

  if (c.vencido) {
    vista.append(h('div', { class: 'card card-accent' }, h('h2', {}, '🎉 Ciclo completado'), h('p', {}, 'Cierra el ciclo para generar la rutina nueva: rotan los ejercicios principales, sube un poco el volumen y las máquinas que registraste aparecen como variantes.'),
      h('button', { class: 'btn btn-primary btn-block', onclick: cerrarCiclo }, 'Cerrar ciclo y generar nueva rutina')));
  }

  vista.append(h('h3', { class: 'section-title', 'data-tour': 'ciclo-bloques' }, 'Bloques del ciclo'));
  for (const b of BLOQUES) {
    vista.append(h('div', { class: `card card-tight ${b.id === c.bloque.id ? 'card-accent' : ''}` },
      h('div', { class: 'row-between' }, h('strong', {}, `${b.nombre}`), h('span', { class: 'small muted' }, b.desde === b.hasta ? `semana ${b.desde}` : `semanas ${b.desde}–${b.hasta}`)),
      h('p', { class: 'small', style: 'margin:4px 0 0' }, b.resumen)));
  }

  vista.append(h('h3', { class: 'section-title' }, 'Cómo progresar'));
  vista.append(h('a', { class: 'btn btn-block', href: '#guia', style: 'margin-bottom:12px' }, '📖 Guía rápida de la app'));
  vista.append(h('div', { class: 'card' }, h('ol', { class: 'steps' },
    h('li', {}, 'Elige un peso con el que llegues al rango de repeticiones terminando con el RIR del bloque.'),
    h('li', {}, 'Cada sesión intenta hacer 1 repetición más por serie con el mismo peso.'),
    h('li', {}, 'Cuando todas las series llegan al tope del rango, la app te sugiere subir el peso (2 kg en mancuernas, 2,5–5 kg en máquinas).'),
    h('li', {}, 'Semana 14: descarga (mitad de series, 15 % menos peso). Después, cierra el ciclo.'))));

  vista.append(h('h3', { class: 'section-title' }, 'Ajustes y copia de seguridad'));
  const fecha = h('input', { class: 'input', type: 'date', value: c.inicio, onchange: (e) => { if (e.target.value) { update((s) => { s.perfil.inicioCiclo = e.target.value; }); toast('Fecha de inicio actualizada'); render(); } } });
  const nombre = h('input', { class: 'input', value: st.perfil.nombre, onchange: (e) => update((s) => { s.perfil.nombre = e.target.value.trim() || 'Maye'; }) });
  const fileImp = h('input', { type: 'file', accept: 'application/json', style: 'display:none', onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importarJSON(await f.text()); toast('Copia restaurada'); render(); } catch (err) { toast(err.message); }
  } });
  vista.append(h('div', { class: 'card', 'data-tour': 'ciclo-ajustes' },
    h('label', { class: 'field' }, h('span', {}, 'Nombre'), nombre),
    h('label', { class: 'field' }, h('span', {}, 'Inicio del ciclo actual'), fecha),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm', onclick: () => pedirCodigo('Código para el análisis de fotos con IA.') }, '🔑 Código de IA'),
      h('button', { class: 'btn btn-sm', onclick: () => descargar(`rutina-${st.perfil.nombre}-${toISO(new Date())}.json`, exportarJSON()) }, '⬇ Exportar copia'),
      h('button', { class: 'btn btn-sm', onclick: () => fileImp.click() }, '⬆ Importar'), fileImp),
    h('p', { class: 'small muted mt' }, 'La copia incluye sesiones, medidas y el inventario de máquinas (sin fotos). Guárdala si cambias de teléfono.'),
    h('div', { class: 'row mt' },
      !c.vencido ? h('button', { class: 'btn btn-sm', onclick: cerrarCiclo }, 'Cerrar ciclo antes de tiempo') : null,
      h('button', { class: 'btn btn-sm btn-danger', onclick: async () => { if (await confirmar('Borrar todo', 'Se borrarán sesiones, medidas y máquinas de este teléfono. Exporta una copia antes.', 'Borrar todo', true)) { resetAll(); render(); } } }, 'Borrar todo'))));

  if (st.ciclosCerrados.length) {
    vista.append(h('h3', { class: 'section-title' }, 'Ciclos anteriores'));
    vista.append(h('ul', { class: 'list card' }, st.ciclosCerrados.map((x) => h('li', {}, h('strong', {}, `Ciclo ${x.ciclo} · ${x.plantilla}`), h('div', { class: 'small muted' }, `${fmtFecha(x.inicio)} → ${fmtFecha(x.fin)} · ${x.sesiones} sesiones`)))));
  }
  vista.append(evidenciaCard());
};

async function cerrarCiclo() {
  const c = ctx();
  const { st } = c;
  if (!c.vencido) {
    const ok = await confirmar('Cerrar ciclo', `Vas por la semana ${c.semanaReal}. Lo ideal es completar las 14 semanas (incluida la descarga). ¿Cerrar igual y pasar al ciclo ${st.perfil.ciclo + 1}?`, 'Cerrar ciclo');
    if (!ok) return;
  }
  const nuevo = st.perfil.ciclo + 1;
  const plantillaNueva = plantillaDeCiclo(nuevo);
  const hoy = new Date();
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() + ((8 - hoy.getDay()) % 7 || 7)); // próximo lunes
  const inicioNuevo = toISO(c.vencido ? lunes : hoy);
  update((s) => {
    s.ciclosCerrados.push({ ciclo: s.perfil.ciclo, plantilla: c.plantilla.nombre, inicio: s.perfil.inicioCiclo, fin: toISO(hoy), sesiones: s.sesiones.filter((x) => x.ciclo === s.perfil.ciclo).length });
    s.perfil.ciclo = nuevo;
    s.perfil.inicioCiclo = inicioNuevo;
    s.enCurso = null;
  });
  // resumen de cambios
  const antes = new Set(c.plantilla.dias.flatMap((d) => d.ejercicios.map((e) => e.ej)));
  const despues = new Set(plantillaNueva.dias.flatMap((d) => d.ejercicios.map((e) => e.ej)));
  const nuevos = [...despues].filter((x) => !antes.has(x)).map((x) => byId[x].nombre);
  const conMaq = plantillaNueva.dias.flatMap((d) => d.ejercicios).map((s) => byId[s.ej]).filter((e) => maquinasPara(e).length).map((e) => `${e.nombre} → ${maquinasPara(e)[0].nombre}`);
  const body = h('div', {},
    h('p', {}, `Tu ciclo ${nuevo} ("${plantillaNueva.nombre}") empieza ${fmtFecha(inicioNuevo)}. Los ejercicios principales rotan de orden y de variante, y el volumen de glúteo y pierna sube ligeramente.`),
    nuevos.length ? h('p', {}, h('strong', {}, 'Ejercicios nuevos: '), nuevos.join(', ')) : null,
    conMaq.length ? h('div', {}, h('strong', {}, 'Variantes con máquinas de tu gym:'), h('ul', { class: 'steps' }, conMaq.slice(0, 8).map((t) => h('li', {}, t)))) : h('p', { class: 'small muted' }, 'Registra las máquinas de tu gym para que las próximas rutinas las usen como variantes.'),
    h('a', { class: 'btn btn-primary btn-block mt', href: '#rutina', onclick: closeModal }, 'Ver la nueva rutina'));
  openModal(`🎉 Ciclo ${nuevo} generado`, body);
  render();
}

// ============================================================================
// Vista: GUÍA (tutorial dentro de la app)
// ============================================================================
ROUTES.guia = () => {
  const st = getState();
  if (!st.ajustes.guiaVista) update((s) => { s.ajustes.guiaVista = true; });
  setTitulo('Guía rápida', 'Cómo usar la app en 5 minutos');
  const sec = (emoji, titulo, ...items) => h('details', { class: 'card card-tight' },
    h('summary', {}, h('strong', {}, `${emoji} ${titulo}`)),
    h('ol', { class: 'steps mt' }, items.map((t) => h('li', {}, t))));
  vista.append(h('p', { class: 'muted' }, `Hola, ${st.perfil.nombre}. Esta app es tu rutina, tu cuaderno de pesos y tu entrenador de bolsillo. La primera vez que entres a cada pantalla te la explico con ventanas flotantes; aquí tienes todo junto por si quieres repasar. Toca un tema para abrirlo.`));
  vista.append(h('div', { class: 'row', style: 'margin-bottom:12px' },
    h('button', { class: 'btn btn-sm btn-primary', onclick: () => { update((s) => { s.ajustes.tours = {}; }); navigate('#hoy'); } }, '✨ Repetir las explicaciones desde Hoy')));
  vista.append(sec('🏠', 'Qué toca hoy',
    'Abre la pestaña Hoy. La app sabe qué día es y te muestra la sesión que toca: lunes Pierna A, martes Superior A, miércoles Abdomen + glúteo + cardio, jueves Pierna B y viernes Superior B.',
    '¿Entrenas otro día? Toca cualquier día en "Esta semana" y empieza esa sesión igual.',
    'Arriba verás siempre en qué semana y bloque del ciclo vas.'));
  vista.append(sec('🎬', 'Ver cómo se hace un ejercicio',
    'En Rutina, toca un día y luego la figurita o el nombre de un ejercicio.',
    'La figura repite el movimiento completo: fíjate en la trayectoria, el rango y qué se mueve y qué no.',
    'Debajo tienes la técnica paso a paso, los errores comunes y las variantes por si la máquina está ocupada.'));
  vista.append(sec('🔁', 'Cambiar un ejercicio por una variante',
    'En cada ejercicio hay un selector. Elige la variante que harás hoy (por ejemplo, Prensa en vez de Sentadilla).',
    'Las máquinas que registres en tu gym aparecen ahí con estrellas: "· en tu gym ★★★★★".',
    'La app recuerda tu elección para la próxima vez.'));
  vista.append(sec('✍️', 'Registrar la sesión',
    'Toca Empezar sesión. Cada ejercicio muestra cuántas series, repeticiones y descanso te tocan, y qué hiciste la última vez.',
    'Haz la serie y anota kg y reps. En RIR escribe cuántas repeticiones más podrías haber hecho (3 = cómoda, 1 = casi al fallo).',
    'Marca ✓ al terminar cada serie: arranca el descanso solo. Cuando suene y vibre, siguiente serie.',
    'Al final toca "Terminar y guardar sesión". Si marcaste un récord, la app te lo celebra.'));
  vista.append(sec('📈', 'Elegir el peso y progresar',
    'Primera vez: busca un peso con el que llegues al rango de repeticiones terminando con el RIR que indica el bloque.',
    'Cada sesión intenta una repetición más por serie con el mismo peso.',
    'Cuando todas las series llegan al tope del rango, la app te dice "¡Sube el peso!" y te sugiere cuánto. Si te quedas corta, te sugiere bajar un poco. Hazle caso: así se construye el músculo.'));
  vista.append(sec('📷', 'Registrar las máquinas de tu gym',
    'En Máquinas, toca Tomar foto. La IA te dice qué máquina es, qué músculos trabaja, cómo ajustarla y qué ejercicio de tu rutina puede reemplazar.',
    'Guárdala en tu gym. Desde ese momento aparece como variante en tus ejercicios y en las rutinas futuras.',
    'Sin internet o sin código, usa "+ Manual" y anótala tú misma.'));
  vista.append(sec('📊', 'Ver tu progreso',
    'En Progreso eliges un ejercicio y ves cómo sube tu fuerza estimada sesión a sesión.',
    'Cada dos semanas anota peso, cintura, cadera y muslo, en ayunas y a la misma hora.',
    'Abajo está el historial de sesiones: toca Ver para revisar cualquiera.'));
  vista.append(sec('🗓️', 'El ciclo de 14 semanas',
    'Semanas 1–4: aprender técnica (RIR 3). Semanas 5–9: acumular volumen (RIR 2). Semanas 10–13: intensificar (RIR 1, una serie extra). Semana 14: descarga (mitad de series, menos peso).',
    'La descarga no te hace perder músculo: te recupera para el siguiente ciclo.',
    'Al terminar la semana 14, en Ciclo toca "Cerrar ciclo y generar nueva rutina". Los ejercicios rotan y el volumen sube un poco.'));
  vista.append(sec('💾', 'No pierdas tus datos',
    'Todo se guarda en tu teléfono. Si cambias de celular, en Ciclo toca Exportar copia y guarda el archivo; luego Importar en el nuevo.',
    'Instala la app: en Chrome o Safari abre el menú y elige "Añadir a pantalla de inicio". Funciona sin internet, salvo el análisis de fotos.'));
  vista.append(h('div', { class: 'row mt' },
    h('a', { class: 'btn btn-primary grow', href: '#hoy' }, 'Ir a Hoy'),
    h('a', { class: 'btn', href: '#rutina' }, 'Ver la rutina')));
};

// ============================================================================
// Recorridos guiados: ventanas flotantes que explican cada pantalla
// ============================================================================
const TOURS = {
  hoy: [
    { sel: '[data-tour="hoy-dia"]', titulo: 'Lo que toca hoy', texto: 'La app sabe qué día es. Aquí ves la sesión de hoy y el botón para empezarla.' },
    { sel: '[data-tour="hoy-bloque"]', titulo: 'Tu bloque', texto: 'Cambia cada pocas semanas. Te dice con cuántas repeticiones en reserva (RIR) terminar cada serie.' },
    { sel: '[data-tour="hoy-semana"]', titulo: 'Tu semana', texto: 'Cuántas sesiones llevas y cuáles faltan. Toca un día para entrenarlo aunque no sea hoy.' },
    { sel: '.tabs', titulo: 'Las pestañas', texto: 'Rutina: tus ejercicios. Progreso: tus números. Máquinas: tu gym. Ciclo: las 14 semanas.' },
    { sel: '#ayuda', titulo: '¿Dudas?', texto: 'Este botón vuelve a explicar cualquier pantalla cuando quieras.' },
  ],
  rutina: [
    { sel: '.day-card', titulo: 'Tus 5 días', texto: 'Lunes y jueves pierna, martes y viernes tren superior, miércoles abdomen, glúteo y cardio. Toca uno para ver sus ejercicios.' },
    { sel: '[data-tour="rutina-volumen"]', titulo: 'Series por músculo', texto: 'Cuántas series a la semana recibe cada músculo. Diez o más es lo que recomienda la ciencia.' },
    { sel: '[data-tour="rutina-evidencia"]', titulo: 'En qué se basa', texto: 'Los estudios detrás de la rutina, por si te da curiosidad.' },
  ],
  dia: [
    { sel: '[data-tour="dia-empezar"]', titulo: 'Cuando estés en el gym', texto: 'Toca aquí para registrar la sesión con el peso de cada serie.' },
    { sel: '[data-tour="dia-anim"]', titulo: 'La figurita', texto: 'Se mueve como el ejercicio. Tócala para verla en grande con la técnica paso a paso.' },
    { sel: '[data-tour="dia-presc"]', titulo: 'Qué hacer', texto: '"3 × 8–12" son 3 series de 8 a 12 repeticiones. "RIR 3": termina pudiendo hacer 3 más. Y el descanso entre series.' },
    { sel: '[data-tour="dia-variante"]', titulo: 'Variantes', texto: '¿Máquina ocupada? Elige otra versión del ejercicio. Las máquinas de tu gym aparecen aquí con estrellas.' },
  ],
  ejercicio: [
    { sel: '.ex-big', titulo: 'Mírala completa', texto: 'Observa la trayectoria y hasta dónde llega el movimiento. Se repite sola.' },
    { sel: '[data-tour="ej-tecnica"]', titulo: 'Paso a paso', texto: 'Léelo antes de la primera serie. Son los puntos que más importan.' },
    { sel: '[data-tour="ej-errores"]', titulo: 'Errores comunes', texto: 'Si algo duele o se siente raro, casi siempre es uno de estos.' },
    { sel: '[data-tour="ej-variantes"]', titulo: 'Variantes', texto: 'Otras formas de hacer el mismo movimiento, con máquinas o sin ellas.' },
  ],
  sesion: [
    { sel: '[data-tour="ses-objetivo"]', titulo: 'Tu objetivo de hoy', texto: 'Series, repeticiones y RIR que tocan, y lo que hiciste la última vez.' },
    { sel: '.sug', titulo: 'La app te aconseja', texto: 'Compara con tu última sesión y te dice si subir, mantener o bajar el peso.' },
    { sel: '.set-grid', titulo: 'Anota cada serie', texto: 'Kg, repeticiones y RIR (cuántas más podías hacer). Marca ✓ al terminar: el descanso arranca solo.' },
    { sel: '[data-tour="ses-mas"]', titulo: 'Ajustes rápidos', texto: 'Agrega o quita series, o arranca el cronómetro cuando quieras.' },
    { sel: '[data-tour="ses-terminar"]', titulo: 'Al terminar', texto: 'Guarda la sesión para que cuente en tu progreso. Si rompes un récord, te lo decimos.' },
  ],
  progreso: [
    { sel: '[data-tour="prog-chart"]', titulo: 'Tu fuerza', texto: 'Cada punto es una sesión. Si la línea sube, progresas: más peso o más repeticiones.' },
    { sel: '[data-tour="prog-medidas"]', titulo: 'Medidas', texto: 'Cada 2 semanas, en ayunas. Glúteo y muslo subiendo con la cintura estable: vas bien.' },
    { sel: '[data-tour="prog-sesiones"]', titulo: 'Historial', texto: 'Todas tus sesiones guardadas. Toca Ver para revisar una.' },
  ],
  maquinas: [
    { sel: '[data-tour="maq-analizar"]', titulo: 'Foto a la máquina', texto: 'La IA te dice qué es, qué músculos trabaja, cómo ajustarla y qué ejercicio reemplaza.' },
    { sel: '[data-tour="maq-lista"]', titulo: 'Tu gym', texto: 'Las máquinas que guardes aparecen aquí y como variantes en tus ejercicios.' },
    { sel: '[data-tour="maq-manual"]', titulo: 'Sin internet', texto: 'También puedes anotar una máquina a mano.' },
  ],
  ciclo: [
    { sel: '[data-tour="ciclo-semana"]', titulo: 'Dónde vas', texto: '14 cuadritos, 14 semanas. El último es la descarga, más suave.' },
    { sel: '[data-tour="ciclo-bloques"]', titulo: 'Los bloques', texto: 'Cada bloque cambia series y RIR. La app lo aplica sola.' },
    { sel: '[data-tour="ciclo-ajustes"]', titulo: 'Tus datos', texto: 'Exporta una copia si cambias de celular. Aquí cierras el ciclo cuando termine.' },
  ],
};
let tourTimer = 0;
function tourFor(route, force = false) {
  const steps = TOURS[route];
  if (!steps) return false;
  const st = getState();
  if (!force && st.ajustes.tours?.[route]) return false;
  if (!modal.hidden) return false;
  return startTour(steps, { onEnd: () => update((s) => { s.ajustes.tours = s.ajustes.tours || {}; s.ajustes.tours[route] = true; }) });
}
function programarTour(route) {
  clearTimeout(tourTimer);
  if (!getState().perfil.inicioCiclo) return;
  tourTimer = setTimeout(() => { if (currentRoute === route) tourFor(route); }, 650);
}
function menuAyuda() {
  const route = currentRoute;
  const body = h('div', {},
    h('p', { class: 'muted' }, 'Te explico la app con ventanas flotantes, pantalla por pantalla.'),
    TOURS[route] ? h('button', { class: 'btn btn-primary btn-block', onclick: () => { closeModal(); setTimeout(() => tourFor(route, true), 150); } }, '✨ Explicar esta pantalla') : null,
    h('a', { class: 'btn btn-block mt', href: '#guia', onclick: closeModal }, '📖 Guía completa'),
    h('button', { class: 'btn btn-ghost btn-block mt', onclick: () => { update((s) => { s.ajustes.tours = {}; }); closeModal(); toast('Las explicaciones volverán a aparecer en cada pantalla'); } }, '↺ Volver a mostrar todas las explicaciones'));
  openModal('Ayuda', body);
}
$('#ayuda').addEventListener('click', menuAyuda);

// ============================================================================
// Arranque
// ============================================================================
// El service worker solo en producción (en localhost estorba al desarrollar y en
// la vista previa de claude.ai no aplica).
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname) && !/claude/.test(location.hostname)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* sin SW */ }));
}
if (!location.hash) location.hash = '#hoy';
render();
