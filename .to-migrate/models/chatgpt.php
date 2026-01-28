<?php
namespace RelevanceSpider\Models;
use Exception;

defined('ABSPATH') or die('No direct access allowed');

class ChatGPTModel {
    private $wpdb;

    public function __construct($wpdb) {
        $this->wpdb = $wpdb;
    }

    public function select_posts($posts, $fraction = 0.5, $gptModel = null, $scheduled_action = false) {
        // $posts is a WP_Query object

        $query = "";
        while ($posts->have_posts()) {
            // expand the query with an <ARTICLE> tag including the post's id, title, story_summary, and meta fields relevance_reasons, relevance_antifactors, and relevance_calculation.
            $posts->the_post();
            $id = get_the_ID();
            $title = get_the_title();
            $story_summary = get_post_meta(get_the_ID(), 'story_summary', true);
            $relevance_reasons = get_post_meta(get_the_ID(), 'relevance_reasons', true);
            $relevance_antifactors = get_post_meta(get_the_ID(), 'relevance_antifactors', true);
            $relevance_calculation = get_post_meta(get_the_ID(), 'relevance_calculation', true);
            // Check if meta values are arrays and convert them to strings if necessary
            if (is_array($relevance_reasons)) {
                $relevance_reasons = implode('\n', $relevance_reasons);
            }
            if (is_array($relevance_antifactors)) {
                $relevance_antifactors = implode('\n', $relevance_antifactors);
            }
            if (is_array($relevance_calculation)) {
                $relevance_calculation = implode('\n', $relevance_calculation);
            }

            // Build the XML output
            $query .= "<ARTICLE>\n"
                . "<ID>" . $id . "</ID>\n"
                . "<Title>" . htmlspecialchars($title, ENT_XML1, 'UTF-8') . "</Title>\n"
                . "<Summary>" . htmlspecialchars($story_summary, ENT_XML1, 'UTF-8') . "</Summary>\n"
                . "<Relevance>" . htmlspecialchars($relevance_reasons, ENT_XML1, 'UTF-8') . "</Relevance>\n"
                . "<Antifactors>" . htmlspecialchars($relevance_antifactors, ENT_XML1, 'UTF-8') . "</Antifactors>\n"
                . "<Calculation>" . htmlspecialchars($relevance_calculation, ENT_XML1, 'UTF-8') . "</Calculation>\n"
                . "</ARTICLE>\n";
        }
        // Reset post data
        wp_reset_postdata();

        // Select $fraction of the posts, rounded up
        $to_select = ceil($posts->post_count * $fraction);

        $query .= "\nThe articles above have been identified as relevant for humanity and its long-term future. Your job is to select the most relevant ones. Select a total of " . $to_select . " articles out of the original list of " . $posts->post_count . ". Follow this prompt exactly as written."
               . "\n\nGo through these steps one by one:

<STEPS>
Go through as many rounds as needed to select " . $to_select . " articles. In each round:
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
        [continue with <ROUND 2>, <ROUND 3>, ... until you have selected " . $to_select . " articles]
    </THINKING>
    <SELECTED ARTICLES>
        <ID>[id of the selected article]</ID>
        <ID>[id of the selected article]</ID>
        [continue until you mentioned all " . $to_select . " selected articles]
    </SELECTED ARTICLES>
</STRUCTURE>

Take a deep breath. Now go through the steps one by one.
";

        $response = $this->query($query, 2500, 0.1, $gptModel, $scheduled_action);
        if($scheduled_action) {
            echo $response . "\n\n";
        }

        // extract the selected ids from the response (in the <SELECTED ARTICLES> section)
        $selected_ids = array();
        
        try {
            $selected_articles_pos = strpos($response, "<SELECTED ARTICLES>");
            $selected_articles_end_pos = strpos($response, "</SELECTED ARTICLES>");
            if ($selected_articles_pos !== false && $selected_articles_end_pos !== false) {
                $selected_articles_str = trim(substr($response, $selected_articles_pos + strlen("<SELECTED ARTICLES>"), $selected_articles_end_pos - $selected_articles_pos - strlen("<SELECTED ARTICLES>")));
                preg_match_all('/<ID>(\d+)<\/ID>/', $selected_articles_str, $matches);
                $selected_ids = $matches[1];
            }
        } catch(Exception $e) {
            \error_log("Error: " . $e->getMessage());
        }

        return $selected_ids;
    }

    public function assess_relevance($title, $content, $publisher, $url, $guidelines, $gptModel = null, $scheduled_action = false) {

/*
Relevance calculation
- Identify the <FACTOR> that is most important for the relevance of this article.
- Based on that <FACTOR>, assign a relevance rating from 1-10 (integers) based on the <CRITERIA>.
- Decide how much the other <FACTORS> add to the relevance rating. Add 0-2 points (integers).
-- These other <FACTORS> mustn't increase the relevance rating beyond 8. For example, if the most important <FACTOR> has a relevance rating of 7, other <FACTORS> can only add 0-1 points.
- Identify the <LIMITING FACTOR> that is most important for the relevance of this article.
- Based on that <LIMITING FACTOR>, deduct 0-5 points from the relevance rating (integers).
- Decide how much the other <LIMITING FACTORS> deduct from the relevance rating. Deduct 0-3 points (integers).
*/

        $query = "<ARTICLE>"
            . "Title: " . $title . "\n" 
            . "Publisher: " . $publisher . "\n"
            . "URL: " . $url . "\n\n"
            . substr($content, 0, 4000)
            . "\n</ARTICLE>"
            . "\n\nAnalyze the article and rate its relevance for humanity and its long-term future. Follow this prompt exactly as written."
            . "\n\nUse the following guidelines:\n\n"
            . $guidelines
            . "\n\n<GENERIC LIMITING FACTORS>
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
Good example: '\"The fund places agrifood systems at the center of the challenge,\" said FAO Deputy Director Maria Helena Semedo.'
--- Bad example: 'The most significant point is the unprecedented use of Ukrainian drones in large numbers, as the quote suggests.'
Good example: 'Guardian: \"Never have drones been used so much in a military conflict.\"'
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
Good example: 'New payment systems: Russia’s alternatives to SWIFT signal a shift toward more fragmented financial infrastructure'
--- Bad example: 'America's debt dilemma: Fed discusses fiscal challenges'
Good example: 'America's debt dilemma: Fiscal challenges threaten global stability'
-- Try to include the focus keyword in the headline.
-- If it makes sense, try to use a number in the headline.
-- If it makes the headline stronger, you can use the key quote (or parts thereof).
-- Split the headline in two parts, separated by a colon.
--- Good example: 'Major shift in global politics: Brics club might get six new members'
--- Good example: 'Scientist on record low Antarctic: “Very much outside our understanding of this system“'
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
";

        return $this->query($query, 1000, 0.3, $gptModel, $scheduled_action);
    }



    /*
     * get only the conservative ratings as a pre-screening
     */
    public function preassess_relevance($stories, $guidelines, $gptModel = null, $scheduled_action = false) {
        $query = "<ARTICLES>";
        
        // Can only pack so many articles in one query
        $gptModel = $this->confirmGPTModel($gptModel);
        $query_capacity = 10;
        foreach($stories as $story) {
            if ($this->containsChineseCharacters($story->content)) {
                $query_capacity -= 1.5;
            } else {
                $query_capacity -= 1;
            }
            if($query_capacity > 0) {
                $query .= "\n\n-----\nArticle ID: " . $story->id;
                $query .= "\nTitle: " . $story->title;
                $query .= "\n" . substr($story->content, 0, 1200) . " ...";
            }
        }

        $query .= "\n</ARTICLES>"
            . "\n\nAnalyze the articles and rate their relevance for humanity and its long-term future. Follow this prompt exactly as written."
            . "\nUse the following guidelines:"
            . "\n\n" . $guidelines
            . "\n\nThe relevance ratings should be conservative. Only about 20% (one in five) of the articles should get a rating 5 or higher."
            . "\n\nPlease send the response in the following format:" 
            . "\n\n- For each article, send a conservative relevance rating from 1-10. Provide just a single number, without any prefix, suffix, or explanation."
            . "\n- For each article, choose from one of the following 'emotion tags' based on how the article will affect readers. These five are the only options. Provide just the emotion tag, without any prefix, suffix, or explanation."
            . "\n-- Uplifting: stories that are positive or inspiring (e.g. a positive trend or a useful new technology)"
            . "\n-- Surprising: stories that are unexpected or counterintuitive (e.g. an effect that is the opposite of what you would expect or a relationship between two things that you wouldn't have thought of)"
            . "\n-- Frustrating: stories that are negative or disappointing (e.g. a policy change that harms the environment)"
            . "\n-- Scary: stories that are frightening (e.g. increased existential risks, wars, etc.)"
            . "\n-- Calm: stories that don't have a strong association with any of the other emotion tags"
            . "\n\nFollow this structure exactly:"
            . "\n\n<STRUCTURE>"
            . "\nArticle #[ID]: [rating], [emotion tag]"
            . "\nArticle #[ID]: [rating], [emotion tag]"
            . "\nArticle #[ID]: [rating], [emotion tag]"
            . "\n</STRUCTURE>";

        // \error_log("Query: " . $query);

        try {
            $response = $this->query($query, 200, 0.1, $gptModel, $scheduled_action);
            $story_ratings = $this->get_preratings_from_response($response);
        } catch(Exception $e) {
            \error_log("Error: " . $e->getMessage());
            $story_ratings = array();
        }
        return $story_ratings;        
    }

    private function containsChineseCharacters($str) {
        return preg_match('/\p{Script=Han}/u', $str);
    }

    private function get_preratings_from_response($response) {
        $result_array = array();

        // Split the input string by line
        $lines = explode("\n", $response);

        foreach ($lines as $line) {
            // Use a regular expression to extract the article number, rating, and emotion tag
            if (preg_match('/Article #(\d+): (\d+), (\w+)/', $line, $matches)) {
                $result_array[(int)$matches[1]] = array(
                    'rating_low' => (int)$matches[2],
                    'emotion_tag' => $matches[3]
                );
            }
        }

        return $result_array;
    }

    public function get_publication_date_from_response($text) {
        return $this->get_oneliner_from_response("Publication date", $text);
    }
    public function get_story_summary_from_response($text) {
        return $this->get_oneliner_from_response("Article summary", $text);
    }
    public function get_story_quote_from_response($text) {
        return $this->get_oneliner_from_response("Quote", $text);
    }
    public function get_relevance_summary_from_response($text) {
        return $this->get_oneliner_from_response("Relevance summary", $text);
    }
    public function get_title_from_response($text) {
        return $this->get_oneliner_from_response("Relevance title", $text);
    }
    public function get_marketing_blurb_from_response($text) {
        return $this->get_oneliner_from_response("Marketing blurb", $text);
    }    
    public function get_keywords_from_response($text) {
        return $this->get_oneliner_from_response("Keywords", $text);
    }    
    private function get_oneliner_from_response($section, $text) {
        $pattern = '/' . $section . ': (.+?)(?:\n|$)/s';
        preg_match($pattern, $text, $matches);
        return $matches[1] ?? '';
    }

    public function get_rating_low_from_response($text) {
        return $this->get_number_from_response("Conservative rating", $text);
    }
    public function get_rating_high_from_response($text) {
        return $this->get_number_from_response("Speculative rating", $text);
    }
    private function get_number_from_response($section, $text) {
        $pattern = '/' . $section . ':\s+(\d+)/';
        if (preg_match($pattern, $text, $matches)) {
            return (int)$matches[1];
        }
        return 0;
    }

    public function get_reasons_from_response($text) {
        return $this->get_bulletpoints_from_response("Factors", $text);
    }
    public function get_antifactors_from_response($text) {
        return $this->get_bulletpoints_from_response("Limiting factors", $text);
    }
    public function get_calculation_from_response($text) {
        return $this->get_bulletpoints_from_response("Relevance calculation", $text);
    }
    public function get_scenarios_from_response($text) {
        return $this->get_bulletpoints_from_response("Scenarios", $text);
    }
    private function get_bulletpoints_from_response($section_title, $text) {
        $bullet_points = '';
        $section_pos = strpos($text, $section_title);
        $section_end_pos = strpos($text, "\n\n", $section_pos);

        if ($section_pos !== false && $section_end_pos !== false) {
            $bullet_points_str = trim(substr($text, $section_pos + strlen($section_title), $section_end_pos - $section_pos - strlen($section_title)));
            preg_match_all('/^- (.+)/m', $bullet_points_str, $matches);
            $bullet_points = $matches[1];
        }
        return $bullet_points;
    }



    /*          PODCAST          */

    public function generate_podcast($post_strings = array()) {
        $query = "";
        $max_tokens = 200;

        foreach($post_strings as $post_string) {
            $query .= "\n\n" . $post_string;
            $max_tokens += 350;
        }

        $query .= "\n\nWrite with the expertise of a journalist, editor, and podcast host. Your job is to turn summaries and relevance analyses of news stories into a cohesive script for a news podcast that is engaging and easy to follow.
Please write a script with the following elements:

- Intro
-- Welcome the listeners to the 'Actually Relevant Podcast'.
-- Explain that Actually Relevant evaluated hundreds of stories this week on how important they are for humanity. The podcast highlights the most relevant ones.
-- Introduce yourself in a light-hearted way as an AI-generated voice.

- Sections (one for each category). In each section:
-- Transition to the new category.
-- For each story within the category:
--- Adjust the summary of the original story to this podcast format. Mention who published the original article.
--- Adjust the relevance analysis for the story to this podcast format.

Group the following categories under their parent category 'Existential Risks'. Only accounce the section 'Existential Risks' and not the subcategories.
- Pandemics
- Nuclear War
- Artificial Intelligence
- Natural catastrophes

- Outro
-- Mention that Actually Relevant is still in a prototype phase and that we're eager to receive feedback.
-- Thank the listeners for listening.

Make sure to include all the <STORIES> mentioned above.

Strike a tone that is professional, but less formal than traditional news shows. The podcast should be engaging and easy to follow. Keep sentences short, with 12 words as the maximum lenght. Also, keep the language simple. In particular, avoid academic terminology.

Remember that the script will be read out loud, word by word, by a text-to-voice service that cannot distinguish between content and other parts of the script like section markers. Only include in the response what you want the AI-generated voice to read.
";

        return $this->query($query, $max_tokens, 0.6);

        return null;
    }





    /*          BASICS          */

    private function confirmGPTModel($gptModel = null) {
        if($gptModel == null) {
            $gptModel = get_option('relevancespider_gpt_model');
        }
        // OK
        if($gptModel == "gpt-4o" || $gptModel == "gpt-4.1") {
        } else {
            // Best default option
            $gptModel = "gpt-4.1";
        }
        return $gptModel;
    }

    public function query($query, $max_tokens = 300, $temperature = 0.6, $gptModel = null, $scheduled_action = false) {
        $api_key = get_option('relevancespider_api_key_openai');
        // Debugging: Check if the API key is set
        if (empty($api_key)) {
            echo "API key not set!";
            return null;
        }

        $gptModel = $this->confirmGPTModel($gptModel);

        $query = mb_convert_encoding($query, 'UTF-8', 'auto');
        $query_tokens = ceil(strlen($query) / 3); // Estimate of query tokens

        // Throttling token usage
        $tps_limit = get_option('relevancespider_gpt_tpm') / 60;
        // Calculate how many seconds to wait before we can send max_tokens without going over the limit
        $wait_time = ($query_tokens + $max_tokens) / $tps_limit;

        $request_data = get_option('relevancespider_request_data', null);

        if ($request_data !== null) {
            $last_request_time = $request_data['time'];
            $elapsed_time = time() - $last_request_time;

            // If not enough time has passed since the last request, delay this one
            if ($elapsed_time < $wait_time) {
                if ($scheduled_action) {
                    // echo "Waiting for " . ($wait_time - $elapsed_time) . " seconds to stay below " . ($tps_limit * 60) . " tokens/minute.\n";
                }
                sleep($wait_time - $elapsed_time + 1); // +1 just to be sure
            }
        }

        // Send the request
        $url = 'https://api.openai.com/v1/chat/completions';
        $payload = [
            "messages" => [
                [
                    "role" => "user",
                    "content" => $query
                ]
            ],
            'model' => $gptModel,
            'max_tokens' => $max_tokens,
            'n' => 1,
            'stop' => null,
            'temperature' => $temperature,
        ];
    
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $api_key,
        ];
    
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    
        if ($http_code == 200) {
            $response_data = json_decode($response, true);
    
            // Track the number of tokens used
            $total_tokens_used = $response_data['usage']['total_tokens'];
            $data = ['time' => time(), 'tokens' => $total_tokens_used];
            update_option('relevancespider_request_data', $data);

            if (isset($response_data['choices']) && count($response_data['choices']) > 0) {
                return $response_data['choices'][0]['message']['content'];
            } else {
                return null;
            }
        } else {
            \error_log("Error: HTTP status $http_code");
            \error_log("cURL error: $curl_error");
            \error_log("Response: $response");
            \error_log("Query: $query");
            return null;
        }
    }

    public function find_fellows($query, $n = 20, $model = 'text-embedding-ada-002') {
        $query_embedding = $this->get_embedding($query, $model);
        $chunk_size = 25;
        $offset = 0;
        $results = [];

        while (true) {
            $sql = "SELECT id, ada_embedding FROM {$this->wpdb->prefix}rs_profileembeddings LIMIT $chunk_size OFFSET $offset";
            $chunk = $this->wpdb->get_results($sql, ARRAY_A);

            if (empty($chunk)) {
                break;
            }

            foreach ($chunk as $embedding_data) {
                $embedding = array_map('floatval', json_decode($embedding_data['ada_embedding'], true));
                $cosine_similarity = $this->cosine_similarity($query_embedding, $embedding);
                $results[] = [
                    'id' => $embedding_data['id'],
                    'similarities' => $cosine_similarity
                ];
            }

            // Free up memory
            unset($chunk);

            $offset += $chunk_size;
        }

        // Sort the results by cosine similarity
        usort($results, function($a, $b) {
            return $b['similarities'] <=> $a['similarities'];
        });

        // Get top N results
        $top_n_results = array_slice($results, 0, $n);

        // Fetch the other columns for the top N results
        $top_n_ids = array_map(function($result) {
            return $result['id'];
        }, $top_n_results);

        $ids_string = implode(",", $top_n_ids);
        $sql = "SELECT id, introduction, newidea, problem, strategy, person FROM {$this->wpdb->prefix}rs_profileembeddings WHERE id IN ($ids_string)";
        $top_n_data = $this->wpdb->get_results($sql, ARRAY_A);

        return $top_n_data;
    }

    private function get_embedding($text, $model = 'text-embedding-ada-002') {
        $api_key = get_option('relevancespider_api_key_openai');
        
        // Debugging: Check if the API key is set
        if (empty($api_key)) {
            echo "API key not set!";
            return null;
        }
    
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://api.openai.com/v1/embeddings");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'input' => $text,
            'model' => $model,
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Authorization: Bearer $api_key"
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        $response_data = json_decode($response, true);
        return $response_data['data'][0]['embedding'];
    }

    private function cosine_similarity($vector1, $vector2) {
        if (count($vector1) !== count($vector2)) {
            throw new Exception("Vectors must have the same dimension.");
        }

        $dot_product = 0;
        $vector1_magnitude = 0;
        $vector2_magnitude = 0;

        for ($i = 0; $i < count($vector1); $i++) {
            $dot_product += $vector1[$i] * $vector2[$i];
            $vector1_magnitude += $vector1[$i] * $vector1[$i];
            $vector2_magnitude += $vector2[$i] * $vector2[$i];
        }

        $vector1_magnitude = sqrt($vector1_magnitude);
        $vector2_magnitude = sqrt($vector2_magnitude);

        if ($vector1_magnitude == 0 || $vector2_magnitude == 0) {
            throw new Exception("Vectors must not have zero magnitude.");
        }

        return $dot_product / ($vector1_magnitude * $vector2_magnitude);
    }

}