<?php
namespace RelevanceSpider\Models;

defined('ABSPATH') or die('No direct access allowed');

require_once plugin_dir_path(__FILE__) . 'base.php';

class IssueModel extends BaseModel {
    public function __construct($wpdb) {
        parent::__construct($wpdb);

        $this->table_name = 'rs_issues';
        $this->fields = array(
            'id' => array('type' => 'int'),
            'category_id' => array('type' => 'int'),
            'name' => array('type' => 'string'),
            'description' => array('type' => 'string'),
            'factors' => array('type' => 'text'),
            'antifactors' => array('type' => 'text'),
            'ratings' => array('type' => 'text'),
        );
    }

    // move to chatGPT?
    public function generate_prompt_section($issue) {
        $prompt = "<FACTORS>\n" . $issue->factors . "\n</FACTORS>\n\n";
        $prompt .= "<TOPIC-SPECIFIC LIMITING FACTORS>\n" . $issue->antifactors . "\n</TOPIC-SPECIFIC LIMITING FACTORS>\n\n";
        $prompt .= "<RATINGS>\n" . $issue->ratings . "\n</RATINGS>";
        return $prompt;
    }
}