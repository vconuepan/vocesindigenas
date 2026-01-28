<?php
namespace RelevanceSpider\Models;

defined('ABSPATH') or die('No direct access allowed');

class StoryModel {
    private $table_name = 'rs_stories';
    private $wpdb;

    public function __construct($wpdb) {
        $this->wpdb = $wpdb;
    }

    private function add_filters($sql, $filters = array()) {
        $filter_language = $filters['filter-language'] ?? ($_GET['filter-language'] ?? '');
        $filter_issue = isset($filters['filter-issue']) ? $filters['filter-issue'] : (isset($_GET['filter-issue']) ? $_GET['filter-issue'] : '');
        $filter_status = isset($filters['filter-status']) ? $filters['filter-status'] : (isset($_GET['filter-status']) ? $_GET['filter-status'] : '');
        $filter_crawled_after = isset($filters['filter-crawled-after']) ? $filters['filter-crawled-after'] : (isset($_GET['filter-crawled-after']) ? $_GET['filter-crawled-after'] : '');
        $filter_crawled_before = isset($filters['filter-crawled-before']) ? $filters['filter-crawled-before'] : (isset($_GET['filter-crawled-before']) ? $_GET['filter-crawled-before'] : '');
        $filter_rating_min = isset($filters['filter-rating-min']) ? $filters['filter-rating-min'] : (isset($_GET['filter-rating-min']) ? $_GET['filter-rating-min'] : 1);
        $filter_rating_max = isset($filters['filter-rating-max']) ? $filters['filter-rating-max'] : (isset($_GET['filter-rating-max']) ? $_GET['filter-rating-max'] : 10);
        $filter_emotion_tag = isset($filters['filter-emotion-tag']) ? $filters['filter-emotion-tag'] : (isset($_GET['filter-emotion-tag']) ? $_GET['filter-emotion-tag'] : '');        
    
        // Add filter conditions
        if (!empty($filter_issue)) {
            $sql .= $this->wpdb->prepare(" AND i.id = %d", $filter_issue);
        }
        switch ($filter_status) {
            case 'unrated':
                $sql .= " AND relevance_rating_low IS NULL";
                break;
            case 'pre-rating':
                $sql .= " AND relevance_rating_low > 0 AND relevance_rating_high IS NULL";
                break;
            case 'rating':
                $sql .= " AND relevance_rating_high > 0 AND post_id = 0";
                break;
            case 'post':
                $sql .= " AND post_id > 0";
                break;
        }

        if (!empty($filter_language)) {
            $sql .= $this->wpdb->prepare(" AND f.language = %s", $filter_language);
        }
        
        if (!empty($filter_crawled_after)) {
            $sql .= $this->wpdb->prepare(" AND date_crawled >= %s", $filter_crawled_after . ' 00:00:00');
        }
        if (!empty($filter_crawled_before)) {
            $sql .= $this->wpdb->prepare(" AND date_crawled <= %s", $filter_crawled_before . ' 23:59:59');
        }

        if (!empty($filter_rating_min) && $filter_rating_min > 1) {
            $sql .= $this->wpdb->prepare(" AND relevance_rating_low >= %d", $filter_rating_min);
        }
        if (!empty($filter_rating_max) && $filter_rating_max < 10) {
            $sql .= $this->wpdb->prepare(" AND relevance_rating_low <= %d", $filter_rating_max);
        }

        if (!empty($filter_emotion_tag)) {
            switch($filter_emotion_tag) {
                case 'Uplifting':
                case 'Surprising':
                case 'Frustrating':
                case 'Scary':
                case 'Calm':
                    $sql .= $this->wpdb->prepare(" AND emotion_tag = %s", $filter_emotion_tag);
                    break;
            }
        }
    
        return $sql;
    }

    public function get_stories($filters = array()) {
        $records_per_page = isset($filters['records-per-page']) ? intval($filters['records-per-page']) : (isset($_GET['records-per-page']) ? $_GET['records-per-page'] : 0);
        $current_page = isset($filters['paged']) ? intval($filters['paged']) : (isset($_GET['paged']) ? intval($_GET['paged']) : 1);
        $sort_order = isset($filters['sort-order']) ? $filters['sort-order'] : (isset($_GET['sort-order']) ? $_GET['sort-order'] : 'id_desc');
    
        // Modify your SQL query to include the filter and sort values
        $sql = "SELECT s.*, f.title as feed_title, i.id as issue_id, i.name as issue_name 
                FROM {$this->wpdb->prefix}{$this->table_name} as s
                JOIN {$this->wpdb->prefix}rs_feeds as f
                ON s.feed_id = f.id
                JOIN {$this->wpdb->prefix}rs_issues as i
                ON f.issue_id = i.id
                WHERE true";
    
        $sql = $this->add_filters($sql, $filters);
    
        // Add GROUP BY for issue or feed
        if (isset($filters['group-by'])) {
            if ($filters['group-by'] == 'issue') {
                $sql .= " GROUP BY i.id";
            } elseif ($filters['group-by'] == 'feed') {
                $sql .= " GROUP BY f.id";
            }
        }
    
        // Add sorting
        switch ($sort_order) {
            case 'rating_asc':
                $sql .= " ORDER BY relevance_rating_low ASC";
                break;
            case 'rating_desc':
                $sql .= " ORDER BY relevance_rating_low DESC";
                break;
            case 'id_asc':
                $sql .= " ORDER BY s.id ASC";
                break;
            case 'id_desc':
                $sql .= " ORDER BY s.id DESC";
                break;
            case 'date_published_asc':
                $sql .= " ORDER BY s.date_published ASC";
                break;
            case 'date_published_desc':
                $sql .= " ORDER BY s.date_published DESC";
                break;
            case 'title_asc':
                $sql .= " ORDER BY s.title ASC";
                break;
            case 'title_desc':
                $sql .= " ORDER BY s.title DESC";
                break;
            // Sort by feed in addition to issue
            // Useful for scheduled preassessment runs
            case 'issue_asc':
                $sql .= " ORDER BY i.name ASC, f.id";
                break;
            case 'issue_desc':
                $sql .= " ORDER BY i.name DESC, f.id";
                break;
        }
    
        // Add limit and offset for pagination
        if($records_per_page > 0) {
            $offset = ($current_page - 1) * $records_per_page;
            $sql .= $this->wpdb->prepare(" LIMIT %d OFFSET %d", $records_per_page, $offset);
        }
    
        # print_r($sql);

        return $this->wpdb->get_results($sql);
    }
    

    public function get_story_by_id($id) {
        return $this->wpdb->get_row($this->wpdb->prepare("SELECT * FROM {$this->wpdb->prefix}{$this->table_name} WHERE id = %d", $id));
    }    
    public function get_stories_by_ids($ids) {
        if (empty($ids) || !is_array($ids)) {
            return array();
        }

        $placeholders = implode(', ', array_fill(0, count($ids), '%d'));
        $sql = $this->wpdb->prepare("SELECT * FROM {$this->wpdb->prefix}{$this->table_name} WHERE id IN ($placeholders)", ...$ids);

        return $this->wpdb->get_results($sql);
    }
    public function get_number_of_stories() {
        $sql = "SELECT COUNT(*) FROM {$this->wpdb->prefix}{$this->table_name} WHERE true ";
        $sql = $this->add_filters($sql);
        $result = $this->wpdb->get_var($sql);
        return $result;
    }
    public function delete_story($id) {
        return $this->wpdb->delete($this->wpdb->prefix . $this->table_name, array('id' => $id));
    }

    public function get_crawled_stories_urls($limit = 3000) {
        $sql = $this->wpdb->prepare("SELECT url FROM {$this->wpdb->prefix}{$this->table_name} ORDER BY id DESC LIMIT %d", $limit);
        return $this->wpdb->get_col($sql);
    }    

    public function add_story($url, $title, $content, $feed_id = null, $date_published = '') {

        if(!empty($date_published)) {
            $datetime_obj = new \DateTime($date_published);
            $date_published_datetime = $datetime_obj->format('Y-m-d H:i:s');
        } else {
            $date_published_datetime = null;
        }

        $result = $this->wpdb->insert(
            $this->wpdb->prefix . $this->table_name,
            array(
                'feed_id' => $feed_id,
                'date_published' => $date_published_datetime,
                // escape to make sure that '&' stuff is compared correctly in view files
                'url' => esc_url($url),
                'date_crawled' => current_time('mysql'),
                'title' => $this->wpdb->_real_escape($title),
                'content' => $this->wpdb->_real_escape(
                    // get rid of empty lines
                    preg_replace('/^\h*\v+/m', '', $content)
                ),
            )
        );

        return $result;
    }

    public function update_relevance($story_id, $relevance_rating_low = null, $relevance_rating_high = null, $ai_response = null) {
        return $this->update_story($story_id, array(
            'relevance_rating_low' => $relevance_rating_low,
            'relevance_rating_high' => $relevance_rating_high,
            'ai_response' => $ai_response
        ));
    }

    public function set_post($story_id, $post_id) {
        return $this->update_story($story_id, array('post_id' => $post_id));
    }

    public function update_story($story_id, $data) {
        // Prepare the data to update
        $prepared_data = array();
        $format = array();

        foreach ($data as $key => $value) {
            switch ($key) {
                case 'date_published':
                case 'ai_response':
                case 'title':
                case 'url':
                case 'content':
                case 'emotion_tag':
                    $prepared_data[$key] = $value;
                    $format[] = '%s';
                    break;
                case 'relevance_rating_low':
                case 'relevance_rating_high':
                case 'post_id':
                    $prepared_data[$key] = $value;
                    $format[] = '%d';
                    break;
            }
        }

        // Update the story in the database
        $updated = $this->wpdb->update($this->wpdb->prefix . $this->table_name, $prepared_data, array('id' => $story_id), $format, array('%d'));

        // Debug in CLI mode
        # print_r($this->wpdb->last_query);
        # print_r($updated);

        // Return true if the update was successful, false otherwise
        return $updated !== false;
    }

}