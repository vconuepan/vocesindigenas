<?php defined('ABSPATH') or die('No direct access allowed'); 

function RelevanceSpider_count_crawled_stories($feed_rss_stories, $crawled_stories_urls) {
    $count = 0;
    foreach($feed_rss_stories as $story) {
        $count += in_array(esc_url($story['link']), $crawled_stories_urls) ? 1 : 0;
    }
    return $count;
}
?>

<div class="wrap">
    <h1><?php echo _e('RelevanceSpider'); ?> - Feeds</h1>

    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="add_feed">
        <input type="hidden" name="active" value="1">
        <label for="title"><?php _e('Title'); ?></label>
        <input type="text" name="title" id="title" required>
        <label for="url"><?php _e('URL'); ?></label>
        <input type="text" name="url" id="url" required>
        <!--
            <label for="content_container"><?php _e('Content container'); ?></label>
            <input type="text" name="content_container" id="content_container">
        -->
        <label for="issue_id"><?php _e('Issue'); ?></label>
        <select name="issue_id" id="issue_id" required>
            <option value="" disabled selected><?php _e('Select an issue'); ?></option>
            <?php foreach ($data['issues'] as $issue) : ?>
                <option value="<?php echo $issue->id; ?>"><?php echo $issue->name; ?></option>
            <?php endforeach; ?>
        </select>
        <label for="language"><?php _e('Language'); ?></label>
        <select name="language" id="language" required>
            <option value="ar">Arabic</option>
            <option value="zh">Chinese</option>
            <option value="cs">Czech</option>
            <option value="da">Danish</option>
            <option value="nl">Dutch</option>
            <option value="en" selected>English</option>
            <option value="fi">Finnish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="hu">Hungarian</option>
            <option value="id">Indonesian</option>
            <option value="it">Italian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="no">Norwegian</option>
            <option value="pl">Polish</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="es">Spanish</option>
            <option value="sv">Swedish</option>
            <option value="vi">Vietnamese</option>
        </select>
        <button type="submit"><?php _e('Add Feed'); ?></button>
    </form>

    <hr style="margin-top: 20px; margin-bottom: 20px">

    <?php if (!empty($data['feeds'])) : ?>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th><?php _e('Title'); ?></th>
                    <th><?php _e('Description'); ?></th>
                    <th><?php _e('Issue'); ?></th>
                    <!-- <th><?php _e('Content container'); ?></th> -->
                    <!-- <th style="width: 8em"><?php _e('Language'); ?></th> -->
                    <th style="width: 8em"><?php _e('Active'); ?></th>
                    <!-- <th><?php _e('Comment'); ?></th> -->
                    <th style="width: 8em"><?php _e('Crawled'); ?></th>
                    <th style="width: 10em"><?php _e('Last crawled'); ?></th>
                    <th style="width: 8em"><?php _e('Interval'); ?></th>
                    <th style="width: 8em"><?php _e('Actions'); ?></th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($data['feeds'] as $feed) : ?>
                    <tr>
                        <td>
                            <a href="<?php echo esc_url(admin_url("admin.php?page=relevancespider-feeds&subpage=feed&id={$feed->id}")); ?>">
                            <?php echo $feed->title; ?></a>
                        </td>

                        <td><?php echo $feed->description; ?></td>

                        <td>
                            <a href="<?php echo esc_url(admin_url("admin.php?page=relevancespider-issues&subpage=issue&id={$feed->issue_id}")); ?>">
                            <?php echo $feed->issue_name; ?></a>
                        </td>

                        <!-- <td><?php echo $feed->content_container; ?></td> -->
                        <!-- <td><?php echo $feed->language; ?></td> -->

                        <td>
                            <?php echo ($feed->active ? "Yes" : "No"); ?> &nbsp;
                            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"  style="display: inline-block;">
                                <input type="hidden" name="action" value="feed_set_<?php echo ($feed->active ? "in" : ""); ?>active">
                                <input type="hidden" name="id" value="<?php echo $feed->id; ?>">
                                <button type="submit" class="icon-button no-expand" title="Change">
                                    <span class="dashicons dashicons-image-rotate"></span>
                                </button>
                            </form>
                   
                        </td>

                        <!-- <td><?php echo $feed->comment; ?></td> -->

                        <td><?php
                            echo RelevanceSpider_count_crawled_stories($data['feed_rss_stories'][$feed->id], $data['crawled_stories_urls']);
                            echo " / ";
                            echo count($data['feed_rss_stories'][$feed->id]);
                        ?></td>

                        <td><?php echo substr($feed->last_crawled, 0, 16); ?></td>

                        <td><?php echo ($feed->interval_hours > 0 ? $feed->interval_hours . " hours" : ""); ?></td>

                        <td>
                            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"  style="display: inline-block;">
                                <input type="hidden" name="action" value="crawl_feed">
                                <input type="hidden" name="id" value="<?php echo $feed->id; ?>">
                                <button type="submit" class="icon-button no-expand" title="Crawl feed">
                                    <span class="dashicons  dashicons-welcome-view-site"></span>
                                </button>
                            </form>
                            - <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"  style="display: inline-block;">
                                <input type="hidden" name="action" value="delete_feed">
                                <input type="hidden" name="id" value="<?php echo $feed->id; ?>">
                                <button type="submit" class="icon-button no-expand" title="Delete" onclick="return confirm('<?php _e('Are you sure you want to delete this feed?'); ?>')">
                                    <span class="dashicons dashicons-trash" style="color: red"></span>
                                </button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php else : ?>
        <p><?php _e('No feeds added yet.'); ?></p>
    <?php endif; ?>
</div>