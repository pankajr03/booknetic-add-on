<?php
namespace BookneticApp\Backend\CollaborativeServices;

if (class_exists(__NAMESPACE__ . '\Controller')) {
    return; // ✅ Prevent double declaration at PHP level
}

use BookneticApp\Providers\Core\Controller as BaseController;
use BookneticApp\Providers\Core\Capabilities;
use BookneticApp\Providers\Helpers\Helper;

class Controller extends BaseController
{
    public function index()
    {
        Capabilities::must('settings');

        $settings = get_option('booknetic_collaborative_services', [
            'enabled'           => 0,
            'max_collaborators' => 3,
            'notify_all_staff'  => 1,
            'notify_changes'    => 1,
        ]);

        return $this->view('index', [
            'settings'   => $settings,
            'page_title' => 'Collaborative Services',
            'description'=> 'Configure multi staff collaboration'
        ]);
    }

    /**
     * Action method so Booknetic can route action=collaborative_services to this method
     */
    public function collaborative_services()
    {
        return $this->index();
    }

    /**
     * Handle the full dot-format action name that JavaScript sends
     */
    public function settings_collaborative_services()
    {
        return $this->collaborative_services();
    }

    public function save()
    {
        Capabilities::must('settings');
        Helper::validateNonce();

        $settings = [
            'enabled'           => Helper::_post('enabled', '0', 'string') === '1' ? 1 : 0,
            'max_collaborators' => (int) Helper::_post('max_collaborators', '3', 'int'),
            'notify_all_staff'  => Helper::_post('notify_all_staff', '1', 'string') === '1' ? 1 : 0,
            'notify_changes'    => Helper::_post('notify_changes', '1', 'string') === '1' ? 1 : 0,
            'updated_at'        => current_time('mysql')
        ];

        update_option('booknetic_collaborative_services', $settings);

        return $this->response(true, [
            'message'  => 'Settings saved',
            'settings' => $settings
        ]);
    }

    /**
     * Handle the full dot-format save action: settings.collaborative_services.save
     */
    public function settings_collaborative_services_save()
    {
        return $this->save();
    }
}
