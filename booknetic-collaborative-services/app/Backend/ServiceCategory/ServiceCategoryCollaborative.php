<?php

namespace BookneticApp\Backend\ServiceCategory;

defined('ABSPATH') || exit;

/**
 * Handles collaborative features for Booknetic Service Categories
 */
class ServiceCategoryCollaborative
{
    private static $instance = null;

    public static function get_instance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        // Hook into Booknetic backend initialization
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        
        // AJAX handlers
        add_action('wp_ajax_bkntc_collab_get_category_settings', [$this, 'ajax_get_category_settings']);
        add_action('wp_ajax_bkntc_collab_save_category_settings', [$this, 'ajax_save_category_settings']);
        add_action('wp_ajax_bkntc_collab_get_staff_list', [$this, 'ajax_get_staff_list']);
    }

    /**
     * Enqueue JavaScript and CSS assets for service category page
     */
    public function enqueue_assets($hook)
    {
        // Only load on Booknetic pages
        if (!isset($_GET['page']) || $_GET['page'] !== 'booknetic') {
            return;
        }

        // Only load on service categories module
        if (!isset($_GET['module']) || $_GET['module'] !== 'service_categories') {
            return;
        }

        wp_enqueue_script(
            'bkntc-collab-service-category',
            BKNTCCS_PLUGIN_URL . 'assets/js/service-category-collaborative.js',
            ['jquery'],
            '1.0.0',
            true
        );

        wp_localize_script('bkntc-collab-service-category', 'bkntcCollabCategory', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('bkntc_collab_category_nonce')
        ]);

        wp_enqueue_style(
            'bkntc-collab-service-category',
            BKNTCCS_PLUGIN_URL . 'assets/css/service-category-collaborative.css',
            [],
            '1.0.0'
        );
    }

    /**
     * Get collaborative settings for a category
     */
    public function ajax_get_category_settings()
    {
        check_ajax_referer('bkntc_collab_category_nonce', 'nonce');

        $category_id = isset($_POST['category_id']) ? absint($_POST['category_id']) : 0;

        $settings = $this->get_category_settings($category_id);

        wp_send_json_success($settings);
    }

    /**
     * Save collaborative settings for a category
     */
    public function ajax_save_category_settings()
    {
        check_ajax_referer('bkntc_collab_category_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permission denied']);
            return;
        }

        $category_id = isset($_POST['category_id']) ? absint($_POST['category_id']) : 0;
        $min_staff = isset($_POST['min_staff']) ? absint($_POST['min_staff']) : 0;
        $max_staff = isset($_POST['max_staff']) ? absint($_POST['max_staff']) : 0;
        $staff_ids = isset($_POST['staff_ids']) && is_array($_POST['staff_ids']) 
            ? array_map('absint', $_POST['staff_ids']) 
            : [];

        if ($category_id === 0) {
            wp_send_json_error(['message' => 'Invalid category ID']);
            return;
        }

        $settings = [
            'min_staff' => $min_staff,
            'max_staff' => $max_staff,
            'staff_ids' => $staff_ids
        ];

        $this->save_category_settings($category_id, $settings);

        wp_send_json_success(['message' => 'Settings saved successfully']);
    }

    /**
     * Get list of all staff members
     */
    public function ajax_get_staff_list()
    {
        check_ajax_referer('bkntc_collab_category_nonce', 'nonce');

        global $wpdb;
        
        // Query Booknetic staff table
        $table_name = $wpdb->prefix . 'booknetic_staff';
        
        $staff = $wpdb->get_results(
            "SELECT id, name FROM {$table_name} WHERE is_active = 1 ORDER BY name ASC",
            ARRAY_A
        );

        wp_send_json_success($staff);
    }

    /**
     * Get category settings from database
     */
    private function get_category_settings($category_id)
    {
        if ($category_id === 0) {
            return [
                'min_staff' => 0,
                'max_staff' => 0,
                'staff_ids' => []
            ];
        }

        $option_key = 'bkntc_collab_category_' . $category_id;
        $settings = get_option($option_key, []);

        return wp_parse_args($settings, [
            'min_staff' => 0,
            'max_staff' => 0,
            'staff_ids' => []
        ]);
    }

    /**
     * Save category settings to database
     */
    private function save_category_settings($category_id, $settings)
    {
        $option_key = 'bkntc_collab_category_' . $category_id;
        update_option($option_key, $settings, false);
    }

    /**
     * Delete category settings when category is deleted
     */
    public static function delete_category_settings($category_id)
    {
        $option_key = 'bkntc_collab_category_' . $category_id;
        delete_option($option_key);
    }
}
