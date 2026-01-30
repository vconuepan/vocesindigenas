export interface Guidelines {
  factors: string
  antifactors: string
  ratings: string
}

export function buildGuidelinesXml(g: Guidelines): string {
  return `<FACTORS>\n${g.factors}\n</FACTORS>\n\n<TOPIC-SPECIFIC LIMITING FACTORS>\n${g.antifactors}\n</TOPIC-SPECIFIC LIMITING FACTORS>\n\n<CRITERIA>\n${g.ratings}\n</CRITERIA>`
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function containsChineseCharacters(str: string): boolean {
  return /\p{Script=Han}/u.test(str)
}
