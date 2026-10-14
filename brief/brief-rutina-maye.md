# Brief de rediseño: Rutina Maye

App web móvil (HTML, CSS y JavaScript sin framework), instalable en el celular, pensada para 375 px de ancho. Ya funciona completa. El objetivo del rediseño es que se vea más amable, más linda y más de Maye, sin cambiar lo que hace.

## Quién la usa y en qué contexto

Maye lleva dos meses yendo al gimnasio. Entrena cinco días por semana con una rutina que le armó un amigo: dos días de pierna, dos de tren superior y uno de abdomen, glúteo y cardio. Abre la app al llegar al gym, mira qué toca, ve la animación del ejercicio cuando no lo recuerda, anota peso y repeticiones entre series y marca cada serie para que arranque el descanso. Al final guarda la sesión. Cada 14 semanas la app le genera una rutina nueva.

Tono de los textos: cercano y directo, en español, de tú. Ejemplos reales: "Hola, Maye 👋", "Miércoles · hoy toca", "¡Sube el peso! Hoy 22 kg.", "Cada sesión registrada es un ladrillo más. ¡Bien hecho!".

## Pantallas (capturas en la carpeta `capturas`)

| Archivo | Pantalla |
|---|---|
| bienvenida.jpg | 1. Bienvenida (primer uso) |
| hoy.jpg | 2. Hoy |
| hoy-oscuro.jpg | 2b. Hoy en modo oscuro, con sesión en curso y temporizador |
| rutina.jpg | 3. Rutina |
| dia.jpg | 4. Día |
| ejercicio.jpg | 5. Ejercicio |
| sesion.jpg | 6. Sesión |
| progreso.jpg | 7. Progreso |
| maquinas.jpg | 8. Máquinas |
| ciclo.jpg | 9. Ciclo |

### 1. Bienvenida
Tarjeta con título "¡Bienvenida!", párrafo que explica la app, campo Tu nombre, campo de fecha "¿Qué día empiezas el ciclo 1?", campo Código de acceso (opcional) y botón primario Empezar.

### 2. Hoy
- Cabecera fija: logo, "Hola, Maye 👋" y subtítulo "Ciclo 1 · Semana 2 de 14 · Adaptación y técnica".
- Si hay una sesión abierta: tarjeta destacada "Tienes una sesión en curso" con botón Continuar sesión.
- Si el ciclo terminó: tarjeta "¡Terminaste las 14 semanas!" con botón para cerrar el ciclo.
- Tarjeta del día: "Miércoles · hoy toca", nombre del día (por ejemplo "Pierna A · Cuádriceps + glúteo"), lista de ejercicios separados por puntos, botones Empezar sesión (primario) y Ver detalle. En fin de semana muestra "Día de descanso" y cuál es la próxima sesión.
- Tarjeta del bloque: "Bloque: Adaptación y técnica", chip "RIR 3" y una frase de instrucción.
- Sección "Esta semana": tres cifras (sesiones 2/5, en total, máquinas), chips de los 5 días con ✓ en los hechos, nota "Toca un día para empezar esa sesión aunque no sea el día programado".
- Si no hay máquinas registradas: tarjeta que invita a registrarlas.

### 3. Rutina
- Párrafo de introducción.
- 5 tarjetas de día: abreviatura del día en un cuadro ("Lun"), nombre y subtítulo, "6 ejercicios · 16 series · primeros ejercicios…", flecha.
- Tabla "Series por músculo esta semana" (glúteos 28, cuádriceps 12, hombros 12…).
- Desplegable "En qué se basa esta rutina" con 9 referencias científicas.

### 4. Día
- Cabecera con nombre del día y subtítulo "Lunes · semana 1 · Adaptación y técnica · RIR 3".
- Botón primario ancho Empezar esta sesión y una frase del bloque.
- Por ejercicio: miniatura animada cuadrada de 84 px, nombre numerado, prescripción "3 × 8–12 · RIR 3 · descanso 2:30", músculos, selector de variante (principal, variantes y máquinas del gym marcadas "· en tu gym ★★★★☆").

### 5. Ejercicio
- Botón Volver. Animación grande cuadrada (máximo 320 px) con fondo suave y leyenda "La figura repite el movimiento completo…".
- Tarjeta con descripción y chips: patrón ("Sentadilla (rodilla dominante)"), equipo, rango de reps, descanso.
- "Cómo hacerlo": 4 o 5 pasos numerados. "Errores comunes": 2 o 3 viñetas.
- "Variantes": filas con miniatura animada o ícono del equipo, nombre, equipo, nota y enlace "Ver animación". Las máquinas registradas del gym aparecen con foto y estrellas.
- "Tu progreso": gráfico de línea si hay registros.

### 6. Sesión
- Cabecera con el día y "Semana 2 · Adaptación y técnica · mié, 7 oct". Frase "Objetivo de hoy: terminar cada serie con 3 repeticiones en reserva…".
- Por ejercicio: miniatura, nombre, prescripción, "Última vez (lun, 5 oct): 16 kg × 12/12/11 reps" o "Primera vez: busca un peso…", selector de variante.
- Sugerencia de progresión en tres estados: verde "¡Sube el peso! Hoy 18 kg.", gris "Mismo peso: busca una repetición más", ámbar "Baja un poco: 15 kg".
- Tabla de series: columnas #, kg, reps, RIR, ✓. Al marcar ✓ la casilla se pone verde y arranca el descanso.
- Botones pequeños "+ serie", "− serie", "⏱ 2:30". Campo de nota.
- Al final: botón primario "Terminar y guardar sesión" y enlace "Descartar sesión".
- Temporizador flotante sobre la barra inferior: "Descanso 2:29", botones "+30 s" y "Listo"; al llegar a cero se vuelve del color de acento, dice "¡Vamos!", vibra y suena.
- Modal al guardar: "Sesión guardada 💪", resumen "6 ejercicios · 18 series · 58 min", récords "🏆 Nuevo récord en: Hip thrust" y botón Genial.

### 7. Progreso
- Selector de ejercicio y gráfico de línea del 1RM estimado por fecha (línea de 2 px, puntos, etiqueta en el último valor, tooltip al tocar, desplegable "Ver como tabla").
- "Medidas corporales": 4 campos (peso, cintura, cadera, muslo), botón Guardar medidas y tabla de registros.
- "Sesiones": lista con nombre del día, fecha, ciclo y semana, cantidad de ejercicios y series, duración, botón Ver que abre un modal con la tabla y la opción Borrar sesión.

### 8. Máquinas y detalle de máquina
- Tarjeta destacada "Analizar una máquina" con explicación y botones Tomar foto y Galería.
- Chips de filtro por músculo (Todas, glúteos, cuádriceps…).
- Cuadrícula de 2 columnas: foto 4:3, nombre, estrellas de 1 a 5, músculos.
- Botones Compartir inventario y + Manual, con una nota explicativa.
- Modal de análisis: foto grande, campo de nota, botón "✨ Analizar con IA", enlace Guardar sin analizar, estado "Analizando la foto… (10–40 s)".
- Modal de resultado: nombre editable, resumen, estrellas con "utilidad para tu rutina · confianza 92 %", chips de músculos y patrón, "Puede reemplazar: Sentadilla goblet, Prensa inclinada", "Cómo ajustarla", "Cuidado", botón "Guardar en mi gym".
- Detalle de máquina: foto grande, mismo bloque de resultado, botones Renombrar y Borrar.

### 9. Ciclo
- Tarjeta de la semana actual: título "Semana 2: Adaptación y técnica", chip RIR, pista de 14 segmentos (hechas, actual, la 14 marcada como descarga), fechas de inicio y fin, texto del bloque.
- Si el ciclo terminó: tarjeta "Ciclo completado" con botón "Cerrar ciclo y generar nueva rutina" y luego un modal "🎉 Ciclo 2 generado" con los cambios.
- "Bloques del ciclo": 4 tarjetas (Adaptación 1–4, Acumulación 5–9, Intensificación 10–13, Descarga 14), la actual resaltada.
- "Cómo progresar": 4 pasos.
- "Ajustes y copia de seguridad": nombre, fecha de inicio, botones Código de IA, Exportar copia, Importar, Cerrar ciclo antes de tiempo, Borrar todo (rojo).
- "Ciclos anteriores" y el desplegable de evidencia.

## Componentes que se repiten

| Componente | Dónde aparece | Qué debe comunicar |
|---|---|---|
| Cabecera fija | Todas | Dónde estoy y en qué semana y bloque voy. |
| Barra inferior de 5 pestañas | Todas | Hoy, Rutina, Progreso, Máquinas, Ciclo. Pestaña activa clara. |
| Tarjeta | Todas | Agrupa. Variante destacada (acento) para lo urgente. |
| Botón primario / secundario / fantasma / peligro / pequeño | Todas | Acción principal única por pantalla. |
| Chip | Hoy, Ejercicio, Máquinas, Ciclo | Etiqueta, filtro activable, estado (bueno, aviso, error, acento). |
| Miniatura animada 84 px y animación grande 1:1 | Día, Sesión, Ejercicio | Cómo se hace el movimiento. Fondo suave, figura en tinta, peso en acento. |
| Selector de variante | Día, Sesión | Qué versión del ejercicio haré hoy. |
| Tabla de series (#, kg, reps, RIR, ✓) | Sesión | Registro rápido con una mano. Casilla ✓ grande. |
| Sugerencia de progresión | Sesión | Subir, mantener o bajar peso. Tres colores. |
| Temporizador flotante | Sesión y cualquier pestaña mientras corre | Cuánto falta. Cambia de color al terminar. |
| Modal tipo hoja inferior | Confirmaciones, resultados, detalle de sesión | Decisión puntual sin perder contexto. |
| Toast | Guardados | Confirmación breve. |
| Cifras (3 en fila) | Hoy | Resumen de la semana. |
| Pista de 14 semanas | Ciclo | Dónde voy en el ciclo y cuándo descargo. |
| Gráfico de línea | Progreso, Ejercicio | Tendencia del 1RM. Una sola serie, etiqueta final, tooltip, tabla gemela. |
| Tarjeta de máquina | Máquinas | Foto, nombre, estrellas, músculos. |
| Estados vacíos | Progreso, Máquinas, Sesiones | Qué pasará cuando haya datos, en tono amable. |

## Sistema actual (punto de partida)

Modo claro: fondo #f9f9f7 · superficie #fcfcfb · superficie 2 #f0efec · texto #0b0b0b · texto secundario #52514e · acento #c2255c · acento suave #fbe3ec · bueno #006300 · aviso #8a5a00 · error #b42323 · línea del gráfico #2a78d6.

Modo oscuro: fondo #0d0d0d · superficie #1a1a19 · superficie 2 #262624 · texto #ffffff · texto secundario #c3c2b7 · acento #f06595 · acento suave #3a1a26 · bueno #0ca30c · aviso #fab219 · error #e66767 · línea del gráfico #3987e5.

Tipografía: la del sistema. Cuerpo 16 px, títulos 18 a 20 px, etiquetas 12 a 13 px en mayúsculas con espaciado. Radios: tarjetas 14 px, botones 12 px, chips redondos. Sombra muy suave, bordes de 1 px. Barra inferior de 64 px con emoji como ícono. Botones de 44 px de alto.

Figura animada: trazo de 7 px con puntas redondas, cabeza rellena, extremidad lejana más clara, pesos en el acento, escenario (banco, poleas, suelo) en grises. Sus colores se controlan con cinco tokens: tinta, lejana, peso, utilería, escenario.

## Restricciones técnicas

- El rediseño se aplica cambiando la hoja de estilos y pequeños ajustes de estructura; sirven más los tokens y medidas concretas que las imágenes.
- Fuentes de Google Fonts. Íconos en SVG.
- Las animaciones son SVG generados en vivo, no imágenes; se recolorean con tokens pero no se redibujan.
- Clases que el código usa y conviene conservar: topbar, tabs, card, card-accent, btn, btn-primary, btn-ghost, btn-danger, btn-sm, btn-check, chip, chips, input, field, day-card, day-num, ex-row, ex-thumb, ex-big, presc, set-grid, sug, timer, modal, modal-card, toast, stat, cycle-track, mach, stars, section-title.

## Entregable

- Mockups móviles de 375 px de las 10 pantallas, en claro y oscuro.
- Tabla de tokens: colores, tipografías con tamaños, radios, sombras y espaciados.
- 5 íconos para la barra inferior y los íconos de acción (cámara, compartir, temporizador, exportar) en SVG.
- Estados de los componentes: botón primario y secundario, chip activo, serie marcada, sugerencia de subir / mantener / bajar peso.
