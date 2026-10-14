# Rutina Maye

App web instalable (PWA) con la rutina de entrenamiento de Maye: 5 días por semana
(2 de pierna completa, 2 de tren superior, 1 de abdomen + glúteo + cardio), animación
de cada ejercicio, variantes en máquina, registro de progreso, ciclos de 14 semanas con
descarga y generación de la rutina siguiente, e inventario de máquinas del gym analizado
con IA (Claude) a partir de fotos.

Todo el progreso y las fotos se guardan **en el teléfono** (localStorage + IndexedDB).
Solo el análisis de fotos necesita internet y una API key.

## Estructura

```
public/                 sitio estático (la app)
  index.html            shell
  styles.css            estilos (móvil primero, modo oscuro)
  js/app.js             interfaz: Hoy, Rutina, Progreso, Máquinas, Ciclo, sesión y temporizador
  js/anim.js            motor de animación (figura articulada SVG)
  js/chart.js           gráfico de progreso
  js/store.js           persistencia local
  js/data/ejercicios.js base de datos de ejercicios (técnica, variantes, poses)
  js/data/rutina.js     ciclos, bloques, plantillas y progresión
  sw.js / manifest      PWA (funciona sin conexión)
api/analizar-maquina.js función serverless de Vercel que llama a Claude con la foto
dev-server.mjs          servidor local para probar (estático + api/)
scripts/make-icons.mjs  genera los íconos PNG
```

## Probar en local

```bash
npm install
cp .env.example .env.local   # pon tu ANTHROPIC_API_KEY y un CODIGO_ACCESO
npm run dev                   # http://localhost:3000
```

## Publicar en Vercel

1. `vercel login` (una sola vez).
2. Variables de entorno del proyecto (panel de Vercel → Settings → Environment Variables,
   o `vercel env add`):
   - `ANTHROPIC_API_KEY`: clave de https://console.anthropic.com/
   - `CODIGO_ACCESO`: código corto que Maye escribe una vez en la app (evita que cualquiera
     con la URL use tu cuota). Si lo dejas vacío no se pide.
3. `vercel --prod` (o `npm run deploy`). Vercel detecta `public/` como sitio estático y
   `api/` como funciones Node.

En el teléfono: abre la URL en Chrome (Android) o Safari (iPhone) → "Añadir a pantalla de
inicio". Queda como app y funciona sin conexión salvo el análisis con IA.

### Netlify o GitHub Pages

La app estática funciona en cualquier hosting (publica la carpeta `public/`), pero el
análisis de fotos con IA solo funciona en Vercel porque depende de `api/analizar-maquina.js`.
En otros hostings, el botón "Analizar con IA" dará error y Maye puede registrar las
máquinas de forma manual ("+ Manual").

## Cómo funciona el programa

- **Ciclo de 14 semanas**: Adaptación (sem 1–4, RIR 3) → Acumulación (5–9, RIR 2) →
  Intensificación (10–13, RIR 1, una serie extra en compuestos) → Descarga (14, mitad de
  series, 15 % menos peso). Al cerrar el ciclo la app pasa a la siguiente plantilla
  (rotan ejercicios y sube el volumen) y las máquinas registradas aparecen como variantes.
- **Progresión doble**: la app mira la última sesión del ejercicio; si todas las series
  llegaron al tope del rango con el RIR objetivo, sugiere subir peso (`incremento` de cada
  ejercicio). Si alguna serie quedó bajo el mínimo, sugiere bajar un poco.
- **Evidencia**: frecuencia ≥ 2×/semana (Schoenfeld 2016), 10+ series semanales por músculo
  (Schoenfeld 2017), RIR 1–3 (Robinson 2024), descansos 2–3 min (Schoenfeld 2016),
  progresión por repeticiones o carga (Plotkin 2022), hip thrust y sentadilla para glúteo
  (Plotkin 2023), descarga sin pérdida de músculo (Coleman 2024), cardio sin interferencia
  (Schumann 2022), rango completo / posición estirada (Wolf 2023).

## Tutorial para Maye

El tutorial está integrado en la app como recorridos guiados (`public/js/tour.js`): la primera vez
que Maye entra a cada pantalla, ventanas flotantes resaltan cada elemento y explican para qué
sirve, en 3 a 5 pasos cortos. Se repiten desde el botón **?** de la cabecera ("Explicar esta
pantalla") y se pueden reiniciar todas. Los pasos de cada pantalla están en `TOURS` dentro de
`public/js/app.js`; los elementos se marcan con `data-tour="..."`. La guía completa en texto está
en la app (`#guia`, acordeones) y en `TUTORIAL.md`.

## Cuánto cuesta usarla (tokens)

Todo funciona en el teléfono sin consumir nada. Lo único que llama a la API de Anthropic es el
análisis de fotos de máquinas (`api/analizar-maquina.js`, modelo Claude Opus 5.5):

| Concepto | Tokens aprox. por foto |
|---|---|
| Prompt del sistema (lista de ejercicios, reglas) | ~1.650 |
| Esquema JSON de la respuesta | ~450 |
| Foto comprimida a 1280 px de lado mayor | ~1.650 |
| Texto de la usuaria | ~40 |
| **Entrada total** | **~3.800** |
| Razonamiento + respuesta JSON | ~1.000–2.000 |

Con el precio de Opus 5.5 (4 USD por millón de tokens de entrada, 20 USD por millón de salida)
cada foto cuesta entre **0,03 y 0,06 USD**. Registrar un gym completo (30 máquinas) ronda
**1,5 USD**; 100 fotos, unos 5 USD. Si una foto se rechaza y entra el modelo de respaldo, se cobra
una segunda llamada. El código de acceso (`CODIGO_ACCESO`) evita que terceros usen la cuota.
Vercel Hobby (gratis) cubre de sobra el tráfico de una sola usuaria.

## Editar la rutina

- Ejercicios y técnica: `public/js/data/ejercicios.js` (cada uno con `anim.frames`, las poses
  de la animación; ángulos documentados en `anim.js`).
- Días, series y plantillas de ciclos: `public/js/data/rutina.js`.
- Para revisar las animaciones de golpe abre `http://localhost:3000/dev-anims.html`
  (acepta `?ids=hip-thrust,prensa-inclinada&size=300`; con "Pausar" puedes mover la fase).
- Tras cambiar archivos del shell, sube la versión en `public/sw.js` (`VERSION`) para que
  los teléfonos actualicen la caché.
