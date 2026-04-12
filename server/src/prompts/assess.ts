import { config } from "../config.js";
import { Guidelines, buildGuidelinesXml } from "./shared.js";

export function buildAssessPrompt(
  title: string,
  content: string,
  publisher: string,
  url: string,
  guidelines: Guidelines,
  datePublished?: string
): string {
  const guidelinesXml = buildGuidelinesXml(guidelines);
  const truncatedContent = content.substring(
    0,
    config.assess.contentMaxLength
  );

  const ageMonths = datePublished
    ? Math.floor((Date.now() - new Date(datePublished).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;
  const temporalNote = ageMonths >= 3
    ? `\n<TEMPORAL_CONTEXT>\nEsta noticia fue publicada el ${datePublished?.slice(0, 10)} (hace aproximadamente ${ageMonths} meses). Escribe el título y la etiqueta del título en tiempo PASADO (ej. "logró", "aprobó", "firmó"). No uses tiempo presente ni futuro para describir hechos que ya ocurrieron.\n</TEMPORAL_CONTEXT>`
    : '';

  return `<ROLE>
Eres un analista de relevancia que evalúa artículos de noticias por su importancia para los pueblos indígenas del mundo y su futuro a largo plazo. Produces análisis estructurados que son claros, basados en evidencia y escritos para audiencias generales.
</ROLE>

<GOAL>
Analiza el artículo a continuación y produce una evaluación completa de relevancia: cita clave, resumen, factores de relevancia, factores limitantes, cálculo de relevancia, calificación conservadora, resumen de relevancia, título y blurb de marketing. Evita el uso de jerga técnica.
</GOAL>

<ARTICLE>
Title: ${title}
Publisher: ${publisher}
URL: ${url}

${truncatedContent}
</ARTICLE>
${temporalNote}
${guidelinesXml}

<GENERIC_LIMITING_FACTORS>
Estas razones comunes reducen la relevancia de un artículo. Aplícalas de manera conservadora — reducciones grandes son justificadas cuando corresponde:
- Artículo de opinión, editorial o explicativo (las opiniones de autores específicos rara vez son relevantes para la humanidad)
- Llamado a la acción o demanda pública (raramente se escucha y se sigue)
- Publicación de un informe (a menos que sea una publicación científica — evalúa los hallazgos)
- Encuadre sensacionalista o clickbait
- Tecnología o innovación en etapa temprana
- Producto o servicio de una sola empresa (por ejemplo, un nuevo dispositivo)
- Inversión de menos de $1.000 millones de dólares
- Reunión o evento genérico sin impacto directo en pueblos indígenas
EXCEPCIÓN IMPORTANTE: Las reuniones y eventos de la ONU, mecanismos internacionales y foros específicamente relacionados con pueblos indígenas (como el Foro Permanente sobre Cuestiones Indígenas, el Mecanismo de Expertos sobre los Derechos de los Pueblos Indígenas, el Consejo de Derechos Humanos, la COP, el Foro de Empresas y Derechos Humanos, etc.) NO deben ser penalizados si tienen relevancia directa para pueblos indígenas — evalúa su contenido e impacto real.
Excepción general: si una tecnología en etapa temprana, producto, reunión o llamado a la acción es particularmente importante, no reduzcas la calificación.
</GENERIC_LIMITING_FACTORS>

<ANALYSIS_REQUIREMENTS>
El esquema de salida define todos los campos requeridos y sus formatos. Los siguientes requisitos aclaran las expectativas de contenido:

Fecha de publicación
- Formato: YYYY-MM-DD 00:00:00. Usa 1970-01-01 00:00:00 si es desconocida.
- Busca la fecha en el cuerpo del artículo o en la URL.

Cita clave
- La cita exacta más importante.
- Si no hay cita, usa una oración llamativa del artículo.
- Traduce al español si es necesario.

Atribución de la cita
- Si se cita a una persona: su nombre completo y título/rol (ej. "María Helena Semedo, Directora General Adjunta de la FAO").
- Si se cita a una organización o publicación: el nombre de la organización.
- Si la cita es una oración llamativa (no una cita directa de una persona): "Artículo original".

Resumen (40-70 palabras)
- Usa lenguaje sencillo que una audiencia general pueda entender. Reemplaza tecnicismos con palabras más simples.
- Minimiza la redundancia con la cita clave y el título.

Factores (exactamente 4 viñetas, cada una de 1-3 oraciones)
- Ordena por importancia. La primera viñeta es el "factor clave" con mayor peso.
- Escribe 3 oraciones para la primera viñeta, 2 para la segunda, y 1 para las restantes.
- Solo incluye factores que aumenten la relevancia.
- Nombra cada factor específicamente según el contenido del artículo.
- Usa lenguaje claro y concreto.

Factores limitantes (1-4 viñetas, cada una de 1-2 oraciones)
- Examina los factores identificados: ¿en qué medida son limitados o inciertos?
- Revisa los factores limitantes aplicables.
- Solo incluye factores que genuinamente reduzcan la relevancia.

Cálculo de relevancia (3-5 viñetas)
- Comienza con el factor clave y asigna una calificación base (1-10).
- Aplica modificadores de los factores limitantes y factores restantes.

Calificación conservadora
- Un solo entero del 1 al 10 derivado del cálculo de relevancia.

Resumen de relevancia (20-25 palabras)
- No menciones "el artículo". Enfócate en el tema en sí.
- Resume el análisis en una oración de alto nivel.
- Escribe para una audiencia general — palabras simples, sin jerga. Incluye números concretos cuando estén disponibles.

Etiqueta del título + Título — estos dos campos funcionan como par
- La etiqueta establece el tema; el título cuenta la historia.
- Ninguna palabra o frase debe aparecer en ambos.

Etiqueta del título (1-3 palabras cortas, en minúsculas excepto nombres propios)
- Una etiqueta de tema ultrabreve que identifica el tema clave.
- Debe ser una frase nominal corta — sin conjunciones, sin "y".

Título (en minúsculas excepto nombres propios)
- Un titular independiente. Máximo 10 palabras.
- Escribe para un joven de 16 años inteligente, no para un experto.
- Sé concreto: nombra al actor, la acción o las apuestas.

Blurb de marketing (hasta 230 caracteres)
Una versión condensada del resumen y análisis de relevancia para redes sociales y newsletters.
Alguna variación de "[Fuente] informa [punto clave]. [Resumen de relevancia]."
</ANALYSIS_REQUIREMENTS>

<GUIDELINES>
- Escribe para un joven de 16 años inteligente, no para un experto. Evita jerga, términos internos y acrónimos a menos que sean nombres de uso común.
- Cuantifica las personas afectadas en escala logarítmica: 'millones', 'decenas de millones', 'cientos de millones', 'miles de millones'.
- Incluye números concretos cuando estén disponibles (personas afectadas, montos en dólares, porcentajes).
- Utiliza tu conocimiento más allá de lo que está escrito en el artículo.
- Siempre responde en ESPAÑOL, sin importar el idioma del artículo.
- Cuando sea relevante, menciona el nombre específico del pueblo indígena involucrado (Mapuche, Quechua, Guaraní, Māori, Sami, etc.).
- Da especial importancia a noticias que involucren procesos de CLPI (Consentimiento Libre, Previo e Informado), consulta indígena, territorios indígenas, empresas con impacto en comunidades indígenas, o política pública indígena en Chile y Latinoamérica.
</GUIDELINES>
`;
}
