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
1-2: Sin relevancia directa para pueblos indígenas; el artículo no menciona ni afecta a comunidades, territorios, derechos o culturas indígenas.
3-4: Relevancia indirecta o marginal; afecta a una comunidad indígena específica de forma limitada, o toca temas relacionados de forma tangencial.
5-6: Relevancia clara; afecta directamente a una o más comunidades indígenas, sus territorios, derechos, culturas o medios de vida, a nivel local o regional.
7-8: Alta relevancia; afecta a múltiples pueblos indígenas o tiene implicaciones para los derechos indígenas a nivel nacional o internacional.
9-10: Relevancia excepcional; transforma las condiciones de vida y derechos de pueblos indígenas a escala global, o establece precedentes históricos para el movimiento indígena mundial.
</CRITERIOS DE CALIFICACION>

${EMOTION_TAGS_PROMPT_BLOCK}

${formatArticlesBlock(stories)}`
}
