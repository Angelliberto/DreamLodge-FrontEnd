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
  // Factor I — Extraversión (diferenciar multitudes vs compañía, hablar vs contar cosas personales, etc.)
  gregariousness: {
    label: 'Ambientes con mucha gente',
    descripcion:
      'Te activa o te gusta el bullicio: fiestas, eventos, sitios llenos. No mide si necesitas ver a alguien a menudo (véase “Buscar compañía a menudo”) ni cuánto hablas: puedes ir a un concierto y hablar poco.'
  },
  friendliness: {
    label: 'Cercanía al iniciar contacto',
    descripcion:
      'Das impresión de accesible y amable cuando conoces gente: tono abierto, facilidad para el primer “hola”. En amabilidad hay “calidez” más ligada a acogida emocional; aquí es estilo social al relacionarte.'
  },
  assertiveness: {
    label: 'Decir lo que piensas con firmeza',
    descripcion:
      'Expresas opiniones y límites sin titubeo excesivo; no te dejas apartar del debate fácilmente. No implica dirigir al grupo (véase “Dirigir en grupo”): puedes defender tu postura sin coordinar a los demás.'
  },
  poise: {
    label: 'Comodidad en contextos sociales nuevos',
    descripcion:
      'Te sientes relativamente seguro cuando no conoces a casi nadie o el entorno es nuevo; menos bloqueo o vergüenza inicial.'
  },
  leadership: {
    label: 'Dirigir en grupo',
    descripcion:
      'Tomas iniciativa para encauzar decisiones, repartir cosas o proponer el plan cuando hay varios; la mirada del grupo a veces cae en ti.'
  },
  provocativeness: {
    label: 'Debate y confrontación directa',
    descripcion:
      'No evitas el choque de ideas: puedes contradecir, pinchar o mantener tensión dialéctica.'
  },
  self_disclosure: {
    label: 'Compartir lo personal',
    descripcion:
      'Cuentas emociones, experiencias íntimas u opiniones personales con relativa facilidad.'
  },
  talkativeness: {
    label: 'Mucho hablar en la conversación',
    descripcion:
      'Ocupas buena parte del tiempo de palabra; intervenciones largas o frecuentes. No mide el contenido (personal o no): es cantidad y protagonismo verbal.'
  },
  sociability: {
    label: 'Buscar compañía a menudo',
    descripcion:
      'Necesitas contacto social recurrente para sentirte bien; la soledad prolongada te pesa.'
  },
  // Factor II — Amabilidad (diferenciar escuchar vs anticipar, calidez vs ternura, compasión vs cuidado activo)
  understanding: {
    label: 'Escuchar y respetar lo ajeno',
    descripcion:
      'Prestas atención de verdad a lo que siente o le importa al otro; evitas restar importancia o juzgar en frío.'
  },
  warmth: {
    label: 'Hacer sentir bienvenido',
    descripcion:
      'Transmites acogida con tono, gestos o ambiente: la otra persona se siente a gusto al llegar.'
  },
  morality: {
    label: 'Honestidad y rectitud',
    descripcion:
      'Cumples normas y acuerdos aunque nadie te vigile; te incomoda actuar con trampas o deslealtad.'
  },
  pleasantness: {
    label: 'Poca dureza al criticar',
    descripcion:
      'Evitas ataques personales o juicios hirientes; concedes segundas oportunidades al error ajeno.'
  },
  empathy: {
    label: 'Captar lo que el otro necesita',
    descripcion:
      'Intuyes estados de ánimo o necesidades antes de que te lo detallen; ajustas el trato.'
  },
  cooperation: {
    label: 'Acordar en lugar de imponer',
    descripcion:
      'Prefieres consenso, reparto equitativo o ceder un poco antes que arrasar con tu criterio. No es lo mismo que “Honestidad y rectitud”: puedes cooperar en un plan sin tocar temas morales.'
  },
  sympathy: {
    label: 'Conmoverte por el sufrimiento',
    descripcion:
      'El dolor ajeno te afecta y te mueve a consolar o acompañar emocionalmente.'
  },
  tenderness: {
    label: 'Cariño en el trato',
    descripcion:
      'Muestras afecto con palabras o gestos suaves, mimos, delicadeza. Más íntimo que “Hacer sentir bienvenido”: la ternura implica vínculo afectivo explícito.'
  },
  nurturance: {
    label: 'Cuidar y proteger activamente',
    descripcion:
      'Impulso a velar por el bienestar del otro de forma concreta: ayudar, cubrir necesidades, estar pendiente.'
  },
  // Factor III — Meticulosidad / responsabilidad (diferenciar deber vs promesa, eficiencia vs detalle, orden físico vs seguimiento de tarea)
  conscientiousness: {
    label: 'Fiabilidad en lo prometido',
    descripcion:
      'Cumples lo que te comprometes con otros o contigo; constancia en obligaciones asumidas.'
  },
  efficiency: {
    label: 'Uso ordenado del tiempo y los pasos',
    descripcion:
      'Planificas, evitas perder tiempo y encadenas pasos con sentido para terminar sin caos.'
  },
  dutifulness: {
    label: 'Sentido del deber y las normas',
    descripcion:
      'Las obligaciones formales, éticas o de equipo te pesan; incumplir reglas o deberes te genera malestar.'
  },
  purposefulness: {
    label: 'Llegar hasta el final',
    descripcion:
      'Persistes hasta cerrar lo empezado; te cuesta dejar cosas a medias aunque cueste.'
  },
  organization: {
    label: 'Detalle y calidad del trabajo',
    descripcion:
      'Revisas que el resultado esté bien hecho, sigues el plan con mimo, controlas calidad.'
  },
  cautiousness: {
    label: 'Pausa ante riesgos',
    descripcion:
      'No te lanzas a lo loco; valoras antes consecuencias y riesgos.'
  },
  rationality: {
    label: 'Razonar con lógica y pasos',
    descripcion:
      'Te gusta estructurar pros/contras, listas o argumentos claros al decidir. No mide si eres arriesgado o prudente: es forma de pensar, no tolerancia al riesgo.'
  },
  perfectionism: {
    label: 'Exigencia máxima con el resultado',
    descripcion:
      'Te cuesta dar por bueno “suficientemente bien”; buscas un nivel alto o impecable.'
  },
  orderliness: {
    label: 'Orden físico y rutinas claras',
    descripcion:
      'Lugares ordenados, horarios predecibles, procedimientos que repites.'
  },
  // Factor IV (AB5C): puntuación en dirección neuroticismo. Etiquetas orientadas al usuario (qué mide cada faceta).
  stability: {
    label: 'Cambios de humor bruscos',
    descripcion:
      'Pasas rápido de un estado emocional a otro (por ejemplo de calma a enfado o tristeza) sin transición suave. No mide si te sientes “feliz todo el día”, sino si el humor da saltos.'
  },
  happiness: {
    label: 'Tristeza y bajón de ánimo',
    descripcion:
      'Sensación frecuente de melancolía, vacío o falta de energía positiva; te cuesta mantener un tono animado estable. Se diferencia del humor que “va y viene” en el día (véase “Altibajos durante el día”).'
  },
  calmness: {
    label: 'Enfado fácil (irritabilidad)',
    descripcion:
      'Cosas pequeñas te molestan o tensan; te cuesta conservar la calma en discusiones o contratiempos cotidianos. Es reacción a estímulos externos, no tanto la intensidad interna de la emoción.'
  },
  moderation: {
    label: 'Impulsos difíciles de frenar',
    descripcion:
      'Hacer o decidir en caliente por un deseo o impulso del momento (comer, gastar, cambiar de plan) sin pararte a pensar. No es solo “hablar sin filtro”; aquí el foco es conductas y deseos.'
  },
  toughness: {
    label: 'Sobrepaso ante presión o crítica',
    descripcion:
      'Cuando hay plazos ajustados, críticas o golpes inesperados, sientes que te afectan mucho o te bloquean. Mide fragilidad ante el estrés externo, no el mal genio cotidiano.'
  },
  impulse_control: {
    label: 'Reaccionar sin pensar (palabras y emoción)',
    descripcion:
      'Decir o exteriorizar en caliente lo que sientes antes de mediar; arrepentirte después de cómo reaccionaste.'
  },
  imperturbability: {
    label: 'Emociones muy intensas o abrumadoras',
    descripcion:
      'Las emociones te llegan con mucha fuerza y cuesta bajar la intensidad; puedes sentir que te “inundan”. No es solo irritarte por algo concreto, sino la magnitud de lo que sientes por dentro.'
  },
  cool_headedness: {
    label: 'Poca serenidad cuando hay tensión',
    descripcion:
      'En discusiones, urgencias o conflictos actúas o decides de forma precipitada en lugar de parar a valorar. Se parece a “Reaccionar sin pensar (palabras y emoción)”, pero solo en contextos de presión o confrontación.'
  },
  tranquility: {
    label: 'Altibajos durante el día',
    descripcion:
      'Tu estado de ánimo sube y baja muchas veces a lo largo del día aunque no haya un “disparador” claro.'
  },
  // Factor V — Apertura: distinguir ingenio (estrategias raras) vs creatividad (muchas soluciones) vs imaginación (fantasía).
  intellect: {
    label: 'Ideas abstractas y análisis',
    descripcion:
      'Te atraen conceptos teóricos, debates complejos y vocabulario preciso; disfrutas razonar sobre “el porqué” de las cosas. No mide tanto la fantasía ni soluciones prácticas raras, sino el gusto por lo intelectual.'
  },
  ingenuity: {
    label: 'Ingenio (enfoques poco obvios)',
    descripcion:
      'Se te ocurren maneras poco habituales de encarar un problema o una tarea: atajos, analogías raras o planes que otros no habrían probado. No es generar muchas ideas sueltas (creatividad) ni imaginar escenas (imaginación), sino originalidad aplicada a “cómo lo resuelvo”.'
  },
  reflection: {
    label: 'Contemplación y sensibilidad estética',
    descripcion:
      'Te detienes a apreciar belleza, atmósfera o profundidad en lo cotidiano (arte, naturaleza, momentos).'
  },
  competence: {
    label: 'Capacidad de aprender y aplicar',
    descripcion:
      'Asimilas contenidos nuevos y los usas bien en la práctica; sensación de “sé hacer esto”.'
  },
  quickness: {
    label: 'Rapidez al entender',
    descripcion:
      'Captas ideas o información compleja con poco esfuerzo aparente; necesitas menos tiempo que la media para “pillarlo”. No mide si luego lo aplicas bien (véase “Capacidad de aprender y aplicar”).'
  },
  introspection: {
    label: 'Mirar hacia dentro',
    descripcion:
      'Observas tus pensamientos, motivos y reacciones con atención.'
  },
  creativity: {
    label: 'Creatividad (varias soluciones)',
    descripcion:
      'Ante un mismo reto se te ocurren varias alternativas o combinaciones inusuales; pensamiento divergente útil.'
  },
  imagination: {
    label: 'Imaginación y fantasía',
    descripcion:
      'Mundo interior rico en imágenes, historias o posibilidades “como si”; imaginar escenarios vívidos aunque no vayan a ocurrir. No es lo mismo que idear soluciones prácticas (creatividad/ingenio): aquí predomina lo mental y lo ficticio.'
  },
  depth: {
    label: 'Profundidad (ir más allá de la superficie)',
    descripcion:
      'Te interesa lo que hay detrás de lo evidente: simbolismo, causas ocultas, lecturas no literales.'
  },
  mini_ipip: {
    label: 'Mini-IPIP (test breve)',
    descripcion:
      'En el test rápido no hay subfacetas separadas: varias preguntas resumen el rasgo con el inventario IPIP abreviado. Para ver nueve facetas por dimensión, haz el análisis profundo.'
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
