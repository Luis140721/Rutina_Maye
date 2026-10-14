// Inventario del gym de Maye, identificado a partir de un video del gimnasio
// (recorrido publicado en TikTok). `catalogo` enlaza con maquinas.js para heredar
// músculos, ajustes y qué ejercicios reemplaza. `confirmar: true` marca las que
// se vieron de pasada y conviene verificar en persona. `seg` es el segundo del video.

export const GYM = {
  nombre: 'Generation Link Fitness',
  fuente: 'Video de recorrido del gimnasio (13 oct 2026)',
  maquinas: [
    { catalogo: 'hack', nombre: 'Sentadilla en máquina Panatta (sentada, de placas)', seg: 0, nota: 'Máquina de sentadilla con hombreras y plataforma, marca Panatta. Misma función que la hack.' },
    { catalogo: 'remo-maquina', nombre: 'Remo con apoyo en el pecho (T-bar, de placas)', seg: 12, nota: 'Agarres amarillos, se carga con discos.' },
    { catalogo: 'press-hombro-maquina', nombre: 'Press militar en máquina (de placas)', seg: 20 },
    { catalogo: 'jalon-maquina', nombre: 'Jalón al pecho en máquina (brazos independientes, de placas)', seg: 24 },
    { nombre: 'Zona de mancuernas (rack completo)', seg: 16, musculos: ['pecho', 'hombros', 'dorsales', 'bíceps', 'tríceps', 'glúteos', 'cuádriceps'], patrones: ['empuje-horizontal', 'empuje-vertical', 'traccion-horizontal', 'biceps', 'elevacion-lateral', 'bisagra', 'zancada', 'sentadilla'], reemplaza: [], puntuacion: 5,
      resumen: 'Rack de mancuernas de varios pesos. Cubre todos los ejercicios con mancuerna de la rutina.', ajustes: 'Elige el par con el que llegues al rango de repeticiones con el RIR del bloque; sube de 2 en 2 kg.', precauciones: 'Devuélvelas a su sitio: el gym está lleno.' },
    { nombre: 'Press de banca con barra (2 estaciones)', seg: 36, musculos: ['pecho', 'tríceps', 'hombros'], patrones: ['empuje-horizontal'], reemplaza: ['press-banca-mancuernas'], puntuacion: 4,
      resumen: 'Bancos planos con soporte para barra olímpica. Alternativa al press con mancuernas cuando domines la técnica.', ajustes: 'La barra olímpica pesa 20 kg. Pide ayuda para sacarla del soporte las primeras veces.', precauciones: 'No uses collarines con un peso que no puedas empujar: pide que te cuiden.' },
    { catalogo: 'banco-ajustable', nombre: 'Bancos ajustables (varios)', seg: 40 },
    { catalogo: 'polea-doble', nombre: 'Torre de poleas doble (crossover) con cuerdas y agarres', seg: 52, nota: 'Hay dos torres y una buena variedad de agarres: cuerda, barra recta, mangos.' },
    { catalogo: 'curl-biceps-maquina', nombre: 'Máquina de curl de bíceps (predicador)', seg: 60, confirmar: true },
    { catalogo: 'jalon-polea', nombre: 'Jalón al pecho en polea (torre)', seg: 64 },
    { catalogo: 'hack', nombre: 'Sentadilla hack (amarilla, de placas)', seg: 88 },
    { catalogo: 'smith', nombre: 'Multipower (Smith)', seg: 92 },
    { catalogo: 'prensa-45', nombre: 'Prensa 45° de placas', seg: 100 },
    { catalogo: 'extensora', nombre: 'Extensión de cuádriceps (fila de máquinas de pierna)', seg: 104, confirmar: true, nota: 'En el video se ve una fila de 5 máquinas de pierna selectorizadas; confirma cuál es cuál.' },
    { catalogo: 'femoral-sentado', nombre: 'Curl femoral sentado (fila de máquinas de pierna)', seg: 104, confirmar: true },
    { catalogo: 'gluteo-kickback', nombre: 'Máquina de patada de glúteo', seg: 108 },
    { nombre: 'Máquina de glúteo de pie (hip thrust / extensión de cadera, de placas)', seg: 120, confirmar: true, musculos: ['glúteos', 'isquiotibiales'], patrones: ['empuje-cadera', 'extension-cadera'], reemplaza: ['hip-thrust', 'patada-gluteo-polea'], puntuacion: 4,
      resumen: 'Máquina amarilla de placas con almohadilla a la altura de la cadera. Sirve para empuje o extensión de cadera de pie.', ajustes: 'Almohadilla sobre la cadera, pies firmes, aprieta el glúteo al final sin arquear la lumbar.', precauciones: 'Confirma en el gym cómo se usa: pregunta a un instructor la primera vez.' },
    { nombre: 'Máquina de peso muerto (palanca, de placas)', seg: 124, musculos: ['isquiotibiales', 'glúteos', 'erectores'], patrones: ['bisagra'], reemplaza: ['peso-muerto-rumano', 'hiperextension'], puntuacion: 5,
      resumen: 'Peso muerto guiado con palanca y agarres bajos. Permite cargar la bisagra de cadera con la trayectoria fija.', ajustes: 'Pies al ancho de caderas, rodillas apenas flexionadas, empuja la cadera atrás y sube apretando el glúteo.', precauciones: 'Espalda neutra todo el recorrido; no redondees para llegar más abajo.' },
    { nombre: 'Rack de sentadilla (jaula) con barra', seg: 132, musculos: ['cuádriceps', 'glúteos', 'isquiotibiales', 'pecho'], patrones: ['sentadilla', 'bisagra', 'empuje-horizontal'], reemplaza: ['sentadilla-goblet', 'peso-muerto-rumano', 'press-banca-mancuernas'], puntuacion: 4,
      resumen: 'Jaula con barra olímpica y seguros. Para sentadilla con barra, peso muerto rumano con barra y press de banca dentro del rack.', ajustes: 'Pon los seguros justo por debajo de tu punto más bajo. Barra a la altura del pecho para sacarla cómoda.', precauciones: 'Empieza con la barra sola (20 kg) para aprender el patrón.' },
    { catalogo: 'caminadora', nombre: 'Caminadoras manuales curvas', seg: 136, nota: 'Sin motor: la velocidad la pones tú. Muy buenas para zona 2 e intervalos cortos.' },
    { catalogo: 'eliptica', nombre: 'Zona cardio (elípticas y bicicletas)', seg: 148, confirmar: true },
  ],
};
