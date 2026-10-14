// Persistencia local: estado en localStorage (JSON pequeño) y fotos en IndexedDB.

const KEY = 'rutina-maye-v1';
const DB_NAME = 'rutina-maye';
const DB_STORE = 'fotos';

const DEFAULT = () => ({
  version: 1,
  perfil: { nombre: 'Maye', inicioCiclo: null, ciclo: 1, creado: new Date().toISOString() },
  variantes: {},      // { ejId: nombreVariante | null }
  sesiones: [],       // sesiones completadas
  enCurso: null,      // sesión abierta (no terminada)
  medidas: [],        // { fecha, peso, cintura, cadera, muslo, nota }
  maquinas: [],       // inventario de máquinas analizadas
  ciclosCerrados: [], // { ciclo, inicio, fin, sesiones, plantilla }
  ajustes: { codigo: '', notificarDescanso: true },
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const parsed = JSON.parse(raw);
    return { ...DEFAULT(), ...parsed, perfil: { ...DEFAULT().perfil, ...parsed.perfil }, ajustes: { ...DEFAULT().ajustes, ...parsed.ajustes } };
  } catch { return DEFAULT(); }
}

const listeners = new Set();
export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar', e); }
  listeners.forEach((fn) => fn(state));
}
export function update(mutator) { mutator(state); save(); }
export function resetAll() { state = DEFAULT(); save(); }

export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

/** Última sesión completada que incluyó un ejercicio (más reciente primero). */
export function ultimaSerieDe(ejId, antesDe = null) {
  const ses = [...state.sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const s of ses) {
    if (antesDe && s.id === antesDe) continue;
    const e = s.ejercicios.find((x) => x.ej === ejId && x.series.some((r) => r.reps > 0));
    if (e) return { sesion: s, registro: e };
  }
  return null;
}

export function historialDe(ejId) {
  return [...state.sesiones]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((s) => ({ fecha: s.fecha, registro: s.ejercicios.find((x) => x.ej === ejId) }))
    .filter((x) => x.registro && x.registro.series.some((r) => r.reps > 0));
}

// ---- Exportar / importar copia de seguridad (sin fotos) ----
export function exportarJSON() {
  return JSON.stringify({ ...state, exportado: new Date().toISOString() }, null, 2);
}
export function importarJSON(texto) {
  const data = JSON.parse(texto);
  if (!data || typeof data !== 'object' || !Array.isArray(data.sesiones)) throw new Error('El archivo no parece una copia de la app.');
  state = { ...DEFAULT(), ...data };
  save();
}

// ---- Fotos (IndexedDB) ----
function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Sin IndexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(DB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(DB_STORE, mode);
    const store = t.objectStore(DB_STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
export const fotos = {
  async guardar(id, blob) { await tx('readwrite', (s) => s.put(blob, id)); },
  async obtener(id) { try { return await tx('readonly', (s) => s.get(id)); } catch { return null; } },
  async borrar(id) { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* ignorar */ } },
};

/** Comprime una imagen a JPEG con lado máximo `max`. Devuelve { blob, base64, mediaType }. */
export async function comprimirImagen(file, max = 1280, calidad = 0.82) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  const img = bitmap || await loadImg(file);
  const w = img.width, h = img.height;
  const k = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', calidad));
  const base64 = await blobABase64(blob);
  return { blob, base64, mediaType: 'image/jpeg' };
}
function loadImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}
export function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
