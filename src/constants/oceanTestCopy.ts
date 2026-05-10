/** Textos de rasgos Big Five y facetas AB5C/IPIP para la pantalla de resultados del test OCEAN. */

export const DIMENSION_NAMES: Record<string, { es: string; color: string; descripcion: string }> = {
  openness: {
    es: 'Apertura a experiencias',
    color: '#ec4899',
    descripcion:
      'Curiosidad intelectual, imaginación y disposición a ideas, estilos y experiencias nuevas frente a lo convencional o familiar.'
  },
  conscientiousness: {
    es: 'Meticulosidad',
    color: '#22c55e',
    descripcion:
      'Organización, planificación, fiabilidad y perseverancia en tareas y compromisos; orientación a metas y detalle.'
  },
  extraversion: {
    es: 'Extroversión',
    color: '#3b82f6',
    descripcion:
      'Energía social, búsqueda de estimulación y compañía, expresividad y protagonismo en entornos grupales.'
  },
  agreeableness: {
    es: 'Simpatía',
    color: '#f97316',
    descripcion:
      'Cooperación, empatía, confianza y trato cordial; priorizar el bien común frente a la competencia o el escepticismo.'
  },
  neuroticism: {
    es: 'Neurosis',
    color: '#a855f7',
    descripcion:
      'Tendencia a emociones negativas, estrés, preocupación o cambios de humor.'
  }
};

/** Orden fijo O–C–E–A–N para gráficos y pestañas (no usar orden de inserción del objeto `dimensions`). */
export const BIG_FIVE_DIMENSION_ORDER = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'neuroticism'
] as const;

/** Claves presentes en resultados, en orden canónico Big Five. */
export function orderedDimensionKeys(dimensions: Record<string, number>): string[] {
  const keys = Object.keys(dimensions);
  const primary = BIG_FIVE_DIMENSION_ORDER.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !BIG_FIVE_DIMENSION_ORDER.includes(k as (typeof BIG_FIVE_DIMENSION_ORDER)[number])).sort();
  return [...primary, ...rest];
}

/** Etiquetas y descripciones breves para las facetas AB5C/IPIP (test profundo). */
export const SUBFACET_INFO: Record<string, { label: string; descripcion: string }> = {
  // Factor I — Extraversión
  gregariousness: {
    label: 'Disfrute de sitios con mucha gente',
    descripcion:
      'Te gusta estar en lugares con mucha gente, como fiestas o eventos llenos. Mide si te sientes a gusto entre multitudes, no cuánto hablas ni si necesitas ver a la gente a menudo.'
  },
  friendliness: {
    label: 'Cercanía al conocer gente',
    descripcion:
      'Cuando conoces a alguien resultas accesible y amable: saludas con facilidad y te muestras abierto desde el primer momento.'
  },
  assertiveness: {
    label: 'Firmeza al expresar opiniones',
    descripcion:
      'Dices lo que piensas y defiendes tu postura sin titubear demasiado, aunque haya desacuerdo.'
  },
  poise: {
    label: 'Seguridad en situaciones nuevas',
    descripcion:
      'Te sientes cómodo en sitios o grupos que no conoces; no te bloqueas ni te avergüenzas con facilidad.'
  },
  leadership: {
    label: 'Iniciativa para liderar el grupo',
    descripcion:
      'Tomas la iniciativa para organizar planes, repartir tareas o guiar decisiones cuando hay varias personas.'
  },
  provocativeness: {
    label: 'Tendencia al debate y la confrontación',
    descripcion:
      'No te incomoda discutir ni llevar la contraria. Disfrutas del intercambio de ideas aunque suba el tono.'
  },
  self_disclosure: {
    label: 'Apertura para hablar de lo personal',
    descripcion:
      'Compartes con facilidad cosas íntimas: emociones, experiencias o pensamientos privados.'
  },
  talkativeness: {
    label: 'Cantidad de tiempo hablando',
    descripcion:
      'Hablas mucho durante una conversación: tus intervenciones son largas o frecuentes. Mide cuánto hablas, no de qué.'
  },
  sociability: {
    label: 'Necesidad de compañía',
    descripcion:
      'Necesitas estar con gente con cierta frecuencia para sentirte bien. Pasar mucho tiempo solo te pesa.'
  },
  // Factor II — Amabilidad
  understanding: {
    label: 'Escucha atenta a los demás',
    descripcion:
      'Prestas atención real a lo que el otro siente o piensa, sin restarle importancia ni juzgar a la ligera.'
  },
  warmth: {
    label: 'Acogida hacia los demás',
    descripcion:
      'Haces que la gente se sienta bienvenida con tu trato, tu tono y tus gestos.'
  },
  morality: {
    label: 'Honestidad y juego limpio',
    descripcion:
      'Cumples las normas y acuerdos aunque nadie te esté vigilando. Te incomoda actuar con trampas o engaños.'
  },
  pleasantness: {
    label: 'Suavidad al criticar',
    descripcion:
      'Evitas las críticas hirientes o los ataques personales. Das margen al error ajeno.'
  },
  empathy: {
    label: 'Captar las necesidades del otro',
    descripcion:
      'Te das cuenta de cómo se siente o qué necesita la otra persona sin que tenga que explicártelo, y adaptas tu trato.'
  },
  cooperation: {
    label: 'Preferencia por el acuerdo',
    descripcion:
      'Prefieres llegar a acuerdos y ceder un poco antes que imponer tu criterio o competir.'
  },
  sympathy: {
    label: 'Compasión ante el sufrimiento',
    descripcion:
      'El dolor ajeno te afecta y sientes el impulso de consolar o acompañar emocionalmente.'
  },
  tenderness: {
    label: 'Cariño y afecto en el trato',
    descripcion:
      'Muestras cariño con gestos suaves, palabras dulces o detalles. Implica un vínculo afectivo cercano.'
  },
  nurturance: {
    label: 'Cuidado activo de los demás',
    descripcion:
      'Te preocupas por el bienestar de la gente a tu alrededor y actúas para ayudar, proteger o estar pendiente.'
  },
  // Factor III — Meticulosidad
  conscientiousness: {
    label: 'Cumplir lo prometido',
    descripcion:
      'Cumples con lo que te comprometes, contigo y con los demás. Eres constante con tus obligaciones.'
  },
  efficiency: {
    label: 'Buen uso del tiempo',
    descripcion:
      'Planificas, no pierdes tiempo y organizas los pasos para terminar las cosas sin caos.'
  },
  dutifulness: {
    label: 'Sentido del deber',
    descripcion:
      'Te tomas en serio las obligaciones y las normas. Incumplir reglas o compromisos te genera malestar.'
  },
  purposefulness: {
    label: 'Constancia hasta acabar',
    descripcion:
      'Sigues hasta terminar lo que empiezas. Te cuesta dejar cosas a medias aunque se compliquen.'
  },
  organization: {
    label: 'Cuidado por el detalle',
    descripcion:
      'Revisas el trabajo, sigues el plan con cuidado y te aseguras de que el resultado esté bien hecho.'
  },
  cautiousness: {
    label: 'Prudencia ante el riesgo',
    descripcion:
      'No te lanzas a la ligera. Antes de actuar valoras las consecuencias y los posibles riesgos.'
  },
  rationality: {
    label: 'Decidir con lógica',
    descripcion:
      'Al decidir, te apoyas en argumentos claros, listas o pros y contras. Mide cómo piensas, no si eres prudente.'
  },
  perfectionism: {
    label: 'Exigencia con el resultado',
    descripcion:
      'No te conformas con un trabajo aceptable. Buscas que el resultado quede a un nivel alto o impecable.'
  },
  orderliness: {
    label: 'Orden y rutinas',
    descripcion:
      'Te gusta tener las cosas ordenadas, los horarios claros y los procedimientos repetibles.'
  },
  // Factor IV — Neuroticismo
  stability: {
    label: 'Cambios de humor bruscos',
    descripcion:
      'Pasas rápido de un estado emocional a otro (de la calma al enfado o a la tristeza) sin una transición suave.'
  },
  happiness: {
    label: 'Tendencia a la tristeza',
    descripcion:
      'Sientes con frecuencia tristeza, vacío o falta de ánimo, y te cuesta mantener un estado positivo estable.'
  },
  calmness: {
    label: 'Irritabilidad',
    descripcion:
      'Las cosas pequeñas te molestan o te tensan con facilidad y te cuesta mantener la calma en discusiones cotidianas.'
  },
  moderation: {
    label: 'Control de los impulsos',
    descripcion:
      'Te cuesta frenar deseos del momento como comer, gastar o cambiar de plan, y actúas sin pararte a pensar.'
  },
  toughness: {
    label: 'Sensibilidad al estrés',
    descripcion:
      'La presión, las críticas o los imprevistos te afectan mucho o llegan a bloquearte.'
  },
  impulse_control: {
    label: 'Reacciones impulsivas',
    descripcion:
      'Reaccionas en caliente, dices o haces cosas sin pensarlo y luego te arrepientes.'
  },
  imperturbability: {
    label: 'Intensidad emocional',
    descripcion:
      'Las emociones te llegan con mucha fuerza y te cuesta bajar su intensidad. A veces sientes que te desbordan.'
  },
  cool_headedness: {
    label: 'Serenidad bajo presión',
    descripcion:
      'En conflictos o urgencias actúas de forma precipitada, sin parar a valorar la situación con calma.'
  },
  tranquility: {
    label: 'Altibajos a lo largo del día',
    descripcion:
      'Tu estado de ánimo sube y baja varias veces durante el día sin un motivo claro.'
  },
  // Factor V — Apertura
  intellect: {
    label: 'Gusto por las ideas abstractas',
    descripcion:
      'Te atraen los conceptos teóricos, los debates complejos y razonar sobre el porqué de las cosas.'
  },
  ingenuity: {
    label: 'Ingenio para resolver problemas',
    descripcion:
      'Se te ocurren formas poco habituales de afrontar un problema: atajos, soluciones inesperadas o enfoques originales.'
  },
  reflection: {
    label: 'Sensibilidad estética',
    descripcion:
      'Te detienes a apreciar la belleza, la atmósfera o lo profundo de lo cotidiano: arte, naturaleza, momentos.'
  },
  competence: {
    label: 'Capacidad de aprender y aplicar',
    descripcion:
      'Aprendes cosas nuevas con facilidad y las aplicas bien en la práctica.'
  },
  quickness: {
    label: 'Rapidez de comprensión',
    descripcion:
      'Entiendes ideas o información compleja sin demasiado esfuerzo y más rápido que la media.'
  },
  introspection: {
    label: 'Autoconocimiento',
    descripcion:
      'Observas con atención tus pensamientos, motivos y reacciones para entenderte mejor.'
  },
  creativity: {
    label: 'Generación de ideas variadas',
    descripcion:
      'Ante un mismo reto se te ocurren varias alternativas o combinaciones diferentes para resolverlo.'
  },
  imagination: {
    label: 'Imaginación y fantasía',
    descripcion:
      'Tienes un mundo interior rico en imágenes, historias o escenarios que imaginas con detalle, aunque no vayan a ocurrir.'
  },
  depth: {
    label: 'Búsqueda de profundidad',
    descripcion:
      'Te interesa lo que hay detrás de lo evidente: el simbolismo, las causas ocultas o las lecturas no literales.'
  },
  mini_ipip: {
    label: 'Test breve (Mini-IPIP)',
    descripcion:
      'En el test rápido no se separan subfacetas: varias preguntas resumen cada rasgo. Para ver las nueve facetas por dimensión, haz el análisis profundo.'
  }
};

/** Orden de visualización de facetas AB5C por dimensión Big Five. */
export const AB5C_SUBFACET_ORDER: Record<string, string[]> = {
  extraversion: [
    'gregariousness',
    'friendliness',
    'assertiveness',
    'poise',
    'leadership',
    'provocativeness',
    'self_disclosure',
    'talkativeness',
    'sociability'
  ],
  agreeableness: [
    'understanding',
    'warmth',
    'morality',
    'pleasantness',
    'empathy',
    'cooperation',
    'sympathy',
    'tenderness',
    'nurturance'
  ],
  conscientiousness: [
    'conscientiousness',
    'efficiency',
    'dutifulness',
    'purposefulness',
    'organization',
    'cautiousness',
    'rationality',
    'perfectionism',
    'orderliness'
  ],
  neuroticism: [
    'stability',
    'happiness',
    'calmness',
    'moderation',
    'toughness',
    'impulse_control',
    'imperturbability',
    'cool_headedness',
    'tranquility'
  ],
  openness: [
    'intellect',
    'ingenuity',
    'reflection',
    'competence',
    'quickness',
    'introspection',
    'creativity',
    'imagination',
    'depth'
  ]
};
