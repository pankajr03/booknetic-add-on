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
        $category = $wpdb->get_row($wpdb->prepare(
            "SELECT collab_min_staff, collab_max_staff, collab_eligible_staff, allow_multi_select 
             FROM {$wpdb->prefix}bkntc_service_categories WHERE id = %d",
            $category_id
        ), ARRAY_A);

        if (!$category) {
            wp_send_json_error(['message' => 'Category not found']);
        }

        $settings = [
            'min_staff' => !empty($category['collab_min_staff']) ? intval($category['collab_min_staff']) : 0,
            'max_staff' => !empty($category['collab_max_staff']) ? intval($category['collab_max_staff']) : 0,
            'staff_ids' => !empty($category['collab_eligible_staff']) ? json_decode($category['collab_eligible_staff'], true) : [],
            'allow_multi_select' => !empty($category['allow_multi_select']) ? intval($category['allow_multi_select']) : 0
        ];

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
        $min_staff = isset($_POST['min_staff']) ? intval($_POST['min_staff']) : 0;
        $max_staff = isset($_POST['max_staff']) ? intval($_POST['max_staff']) : 0;
        $staff_ids = isset($_POST['staff_ids']) ? array_map('intval', (array)$_POST['staff_ids']) : [];
        $allow_multi_select = isset($_POST['allow_multi_select']) ? intval($_POST['allow_multi_select']) : 0;

        if (!$category_id) {
            wp_send_json_error(['message' => 'Invalid category ID']);
        }

        // Validate that max >= min (when max is not 0)
        if ($max_staff > 0 && $max_staff < $min_staff) {
            wp_send_json_error(['message' => 'Maximum staff cannot be less than minimum staff']);
        }

        global $wpdb;
        
        // Update database columns
        $result = $wpdb->update(
            $wpdb->prefix . 'bkntc_service_categories',
            [
                'collab_min_staff' => max(0, $min_staff),
                'collab_max_staff' => max(0, $max_staff),
                'collab_eligible_staff' => json_encode($staff_ids),
                'allow_multi_select' => $allow_multi_select
            ],
            ['id' => $category_id],
            ['%d', '%d', '%s', '%d'],
            ['%d']
        );

        if ($result === false) {
            wp_send_json_error(['message' => 'Failed to save settings']);
        }

        $settings = [
            'min_staff' => max(0, $min_staff),
            'max_staff' => max(0, $max_staff),
            'staff_ids' => $staff_ids,
            'allow_multi_select' => $allow_multi_select
        ];

        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('ServiceCategoryCollaborative::save_category_settings - Category ' . $category_id . ': ' . json_encode($settings));
        }

        wp_send_json_success([
            'message' => 'Collaborative settings saved successfully',
            'settings' => $settings
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
