/**
 * Maps old MySQL issue IDs to consolidated new issue slugs.
 *
 * Existential sub-categories (nuclear, pandemics, bioweapons, natural catastrophes)
 * are all merged into "existential-threats".
 * Climate Change + Ecological collapse + "Planet & Climate" merge into "planet-climate".
 */
export const OLD_ISSUE_ID_TO_SLUG: Record<number, string> = {
  1: 'general-news',
  2: 'existential-threats', // Nuclear war and major power struggles
  3: 'planet-climate', // Climate Change
  4: 'ai-technology', // Artificial Intelligence
  5: 'existential-threats', // Pandemics
  6: 'existential-threats', // Bioterrorism and bioweapons
  7: 'planet-climate', // Ecological collapse
  8: 'society-governance', // Global governance failure
  9: 'existential-threats', // Natural catastrophes
  11: 'existential-threats', // Existential threats (parent)
  12: 'science-technology', // Science & Technology
  13: 'planet-climate', // Planet & Climate
  14: 'human-development', // Human development
};

/**
 * The consolidated issues to create in Postgres.
 * promptFactors/promptAntifactors/promptRatings come from the broadest old issue.
 * These will be populated from the MySQL data during migration.
 */
export interface ConsolidatedIssue {
  slug: string;
  name: string;
  description: string;
  /** Old issue IDs that map to this consolidated issue. First ID is the "primary" source for prompts. */
  sourceOldIds: number[];
}

export const CONSOLIDATED_ISSUES: ConsolidatedIssue[] = [
  {
    slug: 'general-news',
    name: 'General News',
    description: "Stories that don't fit into any other category.",
    sourceOldIds: [1],
  },
  {
    slug: 'existential-threats',
    name: 'Existential Threats',
    description:
      'Risks of human extinction or civilizational collapse, including nuclear war, pandemics, bioweapons, and natural catastrophes.',
    sourceOldIds: [11, 2, 5, 6, 9],
  },
  {
    slug: 'planet-climate',
    name: 'Planet & Climate',
    description:
      'Climate change, ecological collapse, biodiversity loss, and environmental sustainability.',
    sourceOldIds: [13, 3, 7],
  },
  {
    slug: 'ai-technology',
    name: 'AI & Technology',
    description:
      'Artificial intelligence development, safety, governance, and societal impact.',
    sourceOldIds: [4],
  },
  {
    slug: 'society-governance',
    name: 'Society & Governance',
    description:
      'Global governance, political institutions, international cooperation, and systemic challenges.',
    sourceOldIds: [8],
  },
  {
    slug: 'science-technology',
    name: 'Science & Technology',
    description:
      'Scientific discoveries and technological advancements shaping humanity.',
    sourceOldIds: [12],
  },
  {
    slug: 'human-development',
    name: 'Human Development',
    description:
      "Events affecting people's access to basic needs, wellbeing, and opportunities.",
    sourceOldIds: [14],
  },
];
