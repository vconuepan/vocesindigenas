<?php
namespace RelevanceSpider\Controllers;

defined('ABSPATH') or die('No direct access allowed');

require_once plugin_dir_path(__FILE__) . 'base_controller.php';
require_once dirname(__FILE__) . '/../models/feed.php';
require_once dirname(__FILE__) . '/../models/story.php';
require_once dirname(__FILE__) . '/../models/issue.php';
require_once dirname(__FILE__) . '/../models/chatgpt.php';
require_once dirname(__FILE__) . '/../models/post.php';

use RelevanceSpider\Models\FeedModel;
use RelevanceSpider\Models\StoryModel;
use RelevanceSpider\Models\IssueModel;
use RelevanceSpider\Models\ChatGPTModel;
use RelevanceSpider\Models\PostModel;

class StoryController extends BaseController {
    private $feed_model;
    private $story_model;
    private $issue_model;
    private $chatgpt_model;
    private $post_model;

    public function __construct() {
        parent::__construct();

        $this->feed_model = new FeedModel($GLOBALS['wpdb']);
        $this->story_model = new StoryModel($GLOBALS['wpdb']);
        $this->issue_model = new IssueModel($GLOBALS['wpdb']);
        $this->chatgpt_model = new ChatGPTModel($GLOBALS['wpdb']);
        $this->post_model = new PostModel($GLOBALS['wpdb']);

        add_action('admin_post_find_fellows', array($this, 'find_fellows'));
        add_action('admin_post_create_post_from_story', array($this, 'create_post_from_story'));
        add_action('admin_post_assess_relevance', array($this, 'assess_relevance'));
        add_action('wp_ajax_queue_assess_relevance', array($this, 'queue_assess_relevance'));
        add_action('wp_ajax_process_assess_relevance_queue', array($this, 'process_assess_relevance_queue'));
        add_action('admin_post_preassess_relevance', array($this, 'preassess_relevance'));
        add_action('admin_post_update_story', array($this, 'update_story'));
        add_action('admin_post_delete_story', array($this, 'delete_story'));
    }

    public function stories() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized user');
        }

        if (isset($_GET['subpage']) && $_GET['subpage'] === 'story') {
            $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
            $story = $this->story_model->get_story_by_id($id);
            echo $this->view->render('story', array("story" => $story));
        } else {
            // Determine the total number of records in the table
            $total_records = $this->story_model->get_number_of_stories();
            $records_per_page = 15;
            $total_pages = ceil($total_records / $records_per_page);

            $data['stories'] = $this->story_model->get_stories(array(
                'records-per-page' => $records_per_page,
            ));
            $data['total_pages'] = $total_pages;
            $data['current_page'] = isset($_GET['paged']) ? intval($_GET['paged']) : 1;
            $data['issues'] = $this->issue_model->get();
            echo $this->view->render('stories', $data);
        }
    }

    public function delete_story() {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }

        if (!isset($_POST['id'])) {
            add_settings_error('relevancespider-stories', 'missing_id', 'Missing feed ID', 'error');
        } else {
            $id = intval($_POST['id']);

            $result = $this->story_model->delete_story($id);

            if ($result) {
                add_settings_error('relevancespider-stories', 'story_deleted', 'Story deleted successfully', 'success');
            } else {
                add_settings_error('relevancespider-stories', 'story_not_deleted', 'Error deleting story', 'error');
            }
        }

        set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider-stories'), 30);
        wp_redirect(admin_url('admin.php?page=relevancespider'));
        exit;
    }

    private function is_array_of_integers($ids) {
        // Check if $ids is an array
        if (!is_array($ids)) {
            return false;
        }
        // Check if all elements in the array are integers
        foreach ($ids as $id) {
            if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
                return false;
            }
        }
        return true;
    }

    public function select_posts($ids = array()) {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }

        $admin_call = false;
        if ((!is_array($ids) || count($ids) == 0) && isset($_POST['ids'])) {
            // try to parse the $_POST['ids'] string into an array of ints
            try {
                $ids = explode(',', $_POST['ids']);
                $admin_call = true;
            } catch (Exception $e) { }
        }

        // Try to convert all elements to integers
        $ids = array_map(function ($item) {
            return (int) $item; // Convert item to integer
        }, $ids);

        // check if $ids is an array of ints
        if (!$this->is_array_of_integers($ids)) {
            add_settings_error('relevancespider', 'missing_id', 'Missing story ID', 'error');
        } else {
            $args = array(
                'post_type'   => 'post',
                'post_status' => 'draft',
                'post__in'    => $ids,
                'orderby'     => 'post__in', // order matches the IDs order
            );
            // Fetch the posts
            $posts_query = new \WP_Query($args);

            if ($posts_query->have_posts()) {
                
                // get a list of post ids that were deemed worthy of being published
                $response = $this->chatgpt_model->select_posts(
                    $posts_query,
                    0.5, // select 50% of the posts, rounded up.
                    null, // use default GPT model
                    !$admin_call // if not admin call, it's a scheduled action
                );

                if(is_array($response) && count($response) > 0) {
                    add_settings_error('relevancespider', 'gpt_success', "Selection retrieved", 'success');

                    // mark the selected posts as pending
                    // and the other posts as trash
                    $success = true;
                    $to_trash = $ids;
                    foreach($response as $post_id) {
                        $post = get_post($post_id);
                        $post->post_status = 'pending';
                        if (wp_update_post($post) === 0) {
                            $success = false;
                            break;
                        }
                        $to_trash = array_diff($to_trash, array($post_id));
                    }
                    foreach($to_trash as $post_id) {
                        $post = get_post($post_id);
                        $post->post_status = 'trash';
                        if (wp_update_post($post) === 0) {
                            $success = false;
                            break;
                        }
                    }

                    if($success) {
                        add_settings_error('relevancespider', 'posts_published', 'Published selected posts', 'success');
                        if(!$admin_call) {
                            return true;
                        }

                        set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
                        // redirect ... somewhere
                        wp_redirect(admin_url('admin.php?page=relevancespider'));
                        exit;

                    } else {
                        add_settings_error('relevancespider', 'selected_post_not_published', 'Error publishing the selected post', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'gpt_error', 'Error retrieving the selection for posts to be published', 'error');
                }                

                add_settings_error('relevancespider', 'posts_selected', 'Posts selected and published', 'success');
                if(!$admin_call) {
                    return true;
                }                            
            } else {
                add_settings_error('relevancespider', 'post_not_selected', 'Error finding the posts', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider'));
            exit;
        } else {
            return false;
        }
    }

    public function create_post_from_story($id = null) {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }

        $admin_call = false;
        if (empty($id) && isset($_POST['id'])) {
            $admin_call = true;
            $id = intval($_POST['id']);
        }

        if (!$id || $id < 1) {
            add_settings_error('relevancespider', 'missing_id', 'Missing story ID', 'error');
        } else {
            $story = $this->story_model->get_story_by_id($id);
            if ($story) {
                $feed = $this->feed_model->get_feed_by_id($story->feed_id);
                if($feed) {
                    $issue = $this->issue_model->get_by_id($feed->issue_id);
                    if($issue) {

                        $post_title = $this->chatgpt_model->get_title_from_response($story->ai_response);
                        $relevance_summary = $this->chatgpt_model->get_relevance_summary_from_response($story->ai_response);

                        $post_content = '[relevance_post]';

                        $post_data = array(
                            'post_title'   => $post_title,
                            'post_content' => $post_content,
                            'post_excerpt' => $relevance_summary,
                            'post_status'  => 'draft', // or 'publish'
                            'post_type'    => 'post', // or 'page'
                            'post_author'  => get_current_user_id(),
                            // Add an array of category IDs if you want to assign categories.
                            'post_category' => array($issue->category_id),
                            // Add an array of tag IDs if you want to assign tags.
                            'tags_input' => array($story->emotion_tag),
                        );

                        $post_id = wp_insert_post($post_data);

                        if($post_id) {
                            add_post_meta($post_id, 'relevance_edited_by_human', 0);
                            add_post_meta($post_id, 'relevance_rating_low', $this->chatgpt_model->get_rating_low_from_response($story->ai_response));
                            add_post_meta($post_id, 'relevance_rating_high', $this->chatgpt_model->get_rating_high_from_response($story->ai_response));

                            $relevance_reasons = $this->chatgpt_model->get_reasons_from_response($story->ai_response);
                            add_post_meta($post_id, 'relevance_reasons', $relevance_reasons);
                            $relevance_antifactors = $this->chatgpt_model->get_antifactors_from_response($story->ai_response);
                            add_post_meta($post_id, 'relevance_antifactors', $relevance_antifactors);
                            $relevance_calculation = $this->chatgpt_model->get_calculation_from_response($story->ai_response);
                            add_post_meta($post_id, 'relevance_calculation', $relevance_calculation);
                            $relevance_scenarios = $this->chatgpt_model->get_scenarios_from_response($story->ai_response);
                            add_post_meta($post_id, 'relevance_scenarios', $relevance_scenarios);
                            add_post_meta($post_id, 'relevance_summary', $relevance_summary);

                            $relevance_tweet = $this->chatgpt_model->get_marketing_blurb_from_response($story->ai_response);
                            add_post_meta($post_id, 'marketing_blurb', $relevance_tweet);
                            $relevance_keywords = $this->chatgpt_model->get_keywords_from_response($story->ai_response);
                            add_post_meta($post_id, 'rank_math_focus_keyword', $relevance_keywords);

                            add_post_meta($post_id, 'story_summary', $this->chatgpt_model->get_story_summary_from_response($story->ai_response));
                            add_post_meta($post_id, 'story_quote', $this->chatgpt_model->get_story_quote_from_response($story->ai_response));
                            add_post_meta($post_id, 'story_title', $story->title);
                            add_post_meta($post_id, 'story_url', $story->url);
                            add_post_meta($post_id, 'story_publisher', $feed->title);
                            
                            // For the publication date, triangulate between what the feed says and what GPT says
                            $story_published_feed = strtotime($story->date_published);
                            $story_published_gpt = strtotime($this->chatgpt_model->get_publication_date_from_response($story->ai_response));
                            if ($story_published_gpt !== false) {
                                $date_published_formatted = date('Y-m-d', max($story_published_feed, $story_published_gpt));
                            } else {
                                $date_published_formatted = date('Y-m-d', $story_published_feed);
                            }
                            add_post_meta($post_id, 'story_date', $date_published_formatted);
                                                        
                            $this->story_model->set_post($id, $post_id);

                            add_settings_error('relevancespider', 'post_created', 'Post created and story updated', 'success');
                            if(!$admin_call) {
                                return true;
                            }                            
                        } else {
                            add_settings_error('relevancespider', 'post_not_created', 'Error creating the post', 'error');
                        }
                    } else {
                        add_settings_error('relevancespider', 'issue_not_found', 'Error retrieving the story\'s issue', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'feed_not_found', 'Error retrieving the story\'s feed', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'story_not_found', 'Error retrieving story', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider'));
            exit;
        } else {
            return false;
        }
    }

    public function assess_relevance($id = null) {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }

        $admin_call = false;
        if (empty($id) && isset($_POST['id'])) {
            $admin_call = true;
            $id = intval($_POST['id']);
        }

        if (!$id || $id < 1) {
            add_settings_error('relevancespider', 'missing_id', 'Missing story ID', 'error');
        } else {
            $story = $this->story_model->get_story_by_id($id);
            if ($story) {
                $feed = $this->feed_model->get_feed_by_id($story->feed_id);
                if($feed) {
                    $issue = $this->issue_model->get_by_id($feed->issue_id);
                    if($issue) {

                        $response = $this->chatgpt_model->assess_relevance(
                            $story->title, 
                            $story->content,
                            $feed->title, // publisher
                            $story->url,
                            $this->issue_model->generate_prompt_section($issue),
                            null, // use the default GPT model
                            !$admin_call // if this is not an admin call, it's a sheduled action
                        );

                        if($response !== null) {
                            // add_settings_error('relevancespider', 'gpt_success', "Relevance evaluation retrieved: " . $response, 'success');

                            $rating_low = $this->chatgpt_model->get_rating_low_from_response($response);
                            $rating_high = $this->chatgpt_model->get_rating_high_from_response($response);

                            if($this->story_model->update_relevance($id, $rating_low, $rating_high, $response)) {
                                add_settings_error('relevancespider', 'story_updated', 'Added relevance rating by GPT.', 'success');
                                if(!$admin_call) {
                                    return true;
                                }

                                set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
                                // redirect to the newly evaluated story
                                wp_redirect(admin_url('admin.php?page=relevancespider&subpage=story&id=' . $id));
                                exit;

                            } else {
                                add_settings_error('relevancespider', 'story_not_updated', 'Error updating the story entry', 'error');
                            }
                        } else {
                            add_settings_error('relevancespider', 'gpt_error', 'Error retrieving the relevance evaluation', 'error');
                        }
                    } else {
                        add_settings_error('relevancespider', 'issue_not_found', 'Error retrieving the story\'s issue', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'feed_not_found', 'Error retrieving the story\'s feed', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'story_not_found', 'Error retrieving story', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider'));
            exit;
        } else {
            return false;
        }
    }

    // Expects stories to belong to the same issue
    public function preassess_relevance($ids = array()) {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }

        $admin_call = false;
        if (empty($ids) && isset($_POST['ids']) && is_array($_POST['ids'])) {
            $admin_call = true;
            $ids = $_POST['ids'];
        }
    
        if (!array($ids) || count($ids) < 1) {
            add_settings_error('relevancespider', 'missing_ids', 'Missing IDs', 'error');
        } else {
            $stories = $this->story_model->get_stories_by_ids($ids);
            if ($stories) {
                $feed = $this->feed_model->get_feed_by_id($stories[0]->feed_id);
                if($feed) {
                    $issue = $this->issue_model->get_by_id($feed->issue_id);
                    if($issue) {

                        $response = $this->chatgpt_model->preassess_relevance(
                            $stories, 
                            $this->issue_model->generate_prompt_section($issue),
                            null, // use default GPT model
                            !$admin_call // if not admin call, it's a scheduled action
                        );

                        // Debugging CLI mode
                        # print_r($response);

                        if(!empty($response)) {
                            // update all the stories
                            foreach($stories as $story) {
                                $rating_low = $response[$story->id]['rating_low'];
                                $emotion_tag = $response[$story->id]['emotion_tag'];

                                $update = $this->story_model->update_story($story->id, array(
                                    'relevance_rating_low' => $rating_low,
                                    'emotion_tag' => $emotion_tag,
                                ));

                                if($update) {
                                    add_settings_error('relevancespider', 'story_updated', 'Rated "' . $story->title . '" as ' . $rating_low . '.', 'success');
                                } else {
                                    add_settings_error('relevancespider', 'story_not_updated', 'Error updating the story "' . $story->title . '"', 'error');
                                    if(!$admin_call) {
                                        return false;
                                    }
                                }
                            }
                            if(!$admin_call) {
                                return true;
                            }
                        } else {
                            add_settings_error('relevancespider', 'gpt_error', 'Error retrieving the relevance evaluation', 'error');
                        }
                    } else {
                        add_settings_error('relevancespider', 'issue_not_found', 'Error retrieving the story\'s issue', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'feed_not_found', 'Error retrieving the story\'s feed', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'story_not_found', 'Error retrieving story', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider'));
            exit;
        } else {
            return false;
        }
    }

    public function update_story() {
        // Check if user has the required capability
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('You do not have sufficient permissions to access this page.');
        }

        // Check if the required parameters are set
        if (!isset($_POST['story_id'])) {
            add_settings_error('relevancespider', 'missing_id', 'Missing story ID', 'error');
        } else {

            $story_id = intval($_POST['story_id']);
            $data = array(
                'date_published' => stripslashes(sanitize_text_field($_POST['date_published'])),
                'date_crawled' => stripslashes(sanitize_text_field($_POST['date_crawled'])),
                'title' => stripslashes(sanitize_text_field($_POST['title'])),
                'content' => wp_kses_post($_POST['content']),
                'url' => esc_url_raw($_POST['url']),
                'relevance_rating_low' => floatval($_POST['relevance_rating_low']),
                'relevance_rating_high' => floatval($_POST['relevance_rating_high']),
                'emotion_tag' => stripslashes(sanitize_text_field($_POST['emotion_tag'])),
                'ai_response' => stripslashes(sanitize_textarea_field($_POST['ai_response'])),
            );

            // Update the story
            $updated = $this->story_model->update_story($story_id, $data);

            if ($updated) {
                add_settings_error('relevancespider', 'update_successful', 'Update successful', 'success');
            } else {
                add_settings_error('relevancespider', 'update_failed', 'Failed to update the story', 'error');
            }
        }
        set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
        wp_redirect(admin_url('admin.php?page=relevancespider&subpage=story&id=' . $story_id));
        exit;
    }

    public function find_fellows() {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }

        if (!isset($_POST['id'])) {
            add_settings_error('relevancespider', 'missing_id', 'Missing story ID', 'error');
        } else {
            $id = intval($_POST['id']);
            $story = $this->story_model->get_story_by_id($id);
            if ($story) {
                
                $this->chatgpt_model->find_fellows($story->content);

            } else {
                add_settings_error('relevancespider', 'story_not_found', 'Error retrieving story', 'error');
            }
        }

        set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
        wp_redirect(admin_url('admin.php?page=relevancespider'));
        exit;
    }
}
