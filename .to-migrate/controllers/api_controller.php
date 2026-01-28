<?php
namespace RelevanceSpider\Controllers;

use WP_REST_Request;
use WP_Error;
use ActionScheduler;

defined('ABSPATH') or die('No direct access allowed');

require_once plugin_dir_path(__FILE__) . 'base_controller.php';
require_once plugin_dir_path(__FILE__) . 'feed_controller.php';

require_once dirname(__FILE__) . '/../models/feed.php';
require_once dirname(__FILE__) . '/../models/story.php';
require_once dirname(__FILE__) . '/../models/issue.php';

use RelevanceSpider\Controllers\FeedController;

use RelevanceSpider\Models\FeedModel;
use RelevanceSpider\Models\StoryModel;
use RelevanceSpider\Models\IssueModel;

class ApiController extends BaseController {
    private $feed_model;
    private $story_model;
    private $issue_model;

    public function __construct() {
        parent::__construct();

        $this->feed_model = new FeedModel($GLOBALS['wpdb']);
        $this->story_model = new StoryModel($GLOBALS['wpdb']);
        $this->issue_model = new IssueModel($GLOBALS['wpdb']);

        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('relevancespider_run_crawl', array($this, 'relevancespider_run_crawl'));
        add_action('relevancespider_run_single_crawl', array($this, 'relevancespider_run_single_crawl'));
        add_action('relevancespider_run_preassessments', array($this, 'relevancespider_run_preassessments'));
        add_action('relevancespider_run_single_preassessment', array($this, 'relevancespider_run_single_preassessment'));
        add_action('relevancespider_run_assessments', array($this, 'relevancespider_run_assessments'));
        add_action('relevancespider_run_single_assessment', array($this, 'relevancespider_run_single_assessment'));
        add_action('relevancespider_run_posts', array($this, 'relevancespider_run_posts'));
        add_action('relevancespider_run_single_post', array($this, 'relevancespider_run_single_post'));
        add_action('relevancespider_run_selection', array($this, 'relevancespider_run_selection'));
        add_action('relevancespider_run_single_selection', array($this, 'relevancespider_run_single_selection'));
        add_action('relevancespider_run_empty_action', array($this, 'relevancespider_run_empty_action'));
    }

    public function register_routes() {
        register_rest_route('relevancespider/v1', '/tasks/run', array(
            'methods' => 'POST',
            'callback' => array($this, 'relevancespider_run_tasks_callback'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));
        register_rest_route('relevancespider/v1', '/tasks/crawl', array(
            'methods' => 'POST',
            'callback' => array($this, 'relevancespider_run_crawl_callback'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));
        register_rest_route('relevancespider/v1', '/tasks/preassess', array(
            'methods' => 'POST',
            'callback' => array($this, 'relevancespider_run_preassess_callback'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));
        register_rest_route('relevancespider/v1', '/tasks/assess', array(
            'methods' => 'POST',
            'callback' => array($this, 'relevancespider_run_assess_callback'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));
        register_rest_route('relevancespider/v1', '/tasks/post', array(
            'methods' => 'POST',
            'callback' => array($this, 'relevancespider_run_post_callback'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));
        register_rest_route('relevancespider/v1', '/tasks/select', array(
            'methods' => 'POST',
            'callback' => array($this, 'relevancespider_run_select_callback'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));
    }

    public function relevancespider_run_empty_action() {
        // Do nothing

        // Clear the action
        $this->unschedule_actions_in_group('relevancespider_run_empty_action');
    }

    public function relevancespider_run_tasks_callback(WP_REST_Request $request) {
        /*
        $provided_secret_key = $request->get_param('secret_key');
        $stored_secret_key = get_option('relevancespider_secret_key');
    
        if ($provided_secret_key !== $stored_secret_key) {
            return new WP_Error('invalid_secret_key', 'Invalid secret key provided.', array('status' => 403));
        }
        */

        // Schedule the first task
        as_schedule_single_action(time(), 'relevancespider_run_crawl', array(
            'args' => array(
                'full_sequence' => 1,
            )
        ));
    }
    public function relevancespider_run_crawl_callback(WP_REST_Request $request) {
        as_schedule_single_action(time(), 'relevancespider_run_crawl');
    }    
    public function relevancespider_run_preassess_callback(WP_REST_Request $request) {
        as_schedule_single_action(time(), 'relevancespider_run_preassessments');
    }    
    public function relevancespider_run_assess_callback(WP_REST_Request $request) {
        as_schedule_single_action(time(), 'relevancespider_run_assessments');
    }    
    public function relevancespider_run_post_callback(WP_REST_Request $request) {
        as_schedule_single_action(time(), 'relevancespider_run_posts');
    }    
    public function relevancespider_run_select_callback(WP_REST_Request $request) {
        as_schedule_single_action(time(), 'relevancespider_run_selection');
    }    

    public function unschedule_actions_in_group($hook, $group = '') {
        $pending_actions = as_get_scheduled_actions(array(
            'hook' => $hook, 
            'group' => $group,
            'status' => 'pending'
        ));
        
        foreach ($pending_actions as $action) {
            as_unschedule_action($hook, $action->args, $group);
        }
    }

    public function relevancespider_run_crawl($args = array()) {
        // Set default values
        $args['retry_count'] = isset($args['retry_count']) ? $args['retry_count'] : 0;
        $args['full_sequence'] = isset($args['full_sequence']) ? $args['full_sequence'] : false;
        $args['single_actions_scheduled'] = isset($args['single_actions_scheduled']) ? $args['single_actions_scheduled'] : false;

        // Define the group for scheduled actions
        $group = 'relevancespider_crawl_feeds';
    
        // Define the maximum number of retries
        $max_retries = 30;
    
        // Check if there are any pending crawl actions in the group
        $pending_actions = as_get_scheduled_actions(array(
            'hook' => 'relevancespider_run_single_crawl',
            'group' => $group,
            'status' => 'pending')
        );
    
        // If there are no pending actions and they haven't been scheduled before, schedule new actions
        if (count($pending_actions) === 0 && !$args['single_actions_scheduled']) {
            // Get active feeds that haven't been crawled for interval_hours hours (default: 6 hours)
            $feeds = $this->feed_model->get_feeds(6, true, true);

            if(count($feeds) === 0) {
                // Clean up
                $this->unschedule_actions_in_group('relevancespider_run_crawl');
                if ($args['full_sequence']) {
                    as_schedule_single_action(time(), 'relevancespider_run_preassessments', array('args' => array('full_sequence' => 1)));
                }
            } else {
                // Schedule a single action to crawl each feed
                foreach ($feeds as $feed) {
                    echo $feed->title . (!empty($feed->description) ? " (" . $feed->description . ")" : "") . "\n";
                    as_schedule_single_action(time(), 'relevancespider_run_single_crawl', array(array('feed_id' => $feed->id)), $group);
                }

                echo "\nAdded " . count($feeds) . " crawl actions.\n";

                // Schedule another 'relevancespider_run_crawl' action to check for more feeds to crawl after a short delay
                $args['single_actions_scheduled'] = true;
                $args['retry_count']++;
                as_schedule_single_action(time() + 10, 'relevancespider_run_crawl', array('args' => $args));
            }
        } elseif (count($pending_actions) > 0 && $args['retry_count'] < $max_retries) {
            // If there are pending actions and we haven't reached the maximum number of retries,
            // schedule another 'relevancespider_run_crawl' action to check again after a short delay
            $args['retry_count']++;
            as_schedule_single_action(time() + 10, 'relevancespider_run_crawl', array('args' => $args));
        } else {
            // Clean up
            $this->unschedule_actions_in_group('relevancespider_run_single_crawl', $group);
            $this->unschedule_actions_in_group('relevancespider_run_crawl');

            // Schedule the next task
            if ($args['full_sequence']) {
                as_schedule_single_action(time(), 'relevancespider_run_preassessments', array('args' => array('full_sequence' => 1)));
            }
        }
    }
    
    public function relevancespider_run_single_crawl($args) {
        // Extract the feed_id from the provided arguments
        $feed_id = isset($args['feed_id']) ? intval($args['feed_id']) : 0;

        // Crawl the feed
        if ($feed_id > 0) {
            try {
                $feed = $this->feed_model->get_feed_by_id($feed_id);
                $feed_controller = new FeedController();
                $result = $feed_controller->crawl_feed($feed_id);
            } catch (\Exception $e) {
                echo "Failed to crawl feed " . $feed->title . " (ID " . $feed_id . "): " . $e->getMessage() . "\n";
                // $this->feed_model->set_inactive($feed_id, $e->getMessage());
            }
            if(!is_int($result)) {
                echo "Failed to crawl feed " . $feed->title . " (ID " . $feed_id . ")\n";
                // $this->feed_model->set_inactive($feed_id, "Failed to crawl feed");
            } else {
                echo $feed->title . " (" . (!empty($feed->description) ? $feed->description . ", " : "") . "ID " . $feed_id . "): " . $result . " new stories\n";
            }
        }

        // Mark the relevancespider_run_single_crawl action as completed
        as_unschedule_action('relevancespider_run_single_crawl', array($args));
    }

    public function relevancespider_run_preassessments($args = array()) {
        // Set default values
        $args['retry_count'] = isset($args['retry_count']) ? $args['retry_count'] : 0;
        $args['full_sequence'] = isset($args['full_sequence']) ? $args['full_sequence'] : false;
        $args['single_actions_scheduled'] = isset($args['single_actions_scheduled']) ? $args['single_actions_scheduled'] : false;

        // Define the group for scheduled actions
        $group = 'relevancespider_preassessments';
    
        // Define the maximum number of retries
        $max_retries = 30;

        $gptModel = get_option('relevancespider_gpt_model');
        $batch_size = 8;
    
        // Check if there are any pending actions in the group
        $pending_actions = as_get_scheduled_actions(array(
            'hook' => 'relevancespider_run_single_preassessment',
            'group' => $group,
            'status' => 'pending')
        );
    
        // If there are no pending actions and they haven't been scheduled before, schedule new actions
        if (count($pending_actions) === 0 && !$args['single_actions_scheduled']) {
            // Get unrated stories grouped by issue
            $stories = $this->story_model->get_stories(array(
                'filter-status' => 'unrated',
                'sort-order' => 'issue_asc',
            ));

            echo "\nPre-assessing " . count($stories) . " unrated stories.\n";
    
            // Create batches of $batch_size stories each that belong to the same issue
            $batches = array();
            $issue_batches = array();
            
            foreach ($stories as $story) {
                // If the issue is not yet in the list of issue batches, add it
                if (!isset($issue_batches[$story->issue_name])) {
                    $issue_batches[$story->issue_name] = array();
                }

                // Add the story to the batch
                $issue_batches[$story->issue_name][] = $story->id;
            
                // If the batch is full, add it to the list of batches and reset the batch
                if (count($issue_batches[$story->issue_name]) == $batch_size) {
                    $batches[] = $issue_batches[$story->issue_name];
                    $issue_batches[$story->issue_name] = array();
                }
            }
            // Add the remaining stories in each batch to the list of batches
            foreach ($issue_batches as $issue_name => $remaining_ids) {
                if (!empty($remaining_ids)) {
                    $batches[] = $remaining_ids;
                }
            }
            
            if(count($batches) == 0) {
                // Clean up
                $this->unschedule_actions_in_group('relevancespider_run_preassessments');
                if ($args['full_sequence']) {
                    as_schedule_single_action(time(), 'relevancespider_run_assessments', array('args' => array('full_sequence' => 1)));
                }
            } else {
                // Schedule a single action for each batch of stories
                foreach ($batches as $batch) {
                    as_schedule_single_action(time(), 'relevancespider_run_single_preassessment', array(array('story_ids' => $batch)), $group);
                }

                echo "Scheduled " . count($batches) . " preassessment actions\n";

                // Schedule another action to check for more single actions after a short delay
                $args['single_actions_scheduled'] = true;
                $args['retry_count']++;
                as_schedule_single_action(time() + 10, 'relevancespider_run_preassessments', array('args' => $args));
            }
        } elseif (count($pending_actions) > 0 && $args['retry_count'] < $max_retries) {
            // If there are pending actions and we haven't reached the maximum number of retries,
            // schedule another 'relevancespider_run_preassessments' action to check again after a short delay
            $args['retry_count']++;
            as_schedule_single_action(time() + 10, 'relevancespider_run_preassessments', array('args' => $args));
        } 
        // If all pending actions are done or the maximum number of retries is reached
        else {
            // Clean up
            $this->unschedule_actions_in_group('relevancespider_run_single_preassessment', $group);
            $this->unschedule_actions_in_group('relevancespider_run_preassessments');

            // Start next action
            if ($args['full_sequence']) {
                as_schedule_single_action(time(), 'relevancespider_run_assessments', array('args' => array('full_sequence' => 1)));
            }
        }
    }

    public function relevancespider_run_single_preassessment($args) {
        $story_ids = isset($args['story_ids']) ? $args['story_ids'] : array();

        if (is_array($story_ids) && count($story_ids) > 0) {
            // Turn story_ids into integers
            $story_ids = array_map('intval', $story_ids);
            try {
                $story_controller = new StoryController();
                $result = $story_controller->preassess_relevance($story_ids);
            } catch (\Exception $e) {
                echo "Failed to preassess relevance for stories " . implode(', ', $story_ids) . ". Error message: " . $e->getMessage() . "\n";
            }
            if(!$result) {
                echo "Failed to preassess relevance for stories " . implode(', ', $story_ids) . "\n";
            }
        }

        // Mark the action as completed
        as_unschedule_action('relevancespider_run_single_preassessment', array($args));    
    }

    public function relevancespider_run_assessments($args = array()) {
        // Set default values
        $args['retry_count'] = isset($args['retry_count']) ? $args['retry_count'] : 0;
        $args['full_sequence'] = isset($args['full_sequence']) ? $args['full_sequence'] : false;
        $args['single_actions_scheduled'] = isset($args['single_actions_scheduled']) ? $args['single_actions_scheduled'] : false;

        // Define the group for scheduled actions
        $group = 'relevancespider_assessments';
    
        // Define the maximum number of retries
        $max_retries = 30;

        // Check if there are any pending actions in the group
        $pending_actions = as_get_scheduled_actions(array(
            'hook' => 'relevancespider_run_single_assessment',
            'group' => $group,
            'status' => 'pending')
        );
    
        // If there are no pending actions and they haven't been scheduled before, schedule new actions
        if (count($pending_actions) === 0 && !$args['single_actions_scheduled']) {
            // Get unrated stories grouped by issue
            $stories = $this->story_model->get_stories(array(
                'filter-status' => 'pre-rating',
                'filter-rating-min' => 5,
                'sort-order' => 'rating_desc',
            ));
    
            if(count($stories) == 0) {
                // Clean up
                $this->unschedule_actions_in_group('relevancespider_run_assessments');
                if ($args['full_sequence']) {
                    as_schedule_single_action(time(), 'relevancespider_run_posts', array('args' => array('full_sequence' => 1)));
                }
            } else {
                // Schedule a single action for each batch of stories
                foreach ($stories as $story) {
                    as_schedule_single_action(time(), 'relevancespider_run_single_assessment', array(array('story_id' => $story->id)), $group);
                }

                echo "Scheduled " . count($stories) . " assessment actions\n";
                // Schedule another action to check for more single actions after a short delay
                $args['single_actions_scheduled'] = true;
                $args['retry_count']++;
                as_schedule_single_action(time() + 10, 'relevancespider_run_assessments', array('args' => $args));
            }
        } elseif (count($pending_actions) > 0 && $args['retry_count'] < $max_retries) {
            // If there are pending actions and we haven't reached the maximum number of retries,
            // schedule another 'relevancespider_run_preassessments' action to check again after a short delay
            $args['retry_count']++;
            as_schedule_single_action(time() + 10, 'relevancespider_run_assessments', array('args' => $args));
        } 
        // If all pending actions are done or the maximum number of retries is reached
        else {
            // Clean up
            $this->unschedule_actions_in_group('relevancespider_run_single_assessment', $group);
            $this->unschedule_actions_in_group('relevancespider_run_assessments');

            // Start next action
            if ($args['full_sequence']) {
                as_schedule_single_action(time(), 'relevancespider_run_posts', array('args' => array('full_sequence' => 1)));
            }
        }
    }

    public function relevancespider_run_single_assessment($args) {
        $story_id = isset($args['story_id']) ? intval($args['story_id']) : 0;

        if ($story_id > 0) {
            try {
                $story_controller = new StoryController();
                $result = $story_controller->assess_relevance($story_id);
                $story = $this->story_model->get_story_by_id($story_id);
            } catch (\Exception $e) {
                echo "Failed to assess relevance (story ID: " . $story_id . "). Error message: " . $e->getMessage() . "\n";
            }
            if($result) {
                echo substr($story->title, 0, 60) . "\nRelevance: " . $story->relevance_rating_low . " | Emotion: " . $story->emotion_tag . " | ID: " . $story_id . "\n";
            } else {
                echo "Failed to assess relevance (story ID: " . $story_id . ")\n";
            }
        }

        // Mark the action as completed
        as_unschedule_action('relevancespider_run_single_assessment', array($args));    
    }    

    public function relevancespider_run_posts($args = array()) {
        // Set default values
        $args['retry_count'] = isset($args['retry_count']) ? $args['retry_count'] : 0;
        $args['full_sequence'] = isset($args['full_sequence']) ? $args['full_sequence'] : false;
        $args['single_actions_scheduled'] = isset($args['single_actions_scheduled']) ? $args['single_actions_scheduled'] : false;

        // Define the group for scheduled actions
        $group = 'relevancespider_posts';
    
        // Define the maximum number of retries
        $max_retries = 30;

        // Check if there are any pending actions in the group
        $pending_actions = as_get_scheduled_actions(array(
            'hook' => 'relevancespider_run_single_assessment',
            'group' => $group,
            'status' => 'pending')
        );
    
        // If there are no pending actions and they haven't been scheduled before, schedule new actions
        if (count($pending_actions) === 0 && !$args['single_actions_scheduled']) {
            // Get unrated stories grouped by issue
            $stories = $this->story_model->get_stories(array(
                'filter-status' => 'rating',
                'filter-rating-min' => 5,
                'sort-order' => 'rating_desc',
            ));

            if(count($stories) == 0) {
                // Clean up
                $this->unschedule_actions_in_group('relevancespider_run_posts');
                if ($args['full_sequence']) {
                    as_schedule_single_action(time(), 'relevancespider_run_selection', array('args' => array('full_sequence' => 1)));
                }
            } else {            
                // Schedule a single action for each batch of stories
                foreach ($stories as $story) {
                    as_schedule_single_action(time(), 'relevancespider_run_single_post', array(array('story_id' => $story->id)), $group);
                }

                echo "Scheduled " . count($stories) . " post actions\n";
                // Schedule another action to check for more single actions after a short delay
                $args['single_actions_scheduled'] = true;
                $args['retry_count']++;
                as_schedule_single_action(time() + 10, 'relevancespider_run_posts', array('args' => $args));
            }
        } elseif (count($pending_actions) > 0 && $args['retry_count'] < $max_retries) {
            // If there are pending actions and we haven't reached the maximum number of retries,
            // schedule another 'relevancespider_run_preassessments' action to check again after a short delay
            $args['retry_count']++;
            as_schedule_single_action(time() + 10, 'relevancespider_run_posts', array('args' => $args));
        } 
        // If all pending actions are done or the maximum number of retries is reached
        else {
            // Clean up
            $this->unschedule_actions_in_group('relevancespider_run_single_post', $group);
            $this->unschedule_actions_in_group('relevancespider_run_posts');

            // Start next action
            if ($args['full_sequence']) {
                as_schedule_single_action(time(), 'relevancespider_run_selection', array('args' => array('full_sequence' => 1)));
            }
        }
    }

    public function relevancespider_run_single_post($args) {
        $story_id = isset($args['story_id']) ? intval($args['story_id']) : 0;

        if ($story_id > 0) {
            try {
                $story_controller = new StoryController();
                $result = $story_controller->create_post_from_story($story_id);
            } catch (\Exception $e) {
                echo "Failed to create post for story " . $story_id . ". Error message: " . $e->getMessage() . "\n";
            }
            if(!$result) {
                echo "Failed to create post for story " . $story_id . "\n";
            }
        }

        // Mark the action as completed
        as_unschedule_action('relevancespider_run_single_post', array($args));    
    }

    public function relevancespider_run_selection($args = array()) {
        // Set default values
        $args['retry_count'] = isset($args['retry_count']) ? $args['retry_count'] : 0;
        $args['full_sequence'] = isset($args['full_sequence']) ? $args['full_sequence'] : false;
        $args['single_actions_scheduled'] = isset($args['single_actions_scheduled']) ? $args['single_actions_scheduled'] : false;

        // Define the group for scheduled actions
        $group = 'relevancespider_selection';
    
        // Define the maximum number of retries
        $max_retries = 30;

        // Check if there are any pending actions in the group
        $pending_actions = as_get_scheduled_actions(array(
            'hook' => 'relevancespider_run_single_selection',
            'group' => $group,
            'status' => 'pending')
        );
    
        // If there are no pending actions and they haven't been scheduled before, schedule new actions
        if (count($pending_actions) === 0 && !$args['single_actions_scheduled']) {
            // Get posts via WP_Query that are still drafts and that have been created in the last 82 hours
            // Mo/Wed/Fri
            $date_query = date('Y-m-d H:i:s', strtotime('-82 hours'));

            // Define the query arguments
            $args = array(
                'post_type'   => 'post',
                'post_status' => 'draft',
                'date_query'  => array(
                    array(
                        'after' => $date_query,
                        'inclusive' => true,
                    ),
                ),
                'posts_per_page' => -1,  // Retrieve all posts
            );
            // Fetch the posts
            $posts_query = new \WP_Query($args);
            $posts = $posts_query->posts;

            if(count($posts) == 0) {
                // Clean up
                $this->unschedule_actions_in_group('relevancespider_run_selection');
                if ($args['full_sequence']) {
                    as_schedule_single_action(time(), 'relevancespider_run_empty_action', array('args' => array('full_sequence' => 1)));
                }
            } else {            
                // organize posts into batches
                $batch_size = 9;
                $num_posts = count($posts);
                $num_batches = ceil($num_posts / $batch_size);
                echo "Organizing " . $num_posts . " posts into " . $num_batches . " batches with maximum size " . $batch_size . "\n";

                // Initialize batches
                $batches = array_fill(0, $num_batches, []);

                // Distribute posts into batches in a round-robin manner
                foreach ($posts as $index => $post) {
                    $batch_index = $index % $num_batches;
                    $batches[$batch_index][] = $post;
                }

                // Schedule a single action for each batch
                foreach ($batches as $batch_index => $batch) {
                    $post_ids = array_map(function($post) {
                        return $post->ID;
                    }, $batch);
                    as_schedule_single_action(time(), 'relevancespider_run_single_selection', array('args' => array('post_ids' => $post_ids)), $group);
                    echo "Scheduled selection batch of size " . count($post_ids) . " with post ids: " . implode(', ', $post_ids) . "\n";
                }

                // Schedule another action to check for more single actions after a short delay
                $args['single_actions_scheduled'] = true;
                $args['retry_count']++;
                as_schedule_single_action(time() + 10, 'relevancespider_run_selection', array('args' => $args));
            }
        } elseif (count($pending_actions) > 0 && $args['retry_count'] < $max_retries) {
            // If there are pending actions and we haven't reached the maximum number of retries,
            // return after a short delay
            $args['retry_count']++;
            as_schedule_single_action(time() + 10, 'relevancespider_run_selection', array('args' => $args));
        } 
        // If all pending actions are done or the maximum number of retries is reached
        else {
            // Clean up
            $this->unschedule_actions_in_group('relevancespider_run_single_selection', $group);
            $this->unschedule_actions_in_group('relevancespider_run_selection');

            // Start next action
            if ($args['full_sequence']) {
                as_schedule_single_action(time(), 'relevancespider_run_empty_action', array('args' => array('full_sequence' => 1)));
            }
        }
    }
    public function relevancespider_run_single_selection($args) {
        $post_ids = isset($args['post_ids']) ? $args['post_ids'] : array();

        if (is_array($post_ids) && count($post_ids) > 0) {
            echo "Selecting posts from ids " . implode(', ', $post_ids) . "\n";
            try {
                $story_controller = new StoryController();
                $result = $story_controller->select_posts($post_ids);
            } catch (\Exception $e) {
                echo "Failed to select posts from ids " . implode(', ', $post_ids) . ". Error message: " . $e->getMessage() . "\n";
            }
            if(!$result) {
                echo "Failed to select posts from ids " . implode(', ', $post_ids) . "\n";
            }
        }

        // Mark the action as completed
        as_unschedule_action('relevancespider_run_single_selection', array($args));
    }
}