<?php
// Load saved settings
$collaborative_enabled = get_option('bkntc_collaborative_services_enabled', 'off');
$guest_info_required = get_option('bkntc_collaborative_guest_info_required', 'optional');
?>

<div id="booknetic_settings_area">
    <form id="collaborative_services_area">
        <div class="form-row">
            <div class="form-group col-md-12">
                <label for="input_collaborative_enabled"><?php echo bkntc__('Enable Collaborative Booking'); ?></label>
                <select class="form-control" id="input_collaborative_enabled" name="collaborative_enabled">
                    <option value="off" <?php selected($collaborative_enabled, 'off'); ?>><?php echo bkntc__('Disabled'); ?></option>
                    <option value="on" <?php selected($collaborative_enabled, 'on'); ?>><?php echo bkntc__('Enabled'); ?></option>
                </select>
                <small class="form-text text-muted"><?php echo bkntc__('Activate or deactivate collaborative booking functionality globally'); ?></small>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group col-md-12">
                <label for="input_guest_info_required"><?php echo bkntc__('Guest Customer Information'); ?></label>
                <select class="form-control" id="input_guest_info_required" name="guest_info_required">
                    <option value="optional" <?php selected($guest_info_required, 'optional'); ?>><?php echo bkntc__('Optional'); ?></option>
                    <option value="required" <?php selected($guest_info_required, 'required'); ?>><?php echo bkntc__('Required'); ?></option>
                </select>
                <small class="form-text text-muted"><?php echo bkntc__('Set whether guest information fields are required or optional during booking'); ?></small>
            </div>
        </div>

        <button type="button" class="btn btn-lg btn-success" id="collaborative_services_save_btn">
            <i class="fa fa-check pr-2"></i><?php echo bkntc__('SAVE CHANGES')?>
        </button>
    </form>
</div>

<script type="application/javascript">
(function($) {
    "use strict";

    $(document).ready(function() {
        $('#collaborative_services_save_btn').on('click', function() {
            var data = new FormData($('#collaborative_services_area')[0]);

            // Use collaborative_services.save to match submenu action
            data.append('module', 'settings');
            data.append('action', 'collaborative_services.save');
            booknetic.ajax('collaborative_services.save', data, function(result) {
                booknetic.toast(result.message || booknetic.__('saved_successfully'), 'success');
            });
        });
    });

})(jQuery);
</script>
