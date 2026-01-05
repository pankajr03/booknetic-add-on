<?php
// Load saved settings
$collaborative_enabled = get_option('bkntc_collaborative_services_enabled', 'off');
$enable_ip_geolocation = get_option('bkntc_collaborative_enabled_ip_geolocation', 'enabled');

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
                <label for="input_enable_ip_geolocation"><?php echo bkntc__('Enable location detection by IP address'); ?></label>
                <select class="form-control" id="input_enable_ip_geolocation" name="enable_ip_geolocation">
                    <option value="off" <?php selected($enable_ip_geolocation, 'off'); ?>><?php echo bkntc__('Disabled'); ?></option>
                    <option value="on" <?php selected($enable_ip_geolocation, 'on'); ?>><?php echo bkntc__('Enabled'); ?></option>
                </select>
                <small class="form-text text-muted"><?php echo bkntc__('Automatically detect the customer’s location using their IP address.'); ?></small>
            </div>
        </div>
        
        <!-- <div class="form-row">
            <div class="form-group col-md-12">
                <label for="input_guest_info_required"><?php echo bkntc__('Guest Customer Information'); ?></label>
                <select class="form-control" id="input_guest_info_required" name="guest_info_required">
                    <option value="optional" <?php selected($guest_info_required, 'optional'); ?>><?php echo bkntc__('Optional'); ?></option>
                    <option value="required" <?php selected($guest_info_required, 'required'); ?>><?php echo bkntc__('Required'); ?></option>
                </select>
                <small class="form-text text-muted"><?php echo bkntc__('Set whether guest information fields are required or optional during booking'); ?></small>
            </div>
        </div> -->

    </form>
</div>

<script type="application/javascript">
(function($) {
    "use strict";

    $(document).ready(function() {
        $('.settings-save-btn').on('click', function() {
            var data = new FormData($('#collaborative_services_area')[0]);

            booknetic.ajax('collaborative_services.save', data, function(result) {
                booknetic.toast(result.message || booknetic.__('saved_successfully'), 'success');
            });
        });
    });

})(jQuery);
</script>
