<?php defined('ABSPATH') or die('No direct access allowed'); ?>

<div class="wrap">
    <h1><?php _e('RelevanceSpider'); ?> - Newsletters</h1>

    <div style="margin-bottom: 1em">
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="add_newsletter">
        <label for="title"><?php _e('Title'); ?></label>
        <input type="text" name="title" id="title" required>
        <button type="submit"><?php _e('Add Newsletter'); ?></button>
    </form>
    </div>

    <form id="filter-form" method="GET">
        <label for="filter-status"></label>
        <select name="filter-status" id="filter-status">
            <option value="" <?php echo (empty($_GET['filter-status']) ? 'selected' : ''); ?>>All statuses</option>
            <!-- 
                <option value="unrated" <?php echo (isset($_GET['filter-status']) && $_GET['filter-status'] == 'unrated' ? 'selected' : ''); ?>>Unrated</option>
            -->
        </select>

        <label for="sort-order"></label>
        <select name="sort-order" id="sort-order">
            <option value="id_desc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'id_desc' ? ' selected' : ''); ?>>ID (new to old)</option>
            <option value="id_asc"<?php echo (isset($_GET['sort-order']) && $_GET['sort-order'] == 'id_asc' ? ' selected' : ''); ?>>ID (old to new)</option>
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
        <!--
        <button type="button" onclick="submitBulkAction(event, 'preassess_relevance')"><span class="dashicons dashicons-lightbulb" style="color: grey"></span> Preassess</button>
        <button type="button" onclick="submitBulkAction(event, 'assess_relevance')"><span class="dashicons dashicons-lightbulb"></span> Assess</button>
        <button type="button" onclick="submitBulkAction('delete_story')">Delete</button>
        -->

    <?php if (!empty($records)) : ?>
        <table class="wp-list-table widefat fixed" style="margin-top: 1em">
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all"></th>
                    <th>Status</th>
                    <th style="width: 50%">Title</th>
                    <th>Published</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php $counter = 0; ?>
                <?php foreach ($records as $record): ?>
                    <?php $row_class = ($counter % 2 == 0) ? 'row-even' : 'row-odd'; ?>
                    <tr class="expandable-row <?php echo $row_class; ?>">
                        <td><input type="checkbox" name="ids[]" class="bulk-id" value="<?php echo $record->id; ?>"></td>

                        <td></td>
                        <td><a href="admin.php?page=relevancespider-newsletters&subpage=newsletter&id=<?php echo $record->id; ?>"><?php echo substr($record->title, 0, 70); ?></a>

                        <td>
                            <?php if(!empty($record->date_published)) {
                                echo $record->date_published;
                            } ?>
                            <?php if(!empty($record->url)) {
                                echo '&nbsp; <a href="' . $record->url . '" target="_blank"><span class="dashicons dashicons-admin-links"></span></a>';
                            } ?>
                        </td>

                        <td>
                            <button type="button" class="icon-button no-expand" title="Fetch posts" onclick="submitIndividualAction('newsletter_fetch_posts', <?php echo $record->id; ?>)">
                                <span class="dashicons dashicons-editor-ul"></span>
                            </button>

                            <button type="button" class="icon-button no-expand" title="Generate newsletter" onclick="submitIndividualAction('newsletter_generate', <?php echo $record->id; ?>)">
                                <span class="dashicons dashicons-welcome-write-blog"></span>
                            </button>

                            <button type="button" class="icon-button no-expand" title="Carousel images" onclick="submitIndividualAction('newsletter_carousel_images', <?php echo $record->id; ?>)">
                                <span class="dashicons dashicons-images-alt2"></span>
                            </button>

                            <a href="#" class="icon-button no-expand" title="Edit" onclick="navigateToEdit(<?php echo $record->id; ?>)">
                                <span class="dashicons dashicons-edit"></span>
                            </a>

                            <button type="button" class="icon-button no-expand" title="Delete" onclick="if (confirm('<?php _e('Are you sure you want to delete this?'); ?>')) { submitIndividualAction('delete_newsletter', <?php echo $record->id; ?>); }">
                                <span class="dashicons dashicons-trash" style="color: red"></span>
                            </button>
                        </td>
                    </tr>
                    <tr class="expanded-row <?php echo $row_class; ?>" style="display: none;">
                        <td colspan="5">
                            <h2><?php echo $record->title; ?></h2>
                            <div class="content-full" style="margin-bottom: 10px;">
                                <h2>Post IDs: <?php echo $record->post_ids; ?></h2>
                            </div>
                            <div class="content-full" style="margin-bottom: 10px;">
                                <?php echo nl2br(htmlspecialchars($record->content)); ?>
                            </div>
                            <div class="content-full">
                                <h2>Tweets</h2>
                                <?php echo nl2br($record->twitter); ?>
                            </div>
                        </td>
                    </tr>
                    <?php $counter++; ?>                    
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php else : ?>
        <p><?php _e('No records in the database.'); ?></p>
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
            
            const baseUrl = '<?php echo esc_url(admin_url("admin.php?page=relevancespider-newsletters")); ?>';
            const filterStatus = document.getElementById('filter-status').value;
            const sortOrder = document.getElementById('sort-order').value;
            
            const newUrl = new URL(baseUrl);
            if (filterStatus) {
                newUrl.searchParams.append('filter-status', filterStatus);
            }
            if (sortOrder) {
                newUrl.searchParams.append('sort-order', sortOrder);
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
            url.searchParams.append('page', 'relevancespider-newsletters');
            url.searchParams.append('subpage', 'newsletter');
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