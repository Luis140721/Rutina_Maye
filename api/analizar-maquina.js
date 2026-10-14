// Función serverless (Vercel, Node.js): analiza la foto de una máquina del gym
// con Claude y devuelve qué músculos trabaja, qué patrón de movimiento es y qué
// ejercicios de la rutina puede reemplazar.

import Anthropic from '@anthropic-ai/sdk';
import { EJERCICIOS, PATRONES, MUSCULOS } from '../public/js/data/ejercicios.js';

const MODEL = 'claude-opus-5-5';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const LISTA_EJERCICIOS = EJERCICIOS
  .filter((e) => e.tipo !== 'cardio')
  .map((e) => `- ${e.id}: ${e.nombre} (patrón: ${e.patron}; músculos: ${e.musculos.join(', ')}; equipo: ${e.equipo})`)
  .join('\n');

const SYSTEM = `Eres un entrenador personal certificado experto en hipertrofia y en máquinas de gimnasio.
Analizas la foto de una máquina (o aparato) de un gimnasio para una usuaria llamada Maye que sigue una rutina
de 5 días: 2 de pierna completa, 2 de tren superior y 1 de abdomen + glúteo + cardio. Lleva pocos meses entrenando.

Tu tarea: identificar el aparato y decir con precisión para qué sirve dentro de SU rutina.

Reglas:
- Responde SIEMPRE en español neutro, claro y breve (frases cortas, tono amable).
- "musculos" solo puede contener valores de esta lista: ${MUSCULOS.join(', ')}.
- "patrones" solo puede contener claves de esta lista: ${Object.keys(PATRONES).join(', ')}.
- "reemplaza" solo puede contener ids de esta lista de ejercicios de la rutina (los que esta máquina podría sustituir
  o ser variante directa). Si no reemplaza ninguno, deja el array vacío:
${LISTA_EJERCICIOS}
- "puntuacion" (1–5): utilidad para la rutina de Maye. 5 = reemplaza o complementa de forma excelente un ejercicio
  principal; 3 = útil como accesorio; 1 = casi inútil o no es equipo de fuerza.
- Si la foto no muestra claramente una máquina de gimnasio, pon "es_maquina": false, puntuación 1 y explica qué ves.
- En "ajustes" describe cómo regular la máquina para una mujer de estatura media (asiento, almohadillas, agarre).
- En "precauciones" menciona errores típicos o riesgos (máximo 3 frases).
- "confianza" (0–1): qué tan segura es la identificación.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['es_maquina', 'nombre', 'resumen', 'musculos', 'patrones', 'puntuacion', 'reemplaza', 'ajustes', 'precauciones', 'confianza'],
  properties: {
    es_maquina: { type: 'boolean' },
    nombre: { type: 'string', description: 'Nombre común de la máquina en español' },
    resumen: { type: 'string', description: 'Qué es y para qué sirve, 1–2 frases' },
    musculos: { type: 'array', items: { type: 'string', enum: MUSCULOS } },
    patrones: { type: 'array', items: { type: 'string', enum: Object.keys(PATRONES) } },
    puntuacion: { type: 'integer', minimum: 1, maximum: 5 },
    reemplaza: { type: 'array', items: { type: 'string', enum: EJERCICIOS.map((e) => e.id) } },
    ajustes: { type: 'string' },
    precauciones: { type: 'string' },
    confianza: { type: 'number', minimum: 0, maximum: 1 },
  },
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

  const codigo = process.env.CODIGO_ACCESO;
  if (codigo && (req.headers['x-codigo'] || '') !== codigo) {
    return json(res, 401, { error: 'Código de acceso incorrecto. Pídeselo a quien administra la app.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(res, 500, { error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' });
  }

  let body;
  try { body = await leerJSON(req); } catch { return json(res, 400, { error: 'Cuerpo inválido' }); }
  const { imagen, mediaType = 'image/jpeg', nota = '' } = body || {};
  if (typeof imagen !== 'string' || imagen.length < 100) return json(res, 400, { error: 'Falta la imagen' });
  if (!MEDIA_TYPES.has(mediaType)) return json(res, 400, { error: 'Formato de imagen no soportado' });
  if (imagen.length * 0.75 > MAX_IMAGE_BYTES) return json(res, 413, { error: 'La imagen es demasiado grande' });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imagen } },
          { type: 'text', text: `Analiza esta máquina para la rutina de Maye.${nota ? ` Nota de Maye: ${String(nota).slice(0, 300)}` : ''}` },
        ],
      }],
    });

    if (response.stop_reason === 'refusal') {
      return json(res, 422, { error: 'El modelo no pudo analizar esta imagen. Prueba con otra foto.' });
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    let data;
    try { data = JSON.parse(text); } catch { return json(res, 502, { error: 'Respuesta inesperada del modelo. Intenta de nuevo.' }); }
    return json(res, 200, { ok: true, resultado: data, modelo: response.model });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return json(res, 500, { error: 'La API key de Anthropic no es válida.' });
    if (err instanceof Anthropic.RateLimitError) return json(res, 429, { error: 'Demasiadas solicitudes seguidas. Espera un minuto.' });
    if (err instanceof Anthropic.BadRequestError) return json(res, 400, { error: `La API rechazó la solicitud: ${err.message}` });
    if (err instanceof Anthropic.APIError) return json(res, 502, { error: `Error de la API (${err.status}): ${err.message}` });
    console.error(err);
    return json(res, 500, { error: 'Error inesperado analizando la imagen.' });
  }
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

async function leerJSON(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
