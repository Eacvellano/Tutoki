// Fallback content used when Gemini is not configured. Same shape as ai/schemas.cjs.
window.TutokiDemo = {
  detective: {
    title: 'El caso de la planta sin luz',
    caseIntro: 'Un asistente de IA le explicó a un estudiante cómo crecen las plantas. Sonaba muy seguro… pero algo no cuadra.',
    sentences: [
      { text: 'Las plantas fabrican su propio alimento mediante la fotosíntesis.', isError: false, errorType: 'ninguno', explanation: 'Correcto: el material explica que las plantas producen su alimento con luz, agua y dióxido de carbono.', correction: 'Las plantas fabrican su propio alimento mediante la fotosíntesis.', source: 'Las plantas, p. 2' },
      { text: 'Para hacerlo usan la luz del sol, el agua y el dióxido de carbono del aire.', isError: false, errorType: 'ninguno', explanation: 'Correcto: son los tres ingredientes de la fotosíntesis.', correction: 'Para hacerlo usan la luz del sol, el agua y el dióxido de carbono del aire.', source: 'Las plantas, p. 2' },
      { text: 'Por eso todas las plantas crecen igual, sin importar cuánta luz reciban.', isError: true, errorType: 'generaliza', explanation: 'En el experimento, la planta con poca luz creció más débil. La cantidad de luz sí cambia el crecimiento.', correction: 'Las plantas crecen distinto según la luz que reciben.', source: 'Experimento de las dos plantas, p. 4' },
      { text: 'Las hojas son verdes porque tienen clorofila, que capta la luz.', isError: false, errorType: 'ninguno', explanation: 'Correcto: la clorofila es el pigmento que capta la luz.', correction: 'Las hojas son verdes porque tienen clorofila, que capta la luz.', source: 'Las plantas, p. 3' },
      { text: 'Las plantas absorben su alimento ya hecho desde la tierra por las raíces.', isError: true, errorType: 'dato-falso', explanation: 'Las raíces absorben agua y minerales, pero el alimento lo fabrica la planta en sus hojas.', correction: 'Las raíces absorben agua y minerales; el alimento se fabrica en las hojas.', source: 'Las plantas, p. 3' },
      { text: 'Si una planta recibe agua y luz, puede seguir creciendo sana.', isError: false, errorType: 'ninguno', explanation: 'Correcto en general: con agua, luz y aire la planta puede crecer.', correction: 'Si una planta recibe agua y luz, puede seguir creciendo sana.', source: 'Las plantas, p. 4' },
    ],
    reflectionPrompt: '¿Qué pista te hizo sospechar primero? ¿Cómo la comprobaste?',
  },
  primero: {
    title: 'Plantas en la sombra',
    question: '¿Qué le pasará a una planta si recibe mucha menos luz durante una semana?',
    options: ['Crecerá igual que las demás', 'Crecerá más débil o pálida', 'Crecerá más alta buscando la luz'],
    evidence: [
      { title: 'Lo que se observó', text: 'Después de 7 días, la planta con poca luz tenía hojas más pálidas y pequeñas.', source: 'Experimento, p. 4' },
      { title: 'El tallo', text: 'Su tallo creció un poco más largo pero delgado, como si buscara la luz.', source: 'Experimento, p. 4' },
      { title: 'Por qué pasa', text: 'Con menos luz, la planta fabrica menos alimento con la fotosíntesis.', source: 'Las plantas, p. 2' },
    ],
    aiAnswer: 'Una planta con poca luz simplemente deja de crecer, porque sin luz no hay fotosíntesis. Por eso se queda del mismo tamaño.',
    aiQuestion: '¿La evidencia apoya por completo lo que dijo la IA? ¿Qué parte cambiarías?',
  },
  defiendelo: {
    title: 'Defiende tu experimento',
    challenge: 'Quieres comprobar si la luz cambia el crecimiento de una planta. Tienes dos plantas iguales. ¿Cómo diseñarías tu experimento?',
    hint: 'Piensa qué vas a cambiar y qué vas a mantener igual en las dos plantas.',
    questions: [
      { question: '¿Por qué diseñaste tu experimento de esa forma?', followUp: '¿Qué pasaría si cambiaras dos cosas al mismo tiempo?' },
      { question: '¿Qué evidencia te diría que tu idea es correcta?', followUp: '¿Qué tendrías que observar o medir exactamente?' },
      { question: 'Si lo repitieras, ¿qué harías distinto?', followUp: '¿Cómo harías que el resultado fuera más confiable?' },
    ],
    criteria: ['Expliqué por qué elegí mi respuesta', 'Usé evidencia o datos', 'Pensé cómo mejorarla'],
  },
  comunidad: {
    title: 'Misión: un rincón más verde',
    mission: 'El patio de la escuela se calienta mucho en primavera y casi no tiene plantas. La directora pidió ideas a los estudiantes. ¿Pueden ayudar usando lo que saben de las plantas?',
    problems: [
      { emoji: '☀️', title: 'Hay poca sombra', description: 'Al mediodía el patio está demasiado caliente para jugar.' },
      { emoji: '🌱', title: 'Faltan plantas', description: 'Las jardineras están vacías desde hace meses.' },
      { emoji: '💧', title: 'Se desperdicia agua', description: 'El agua del lavado de manos se va al drenaje.' },
    ],
    resources: ['Macetas recicladas', 'Semillas locales', 'Agua de lluvia', 'Composta', 'Botellas PET', 'Cartel informativo'],
    allies: ['Familias', 'Conserje', 'Vivero local', 'Otro grupo', 'Docente de ciencias'],
    stakeholders: [
      { emoji: '🧹', name: 'Don Ramón', role: 'Conserje de la escuela', concern: 'Que alguien se haga cargo de regar y limpiar en vacaciones.' },
      { emoji: '👩‍💼', name: 'Mtra. Lucía', role: 'Directora', concern: 'Que el proyecto no cueste mucho y sea seguro.' },
      { emoji: '⚽', name: 'Sofi', role: 'Estudiante de 3.º', concern: 'No quiere perder espacio para jugar fútbol.' },
    ],
    successQuestion: '¿Qué observarían o medirían en un mes para saber si su propuesta funcionó?',
  },
  duelo: {
    title: 'Duelo verde',
    motion: '¿La escuela debería convertir parte del patio en un jardín?',
    positions: ['Sí, más jardín', 'No, más espacio libre'],
    evidenceCards: [
      { text: 'Las plantas dan sombra y bajan la temperatura del lugar.', source: 'Las plantas, p. 5', side: 0 },
      { text: 'Un huerto escolar permite observar y hacer experimentos.', source: 'Las plantas, p. 6', side: 0 },
      { text: 'Las plantas absorben dióxido de carbono y liberan oxígeno.', source: 'Las plantas, p. 2', side: 0 },
      { text: 'Un jardín necesita riego y cuidado diario, incluso en vacaciones.', source: 'Las plantas, p. 6', side: 1 },
      { text: 'El patio es el único espacio amplio para deportes y recreo.', source: 'Contexto escolar', side: 1 },
      { text: 'Las plantas sin cuidado se secan y pueden atraer plagas.', source: 'Las plantas, p. 5', side: 1 },
    ],
    counterA: [
      { text: 'Todos los expertos dicen que un jardín siempre mejora cualquier escuela. Así que no hay nada que discutir.', flaw: 'generaliza' },
      { text: 'Quien no quiere el jardín es porque no le importa el planeta.', flaw: 'ataque-personal' },
      { text: 'Un jardín baja la temperatura del patio 20 grados, así que nadie volverá a tener calor.', flaw: 'dato-dudoso' },
    ],
    counterB: [
      { text: 'Las plantas siempre traen plagas, así que cualquier jardín será un problema.', flaw: 'generaliza' },
      { text: 'Desde que hay más plantas en la ciudad hay más alergias, así que las plantas causan las alergias.', flaw: 'causa-confundida' },
      { text: 'Necesitamos el espacio para jugar. No necesito dar datos, es obvio.', flaw: 'sin-evidencia' },
    ],
  },
};
