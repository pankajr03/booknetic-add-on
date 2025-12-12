<?php

namespace BookneticApp\Backend\ServiceCategory;

defined('ABSPATH') || exit;

/**
 * Service Integration for Collaborative Categories
 * Automatically applies category settings to services
 */
class ServiceIntegration
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
        // Hook into service save/edit to apply category settings
        add_action('admin_enqueue_scripts', [$this, 'enqueue_service_integration_script']);
        
        // AJAX handler to get category settings for a service
        add_action('wp_ajax_bkntc_collab_get_service_category_settings', [$this, 'ajax_get_service_category_settings']);
    }

    /**
     * Enqueue JavaScript for service page integration
     */
    public function enqueue_service_integration_script($hook)
    {
        // Only load on Booknetic pages
        if (!isset($_GET['page']) || $_GET['page'] !== 'booknetic') {
            return;
        }

        // Only load on services module
        if (!isset($_GET['module']) || $_GET['module'] !== 'services') {
            return;
        }

        wp_enqueue_script(
            'bkntc-collab-service-integration',
            BKNTCCS_PLUGIN_URL . 'assets/js/service-integration.js',
            ['jquery'],
            '1.0.0',
            true
        );

        wp_localize_script('bkntc-collab-service-integration', 'bkntcCollabService', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('bkntc_collab_service_nonce')
        ]);
    }

    /**
     * Get category settings for a service's category
     */
    public function ajax_get_service_category_settings()
    {
        check_ajax_referer('bkntc_collab_service_nonce', 'nonce');

        $category_id = isset($_POST['category_id']) ? absint($_POST['category_id']) : 0;

        if ($category_id === 0) {
            wp_send_json_success([
                'has_settings' => false,
                'min_staff' => 0,
                'max_staff' => 0,
                'staff_ids' => []
            ]);
            return;
        }

        $option_key = 'bkntc_collab_category_' . $category_id;
        $settings = get_option($option_key, []);

        $has_settings = !empty($settings['min_staff']) || !empty($settings['max_staff']) || !empty($settings['staff_ids']);

        wp_send_json_success([
            'has_settings' => $has_settings,
            'min_staff' => $settings['min_staff'] ?? 0,
            'max_staff' => $settings['max_staff'] ?? 0,
            'staff_ids' => $settings['staff_ids'] ?? [],
            'message' => $has_settings 
                ? 'This category has collaborative settings that will be applied to the service' 
                : 'No collaborative settings defined for this category'
        ]);
    }

    /**
     * Get category settings by category ID
     */
    public static function get_category_settings($category_id)
    {
        $option_key = 'bkntc_collab_category_' . $category_id;
        return get_option($option_key, [
            'min_staff' => 0,
            'max_staff' => 0,
            'staff_ids' => []
        ]);
    }

    /**
     * Check if a service should inherit category settings
     */
    public static function should_apply_category_settings($service_id)
    {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'booknetic_services';
        $category_id = $wpdb->get_var($wpdb->prepare(
            "SELECT category_id FROM {$table_name} WHERE id = %d",
            $service_id
        ));

        if (!$category_id) {
            return false;
        }

        $settings = self::get_category_settings($category_id);
        return !empty($settings['min_staff']) || !empty($settings['max_staff']) || !empty($settings['staff_ids']);
    }
}
