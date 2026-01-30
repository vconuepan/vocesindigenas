import { ChatOpenAI } from '@langchain/openai'
import { config } from '../config.js'

let lastCallTime = 0

export async function rateLimitDelay(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastCallTime
  if (lastCallTime > 0 && elapsed < config.llm.delayMs) {
    await new Promise(resolve => setTimeout(resolve, config.llm.delayMs - elapsed))
  }
  lastCallTime = Date.now()
}

export function getSmallLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: config.llm.models.small.name,
    reasoning: { effort: config.llm.models.small.reasoningEffort },
  })
}

export function getMediumLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: config.llm.models.medium.name,
    reasoning: { effort: config.llm.models.medium.reasoningEffort },
  })
}

export function getLargeLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: config.llm.models.large.name,
    reasoning: { effort: config.llm.models.large.reasoningEffort },
  })
}
