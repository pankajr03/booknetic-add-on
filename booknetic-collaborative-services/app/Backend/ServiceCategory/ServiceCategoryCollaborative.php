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

        $settings = get_option('bkntc_collab_category_' . $category_id, [
            'min_staff' => 0,
            'max_staff' => 0,
            'staff_ids' => []
        ]);

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

        if (!$category_id) {
            wp_send_json_error(['message' => 'Invalid category ID']);
        }

        // Validate that max >= min (when max is not 0)
        if ($max_staff > 0 && $max_staff < $min_staff) {
            wp_send_json_error(['message' => 'Maximum staff cannot be less than minimum staff']);
        }

        $settings = [
            'min_staff' => max(0, $min_staff),
            'max_staff' => max(0, $max_staff),
            'staff_ids' => $staff_ids
        ];

        update_option('bkntc_collab_category_' . $category_id, $settings);

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
