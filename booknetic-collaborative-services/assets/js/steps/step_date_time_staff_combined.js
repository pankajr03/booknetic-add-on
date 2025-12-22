(function($) {
    'use strict';

    console.log('=== Combined DateTime-Staff Step Script Loaded ===');

    var combinedStep = {
        isMultiServiceMode: false,
        selectedServices: [],
        selectedDateTime: null,
        selectedStaff: {},
        availableStaff: {},
        dateTimeSelected: false
    };

    // Intercept date_time step and convert to combined step in multi-service mode
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        if (new_step_id !== 'date_time' && new_step_id !== 'date_time_non_recurring' && new_step_id !== 'date_time_recurring') {
            return;
        }

        console.log('Combined Step: Intercepting date_time step');
        
        // Check if we're in multi-service mode
        checkMultiServiceMode(booknetic);
        
        if (!combinedStep.isMultiServiceMode) {
            console.log('Combined Step: Single service mode, loading standard date_time step');
            booknetic.stepManager.loadStandartSteps(new_step_id, old_step_id);
            return;
        }

        console.log('Combined Step: Multi-service mode detected, using combined view');
        
        // Let Booknetic load the standard datetime step first
        booknetic.stepManager.loadStandartSteps(new_step_id, old_step_id);
        
        // Then we'll enhance it with staff selection in loaded_step hook
    });

    // Skip staff step in multi-service mode (it's already included in combined step)
    bookneticHooks.addFilter('step_is_visible_staff', function(is_visible, booknetic) {
        if (combinedStep.isMultiServiceMode) {
            console.log('Combined Step: Hiding separate staff step');
            return false;
        }
        return is_visible;
    });
    
    // After datetime step loads, add staff selection section
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id, old_step_id) {
        if (new_step_id !== 'date_time' && new_step_id !== 'date_time_non_recurring' && new_step_id !== 'date_time_recurring') {
            return;
        }
        
        // Re-check multi-service mode
        checkMultiServiceMode(booknetic);
        
        if (!combinedStep.isMultiServiceMode) {
            return; // Single service, use standard flow
        }
        
        console.log('Combined Step: Enhancing standard datetime with staff section');
        
        setTimeout(function() {
            addStaffSection(booknetic);
            setupDOMTimeListener(booknetic);
        }, 300);
    });
    
    // Register global time_selected hook to catch Booknetic's time selection
    bookneticHooks.addAction('time_selected', function(booknetic, date, time) {
        if (!combinedStep.isMultiServiceMode) {
            return;
        }
        
        console.log('Combined Step: Time selected via Booknetic hook', date, time);
        
        combinedStep.selectedDateTime = { date: date, time: time };
        combinedStep.dateTimeSelected = true;
        
        // Load staff for this datetime
        loadStaffForAllServices(booknetic);
    }, 10);

    // Validate combined step
    bookneticHooks.addFilter('step_validation_date_time', function(result, booknetic) {
        if (!combinedStep.isMultiServiceMode) {
            return result; // Use default validation for single service
        }

        console.log('Combined Step: Validating combined date_time_staff step');

        // Check datetime
        if (!combinedStep.selectedDateTime || !combinedStep.selectedDateTime.date || !combinedStep.selectedDateTime.time) {
            return {
                status: false,
                errorMsg: 'Please select a date and time.'
            };
        }

        // Check staff for all services
        for (var i = 0; i < combinedStep.selectedServices.length; i++) {
            var serviceId = combinedStep.selectedServices[i].service_id;
            if (!combinedStep.selectedStaff[serviceId] || combinedStep.selectedStaff[serviceId].length === 0) {
                return {
                    status: false,
                    errorMsg: 'Please select staff for all services.'
                };
            }
        }

        console.log('Combined Step: Validation passed');
        return { status: true, errorMsg: '' };
    });

    // Check if we're in multi-service mode
    function checkMultiServiceMode(booknetic) {
        var selectedServices = null;

        // Try to get services from panel data first
        if (booknetic.panel_js) {
            selectedServices = booknetic.panel_js.data('collab-selected-services');
            if (selectedServices && selectedServices.length > 0) {
                console.log('Combined Step: Found services in panel data:', selectedServices);
            }
        }

        // Fallback to cart
        if (!selectedServices && booknetic.cartArr && booknetic.cartArr.length > 0) {
            selectedServices = booknetic.cartArr[0].selected_services;
        }

        // Fallback to window object
        if (!selectedServices && typeof window.collaborativeService !== 'undefined') {
            selectedServices = window.collaborativeService.selectedServices;
        }

        if (selectedServices && selectedServices.length > 1) {
            combinedStep.isMultiServiceMode = true;
            combinedStep.selectedServices = selectedServices;
            
            // Store in panel data
            if (booknetic.panel_js) {
                booknetic.panel_js.data('collab-multi-service-mode', true);
                booknetic.panel_js.data('collab-selected-services', selectedServices);
            }
            
            console.log('Combined Step: Multi-service mode enabled with', selectedServices.length, 'services');
        } else {
            combinedStep.isMultiServiceMode = false;
            console.log('Combined Step: Single-service mode');
        }
    }

    // Add staff selection section below the standard datetime picker
    function addStaffSection(booknetic) {
        var panel = booknetic.panel_js;
        var contentArea = panel.find('.booknetic_appointment_container_body');
        
        // Check if already added
        if (contentArea.find('.booknetic_combined_staff_section').length > 0) {
            console.log('Combined Step: Staff section already exists');
            return;
        }
        
        console.log('Combined Step: Adding staff section');
        
        // Add hint
        // var hintHtml = '<div class="booknetic_combined_hint" style="background: #e8f5e9; padding: 12px; margin-bottom: 15px; border-left: 4px solid #4caf50; border-radius: 4px;">' +
        //                '<strong style="color: #2e7d32;">Combined Booking:</strong> ' +
        //                'Select date & time above, then choose staff for each service below.' +
        //                '</div>';
        // contentArea.prepend(hintHtml);

        // Create staff section (hidden initially)
        var staffHtml = '<div class="booknetic_combined_staff_section" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">' +
                        '<div class="booknetic_combined_staff_header" style="padding: 15px; background: #f5f5f5; border-radius: 4px; margin-bottom: 15px;">' +
                        '<h4 style="margin: 0 0 5px 0; color: #333;">Step 2: Select Staff for Each Service</h4>' +
                        '<p style="margin: 0; color: #666; font-size: 14px;">Choose staff members after selecting time</p>' +
                        '</div>' +
                        '<div class="booknetic_combined_staff_content"></div>' +
                        '</div>';
        contentArea.append(staffHtml);
    }
    
    // Setup DOM listener as fallback to detect time selection
    function setupDOMTimeListener(booknetic) {
        var panel = booknetic.panel_js;
        
        console.log('Combined Step: Setting up DOM time listener');
        
        // Remove any existing listeners to prevent duplicates
        panel.off('click.combined_step', '.booknetic_times_list > div');
        
        // Listen for time selection
        panel.on('click.combined_step', '.booknetic_times_list > div', function() {
            console.log('Combined Step: Time clicked via DOM');
            
            // Wait a bit for Booknetic to process the selection
            setTimeout(function() {
                var selectedDate = panel.find('.booknetic_calendar_selected_day').data('date');
                var selectedTime = panel.find('.booknetic_selected_time').data('time');
                
                console.log('Combined Step: Captured - Date:', selectedDate, 'Time:', selectedTime);
                
                if (selectedDate && selectedTime && combinedStep.isMultiServiceMode) {
                    combinedStep.selectedDateTime = {
                        date: selectedDate,
                        time: selectedTime
                    };
                    combinedStep.dateTimeSelected = true;
                    
                    console.log('Combined Step: Loading staff for selected datetime');
                    loadStaffForAllServices(booknetic);
                }
            }, 200);
        });
    }
    
    // Setup hook to detect time selection from Booknetic's standard handler (DEPRECATED)
    function setupTimeSelectionHook(booknetic) {
        // Moved to global level - this function is no longer needed
        console.warn('Combined Step: setupTimeSelectionHook called but deprecated');
    }

    // Load combined date_time_staff step (DEPRECATED - not used anymore)
    function loadCombinedStep(booknetic, step_id, old_step_id) {
        // This function is no longer used - we enhance the standard step instead
        console.warn('Combined Step: loadCombinedStep called but deprecated');
    }

    // Initialize the combined view (DEPRECATED - not used anymore)
    function initializeCombinedView(booknetic) {
        // This function is no longer used - we enhance the standard step instead
        console.warn('Combined Step: initializeCombinedView called but deprecated');
    }

    // Setup date and time selection listeners (DEPRECATED - not used anymore)
    function setupDateTimeListeners(booknetic) {
        // Not needed - we use Booknetic's standard handlers and hooks
        console.warn('Combined Step: setupDateTimeListeners called but deprecated');
    }

    // Load staff for all selected services
    function loadStaffForAllServices(booknetic) {
        var panel = booknetic.panel_js;
        var staffSection = panel.find('.booknetic_combined_staff_section');
        var staffContent = panel.find('.booknetic_combined_staff_content');

        console.log('Combined Step: Loading staff for all services');

        staffSection.slideDown(300);
        staffContent.html('<div style="text-align: center; padding: 40px;"><div class="booknetic_loading_icon"></div><p>Loading available staff...</p></div>');

        var promises = [];
        combinedStep.selectedServices.forEach(function(serviceItem) {
            var promise = $.ajax({
                url: BookneticCollabFrontend.ajaxurl,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_get_available_staff',
                    nonce: BookneticCollabFrontend.nonce,
                    service_id: serviceItem.service_id,
                    date: combinedStep.selectedDateTime.date,
                    time: combinedStep.selectedDateTime.time
                }
            });
            promises.push(promise);
        });

        $.when.apply($, promises).done(function() {
            var responses = arguments;
            if (combinedStep.selectedServices.length === 1) {
                responses = [responses];
            }

            for (var i = 0; i < responses.length; i++) {
                var response = responses[i][0];
                var serviceId = combinedStep.selectedServices[i].service_id;
                
                if (response && response.success) {
                    combinedStep.availableStaff[serviceId] = response.data.staff || [];
                } else {
                    combinedStep.availableStaff[serviceId] = [];
                }
            }

            renderStaffSelection(booknetic);
        }).fail(function(error) {
            console.error('Combined Step: Failed to load staff', error);
            staffContent.html('<div style="text-align: center; padding: 40px; color: #f44336;">Error loading staff</div>');
        });
    }

    // Render staff selection UI
    function renderStaffSelection(booknetic) {
        var panel = booknetic.panel_js;
        var staffContent = panel.find('.booknetic_combined_staff_content');

        var html = '<div class="booknetic_combined_staff_list">';

        combinedStep.selectedServices.forEach(function(serviceItem) {
            var serviceId = serviceItem.service_id;
            var staff = combinedStep.availableStaff[serviceId] || [];
            var serviceName = 'Service #' + serviceId;

            html += '<div class="booknetic_service_staff_group" style="margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;" data-service-id="' + serviceId + '">';
            html += '<h4 style="margin: 0 0 15px 0;">' + serviceName + '</h4>';

            if (staff.length === 0) {
                html += '<p style="color: #f44336;">No staff available</p>';
            } else {
                html += '<div class="booknetic_staff_cards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;">';
                
                staff.forEach(function(staffMember) {
                    var isSelected = combinedStep.selectedStaff[serviceId] && combinedStep.selectedStaff[serviceId].indexOf(staffMember.id) !== -1;
                    
                    html += '<div class="booknetic_staff_card ' + (isSelected ? 'selected' : '') + '" data-staff-id="' + staffMember.id + '" ' +
                            'style="padding: 15px; border: 2px solid ' + (isSelected ? '#2196F3' : '#e0e0e0') + '; border-radius: 8px; cursor: pointer; text-align: center;">';
                    html += '<div style="font-weight: 600;">' + staffMember.name + '</div>';
                    html += '</div>';
                });
                
                html += '</div>';
            }

            html += '</div>';
        });

        html += '</div>';
        staffContent.html(html);

        // Handle staff selection
        panel.on('click', '.booknetic_staff_card', function() {
            var staffId = parseInt($(this).data('staff-id'));
            var serviceId = parseInt($(this).closest('.booknetic_service_staff_group').data('service-id'));

            if (!combinedStep.selectedStaff[serviceId]) {
                combinedStep.selectedStaff[serviceId] = [];
            }

            var index = combinedStep.selectedStaff[serviceId].indexOf(staffId);
            if (index === -1) {
                combinedStep.selectedStaff[serviceId].push(staffId);
                $(this).addClass('selected').css('border-color', '#2196F3');
            } else {
                combinedStep.selectedStaff[serviceId].splice(index, 1);
                $(this).removeClass('selected').css('border-color', '#e0e0e0');
            }

            console.log('Combined Step: Staff selection updated', combinedStep.selectedStaff);
        });
    }

})(jQuery);
