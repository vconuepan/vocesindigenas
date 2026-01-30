export const config = {
  llm: {
    models: {
      small: {
        name: process.env.OPENAI_MODEL_SMALL || 'gpt-5-mini',
        reasoningEffort: 'medium' as const,
      },
      medium: {
        name: process.env.OPENAI_MODEL_MEDIUM || 'gpt-5-mini',
        reasoningEffort: 'medium' as const,
      },
      large: {
        name: process.env.OPENAI_MODEL_LARGE || 'gpt-5.2',
        reasoningEffort: 'medium' as const,
      },
    },
    delayMs: parseInt(process.env.LLM_DELAY_MS || '1000', 10),
    preassessBatchSize: 10,
    preassessContentMaxLength: 1200,
    assessContentMaxLength: 4000,
    fullAssessmentThreshold: 4,
  },
} as const
