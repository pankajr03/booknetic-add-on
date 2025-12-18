(function($) {
    'use strict';
    
    console.log('=== COLLABORATIVE SERVICES: Admin Booking Steps Script Loaded ===');
    
    // Function to inject custom step
    function injectCustomStep() {
        var stepsList = $('.step_elements_list');
        
        if (stepsList.length === 0) {
            console.log('Step list not found yet...');
            return false;
        }
        
        // Check if already injected
        if (stepsList.find('[data-step-id="date_time_staff_combined"]').length > 0) {
            console.log('✓ Custom step already exists');
            return true;
        }
        
        var dateTimeStep = stepsList.find('[data-step-id="date_time"]');
        
        if (dateTimeStep.length === 0) {
            console.log('Date/time step not found yet...');
            return false;
        }
        
        console.log('✓ Injecting custom step...');
        
        // Get the drag icon from existing step
        var dragIcon = dateTimeStep.find('.drag_drop_helper img').attr('src');
        
        // Create custom step HTML
        var customStepHtml = 
            '<div class="step_element" data-step-id="date_time_staff_combined">' +
                '<span class="drag_drop_helper"><img src="' + dragIcon + '"></span>' +
                '<span>Date &amp; Time + Staff (Combined)</span>' +
                '<div class="step_switch">' +
                    '<div class="fs_onoffswitch">' +
                        '<input type="checkbox" name="show_step_date_time_staff_combined" ' +
                        'class="fs_onoffswitch-checkbox green_switch" ' +
                        'id="show_step_date_time_staff_combined" checked>' +
                        '<label class="fs_onoffswitch-label" for="show_step_date_time_staff_combined"></label>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        // Insert after date_time step
        dateTimeStep.after(customStepHtml);
        
        console.log('✓ Custom step element injected');
        
        // Also add settings panel
        var settingsContainer = $('#booking_panel_settings_per_step');
        
        if (settingsContainer.length > 0 && settingsContainer.find('[data-step="date_time_staff_combined"]').length === 0) {
            var settingsPanelHtml = 
                '<div class="step_elements_options hidden" data-step="date_time_staff_combined">' +
                    '<h4>Date &amp; Time + Staff (Combined) Settings</h4>' +
                    '<p>This step combines date/time selection with staff selection for multi-service collaborative bookings.</p>' +
                    '<p>When multiple services are selected, users will see tabs for each service to select date/time and staff assignments.</p>' +
                '</div>';
            
            settingsContainer.append(settingsPanelHtml);
            console.log('✓ Settings panel injected');
        }
        
        return true;
    }
    
    // Wait for AJAX content to load
    var checkInterval;
    var maxAttempts = 30; // 15 seconds
    var attempts = 0;
    
    function startChecking() {
        console.log('Starting injection checks...');
        attempts = 0;
        
        checkInterval = setInterval(function() {
            attempts++;
            
            if (injectCustomStep()) {
                console.log('✓✓✓ Custom step successfully injected!');
                clearInterval(checkInterval);
            } else if (attempts >= maxAttempts) {
                console.log('Max attempts reached, stopping checks');
                clearInterval(checkInterval);
            }
        }, 500);
    }
    
    // Start checking when document is ready
    $(document).ready(function() {
        console.log('Document ready, starting checks in 500ms...');
        setTimeout(startChecking, 500);
    });
    
    // Also listen for Booknetic's AJAX modal loading
    // Booknetic uses custom events, so we'll observe DOM changes
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                $(mutation.addedNodes).each(function() {
                    // Check if step list was added
                    if ($(this).find('.step_elements_list').length > 0 || $(this).hasClass('step_elements_list')) {
                        console.log('Step list detected in DOM mutation');
                        // Clear existing interval and start fresh
                        if (checkInterval) {
                            clearInterval(checkInterval);
                        }
                        startChecking();
                    }
                });
            }
        });
    });
    
    // Observe the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
})(jQuery);
