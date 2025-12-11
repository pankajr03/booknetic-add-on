<?php
/** @var array $parameters */
$settings = $parameters['settings'] ?? [];
$active_tab = $parameters['active_tab'] ?? 'general';
$menu_items = $parameters['menu'] ?? [];
?>

<div class="m_header clearfix">
    <div class="m_head_title float-left">
        <?php echo esc_html($parameters['page_title'] ?? 'Collaborative Services'); ?>
    </div>
</div>

<div class="row">
    <!-- Left Menu -->
    <div class="col-md-3">
        <div class="settings-menu">
            <?php foreach ($menu_items as $item): ?>
                <a href="?page=booknetic&module=settings&slug=collaborative_services&tab=<?php echo esc_attr($item['slug']); ?>"
                   class="settings-menu-item <?php echo $active_tab === $item['slug'] ? 'active' : ''; ?>"
                   data-slug="<?php echo esc_attr($item['slug']); ?>">
                    <i class="<?php echo esc_attr($item['icon']); ?>"></i>
                    <span><?php echo esc_html($item['title']); ?></span>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
    
    <!-- Content Area -->
    <div class="col-md-9">
        <div class="settings-light-portlet">
            <div class="portlet-body">
                <?php if ($active_tab === 'general'): ?>
                    <!-- General Settings Tab -->
                    <form id="collaborativeSettingsForm">
                        <div class="form-group">
                            <label><?php echo bkntc__('Enable Collaborative Services'); ?></label>
                            <div class="form-control-checkbox">
                                <label>
                                    <input type="checkbox" 
                                           id="collabEnabled"
                                           name="enabled"
                                           value="1"
                                           <?php echo (!empty($settings['enabled'])) ? 'checked' : ''; ?>>
                                    <span class="checkbox-text">
                                        <?php echo bkntc__('Allow multiple staff to collaborate on services'); ?>
                                    </span>
                                </label>
                                <div class="form-control-hint">
                                    <?php echo bkntc__('When enabled, staff can work together on appointments.'); ?>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="maxCollaborators"><?php echo bkntc__('Maximum Collaborators'); ?></label>
                            <select class="form-control" id="maxCollaborators" name="max_collaborators">
                                <option value="2" <?php selected($settings['max_collaborators'] ?? 3, 2); ?>>
                                    <?php echo bkntc__('2 staff members'); ?>
                                </option>
                                <option value="3" <?php selected($settings['max_collaborators'] ?? 3, 3); ?>>
                                    <?php echo bkntc__('3 staff members'); ?>
                                </option>
                                <option value="4" <?php selected($settings['max_collaborators'] ?? 3, 4); ?>>
                                    <?php echo bkntc__('4 staff members'); ?>
                                </option>
                                <option value="5" <?php selected($settings['max_collaborators'] ?? 3, 5); ?>>
                                    <?php echo bkntc__('5 staff members'); ?>
                                </option>
                                <option value="0" <?php selected($settings['max_collaborators'] ?? 3, 0); ?>>
                                    <?php echo bkntc__('No limit'); ?>
                                </option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <button type="button" 
                                    class="btn btn-lg btn-success"
                                    id="saveCollaborativeSettings">
                                <i class="fa fa-save"></i> <?php echo bkntc__('Save Settings'); ?>
                            </button>
                        </div>
                    </form>
                    
                <?php elseif ($active_tab === 'notifications'): ?>
                    <!-- Notifications Tab -->
                    <form id="collaborativeNotificationsForm">
                        <div class="form-group">
                            <label><?php echo bkntc__('Notification Settings'); ?></label>
                            <div class="form-control-checkbox">
                                <label>
                                    <input type="checkbox" 
                                           id="notifyAllStaff"
                                           name="notify_all_staff"
                                           value="1"
                                           <?php echo (!empty($settings['notify_all_staff'])) ? 'checked' : ''; ?>>
                                    <span class="checkbox-text">
                                        <?php echo bkntc__('Notify all collaborators on new booking'); ?>
                                    </span>
                                </label>
                            </div>
                            <div class="form-control-checkbox mt-2">
                                <label>
                                    <input type="checkbox" 
                                           id="notifyChanges"
                                           name="notify_changes"
                                           value="1"
                                           <?php echo (!empty($settings['notify_changes'])) ? 'checked' : ''; ?>>
                                    <span class="checkbox-text">
                                        <?php echo bkntc__('Notify collaborators on changes'); ?>
                                    </span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <button type="button" 
                                    class="btn btn-lg btn-success"
                                    onclick="saveNotificationSettings()">
                                <i class="fa fa-save"></i> <?php echo bkntc__('Save Notifications'); ?>
                            </button>
                        </div>
                    </form>
                    
                <?php else: ?>
                    <!-- Advanced Tab -->
                    <div class="alert alert-info">
                        <h4><?php echo bkntc__('Advanced Settings'); ?></h4>
                        <p><?php echo bkntc__('Advanced configuration options will be available soon.'); ?></p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    // Save general settings
    $('#saveCollaborativeSettings').on('click', function() {
        var $button = $(this);
        var originalText = $button.html();
        
        $button.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> <?php echo bkntc__("Saving..."); ?>');
        
        var data = {
            action: 'booknetic',
            _ajax_nonce: '<?php echo wp_create_nonce("booknetic_ajax_request"); ?>',
            module: 'collaborative_services',
            action: 'save',
            enabled: $('#collabEnabled').is(':checked') ? '1' : '0',
            max_collaborators: $('#maxCollaborators').val(),
            notify_all_staff: $('#notifyAllStaff').is(':checked') ? '1' : '0',
            notify_changes: $('#notifyChanges').is(':checked') ? '1' : '0'
        };
        
        $.post(ajaxurl, data, function(response) {
            if (response.success) {
                booknetic.toast(response.data.message, 'success');
            } else {
                booknetic.toast(response.data.message || '<?php echo bkntc__("Error saving settings"); ?>', 'error');
            }
            
            $button.prop('disabled', false).html(originalText);
        }).fail(function() {
            booknetic.toast('<?php echo bkntc__("Connection error"); ?>', 'error');
            $button.prop('disabled', false).html(originalText);
        });
    });
    
    // Save notification settings
    window.saveNotificationSettings = function() {
        var data = {
            action: 'booknetic',
            _ajax_nonce: '<?php echo wp_create_nonce("booknetic_ajax_request"); ?>',
            module: 'collaborative_services',
            action: 'save',
            enabled: $('#collabEnabled').is(':checked') ? '1' : '0',
            max_collaborators: $('#maxCollaborators').val(),
            notify_all_staff: $('#notifyAllStaff').is(':checked') ? '1' : '0',
            notify_changes: $('#notifyChanges').is(':checked') ? '1' : '0'
        };
        
        $.post(ajaxurl, data, function(response) {
            if (response.success) {
                booknetic.toast(response.data.message, 'success');
            } else {
                booknetic.toast(response.data.message || '<?php echo bkntc__("Error saving settings"); ?>', 'error');
            }
        });
    };
});
</script>