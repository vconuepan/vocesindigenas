<?php
namespace RelevanceSpider\Controllers;

defined('ABSPATH') or die('No direct access allowed');

require_once plugin_dir_path(__FILE__) . 'base_controller.php';
require_once dirname(__FILE__) . '/../models/newsletter.php';
require_once dirname(__FILE__) . '/../models/chatgpt.php';
require_once dirname(__FILE__) . '/../models/post.php';

use TCPDF;

use RelevanceSpider\Models\NewsletterModel;
use RelevanceSpider\Models\ChatGPTModel;
use RelevanceSpider\Models\PostModel;

class NewsletterController extends BaseController {
    private $chatgpt_model;
    private $post_model;

    public function __construct() {
        $this->model_name = 'newsletter';
        $this->model_name_plural = 'newsletters';

        $this->model = new NewsletterModel($GLOBALS['wpdb']);
        $this->chatgpt_model = new ChatGPTModel($GLOBALS['wpdb']);
        $this->post_model = new PostModel($GLOBALS['wpdb']);

        add_action('admin_post_newsletter_fetch_posts', array($this, 'fetch_posts'));
        add_action('admin_post_newsletter_generate', array($this, 'generate'));
        add_action('admin_post_newsletter_carousel_images', array($this, 'carousel_images'));

        parent::__construct();
    }

    public function carousel_images($id = null) {
        $this->authorize();

        $admin_call = false;
        if (empty($id) && isset($_POST['id'])) {
            $admin_call = true;
            $id = intval($_POST['id']);
        }

        if (!$id || $id < 1) {
            add_settings_error('relevancespider', 'missing_id', 'Missing ID', 'error');
        } else {
            $newsletter = $this->model->get_by_id($id);
            if($newsletter) {
                $post_ids = json_decode($newsletter->post_ids);
                if (is_array($post_ids) && !empty($post_ids)) {
                    $posts = $this->get_posts_data($post_ids);
                    // Call the function to generate carousel images
                    $zip_file = $this->generate_carousel_images($posts);

                    if ($zip_file) {
                        // Set a transient to trigger the download
                        // Convert the file path to a URL
                        $upload_dir = wp_upload_dir();
                        $zip_file_url = str_replace($upload_dir['basedir'], $upload_dir['baseurl'], $zip_file);

                        // Set a transient to trigger the download
                        set_transient('relevancespider_download_zip', $zip_file_url, 30);
                        add_settings_error('relevancespider', 'carousel_generated', 'Carousel images generated. Download should start automatically.<BR />' . $zip_file_url, 'updated');
                        if (!$admin_call) {
                            return $zip_file;
                        }
                    } else {
                        add_settings_error('relevancespider', 'zip_creation_failed', 'Failed to create zip file', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'invalid_post_ids', 'Invalid post IDs', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'no_newsletter', 'No newsletter found', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-newsletters'));
            exit;
        } else {
            return false;
        }
    }

    private function generate_carousel_images($posts) {
        $images = [];
        $upload_dir = wp_upload_dir();
        $images_dir = $upload_dir['basedir'] . '/carousel_images';
        
        // Create the directory if it doesn't exist
        if (!file_exists($images_dir)) {
            mkdir($images_dir, 0755, true);
        }

        foreach ($posts as $post) {
            $image_path = $this->create_image($post, $images_dir);
            if ($image_path) {
                $images[] = $image_path;
            }
        }

        // Generate the PDF with images
        $pdf_path = $images_dir . '/carousel_images.pdf';
        $this->generate_pdf_with_images($images, $pdf_path);

        // Create a zip file with all the images and the PDF file
        $files = array_merge($images, [$pdf_path]);
        $zip_file = $this->create_zip_file($files, $images_dir);

        // Delete individual images after creating the zip file
        foreach ($images as $image) {
            unlink($image);
        }
        // unlink($pdf_path);

        return $zip_file;
    }
        
    private function create_image($post, $images_dir) {
        $width = 1200;
        $height = 675;
        $padding = 50;
        $header_image_height = 80;
        $image = imagecreatetruecolor($width, $height);

        // Define colors
        $background_color = imagecolorallocate($image, 255, 255, 255); // White background
        $text_color = imagecolorallocate($image, 0, 0, 0); // Black text

        // Fill the background
        imagefilledrectangle($image, 0, 0, $width, $height, $background_color);

        // Add the header image
        if (stripos($post['category'], 'Human') !== false) {
            $header_image_path = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/images/human_development_1200x80.png';
        } else if (stripos($post['category'], 'Planet') !== false) {
            $header_image_path = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/images/planet_climate_1200x80.png';
        } else if (stripos($post['category'], 'Science') !== false) {
            $header_image_path = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/images/science_tech_1200x80.png';
        } else if (stripos($post['category'], 'General') !== false) {
            $header_image_path = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/images/general_news_1200x80.png';
        } else {
            $header_image_path = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/images/existential_risks_1200x80.png';
        }
        $header_image = imagecreatefrompng($header_image_path);
        imagecopy($image, $header_image, 0, 0, 0, 0, $width, $header_image_height);
        imagedestroy($header_image);

        // Add the logo image
        $logo_image_path = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/images/logo_112x80.png';
        $logo_image = imagecreatefrompng($logo_image_path);
        imagecopy($image, $logo_image, $width - $padding/2 - 112, $height - $padding/2 - 80, 0, 0, 112, 80);
        imagedestroy($logo_image);

        // Set the font paths
        $nexa_bold = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/fonts/Nexa-Bold.ttf';
        $roboto = WP_CONTENT_DIR . '/plugins/relevancespider/lib/resources/fonts/Roboto-Regular.ttf';

        // Format the date
        $date = new \DateTime($post['date']);
        $formatted_date = ($date->getTimestamp() != 0) ? $date->format('M j') : '';

        // Decode HTML entities in the category
        $category = html_entity_decode($post['category']);

        // Calculate positions with padding
        $current_y = $header_image_height + $padding - 10;

        // Add the category
        $wrapped_category = $this->wrap_text($category, 60);
        $current_y = $this->add_wrapped_text($image, 15, 0, $padding, $current_y, $text_color, $roboto, $wrapped_category, 15);
        $current_y -= 10;

        // Add the title
        $wrapped_title = $this->wrap_text($post['title'], 55);
        $current_y = $this->add_wrapped_text($image, 30, 0, $padding, $current_y, $text_color, $nexa_bold, $wrapped_title, 50);
        $current_y -= 20;

        // Add the publisher and date if date is valid
        if (!empty($formatted_date)) {
            $wrapped_publisher = $this->wrap_text($post['publisher'] . ", " . $formatted_date, 90);
        } else {
            $wrapped_publisher = $this->wrap_text($post['publisher'], 90);
        }
        $current_y = $this->add_wrapped_text($image, 20, 0, $padding, $current_y, $text_color, $roboto, $wrapped_publisher, 20);

        // Add the excerpt with extra space before it
        $current_y += 15;
        $wrapped_excerpt = $this->wrap_text($post['summary'], 90);
        $this->add_wrapped_text($image, 20, 0, $padding, $current_y, $text_color, $roboto, $wrapped_excerpt, 40);

        // Save the image
        $filename = sanitize_title($post['title']) . '.png';
        $output_path = $images_dir . '/' . $filename;
        imagepng($image, $output_path);

        // Free memory
        imagedestroy($image);

        return $output_path;
    }

    private function wrap_text($text, $max_chars_per_line) {
        $wrapped_text = '';
        $words = explode(' ', $text);
        $line = '';

        foreach ($words as $word) {
            if (strlen($line . ' ' . $word) <= $max_chars_per_line) {
                $line .= ($line ? ' ' : '') . $word;
            } else {
                $wrapped_text .= "\n" . $line;
                $line = $word;
            }
        }

        return $wrapped_text . ($line ? "\n" . $line : '');
    }

    private function add_wrapped_text($image, $font_size, $angle, $x, $y, $color, $font_path, $text, $line_height) {
        $lines = explode("\n", $text);
        foreach ($lines as $line) {
            imagettftext($image, $font_size, $angle, $x, $y, $color, $font_path, $line);
            $y += $line_height;
        }
        return $y;
    }

    private function generate_pdf_with_images($image_paths, $output_path) {
        // In the future, allows to convert pixel dimensions to points assuming the images have 96 DPI
        $pixels_per_inch = 72;
        $points_per_inch = 72;
        $point_conversion_factor = $points_per_inch / $pixels_per_inch;

        $page_width = 1200 * $point_conversion_factor;
        $page_height = 675 * $point_conversion_factor;

        $pdf = new TCPDF('L', 'pt', array($page_width, $page_height));
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false, 0);

        foreach ($image_paths as $image_path) {
            $pdf->AddPage();
            $pdf->Image($image_path, 0, 0, $page_width, $page_height, '', 'https://actuallyrelevant.news', '', 1, 96);
        }

        $pdf->Output($output_path, 'F');

        /*
        try {
            $pdf = new \Imagick();
            $pdf->setResolution(72, 72);
            foreach ($image_paths as $image_path) {
                $image = new \Imagick($image_path);
                $image->setImageFormat('pdf');
                $pdf->addImage($image);
            }
            $pdf->setImageFormat('pdf');
            $pdf->writeImages($output_path, true);
        } catch (\ImagickException $e) {
            add_settings_error('relevancespider', 'carousel_pdf', 'Carousel PDF couldn\'t be generated: ' . $e->getMessage(), 'error');
            return null;
        }
        */
    }

    private function create_zip_file($files, $images_dir) {
        $zip = new \ZipArchive();
        $zip_file = $images_dir . '/carousel_images.zip';

        if ($zip->open($zip_file, \ZipArchive::CREATE) === TRUE) {
            foreach ($files as $file) {
                $zip->addFile($file, basename($file));
            }
            $zip->close();
        }

        return $zip_file;
    }

    private function get_posts_data($post_ids) {
        $posts = [];
        foreach ($post_ids as $post_id) {
            $post = get_post($post_id);
            if ($post) {
                $publisher = get_post_meta($post_id, 'story_publisher', true);
                $summary = get_post_meta($post_id, 'story_summary', true);
                $date = get_post_meta($post_id, 'story_date', true);
                $posts[] = [
                    'title' => get_the_title($post),
                    'category' => get_the_category($post->ID)[0]->name,
                    'summary' => $summary,
                    'date' => $date,
                    'publisher' => $publisher,
                    'url' => get_permalink($post)
                ];
            }
        }
        return $posts;
    }


    public function fetch_posts($id = null) {
        $this->authorize();

        $admin_call = false;
        if (empty($id) && isset($_POST['id'])) {
            $admin_call = true;
            $id = intval($_POST['id']);
        }

        if (!$id || $id < 1) {
            add_settings_error('relevancespider', 'missing_id', 'Missing ID', 'error');
        } else {
            $posts = $this->post_model->get_posts_newsletter();
            if($posts) {
                $newsletter = $this->model->get_by_id($id);
                if($newsletter) {
                    // Extract the post IDs into an array
                    $post_ids = array_map(function($post) {
                        return $post->ID;
                    }, $posts);

                    $post_ids_string = json_encode($post_ids);
                    $result = $this->model->update($id, array('post_ids' => $post_ids_string));

                    if($result) {
                        add_settings_error('relevancespider', 'newsletter_updated', 'Newsletter updated', 'updated');

                        if(!$admin_call) {
                            return true;
                        }                        
                    } else {
                        add_settings_error('relevancespider', 'newsletter_not_updated', 'Newsletter not updated', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'no_newsletter', 'No newsletter found', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'no_posts', 'No posts found', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-newsletters'));
            exit;
        } else {
            return false;
        }
    }

    private function sort_posts_by_category($a, $b) {
        $categories_a = get_the_category($a->ID);
        $categories_b = get_the_category($b->ID);

        // Handle posts with no categories
        if (empty($categories_a) || empty($categories_b)) {
            return 0;
        }

        // Sort based on the first category name retrieved
        return strcmp($categories_a[0]->name, $categories_b[0]->name);
    }

    public function generate($id = null) {
        $this->authorize();

        $admin_call = false;
        if (empty($id) && isset($_POST['id'])) {
            $admin_call = true;
            $id = intval($_POST['id']);
        }

        if (!$id || $id < 1) {
            add_settings_error('relevancespider', 'missing_id', 'Missing ID', 'error');
        } else {
            $newsletter = $this->model->get_by_id($id);
            if($newsletter) {
                $post_ids = json_decode($newsletter->post_ids);
                $args = array(
                    'post_type' => 'post',
                    'post_status' => 'publish',
                    'post__in' => $post_ids,
                    'posts_per_page' => -1  // Retrieve all posts
                );
                $query = new \WP_Query($args);
                $posts = $query->posts;

                usort($posts, array($this, 'sort_posts_by_category'));

                if($posts) {
                    $content = "";
                    $twitter = "";
                    $i = 1;

                    foreach($posts as $post) {
                        $data = array();
                        $data['title'] = $post->post_title;
                        $data['url'] = get_permalink($post->ID);
                        $data['source_url'] = get_post_meta($post->ID, 'story_url', true);
                        $data['publisher'] = get_post_meta($post->ID, 'story_publisher', true);
                        $data['story_summary'] = get_post_meta($post->ID, 'story_summary', true);
                        $data['story_date'] = get_post_meta($post->ID, 'story_date', true);
                        $data['relevance_summary'] = get_post_meta($post->ID, 'relevance_summary', true);

                        $data['blurb'] = get_post_meta($post->ID, 'marketing_blurb', true);
                        if(empty($data['blurb'])) {
                            $data['blurb'] = $post->post_excerpt;
                        }

                        /*
                        $response = $this->chatgpt_model->generate_newsletter_blurb(
                            "Story summary:\n" . get_post_meta($post->ID, 'story_summary', true) . "\n\n"
                            . "Why it's relevant:\n" . get_post_meta($post->ID, 'relevance_reasons', true)
                        );
                        if($response !== null) {
                            $data['content'] = $response;
                        }
                        */
    
                        $content .= $this->view->render("newsletter_post", $data) . "\n\n";

                        $data['i'] = $i;
                        $twitter .= $this->view->render("newsletter_tweet", $data) . "\n\n";

                        $i++;
                    }

                    $result = $this->model->update($id, array(
                        'content' => $content,
                        'twitter' => $twitter
                    ));

                    if($result) {
                        add_settings_error('relevancespider', 'newsletter_updated', 'Newsletter updated', 'updated');

                        if(!$admin_call) {
                            return true;
                        }                        
                    } else {
                        add_settings_error('relevancespider', 'newsletter_not_updated', 'Newsletter not updated', 'error');
                    }
                } else {
                    add_settings_error('relevancespider', 'no_posts', 'No posts found', 'error');
                }
            } else {
                add_settings_error('relevancespider', 'no_newsletter', 'No newsletter found', 'error');
            }
        }

        if($admin_call) {
            set_transient('relevancespider_settings_errors', get_settings_errors('relevancespider'), 30);
            wp_redirect(admin_url('admin.php?page=relevancespider-newsletters'));
            exit;
        } else {
            return false;
        }
    }

}