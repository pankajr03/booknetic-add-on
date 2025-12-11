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

// Load plugin logger if present
if (file_exists(BKNTCCS_PLUGIN_DIR . 'app/Helpers/logger.php')) {
    require_once BKNTCCS_PLUGIN_DIR . 'app/Helpers/logger.php';
}

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
        // Also log request params early to capture module/view when admin page runs
        add_action('admin_init', [$this, 'log_request_params'], 5);
        // Intercept Booknetic AJAX settings requests
        add_action('admin_init', [$this, 'maybe_handle_booknetic_ajax'], 1);
    }

    public function maybe_override_booknetic_view()
    {
        if (!isset($_GET['page']) || $_GET['page'] !== 'booknetic') {
            return;
        }

        if (!isset($_GET['module']) || !isset($_GET['view'])) {
            return;
        }

        if ($_GET['module'] !== 'settings' || $_GET['view'] !== 'settings.collaborative_services') {
            return;
        }

        if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_override_booknetic_view: intercepting Booknetic view request');

        // Load controller and directly render the view to bypass Booknetic internals
        $controller_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/Controller.php';
        if (!file_exists($controller_file)) {
            if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_override_booknetic_view: controller missing: ' . $controller_file);
            return;
        }

        require_once $controller_file;

        // Enforce capabilities if available
        if (class_exists('BookneticApp\Providers\Core\Capabilities')) {
            try {
                \BookneticApp\Providers\Core\Capabilities::must('settings');
            } catch (\Exception $e) {
                if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_override_booknetic_view: capability denied: ' . $e->getMessage());
                return;
            }
        }

        $view_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/view/collaborative_services.php';
        if (file_exists($view_file)) {
            include $view_file;
            if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_override_booknetic_view: included view file and exiting to prevent core handler');
            // Stop further processing to avoid Booknetic core showing its error
            exit;
        }

        if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_override_booknetic_view: view file not found: ' . $view_file);
    }

    // NOTE: temporary override removed. The method kept for reference but no longer hooked.

    public function maybe_handle_booknetic_ajax()
    {
        if (!isset($_GET['page']) || $_GET['page'] !== 'booknetic') return;
        if (!isset($_GET['ajax']) || (string) $_GET['ajax'] !== '1') return;

        $action = isset($_POST['action']) ? $_POST['action'] : (isset($_GET['action']) ? $_GET['action'] : '');
        
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_handle_booknetic_ajax: action=' . $action);
        
        // Check if this is our collaborative_services action
        if ($action !== 'collaborative_services' && $action !== 'settings.collaborative_services') return;

        if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_handle_booknetic_ajax: intercepted AJAX for action=' . $action);

        $view_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/view/collaborative_services.php';
        if (!file_exists($view_file)) {
            if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_handle_booknetic_ajax: view missing: ' . $view_file);
            echo json_encode(['status' => 'error', 'message' => 'View file missing']);
            exit;
        }

        ob_start();
        include $view_file;
        $html = ob_get_clean();

        if (function_exists('bkntc_cs_log')) bkntc_cs_log('maybe_handle_booknetic_ajax: returning HTML length=' . strlen($html));

        // Return in Booknetic's expected format
        echo json_encode(['status' => 'ok', 'html' => $html]);
        exit;
    }

    public function log_request_params()
    {
        if (!isset($_GET['page']) || $_GET['page'] !== 'booknetic') {
            return;
        }

        $req = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
        $action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';
        $ajax = isset($_REQUEST['ajax']) ? $_REQUEST['ajax'] : '';

        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('log_request_params: REQUEST_URI=' . $req . ' METHOD=' . $method . ' action=' . $action . ' ajax=' . $ajax . ' GET=' . print_r($_GET, true));
        }
    }

    public function add_wp_submenu()
    {
        // parent slug 'booknetic' should exist; capability chosen to 'manage_options' as fallback
        add_submenu_page(
            'booknetic',
            bkntc__('Collaborative Services'),
            bkntc__('Collaborative Services'),
            'manage_options',
            'booknetic_collaborative_services',
            [$this, 'render_fallback_page']
        );
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('add_wp_submenu: fallback submenu added with slug=booknetic_collaborative_services');
    }

    public function render_fallback_page()
    {
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('render_fallback_page: invoked');

        // If Booknetic capability helper exists, enforce permissions
        if (class_exists('BookneticApp\Providers\Core\Capabilities')) {
            \BookneticApp\Providers\Core\Capabilities::must('settings');
        }

        $view_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/view/collaborative_services.php';
        if (file_exists($view_file)) {
            require $view_file;
        } else {
            echo '<div class="notice notice-error"><p>Collaborative Services view not found.</p></div>';
            if (function_exists('bkntc_cs_log')) bkntc_cs_log('render_fallback_page: view missing: ' . $view_file);
        }
    }

    public function register_routes() {

        if (!class_exists('BookneticApp\Providers\Core\Route')) {
                if (function_exists('bkntc_cs_log')) bkntc_cs_log('register_routes: Booknetic Route class not found');
                return;
        }

        // Load the plugin controller so the class is available
        $controller_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/Controller.php';
            if (file_exists($controller_file)) {
                require_once $controller_file;
                if (function_exists('bkntc_cs_log')) bkntc_cs_log('register_routes: Controller loaded: ' . $controller_file);
            } else {
                if (function_exists('bkntc_cs_log')) bkntc_cs_log('register_routes: Controller missing: ' . $controller_file);
            }

        // Register the 'settings' module with specific allowed actions
        // JavaScript sends booknetic.ajax('settings.collaborative_services', ...) which becomes action=settings.collaborative_services
        // or booknetic.ajax('settings.collaborative_services.save') for save action
        \BookneticApp\Providers\Core\Route::get(
            'settings',
            'BookneticApp\\Backend\\CollaborativeServices\\Controller',
            ['settings', 'collaborative_services', 'settings.collaborative_services']
        );

        \BookneticApp\Providers\Core\Route::post(
            'settings',
            'BookneticApp\\Backend\\CollaborativeServices\\Controller',
            ['settings', 'collaborative_services', 'settings.collaborative_services', 'save', 'settings.collaborative_services.save']
        );
            if (function_exists('bkntc_cs_log')) bkntc_cs_log('register_routes: routes registered for module=settings');
    }

    public function add_menu_item() {

        if (!isset($_GET['page']) || $_GET['page'] !== 'booknetic') {
            if (function_exists('bkntc_cs_log')) bkntc_cs_log('add_menu_item: not on booknetic page; page=' . (isset($_GET['page']) ? $_GET['page'] : '')); 
            return;
        }

        // Log module/view query parameters to help trace the admin page routing
        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('add_menu_item: GET module=' . (isset($_GET['module']) ? $_GET['module'] : '') . ' view=' . (isset($_GET['view']) ? $_GET['view'] : ''));
        }

        // Add as a submenu under General Settings - no capability registration needed,
        // the controller handles capability checks via Capabilities::must('settings')
        \BookneticApp\Providers\UI\SettingsMenuUI::get('general_settings')
            ->subItem('collaborative_services')
            ->setTitle(bkntc__('Collaborative Services'))
            ->setPriority(7);
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('add_menu_item: submenu collaborative_services added');
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
