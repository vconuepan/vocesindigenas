interface StoryForPreassess {
  id: string
  title: string
  content: string
}

interface Guidelines {
  factors: string
  antifactors: string
  ratings: string
}

function buildGuidelinesXml(g: Guidelines): string {
  return `<FACTORS>\n${g.factors}\n</FACTORS>\n\n<TOPIC-SPECIFIC LIMITING FACTORS>\n${g.antifactors}\n</TOPIC-SPECIFIC LIMITING FACTORS>\n\n<CRITERIA>\n${g.ratings}\n</CRITERIA>`
}

function containsChineseCharacters(str: string): boolean {
  return /\p{Script=Han}/u.test(str)
}

export function buildPreassessPrompt(
  stories: StoryForPreassess[],
  guidelines: Guidelines,
): string {
  let query = '<ARTICLES>'

  let capacity = 10
  for (const story of stories) {
    if (containsChineseCharacters(story.content)) {
      capacity -= 1.5
    } else {
      capacity -= 1
    }
    if (capacity > 0) {
      query += `\n\n-----\nArticle ID: ${story.id}`
      query += `\nTitle: ${story.title}`
      query += `\n${story.content.substring(0, 1200)} ...`
    }
  }

  const guidelinesXml = buildGuidelinesXml(guidelines)

  query += `\n</ARTICLES>`
    + `\n\nAnalyze the articles and rate their relevance for humanity and its long-term future. Follow this prompt exactly as written.`
    + `\nUse the following guidelines:`
    + `\n\n${guidelinesXml}`
    + `\n\nThe relevance ratings should be conservative. Only about 20% (one in five) of the articles should get a rating 5 or higher.`
    + `\n\nPlease send the response in the following format:`
    + `\n\n- For each article, send a conservative relevance rating from 1-10. Provide just a single number, without any prefix, suffix, or explanation.`
    + `\n- For each article, choose from one of the following 'emotion tags' based on how the article will affect readers. These five are the only options. Provide just the emotion tag, without any prefix, suffix, or explanation.`
    + `\n-- Uplifting: stories that are positive or inspiring (e.g. a positive trend or a useful new technology)`
    + `\n-- Surprising: stories that are unexpected or counterintuitive (e.g. an effect that is the opposite of what you would expect or a relationship between two things that you wouldn't have thought of)`
    + `\n-- Frustrating: stories that are negative or disappointing (e.g. a policy change that harms the environment)`
    + `\n-- Scary: stories that are frightening (e.g. increased existential risks, wars, etc.)`
    + `\n-- Calm: stories that don't have a strong association with any of the other emotion tags`
    + `\n\nFollow this structure exactly:`
    + `\n\n<STRUCTURE>`
    + `\nArticle #[ID]: [rating], [emotion tag]`
    + `\nArticle #[ID]: [rating], [emotion tag]`
    + `\nArticle #[ID]: [rating], [emotion tag]`
    + `\n</STRUCTURE>`

  return query
}

export function buildAssessPrompt(
  title: string,
  content: string,
  publisher: string,
  url: string,
  guidelines: Guidelines,
): string {
  const guidelinesXml = buildGuidelinesXml(guidelines)
  const truncatedContent = content.substring(0, 4000)

  return `<ARTICLE>`
    + `Title: ${title}\n`
    + `Publisher: ${publisher}\n`
    + `URL: ${url}\n\n`
    + truncatedContent
    + `\n</ARTICLE>`
    + `\n\nAnalyze the article and rate its relevance for humanity and its long-term future. Follow this prompt exactly as written.`
    + `\n\nUse the following guidelines:\n\n`
    + guidelinesXml
    + `\n\n<GENERIC LIMITING FACTORS>
There are several reasons why an article might not be as relevant for humanity as the topic of the article might suggest. If these reasons apply, be particularly conservative when analyzing the article's relevance. These are the most common reasons are:
- The article is an opinion piece, editorial, or explanatory piece (as the opinions of specific authors are rarely relevant for humanity).
- The article is about a public demand or call to action (which are rarely heard and followed).
- The article is about the publication of a report (unless it's a scientific publication. In that case, evaluate the relevance of the findings.)
- The article is click-baity or sensationalist.
- The article is about an early-stage technology or innovation.
- The article is about a product or service offered by one company (like a new device).
- The article is about an investment of <$1bn.
- The article is about a meeting or event (including high-level UN meetings).
This is not to say that articles about early-stage technologies, specific products or services, investments, and meetings or events are never relevant for humanity. If an early-stage technology, a product, a meeting, or a call to action is particularly important, do not reduce the relevance rating of the article. In other cases, even large reductions in the relevance ratings can be justified.
</GENERIC LIMITING FACTORS>

Go through these steps one by one:

<STEPS>
- Date that the article was published
-- Write the date in the format 'YYYY-MM-DD 00:00:00'.
-- If the publication date is not clear, write '1970-01-01 00:00:00'.
-- The date can be mentioned in the article or in the URL.

- Key quote from the article
-- Identify the most important exact quote from the article, including the sentence said and the person who said it.
-- If the article doesn't contain a quote, identify a sentence from the article that highlights a key point.
-- If the article isn't in English, translate the quote into English.

- Keywords for SEO
-- Write 3-5 keywords that are relevant for the article.
-- The first keyword should be the most important 'focus keyword'.
-- Be specific. Include the names of places, policies, events, organizations, etc.
-- Write the keywords in lowercase and separate them with commas.

- A short summary of the key information in the article
-- The summary should have a length of 40-70 words.
-- Include the focus keyword in the summary.
-- Include the key quote that you identified in the previous step. Write the key quote in quotation marks. Mention the name of the person who said the quote, or the name of the publication in case the key quote is a sentence from the author.
--- Bad example: 'The FAO Deputy Director emphasized the fund's importance, stating that it places agrifood systems at the center of the challenge.'
Good example: '"The fund places agrifood systems at the center of the challenge," said FAO Deputy Director Maria Helena Semedo.'
--- Bad example: 'The most significant point is the unprecedented use of Ukrainian drones in large numbers, as the quote suggests.'
Good example: 'Guardian: "Never have drones been used so much in a military conflict."'
-- Make sure that the rest of the summary is not overly redundant with the key quote and the title (see below).

- Detailed bullet points that explain why the article is relevant for humanity
-- Write the bullet points in order of importance. The first bullet point should be the <FACTOR> that contributes most to the article's relevance. This will be the 'key factor' with the greatest weight in the relevance analysis.
-- Write a total of 4 incredibly detailed bullet points relating to the <FACTORS> (including the key factor).
-- A <FACTOR> can have several bullet points associated with it. For example, if one <FACTOR> is changes in social systems, you could write two bullet points about changes in two different social systems.
-- Only include <FACTORS> that increase the relevance of the article. If a <FACTOR> does not increase the relevance, write another bullet point on a <FACTOR> that does. (Example: If only two <FACTORS> contribute to the relevance, write four bullet points based on these two <FACTORS>.)
-- For the first part of each bullet point (before the colon), specify the <FACTOR> based on the content of the article. Don't just repeat the names of the <FACTORS>.
-- For each point, assess the relevance from the <RATING> criteria. Don't refer to the numerical ratings and don't assume that readers know the rating criteria. For example, if the fitting <RATING> criterion is '5-6: Moderate impact, reflecting notable advancements in research, technology, or governance, but not yet transformative on a global level', you could say: 'This represents a notable advancement in AI governance in Europe.'
-- Follow this structure: '[Point relating to a <FACTOR>]: [1 sentence: assessment.] [1 sentence: classification based on <RATING> conditions, including, if possible, a quantification of the impact.] [1 sentence: mechanism / context of the impact.] [1 sentence: example or further details.]'.
--- Good example: 'International cooperation: The program creates goodwill among participating states and promotes global collaboration and knowledge sharing. It also reinforces rich countries' commitment to achieving the UN Sustainable Development Goals, which is an important norm in international politics. Once established, many international norms and agreements are hard to reverse.'
--- Good example: 'Global health benefits: The entire global population benefits from the recovery of the ozone layer, as it protects against harmful ultraviolet radiation and reduces risks of skin cancer. Since UV radiation is responsible for most skin cancers, their rate would be significantly higher without the Montreal Protocol, especially in light-skinned populations.'
--- Good example: 'General purpose technology: Quantum computation that is resistant to errors could lead to more reliable quantum computing technologies, making it a notable advancement in an important, general-purpose technology. For example, more reliable quantum computing could allow clinical experiments to be fully simulated in so-called silico clinical trials, which could speed up drug development.'

- Detailed bullet points that explain why the article might not be so relevant for humanity after all
-- Take another look at the <FACTORS> that make the article relelvant (and that you analyzed in the previous section). In what ways are these factors limited or uncertain?
--- If a <FACTOR> wasn't mentioned in the previous section and didn't contribute to the relevance of the article, don't include it in this section, either.
-- Go through each of the <TOPIC-SPECIFIC LIMITING FACTORS> (if any)
-- Check if any of the <GENERIC LIMITING FACTORS> apply to this article.
-- Only include <LIMITING FACTORS> that are applicable and that reduce the relevance of the article.
-- Don't use the term '(generic/topic-specific) limiting factor' in the bullet points.

- Relevance calculation
-- Identify the key <FACTOR> that is most important for the relevance of this article.
-- Based on that key <FACTOR>, assign a relevance rating from 1-10 (integers) based on the <CRITERIA>.
--- Before you give a rating of 5 or higher: remember the <CRITERIA>. Does the key <FACTOR> really have the amount of impact that the <CRITERIA> describe for rating of 5-6? If not, choose a lower rating.
-- Check if any of the <GENERIC LIMITING FACTORS> apply. If so, decide how much they reduce the relevance rating.
--- <GENERIC LIMITING FACTORS> can reduce the relevance of the article a lot.
-- Take a look at all the remaining <FACTORS> and <LIMITING FACTORS>. Decide how much they add to or deduct from the relevance rating (given the rating <CRITERIA>).
--- Non-key <FACTORS> should only increase the relevance of the article a little, if at all.
-- Example: You give the key-factor a relevance rating of 7. You realize that the article is about a call to action (a <GENERIC LIMITING FACTOR>) that is unlikely to be heard. You choose a modifier of -3. You don't see significant changes to the relevance coming from the remaining factors. The final relevance rating is 4.
-- Example: You give the key-factor a relevance rating of 5. You notice that the article is about an early-stage technology (a <GENERIC LIMITING FACTOR>), which you value at -2. You see some additional relevance coming from the non-key <FACTORS>, but not enough to increase the relevance rating. The final relevance rating is 3.

- A conservative relevance rating from 1-10 (integers)
-- Based on the relevance calculation.
-- Respond with just a single number, without any prefix, suffix, or explanation.

- 2 detailed bullet points outlining scenarios under which the article would get a higher or lower relevance rating
-- Based on the four <FACTORS>, explain under which circumstances the article would get a higher or a lower rating.
-- Follow this structure: '- [scenario name]: [1 sentence scenario description] [1 sentence further elaboration] [if possible, assessment of probability]'
-- When generating scenarios, think creatively and use your knowledge about the world.

- Somewhat speculative relevance rating from 1-10 (integers)
-- Higher than the conservative rating but still plausible if the scenarios come true.
-- Just a single number, without any prefix, suffix, or explanation.

- A summary explaining the relevance rating for this article
-- Write 75-100 words.
-- Assume that the readers just read the summary of the article.
-- Refer to the key factor and the most important factors and anti-factors.
-- Don't refer to 'the article'. Instead, focus on the things that the article is about.
--- Bad example: 'The article is relevant because it reports on a significant legal action ...'
Good example: 'The legal action could lead to stricter climate policies in 32 countries.'
-- Include an overall, high-level assessment.
--- Good example: 'Overall, the event slows down progress toward SDG 3 in Sub-Saharan Africa but is unlikely to change the underlying positive trend'
--- Good example: 'Overall, this represents an important regional change, but not a transformative one for agriculture on a global level'.

- A title for this entire write-up
-- Take the headline of the original article into account to determine what makes this news item relevant.
-- Avoid sensationalist language.
--- Bad: 'breakthrough'
Good: 'development', 'progress', 'advance'
--- Bad: 'crisis'
Good: 'challenge', 'issue', 'problem'
--- Bad: 'revolution'
Good: 'shift', 'major change', 'significant development'
-- Mention the actual information that makes the article relevant. Be descriptive.
--- Bad example: 'New payment systems: How Russia's alternatives to SWIFT affect the global economy'
Good example: 'New payment systems: Russia's alternatives to SWIFT signal a shift toward more fragmented financial infrastructure'
--- Bad example: 'America's debt dilemma: Fed discusses fiscal challenges'
Good example: 'America's debt dilemma: Fiscal challenges threaten global stability'
-- Try to include the focus keyword in the headline.
-- If it makes sense, try to use a number in the headline.
-- If it makes the headline stronger, you can use the key quote (or parts thereof).
-- Split the headline in two parts, separated by a colon.
--- Good example: 'Major shift in global politics: Brics club might get six new members'
--- Good example: 'Scientist on record low Antarctic: "Very much outside our understanding of this system"'
-- Capitalize the first word and proper nouns, and write everything else lowercase.
--- Bad example: 'Major Shift In Global Politics: Brics Club Might Get Six New Members'
Good example: 'Major shift in global politics: Brics club might get six new members'
-- Make sure that the title is not overly redundant with the quote and the short summary of the key information in the article (see above).

- A short marketing blurb for this entire write-up
-- Start the blurb with the name of the publisher.
-- Write up to 230 characters (including the name of the publisher).
-- Mention the key point of the article and the key point of your assessment.
-- Include the focus keyword.
-- If appropriate, use the key quote you identified earier.
</STEPS>

Follow these guidelines throughout your analysis:
- If you mention affected people, specify the number on a logarithmic scale ('millions', 'tens of millions', 'hundreds of millions', 'billions').
- Use your knowledge about the world beyond what is written in the original article.

Follow this structure exactly:

<STRUCTURE>
Publication date: [YYYY-MM-DD 00:00:00]

Quote: [quote translated into English, including quotation marks and attribution]

Keywords: [keywords]

Article summary: [sentence summarizing the article] [key quote with attribution]

Factors
- [Most important point relating to a <FACTOR> (the 'key factor']: [incredibly detailed statement, including 1 sentence for a general assessment, 1 sentence with a link to the <RATING> conditions (if possible with a quanitificaiton of the impact), 1 sentence about the mechanism / context of the impact, and 1 sentence with an example or further details.]
- [Second most important point relating to a <FACTOR>]: [...]
- [Third most important point relating to a <FACTOR>]: [...]
- [Fourth most important point relating to a <FACTOR>]: [...]

Limiting factors
- [Most important <GENERIC LIMITING FACTOR>, if applicable]: [...]
- [Most important limitation / uncertainty / downside regarding a <FACTOR> mentioned in the previous section]: [incredibly detailed statement, including 1 sentence for a general assessment, 1 sentence for the specific mechanism or context, and 1 sentence with an example or further details.]
- [Most important <TOPIC-SPECIFIC LIMITING FACTOR>, if applicable]: [...]

Relevance calculation
- [Most important <FACTOR> ('key factor')]: [rating 1 - 10 (remember the <CRITERIA> for a rating of 5-6: does this <FACTOR> really have that amount of impact?)]
- [Most important <GENERIC LIMITING FACTOR>]: [rating +0 - -4]
- [Other <FACTORS> and <LIMITING FACTORS> combined]: [+/- 0-2]

Conservative rating: [rating 1-10]

Scenarios
- [Scenario name]: [1 sentence scenario description] [1 sentence further elaboration] [if possible assessment of probability]
- [Scenario name]: [1 sentence scenario description] [1 sentence further elaboration] [if possible assessment of probability]
Speculative rating: [rating]

Relevance summary: [Most important <FACTOR> (in detail)]. [Supporting <FACTOR> (brief)]. [Most important <LIMITING FACTOR> (in detail)]. [Overall, high-level placement of the relevance].

Relevance title: [title in two parts separated by a colon; capitalize first word and proper nouns; the rest lowercase]

Marketing blurb: [blurb]
</STRUCTURE>

Follow these instructions no matter which language the article is in. Always respond in clear English that is easy to understand. Avoid complicated words and jargon.

Take a deep breath. Now go through the steps one by one.
`
}

interface StoryForSelect {
  id: string
  title: string
  aiSummary: string | null
  aiRelevanceReasons: string | null
  aiAntifactors: string | null
  aiRelevanceCalculation: string | null
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildSelectPrompt(
  stories: StoryForSelect[],
  toSelect: number,
): string {
  let query = ''

  for (const story of stories) {
    query += '<ARTICLE>\n'
      + `<ID>${story.id}</ID>\n`
      + `<Title>${escapeXml(story.title)}</Title>\n`
      + `<Summary>${escapeXml(story.aiSummary || '')}</Summary>\n`
      + `<Relevance>${escapeXml(story.aiRelevanceReasons || '')}</Relevance>\n`
      + `<Antifactors>${escapeXml(story.aiAntifactors || '')}</Antifactors>\n`
      + `<Calculation>${escapeXml(story.aiRelevanceCalculation || '')}</Calculation>\n`
      + '</ARTICLE>\n'
  }

  query += `\nThe articles above have been identified as relevant for humanity and its long-term future. Your job is to select the most relevant ones. Select a total of ${toSelect} articles out of the original list of ${stories.length}. Follow this prompt exactly as written.`
    + `\n\nGo through these steps one by one:

<STEPS>
Go through as many rounds as needed to select ${toSelect} articles. In each round:
1. Go through the articles one by one and identify the one that is most relevant for humanity and its long-term future.
Note the reason (concisely) for that article being the most relevant one as well as the article's ID.
2. Go through the articles again and identify the one that is least relevant for humanity and its long-term future.
Note the reason (concisely) for that article being the least relevant one as well as the article's ID.
</STEPS>

Follow these guidelines throughout your analysis:
- The relevance ratings of the articles have been estimated in isolation. When you compare the articles directly, you might find that some articles with higher ratings are actually less relevant than some articles with a lower rating.
- The article doesn't have to be relevant to humanity in the short term. Consider humanity's long-term future, including existential risks (pandemics, nuclear wars, AI, etc.) and technological capabilities.
- Sometimes, articles were mistankenly identified as relevant for humanity because of sensationalist language, references to important organizations, links to other issues that are important but not strongly affected by the story in the article itself -- or a number of other bad reasons. These are good articles to discard.

Follow this structure exactly:

<STRUCTURE>
    <THINKING>
        <ROUND 1>
            <most_relevant_reason>[reason in one sentence why one of the articles is the most relevant for humanity]</most_relevant_reason>
            <selected>[id of the selected article]</selected>
            <least_relevant_reason>[reason in one sentence why one of the articles is the least relevant for humanity]</least_relevant_reason>
            <discarded>[id of the least relevant article]</discarded>
            <remaining>[ids of the remaining articles separated by comma]</remaining>
        </ROUND 1>
        [continue with <ROUND 2>, <ROUND 3>, ... until you have selected ${toSelect} articles]
    </THINKING>
    <SELECTED ARTICLES>
        <ID>[id of the selected article]</ID>
        <ID>[id of the selected article]</ID>
        [continue until you mentioned all ${toSelect} selected articles]
    </SELECTED ARTICLES>
</STRUCTURE>

Take a deep breath. Now go through the steps one by one.
`

  return query
}
