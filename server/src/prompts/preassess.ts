import { EMOTION_TAGS_PROMPT_BLOCK, formatIssuesBlock, formatArticlesBlock } from './shared.js'
import type { StoryForPrompt, IssueForPrompt } from './shared.js'

// Re-export with legacy names for backwards compatibility
export type StoryForPreassess = StoryForPrompt
export type IssueForPreassess = IssueForPrompt

export function buildPreassessPrompt(
  stories: StoryForPreassess[],
  issues: IssueForPreassess[],
): string {
  return `<ROLE>
Eres un evaluador de relevancia que analiza artículos de noticias por su importancia para los pueblos indígenas del mundo y sus territorios, derechos, culturas y futuros.
</ROLE>

<GOAL>
Para cada artículo: clasíficalo en el tema más relevante, califica su relevancia en una escala del 1 al 10, y asígnale una etiqueta emocional.
</GOAL>

${formatIssuesBlock(issues)}

<CRITERIOS DE CALIFICACION>
1-2: Impacto muy bajo; afecta a menos de 100.000 personas indígenas o tiene efecto mínimo en sus derechos o territorios.
3-4: Impacto menor; afecta a entre 100.000 y 1 millón de personas indígenas, o genera cambios limitados en normas, leyes o tecnologías relevantes.
5-6: Impacto moderado; afecta a más de 1 millón de personas indígenas, o genera cambios significativos en sistemas importantes para los pueblos indígenas a nivel regional o global.
7-8: Impacto mayor; afecta a decenas de millones de personas indígenas o sus territorios a nivel global, o altera de forma importante el futuro de los pueblos indígenas.
9-10: Impacto excepcional; transforma las condiciones de vida y derechos de la mayoría de los pueblos indígenas del mundo, o cambia fundamentalmente el marco global de reconocimiento y protección indígena.
</CRITERIOS DE CALIFICACION>

${EMOTION_TAGS_PROMPT_BLOCK}

${formatArticlesBlock(stories)}`
}
