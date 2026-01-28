<?php
namespace RelevanceSpider\Controllers;

defined('ABSPATH') or die('No direct access allowed');

require_once plugin_dir_path(__FILE__) . 'base_controller.php';
require_once dirname(__FILE__) . '/../models/feed.php';
require_once dirname(__FILE__) . '/../models/story.php';
require_once dirname(__FILE__) . '/../models/issue.php';

use RelevanceSpider\Models\FeedModel;
use RelevanceSpider\Models\StoryModel;
use RelevanceSpider\Models\IssueModel;

class FeedController extends BaseController {
    private $story_model;
    private $issue_model;

    public function __construct() {
        $this->model = new FeedModel($GLOBALS['wpdb']);
        $this->model_name = 'feed';
        $this->model_name_plural = 'feeds';
        $this->records_per_page = 100;

        $this->story_model = new StoryModel($GLOBALS['wpdb']);
        $this->issue_model = new IssueModel($GLOBALS['wpdb']);

        add_action('admin_post_crawl_story', array($this, 'crawl_story'));
        add_action('admin_post_crawl_feed', array($this, 'crawl_feed'));
        add_action('admin_post_feed_set_active', array($this, 'feed_set_active'));
        add_action('admin_post_feed_set_inactive', array($this, 'feed_set_inactive'));

        parent::__construct();
    }

    public function index() {
        // For the dropdown menu for adding new feeds
        $data['issues'] = $this->issue_model->get();
        // to determine how many of the most recent stories have been crawled
        $data['crawled_stories_urls'] = $this->story_model->get_crawled_stories_urls();        

        $feeds = $this->model->get_feeds();
        foreach($feeds as $feed) {
            $data['feed_rss_stories'][$feed->id] = $this->model->get_rss_stories($feed->id);
        }

        parent::index();
    }

    public function entry() {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        $data['stories'] = $this->model->get_rss_stories($id);
        $data['crawled_stories_urls'] = $this->story_model->get_crawled_stories_urls();
        parent::entry();
    }

    public function feeds() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized user');
        }

        if (isset($_GET['subpage']) && $_GET['subpage'] === 'feed') {
            $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
            $data['feed'] = $this->model->get_feed_by_id($id);
            $data['stories'] = $this->model->get_rss_stories($id);
            $data['crawled_stories_urls'] = $this->story_model->get_crawled_stories_urls();
            $data['issues'] = $this->issue_model->get();
            echo $this->view->render('feed', $data);
        } else {
            // For the dropdown menu for adding new feeds
            $data['issues'] = $this->issue_model->get();

            $data['feeds'] = $this->model->get_feeds();
            foreach($data['feeds'] as $feed) {
                $data['feed_rss_stories'][$feed->id] = $this->model->get_rss_stories($feed->id);
            }
            $data['crawled_stories_urls'] = $this->story_model->get_crawled_stories_urls();
            echo $this->view->render('feeds', $data);
        }
    }


    public function feed_set_active($id = null) {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }
    
        $admin_call = false;
        if (!$id && isset($_POST['action'])) {
            $admin_call = true;
            $id = isset($_POST['id']) ? intval($_POST['id']) : null;
        }
    
        if (!$id) {
            add_settings_error('relevancespider', 'missing_id', 'Missing feed id', 'error');
        } else {
            $result = $this->model->set_active($id);
            if($result) {
                add_settings_error('relevancespider', 'feed_updated', 'Feed updated successfully', 'success');
                if(!$admin_call) {
                    return true;
                }
            } else {
                add_settings_error('relevancespider', 'feed_not_updated', 'Error updating feed', 'error');
            }
        }
    
        if ($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-feeds'));
            exit;
        } else {
            return false;
        }
    }

    public function feed_set_inactive($id = null) {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }
    
        $admin_call = false;
        if (!$id && isset($_POST['action'])) {
            $admin_call = true;
            $id = isset($_POST['id']) ? intval($_POST['id']) : null;
        }
    
        if (!$id) {
            add_settings_error('relevancespider', 'missing_id', 'Missing feed id', 'error');
        } else {
            $result = $this->model->set_inactive($id);
            if($result) {
                add_settings_error('relevancespider', 'feed_updated', 'Feed updated successfully', 'success');
                if(!$admin_call) {
                    return true;
                }
            } else {
                add_settings_error('relevancespider', 'feed_not_updated', 'Error updating feed', 'error');
            }
        }
    
        if ($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-feeds'));
            exit;
        } else {
            return false;
        }
    }

    // Returns the number of stories crawled or false in case of error
    public function crawl_feed($id = null) {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }
    
        $admin_call = false;
        if (!$id && isset($_POST['action'])) {
            $admin_call = true;
            $id = isset($_POST['id']) ? intval($_POST['id']) : null;
        }
    
        if (!$id) {
            add_settings_error('relevancespider', 'missing_id', 'Missing feed id', 'error');
        } else {
            $feed = $this->model->get_feed_by_id($id);
            if($feed) {
                $rss_items = $this->model->get_rss_stories($id, 10); // last 10 stories
                $crawled_stories_urls = $this->story_model->get_crawled_stories_urls();
                if($rss_items && $crawled_stories_urls) {
                    $added_stories = [];
                    foreach($rss_items as $rss_item) {
                        if(in_array($rss_item['link'], $crawled_stories_urls)) {
                            add_settings_error('relevancespider', 'stories_already_crawled', 'Story already crawled', 'error');
                        } else {
                            try {
                                $result = $this->create_story_from_rss_item(
                                    $id, 
                                    $rss_item['link'], 
                                    $rss_item['title'], 
                                    $rss_item['date_published']);

                                if($result) {
                                    $added_stories[] = $result;
                                } else {
                                    add_settings_error('relevancespider', 'story_not_added', 'Error adding story', 'error');
                                }
                            } catch(\Exception $e) {
                                add_settings_error('relevancespider', 'story_not_added', 'Error adding story', 'error');
                            }
                        }
                    }
                    if($this->model->update_feed_last_crawled($id)) {
                        add_settings_error('relevancespider', 'feed_updated', 'Feed updated successfully', 'success');
                        if(!$admin_call) {
                            return count($added_stories);
                        }
                    } else {
                        add_settings_error('relevancespider', 'feed_not_updated', 'Error updating feed', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'no_stories', 'No stories found', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'feed_not_found', 'Feed not found', 'error');
            }
        }
    
        if ($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-feeds'));
            exit;
        } else {
            return false;
        }
    }
    

    public function crawl_story() {
        if ((!current_user_can('manage_options')) && php_sapi_name() !== 'cli') {
            wp_die('Unauthorized user');
        }

        if (!isset($_POST['story_url'])) {
            add_settings_error('relevancespider', 'missing_fields', 'Missing required fields', 'error');
        } else {
            $feed_id = isset($_POST['feed_id']) ? intval($_POST['feed_id']) : null;
            $story_url = esc_url_raw($_POST['story_url']);
            $title = isset($_POST['title']) ? sanitize_text_field($_POST['title']) : null;
            $date_published = isset($_POST['date_published']) ? sanitize_text_field($_POST['date_published']) : null;

            if (!isset($feed_id) || !filter_var($story_url, FILTER_VALIDATE_URL)) {
                add_settings_error('relevancespider', 'invalid_parameters', 'Invalid parameters', 'error');
            } else {
                $this->create_story_from_rss_item($feed_id, $story_url, $title, $date_published);
            }
        }

        set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
        wp_redirect(admin_url('admin.php?page=relevancespider-feeds&subpage=feed&id=' . $feed_id));
        exit;
    }

    private function create_story_from_rss_item($feed_id, $story_url, $title = '', $date_published = null) {
        $feed = $this->model->get_feed_by_id($feed_id);
        $method = '';
        $content = '';
        $success = false;
        if($feed) {
            try {
                // Crawl the story content
                // 1. if content_container is defined: try html2text
                if(!empty($feed->content_container)) {
                    $crawl_data = $this->model->crawl_story_by_element($story_url, $feed->content_container);
                    if($crawl_data && !empty($crawl_data)) {
                        $content = $crawl_data;
                        $method = 'html2text';
                        $success = true;
                    }
                }
                
                // 2. try Goose
                if(!$success) {
                    $crawl_data = $this->model->crawl_story($story_url, $feed->language);
                    if($crawl_data && !empty($crawl_data['content'])) {
                        // If title from RSS feed was given, take that
                        // Otherwise, take the crawled title
                        $title = ($title !== null ? $title : $crawl_data['title']);
                        $content = $crawl_data['content'];
                        $method = 'Goose';
                        $success = true;
                    }
                }

                // If free stuff fails, use paid API PipFeed
                if(!$success) {
                    $crawl_data = $this->model->crawl_story_pipfeed($story_url);
                    if($crawl_data && !empty($crawl_data['text'])) {
                        $title = ($title !== null ? $title : $crawl_data['title']);
                        $content = $crawl_data['text'];
                        
                        $dateTime = new \DateTime($crawl_data['date']);
                        if ($dateTime && $dateTime->getLastErrors()['warning_count'] == 0 && $dateTime->getTimestamp() > 0) {
                            $date_published = $crawl_data['date'];
                        }
                        $method = 'PipFeed (paid subscription)';
                        $success = true;
                    }
                }
            } catch (\Exception $e) {
                add_settings_error('relevancespider', 'story_not_crawled', 'Error crawling the story content: ' . $e->getMessage(), 'error');
            }

            // Save the crawled content to the database
            if ($success) {
                $result = $this->story_model->add_story(
                    $story_url, 
                    $title, 
                    $content,
                    $feed_id,
                    $date_published
                );

                if ($result) {
                    add_settings_error('relevancespider', 'story_crawled', 'Story crawled and added successfully. Method: ' . $method, 'success');
                    return $result;
                } else {
                    add_settings_error('relevancespider', 'story_not_added', 'Error adding story', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'story_not_crawled', 'Error crawling the story content', 'error');
            }
        } else {
            add_settings_error('relevancespider', 'feed_not_found', 'Error finding feed', 'error');
        }
        return false;
    }
}
