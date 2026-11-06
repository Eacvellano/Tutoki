'use strict';
// Gemini structured-output schemas. Every field is required so the client never renders half an activity.
const str = description => ({ type: 'STRING', description });
const bool = description => ({ type: 'BOOLEAN', description });
const int = description => ({ type: 'INTEGER', description });
const pick = (values, description) => ({ type: 'STRING', enum: values, description });
const arr = (items, min, max) => ({ type: 'ARRAY', items, minItems: min, maxItems: max });
const obj = properties => ({ type: 'OBJECT', properties, required: Object.keys(properties), propertyOrdering: Object.keys(properties) });

const ERROR_TYPES = ['dato-falso', 'generaliza', 'causa-confundida', 'sesgo', 'omite', 'ninguno'];
const FLAWS = ['sin-evidencia', 'generaliza', 'ataque-personal', 'dato-dudoso', 'causa-confundida'];
const source = str('Dónde aparece en el material (página o sección). Si no hay material: "Conocimiento escolar"');

const activities = {
  detective: obj({
    title: str('Nombre de caso breve y atractivo, ej. "El caso de la planta sin luz"'),
    caseIntro: str('Gancho narrativo de 1 o 2 oraciones que presenta el caso'),
    sentences: arr(obj({
      text: str('Una oración de la explicación que escribe la IA'),
      isError: bool('true si la oración contiene un error sembrado'),
      errorType: pick(ERROR_TYPES, 'Tipo de error; "ninguno" si es correcta'),
      explanation: str('Por qué es correcta o incorrecta, apoyándose en el material'),
      correction: str('Versión corregida; igual al texto si ya es correcta'),
      source,
    }), 5, 6),
    reflectionPrompt: str('Pregunta final de reflexión sobre cómo detectó los errores'),
  }),
  primero: obj({
    title: str('Título breve de la actividad'),
    question: str('Pregunta abierta que invite a predecir antes de ver evidencia'),
    options: arr(str('Predicción posible, breve'), 3, 3),
    evidence: arr(obj({ title: str('Título corto de la evidencia'), text: str('Evidencia del material en 1 o 2 oraciones'), source }), 3, 3),
    aiAnswer: str('Respuesta que daría una IA, 2 a 3 oraciones, razonable pero con un matiz discutible'),
    aiQuestion: str('Pregunta para que el estudiante juzgue la respuesta de la IA con su evidencia'),
  }),
  defiendelo: obj({
    title: str('Título breve'),
    challenge: str('Problema o pregunta del material que el estudiante resolverá antes de defender su respuesta'),
    hint: str('Pista breve que orienta sin dar la respuesta'),
    questions: arr(obj({
      question: str('Pregunta de entrevista sobre el razonamiento del estudiante'),
      followUp: str('Repregunta socrática por si la respuesta es breve'),
    }), 3, 3),
    criteria: arr(str('Criterio de autoevaluación en primera persona, ej. "Usé evidencia del material"'), 3, 3),
  }),
  comunidad: obj({
    title: str('Nombre de la misión'),
    mission: str('Historia de 2 o 3 oraciones que conecta el tema con un problema real de la escuela o la comunidad'),
    problems: arr(obj({ emoji: str('Un solo emoji'), title: str('Problema concreto, breve'), description: str('Una oración') }), 3, 3),
    resources: arr(str('Recurso o material posible, 1 a 3 palabras'), 6, 6),
    allies: arr(str('Persona o grupo que podría ayudar, 1 a 3 palabras'), 5, 5),
    stakeholders: arr(obj({ emoji: str('Un solo emoji'), name: str('Nombre ficticio'), role: str('Rol en la comunidad'), concern: str('Preocupación real sobre cualquier propuesta') }), 3, 3),
    successQuestion: str('Pregunta para pensar cómo medirían si la propuesta funciona'),
  }),
  duelo: obj({
    title: str('Título del duelo'),
    motion: str('Pregunta debatible con dos posturas razonables'),
    positions: arr(str('Postura breve, máximo 6 palabras'), 2, 2),
    evidenceCards: arr(obj({ text: str('Dato o evidencia breve del material'), source, side: int('0 si apoya la primera postura, 1 si apoya la segunda') }), 6, 6),
    counterA: arr(obj({ text: str('Argumento de la IA a favor de la primera postura, máx. 45 palabras'), flaw: pick(FLAWS, 'Falla de razonamiento sembrada') }), 3, 3),
    counterB: arr(obj({ text: str('Argumento de la IA a favor de la segunda postura, máx. 45 palabras'), flaw: pick(FLAWS, 'Falla de razonamiento sembrada') }), 3, 3),
  }),
};

// onTopic=false means the student's text was random, empty of meaning or unrelated; the client then asks again.
const onTopic = bool('false si lo que escribió el estudiante son palabras al azar, no tiene sentido o no se relaciona con el tema');
const live = {
  duel: obj({ onTopic, reply: str('Contraargumento que responde a la idea concreta del estudiante, máximo 60 palabras. Si onTopic es false: petición amable de que explique su argumento'), flaw: pick(FLAWS, 'Falla sembrada a propósito en la respuesta') }),
  followup: obj({ onTopic, noticed: str('Algo concreto que dijo el estudiante, parafraseado, sin calificar. Si onTopic es false: cadena vacía'), followUp: str('Repregunta socrática sobre lo que dijo. Si onTopic es false: petición amable de responder la pregunta original') }),
  react: obj({ onTopic, reaction: str('Lo que diría esta persona sobre esta propuesta concreta, en primera persona, máximo 50 palabras. Si onTopic es false: dice con amabilidad que no entendió la propuesta'), question: str('Una pregunta que obligue a mejorar o aclarar la propuesta') }),
  coach: obj({ onTopic, message: str('Respuesta breve (máximo 70 palabras) que retoma lo que escribió el estudiante') }),
};

module.exports = { activities, live, FLAWS };
