<?php
namespace RelevanceSpider\Controllers;

defined('ABSPATH') or die('No direct access allowed');

require_once plugin_dir_path(__FILE__) . 'base_controller.php';
require_once dirname(__FILE__) . '/../models/podcast.php';
require_once dirname(__FILE__) . '/../models/chatgpt.php';
require_once dirname(__FILE__) . '/../models/post.php';

use RelevanceSpider\Models\PodcastModel;
use RelevanceSpider\Models\ChatGPTModel;
use RelevanceSpider\Models\PostModel;

class PodcastController extends BaseController {
    private $chatgpt_model;
    private $post_model;

    public function __construct() {
        $this->model_name = 'podcast';
        $this->model_name_plural = 'podcasts';

        $this->model = new PodcastModel($GLOBALS['wpdb']);
        $this->chatgpt_model = new ChatGPTModel($GLOBALS['wpdb']);
        $this->post_model = new PostModel($GLOBALS['wpdb']);

        add_action('admin_post_podcast_fetch_posts', array($this, 'fetch_posts'));
        add_action('admin_post_podcast_generate', array($this, 'generate'));

        parent::__construct();
    }

    public function fetch_posts($id = null) {
        $this->authorize();

        $admin_call = false;
        if (empty($id) && isset($_POST['id'])) {
            $admin_call = true;
            $id = intval($_POST['id']);
        }

        if (!$id || $id < 1) {
            add_settings_error('relevancespider', 'missing_id', 'Missing ID', 'error');
        } else {
            $posts = $this->post_model->get_posts_podcast();
            if($posts) {
                $podcast = $this->model->get_by_id($id);
                if($podcast) {
                    // Extract the post IDs into an array
                    $post_ids = array_map(function($post) {
                        return $post->ID;
                    }, $posts);

                    $post_ids_string = json_encode($post_ids);
                    $result = $this->model->update($id, array('post_ids' => $post_ids_string));

                    if($result) {
                        add_settings_error('relevancespider', 'updated', 'Updated', 'updated');

                        if(!$admin_call) {
                            return true;
                        }                        
                    } else {
                        add_settings_error('relevancespider', 'not_updated', 'Not updated', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'no_record', 'No record found', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'no_posts', 'No posts found', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-podcasts'));
            exit;
        } else {
            return false;
        }
    }    

    public function generate($id = null) {
        $this->authorize();

        $admin_call = false;
        if (empty($id) && isset($_POST['id'])) {
            $admin_call = true;
            $id = intval($_POST['id']);
        }

        if (!$id || $id < 1) {
            add_settings_error('relevancespider', 'missing_id', 'Missing ID', 'error');
        } else {
            $podcast = $this->model->get_by_id($id);
            if($podcast) {
                $post_ids = json_decode($podcast->post_ids);
                $args = array(
                    'post_type' => 'post',
                    'post_status' => 'publish',
                    'post__in' => $post_ids,
                    'orderby' => 'category',
                );
                $query = new \WP_Query($args);
                $posts = $query->posts;
                if($posts) {
                    $post_strings = array();
                    foreach($posts as $post) {
                        $relevance_reasons = get_post_meta($post->ID, 'relevance_reasons', true);
                        $relevance_antifactors = get_post_meta($post->ID, 'relevance_antifactors', true);
                        $post_strings[] =
                        "<STORY>"
                        . "\nCategory: " . get_the_category($post->ID)[0]->name
                        . "\nTitle: " . $post->post_title
                        . "\nSummary of original article: " . get_post_meta($post->ID, 'story_summary', true)
                        . "\nPublisher of original article: " . get_post_meta($post->ID, 'story_publisher', true)
                        . "\nRelevance of the article\n- " . (is_array($relevance_reasons) ? implode("\n- ", $relevance_reasons) : $relevance_reasons)
                        . "\nLimiting factors for the relevance\n- " . (is_array($relevance_antifactors) ? implode("\n- ", $relevance_antifactors) : $relevance_antifactors)
                        . "</STORY";
                    }

                    $response = $this->chatgpt_model->generate_podcast($post_strings);
                    
                    if($response !== null) {

                        $response .= "\n\n---\n\nLast week, our RelevanceAI evaluated hundreds of news items from around the world. These are the most relevant for humanity:\n\n";
                        foreach($posts as $post) {
                            $response .= "- " . $post->post_title . "\n";
                            $response .= get_post_meta($post->ID, 'story_publisher', true) . " | AI analysis\n";
                            $response .= get_post_meta($post->ID, 'story_url', true) . "\n";
                            $response .= get_permalink($post->ID) . "\n";
                        }

                        $result = $this->model->update($id, array(
                            'content' => $response,
                        ));
    
                        if($result) {
                            add_settings_error('relevancespider', 'updated', 'Updated', 'updated');
    
                            if(!$admin_call) {
                                return true;
                            }                        
                        } else {
                            add_settings_error('relevancespider', 'not_updated', 'Not updated', 'error');
                        }
                    } else {
                        add_settings_error('relevancespider', 'no_response', 'No GPT response', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'no_posts', 'No posts found', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'no_record', 'No record found', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-podcasts'));
            exit;
        } else {
            return false;
        }
    }    
}
