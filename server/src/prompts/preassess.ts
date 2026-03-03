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
1-2: Sin relevancia para pueblos indígenas; el artículo no menciona ni involucra a comunidades, territorios, culturas, historia o derechos indígenas de ninguna forma.
3-4: Mención tangencial; los pueblos indígenas aparecen como contexto secundario o el tema indígena es muy periférico.
5-6: Relevancia directa; el artículo trata sobre comunidades indígenas, su historia, cultura, territorio, derechos, literatura, arte, conocimiento tradicional, o eventos que los afectan directamente, aunque sea a escala local.
7-8: Alta relevancia; afecta o documenta a múltiples pueblos indígenas, establece precedentes legales, políticas públicas, o preserva conocimiento cultural significativo a nivel regional o nacional.
9-10: Relevancia excepcional; transforma derechos indígenas a escala global o establece precedentes históricos para el movimiento indígena mundial.
</CRITERIOS DE CALIFICACION>

${EMOTION_TAGS_PROMPT_BLOCK}

${formatArticlesBlock(stories)}`
}
