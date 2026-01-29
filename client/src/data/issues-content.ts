/**
 * Static content for issue pages, migrated from the WordPress site.
 * This content doesn't change often, so it's kept client-side.
 * Dynamic story listings come from the API.
 */

export interface IssueStaticContent {
  slug: string
  name: string
  intro: string
  evaluationIntro: string
  evaluationCriteria: string[]
  sources: string[]
  makeADifference: { label: string; url: string }[]
}

export const issuesContent: IssueStaticContent[] = [
  {
    slug: 'existential-threats',
    name: 'Existential Threats',
    intro:
      'There are some risks that could cause the collapse of our civilization, or even the extinction of the human race. That list includes nuclear wars, deadly pandemics, and Artificial General Intelligence. Since the potential harm is so enormous, every story that affects these risks is highly relevant for humanity and its long-term future.',
    evaluationIntro:
      'We evaluate the relevance of stories in the Existential Threats category based on three criteria (more specifically formulated for each threat):',
    evaluationCriteria: [
      'The scale of events that could lead to a catastrophe (like military tension or a new virus) and the number of people significantly affected (death, displacement, etc.)',
      'Changes in policies, international norms, monitoring, cooperation, and other aspects of social systems that affect the likelihood or effects of a catastrophe',
      'Technological developments that change the likelihood or effects of a catastrophe',
    ],
    sources: [
      'Arms Control Association',
      'Future of Life',
      'UN',
      'Council on Foreign Relations',
      'Pugwash Conferences',
      'Future of Life AI',
      'mlsafety.org',
      'Apart',
      'Politico',
      'The EU AI Act Newsletter',
      'AI Safety China',
      'Lancet Infectious Diseases',
      'Centers for Disease Control and Prevention',
      'WHO',
      'Centre for the Study of Existential Risk',
    ],
    makeADifference: [
      { label: 'Career advice', url: 'https://80000hours.org/articles/existential-risks/#what-can-be-done-about-these-risks' },
      { label: 'Job board', url: 'https://jobs.80000hours.org/?refinementList%5Btags_area%5D%5B0%5D=AI%20safety%20%26%20policy&refinementList%5Btags_area%5D%5B1%5D=Biosecurity%20%26%20pandemic%20preparedness&refinementList%5Btags_area%5D%5B2%5D=Nuclear%20security' },
      { label: 'Recommended charity', url: 'https://founderspledge.com/stories/introducing-the-global-catastrophic-risks-gcr-fund' },
    ],
  },
  {
    slug: 'planet-climate',
    name: 'Planet & Climate',
    intro:
      'According to the IPCC, unmitigated climate change will become extremely destructive in a few decades. Other environmental problems include pollution and loss of biodiversity. Our food production, clean water supply, and safety are at stake. Poor countries will be hit harder than wealthy countries. Actually Relevant gives this issue area the attention it deserves.',
    evaluationIntro:
      'We evaluate the relevance of stories in Planet & Climate based on three criteria:',
    evaluationCriteria: [
      'The scale of the event or development, its impact on ecosystems, species, and habitats, and the number of people significantly affected by it',
      'Changes in social norms, policies, or international agreements related to climate change mitigation or adaptation, ecological preservation or restoration',
      'Technological advancements or innovations in areas relevant to addressing climate change, ecological conservation, restoration, or monitoring',
    ],
    sources: [
      'Carbon Brief',
      'UN',
      'China Meteorological Administration',
      'IPCC',
      'World Meteorological Organization',
      'The Guardian',
      'WWF',
      'International Union for Conservation of Nature',
      'Amazon Environmental Research Institute',
      'African Centre for Biodiversity',
      'Wildlife Conservation Society India',
    ],
    makeADifference: [
      { label: 'Career advice', url: 'https://80000hours.org/problem-profiles/climate-change/#best-ways-to-help' },
      { label: 'Job board', url: 'https://jobs.80000hours.org/?refinementList%5Btags_area%5D%5B0%5D=Climate%20change' },
      { label: 'Recommended charity', url: 'https://www.givingwhatwecan.org/cause-areas/long-term-future/climate-change#3-what-are-the-most-effective-charities-and-funds-working-on-climate-change' },
    ],
  },
  {
    slug: 'human-development',
    name: 'Human Development',
    intro:
      'According to the World Bank, ~1.8bn people live on less than $3.65 per day. A large portion of the world population cannot meet basic human needs. This is not only a great injustice; it also limits humanity\'s potential.',
    evaluationIntro:
      'We evaluate the relevance of stories in the Human Development category based on three criteria:',
    evaluationCriteria: [
      'The number of people who are directly affected in terms of their basic human needs (nutrition, shelter), foundations of wellbeing (healthcare, schooling), and opportunities (personal rights, equal access to power)',
      'Changes in social, political, economic, and legal trends, norms, and systems that have an ongoing effect on people\'s access to basic needs, foundations of wellbeing, and opportunities',
      'Technological advancements or innovations that affect access to basic needs, foundations of wellbeing, and opportunities',
    ],
    sources: [
      'UN',
      'WHO',
      'Human Rights Watch',
      'UNESCO',
      'World Bank',
      'Oxfam',
      'Amnesty International',
      'Our World in Data',
      'Social Progress Imperative',
      'IISD',
      'The Guardian',
      'Data for India',
    ],
    makeADifference: [
      { label: 'Job board', url: 'https://jobs.80000hours.org/?refinementList%5Btags_area%5D%5B0%5D=Global%20health%20%26%20development&role-type=other&location=remote-global' },
      { label: 'Recommended charity', url: 'https://www.givewell.org/charities/top-charities' },
    ],
  },
  {
    slug: 'science-technology',
    name: 'Science & Technology',
    intro:
      'Science and technology have allowed us to make tremendous strides in understanding the world around us, improving our quality of life, and expanding our horizons beyond what our ancestors could have imagined. They also created existential threats like pandemics, nuclear weapons, and artificial general intelligence.',
    evaluationIntro:
      'We evaluate the relevance of stories in the Science & Technology category based on three criteria:',
    evaluationCriteria: [
      'The impact that a new understanding or technology can have on society in the short-term and long-term (using some of the criteria of the other issue areas)',
      'The amount of progress that the story represents on the way toward such a new understanding or technological ability',
      'The level of uncertainty involved in the research and the scenarios underlying the evaluation',
    ],
    sources: [
      'Science',
      'Nature',
      'BBC Science Focus',
      'Science Magazine',
      'Techcrunch',
      'The Verge',
      'phys.org',
      'DigiChina',
      'Heise',
      't3n',
      'Ars Technica',
    ],
    makeADifference: [],
  },
]

export function getIssueContent(slug: string): IssueStaticContent | undefined {
  return issuesContent.find((i) => i.slug === slug)
}
