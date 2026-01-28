<?php
defined('ABSPATH') or die('No direct access allowed');

/**
 * Adding custom fields to WP posts
 */

function relevancespider_custom_meta_box() {
    add_meta_box(
        'relevancespider_meta_box',
        'RelevanceSpider fields',
        'relevancespider_custom_meta_box_callback',
        'post',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'relevancespider_custom_meta_box');

function relevancespider_custom_meta_box_callback($post) {
    wp_nonce_field('relevancespider_custom_meta_box_nonce', 'relevancespider_custom_meta_box_nonce');
    
    $fields = array(
        'relevance_edited_by_human' => 'Did a human editor make changes to the AI-based relevance rating?',
        'story_summary' => 'Story summary',
        'story_quote' => 'Quote from the article',
        'relevance_summary' => 'Relevance rating summary',
        'relevance_rating_low' => 'Conservative relevance rating (1-10)',
        'relevance_rating_high' => 'Speculative relevance rating (1-10)',
        'relevance_reasons' => 'Supporting factors (one per line)',
        'relevance_antifactors' => 'Limiting factors (one per line)',
        'relevance_calculation' => 'Relevance rating calculation',
        'marketing_blurb' => 'Short blurb for newsletter and Twitter (max 230 characters)',
        'story_title' => 'Story title',
        'story_url' => 'Story URL',
        'story_publisher' => 'Story Publisher',
        'story_date' => 'Story Date',
        'relevance_scenarios' => 'Scenarios for speculative rating. One per line',
        'marked_for_newsletter' => 'Marked for newsletter?',
        'marked_for_podcast' => 'Marked for podcast?',
    );

    foreach ($fields as $field_key => $field_label) {
        try {
            $value = get_post_meta($post->ID, $field_key, true);

            echo '<p>';
            echo '<label for="' . $field_key . '">' . $field_label . ': </label>';

            if (in_array($field_key, array('relevance_reasons', 'relevance_antifactors', 'relevance_calculation', 'relevance_scenarios'))) {
                if(is_array($value)) {
                    $value = implode("\n", $value);
                }
                echo '<br><textarea id="' . $field_key . '" name="' . $field_key . '" rows="6" cols="50" style="width: 100%;">' . $value . '</textarea>';
            } elseif (in_array($field_key, array('relevance_summary', 'story_summary', 'marketing_blurb'))) {
                echo '<br><textarea id="' . $field_key . '" name="' . $field_key . '" rows="4" cols="50" style="width: 100%;">' . esc_textarea($value) . '</textarea>';
            } elseif (in_array($field_key, array('relevance_edited_by_human', 'marked_for_newsletter', 'marked_for_podcast'))) {
                $checked = $value ? 'checked' : '';
                echo '<input type="checkbox" id="' . $field_key . '" name="' . $field_key . '" value="1" ' . $checked . '>';
            } else {
                $input_type = ($field_key === 'relevance_rating_low' || $field_key === 'relevance_rating_high') ? 'number' : 'text';
                $input_type = ($field_key === 'story_date') ? 'date' : $input_type;
                $input_style = ($field_key === 'relevance_rating_low' || $field_key === 'relevance_rating_high') ? 'width: 60px;' : 'width: 100%;';
                echo '<input type="' . $input_type . '" id="' . $field_key . '" name="' . $field_key . '" value="' . esc_attr($value) . '" style="' . $input_style . '">';
            }

            echo '</p>';
        } catch (Exception $e) {
            echo '<p>Problem with custom field: ' . $field_key . '.</p>';
        }
    }
}

function relevancespider_custom_meta_box_save($post_id) {
    if (!isset($_POST['relevancespider_custom_meta_box_nonce']) || !wp_verify_nonce($_POST['relevancespider_custom_meta_box_nonce'], 'relevancespider_custom_meta_box_nonce')) {
        return;
    }

    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $fields = array(
        'relevance_rating_low',
        'relevance_rating_high',
        'relevance_reasons',
        'relevance_scenarios',
        'relevance_summary',
        'relevance_edited_by_human',
        'marketing_blurb',
        'story_title',
        'story_url',
        'story_publisher',
        'story_summary',
        'story_date',
        'marked_for_newsletter',
        'marked_for_podcast'
    );

    foreach ($fields as $field_key) {
        if (isset($_POST[$field_key])) {
            if ($field_key === 'relevance_scenarios' || $field_key === 'relevance_reasons') {
                $value = explode("\n", $_POST[$field_key]);
            } else {
                $value = sanitize_text_field($_POST[$field_key]);
                if ($field_key === 'story_date') {
                    $value = date('Y-m-d H:i:s', strtotime($value));
                }
            }
            update_post_meta($post_id, $field_key, $value);
        } else {
            // Special handling for the checkbox fields
            if (in_array($field_key, array('relevance_edited_by_human', 'marked_for_newsletter', 'marked_for_podcast'))) {
                delete_post_meta($post_id, $field_key);
            }
        }
    }
}
add_action('save_post', 'relevancespider_custom_meta_box_save');

// Add custom columns to the post type manage screen
function relevancespider_set_custom_edit_book_columns($columns) {
    $columns['marked_for_newsletter'] = 'Newsletter?';
    $columns['marked_for_podcast'] = 'Podcast?';
    return $columns;
}
add_filter('manage_post_posts_columns', 'relevancespider_set_custom_edit_book_columns');

// Make columns sortable
function relevancespider_manage_sortable_columns($columns) {
    $columns['marked_for_newsletter'] = 'marked_for_newsletter';
    $columns['marked_for_podcast'] = 'marked_for_podcast';
    return $columns;
}
add_filter('manage_edit-post_sortable_columns', 'relevancespider_manage_sortable_columns');

// Define the query to sort posts
function relevancespider_sort_posts($query) {
    if(! is_admin() || ! $query->is_main_query()) {
        return;
    }

    if ($query->get('orderby') == 'marked_for_newsletter') {
        $query->set('meta_key', 'marked_for_newsletter');
        $query->set('orderby', 'meta_value_num');
    } elseif ($query->get('orderby') == 'marked_for_podcast') {
        $query->set('meta_key', 'marked_for_podcast');
        $query->set('orderby', 'meta_value_num');
    }
}
add_action('pre_get_posts', 'relevancespider_sort_posts');

// Add the data to the custom column for the post type manage screen
function relevancespider_custom_posts_column($column, $post_id) {
    $custom_field_value = get_post_meta($post_id, $column, true);
    $checked = $custom_field_value ? 'checked' : '';
    if ($column === 'marked_for_newsletter' || $column === 'marked_for_podcast') {
        echo '<input type="checkbox" class="'. $column .'" data-post-id="'. $post_id .'" '. $checked .'/>';
    }
}
add_action('manage_post_posts_custom_column', 'relevancespider_custom_posts_column', 10, 2);

// Update the custom field value
function relevancespider_update_custom_field() {
    $post_id = intval($_POST['post_id']);
    $meta_key = sanitize_text_field($_POST['meta_key']);
    $value = intval($_POST['value']);

    update_post_meta($post_id, $meta_key, $value);

    echo 'success';
    wp_die();
}
add_action('wp_ajax_update_custom_field', 'relevancespider_update_custom_field');

// Add inline JavaScript to the admin footer
function relevancespider_add_inline_javascript() {
    ?>
    <script type="text/javascript">
    jQuery(document).ready(function($) {
        $('.marked_for_newsletter, .marked_for_podcast').change(function() {
            var postId = $(this).data('post-id');
            var metaKey = $(this).hasClass('marked_for_newsletter') ? 'marked_for_newsletter' : 'marked_for_podcast';
            var value = $(this).is(':checked') ? 1 : 0;

            var data = {
                'action': 'update_custom_field',
                'post_id': postId,
                'meta_key': metaKey,
                'value': value
            };

            $.post(ajaxurl, data, function(response) {
                // You can show a success message or do something else here if you wish
            });
        });
    });
    </script>
    <?php
}
add_action('admin_footer', 'relevancespider_add_inline_javascript');


/**
 * Filters the description.
 *
 * @param string $description The current page's generated meta description.
 * @return string The filtered meta description.
 */
function relevancespider_filter_description( $description ) {
    if ( is_singular('post') ) {
        $relevance_rating_low = get_post_meta(get_the_ID(), 'relevance_rating_low', true);
        $description = 'Relevance for humanity as a whole: ' . $relevance_rating_low . ' out of 10. (That\'s pretty high.) Click to learn why.';
    }
    return $description;
}
add_filter( 'wpseo_metadesc', 'relevancespider_filter_description' );

/*
// If we ever want to adjust the Twitter-specific title and image
add_filter( 'wpseo_twitter_description', 'relevancespider_filter_description' );

function relevancespider_filter_twitter_title( $title ) {
    if ( is_singular('post') ) {
        $title = wpseo_replace_vars( '%%title%%', get_post(get_the_ID()) );
    }
    return $title . " - Actually Relevant";
}
add_filter( 'wpseo_twitter_title', 'relevancespider_filter_twitter_title' );

function relevancespider_filter_twitter_image( $img ) {
    if ( is_singular('post') ) {
        $img = wpseo_replace_vars( '%%og_image%%', get_post(get_the_ID()) );
    }
    return $img;
}
add_filter( 'wpseo_twitter_image', 'relevancespider_filter_twitter_image' );
*/