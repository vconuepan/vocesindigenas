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
let _largeLLM: ChatOpenAI | null = null

export function getSmallLLM(): ChatOpenAI {
  if (!_smallLLM) {
    _smallLLM = new ChatOpenAI({
      model: config.llm.models.small.name,
      reasoning: { effort: config.llm.models.small.reasoningEffort },
    }).withRetry({ stopAfterAttempt: 3 }) as unknown as ChatOpenAI
  }
  return _smallLLM
}

export function getLargeLLM(): ChatOpenAI {
  if (!_largeLLM) {
    _largeLLM = new ChatOpenAI({
      model: config.llm.models.large.name,
      reasoning: { effort: config.llm.models.large.reasoningEffort },
    }).withRetry({ stopAfterAttempt: 3 }) as unknown as ChatOpenAI
  }
  return _largeLLM
}
