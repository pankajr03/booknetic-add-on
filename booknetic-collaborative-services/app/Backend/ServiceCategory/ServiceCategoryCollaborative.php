<?php

namespace BookneticApp\Backend\ServiceCategory;

defined('ABSPATH') || exit;

class ServiceCategoryCollaborative
{
    public function __construct()
    {
        add_action('wp_ajax_bkntc_collab_get_category_settings', [$this, 'get_category_settings']);
        add_action('wp_ajax_bkntc_collab_save_category_settings', [$this, 'save_category_settings']);
        add_action('wp_ajax_bkntc_collab_get_staff_list', [$this, 'get_staff_list']);
        
        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('ServiceCategoryCollaborative: AJAX actions registered');
        }
    }

    /**
     * Get collaborative settings for a specific category
     */
    public function get_category_settings()
    {
        check_ajax_referer('bkntc_collab_category_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permission denied']);
        }

        $category_id = isset($_POST['category_id']) ? intval($_POST['category_id']) : 0;

        if (!$category_id) {
            wp_send_json_error(['message' => 'Invalid category ID']);
        }

        global $wpdb;
        
        // Get settings from database
        $table = $wpdb->prefix . 'bkntc_service_categories';
        $category = $wpdb->get_row($wpdb->prepare(
            "SELECT allow_multi_select FROM {$table} WHERE id = %d",
            $category_id
        ), ARRAY_A);

        if (!$category) {
            wp_send_json_error(['message' => 'Category not found']);
        }

        $settings = [
            'allow_multi_select' => !empty($category['allow_multi_select']) ? intval($category['allow_multi_select']) : 0
        ];
        
        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('ServiceCategoryCollaborative::get_category_settings - Category ' . $category_id . ': ' . json_encode($settings) . ' - Raw: ' . json_encode($category));
        }

        wp_send_json_success($settings);
    }

    /**
     * Save collaborative settings for a specific category
     */
    public function save_category_settings()
    {
        check_ajax_referer('bkntc_collab_category_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permission denied']);
        }

        $category_id = isset($_POST['category_id']) ? intval($_POST['category_id']) : 0;
        $allow_multi_select = isset($_POST['allow_multi_select']) ? intval($_POST['allow_multi_select']) : 0;

        if (!$category_id) {
            wp_send_json_error(['message' => 'Invalid category ID']);
        }

        global $wpdb;
        
        $table = $wpdb->prefix . 'bkntc_service_categories';
        
        // Check if column exists first
        $column_exists = $wpdb->get_results("SHOW COLUMNS FROM {$table} LIKE 'allow_multi_select'");
        
        if (empty($column_exists)) {
            // Add column if it doesn't exist
            $wpdb->query("ALTER TABLE {$table} ADD COLUMN allow_multi_select TINYINT(1) DEFAULT 0");
        }
        
        // Update database column
        $result = $wpdb->update(
            $table,
            [
                'allow_multi_select' => $allow_multi_select
            ],
            ['id' => $category_id],
            ['%d'],
            ['%d']
        );

        $settings = [
            'allow_multi_select' => $allow_multi_select
        ];

        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('ServiceCategoryCollaborative::save_category_settings - Category ' . $category_id . ': ' . json_encode($settings) . ' - Result: ' . var_export($result, true));
        }
        
        // $result can be 0 if no rows were changed (already had the same value), which is OK
        if ($result === false) {
            wp_send_json_error(['message' => 'Failed to save settings. Error: ' . $wpdb->last_error]);
        }

        wp_send_json_success([
            'message' => 'Collaborative settings saved successfully',
            'settings' => $settings,
            'updated_rows' => $result
        ]);
    }

    /**
     * Get list of all active staff members
     */
    public function get_staff_list()
    {
        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('ServiceCategoryCollaborative::get_staff_list called');
        }
        
        check_ajax_referer('bkntc_collab_category_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            if (function_exists('bkntc_cs_log')) {
                bkntc_cs_log('ServiceCategoryCollaborative::get_staff_list - Permission denied');
            }
            wp_send_json_error(['message' => 'Permission denied']);
        }

        global $wpdb;

        $staff = $wpdb->get_results(
            "SELECT id, name FROM {$wpdb->prefix}booknetic_staff WHERE is_active = 1 ORDER BY name ASC",
            ARRAY_A
        );
        
        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('ServiceCategoryCollaborative::get_staff_list - Found ' . count($staff) . ' staff members');
        }

        wp_send_json_success($staff);
    }
}
