'use strict';
const { generateJson } = require('./gemini.cjs');
const schemas = require('./schemas.cjs');

const MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];
const MAX_FILE_BASE64 = 20 * 1024 * 1024; // Gemini's inline-data ceiling.
const clip = (value, max = 600) => String(value ?? '').slice(0, max).trim();
const bad = message => Object.assign(new Error(message), { status: 400, code: 'bad-request' });

const BASE = `Eres el motor de actividades de Tutoki, una plataforma educativa mexicana que pregunta en lugar de responder y ejercita el pensamiento crítico.
Reglas: escribe en español de México, claro y cálido; basa todo en el material del docente cuando exista y, si no, en conocimiento escolar confiable;
nunca pidas ni incluyas datos personales; evita violencia, contenido sexual o temas inapropiados para menores;
la IA no es una autoridad: es una interlocutora que puede equivocarse. Nunca entregues la respuesta directa al estudiante.
Coherencia en conversaciones: responde SIEMPRE a lo que el estudiante escribió de verdad, retomando o parafraseando su idea concreta; nunca sigas un guion ni ignores su respuesta.
Si el estudiante escribe palabras al azar, algo sin sentido o ajeno al tema, marca onTopic=false y pídele con amabilidad que lo intente de nuevo con una idea concreta; no finjas que fue un buen argumento.`;

function audience(body) {
  const level = body.level === 'Secundaria' ? 'Secundaria' : 'Primaria';
  return { level, grade: clip(body.grade, 8) || '5.º', label: `${clip(body.grade, 8) || '5.º'} de ${level}` };
}

const BRIEFS = {
  detective: a => `Actividad "Detective". Escribe, como si fueras un asistente de IA muy convincente, una explicación de 5 o 6 oraciones sobre el tema.
Exactamente ${a.level === 'Secundaria' ? 3 : 2} oraciones deben tener un error sembrado y verosímil (dato falso, generalización, causa confundida, sesgo u omisión). Las demás deben ser correctas.
Los errores deben poder detectarse usando el material. Reparte los errores, no los pongas juntos.`,
  primero: () => `Actividad "Primero tú". El estudiante predice antes de ver evidencia. Crea una pregunta intrigante, tres predicciones plausibles,
tres evidencias del material que se revelan una por una, y la respuesta que daría una IA: razonable pero con un matiz discutible o incompleto para que el estudiante la evalúe.`,
  defiendelo: () => `Actividad "Defiéndelo". El estudiante primero resuelve un reto breve del material y luego defiende su respuesta en una entrevista de tres preguntas:
por qué eligió esa respuesta, qué evidencia la apoya y qué haría distinto. Las preguntas deben poder responderse sin importar la respuesta elegida.`,
  comunidad: () => `Actividad "Reto comunidad". Conecta el tema con un problema real y cercano (escuela, colonia, familia) que un grupo pueda investigar y mejorar.
Los personajes de la comunidad deben representar perspectivas distintas y preocupaciones legítimas.`,
  duelo: () => `Actividad "Duelo" para secundaria. Plantea una pregunta debatible del tema con dos posturas razonables. Las evidencias deben repartirse entre ambas posturas (3 y 3).
Cada argumento de la IA debe sonar convincente pero contener una falla de razonamiento sembrada, del tipo indicado, que un estudiante atento pueda detectar.`,
};

function generate(body) {
  const activity = clip(body.activity, 20);
  if (!BRIEFS[activity]) throw bad('Actividad desconocida.');
  const a = audience(body);
  const topic = clip(body.topic, 200);
  const parts = [{ text: `${BRIEFS[activity](a)}\nPúblico: estudiantes de ${a.label}.\nTema del docente: ${topic || 'el del material adjunto'}.` }];
  const file = body.file;
  if (file) {
    if (!MIME_TYPES.includes(file.mimeType)) throw bad('Tipo de archivo no compatible. Usa PDF, imagen o texto.');
    if (typeof file.data !== 'string' || file.data.length > MAX_FILE_BASE64) throw bad('El archivo supera el tamaño permitido.');
    parts.push({ text: 'Material del docente (úsalo como fuente principal):' }, { inlineData: { mimeType: file.mimeType, data: file.data } });
  } else if (!topic) throw bad('Sube un material o escribe un tema.');
  return generateJson({ system: BASE, parts, schema: schemas.activities[activity], temperature: 0.9 });
}

function duel(body) {
  const history = (Array.isArray(body.history) ? body.history : []).slice(-6).map(t => `${t.who === 'ai' ? 'IA' : 'Estudiante'}: ${clip(t.text, 500)}`).join('\n');
  const prompt = `Duelo de argumentos con un estudiante de secundaria. Pregunta: "${clip(body.motion, 200)}".
Tú defiendes: "${clip(body.aiSide, 80)}". El estudiante defiende: "${clip(body.studentSide, 80)}".
Conversación previa:\n${history || '(ninguna)'}\nÚltimo argumento del estudiante: "${clip(body.argument)}"
Empieza retomando su idea con tus palabras ("Dices que…") y contraargumenta ESA idea, no otra. No repitas argumentos que ya usaste en la conversación previa; construye sobre lo que ya se dijo.
Máximo 60 palabras, con respeto. Incluye a propósito UNA falla de razonamiento sutil del tipo que elijas para que el estudiante la detecte; no la reveles en el texto.
Si el estudiante usó buena evidencia, reconócelo brevemente antes de contraargumentar.`;
  return generateJson({ system: BASE, parts: [{ text: prompt }], schema: schemas.live.duel });
}

function followup(body) {
  const prompt = `Entrevista "Defiéndelo" con un estudiante de ${audience(body).label}. Reto: "${clip(body.challenge, 400)}".
Lo que el estudiante respondió al reto: "${clip(body.solution)}".
Pregunta hecha: "${clip(body.question, 300)}". Respuesta del estudiante: "${clip(body.answer)}".
Retoma algo concreto que dijo (parafraséalo) y haz UNA repregunta socrática sobre ESA idea que le pida justificar, precisar o considerar otra posibilidad. No corrijas ni des la respuesta.`;
  return generateJson({ system: BASE, parts: [{ text: prompt }], schema: schemas.live.followup });
}

function react(body) {
  const s = body.stakeholder || {};
  const prompt = `Reto comunidad con estudiantes de ${audience(body).label}. Misión: "${clip(body.mission, 400)}". Problema elegido: "${clip(body.problem, 200)}".
Propuesta del equipo: "${clip(body.proposal, 900)}".
Habla como ${clip(s.name, 40)}, ${clip(s.role, 60)}, cuya preocupación es "${clip(s.concern, 200)}". Reacciona con amabilidad a esta propuesta concreta y haz una pregunta que la mejore.`;
  return generateJson({ system: BASE, parts: [{ text: prompt }], schema: schemas.live.react });
}

const COACH = {
  detective: `Eres el detective jefe que revisa el expediente de un estudiante. Reconoce una pista concreta que explicó bien (menciónala) y hazle una pregunta sobre un error que se le escapó o que explicó de forma vaga. Sin calificar.`,
  primero: `Eres la IA cuya respuesta el estudiante acaba de evaluar. Responde a su crítica concreta: si su evidencia muestra un error o una omisión tuya, reconócelo explícitamente; si su crítica no se sostiene, pregúntale qué evidencia la apoya.`,
};
function coach(body) {
  const kind = clip(body.kind, 20);
  if (!COACH[kind]) throw bad('Tipo de comentario desconocido.');
  const prompt = `${COACH[kind]}\nEstudiante de ${audience(body).label}.\nContexto de la actividad:\n${clip(body.context, 2500)}\nLo que escribió el estudiante:\n${clip(body.studentText, 2000)}`;
  return generateJson({ system: BASE, parts: [{ text: prompt }], schema: schemas.live.coach });
}

const TASKS = { generate, duel, followup, react, coach };
module.exports = async function runTask(body) {
  const task = TASKS[body?.task];
  if (!task) throw bad('Tarea desconocida.');
  return task(body);
};
