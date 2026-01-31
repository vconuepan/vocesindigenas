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
    delayMs: parseInt(process.env.LLM_DELAY_MS || '500', 10),
    preassessBatchSize: 10,
    preassessContentMaxLength: 1200,
    assessContentMaxLength: 4000,
    fullAssessmentThreshold: 4,
  },
  selection: {
    maxGroupSize: parseInt(process.env.SELECT_MAX_GROUP_SIZE || '20', 10),
  },
  concurrency: {
    preassess: parseInt(process.env.CONCURRENCY_PREASSESS || '10', 10),
    assess: parseInt(process.env.CONCURRENCY_ASSESS || '10', 10),
    select: parseInt(process.env.CONCURRENCY_SELECT || '10', 10),
  },
} as const
