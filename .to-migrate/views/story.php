<?php defined('ABSPATH') or die('No direct access allowed'); ?>

<div class="wrap">
    <h1><?php _e('RelevanceSpider'); ?></h1>

    <p><a href="<?php echo esc_url(admin_url('admin.php?page=relevancespider')); ?>">&larr; <?php _e('Back to Stories'); ?></a></p>

    <form class="relevancespider-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="update_story">
        <input type="hidden" name="story_id" value="<?php echo $story->id; ?>">

        <div>
            <label for="date_published">Date Published:</label>
            <input type="text" name="date_published" id="date_published" style="margin-right: 20px" value="<?php echo isset($story->date_published) ? $story->date_published : ''; ?>">
            <label for="date_crawled">Date Crawled:</label>
            <input type="text" name="date_crawled" id="date_crawled" value="<?php echo isset($story->date_crawled) ? $story->date_crawled : ''; ?>">
        </div>

        <h2>Relevance</h2>
        <div>
            <label for="relevance_rating">Relevance Rating low:</label>
            <input type="number" name="relevance_rating_low" id="relevance_rating_low" min="1" max="10" value="<?php echo $story->relevance_rating_low; ?>">
        </div>
        <div>
            <label for="relevance_rating">Relevance Rating high:</label>
            <input type="number" name="relevance_rating_high" id="relevance_rating_high" min="1" max="10" value="<?php echo $story->relevance_rating_high; ?>">
        </div>
        <div>
            <label for="relevance_reasons">AI response:</label><br>
            <textarea name="ai_response" id="ai_response" rows="20"><?php echo $story->ai_response; ?></textarea>
        </div>

        <div>
            <label for="title">Title:</label>
            <input type="text" name="title" id="title" value="<?php echo $story->title; ?>">
        </div>
        <div>
            <label for="url">URL:</label>
            <input type="text" name="url" id="url" value="<?php echo $story->url; ?>">
        </div>
        <div>
            <label for="url">Emotion:</label>
            <input type="text" name="emotion_tag" id="emotion_tag" value="<?php echo $story->emotion_tag; ?>">
        </div>

        <div>
            <label for="content">Content:</label><br>
            <textarea name="content" id="content" rows="10"><?php echo $story->content; ?></textarea>
        </div>

        <input type="submit" value="Update Story">
    </form>

    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display: inline-block;">
        <input type="hidden" name="action" value="create_post_from_story">
        <input type="hidden" name="id" value="<?php echo $story->id; ?>">
        <button type="submit" class="icon-button no-expand" title="Create a Post based on this story">
            <span class="dashicons dashicons-welcome-add-page"></span>
        </button>
    </form>    

    <p><a href="<?php echo esc_url(admin_url('admin.php?page=relevancespider')); ?>">&larr; <?php _e('Back to Stories'); ?></a></p>

</div>