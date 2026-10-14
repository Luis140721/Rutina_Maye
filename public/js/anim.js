// Motor de animación: figura articulada (stick figure) dibujada en SVG.
// Cada ejercicio define 2–3 "poses" (ángulos de las articulaciones) y el motor
// interpola entre ellas en bucle. Vista lateral (la figura mira a la derecha)
// o vista frontal (de frente).
//
// Convención de ángulos (grados):
//  - torso: desde la vertical hacia arriba; + = inclinación hacia adelante (+x).
//  - uarm/farm (brazo/antebrazo), thigh/shin (muslo/pierna): desde la vertical
//    hacia abajo; + = hacia adelante (+x), 180 = apuntando hacia arriba.
//  - foot: desde la horizontal hacia adelante; + = punta hacia arriba.
//  - Sufijo 2 = extremidad lejana (se dibuja más clara, detrás).

const L = { torso: 50, neck: 7, head: 10, uarm: 28, farm: 26, thigh: 40, shin: 38, foot: 16 };
const D2R = Math.PI / 180;
const NS = 'http://www.w3.org/2000/svg';

const SIDE_DEFAULTS = {
  anchor: 'feet', ankleX: 118, toeX: 128, ground: 200, hip: [120, 120],
  torso: 0, head: 0, uarm: 0, farm: null, uarm2: null, farm2: null,
  thigh: 0, shin: null, foot: 0, thigh2: null, shin2: null, foot2: null,
};
const FRONT_DEFAULTS = {
  anchor: 'feet', ground: 200, hip: [120, 120],
  armAbd: 6, farmAbd: null, armAbd2: null, farmAbd2: null, armScale: 1,
  legAbd: 6, legAbd2: null, knee: 0, legScale: 1,
};

function normalizeSide(p) {
  const o = { ...SIDE_DEFAULTS, ...p };
  if (o.farm == null) o.farm = o.uarm;
  if (o.uarm2 == null) o.uarm2 = o.uarm;
  if (o.farm2 == null) o.farm2 = o.farm;
  if (o.shin == null) o.shin = o.thigh;
  if (o.thigh2 == null) o.thigh2 = o.thigh;
  if (o.shin2 == null) o.shin2 = o.shin;
  if (o.foot2 == null) o.foot2 = o.foot;
  return o;
}
function normalizeFront(p) {
  const o = { ...FRONT_DEFAULTS, ...p };
  if (o.farmAbd == null) o.farmAbd = o.armAbd;
  if (o.armAbd2 == null) o.armAbd2 = o.armAbd;
  if (o.farmAbd2 == null) o.farmAbd2 = o.farmAbd;
  if (o.legAbd2 == null) o.legAbd2 = o.legAbd;
  return o;
}

function lerp(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) {
    const va = a[k], vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') o[k] = va + (vb - va) * t;
    else if (Array.isArray(va) && Array.isArray(vb)) o[k] = va.map((v, i) => v + (vb[i] - v) * t);
    else o[k] = t < 0.5 ? va : vb;
  }
  return o;
}
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const S = (deg) => Math.sin(deg * D2R);
const C = (deg) => Math.cos(deg * D2R);
const add = (p, dx, dy) => [p[0] + dx, p[1] + dy];

function sideJoints(p) {
  const legDx = S(p.thigh) * L.thigh + S(p.shin) * L.shin;
  const legDy = C(p.thigh) * L.thigh + C(p.shin) * L.shin;
  let hx, hy;
  if (p.anchor === 'hip') { [hx, hy] = p.hip; }
  else if (p.anchor === 'toe') {
    const ax = p.toeX - C(p.foot) * L.foot, ay = p.ground + S(p.foot) * L.foot;
    hx = ax - legDx; hy = ay - legDy;
  } else { hx = p.ankleX - legDx; hy = p.ground - legDy; }
  const hip = [hx, hy];
  const knee = add(hip, S(p.thigh) * L.thigh, C(p.thigh) * L.thigh);
  const ankle = add(knee, S(p.shin) * L.shin, C(p.shin) * L.shin);
  const toe = add(ankle, C(p.foot) * L.foot, -S(p.foot) * L.foot);
  const heel = add(ankle, -C(p.foot) * 6, S(p.foot) * 6);
  const knee2 = add(hip, S(p.thigh2) * L.thigh, C(p.thigh2) * L.thigh);
  const ankle2 = add(knee2, S(p.shin2) * L.shin, C(p.shin2) * L.shin);
  const toe2 = add(ankle2, C(p.foot2) * L.foot, -S(p.foot2) * L.foot);
  const heel2 = add(ankle2, -C(p.foot2) * 6, S(p.foot2) * 6);
  const shoulder = add(hip, S(p.torso) * L.torso, -C(p.torso) * L.torso);
  const ha = p.torso + p.head;
  const neck = add(shoulder, S(ha) * L.neck, -C(ha) * L.neck);
  const head = add(neck, S(ha) * L.head, -C(ha) * L.head);
  const elbow = add(shoulder, S(p.uarm) * L.uarm, C(p.uarm) * L.uarm);
  const wrist = add(elbow, S(p.farm) * L.farm, C(p.farm) * L.farm);
  const elbow2 = add(shoulder, S(p.uarm2) * L.uarm, C(p.uarm2) * L.uarm);
  const wrist2 = add(elbow2, S(p.farm2) * L.farm, C(p.farm2) * L.farm);
  const chest = [(hip[0] + shoulder[0] * 2) / 3, (hip[1] + shoulder[1] * 2) / 3];
  const hands = [(wrist[0] + wrist2[0]) / 2, (wrist[1] + wrist2[1]) / 2];
  return { hip, knee, ankle, toe, heel, knee2, ankle2, toe2, heel2, shoulder, neck, head, elbow, wrist, elbow2, wrist2, chest, hands };
}

function frontJoints(p) {
  const hw = 8, sw = 17;
  const legLen = (L.thigh + L.shin) * C(p.knee) * p.legScale;
  const hx = p.hip[0];
  const hy = p.anchor === 'hip' ? p.hip[1]
    : p.ground - Math.max(C(p.legAbd) * legLen, C(p.legAbd2) * legLen);
  const hip = [hx, hy];
  const hipR = [hx + hw, hy], hipL = [hx - hw, hy];
  const ankle = add(hipR, S(p.legAbd) * legLen, C(p.legAbd) * legLen);
  const ankle2 = add(hipL, -S(p.legAbd2) * legLen, C(p.legAbd2) * legLen);
  // rodilla: punto medio, desplazado hacia afuera si está flexionada
  const kb = S(p.knee) * 10;
  const knee = [(hipR[0] + ankle[0]) / 2 + kb, (hipR[1] + ankle[1]) / 2];
  const knee2 = [(hipL[0] + ankle2[0]) / 2 - kb, (hipL[1] + ankle2[1]) / 2];
  const shoulderC = [hx, hy - L.torso];
  const shoulder = [hx + sw, shoulderC[1]], shoulder2 = [hx - sw, shoulderC[1]];
  const au = L.uarm * p.armScale, af = L.farm * p.armScale;
  const elbow = add(shoulder, S(p.armAbd) * au, C(p.armAbd) * au);
  const wrist = add(elbow, S(p.farmAbd) * af, C(p.farmAbd) * af);
  const elbow2 = add(shoulder2, -S(p.armAbd2) * au, C(p.armAbd2) * au);
  const wrist2 = add(elbow2, -S(p.farmAbd2) * af, C(p.farmAbd2) * af);
  const neck = [hx, shoulderC[1] - L.neck];
  const head = [hx, neck[1] - L.head];
  const chest = [hx, hy - L.torso * 0.66];
  const hands = [(wrist[0] + wrist2[0]) / 2, (wrist[1] + wrist2[1]) / 2];
  return { hip, hipR, hipL, knee, knee2, ankle, ankle2, shoulderC, shoulder, shoulder2, elbow, wrist, elbow2, wrist2, neck, head, chest, hands };
}

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
const pts = (...ps) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

function jointOf(J, name, offset) {
  const p = J[name] || J.hip;
  return offset ? add(p, offset[0], offset[1]) : p;
}

// ---- Props dinámicos (pesos, palancas, cables) ----
function makeProp(spec) {
  const g = el('g', { class: 'an-prop' });
  const s = { ...spec };
  switch (spec.type) {
    case 'plate': s.node = el('circle', { r: spec.r || 11, class: 'an-weight' }); break;
    case 'kettle': s.node = el('circle', { r: spec.r || 8, class: 'an-weight' }); break;
    case 'dumbbell': s.node = el('rect', { x: -9, y: -3.5, width: 18, height: 7, rx: 3, class: 'an-weight' }); break;
    case 'pad': s.node = el('circle', { r: spec.r || 6, class: 'an-pad' }); break;
    case 'slab': s.node = el('line', { x1: -(spec.len || 40) / 2, y1: 0, x2: (spec.len || 40) / 2, y2: 0, class: 'an-slab' }); break;
    case 'bar': s.node = el('line', { class: 'an-bar' }); break;
    case 'lever':
      s.node = el('line', { class: 'an-lever' });
      s.pad = el('circle', { r: spec.r || 6, class: 'an-pad' });
      s.pivot = el('circle', { r: 4, cx: spec.from[0], cy: spec.from[1], class: 'an-pivot' });
      g.append(s.pivot, s.pad);
      break;
    case 'cable':
      s.node = el('line', { class: 'an-cable' });
      s.pivot = el('circle', { r: 5, cx: spec.from[0], cy: spec.from[1], class: 'an-pulley' });
      g.append(s.pivot);
      break;
    default: s.node = el('g');
  }
  g.append(s.node);
  s.g = g;
  return s;
}

function updateProp(s, J) {
  const p = jointOf(J, s.at, s.offset);
  switch (s.type) {
    case 'plate': case 'kettle': case 'pad':
      s.node.setAttribute('cx', p[0]); s.node.setAttribute('cy', p[1]); break;
    case 'dumbbell': case 'slab':
      s.node.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${s.rot || 0})`); break;
    case 'bar': {
      const q = s.to ? jointOf(J, s.to, s.offsetTo) : add(p, s.len || 16, 0);
      const p0 = s.to ? p : add(p, -(s.len || 16), 0);
      s.node.setAttribute('x1', p0[0]); s.node.setAttribute('y1', p0[1]);
      s.node.setAttribute('x2', q[0]); s.node.setAttribute('y2', q[1]); break;
    }
    case 'lever': case 'cable':
      s.node.setAttribute('x1', s.from[0]); s.node.setAttribute('y1', s.from[1]);
      s.node.setAttribute('x2', p[0]); s.node.setAttribute('y2', p[1]);
      if (s.pad) { s.pad.setAttribute('cx', p[0]); s.pad.setAttribute('cy', p[1]); }
      break;
  }
}

// ---- Construcción de la figura ----
function buildSide(svg) {
  const far = el('g', { class: 'an-far' });
  const farArm = el('polyline'), farLeg = el('polyline');
  far.append(farLeg, farArm);
  const body = el('g', { class: 'an-body' });
  const torso = el('polyline'), head = el('circle', { r: L.head, class: 'an-head' });
  const leg = el('polyline'), heel = el('line'), arm = el('polyline');
  body.append(torso, head, leg, heel, arm);
  svg.append(far, body);
  return {
    far, body,
    update(J) {
      farLeg.setAttribute('points', pts(J.hip, J.knee2, J.ankle2, J.toe2));
      farArm.setAttribute('points', pts(J.shoulder, J.elbow2, J.wrist2));
      torso.setAttribute('points', pts(J.hip, J.shoulder, J.neck));
      head.setAttribute('cx', J.head[0]); head.setAttribute('cy', J.head[1]);
      leg.setAttribute('points', pts(J.hip, J.knee, J.ankle, J.toe));
      heel.setAttribute('x1', J.ankle[0]); heel.setAttribute('y1', J.ankle[1]);
      heel.setAttribute('x2', J.heel[0]); heel.setAttribute('y2', J.heel[1]);
      arm.setAttribute('points', pts(J.shoulder, J.elbow, J.wrist));
    },
  };
}

function buildFront(svg) {
  const body = el('g', { class: 'an-body' });
  const legR = el('polyline'), legL = el('polyline');
  const footR = el('line'), footL = el('line');
  const torso = el('line'), shoulders = el('line'), hips = el('line');
  const head = el('circle', { r: L.head, class: 'an-head' });
  const armR = el('polyline'), armL = el('polyline');
  body.append(legR, legL, footR, footL, hips, torso, shoulders, head, armR, armL);
  svg.append(body);
  return {
    body,
    update(J) {
      legR.setAttribute('points', pts(J.hipR, J.knee, J.ankle));
      legL.setAttribute('points', pts(J.hipL, J.knee2, J.ankle2));
      footR.setAttribute('x1', J.ankle[0] - 5); footR.setAttribute('y1', J.ankle[1] + 2);
      footR.setAttribute('x2', J.ankle[0] + 7); footR.setAttribute('y2', J.ankle[1] + 2);
      footL.setAttribute('x1', J.ankle2[0] + 5); footL.setAttribute('y1', J.ankle2[1] + 2);
      footL.setAttribute('x2', J.ankle2[0] - 7); footL.setAttribute('y2', J.ankle2[1] + 2);
      hips.setAttribute('x1', J.hipL[0]); hips.setAttribute('y1', J.hipL[1]);
      hips.setAttribute('x2', J.hipR[0]); hips.setAttribute('y2', J.hipR[1]);
      torso.setAttribute('x1', J.hip[0]); torso.setAttribute('y1', J.hip[1]);
      torso.setAttribute('x2', J.shoulderC[0]); torso.setAttribute('y2', J.shoulderC[1]);
      shoulders.setAttribute('x1', J.shoulder2[0]); shoulders.setAttribute('y1', J.shoulder2[1]);
      shoulders.setAttribute('x2', J.shoulder[0]); shoulders.setAttribute('y2', J.shoulder[1]);
      head.setAttribute('cx', J.head[0]); head.setAttribute('cy', J.head[1]);
      armR.setAttribute('points', pts(J.shoulder, J.elbow, J.wrist));
      armL.setAttribute('points', pts(J.shoulder2, J.elbow2, J.wrist2));
    },
  };
}

// ---- Reloj compartido ----
const players = new Set();
let rafId = 0;
function tick(now) {
  for (const p of players) {
    try { p.frame(now); } catch (e) { console.error('anim', e); players.delete(p); }
  }
  rafId = players.size ? requestAnimationFrame(tick) : 0;
}
function start() { if (!rafId && players.size) rafId = requestAnimationFrame(tick); }

const io = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      const p = e.target.__player;
      if (!p) continue;
      if (e.isIntersecting) p.play(); else p.pause();
    }
  }, { rootMargin: '80px' })
  : null;

/**
 * Monta una animación dentro de un <svg>.
 * spec = { view:'side'|'front', frames:[pose,...], props:[...], scene:'<svg...>', duration:ms, cycle:'pingpong'|'loop' }
 */
export function mountAnim(svg, spec) {
  svg.setAttribute('viewBox', spec.viewBox || '0 0 240 240');
  svg.classList.add('an');
  svg.innerHTML = '';
  if (spec.scene) {
    const scene = el('g', { class: 'an-scene' });
    scene.innerHTML = spec.scene;
    svg.append(scene);
  }
  const isFront = spec.view === 'front';
  const norm = isFront ? normalizeFront : normalizeSide;
  const joints = isFront ? frontJoints : sideJoints;
  const frames = spec.frames.map(norm);
  const propsBehind = el('g', { class: 'an-props-behind' });
  svg.append(propsBehind);
  const fig = isFront ? buildFront(svg) : buildSide(svg);
  const propsFront = el('g', { class: 'an-props' });
  svg.append(propsFront);
  const props = (spec.props || []).map((s) => {
    const p = makeProp(s);
    (s.behind ? propsBehind : propsFront).append(p.g);
    return p;
  });
  const duration = spec.duration || 2400;
  const cycle = spec.cycle || 'pingpong';
  const n = frames.length;
  const segs = n === 1 ? 1 : cycle === 'loop' ? n : 2 * (n - 1);
  let playing = false, t0 = 0, paused = 0;

  const player = {
    frame(now) {
      // módulo positivo: el timestamp de rAF puede ser menor que t0 en el primer cuadro
      const t = ((((now - t0) % duration) + duration) % duration) / duration;
      let pose;
      if (n === 1) pose = frames[0];
      else {
        const x = t * segs;
        let i = Math.floor(x), lt = ease(x - i);
        let a, b;
        if (cycle === 'loop') { a = frames[i % n]; b = frames[(i + 1) % n]; }
        else if (i < n - 1) { a = frames[i]; b = frames[i + 1]; }
        else { const j = segs - i; a = frames[j]; b = frames[j - 1]; }
        pose = lerp(a, b, lt);
      }
      const J = joints(pose);
      fig.update(J);
      for (const p of props) updateProp(p, J);
    },
    /** Muestra la fase t (0–1) del ciclo sin reproducir. Útil para revisar poses. */
    seek(t) { player.pause(); paused = t * duration; t0 = performance.now() - paused; player.frame(performance.now()); },
    play() { if (playing) return; playing = true; t0 = performance.now() - paused; players.add(player); start(); },
    pause() { if (!playing) return; playing = false; paused = (performance.now() - t0) % duration; players.delete(player); },
    destroy() { player.pause(); io?.unobserve(svg); svg.__player = null; },
  };
  svg.__player = player;
  player.frame(performance.now());
  if (io) io.observe(svg); else player.play();
  return player;
}

export function destroyAnims(root) {
  root.querySelectorAll('svg.an').forEach((s) => s.__player?.destroy());
}
