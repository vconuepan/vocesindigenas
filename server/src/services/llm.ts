import { ChatOpenAI } from '@langchain/openai'
import { config } from '../config.js'

let nextAvailableTime = 0

export async function rateLimitDelay(): Promise<void> {
  const now = Date.now()
  const waitUntil = Math.max(nextAvailableTime, now)
  nextAvailableTime = waitUntil + config.llm.delayMs
  const waitMs = waitUntil - now
  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }
}

let _smallLLM: ChatOpenAI | null = null
let _mediumLLM: ChatOpenAI | null = null
let _largeLLM: ChatOpenAI | null = null

export function getSmallLLM(): ChatOpenAI {
  if (!_smallLLM) {
    _smallLLM = new ChatOpenAI({
      model: config.llm.models.small.name,
      reasoning: { effort: config.llm.models.small.reasoningEffort },
      maxRetries: 3,
    })
  }
  return _smallLLM
}

export function getMediumLLM(): ChatOpenAI {
  if (!_mediumLLM) {
    _mediumLLM = new ChatOpenAI({
      model: config.llm.models.medium.name,
      reasoning: { effort: config.llm.models.medium.reasoningEffort },
      maxRetries: 3,
    })
  }
  return _mediumLLM
}

export function getLargeLLM(): ChatOpenAI {
  if (!_largeLLM) {
    _largeLLM = new ChatOpenAI({
      model: config.llm.models.large.name,
      reasoning: { effort: config.llm.models.large.reasoningEffort },
      maxRetries: 3,
    })
  }
  return _largeLLM
}

export function getLLMByTier(tier: 'small' | 'medium' | 'large'): ChatOpenAI {
  switch (tier) {
    case 'small': return getSmallLLM()
    case 'medium': return getMediumLLM()
    case 'large': return getLargeLLM()
  }
}
