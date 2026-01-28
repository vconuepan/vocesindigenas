<?php defined('ABSPATH') or die('No direct access allowed'); ?>

<div class="wrap">
    <h1><?php _e('RelevanceSpider'); ?> - Stories</h1>

    <form id="filter-form" method="GET">
        <label for="filter-issue"></label>
        <select name="filter-issue" id="filter-issue">
            <option value=""<?php echo (empty($_GET['filter-issue']) ? ' selected' : ''); ?>>All Issues</option>
            <?php foreach($issues as $issue) {
                echo '<option value="' . $issue->id . '"' . (isset($_GET['filter-issue']) && $_GET['filter-issue'] == $issue->id ? ' selected' : '') . '>' . $issue->name . '</option>';
            } ?>
        </select>

        <label for="filter-status"></label>
        <select name="filter-status" id="filter-status">
            <option value="" <?php echo (empty($_GET['filter-status']) ? 'selected' : ''); ?>>All statuses</option>
            <option value="unrated" <?php echo (isset($_GET['filter-status']) && $_GET['filter-status'] == 'unrated' ? 'selected' : ''); ?>>Unrated</option>
            <option value="pre-rating" <?php echo (isset($_GET['filter-status']) && $_GET['filter-status'] == 'pre-rating' ? 'selected' : ''); ?>>Pre-rated</option>
            <option value="rating" <?php echo (isset($_GET['filter-status']) && $_GET['filter-status'] == 'rating' ? 'selected' : ''); ?>>Rated</option>
            <option value="post" <?php echo (isset($_GET['filter-status']) && $_GET['filter-status'] == 'post' ? 'selected' : ''); ?>>Post written</option>
        </select>

        <label for="filter-crawled-after">Crawled</label>
        <input type="date" name="filter-crawled-after" id="filter-crawled-after" value="<?php echo isset($_GET['filter-crawled-after']) ? $_GET['filter-crawled-after'] : ''; ?>">

        <label for="filter-crawled-before">-</label>
        <input type="date" name="filter-crawled-before" id="filter-crawled-before" value="<?php echo isset($_GET['filter-crawled-before']) ? $_GET['filter-crawled-before'] : ''; ?>">

        <label for="sort-order"></label>
        <select name="sort-order" id="sort-order">
            <option value="id_desc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'id_desc' ? ' selected' : ''); ?>>ID (new to old)</option>
            <option value="id_asc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'id_asc' ? ' selected' : ''); ?>>ID (old to new)</option>
            <option value="date_published_desc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'date_published_desc' ? ' selected' : ''); ?>>Publication date (recent to old)</option>
            <option value="date_published_asc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'date_published_asc' ? ' selected' : ''); ?>>Publication date (old to recent)</option>
            <option value="rating_desc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'rating_desc' ? ' selected' : ''); ?>>Rating (high to low)</option>
            <option value="rating_asc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'rating_asc' ? ' selected' : ''); ?>>Rating (low to high)</option>
            <option value="title_asc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'title_asc' ? ' selected' : ''); ?>>Title (A-Z)</option>
            <option value="title_desc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'title_desc' ? ' selected' : ''); ?>>Title (Z-A)</option>
        </select>
        
        <button type="submit">Apply</button>
    </form>

    <div class="relevancespider_pagination">
        <?php
        $range = 2; // Adjust this value to set the number of pages to display around the current page

        if ($current_page > 1) {
            $url = esc_url(add_query_arg('paged', 1));
            echo "<a href=\"{$url}\">&laquo; First</a> ";
        }

        for ($i = 1; $i <= $total_pages; $i++) {
            if ($i == $current_page) {
                echo "<span class=\"relevancespider_current-page\">{$i}</span> ";
            } elseif ($i == 1 || $i == $total_pages || $i >= $current_page - $range && $i <= $current_page + $range) {
                $url = esc_url(add_query_arg('paged', $i));
                echo "<a href=\"{$url}\">{$i}</a> ";
            } elseif ($i == $current_page - $range - 1 || $i == $current_page + $range + 1) {
                echo "<span class=\"relevancespider_pagination_ellipsis\">&hellip;</span> ";
            }
        }

        if ($current_page < $total_pages) {
            $url = esc_url(add_query_arg('paged', $total_pages));
            echo "<a href=\"{$url}\">Last &raquo;</a> ";
        }
        ?>
    </div>

    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" id="relevancespider-table-form" onsubmit="return submitBulkAction(event);">
        with selected: <input type="hidden" name="action" id="form-action">
        <button type="button" onclick="submitBulkAction(event, 'preassess_relevance')"><span class="dashicons dashicons-lightbulb" style="color: grey"></span> Preassess</button>
        <button type="button" onclick="submitBulkAction(event, 'assess_relevance')"><span class="dashicons dashicons-lightbulb"></span> Assess</button>
        <!--
        <button type="button" onclick="submitBulkAction('delete_story')">Delete</button>
        -->

    <?php if (!empty($stories)) : ?>
        <table class="wp-list-table widefat fixed" style="margin-top: 1em">
            <thead>
                <tr>
                    <th style="width: 25px; text-align: center"><input type="checkbox" id="select-all"></th>
                    <th style="width: 7em">Published</th>
                    <!-- <th>Date Crawled</th> -->
                    <th style="width: 30%">Title</th>
                    <th>Feed</th>
                    <th>Issue</th>
                    <th style="width: 5em">Rating</th>
                    <th style="width: 6em">Emotion</th>
                    <th style="width: 6em">Post</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php $counter = 0; ?>
                <?php foreach ($stories as $story): ?>
                    <?php $row_class = ($counter % 2 == 0) ? 'row-even' : 'row-odd'; ?>
                    <tr class="expandable-row <?php echo $row_class; ?>">
                        <td><input type="checkbox" name="ids[]" class="bulk-id" value="<?php echo $story->id; ?>"></td>

                        <td><?php echo substr($story->date_published, 0, 10); ?></td>
                        <!-- <td><?php echo $story->date_crawled; ?></td> -->

                        <td><a href="admin.php?page=relevancespider&subpage=story&id=<?php echo $story->id; ?>"><?php echo substr($story->title, 0, 60); ?></a>

                            &nbsp; <a href="<?php echo $story->url; ?>" target="_blank"><span class="dashicons dashicons-admin-links"></span></a></td>
                        <td>
                            <a href="<?php echo esc_url(admin_url("admin.php?page=relevancespider-feeds&subpage=feed&id={$story->feed_id}")); ?>">
                            <?php echo substr($story->feed_title, 0, 15); ?></a>
                        </td>

                        <td>
                            <a href="<?php echo esc_url(admin_url("admin.php?page=relevancespider-issues&subpage=issue&id={$story->issue_id}")); ?>">
                            <?php echo substr($story->issue_name, 0, 15); ?></a>
                        </td>

                        <td><?php echo $story->relevance_rating_low; ?>-<?php echo $story->relevance_rating_high; ?></td>

                        <td><?php echo $story->emotion_tag; ?></td>

                        <td><?php if($story->post_id) { ?>
                            <a href="<?php echo get_permalink($story->post_id); ?>" target="_blank">View</a> |

                            <a href="<?php echo get_edit_post_link($story->post_id); ?>">Edit</a> 
                        <?php } ?></td>

                        <td>

                            <button type="button" class="icon-button no-expand" title="Assess relevance with GPT4" onclick="submitIndividualAction('assess_relevance', <?php echo $story->id; ?>)">
                                <span class="dashicons dashicons-lightbulb"></span>
                            </button>

                            <button type="button" class="icon-button no-expand" title="Create a Post" onclick="submitIndividualAction('create_post_from_story', <?php echo $story->id; ?>)">
                                <span class="dashicons dashicons-welcome-add-page"></span>
                            </button>

                            <!--
                            <button type="button" class="icon-button no-expand" title="Find relevant Fellows" onclick="submitIndividualAction('find_fellows', <?php echo $story->id; ?>)">
                                <span class="dashicons dashicons-search"></span>
                            </button>
                            -->

                            <a href="#" class="icon-button no-expand" title="Edit" onclick="navigateToEdit(<?php echo $story->id; ?>)">
                                <span class="dashicons dashicons-edit"></span>
                            </a>

                            <button type="button" class="icon-button no-expand" title="Delete" onclick="if (confirm('<?php _e('Are you sure you want to delete this story?'); ?>')) { submitIndividualAction('delete_story', <?php echo $story->id; ?>); }">
                                <span class="dashicons dashicons-trash" style="color: red"></span>
                            </button>
                        </td>
                    </tr>
                    <tr class="expanded-row <?php echo $row_class; ?>" style="display: none;">
                        <td colspan="9">
                            <div class="content-full" style="margin-bottom: 10px;">
                                <h2><?php echo $story->title; ?></h2>
                                <?php echo nl2br($story->content); ?>
                            </div>
                            <div class="content-full">
                                <h2>Relevance: <?php echo $story->relevance_rating_low; ?> - <?php echo $story->relevance_rating_high; ?></h2>
                                <?php echo nl2br($story->ai_response); ?>
                            </div>
                        </td>
                    </tr>
                    <?php $counter++; ?>                    
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php else : ?>
        <p><?php _e('No stories in the database.'); ?></p>
    <?php endif; ?>

    </form>

    <div class="relevancespider_pagination">
        <?php
        $range = 2; // Adjust this value to set the number of pages to display around the current page

        if ($current_page > 1) {
            $url = esc_url(add_query_arg('paged', 1));
            echo "<a href=\"{$url}\">&laquo; First</a> ";
        }

        for ($i = 1; $i <= $total_pages; $i++) {
            if ($i == $current_page) {
                echo "<span class=\"relevancespider_current-page\">{$i}</span> ";
            } elseif ($i == 1 || $i == $total_pages || $i >= $current_page - $range && $i <= $current_page + $range) {
                $url = esc_url(add_query_arg('paged', $i));
                echo "<a href=\"{$url}\">{$i}</a> ";
            } elseif ($i == $current_page - $range - 1 || $i == $current_page + $range + 1) {
                echo "<span class=\"relevancespider_pagination_ellipsis\">&hellip;</span> ";
            }
        }

        if ($current_page < $total_pages) {
            $url = esc_url(add_query_arg('paged', $total_pages));
            echo "<a href=\"{$url}\">Last &raquo;</a> ";
        }
        ?>
    </div>

    <script>
        document.getElementById('filter-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const baseUrl = '<?php echo esc_url(admin_url("admin.php?page=relevancespider")); ?>';
            const filterIssue = document.getElementById('filter-issue').value;
            const filterStatus = document.getElementById('filter-status').value;
            const sortOrder = document.getElementById('sort-order').value;
            const filterCrawledAfter = document.getElementById('filter-crawled-after').value;
            const filterCrawledBefore = document.getElementById('filter-crawled-before').value;
            
            const newUrl = new URL(baseUrl);
            if (filterIssue) {
                newUrl.searchParams.append('filter-issue', filterIssue);
            }
            if (filterStatus) {
                newUrl.searchParams.append('filter-status', filterStatus);
            }
            if (sortOrder) {
                newUrl.searchParams.append('sort-order', sortOrder);
            }
            if (filterCrawledAfter) {
                newUrl.searchParams.append('filter-crawled-after', filterCrawledAfter);
            }
            if (filterCrawledBefore) {
                newUrl.searchParams.append('filter-crawled-before', filterCrawledBefore);
            }
            
            window.location.href = newUrl.toString();
        });

        function submitBulkAction(event, action) {
            if (action === 'assess_relevance') {

                const form = document.getElementById('relevancespider-table-form');
                const formAction = document.getElementById('form-action');
                const storyIds = Array.from(document.querySelectorAll('.bulk-id:checked')).map(checkbox => checkbox.value);

                formAction.value = action;
                fetch(ajax_object.ajax_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'queue_assess_relevance',
                        ids: storyIds,
                    }),
                })
                .then(response => {
                    if (response.ok) {
                        processQueue();
                    } else {
                        console.error('Request failed with status ' + response.status);
                    }
                })
                .catch(error => {
                    console.error('Request failed: ', error);
                });

                event.preventDefault();
                return false;
            } else {
                const form = document.getElementById('relevancespider-table-form');
                const formAction = document.getElementById('form-action');
                formAction.value = action;
                form.submit();
            }
        }

        function submitIndividualAction(action, id) {
            const form = document.getElementById('relevancespider-table-form');
            const formAction = document.getElementById('form-action');
            formAction.value = action;
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'id';
            input.value = id;
            form.appendChild(input);
            form.submit();
        }

        function navigateToEdit(id) {
            const baseUrl = "<?php echo esc_url(admin_url('admin.php')); ?>";
            const url = new URL(baseUrl);
            url.searchParams.append('page', 'relevancespider');
            url.searchParams.append('subpage', 'story');
            url.searchParams.append('id', id);
            window.location.href = url;
        }

        document.addEventListener('DOMContentLoaded', function () {
            const selectAllCheckbox = document.getElementById('select-all');
            const otherCheckboxes = document.querySelectorAll('input[type="checkbox"].bulk-id');

            selectAllCheckbox.addEventListener('change', () => {
                otherCheckboxes.forEach((checkbox) => {
                    checkbox.checked = selectAllCheckbox.checked;
                });
            });
        });        
    </script>
</div>