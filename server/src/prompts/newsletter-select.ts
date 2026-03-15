import { escapeXml } from './shared.js'

export interface StoryForNewsletterSelect {
  id: string
  title: string | null
  summary: string | null
  issueName: string
  emotionTag: string | null
}

export function buildNewsletterSelectPrompt(
  stories: StoryForNewsletterSelect[],
  storiesPerIssue: number,
  issueNames: string[],
): string {
  let query = `<ROLE>
Eres un curador editorial senior especializado en asuntos de pueblos indígenas a nivel global, con énfasis en Latinoamérica, Chile, Australia, Nueva Zelanda y Canadá.
</ROLE>
<GOAL>
Selecciona exactamente ${storiesPerIssue} noticias de cada una de las siguientes ${issueNames.length} categorías temáticas (${storiesPerIssue * issueNames.length} noticias en total):
${issueNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}
Retorna solo los IDs de las noticias seleccionadas.
Si una categoría tiene menos de ${storiesPerIssue} noticias disponibles, selecciona todas las que haya.
</GOAL>
<SELECTION_CRITERIA>
- Prioriza noticias con impacto DIRECTO en pueblos indígenas — territorios, derechos, cultura, autodeterminación.
- Prioriza noticias sobre cambios sistémicos: legislación, políticas públicas, sentencias judiciales, acuerdos internacionales que afecten a pueblos indígenas.
- Prioriza noticias sobre procesos de consulta indígena, CLPI (Consentimiento Libre, Previo e Informado) y participación indígena.
- Prioriza noticias sobre empresas e industrias (minería, energía, acuicultura, forestal) con impacto en territorios indígenas.
- Prioriza noticias sobre emprendimiento y empresas indígenas exitosas.
- Evita noticias que solo mencionan pueblos indígenas de manera marginal o superficial.
- Selecciona noticias que se complementen entre sí — evita cubrir el mismo evento desde dos ángulos similares.
- Incluye al menos una tercera parte de noticias positivas o esperanzadoras cuando estén disponibles.
- Da preferencia a noticias de Chile, Latinoamérica, Australia, Nueva Zelanda y Canadá cuando sean de calidad similar.
</SELECTION_CRITERIA>
<ARTICLES>
`
  for (const story of stories) {
    query += `<ARTICLE>\n`
      + `<ID>${story.id}</ID>\n`
      + `<ISSUE>${escapeXml(story.issueName)}</ISSUE>\n`
      + `<EMOTION>${escapeXml(story.emotionTag || 'calm')}</EMOTION>\n`
      + `<TITLE>${escapeXml(story.title || '')}</TITLE>\n`
      + `<SUMMARY>${escapeXml(story.summary || '')}</SUMMARY>\n`
      + `</ARTICLE>\n`
  }
  query += `</ARTICLES>`
  return query
}
