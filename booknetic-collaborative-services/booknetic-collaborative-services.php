<?php
/**
 * Plugin Name: Booknetic - Collaborative Services
 * Plugin URI:  https://yourwebsite.com
 * Description: Add Collaborative Services menu to Booknetic Settings
 * Version:     1.0.0
 * Author:      Your Name
 * Text Domain: bkntc-collab
 */

defined('ABSPATH') || exit;

// Constants
define('BKNTCCS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BKNTCCS_PLUGIN_URL', plugin_dir_url(__FILE__));

final class BookneticCollaborativeServices {

    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('plugins_loaded', [$this, 'init']);
    }

    public function init() {
        
        if (!class_exists('BookneticApp\Providers\UI\SettingsMenuUI')) {
            add_action('admin_notices', function () {
                echo '<div class="notice notice-error"><p>Booknetic must be installed and active.</p></div>';
            });
            return;
        }
        
        add_action('bkntc_init_backend', [$this, 'register_routes']);
        add_action('admin_init', [$this, 'add_menu_item']);
    }

    public function register_routes() {

        if (!class_exists('BookneticApp\Providers\Core\Route')) {
            return;
        }

        // Load the plugin controller so the class is available
        $controller_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/Controller.php';
        if (file_exists($controller_file)) {
            require_once $controller_file;
        }

        // Register the 'settings' module with specific allowed actions
        // JavaScript sends booknetic.ajax('settings.collaborative_services', ...) which becomes action=settings.collaborative_services
        // or booknetic.ajax('settings.collaborative_services.save') for save action
        \BookneticApp\Providers\Core\Route::get(
            'settings',
            'BookneticApp\Backend\CollaborativeServices\Controller',
            ['collaborative_services', 'settings.collaborative_services']
        );

        \BookneticApp\Providers\Core\Route::post(
            'settings',
            'BookneticApp\Backend\CollaborativeServices\Controller',
            ['collaborative_services', 'settings.collaborative_services', 'save', 'settings.collaborative_services.save']
        );
    }

    public function add_menu_item() {

        if (!isset($_GET['page']) || $_GET['page'] !== 'booknetic') {
            return;
        }

        // Add as a submenu under General Settings - no capability registration needed,
        // the controller handles capability checks via Capabilities::must('settings')
        \BookneticApp\Providers\UI\SettingsMenuUI::get('general_settings')
            ->subItem('collaborative_services')
            ->setTitle(bkntc__('Collaborative Services'))
            ->setPriority(7);
    }

    public static function activate() {
        // Create required folders
        wp_mkdir_p(BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/view/');
    }
}

// Boot plugin
BookneticCollaborativeServices::get_instance();

// Hooks
register_activation_hook(__FILE__, ['BookneticCollaborativeServices', 'activate']);
