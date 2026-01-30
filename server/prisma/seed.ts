import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedIssue {
  id: string
  name: string
  slug: string
  description: string
  promptFactors: string
  promptAntifactors: string
  promptRatings: string
  parentId: string | null
  intro: string
  evaluationIntro: string
  evaluationCriteria: string
  sourceNames: string
  makeADifference: string
}

const issues: SeedIssue[] = [
  // Top-level issues (no parent)
  {
    id: '632dac2a-3c9d-4c2f-bbd0-316860988b97',
    name: 'Existential Threats',
    slug: 'existential-threats',
    description: 'Risks of human extinction or civilizational collapse',
    promptFactors: `a) The scale of the event or development related to the existential threat in question, and the number of people significantly affected (death, major injuries, displacement, social impact, etc.).
b) Changes in social norms, policies, or international agreements specifically related to the research, development, or governance of the existential threat in question.
c) Technological advancements or innovations in areas related to the existential threat in question, including breakthroughs in AI, bioweapons, nuclear technology, asteroids, and other threats as well as their countermeasures.
d) The impact of the news on the overall trajectory of existential threats and their potential consequences for humanity's long-term future.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, involving local or isolated incidents, minor policy changes, or limited technological advancements with little to no bearing on the global landscape of the existential threat in question.
3-4: Minor impact, representing regional events, policy changes, or advancements that have limited influence on the broader landscape of the existential threat in question.
5-6: Moderate impact, reflecting notable advancements in research, technology, or governance, but not yet transformative for the global landscape of the existential threat in question.
7-8: Significant impact, involving major policy shifts, breakthroughs in capabilities, or global initiatives that have the potential to substantially shape the landscape of the existential threat in question and their implications for society.
9-10: Exceptional impact, indicating a critical turning point or event that could have far-reaching consequences for humanity's long-term future, such as the development or deployment of advanced technology, potential risks, or unprecedented global cooperation in governance and countermeasures.`,
    parentId: null,
    intro: 'There are some risks that could cause the collapse of our civilization, or even the extinction of the human race. That list includes nuclear wars, deadly pandemics, and Artificial General Intelligence. Since the potential harm is so enormous, every story that affects these risks is highly relevant for humanity and its long-term future.',
    evaluationIntro: 'We evaluate the relevance of stories in the Existential Threats category based on three criteria (more specifically formulated for each threat):',
    evaluationCriteria: JSON.stringify([
      'The scale of events that could lead to a catastrophe (like military tension or a new virus) and the number of people significantly affected (death, displacement, etc.)',
      'Changes in policies, international norms, monitoring, cooperation, and other aspects of social systems that affect the likelihood or effects of a catastrophe',
      'Technological developments that change the likelihood or effects of a catastrophe',
    ]),
    sourceNames: JSON.stringify([
      'Arms Control Association', 'Future of Life', 'UN', 'Council on Foreign Relations',
      'Pugwash Conferences', 'Future of Life AI', 'mlsafety.org', 'Apart', 'Politico',
      'The EU AI Act Newsletter', 'AI Safety China', 'Lancet Infectious Diseases',
      'Centers for Disease Control and Prevention', 'WHO',
      'Centre for the Study of Existential Risk',
    ]),
    makeADifference: JSON.stringify([
      { label: 'Career advice', url: 'https://80000hours.org/articles/existential-risks/#what-can-be-done-about-these-risks' },
      { label: 'Job board', url: 'https://jobs.80000hours.org/?refinementList%5Btags_area%5D%5B0%5D=AI%20safety%20%26%20policy&refinementList%5Btags_area%5D%5B1%5D=Biosecurity%20%26%20pandemic%20preparedness&refinementList%5Btags_area%5D%5B2%5D=Nuclear%20security' },
      { label: 'Recommended charity', url: 'https://founderspledge.com/stories/introducing-the-global-catastrophic-risks-gcr-fund' },
    ]),
  },
  {
    id: 'fdff69e0-c1ee-4c00-8e03-0e49cc071d77',
    name: 'Planet & Climate',
    slug: 'planet-climate',
    description: 'Climate change, ecological collapse, biodiversity loss, and environmental sustainability.',
    promptFactors: `a) The scale of the climate change-related or ecological event or development, and the number of people significantly affected (displacement, loss of livelihood, impact on ecosystems, species, and habitats).
b) Changes in social norms, policies, or international agreements specifically related to climate change mitigation, adaptation, ecological preservation, restoration, or management.
c) Technological advancements or innovations in areas relevant to addressing climate change or ecological conservation, such as renewable energy, carbon capture, climate resilience, restoration, or monitoring.
d) The impact of the news on the overall trajectory of global climate change, ecological collapse, and humanity's ability to mitigate, adapt, or preserve ecosystems for the long-term future.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, addressing local or isolated environmental incidents or ecological issues with little to no bearing on global climate change or ecosystems.
3-4: Minor impact, involving regional climate or ecological events, policy changes that have limited influence on global climate change efforts or the broader state of global ecosystems.
5-6: Moderate impact, representing notable advancements in climate science, technology, ecological changes, species loss, habitat degradation, or international cooperation, but not yet transformative.
7-8: Significant impact, involving major policy shifts, technological breakthroughs, ecosystem collapse, or global initiatives that have the potential to substantially mitigate or adapt to climate change and shape the global ecological landscape.
9-10: Exceptional impact, indicating a critical turning point or event that could have far-reaching consequences for humanity's long-term future, such as major climate tipping points, collapse of multiple ecosystems, or unprecedented global cooperation.`,
    parentId: null,
    intro: "According to the IPCC, unmitigated climate change will become extremely destructive in a few decades. Other environmental problems include pollution and loss of biodiversity. Our food production, clean water supply, and safety are at stake. Poor countries will be hit harder than wealthy countries. Actually Relevant gives this issue area the attention it deserves.",
    evaluationIntro: 'We evaluate the relevance of stories in Planet & Climate based on three criteria:',
    evaluationCriteria: JSON.stringify([
      'The scale of the event or development, its impact on ecosystems, species, and habitats, and the number of people significantly affected by it',
      'Changes in social norms, policies, or international agreements related to climate change mitigation or adaptation, ecological preservation or restoration',
      'Technological advancements or innovations in areas relevant to addressing climate change, ecological conservation, restoration, or monitoring',
    ]),
    sourceNames: JSON.stringify([
      'Carbon Brief', 'UN', 'China Meteorological Administration', 'IPCC',
      'World Meteorological Organization', 'The Guardian', 'WWF',
      'International Union for Conservation of Nature',
      'Amazon Environmental Research Institute', 'African Centre for Biodiversity',
      'Wildlife Conservation Society India',
    ]),
    makeADifference: JSON.stringify([
      { label: 'Career advice', url: 'https://80000hours.org/problem-profiles/climate-change/#best-ways-to-help' },
      { label: 'Job board', url: 'https://jobs.80000hours.org/?refinementList%5Btags_area%5D%5B0%5D=Climate%20change' },
      { label: 'Recommended charity', url: 'https://www.givingwhatwecan.org/cause-areas/long-term-future/climate-change#3-what-are-the-most-effective-charities-and-funds-working-on-climate-change' },
    ]),
  },
  {
    id: '19ae5912-2bcb-49f1-9427-1916107403e2',
    name: 'Human Development',
    slug: 'human-development',
    description: "Events affecting people's access to basic needs, wellbeing, and opportunities.",
    promptFactors: `a) How many people are significantly affected? To be significantly affected, people need to experience a substantial change in their basic needs (e.g. water, nutrition, shelter), human rights (e.g. education, employment opportunities, freedom from discrimination), or civil liberties (e.g. freedom of speech, political participation).
b) Changes in social, political, economic, and legal trends, norms, and systems that have an ongoing effect on people's access to basic needs, foundations of wellbeing, and opportunities
c) Technological advancements or innovations that affect access to basic needs, foundations of wellbeing, and opportunities
d) The impact of the news on the overall trajectory of human development and the achievement of the UN Sustainable Development Goals

A person is "significantly affected" if at least one of the following elements of human development is making a qualitative step up or down:
- Basic Needs
-- Nutrition and Basic Medical Care
-- Water and Sanitation
-- Shelter
-- Personal Safety
- Foundations of Wellbeing
-- Access to Basic Knowledge
-- Access to Information and Communications
-- Health and Wellness
- Opportunity
-- Personal Rights
-- Personal Freedom and Choice
-- Inclusiveness
-- Access to Advanced Education`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, impacting <10m people in a significant way
3-4: Minor impact, impacting >10m and <100m people in a significant way, representing changes in social norms and systems that have limited influence on the broader state of human development.
5-6: Moderate impact, impacting >100m and <500m people in a significant way, representing important changes in social norms and systems or technological development that create opportunities in a narrow field of human development, but not yet transformative for human development globally.
7-8: Significant impact, impacting >1bn and <3bn people in a significant way, involving major policy shifts, technological breakthroughs that change humanity's capabilities in an area of human development, or international initiatives that have the potential to substantially shape the global field of human development.
9-10: Exceptional impact, impacting >3bn in a significant way, indicating a critical turning point or event that could have far-reaching consequences for human development globally, such as a global economic collapse or unprecedented global cooperation.`,
    parentId: null,
    intro: "According to the World Bank, ~1.8bn people live on less than $3.65 per day. A large portion of the world population cannot meet basic human needs. This is not only a great injustice; it also limits humanity's potential.",
    evaluationIntro: 'We evaluate the relevance of stories in the Human Development category based on three criteria:',
    evaluationCriteria: JSON.stringify([
      "The number of people who are directly affected in terms of their basic human needs (nutrition, shelter), foundations of wellbeing (healthcare, schooling), and opportunities (personal rights, equal access to power)",
      "Changes in social, political, economic, and legal trends, norms, and systems that have an ongoing effect on people's access to basic needs, foundations of wellbeing, and opportunities",
      'Technological advancements or innovations that affect access to basic needs, foundations of wellbeing, and opportunities',
    ]),
    sourceNames: JSON.stringify([
      'UN', 'WHO', 'Human Rights Watch', 'UNESCO', 'World Bank', 'Oxfam',
      'Amnesty International', 'Our World in Data', 'Social Progress Imperative',
      'IISD', 'The Guardian', 'Data for India',
    ]),
    makeADifference: JSON.stringify([
      { label: 'Job board', url: 'https://jobs.80000hours.org/?refinementList%5Btags_area%5D%5B0%5D=Global%20health%20%26%20development&role-type=other&location=remote-global' },
      { label: 'Recommended charity', url: 'https://www.givewell.org/charities/top-charities' },
    ]),
  },
  {
    id: '4481cd3a-f0b2-4d42-b74d-94815b1756b0',
    name: 'Science & Technology',
    slug: 'science-technology',
    description: 'Scientific discoveries and technological advancements shaping humanity.',
    promptFactors: `a) The impact that a new understanding or technology can have on society in the short-term and long-term, considering potential implications for various issue areas.
b) The amount of progress that the story represents on the way toward a new understanding or technological ability, taking into account the current state of the field and potential advancements.
c) The level of uncertainty involved in the research and the scenarios underlying the evaluation, including potential risks, limitations, and unknowns associated with the scientific findings or technology.
d) Any implications that the new understanding or technology has on an existential threat to humanity, including misaligned AGI, nuclear war, pandemics, etc.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, addressing local or isolated scientific findings or technological advancements with little to no bearing on society or significant progress in understanding.
3-4: Minor impact, involving scientific discoveries or technological developments that have limited influence on society or represent incremental progress toward a new understanding or capability.
5-6: Moderate impact, representing notable advancements in scientific knowledge or technology with potential short-term or long-term implications for society, but not yet transformative.
7-8: Significant impact, involving major scientific breakthroughs or technological innovations that have the potential to substantially shape society or represent substantial progress toward a new understanding or capability.
9-10: Exceptional impact, indicating a critical turning point or event that could have far-reaching consequences for humanity's long-term future, such as groundbreaking scientific discoveries or disruptive technological advancements.`,
    parentId: null,
    intro: "Science and technology have allowed us to make tremendous strides in understanding the world around us, improving our quality of life, and expanding our horizons beyond what our ancestors could have imagined. They also created existential threats like pandemics, nuclear weapons, and artificial general intelligence.",
    evaluationIntro: 'We evaluate the relevance of stories in the Science & Technology category based on three criteria:',
    evaluationCriteria: JSON.stringify([
      'The impact that a new understanding or technology can have on society in the short-term and long-term (using some of the criteria of the other issue areas)',
      'The amount of progress that the story represents on the way toward such a new understanding or technological ability',
      'The level of uncertainty involved in the research and the scenarios underlying the evaluation',
    ]),
    sourceNames: JSON.stringify([
      'Science', 'Nature', 'BBC Science Focus', 'Science Magazine', 'Techcrunch',
      'The Verge', 'phys.org', 'DigiChina', 'Heise', 't3n', 'Ars Technica',
    ]),
    makeADifference: JSON.stringify([]),
  },
  {
    id: 'b9e31c9e-3ff5-468d-ba35-15e6035b74d4',
    name: 'General News',
    slug: 'general-news',
    description: "Stories that don't fit into any other category.",
    promptFactors: `a) How many people are significantly affected? To be significantly affected, people need to experience a substantial change in their basic needs (e.g. water, nutrition, shelter), human rights (e.g. education, employment opportunities, freedom from discrimination), or civil liberties (e.g. freedom of speech, political participation).
b) Changes in social norms and systems, like attitudes toward climate change, the international patent system, the healthcare system in India, or the movie industry. Mention the specific norms and systems and what the changes are.
c) Technological developments in areas that are likely to shape humanity's short-term and mid-term future, including AI, space exploration, or new approaches for eliminating illnesses.
d) Any changes in the likelihood that humanity goes extinct in the next 100 years, e.g., through nuclear wars, a misaligned AGI, a major bio-hazard, or an asteroid hitting Earth. Specify why exactly the probability goes up or down.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, affecting 10m people in a significant way
3-4: Minor impact, affecting 10-100m people in a significant way, a narrow of superficial change in a social, political, economic, or legal norm or system, an important technological advancement affecting a narrow issue
5-6: Moderate impact, affecting >100m people in a significant way, a significant and broad change in social, political, economic, or legal norms or systems, significant technological developments affecting important issues.
7-8: Significant impact, affecting >1bn people, major implications for social, political, economic, or legal norms and systems on an international level, technological break-through in important areas, a small change in the probability that humanity goes extinct in the next 200 years.
9-10: Exceptional impact, affecting >3bn people, truly transformative effects on social, political, economic, or legal norms and systems, major breakthrough or change with far-reaching consequences for humanity's long-term future and probability of survival.`,
    parentId: null,
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: JSON.stringify([]),
    sourceNames: JSON.stringify([]),
    makeADifference: JSON.stringify([]),
  },

  // Child issues (under Existential Threats)
  {
    id: '91c62c33-6c51-42cf-9528-bbc2c441b3b2',
    name: 'Artifical Intelligence',
    slug: 'artificial-intelligence',
    description: 'The development of artificial general intelligence (AGI) with misaligned goals or lack of safety measures could lead to unpredictable and potentially harmful consequences for humanity.',
    promptFactors: `a) The scale of the AI-related event or development, and the number of people significantly affected (job displacement, social impact, etc.).
b) Changes in social norms, policies, or international agreements specifically related to AI research, development, or governance.
c) Technological advancements or innovations in AI, including breakthroughs in algorithms, hardware, or applications.
d) The impact of the news on the overall trajectory of AI development and its potential consequences for humanity's long-term future.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, involving local AI applications or isolated developments with little to no bearing on the global AI landscape.
3-4: Minor impact, representing regional AI events, policy changes, or advancements that have limited influence on the broader AI ecosystem.
5-6: Moderate impact, reflecting notable advancements in AI research, technology, or ethics, but not yet transformative for the global AI landscape.
7-8: Significant impact, involving major policy shifts, breakthroughs in AI capabilities, or global initiatives that have the potential to substantially shape the AI landscape or its implications for society.
9-10: Exceptional impact, indicating a critical turning point or event that could have far-reaching consequences for humanity's long-term future, such as the development of highly advanced AI systems, potential risks, or unprecedented global cooperation in AI governance.`,
    parentId: '632dac2a-3c9d-4c2f-bbd0-316860988b97',
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: JSON.stringify([]),
    sourceNames: JSON.stringify([]),
    makeADifference: JSON.stringify([]),
  },
  {
    id: '2e42f8a9-aae6-49df-988d-e564af0e934b',
    name: '(Nuclear) War',
    slug: 'nuclear-war',
    description: 'The use of nuclear weapons can lead to widespread destruction, long-term ecological damage, and potentially the end of human civilization.',
    promptFactors: `a) The scale of the conflict or tensions between major military powers and the number of people significantly affected (death, major injuries, displacement, etc.).
b) Changes in geopolitical dynamics, military strategy, or policies specifically related to nuclear war and conflicts between major military powers.
c) Technological developments in nuclear or military capabilities that could alter the balance of power or escalate tensions.
d) The impact of the news on the likelihood of a nuclear war or large-scale military conflict in the future.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, addressing minor disputes or incidents that don't significantly escalate tensions between major military powers.
3-4: Minor impact, involving limited military engagements or diplomatic disputes between major military powers without an immediate risk of nuclear conflict.
5-6: Moderate impact, representing major developments in military strategy, technology, or international relations that could affect the balance of power or increase the likelihood of conflict.
7-8: Significant impact, involving actions or events that have the potential to escalate into a large-scale conflict or directly increase the risk of nuclear war.
9-10: Exceptional impact, indicating a major crisis or event that could have far-reaching consequences for humanity's long-term future, such as an imminent threat of nuclear war or significant arms control breakthroughs.`,
    parentId: '632dac2a-3c9d-4c2f-bbd0-316860988b97',
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: JSON.stringify([]),
    sourceNames: JSON.stringify([]),
    makeADifference: JSON.stringify([]),
  },
  {
    id: 'bc8b69a1-97f3-40bd-b787-5e43e4e45b95',
    name: 'Pandemics',
    slug: 'pandemics',
    description: 'Natural or engineered pathogens pose a significant threat, as evidenced by the COVID-19 pandemic. The rapid spread of infectious diseases can lead to high mortality rates and destabilize societies.',
    promptFactors: `a) The scale of the outbreak or the number of people significantly affected by the infectious disease (death, major illness, etc.). Mention the order of magnitude, like tens of millions of people.
b) Changes in healthcare systems, policies, or social norms specifically related to pandemic response and prevention. Mention the specific systems and policies and what the changes are.
c) Scientific or technological developments in areas related to infectious diseases, such as new vaccines, treatments, or diagnostics.
d) The impact of the news on the likelihood of future pandemics or the global management of infectious diseases.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, localized outbreak affecting a small number of people or none at all.
3-4: Minor impact, affecting a relatively small group of people or addressing a narrow issue related to pandemic response or prevention.
5-6: Moderate impact, affecting a larger group of people, having implications for regional or global health policies, or advancing scientific understanding of infectious diseases.
7-8: Significant impact, affecting a substantial portion of the global population, leading to major changes in healthcare systems or practices, or resulting in important advancements in pandemic prevention or response.
9-10: Exceptional impact, representing a major breakthrough or change with far-reaching consequences for humanity's long-term future, such as the development of a highly effective vaccine, treatment, or pandemic prevention strategy.`,
    parentId: '632dac2a-3c9d-4c2f-bbd0-316860988b97',
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: JSON.stringify([]),
    sourceNames: JSON.stringify([]),
    makeADifference: JSON.stringify([]),
  },
  {
    id: 'e0670873-44b3-48ff-87c8-a7acf359888e',
    name: 'Bioterrorism and Bioweapons',
    slug: 'bioterrorism-and-bioweapons',
    description: 'The misuse of biotechnology for malicious purposes, such as creating lethal pathogens or genetically modifying organisms, could have disastrous consequences.',
    promptFactors: `a) The scale of the bioterrorism-related event or development, and the number of people significantly affected (death, major injuries, etc.).
b) Changes in social norms, policies, or international agreements specifically related to bioweapons research, development, or governance.
c) Technological advancements or innovations in bioweapons and countermeasures, including breakthroughs in biotechnology or detection methods.
d) The impact of the news on the overall trajectory of bioweapons development and its potential consequences for humanity's long-term future.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, involving local or isolated bioterrorism-related incidents or concerns with little to no bearing on the global landscape.
3-4: Minor impact, representing regional bioweapons events, policy changes, or advancements that have limited influence on the broader bioterrorism landscape.
5-6: Moderate impact, reflecting notable advancements in biotechnology, bioweapons research, or countermeasures, but not yet transformative for the global bioterrorism landscape.
7-8: Significant impact, involving major policy shifts, breakthroughs in bioweapons capabilities, or global initiatives that have the potential to substantially shape the bioterrorism landscape and its implications for society.
9-10: Exceptional impact, indicating a critical turning point or event that could have far-reaching consequences for humanity's long-term future, such as the development or deployment of highly advanced bioweapons or unprecedented global cooperation in bioweapons governance and countermeasures.`,
    parentId: '632dac2a-3c9d-4c2f-bbd0-316860988b97',
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: JSON.stringify([]),
    sourceNames: JSON.stringify([]),
    makeADifference: JSON.stringify([]),
  },
  {
    id: 'ba835611-a442-4bf2-a3b3-4718cee6c26a',
    name: 'Natural Catastrophes',
    slug: 'natural-catastrophes',
    description: 'Asteroid impact, super-volcanic eruptions, Solar flares or geomagnetic storms',
    promptFactors: `a) The scale, severity, and potential consequences of the event or development on the global population, infrastructure, and environment.
b) Changes in scientific understanding, public awareness, or policies related to asteroid impact, super-volcanic eruptions, or solar flares/geomagnetic storms.
c) Technological advancements or innovations that improve the ability to predict, prevent, or mitigate the effects of such events.
d) The impact of the news on the overall trajectory of these issues and their potential consequences for humanity's long-term future.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, involving small-scale, localized events with negligible effects on humanity or the global environment.
3-4: Minor impact, representing events or developments with regional consequences but limited influence on the overall state of humanity or the global environment.
5-6: Moderate impact, reflecting events or discoveries that have the potential to affect a larger portion of the global population or environment, but not yet transformative.
7-8: Significant impact, involving major events or developments that could have substantial effects on the global population, environment, or infrastructure.
9-10: Exceptional impact, indicating a critical event or discovery that could have far-reaching consequences for humanity's long-term future, such as imminent asteroid impact, massive volcanic eruptions, or extreme solar storms.`,
    parentId: '632dac2a-3c9d-4c2f-bbd0-316860988b97',
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: JSON.stringify([]),
    sourceNames: JSON.stringify([]),
    makeADifference: JSON.stringify([]),
  },
  {
    id: '71cd38ae-73fb-4363-b6ef-98a0d6651498',
    name: 'Global Governance Failure',
    slug: 'global-governance-failure',
    description: 'The inability of political institutions to manage global challenges effectively, like climate change and AI development, could exacerbate existing problems and create new risks.',
    promptFactors: `a) The scale of the governance issue or development, and the extent of its impact on global cooperation, institutions, and policymaking.
b) Changes in social norms, policies, or international agreements specifically related to the effectiveness and stability of global governance.
c) Technological advancements or innovations that influence the effectiveness of global governance or the ability of political institutions to manage global challenges.
d) The impact of the news on the overall trajectory of global governance failure and its potential consequences for humanity's long-term future.`,
    promptAntifactors: '',
    promptRatings: `1-2: Minimal or no impact, involving localized or minor governance issues with little to no bearing on the broader global governance landscape.
3-4: Minor impact, representing regional governance failures or policy changes that have limited influence on the overall effectiveness of global governance.
5-6: Moderate impact, reflecting significant failures or challenges in global governance, but not yet transformative for the global governance landscape.
7-8: Significant impact, involving major policy shifts, international disputes, or cooperation breakdowns that have the potential to substantially shape the effectiveness of global governance.
9-10: Exceptional impact, indicating a critical turning point or event that could have far-reaching consequences for humanity's long-term future, such as the collapse of global governance institutions or unprecedented global cooperation in addressing shared challenges.`,
    parentId: '632dac2a-3c9d-4c2f-bbd0-316860988b97',
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: JSON.stringify([]),
    sourceNames: JSON.stringify([]),
    makeADifference: JSON.stringify([]),
  },
]

async function main() {
  console.log('Seeding database...')

  // Seed top-level issues first (no parent), then child issues
  const topLevel = issues.filter(i => i.parentId === null)
  const children = issues.filter(i => i.parentId !== null)

  for (const issue of [...topLevel, ...children]) {
    await prisma.issue.upsert({
      where: { slug: issue.slug },
      update: {
        name: issue.name,
        description: issue.description,
        promptFactors: issue.promptFactors,
        promptAntifactors: issue.promptAntifactors,
        promptRatings: issue.promptRatings,
        parentId: issue.parentId,
        intro: issue.intro,
        evaluationIntro: issue.evaluationIntro,
        evaluationCriteria: issue.evaluationCriteria,
        sourceNames: issue.sourceNames,
        makeADifference: issue.makeADifference,
      },
      create: {
        id: issue.id,
        name: issue.name,
        slug: issue.slug,
        description: issue.description,
        promptFactors: issue.promptFactors,
        promptAntifactors: issue.promptAntifactors,
        promptRatings: issue.promptRatings,
        parentId: issue.parentId,
        intro: issue.intro,
        evaluationIntro: issue.evaluationIntro,
        evaluationCriteria: issue.evaluationCriteria,
        sourceNames: issue.sourceNames,
        makeADifference: issue.makeADifference,
      },
    })
    console.log(`  Upserted issue: ${issue.name}${issue.parentId ? ' (child)' : ''}`)
  }

  console.log(`Seeded ${issues.length} issues`)

  // Create default job runs (all disabled)
  const jobs = await Promise.all([
    prisma.jobRun.upsert({
      where: { jobName: 'crawl_feeds' },
      update: {},
      create: {
        jobName: 'crawl_feeds',
        cronExpression: '0 */6 * * *',
        enabled: false,
      },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'preassess_stories' },
      update: {},
      create: {
        jobName: 'preassess_stories',
        cronExpression: '0 1,7,13,19 * * *',
        enabled: false,
      },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'assess_stories' },
      update: {},
      create: {
        jobName: 'assess_stories',
        cronExpression: '0 9,21 * * *',
        enabled: false,
      },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'select_stories' },
      update: {},
      create: {
        jobName: 'select_stories',
        cronExpression: '0 10 * * *',
        enabled: false,
      },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'publish_stories' },
      update: {},
      create: {
        jobName: 'publish_stories',
        cronExpression: '0 11 * * *',
        enabled: false,
      },
    }),
  ])

  console.log(`Seeded ${jobs.length} job runs`)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
