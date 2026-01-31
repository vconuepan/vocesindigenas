import { ChatOpenAI } from '@langchain/openai'
import { config } from '../config.js'

let delayChain = Promise.resolve()

export function rateLimitDelay(): Promise<void> {
  delayChain = delayChain.then(
    () => new Promise(resolve => setTimeout(resolve, config.llm.delayMs)),
  )
  return delayChain
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
