<?php
/*
Plugin Name: RelevanceSpider
Plugin URI: 
Description: 0.6: + antifactors (and much better reasoning), + SEO improvements, - scenarios
Version: 0.6
Author: Odin Mühlenbein with help from AI
Author URI: https://actuallyrelevant.news
*/

require_once __DIR__ . '/vendor/autoload.php';

# require_once ('.env/environment.php');

require_once plugin_dir_path(__FILE__) . '/vendor/woocommerce/action-scheduler/action-scheduler.php';

require_once plugin_dir_path(__FILE__) . 'controllers/admin_controller.php';
require_once plugin_dir_path(__FILE__) . 'controllers/story_controller.php';
require_once plugin_dir_path(__FILE__) . 'controllers/newsletter_controller.php';
require_once plugin_dir_path(__FILE__) . 'controllers/podcast_controller.php';
require_once plugin_dir_path(__FILE__) . 'controllers/feed_controller.php';
require_once plugin_dir_path(__FILE__) . 'controllers/issue_controller.php';
require_once plugin_dir_path(__FILE__) . 'controllers/rss_controller.php';
require_once plugin_dir_path(__FILE__) . 'controllers/api_controller.php';

use RelevanceSpider\Controllers\AdminController;
use RelevanceSpider\Controllers\StoryController;
use RelevanceSpider\Controllers\NewsletterController;
use RelevanceSpider\Controllers\PodcastController;
use RelevanceSpider\Controllers\FeedController;
use RelevanceSpider\Controllers\IssueController;
use RelevanceSpider\Controllers\RSSController;
use RelevanceSpider\Controllers\ApiController;

$admin_controller = new AdminController();
$story_controller = new StoryController();
$newsletter_controller = new NewsletterController();
$podcast_controller = new PodcastController();
$feed_controller = new FeedController();
$issue_controller = new IssueController();
$rss_controller = new RSSController();
$api_controller = new ApiController();

function relevancespider_enqueue_admin($hook) {
    if ('toplevel_page_relevancespider' === $hook || strpos($hook, 'relevancespider') !== false) {
        wp_enqueue_style('relevancespider-admin', plugin_dir_url(__FILE__) . 'views/css/relevancespider-admin.css');
    }

    wp_enqueue_style('dashicons');

    wp_enqueue_script('relevancespider-admin', plugin_dir_url(__FILE__) . 'views/js/relevancespider-admin.js', array('jquery'), null, true);
    // Pass data to the script to enable automatic download of carousel image files.
    $zip_file_url = get_transient('relevancespider_download_zip');
    if ($zip_file_url) {
        wp_localize_script('relevancespider-admin', 'RelevancespiderData', array(
            'zipFileUrl' => $zip_file_url,
            'ajaxUrl' => admin_url('admin-ajax.php')
        ));
    }

    wp_enqueue_script('jquery');
}
add_action('admin_enqueue_scripts', 'relevancespider_enqueue_admin');

// AJAX function to remove the download carousel file transient
function remove_relevancespider_transient() {
    if (isset($_POST['transient'])) {
        $transient = sanitize_text_field($_POST['transient']);
        delete_transient($transient);
        wp_send_json_success("Transient {$transient} removed.");
    } else {
        wp_send_json_error("No transient provided.");
    }
    wp_die();
}
add_action('wp_ajax_remove_relevancespider_transient', 'remove_relevancespider_transient');

function relevancespider_enqueue_public() {
    wp_enqueue_style('relevancespider_public_styles', plugin_dir_url(__FILE__) . 'views/css/relevancespider-public.css');
    wp_enqueue_script('relevancespider-public-js',plugins_url('views/js/relevancespider-public.js', __FILE__),array(),null,true);
}
add_action('wp_enqueue_scripts', 'relevancespider_enqueue_public');

// Custom fields for relevane ratings, story sources, etc.
require_once plugin_dir_path(__FILE__) . 'custom_fields.php';

// Custom RSS feeds
require_once plugin_dir_path(__FILE__) . 'rss.php';

// Shortcodes
require_once plugin_dir_path(__FILE__) . 'shortcodes/relevance.php';
require_once plugin_dir_path(__FILE__) . 'shortcodes/story.php';
require_once plugin_dir_path(__FILE__) . 'shortcodes/methodology.php';
require_once plugin_dir_path(__FILE__) . 'shortcodes/feedback.php';