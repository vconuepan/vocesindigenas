import { ChatOpenAI } from '@langchain/openai'

const LLM_DELAY_MS = parseInt(process.env.LLM_DELAY_MS || '1000', 10)

let lastCallTime = 0

export async function rateLimitDelay(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastCallTime
  if (lastCallTime > 0 && elapsed < LLM_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, LLM_DELAY_MS - elapsed))
  }
  lastCallTime = Date.now()
}

export function getSmallLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL_SMALL || 'gpt-5-mini',
    reasoning: { effort: 'low' },
  })
}

export function getLargeLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL_LARGE || 'gpt-5.2',
    reasoning: { effort: 'medium' },
  })
}
