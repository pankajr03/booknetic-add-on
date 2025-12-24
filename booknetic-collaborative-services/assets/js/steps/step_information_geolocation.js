/**
 * Auto-fill phone country code with geo-location
 * Dynamically detects user's country by IP address
 */

(function ($) {
    'use strict';

    console.log('Booknetic Collaborative Services: Geolocation script loaded');

    // Hook into the loaded_step action for the information step
    bookneticHooks.addAction('loaded_step', function (booknetic, new_step_id) {
        console.log('Booknetic Geolocation: loaded_step fired for step:', new_step_id);

        // Only run on information step
        if (new_step_id !== 'information') {
            return;
        }

        console.log('Booknetic Geolocation: Processing information step');

        // Function to fetch country from backend and set it
        var fetchAndSetCountry = function () {
            console.log('Booknetic Geolocation: Fetching country code from server...');

            $.ajax({
                url: BookneticCollabFrontend.ajaxurl,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_detect_country_by_ip',
                    nonce: BookneticCollabFrontend.nonce
                },
                success: function (response) {
                    console.log('Booknetic Geolocation: AJAX response:', response);

                    if (response.success && response.data.country_code) {
                        var countryCode = response.data.country_code;
                        console.log('Booknetic Geolocation: Detected country code:', countryCode);

                        // Now try to set the country on the phone input
                        trySetCountry(countryCode, 1);
                    } else {
                        console.warn('Booknetic Geolocation: Failed to detect country, using default');
                        // Don't set anything, let default from data-country-code attribute work
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Booknetic Geolocation: AJAX error:', error);
                    // Don't set anything on error, let default work
                }
            });
        };

        // Function to check and set country
        var trySetCountry = function (countryCode, attempts) {
            var booking_panel_js = booknetic.panel_js;
            var phone_input = booking_panel_js.find('#bkntc_input_phone');

            console.log('Booknetic Geolocation: Attempt', attempts, '- Phone input found:', phone_input.length > 0);

            // Get the intl-tel-input instance
            var itiInstance = phone_input.data('iti');

            console.log('Booknetic Geolocation: intl-tel-input instance:', itiInstance);

            if (itiInstance && typeof itiInstance.setCountry === 'function') {
                // Set country from detected country code
                itiInstance.setCountry(countryCode);

                console.log('Booknetic Geolocation: Country code successfully set to:', countryCode);
            } else if (attempts < 10) {
                // Retry after a short delay
                console.log('Booknetic Geolocation: Retrying in 200ms...');
                setTimeout(function () {
                    trySetCountry(countryCode, attempts + 1);
                }, 200);
            } else {
                console.error('Booknetic Geolocation: Failed to set country after', attempts, 'attempts');
                console.error('Phone input element:', phone_input[0]);
                console.error('ITI data:', phone_input.data());
            }
        };

        // Start by fetching the country from server
        fetchAndSetCountry();
    });

})(jQuery);
