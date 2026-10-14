// Estructura del programa: ciclos de 14 semanas, bloques, plantillas de días
// y reglas de progresión. Basado en:
//  - Frecuencia ≥ 2 veces/semana por músculo (Schoenfeld 2016).
//  - 10+ series semanales por músculo (Schoenfeld, Ogborn & Krieger 2017).
//  - Entrenar a 1–3 repeticiones del fallo (Robinson et al. 2024).
//  - Descansos de 2–3 min en compuestos (Schoenfeld 2016).
//  - Progresión doble: subir repeticiones y luego carga (Plotkin 2022).
//  - Semana de descarga: no se pierde músculo y se recupera fatiga (Coleman 2024).
//  - Cardio concurrente no interfiere con la hipertrofia (Schumann 2022).
//  - Rango completo / posición estirada (Wolf 2023).

import { byId } from './ejercicios.js';

export const CICLO_SEMANAS = 14;

export const BLOQUES = [
  {
    id: 'adaptacion', nombre: 'Adaptación y técnica', desde: 1, hasta: 4, rir: 3,
    resumen: 'Aprende la técnica y encuentra tus pesos. Termina cada serie con 3 repeticiones "en la recámara".',
    detalle: 'Los aislamientos van con una serie menos. Sube el peso solo cuando llegues al tope de repeticiones en todas las series con buena técnica.',
    series: (ej, base) => (ej.tipo === 'compuesto' ? base : Math.max(2, base - 1)),
    cargaFactor: 1,
  },
  {
    id: 'acumulacion', nombre: 'Acumulación', desde: 5, hasta: 9, rir: 2,
    resumen: 'Volumen completo. Termina las series a 2 repeticiones del fallo.',
    detalle: 'Aquí se construye la mayor parte del músculo del ciclo. Registra todo y busca superar la semana anterior en repeticiones o peso.',
    series: (ej, base) => base,
    cargaFactor: 1,
  },
  {
    id: 'intensificacion', nombre: 'Intensificación', desde: 10, hasta: 13, rir: 1,
    resumen: 'Una serie extra en los compuestos y series a 1 repetición del fallo.',
    detalle: 'Las últimas semanas son las más duras. Duerme bien y come suficiente proteína (1,6–2 g por kg de peso).',
    series: (ej, base) => (ej.tipo === 'compuesto' ? base + 1 : base),
    cargaFactor: 1,
  },
  {
    id: 'descarga', nombre: 'Descarga', desde: 14, hasta: 14, rir: 4,
    resumen: 'Mitad de series y un 15 % menos de peso. Recupera fatiga antes del siguiente ciclo.',
    detalle: 'La descarga no te hace perder músculo (Coleman 2024). Al terminar esta semana, cierra el ciclo y la app te genera la rutina nueva.',
    series: (ej, base) => Math.max(1, Math.round(base / 2)),
    cargaFactor: 0.85,
  },
];

export function bloqueDeSemana(semana) {
  const s = Math.min(Math.max(1, semana), CICLO_SEMANAS);
  return BLOQUES.find((b) => s >= b.desde && s <= b.hasta);
}

// Plantillas de ciclo. Cada ciclo rota ejercicios para seguir progresando
// y evitar estancamiento; el volumen base sube ligeramente en ciclos posteriores.
const E = (ej, series, reps) => ({ ej, series, reps });

export const PLANTILLAS = [
  {
    nombre: 'Base',
    dias: [
      { id: 'piernaA', nombre: 'Pierna A', sub: 'Cuádriceps + glúteo', diaSemana: 1, ejercicios: [
        E('sentadilla-goblet', 3), E('prensa-inclinada', 3), E('sentadilla-bulgara', 3),
        E('extension-cuadriceps', 3), E('hip-thrust', 3), E('elevacion-talones-pie', 3),
      ] },
      { id: 'superiorA', nombre: 'Superior A', sub: 'Empuje + tracción', diaSemana: 2, ejercicios: [
        E('press-banca-mancuernas', 3), E('jalon-pecho', 3), E('press-hombro-mancuernas', 3),
        E('remo-polea-sentado', 3), E('elevaciones-laterales', 3), E('triceps-polea', 2), E('curl-biceps', 2),
      ] },
      { id: 'core', nombre: 'Abdomen + glúteo + cardio', sub: 'Core, glúteo y zona 2', diaSemana: 3, ejercicios: [
        E('crunch-polea', 3), E('elevacion-piernas', 3), E('pallof-press', 3), E('plancha', 3),
        E('patada-gluteo-polea', 3), E('abduccion-cadera', 3), E('cardio', 1),
      ] },
      { id: 'piernaB', nombre: 'Pierna B', sub: 'Glúteo + femoral', diaSemana: 4, ejercicios: [
        E('peso-muerto-rumano', 3), E('hip-thrust', 3, [10, 15]), E('sentadilla-sumo', 3),
        E('curl-femoral', 3), E('hiperextension', 3), E('abduccion-cadera', 2), E('elevacion-talones-sentado', 3),
      ] },
      { id: 'superiorB', nombre: 'Superior B', sub: 'Tracción + empuje', diaSemana: 5, ejercicios: [
        E('remo-mancuerna', 3), E('press-inclinado', 3), E('dominadas-asistidas', 3), E('press-hombro-maquina', 3),
        E('pec-deck', 2), E('face-pull', 3), E('curl-martillo', 2), E('extension-triceps-cabeza', 2),
      ] },
    ],
  },
  {
    nombre: 'Rotación 1',
    dias: [
      { id: 'piernaA', nombre: 'Pierna A', sub: 'Cuádriceps + glúteo', diaSemana: 1, ejercicios: [
        E('prensa-inclinada', 4), E('sentadilla-goblet', 3, [10, 15]), E('sentadilla-bulgara', 3),
        E('extension-cuadriceps', 3), E('hip-thrust', 4), E('elevacion-talones-pie', 3),
      ] },
      { id: 'superiorA', nombre: 'Superior A', sub: 'Empuje + tracción', diaSemana: 2, ejercicios: [
        E('press-inclinado', 3), E('dominadas-asistidas', 3), E('press-hombro-maquina', 3),
        E('remo-mancuerna', 3), E('elevaciones-laterales', 3), E('extension-triceps-cabeza', 2), E('curl-martillo', 2),
      ] },
      { id: 'core', nombre: 'Abdomen + glúteo + cardio', sub: 'Core, glúteo y zona 2', diaSemana: 3, ejercicios: [
        E('elevacion-piernas', 3), E('crunch-polea', 3), E('plancha', 3), E('pallof-press', 3),
        E('hiperextension', 3), E('patada-gluteo-polea', 3), E('cardio', 1),
      ] },
      { id: 'piernaB', nombre: 'Pierna B', sub: 'Glúteo + femoral', diaSemana: 4, ejercicios: [
        E('hip-thrust', 4), E('peso-muerto-rumano', 3), E('sentadilla-sumo', 3),
        E('curl-femoral', 3), E('abduccion-cadera', 3), E('elevacion-talones-sentado', 3),
      ] },
      { id: 'superiorB', nombre: 'Superior B', sub: 'Tracción + empuje', diaSemana: 5, ejercicios: [
        E('remo-polea-sentado', 3), E('press-banca-mancuernas', 3), E('jalon-pecho', 3), E('press-hombro-mancuernas', 3),
        E('pec-deck', 2), E('face-pull', 3), E('curl-biceps', 2), E('triceps-polea', 2),
      ] },
    ],
  },
  {
    nombre: 'Rotación 2',
    dias: [
      { id: 'piernaA', nombre: 'Pierna A', sub: 'Cuádriceps + glúteo', diaSemana: 1, ejercicios: [
        E('sentadilla-goblet', 4, [6, 10]), E('sentadilla-bulgara', 3), E('prensa-inclinada', 3, [12, 15]),
        E('hip-thrust', 4, [8, 10]), E('extension-cuadriceps', 3), E('elevacion-talones-pie', 4),
      ] },
      { id: 'superiorA', nombre: 'Superior A', sub: 'Empuje + tracción', diaSemana: 2, ejercicios: [
        E('press-banca-mancuernas', 4), E('jalon-pecho', 4), E('press-hombro-mancuernas', 3),
        E('remo-polea-sentado', 3), E('elevaciones-laterales', 4), E('triceps-polea', 2), E('curl-biceps', 2),
      ] },
      { id: 'core', nombre: 'Abdomen + glúteo + cardio', sub: 'Core, glúteo y zona 2', diaSemana: 3, ejercicios: [
        E('crunch-polea', 4), E('elevacion-piernas', 3), E('pallof-press', 3), E('plancha', 3),
        E('patada-gluteo-polea', 3), E('abduccion-cadera', 4), E('cardio', 1),
      ] },
      { id: 'piernaB', nombre: 'Pierna B', sub: 'Glúteo + femoral', diaSemana: 4, ejercicios: [
        E('peso-muerto-rumano', 4), E('hip-thrust', 3, [12, 15]), E('sentadilla-sumo', 3),
        E('curl-femoral', 4), E('hiperextension', 3), E('elevacion-talones-sentado', 3),
      ] },
      { id: 'superiorB', nombre: 'Superior B', sub: 'Tracción + empuje', diaSemana: 5, ejercicios: [
        E('dominadas-asistidas', 4), E('press-inclinado', 3), E('remo-mancuerna', 3), E('press-hombro-maquina', 3),
        E('pec-deck', 3), E('face-pull', 3), E('curl-martillo', 2), E('extension-triceps-cabeza', 2),
      ] },
    ],
  },
];

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Plantilla que corresponde a un número de ciclo (1, 2, 3, 4, ...). */
export function plantillaDeCiclo(ciclo) {
  return PLANTILLAS[(Math.max(1, ciclo) - 1) % PLANTILLAS.length];
}

/** Semana del ciclo (1–14) para una fecha dada un inicio (YYYY-MM-DD). */
export function semanaDelCiclo(inicioISO, fecha = new Date()) {
  const inicio = parseISO(inicioISO);
  const dias = Math.floor((startOfDay(fecha) - startOfDay(inicio)) / 86400000);
  return Math.floor(dias / 7) + 1; // puede pasar de 14: significa ciclo vencido
}

export function fechaFinCiclo(inicioISO) {
  const d = parseISO(inicioISO);
  d.setDate(d.getDate() + CICLO_SEMANAS * 7 - 1);
  return d;
}

export function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function toISO(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

/** Prescripción concreta (series, reps, RIR, descanso) de un ejercicio en una semana. */
export function prescripcion(slot, semana) {
  const ej = byId[slot.ej];
  const bloque = bloqueDeSemana(semana);
  const reps = slot.reps || ej.reps;
  const series = ej.tipo === 'cardio' ? 1 : bloque.series(ej, slot.series);
  return { ej, bloque, series, reps, rir: bloque.rir, descanso: ej.descanso, cargaFactor: bloque.cargaFactor, unidad: ej.unidad || 'reps' };
}

/**
 * Progresión doble. Mira la última sesión registrada del ejercicio y sugiere
 * qué hacer hoy.
 *  - Todas las series en el tope del rango con RIR <= objetivo → sube peso.
 *  - Alguna serie por debajo del mínimo → baja 5–10 %.
 *  - En otro caso → mismo peso, intenta una repetición más por serie.
 */
export function sugerencia(ej, ultima, presc) {
  if (!ultima || !ultima.series?.length || ej.tipo === 'cardio') return null;
  const hechas = ultima.series.filter((s) => s.reps > 0);
  if (!hechas.length) return null;
  const peso = Math.max(...hechas.map((s) => Number(s.peso) || 0));
  const [min, max] = presc.reps;
  const todasTope = hechas.every((s) => s.reps >= max);
  const algunaBaja = hechas.some((s) => s.reps < min);
  const rirOk = hechas.every((s) => s.rir == null || s.rir <= presc.rir + 1);
  const inc = ej.incremento;
  const esTiempo = presc.unidad !== 'reps';
  const u = esTiempo ? presc.unidad : 'kg';
  if (inc === 0 || peso === 0) {
    if (todasTope) return { tipo: 'sube', peso, texto: esTiempo ? 'Llegaste al tope: añade 10 s o una progresión más difícil.' : 'Llegaste al tope de repeticiones: pasa a la variante más difícil o añade peso.' };
    return { tipo: 'igual', peso, texto: 'Intenta una repetición (o unos segundos) más que la última vez.' };
  }
  if (todasTope && rirOk) {
    const nuevo = redondear(peso + inc);
    return { tipo: 'sube', peso: nuevo, texto: inc < 0 ? `Quita asistencia: pon ${nuevo} ${u}.` : `¡Sube el peso! Hoy ${nuevo} ${u}.` };
  }
  if (algunaBaja) {
    const nuevo = redondear(peso * 0.92);
    return { tipo: 'baja', peso: nuevo, texto: `Baja un poco: ${nuevo} ${u} para completar el rango.` };
  }
  return { tipo: 'igual', peso, texto: `Mismo peso (${peso} ${u}): busca una repetición más por serie.` };
}

export function redondear(x) { return Math.round(x * 2) / 2; }

/** Volumen semanal por músculo (series directas) de una plantilla, para mostrar en el resumen. */
export function volumenSemanal(plantilla, semana) {
  const acc = {};
  for (const dia of plantilla.dias) {
    for (const slot of dia.ejercicios) {
      const p = prescripcion(slot, semana);
      if (p.ej.tipo === 'cardio') continue;
      p.ej.musculos.forEach((m, i) => {
        if (m === 'core') return;
        acc[m] = (acc[m] || 0) + (i === 0 ? p.series : p.series * 0.5);
      });
    }
  }
  return Object.entries(acc).map(([m, s]) => [m, Math.round(s)]).sort((a, b) => b[1] - a[1]);
}
