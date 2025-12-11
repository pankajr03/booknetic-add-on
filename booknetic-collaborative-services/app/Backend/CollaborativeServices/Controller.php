<?php

namespace BookneticApp\Backend\CollaborativeServices;

use BookneticApp\Providers\Core\Capabilities;

class Controller {

    public function collaborative_services() {
        // Check user capabilities
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('Controller::collaborative_services called');
        Capabilities::must('settings');

        // Check whether view file exists and log
        $view_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/view/collaborative_services.php';
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('Controller::collaborative_services view exists=' . (file_exists($view_file) ? 'yes' : 'no') . ' path=' . $view_file);
        return $this->settings_collaborative_services();
    }

    public function settings_collaborative_services()
    {
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('Controller::settings_collaborative_services called');
        Capabilities::must('settings');

        // Log and return the view using the full view path helper
        $view_file = BKNTCCS_PLUGIN_DIR . 'app/Backend/CollaborativeServices/view/collaborative_services.php';
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('Controller::settings_collaborative_services view exists=' . (file_exists($view_file) ? 'yes' : 'no') . ' path=' . $view_file);

        return view('Backend.CollaborativeServices.view.collaborative_services');
    }

    public function save() {
        // Check user capabilities
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('Controller::save called with POST data: ' . print_r($_POST, true));
        Capabilities::must('settings');

        // Get and sanitize settings
        $collaborative_enabled = isset($_POST['collaborative_enabled']) ? sanitize_text_field($_POST['collaborative_enabled']) : 'off';
        $guest_info_required = isset($_POST['guest_info_required']) ? sanitize_text_field($_POST['guest_info_required']) : 'optional';

        // Save individual settings
        update_option('bkntc_collaborative_services_enabled', $collaborative_enabled);
        update_option('bkntc_collaborative_guest_info_required', $guest_info_required);

        if (function_exists('bkntc_cs_log')) {
            bkntc_cs_log('Controller::save saved - enabled=' . $collaborative_enabled . ' guest_info=' . $guest_info_required);
        }

        // Return success response
        return response(true, [
            'message' => bkntc__('Settings saved successfully!')
        ]);
    }

    public function settings()
    {
        if (function_exists('bkntc_cs_log')) bkntc_cs_log('Controller::settings called with GET=' . print_r($_GET, true) . ' POST=' . print_r($_POST, true));

        $view = isset($_REQUEST['view']) ? $_REQUEST['view'] : (isset($_REQUEST['action']) ? $_REQUEST['action'] : '');

        // normalize view names
        if ($view === 'settings.collaborative_services' || $view === 'collaborative_services' || $view === 'settings.collaborative-services') {
            return $this->settings_collaborative_services();
        }

        if (function_exists('bkntc_cs_log')) bkntc_cs_log('Controller::settings: unknown view requested: ' . $view);

        return response(404, [
            'success' => false,
            'message' => bkntc__('Page not found or access denied!')
        ]);
    }
}
