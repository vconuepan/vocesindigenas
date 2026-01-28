<?php
namespace RelevanceSpider\Models;

defined('ABSPATH') or die('No direct access allowed');

require_once plugin_dir_path(__FILE__) . 'base.php';

// require_once dirname(__FILE__) . '/../lib/php-goose/autoloader.php';
require_once dirname(__FILE__) . '/../vendor/autoload.php';
use Goose\Client as GooseClient;

use HungCP\PhpSimpleHtmlDom\HtmlDomParser;
use Soundasleep\Html2Text;

class FeedModel extends BaseModel {
    public function __construct($wpdb) {
        parent::__construct($wpdb);

        $this->table_name = 'rs_feeds';
        $this->fields = array(
            'id' => array('type' => 'int'),
            'title' => array('type' => 'string'),
            'description' => array( 'type' => 'string'),
            'url' => array('type' => 'url'),
            'issue_id' => array('type' => 'int'),
            'content_container' => array('type' => 'string'),
            'language' => array('type' => 'string'),
            'active' => array('type' => 'int'),
            'comment' => array('type' => 'string'),
            'last_crawled' => array('type' => 'date'),
            'interval_hours' => array('type' => 'int'),
        );
    }

    public function add_feed($title, $url, $issue_id, $content_container = '', $language = 'en') {
        $this->wpdb->insert(
            $this->wpdb->prefix . $this->table_name,
            array(
                'title' => $title,
                'url' => $url,
                'issue_id' => $issue_id,
                'content_container' => $content_container,
                'language' => $language
            )
        );
        return $this->wpdb->insert_id;
    }

    public function get_feeds($last_crawled_before_hours = 0, $only_active = false, $respect_interval_hours = false) {
        $current_time = time();
        $last_crawled_cutoff = $current_time - ($last_crawled_before_hours * 60 * 60);

        $sql = "SELECT f.*, i.name as issue_name
                FROM {$this->wpdb->prefix}{$this->table_name} as f
                JOIN {$this->wpdb->prefix}rs_issues as i
                ON f.issue_id = i.id
                WHERE (f.last_crawled IS NULL OR UNIX_TIMESTAMP(f.last_crawled) < %d)";

        if ($only_active) {
            $sql .= " AND f.active = 1";
        }

        if ($respect_interval_hours) {
            $sql .= " AND (f.interval_hours = 0 OR f.last_crawled IS NULL OR UNIX_TIMESTAMP(f.last_crawled) < %d - (f.interval_hours * 60 * 60))";
            $prepared_sql = $this->wpdb->prepare($sql, $last_crawled_cutoff, $current_time);
        } else {
            $prepared_sql = $this->wpdb->prepare($sql, $last_crawled_cutoff);
        }

        return $this->wpdb->get_results($prepared_sql);
    }
    public function get_feed_by_id($id) {
        return $this->wpdb->get_row($this->wpdb->prepare("SELECT * FROM {$this->wpdb->prefix}{$this->table_name} WHERE id = %d", $id));
    }    

    /**
     * Returns an array of feeds for a given issue
     */
    public function get_feeds_by_issue($issue_id) {
        return $this->wpdb->get_results($this->wpdb->prepare("SELECT * FROM {$this->wpdb->prefix}{$this->table_name} WHERE issue_id = %d", $issue_id));	
    }    

    public function delete_feed($id) {
        return $this->wpdb->delete($this->wpdb->prefix . $this->table_name, array('id' => $id));
    }

    public function set_inactive($id, $comment = "") {
        return $this->wpdb->update(
            $this->wpdb->prefix . $this->table_name,
            array(
                'active' => 0,
                'comment' => $comment
            ),
            array('id' => $id)
        );
    }
    public function set_active($id, $comment = "") {
        return $this->wpdb->update(
            $this->wpdb->prefix . $this->table_name,
            array(
                'active' => 1,
                'comment' => $comment
            ),
            array('id' => $id)
        );
    }

    public function get_rss_stories($id, $n = 20) {
        $feed = $this->get_feed_by_id($id);

        if (!$feed) {
            return array();
        }

        // Include the required file for the fetch_feed function
        include_once(ABSPATH . WPINC . '/feed.php');

        try {
            // Fetch the feed using the URL
            $decoded_feed_url = urldecode($feed->url);
            $rss = fetch_feed($decoded_feed_url);
            
            if (is_wp_error($rss)) {
                return array(); // Return an empty array if there's an error fetching the feed
            }

            // Set the number of stories to display
            $max_items = $rss->get_item_quantity($n);
            $rss_items = $rss->get_items(0, $max_items);

            $stories = array();
            foreach ($rss_items as $item) {
                $stories[] = array(
                    'title' => $item->get_title(),
                    'link' => $item->get_permalink(),
                    // formatting magic to match MySQL datetime
                    'date_published' => date('Y-m-d H:i:s', strtotime($item->get_date())),
                    'description' => $item->get_description(),
                );
            }

            return $stories;
        } catch (\Exception $e) {
            return array();
        }
    }

    public function crawl_story($url, $language = 'en') {
        $goose = new GooseClient([
            // Language - Selects common word dictionary
            //   Supported languages (ISO 639-1):
            //     ar, cs, da, de, en, es, fi, fr, hu, id, it, ja,
            //     ko, nb, nl, no, pl, pt, ru, sv, vi, zh
            'language' => $language,
            // Minimum image size (bytes)
            'image_min_bytes' => 4500,
            // Maximum image size (bytes)
            'image_max_bytes' => 5242880,
            // Minimum image size (pixels)
            'image_min_width' => 120,
            // Maximum image size (pixels)
            'image_min_height' => 120,
            // Fetch best image
            'image_fetch_best' => false,
            // Fetch all images
            'image_fetch_all' => false,
            // Guzzle configuration - All values are passed directly to Guzzle
            //   See: http://guzzle.readthedocs.io/en/stable/request-options.html
            'browser' => [
                'timeout' => 8,
                'connect_timeout' => 5
            ]
        ]);

        try {
            $article = $goose->extractContent($url);
        } catch (\Exception $e) {
            return false;
        }

        return array(
            'title' => $article->getTitle(),
            'content' => $article->getCleanedArticleText(),
            'metaDescription' => $article->getMetaDescription(),
            'domain' => $article->getDomain()
        );
    }

    // container sample: div.known-article-class
    public function crawl_story_by_element($url, $container = 'body') {
        try {
            $html_content = file_get_contents($url);

            // Use PHP Simple HTML DOM Parser to extract the specific content container
            $dom = HtmlDomParser::str_get_html($html_content);
            if($dom) {
                $content_container = $dom->find($container, 0);
                unset($dom);
        
                if($content_container !== null) {
                    // Extract content using Html2Text
                    $html_text = $content_container->innertext();
                    $cleaned_text = Html2Text::convert($html_text);
                    return $cleaned_text;
                }
            }
            return false;
        } catch (\Exception $e) {
            return false;
        }
    }

    public function crawl_story_pipfeed($url) {
        $api_key = get_option('relevancespider_api_key_pipfeed');
        
        // Debugging: Check if the API key is set
        if (empty($api_key)) {
            echo "API key not set!";
            return null;
        }

        $curl = curl_init();

        curl_setopt_array($curl, [
            CURLOPT_URL => "https://news-article-data-extract-and-summarization1.p.rapidapi.com/extract/",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode([
                'url' => $url
            ]),
            CURLOPT_HTTPHEADER => [
                "X-RapidAPI-Host: news-article-data-extract-and-summarization1.p.rapidapi.com",
                "X-RapidAPI-Key: " . $api_key,
                "content-type: application/json"
            ],
        ]);
        
        $response = curl_exec($curl);
        $curl_error = curl_error($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
    
        if ($http_code == 200) {
            $response_data = json_decode($response, true);
    
            if (isset($response_data['text']) && \strlen($response_data['text']) > 0) {
                return $response_data;
            } else {
                return null;
            }
        } else {
            \error_log("Error: HTTP status $http_code");
            \error_log("cURL error: $curl_error");
            \error_log("Response: $response");
            \error_log("URL: $url");
            return null;
        }
    }

    public function update_feed_last_crawled($id) {
        return $this->wpdb->update(
            $this->wpdb->prefix . $this->table_name,
            array('last_crawled' => date('Y-m-d H:i:s')),
            array('id' => $id)
        );
    }
}